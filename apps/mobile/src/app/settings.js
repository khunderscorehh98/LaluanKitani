// Settings: language, privacy and account. Voice guidance and notification
// switches come with navigation and push notifications (TODO sections 7, 9).
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import { apiDelete, apiPost } from '../api/client';
import { ListRow } from '../components/ListRow';
import { SectionHeader } from '../components/SectionHeader';
import { useRecentSearches } from '../store/recentSearches';
import { useSavedPlaces } from '../store/savedPlaces';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

const LANGUAGES = [
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'en', name: 'English' },
];

function Value({ children }) {
  const { colors } = useTheme();
  return <Text style={[type.small, { color: colors.inkMuted }]}>{children}</Text>;
}

export default function Settings() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const setLanguage = useSettings((state) => state.setLanguage);
  const clearSearches = useRecentSearches((state) => state.clear);
  const recentCount = useRecentSearches((state) => state.items.length);
  const clearSavedPlaces = useSavedPlaces((state) => state.clearAll);
  const { token, user, signOut } = useSession();
  const [permission] = Location.useForegroundPermissions();
  const [busy, setBusy] = useState(false);

  const locationText = permission?.granted
    ? t('settings.locationWhileUsing')
    : permission?.canAskAgain === false || permission?.status === 'denied'
      ? t('settings.locationOff')
      : t('settings.locationNotAsked');

  const confirmClearSearches = () =>
    Alert.alert(t('settings.clearHistory'), t('settings.clearHistoryConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.clear'), style: 'destructive', onPress: clearSearches },
    ]);

  const finishSignOut = () => {
    signOut();
    queryClient.removeQueries({ queryKey: ['me'] });
  };

  const onSignOut = async () => {
    setBusy(true);
    await apiPost('/v1/auth/sign-out').catch(() => {});
    finishSignOut();
    setBusy(false);
  };

  const confirmDelete = () =>
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiDelete('/v1/me');
            // Saved places and search history live on this phone: remove them too
            clearSavedPlaces();
            clearSearches();
            finishSignOut();
            Alert.alert(t('settings.deletedTitle'), t('settings.deletedBody'));
          } catch {
            Alert.alert(t('settings.deleteFailed'), t('map.offline'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12}>
          <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
        </Pressable>
        <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title={t('settings.language')} />
        <View style={[styles.segmentWrap, { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline }]}>
          <View style={[styles.segment, { backgroundColor: colors.hairline }]} accessibilityRole="radiogroup">
            {LANGUAGES.map(({ code, name }) => {
              const active = i18n.language === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLanguage(code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.segmentOption, active && [styles.segmentActive, { backgroundColor: colors.surfaceRaised }]]}
                >
                  <Text style={[type.body, styles.segmentText, { color: colors.ink }]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SectionHeader title={t('settings.privacy')} />
        <ListRow
          title={t('settings.locationAccess')}
          onPress={() => Linking.openSettings()}
          trailing={<Value>{locationText}</Value>}
        />
        <ListRow
          title={t('settings.clearHistory')}
          subtitle={recentCount ? t('settings.recentCount', { count: recentCount }) : t('settings.noHistory')}
          onPress={recentCount ? confirmClearSearches : undefined}
        />

        <SectionHeader title={t('settings.account')} />
        {token ? (
          <>
            <ListRow
              title={t('settings.signedInWithEmail')}
              subtitle={user?.email}
              trailing={<Value>{user?.nickname}</Value>}
            />
            <ListRow title={t('profile.signOut')} onPress={busy ? undefined : onSignOut} />
            <ListRow title={t('settings.deleteAccount')} strong onPress={busy ? undefined : confirmDelete} />
          </>
        ) : (
          <ListRow
            title={t('profile.signIn')}
            subtitle={t('profile.signedOutBody')}
            onPress={() => router.push({ pathname: '/sign-in', params: { reason: 'profile' } })}
          />
        )}

        <View style={styles.footer}>
          <Text style={[type.small, { color: colors.inkMuted }]}>{t('settings.mapCredit')}</Text>
          <Text style={[type.small, { color: colors.inkMuted }]}>
            Laluan Kitani · {t('brand.descriptor')} · {Constants.expoConfig?.version}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  content: { paddingBottom: space[8] },
  segmentWrap: { padding: space[3], borderBottomWidth: StyleSheet.hairlineWidth },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segmentOption: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: { fontFamily: fonts.bold },
  footer: { padding: space[4], gap: space[1] },
});
