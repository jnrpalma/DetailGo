// src/App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '@features/auth';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from 'src/navigation/RootNavigator';

export default function App() {
  const [isReady, setIsReady] = useState(false);

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