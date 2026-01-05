import { AlienSubtype, AttackKind, Faction, ProjectileStyle, VisualFamily } from '../types';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type SfxKind =
  | 'muzzle'
  | 'impact'
  | 'explosion'
  | 'heal'
  | 'shockwave'
  | 'summon'
  | 'death'
  | 'emp_wave'
  | 'laser_beam'
  | 'healing_field'
  | 'glitch';

export interface PlaySfxOptions {
  style?: ProjectileStyle;
  cardId?: string;
  variant?: 'ionic' | 'bio' | 'ember' | 'laser' | 'plasma' | 'missile' | 'beam';
  faction?: Faction;
  subfaction?: AlienSubtype | VisualFamily;
  alienSubtype?: AlienSubtype;
  visualFamily?: VisualFamily;
  attackKind?: AttackKind;
  at?: number;
}

interface SfxClip {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  pitchBend?: number;
  noise?: boolean;
}

const throttleTimestamps: Record<string, number> = {};
const throttleDefaults: Partial<Record<SfxKind, number>> = {
  muzzle: 80,
  impact: 70,
  explosion: 220,
  heal: 140,
  healing_field: 220,
  shockwave: 260,
  summon: 260,
  death: 240,
  emp_wave: 260,
  laser_beam: 160,
  glitch: 260
};

const ALIEN_SUBTYPES = new Set<string>(Object.values(AlienSubtype));
const VISUAL_FAMILIES = new Set<VisualFamily>(['humano', 'ciber', 'organico']);

const SPORE_PATTERN = /(spore|spora|venom|venen|poison|toxin)/i;

const resolveAttackKind = (type: SfxKind, options: PlaySfxOptions): AttackKind => {
  if (options.attackKind) return options.attackKind;
  if (type === 'heal' || type === 'healing_field') return 'heal';
  const hintedCardId = options.cardId;
  if (hintedCardId && SPORE_PATTERN.test(hintedCardId)) return 'spore';
  if (options.style === 'none') return 'melee';
  if (options.style === 'laser' || options.style === 'beam') return 'laser';
  return 'damage';
};

const resolveSpeciesKey = (options: PlaySfxOptions): string => {
  const subfaction = options.subfaction ?? options.alienSubtype ?? options.visualFamily;
  if (options.faction === Faction.ALIEN) {
    if (subfaction && ALIEN_SUBTYPES.has(subfaction as string)) {
      return `alien_${(subfaction as AlienSubtype).toLowerCase()}`;
    }
    return 'alien';
  }
  if (options.faction === Faction.ANDROID) return 'android';
  if (options.faction === Faction.HUMAN) return 'human';
  if (subfaction && VISUAL_FAMILIES.has(subfaction as VisualFamily)) {
    const mapping: Record<VisualFamily, string> = { humano: 'human', ciber: 'android', organico: 'alien' };
    return mapping[subfaction as VisualFamily];
  }
  return 'default';
};

const resolveVariant = (type: SfxKind, options: PlaySfxOptions): { variant: string; attackKind: AttackKind; speciesKey: string } => {
  const attackKind = resolveAttackKind(type, options);
  const speciesKey = resolveSpeciesKey(options);
  if (options.variant) return { variant: options.variant, attackKind, speciesKey };
  return { variant: `${attackKind}_${speciesKey}`, attackKind, speciesKey };
};

