/**
 * App Estética Automotiva
 * Fluxo: Splash nativa (BootSplash) -> Login
 */
import React, { useEffect } from 'react';
import RNBootSplash from 'react-native-bootsplash';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from '@app/AppNavigator';

export default function App() {
  useEffect(() => {
    RNBootSplash.hide({ fade: true }); // some a splash nativa assim que o app está pronto
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
