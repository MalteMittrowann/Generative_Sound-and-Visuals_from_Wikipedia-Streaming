import json
import requests
import time
import sys
from pythonosc.udp_client import SimpleUDPClient

# --- Konfiguration ---
OSC_IP = "127.0.0.1"

# Client für SuperCollider
OSC_PORT_SC = 57120 
client_sc = SimpleUDPClient(OSC_IP, OSC_PORT_SC)

# Client für den Pygame Visualizer
OSC_PORT_VIZ = 57121
client_viz = SimpleUDPClient(OSC_IP, OSC_PORT_VIZ)

# Adresse
OSC_ADDRESS = "/wiki/edit_full"

def stream_wikipedia_changes():
    url = "https://stream.wikimedia.org/v2/stream/recentchange"
    
    # Wir tarnen uns als normaler Chrome Browser, um Blockaden zu vermeiden
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/event-stream"
    }
    
    print(f"Verbinde mit {url} (Byte-Buffer-Modus)...")
    
    while True:
        try:
            with requests.get(url, headers=headers, stream=True, timeout=30) as response:
                if response.status_code != 200:
                    print(f"Fehler: Server antwortet mit Code {response.status_code}")
                    time.sleep(5)
                    continue

                print("Verbunden! Lese Stream...")
                
                # Puffer für unvollständige Zeilen
                buffer = b""
                event_data = ""

                # iter_content mit kleiner Chunk-Size erzwingt das sofortige Lesen
                for chunk in response.iter_content(chunk_size=128):
                    if not chunk:
                        continue
                        
                    buffer += chunk
                    
                    # Solange wir Zeilenumbrüche im Puffer haben, verarbeiten wir sie
                    while b'\n' in buffer:
                        line_bytes, buffer = buffer.split(b'\n', 1)
                        line = line_bytes.decode('utf-8', errors='replace').strip()
                        
                        # --- Ab hier ist die Logik wie vorher ---
                        
                        if line.startswith("data:"):
                            event_data += line[5:].strip()
                        
                        elif line == "":
                            if not event_data:
                                continue
                                
                            try:
                                data = json.loads(event_data)
                                
                                # Nur Edits
                                if data.get('type') == 'edit':
                                    title = data.get("title", "")
                                    is_bot = 1.0 if data.get("bot", False) else 0.0
                                    wiki = data.get("wiki", "unknown")
                                    
                                    length = data.get("length", {})
                                    old = length.get("old") or 0
                                    new = length.get("new") or 0
                                    delta = float(new - old)
                                    
                                    if delta != 0:
                                        title_len = float(len(title))
                                        wiki_hash = float(sum(ord(c) for c in wiki))

                                        # NEU: Wir senden jetzt auch den Titel und den Wiki-Namen!
                                        osc_data = [
                                            delta, 
                                            is_bot, 
                                            title_len, 
                                            wiki_hash,
                                            title,  # String: Titel des Artikels
                                            wiki    # String: Name des Wikis (z.B. dewiki)
                                        ]
                                        
                                        client_sc.send_message(OSC_ADDRESS, osc_data)
                                        client_viz.send_message(OSC_ADDRESS, osc_data)

                                        # print mit flush=True erzwingt die Ausgabe in der Konsole
                                        print(f"OSC -> {wiki}: {title} ({delta})", flush=True)

                            except Exception:
                                pass # Fehlerhafte Pakete ignorieren
                            
                            event_data = ""
        
        except Exception as e:
            print(f"Verbindung unterbrochen: {e}. Neustart in 3s...", flush=True)
            time.sleep(3)
        except KeyboardInterrupt:
            print("\nStop.")
            break

if __name__ == "__main__":
    stream_wikipedia_changes()