// --- 1. SETUP CANVAS PARTICLES (ENVIRONMENTAL GENERATIVE BACKDROP) ---
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
        this.speedY = -Math.random() * 0.4 - 0.1; // Float upwards gently
        this.alpha = Math.random() * 0.5 + 0.1;
    }
    update(speedMultiplier) {
        this.x += this.speedX * (speedMultiplier * 0.5);
        this.y += this.speedY * (speedMultiplier * 0.5);
        
        // Wrap edges smoothly
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
        // Use an ethereal focus color scheme
        ctx.fillStyle = '#c084fc'; 
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#93c5fd';
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particlesArray = [];
    const count = 75; 
    for (let i = 0; i < count; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const densitySpeed = parseFloat(particleDensityInput.value);
    
    particlesArray.forEach(p => {
        p.update(densitySpeed);
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();


// --- 2. THE POMODORO TIMER CONFIGURATION ---
let timerInterval = null;
let timeLeft = 25 * 60; // 25 Minutes standard length
let isRunning = false;

const display = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (isRunning) {
        // Pause function
        clearInterval(timerInterval);
        startBtn.textContent = "Start";
        startBtn.style.backgroundColor = "#3b82f6";
        isRunning = false;
    } else {
        // Start function
        initAudioContext(); // Initialize audio safely on click user event
        isRunning = true;
        startBtn.textContent = "Pause";
        startBtn.style.backgroundColor = "#ef4444"; // Change red to signify pause action
        
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timerInterval);
                playAlertChime();
                alert("Session Finished! Take a well-deserved ambient break.");
                resetTimer();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 25 * 60;
    isRunning = false;
    startBtn.textContent = "Start";
    startBtn.style.backgroundColor = "#3b82f6";
    updateDisplay();
}

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);


// --- 3. SYNTHESIZE AUDIO SCAPE (WEB AUDIO API GENERATOR) ---
let audioCtx = null;
let alphaWavesGainNode = null;
const binauralSlider = document.getElementById('binaural-volume');
const audioToggleBtn = document.getElementById('audio-toggle');

function initAudioContext() {
    if (audioCtx) return; // Prevent double initialization
    
    // Create Audio Pipeline context framework
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    alphaWavesGainNode = audioCtx.createGain();
    alphaWavesGainNode.gain.value = binauralSlider.value;
    alphaWavesGainNode.connect(audioCtx.destination);
    
    // Generate a comforting Alpha Wave structure (Binaural Drone effect)
    // Oscillator 1: Left Ear Tone
    const oscLeft = audioCtx.createOscillator();
    const pannerLeft = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    oscLeft.type = 'sine';
    oscLeft.frequency.value = 150; // Base stabilizing low tone
    
    // Oscillator 2: Right Ear Tone offset by 10Hz (Targeting 10Hz Alpha Focus brainwave tracking state)
    const oscRight = audioCtx.createOscillator();
    const pannerRight = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    oscRight.type = 'sine';
    oscRight.frequency.value = 160; 

    if (pannerLeft && pannerRight) {
        pannerLeft.pan.value = -1; // hard left
        pannerRight.pan.value = 1; // hard right
        oscLeft.connect(pannerLeft).connect(alphaWavesGainNode);
        oscRight.connect(pannerRight).connect(alphaWavesGainNode);
    } else {
        oscLeft.connect(alphaWavesGainNode);
        oscRight.connect(alphaWavesGainNode);
    }
    
    oscLeft.start();
    oscRight.start();
    
    audioToggleBtn.textContent = "Audio Active";
    audioToggleBtn.style.backgroundColor = "#22c55e";
}

// Adjust synthesized volume immediately on range movement
binauralSlider.addEventListener('input', (e) => {
    if (alphaWavesGainNode) {
        alphaWavesGainNode.gain.value = e.target.value;
    }
});

audioToggleBtn.addEventListener('click', initAudioContext);

// Generates a quick melodic retro chime note cleanly when focus timer completes
function playAlertChime() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 clean note
    osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.3); // Ramp smoothly to G5 note
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5); // Echo fade out
    
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}
