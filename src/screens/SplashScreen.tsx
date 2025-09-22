import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logotest.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Estética Automotiva</Text>
      <ActivityIndicator size="large" color="#111827" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
  logo: { width: 120, height: 120, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
});
