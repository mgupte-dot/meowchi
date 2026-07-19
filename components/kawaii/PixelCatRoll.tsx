import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';

export function PixelCatRoll({ size = 96 }: { size?: number }) {
  const roll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(roll, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(roll, {
          toValue: -1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(roll, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [roll]);

  const rotate = roll.interpolate({ inputRange: [-1, 1], outputRange: ['-28deg', '28deg'] });
  const translateX = roll.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] });

  return (
    <Animated.View style={{ transform: [{ translateX }, { rotate }] }}>
      <Image
        source={require('@/assets/images/pixel/catroll.png')}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: Platform.select({
    web: { imageRendering: 'pixelated' } as any,
    default: {},
  }),
});