const clipLibrary: Record<string, SfxClip> = {
  // Muzzle / attack releases
  'muzzle:laser_human': { frequency: 1340, duration: 0.08, type: 'sawtooth', gain: 0.18, pitchBend: -200 },
  'muzzle:laser_android': { frequency: 1500, duration: 0.07, type: 'square', gain: 0.19, pitchBend: -260 },
  'muzzle:laser_alien_humanoid': { frequency: 1120, duration: 0.1, type: 'triangle', gain: 0.17, pitchBend: -160 },
  'muzzle:damage_human': { frequency: 900, duration: 0.12, type: 'square', gain: 0.17, pitchBend: -140 },
  'muzzle:damage_android': { frequency: 980, duration: 0.11, type: 'square', gain: 0.18, pitchBend: -180 },
  'muzzle:damage_alien': { frequency: 760, duration: 0.13, type: 'sawtooth', gain: 0.18, pitchBend: -120 },
  'muzzle:spore_alien_aracnid': { frequency: 520, duration: 0.14, type: 'sine', gain: 0.17, pitchBend: -60, noise: true },
  'muzzle:spore_alien_slimoid': { frequency: 460, duration: 0.16, type: 'triangle', gain: 0.18, pitchBend: -90, noise: true },
  'muzzle:melee_human': { frequency: 640, duration: 0.13, type: 'square', gain: 0.2, pitchBend: -90 },
  'muzzle:melee_android': { frequency: 720, duration: 0.12, type: 'square', gain: 0.21, pitchBend: -130 },
  'muzzle:melee_alien_aracnid': { frequency: 540, duration: 0.14, type: 'triangle', gain: 0.22, pitchBend: -110 },
  'muzzle:laser_default': { frequency: 1260, duration: 0.08, type: 'sawtooth', gain: 0.16, pitchBend: -140 },
  'muzzle:damage_default': { frequency: 860, duration: 0.1, type: 'square', gain: 0.15 },
  'muzzle:spore_default': { frequency: 500, duration: 0.14, type: 'sine', gain: 0.16, noise: true },
  'muzzle:melee_default': { frequency: 600, duration: 0.12, type: 'triangle', gain: 0.19, pitchBend: -80 },
  'muzzle:default': { frequency: 820, duration: 0.1, type: 'square', gain: 0.15 },

  // Impacts
  'impact:laser_human': { frequency: 1320, duration: 0.08, type: 'sawtooth', gain: 0.15 },
  'impact:laser_android': { frequency: 1420, duration: 0.08, type: 'square', gain: 0.16, pitchBend: -160 },
  'impact:laser_alien_humanoid': { frequency: 1180, duration: 0.1, type: 'triangle', gain: 0.16, pitchBend: -130 },
  'impact:damage_human': { frequency: 960, duration: 0.12, type: 'square', gain: 0.18, pitchBend: -140 },
  'impact:damage_android': { frequency: 1040, duration: 0.1, type: 'triangle', gain: 0.18, pitchBend: -200 },
  'impact:damage_alien': { frequency: 760, duration: 0.12, type: 'sine', gain: 0.17 },
  'impact:spore_alien_aracnid': { frequency: 520, duration: 0.14, type: 'sine', gain: 0.18, noise: true },
  'impact:spore_alien_slimoid': { frequency: 480, duration: 0.15, type: 'triangle', gain: 0.19, pitchBend: -60, noise: true },
  'impact:melee_human': { frequency: 640, duration: 0.12, type: 'square', gain: 0.19, pitchBend: -120 },
  'impact:melee_android': { frequency: 720, duration: 0.12, type: 'square', gain: 0.2, pitchBend: -180 },
  'impact:melee_alien_aracnid': { frequency: 560, duration: 0.12, type: 'triangle', gain: 0.2, pitchBend: -90 },
  'impact:laser_default': { frequency: 1300, duration: 0.08, type: 'sawtooth', gain: 0.14 },
  'impact:damage_default': { frequency: 900, duration: 0.1, type: 'square', gain: 0.16 },
  'impact:spore_default': { frequency: 500, duration: 0.14, type: 'sine', gain: 0.16, noise: true },
  'impact:melee_default': { frequency: 620, duration: 0.12, type: 'triangle', gain: 0.18 },
  'impact:default': { frequency: 900, duration: 0.1, type: 'square', gain: 0.16 },

  // Explosions and death (generic damage identity)
  'explosion:damage_human': { frequency: 460, duration: 0.32, type: 'sawtooth', gain: 0.23, noise: true },
  'explosion:damage_android': { frequency: 520, duration: 0.3, type: 'square', gain: 0.24, noise: true, pitchBend: -120 },
  'explosion:damage_alien': { frequency: 400, duration: 0.34, type: 'triangle', gain: 0.23, noise: true, pitchBend: -80 },
  'explosion:spore_default': { frequency: 360, duration: 0.34, type: 'sine', gain: 0.22, noise: true, pitchBend: -50 },
  'explosion:damage_default': { frequency: 420, duration: 0.3, type: 'triangle', gain: 0.2, noise: true },
  'explosion:default': { frequency: 420, duration: 0.3, type: 'triangle', gain: 0.2, noise: true },

  'death:damage_human': { frequency: 440, duration: 0.32, type: 'triangle', gain: 0.19, pitchBend: -180 },
  'death:damage_android': { frequency: 700, duration: 0.28, type: 'square', gain: 0.21, pitchBend: -200 },
  'death:damage_alien': { frequency: 520, duration: 0.3, type: 'sine', gain: 0.19, pitchBend: -170 },
  'death:damage_default': { frequency: 440, duration: 0.3, type: 'triangle', gain: 0.18, pitchBend: -180 },
  'death:default': { frequency: 440, duration: 0.3, type: 'triangle', gain: 0.18, pitchBend: -180 },

  // Healing
  'heal:heal_human': { frequency: 940, duration: 0.34, type: 'sine', gain: 0.15 },
  'heal:heal_android': { frequency: 1180, duration: 0.32, type: 'triangle', gain: 0.16, pitchBend: -60 },
  'heal:heal_alien': { frequency: 780, duration: 0.36, type: 'sine', gain: 0.15, pitchBend: -40 },
  'heal:heal_default': { frequency: 880, duration: 0.34, type: 'sine', gain: 0.14 },
  'heal:default': { frequency: 880, duration: 0.34, type: 'sine', gain: 0.14 },

  // Shockwaves and summons (use damage identity)
  'shockwave:damage_human': { frequency: 420, duration: 0.28, type: 'triangle', gain: 0.22, pitchBend: -120 },
  'shockwave:damage_android': { frequency: 760, duration: 0.24, type: 'square', gain: 0.21, pitchBend: -200 },
  'shockwave:damage_alien': { frequency: 540, duration: 0.28, type: 'sine', gain: 0.21, pitchBend: -100 },
  'shockwave:damage_default': { frequency: 520, duration: 0.26, type: 'triangle', gain: 0.21, pitchBend: -140 },
  'shockwave:default': { frequency: 520, duration: 0.26, type: 'triangle', gain: 0.21, pitchBend: -140 },

  'summon:damage_human': { frequency: 640, duration: 0.25, type: 'sine', gain: 0.17 },
  'summon:damage_android': { frequency: 820, duration: 0.23, type: 'triangle', gain: 0.17, pitchBend: -60 },
  'summon:damage_alien': { frequency: 560, duration: 0.26, type: 'sine', gain: 0.17 },
  'summon:melee_default': { frequency: 520, duration: 0.25, type: 'triangle', gain: 0.17, pitchBend: -50 },
  'summon:damage_default': { frequency: 620, duration: 0.25, type: 'sine', gain: 0.16 },
  'summon:default': { frequency: 620, duration: 0.25, type: 'sine', gain: 0.16 },

  // EMP waves
  'emp_wave:laser_human': { frequency: 420, duration: 0.38, type: 'sawtooth', gain: 0.23, noise: true, pitchBend: -220 },
  'emp_wave:laser_android': { frequency: 520, duration: 0.36, type: 'square', gain: 0.24, noise: true, pitchBend: -240 },
  'emp_wave:laser_alien': { frequency: 360, duration: 0.4, type: 'triangle', gain: 0.21, noise: true, pitchBend: -160 },
  'emp_wave:laser_default': { frequency: 400, duration: 0.38, type: 'triangle', gain: 0.22, noise: true, pitchBend: -180 },
  'emp_wave:default': { frequency: 400, duration: 0.38, type: 'triangle', gain: 0.22, noise: true, pitchBend: -180 },

  // Laser beams (channeled)
  'laser_beam:laser_human': { frequency: 1680, duration: 0.22, type: 'sawtooth', gain: 0.17, pitchBend: -260 },
  'laser_beam:laser_android': { frequency: 1840, duration: 0.2, type: 'square', gain: 0.18, pitchBend: -300 },
  'laser_beam:laser_alien': { frequency: 1500, duration: 0.23, type: 'triangle', gain: 0.17, pitchBend: -220 },
  'laser_beam:laser_default': { frequency: 1600, duration: 0.22, type: 'sawtooth', gain: 0.17, pitchBend: -240 },
  'laser_beam:default': { frequency: 1600, duration: 0.22, type: 'sawtooth', gain: 0.17, pitchBend: -240 },

  // Healing fields (persistent heal identity)
  'healing_field:heal_human': { frequency: 980, duration: 0.4, type: 'sine', gain: 0.14, pitchBend: -40 },
  'healing_field:heal_android': { frequency: 1220, duration: 0.38, type: 'triangle', gain: 0.15, pitchBend: -70 },
  'healing_field:heal_alien': { frequency: 820, duration: 0.42, type: 'sine', gain: 0.14, pitchBend: -30 },
  'healing_field:heal_default': { frequency: 900, duration: 0.4, type: 'sine', gain: 0.13 },
  'healing_field:default': { frequency: 900, duration: 0.4, type: 'sine', gain: 0.13 },

  // Glitches (ambient digital bursts)
  'glitch:damage_human': { frequency: 760, duration: 0.16, type: 'square', gain: 0.16, noise: true },
  'glitch:damage_android': { frequency: 960, duration: 0.14, type: 'square', gain: 0.17, noise: true, pitchBend: -90 },
  'glitch:damage_alien': { frequency: 640, duration: 0.18, type: 'triangle', gain: 0.16, noise: true, pitchBend: -60 },
  'glitch:damage_default': { frequency: 720, duration: 0.16, type: 'square', gain: 0.15, noise: true },
  'glitch:default': { frequency: 720, duration: 0.16, type: 'square', gain: 0.15, noise: true }
};

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!(window as any).__nexoAudioContext) {
    (window as any).__nexoAudioContext = new AudioCtx();
  }
  return (window as any).__nexoAudioContext as AudioContext;
};

