/* ==========================================================
   STREAM HANDLER (Safe Mode)
   ========================================================== */

let editCount = 0;
let harmonyAmount = 0.5; 

// --- GEO MAPPING ---
// Grobe Koordinaten für wichtige Wikis
const WIKI_LOCATIONS = {
    'enwiki': { lat: 38, lon: -97 }, // USA
    'dewiki': { lat: 51, lon: 10 },  // Deutschland
    'frwiki': { lat: 46, lon: 2 },   // Frankreich
    'eswiki': { lat: 40, lon: -3 },  // Spanien
    'ruwiki': { lat: 61, lon: 105 }, // Russland
    'jawiki': { lat: 36, lon: 138 }, // Japan
    'zhwiki': { lat: 35, lon: 104 }, // China
    'itwiki': { lat: 41, lon: 12 },  // Italien
    'plwiki': { lat: 51, lon: 19 },  // Polen
    'ptwiki': { lat: -14, lon: -51 }, // Brasilien
    'ukwiki': { lat: 48, lon: 31 },  // Ukraine
    'nlwiki': { lat: 52, lon: 5 },   // Niederlande
    'trwiki': { lat: 38, lon: 35 },  // Türkei
    'arwiki': { lat: 23, lon: 45 },  // Saudi Arabien
    'fawiki': { lat: 32, lon: 53 },  // Iran
    'svwiki': { lat: 60, lon: 18 },  // Schweden
    'commonswiki': { lat: 0, lon: 0 } // Äquator
};

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

// --- HELPER FUNCTIONS ---
function getNearestNote(freq) {
    if (!PENTATONIC_FREQS.length) return freq;
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

function getGeoData(wiki) {
    if (WIKI_LOCATIONS[wiki]) {
        const base = WIKI_LOCATIONS[wiki];
        return {
            lat: base.lat + (Math.random() - 0.5) * 10,
            lon: base.lon + (Math.random() - 0.5) * 10
        };
    }
    // Fallback: Random weltweit
    return {
        lat: (Math.random() - 0.5) * 140, 
        lon: (Math.random() - 0.5) * 360
    };
}

// --- SAFE EVENT LISTENERS ---
// Wir prüfen erst, ob das Element existiert, bevor wir den Listener hinzufügen.
// Das verhindert Abstürze, falls das HTML nicht synchron ist.

function safeAddListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

safeAddListener('start-btn', 'click', () => startExperience(false));
safeAddListener('start-tutorial-btn', 'click', () => startExperience(true));
safeAddListener('mute-btn', 'click', toggleMute);
safeAddListener('stereo-btn', 'click', toggleStereo);

// View Switcher Logic
const viewAbstractBtn = document.getElementById('view-abstract');
const viewGlobeBtn = document.getElementById('view-globe');

if (viewAbstractBtn && viewGlobeBtn) {
    viewAbstractBtn.addEventListener('click', () => {
        if(typeof Visualizer !== 'undefined') Visualizer.setMode('abstract');
        viewAbstractBtn.classList.add('active');
        viewGlobeBtn.classList.remove('active');
    });

    viewGlobeBtn.addEventListener('click', () => {
        if(typeof Visualizer !== 'undefined') Visualizer.setMode('globe');
        viewGlobeBtn.classList.add('active');
        viewAbstractBtn.classList.remove('active');
    });
}

// Slider Logic
safeAddListener('slider-balance', 'input', (e) => {
    Sonifier.setBalance(e.target.value);
    Visualizer.setBalance(e.target.value);
});
safeAddListener('slider-reverb', 'input', (e) => {
    Sonifier.setReverb(e.target.value);
    Visualizer.setReverb(e.target.value);
});
safeAddListener('slider-timbre', 'input', (e) => {
    Sonifier.setTimbre(e.target.value);
    Visualizer.setTimbre(e.target.value);
});
safeAddListener('slider-harmony', 'input', (e) => {
    harmonyAmount = parseFloat(e.target.value);
    Visualizer.setHarmony(e.target.value);
});


// --- ACTIONS ---
function toggleMute() {
    const isMuted = Sonifier.toggleMute();
    const btn = document.getElementById('mute-btn');
    if(btn) {
        btn.style.opacity = isMuted ? "0.5" : "1";
        btn.innerText = isMuted ? "🔇" : "🔊";
    }
}

function toggleStereo() {
    const isStereo = Sonifier.toggleStereo();
    const btn = document.getElementById('stereo-btn');
    if (btn) {
        btn.style.opacity = isStereo ? "1" : "0.5";
        btn.innerText = isStereo ? "🎧" : "📻";
    }
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

    // Wenn Tutorial-Elemente fehlen, breche Init ab
    if (!box || !title || !text || !nextBtn) return { start: () => console.log("Tutorial UI missing") };

    const steps = [
        {
            title: "Navigation",
            text: "Welcome to Sonic Wikipedia. You can explore the data space by <b>clicking & dragging</b> to rotate the view, and <b>scrolling</b> to zoom in/out.",
            target: null, // Center screen
            position: "center"
        },
        {
            title: "View Modes",
            text: "Use these buttons to switch between the <b>Abstract</b> tunnel view and the <b>Globe View</b>. The Globe maps edits to their geographic origin based on language.",
            target: "view-switcher",
            position: "bottom"
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
            actionId: "slider-balance" // ID for auto-detect
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
            target: "audio-controls", 
            position: "top"
        }
    ];

    function showStep(index) {
        if (index >= steps.length) { endTutorial(); return; }
        currentStep = index;
        const step = steps[index];
        
        title.innerText = step.title;
        text.innerHTML = step.text;
        progress.innerText = `${index + 1}/${steps.length}`;
        nextBtn.innerText = index === steps.length - 1 ? "Finish" : "Next ›";

        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

        if (step.target) {
            const targetEl = document.getElementById(step.target);
            if (targetEl) {
                targetEl.classList.add('tutorial-highlight');
                const rect = targetEl.getBoundingClientRect();
                box.style.left = (rect.left + rect.width/2 - 140) + "px"; 
                box.style.top = (rect.top - box.offsetHeight - 20) + "px";
                
                if (rect.top < 200) box.style.top = (rect.bottom + 20) + "px";
                if (parseInt(box.style.left) + 280 > window.innerWidth) box.style.left = (window.innerWidth - 300) + "px";
            }
        } else {
            box.style.left = "50%"; box.style.top = "40%"; box.style.transform = "translate(-50%, -50%)";
        }
    }

    function next() {
        if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
        showStep(currentStep + 1);
    }

    function endTutorial() {
        isActive = false;
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        box.classList.remove('active');
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        setTimeout(() => box.style.display = 'none', 500);
    }

    function setupListeners() {
        nextBtn.onclick = next; // Safer than addEventListener if called multiple times
        steps.forEach((step, index) => {
            if (step.actionId) {
                const el = document.getElementById(step.actionId);
                if (el) {
                    el.addEventListener('input', () => {
                        if (isActive && currentStep === index && !autoAdvanceTimer) {
                            autoAdvanceTimer = setTimeout(() => { autoAdvanceTimer = null; next(); }, 1500);
                        }
                    });
                }
            }
        });
    }

    return { 
        start: () => { 
            isActive = true; box.style.display = 'block'; 
            setTimeout(() => box.classList.add('active'), 100); 
            setupListeners(); showStep(0); 
        } 
    };
})();


