import sys
import numpy as np
import soundfile as sf

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def generate_test_beat_track(filename="test_beat_120bpm.wav", duration=10.0, sr=22050, bpm=120):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    y = np.zeros_like(t)
    
    beat_interval = 60.0 / bpm  # 0.5s per beat
    num_beats = int(duration / beat_interval)
    
    print(f"Tạo file audio thử nghiệm {filename} với {num_beats} nhịp tại {bpm} BPM...")
    
    for i in range(num_beats):
        beat_time = i * beat_interval
        start_idx = int(beat_time * sr)
        
        # Beat 1, 3: Kick drum (decaying sine 60Hz -> 30Hz)
        # Beat 2, 4: Snare drum (noise + decaying sine 180Hz)
        is_downbeat = (i % 4 == 0)
        is_snare = (i % 2 == 1)
        
        burst_len = int(0.18 * sr)
        if start_idx + burst_len < len(y):
            burst_t = np.linspace(0, 0.18, burst_len, endpoint=False)
            decay = np.exp(-burst_t * 25)
            
            if is_downbeat:
                # Strong Kick
                freq = np.linspace(80, 40, burst_len)
                sig = 0.9 * decay * np.sin(2 * np.pi * freq * burst_t)
            elif is_snare:
                # Snare with noise
                noise = np.random.normal(0, 0.3, burst_len)
                tone = 0.5 * np.sin(2 * np.pi * 180 * burst_t)
                sig = 0.7 * decay * (tone + noise)
            else:
                # Regular Kick
                freq = np.linspace(70, 45, burst_len)
                sig = 0.6 * decay * np.sin(2 * np.pi * freq * burst_t)
                
            y[start_idx:start_idx + burst_len] += sig
            
    # Normalize
    max_amp = np.max(np.abs(y))
    if max_amp > 0:
        y = y / max_amp * 0.9
        
    sf.write(filename, y, sr)
    print(f"Đã tạo file thành công: {filename} ({duration}s)")

if __name__ == "__main__":
    generate_test_beat_track()
