// src/features/profile/screens/ProfileScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Mail, Phone, Save, Check, X, RefreshCw, Smartphone } from 'lucide-react-native';

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import { colors, spacing, radii } from '@shared/theme';
import type { RootStackParamList } from '@app/types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string; // armazenado como digits (sem máscara) ou com máscara na UI
  phoneVerified?: boolean;
  photoURL?: string;
  pendingEmail?: string;
  phoneE164?: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function toDigits(value: string) {
  return (value || '').replace(/\D/g, '');
}

function formatPhoneBR(text: string) {
  const numbers = toDigits(text);
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function mapPhoneError(error: any) {
  const code = error?.code || '';

  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (code === 'auth/invalid-phone-number') return 'Número de telefone inválido. Confira DDD e formato.';
  if (code === 'auth/invalid-verification-code') return 'Código inválido. Confira e tente novamente.';
  if (code === 'auth/code-expired') return 'Código expirado. Solicite um novo.';
  if (code === 'auth/credential-already-in-use') return 'Este telefone já está vinculado a outra conta.';
  if (code === 'auth/provider-already-linked') return 'Este telefone já está vinculado à sua conta.';

  return error?.message || 'Não foi possível realizar a verificação. Tente novamente.';
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const db = firestore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingConfirm, setCheckingConfirm] = useState(false);

  // 📱 Verificação de telefone
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerificationId, setPhoneVerificationId] = useState<string>(''); // vem do verifyPhoneNumber
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState(''); // E164 exibido no modal

  // Para controlar listener ativo e não vazar
  const [phoneUnsubscribe, setPhoneUnsubscribe] = useState<null | (() => void)>(null);

  const user = auth().currentUser;
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    phoneVerified: false,
    pendingEmail: '',
    phoneE164: null,
  });

  // Email edit
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const userRef = useMemo(() => {
    if (!uid) return null;
    return db.collection('users').doc(uid);
  }, [db, uid]);

  // Carrega perfil do Firestore
  useEffect(() => {
  if (!userRef) {
    setLoading(false);
    return;
  }

  const unsubscribe = userRef.onSnapshot((snap) => {
    const data = (snap.data() as UserProfile | undefined) ?? {};

    // ✅ SEMPRE pega o email atual do Auth, não de uma variável antiga
    const authEmail = auth().currentUser?.email || '';
    const pendingFromFirestore = data.pendingEmail || '';

    const shouldClearPending =
      pendingFromFirestore && normalizeEmail(authEmail) === normalizeEmail(pendingFromFirestore);

    setProfile({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone ? formatPhoneBR(data.phone) : '',
      phoneVerified: !!data.phoneVerified,
      email: authEmail || data.email || '',
      pendingEmail: shouldClearPending ? '' : pendingFromFirestore,
      phoneE164: data.phoneE164 ?? null,
    });

    setLoading(false);
  });

  return () => unsubscribe();
}, [userRef]); //

  // Cleanup listener verifyPhoneNumber ao desmontar
  useEffect(() => {
    return () => {
      if (phoneUnsubscribe) phoneUnsubscribe();
    };
  }, [phoneUnsubscribe]);

  const handleSave = async () => {
    if (!userRef) return;

    if (!profile.firstName?.trim() || !profile.lastName?.trim()) {
      Alert.alert('Atenção', 'Nome e sobrenome são obrigatórios');
      return;
    }

    const cleanPhone = toDigits(profile.phone || '');
    if (profile.phone && cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Telefone inválido');
      return;
    }

    setSaving(true);
    try {
      await userRef.update({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: cleanPhone,
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // 📱 VERIFICAÇÃO DE TELEFONE (CORRETA PARA LINKAR EM CONTA EXISTENTE)
  // - NÃO usa signInWithPhoneNumber (isso pode trocar currentUser)
  // - Usa verifyPhoneNumber -> pega verificationId -> linkWithCredential
  // =========================================================

  const clearPhoneVerificationState = () => {
    setPhoneCode('');
    setPhoneVerificationId('');
    setPhoneModalVisible(false);
    setNewPhoneNumber('');
    if (phoneUnsubscribe) {
      phoneUnsubscribe();
      setPhoneUnsubscribe(null);
    }
  };

  const startPhoneVerification = async () => {
  const cleanPhone = toDigits(profile.phone || '');

  if (!cleanPhone || cleanPhone.length < 10) {
    Alert.alert('Erro', 'Digite um telefone válido primeiro');
    return;
  }

  const formattedPhone = `+55${cleanPhone}`;
  setNewPhoneNumber(formattedPhone);

  // Cancela listener anterior se existir
  if (phoneUnsubscribe) {
    phoneUnsubscribe();
    setPhoneUnsubscribe(null);
  }

  setVerifyingPhone(true);

  try {
    // ✅ CORREÇÃO: O listener retorna uma função de unsubscribe
    const unsubscribe = auth()
      .verifyPhoneNumber(formattedPhone)
      .on('state_changed', 
        (snap) => {
          try {
            if (snap.state === auth.PhoneAuthState.CODE_SENT) {
              setPhoneVerificationId(snap.verificationId);
              setPhoneModalVisible(true);
              setVerifyingPhone(false);
              return;
            }

            if (snap.state === auth.PhoneAuthState.AUTO_VERIFIED) {
              if (snap.code) setPhoneCode(String(snap.code));
              setPhoneVerificationId(snap.verificationId);
              setPhoneModalVisible(true);
              setVerifyingPhone(false);
              return;
            }

            if (snap.state === auth.PhoneAuthState.ERROR) {
              setVerifyingPhone(false);
              console.error('verifyPhoneNumber error:', snap.error);
              Alert.alert('Erro', mapPhoneError(snap.error));
              return;
            }
          } catch (e) {
            setVerifyingPhone(false);
            console.error('state_changed handler error:', e);
          }
        },
        (error) => {
          // ✅ Tratamento de erro do listener
          setVerifyingPhone(false);
          console.error('Listener error:', error);
          Alert.alert('Erro', mapPhoneError(error));
        }
      );

    // ✅ Guarda a função de unsubscribe
    setPhoneUnsubscribe(() => unsubscribe);
    
  } catch (error: any) {
    setVerifyingPhone(false);
    console.error('Erro ao iniciar verificação:', error);
    Alert.alert('Erro', mapPhoneError(error));
  }
};

  const confirmPhoneCode = async () => {
  if (!phoneCode || phoneCode.trim().length < 6) {
    Alert.alert('Erro', 'Digite o código de 6 dígitos');
    return;
  }

  if (!phoneVerificationId) {
    Alert.alert('Erro', 'Verificação não iniciada. Tente novamente.');
    return;
  }

  const currentUser = auth().currentUser;
  if (!currentUser) {
    Alert.alert('Erro', 'Você precisa estar logado para verificar o telefone.');
    return;
  }

  setVerifyingPhone(true);

  try {
    const credential = auth.PhoneAuthProvider.credential(phoneVerificationId, phoneCode.trim());

    await currentUser.linkWithCredential(credential);
    await currentUser.reload();

    const cleanPhone = toDigits(profile.phone || '');

    await userRef?.update({
      phone: cleanPhone,
      phoneVerified: true,
      phoneE164: currentUser.phoneNumber || newPhoneNumber || null,
    });

    setProfile((prev) => ({ ...prev, phoneVerified: true, phoneE164: currentUser.phoneNumber || null }));

    Alert.alert('✅ Sucesso!', 'Telefone verificado com sucesso');

    clearPhoneVerificationState();
    
  } catch (error: any) {
    console.error('Erro ao confirmar código:', error);

    if (error.code === 'auth/provider-already-linked') {
      setProfile((prev) => ({ ...prev, phoneVerified: true }));
      Alert.alert('Info', 'Seu telefone já estava vinculado a esta conta.');
      clearPhoneVerificationState();
    } else {
      Alert.alert('Erro', mapPhoneError(error));
    }
  } finally {
    setVerifyingPhone(false);
  }
};

  // ✅ Alteração de email
  const handleEmailUpdate = async () => {
    const currentUser = auth().currentUser;

    if (!currentUser?.email) {
      Alert.alert('Erro', 'Usuário não está logado');
      return;
    }
    if (!userRef) {
      Alert.alert('Erro', 'Referência do usuário inválida');
      return;
    }

    const nextEmail = normalizeEmail(newEmail);

    if (!nextEmail.includes('@') || !nextEmail.includes('.')) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    if (normalizeEmail(currentUser.email) === nextEmail) {
      Alert.alert('Atenção', 'O novo e-mail é igual ao atual.');
      return;
    }

    if (!password) {
      Alert.alert('Erro', 'Digite sua senha para confirmar');
      return;
    }

    setUpdatingEmail(true);
    try {
      const methods = await auth().fetchSignInMethodsForEmail(nextEmail);
      if (methods.length > 0) {
        Alert.alert('Erro', 'Este e-mail já está em uso por outro usuário.');
        return;
      }

      const credential = auth.EmailAuthProvider.credential(currentUser.email, password);
      await currentUser.reauthenticateWithCredential(credential);

      await currentUser.verifyBeforeUpdateEmail(nextEmail);

      await userRef.update({
        pendingEmail: nextEmail,
      });

      Alert.alert(
        '📧 Link enviado!',
        'Verifique seu novo email e clique no link de confirmação.\n\n⚠️ IMPORTANTE: Após confirmar, você precisará fazer login novamente.',
        [
          {
            text: 'Entendi',
            onPress: () => {
              setEditingEmail(false);
              setNewEmail('');
              setPassword('');
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('❌ verifyBeforeUpdateEmail error:', error);
      const code = error?.code;

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        Alert.alert('Erro', 'Senha incorreta');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Erro', 'Muitas tentativas. Aguarde alguns minutos.');
      } else if (code === 'auth/requires-recent-login') {
        Alert.alert('Erro', 'Faça login novamente para alterar seu e-mail.');
      } else if (code === 'auth/email-already-in-use') {
        Alert.alert('Erro', 'Email já em uso por outro usuário.');
      } else {
        Alert.alert('Erro', `Não foi possível alterar.\n${error?.message || ''}`.trim());
      }
    } finally {
      setUpdatingEmail(false);
    }
  };

  // ✅ Verifica se o usuário confirmou o email
  const checkEmailConfirmed = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser?.email || !userRef) return;

    setCheckingConfirm(true);
    try {
      await currentUser.reload();
      const updatedEmail = currentUser.email;

      const pending = normalizeEmail(profile.pendingEmail || '');
      const authEmail = normalizeEmail(updatedEmail || '');

      if (!pending) {
        Alert.alert('Info', 'Não há e-mail pendente para confirmar.');
        return;
      }

      if (authEmail === pending) {
        await userRef.update({
          email: updatedEmail,
          pendingEmail: firestore.FieldValue.delete(),
        });

        setProfile((prev) => ({
          ...prev,
          email: updatedEmail || '',
          pendingEmail: '',
        }));

        Alert.alert('✅ Email confirmado!', 'Seu email foi atualizado. Faça login novamente para continuar.', [
          {
            text: 'OK',
            onPress: () => {
              auth().signOut();
            },
          },
        ]);
      } else {
        Alert.alert('Ainda não confirmado', 'Clique no link do novo e-mail e tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao verificar confirmação:', error);

      if (error.code === 'auth/user-token-expired') {
        Alert.alert('✅ Sessão expirada', 'Seu email foi alterado! Faça login novamente.', [
          {
            text: 'OK',
            onPress: () => {
              auth().signOut();
            },
          },
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível verificar a confirmação agora.');
      }
    } finally {
      setCheckingConfirm(false);
    }
  };

  const cancelEmailEdit = () => {
    setEditingEmail(false);
    setNewEmail('');
    setPassword('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <ArrowLeft size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Meu Perfil</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              {/* Nome e Sobrenome */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Nome *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    placeholderTextColor={colors.text.disabled}
                    value={profile.firstName || ''}
                    onChangeText={(text) => setProfile({ ...profile, firstName: text })}
                    editable={!editingEmail && !phoneModalVisible}
                  />
                </View>

                <View style={styles.col}>
                  <Text style={styles.label}>Sobrenome *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Seu sobrenome"
                    placeholderTextColor={colors.text.disabled}
                    value={profile.lastName || ''}
                    onChangeText={(text) => setProfile({ ...profile, lastName: text })}
                    editable={!editingEmail && !phoneModalVisible}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>

                {!editingEmail ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setEditingEmail(true)}
                      activeOpacity={0.7}
                      disabled={saving || phoneModalVisible}
                    >
                      <View style={[styles.inputWrapper, styles.inputEditable]}>
                        <Mail size={18} color={colors.text.tertiary} />
                        <Text style={styles.emailText}>{profile.email || ''}</Text>
                        <Text style={styles.editText}>Alterar</Text>
                      </View>
                    </TouchableOpacity>

                    {!!profile.pendingEmail && (
                      <View style={styles.pendingBox}>
                        <Text style={styles.pendingTitle}>Pendente de confirmação</Text>
                        <Text style={styles.pendingEmail}>{profile.pendingEmail}</Text>

                        <TouchableOpacity
                          style={[styles.verifyButton, checkingConfirm && styles.saveButtonDisabled]}
                          onPress={checkEmailConfirmed}
                          disabled={checkingConfirm || phoneModalVisible}
                          activeOpacity={0.7}
                        >
                          {checkingConfirm ? (
                            <ActivityIndicator size="small" color={colors.text.white} />
                          ) : (
                            <>
                              <RefreshCw size={16} color={colors.text.white} />
                              <Text style={styles.verifyButtonText}>Verificar confirmação</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.hintText}>
                      Ao alterar, você receberá um link de confirmação no novo e-mail.
                    </Text>
                  </>
                ) : (
                  <View style={styles.emailEditContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Novo email"
                      placeholderTextColor={colors.text.disabled}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!phoneModalVisible}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Sua senha"
                      placeholderTextColor={colors.text.disabled}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!phoneModalVisible}
                    />

                    <View style={styles.emailEditActions}>
                      <TouchableOpacity
                        style={[styles.emailActionButton, styles.cancelButton]}
                        onPress={cancelEmailEdit}
                        disabled={updatingEmail || phoneModalVisible}
                      >
                        <X size={16} color={colors.text.white} />
                        <Text style={styles.emailActionText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.emailActionButton, styles.confirmButton]}
                        onPress={handleEmailUpdate}
                        disabled={updatingEmail || phoneModalVisible}
                      >
                        {updatingEmail ? (
                          <ActivityIndicator size="small" color={colors.text.white} />
                        ) : (
                          <>
                            <Check size={16} color={colors.text.white} />
                            <Text style={styles.emailActionText}>Confirmar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Telefone com verificação */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefone</Text>

                <View style={styles.phoneContainer}>
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <Phone size={18} color={colors.text.tertiary} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="(11) 91234-5678"
                      placeholderTextColor={colors.text.disabled}
                      value={profile.phone || ''}
                      onChangeText={(text) => {
                        setProfile({
                          ...profile,
                          phone: formatPhoneBR(text),
                          phoneVerified: false, // ao editar, perde verificação
                        });
                      }}
                      keyboardType="phone-pad"
                      maxLength={15}
                      editable={!editingEmail && !phoneModalVisible}
                    />
                  </View>

                  {profile.phoneVerified ? (
                    <View style={styles.verifiedBadge}>
                      <Check size={16} color={colors.status.success} />
                      <Text style={styles.verifiedText}>Verificado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.verifyPhoneButton,
                        (!profile.phone || profile.phone.length < 14) && styles.verifyPhoneButtonDisabled,
                      ]}
                      onPress={startPhoneVerification}
                      disabled={!profile.phone || profile.phone.length < 14 || verifyingPhone || editingEmail}
                    >
                      {verifyingPhone ? (
                        <ActivityIndicator size="small" color={colors.text.white} />
                      ) : (
                        <>
                          <Smartphone size={16} color={colors.text.white} />
                          <Text style={styles.verifyPhoneText}>Verificar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.hintText}>
                  {profile.phoneVerified ? '✅ Telefone verificado' : 'Verifique seu telefone para receber notificações por SMS'}
                </Text>
              </View>

              {/* Botão Salvar */}
              <TouchableOpacity
                style={[styles.saveButtonBottom, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || editingEmail || phoneModalVisible}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <>
                    <Save size={18} color={colors.text.white} />
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal para código SMS */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          clearPhoneVerificationState();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verificar Telefone</Text>
            <Text style={styles.modalSubtitle}>Enviamos um código SMS para:</Text>
            <Text style={styles.modalPhone}>{newPhoneNumber}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Digite o código de 6 dígitos"
              placeholderTextColor={colors.text.disabled}
              value={phoneCode}
              onChangeText={setPhoneCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  clearPhoneVerificationState();
                }}
                disabled={verifyingPhone}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmPhoneCode}
                disabled={verifyingPhone || phoneCode.trim().length < 6}
              >
                {verifyingPhone ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalResend}
              onPress={() => {
                // limpa code antigo e reenviar
                setPhoneCode('');
                setPhoneVerificationId('');
                startPhoneVerification();
              }}
              disabled={verifyingPhone}
            >
              <Text style={styles.modalResendText}>Reenviar código</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.main },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.main,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  headerPlaceholder: { width: 40 },

  content: { padding: spacing.lg, paddingTop: spacing.xl },
  form: { gap: spacing.md },

  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },

  inputGroup: { marginBottom: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },

  input: {
    height: 48,
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.main,
    marginBottom: spacing.sm,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  inputEditable: { borderColor: colors.primary.main, borderWidth: 1 },

  inputField: { flex: 1, fontSize: 16, color: colors.text.primary, paddingVertical: 12 },

  emailText: { flex: 1, fontSize: 16, color: colors.text.primary },
  editText: { fontSize: 14, fontWeight: '600', color: colors.primary.main, paddingHorizontal: spacing.sm },

  hintText: { fontSize: 12, color: colors.text.tertiary, marginTop: spacing.xs, marginLeft: 4 },

  emailEditContainer: { gap: spacing.sm },
  emailEditActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  emailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  cancelButton: { backgroundColor: colors.text.disabled },
  confirmButton: { backgroundColor: colors.primary.main },
  emailActionText: { color: colors.text.white, fontSize: 14, fontWeight: '600' },

  pendingBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.background.surface,
    gap: 6,
  },
  pendingTitle: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  pendingEmail: { fontSize: 14, color: colors.text.primary },

  verifyButton: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary.main,
  },
  verifyButtonText: { color: colors.text.white, fontSize: 14, fontWeight: '700' },

  phoneContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  verifyPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 6,
    minWidth: 100,
  },
  verifyPhoneButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  verifyPhoneText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  verifiedText: {
    color: colors.status.success,
    fontSize: 14,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.main,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalPhone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalInput: {
    height: 52,
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.main,
    marginBottom: spacing.lg,
    textAlign: 'center',
    letterSpacing: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.text.disabled,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary.main,
  },
  modalButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalResend: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalResendText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },

  saveButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  saveButtonText: { color: colors.text.white, fontSize: 16, fontWeight: '600' },
  saveButtonDisabled: { opacity: 0.6 },
});