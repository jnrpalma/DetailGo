import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';

type Props = { onSubmit: (email: string, password: string) => void | Promise<void> };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function LoginScreen({ onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailValid = useMemo(() => emailRegex.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.trim().length >= 6, [password]);
  const canSubmit = emailValid && passwordValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await onSubmit(email.trim(), password);
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
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, backgroundColor: '#FFFFFF', fontSize: 16 },
  inputError: { borderColor: '#EF4444' },
  helperError: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  button: { height: 50, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});
