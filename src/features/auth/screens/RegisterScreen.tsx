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
import {
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Store,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';
import type { RegisterInput, UserRole } from '@features/auth/services/auth.service';
import { useForm } from '@shared/hooks/useForm';
import { validationUtils, validationMessages } from '@shared/utils/validation.utils';
import { formatUtils } from '@shared/utils/format.utils';

// ── Garage Dark palette ───────────────────────────────────────
const D = {
  bg: '#0B0D0E',
  card: '#191D20',
  ink: '#F5F7F8',
  ink2: '#A8B0B4',
  ink3: '#6B7378',
  primary: '#D4FF3D',
  primaryL: 'rgba(212,255,61,0.12)',
  border: 'rgba(255,255,255,0.08)',
  borderFocus: 'rgba(212,255,61,0.5)',
  accent: '#FF5C39',
} as const;
// ─────────────────────────────────────────────────────────────

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

const ACCOUNT_TYPES = [
  {
    key: 'customer' as UserRole,
    label: 'Cliente',
    desc: 'Quero agendar serviços para o meu carro.',
    badge: 'GRÁTIS',
    Icon: User,
  },
  {
    key: 'owner' as UserRole,
    label: 'Dono de estética',
    desc: 'Tenho um negócio e quero gerenciar agenda.',
    badge: 'PRO · R$ 89/mês',
    Icon: Store,
  },
];

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { register } = useAuth();

  const [accountType, setAccountType] = useState<UserRole | null>(null);
  const [displayPhone, setDisplayPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    setDisplayPhone(formatUtils.phoneMask(text));
    handleChange('phone', formatUtils.phoneDigits(text));
  };

  const handleSubmit = async () => {
    if (!accountType || !validateForm()) return;

    setIsSubmitting(true);
    const data: RegisterInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone,
      password: values.password,
      role: accountType,
      shopName: accountType === 'owner' ? values.shopName.trim() || 'Minha Estética' : undefined,
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
        `Seu código de convite é:\n\n${res.inviteCode}\n\nCompartilhe com seus clientes. Também disponível em Gerenciar Loja.`,
        [{ text: 'Entendido!' }],
      );
    } else {
      Alert.alert(
        'Conta criada!',
        'Peça o código de convite da estética no seu dashboard para agendar serviços.',
        [{ text: 'OK' }],
      );
    }
  };

  // ── Step 1: Seleção de tipo ────────────────────────────────
  if (!accountType) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor={D.bg} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.step1Header}>
            <Text style={styles.stepIndicator}>01 / 02 · TIPO</Text>
            <Text style={styles.step1Title}>Como você usa o DetailGo?</Text>
            <Text style={styles.step1Sub}>Escolha um perfil para começar.</Text>
          </View>

          {/* Cards */}
          <View style={styles.typeCards}>
            {ACCOUNT_TYPES.map(type => {
              const sel = accountType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeCard, sel && styles.typeCardSel]}
                  onPress={() => setAccountType(type.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.typeIconWrap, sel && styles.typeIconWrapSel]}>
                    <type.Icon size={20} color={sel ? '#0B0D0E' : D.ink} />
                  </View>
                  <View style={styles.typeCardBody}>
                    <View style={styles.typeCardTop}>
                      <Text style={[styles.typeCardLabel, sel && styles.typeCardLabelSel]}>
                        {type.label}
                      </Text>
                      <Text style={styles.typeCardBadge}>{type.badge}</Text>
                    </View>
                    <Text style={styles.typeCardDesc}>{type.desc}</Text>
                  </View>
                  <View style={[styles.typeRadio, sel && styles.typeRadioSel]}>
                    {sel && <CheckCircle2 size={14} color="#0B0D0E" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Trial notice */}
          <View style={styles.trialBox}>
            <Text style={styles.trialLabel}>TRIAL 14 DIAS</Text>
            <Text style={styles.trialDesc}>
              Donos começam com 14 dias grátis. Cancele quando quiser.
            </Text>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const isOwner = accountType === 'owner';

  // ── Step 2: Formulário ─────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={D.bg} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.step2Header}>
          <Text style={styles.stepIndicator}>02 / 02 · CADASTRO</Text>
          <Text style={styles.step2Title}>{isOwner ? 'Cadastrar\nestética' : 'Criar\nconta'}</Text>

          {/* Type switcher pill */}
          <TouchableOpacity style={styles.typePill} onPress={() => setAccountType(null)}>
            <ArrowLeft size={12} color={D.primary} />
            <Text style={styles.typePillText}>
              {isOwner ? 'Dono de estética' : 'Cliente'} · trocar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Campos */}
        <View style={styles.fields}>
          {isOwner && (
            <DField
              label="NOME DA ESTÉTICA"
              icon={<Store size={18} color={D.ink3} />}
              value={values.shopName}
              onChangeText={v => handleChange('shopName', v)}
              onBlur={() => handleBlur('shopName')}
              placeholder="Ex: Tirac Auto Detailing"
              error={touched.shopName ? errors.shopName : undefined}
            />
          )}

          <View style={styles.row}>
            <DField
              label="NOME"
              icon={<User size={18} color={D.ink3} />}
              value={values.firstName}
              onChangeText={v => handleChange('firstName', v)}
              onBlur={() => handleBlur('firstName')}
              placeholder="Nome"
              error={touched.firstName ? errors.firstName : undefined}
              containerStyle={styles.col}
            />
            <DField
              label="SOBRENOME"
              icon={<User size={18} color={D.ink3} />}
              value={values.lastName}
              onChangeText={v => handleChange('lastName', v)}
              onBlur={() => handleBlur('lastName')}
              placeholder="Sobrenome"
              error={touched.lastName ? errors.lastName : undefined}
              containerStyle={styles.col}
            />
          </View>

          <DField
            label="E-MAIL"
            icon={<Mail size={18} color={D.ink3} />}
            value={values.email}
            onChangeText={v => handleChange('email', v)}
            onBlur={() => handleBlur('email')}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={touched.email ? errors.email : undefined}
          />

          <DField
            label="TELEFONE"
            icon={<Phone size={18} color={D.ink3} />}
            value={displayPhone}
            onChangeText={handlePhoneChange}
            onBlur={() => handleBlur('phone')}
            placeholder="(11) 91234-5678"
            keyboardType="phone-pad"
            maxLength={15}
            error={touched.phone ? errors.phone : undefined}
          />

          <DField
            label="SENHA"
            icon={<Lock size={18} color={D.ink3} />}
            value={values.password}
            onChangeText={v => handleChange('password', v)}
            onBlur={() => handleBlur('password')}
            placeholder="mínimo 6 caracteres"
            secureTextEntry={!showPassword}
            error={touched.password ? errors.password : undefined}
            trailing={
              <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                {showPassword ? (
                  <EyeOff size={18} color={D.ink3} />
                ) : (
                  <Eye size={18} color={D.ink3} />
                )}
              </TouchableOpacity>
            }
          />

          <DField
            label="CONFIRMAR SENHA"
            icon={<Lock size={18} color={D.ink3} />}
            value={values.confirmPassword}
            onChangeText={v => handleChange('confirmPassword', v)}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder="repita a senha"
            secureTextEntry={!showConfirm}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            trailing={
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                {showConfirm ? (
                  <EyeOff size={18} color={D.ink3} />
                ) : (
                  <Eye size={18} color={D.ink3} />
                )}
              </TouchableOpacity>
            }
          />
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.btn, (!canSubmit || isSubmitting) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0B0D0E" />
            ) : (
              <>
                <Text style={styles.btnText}>
                  {isOwner ? 'Criar estética e conta' : 'Criar conta'}
                </Text>
                <View style={styles.btnArrow}>
                  <ArrowRight size={18} color="#0B0D0E" />
                </View>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Dark Field Component ───────────────────────────────────────
function DField({
  label,
  icon,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  trailing,
  keyboardType,
  autoCapitalize,
  maxLength,
  secureTextEntry,
  containerStyle,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  error?: string;
  trailing?: React.ReactNode;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
  secureTextEntry?: boolean;
  containerStyle?: any;
}) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, !!error && styles.fieldError]}>
        {icon}
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={D.ink3}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'words'}
          autoCorrect={false}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          editable
        />
        {trailing}
      </View>
      {!!error && <Text style={styles.fieldErrorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 24,
  },

  // ── Step 1
  step1Header: {
    marginBottom: 28,
  },
  stepIndicator: {
    fontSize: 10,
    fontWeight: '600',
    color: D.ink3,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  step1Title: {
    fontSize: 26,
    fontWeight: '700',
    color: D.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  step1Sub: {
    fontSize: 14,
    color: D.ink2,
    lineHeight: 20,
  },
  typeCards: {
    gap: 10,
    marginBottom: 16,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: D.card,
    borderWidth: 1,
    borderColor: D.border,
  },
  typeCardSel: {
    backgroundColor: D.primaryL,
    borderColor: D.primary,
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapSel: {
    backgroundColor: D.primary,
  },
  typeCardBody: {
    flex: 1,
  },
  typeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: D.ink,
  },
  typeCardLabelSel: {
    color: D.ink,
  },
  typeCardBadge: {
    fontSize: 9,
    fontWeight: '600',
    color: D.primary,
    letterSpacing: 0.5,
  },
  typeCardDesc: {
    fontSize: 12,
    color: D.ink2,
    lineHeight: 18,
  },
  typeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: D.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  typeRadioSel: {
    backgroundColor: D.primary,
    borderColor: D.primary,
  },
  trialBox: {
    padding: 14,
    backgroundColor: 'rgba(212,255,61,0.04)',
    borderWidth: 1,
    borderColor: D.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 24,
  },
  trialLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: D.ink3,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  trialDesc: {
    fontSize: 12,
    color: D.ink2,
    lineHeight: 18,
  },

  // ── Step 2
  step2Header: {
    marginBottom: 24,
  },
  step2Title: {
    fontSize: 30,
    fontWeight: '700',
    color: D.ink,
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 12,
    marginTop: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: D.primaryL,
    borderWidth: 1,
    borderColor: 'rgba(212,255,61,0.2)',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: D.primary,
  },

  // ── Fields
  fields: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  fieldWrap: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: D.ink3,
    letterSpacing: 0.5,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
    backgroundColor: D.card,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 14,
  },
  fieldError: {
    borderColor: D.accent,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: D.ink,
    fontWeight: '500',
  },
  fieldErrorText: {
    fontSize: 11,
    color: D.accent,
    marginTop: 2,
  },

  // ── CTA
  cta: {
    gap: 16,
  },
  btn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: D.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0D0E',
  },
  btnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: D.ink2,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: D.primary,
  },
});
