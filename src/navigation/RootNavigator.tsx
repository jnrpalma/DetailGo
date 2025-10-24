import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '@features/auth/screens/LoginScreen';
import RegisterScreen from '@features/auth/screens/RegisterScreen';
import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import AppointmentScreen from '@features/scheduling/screens/AppointmentScreen';


import AdminScreen from '@features/admin/screens/AdminScreen';                   // <- CRUD "Gerenciar"

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth/context/AuthContext';
import { isAdminEmail } from '@features/auth/utils/roles';
import AdminDashboardScreen from '@features/admin/screens/AdminScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isAdmin = isAdminEmail(user?.email);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        isAdmin ? (
          // ======= FLUXO ADMIN =======
          <Stack.Group>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </Stack.Group>
        ) : (
          // ======= FLUXO CLIENTE =======
          <Stack.Group>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Appointment" component={AppointmentScreen} />
          </Stack.Group>
        )
      ) : (
        // ======= NÃO LOGADO =======
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
