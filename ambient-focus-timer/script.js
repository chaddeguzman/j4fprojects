// --- CANVAS PARTICLES ---
const canvas = document.getElementById('ambient-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];
const particleDensityInput = document.getElementById('particle-speed');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = -Math.random() * 0.4 - 0.1;
        this.alpha = Math.random() * 0.5 + 0.1;
    }
    update(speedMultiplier) {
        this.x += this.speedX * (speedMultiplier * 0.5);
        this.y += this.speedY * (speedMultiplier * 0.5);
        if (this.y < 0) {
            this.y = canvas.height;
            this.x = Math.random() * canvas.width;
        }
        if (this.x < 0 || this.x > canvas.width) this.x = Math.random() * canvas.width;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#93c5fd';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#93c5fd';
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particlesArray = [];
    for (let i = 0; i < 75; i++) particlesArray.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const speed = parseFloat(particleDensityInput.value);
    particlesArray.forEach(p => { p.update(speed); p.draw(); });
    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();


// --- TIMER ---
const timerInput = document.getElementById('timer-input');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');

const DEFAULT_SECONDS = 25 * 60;
let totalSeconds = DEFAULT_SECONDS;
let timerInterval = null;
let isRunning = false;

function updateDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerInput.value = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseInputToSeconds(value) {
    const parts = value.split(':');
    if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;
        return minutes * 60 + seconds;
    }
    const minutes = parseInt(parts[0], 10) || 0;
    return minutes * 60;
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    timerInput.disabled = false;
    startBtn.textContent = 'Start';
    startBtn.classList.remove('btn-stop');
    startBtn.classList.add('btn-primary');
}

function startTimer() {
    totalSeconds = parseInputToSeconds(timerInput.value);
    if (totalSeconds <= 0) return;

    isRunning = true;
    timerInput.disabled = true;
    startBtn.textContent = 'Stop';
    startBtn.classList.remove('btn-primary');
    startBtn.classList.add('btn-stop');

    initAudioContext();

    timerInterval = setInterval(() => {
        totalSeconds--;
        updateDisplay(totalSeconds);
        if (totalSeconds <= 0) {
            stopTimer();
            playAlertChime();
        }
    }, 1000);
}

function resetTimer() {
    stopTimer();
    totalSeconds = DEFAULT_SECONDS;
    updateDisplay(totalSeconds);
}

startBtn.addEventListener('click', () => {
    if (isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

timerInput.addEventListener('focus', () => {
    if (isRunning) stopTimer();
});

timerInput.addEventListener('change', () => {
    const seconds = parseInputToSeconds(timerInput.value);
    totalSeconds = seconds > 0 ? seconds : DEFAULT_SECONDS;
    updateDisplay(totalSeconds);
});

timerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') timerInput.blur();
});


// --- AUDIO ---
let audioCtx = null;
let alphaWavesGainNode = null;
const binauralSlider = document.getElementById('binaural-volume');
const audioToggleBtn = document.getElementById('audio-toggle');

function initAudioContext() {
    if (audioCtx) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    alphaWavesGainNode = audioCtx.createGain();
    alphaWavesGainNode.gain.value = parseFloat(binauralSlider.value);
    alphaWavesGainNode.connect(audioCtx.destination);

    const oscLeft = audioCtx.createOscillator();
    const oscRight = audioCtx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.value = 150;
    oscRight.type = 'sine';
    oscRight.frequency.value = 160;

    if (audioCtx.createStereoPanner) {
        const panL = audioCtx.createStereoPanner();
        const panR = audioCtx.createStereoPanner();
        panL.pan.value = -1;
        panR.pan.value = 1;
        oscLeft.connect(panL).connect(alphaWavesGainNode);
        oscRight.connect(panR).connect(alphaWavesGainNode);
    } else {
        oscLeft.connect(alphaWavesGainNode);
        oscRight.connect(alphaWavesGainNode);
    }

    oscLeft.start();
    oscRight.start();

    audioToggleBtn.textContent = 'Audio Active';
    audioToggleBtn.style.backgroundColor = '#22c55e';
}

binauralSlider.addEventListener('input', (e) => {
    if (alphaWavesGainNode) alphaWavesGainNode.gain.value = parseFloat(e.target.value);
});

audioToggleBtn.addEventListener('click', initAudioContext);

function playAlertChime() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}
