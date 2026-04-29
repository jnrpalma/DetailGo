import React, { useMemo, useState } from 'react';
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
import { Mail, Lock, User, Phone, Store, ChevronRight } from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import type { RegisterInput, UserRole } from '@features/auth/services/auth.service';
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
  shopName: string;
  inviteCode: string;
};

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { register } = useAuth();

  const [accountType, setAccountType] = useState<UserRole | null>(null);
  const [displayPhone, setDisplayPhone] = useState('');

  const validationRules = {
    firstName: [
      { validate: (v: string) => validationUtils.name(v), message: validationMessages.name },
      {
        validate: (v: string) => validationUtils.required(v),
        message: validationMessages.required,
      },
    ],
    lastName: [
      { validate: (v: string) => validationUtils.name(v), message: validationMessages.lastName },
      {
        validate: (v: string) => validationUtils.required(v),
        message: validationMessages.required,
      },
    ],
    email: [
      { validate: (v: string) => validationUtils.email(v), message: validationMessages.email },
      {
        validate: (v: string) => validationUtils.required(v),
        message: validationMessages.required,
      },
    ],
    phone: [
      { validate: (v: string) => validationUtils.phone(v), message: validationMessages.phone },
    ],
    password: [
      {
        validate: (v: string) => validationUtils.password(v),
        message: validationMessages.password,
      },
      {
        validate: (v: string) => validationUtils.required(v),
        message: validationMessages.required,
      },
    ],
    confirmPassword: [] as { validate: (v: string) => boolean; message: string }[],
    shopName: [],
    inviteCode: [],
  };

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
      shopName: '',
      inviteCode: '',
    },
    validationRules,
  );

  React.useEffect(() => {
    if (validationRules.confirmPassword.length === 0) {
      validationRules.confirmPassword.push({
        validate: (v: string) => validationUtils.confirmPassword(values.password, v),
        message: validationMessages.confirmPassword,
      });
    }
  }, [values.password]);

  const canSubmit = useMemo(() => {
    if (!accountType) return false;
    const baseOk =
      Object.keys(errors).length === 0 &&
      values.firstName &&
      values.lastName &&
      values.email &&
      values.password &&
      values.confirmPassword &&
      !isSubmitting;

    return !!baseOk;
  }, [errors, values, isSubmitting, accountType]);

  const handlePhoneChange = (text: string) => {
    const masked = formatUtils.phoneMask(text);
    setDisplayPhone(masked);
    const digits = formatUtils.phoneDigits(text);
    handleChange('phone', digits);
  };

  const handleSubmit = async () => {
    if (!accountType) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    const data: RegisterInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone,
      password: values.password,
      role: accountType,
      shopName: accountType === 'owner' ? values.shopName.trim() || 'Minha Estética' : undefined,
      inviteCode: accountType === 'customer' ? values.inviteCode.trim().toUpperCase() : undefined,
    };

    const res = await register(data);
    setIsSubmitting(false);

    if (!res.ok) {
      Alert.alert('Erro', res.message ?? 'Falha ao cadastrar');
      return;
    }

    reset();
    setDisplayPhone('');
    setAccountType(null);

    if (accountType === 'owner' && res.inviteCode) {
      Alert.alert(
        'Estética criada!',
        `Seu código de convite é:\n\n${res.inviteCode}\n\nCompartilhe este código com seus clientes para que eles possam se cadastrar na sua loja.\n\nVocê também encontra o código em Gerenciar Loja.`,
        [{ text: 'Entendi!' }],
      );
    } else {
      Alert.alert(
        'Conta criada!',
        'Cadastro realizado com sucesso!\n\nPara agendar serviços, peça o código de convite da estética no seu dashboard.',
        [{ text: 'OK' }],
      );
    }
  };

  if (!accountType) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>DETAILGO</Text>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Como você vai usar o DetailGo?</Text>
          </View>

          <View style={styles.typeCards}>
            <TouchableOpacity
              style={styles.typeCard}
              onPress={() => setAccountType('owner')}
              activeOpacity={0.85}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: colors.primary.light }]}>
                <Store size={32} color={colors.primary.main} />
              </View>
              <View style={styles.typeCardText}>
                <Text style={styles.typeCardTitle}>Sou proprietário</Text>
                <Text style={styles.typeCardDesc}>
                  Tenho uma estética automotiva e quero gerenciar meus agendamentos
                </Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeCard}
              onPress={() => setAccountType('customer')}
              activeOpacity={0.85}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <User size={32} color={colors.status.success} />
              </View>
              <View style={styles.typeCardText}>
                <Text style={styles.typeCardTitle}>Sou cliente</Text>
                <Text style={styles.typeCardDesc}>
                  Quero agendar serviços em uma estética automotiva
                </Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Fazer login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.divider} />
            <Text style={styles.copyright}>© 2026 DETAILGO</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const isOwner = accountType === 'owner';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>DETAILGO</Text>
          <Text style={styles.title}>{isOwner ? 'Cadastrar estética' : 'Criar conta'}</Text>
          <Text style={styles.subtitle}>
            {isOwner
              ? 'Preencha os dados da sua estética e conta'
              : 'Preencha seus dados para criar sua conta'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backTypeButton}
          onPress={() => setAccountType(null)}
          activeOpacity={0.7}
        >
          <Text style={styles.backTypeText}>← {isOwner ? 'Proprietário' : 'Cliente'} · Trocar</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          {isOwner && (
            <Input
              label="Nome da estética"
              value={values.shopName}
              onChangeText={v => handleChange('shopName', v)}
              onBlur={() => handleBlur('shopName')}
              error={errors.shopName}
              touched={touched.shopName}
              leftIcon={<Store size={20} color={colors.text.tertiary} />}
              placeholder="Ex: Auto Detailing São Paulo"
              editable={!isSubmitting}
              returnKeyType="next"
            />
          )}

          <View style={styles.row}>
            <Input
              label="Nome"
              value={values.firstName}
              onChangeText={v => handleChange('firstName', v)}
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
              onChangeText={v => handleChange('lastName', v)}
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
            onChangeText={v => handleChange('email', v)}
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
            onChangeText={v => handleChange('password', v)}
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
            onChangeText={v => handleChange('confirmPassword', v)}
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
              <Text style={styles.buttonText}>
                {isOwner ? 'Criar estética e conta' : 'Criar conta'}
              </Text>
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
    marginBottom: 32,
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
  typeCards: {
    gap: spacing.md,
    marginBottom: 32,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.main,
    gap: spacing.md,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  typeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardText: {
    flex: 1,
  },
  typeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  typeCardDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  backTypeButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  backTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.main,
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
