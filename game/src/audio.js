// Synthesised sound for Emberfall: every effect and the music are generated
// with WebAudio oscillators and noise, so the game ships no audio files and
// makes no network request. Audio starts only after the player's first
// gesture, as browsers require.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    muted: false,
    musicTimer: null,
    musicStep: 0,
    started: false,
  };

  // Build the graph lazily on the first user gesture.
  function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.9;
    audio.master.connect(audio.ctx.destination);
    audio.sfxGain = audio.ctx.createGain();
    audio.sfxGain.gain.value = 0.5;
    audio.sfxGain.connect(audio.master);
    audio.musicGain = audio.ctx.createGain();
    audio.musicGain.gain.value = 0.16;
    audio.musicGain.connect(audio.master);
    return true;
  }

  // One oscillator blip with an exponential decay envelope.
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + (delay || 0);
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Filtered noise burst, for impacts and explosions.
  function noise(dur, vol, filterFreq, delay) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.sfxGain);
    src.start(t0);
  }

  const sfx = {
    shoot() {
      tone(720, 0.09, 'square', 0.16, 240);
    },
    enemyHit() {
      tone(190, 0.06, 'triangle', 0.2, 120);
    },
    kill() {
      tone(320, 0.16, 'sawtooth', 0.22, 70);
      noise(0.14, 0.22, 1400);
    },
    explosion() {
      noise(0.4, 0.4, 900);
      tone(120, 0.35, 'sine', 0.35, 40);
    },
    hurt() {
      tone(160, 0.25, 'sawtooth', 0.3, 60);
      noise(0.12, 0.25, 700);
    },
    dash() {
      noise(0.16, 0.18, 3200);
      tone(520, 0.12, 'sine', 0.12, 980);
    },
    pickup() {
      tone(660, 0.1, 'sine', 0.22, 990);
      tone(990, 0.14, 'sine', 0.18, 1320, 0.07);
    },
    upgrade() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, null, i * 0.07));
    },
    waveClear() {
      [392, 523, 659].forEach((f, i) => tone(f, 0.3, 'triangle', 0.2, null, i * 0.09));
    },
    boss() {
      tone(90, 0.8, 'sawtooth', 0.32, 45);
      noise(0.6, 0.3, 500);
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.2, null, i * 0.1));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, 'sawtooth', 0.18, null, i * 0.16));
    },
    click() {
      tone(880, 0.05, 'sine', 0.15, 660);
    },
    shieldBreak() {
      tone(1200, 0.12, 'square', 0.16, 300);
      noise(0.1, 0.2, 2400);
    },
  };

  // Generative music: a slow minor-key loop. A low drone holds the root while
  // a pentatonic arpeggio wanders above it; the pattern is fixed, so the
  // music is the same every run and needs no audio file.
  const MUSIC_ROOT = 110; // A2
  const MUSIC_SCALE = [1, 1.189, 1.335, 1.498, 1.782, 2];
  const MUSIC_PATTERN = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 4, 5, 2, 0, 1, 2];

  function musicTick() {
    if (!audio.ctx || audio.muted) return;
    const step = audio.musicStep;
    const t0 = audio.ctx.currentTime + 0.05;
    // Drone on the root every bar.
    if (step % 16 === 0) {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = MUSIC_ROOT / 2;
      gain.gain.setValueAtTime(0.5, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 3.6);
      osc.connect(gain);
      gain.connect(audio.musicGain);
      osc.start(t0);
      osc.stop(t0 + 3.7);
    }
    // Arpeggio note, soft triangle, every eighth-note step.
    const degree = MUSIC_PATTERN[step % MUSIC_PATTERN.length];
    const freq = MUSIC_ROOT * MUSIC_SCALE[degree % MUSIC_SCALE.length] * 2;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.55, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    osc.connect(gain);
    gain.connect(audio.musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.55);
    audio.musicStep += 1;
  }

  function startMusic() {
    if (!ensure() || audio.musicTimer) return;
    audio.started = true;
    // One eighth note at 96 bpm is 0.3125 s.
    audio.musicTimer = window.setInterval(musicTick, 312);
  }

  function setMuted(muted) {
    audio.muted = muted;
    if (audio.master) audio.master.gain.value = muted ? 0 : 0.9;
  }

  return { ensure, startMusic, setMuted, sfx };
}
