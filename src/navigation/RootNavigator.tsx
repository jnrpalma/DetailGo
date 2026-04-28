import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import type { RootStackParamList } from '@app/types';

import { useAuth, LoginScreen, RegisterScreen } from '@features/auth';
import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import AppointmentScreen from '@features/scheduling/screens/AppointmentScreen';
import AdminDashboardScreen from '@features/admin/screens/AdminDashboardScreen';
import AdminManageScreen from '@features/admin/screens/AdminManageScreen';
import AdminHistoryScreen from '@features/admin/screens/AdminHistoryScreen';
import { MyAppointmentsScreen, HistoryScreen } from '@features/appointments';
import ProfileScreen from '@features/profile/screens/ProfileScreen';
import { useShop } from '@features/shops/context/ShopContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, initializing } = useAuth();
  const { userRole, loading: loadingShop } = useShop();

  if (initializing || (user && loadingShop)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isOwner = userRole === 'owner';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        isOwner ? (
          <Stack.Group>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminManage" component={AdminManageScreen} />
            <Stack.Screen name="AdminHistory" component={AdminHistoryScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Appointment" component={AppointmentScreen} />
            <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
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
