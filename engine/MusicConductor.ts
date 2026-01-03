import { Instrument, NoteEvent, TrackType } from '../types';

const BEATS_PER_BAR = 4;
const BPM = 80; // 0.75s per beat
const SECONDS_PER_BEAT = 60 / BPM;
const SECONDS_PER_BAR = BEATS_PER_BAR * SECONDS_PER_BEAT; // 3s per bar (60 bars = 180s)

const TOTAL_BARS = 60;

const CHORDS = [
  { padPitches: [50, 54, 57, 62], pianoPitches: [62, 65, 69], bassRoot: 50 },
  { padPitches: [52, 55, 59, 64], pianoPitches: [64, 67, 71], bassRoot: 52 },
  { padPitches: [48, 52, 55, 60], pianoPitches: [60, 64, 67], bassRoot: 48 },
  { padPitches: [55, 59, 62, 67], pianoPitches: [67, 71, 74], bassRoot: 55 },
];

export class MusicConductor {
  private notes: NoteEvent[] = [];

  public generate(type: TrackType = 'climax_3min'): NoteEvent[] {
    this.notes = [];

    const isMeditation = type === 'meditation_5min';
    const totalBars = isMeditation ? 100 : TOTAL_BARS;
    const targetEnd = isMeditation ? 300 : TOTAL_BARS * SECONDS_PER_BAR;

    for (let bar = 0; bar < totalBars; bar++) {
      const isClimaxMinute = !isMeditation && bar >= TOTAL_BARS - 20;

      const tensionFactor = isClimaxMinute
        ? 0.7 + ((bar - (TOTAL_BARS - 20)) / 20) * 0.4 // ramps 0.7 -> 1.1 across last minute
        : 1.0;

      const chordIdx = Math.floor(bar / 4) % CHORDS.length;
      const { padPitches, pianoPitches, bassRoot } = CHORDS[chordIdx];

      if (isClimaxMinute && bar % 4 === 0) {
        const droneStart = this.tOf(bar, 0);
        const droneVel = 35 * tensionFactor;
        this.addNote('voidDrone', bassRoot - 12, droneStart, 12, droneVel);
        this.addNote('voidDrone', bassRoot - 11, droneStart, 12, droneVel * 0.4);
      }

      padPitches.forEach((pitch, idx) => {
        const beat = idx % BEATS_PER_BAR;
        const st = this.tOf(bar, beat);
        const vel = 20 + idx * 4;
        this.addNote('pad', pitch, st, SECONDS_PER_BAR, vel);
      });

      const baseVel = 50 * tensionFactor;
      const pattern = [
        { beat: 0.0, pitch: pianoPitches[0], dur: 0.8 },
        { beat: 1.0, pitch: pianoPitches[1], dur: 0.7 },
        { beat: 2.0, pitch: pianoPitches[2], dur: 0.8 },
        { beat: 3.0, pitch: pianoPitches[0] + 12, dur: 0.75 },
      ];

      pattern.forEach(({ beat, pitch, dur }) => {
        const st = this.humanize(this.tOf(bar, beat));
        const vel = baseVel + (Math.floor(Math.random() * 6) - 3);
        this.addNote('piano', pitch, st, dur, vel);
      });

      if (!isMeditation) {
        const density = isClimaxMinute ? 1.2 : 1.0;

        const hatSubDiv = isClimaxMinute ? 0.25 : 0.5;
        for (let beat = 0; beat < BEATS_PER_BAR; beat += hatSubDiv) {
          this.addNote('drums', 42, this.humanize(this.tOf(bar, beat)), 0.1, 25 * density);
        }

        const snareBeats = isClimaxMinute ? [1, 2.75, 3] : [1, 3];
        snareBeats.forEach((beat) => this.addNote('drums', 38, this.tOf(bar, beat), 0.1, 40 * density));

        const kickBeats = isClimaxMinute ? [0, 0.75, 2, 2.5] : [0, 2];
        kickBeats.forEach((beat) => this.addNote('drums', 36, this.tOf(bar, beat), 0.1, 50 * density));
      }
    }

    // Final golpeado exactamente al cierre del combate, sin superar los 180s/300s
    const finalChordStart = targetEnd - 2; // se apaga justo en el segundo objetivo
    const finalImpactStart = targetEnd - 0.25;
    [38, 50, 57, 62].forEach((pitch) => {
      this.addNote('pad', pitch, finalChordStart, Math.min(2, targetEnd / 6), 40);
      this.addNote('piano', pitch, finalChordStart, Math.min(2, targetEnd / 8), 60);
    });
    this.addNote('drums', 36, finalImpactStart, 0.25, 120);
    this.addNote('drums', 38, finalImpactStart, 0.25, 100);

    return this.notes;
  }

  private tOf(bar: number, beat: number): number {
    return bar * SECONDS_PER_BAR + beat * SECONDS_PER_BEAT;
  }

  private humanize(time: number): number {
    const jitter = (Math.random() * 0.04) - 0.02; // +/- 20ms
    return time + jitter;
  }

  private addNote(instrument: Instrument, pitch: number, start: number, duration: number, velocity: number) {
    const clampedVelocity = Math.max(1, Math.min(127, Math.round(velocity)));
    this.notes.push({
      instrument,
      pitch,
      start: Number(start.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      velocity: clampedVelocity,
    });
  }
}
