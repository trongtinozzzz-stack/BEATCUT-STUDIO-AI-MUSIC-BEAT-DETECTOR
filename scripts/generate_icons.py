import os
import sys
import math
from PIL import Image, ImageDraw

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def create_studio_icon():
    os.makedirs('build', exist_ok=True)
    os.makedirs('public', exist_ok=True)
    
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Background Rounded Squircle with Dark Studio Color
    radius = 110
    draw.rounded_rectangle([(16, 16), (size - 16, size - 16)], radius=radius, fill=(12, 13, 18, 255))
    
    # Glowing Border
    draw.rounded_rectangle([(16, 16), (size - 16, size - 16)], radius=radius, outline=(37, 99, 235, 180), width=8)
    draw.rounded_rectangle([(24, 24), (size - 24, size - 24)], radius=radius - 6, outline=(6, 182, 212, 100), width=4)

    # 2. Draw Sound Waveform & Beat Peaks
    center_y = size // 2
    points = [
        (80, center_y),
        (130, center_y),
        (160, center_y - 80),   # Beat 1
        (190, center_y + 110),  # Beat 2
        (225, center_y - 150),  # Strong Beat (Kick)
        (256, center_y + 180),  # Deep Bass
        (287, center_y - 130),  # Snare
        (322, center_y + 90),
        (352, center_y - 70),
        (382, center_y),
        (432, center_y)
    ]
    
    # Glow layer for waveform
    for width_offset, alpha in [(16, 30), (12, 60), (8, 120)]:
        draw.line(points, fill=(6, 182, 212, alpha), width=width_offset, joint="round")
        
    # Main Waveform Line (Cyan to Blue)
    draw.line(points, fill=(0, 240, 255, 255), width=6, joint="round")
    
    # 3. Draw Beat Markers on Peaks
    # Strong beat at center peak (Red)
    draw.ellipse([(256 - 16, center_y + 180 - 16), (256 + 16, center_y + 180 + 16)], fill=(239, 68, 68, 255), outline=(255, 255, 255, 255), width=4)
    # Peak 1 (Yellow)
    draw.ellipse([(225 - 14, center_y - 150 - 14), (225 + 14, center_y - 150 + 14)], fill=(234, 179, 8, 255), outline=(255, 255, 255, 255), width=3)
    # Peak 2 (Yellow)
    draw.ellipse([(287 - 14, center_y - 130 - 14), (287 + 14, center_y - 130 + 14)], fill=(234, 179, 8, 255), outline=(255, 255, 255, 255), width=3)
    
    # Minor beats (Purple)
    draw.ellipse([(160 - 10, center_y - 80 - 10), (160 + 10, center_y - 80 + 10)], fill=(168, 85, 247, 255), outline=(255, 255, 255, 255), width=2)
    draw.ellipse([(352 - 10, center_y - 70 - 10), (352 + 10, center_y - 70 + 10)], fill=(168, 85, 247, 255), outline=(255, 255, 255, 255), width=2)

    # 4. Save PNG outputs
    img.save('build/icon.png', 'PNG')
    img.save('public/icon.png', 'PNG')
    print("Đã tạo build/icon.png và public/icon.png thành công.")
    
    # 5. Save multi-resolution ICO outputs
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save('build/icon.ico', format='ICO', sizes=sizes)
    img.save('public/icon.ico', format='ICO', sizes=sizes)
    print("Đã tạo build/icon.ico và public/icon.ico thành công.")

if __name__ == '__main__':
    create_studio_icon()
