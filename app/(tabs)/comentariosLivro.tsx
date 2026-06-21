import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase.js'; // Ajuste o caminho conforme o seu projeto

interface Comentario {
  id: string;
  usuarioId: string;
  nome: string;
  fotoUrl: string;
  texto: string;
  dataEnvio: any;
}

export default function ComentariosLivroScreen() {
  const router = useRouter();
  // Parâmetros recebidos da Tela Detalhes
  const { id: idLivro, titulo: tituloLivro } = useLocalSearchParams<{ id: string; titulo: string }>();

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const usuarioAtual = auth.currentUser;

  // Busca a lista de comentários deste livro específico
  const buscarComentarios = async () => {
    if (!idLivro) return;

    try {
      const comentariosRef = collection(db, 'comentarios');
      const q = query(
        comentariosRef,
        where('idLivro', '==', idLivro),
        orderBy('dataEnvio', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const lista: Comentario[] = [];

      querySnapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          usuarioId: dados.usuarioId,
          nome: dados.nome || 'Leitor Anônimo',
          // Mapeia exatamente a chave 'fotoUrl' vinda do banco
          fotoUrl: dados.fotoUrl || 'https://via.placeholder.com/100?text=U', 
          texto: dados.texto || '',
          dataEnvio: dados.dataEnvio,
        });
      });

      setComentarios(lista);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      Alert.alert("Erro", "Não foi possível carregar os comentários.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    buscarComentarios();
  }, [idLivro]);

  // Pull to Refresh
  const lidarComAtualizacao = () => {
    setAtualizando(true);
    buscarComentarios();
  };

  // Envia e grava o novo comentário com dados reais do usuário
  // Envia e grava o novo comentário com dados reais do usuário
  const enviarComentario = async () => {
    if (!novoComentario.trim()) return;

    if (!usuarioAtual) {
      Alert.alert("Aviso", "Você precisa estar logado para comentar.");
      return;
    }

    setEnviando(true);
    try {
      let nomeFinal = '';
      let fotoFinal = '';

      // 1. Tenta buscar em 'usuarios' fazendo uma query flexível pelos campos mais comuns
      const usuariosRef = collection(db, 'usuarios');
      
      // Criamos promessas de busca para cobrir todas as formas que você pode ter salvo no cadastro
      const queriesDeTeste = [
        query(usuariosRef, where('uid', '==', usuarioAtual.uid)),
        query(usuariosRef, where('id', '==', usuarioAtual.uid)),
        query(usuariosRef, where('email', '==', usuarioAtual.email))
      ];

      // Executa as buscas
      for (const q of queriesDeTeste) {
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const dadosUsuario = querySnap.docs[0].data();
          nomeFinal = dadosUsuario.nome || dadosUsuario.name;
          fotoFinal = dadosUsuario.fotoUrl || dadosUsuario.foto || dadosUsuario.profilePic;
          if (nomeFinal) break; // Se achou o nome, interrompe o loop
        }
      }

      // 2. Se mesmo com a Query detalhada não achou nada (cadastro incompleto no banco),
      // recorre aos metadados nativos da conta do Firebase Auth
      if (!nomeFinal) {
        nomeFinal = usuarioAtual.displayName || usuarioAtual.email?.split('@')[0] || 'Leitor';
      }
      if (!fotoFinal) {
        fotoFinal = usuarioAtual.photoURL || 'https://via.placeholder.com/100?text=U';
      }

      // 3. Salva o comentário com os dados mapeados com sucesso
      const comentariosRef = collection(db, 'comentarios');
      const dadosComentario = {
        idLivro: idLivro,
        usuarioId: usuarioAtual.uid,
        nome: nomeFinal,
        fotoUrl: fotoFinal,
        texto: novoComentario.trim(),
        dataEnvio: serverTimestamp(),
      };

      await addDoc(comentariosRef, dadosComentario);
      setNovoComentario('');
      
      // Atualiza a listagem na tela
      buscarComentarios();
    } catch (error) {
      console.error("Erro ao salvar comentário:", error);
      Alert.alert("Erro", "Não foi possível postar seu comentário.");
    } finally {
      setEnviando(false);
    }
  };

  const renderItem = ({ item }: { item: Comentario }) => (
    <View style={styles.cardComentario}>
      <Image source={{ uri: item.fotoUrl }} style={styles.fotoPerfil} />
      <View style={styles.conteudoComentario}>
        <Text style={styles.nomeUsuario}>{item.nome}</Text>
        <Text style={styles.textoComentario}>{item.texto}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header da Tela */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#3e2723" />
        </TouchableOpacity>
        <Text style={styles.tituloPagina}>Avaliações</Text>
        <Text style={styles.subtitulo} numberOfLines={1}>{tituloLivro}</Text>
      </View>

      {/* Lista Dinâmica */}
      <View style={styles.areaLista}>
        {carregando ? (
          <ActivityIndicator size="large" color="#a52a2a" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={comentarios}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listaScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={lidarComAtualizacao}
                tintColor="#a52a2a"
                colors={["#a52a2a"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.cardVazio}>
                <Ionicons name="chatbubbles-outline" size={40} color="#bc9e82" />
                <Text style={styles.textoVazio}>Seja o primeiro a avaliar e comentar sobre este livro!</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Input de envio fixado no rodapé */}
      <View style={styles.containerInput}>
        <TextInput
          style={styles.input}
          placeholder="Escreva sua avaliação sobre o livro..."
          placeholderTextColor="#999"
          value={novoComentario}
          onChangeText={setNovoComentario}
          multiline
        />
        <TouchableOpacity 
          style={[styles.botaoEnviar, !novoComentario.trim() && styles.botaoDesativado]} 
          onPress={enviarComentario}
          disabled={enviando || !novoComentario.trim()}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff3dd',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    marginBottom: 15,
  },
  botaoVoltar: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  tituloPagina: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  subtitulo: {
    fontSize: 15,
    color: '#a52a2a',
    marginTop: 4,
    fontWeight: '500',
  },
  areaLista: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listaScroll: {
    paddingBottom: 20,
  },
  cardComentario: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.08)',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  fotoPerfil: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eee',
  },
  conteudoComentario: {
    flex: 1,
    marginLeft: 12,
  },
  nomeUsuario: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3e2723',
    marginBottom: 4,
  },
  textoComentario: {
    fontSize: 14,
    color: '#5d4037',
    lineHeight: 18,
  },
  cardVazio: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  textoVazio: {
    textAlign: 'center',
    color: '#795548',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  containerInput: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(165,42,42,0.1)',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    paddingRight: 40,
    fontSize: 15,
    color: '#3e2723',
    maxHeight: 100,
  },
  botaoEnviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#a52a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  botaoDesativado: {
    backgroundColor: '#bc9e82',
  },
});