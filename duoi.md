# TODO BOARD SPEC

## Luồng xử lý task

1. Bạn hoặc thầy tạo task
   →
2. Thầy duyệt và chuyển sang "Chờ bạn"
   →
3. Bạn xử lý xong và kéo sang "Hoàn thành"

---

## Kanban Todo Board

### 🟦 Mới (NEW)

Màu: Xanh dương

Hiển thị:

- Số lượng task
- Danh sách task mới tạo

Nếu rỗng:

"Chưa có todo"

---

### 🟧 Đang xử lý (IN_PROGRESS)

Màu: Cam

Hiển thị:

- Số lượng task
- Các task đang thực hiện

Nếu rỗng:

"Chưa có todo"

---

### 🟨 Chờ bạn (WAITING_STUDENT)

Màu: Vàng

Hiển thị:

- Task giáo viên đã giao
- Task cần học viên xử lý

Nếu rỗng:

"Chưa có todo"

---

### 🟩 Hoàn thành (DONE)

Màu: Xanh lá

Hiển thị:

- Task đã hoàn thành
- Tổng số task hoàn thành

Nếu rỗng:

"Chưa có todo"

---

## Card Task

Mỗi task hiển thị:

- Tiêu đề
- Mô tả ngắn
- Hạn hoàn thành
- Người giao
- Độ ưu tiên
- Trạng thái

Ví dụ:

[TOÁN]
Làm bài phân số trang 25

Hạn:
10/06/2026

Ưu tiên:
Cao

Trạng thái:
Đang xử lý

---

## Drag & Drop

NEW
 ↓
IN_PROGRESS
 ↓
WAITING_STUDENT
 ↓
DONE

Cho phép kéo thả giữa các cột.

---

## Counter

Hiển thị bên phải tiêu đề cột.

Ví dụ:

Mới                 12

Đang xử lý           5

Chờ bạn              8

Hoàn thành          25

---

## Empty State

Nếu cột không có task:

"Chưa có todo"

Canh giữa màn hình.

Màu chữ:
#BDBDBD

---

## Mobile Layout

Hiển thị theo chiều dọc:

[Mới]

Task...

[Đang xử lý]

Task...

[Chờ bạn]

Task...

[Hoàn thành]

Task...

---

## Floating Button

Góc phải dưới:

➕

Chức năng:

Tạo task mới

---

## Role

### Học viên

- Tạo task
- Xem task của mình
- Chuyển sang Hoàn thành

### Giáo viên

- Tạo task
- Duyệt task
- Giao task
- Chuyển trạng thái

---

## Status Enum

```ts
enum TodoStatus {
  NEW,
  IN_PROGRESS,
  WAITING_STUDENT,
  DONE
}
```