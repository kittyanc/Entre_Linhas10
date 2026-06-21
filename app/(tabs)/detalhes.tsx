import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, doc, getDoc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase.js';

export default function TelaDetalhes() {
  const router = useRouter();
  
  // Parâmetros vindos da tela de pesquisa
  const { id, titulo, autores, editora, dataPublicacao, paginas, idioma, genero, capaUrl } = useLocalSearchParams<{
    id: string;
    titulo: string;
    autores: string;
    editora: string;
    dataPublicacao: string;
    paginas: string;
    idioma: string;
    genero: string;
    capaUrl: string;
  }>();

  const [totalFavoritos, setTotalFavoritos] = useState<number>(0);
  const [jaFavoritou, setJaFavoritou] = useState<boolean>(false);
  const [carregandoFavorito, setCarregandoFavorito] = useState<boolean>(true);

  const usuarioAtual = auth.currentUser;

  useEffect(() => {
    if (!id) return;

    const docRef = doc(db, 'livros', id);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setTotalFavoritos(dados.totalFavoritos || 0);
        
        if (usuarioAtual && dados.usuariosQueFavoritaram) {
          setJaFavoritou(dados.usuariosQueFavoritaram.includes(usuarioAtual.uid));
        }
      } else {
        setTotalFavoritos(0);
        setJaFavoritou(false);
      }
      setCarregandoFavorito(false);
    }, (error) => {
      console.log("Erro ao escutar favoritos:", error);
      setCarregandoFavorito(false);
    });

    return () => unsubscribe();
  }, [id, usuarioAtual]);

  // Função de navegação corrigida e com teste de clique
  const irParaComentarios = () => {
    if (!id) {
      Alert.alert("Erro", "ID do livro não encontrado para abrir os comentários.");
      return;
    }

    try {
      // Tenta navegar usando a rota absoluta. 
      // Se seu arquivo estiver dentro de uma pasta (ex: (tabs)/comentariosLivro), mude para '/(tabs)/comentariosLivro'
      router.push({
        pathname: '/comentariosLivro', 
        params: {
          id: String(id),
          titulo: String(titulo || 'Livro'),
        },
      });
    } catch (error) {
      console.error("Erro na navegação:", error);
      Alert.alert("Erro de Rota", "Verifique se o arquivo comentariosLivro.tsx está na pasta correta do Expo Router.");
    }
  };

  // favoritar / desfavoritar
  const alternarFavorito = async () => {
    if (!usuarioAtual) {
      Alert.alert('Erro', 'Você precisa estar logado para favoritar um livro.');
      return;
    }

    const docRef = doc(db, 'livros', id);

    try {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          titulo: titulo || 'Sem Título',
          autores: autores || 'Autor desconhecido',
          editora: editora || 'Não informada',
          dataPublicacao: dataPublicacao || 'Não informada',
          paginas: paginas || 'Não informado',
          idioma: idioma || 'Não informado',
          genero: genero || 'Não informado',
          capaUrl: capaUrl || '',
          totalFavoritos: 1,
          usuariosQueFavoritaram: [usuarioAtual.uid]
        });
        setJaFavoritou(true);
      } else {
        if (jaFavoritou) {
          await updateDoc(docRef, {
            totalFavoritos: increment(-1),
            usuariosQueFavoritaram: arrayRemove(usuarioAtual.uid)
          });
          setJaFavoritou(false);
        } else {
          await updateDoc(docRef, {
            titulo: titulo || docSnap.data().titulo,
            autores: autores || docSnap.data().autores,
            capaUrl: capaUrl || docSnap.data().capaUrl,
            editora: editora || docSnap.data().editora,
            dataPublicacao: dataPublicacao || docSnap.data().dataPublicacao,
            paginas: paginas || docSnap.data().paginas,
            idioma: idioma || docSnap.data().idioma,
            genero: genero || docSnap.data().genero,
            totalFavoritos: increment(1),
            usuariosQueFavoritaram: arrayUnion(usuarioAtual.uid)
          });
          setJaFavoritou(true);
        }
      }
    } catch (error) {
      console.log("Erro ao atualizar favorito no Firebase:", error);
      Alert.alert('Erro', 'Não foi possível salvar sua ação. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#3e2723" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {capaUrl && (
          <Image source={{ uri: capaUrl }} style={styles.capaGrande} resizeMode="contain" />
        )}

        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.autorSubtitulo}>por {autores}</Text>

        <View style={styles.containerContadorFavoritos}>
          <Ionicons name="heart" size={18} color="#a52a2a" />
          {carregandoFavorito ? (
            <ActivityIndicator size="small" color="#a52a2a" style={{ marginLeft: 5 }} />
          ) : (
            <Text style={styles.textoContadorFavoritos}>
              {totalFavoritos} {totalFavoritos === 1 ? 'pessoa favoritou' : 'pessoas favoritaram'}
            </Text>
          )}
        </View>

        <View style={styles.divisor} />

        <View style={styles.containerInfo}>
          <View style={styles.linhaInfo}>
            <Text style={styles.label}>Editora:</Text>
            <Text style={styles.valor}>{editora}</Text>
          </View>
          <View style={styles.linhaInfo}>
            <Text style={styles.label}>Data de Publicação:</Text>
            <Text style={styles.valor}>{dataPublicacao}</Text>
          </View>
          <View style={styles.linhaInfo}>
            <Text style={styles.label}>Número de Páginas:</Text>
            <Text style={styles.valor}>{paginas}</Text>
          </View>
          <View style={styles.linhaInfo}>
            <Text style={styles.label}>Idioma:</Text>
            <Text style={styles.valor}>{idioma}</Text>
          </View>
          <View style={styles.linhaInfo}>
            <Text style={styles.label}>Assunto / Gênero:</Text>
            <Text style={styles.valor}>{genero}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Container de botões com estilo zIndex para garantir clique no celular físico */}
      <View style={styles.containerBotoes}>
        <TouchableOpacity 
          style={[styles.botao, styles.botaoFavoritar, jaFavoritou && styles.botaoJaFavoritado]} 
          onPress={alternarFavorito}
          disabled={carregandoFavorito}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={jaFavoritou ? "heart" : "heart-outline"} 
            size={20} 
            color="#fff" 
            style={{ marginRight: 8 }} 
          />
          <Text style={styles.textoBotao}>
            {jaFavoritou ? "Favoritado" : "Favoritar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.botao, styles.botaoComentar]} 
          onPress={irParaComentarios}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.textoBotao}>Comentar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff3dd',
    paddingTop: 50,
  },
  botaoVoltar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  capaGrande: {
    width: 160,
    height: 240,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3e2723',
    textAlign: 'center',
    marginBottom: 6,
  },
  autorSubtitulo: {
    fontSize: 16,
    color: '#a52a2a',
    textAlign: 'center',
    marginBottom: 10,
  },
  containerContadorFavoritos: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165,42,42,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 5,
  },
  textoContadorFavoritos: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a52a2a',
    marginLeft: 6,
  },
  divisor: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(165,42,42,0.1)',
    marginVertical: 15,
  },
  containerInfo: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.1)',
    gap: 12,
  },
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3e2723',
    flex: 1,
  },
  valor: {
    fontSize: 14,
    color: '#5d4037',
    flex: 1.5,
    textAlign: 'right',
  },
  containerBotoes: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(165,42,42,0.1)',
    gap: 12,
    // Adicionado zIndex e elevation para garantir que a barra fique por cima de tudo e clique perfeitamente
    zIndex: 99,
    elevation: 10,
  },
  botao: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoFavoritar: {
    backgroundColor: '#a52a2a',
  },
  botaoJaFavoritado: {
    backgroundColor: '#27ae60', 
  },
  botaoComentar: {
    backgroundColor: '#3e2723',
  },
  textoBotao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});