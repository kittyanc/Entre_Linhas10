import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { 
  FlatList, 
  Image, 
  Modal, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView, 
  TextInput, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../config/firebase.js';

// Interface para os livros
interface Livro {
  id: string;
  titulo: string;
  autor: string;
  capa: string;
  descricao: string;
  conteudo: string;
  dataPublicacao: any;
  userId: string;
}

export default function BibliotecaScreen() {
  const [livros, setLivros] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [livroSelecionado, setLivroSelecionado] = useState<Livro | null>(null);
  const [lendoLivro, setLendoLivro] = useState<Livro | null>(null);
  const [busca, setBusca] = useState('');

  // Estados do Formulário de Publicação
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novaCapa, setNovaCapa] = useState('https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1000&auto=format&fit=crop');
  const [enviando, setEnviando] = useState(false);

  // Carregar livros do Firebase em tempo real
  useEffect(() => {
    const q = query(collection(db, 'livros'), orderBy('dataPublicacao', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: Livro[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Livro);
      });
      setLivros(docs);
      setCarregando(false);
    }, (error) => {
      console.error("Erro ao carregar livros:", error);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  // Função para publicar o livro
  const handlePublicar = async () => {
    if (!novoTitulo || !novaDescricao || !novoConteudo) {
      Alert.alert("Erro", "Por favor, preencha todos os campos para publicar seu livro.");
      return;
    }

    setEnviando(true);
    try {
      // Garantindo que funcione mesmo sem login para o seu teste
      const autorFinal = auth.currentUser?.email?.split('@')[0] || "Escritor Anônimo";
      const userIdFinal = auth.currentUser?.uid || "user_" + Math.random().toString(36).substr(2, 9);

      await addDoc(collection(db, 'livros'), {
        titulo: novoTitulo,
        autor: autorFinal,
        descricao: novaDescricao,
        conteudo: novoConteudo,
        capa: novaCapa,
        dataPublicacao: Timestamp.now(),
        userId: userIdFinal
      });

      Alert.alert("Sucesso!", "Seu livro foi publicado e já está disponível na rede Entre Linhas.");
      setModalPublicar(false);
      setNovoTitulo('');
      setNovaDescricao('');
      setNovoConteudo('');
    } catch (error) {
      console.error("Erro ao publicar:", error);
      Alert.alert("Erro", "Não foi possível publicar seu livro agora. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const livrosFiltrados = livros.filter(l => 
    l.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    l.autor.toLowerCase().includes(busca.toLowerCase())
  );

  const renderItem = ({ item }: { item: Livro }) => (
    <TouchableOpacity 
      style={styles.cardLivro} 
      onPress={() => setLivroSelecionado(item)}
    >
      <Image source={{ uri: item.capa }} style={styles.capaLivro} />
      <View style={styles.infoLivro}>
        <Text style={styles.tituloLivro} numberOfLines={2}>{item.titulo}</Text>
        <Text style={styles.autorLivro}>por {item.autor}</Text>
        <TouchableOpacity 
          style={styles.botaoLer}
          onPress={() => setLendoLivro(item)}
        >
          <Text style={styles.textoBotaoLer}>Ler Obra</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.tituloPagina}>Comunidade Autoral</Text>
          <Text style={styles.subtitulo}>Publique e descubra novas histórias</Text>
        </View>
        <TouchableOpacity 
          style={styles.botaoAdd}
          onPress={() => setModalPublicar(true)}
        >
          <Ionicons name="add-circle" size={50} color="#a52a2a" />
        </TouchableOpacity>
      </View>

      <View style={styles.buscaContainer}>
        <Ionicons name="search" size={20} color="#8d6e63" style={styles.buscaIcon} />
        <TextInput
          style={styles.buscaInput}
          placeholder="Pesquisar livros ou autores..."
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#a52a2a" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={livrosFiltrados}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.textoVazio}>Nenhum livro encontrado. Seja o primeiro a publicar!</Text>
          }
        />
      )}

      {/* Modal de Publicação */}
      <Modal visible={modalPublicar} animationType="slide">
        <SafeAreaView style={styles.modalPublicarContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalPublicar(false)}>
                <Ionicons name="close" size={30} color="#a52a2a" />
              </TouchableOpacity>
              <Text style={styles.modalTitulo}>Nova Publicação</Text>
              <View style={{ width: 30 }} />
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título da Obra</Text>
              <TextInput 
                style={styles.input}
                placeholder="Ex: O Segredo das Estrelas"
                value={novoTitulo}
                onChangeText={setNovoTitulo}
              />

              <Text style={styles.label}>Sinopse / Descrição Curta</Text>
              <TextInput 
                style={[styles.input, { height: 80 }]}
                placeholder="Conte um pouco sobre sua história..."
                multiline
                value={novaDescricao}
                onChangeText={setNovaDescricao}
              />

              <Text style={styles.label}>Conteúdo do Livro</Text>
              <TextInput 
                style={[styles.input, { height: 250, textAlignVertical: 'top' }]}
                placeholder="Escreva sua história aqui..."
                multiline
                value={novoConteudo}
                onChangeText={setNovoConteudo}
              />

              <TouchableOpacity 
                style={[styles.botaoPublicarFinal, enviando && { opacity: 0.7 }]}
                onPress={handlePublicar}
                disabled={enviando}
              >
                {enviando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textoBotaoPublicar}>Publicar na Rede</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 50 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal visible={!!livroSelecionado && !lendoLivro} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDetalheConteudo}>
            <TouchableOpacity style={styles.fecharDetalhe} onPress={() => setLivroSelecionado(null)}>
              <Ionicons name="close" size={28} color="#a52a2a" />
            </TouchableOpacity>
            <Image source={{ uri: livroSelecionado?.capa }} style={styles.capaGrande} />
            <Text style={styles.tituloGrande}>{livroSelecionado?.titulo}</Text>
            <Text style={styles.autorGrande}>por {livroSelecionado?.autor}</Text>
            <ScrollView style={styles.descScroll}>
              <Text style={styles.descTexto}>{livroSelecionado?.descricao}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.botaoComecar}
              onPress={() => {
                setLendoLivro(livroSelecionado);
                setLivroSelecionado(null);
              }}
            >
              <Text style={styles.textoComecar}>Começar Leitura</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Leitura Imersiva */}
      <Modal visible={!!lendoLivro} animationType="slide">
        <View style={styles.leituraContainer}>
          <View style={styles.leituraHeader}>
            <TouchableOpacity onPress={() => setLendoLivro(null)}>
              <Ionicons name="arrow-back" size={28} color="#3e2723" />
            </TouchableOpacity>
            <Text style={styles.leituraTitulo} numberOfLines={1}>{lendoLivro?.titulo}</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={styles.leituraScroll}>
            <Text style={styles.textoConteudo}>{lendoLivro?.conteudo}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff3dd', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  tituloPagina: { fontSize: 24, fontWeight: 'bold', color: '#3e2723' },
  subtitulo: { fontSize: 14, color: '#a52a2a' },
  botaoAdd: { padding: 5 },
  buscaContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 25, paddingHorizontal: 15, alignItems: 'center', marginBottom: 20, elevation: 2 },
  buscaIcon: { marginRight: 10 },
  buscaInput: { flex: 1, height: 45, color: '#3e2723' },
  lista: { paddingHorizontal: 20, paddingBottom: 30 },
  cardLivro: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 15, elevation: 3 },
  capaLivro: { width: 70, height: 100, borderRadius: 8 },
  infoLivro: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  tituloLivro: { fontSize: 18, fontWeight: 'bold', color: '#3e2723' },
  autorLivro: { fontSize: 14, color: '#a52a2a' },
  botaoLer: { backgroundColor: '#a52a2a', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start' },
  textoBotaoLer: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  textoVazio: { textAlign: 'center', marginTop: 50, color: '#8d6e63', fontSize: 16 },
  
  // Modal Publicar
  modalPublicarContainer: { flex: 1, backgroundColor: '#fff3dd' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#3e2723' },
  formContainer: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#3e2723', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, color: '#3e2723', borderWidth: 1, borderColor: '#e0e0e0' },
  botaoPublicarFinal: { backgroundColor: '#a52a2a', marginTop: 30, paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  textoBotaoPublicar: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Modal Detalhes
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalDetalheConteudo: { backgroundColor: '#fff3dd', width: '90%', maxHeight: '85%', borderRadius: 25, padding: 20, alignItems: 'center' },
  fecharDetalhe: { alignSelf: 'flex-end' },
  capaGrande: { width: 140, height: 200, borderRadius: 15, marginBottom: 15 },
  tituloGrande: { fontSize: 22, fontWeight: 'bold', color: '#3e2723', textAlign: 'center' },
  autorGrande: { fontSize: 16, color: '#a52a2a', marginBottom: 15 },
  descScroll: { width: '100%', marginBottom: 15 },
  descTexto: { fontSize: 15, color: '#5d4037', lineHeight: 22, textAlign: 'justify' },
  botaoComecar: { backgroundColor: '#a52a2a', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  textoComecar: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Leitura
  leituraContainer: { flex: 1, backgroundColor: '#fffcf5' },
  leituraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  leituraTitulo: { fontSize: 18, fontWeight: 'bold', color: '#3e2723', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  leituraScroll: { padding: 25 },
  textoConteudo: { fontSize: 18, lineHeight: 30, color: '#2b1d1a', textAlign: 'justify' },
});

import { SafeAreaView } from 'react-native-safe-area-context';
