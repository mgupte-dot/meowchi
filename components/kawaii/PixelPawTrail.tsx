import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const PAW_COUNT = 4;
const STEP_DELAY = 220;

export function PixelPawTrail({ size = 28 }: { size?: number }) {
  const values = useRef(Array.from({ length: PAW_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STEP_DELAY),
          Animated.timing(value, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.35, duration: 260, useNativeDriver: true }),
          Animated.delay((PAW_COUNT - i) * STEP_DELAY),
        ]),
      ),
    );
    Animated.stagger(0, loops).start();
    return () => loops.forEach((l) => l.stop());
  }, [values]);

  return (
    <View style={styles.row}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={{
            opacity: value,
            transform: [
              { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [4, -2] }) },
              { rotate: i % 2 === 0 ? '-12deg' : '12deg' },
            ],
          }}>
          <Image
            source={require('@/assets/images/paw_pixel.png')}
            style={{ width: size, height: size }}
            resizeMode="contain"
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
