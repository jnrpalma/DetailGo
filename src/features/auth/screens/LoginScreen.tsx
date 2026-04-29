import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';

import type { RootStackParamList } from '@app/types';
import { useAuth } from '@features/auth';

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
  accent: '#FF5C39',
} as const;
// ─────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_H * 0.52);

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      Alert.alert('Erro ao acessar', result.message || 'Email ou senha incorretos', [
        { text: 'Tentar novamente' },
      ]);
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
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={[styles.hero, { height: HERO_H }]}>
          {/* Pista em curva — perspectiva aérea de circuito */}
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 360 520" preserveAspectRatio="none">
            {/* Superfície da pista (fill muito sutil) */}
            <SvgPath
              d="M 420 520 C 390 370, 260 240, 130 160 C 60 118, -30 90, -70 55 L -70 -5 C -20 32, 80 68, 170 122 C 300 200, 410 360, 420 520 Z"
              fill="rgba(255,255,255,0.025)"
            />

            {/* Borda externa da pista */}
            <SvgPath
              d="M 420 520 C 390 370, 260 240, 130 160 C 60 118, -30 90, -70 55"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />

            {/* Borda interna da pista */}
            <SvgPath
              d="M 240 520 C 220 390, 155 280, 75 215 C 28 180, -18 162, -70 148"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
            />

            {/* Linha de corrida — tracejada neon */}
            <SvgPath
              d="M 325 520 C 305 380, 210 260, 103 188 C 48 155, -22 138, -70 102"
              stroke="rgba(212,255,61,0.28)"
              strokeWidth={1.2}
              strokeDasharray="26 14"
              fill="none"
              strokeLinecap="round"
            />

            {/* Marcadores de kerb externos (3 traços curtos) */}
            <SvgPath
              d="M 370 490 L 358 488"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <SvgPath
              d="M 330 420 L 320 412"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <SvgPath
              d="M 270 340 L 260 328"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <SvgPath
              d="M 190 268 L 180 256"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>

          {/* Glows */}
          <View style={styles.glowGreen} />
          <View style={styles.glowRed} />

          {/* Hero content — pinned to bottom */}
          <View style={styles.heroContent}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>ESTÉTICA AUTOMOTIVA</Text>
            </View>

            <Text style={styles.heroTitle}>
              {'DETAIL'}
              <Text style={{ color: D.primary }}>{'·'}</Text>
              {'\nGO.'}
            </Text>

            <Text style={styles.heroSub}>
              Agende serviços com a estética que cuida do seu carro.
            </Text>
          </View>
        </View>

        {/* ── Form ──────────────────────────────────────────── */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>E-MAIL</Text>
            <View style={[styles.field, touched.email && !isValidEmail && styles.fieldError]}>
              <Mail size={18} color={D.ink3} />
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                onBlur={() => handleBlur('email')}
                placeholder="seu@email.com"
                placeholderTextColor={D.ink3}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!loading}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>SENHA</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Recuperar senha',
                    'Enviaremos um link de recuperação para seu e-mail.',
                  )
                }
              >
                <Text style={styles.forgotText}>Esqueceu?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.field, touched.password && !isValidPassword && styles.fieldError]}>
              <Lock size={18} color={D.ink3} />
              <TextInput
                style={styles.fieldInput}
                value={password}
                onChangeText={setPassword}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                placeholderTextColor={D.ink3}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                {showPassword ? (
                  <EyeOff size={18} color={D.ink3} />
                ) : (
                  <Eye size={18} color={D.ink3} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0B0D0E" />
            ) : (
              <>
                <Text style={styles.btnText}>Entrar na garagem</Text>
                <View style={styles.btnArrow}>
                  <ArrowRight size={18} color="#0B0D0E" />
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Sem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Criar agora</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 DETAILGO</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.bg,
  },

  // ── Hero
  hero: {
    backgroundColor: '#000',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  glowGreen: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: -100,
    right: -80,
    borderRadius: 150,
    backgroundColor: 'rgba(212,255,61,0.14)',
  },
  glowRed: {
    position: 'absolute',
    width: 200,
    height: 200,
    bottom: -60,
    left: -60,
    borderRadius: 100,
    backgroundColor: 'rgba(255,92,57,0.09)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: D.primaryL,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: D.primary,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 60,
    fontWeight: '800',
    color: D.ink,
    letterSpacing: -2,
    lineHeight: 58,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 13,
    color: D.ink2,
    lineHeight: 20,
    maxWidth: 240,
  },

  // ── Form
  form: {
    padding: 22,
    gap: 14,
  },
  fieldWrap: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    height: 52,
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
    fontSize: 15,
    color: D.ink,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: D.primary,
  },

  // ── Button
  btn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: D.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    fontSize: 16,
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

  // ── Footer
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  registerText: {
    fontSize: 14,
    color: D.ink2,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: D.primary,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: D.ink3,
  },
});
