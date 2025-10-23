// src/features/auth/screens/LoginScreen.tsx
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
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, surfaces, borders, radii, spacing, typography } from '@shared/theme';

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
            placeholderTextColor="#8A96A3"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            style={[styles.input, !!email && !emailValid && styles.inputError]}
            returnKeyType="next"
          />
          {!!email && !emailValid && <Text style={styles.helperError}>E-mail inválido.</Text>}

          <Text style={[styles.label, { marginTop: spacing.sm }]}>Senha</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="mínimo 6 caracteres"
              placeholderTextColor="#8A96A3"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              secureTextEntry={!showPassword}
              style={[styles.input, !!password && !passwordValid && styles.inputError, styles.inputWithIcon]}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
              {showPassword ? <EyeOff size={20} color={colors.text} /> : <Eye size={20} color={colors.text} />}
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
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Entrar</Text>}
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
  flex: { flex: 1, backgroundColor: colors.bg },
  wrapper: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center', gap: 6 },
  title: { fontSize: typography.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: '#596474', textAlign: 'center' },

  form: { marginTop: spacing.md },
  label: { fontSize: 13, color: colors.text, marginBottom: 6, fontWeight: '600' },

  input: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: borders.default,
    paddingHorizontal: spacing.md,
    backgroundColor: surfaces.card,
    fontSize: typography.text,
    color: colors.text,
  },
  inputWithIcon: { paddingRight: 40 },
  inputError: { borderColor: borders.error },
  helperError: { color: borders.error, fontSize: typography.caption, marginTop: 6 },

  passwordWrapper: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 10, top: 12, height: 24, justifyContent: 'center' },

  button: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  linkWrapper: { marginTop: spacing.sm, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  footer: { textAlign: 'center', color: '#7C8794', fontSize: 12 },
});
