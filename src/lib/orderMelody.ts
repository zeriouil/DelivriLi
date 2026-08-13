/**
 * Continuous looping delivery alert melody using Web Audio API.
 * Uses precise look-ahead scheduling so there are zero gaps between loops.
 *
 * Usage:
 *   const stop = startOrderMelody();
 *   // later...
 *   stop(); // stops cleanly after current note ends
 */

type StopFn = () => void;

const NOTES: { freq: number; dur: number; vol: number; type: OscillatorType }[] = [
  { freq: 587.33, dur: 0.17, vol: 0.9,  type: "sine" },   // D5
  { freq: 659.25, dur: 0.17, vol: 0.85, type: "sine" },   // E5
  { freq: 739.99, dur: 0.17, vol: 0.85, type: "sine" },   // F#5
  { freq: 880.00, dur: 0.30, vol: 1.0,  type: "sine" },   // A5 (accent)
  { freq: 880.00, dur: 0.12, vol: 0.5,  type: "sine" },   // echo 1
  { freq: 587.33, dur: 0.12, vol: 0.4,  type: "sine" },   // echo 2
  { freq: 0,      dur: 0.25, vol: 0,    type: "sine" },   // rest/gap before next loop
];

const TOTAL_LOOP_DURATION = NOTES.reduce((sum, n) => sum + n.dur, 0);

export function startOrderMelody(): StopFn {
  let ctx: AudioContext | null = null;
  let active = true;

  try {
    ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();

    if (ctx.state === "suspended") ctx.resume();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.5, ctx.currentTime);
    master.connect(ctx.destination);

    /**
     * Schedules one full loop of the melody starting at `startTime`.
     * Returns the time the loop ends so the next loop can be chained.
     */
    const scheduleLoop = (startTime: number): number => {
      let t = startTime;

      NOTES.forEach(({ freq, dur, vol, type }) => {
        if (freq === 0) { t += dur; return; } // rest

        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.018);          // attack
        gain.gain.setValueAtTime(vol, t + dur - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);     // release

        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.01);

        t += dur;
      });

      return t; // next loop start time
    };

    // Schedule first loop immediately, then chain using look-ahead
    const LOOKAHEAD = 0.1; // seconds ahead to schedule next loop
    let nextLoopAt = scheduleLoop(ctx.currentTime + 0.05);

    const lookaheadInterval = setInterval(() => {
      if (!active || !ctx) {
        clearInterval(lookaheadInterval);
        return;
      }
      // Schedule next loop when we're within LOOKAHEAD seconds of it starting
      if (ctx.currentTime >= nextLoopAt - LOOKAHEAD) {
        nextLoopAt = scheduleLoop(nextLoopAt);
      }
    }, 50);

    // Return stop function
    return () => {
      active = false;
      clearInterval(lookaheadInterval);
      // Fade out master and close context
      if (ctx) {
        try {
          master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
          setTimeout(() => ctx?.close(), 300);
        } catch {}
      }
    };
  } catch (e) {
    console.warn("Audio playback blocked:", e);
    return () => {}; // no-op stop function
  }
}
