import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase.js'; // Ajuste o caminho se necessário

interface Livro {
  id: string;
  titulo: string;
  autores: string; 
  capaUrl: string; 
  genero: string;
  editora?: string;
  dataPublicacao?: string;
  paginas?: string;
  idioma?: string;
}

export default function BibliotecaScreen() {
  const router = useRouter();

  // Estados do Componente
  const [livrosFeed, setLivrosFeed] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  
  const usuarioAtual = auth.currentUser;

  const carregarFeedDoGoogleBooks = async () => {
    try {
      let generosDoUsuario: string[] = [];

      // 1. Busca os gêneros favoritados pelo usuário no Firestore
      if (usuarioAtual) {
        const userDocRef = doc(db, 'usuarios', usuarioAtual.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists() && userSnap.data().generosFavoritos) {
          generosDoUsuario = userSnap.data().generosFavoritos;
        }
      }

      // Se o usuário não tiver gêneros escolhidos, definimos gêneros padrão para o Fallback
      if (!generosDoUsuario || generosDoUsuario.length === 0) {
        generosDoUsuario = ['Literatura', 'Ficção', 'Romance', 'História'];
      }

      const MINHA_API_KEY = "AIzaSyBvAOP06d-0yrvPMfubfG7eAQxh94Hyvdo";
      let todosOsLivrosPuxados: Livro[] = [];
      const idsVistos = new Set<string>();

      // 2. Faz requisições paralelas na API para cada gênero
      const promessasDeBusca = generosDoUsuario.map(async (genero) => {
        try {
          const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`subject:"${genero}"`)}&maxResults=20&key=${MINHA_API_KEY}`;
          const resposta = await fetch(url);
          const dados = await resposta.json();
          return dados.items || [];
        } catch (err) {
          console.log(`Erro ao buscar gênero ${genero} no Google Books:`, err);
          return [];
        }
      });

      const resultadosPorGenero = await Promise.all(promessasDeBusca);

      // 3. Junta todos os livros em uma lista única removendo duplicados
      resultadosPorGenero.forEach((listaDeItens) => {
        listaDeItens.forEach((item: any) => {
          if (!idsVistos.has(item.id)) {
            idsVistos.add(item.id);

            const info = item.volumeInfo;
            let capa = info.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220.png?text=Sem+Capa';
            if (capa.startsWith('http://')) {
              capa = capa.replace('http://', 'https://');
            }

            todosOsLivrosPuxados.push({
              id: item.id,
              titulo: info.title || 'Sem Título',
              autores: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
              capaUrl: capa,
              genero: info.categories ? info.categories.join(', ') : 'Não informado',
              editora: info.publisher || 'Não informada',
              dataPublicacao: info.publishedDate || 'Não informada',
              paginas: info.pageCount ? info.pageCount.toString() : 'Não informado',
              idioma: info.language ? info.language.toUpperCase() : 'Não informado',
            });
          }
        });
      });

      // === CORREÇÃO DE SEGURANÇA SE NENHUM LIVRO FOR ENCONTRADO ===
      // Se a busca por gêneros específicos der totalmente vazia por erro na API ou falta de dados, 
      // fazemos uma busca genérica rápida para o feed nunca ficar quebrado e vazio
      if (todosOsLivrosPuxados.length === 0) {
        try {
          const urlGeral = `https://www.googleapis.com/books/v1/volumes?q=Livros&maxResults=30&key=${MINHA_API_KEY}`;
          const respostaGeral = await fetch(urlGeral);
          const dadosGerais = await respostaGeral.json();
          const itensGerais = dadosGerais.items || [];

          itensGerais.forEach((item: any) => {
            const info = item.volumeInfo;
            let capa = info.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220.png?text=Sem+Capa';
            if (capa.startsWith('http://')) capa = capa.replace('http://', 'https://');

            todosOsLivrosPuxados.push({
              id: item.id,
              titulo: info.title || 'Sem Título',
              autores: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
              capaUrl: capa,
              genero: info.categories ? info.categories.join(', ') : 'Geral',
              editora: info.publisher || 'Não informada',
              dataPublicacao: info.publishedDate || 'Não informada',
              paginas: info.pageCount ? info.pageCount.toString() : 'Não informado',
              idioma: info.language ? info.language.toUpperCase() : 'Não informado',
            });
          });
        } catch (erroGeral) {
          console.log("Erro ao buscar fallback geral:", erroGeral);
        }
      }

      // 4. Embaralha a lista completa
      const listaEmbaralhada = todosOsLivrosPuxados.sort(() => Math.random() - 0.5);

      // 5. Define o limite exato de 30 livros para o feed
      setLivrosFeed(listaEmbaralhada.slice(0, 30));

    } catch (error) {
      console.error("Erro geral ao montar feed do Google Books:", error);
    } finally {
      // === CORREÇÃO DO FINALLY ===
      // Essa parte garante que o loading suma de QUALQUER JEITO, mesmo com falha total de internet
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    setCarregando(true);
    carregarFeedDoGoogleBooks();
  }, [usuarioAtual]);

  const lidarComAtualizacao = () => {
    setAtualizando(true);
    carregarFeedDoGoogleBooks();
  };

  const abrirDetalhesDoLivro = (livro: Livro) => {
    router.push({
      pathname: '/detalhes', 
      params: { 
        id: String(livro.id),
        titulo: String(livro.titulo),
        autores: String(livro.autores),
        capaUrl: String(livro.capaUrl),
        genero: String(livro.genero),
        editora: String(livro.editora),
        dataPublicacao: String(livro.dataPublicacao),
        paginas: String(livro.paginas),
        idioma: String(livro.idioma)
      }
    });
  };

  const renderItem = ({ item }: { item: Livro }) => (
    <TouchableOpacity 
      style={styles.cardLivro} 
      onPress={() => abrirDetalhesDoLivro(item)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.capaUrl }} 
        style={styles.capaLivro} 
      />
      
      <View style={styles.infoLivro}>
        <View>
          <Text style={styles.tituloLivro} numberOfLines={2}>{item.titulo}</Text>
          <Text style={styles.autorLivro} numberOfLines={1}>por {item.autores}</Text>
          <Text style={styles.tagGeneroMini} numberOfLines={1}>{item.genero}</Text>
        </View>
        
        <View style={styles.containerVerMais}>
          <Text style={styles.textoVerMais}>Ver detalhes</Text>
          <Ionicons name="chevron-forward" size={14} color="#a52a2a" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (carregando) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator size="large" color="#a52a2a" />
        <Text style={styles.textoCarregando}>Montando seu feed literário...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tituloPagina}>Para Você</Text>
        <Text style={styles.subtitulo}>Recomendações baseadas nos seus gêneros</Text>
      </View>

      {livrosFeed.length === 0 ? (
        <View style={styles.centralizado}>
          <Ionicons name="book-outline" size={48} color="#bc9e82" />
          <Text style={styles.textoVazio}>Nenhum livro disponível no momento.</Text>
        </View>
      ) : (
        <FlatList
          data={livrosFeed}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={lidarComAtualizacao}
              tintColor="#a52a2a"
              colors={["#a52a2a"]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff3dd',
    paddingTop: 60,
  },
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tituloPagina: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  subtitulo: {
    fontSize: 16,
    color: '#a52a2a',
    marginTop: 5,
  },
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardLivro: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  capaLivro: {
    width: 70,
    height: 105,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  infoLivro: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  tituloLivro: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  autorLivro: {
    fontSize: 14,
    color: '#795548',
    marginTop: 2,
  },
  tagGeneroMini: {
    fontSize: 11,
    color: '#a52a2a',
    backgroundColor: 'rgba(165,42,42,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
    fontWeight: 'bold',
  },
  containerVerMais: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  textoVerMais: {
    color: '#a52a2a',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  textoCarregando: {
    marginTop: 10,
    color: '#3e2723',
    fontSize: 16,
    fontWeight: '500',
  },
  textoVazio: {
    marginTop: 10,
    color: '#795548',
    textAlign: 'center',
    fontSize: 16,
  }
});