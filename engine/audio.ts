import { Faction, ProjectileStyle } from '../types';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type SfxKind = 'muzzle' | 'impact' | 'explosion' | 'heal' | 'shockwave' | 'summon' | 'death';

export interface PlaySfxOptions {
  style?: ProjectileStyle;
  variant?: 'ionic' | 'bio' | 'ember' | 'laser' | 'plasma' | 'missile' | 'beam';
  faction?: Faction;
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
  shockwave: 260,
  summon: 260,
  death: 240
};

const resolveVariant = (options: PlaySfxOptions): string => {
  if (options.variant) return options.variant;
  if (options.style === 'laser' || options.style === 'plasma' || options.style === 'missile' || options.style === 'beam') {
    return options.style;
  }
  if (options.faction === Faction.ALIEN) return 'bio';
  if (options.faction === Faction.ANDROID) return 'ionic';
  return 'ember';
};

const clipLibrary: Record<string, SfxClip> = {
  'muzzle:laser': { frequency: 1260, duration: 0.08, type: 'sawtooth', gain: 0.16, pitchBend: -140 },
  'muzzle:plasma': { frequency: 940, duration: 0.11, type: 'square', gain: 0.18, pitchBend: -80 },
  'muzzle:missile': { frequency: 520, duration: 0.15, type: 'triangle', gain: 0.2, pitchBend: -200 },
  'muzzle:beam': { frequency: 1080, duration: 0.1, type: 'sine', gain: 0.17 },
  'muzzle:default': { frequency: 860, duration: 0.1, type: 'square', gain: 0.15 },

  'impact:ionic': { frequency: 1260, duration: 0.1, type: 'triangle', gain: 0.15, pitchBend: -220 },
  'impact:bio': { frequency: 720, duration: 0.12, type: 'sine', gain: 0.16 },
  'impact:ember': { frequency: 1020, duration: 0.12, type: 'square', gain: 0.18, pitchBend: -140 },
  'impact:laser': { frequency: 1320, duration: 0.08, type: 'sawtooth', gain: 0.14 },
  'impact:plasma': { frequency: 900, duration: 0.1, type: 'square', gain: 0.16 },
  'impact:missile': { frequency: 580, duration: 0.12, type: 'triangle', gain: 0.18 },
  'impact:default': { frequency: 900, duration: 0.1, type: 'square', gain: 0.16 },

  'explosion:missile': { frequency: 320, duration: 0.35, type: 'triangle', gain: 0.23, noise: true },
  'explosion:plasma': { frequency: 540, duration: 0.3, type: 'square', gain: 0.22, noise: true },
  'explosion:ember': { frequency: 460, duration: 0.32, type: 'sawtooth', gain: 0.22, noise: true },
  'explosion:default': { frequency: 420, duration: 0.3, type: 'triangle', gain: 0.2, noise: true },

  'heal:ember': { frequency: 920, duration: 0.35, type: 'sine', gain: 0.14 },
  'heal:ionic': { frequency: 1180, duration: 0.32, type: 'triangle', gain: 0.14 },
  'heal:bio': { frequency: 780, duration: 0.34, type: 'sine', gain: 0.14 },
  'heal:default': { frequency: 880, duration: 0.34, type: 'sine', gain: 0.14 },

  'shockwave:ember': { frequency: 420, duration: 0.28, type: 'triangle', gain: 0.22, pitchBend: -120 },
  'shockwave:ionic': { frequency: 760, duration: 0.24, type: 'square', gain: 0.2, pitchBend: -180 },
  'shockwave:bio': { frequency: 540, duration: 0.28, type: 'sine', gain: 0.2, pitchBend: -100 },
  'shockwave:default': { frequency: 520, duration: 0.26, type: 'triangle', gain: 0.21, pitchBend: -140 },

  'summon:ember': { frequency: 620, duration: 0.25, type: 'sine', gain: 0.16 },
  'summon:ionic': { frequency: 780, duration: 0.25, type: 'triangle', gain: 0.16 },
  'summon:bio': { frequency: 540, duration: 0.27, type: 'sine', gain: 0.16 },
  'summon:default': { frequency: 620, duration: 0.25, type: 'sine', gain: 0.16 },

  'death:ember': { frequency: 420, duration: 0.32, type: 'triangle', gain: 0.18, pitchBend: -200 },
  'death:ionic': { frequency: 680, duration: 0.28, type: 'square', gain: 0.2, pitchBend: -180 },
  'death:bio': { frequency: 510, duration: 0.3, type: 'sine', gain: 0.18, pitchBend: -160 },
  'death:default': { frequency: 440, duration: 0.3, type: 'triangle', gain: 0.18, pitchBend: -180 }
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
  const variant = resolveVariant(options);
  const throttleKey = `${type}:${variant}`;
  const now = options.at ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const throttleWindow = throttleDefaults[type] ?? 90;
  if (throttleTimestamps[throttleKey] && now - throttleTimestamps[throttleKey] < throttleWindow) {
    return;
  }
  throttleTimestamps[throttleKey] = now;

  const clip = clipLibrary[`${type}:${variant}`] || clipLibrary[`${type}:default`];
  if (!clip) return;
  playClip(clip);
};
