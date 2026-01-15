/* ==========================================================
   STREAM HANDLER (Logik & Skalen)
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
document.getElementById('start-btn').addEventListener('click', startExperience);
document.getElementById('mute-btn').addEventListener('click', toggleMute);

const stereoBtn = document.getElementById('stereo-btn');
if (stereoBtn) {
    stereoBtn.addEventListener('click', toggleStereo);
}

// --- SLIDER LOGIK: Beides steuern (Audio & Visual) ---
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

function startExperience() {
    const overlay = document.getElementById('overlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 1000);

    // Init Slider Values in beiden Engines
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

    // Mapping
    const wikiHash = data.wiki.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    // Position X (-50 bis 50)
    const posX = ((wikiHash % 100) / 50 - 1) * 50;
    
    const yLog = Math.log(Math.abs(delta) + 1);
    const posY = (yLog / 9 * 60) - 30;
    let color = data.bot ? 0x3c78ff : (delta < 0 ? 0xff6428 : 0xffb428);

    Visualizer.addPoint(posX, posY, color, Math.abs(delta), {
        title: data.title,
        isBot: data.bot,
        wiki: data.wiki
    });
    
    // Audio Frequenz
    const rawFreq = Math.pow(1.04, data.title.length) * 40 + 50;
    const scaleFreq = getNearestNote(rawFreq);
    const finalFreq = rawFreq + (scaleFreq - rawFreq) * harmonyAmount;
    const safeFreq = Math.min(Math.max(finalFreq, 40), 3000);
    
    // Panning Value (-1 bis 1)
    const panX = posX / 50;

    Sonifier.play(safeFreq, data.bot, delta, panX);

    document.getElementById('log').innerText = `${data.wiki}: ${delta} bytes`;
}