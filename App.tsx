/**
 * App Estética Automotiva
 * Fluxo inicial: Splash nativa -> Splash in-app -> Login
 */

import React, { useEffect, useState } from 'react';
import RNBootSplash from 'react-native-bootsplash';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/features/auth/screens/LoginScreen';
import SplashScreen from './src/features/auth/screens/SplashScreen';

// Helper sleep
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Carregue configs iniciais aqui (fonts, tokens, API, etc.)
      await sleep(600); // pequeno delay para transição suave
    };

    bootstrap()
      .catch(() => {})
      .finally(() => {
        setReady(true);
        RNBootSplash.hide({ fade: true }); // esconde splash nativa
      });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {ready ? (
        <LoginScreen
          onSubmit={(email, password) => {
            console.log('Login com:', email, password);
          }}
        />
      ) : (
        <SplashScreen />
      )}
    </SafeAreaProvider>
  );
}