const getNoiseBuffer = (ctx: AudioContext, duration: number) => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

const playClip = (clip: SfxClip) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(clip.gain, now);

  if (clip.noise) {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = getNoiseBuffer(ctx, clip.duration);
    noiseSource.connect(gainNode);
    noiseSource.start(now);
    noiseSource.stop(now + clip.duration);
  }

  const osc = ctx.createOscillator();
  osc.type = clip.type;
  osc.frequency.setValueAtTime(clip.frequency, now);
  if (clip.pitchBend) {
    osc.frequency.linearRampToValueAtTime(Math.max(60, clip.frequency + clip.pitchBend), now + clip.duration);
  }
  osc.connect(gainNode);

  gainNode.gain.exponentialRampToValueAtTime(0.001, now + clip.duration);
  gainNode.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + clip.duration);
};

export const playSfx = (type: SfxKind, options: PlaySfxOptions = {}) => {
  const { variant, attackKind, speciesKey } = resolveVariant(type, options);
  const throttleKey = `${type}:${variant}`;
  const now = options.at ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const throttleWindow = throttleDefaults[type] ?? 90;
  if (throttleTimestamps[throttleKey] && now - throttleTimestamps[throttleKey] < throttleWindow) {
    return;
  }
  throttleTimestamps[throttleKey] = now;

  const baseSpeciesVariant = speciesKey.includes('alien_') ? `${attackKind}_alien` : `${attackKind}_${speciesKey}`;
  const clip =
    clipLibrary[`${type}:${variant}`] ||
    clipLibrary[`${type}:${baseSpeciesVariant}`] ||
    clipLibrary[`${type}:${attackKind}_default`] ||
    clipLibrary[`${type}:default`];
  if (!clip) return;
  playClip(clip);
};
