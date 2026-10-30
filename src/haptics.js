/* Haptics: a short buzz when an event is caught and a longer one on a new stage, through
   navigator.vibrate where the device has it (most Android phones; not iOS Safari, not desktops).
   Behind the Haptics setting, on by default where supported. */
import { G } from './game.js';

export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
export const BUZZ = { catch: 18, stage: [30, 50, 30], burp: [20, 40, 70] };
export function buzz(pattern) {
  if (!G.prefs.haptics || !hapticsSupported()) return false;
  try { return navigator.vibrate(pattern); } catch (e) { return false; }
}
