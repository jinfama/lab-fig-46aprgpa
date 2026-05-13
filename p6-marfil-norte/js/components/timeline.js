// ============================================================================
// TIMELINE - Reusable play/pause time slider component
// ============================================================================

import State from '../state.js';

const SPEEDS = [
    { label: '1x', ms: 300 },
    { label: '2x', ms: 150 },
    { label: '4x', ms: 75 },
    { label: '8x', ms: 30 }
];

export default class Timeline {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.speedIndex = 0;
        this.interval = null;
        this.dragging = false;
        this.render();
        this.bind();
        State.subscribe('currentYear', () => this.updatePosition());
        State.subscribe('isPlaying', (val) => this.updatePlayBtn(val));
    }

    render() {
        this.container.innerHTML = `
            <button class="timeline-play-btn" id="${this.container.id}-play">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <button class="timeline-speed-btn" id="${this.container.id}-speed">1x</button>
            <div class="timeline-track" id="${this.container.id}-track" style="margin-left:4px">
                <div class="timeline-rail"></div>
                <div class="timeline-progress" id="${this.container.id}-progress"></div>
                <div class="timeline-handle" id="${this.container.id}-handle"></div>
            </div>
            <div class="timeline-year" id="${this.container.id}-year">2024</div>
        `;

        this.playBtn = this.container.querySelector(`#${this.container.id}-play`);
        this.track = this.container.querySelector(`#${this.container.id}-track`);
        this.progress = this.container.querySelector(`#${this.container.id}-progress`);
        this.handle = this.container.querySelector(`#${this.container.id}-handle`);
        this.yearLabel = this.container.querySelector(`#${this.container.id}-year`);
        this.speedBtn = this.container.querySelector(`#${this.container.id}-speed`);

        this.updatePosition();
    }

    bind() {
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.speedBtn.addEventListener('click', () => this.cycleSpeed());

        // Track click
        this.track.addEventListener('click', (e) => {
            if (this.dragging) return;
            const year = this.posToYear(e);
            State.set('currentYear', year);
        });

        // Handle drag
        this.handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dragging = true;
            const onMove = (e2) => {
                const year = this.posToYear(e2);
                State.set('currentYear', year);
            };
            const onUp = () => {
                this.dragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Touch support
        this.handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.dragging = true;
            const onMove = (e2) => {
                const touch = e2.touches[0];
                const year = this.posToYear(touch);
                State.set('currentYear', year);
            };
            const onEnd = () => {
                this.dragging = false;
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
            };
            document.addEventListener('touchmove', onMove);
            document.addEventListener('touchend', onEnd);
        });
    }

    posToYear(event) {
        const rect = this.track.getBoundingClientRect();
        const x = (event.clientX || event.pageX) - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        const [minY, maxY] = State.get('yearRange');
        return Math.round(minY + pct * (maxY - minY));
    }

    updatePosition() {
        const year = State.get('currentYear');
        const [minY, maxY] = State.get('yearRange');
        const pct = (year - minY) / (maxY - minY);
        const pctStr = (pct * 100) + '%';
        this.progress.style.width = pctStr;
        this.handle.style.left = pctStr;
        this.yearLabel.textContent = year;
    }

    updatePlayBtn(isPlaying) {
        if (isPlaying) {
            this.playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        } else {
            this.playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
        }
    }

    togglePlay() {
        const playing = !State.get('isPlaying');
        State.set('isPlaying', playing);
        if (playing) {
            this.startAnimation();
        } else {
            this.stopAnimation();
        }
    }

    startAnimation() {
        this.stopAnimation();
        const speed = SPEEDS[this.speedIndex].ms;
        this.interval = setInterval(() => {
            const year = State.get('currentYear');
            const [, maxY] = State.get('yearRange');
            if (year >= maxY) {
                const [minY] = State.get('yearRange');
                State.set('currentYear', minY);
            } else {
                State.set('currentYear', year + 1);
            }
        }, speed);
    }

    stopAnimation() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    cycleSpeed() {
        this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
        this.speedBtn.textContent = SPEEDS[this.speedIndex].label;
        if (State.get('isPlaying')) {
            this.startAnimation();
        }
    }

    destroy() {
        this.stopAnimation();
    }
}
