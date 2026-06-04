# Todo Module Specification

## Mục tiêu

Cho phép học viên và giảng viên quản lý công việc học tập.

---

## Dashboard

Hiển thị:

- Tổng số task
- Số task quá hạn
- Task hôm nay
- Task hoàn thành 7 ngày gần nhất
- Thanh tiến độ hoàn thành

---

## Card thống kê

### Tổng

Hiển thị tổng số task.

### Quá hạn

Task có dueDate < currentDate
và status != DONE

### Hôm nay

Task có dueDate = currentDate

### Done 7D

Task hoàn thành trong 7 ngày gần nhất.

---

## Tìm kiếm

Search theo:

- title
- description

Realtime search.

---

## Quy trình

STUDENT tạo task
    ↓
TEACHER duyệt
    ↓
status = WAITING_STUDENT
    ↓
STUDENT hoàn thành
    ↓
status = DONE

---

## Status

```ts
enum TodoStatus {
  PENDING,
  WAITING_TEACHER,
  WAITING_STUDENT,
  DONE,
  CANCELLED
}
```

## Database

```sql
Todo
----
id
title
description
status
priority
dueDate

createdById
assignedToId

createdAt
updatedAt
```

## API

POST /api/todos

GET /api/todos

GET /api/todos/:id

PATCH /api/todos/:id

DELETE /api/todos/:id

PATCH /api/todos/:id/status

---

## UI Mobile

### Header

Todo của tôi

### Button

+ Thêm task

### Progress

completed / total

### Stats

- Tổng
- Quá hạn
- Hôm nay
- Done 7D

### Search

Input tìm kiếm

### Todo List

Card:

- title
- deadline
- status
- priority

---

## Role

### Student

- Tạo task
- Cập nhật task của mình
- Hoàn thành task

### Teacher

- Xem tất cả task
- Duyệt task
- Chuyển trạng thái
- Xóa task

---

## Notification

Gửi thông báo khi:

- Có task mới
- Task sắp hết hạn
- Task được duyệt
- Task hoàn thành

---

## Analytics

Thống kê:

- Tổng task
- Tỷ lệ hoàn thành
- Quá hạn
- Theo tháng
- Theo lớp học
```