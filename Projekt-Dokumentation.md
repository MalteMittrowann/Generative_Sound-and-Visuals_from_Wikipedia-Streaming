# **SONIC WIKIPEDIA**

### **Generative Audiovisuelle Echtzeit-Installation**

[**LIVE INSTALLATION STARTEN**](https://maltemittrowann.com/wiki-sonic/)

*Der globalen Puls des menschlichen Wissens in Echtzeit.*

## **Projektübersicht**

**"Sonic Wikipedia"** ist eine cross-mediale generative Kunstinstallation, die die unsichtbare digitale Infrastruktur der weltweiten Wissensproduktion sinnlich erfahrbar macht.

Das System verbindet sich in Echtzeit mit dem globalen Datenstrom der Wikimedia Foundation. Jede Bearbeitung (*Edit*), die irgendwo auf der Welt auf Wikipedia getätigt wird, wird augenblicklich in **Licht** und **Klang** übersetzt.

Wikipedia wird oft als statische Enzyklopädie wahrgenommen. Im Hintergrund jedoch agiert ein komplexes, lebendiges Ökosystem aus menschlichen Autoren und automatisierten Bots. Dieses Projekt visualisiert und sonifiziert diesen **"Herzschlag des Internets"**.

## **Konzept & Forschungsfrage**

Das Projekt behandelt die Wikipedia-API nicht als reine Datenquelle, sondern als generativen "Keim" (*Seed*). Ein zentraler Forschungsaspekt liegt in der ästhetischen Unterscheidung zwischen **menschlicher** und **maschineller** Aktivität.

| Forschungsaspekt | Beschreibung |
| :---- | :---- |
| **Cross-Mediale Übersetzung** | Wie lassen sich abstrakte Metadaten (Byte-Größe, Nutzer-Typ, Artikellänge, Sprache) in sensorische Parameter (Frequenz, Klangfarbe, Position im 3D-Raum) übersetzen? |
| **Mensch vs. Maschine** | Das System weist Akteuren unterschiedliche Signaturen zu. **Bots** klingen kalt und präzise (Rechteckwellen), **Menschen** warm und organisch (Sägezahnwellen). |
| **Globalität** | Durch die Verortung der Edits (im Stereobild und auf einem virtuellen Globus) wird die weltweite Gleichzeitigkeit der Wissensproduktion visualisiert. |

## **Systemarchitektur (Dual Implementation)**

Das Projekt wurde in zwei technischen Iterationen entwickelt, um unterschiedliche Ökosysteme zu erforschen:

### **Der Forschungs-Prototyp (Offline / Lokal)**

*High-Performance Umgebung für Audio-Synthese und Netzwerk-Kommunikation.*

* **Backend:** Python 3.13 (Daten-Stream & Parsing)  
* **Kommunikation:** OSC (Open Sound Control) via UDP  
* **Audio-Engine:** SuperCollider (Hochleistungs-Echtzeitsynthese)  
* **Visuals:** Python (Pygame mit Custom 3D-Projektions-Engine)

### **Die Öffentliche Installation (Online / Web)**

*Barrierefreie Portierung auf moderne Web-Standards.*

* **Core:** JavaScript (ES6+), Server-Sent Events (SSE)  
* **Visuals:** Three.js (WebGL) für hardwarebeschleunigtes 3D-Rendering & Bloom  
* **Audio:** Web Audio API (Nachbau der SuperCollider-Synthese im Browser)

## **Features & Mappings**

### **Visuelle Parameter**

* **X-Achse:** Repräsentiert die Sprache/das Wiki (z.B. Englisch links, Deutsch rechts, Japanisch Mitte).  
* **Y-Achse:** Repräsentiert die Größe der Änderung (*Delta*). Kleine Typos schweben oben, massive Textänderungen fallen nach unten.  
* **Modi:** Umschaltbar zwischen abstraktem "Daten-Tunnel" und "Globus-Ansicht" (Geografisches Mapping).

**Farb-Kodierung:**

* 🔵 **Blau:** Bot-Aktivität (Automatisierte Wartung)  
* 🟡 **Gelb/Orange:** Menschliche Ergänzung  
* 🔴 **Rot:** Menschliche Löschung (Vandalismus oder Bereinigung)

### **Auditive Parameter**

* **Frequenz:** Abgeleitet von der Titellänge des Artikels. Längere Titel erzeugen tiefere, fundamentale Frequenzen.  
* **Klangfarbe (Timbre):** Unterscheidung zwischen Bot (*Digital/Square*) und Mensch (*Analog/Sawtooth*).  
* **Räumlichkeit:** Stereo-Panning korrespondiert mit der visuellen Position auf dem Bildschirm.

### **Interaktivität ("Mixing Desk")**

Der Nutzer kann die generative Ästhetik in Echtzeit beeinflussen:

1. **Balance:** Mischverhältnis zwischen Bot- und Mensch-Edits.  
2. **Harmony:** Interpolation zwischen freier Atonalität und quantisierter pentatonischer Skala.  
3. **Timbre:** Steuerung der Filter-Helligkeit und des visuellen "Glows".  
4. **Space:** Regelung des Hall-Anteils (*Reverb*) und der visuellen Partikel-Spuren.

## **Installation & Verwendung**

### **Variante A: Online Version (Empfohlen)**

Besuchen Sie einfach die Live-URL. Keine Installation notwendig.

[**https://maltemittrowann.com/wiki-sonic/**](https://maltemittrowann.com/wiki-sonic/)

*(Hinweis: Klicken Sie auf "Enter Experience", um den AudioContext zu starten)*

### **Variante B: Lokale Version (Python & SuperCollider)**

**Voraussetzungen:**

* Python 3.10 oder neuer  
* SuperCollider  
* Libraries: pip install requests python-osc pygame

**Schritt-für-Schritt Anleitung:**

1. **Audio-Engine starten:**  
   Öffnen Sie Wikipedia-Synth.scd in SuperCollider. Führen Sie den gesamten Code-Block aus (Strg+Enter), um den Server zu booten.  
2. **Visualisierung starten:**  
   python Wikipedia-Visualizer.py

   *(Öffnet das Fenster und startet den OSC-Server für die Steuerung)*  
3. **Daten-Stream starten:**  
   python Wikipedia-Streaming.py

   *(Verbindet sich mit der Wikimedia API und sendet Daten)*

## **Lizenz & Credits**

**Autor:** Malte Mittrowann

**Kurs:** Generative Sound & Visual Art

**Repository:** [GitHub Link](https://github.com/MalteMittrowann/Generative_Sound-and-Visuals_from_Wikipedia-Streaming)

Dieses Projekt ist Open Source unter der **MIT Lizenz**.