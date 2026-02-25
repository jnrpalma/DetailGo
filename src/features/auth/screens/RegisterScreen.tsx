// src/features/auth/screens/RegisterScreen.tsx
import React, { useMemo } from 'react';
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
import { Mail, Lock, User, Phone } from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import type { RegisterInput } from '@features/auth/services/auth.service';
import { colors, radii, spacing } from '@shared/theme';
import { useForm } from '@shared/hooks/useForm';
import { Input } from '@shared/components/Input';
import { validationUtils, validationMessages } from '@shared/utils/validation.utils';
import { formatUtils } from '@shared/utils/format.utils';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { register } = useAuth();

  // Estado para exibição do telefone com máscara
  const [displayPhone, setDisplayPhone] = React.useState('');

  // 👇 EXTRAIR VALIDAÇÕES PARA FORA DO useForm PARA EVITAR REFERÊNCIA CIRCULAR
  const validationRules = {
    firstName: [
      { validate: (v: string) => validationUtils.name(v), message: validationMessages.name },
      { validate: (v: string) => validationUtils.required(v), message: validationMessages.required },
    ],
    lastName: [
      { validate: (v: string) => validationUtils.name(v), message: validationMessages.lastName },
      { validate: (v: string) => validationUtils.required(v), message: validationMessages.required },
    ],
    email: [
      { validate: (v: string) => validationUtils.email(v), message: validationMessages.email },
      { validate: (v: string) => validationUtils.required(v), message: validationMessages.required },
    ],
    phone: [
      { validate: (v: string) => validationUtils.phone(v), message: validationMessages.phone },
    ],
    password: [
      { validate: (v: string) => validationUtils.password(v), message: validationMessages.password },
      { validate: (v: string) => validationUtils.required(v), message: validationMessages.required },
    ],
    confirmPassword: [] as { validate: (v: string) => boolean; message: string }[], // Inicializa vazio
  };

  // Configuração do formulário com useForm
  const {
    values,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    validateForm,
    reset,
  } = useForm<RegisterForm>(
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
    validationRules
  );

  // 👇 ADICIONA VALIDAÇÃO DE CONFIRMAÇÃO DE SENHA DEPOIS QUE O FORM ESTÁ INICIALIZADO
  // Isso evita a referência circular
  React.useEffect(() => {
    if (validationRules.confirmPassword.length === 0) {
      validationRules.confirmPassword.push({
        validate: (v: string) => validationUtils.confirmPassword(values.password, v),
        message: validationMessages.confirmPassword
      });
    }
  }, [values.password]);

  const canSubmit = useMemo(() => {
    return (
      Object.keys(errors).length === 0 &&
      values.firstName &&
      values.lastName &&
      values.email &&
      values.password &&
      values.confirmPassword &&
      !isSubmitting
    );
  }, [errors, values, isSubmitting]);

  const handlePhoneChange = (text: string) => {
    // Aplica máscara para exibição
    const masked = formatUtils.phoneMask(text);
    setDisplayPhone(masked);
    
    // Armazena apenas dígitos no estado
    const digits = formatUtils.phoneDigits(text);
    handleChange('phone', digits);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const data: RegisterInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone,
      password: values.password,
    };

    const res = await register(data);
    setIsSubmitting(false);

    if (!res.ok) {
      Alert.alert('Erro', res.message ?? 'Falha ao cadastrar');
      return;
    }

    Alert.alert('Conta criada!', 'Seu cadastro foi realizado com sucesso.', [
      { text: 'Fazer login', onPress: () => navigation.navigate('Login') },
    ]);
    
    reset();
    setDisplayPhone('');
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
          <Text style={styles.title}>Criar nova conta</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para começar a{'\n'}
            agendar serviços automotivos
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <Input
              label="Nome"
              value={values.firstName}
              onChangeText={(v) => handleChange('firstName', v)}
              onBlur={() => handleBlur('firstName')}
              error={errors.firstName}
              touched={touched.firstName}
              leftIcon={<User size={20} color={colors.text.tertiary} />}
              placeholder="Seu nome"
              editable={!isSubmitting}
              returnKeyType="next"
              containerStyle={styles.col}
            />

            <Input
              label="Sobrenome"
              value={values.lastName}
              onChangeText={(v) => handleChange('lastName', v)}
              onBlur={() => handleBlur('lastName')}
              error={errors.lastName}
              touched={touched.lastName}
              leftIcon={<User size={20} color={colors.text.tertiary} />}
              placeholder="Seu sobrenome"
              editable={!isSubmitting}
              returnKeyType="next"
              containerStyle={styles.col}
            />
          </View>

          <Input
            label="E-mail"
            value={values.email}
            onChangeText={(v) => handleChange('email', v)}
            onBlur={() => handleBlur('email')}
            error={errors.email}
            touched={touched.email}
            leftIcon={<Mail size={20} color={colors.text.tertiary} />}
            placeholder="seu@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!isSubmitting}
          />

          <Input
            label="Telefone"
            value={displayPhone}
            onChangeText={handlePhoneChange}
            onBlur={() => handleBlur('phone')}
            error={errors.phone}
            touched={touched.phone}
            leftIcon={<Phone size={20} color={colors.text.tertiary} />}
            placeholder="(11) 91234-5678"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            editable={!isSubmitting}
            maxLength={15}
          />

          <Input
            label="Senha"
            value={values.password}
            onChangeText={(v) => handleChange('password', v)}
            onBlur={() => handleBlur('password')}
            error={errors.password}
            touched={touched.password}
            leftIcon={<Lock size={20} color={colors.text.tertiary} />}
            placeholder="mínimo 6 caracteres"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            editable={!isSubmitting}
          />

          <Input
            label="Confirmar senha"
            value={values.confirmPassword}
            onChangeText={(v) => handleChange('confirmPassword', v)}
            onBlur={() => handleBlur('confirmPassword')}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
            leftIcon={<Lock size={20} color={colors.text.tertiary} />}
            placeholder="repita a senha"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            editable={!isSubmitting}
          />

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    backgroundColor: colors.background.main,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary.main,
    letterSpacing: 2,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
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
    gap: spacing.md,
    marginBottom: 0,
  },
  col: {
    flex: 1,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary.main,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.main,
  },
  footer: {
    marginTop: 'auto',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginBottom: spacing.lg,
  },
  copyright: {
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});