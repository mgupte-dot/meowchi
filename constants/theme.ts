export const Palette = {
  // Core kawaii pinks
  blush: '#FFE6EF',
  cottonCandy: '#FFD1E3',
  bubblegum: '#FFADCB',
  sakura: '#FF8FB1',
  strawberry: '#FF6B9D',
  raspberry: '#E44E86',

  // Accents
  lilac: '#E4C1F9',
  babyBlue: '#C6E7FF',
  mint: '#C8F4DE',
  butter: '#FFF3B0',
  peach: '#FFCBA4',

  // Neutrals
  cream: '#FFF9FB',
  white: '#FFFFFF',
  cocoa: '#6B4A56',
  plum: '#4A2E3A',
  dustyRose: '#B98A9A',
  outline: '#F3C6D6',
};

export const Theme = {
  background: Palette.cream,
  backgroundGradient: [Palette.blush, Palette.cream] as const,
  surface: Palette.white,
  surfaceAlt: Palette.blush,
  primary: Palette.strawberry,
  primaryDark: Palette.raspberry,
  primaryLight: Palette.cottonCandy,
  accent: Palette.lilac,
  textPrimary: Palette.plum,
  textSecondary: Palette.dustyRose,
  textOnPrimary: Palette.white,
  border: Palette.outline,
  shadow: 'rgba(228, 78, 134, 0.18)',
};

export const Fonts = {
  display: 'Baloo2_700Bold',
  heading: 'Baloo2_600SemiBold',
  body: 'Quicksand_500Medium',
  bodyBold: 'Quicksand_700Bold',
  bodyRegular: 'Quicksand_400Regular',
};

export const Radii = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 34,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Shadow = {
  soft: {
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
};
