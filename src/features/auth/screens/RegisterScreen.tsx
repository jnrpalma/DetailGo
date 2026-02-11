// src/features/auth/screens/RegisterScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import type { RegisterInput } from '@features/auth/services/auth.service';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react-native';
import { spacing } from '@shared/theme';

// Paleta DetailGo (mesma do Login)
const colors = {
  primary: '#175676', // Baltic Blue
  secondary: '#4BA3C3', // Turquoise Surf
  error: '#D62839', // Classic Crimson
  errorLight: '#BA324F', // Rosewood
  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
  },
  input: {
    background: '#F8FAFC',
    border: '#E2E8F0',
    placeholder: '#94A3B8',
  }
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneDigits = (v: string) => v.replace(/\D/g, '');

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Validações
  const emailValid = useMemo(() => emailRegex.test(form.email.trim()), [form.email]);
  const phoneValid = useMemo(() => phoneDigits(form.phone).length >= 10, [form.phone]);
  const passwordValid = useMemo(() => form.password.length >= 6, [form.password]);
  const confirmValid = useMemo(() => 
    form.confirm === form.password && form.confirm.length > 0, 
    [form.confirm, form.password]
  );
  const namesValid = useMemo(() => 
    form.firstName.trim().length > 1 && form.lastName.trim().length > 1, 
    [form.firstName, form.lastName]
  );

  const canSubmit = namesValid && emailValid && phoneValid && passwordValid && confirmValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    const data: RegisterInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: phoneDigits(form.phone),
      password: form.password,
    };

    const res = await register(data);
    setSubmitting(false);

    if (!res.ok) {
      Alert.alert('Erro', res.message ?? 'Falha ao cadastrar');
      return;
    }

    Alert.alert(
      'Conta criada!', 
      'Seu cadastro foi realizado com sucesso.',
      [{ text: 'Fazer login', onPress: () => navigation.navigate('Login') }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>DETAILGO</Text>
          <Text style={styles.title}>Criar nova conta</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para começar a{'\n'}
            agendar serviços automotivos
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Nome e Sobrenome - Row */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={[
                  styles.input,
                  form.firstName.length > 1 && form.firstName.trim().length < 2 && styles.inputError
                ]}
                placeholder="Seu nome"
                placeholderTextColor={colors.input.placeholder}
                value={form.firstName}
                onChangeText={(v) => updateForm('firstName', v)}
                returnKeyType="next"
                editable={!submitting}
              />
              {form.firstName.length > 0 && form.firstName.trim().length < 2 && (
                <Text style={styles.errorText}>Nome muito curto</Text>
              )}
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sobrenome</Text>
              <TextInput
                style={[
                  styles.input,
                  form.lastName.length > 1 && form.lastName.trim().length < 2 && styles.inputError
                ]}
                placeholder="Seu sobrenome"
                placeholderTextColor={colors.input.placeholder}
                value={form.lastName}
                onChangeText={(v) => updateForm('lastName', v)}
                returnKeyType="next"
                editable={!submitting}
              />
              {form.lastName.length > 0 && form.lastName.trim().length < 2 && (
                <Text style={styles.errorText}>Sobrenome muito curto</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.inputField}
                placeholder="seu@email.com"
                placeholderTextColor={colors.input.placeholder}
                value={form.email}
                onChangeText={(v) => updateForm('email', v)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!submitting}
              />
            </View>
            {form.email.length > 0 && !emailValid && (
              <Text style={styles.errorText}>E-mail inválido</Text>
            )}
          </View>

          {/* Telefone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.inputField}
                placeholder="(11) 91234-5678"
                placeholderTextColor={colors.input.placeholder}
                value={form.phone}
                onChangeText={(v) => updateForm('phone', v)}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                editable={!submitting}
              />
            </View>
            {form.phone.length > 0 && !phoneValid && (
              <Text style={styles.errorText}>Telefone com DDD e 8-9 dígitos</Text>
            )}
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.inputField}
                placeholder="mínimo 6 caracteres"
                placeholderTextColor={colors.input.placeholder}
                value={form.password}
                onChangeText={(v) => updateForm('password', v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                editable={!submitting}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {form.password.length > 0 && !passwordValid && (
              <Text style={styles.errorText}>Mínimo de 6 caracteres</Text>
            )}
          </View>

          {/* Confirmar Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar senha</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.inputField}
                placeholder="repita a senha"
                placeholderTextColor={colors.input.placeholder}
                value={form.confirm}
                onChangeText={(v) => updateForm('confirm', v)}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                editable={!submitting}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? (
                  <EyeOff size={20} color={colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {form.confirm.length > 0 && !confirmValid && (
              <Text style={styles.errorText}>As senhas não conferem</Text>
            )}
          </View>

          {/* Botão de cadastro */}
          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </TouchableOpacity>

          {/* Link para login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.copyright}>© 2026 DETAILGO</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.input.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.input.border,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 12,
  },
  input: {
    height: 52,
    backgroundColor: colors.input.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.input.border,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
  eyeButton: {
    padding: 4,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
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
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    marginTop: 'auto',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 24,
  },
  copyright: {
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});