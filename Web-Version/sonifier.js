/* ==========================================================
   SONIFIER (Audio Engine - Web Audio API)
   ========================================================== */
const Sonifier = (() => {
    let audioCtx;
    let masterGain;
    let delayNode;
    let feedbackNode;
    let wetGain;
    let isMuted = false;
    let isStereo = true; // Standard: Stereo an

    const params = {
        balance: 0,
        reverb: 0.4,
        timbre: 0.5
    };

    return {
        init: () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.3;
            masterGain.connect(audioCtx.destination);

            // Reverb Chain
            delayNode = audioCtx.createDelay();
            delayNode.delayTime.value = 0.4;
            
            feedbackNode = audioCtx.createGain();
            feedbackNode.gain.value = 0.4;
            
            wetGain = audioCtx.createGain();
            wetGain.gain.value = params.reverb;

            delayNode.connect(feedbackNode);
            feedbackNode.connect(delayNode);
            delayNode.connect(wetGain);
            wetGain.connect(masterGain);
        },

        setBalance: (val) => { params.balance = parseFloat(val); },

        setReverb: (val) => {
            params.reverb = parseFloat(val);
            if(wetGain && feedbackNode) {
                // Steuert Lautstärke des Halls
                wetGain.gain.setTargetAtTime(params.reverb, audioCtx.currentTime, 0.1);
                // Koppelt Feedback leicht mit
                feedbackNode.gain.setTargetAtTime(Math.min(params.reverb + 0.1, 0.6), audioCtx.currentTime, 0.1);
            }
        },

        setTimbre: (val) => { params.timbre = parseFloat(val); },

        toggleMute: () => {
            if (!audioCtx) return false;
            isMuted = !isMuted;
            const targetVol = isMuted ? 0 : 0.3;
            masterGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);
            return isMuted;
        },

        toggleStereo: () => {
            isStereo = !isStereo;
            return isStereo;
        },

        play: (freq, isBot, delta, panX) => {
            if (!audioCtx || isMuted) return;

            // Balance Check
            let volFactor = 1.0;
            if (isBot) {
                volFactor = params.balance < 0 ? (1 + params.balance) : 1; 
            } else {
                volFactor = params.balance > 0 ? (1 - params.balance) : 1;
            }
            if (volFactor <= 0.01) return;

            const osc = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();
            
            // Panner Node für Stereo
            const panner = audioCtx.createStereoPanner();
            panner.pan.value = isStereo ? Math.max(-1, Math.min(1, panX)) : 0;

            if (isBot) {
                osc.type = 'square';
                const dur = 0.15;
                
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.08 * volFactor, audioCtx.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
                
                filter.type = 'lowpass';
                const cutoff = 200 + (params.timbre * 8000);
                filter.frequency.setValueAtTime(cutoff, audioCtx.currentTime);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(panner); 
                panner.connect(masterGain);
                // Bots auch leicht ins Delay
                gain.connect(delayNode); 

            } else {
                // Menschen: Wärmer, Länger
                osc.type = 'triangle';
                const dur = Math.min(Math.abs(delta) / 100 + 3.0, 10.0); 
                
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.12 * volFactor, audioCtx.currentTime + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);

                filter.type = 'lowpass';
                const baseCutoff = 100 + (params.timbre * 1500);
                const peakCutoff = baseCutoff + (params.timbre * 3000);

                filter.frequency.setValueAtTime(baseCutoff, audioCtx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(Math.max(peakCutoff, baseCutoff + 50), audioCtx.currentTime + 0.4);
                filter.frequency.exponentialRampToValueAtTime(baseCutoff, audioCtx.currentTime + 2.0);

                osc.connect(filter);
                filter.connect(gain);
                
                gain.connect(panner);
                panner.connect(masterGain);
                
                // Hall Signal
                gain.connect(delayNode); 
            }

            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 12);
        }
    };
})();