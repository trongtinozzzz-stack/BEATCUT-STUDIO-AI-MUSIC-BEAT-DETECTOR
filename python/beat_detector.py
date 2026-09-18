#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEATCUT STUDIO — AI Audio Beat Detector Engine
Sử dụng Librosa, NumPy và SciPy để phân tích BPM, nhịp (beats), và độ mạnh nhịp thực tế.
"""

import sys
import os
import json
import traceback

# Thiết lập UTF-8 cho stdout trên Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def send_progress(percent: int, message: str):
    """Gửi thông báo tiến trình ra stdout theo định dạng JSON line"""
    payload = {
        "type": "progress",
        "percent": percent,
        "message": message
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def send_error(error_msg: str, details: str = None):
    """Gửi thông báo lỗi ra stdout theo định dạng JSON line"""
    payload = {
        "type": "error",
        "error": error_msg,
        "details": details or ""
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def send_result(data: dict):
    """Gửi kết quả phân tích thành công"""
    payload = {
        "type": "result",
        "data": data
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def check_environment():
    """Kiểm tra môi trường Python và các thư viện cần thiết"""
    results = {
        "python_version": sys.version,
        "librosa": False,
        "numpy": False,
        "scipy": False,
        "soundfile": False,
        "ready": False
    }
    try:
        import numpy as np
        results["numpy"] = np.__version__
    except ImportError:
        pass

    try:
        import scipy
        results["scipy"] = scipy.__version__
    except ImportError:
        pass

    try:
        import soundfile as sf
        results["soundfile"] = sf.__version__
    except ImportError:
        pass

    try:
        import librosa
        results["librosa"] = librosa.__version__
    except ImportError:
        pass

    results["ready"] = bool(results["librosa"] and results["numpy"] and results["scipy"])
    print(json.dumps({"type": "env_check", "status": results}, ensure_ascii=False), flush=True)

def analyze_audio(file_path: str):
    """Phân tích nhịp và trích xuất dạng sóng từ file âm thanh"""
    if not os.path.exists(file_path):
        send_error(f"Không tìm thấy file âm thanh tại đường dẫn: {file_path}")
        return

    try:
        send_progress(10, "Đang kiểm tra thư viện phân tích âm thanh...")
        import numpy as np
        import librosa
        import soundfile as sf
    except ImportError as e:
        send_error(
            "Không thể tải thư viện phân tích âm thanh (Librosa/NumPy).",
            str(e)
        )
        return

    try:
        send_progress(20, "Đang tải và chuẩn hóa file âm thanh...")
        # Tải với sample rate tiêu chuẩn 22050Hz (tối ưu cho beat tracking và tiết kiệm RAM)
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        duration = float(librosa.get_duration(y=y, sr=sr))

        if len(y) == 0 or duration <= 0:
            send_error("File âm thanh rỗng hoặc không có tín hiệu hợp lệ.")
            return

        send_progress(45, "Đang tính toán phong bì tín hiệu nhịp (Onset Strength)...")
        # Tính toán onset strength envelope tập trung vào dải tần nhịp trống
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median, fmax=8000)

        send_progress(65, "Đang dò tìm nhịp và ước lượng BPM...")
        # Dò nhịp và ước lượng tempo với tightness ổn định
        tempo, beat_frames = librosa.beat.beat_track(
            y=y, 
            sr=sr, 
            onset_envelope=onset_env,
            tightness=100,
            trim=False
        )
        bpm = float(np.atleast_1d(tempo)[0])

        # Chuyển beat frames sang giây (timestamps)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        send_progress(80, "Đang căn chỉnh lưới nhịp và phân loại phách âm nhạc...")
        
        # Tạo danh sách beat hoàn chỉnh có cấu trúc nhạc lý (4/4 Bar Downbeats, Quarter Notes, 1/8 Subdivisions)
        beats_data = []
        for i, t in enumerate(beat_times):
            is_bar_downbeat = (i % 4 == 0) # Phách 1 của mỗi Bar 4/4
            b_time = round(float(t), 3)
            
            # Phách chính (Quarter Note)
            beats_data.append({
                "time": b_time,
                "strength": 1.0 if is_bar_downbeat else 0.75,
                "type": "strong_beat" if is_bar_downbeat else "beat",
                "source": "auto"
            })

            # Phách phụ 1/8 (Upbeat / Half-beat)
            if i < len(beat_times) - 1:
                next_t = float(beat_times[i + 1])
                half_t = round((float(t) + next_t) / 2.0, 3)
                beats_data.append({
                    "time": half_t,
                    "strength": 0.35,
                    "type": "transition",
                    "source": "auto"
                })

        send_progress(90, "Đang tạo dữ liệu dạng sóng (Waveform)...")
        # Sinh 1500 điểm waveform downsampled cho Canvas hiển thị siêu nhẹ
        num_peaks = 1500
        step = max(1, len(y) // num_peaks)
        waveform_peaks = []
        for i in range(0, len(y), step):
            chunk = y[i:i + step]
            if len(chunk) > 0:
                pos_max = float(np.max(chunk))
                neg_min = float(np.min(chunk))
                waveform_peaks.append(round(max(abs(pos_max), abs(neg_min)), 3))
            if len(waveform_peaks) >= num_peaks:
                break

        # Chuẩn hóa waveform peaks về dải 0.0 - 1.0
        max_peak = max(waveform_peaks) if waveform_peaks and max(waveform_peaks) > 0 else 1.0
        normalized_waveform = [round(p / max_peak, 3) for p in waveform_peaks]

        send_progress(100, "Phân tích hoàn tất!")

        result = {
            "bpm": round(bpm, 1),
            "duration": round(duration, 2),
            "sampleRate": sr,
            "totalBeats": len(beats_data),
            "beats": beats_data,
            "waveform": normalized_waveform,
            "audioFileName": os.path.basename(file_path),
            "filePath": file_path
        }

        send_result(result)

    except Exception as ex:
        err_type, err_value, err_traceback = sys.exc_info()
        tb_lines = traceback.format_exception(err_type, err_value, err_traceback)
        send_error(
            f"Lỗi trong quá trình phân tích âm thanh: {str(ex)}",
            "".join(tb_lines)
        )

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"type": "info", "message": "BEATCUT Audio Engine. Sử dụng: beat_detector.py analyze <file> hoặc --check-env"}, ensure_ascii=False))
        return

    cmd = sys.argv[1]
    if cmd == "--check-env" or cmd == "check":
        check_environment()
    elif cmd == "analyze" and len(sys.argv) >= 3:
        file_path = sys.argv[2]
        analyze_audio(file_path)
    else:
        # Nếu truyền trực tiếp đường dẫn file
        analyze_audio(cmd)

if __name__ == "__main__":
    main()
