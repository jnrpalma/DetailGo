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
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Mail,
  Phone,
  Save,
  Check,
  X,
  RefreshCw,
  Pencil,
  User,
} from 'lucide-react-native';

import { getAuth } from '@react-native-firebase/auth';
import {
  getFirestore,
  doc,
  updateDoc,
  deleteField,
  onSnapshot,
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import { colors, spacing, radii } from '@shared/theme';
import type { RootStackParamList } from '@app/types';
import { Input } from '@shared/components/Input';
import { formatUtils } from '@shared/utils/format.utils';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  pendingEmail?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function toDigits(value: string) {
  return (value || '').replace(/\D/g, '');
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const db = getFirestore();
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  const uid = user?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingConfirm, setCheckingConfirm] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    pendingEmail: '',
  });

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const [editingPhone, setEditingPhone] = useState(false);
  const [displayPhone, setDisplayPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const userRef = useMemo(() => {
    if (!uid) return null;
    return doc(db, 'users', uid);
  }, [db, uid]);

  useEffect(() => {
    if (!userRef || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(userRef, snap => {
      const data = (snap.data() as UserProfile | undefined) ?? {};

      const authEmail = user.email || '';
      const pendingFromFirestore = data.pendingEmail || '';

      const shouldClearPending =
        pendingFromFirestore &&
        normalizeEmail(authEmail) === normalizeEmail(pendingFromFirestore);

      const phoneValue = data.phone || '';
      
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: phoneValue,
        email: authEmail || data.email || '',
        pendingEmail: shouldClearPending ? '' : pendingFromFirestore,
      });

      setNewPhone(phoneValue);
      setDisplayPhone(formatUtils.phoneMask(phoneValue));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRef, user]);

  const handleSave = async () => {
    if (!userRef) return;

    if (!profile.firstName?.trim() || !profile.lastName?.trim()) {
      Alert.alert('Atenção', 'Nome e sobrenome são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(userRef, {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneSave = async () => {
    if (!userRef) return;

    const cleanPhone = toDigits(newPhone || '');
    if (newPhone && cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Telefone inválido');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(userRef, {
        phone: cleanPhone,
      });

      setProfile(prev => ({ ...prev, phone: cleanPhone }));
      setEditingPhone(false);
      Alert.alert('Sucesso', 'Telefone atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível atualizar o telefone');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const masked = formatUtils.phoneMask(text);
    setDisplayPhone(masked);
    const digits = formatUtils.phoneDigits(text);
    setNewPhone(digits);
  };

  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setDisplayPhone(formatUtils.phoneMask(profile.phone || ''));
    setNewPhone(profile.phone || '');
  };

  const handleEmailUpdate = async () => {
    const currentUser = authInstance.currentUser;

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
      const methods = await authInstance.fetchSignInMethodsForEmail(nextEmail);
      if (methods.length > 0) {
        Alert.alert('Erro', 'Este e-mail já está em uso por outro usuário.');
        return;
      }

      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await currentUser.reauthenticateWithCredential(credential);

      await currentUser.verifyBeforeUpdateEmail(nextEmail);

      await updateDoc(userRef, {
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

      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        Alert.alert('Erro', 'Senha incorreta');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Erro', 'Muitas tentativas. Aguarde alguns minutos.');
      } else if (code === 'auth/requires-recent-login') {
        Alert.alert('Erro', 'Faça login novamente para alterar seu e-mail.');
      } else if (code === 'auth/email-already-in-use') {
        Alert.alert('Erro', 'Email já em uso por outro usuário.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Erro', 'Email inválido.');
      } else {
        Alert.alert(
          'Erro',
          `Não foi possível alterar.\n${error?.message || ''}`.trim(),
        );
      }
    } finally {
      setUpdatingEmail(false);
    }
  };

  const checkEmailConfirmed = async () => {
    const currentUser = authInstance.currentUser;
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
        await updateDoc(userRef, {
          email: updatedEmail,
          pendingEmail: deleteField(),
        });

        setProfile(prev => ({
          ...prev,
          email: updatedEmail || '',
          pendingEmail: '',
        }));

        Alert.alert(
          '✅ Email confirmado!',
          'Seu email foi atualizado com sucesso. Por favor, faça login novamente para continuar.',
          [
            {
              text: 'OK',
              onPress: () => {
                authInstance.signOut();
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Ainda não confirmado',
          'Clique no link que enviamos para seu novo email e tente novamente.',
        );
      }
    } catch (error: any) {
      console.error('Erro ao verificar confirmação:', error);

      if (error.code === 'auth/user-token-expired') {
        Alert.alert(
          '✅ Sessão expirada',
          'Seu email foi alterado com sucesso! Por favor, faça login novamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                authInstance.signOut();
              },
            },
          ],
        );
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
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={colors.text.primary} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Meu Perfil</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <View style={styles.row}>
                <Input
                  label="Nome *"
                  value={profile.firstName || ''}
                  onChangeText={(text) =>
                    setProfile({ ...profile, firstName: text })
                  }
                  leftIcon={<User size={20} color={colors.text.tertiary} />}
                  placeholder="Seu nome"
                  editable={!saving}
                  containerStyle={styles.col}
                />

                <Input
                  label="Sobrenome *"
                  value={profile.lastName || ''}
                  onChangeText={(text) =>
                    setProfile({ ...profile, lastName: text })
                  }
                  leftIcon={<User size={20} color={colors.text.tertiary} />}
                  placeholder="Seu sobrenome"
                  editable={!saving}
                  containerStyle={styles.col}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>

                {!editingEmail ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setEditingEmail(true)}
                      activeOpacity={0.7}
                      disabled={saving}
                    >
                      <View style={[styles.inputWrapper, styles.inputEditable]}>
                        <Mail size={18} color={colors.text.tertiary} />
                        <Text style={styles.valueText} numberOfLines={1}>
                          {profile.email || ''}
                        </Text>
                        <View style={styles.editBadge}>
                          <Pencil size={14} color={colors.primary.main} />
                          <Text style={styles.editText}>Alterar</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {!!profile.pendingEmail && (
                      <View style={styles.pendingBox}>
                        <Text style={styles.pendingTitle}>
                          Pendente de confirmação
                        </Text>
                        <Text style={styles.pendingEmail}>
                          {profile.pendingEmail}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.verifyButton,
                            checkingConfirm && styles.saveButtonDisabled,
                          ]}
                          onPress={checkEmailConfirmed}
                          disabled={checkingConfirm}
                          activeOpacity={0.7}
                        >
                          {checkingConfirm ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.text.white}
                            />
                          ) : (
                            <>
                              <RefreshCw size={16} color={colors.text.white} />
                              <Text style={styles.verifyButtonText}>
                                Verificar confirmação
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.hintText}>
                      Ao alterar, você receberá um link de confirmação no novo
                      e-mail.
                    </Text>
                  </>
                ) : (
                  <View style={styles.emailEditContainer}>
                    <Input
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="Novo email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!updatingEmail}
                    />

                    <Input
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Sua senha"
                      isPassword
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!updatingEmail}
                    />

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={cancelEmailEdit}
                        disabled={updatingEmail}
                      >
                        <X size={16} color={colors.text.white} />
                        <Text style={styles.actionText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={handleEmailUpdate}
                        disabled={updatingEmail}
                      >
                        {updatingEmail ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text.white}
                          />
                        ) : (
                          <>
                            <Check size={16} color={colors.text.white} />
                            <Text style={styles.actionText}>Confirmar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.hintText}>
                      Dica: se o novo e-mail já existir em outro usuário, o
                      Firebase pode não enviar o link.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefone</Text>

                {!editingPhone ? (
                  <TouchableOpacity
                    onPress={() => setEditingPhone(true)}
                    activeOpacity={0.7}
                    disabled={saving}
                  >
                    <View style={[styles.inputWrapper, styles.inputEditable]}>
                      <Phone size={18} color={colors.text.tertiary} />
                      <Text style={styles.valueText}>
                        {profile.phone
                          ? formatUtils.phoneMask(profile.phone)
                          : 'Não informado'}
                      </Text>
                      <View style={styles.editBadge}>
                        <Pencil size={14} color={colors.primary.main} />
                        <Text style={styles.editText}>Alterar</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.phoneEditContainer}>
                    <Input
                      value={displayPhone}
                      onChangeText={handlePhoneChange}
                      leftIcon={<Phone size={18} color={colors.text.tertiary} />}
                      placeholder="(11) 91234-5678"
                      keyboardType="phone-pad"
                      maxLength={15}
                      editable={!saving}
                    />

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={cancelPhoneEdit}
                        disabled={saving}
                      >
                        <X size={16} color={colors.text.white} />
                        <Text style={styles.actionText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={handlePhoneSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text.white}
                          />
                        ) : (
                          <>
                            <Check size={16} color={colors.text.white} />
                            <Text style={styles.actionText}>Salvar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <Text style={styles.hintText}>
                  Informe seu WhatsApp para receber notificações
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButtonBottom,
                  saving && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving || editingEmail || editingPhone}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <>
                    <Save size={18} color={colors.text.white} />
                    <Text style={styles.saveButtonText}>Salvar nome</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerPlaceholder: {
    width: 40,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },

  inputGroup: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
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
  inputEditable: {
    borderColor: colors.primary.main,
    borderWidth: 1,
  },

  valueText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },

  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },

  hintText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginLeft: 4,
  },

  emailEditContainer: {
    gap: spacing.sm,
  },
  phoneEditContainer: {
    gap: spacing.sm,
  },

  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  actionText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },

  cancelButton: {
    backgroundColor: colors.status.error,
  },
  confirmButton: {
    backgroundColor: colors.primary.main,
  },

  pendingBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.background.surface,
    gap: spacing.xs,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  pendingEmail: {
    fontSize: 14,
    color: colors.text.primary,
  },

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
  verifyButtonText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '700',
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
  saveButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});