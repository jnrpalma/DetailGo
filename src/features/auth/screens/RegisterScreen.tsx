// src/features/auth/screens/RegisterScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import type { RegisterInput } from '@features/auth/services/auth.service';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, surfaces, borders, radii, spacing, typography } from '@shared/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneDigits = (v: string) => v.replace(/\D/g, '');

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailValid    = useMemo(() => emailRegex.test(email.trim()), [email]);
  const phoneValid    = useMemo(() => phoneDigits(phone).length >= 10, [phone]);
  const passwordValid = useMemo(() => password.length >= 6, [password]);
  const confirmValid  = useMemo(() => confirm === password && confirm.length > 0, [confirm, password]);
  const namesValid    = useMemo(() => firstName.trim().length > 1 && lastName.trim().length > 1, [firstName, lastName]);

  const canSubmit = namesValid && emailValid && phoneValid && passwordValid && confirmValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    const data: RegisterInput = {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim(),
      phone:     phoneDigits(phone),
      password,
    };

    const res = await register(data);
    setSubmitting(false);

    if (!res.ok) {
      Alert.alert('Erro', res.message ?? 'Falha ao cadastrar');
      return;
    }

    Alert.alert('Cadastro', 'Conta criada com sucesso!');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para continuar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Seu nome"
                placeholderTextColor="#8A96A3"
                style={[styles.input, !!firstName && firstName.trim().length < 2 && styles.inputError]}
                returnKeyType="next"
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sobrenome</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Seu sobrenome"
                placeholderTextColor="#8A96A3"
                style={[styles.input, !!lastName && lastName.trim().length < 2 && styles.inputError]}
                returnKeyType="next"
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: spacing.sm }]}>E-mail</Text>
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

          <Text style={[styles.label, { marginTop: spacing.sm }]}>Telefone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="(11) 91234-5678"
            placeholderTextColor="#8A96A3"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            style={[styles.input, !!phone && !phoneValid && styles.inputError]}
            returnKeyType="next"
          />
          {!!phone && !phoneValid && <Text style={styles.helperError}>Informe um telefone válido.</Text>}

          <Text style={[styles.label, { marginTop: spacing.sm }]}>Senha</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="mínimo 6 caracteres"
              placeholderTextColor="#8A96A3"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry={!showPassword}
              style={[styles.input, !!password && !passwordValid && styles.inputError, styles.inputWithIcon]}
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
              {showPassword ? <EyeOff size={20} color={colors.text} /> : <Eye size={20} color={colors.text} />}
            </TouchableOpacity>
          </View>
          {!!password && !passwordValid && <Text style={styles.helperError}>Mínimo de 6 caracteres.</Text>}

          <Text style={[styles.label, { marginTop: spacing.sm }]}>Confirme a senha</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="repita a senha"
              placeholderTextColor="#8A96A3"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry={!showConfirm}
              style={[styles.input, !!confirm && !confirmValid && styles.inputError, styles.inputWithIcon]}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
              {showConfirm ? <EyeOff size={20} color={colors.text} /> : <Eye size={20} color={colors.text} />}
            </TouchableOpacity>
          </View>
          {!!confirm && !confirmValid && <Text style={styles.helperError}>As senhas não conferem.</Text>}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Cadastrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Já tem conta? Entrar</Text>
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
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },

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

  footer: { textAlign: 'center', color: '#7C8794', fontSize: 12 },
});
