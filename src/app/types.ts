// src/app/types.ts
export type RootStackParamList = {
  // AUTH
  Login: undefined;
  Register: undefined;

  // USER
  Dashboard: undefined;
  Appointment: undefined;
  MyAppointments: undefined;
  History: undefined;
  Profile: undefined; // 👈 ADICIONADO

  // ADMIN
  AdminDashboard: undefined;
  AdminManage: undefined;
  AdminHistory: undefined;
};