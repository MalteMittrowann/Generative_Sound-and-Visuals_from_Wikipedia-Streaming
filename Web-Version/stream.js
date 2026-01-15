/* ==========================================================
   STREAM HANDLER (Logik, Skalen & Tutorial)
   ========================================================== */

let editCount = 0;
let harmonyAmount = 0.5; 

// --- PENTATONISCHE SKALA ---
const PENTATONIC_FREQS = [];
const scaleSteps = [0, 3, 5, 7, 10]; 
const rootFreq = 65.41; 

for (let octave = 0; octave < 6; octave++) {
    scaleSteps.forEach(step => {
        const freq = rootFreq * Math.pow(2, (step + (octave * 12)) / 12);
        PENTATONIC_FREQS.push(freq);
    });
}

// --- INITIALISIERUNG ---
document.getElementById('start-btn').addEventListener('click', () => startExperience(false));
document.getElementById('start-tutorial-btn').addEventListener('click', () => startExperience(true));
document.getElementById('mute-btn').addEventListener('click', toggleMute);

const stereoBtn = document.getElementById('stereo-btn');
if (stereoBtn) {
    stereoBtn.addEventListener('click', toggleStereo);
}

// --- TUTORIAL LOGIC ---
const Tutorial = (() => {
    let currentStep = 0;
    let isActive = false;
    let autoAdvanceTimer = null;

    const box = document.getElementById('tutorial-box');
    const title = document.getElementById('tut-title');
    const text = document.getElementById('tut-text');
    const progress = document.getElementById('tut-progress');
    const nextBtn = document.getElementById('tut-next');

    // Definition der Schritte
    const steps = [
        {
            title: "Navigation",
            text: "Welcome to Sonic Wikipedia. You can explore the data space by <b>clicking & dragging</b> to rotate the view, and <b>scrolling</b> to zoom in/out.",
            target: null, // Center screen
            position: "center"
        },
        {
            title: "Data Points",
            text: "Each sphere represents a real-time edit. <b>Double-click</b> on any sphere to open the corresponding Wikipedia article in a new tab.",
            target: null,
            position: "center"
        },
        {
            title: "Sound Balance",
            text: "Use this slider to mix between <b>Human</b> edits (warm, sawtooth waves) and <b>Bot</b> edits (digital, square waves). Try moving it now!",
            target: "grp-balance",
            position: "top",
            actionId: "slider-balance" 
        },
        {
            title: "Harmony",
            text: "This controls the musical scale. Slide to the right to snap all frequencies to a harmonious <b>Pentatonic Scale</b>.",
            target: "grp-harmony",
            position: "top",
            actionId: "slider-harmony"
        },
        {
            title: "Timbre",
            text: "Adjusts the brightness. Left is dark and muffled, right is bright and open. This affects both sound filter and visual glow.",
            target: "grp-timbre",
            position: "top",
            actionId: "slider-timbre"
        },
        {
            title: "Space / Reverb",
            text: "Controls the echo and visual trails. High values create long, ambient textures and lingering visual ghosts.",
            target: "grp-reverb",
            position: "top",
            actionId: "slider-reverb"
        },
        {
            title: "Audio Modes",
            text: "Use the buttons in the bottom right corner to toggle between <b>Stereo/Mono</b> (headphones recommended) or to <b>Mute</b> the sound completely.",
            target: "audio-controls", // ID aus der index.html
            position: "top"
        }
    ];

    function showStep(index) {
        if (index >= steps.length) {
            endTutorial();
            return;
        }
        currentStep = index;
        const step = steps[index];

        // Content update
        title.innerText = step.title;
        text.innerHTML = step.text;
        progress.innerText = `${index + 1}/${steps.length}`;
        nextBtn.innerText = index === steps.length - 1 ? "Finish" : "Next ›";

        // Highlight entfernen
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

        // Positionierung
        if (step.target) {
            const targetEl = document.getElementById(step.target);
            if (targetEl) {
                targetEl.classList.add('tutorial-highlight');
                const rect = targetEl.getBoundingClientRect();
                
                // Box über dem Element positionieren (zentriert)
                box.style.left = (rect.left + rect.width/2 - 140) + "px"; 
                box.style.top = (rect.top - box.offsetHeight - 20) + "px";
                
                // Fallback falls zu nah am oberen Rand
                if (rect.top < 200) {
                     box.style.top = (rect.bottom + 20) + "px";
                }
                
                // Fallback falls zu weit rechts (für Audio Controls wichtig)
                if (parseInt(box.style.left) + 280 > window.innerWidth) {
                    box.style.left = (window.innerWidth - 300) + "px";
                }
            }
        } else {
            // Center Screen
            box.style.left = "50%";
            box.style.top = "40%";
            box.style.transform = "translate(-50%, -50%)";
        }
    }

    function next() {
        if (autoAdvanceTimer) {
            clearTimeout(autoAdvanceTimer);
            autoAdvanceTimer = null;
        }
        showStep(currentStep + 1);
    }

    function endTutorial() {
        isActive = false;
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        box.classList.remove('active');
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        setTimeout(() => box.style.display = 'none', 500);
    }

    // Auto-Detect Listener
    function setupListeners() {
        nextBtn.addEventListener('click', next);
        
        steps.forEach((step, index) => {
            if (step.actionId) {
                const el = document.getElementById(step.actionId);
                if (el) {
                    el.addEventListener('input', () => {
                        if (isActive && currentStep === index && !autoAdvanceTimer) {
                            autoAdvanceTimer = setTimeout(() => {
                                autoAdvanceTimer = null;
                                next();
                            }, 1500);
                        }
                    });
                }
            }
        });
    }

    return {
        start: () => {
            isActive = true;
            box.style.display = 'block';
            setTimeout(() => box.classList.add('active'), 100);
            setupListeners();
            showStep(0);
        }
    };
})();


