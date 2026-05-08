import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from '@features/auth';
import { ShopProvider, useShop } from '@features/shops/context/ShopContext';
import { ThemeProvider } from '@shared/theme';
import { SplashScreen } from '@shared/components/SplashScreen';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { user, initializing } = useAuth();
  const { loading: loadingShop } = useShop();
  const [minimumSplashDone, setMinimumSplashDone] = useState(false);

  useEffect(() => {
    BootSplash.hide({ fade: true });

    const timer = setTimeout(() => {
      setMinimumSplashDone(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const appReady = minimumSplashDone && !initializing && !(user && loadingShop);

  if (!appReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ShopProvider>
          <AppContent />
        </ShopProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
