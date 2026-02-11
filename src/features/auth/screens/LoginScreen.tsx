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
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import { spacing } from '@shared/theme';

// Paleta DetailGo
const colors = {
  primary: '#175676', // Baltic Blue
  secondary: '#4BA3C3', // Turquoise Surf (para hover/focus)
  error: '#D62839', // Classic Crimson (para validações)
  errorLight: '#BA324F', // Rosewood (tom mais suave)
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

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
        [{ text: 'Tentar novamente' }]
      );
    }
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
        {/* Header com nome da marca */}
        <View style={styles.header}>
          <Text style={styles.brand}>DETAILGO</Text>
          <Text style={styles.tagline}>
            Acesse sua conta para agendar{'\n'}
            serviços de estética automotiva
          </Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={[
                styles.input,
                email.length > 0 && !isValidEmail && styles.inputError
              ]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.text.disabled}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!loading}
            />
            {email.length > 0 && !isValidEmail && (
              <Text style={styles.errorText}>E-mail inválido</Text>
            )}
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Senha</Text>
              <TouchableOpacity 
                onPress={() => Alert.alert(
                  'Recuperar senha', 
                  'Enviaremos um link de recuperação para seu e-mail.'
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotLink}>Esqueceu?</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  password.length > 0 && !isValidPassword && styles.inputError
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {password.length > 0 && !isValidPassword && (
              <Text style={styles.errorText}>Mínimo de 6 caracteres</Text>
            )}
          </View>

          {/* Botão de entrada */}
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!isValid || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Termos */}
          <Text style={styles.terms}>
            Ao entrar, você acessa seus agendamentos e histórico.
          </Text>
        </View>

        {/* Footer */}
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
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 56,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  terms: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signupText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  copyright: {
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});