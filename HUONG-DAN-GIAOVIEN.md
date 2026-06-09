# MasterLMS — Hướng dẫn dành cho Giảng viên

> Phiên bản 2.0 · 2026-06-09

---

## Mục lục

1. [Tài khoản Giảng viên](#1-tài-khoản-giảng-viên)
2. [Instructor Dashboard](#2-instructor-dashboard)
3. [Tạo khóa học](#3-tạo-khóa-học)
4. [Quản lý bài học & nội dung](#4-bài-học--nội-dung)
5. [AI Course Generator](#5-ai-course-generator)
6. [Quiz & Bài tập](#6-quiz--bài-tập)
7. [Quản lý học viên](#7-quản-lý-học-viên)
8. [Analytics & Báo cáo](#8-analytics--báo-cáo)
9. [Đăng khóa học lên Marketplace](#9-marketplace)
10. [Forum & Tương tác học viên](#10-forum)
11. [Upload tài liệu cho AI](#11-tài-liệu-cho-ai)
12. [Câu hỏi thường gặp](#12-faq)

---

## 1. Tài khoản Giảng viên

### Đăng ký

1. Vào địa chỉ LMS → nhấn **Đăng ký**
2. Chọn **Vai trò: Giảng viên**
3. Điền thông tin và xác minh email

> Nếu bạn đã có tài khoản Học sinh và muốn nâng lên Giảng viên, liên hệ Admin nhà trường.

### Truy cập Instructor Dashboard

Sau khi đăng nhập với tài khoản Giảng viên:
- Menu trái có thêm mục **Instructor**
- Hoặc vào trực tiếp `/instructor`

---

## 2. Instructor Dashboard

```
┌────────────────────────────────────────────────────┐
│  Tổng quan                                         │
│  📚 5 khóa học  |  👨‍🎓 128 học viên  |  💰 2.4M VNĐ  │
├────────────────────────────────────────────────────┤
│  Hoạt động gần đây        │  Khóa học              │
│  • 3 học viên mới hôm nay │  Toán 10 — 45 học viên │
│  • Quiz "Chương 3" vừa    │  IELTS Prep — 83 học   │
│    được làm 12 lần        │  Tiếng Việt 11 — miễn  │
└───────────────────────────┴────────────────────────┘
```

| Số liệu | Ý nghĩa |
|---|---|
| Tổng học viên | Tất cả học viên đã đăng ký khóa học của bạn |
| Tỉ lệ hoàn thành | % học viên hoàn thành ít nhất 1 khóa |
| Doanh thu tháng | Thu từ các khóa có phí trên Marketplace |

---

## 3. Tạo khóa học

### Bước 1 — Tạo mới

1. Vào **Instructor → Khóa học → + Tạo mới**
2. Điền thông tin cơ bản:

| Trường | Gợi ý |
|---|---|
| **Tên khóa học** | Rõ ràng, có từ khóa môn học và lớp: "Toán 10 — Đại số và Giải tích" |
| **Mô tả ngắn** | 1–2 câu tóm tắt học viên sẽ học được gì |
| **Mô tả đầy đủ** | Syllabus, yêu cầu đầu vào, đối tượng phù hợp |
| **Cấp độ** | Beginner / Intermediate / Advanced |
| **Ngôn ngữ** | Tiếng Việt / English |
| **Tags** | Toán, Đại số, Lớp 10, Thi đại học... |
| **Ảnh thumbnail** | 1280×720px, rõ nét, thể hiện nội dung |

3. Nhấn **Lưu nháp**

### Bước 2 — Thêm Chương (Section)

1. Vào tab **Nội dung** của khóa học
2. Nhấn **+ Thêm chương**
3. Đặt tên chương: "Chương 1: Hàm số và đồ thị"
4. Sắp xếp thứ tự bằng kéo thả

### Bước 3 — Thêm Bài học (Lesson)

Trong mỗi chương, nhấn **+ Thêm bài học**:

| Loại bài học | Dùng khi |
|---|---|
| **Video** | Bài giảng quay sẵn (MP4/WebM) |
| **YouTube** | Dùng video YouTube có sẵn (nhập URL) |
| **Văn bản** | Bài lý thuyết dạng text + hình ảnh |
| **Quiz** | Bài kiểm tra nhỏ cuối chương |
| **File tải về** | Tài liệu PDF, worksheet |

**Upload video:**
- Định dạng: MP4, WebM, MOV
- Hệ thống tự chuyển sang HLS (phát ổn định mọi tốc độ mạng)
- Upload tối đa 2GB/file

### Bước 4 — Xuất bản

1. Kiểm tra lại toàn bộ nội dung
2. Nhấn **Xuất bản**
3. Khóa học hiển thị ngay cho học viên

---

## 4. Bài học & Nội dung

### Soạn bài học văn bản

Trình soạn thảo hỗ trợ:
- **Markdown** hoặc rich text
- Chèn công thức toán học (LaTeX): `$x^2 + y^2 = r^2$`
- Chèn hình ảnh, bảng biểu
- Code block với highlight syntax

### Đính kèm tài liệu

Mỗi bài học có thể đính kèm:
- PDF đề cương, bài tập
- File Word, Excel
- Ảnh, sơ đồ

### Cài đặt bài học

| Tùy chọn | Mô tả |
|---|---|
| **Xem trước miễn phí** | Học viên chưa đăng ký vẫn xem được bài này |
| **Yêu cầu hoàn thành trước** | Phải xem bài X trước mới mở bài này |
| **Thời lượng ước tính** | Hiển thị cho học viên biết cần bao lâu |

---

## 5. AI Course Generator

Tạo **toàn bộ khóa học** tự động bằng AI trong vài phút:

### Cách dùng

1. Vào **Instructor → AI Generator**
2. Điền:
   - **Môn học**: Toán / Tiếng Anh / Tiếng Việt / Khác
   - **Chủ đề**: "Phương trình bậc hai"
   - **Lớp/Cấp độ**: Lớp 10 / Intermediate
   - **Số chương**: 5
   - **Số bài/chương**: 3
3. Nhấn **Tạo khóa học**
4. AI tự tạo trong 30–60 giây:
   - Đề cương đầy đủ
   - Nội dung từng bài
   - Bài tập cuối chương
   - Quiz kiểm tra

### Sau khi AI tạo xong

- **Xem lại** từng bài — AI có thể sai sót nội dung chuyên môn
- **Chỉnh sửa** những phần không chính xác
- **Thêm** video giải thích của riêng bạn
- Nhấn **Xuất bản** khi hài lòng

> AI Generator là công cụ hỗ trợ, không thay thế hoàn toàn. Luôn kiểm tra lại nội dung trước khi cho học viên học.

---

## 6. Quiz & Bài tập

### Tạo Quiz

1. Vào **Instructor → Quiz → + Tạo Quiz**
2. Đặt tên, mô tả, thời gian làm bài (phút)
3. Thêm câu hỏi:

**Trắc nghiệm (Multiple Choice):**
```
Câu hỏi: Phương trình x² - 4 = 0 có nghiệm là:
A) x = ±2  ✓ (đánh dấu đúng)
B) x = 2
C) x = -2
D) Vô nghiệm
Giải thích: x² = 4 → x = √4 = ±2
```

**Điền chỗ trống (Fill Blank):**
```
Câu hỏi: The past tense of "go" is _____
Đáp án đúng: went
```

**Ghép đôi (Matching):**
```
Cột A          Cột B
sin 30°    →   1/2
cos 60°    →   1/2
tan 45°    →   1
```

**Tự luận ngắn (Essay):** AI tự chấm và cho điểm

4. Chỉ định quiz vào **Bài học** hoặc để độc lập

### Cài đặt Quiz

| Tùy chọn | Mô tả |
|---|---|
| **Thời gian** | Giới hạn phút (để trống = không giới hạn) |
| **Số lần làm lại** | -1 = không giới hạn |
| **Xáo trộn câu hỏi** | Ngăn học viên chép nhau |
| **Hiển thị kết quả** | Ngay sau nộp / Sau deadline |
| **Điểm đạt** | % tối thiểu để qua (mặc định 60%) |

---

## 7. Quản lý học viên

### Danh sách học viên

1. Vào **Instructor → Học viên**
2. Xem danh sách với:
   - Tên, email
   - Ngày đăng ký
   - Tiến độ (%)
   - Điểm quiz trung bình
   - Hoạt động cuối (ngày)

### Theo dõi tiến độ

Nhấn vào từng học viên để xem:
- % hoàn thành từng chương
- Bài học đã xem
- Lịch sử làm quiz (điểm, ngày)
- Thời gian học tổng cộng

### Gửi thông báo cho lớp

1. Vào **Instructor → Học viên → Gửi thông báo**
2. Chọn: **Tất cả học viên** hoặc lọc theo tiến độ
3. Soạn tin nhắn
4. Nhấn **Gửi** → học viên nhận notification trong app

**Ví dụ dùng:**
- Nhắc học viên chưa học tuần này
- Thông báo tài liệu mới
- Nhắc deadline bài tập

---

## 8. Analytics & Báo cáo

### Tổng quan khóa học

Vào **Instructor → Analytics**:

| Chỉ số | Ý nghĩa |
|---|---|
| **Tổng đăng ký** | Số học viên đã đăng ký |
| **Đang học tích cực** | Học trong 7 ngày qua |
| **Tỉ lệ hoàn thành** | % hoàn thành 100% khóa |
| **Điểm quiz TB** | Trung bình tất cả quiz |
| **Học viên stuck** | Người không học >14 ngày |

### Phân tích Quiz

- Câu hỏi **dễ nhất** (% đúng cao nhất)
- Câu hỏi **khó nhất** (% đúng thấp nhất)
- Phân phối điểm (biểu đồ histogram)

### Phân tích bài học

- Bài học được **xem nhiều nhất**
- Bài học có **tỉ lệ hoàn thành thấp nhất** → cần cải thiện
- Thời điểm học viên thường học (giờ nào trong ngày)

### Export báo cáo

Nhấn **Export CSV** để tải về bảng điểm tất cả học viên.

---

## 9. Marketplace

### Đăng khóa học lên Marketplace

1. Vào khóa học đã xuất bản
2. Tab **Marketplace → Đăng bán**
3. Thiết lập giá:
   - **Miễn phí**: học viên đăng ký trực tiếp
   - **Có phí**: nhập giá (VNĐ), có thể giảm giá
4. Thêm: ảnh thumbnail hấp dẫn, trailer video (30–120 giây)
5. Nhấn **Gửi duyệt**

### Quy trình duyệt

```
Giảng viên gửi → Admin xem xét (1-3 ngày) → Duyệt → Live trên Marketplace
```

Admin có thể yêu cầu chỉnh sửa nếu:
- Nội dung chưa đầy đủ
- Mô tả không chính xác
- Thiếu thumbnail

### Doanh thu

- Vào **Instructor → Earnings** để xem:
  - Doanh thu theo tháng
  - Từng giao dịch
  - Số học viên mua mới
- Thanh toán: theo quy định nhà trường

---

## 10. Forum

### Trả lời câu hỏi học viên

1. Vào **Forum**
2. Lọc theo **Khóa học của tôi** để thấy câu hỏi liên quan
3. Nhấn vào topic → nhấn **Trả lời**
4. Câu trả lời của Giảng viên được **highlight** khác với học viên

### Tạo topic thảo luận

Tạo topic để khơi gợi thảo luận cho lớp:
1. Nhấn **+ Tạo topic mới**
2. Gán vào khóa học
3. Đặt câu hỏi mở: *"Theo các bạn, ứng dụng thực tế của tích phân trong cuộc sống là gì?"*

---

## 11. Tài liệu cho AI

Giảng viên có thể **nạp giáo trình** để AI Tutor trả lời chính xác theo chương trình của bạn.

### Upload tài liệu

> Tính năng này yêu cầu quyền Admin hoặc liên hệ Admin nhà trường.

1. Vào **Admin → Documents** (nếu có quyền)
2. Nhấn **Upload**
3. Chọn file: PDF / DOCX / TXT (tối đa 50MB)
4. Chọn **Môn học** và **Lớp** gán cho tài liệu
5. Hệ thống xử lý tự động:
   - Trích xuất văn bản
   - Tạo vector embedding
   - Đưa vào kho RAG (Retrieval-Augmented Generation)

6. Sau xử lý (~5 phút), AI Tutor sẽ trả lời **dựa trên giáo trình của trường**

### Lợi ích

- AI không "bịa" nội dung ngoài chương trình
- Câu trả lời bám sát SGK và tài liệu nhà trường
- Học viên được hỗ trợ đúng trọng tâm cần thi

---

## 12. FAQ

**Q: Học viên đăng ký khóa học của tôi như thế nào?**  
A: Học viên tìm trên Marketplace hoặc bạn chia sẻ link trực tiếp. Link khóa học: `/courses/[slug]`.

**Q: Tôi có thể xem học viên đang hỏi AI những gì không?**  
A: Không — lịch sử chat AI là riêng tư của từng học viên, giảng viên không xem được.

**Q: Khóa học đã xuất bản có chỉnh sửa được không?**  
A: Được — chỉnh sửa nội dung không ảnh hưởng đến học viên đang học. Thay đổi hiển thị ngay lập tức.

**Q: Tôi muốn ẩn khóa học tạm thời?**  
A: Vào khóa học → **Cài đặt → Ẩn khỏi danh sách**. Học viên đã đăng ký vẫn học được.

**Q: Video tải lên bị lỗi?**  
A: Kiểm tra định dạng (MP4/WebM) và kích thước (<2GB). Nếu vẫn lỗi, thử dùng YouTube URL.

**Q: Làm sao biết học viên nào cần hỗ trợ thêm?**  
A: Vào **Analytics → Học viên stuck** — danh sách người không hoạt động >14 ngày. Gửi thông báo nhắc nhở.

**Q: AI Generator tạo nội dung sai môn học của tôi?**  
A: AI dựa trên kiến thức chung. Sau khi tạo, bạn phải **kiểm tra và chỉnh sửa** nội dung chuyên ngành sâu. Upload thêm giáo trình để AI học (mục 11).

**Q: Tôi muốn cho học viên ngoài trường học?**  
A: Đăng lên Marketplace và đặt giá. Hoặc chia sẻ link khóa học trực tiếp nếu là khóa miễn phí.

---

*MasterLMS — Dạy hiệu quả hơn với AI hỗ trợ* 📚
