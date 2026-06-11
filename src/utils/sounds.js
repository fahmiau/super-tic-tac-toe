// Sound synthesis service using Web Audio API (no assets needed)
let isMuted = localStorage.getItem('sttt_muted') === 'true';

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('sttt_muted', isMuted);
  return isMuted;
}

export function getMuteState() {
  return isMuted;
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  return new AudioContext();
}

// Play a short synth note
function playNote(freq, type, duration, startVol, delay = 0, sweepFreq = null) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser security autoplay policies)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  
  if (sweepFreq) {
    osc.frequency.exponentialRampToValueAtTime(sweepFreq, ctx.currentTime + delay + duration);
  }

  gain.gain.setValueAtTime(startVol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// 1. A short, high-pitched click when a cell is clicked
export function playMoveSound() {
  playNote(600, 'sine', 0.08, 0.15, 0, 150);
}

// 2. A pleasant chime arpeggio when a local board is won
export function playMicroWinSound() {
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach((freq, idx) => {
    playNote(freq, 'triangle', 0.3, 0.1, idx * 0.07);
  });
}

// 3. A celebratory, rich chime chord on overall game won
export function playMacroWinSound() {
  const chord = [329.63, 392.00, 523.25, 659.25, 783.99]; // E4, G4, C5, E5, G5
  chord.forEach((freq, idx) => {
    // Slight delay staggering for strum effect
    playNote(freq, 'sine', 1.2, 0.08, idx * 0.05);
    // Add warm oscillator
    playNote(freq / 2, 'triangle', 1.0, 0.05, idx * 0.05);
  });
}

// 4. A low error buzz for invalid moves
export function playErrorSound() {
  playNote(130, 'sawtooth', 0.18, 0.1, 0, 90);
}

// 5. double chime when player joins or connects
export function playJoinSound() {
  playNote(440, 'sine', 0.25, 0.1, 0);
  playNote(554.37, 'sine', 0.35, 0.1, 0.12);
}
