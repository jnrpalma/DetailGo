// @features/auth/screens/LoginScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@app/types';

import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailValid = useMemo(() => emailRegex.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.trim().length >= 6, [password]);
  const canSubmit = emailValid && passwordValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // login ok -> navegue para a tela principal (adicione sua lógica)
      // por enquanto vai para uma tela fictícia "Home" ou apenas mostra uma mensagem
      Alert.alert('Login', 'Autenticado com sucesso!');
      // navigation.navigate('Home'); // descomente se tiver rota Home
    } catch (err: any) {
      const code = err?.code ?? '';
      let message = 'Erro ao autenticar.';
      if (code === 'auth/invalid-email') message = 'E-mail inválido.';
      else if (code === 'auth/wrong-password') message = 'E-mail ou senha inválidos.';
      else if (code === 'auth/user-not-found') message = 'Usuário não encontrado.';
      Alert.alert('Erro', message);
      console.warn('Login error:', err);
    } finally {
      setSubmitting(false);
    
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>Acesse sua conta para agendar serviços</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={[styles.input, !!email && !emailValid && styles.inputError]}
            returnKeyType="next"
          />
          {!!email && !emailValid && <Text style={styles.helperError}>E-mail inválido.</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="mínimo 6 caracteres"
            secureTextEntry
            style={[styles.input, !!password && !passwordValid && styles.inputError]}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          {!!password && !passwordValid && <Text style={styles.helperError}>A senha deve ter pelo menos 6 caracteres.</Text>}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </TouchableOpacity>

          {/* Link para cadastro */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrapper}>
            <Text style={styles.linkText}>Não tem conta? Criar conta</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© {new Date().getFullYear()} Estética Automotiva</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  header: { alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  form: { marginTop: 16 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  inputError: { borderColor: '#EF4444' },
  helperError: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  button: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkWrapper: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});
