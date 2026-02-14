import pygame
import threading
import time
import math
import random
from pythonosc import dispatcher, osc_server
from pythonosc.udp_client import SimpleUDPClient # Zum Senden an SuperCollider

# --- Konfiguration ---
WIDTH, HEIGHT = 1280, 720
FPS = 60

# 3D Kamera Einstellungen
FOV = 400
Z_START = 800
SPEED = 4

# Farben
COLOR_BOT = (60, 120, 255)
COLOR_HUMAN_ADD = (255, 180, 40)
COLOR_HUMAN_DEL = (255, 60, 40)
COLOR_TEXT = (255, 255, 255)
COLOR_TEXT_DIM = (180, 180, 180) # Für Erklärungen
COLOR_UI_BG = (0, 0, 0, 180)
COLOR_ACCENT = (0, 212, 255)

# --- OSC Setup ---
# Server (Empfangen)
OSC_IP = "0.0.0.0"
OSC_PORT_LISTEN = 57121
OSC_ADDRESS = "/wiki/edit_full"

# Client (Senden an SuperCollider)
OSC_PORT_SEND = 57120
sc_client = SimpleUDPClient("127.0.0.1", OSC_PORT_SEND)

# Globale Listen und Stats
particles = []
lock = threading.Lock()
stats = { "count": 0, "last_wiki": "-" }

# Parameter State (Initialwerte)
params = {
    "balance": 0.0,  # -1.0 bis 1.0
    "harmony": 0.5,  # 0.0 bis 1.0
    "timbre": 0.5,   # 0.0 bis 1.0
    "reverb": 0.4    # 0.0 bis 0.9
}

