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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@app/types';

type Props = {
  onSubmit?: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => void | Promise<void>;
  submitLabel?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneDigits = (v: string) => v.replace(/\D/g, '');

export default function RegisterScreen({ onSubmit, submitLabel = 'Cadastrar' }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailValid    = useMemo(() => emailRegex.test(email.trim()), [email]);
  const phoneValid    = useMemo(() => phoneDigits(phone).length >= 10, [phone]);
  const passwordValid = useMemo(() => password.length >= 6, [password]);
  const confirmValid  = useMemo(() => confirm === password && confirm.length > 0, [confirm, password]);
  const namesValid    = useMemo(() => firstName.trim().length > 1 && lastName.trim().length > 1, [firstName, lastName]);

  const canSubmit = namesValid && emailValid && phoneValid && passwordValid && confirmValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await onSubmit?.({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phoneDigits(phone),
        password,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.wrapper}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para continuar</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Seu nome"
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
                style={[styles.input, !!lastName && lastName.trim().length < 2 && styles.inputError]}
                returnKeyType="next"
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>E-mail</Text>
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

          <Text style={[styles.label, { marginTop: 12 }]}>Telefone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="(11) 91234-5678"
            keyboardType="phone-pad"
            style={[styles.input, !!phone && !phoneValid && styles.inputError]}
            returnKeyType="next"
          />
          {!!phone && !phoneValid && <Text style={styles.helperError}>Informe um telefone válido.</Text>}

          <Text style={[styles.label, { marginTop: 12 }]}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="mínimo 6 caracteres"
            secureTextEntry
            style={[styles.input, !!password && !passwordValid && styles.inputError]}
            returnKeyType="next"
          />
          {!!password && !passwordValid && <Text style={styles.helperError}>Mínimo de 6 caracteres.</Text>}

          <Text style={[styles.label, { marginTop: 12 }]}>Confirme a senha</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="repita a senha"
            secureTextEntry
            style={[styles.input, !!confirm && !confirmValid && styles.inputError]}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          {!!confirm && !confirmValid && <Text style={styles.helperError}>As senhas não conferem.</Text>}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
          </TouchableOpacity>

          {/* 🔗 Link para voltar ao login */}
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#111827', fontSize: 14, fontWeight: '600' }}>
              Já tem conta? Entrar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© {new Date().getFullYear()} Estética Automotiva</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, justifyContent: 'space-between', backgroundColor: '#fff' },
  header: { alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  form: { marginTop: 16 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, backgroundColor: '#FFFFFF', fontSize: 16 },
  inputError: { borderColor: '#EF4444' },
  helperError: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  button: { height: 50, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});
