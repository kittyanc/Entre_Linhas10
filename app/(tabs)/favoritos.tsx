import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { arrayRemove, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
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

export default function TelaFavoritos() {
  const router = useRouter();
  const [livrosFavoritos, setLivrosFavoritos] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const usuarioAtual = auth.currentUser;

  // Busca os livros salvos no Firestore com tratamento anti-duplicação de IDs
  const buscarFavoritos = async () => {
    if (!usuarioAtual) return;

    try {
      const livrosRef = collection(db, 'livros');
      const q = query(
        livrosRef, 
        where('usuariosQueFavoritaram', 'array-contains', usuarioAtual.uid)
      );

      const querySnapshot = await getDocs(q);
      const lista: Livro[] = [];
      const idsVistos = new Set(); // Evita a duplicação na interface se houver dados inconsistentes no Firestore

      querySnapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        const idLivro = docSnap.id;

        if (!idsVistos.has(idLivro)) {
          idsVistos.add(idLivro);
          lista.push({ 
            id: idLivro,
            titulo: dados.titulo || 'Sem Título',
            autores: dados.autores || 'Autor desconhecido',
            capaUrl: dados.capaUrl || dados.capa || 'https://via.placeholder.com/150x220.png?text=Sem+Capa',
            genero: dados.genero || 'Não informado',
            editora: dados.editora || 'Não informada',
            dataPublicacao: dados.dataPublicacao || 'Não informada',
            paginas: dados.paginas || 'Não informado',
            idioma: dados.idioma || 'Não informado'
          });
        }
      });

      setLivrosFavoritos(lista);
    } catch (error) {
      console.error("Erro ao buscar livros favoritados:", error);
    }
  };

  useEffect(() => {
    const carregarInicial = async () => {
      setCarregando(true);
      await buscarFavoritos();
      setCarregando(false);
    };
    carregarInicial();
  }, [usuarioAtual]);

  const lidarComAtualizacao = async () => {
    setAtualizando(true);
    await buscarFavoritos();
    setAtualizando(false);
  };

  const desfavoritarLivro = async (livroId: string) => {
    if (!usuarioAtual) return;

    try {
      const livroDocRef = doc(db, 'livros', livroId);
      await updateDoc(livroDocRef, {
        usuariosQueFavoritaram: arrayRemove(usuarioAtual.uid)
      });
      
      // Remove o item do estado imediatamente na tela de forma fluida
      setLivrosFavoritos(prev => prev.filter(livro => livro.id !== livroId));
    } catch (error) {
      console.error("Erro ao remover dos favoritos:", error);
    }
  };

  const irParaDetalhes = (livro: Livro) => {
    router.push({
      pathname: '/detalhes',
      params: {
        id: String(livro.id),
        titulo: String(livro.titulo),
        autores: String(livro.autores),
        editora: String(livro.editora),
        dataPublicacao: String(livro.dataPublicacao),
        paginas: String(livro.paginas),
        idioma: String(livro.idioma),
        genero: String(livro.genero),
        capaUrl: String(livro.capaUrl)
      },
    });
  };

  const renderItem = ({ item }: { item: Livro }) => (
    <TouchableOpacity 
      style={styles.cardLivro}
      onPress={() => irParaDetalhes(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.capaUrl }} style={styles.capaLivro} />
      
      <View style={styles.infoLivro}>
        <Text style={styles.tituloLivro} numberOfLines={2}>{item.titulo}</Text>
        <Text style={styles.autorLivro} numberOfLines={1}>{item.autores}</Text>
        
        <TouchableOpacity 
          style={styles.botaoFavoritadoPequeno}
          onPress={() => desfavoritarLivro(item.id)}
        >
          <Ionicons name="heart" size={16} color="#fff" />
          <Text style={styles.textoFavoritadoPequeno}>Favoritado</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (carregando) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator size="large" color="#a52a2a" />
      </View>
    );
  }

  return (
    <View style={styles.containerLista}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#3e2723" />
        </TouchableOpacity>
        <Text style={styles.tituloPagina}>Meus Favoritos</Text>
        <Text style={styles.subtitulo}>Sua coleção salva no Entre Linhas</Text>
      </View>

      <View style={styles.secao}>
        {livrosFavoritos.length === 0 ? (
          <FlatList
            data={[]}
            renderItem={null}
            ListEmptyComponent={
              <View style={styles.cardInfoInicial}>
                <Ionicons name="heart-dislike-outline" size={40} color="#a52a2a" style={{ marginBottom: 10 }} />
                <Text style={styles.textoInfoInicial}>Você ainda não possui livros favoritados na sua estante virtual.</Text>
              </View>
            }
            contentContainerStyle={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={atualizando} onRefresh={lidarComAtualizacao} tintColor="#a52a2a" colors={["#a52a2a"]} />
            }
          />
        ) : (
          <FlatList
            data={livrosFavoritos}
            renderItem={renderItem}
            // CORREÇÃO EXPO GO: Chave única combinando o ID e o Índice do array
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.listaScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={atualizando} onRefresh={lidarComAtualizacao} tintColor="#a52a2a" colors={["#a52a2a"]} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff3dd',
  },
  containerLista: {
    flex: 1,
    backgroundColor: '#fff3dd',
    padding: 20,
    paddingTop: 60,
  },
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3dd',
  },
  header: {
    marginBottom: 25,
  },
  botaoVoltar: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  tituloPagina: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  subtitulo: {
    fontSize: 15,
    color: '#a52a2a',
    marginTop: 5,
  },
  secao: {
    flex: 1,
    width: '100%',
  },
  listaScroll: {
    paddingBottom: 40,
  },
  cardLivro: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    justifyContent: 'center',
  },
  tituloLivro: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  autorLivro: {
    fontSize: 14,
    color: '#a52a2a',
    marginTop: 4,
    marginBottom: 8,
  },
  botaoFavoritadoPequeno: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a52a2a',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  textoFavoritadoPequeno: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  cardInfoInicial: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#a52a2a',
    marginTop: 20,
  },
  textoInfoInicial: {
    textAlign: 'center',
    color: '#5d4037',
    fontSize: 14,
    lineHeight: 20,
  },
});