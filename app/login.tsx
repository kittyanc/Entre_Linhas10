import { router } from 'expo-router'; // ferramenta de navegacao importada aqui
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../config/firebase.js'; // conexao com o banco

export default function LoginScreen() {
  // declaracao de todas as variaveis do formulario
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [genero, setGenero] = useState(''); // guarda masculino ou feminino
  const [numero, setNumero] = useState('');

  // controla se exibe a tela de login ou a de cadastro
  const [isCadastro, setIsCadastro] = useState(false);

  // funcao para validar o formato do email com expressao regular
  const validarEmail = (inputEmail: string) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(inputEmail);
  };

  // funcao para formatar a data de nascimento para o padrao brasileiro enquanto o usuario digita
  const formatarData = (texto: string) => {
    const numeros = texto.replace(/\D/g, '');

    let dataFormatada = numeros;

    if (numeros.length > 2) {
      dataFormatada = numeros.slice(0, 2) + '/' + numeros.slice(2);
    }

    if (numeros.length > 4) {
      dataFormatada =
        numeros.slice(0, 2) +
        '/' +
        numeros.slice(2, 4) +
        '/' +
        numeros.slice(4, 8);
    }

    setDataNascimento(dataFormatada);
  };

  // funcao para entrar no sistema
  const lidarComLogin = () => {
    // valida se os campos de login estao preenchidos
    if (!email || !senha) {
      Alert.alert('Erro', 'Por favor, preencha e-mail e senha.');
      return;
    }
    
    // envia os dados para o sistema de autenticacao do firebase
    signInWithEmailAndPassword(auth, email, senha)
      .then(() => {
        // se der certo exibe o alerta e joga o usuario para a tela inicial
        Alert.alert('Sucesso', 'Bem-vindo de volta ao Entre Linhas!', [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)') // redireciona para as abas
          }
        ]);
      })
      .catch((error) => {
        Alert.alert('Erro no Login', 'E-mail ou senha incorretos.');
      });
  };

  // funcao para criar conta nova e salvar os dados extras
  const lidarComCadastro = async () => {
    //verifica se absolutamente todos os campos obrigatorios foram preenchidos
    if (!email || !senha || !nome || !sobrenome || !dataNascimento || !genero || !numero) {
      Alert.alert('Erro', 'Todos os campos são obrigatórios para criar a conta.');
      return;
    }

    // verifica se o formato do email contem arroba e ponto
    if (!validarEmail(email)) {
      Alert.alert('Erro', 'Por favor, insira um e-mail em formato válido (exemplo@email.com).');
      return;
    }

// verifica se a senha atende o minimo de 6 digitos do firebase
if (senha.length < 6) {
  Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
  return;
}

try {
      // cria a credencial de acesso com email e senha na autenticacao
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const usuarioId = userCredential.user.uid; // pega o id unico gerado para esse usuario

      // salva as outras variaveis no firestore usando o id unico como chave
      await setDoc(doc(db, 'usuarios', usuarioId), {
        nome,
        sobrenome,
        dataNascimento,
        genero,
        numero,
        email,
        criadoEm: new Date()
      });

      // se tudo der certo avisa e joga direto para dentro do app ja logado
      Alert.alert('Sucesso', 'Conta criada com sucesso!', [
        {
          text: 'Vamos lá',
          onPress: () => router.replace('/(tabs)') // redireciona para a home
        }
      ]);
      
      setIsCadastro(false);
    } catch (error: any) {
      Alert.alert('Erro no Cadastro', error.message);
    }
  };

  return (
    // scrollview permite a tela rolar em celulares com tela pequena
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Entre Linhas</Text>
      <Text style={styles.subtitulo}>
        {isCadastro ? 'Crie sua conta literária' : 'Sua biblioteca comunitária'}
      </Text>

      {/* estes campos so aparecem se a variavel iscadastro for verdadeira */}
      {isCadastro && (
        <>
          <TextInput style={styles.input} placeholder="Nome *" value={nome} onChangeText={setNome} />
          
          <TextInput style={styles.input} placeholder="Sobrenome *" value={sobrenome} onChangeText={setSobrenome} />
          
          <TextInput 
            style={styles.input}
            placeholder="Data de Nascimento * (DD/MM/AAAA)"
            value={dataNascimento}
            onChangeText={formatarData} 
            keyboardType="default"
            maxLength={10}
          />
          
          {/* botoes para selecao exclusiva de genero */}
          <Text style={styles.labelGenero}>Gênero *</Text>
          <View style={styles.containerGenero}>
            <TouchableOpacity 
              style={[styles.botaoGenero, genero === 'Masculino' && styles.botaoGeneroSelecionado]} 
              onPress={() => setGenero('Masculino')}
            >
              <Text style={[styles.textoBotaoGenero, genero === 'Masculino' && styles.textoBotaoGeneroSelecionado]}>Masculino</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.botaoGenero, genero === 'Feminino' && styles.botaoGeneroSelecionado]} 
              onPress={() => setGenero('Feminino')}
            >
              <Text style={[styles.textoBotaoGenero, genero === 'Feminino' && styles.textoBotaoGeneroSelecionado]}>Feminino</Text>
            </TouchableOpacity>
          </View>

          <TextInput 
            style={styles.input} 
            placeholder="Número de Telefone * (Apenas números)" 
            value={numero} 
            onChangeText={setNumero} 
            keyboardType="number-pad" // abre apenas o teclado numerico do celular
          />
        </>
      )}

      {/* campos padrao que sempre aparecem em ambas as telas */}
      <TextInput 
        style={styles.input} 
        placeholder="E-mail *" 
        value={email} 
        onChangeText={setEmail} 
        keyboardType="email-address" // ativa teclado otimizado para email com arroba visivel
        autoCapitalize="none" 
        autoCorrect={false}
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Senha *" 
        value={senha} 
        onChangeText={setSenha} 
        secureTextEntry // esconde os caracteres da senha trocando por bolinhas
      />

      {/* renderizacao condicional dos botoes de acao */}
      {!isCadastro ? (
        <>
          <TouchableOpacity style={styles.botao} onPress={lidarComLogin}>
            <Text style={styles.textoBotao}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoAlternar} onPress={() => setIsCadastro(true)}>
            <Text style={styles.textoAlternar}>Não tem conta? Cadastre-se</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.botao} onPress={lidarComCadastro}>
            <Text style={styles.textoBotao}>Finalizar Cadastro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoAlternar} onPress={() => setIsCadastro(false)}>
            <Text style={styles.textoAlternar}>Já tem conta? Voltar para o Login</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// estilos visuais da interface utilizando as cores do seu slide deck
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff3dd',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3e2723',
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 16,
    color: '#a52a2a',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.2)',
  },
  labelGenero: {
    alignSelf: 'flex-start',
    color: '#3e2723',
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 14,
  },
  containerGenero: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  botaoGenero: {
    flex: 1,
    height: 45,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(165,42,42,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  botaoGeneroSelecionado: {
    backgroundColor: '#a52a2a',
    borderColor: '#a52a2a',
  },
  textoBotaoGenero: {
    color: '#3e2723',
    fontWeight: '500',
  },
  textoBotaoGeneroSelecionado: {
    color: '#fff',
    fontWeight: 'bold',
  },
  botao: {
    width: '100%',
    height: 50,
    backgroundColor: '#a52a2a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  botaoAlternar: {
    marginTop: 20,
  },
  textoAlternar: {
    color: '#a52a2a',
    fontSize: 15,
    fontWeight: '500',
  },
});