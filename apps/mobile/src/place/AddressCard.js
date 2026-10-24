// Address and the local names people use for the place.
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

export function AddressCard({ address, aliases }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!address && !aliases.length) return null;

  return (
    <Card title={t('place.address')}>
      {address ? (
        <Text style={[type.body, { color: colors.ink }]} selectable>
          {address}
        </Text>
      ) : null}
      {aliases.length > 0 && (
        <>
          <Text style={[type.caption, styles.aka, { color: colors.inkMuted }]}>{t('place.alsoKnownAs').toUpperCase()}</Text>
          <View style={styles.chips}>
            {aliases.map(({ alias }) => (
              <View key={alias} style={[styles.chip, { backgroundColor: colors.selected }]}>
                <Text style={[type.small, styles.chipText, { color: colors.ink }]}>{alias}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  aka: { marginTop: space[3], marginBottom: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.sm },
  chipText: { fontFamily: fonts.bold },
});
