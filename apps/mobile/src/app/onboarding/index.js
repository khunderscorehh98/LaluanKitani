// First launch, step 1: choose language. Shown in both languages, since the
// user hasn't picked one yet.
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import i18n from 'i18next';
import IconUser from '@tabler/icons-react-native/IconUser';
import { Button } from '../../components/Button';
import { deviceLanguage } from '../../i18n';
import { useSettings } from '../../store/settings';
import { useTheme } from '../../theme/useTheme';
import { fonts, palette, radius, space, type } from '../../theme/tokens';

const ms = i18n.getFixedT('ms');
const en = i18n.getFixedT('en');
const both = (key, separator = ' · ') => `${ms(key)}${separator}${en(key)}`;

const languages = [
  { code: 'ms', name: 'Bahasa Melayu', t: ms },
  { code: 'en', name: 'English', t: en },
];

function LanguageOption({ name, note, selected, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.option,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
        selected && { backgroundColor: colors.selected, borderColor: colors.primary },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? colors.ink : colors.inkMuted }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: colors.ink }]} />}
      </View>
      <View style={styles.optionText}>
        <Text style={[type.body, { color: colors.ink, fontFamily: fonts.bold }]}>{name}</Text>
        <Text style={[type.small, { color: colors.inkMuted }]}>{note}</Text>
      </View>
    </Pressable>
  );
}

export default function ChooseLanguage() {
  const router = useRouter();
  const { colors } = useTheme();
  const setLanguage = useSettings((state) => state.setLanguage);
  const [choice, setChoice] = useState(() => useSettings.getState().language ?? deviceLanguage());

  const onContinue = () => {
    setLanguage(choice);
    router.push('/onboarding/location');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image source={require('../../../assets/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
          <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">
            Laluan <Text style={{ color: colors.tealText }}>Kitani</Text>
          </Text>
          <Text style={[type.h3, { color: colors.ink, marginTop: space[2] }]}>{ms('brand.tagline')}</Text>
          <Text style={[type.small, styles.center, { color: colors.inkMuted, marginTop: space[3] }]}>
            {both('brand.descriptor', '\n')}
          </Text>
        </View>

        <Text style={[type.h3, { color: colors.ink, marginBottom: space[3] }]}>
          {ms('onboarding.language.title')}
          <Text style={{ fontFamily: fonts.medium, color: colors.inkMuted }}> · {en('onboarding.language.title')}</Text>
        </Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {languages.map((language) => (
            <LanguageOption
              key={language.code}
              name={language.name}
              note={language.t('onboarding.language.optionNote')}
              selected={choice === language.code}
              onPress={() => setChoice(language.code)}
            />
          ))}
        </View>
        <Text style={[type.small, { color: colors.inkMuted, marginTop: space[3] }]}>
          {both('onboarding.language.changeLater')}
        </Text>

        <View style={styles.spacer} />
        <View style={[styles.notice, { backgroundColor: colors.friendly }]}>
          <IconUser size={20} strokeWidth={2} color={palette.charcoal} />
          <Text style={[type.small, styles.noticeText]}>{both('onboarding.language.noAccount', '\n')}</Text>
        </View>

        <Button label={both('common.continue')} onPress={onContinue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, padding: space[6], paddingTop: space[12] },
  brand: { alignItems: 'center', marginBottom: space[8] },
  // Source artwork is the full-bleed 1024 px app icon, rounded here like a launcher
  icon: { width: 104, height: 104, borderRadius: 24, marginBottom: space[4] },
  center: { textAlign: 'center' },
  options: { gap: space[3] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  optionText: { flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  // Pushes the notice and button to the bottom on tall screens
  spacer: { flexGrow: 1, minHeight: space[6] },
  notice: {
    marginBottom: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
  },
  // Warm sand is light in both modes, so its text is always charcoal
  noticeText: { flex: 1, color: palette.charcoal },
});
