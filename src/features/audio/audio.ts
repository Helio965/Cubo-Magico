import { getSettings } from '../settings/settingsStore';

/**
 * Efeitos sonoros discretos sintetizados com Web Audio (nenhum arquivo
 * externo). O contexto só é criado após a primeira interação do usuário.
 */
let ctx: AudioContext | null = null;
let lastClick = 0;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function playTurnSound(): void {
  const s = getSettings();
  if (!s.sound || !s.moveSound || s.volume <= 0) return;
  const c = context();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastClick < 0.03) return; // evita saturação em sequências rápidas
  lastClick = t;
  const duration = 0.06;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.pow(1 - i / data.length, 6);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800 + Math.random() * 600;
  filter.Q.value = 1.4;
  const gain = c.createGain();
  gain.gain.value = 0.35 * s.volume;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
}

export function playCompleteSound(): void {
  const s = getSettings();
  if (!s.sound || !s.completeSound || s.volume <= 0) return;
  const c = context();
  if (!c) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const t = c.currentTime + i * 0.09;
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18 * s.volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}

export function playTickSound(): void {
  const s = getSettings();
  if (!s.sound || s.volume <= 0) return;
  const c = context();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 880;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.12 * s.volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}
