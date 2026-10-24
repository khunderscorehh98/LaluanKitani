import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
// One file per icon: importing the package root would bundle all ~5,000 icons
import IconMap from '@tabler/icons-react-native/IconMap';
import IconBookmark from '@tabler/icons-react-native/IconBookmark';
import IconUser from '@tabler/icons-react-native/IconUser';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius } from '../../theme/tokens';

/** Tab icon with the mint pill behind it when selected, as in the designs. */
function TabIcon({ Icon, focused, color, selectedColor }) {
  return (
    <View style={[styles.pill, focused && { backgroundColor: selectedColor }]}>
      <Icon size={22} strokeWidth={2} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const icon = (Icon) =>
    function renderIcon({ focused, color }) {
      return <TabIcon Icon={Icon} focused={focused} color={color} selectedColor={colors.selected} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tealText,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopColor: colors.hairline,
        },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.map'), tabBarIcon: icon(IconMap) }} />
      <Tabs.Screen name="saved" options={{ title: t('tabs.saved'), tabBarIcon: icon(IconBookmark) }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon(IconUser) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
