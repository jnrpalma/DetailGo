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
import { useAuth } from '@features/auth/context/AuthContext';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = useMemo(() => emailRegex.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.trim().length >= 6, [password]);
  const canSubmit = emailValid && passwordValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);

    if (!res.ok) {
      Alert.alert('Erro', res.message ?? 'Falha ao autenticar');
      return;
    }
    // RootNavigator já troca para a pilha privada quando houver user.
    // Se quiser forçar: navigation.replace('Dashboard');
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
          <View style={styles.passwordWrapper}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="mínimo 6 caracteres"
              secureTextEntry={!showPassword}
              style={[
                styles.input,
                !!password && !passwordValid && styles.inputError,
                styles.inputWithIcon,
              ]}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {!!password && !passwordValid && (
            <Text style={styles.helperError}>A senha deve ter pelo menos 6 caracteres.</Text>
          )}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </TouchableOpacity>

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
  inputWithIcon: { paddingRight: 40 },
  inputError: { borderColor: '#EF4444' },
  helperError: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  passwordWrapper: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 10, top: 12, height: 24, justifyContent: 'center' },
  eyeText: { fontSize: 18 },
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
