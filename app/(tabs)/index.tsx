import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase.js';

// Componente isolado para o Card do Livro para gerenciar a contagem individual de favoritos
function CardLivroHome({ item, onSelect }: { item: any; onSelect: (item: any) => void }) {
  const [totalFavoritos, setTotalFavoritos] = useState<number>(0);
  const info = item.volumeInfo;

  let capa = info.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220.png?text=Sem+Capa';
  if (capa.startsWith('http://')) {
    capa = capa.replace('http://', 'https://');
  }
  const autores = info.authors ? info.authors.join(', ') : 'Autor desconhecido';

  // Busca no Firestore quantos usuários favoritaram este ID de livro específico
  useEffect(() => {
    const buscarContagemFavoritos = async () => {
      try {
        const livroDocRef = doc(db, 'livros', item.id);
        const livroSnap = await getDoc(livroDocRef);
        
        if (livroSnap.exists() && livroSnap.data().usuariosQueFavoritaram) {
          const listaFavoritos = livroSnap.data().usuariosQueFavoritaram;
          setTotalFavoritos(Array.isArray(listaFavoritos) ? listaFavoritos.length : 0);
        } else {
          setTotalFavoritos(0);
        }
      } catch (error) {
        console.log(`Erro ao buscar favoritos do livro ${item.id}:`, error);
      }
    };

    buscarContagemFavoritos();
  }, [item.id]);

  return (
    <TouchableOpacity 
      style={styles.cardLivro}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: capa }} style={styles.capaLivro} />
      
      <View style={styles.infoLivro}>
        <Text style={styles.tituloLivro} numberOfLines={2}>{info.title}</Text>
        <Text style={styles.autorLivro} numberOfLines={1}>por {autores}</Text>
      </View>

      {/* Contador de favoritos posicionado no canto superior direito */}
      <View style={styles.badgeFavoritos}>
        <Ionicons name="heart" size={12} color="#a52a2a" />
        <Text style={styles.textoBadgeFavoritos}>{totalFavoritos}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter(); 
  const [nomeUsuario, setNomeUsuario] = useState('Leitor');
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  
  const [busca, setBusca] = useState('');
  const [livros, setLivros] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const buscarDadosUsuario = async () => {
      const usuarioAtual = auth.currentUser;
      if (usuarioAtual) {
        try {
          const docRef = doc(db, 'usuarios', usuarioAtual.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setNomeUsuario(docSnap.data().nome);
          }
        } catch (error) {
          console.log("erro ao buscar nome do usuario:", error);
        }
      }
      setCarregandoUsuario(false);
    };
    buscarDadosUsuario();
  }, []);

  const buscarLivrosNoGoogle = async () => {
    if (!busca || busca.trim() === '') {
      Alert.alert('Aviso', 'Digite o nome de um livro ou autor.');
      return;
    }

    setBuscando(true);
    try {
      const termoFormatado = busca.trim().toLowerCase();
      const MINHA_API_KEY = "AIzaSyBvAOP06d-0yrvPMfubfG7eAQxh94Hyvdo"; 
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termoFormatado)}&maxResults=10&key=${MINHA_API_KEY}`;
      
      const resposta = await fetch(url);
      const dados = await resposta.json(); 

      if (dados && dados.items && dados.items.length > 0) {
        setLivros(dados.items);
      } else {
        setLivros([]);
        Alert.alert('Informação', 'Nenhum livro foi encontrado na base do Google Books.');
      }
    } catch (error) {
      console.log("erro na api do google books:", error);
      setLivros([]);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor do Google Books.');
    } finally {
      setBuscando(false);
    }
  };

  const irParaDetalhes = (item: any) => {
    const info = item.volumeInfo;
    let capa = info.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220.png?text=Sem+Capa';
    if (capa.startsWith('http://')) {
      capa = capa.replace('http://', 'https://');
    }

    router.push({
      pathname: "/detalhes", 
      params: {
        id: String(item.id), 
        titulo: String(info.title || 'Sem Título'),
        autores: String(info.authors ? info.authors.join(', ') : 'Autor desconhecido'),
        editora: String(info.publisher || 'Não informada'),
        dataPublicacao: String(info.publishedDate || 'Não informada'),
        paginas: String(info.pageCount ? info.pageCount.toString() : 'Não informado'),
        idioma: String(info.language ? info.language.toUpperCase() : 'Não informado'),
        genero: String(info.categories ? info.categories.join(', ') : 'Não informado'),
        capaUrl: String(capa)
      },
    });
  };

  if (carregandoUsuario) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator size="large" color="#a52a2a" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.saudacao}>Olá, {nomeUsuario}!</Text>
        <Text style={styles.subsaudacao}>Encontre seu próximo livro no Entre Linhas</Text>
      </View>

      <View style={styles.containerBusca}>
        <TextInput
          style={styles.inputBusca}
          placeholder="Buscar por título ou autor de verdade..."
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={buscarLivrosNoGoogle}
        />
        <TouchableOpacity style={styles.botaoBusca} onPress={buscarLivrosNoGoogle}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.secao}>
        {buscando ? (
          <ActivityIndicator size="large" color="#a52a2a" style={{ marginTop: 20 }} />
        ) : livros.length > 0 ? (
          <>
            <Text style={styles.tituloSecao}>Resultados Encontrados</Text>
            {livros.map((item) => (
              <CardLivroHome 
                key={item.id} 
                item={item} 
                onSelect={irParaDetalhes} 
              />
            ))}
          </>
        ) : (
          <View style={styles.cardInfoInicial}>
            <Ionicons name="book-outline" size={40} color="#a52a2a" style={{ marginBottom: 10 }} />
            <Text style={styles.textoInfoInicial}>Use a barra acima para pesquisar milhões de livros disponíveis na base do Google.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff3dd',
    padding: 20,
    paddingTop: 60,
  },
  centralizado: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 25,
  },
  saudacao: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  subsaudacao: {
    fontSize: 15,
    color: '#a52a2a',
    marginTop: 5,
  },
  containerBusca: {
    flexDirection: 'row',
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.2)',
    marginBottom: 30,
  },
  inputBusca: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
  },
  botaoBusca: {
    width: 55,
    height: '100%',
    backgroundColor: '#a52a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secao: {
    width: '100%',
  },
  tituloSecao: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3e2723',
    marginBottom: 15,
  },
  cardLivro: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.1)',
    alignItems: 'center',
    position: 'relative', // Essencial para podermos fixar o Badge no canto
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
    paddingRight: 35, // Margem interna para o texto longo não passar por baixo do número
  },
  tituloLivro: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  autorLivro: {
    fontSize: 14,
    color: '#a52a2a',
    marginTop: 6,
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
  badgeFavoritos: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165,42,42,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoBadgeFavoritos: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#a52a2a',
    marginLeft: 4,
  },
});