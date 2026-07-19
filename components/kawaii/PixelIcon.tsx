import { Image, Platform, StyleSheet } from 'react-native';

const ICONS = {
  headphones: require('@/assets/images/pixel/headphones.png'),
  bell: require('@/assets/images/pixel/bell.png'),
  book: require('@/assets/images/pixel/book.png'),
  heart: require('@/assets/images/pixel/heart.png'),
  alert: require('@/assets/images/pixel/alert.png'),
  bird: require('@/assets/images/pixel/bird.png'),
  catface: require('@/assets/images/pixel/catface.png'),
  megaphone: require('@/assets/images/pixel/megaphone.png'),
  musicnote: require('@/assets/images/pixel/musicnote.png'),
  question: require('@/assets/images/pixel/question.png'),
  zzz: require('@/assets/images/pixel/zzz.png'),
  bulb: require('@/assets/images/pixel/bulb.png'),
  sleepingcat: require('@/assets/images/pixel/sleepingcat.png'),
  mouse: require('@/assets/images/pixel/mouse.png'),
  cakeslice: require('@/assets/images/pixel/cakeslice.png'),
  paw: require('@/assets/images/paw_pixel.png'),
};

export type PixelIconName = keyof typeof ICONS;

export function PixelIcon({ name, size = 40 }: { name: PixelIconName; size?: number }) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, styles.image]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: Platform.select({
    web: { imageRendering: 'pixelated' } as any,
    default: {},
  }),
});
