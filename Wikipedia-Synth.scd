s.boot;

s.stop;

ServerOptions.devices;

(
o = Server.default.options;
o.inDevice  = nil;     // kein Input
o.outDevice = "Windows WASAPI : Lautsprecher (Jabra Evolve2 30 SE)";
o.numOutputBusChannels = 2;
o.numInputBusChannels = 0;
)

s.reboot;

(
// Zuerst den Synth definieren (einmal ausführen)
// Neuer Synth: "RichSpace" - Breit, warm und obertonreich
SynthDef(\richSpace, { |freq=200, amp=0.5, dur=3, pan=0, brightness=1|
    var sig, env, filterEnv;

    // 1. Oszillatoren: Ein "SuperSaw"-ähnlicher Cluster
    // Wir nehmen 2 Sägezahnwellen, die leicht gegeneinander verstimmt sind.
    // Das erzeugt den "breiten", schwebenden Chor-Effekt.
    sig = Mix.fill(2, { |i|
        // Frequenz leicht variieren (+/- ein paar Cent)
        var detune = LFNoise1.kr(0.1).bipolar(0.05);
        VarSaw.ar(freq * (1 + (i * 0.007) + detune), width: Rand(0.0, 1.0))
    });

    // 2. Sub-Bass hinzufügen (eine Oktave tiefer = freq * 0.5)
    // Das sorgt für das Fundament im Low-End.
    sig = sig + (SinOsc.ar(freq * 0.5) * 0.6);

    // 3. Filter (Resonant Low Pass)
    // Das Filter bewegt sich von oben nach unten (Zap-Effekt), abhängig von der Helligkeit
    filterEnv = XLine.kr(5, 1, dur); // Filter-Kurve
    sig = RLPF.ar(sig, (freq * brightness * filterEnv).clip(20, 20000), 0.6);

    // 4. Hüllkurve (Volume Envelope)
    env = EnvGen.kr(Env.perc(0.02, dur, 1, -4), doneAction:2);

    sig = sig * env * amp;

    // 5. Stereo-Verbreiterung & Panning
    sig = Pan2.ar(sig, pan);

    // 6. Hochwertiger Hall (Reverb) für Atmosphäre
    // room:0.8 = große Halle
    sig = FreeVerb.ar(sig, mix:0.4, room:0.8, damp:0.2);

    Out.ar(0, sig);
}).add;
)

// --- Der OSC Receiver ---
(
// HINWEIS: Keine Skala (~scale) mehr! Wir nutzen freie Frequenzen.

OSCdef(\wiki, { |msg|
    // WICHTIG: In SuperCollider müssen alle 'var' Deklarationen am Anfang stehen!
    var delta     = msg[1];
    var isBot     = msg[2];
    var titleSize = msg[3];
    var wikiHash  = msg[4];

    // Variablen für spätere Berechnung vorbereiten
    var baseFreq, freq;
    var pan;
    var amp, dur, brightness;

    // --- FREQUENZ-BERECHNUNG (Ohne Raster) ---

    // Wir mappen die Titellänge (titleSize) auf einen Frequenzbereich.
    // linexp wandelt den linearen Input (Länge 5 bis 100 Zeichen)
    // in eine exponentielle Frequenzkurve um (natürlicher für das Ohr).
    // Bereich: 60Hz (Bass) bis 1200Hz (hohe Mitten)
    baseFreq = titleSize.linexp(5, 100, 20, 2000);

    // Variation durch Delta (Größe der Änderung):
    // Große Änderungen schieben die Frequenz tiefer (mächtiger),
    // kleine Änderungen schieben sie leicht nach oben.
    freq = baseFreq * (1 + (delta.abs.log2 * 0.1));

    // Begrenzung, damit es nicht unhörbar hoch oder tief wird (30Hz - 4000Hz)
    freq = freq.clip(20, 4000);


    // --- PANNING ---
    // Links/Rechts basierend auf Wiki-Sprache
    pan = ((wikiHash % 100) / 50) - 1.0;

    // --- SOUND-PARAMETER ---

    // Lautstärke basierend auf Delta
    amp = (delta.abs.log2 / 10).clip(0.1, 0.7);

    // Dauer: Große Edits klingen länger nach
    dur = (delta.abs.log2 / 2.5).clip(0.2, 3.0);

    // Helligkeit des Filters: Große Edits öffnen das Filter weiter (heller/schärfer)
    brightness = (delta.abs.log2).clip(2, 12);

    // Bot vs Mensch Unterscheidung
    if (isBot > 0.5, {
        // Bots: Sehr kurz, "digitaler", etwas leiser
        dur = 0.15;
        brightness = 15; // Sehr helles "Click"
        amp = amp * 0.6;
        // Bots klingen oft technischer, wir schieben sie eine Oktave hoch
        freq = freq * 2;
    });

    // Sound abfeuern
    Synth(\richSpace, [
        \freq, freq,
        \amp, amp,
        \dur, dur,
        \pan, pan,
        \brightness, brightness
    ]);

    ("Sound -> Freq:" + freq.round(0.1) + "Hz | Bot:" + isBot).postln;

}, '/wiki/edit_full');
)