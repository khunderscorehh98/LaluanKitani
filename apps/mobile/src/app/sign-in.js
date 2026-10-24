// Sign in with an emailed 6-digit code, then pick a nickname the first time.
// Shown only when a feature needs an account (e.g. posting a report).
// Google / Apple buttons come once the app has its OAuth client IDs.
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconX from '@tabler/icons-react-native/IconX';
import { ApiError, apiPatch, apiPost } from '../api/client';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useSession } from '../store/session';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

const symbols = {
  light: require('../../assets/symbol-on-light.png'),
  dark: require('../../assets/symbol-on-dark.png'),
};

const RESEND_AFTER_SECONDS = 30;
const NICKNAME = /^[a-z0-9_]{3,30}$/;

function errorText(t, error) {
  if (!(error instanceof ApiError)) return t('map.offline');
  const known = ['invalid_code', 'too_many_requests', 'nickname_taken', 'account_unavailable'];
  return known.includes(error.code) ? t(`signIn.errors.${error.code}`) : t('signIn.errors.generic');
}

export default function SignIn() {
  const { reason = 'report' } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const signIn = useSession((state) => state.signIn);
  const setUser = useSession((state) => state.setUser);
  const pendingNickname = useSession((state) => state.token && !state.user?.nickname);

  // 'email' -> 'code' -> 'nickname'. Resumes at the nickname step if it was skipped before.
  const [step, setStep] = useState(pendingNickname ? 'nickname' : 'email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const res = await apiPost('/v1/auth/email/start', { email: email.trim() });
      // Development only: the API returns the code because no email is sent yet
      setDevCode(res.dev_code ?? null);
      setCode('');
      setResendIn(RESEND_AFTER_SECONDS);
      setStep('code');
    });

  const verify = (value) =>
    run(async () => {
      const res = await apiPost('/v1/auth/email/verify', { email: email.trim(), code: value });
      signIn({ token: res.token, user: res.user });
      if (res.needs_nickname) setStep('nickname');
      else router.back();
    });

  const saveNickname = () =>
    run(async () => {
      const res = await apiPatch('/v1/me', { nickname: nickname.trim().toLowerCase() });
      setUser(res.user);
      router.back();
    });

  const onCodeChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verify(digits);
  };

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const nicknameValid = NICKNAME.test(nickname.trim().toLowerCase());

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={12}
            style={styles.close}
          >
            <IconX size={24} strokeWidth={2} color={colors.ink} />
          </Pressable>
          <Image source={symbols[scheme]} style={styles.symbol} accessibilityIgnoresInvertColors />

          {step === 'email' && (
            <>
              <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">
                {t(`signIn.title.${reason}`)}
              </Text>
              <Text style={[type.body, styles.lead, { color: colors.inkMuted }]}>{t(`signIn.why.${reason}`)}</Text>
              <TextField
                label={t('signIn.email')}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={() => emailValid && sendCode()}
                error={error}
                style={styles.field}
              />
              <Button label={t('signIn.emailMeACode')} onPress={sendCode} disabled={!emailValid || busy} />
              <Text style={[type.small, styles.note, { color: colors.inkMuted }]}>{t('signIn.codeNote')}</Text>
            </>
          )}

          {step === 'code' && (
            <>
              <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">
                {t('signIn.enterCode')}
              </Text>
              <Text style={[type.body, styles.lead, { color: colors.inkMuted }]}>
                {t('signIn.codeSentTo', { email: email.trim() })}
              </Text>
              {devCode && (
                <View style={[styles.devBox, { borderColor: colors.inkMuted }]}>
                  <Text style={[type.small, { color: colors.ink }]}>{t('signIn.devCode', { code: devCode })}</Text>
                </View>
              )}
              <TextField
                label={t('signIn.code')}
                value={code}
                onChangeText={onCodeChange}
                placeholder="······"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                editable={!busy}
                error={error}
                inputStyle={styles.codeInput}
                style={styles.field}
              />
              <Button
                label={resendIn > 0 ? t('signIn.resendIn', { seconds: resendIn }) : t('signIn.resend')}
                variant="text"
                onPress={sendCode}
                disabled={resendIn > 0 || busy}
              />
              <Button
                label={t('signIn.otherEmail')}
                variant="text"
                onPress={() => {
                  setStep('email');
                  setError(null);
                }}
              />
            </>
          )}

          {step === 'nickname' && (
            <>
              <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">
                {t('signIn.pickNickname')}
              </Text>
              <Text style={[type.body, styles.lead, { color: colors.inkMuted }]}>{t('signIn.nicknameWhy')}</Text>
              <TextField
                label={t('signIn.nickname')}
                value={nickname}
                onChangeText={setNickname}
                placeholder="pemandu_gadong"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                maxLength={30}
                hint={t('signIn.nicknameRules')}
                error={error}
                style={styles.field}
              />
              <Button label={t('common.continue')} onPress={saveNickname} disabled={!nicknameValid || busy} />
            </>
          )}

          <View style={styles.spacer} />
          <Text style={[type.small, { color: colors.inkMuted }]}>{t('signIn.privacy')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: space[6], paddingTop: space[2] },
  close: { alignSelf: 'flex-start', paddingVertical: space[3] },
  // Source artwork is 697 × 596
  symbol: { width: 56, height: 48, marginTop: space[4], marginBottom: space[4] },
  lead: { marginTop: space[2] },
  field: { marginTop: space[6], marginBottom: space[4] },
  note: { marginTop: space[3] },
  codeInput: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  devBox: { marginTop: space[4], padding: space[3], borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.sm },
  spacer: { flexGrow: 1, minHeight: space[6] },
});
