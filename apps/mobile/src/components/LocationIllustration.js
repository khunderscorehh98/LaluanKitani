// Small map scene for the location onboarding screen: a Peak Spot, a route,
// a Flooded report and the driver's position. Drawn in SVG so it stays sharp.
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { radius, reportColors } from '../theme/tokens';

const scene = {
  light: { land: '#EEF0EC', water: '#CFE3EA', road: '#FFFFFF', casing: '#FFFFFF' },
  dark: { land: '#2B3544', water: '#1E3A4C', road: '#4B5563', casing: '#111827' },
};

export function LocationIllustration() {
  const { scheme, colors } = useTheme();
  const c = scene[scheme];

  return (
    <View style={[styles.frame, { backgroundColor: c.land }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 176" preserveAspectRatio="xMidYMid slice">
        <Path d="M0 112 C 90 104, 200 120, 360 108 L 360 176 L 0 176 Z" fill={c.water} />
        <Path d="M0 76 L 360 46" stroke={c.road} strokeWidth={14} />

        {/* Peak Spot zone with its clock badge */}
        <Ellipse cx={84} cy={72} rx={50} ry={30} fill={reportColors.peakZone[scheme]} stroke={reportColors.jammed} strokeWidth={1.5} />
        <Circle cx={84} cy={72} r={11} fill={reportColors.jammed} stroke="#FFFFFF" strokeWidth={2} />
        <G stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" fill="none">
          <Circle cx={84} cy={72} r={5} />
          <Path d="M84 69.5 V72 L85.8 73.5" />
        </G>

        {/* Route: white casing under teal */}
        <Path d="M160 176 C 160 110, 180 60, 260 0" stroke={c.casing} strokeWidth={12} fill="none" />
        <Path d="M160 176 C 160 110, 180 60, 260 0" stroke={colors.primary} strokeWidth={7} fill="none" />

        {/* Flooded report badge */}
        <Circle cx={262} cy={56} r={14} fill={reportColors.flooded} stroke="#FFFFFF" strokeWidth={2} />
        <G stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" fill="none">
          <Path d="M254 52 q2 -2 4 0 t4 0 t4 0 t4 0" />
          <Path d="M254 57 q2 -2 4 0 t4 0 t4 0 t4 0" />
          <Path d="M254 62 q2 -2 4 0 t4 0 t4 0 t4 0" />
        </G>

        {/* Driver position with accuracy halo */}
        <Circle cx={160} cy={146} r={24} fill={colors.primary} opacity={0.18} />
        <Circle cx={160} cy={146} r={9} fill={colors.primary} stroke="#FFFFFF" strokeWidth={3} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 176, borderRadius: radius.lg, overflow: 'hidden' },
});