# --- UI KLASSEN ---
class Slider:
    def __init__(self, x, y, w, h, label, explanation, param_key, min_val, max_val):
        self.rect = pygame.Rect(x, y, w, h)
        self.label = label
        self.explanation = explanation # NEU: Erklärungstext
        self.param_key = param_key
        self.min_val = min_val
        self.max_val = max_val
        self.dragging = False
        
    def draw(self, surface, font_label, font_expl):
        # Label (oben)
        lbl = font_label.render(self.label, True, COLOR_TEXT)
        surface.blit(lbl, (self.rect.x, self.rect.y - 22))
        
        # Track (Hintergrundlinie)
        pygame.draw.rect(surface, (80, 80, 80), (self.rect.x, self.rect.y + self.rect.height//2 - 2, self.rect.width, 4))
        
        # Knob Position berechnen
        val = params[self.param_key]
        norm = (val - self.min_val) / (self.max_val - self.min_val)
        knob_x = self.rect.x + (norm * self.rect.width)
        knob_y = self.rect.y + self.rect.height // 2
        
        # Knob zeichnen
        pygame.draw.circle(surface, COLOR_ACCENT, (int(knob_x), int(knob_y)), 8)
        if self.dragging:
            pygame.draw.circle(surface, (255, 255, 255), (int(knob_x), int(knob_y)), 10, 1)

        # Erklärungstext (unten) - NEU
        # Wir brechen den Text manuell um, falls er zu lang ist (sehr einfach gehalten)
        words = self.explanation.split('|') 
        y_offset = 15
        for line in words:
            expl = font_expl.render(line.strip(), True, COLOR_TEXT_DIM)
            surface.blit(expl, (self.rect.x, self.rect.y + y_offset))
            y_offset += 12

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                # Prüfen ob Maus in Nähe des Sliders ist (etwas Puffer für Touch/Klick)
                mx, my = event.pos
                hitbox = self.rect.inflate(10, 30) # Größere Hitbox
                if hitbox.collidepoint(mx, my):
                    self.dragging = True
                    self.update_value(mx)
                    return True
        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1:
                self.dragging = False
        elif event.type == pygame.MOUSEMOTION:
            if self.dragging:
                self.update_value(event.pos[0])
                return True
        return False

    def update_value(self, mouse_x):
        # Clamp mouse x to slider rect
        x = max(self.rect.x, min(mouse_x, self.rect.x + self.rect.width))
        norm = (x - self.rect.x) / self.rect.width
        new_val = self.min_val + (norm * (self.max_val - self.min_val))
        
        # Update global params & send OSC
        if params[self.param_key] != new_val:
            params[self.param_key] = new_val
            # Sende OSC an SuperCollider
            sc_client.send_message("/wiki/control", [self.param_key, new_val])

# --- 3D PARTIKEL KLASSE ---
class Particle3D:
    def __init__(self, x_factor, y_factor, color, size, is_bot, title):
        self.x = x_factor * WIDTH * 1.5 
        self.y = y_factor * HEIGHT * 1.5
        self.z = Z_START
        self.color = color
        self.base_size = size
        self.is_bot = is_bot
        self.title = title
        self.trail = [] 
        self.screen_x = -1000
        self.screen_y = -1000
        self.screen_radius = 0

    def update(self):
        self.z -= SPEED
        
        # 3D -> 2D
        scale = FOV / (FOV + self.z)
        self.screen_x = int(self.x * scale + WIDTH / 2)
        self.screen_y = int(self.y * scale + HEIGHT / 2)
        
        self.trail.append((self.screen_x, self.screen_y))
        if len(self.trail) > 15:
            self.trail.pop(0)

    def draw(self, surface):
        if self.z <= 1: return 

        scale = FOV / (FOV + self.z)
        
        # --- VISUELLE STEUERUNG ---
        
        # 1. Balance -> Größe
        balance = params["balance"]
        size_factor = 1.0
        if self.is_bot:
            # Slider > 0 (Bot) -> größer
            size_factor = (1 + balance * 2.5) if balance > 0 else (1 - abs(balance) * 0.7)
        else:
            # Slider < 0 (Mensch) -> größer
            size_factor = (1 + abs(balance) * 2.5) if balance < 0 else (1 - balance * 0.7)
            
        radius = int(self.base_size * scale * size_factor)
        radius = max(1, radius)
        self.screen_radius = radius 

        # 2. Timbre -> Helligkeit/Alpha
        timbre = params["timbre"]
        alpha_factor = 0.3 + (timbre * 0.7) # Min 0.3, Max 1.0
        
        r, g, b = self.color
        draw_color = (int(r * alpha_factor), int(g * alpha_factor), int(b * alpha_factor))

        if len(self.trail) > 1:
            pygame.draw.lines(surface, draw_color, False, self.trail, width=max(1, int(radius/2)))

        glow_radius = radius * 3
        glow_surf = pygame.Surface((glow_radius*2, glow_radius*2), pygame.SRCALPHA)
        
        pygame.draw.circle(glow_surf, (*draw_color, 255), (glow_radius, glow_radius), radius)
        pygame.draw.circle(glow_surf, (*draw_color, int(100 * alpha_factor)), (glow_radius, glow_radius), int(radius * 1.5))
        pygame.draw.circle(glow_surf, (*draw_color, int(50 * alpha_factor)), (glow_radius, glow_radius), glow_radius)

        surface.blit(glow_surf, (self.screen_x - glow_radius, self.screen_y - glow_radius), special_flags=pygame.BLEND_ADD)


def wiki_edit_handler(address, *args):
    global stats
    try:
        if len(args) >= 6:
            delta, is_bot, title_len, wiki_hash, title, wiki = args
        else:
            delta, is_bot, title_len, wiki_hash = args[:4]
            title = "Unknown"
            wiki = "-"

        stats["count"] += 1
        stats["last_wiki"] = wiki
        
        x_norm = ((wiki_hash % 100) / 50.0) - 1.0 
        
        y_log = math.log(abs(delta) + 1)
        y_norm = min(y_log / 9.0, 1.0)
        y_pos = (y_norm * 2.0) - 1.0 
        
        size = max(2, int(y_log * 1.5))
        color = COLOR_BOT if is_bot > 0.5 else (COLOR_HUMAN_DEL if delta < 0 else COLOR_HUMAN_ADD)

        new_p = Particle3D(x_norm, y_pos, color, size, is_bot > 0.5, title)
        
        with lock:
            particles.append(new_p)
            
    except Exception as e:
        print(f"Error in Handler: {e}")

def draw_grid(surface, harmony_val):
    if harmony_val < 0.1: return
    alpha = int(harmony_val * 100) 
    color = (80, 80, 80, alpha)
    center_x, center_y = WIDTH // 2, HEIGHT // 2
    grid_surf = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    
    for i in range(0, 12):
        angle = (i / 12) * math.pi * 2
        end_x = center_x + math.cos(angle) * WIDTH
        end_y = center_y + math.sin(angle) * HEIGHT
        pygame.draw.line(grid_surf, color, (center_x, center_y), (end_x, end_y), 1)
        
    for i in range(1, 6):
        radius = i * 80
        pygame.draw.circle(grid_surf, color, (center_x, center_y), radius, 1)
        
    surface.blit(grid_surf, (0,0))

def draw_ui(surface, font_ui, font_small, font_title, sliders, hovered_particle):
    # UI Box oben links
    bg_rect = pygame.Rect(10, 10, 280, 90)
    s = pygame.Surface((bg_rect.width, bg_rect.height))  
    s.set_alpha(180)                
    s.fill((0,0,0))           
    surface.blit(s, (bg_rect.x, bg_rect.y))
    
    txt_title = font_title.render("Sonic Wikipedia [Offline]", True, COLOR_TEXT)
    txt_count = font_ui.render(f"Total Edits: {stats['count']}", True, (200, 200, 200))
    txt_wiki = font_ui.render(f"Last Source: {stats['last_wiki']}", True, (200, 200, 200))
    
    surface.blit(txt_title, (20, 20))
    surface.blit(txt_count, (20, 50))
    surface.blit(txt_wiki, (20, 70))

    # --- SLIDERS (Unten Mitte) ---
    slider_bg_w = 600
    slider_bg_h = 100 # Etwas höher für den Text
    slider_bg_x = (WIDTH - slider_bg_w) // 2
    slider_bg_y = HEIGHT - 110
    
    sb = pygame.Surface((slider_bg_w, slider_bg_h))
    sb.set_alpha(200)
    sb.fill((0,0,0))
    surface.blit(sb, (slider_bg_x, slider_bg_y))
    
    pygame.draw.rect(surface, (50, 50, 50), (slider_bg_x, slider_bg_y, slider_bg_w, slider_bg_h), 1)

    for slider in sliders:
        slider.draw(surface, font_ui, font_small)

    if hovered_particle:
        mx, my = pygame.mouse.get_pos()
        label = font_ui.render(hovered_particle.title, True, COLOR_TEXT)
        box_w = label.get_width() + 20
        box_h = label.get_height() + 10
        box_x = mx + 15
        box_y = my + 15
        if box_x + box_w > WIDTH: box_x = mx - box_w - 10
        if box_y + box_h > HEIGHT: box_y = my - box_h - 10
        pygame.draw.rect(surface, (20, 20, 20), (box_x, box_y, box_w, box_h))
        pygame.draw.rect(surface, COLOR_ACCENT, (box_x, box_y, box_w, box_h), 1)
        surface.blit(label, (box_x + 10, box_y + 5))


def main():
    pygame.init()
    pygame.font.init()
    
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Sonic Wikipedia - Python Control Center")
    clock = pygame.time.Clock()

    font_ui = pygame.font.SysFont("Courier New", 14, bold=True)
    font_small = pygame.font.SysFont("Arial", 11) # Kleiner Font für Erklärungen
    font_title = pygame.font.SysFont("Arial", 20, bold=True)

    sliders = []
    base_x = (WIDTH - 600) // 2 + 20
    base_y = HEIGHT - 85 # Angepasste Y-Position
    spacing = 145
    
    # Sliders mit Erklärtexten
    sliders.append(Slider(base_x, base_y, 120, 20, "Balance", 
                          "Audio: Mensch vs Bot|Visual: Größe", 
                          "balance", -1.0, 1.0))
                          
    sliders.append(Slider(base_x + spacing, base_y, 120, 20, "Harmony", 
                          "Audio: Frei vs Skala|Visual: Grid-Sichtbarkeit", 
                          "harmony", 0.0, 1.0))
                          
    sliders.append(Slider(base_x + spacing*2, base_y, 120, 20, "Timbre", 
                          "Audio: Dumpf vs Hell|Visual: Leuchtkraft", 
                          "timbre", 0.0, 1.0))
                          
    sliders.append(Slider(base_x + spacing*3, base_y, 120, 20, "Space", 
                          "Audio: Hall/Reverb|Visual: Schweif-Länge", 
                          "reverb", 0.0, 0.9))

    for s in sliders:
        sc_client.send_message("/wiki/control", [s.param_key, params[s.param_key]])

    disp = dispatcher.Dispatcher()
    disp.map(OSC_ADDRESS, wiki_edit_handler)
    server = osc_server.ThreadingOSCUDPServer((OSC_IP, OSC_PORT_LISTEN), disp)
    
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    print(f"Visualizer läuft. Empfange auf {OSC_PORT_LISTEN}, Sende an {OSC_PORT_SEND}...")

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            for slider in sliders:
                slider.handle_event(event)

        screen.fill((0, 0, 0))
        draw_grid(screen, params["harmony"])
        
        mx, my = pygame.mouse.get_pos()
        hovered_p = None
        
        with lock:
            for i in range(len(particles) - 1, -1, -1):
                p = particles[i]
                p.update()
                if p.z <= 0:
                    particles.pop(i)
                else:
                    p.draw(screen)
                    dist = math.hypot(mx - p.screen_x, my - p.screen_y)
                    if dist < (p.screen_radius + 5):
                        hovered_p = p

        draw_ui(screen, font_ui, font_small, font_title, sliders, hovered_p)

        pygame.display.flip()
        clock.tick(FPS)

    server.shutdown()
    pygame.quit()

if __name__ == "__main__":
    main()