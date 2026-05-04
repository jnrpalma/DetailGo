import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '@features/auth';
import { ShopProvider } from '@features/shops/context/ShopContext';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await BootSplash.hide({ fade: true });
      setIsReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <AuthProvider>
      <ShopProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ShopProvider>
    </AuthProvider>
  );
}
