import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '@features/auth';

import RootNavigator from 'src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
