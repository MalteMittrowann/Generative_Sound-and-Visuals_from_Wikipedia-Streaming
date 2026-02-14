s.boot;

(
// --- GLOBALE PARAMETER (Standardwerte) ---
~balance = 0.0; // -1 (Mensch) bis 1 (Bot)
~harmony = 0.5; // 0 (Frei) bis 1 (Skala)
~timbre  = 0.5; // 0 (Dunkel) bis 1 (Hell)
~reverb  = 0.4; // 0 (Trocken) bis 0.9 (Nass)

// --- 1. Synth Definition ---
SynthDef(\wikiWebStyle, {
    |freq=440, amp=0.5, pan=0, isBot=0, delta=100,
     timbreVal=0.5, reverbMix=0.4|

    var sig, env, filterEnv;
    var botSig, humanSig;
    var cutoff;

    // --- BOT SOUND (Rechteck) ---
    botSig = Pulse.ar(freq, 0.5);
    // Bot Filter abhängig von Timbre
    botSig = LPF.ar(botSig, (200 + (timbreVal * 10000)).clip(200, 15000));

    // --- HUMAN SOUND (Sägezahn) ---
    humanSig = VarSaw.ar([freq, freq * 1.005], 0, 0.5).sum * 0.5;

    // Timbre steuert Basis-Cutoff und Modulationstiefe
    cutoff = 100 + (timbreVal * 4000);
    filterEnv = EnvGen.kr(Env.new([cutoff, cutoff * (1 + (timbreVal * 2)), cutoff], [0.2, 1.5], \exp));
    humanSig = RLPF.ar(humanSig, filterEnv.clip(100, 18000), 0.6);

    // Signalauswahl
    sig = Select.ar(isBot > 0.5, [humanSig, botSig]);

    // --- HÜLLKURVEN ---
    env = EnvGen.kr(
        Env.perc(
            attackTime: Select.kr(isBot, [0.5, 0.01]),
            releaseTime: Select.kr(isBot, [(delta.log2 * 0.5).clip(1, 6), 0.2])
        ),
        doneAction: 2
    );

    sig = sig * env * amp;
    sig = Pan2.ar(sig, pan);

    // --- REVERB ---
    // Wir nutzen hier FreeVerb als einfachen Hall-Effekt
    sig = FreeVerb.ar(sig, mix: reverbMix, room: 0.8, damp: 0.2);

    Out.ar(0, sig);
}).add;
)

// --- 2. OSC Receiver für STEUERUNG (Neu!) ---
(
OSCdef(\control, { |msg|
    var param = msg[1]; // Name des Parameters als Symbol oder String
    var value = msg[2]; // Wert

    if (param == \balance) { ~balance = value; };
    if (param == \harmony) { ~harmony = value; };
    if (param == \timbre)  { ~timbre  = value; };
    if (param == \reverb)  { ~reverb  = value; };

    // Debug:
    // ("Control: " + param + " -> " + value).postln;
}, '/wiki/control');
)

// --- 3. OSC Receiver für DATEN ---
(
~getNearestPentatonic = { |freq|
    var root = 65.41; // C2
    var steps = [0, 3, 5, 7, 10];
    var midinote = freq.cpsmidi;
    var oct = (midinote / 12).floor;
    var noteInOctave = midinote % 12;
    var nearestStep = steps.minItem { |x| (x - noteInOctave).abs };
    var newMidi = (oct * 12) + nearestStep;
    newMidi.midicps;
};

OSCdef(\wiki, { |msg|
    var delta     = msg[1];
    var isBot     = msg[2];
    var titleSize = msg[3];
    var wikiHash  = msg[4];

    var rawFreq, quantFreq, finalFreq, pan, volFactor;

    // 1. Balance Berechnung (Lautstärke anpassen)
    volFactor = 1.0;
    if (isBot > 0.5) {
        // Wenn Bot: Slider rechts (1) = laut, Slider links (-1) = leise
        if (~balance < 0) { volFactor = 1 + ~balance; }; // Wird 0 bei -1
    } {
        // Wenn Mensch: Slider links (-1) = laut, Slider rechts (1) = leise
        if (~balance > 0) { volFactor = 1 - ~balance; }; // Wird 0 bei 1
    };

    // Nur spielen, wenn laut genug
    if (volFactor > 0.01) {

        // 2. Frequenz & Harmonie
        rawFreq = titleSize.linexp(1, 100, 50, 800);
        quantFreq = ~getNearestPentatonic.(rawFreq);

        // Interpolation zwischen Frei und Skala
        finalFreq = rawFreq + ((quantFreq - rawFreq) * ~harmony);

        if (isBot > 0.5) { finalFreq = finalFreq * 2; };

        // 3. Panning
        pan = ((wikiHash % 100) / 50) - 1.0;

        // 4. Trigger
        Synth(\wikiWebStyle, [
            \freq, finalFreq,
            \amp, (delta.abs.log2 / 12).clip(0.1, 0.6) * volFactor, // Volume Factor anwenden
            \pan, pan,
            \isBot, isBot,
            \delta, delta.abs,
            \timbreVal, ~timbre, // Globale Variable nutzen
            \reverbMix, ~reverb  // Globale Variable nutzen
        ]);
    };

}, '/wiki/edit_full');
)