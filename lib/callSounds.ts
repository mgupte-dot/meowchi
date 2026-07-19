// Real cat vocalization recordings (CC0, see assets/sounds/ATTRIBUTIONS.md) used to
// call, soothe, or excite a cat — swapped in after synthesized tones didn't get any
// real-world reaction from an actual cat.

import { PixelIconName } from '@/components/kawaii/PixelIcon';

export type SoundPreset = {
  id: string;
  label: string;
  icon: PixelIconName;
  description: string;
  source: number;
};

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'come-here',
    label: 'Come Here!',
    icon: 'bell',
    description: 'A short, real cat meow — a curious, attention-grabbing call.',
    source: require('@/assets/sounds/come-here.mp3'),
  },
  {
    id: 'cuddle-time',
    label: 'Cuddle Time',
    icon: 'sleepingcat',
    description: 'A real recorded purr, low and warm, to invite snuggles.',
    source: require('@/assets/sounds/cuddle-time.mp3'),
  },
  {
    id: 'playtime',
    label: 'Playtime!',
    icon: 'mouse',
    description: 'A real kitten mewing in quick bursts — playful and energetic.',
    source: require('@/assets/sounds/playtime.mp3'),
  },
  {
    id: 'sweet-greeting',
    label: 'Sweet Greeting',
    icon: 'cakeslice',
    description: 'A soft, brief meow asking for attention — a gentle hello.',
    source: require('@/assets/sounds/sweet-greeting.mp3'),
  },
];
