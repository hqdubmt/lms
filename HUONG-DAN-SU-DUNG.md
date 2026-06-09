# MasterLMS — Hướng dẫn sử dụng toàn diện

> Phiên bản 2.0 · Cập nhật 2026-06-08  
> AI Learning Platform: Groq · Gemini · Ollama · Claude · OpenAI

---

## Mục lục

1. [Bắt đầu — Đăng ký & Đăng nhập](#1-bắt-đầu)
2. [Dashboard & Tổng quan](#2-dashboard)
3. [AI Tutor — Chat thông minh](#3-ai-tutor)
4. [Khóa học — LMS Core](#4-khóa-học)
5. [Quiz & Bài kiểm tra](#5-quiz)
6. [Môn Tiếng Anh (Language)](#6-tiếng-anh)
7. [Môn Toán (Math)](#7-toán)
8. [Môn Tiếng Việt (Viet)](#8-tiếng-việt)
9. [Phát âm & IELTS Coach](#9-phát-âm--ielts)
10. [Gamification — XP & Thành tích](#10-gamification)
11. [Leaderboard](#11-leaderboard)
12. [Learning DNA & Adaptive Learning](#12-learning-dna)
13. [Study Plan & Timeline](#13-study-plan)
14. [Marketplace — Mua bán khóa học](#14-marketplace)
15. [Forum & Thảo luận](#15-forum)
16. [Thông báo & Todo](#16-thông-báo--todo)
17. [Giảng viên (Instructor)](#17-giảng-viên)
18. [Admin Dashboard](#18-admin)
19. [App Desktop & Mobile](#19-app-desktop--mobile)
20. [Câu hỏi thường gặp](#20-câu-hỏi-thường-gặp)

---

## 1. Bắt đầu

### 1.1 Đăng ký tài khoản

1. Truy cập `http://your-server:3000`
2. Nhấn **Đăng ký** hoặc vào `/auth/register`
3. Điền thông tin:
   - **Họ tên**: Nguyễn Văn A
   - **Email**: email trường (`@ttn.edu.vn`)
   - **Mật khẩu**: ít nhất 8 ký tự
   - **Vai trò**: Học sinh / Giảng viên
4. Nhấn **Tạo tài khoản** → email xác minh sẽ được gửi
5. Kiểm tra hộp thư, nhấn link xác minh

> Nếu không nhận được email, kiểm tra spam hoặc liên hệ quản trị viên.

### 1.2 Đăng nhập

1. Vào `/auth/login`
2. Nhập email + mật khẩu
3. Tùy chọn: **Đăng nhập bằng Google** (nếu trường bật tính năng này)
4. Nhấn **Đăng nhập**

> Token JWT tự động gia hạn mỗi 15 phút. Phiên làm việc tồn tại 7 ngày.

### 1.3 Quên mật khẩu

1. Nhấn **Quên mật khẩu** tại trang đăng nhập
2. Nhập email → nhận link đặt lại
3. Nhấn link, nhập mật khẩu mới

---

## 2. Dashboard

Sau khi đăng nhập, bạn thấy **Dashboard** gồm:

| Khu vực | Nội dung |
|---|---|
| **Streak** | Số ngày học liên tiếp |
| **XP & Level** | Điểm kinh nghiệm, cấp độ, rank |
| **Khóa học đang học** | Tiến độ các khóa đã đăng ký |
| **Daily Quests** | Nhiệm vụ hàng ngày (3 nhiệm vụ, reset 00:00) |
| **AI Chat nhanh** | Hỏi AI ngay từ dashboard |
| **Timeline học tập** | Hoạt động gần đây |
| **Report Card** | Điểm tổng kết theo môn |

### Navigation menu

```
Dashboard
├── Khóa học
├── AI Tutor (Chat)
├── Môn học
│   ├── Tiếng Anh
│   ├── Toán
│   └── Tiếng Việt
├── Quiz
├── Leaderboard
├── Marketplace
├── Forum
└── Hồ sơ
```

---

## 3. AI Tutor

AI Tutor là trung tâm của MasterLMS — hệ thống multi-agent với 3 lớp:
- **Orchestrator**: điều phối câu hỏi đến đúng chuyên gia
- **Subject Agents**: Toán, Tiếng Anh, Tiếng Việt, tổng quát
- **Self-Correction Agent**: kiểm tra lại câu trả lời trước khi gửi

### 3.1 Bắt đầu chat

1. Vào **AI Tutor** từ menu
2. Chọn môn học (Toán / Tiếng Anh / Tiếng Việt / Tổng quát)
3. Chọn chế độ:
   - **Tutor**: AI giải thích, gợi ý từng bước
   - **Exercise**: AI ra bài tập
   - **Homework**: AI hỗ trợ làm bài tập về nhà
   - **Quiz**: AI ra câu hỏi kiểm tra
   - **Voice**: Học qua giọng nói
   - **Adaptive**: AI tự điều chỉnh độ khó
4. Gõ câu hỏi → nhấn Enter hoặc nút Gửi

### 3.2 Ví dụ câu hỏi hiệu quả

**Toán:**
```
"Giải phương trình x² - 5x + 6 = 0, giải thích từng bước"
"Chứng minh định lý Pythagoras bằng hình học"
"Ra cho em 3 bài tập tích phân cơ bản"
```

**Tiếng Anh:**
```
"Sửa lỗi ngữ pháp: I go to school yesterday"
"Giải thích sự khác nhau giữa Present Perfect và Past Simple"
"Dịch đoạn văn này sang Tiếng Việt và giải thích từ vựng"
```

**Tiếng Việt:**
```
"Phân tích bài thơ Đoàn thuyền đánh cá của Huy Cận"
"Viết đoạn văn nghị luận về tình yêu quê hương"
"Tìm lỗi chính tả trong đoạn văn sau..."
```

### 3.3 AI Providers

Hệ thống tự động chọn AI tốt nhất:
1. **Groq** (llama-3.3-70b) — nhanh nhất, ưu tiên đầu tiên
2. **Gemini Flash 2.0** — dự phòng
3. **Ollama** (qwen2.5:7b) — chạy local, không cần internet

### 3.4 Writing Coach

Kiểm tra và cải thiện bài viết Tiếng Anh:
1. Vào **AI Tutor → Writing Coach**
2. Dán đoạn văn cần kiểm tra
2. Chọn loại: Essay / Email / Paragraph / Story
3. AI trả về:
   - Điểm tổng thể (0-10)
   - Danh sách lỗi ngữ pháp + cách sửa
   - Gợi ý từ vựng
   - Nhận xét phong cách

### 3.5 IELTS Coach

Luyện thi IELTS chuyên biệt:
- **Writing Task 1**: Mô tả biểu đồ, bảng số liệu
- **Writing Task 2**: Viết luận, trình bày quan điểm
- **Speaking**: Luyện nói theo topic
- AI chấm điểm theo tiêu chí IELTS (Task Achievement, Coherence, Vocabulary, Grammar)

---

## 4. Khóa học

### 4.1 Tìm và đăng ký khóa học

1. Vào **Khóa học** từ menu
2. Lọc theo: Môn học / Cấp độ / Miễn phí
3. Nhấn vào khóa học để xem chi tiết
4. Nhấn **Đăng ký học** (miễn phí hoặc mua qua Marketplace)

### 4.2 Xem bài học

1. Vào **Khóa học đang học → Tiếp tục**
2. Giao diện học gồm:
   - **Trái**: Danh sách chương/bài
   - **Giữa**: Video hoặc nội dung bài học
   - **Phải**: AI Tutor chat cho bài học này
3. Video hỗ trợ: YouTube, HLS streaming, MP4
4. Nhấn **Đánh dấu hoàn thành** sau khi xem xong

### 4.3 Theo dõi tiến độ

- Thanh tiến độ hiển thị % hoàn thành
- Hệ thống tự lưu vị trí xem cuối
- Hoàn thành 100% → nhận **Chứng chỉ**

### 4.4 Chat với AI trong khóa học

Mỗi khóa học có AI Tutor riêng hiểu nội dung bài học:
1. Mở bài học
2. Nhấn icon Chat ở góc phải
3. Hỏi về nội dung đang học → AI trả lời dựa trên giáo trình

---

## 5. Quiz

### 5.1 Làm bài quiz

1. Vào **Quiz** từ menu
2. Chọn bộ câu hỏi → nhấn **Bắt đầu**
3. Các loại câu hỏi:
   - **Trắc nghiệm** (MULTIPLE_CHOICE): chọn 1 đáp án
   - **Đúng/Sai** (TRUE_FALSE)
   - **Điền vào chỗ trống** (FILL_BLANK)
   - **Ghép đôi** (MATCHING): kéo thả
   - **Tự luận ngắn** (ESSAY): AI chấm tự động
4. Nhấn **Nộp bài** khi xong

### 5.2 Xem kết quả

Sau khi nộp bài:
- Điểm số (0-100%)
- Từng câu: đúng/sai + giải thích
- AI tự động gợi ý ôn tập phần yếu

### 5.3 Lịch sử làm bài

Vào **Quiz → Lịch sử** để xem:
- Điểm trung bình theo môn
- Điểm cao nhất
- Biểu đồ tiến bộ theo thời gian

---

## 6. Tiếng Anh

### 6.1 Từ vựng (Vocabulary)

1. Vào **Tiếng Anh → Từ vựng**
2. Chọn bộ từ vựng theo cấp độ (A1→C2) hoặc chủ đề
3. Chế độ học:
   - **Flashcard**: lật thẻ nhớ nghĩa
   - **Đánh máy**: nghe phát âm, gõ từ
   - **Trắc nghiệm**: chọn đáp án đúng
   - **Sắp xếp câu** (Word Order): kéo từ tạo câu đúng

### 6.2 Bài tập ngữ pháp

1. Vào **Tiếng Anh → Bài tập**
2. Lọc theo: Cấp độ / Kỹ năng (Nghe/Nói/Đọc/Viết)
3. Làm bài → AI chấm ngay lập tức

### 6.3 Leaderboard Tiếng Anh

Xem thứ hạng học Tiếng Anh so với bạn bè trong tuần/tháng/toàn thời gian.

---

## 7. Toán

### 7.1 Chủ đề Toán

1. Vào **Toán** từ menu
2. Lọc theo lớp (1-12) và chủ đề:
   - Số học / Đại số / Hình học / Giải tích / Xác suất
3. Chọn chủ đề → xem lý thuyết và bài tập

### 7.2 Luyện bài tập

1. Chọn bài tập theo độ khó
2. Nhập đáp án
3. AI giải thích từng bước nếu sai
4. Hệ thống theo dõi **mastery** (% thành thạo) cho từng chủ đề

### 7.3 Profiling tự động

Sau 5-10 bài làm, hệ thống xác định:
- Điểm mạnh / điểm yếu của bạn
- Gợi ý bài tập phù hợp trình độ

---

## 8. Tiếng Việt

### 8.1 Ôn tập văn học

1. Vào **Tiếng Việt** từ menu
2. Chọn lớp (1-12) và thể loại:
   - Văn học / Ngữ pháp / Chính tả / Tập làm văn
3. Luyện tập theo chương trình SGK

### 8.2 Bài tập Tiếng Việt

- Nhận diện thể loại văn bản
- Phân tích tác phẩm văn học
- Luyện chính tả
- Viết đoạn văn (AI chấm)

---

## 9. Phát âm & IELTS

### 9.1 Luyện phát âm

1. Vào **Phát âm** từ menu
2. Chọn âm cần luyện (IPA chart với 44 âm tiếng Anh)
3. Nhấn microphone → đọc từ/câu
4. AI chấm điểm phát âm (0-100) và chỉ ra âm sai

### 9.2 Bảng IPA

Xem toàn bộ 44 âm tiếng Anh:
- **12 Nguyên âm đơn**: /iː/, /ɪ/, /e/, /æ/...
- **8 Nguyên âm đôi**: /eɪ/, /aɪ/, /ɔɪ/...
- **24 Phụ âm**: /p/, /b/, /t/, /d/...
Mỗi âm có: ký hiệu IPA + ví dụ + gợi ý phát âm bằng tiếng Việt

### 9.3 IELTS Writing Coach

**Task 1 — Mô tả biểu đồ:**
1. Vào **IELTS → Writing Task 1**
2. Nhận prompt biểu đồ/bảng số liệu
3. Viết bài mô tả (150+ từ)
4. AI chấm theo 4 tiêu chí: TA / CC / LR / GRA

**Task 2 — Viết luận:**
1. Vào **IELTS → Writing Task 2**
2. Nhận đề luận
3. Viết bài (250+ từ)
4. AI chấm + gợi ý cải thiện

---

## 10. Gamification

### 10.1 Hệ thống XP

Kiếm XP bằng cách:
| Hoạt động | XP |
|---|---|
| Chat với AI | 10 XP/tin nhắn |
| Hoàn thành quiz | 20-100 XP (theo điểm) |
| Nộp bài tập | 30 XP |
| Học liên tục (streak) | Bonus x1.5 |
| Hoàn thành khóa học | 500 XP |

### 10.2 Cấp độ & Rank

| Level | Rank | XP cần |
|---|---|---|
| 0 | Tập sự | 0 |
| 1-5 | Học sinh | 100-2000 |
| 6-15 | Học giả | 2000-15000 |
| 16-30 | Chuyên gia | 15000-60000 |
| 31+ | Bậc thầy | 60000+ |

### 10.3 Streak — Học liên tiếp

- Học mỗi ngày duy trì **Streak**
- Streak càng cao → XP bonus càng nhiều
- Reset nếu bỏ 1 ngày
- **Freeze streak**: dùng token đặc biệt để bảo vệ streak 1 ngày

### 10.4 Thành tích (Achievements)

Mở khóa huy hiệu khi đạt mốc:
- 🎯 **Khởi đầu**: Gửi tin nhắn đầu tiên cho AI
- 📝 **Làm bài đầu tiên**: Hoàn thành quiz đầu tiên
- 🔥 **Kiên trì 7 ngày**: Streak 7 ngày liên tiếp
- 🏆 **Quiz Master**: Đạt 100% quiz đầu tiên
- 🎓 **Tốt nghiệp**: Hoàn thành khóa học đầu tiên
- *(25+ thành tích khác)*

### 10.5 Daily Quests

3 nhiệm vụ mỗi ngày, reset lúc 00:00:
- Chat với AI 3 lần → +30 XP
- Làm 1 bài quiz → +20 XP
- Học 15 phút → +25 XP

---

## 11. Leaderboard

### 11.1 Xem bảng xếp hạng

1. Vào **Leaderboard** từ menu
2. Lọc theo:
   - **Thời gian**: Tuần / Tháng / Toàn thời gian
   - **Môn học**: Tất cả / Toán / Tiếng Anh / Tiếng Việt
3. Xem thứ hạng của mình được highlight

### 11.2 Cạnh tranh lành mạnh

- Chỉ hiển thị tên và avatar (không lộ email)
- Top 3 nhận huy hiệu đặc biệt mỗi tuần

---

## 12. Learning DNA

Learning DNA phân tích **phong cách học** của bạn:

| Style | Đặc điểm |
|---|---|
| **Visual** | Học tốt qua hình ảnh, biểu đồ |
| **Reading** | Học tốt qua đọc văn bản |
| **Practice** | Học tốt qua làm bài tập |
| **Mixed** | Kết hợp nhiều phong cách |

**Adaptive Learning** dựa trên Learning DNA để:
- Điều chỉnh độ khó câu hỏi
- Gợi ý loại bài tập phù hợp
- Tự động ôn lại kiến thức yếu

Xem DNA của bạn: **Hồ sơ → Learning DNA**

---

## 13. Study Plan

### 13.1 Kế hoạch học tập

AI tự động tạo kế hoạch 7-30 ngày dựa trên:
- Mục tiêu (thi đại học, IELTS, Olympic...)
- Điểm mạnh/yếu hiện tại
- Thời gian có thể học mỗi ngày

Vào **Dashboard → Study Plan** để xem.

### 13.2 Timeline học tập

Nhật ký hoạt động học tập theo ngày:
- Các buổi chat với AI
- Quiz đã làm
- Video đã xem
- Bài tập đã nộp

---

## 14. Marketplace

### 14.1 Mua khóa học

1. Vào **Marketplace** từ menu
2. Tìm kiếm theo: môn học / cấp độ / giá
3. Xem preview khóa học miễn phí
4. Nhấn **Mua ngay** → thanh toán qua VNPay
5. Khóa học tự động vào danh sách học của bạn

### 14.2 Khóa học miễn phí

Nhiều khóa học giảng viên đánh dấu **FREE** — đăng ký trực tiếp không cần thanh toán.

### 14.3 Dành cho Giảng viên

Giảng viên có thể đăng khóa học lên Marketplace:
1. Tạo khóa học hoàn chỉnh
2. Đặt giá hoặc miễn phí
3. Gửi để Admin duyệt
4. Sau khi duyệt → tự động lên Marketplace
5. Thu nhập: theo dõi tại **Instructor → Earnings**

---

## 15. Forum

### 15.1 Hỏi đáp cộng đồng

1. Vào **Forum** từ menu
2. Chọn danh mục:
   - Hỏi đáp Toán
   - Hỏi đáp Tiếng Anh
   - Thảo luận chung
3. Nhấn **Đặt câu hỏi mới**
4. Mô tả vấn đề + ảnh chụp màn hình (tùy chọn)

### 15.2 Trả lời & Like

- Nhấn **Trả lời** để giải đáp câu hỏi của bạn bè
- Like câu trả lời hay
- Đánh dấu **Đã giải quyết** khi có câu trả lời đúng

---

## 16. Thông báo & Todo

### 16.1 Thông báo

Nhận thông báo khi:
- Giảng viên đăng bài mới
- Có phản hồi trong Forum
- Hoàn thành thành tích mới
- Nhắc nhở học streak

### 16.2 Todo — Kế hoạch cá nhân

1. Vào **Todo** từ menu
2. Nhấn **+ Thêm việc cần làm**
3. Điền: Tiêu đề / Mô tả / Ngày hạn / Ưu tiên
4. Đánh dấu hoàn thành khi xong

---

## 17. Giảng viên

### 17.1 Tạo khóa học

1. Vào **Instructor Dashboard**
2. Nhấn **Tạo khóa học mới**
3. Điền thông tin:
   - Tên khóa học, mô tả, ảnh thumbnail
   - Cấp độ (Beginner / Intermediate / Advanced)
   - Ngôn ngữ, tags
4. Thêm **Chương** (Sections) → thêm **Bài học** (Lessons)
5. Upload video bài học (hỗ trợ MP4/WebM, tự động chuyển HLS)
6. Nhấn **Xuất bản**

### 17.2 AI Course Generator

Tạo khóa học tự động bằng AI:
1. Vào **Instructor → AI Generator**
2. Nhập: Môn học / Chủ đề / Lớp / Số bài
3. AI tự tạo:
   - Đề cương khóa học
   - Nội dung từng bài
   - Quiz + bài tập kèm theo
4. Chỉnh sửa nếu cần → Xuất bản

### 17.3 Quản lý học viên

- Xem danh sách học viên đã đăng ký
- Theo dõi tiến độ từng người
- Gửi thông báo cho lớp

### 17.4 Analytics Giảng viên

- Tổng học viên, doanh thu
- Tỉ lệ hoàn thành khóa học
- Điểm quiz trung bình
- Học viên hoạt động vs không hoạt động

---

## 18. Admin

> Chỉ dành cho tài khoản có role ADMIN/SUPERADMIN

### 18.1 User Management

- Xem tất cả user hệ thống
- Phân quyền: Student / Instructor / Admin
- Khoá tài khoản vi phạm

### 18.2 Course Management

- Duyệt khóa học của Giảng viên
- Ẩn/hiện khóa học
- Xem thống kê toàn hệ thống

### 18.3 Document Pipeline

Upload giáo trình để AI học:
1. Vào **Admin → Documents**
2. Upload PDF/DOCX
3. Hệ thống tự động: PDF → MarkItDown → Vector → RAG
4. AI Tutor sẽ trả lời dựa trên giáo trình này

### 18.4 AI Ecosystem Dashboard

Xem toàn bộ trạng thái hệ thống AI:
- Trạng thái từng module (LMS / AI Chat / Knowledge Graph / ...)
- Thống kê: số user, số khóa học, số lượt đăng ký
- Health check infrastructure: API / DB / Redis / MinIO

### 18.5 Analytics Toàn hệ thống

- DAU/MAU (người dùng hoạt động)
- Doanh thu theo tháng
- Môn học phổ biến nhất
- Retention rate

### 18.6 Backup & Restore

1. Vào **Admin → Backup**
2. Chọn: PostgreSQL / MongoDB / Tất cả
3. Nhấn **Tạo backup** → download file
4. Restore: upload file backup → xác nhận

### 18.7 Monitoring

Truy cập Grafana dashboard:
- URL: `http://your-server/grafana`
- Login: admin/password (xem trong `.env`)
- Dashboard: API latency, error rate, memory usage

---

## 19. App Desktop & Mobile

### 19.1 App Desktop (Windows/Mac/Linux)

**Cài đặt:**
1. Download file phù hợp:
   - Windows: `MasterLMS-Setup.exe` hoặc `.zip`
   - macOS: `MasterLMS.dmg`
   - Linux: `MasterLMS.AppImage` hoặc `.deb`
2. Cài đặt bình thường

**Lần đầu chạy:**
1. Nhập địa chỉ máy chủ: `http://192.168.1.x:3000` hoặc domain trường
2. Nhấn **Kết nối ngay**
3. App tự kiểm tra AI status và mở LMS

**Tính năng đặc biệt:**
- Chạy trong System Tray (không đóng cửa sổ = thu nhỏ)
- Phím tắt: `Ctrl+R` reload, `Ctrl+,` cài đặt, `F11` toàn màn hình
- Hỗ trợ micro/webcam tốt hơn trình duyệt

### 19.2 App Mobile (Android/iOS)

**Cài đặt Android:**
1. Download `MasterLMS.apk` từ trang trường
2. Bật "Cài đặt từ nguồn không xác định"
3. Cài đặt APK

**Lần đầu mở:**
1. Nhập địa chỉ máy chủ (cùng mạng WiFi trường)
2. Nhấn **Kết nối**
3. Đăng nhập tài khoản

**Tính năng mobile:**
- Học offline (một số tính năng)
- Nhận rung haptic feedback khi đúng/sai
- Voice Learning tối ưu cho điện thoại
- Thanh trạng thái tùy chỉnh

**Đổi máy chủ:**
Nhấn **Đổi máy chủ** ở màn hình lỗi → nhập địa chỉ mới.

---

## 20. Câu hỏi thường gặp

**Q: AI không trả lời được câu hỏi của tôi?**  
A: Thử chọn đúng môn học (Toán / Tiếng Anh / Tiếng Việt) và chế độ Tutor. AI hoạt động tốt nhất với câu hỏi cụ thể.

**Q: Streak của tôi bị reset dù tôi có học?**  
A: Streak đếm theo ngày lịch (00:00 - 23:59). Cần ít nhất 1 hoạt động (chat/quiz/bài học) mỗi ngày.

**Q: Tôi không nghe được audio/video?**  
A: Desktop app: kiểm tra cài đặt âm thanh trong hệ thống. Web: cấp quyền audio trong trình duyệt. Mobile: kiểm tra quyền microphone.

**Q: Điểm quiz không lưu?**  
A: Đảm bảo nhấn **Nộp bài** (không tắt tab giữa chừng). Kết quả lưu ngay khi nộp.

**Q: Tôi muốn xóa lịch sử chat với AI?**  
A: Vào **AI Tutor → Cài đặt → Xóa lịch sử** hoặc bắt đầu hội thoại mới.

**Q: Quên mật khẩu nhưng không nhận được email?**  
A: Kiểm tra spam. Nếu vẫn không thấy, liên hệ quản trị viên tại `admin@masterlms.vn`.

**Q: App mobile không kết nối được?**  
A: Đảm bảo điện thoại và máy chủ cùng mạng WiFi. Thử nhập IP dạng `http://192.168.1.100:3000`.

**Q: Tôi muốn trở thành giảng viên?**  
A: Đăng ký tài khoản với role Giảng viên, hoặc liên hệ Admin để nâng cấp tài khoản hiện tại.

---

## Phím tắt (Desktop App)

| Phím | Chức năng |
|---|---|
| `Ctrl + R` | Tải lại trang |
| `Ctrl + Shift + R` | Tải lại bỏ qua cache |
| `Ctrl + ,` | Mở cài đặt máy chủ |
| `Ctrl + =` | Phóng to |
| `Ctrl + -` | Thu nhỏ |
| `Ctrl + 0` | Kích thước gốc |
| `F11` | Toàn màn hình |
| `Alt + ←` | Quay lại |
| `Alt + →` | Tiến |

---

## Liên hệ hỗ trợ

- **Email**: admin@masterlms.vn  
- **Forum**: Vào Forum → Danh mục "Hỗ trợ kỹ thuật"  
- **Admin**: Liên hệ quản trị viên nhà trường  

---

*MasterLMS v2.0 — AI Learning Platform*  
*Powered by Groq · Gemini · Ollama · Claude · OpenAI*
