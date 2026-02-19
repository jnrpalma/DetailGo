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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Mail, Phone, Save, Check, X, RefreshCw } from 'lucide-react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import { colors, spacing, radii } from '@shared/theme';
import type { RootStackParamList } from '@app/types';

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

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const db = firestore();
  const user = auth().currentUser;

  const uid = user?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [checkingConfirm, setCheckingConfirm] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    pendingEmail: '',
  });

  // Estados para edição de email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const userRef = useMemo(() => {
    if (!uid) return null;
    return db.collection('users').doc(uid);
  }, [db, uid]);

  // Carrega os dados do perfil
  useEffect(() => {
    if (!userRef || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = userRef.onSnapshot((snap) => {
      const data = (snap.data() as UserProfile | undefined) ?? {};
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        email: user.email || data.email || '',
        pendingEmail: data.pendingEmail || '',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRef, user]);

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const handleSave = async () => {
    if (!userRef) return;

    if (!profile.firstName?.trim() || !profile.lastName?.trim()) {
      Alert.alert('Atenção', 'Nome e sobrenome são obrigatórios');
      return;
    }

    const cleanPhone = profile.phone?.replace(/\D/g, '') || '';
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

  // ✅ TESTE: Email de verificação
  const testarEmailSimples = async () => {
    setTestando(true);
    try {
      const currentUser = auth().currentUser;

      if (!currentUser?.email) {
        Alert.alert('Erro', 'Usuário não está logado');
        return;
      }

      await currentUser.sendEmailVerification();

      Alert.alert(
        '✅ Sucesso!',
        `Email de verificação enviado para:\n${currentUser.email}\n\nConfira Caixa de Entrada e SPAM.`
      );
    } catch (error: any) {
      console.error('❌ sendEmailVerification error:', error);
      Alert.alert('❌ Erro ao enviar email', `${error?.code || ''}\n${error?.message || ''}`.trim());
    } finally {
      setTestando(false);
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
      // Pré-checagem: esse e-mail já está em uso?
      const methods = await auth().fetchSignInMethodsForEmail(nextEmail);
      if (methods.length > 0) {
        Alert.alert('Erro', 'Este e-mail já está em uso por outro usuário.');
        return;
      }

      // Reautenticar
      const credential = auth.EmailAuthProvider.credential(currentUser.email, password);
      await currentUser.reauthenticateWithCredential(credential);

      // Enviar link para novo email
      await currentUser.verifyBeforeUpdateEmail(nextEmail);

      // Salvar pendência no Firestore
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
            }
          }
        ]
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
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Erro', 'Email inválido.');
      } else {
        Alert.alert('Erro', `Não foi possível alterar.\n${error?.message || ''}`.trim());
      }
    } finally {
      setUpdatingEmail(false);
    }
  };

  // ✅ Verifica se o usuário confirmou o email (com tratamento de token expirado)
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

        Alert.alert(
          '✅ Email confirmado!',
          'Seu email foi atualizado com sucesso. Por favor, faça login novamente para continuar.',
          [
            {
              text: 'OK',
              onPress: () => {
                auth().signOut();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Ainda não confirmado',
          'Clique no link que enviamos para seu novo email e tente novamente.'
        );
      }
    } catch (error: any) {
      console.error('Erro ao verificar confirmação:', error);
      
      // TRATAMENTO ESPECÍFICO PARA TOKEN EXPIRADO
      if (error.code === 'auth/user-token-expired') {
        Alert.alert(
          '✅ Sessão expirada',
          'Seu email foi alterado com sucesso! Por favor, faça login novamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                auth().signOut();
              }
            }
          ]
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={colors.text.primary} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Meu Perfil</Text>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || editingEmail}
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

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              {/* Botão de teste */}
              <TouchableOpacity
                style={[styles.testButton, testando && styles.testButtonDisabled]}
                onPress={testarEmailSimples}
                disabled={testando}
              >
                {testando ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.testButtonText}>TESTAR ENVIO DE EMAIL</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

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
                    editable={!editingEmail}
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
                    editable={!editingEmail}
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
                      disabled={saving}
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
                          disabled={checkingConfirm}
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
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Sua senha"
                      placeholderTextColor={colors.text.disabled}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />

                    <View style={styles.emailEditActions}>
                      <TouchableOpacity
                        style={[styles.emailActionButton, styles.cancelButton]}
                        onPress={cancelEmailEdit}
                        disabled={updatingEmail}
                      >
                        <X size={16} color={colors.text.white} />
                        <Text style={styles.emailActionText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.emailActionButton, styles.confirmButton]}
                        onPress={handleEmailUpdate}
                        disabled={updatingEmail}
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

                    <Text style={styles.hintText}>
                      Dica: se o novo e-mail já existir em outro usuário, o Firebase pode não enviar o link.
                    </Text>
                  </View>
                )}
              </View>

              {/* Telefone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefone</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="(11) 91234-5678"
                    placeholderTextColor={colors.text.disabled}
                    value={profile.phone || ''}
                    onChangeText={(text) => setProfile({ ...profile, phone: formatPhone(text) })}
                    keyboardType="phone-pad"
                    maxLength={15}
                    editable={!editingEmail}
                  />
                </View>
                <Text style={styles.hintText}>Informe seu WhatsApp para receber notificações</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 6,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.text.white, fontSize: 14, fontWeight: '600' },

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

  testButton: {
    backgroundColor: '#4CAF50',
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  testButtonDisabled: { opacity: 0.6 },
  testButtonText: { color: colors.text.white, fontSize: 16, fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border.main, marginVertical: spacing.md },

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
});