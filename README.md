# BEATCUT STUDIO — AI MUSIC BEAT DETECTOR

Ứng dụng Desktop Windows chuyên nghiệp dành cho biên tập viên âm thanh và dựng video (CapCut, DaVinci Resolve, Premiere Pro), tự động phân tích nhịp nhạc (Beat Detection) bằng trí tuệ nhân tạo (Librosa/NumPy/SciPy), hiển thị dạng sóng (Waveform) & dòng thời gian (Timeline), hỗ trợ thanh trượt điều chỉnh mật độ tách nhịp (Beat Density) tức thì, quản lý marker và xuất dữ liệu timestamp (JSON, CSV, TXT).

---

## 🌟 Tính năng nổi bật

1. **Phân tích nhịp thực tế bằng Librosa AI**:
   - Ước tính BPM chính xác.
   - Tính toán phong bì nhịp (Onset Strength Envelope).
   - Tự động phân loại **Nhịp mạnh (Strong Beat / Downbeat)** và **Nhịp chuẩn (Regular Beat)**.
   - Trích xuất dữ liệu đỉnh sóng âm thanh (Waveform peaks) tối ưu cho Canvas.
   - Tuyệt đối không dùng dữ liệu ngẫu nhiên hay nhịp giả.

2. **Thanh điều khiển mật độ tách nhịp (Beat Density Slider)**:
   - Dải giá trị từ `0` đến `100` (Low -> Medium -> High).
   - **Low**: Chỉ giữ các phách mạnh nhất / điểm nhấn lớn (thích hợp chuyển cảnh video nhanh).
   - **Medium**: Cân bằng giữa mật độ và khả năng quan sát nhịp.
   - **High**: Hiển thị trọn vẹn toàn bộ các nhịp và phách đã phát hiện.
   - Lọc động theo thời gian thực (0ms), không cần phân tích lại tệp âm thanh.

3. **Giao diện Timeline & Waveform chuẩn Studio**:
   - Nền Dark Mode chuyên nghiệp, tối ưu độ tương phản.
   - Dạng sóng mượt mà vẽ bằng Canvas HTML5 hiệu năng cao (chạy nhẹ nhàng trên Core i3, RAM 12GB, GPU tích hợp).
   - Thước đo thời gian (Time ruler) chia vạch giây và phút trực quan.
   - Thanh Playhead laser trắng đồng bộ chính xác với audio player.
   - Phóng to/Thu nhỏ (Zoom In/Out từ 1.0x đến 8.0x), cuộn mượt mà.

4. **Trình phát nhạc Audio Player tích hợp**:
   - Phát (Play), Tạm dừng (Pause), Dừng hẳn (Stop).
   - Tua trực tiếp bằng cách click vào timeline hoặc waveform.
   - Nhảy nhanh đến marker trước / sau.
   - Điều chỉnh âm lượng, tắt tiếng, thay đổi tốc độ phát (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x).
   - Phím tắt: Phím cách (Space) để Play/Pause.

5. **Quản lý Marker chuyên sâu**:
   - Thêm marker thủ công tại vị trí playhead bất kỳ (phím tắt `M`).
   - Xóa marker đã chọn (phím `Delete`), xóa toàn bộ.
   - Phân loại marker: Nhịp chuẩn, Nhịp mạnh, Chuyển đoạn (Transition), Thủ công (Custom).
   - Đặt tên/ghi chú nhãn cho từng marker.

6. **Xuất dữ liệu linh hoạt (Export)**:
   - **JSON**: Đầy đủ metadata, BPM, thời lượng, danh sách marker với độ mạnh và phân loại.
   - **CSV**: Dễ dàng nhập vào Excel hoặc bảng tính.
   - **TXT**: Định dạng marker tiêu chuẩn cho phần mềm dựng phim.

7. **Quản lý dự án (Project Management)**:
   - Lưu dự án dưới định dạng `.beatcut` (JSON).
   - Mở lại dự án để tiếp tục làm việc mà không mất dữ liệu marker đã tạo.

---

## 🛠️ Kiến trúc công nghệ

```
BEATCUT STUDIO/
├── electron/
│   ├── main.ts         # Main process, IPC handlers, protocol local-audio, tiến trình con Python
│   └── preload.ts      # contextBridge an toàn (không cấp quyền Node trực tiếp cho renderer)
├── src/
│   ├── components/     # TopBar, Sidebar, WaveformTimeline, BottomPlayer, Modals...
│   ├── hooks/          # useAudioPlayer (Web Audio API & HTML5 Audio sync loop)
│   ├── types/          # TypeScript interfaces
│   ├── utils/          # formatTime, export formats
│   ├── App.tsx         # Quản lý state toàn ứng dụng
│   ├── main.tsx        # React Root
│   └── index.css       # Tailwind CSS & Studio styling
├── python/
│   ├── beat_detector.py # Librosa Onset & Beat tracking engine
│   └── requirements.txt
├── python_runtime/     # Python 3.11 tích hợp sẵn, độc lập môi trường
├── package.json
└── vite.config.ts
```

---

## 🚀 Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Cài đặt thư viện Node.js
```bash
npm install
```

### 2. Môi trường Python Audio Engine
Dự án đã tích hợp sẵn runtime Python 3.11 độc lập trong thư mục `python_runtime/` cùng đầy đủ các thư viện:
- `librosa` (v0.11.0)
- `numpy` (v1.26.4)
- `scipy` (v1.17.1)
- `soundfile` (v0.14.0)

Nếu muốn cài đặt cho môi trường Python hệ thống của bạn:
```bash
pip install -r python/requirements.txt
```

### 3. Chạy ở chế độ phát triển (Development)
```bash
npm run dev
```

### 4. Build ứng dụng Desktop Windows
```bash
npm run build
```

Sau khi build, thư mục `dist/` và `dist-electron/` sẽ được tạo ra, sẵn sàng đóng gói ứng dụng qua electron-builder.
