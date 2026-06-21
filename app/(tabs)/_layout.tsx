import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { auth } from '../../config/firebase.js'; // sobe duas pastas para achar o firebase

export default function TabsLayout() {
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // monitora em tempo real se o usuario esta logado no firebase
    const desinscrever = onAuthStateChanged(auth, (usuario) => {
      // TEMPORARIO: desabilitado para testes
      // if (!usuario) {
      //   // se nao houver usuario logado chuta ele direto para tela de login
      //   router.replace('/login');
      // }
      // encerra a tela de carregamento
      setCarregando(false);
    });

    // limpa o monitorador ao fechar o componente
    return desinscrever;
  }, []);

  // enquanto o firebase responde mostra um icone de carregando na tela creme
  // TEMPORARIO: desabilitado para testes
  // if (carregando) {
  //   return (
  //     <View style={[styles.container, styles.centralizado]}>
  //       <ActivityIndicator size="large" color="#a52a2a" />
  //     </View>
  //   );
  // }

  // estrutura de abas do menu inferior do aplicativo
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#a52a2a' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="biblioteca"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="detalhes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="comentariosLivro"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

// estilos da tela de carregamento inicial
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff3dd', // cor creme padrao do entre linhas
    justifyContent: 'center',
    alignItems: 'center',
  },
});
