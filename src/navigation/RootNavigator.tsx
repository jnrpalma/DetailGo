import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '@features/auth/screens/LoginScreen';
import RegisterScreen from '@features/auth/screens/RegisterScreen';

import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import AppointmentScreen from '@features/scheduling/screens/AppointmentScreen';

import AdminDashboardScreen from '@features/admin/screens/AdminDashboardScreen';
import AdminManageScreen from '@features/admin/screens/AdminManageScreen';

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth/context/AuthContext';

import { ensureShopSettings } from '@app/bootstrap/ensureShopSettings';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { isAdminEmail } from '@features/auth/utils/roles';

const Stack = createNativeStackNavigator<RootStackParamList>();

type UserProfile = {
  role?: 'admin' | 'user';
  email?: string;
};

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  const [role, setRole] = useState<UserProfile['role']>(undefined);
  const [loadingRole, setLoadingRole] = useState(false);

  // 🔥 pega role do Firestore (users/{uid}.role)
  useEffect(() => {
    if (!user) {
      setRole(undefined);
      setLoadingRole(false);
      return;
    }

    setLoadingRole(true);
    const db = getFirestore();
    const ref = doc(db, 'users', user.uid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() ?? {}) as UserProfile;
        setRole(data.role);
        setLoadingRole(false);
      },
      (err) => {
        console.error('Erro ao carregar role:', err);
        setLoadingRole(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  // 🔥 seed settings/shop
  useEffect(() => {
    if (!user) return;
    ensureShopSettings().catch((err) => console.error('Erro ao garantir settings/shop:', err));
  }, [user?.uid]);

  if (initializing || (user && loadingRole)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // ✅ admin por role, fallback por email
  const isAdmin = role === 'admin' || isAdminEmail(user?.email);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        isAdmin ? (
          // ======= FLUXO ADMIN =======
          <Stack.Group>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminManage" component={AdminManageScreen} />
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
