/**
 * StudyFlow - Study Timer & Pomodoro Engine
 * Includes Web Audio API chime generator, ambient sound, circular visual progress,
 * and direct sync with syllabus topic study hours.
 */

export class StudyTimer {
  constructor(options = {}) {
    this.durationSeconds = (options.workMinutes || 25) * 60;
    this.remainingSeconds = this.durationSeconds;
    this.mode = 'work'; // 'work' | 'short_break' | 'long_break'
    this.state = 'idle'; // 'idle' | 'running' | 'paused'
    this.timerInterval = null;
    this.selectedSubjectId = null;
    this.selectedTopicId = null;
    this.activePlanItemId = null;
    this.accumulatedStudySeconds = 0;

    this.onTick = options.onTick || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onModeChange = options.onModeChange || (() => {});

    this.options = options;

    // Web Audio Context setup (lazy initialized on user interaction)
    this.audioCtx = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
  }

  updateSettings(options = {}) {
    this.options = { ...this.options, ...options };
    if (this.state === 'idle') {
      const mins = this.mode === 'work' ? (this.options.workMinutes || 25)
        : this.mode === 'short_break' ? (this.options.shortBreakMinutes || 5)
        : (this.options.longBreakMinutes || 15);
      this.durationSeconds = mins * 60;
      this.remainingSeconds = this.durationSeconds;
    }
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Synthesize a melodic chime using Web Audio API oscillators
   */
  playChime() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Gentle chord notes (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        // Exponential decay envelope
        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.3);
      });
    } catch (e) {
      console.warn('Audio chime could not play', e);
    }
  }

  /**
   * Synthesized soft ambient rain/pink noise generator
   */
  toggleAmbientSound(enable = null) {
    try {
      this.initAudio();
      if (!this.audioCtx) return false;

      const shouldPlay = enable !== null ? enable : !this.isAmbientPlaying;

      if (!shouldPlay) {
        if (this.ambientSource) {
          this.ambientSource.stop();
          this.ambientSource.disconnect();
          this.ambientSource = null;
        }
        this.isAmbientPlaying = false;
        return false;
      }

      // Generate 2 seconds of pink noise buffer and loop it
      const bufferSize = this.audioCtx.sampleRate * 2;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime); // Soft volume

      // Low pass filter for warm rain sound
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start();
      this.ambientSource = noise;
      this.ambientGain = gain;
      this.isAmbientPlaying = true;
      return true;
    } catch (e) {
      console.warn('Ambient noise playback error', e);
      return false;
    }
  }

  setMode(mode, customMinutes = null, settings = {}) {
    this.mode = mode;
    this.pause();

    let minutes = 25;
    if (customMinutes) {
      minutes = customMinutes;
    } else if (mode === 'work') {
      minutes = settings.pomodoroWork || 25;
    } else if (mode === 'short_break') {
      minutes = settings.pomodoroShortBreak || 5;
    } else if (mode === 'long_break') {
      minutes = settings.pomodoroLongBreak || 15;
    }

    this.durationSeconds = minutes * 60;
    this.remainingSeconds = this.durationSeconds;
    this.onModeChange(this.mode, this.remainingSeconds);
    this.onTick(this.remainingSeconds, this.getProgress());
  }

  setTopic(subjectId, topicId, planItemId = null) {
    this.selectedSubjectId = subjectId;
    this.selectedTopicId = topicId;
    this.activePlanItemId = planItemId;
  }

  start() {
    this.initAudio();
    if (this.state === 'running') return;

    this.state = 'running';
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;

      if (this.mode === 'work') {
        this.accumulatedStudySeconds++;
      }

      const progress = this.getProgress();
      this.onTick(this.remainingSeconds, progress);

      if (this.remainingSeconds <= 0) {
        this.completeSession();
      }
    }, 1000);
  }

  pause() {
    if (this.state !== 'running') return;
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.state = 'paused';
    this.onTick(this.remainingSeconds, this.getProgress());
  }

  reset() {
    this.pause();
    this.state = 'idle';
    this.remainingSeconds = this.durationSeconds;
    this.onTick(this.remainingSeconds, this.getProgress());
  }

  completeSession() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.state = 'idle';
    this.playChime();

    const loggedMinutes = Math.max(1, Math.round(this.accumulatedStudySeconds / 60));
    const sessionDetails = {
      mode: this.mode,
      durationMinutes: Math.round(this.durationSeconds / 60),
      loggedMinutes: this.mode === 'work' ? loggedMinutes : 0,
      subjectId: this.selectedSubjectId,
      topicId: this.selectedTopicId,
      planItemId: this.activePlanItemId
    };

    // Reset accumulated seconds for next round
    this.accumulatedStudySeconds = 0;

    this.onComplete(sessionDetails);

    // Auto-advance mode: work -> short_break, break -> work
    if (this.mode === 'work') {
      this.setMode('short_break');
    } else {
      this.setMode('work');
    }
  }

  getProgress() {
    if (this.durationSeconds <= 0) return 0;
    const elapsed = this.durationSeconds - this.remainingSeconds;
    return Math.min(1, Math.max(0, elapsed / this.durationSeconds));
  }

  getFormattedTime() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
