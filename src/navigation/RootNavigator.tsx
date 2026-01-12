import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '@features/auth/screens/LoginScreen';
import RegisterScreen from '@features/auth/screens/RegisterScreen';

import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import AppointmentScreen from '@features/scheduling/screens/AppointmentScreen';

// ✅ USER screens (NOVAS)


import AdminDashboardScreen from '@features/admin/screens/AdminDashboardScreen';
import AdminManageScreen from '@features/admin/screens/AdminManageScreen';
import AdminHistoryScreen from '@features/admin/screens/AdminHistoryScreen';

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth/context/AuthContext';

import { ensureShopSettings } from '@app/bootstrap/ensureShopSettings';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { isAdminEmail } from '@features/auth/utils/roles';
import MyAppointmentsScreen from '@features/scheduling/screens/MyAppointmentsScreen';
import HistoryScreen from '@features/scheduling/screens/HistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

type UserProfile = {
  role?: 'admin' | 'user';
  email?: string;
};

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  const [role, setRole] = useState<UserProfile['role']>(undefined);
  const [loadingRole, setLoadingRole] = useState(false);

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

  const isAdmin = role === 'admin' || isAdminEmail(user?.email);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        isAdmin ? (
          <Stack.Group>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminManage" component={AdminManageScreen} />
            <Stack.Screen name="AdminHistory" component={AdminHistoryScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Appointment" component={AppointmentScreen} />

            {/* ✅ AGORA EXISTEM NO STACK */}
            <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </Stack.Group>
        )
      ) : (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
