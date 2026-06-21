import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase.js';

// lista de generos
const GENEROS_GOOGLE_BOOKS = [
  { id: 'Fiction', label: 'Ficção' },
  { id: 'Romance', label: 'Romance' },
  { id: 'Fantasy', label: 'Fantasia' },
  { id: 'Science Fiction', label: 'Ficção Científica' },
  { id: 'Mystery', label: 'Mistério & Suspense' },
  { id: 'Biography & Autobiography', label: 'Biografia' },
  { id: 'History', label: 'História' },
  { id: 'Self-Help', label: 'Autoajuda' },
];

export default function TelaPerfil() {
  const router = useRouter();
  const usuarioAtual = auth.currentUser;

  // Estados do componente
  const [nome, setNome] = useState('Leitor');
  const [email, setEmail] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [generosSelecionados, setGenerosSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  const FOTO_PADRAO = 'https://via.placeholder.com/150/3e2723/fff?text=Entre+Linhas';

  // buscar dados do usuário
  useEffect(() => {
    const buscarDadosPerfil = async () => {
      if (usuarioAtual) {
        setEmail(usuarioAtual.email || '');
        try {
          const docRef = doc(db, 'usuarios', usuarioAtual.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const dados = docSnap.data();
            const nomeCompleto = `${dados.nome || 'Leitor'} ${dados.sobrenome || ''}`.trim();
            setNome(nomeCompleto);
            setFotoUri(dados.fotoUrl || null);
            // carrega os gêneros que o usuário já tinha salvo antes
            setGenerosSelecionados(dados.generosFavoritos || []);
          }
        } catch (error) {
          console.log('Erro ao buscar dados do perfil:', error);
        }
      }
      setCarregando(false);
    };

    buscarDadosPerfil();
  }, [usuarioAtual]);

  // função para selecionar/desmarcar um gênero e salvar no Firestore
  const alternarGenero = async (generoId: string) => {
    if (!usuarioAtual) return;

    const docRef = doc(db, 'usuarios', usuarioAtual.uid);
    const jaEstaSelecionado = generosSelecionados.includes(generoId);

    try {
      if (jaEstaSelecionado) {
        setGenerosSelecionados(prev => prev.filter(id => id !== generoId));
        await updateDoc(docRef, {
          generosFavoritos: arrayRemove(generoId)
        });
      } else {
        // Adiciona no estado local
        setGenerosSelecionados(prev => [...prev, generoId]);
        // Adiciona no Firestore usando arrayUnion
        await updateDoc(docRef, {
          generosFavoritos: arrayUnion(generoId)
        });
      }
    } catch (error) {
      console.log('Erro ao atualizar gêneros favoritos:', error);
      Alert.alert('Erro', 'Não foi possível salvar sua preferência.');
    }
  };

  // Função para alterar foto de perfil
  const selecionarFoto = async () => {
    const permissaoResultado = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissaoResultado.granted === false) {
      Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos!');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!resultado.canceled && resultado.assets[0].uri) {
      const uriSelecionada = resultado.assets[0].uri;
      setFotoUri(uriSelecionada);

      if (usuarioAtual) {
        try {
          const docRef = doc(db, 'usuarios', usuarioAtual.uid);
          await updateDoc(docRef, { fotoUrl: uriSelecionada });
          Alert.alert('Sucesso', 'Foto de perfil atualizada!');
        } catch (error) {
          console.log('Erro ao salvar foto no Firestore:', error);
        }
      }
    }
  };

  const lidarComSair = () => {
    Alert.alert('Sair', 'Deseja mesmo desconectar do Entre Linhas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/login');
          } catch (error) {
            console.log('Erro ao deslogar:', error);
          }
        },
      },
    ]);
  };

  if (carregando) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator size="large" color="#a52a2a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Bloco do Topo com o Avatar */}
      <View style={styles.containerTopo}>
        <TouchableOpacity style={styles.containerAvatar} onPress={selecionarFoto} activeOpacity={0.8}>
          <Image source={{ uri: fotoUri || FOTO_PADRAO }} style={styles.avatar} />
          <View style={styles.iconeCamera}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.textoNome}>{nome}</Text>
        <Text style={styles.textoEmail}>{email}</Text>
      </View>

      {/* NOVA SEÇÃO: Gêneros Favoritos */}
      <View style={styles.secaoGeneros}>
        <Text style={styles.tituloSecao}>Meus Gêneros Favoritos</Text>
        <Text style={styles.subtituloSecao}>Selecione para personalizar seu feed:</Text>
        
        <View style={styles.containerTags}>
          {GENEROS_GOOGLE_BOOKS.map((genero) => {
            const ativo = generosSelecionados.includes(genero.id);
            return (
              <TouchableOpacity
                key={genero.id}
                style={[styles.tag, ativo && styles.tagAtiva]}
                onPress={() => alternarGenero(genero.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.textoTag, ativo && styles.textoTagAtiva]}>
                  {genero.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Menu de Opções */}
      <View style={styles.containerMenu}>
        <TouchableOpacity style={styles.botaoMenu} onPress={() => router.push('/favoritos')}>
          <View style={styles.ladoEsquerdoMenu}>
            <Ionicons name="heart" size={22} color="#a52a2a" style={styles.iconeMenu} />
            <Text style={styles.textoBotaoMenu}>Meus favoritos </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#bc9e82" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoMenu} onPress={() => console.log('Abrir comentários')}>
          <View style={styles.ladoEsquerdoMenu}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#a52a2a" style={styles.iconeMenu} />
            <Text style={styles.textoBotaoMenu}>Meus Comentários</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#bc9e82" />
        </TouchableOpacity>

        <View style={styles.divisor} />

        <TouchableOpacity style={[styles.botaoMenu, styles.botaoSair]} onPress={lidarComSair}>
          <View style={styles.ladoEsquerdoMenu}>
            <Ionicons name="log-out-outline" size={22} color="#d32f2f" style={styles.iconeMenu} />
            <Text style={[styles.textoBotaoMenu, styles.textoSair]}>Sair da Conta</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff3dd',
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  centralizado: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerTopo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  containerAvatar: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#a52a2a',
    backgroundColor: '#fff',
  },
  iconeCamera: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: '#a52a2a',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff3dd',
  },
  textoNome: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3e2723',
    marginTop: 15,
  },
  textoEmail: {
    fontSize: 14,
    color: '#795548',
    marginTop: 4,
  },
  secaoGeneros: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  tituloSecao: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3e2723',
    marginBottom: 4,
  },
  subtituloSecao: {
    fontSize: 14,
    color: '#795548',
    marginBottom: 12,
  },
  containerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.15)',
  },
  tagAtiva: {
    backgroundColor: '#a52a2a',
    borderColor: '#a52a2a',
  },
  textoTag: {
    color: '#5d4037',
    fontWeight: '600',
    fontSize: 14,
  },
  textoTagAtiva: {
    color: '#fff',
  },
  containerMenu: {
    paddingHorizontal: 20,
    gap: 12,
  },
  botaoMenu: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.1)',
  },
  ladoEsquerdoMenu: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconeMenu: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  textoBotaoMenu: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3e2723',
  },
  divisor: {
    height: 1,
    backgroundColor: 'rgba(165,42,42,0.1)',
    marginVertical: 10,
  },
  botaoSair: {
    borderColor: 'rgba(211,47,47,0.2)',
    backgroundColor: '#fff5f5',
  },
  textoSair: {
    color: '#d32f2f',
  },
});