import { formatTime } from './utils';

export class PiPTimerRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 200;
    this.ctx = this.canvas.getContext('2d');
    this.video = document.createElement('video');
    this.video.style.display = 'none';
    this.video.muted = true;
    this.video.playsInline = true;
    
    // Some browsers require the video to be in the DOM
    document.body.appendChild(this.video);

    this.stream = this.canvas.captureStream(30);
    this.video.srcObject = this.stream;
    
    this.isPiPActive = false;
    this.rafId = null;

    // Track state
    this.state = {
      phase: 'READY',
      timeLeft: 0,
      description: 'Boxing Planner',
      isPlaying: false
    };

    this.video.addEventListener('enterpictureinpicture', () => {
      this.isPiPActive = true;
      this.drawLoop();
    });

    this.video.addEventListener('leavepictureinpicture', () => {
      this.isPiPActive = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    });

    // Add media session controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (this.onPlayPause) this.onPlayPause();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.onPlayPause) this.onPlayPause();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (this.onSkip) this.onSkip();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (this.onPrevious) this.onPrevious();
      });
    }
  }

  async requestPiP() {
    try {
      if (!this.video.srcObject) {
         this.video.srcObject = this.stream;
      }
      await this.video.play();
      if (document.pictureInPictureElement !== this.video) {
         await this.video.requestPictureInPicture();
      } else {
         await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error("PiP err", err);
    }
  }

  updateState(phase, timeLeft, description, isPlaying, phaseColor) {
    this.state = { phase, timeLeft, description, isPlaying, phaseColor };
    
    if ('mediaSession' in navigator) {
       navigator.mediaSession.metadata = new MediaMetadata({
         title: `${phase} - ${formatTime(timeLeft)}`,
         artist: description,
         album: 'Boxing Planner'
       });
       navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    if (!this.isPiPActive && !this.rafId) {
      // Draw at least once to update video frame if not in loop
      this.draw();
    }
  }

  draw() {
    const { phase, timeLeft, description, phaseColor } = this.state;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // Phase color bar
    ctx.fillStyle = phaseColor || '#6b7280';
    ctx.fillRect(0, 0, w, 8);

    // Phase text
    ctx.fillStyle = phaseColor || '#9ca3af';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(phase.toUpperCase(), w / 2, 40);

    // Time huge
    ctx.fillStyle = '#f9fafb';
    ctx.font = 'bold 80px Inter, monospace';
    ctx.fillText(formatTime(timeLeft), w / 2, 120);

    // Description text
    ctx.fillStyle = '#d1d5db';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText(description || '', w / 2, 170);
  }

  drawLoop = () => {
    if (!this.isPiPActive) return;
    this.draw();
    this.rafId = requestAnimationFrame(this.drawLoop);
  }

  setCallbacks(onPlayPause, onSkip, onPrevious) {
    this.onPlayPause = onPlayPause;
    this.onSkip = onSkip;
    this.onPrevious = onPrevious;
  }
}

export const pipRenderer = new PiPTimerRenderer();
