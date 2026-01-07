import pygame
import threading
import time
import math
from pythonosc import dispatcher, osc_server

# --- Pygame Konfiguration ---
SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
FADE_TIME_SECONDS = 10.0 # Wie lange ein Punkt sichtbar ist
BG_COLOR = (0, 0, 0) # Schwarz

# --- OSC Konfiguration ---
OSC_IP = "0.0.0.0" # Auf allen IPs lauschen
OSC_PORT = 57121   # Port für Visualizer
OSC_ADDRESS = "/wiki/edit_full" 

# Globale Liste und Lock
GLOBAL_DOTS = []
DOT_LOCK = threading.Lock()

def wiki_edit_handler(address, *args):
    """
    Diese Funktion wird vom OSC-Server-Thread aufgerufen.
    """
    global GLOBAL_DOTS, DOT_LOCK
    
    try:
        # 4 Argumente empfangen
        delta, is_bot, title_len, wiki_hash = args
        
        # --- Mapping ---
        
        # X-Position: Basiert auf Sprache
        x = int(wiki_hash * 13) % SCREEN_WIDTH
        
        # Y-Position: Basiert auf Änderungsgröße
        y_log = math.log(abs(delta) + 1)
        y_norm = min(y_log / 9.0, 1.0) 
        y = int(SCREEN_HEIGHT - (y_norm * (SCREEN_HEIGHT * 0.9)) - (SCREEN_HEIGHT * 0.05))

        # Radius
        radius = max(3, int(y_log * 2))

        # Farbe bestimmen
        if is_bot > 0.5: 
            color = pygame.Color(60, 120, 255) # Blau
        else:
            if delta < 0:
                color = pygame.Color(255, 100, 40) # Orange/Rot
            else:
                color = pygame.Color(255, 180, 40) # Gelb

        new_dot = {
            'x': x,
            'y': y,
            'radius': radius,
            'color': color, 
            'start_time': time.time()
        }
        
        with DOT_LOCK:
            GLOBAL_DOTS.append(new_dot)
        
        # Debug Ausgabe (optional, kann auskommentiert werden wenn zu viel Text)
        print(f"DEBUG: Punkt hinzugefügt bei {x}/{y}, Farbe: {color}")
            
    except ValueError:
        print(f"Falsche OSC-Argumente: {len(args)}")
    except Exception as e:
        print(f"Fehler im Handler: {e}")

def main():
    global GLOBAL_DOTS 

    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Wikipedia OSC Visualizer")
    clock = pygame.time.Clock()
    
    # OSC-Server Setup
    disp = dispatcher.Dispatcher()
    disp.map(OSC_ADDRESS, wiki_edit_handler) 

    server = osc_server.ThreadingOSCUDPServer((OSC_IP, OSC_PORT), disp)
    print(f"Visualizer läuft auf Port {OSC_PORT}. Warte auf Daten...")
    
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True 
    server_thread.start()

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        
        screen.fill(BG_COLOR)
        
        current_time = time.time()
        new_dots_list = [] 

        with DOT_LOCK: 
            for dot in GLOBAL_DOTS:
                age = current_time - dot['start_time']
                
                if age < FADE_TIME_SECONDS:
                    age_ratio = age / FADE_TIME_SECONDS
                    
                    # Alpha berechnen (0..255)
                    alpha = int(255 * (1.0 - age_ratio))
                    
                    # Radius schrumpfen lassen
                    current_radius = int(dot['radius'] * (1.0 - (age_ratio * 0.5)))
                    
                    if current_radius > 0:
                        dot_surface = pygame.Surface((current_radius * 2, current_radius * 2), pygame.SRCALPHA)
                        
                        # --- HIER WURDE DER FEHLER BEHOBEN ---
                        # Statt .copy() erstellen wir die Farbe neu mit den RGBA Werten
                        orig = dot['color']
                        draw_color = pygame.Color(orig.r, orig.g, orig.b, alpha)
                        
                        pygame.draw.circle(dot_surface, draw_color, (current_radius, current_radius), current_radius)
                        
                        blit_pos = (dot['x'] - current_radius, dot['y'] - current_radius)
                        screen.blit(dot_surface, blit_pos, special_flags=pygame.BLEND_RGBA_ADD)
                    
                    new_dots_list.append(dot) 

            GLOBAL_DOTS = new_dots_list 
        
        pygame.display.flip()
        clock.tick(60)

    print("Beende...")
    server.shutdown()
    pygame.quit()

if __name__ == "__main__":
    main()