// --- SLIDER LOGIK ---
document.getElementById('slider-balance').addEventListener('input', (e) => {
    Sonifier.setBalance(e.target.value);
    Visualizer.setBalance(e.target.value);
});
document.getElementById('slider-reverb').addEventListener('input', (e) => {
    Sonifier.setReverb(e.target.value);
    Visualizer.setReverb(e.target.value);
});
document.getElementById('slider-timbre').addEventListener('input', (e) => {
    Sonifier.setTimbre(e.target.value);
    Visualizer.setTimbre(e.target.value);
});
document.getElementById('slider-harmony').addEventListener('input', (e) => {
    harmonyAmount = parseFloat(e.target.value);
    Visualizer.setHarmony(e.target.value);
});

function toggleMute() {
    const isMuted = Sonifier.toggleMute();
    const btn = document.getElementById('mute-btn');
    btn.style.opacity = isMuted ? "0.5" : "1";
    btn.innerText = isMuted ? "🔇" : "🔊";
}

function toggleStereo() {
    const isStereo = Sonifier.toggleStereo();
    const btn = document.getElementById('stereo-btn');
    if (btn) {
        btn.style.opacity = isStereo ? "1" : "0.5";
        btn.innerText = isStereo ? "🎧" : "📻";
    }
}

function startExperience(withTutorial) {
    const overlay = document.getElementById('overlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 1000);

    const bal = document.getElementById('slider-balance').value;
    const rev = document.getElementById('slider-reverb').value;
    const tim = document.getElementById('slider-timbre').value;
    const har = document.getElementById('slider-harmony').value;

    Sonifier.setBalance(bal); Visualizer.setBalance(bal);
    Sonifier.setReverb(rev);  Visualizer.setReverb(rev);
    Sonifier.setTimbre(tim);  Visualizer.setTimbre(tim);
    harmonyAmount = parseFloat(har); Visualizer.setHarmony(har);
    
    Sonifier.init();
    Visualizer.init();
    
    const render = () => {
        requestAnimationFrame(render);
        Visualizer.update();
    };
    render();

    const url = "https://stream.wikimedia.org/v2/stream/recentchange";
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = "Online";
            statusEl.style.color = "#00ff88";
        }
        document.getElementById('log').innerText = "Live stream active";
        
        if (withTutorial) {
            setTimeout(() => Tutorial.start(), 500);
        }
    };

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type !== 'edit') return;
        processData(data);
    };

    eventSource.onerror = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = "Disconnected";
            statusEl.style.color = "#ff3e3e";
        }
    };
}

function getNearestNote(freq) {
    let nearest = PENTATONIC_FREQS[0];
    let minDiff = Math.abs(freq - nearest);
    for (let i = 1; i < PENTATONIC_FREQS.length; i++) {
        let diff = Math.abs(freq - PENTATONIC_FREQS[i]);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = PENTATONIC_FREQS[i];
        }
    }
    return nearest;
}

function processData(data) {
    editCount++;
    document.getElementById('count').innerText = editCount;
    document.getElementById('last-wiki').innerText = data.wiki;

    const userEl = document.getElementById('meta-user');
    userEl.innerText = data.user;
    userEl.style.color = data.bot ? "#00d4ff" : "white";
    document.getElementById('meta-title').innerText = data.title;
    
    let typeStr = "Edit";
    if (data.minor) typeStr = "Minor";
    if (data.length && (data.length.new - data.length.old) < 0) typeStr = "Deletion";
    document.getElementById('meta-type').innerText = typeStr;

    const delta = data.length ? data.length.new - data.length.old : 0;
    if (delta === 0) return;

    const wikiHash = data.wiki.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const posX = ((wikiHash % 100) / 50 - 1) * 50;
    
    const yLog = Math.log(Math.abs(delta) + 1);
    const posY = (yLog / 9 * 60) - 30;
    let color = data.bot ? 0x3c78ff : (delta < 0 ? 0xff6428 : 0xffb428);

    Visualizer.addPoint(posX, posY, color, Math.abs(delta), {
        title: data.title,
        isBot: data.bot,
        wiki: data.wiki
    });
    
    const rawFreq = Math.pow(1.04, data.title.length) * 40 + 50;
    const scaleFreq = getNearestNote(rawFreq);
    const finalFreq = rawFreq + (scaleFreq - rawFreq) * harmonyAmount;
    const safeFreq = Math.min(Math.max(finalFreq, 40), 3000);
    
    const panX = posX / 50;

    Sonifier.play(safeFreq, data.bot, delta, panX);

    document.getElementById('log').innerText = `${data.wiki}: ${delta} bytes`;
}