// src/features/auth/screens/LoginScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';

import { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import { colors, radii, spacing } from '@shared/theme';

const logo = require('@shared/assets/logo.png');

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const HERO_H = 190;
const LOGO_SIZE = 96;
const LOGO_TOP = 70;
const LOGO_ZOOM = 1.45;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const emailValid = useMemo(() => emailRegex.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.trim().length >= 6, [password]);
  const canSubmit = emailValid && passwordValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);

    if (!res.ok) Alert.alert('Erro', res.message ?? 'Falha ao autenticar');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HERO (topo verde) */}
        <View style={styles.hero}>
          <View style={styles.heroBlobLeft} />
          <View style={styles.heroBlobRight} />
          <View style={styles.heroHighlight} />

          <View style={styles.logoOuter}>
            <View style={styles.logoMask}>
              <Image source={logo} style={styles.logoImg} resizeMode="cover" />
            </View>
          </View>
        </View>

        {/* SHEET (transição suave) */}
        <View style={styles.sheet}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>OCIN</Text>
            <Text style={styles.subtitle}>
              Agende serviços de estética automotiva em segundos
            </Text>
          </View>

          {/* DIVISOR sutil (premium) */}
          <View style={styles.divider} />

          {/* FORM — sem card dentro do sheet (menos camadas) */}
          <View style={styles.form}>
            {/* EMAIL */}
            <View style={styles.field}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                  email.length > 0 && !emailValid && styles.inputError,
                ]}
                returnKeyType="next"
              />
              {email.length > 0 && !emailValid && (
                <Text style={styles.errorText}>E-mail inválido</Text>
              )}
            </View>

            {/* SENHA */}
            <View style={styles.field}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Senha</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Em breve', 'Fluxo de recuperação de senha')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPassword}>Esqueceu?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.passwordWrapper}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  secureTextEntry={!showPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    passFocused && styles.inputFocused,
                    password.length > 0 && !passwordValid && styles.inputError,
                  ]}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                  accessibilityLabel={
                    showPassword ? 'Ocultar senha' : 'Mostrar senha'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748B" />
                  ) : (
                    <Eye size={20} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>

              {password.length > 0 && !passwordValid && (
                <Text style={styles.errorText}>Mínimo 6 caracteres</Text>
              )}
            </View>

            {/* BOTÃO */}
            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    !canSubmit && styles.buttonTextDisabled,
                  ]}
                >
                  Entrar
                </Text>
              )}
            </TouchableOpacity>

            {/* CADASTRO */}
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Não tem conta? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © {new Date().getFullYear()} OCIN
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, backgroundColor: colors.bg },

  hero: {
    height: HERO_H,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroBlobLeft: {
    position: 'absolute',
    left: -140,
    top: -140,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBlobRight: {
    position: 'absolute',
    right: -120,
    bottom: -160,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  logoOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: LOGO_TOP,
    alignItems: 'center',
  },
  logoMask: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  logoImg: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    transform: [{ scale: LOGO_ZOOM }],
  },

  sheet: {
    flex: 1,
    marginTop: -18,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 44,
    paddingBottom: spacing.xl,
  },

  headerText: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 10,
  },

  // Marca “premium” sem fonte externa
  brand: {
    fontSize: 34,
    fontWeight: Platform.select({ ios: '900', android: '900' }) as any,
    color: colors.text,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    transform: [{ scaleX: 1.02 }],
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 21,
    letterSpacing: 0.2,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: spacing.lg,
    marginTop: 6,
    marginBottom: 16,
    opacity: 0.7,
  },

  // FORM direto no sheet (sem card)
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: 2,
  },

  field: { marginBottom: spacing.lg },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },

  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },

  input: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },

  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputError: { borderColor: '#EF4444' },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: spacing.xs,
    fontWeight: '700',
  },

  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: { backgroundColor: '#E2E8F0' },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  buttonTextDisabled: { color: '#64748B' },

  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerText: { fontSize: 15, color: '#64748B' },
  registerLink: { fontSize: 15, fontWeight: '900', color: colors.primary },

  footer: { paddingTop: spacing.xl },
  footerText: { textAlign: 'center', color: '#94A3B8', fontSize: 13 },
});
