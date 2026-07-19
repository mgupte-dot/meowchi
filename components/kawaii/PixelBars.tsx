import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Theme } from '@/constants/theme';

const BAR_HEIGHTS = [10, 18, 26, 16, 22, 12];

export function PixelBars({
  active = true,
  color = Theme.primary,
  barWidth = 6,
}: {
  active?: boolean;
  color?: string;
  barWidth?: number;
}) {
  const values = useRef(BAR_HEIGHTS.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!active) {
      values.forEach((v) => v.setValue(0.3));
      return;
    }
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.timing(value, {
            toValue: 1,
            duration: 260 + i * 30,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.25,
            duration: 260 + i * 30,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, values]);

  return (
    <View style={styles.row}>
      {BAR_HEIGHTS.map((h, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            height: h,
            backgroundColor: color,
            transform: [{ scaleY: values[i] }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 26,
  },
});
