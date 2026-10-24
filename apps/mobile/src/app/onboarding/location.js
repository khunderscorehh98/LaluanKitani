// First launch, step 2: explain location use before the system prompt appears.
// Either choice finishes onboarding; the map works without location.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import IconBell from '@tabler/icons-react-native/IconBell';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconMapPin from '@tabler/icons-react-native/IconMapPin';
import IconShield from '@tabler/icons-react-native/IconShield';
import { Button } from '../../components/Button';
import { LocationIllustration } from '../../components/LocationIllustration';
import { useSettings } from '../../store/settings';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

const reasons = [
  { Icon: IconMapPin, key: 'where' },
  { Icon: IconBell, key: 'warn' },
  { Icon: IconClock, key: 'plan' },
];

export default function WhyLocation() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const finishOnboarding = useSettings((state) => state.finishOnboarding);
  const [asking, setAsking] = useState(false);

  // Finishing onboarding switches the root layout's guard, which opens the tabs
  const onAllow = async () => {
    setAsking(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } finally {
      finishOnboarding();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          style={styles.back}
        >
          <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
        </Pressable>

        <LocationIllustration />

        <Text style={[type.h1, { color: colors.ink, marginTop: space[6] }]} accessibilityRole="header">
          {t('onboarding.location.title')}
        </Text>
        <Text style={[type.body, { color: colors.inkMuted, marginTop: space[2] }]}>
          {t('onboarding.location.intro')}
        </Text>

        <View style={styles.reasons}>
          {reasons.map(({ Icon, key }) => (
            <View key={key} style={styles.reason}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.selected }]}>
                <Icon size={22} strokeWidth={2} color={colors.tealText} />
              </View>
              <View style={styles.reasonText}>
                <Text style={[type.body, { color: colors.ink, fontFamily: fonts.bold }]}>
                  {t(`onboarding.location.${key}Title`)}
                </Text>
                <Text style={[type.small, { color: colors.inkMuted }]}>{t(`onboarding.location.${key}Body`)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
        <View style={styles.privacy}>
          <IconShield size={18} strokeWidth={2} color={colors.tealText} />
          <Text style={[type.small, styles.privacyText, { color: colors.ink }]}>{t('onboarding.location.privacy')}</Text>
        </View>

        <Button label={t('onboarding.location.allow')} onPress={onAllow} disabled={asking} />
        <Button
          label={t('onboarding.location.notNow')}
          onPress={finishOnboarding}
          variant="text"
          disabled={asking}
          style={{ marginTop: space[2] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: space[6], paddingBottom: space[4] },
  back: { alignSelf: 'flex-start', paddingVertical: space[4] },
  reasons: { gap: space[4], marginTop: space[6] },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  reasonIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  reasonText: { flex: 1 },
  spacer: { flexGrow: 1, minHeight: space[6] },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[4] },
  privacyText: { flex: 1 },
});
