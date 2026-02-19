// src/App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '@features/auth';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from 'src/navigation/RootNavigator';

// Importações para debug do Firebase
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import firebase from '@react-native-firebase/app';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  // ============================================
  // 🔍 DEBUG DO FIREBASE - Verificar configurações
  // ============================================
  useEffect(() => {
    try {
      console.log('=================================');
      console.log('🔍 VERIFICANDO FIREBASE');
      console.log('=================================');

      // Verificar se Firebase está inicializado
      const app = firebase.app();
      console.log('✅ Firebase inicializado com sucesso!');
      console.log('📱 App name:', app.name);
      console.log('📱 App options:', {
        apiKey: app.options.apiKey ? '****' + app.options.apiKey.slice(-4) : 'não definido',
        appId: app.options.appId,
        projectId: app.options.projectId,
        storageBucket: app.options.storageBucket,
        databaseURL: app.options.databaseURL,
        messagingSenderId: app.options.messagingSenderId,
      });

      // Verificar Auth
      const auth = getAuth();
      console.log('🔐 Auth disponível:', !!auth);
      console.log('🔐 Auth currentUser:', auth.currentUser?.email || 'nenhum');
      
      // Verificar se está usando emulador
      // @ts-ignore - propriedade interna para debug
      const isUsingEmulator = auth._user?._auth?._emulator;
      if (isUsingEmulator) {
        console.warn('⚠️ Auth está usando EMULADOR!');
      } else {
        console.log('✅ Auth NÃO está usando emulador');
      }

      // Verificar Firestore
      const firestore = getFirestore();
      console.log('📦 Firestore disponível:', !!firestore);

      console.log('=================================');
      console.log('✅ FIREBASE OK');
      console.log('=================================');

    } catch (error) {
      console.error('❌ ERRO AO INICIALIZAR FIREBASE:');
      console.error(error);
    }
  }, []);

  // Timer para splash screen
  useEffect(() => {
    const timer = setTimeout(async () => {
      await BootSplash.hide({ fade: true });
      setIsReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Mostra splash enquanto não está pronto
  if (!isReady) {
    return null;
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}