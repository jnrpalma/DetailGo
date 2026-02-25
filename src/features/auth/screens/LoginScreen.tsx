// src/features/auth/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Mail, Lock } from 'lucide-react-native';

import { colors, spacing, radii } from '@shared/theme';
import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import { Input } from '@shared/components/Input';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const isValidEmail = email.includes('@') && email.includes('.');
  const isValidPassword = password.length >= 6;
  const isValid = isValidEmail && isValidPassword;

  const handleLogin = async () => {
    if (!isValid) return;

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.ok) {
      Alert.alert(
        'Erro ao acessar',
        result.message || 'Email ou senha incorretos',
        [{ text: 'Tentar novamente' }],
      );
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>DETAILGO</Text>
          <Text style={styles.tagline}>
            Acesse sua conta para agendar{'\n'}
            serviços de estética automotiva
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            onBlur={() => handleBlur('email')}
            error={touched.email && !isValidEmail ? 'E-mail inválido' : undefined}
            touched={touched.email}
            leftIcon={<Mail size={20} color={colors.text.tertiary} />}
            placeholder="seu@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!loading}
          />

          {/* 👇 AGORA USA O LABEL DO PRÓPRIO INPUT */}
          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            onBlur={() => handleBlur('password')}
            error={touched.password && !isValidPassword ? 'Mínimo de 6 caracteres' : undefined}
            touched={touched.password}
            leftIcon={<Lock size={20} color={colors.text.tertiary} />}
            placeholder="••••••••"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!loading}
            rightIcon={
              <TouchableOpacity
                onPress={() => Alert.alert('Recuperar senha', 'Enviaremos um link de recuperação para seu e-mail.')}
              >
                <Text style={styles.forgotLink}>Esqueceu?</Text>
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!isValid || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            Ao entrar, você acessa seus agendamentos e histórico.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.divider} />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Não tem conta? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.copyright}>© 2026 DETAILGO</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 56,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary.main,
    letterSpacing: 2,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 40,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
    padding: 4,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary.main,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary.main,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: colors.text.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  terms: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginBottom: spacing.lg,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  signupText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.main,
  },
  copyright: {
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});