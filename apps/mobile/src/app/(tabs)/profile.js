// Profile tab. For now: sign in / sign out and who is signed in. Points,
// badges, My reports and Settings come with TODO section 9.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiPost } from '../../api/client';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useSession } from '../../store/session';
import { useTheme } from '../../theme/useTheme';
import { fonts, space, type } from '../../theme/tokens';

export default function ProfileTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { token, user, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  const openSignIn = () => router.push({ pathname: '/sign-in', params: { reason: 'profile' } });

  const onSignOut = async () => {
    setBusy(true);
    // Sign out here even if the server can't be reached; the session then just expires
    await apiPost('/v1/auth/sign-out').catch(() => {});
    signOut();
    setBusy(false);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">
          {t('tabs.profile')}
        </Text>

        {!token && (
          <Card title={t('profile.signedOutTitle')} subtitle={t('profile.signedOutBody')}>
            <Button label={t('profile.signIn')} onPress={openSignIn} />
          </Card>
        )}

        {token && !user?.nickname && (
          <Card title={t('profile.needsNicknameTitle')} subtitle={t('profile.needsNicknameBody')}>
            <Button label={t('profile.pickNickname')} onPress={openSignIn} />
          </Card>
        )}

        {token && user?.nickname && (
          <Card>
            <Text style={[type.h2, styles.nickname, { color: colors.ink }]}>{user.nickname}</Text>
            <Text style={[type.small, { color: colors.inkMuted }]}>{user.email}</Text>
          </Card>
        )}

        {token && (
          <Button label={t('profile.signOut')} variant="text" onPress={onSignOut} disabled={busy} />
        )}

        <View style={styles.spacer} />
        <Text style={[type.small, { color: colors.inkMuted }]}>{t('profile.comingSoon')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: space[4], paddingTop: space[6], gap: space[4] },
  nickname: { fontFamily: fonts.extraBold },
  spacer: { flexGrow: 1 },
});