// --- MAIN LOOP ---
function startExperience(withTutorial) {
    const overlay = document.getElementById('overlay');
    if(overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 1000);
    }

    // Init Values (Safe Check)
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : 0.5; };
    
    Sonifier.setBalance(getVal('slider-balance')); Visualizer.setBalance(getVal('slider-balance'));
    Sonifier.setReverb(getVal('slider-reverb'));  Visualizer.setReverb(getVal('slider-reverb'));
    Sonifier.setTimbre(getVal('slider-timbre'));  Visualizer.setTimbre(getVal('slider-timbre'));
    harmonyAmount = parseFloat(getVal('slider-harmony')); Visualizer.setHarmony(getVal('slider-harmony'));
    
    Sonifier.init();
    Visualizer.init();
    
    const render = () => {
        requestAnimationFrame(render);
        Visualizer.update();
    };
    render();

    // Stream Setup
    const url = "https://stream.wikimedia.org/v2/stream/recentchange";
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = "Online";
            statusEl.style.color = "#00ff88";
        }
        const logEl = document.getElementById('log');
        if(logEl) logEl.innerText = "Live stream active";
        
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

function processData(data) {
    editCount++;
    const countEl = document.getElementById('count');
    if(countEl) countEl.innerText = editCount;
    
    const wikiEl = document.getElementById('last-wiki');
    if(wikiEl) wikiEl.innerText = data.wiki;

    // Metadaten UI (Safe Check)
    const userEl = document.getElementById('meta-user');
    if(userEl) {
        userEl.innerText = data.user;
        userEl.style.color = data.bot ? "#00d4ff" : "white";
    }
    const titleEl = document.getElementById('meta-title');
    if(titleEl) titleEl.innerText = data.title;
    
    const typeEl = document.getElementById('meta-type');
    if(typeEl) {
        let typeStr = "Edit";
        if (data.minor) typeStr = "Minor";
        if (data.length && (data.length.new - data.length.old) < 0) typeStr = "Deletion";
        typeEl.innerText = typeStr;
    }

    const delta = data.length ? data.length.new - data.length.old : 0;
    if (delta === 0) return;

    // --- MAPPINGS ---
    // 1. Abstract Position
    const wikiHash = data.wiki.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const posX = ((wikiHash % 100) / 50 - 1) * 50;
    
    const yLog = Math.log(Math.abs(delta) + 1);
    const posY = (yLog / 9 * 60) - 30;
    
    let color = data.bot ? 0x3c78ff : (delta < 0 ? 0xff6428 : 0xffb428);

    // 2. Globe Position
    const geoData = getGeoData(data.wiki);

    // Visuals Trigger
    if (typeof Visualizer !== 'undefined') {
        Visualizer.addPoint(posX, posY, color, Math.abs(delta), {
            title: data.title,
            isBot: data.bot,
            wiki: data.wiki
        }, geoData);
    }
    
    // Audio Params
    const rawFreq = Math.pow(1.04, data.title.length) * 40 + 50;
    const scaleFreq = getNearestNote(rawFreq);
    const finalFreq = rawFreq + (scaleFreq - rawFreq) * harmonyAmount;
    const safeFreq = Math.min(Math.max(finalFreq, 40), 3000);
    const panX = posX / 50;

    // Sound Trigger
    if (typeof Sonifier !== 'undefined') {
        Sonifier.play(safeFreq, data.bot, delta, panX);
    }

    const logEl = document.getElementById('log');
    if(logEl) logEl.innerText = `${data.wiki}: ${delta} bytes`;
}