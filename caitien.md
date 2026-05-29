# Hệ Thống AI Giáo Dục Dùng Ollama

## Mục tiêu hệ thống

Xây dựng hệ thống AI giáo dục cho:
- Toán
- Tiếng Việt
- Tạo bài giảng
- Tạo bài tập
- Phân tích giáo trình
- Quiz tự động
- Chatbot học tập

---

# AI Chính

## Ollama

Dùng để chạy AI local offline.

### Vai trò:
- Phân tích tài liệu
- Tạo giáo án
- Tạo bài tập
- Tạo quiz
- Tạo chủ đề bài học

---

# Model Khuyên Dùng

## Qwen 2.5 7B

### Dùng cho:
- Giáo viên
- Phân tích file
- Tạo giáo án
- Tạo đề kiểm tra
- Tạo bài tập chất lượng cao

### Ưu điểm:
- Tiếng Việt khá tốt
- Toán ổn
- JSON ổn định hơn model nhỏ

---

## Qwen 1.5B hoặc 3B

### Dùng cho:
- Chat nhanh
- Học sinh hỏi đáp
- Tác vụ nhẹ

---

# Công Nghệ Theo Từng Loại File

| Loại file | Công nghệ | Mục đích |
|---|---|---|
| PDF text | PyMuPDF | Đọc PDF |
| PDF scan | PaddleOCR | OCR tiếng Việt |
| DOCX | python-docx | Đọc Word |
| PPTX | python-pptx | Đọc PowerPoint |
| JPG/PNG | PaddleOCR | OCR ảnh |
| TXT/MD | Đọc trực tiếp | Nội dung text |

---

# OCR

## PaddleOCR

Dùng cho:
- PDF scan
- Ảnh bài giảng
- Ảnh đề thi
- Chữ tiếng Việt

### Ưu điểm:
- Free
- Tiếng Việt tốt
- Mạnh hơn Tesseract

---

# Xử Lý File Chuẩn

## Không đưa nguyên file vào AI

Sai:

```txt
PDF 200 trang -> AI
```

Đúng:

```txt
PDF
-> Extract text
-> Chunk text
-> Vector DB
-> AI
```

---

# Chunking

Khuyến nghị:

```txt
500-1000 ký tự mỗi chunk
```

Mục đích:
- AI nhớ tốt hơn
- Giảm loạn nội dung
- Tăng độ chính xác

---

# Vector Database

## Chroma

Hoặc:

## FAISS

Dùng để:
- tìm nội dung liên quan
- hỗ trợ RAG
- tăng độ chính xác khi hỏi đáp

---

# Flow Hệ Thống

```txt
Upload File
      ↓
Detect loại file
      ↓
Extract text
      ↓
OCR nếu cần
      ↓
Chunk text
      ↓
Vector Database
      ↓
Qwen 7B
      ↓
Tạo:
- Chủ đề
- Giáo án
- Quiz
- Bài tập
- Đề kiểm tra
```

---

# Flow Giáo Viên - Học Sinh

```txt
Giáo viên upload bài giảng
          ↓
AI phân tích nội dung
          ↓
Tạo:
- giáo án
- chủ đề
- bài tập
- đề kiểm tra
          ↓
Lưu database
          ↓
Học sinh học và chat AI
```

---

# Prompt Khuyên Dùng

```txt
Bạn là giáo viên tiểu học.
Phân tích nội dung sau.
Tạo:
1. Chủ đề
2. Kiến thức chính
3. 10 bài tập
4. Đáp án

Chỉ trả về JSON hợp lệ.
Không markdown.
Không giải thích.
```

---

# Kiến Trúc Backend

## Backend
- Node.js
- Python

## Database
- PostgreSQL

## AI
- Ollama
- Qwen 7B

## Vector DB
- Chroma
- FAISS

---

# Cấu Hình Máy Khuyên Dùng

## Tối thiểu
- i3
- RAM 16GB
- SSD

## Tốt hơn
- i7
- RAM 16GB+
- SSD NVMe

---

# Khuyến Nghị Cuối

## Tốt nhất cho hệ thống giáo dục:

### AI chính
- Ollama
- Qwen 7B

### OCR
- PaddleOCR

### PDF
- PyMuPDF

### Vector DB
- Chroma

### Chat nhẹ
- Qwen 1.5B hoặc 3B

---

# Kết Luận

Hệ thống này có thể:
- chạy local
- free
- hỗ trợ tiếng Việt
- tạo bài giảng
- tạo bài tập
- phân tích giáo trình
- hoạt động offline

Phù hợp để xây dựng:
- website học tập
- LMS AI
- chatbot giáo dục
- hệ thống tạo đề tự động

