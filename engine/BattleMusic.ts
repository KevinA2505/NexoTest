import { MusicConductor } from './MusicConductor';
import { NoteEvent, TrackType } from '../types';

type OscillatorShape = 'sine' | 'triangle' | 'sawtooth' | 'square';

const INSTRUMENT_SETTINGS: Record<NoteEvent['instrument'], { wave: OscillatorShape; gain: number }> = {
  pad: { wave: 'sine', gain: 0.16 },
  piano: { wave: 'triangle', gain: 0.2 },
  drums: { wave: 'square', gain: 0.24 },
  voidDrone: { wave: 'sawtooth', gain: 0.12 }
};

const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class BattleMusic {
  private conductor = new MusicConductor();
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stopTimer: number | null = null;

  public start(track: TrackType = 'climax_3min', clampSeconds?: number) {
    this.stop(true);

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.18;
    this.masterGain.connect(this.ctx.destination);

    const notes = this.conductor.generate(track);
    const trackSeconds = Math.max(...notes.map((n) => n.start + n.duration));
    const playableSeconds = clampSeconds ? Math.min(trackSeconds, clampSeconds) : trackSeconds;
    const baseTime = this.ctx.currentTime;

    notes.forEach((note) => this.scheduleNote(note, baseTime, playableSeconds));

    this.masterGain.gain.setValueAtTime(0, baseTime);
    this.masterGain.gain.linearRampToValueAtTime(this.masterGain.gain.value, baseTime + 0.6);

    this.stopTimer = window.setTimeout(() => this.stop(), playableSeconds * 1000);
  }

  public stop(immediate = false) {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      if (immediate) {
        this.masterGain.gain.setValueAtTime(0, now);
      } else {
        this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      }
    }

    if (this.ctx) {
      const ctxToClose = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      window.setTimeout(() => ctxToClose.close(), immediate ? 0 : 120);
    }
  }

  private scheduleNote(note: NoteEvent, baseTime: number, cutoffSeconds: number) {
    if (!this.ctx || !this.masterGain) return;

    const startTime = baseTime + note.start;
    const endTime = Math.min(baseTime + note.start + note.duration, baseTime + cutoffSeconds);
    if (endTime <= baseTime || endTime <= startTime) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const instrument = INSTRUMENT_SETTINGS[note.instrument];

    osc.type = instrument.wave;
    osc.frequency.value = midiToFreq(note.pitch);

    gain.gain.setValueAtTime(0, baseTime);
    const peak = instrument.gain * (note.velocity / 127);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.02);
    gain.gain.setTargetAtTime(0.0001, endTime, 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(endTime + 0.1);
  }
}
