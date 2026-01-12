import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/types';

import LoginScreen from '@features/auth/screens/LoginScreen';
import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import AppointmentScreen from '@features/scheduling/screens/AppointmentScreen';

import MyAppointmentsScreen from '@features/scheduling/screens/MyAppointmentsScreen';
import HistoryScreen from '@features/scheduling/screens/HistoryScreen';

import AdminDashboardScreen from '@features/admin/screens/AdminDashboardScreen';
import AdminHistoryScreen from '@features/admin/screens/AdminHistoryScreen';
import AdminManageScreen from '@features/admin/screens/AdminManageScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Appointment" component={AppointmentScreen} />

        <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />

        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="AdminHistory" component={AdminHistoryScreen} />
        <Stack.Screen name="AdminManage" component={AdminManageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
