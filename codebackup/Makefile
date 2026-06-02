.PHONY: all build build-rclone build-backup run check verify config setup-remote install clean help

RCLONE_SRC  := rclone
RCLONE_BIN  := rclone_bin
BACKUP_BIN  := backup
ENV_FILE    := .env

# Tìm Go: ưu tiên go_sdk cục bộ, sau đó PATH
GO          := $(shell command -v $(CURDIR)/go_sdk/bin/go 2>/dev/null || command -v go 2>/dev/null || echo "")

ifeq ($(GO),)
$(error "Go chưa được cài. Chạy: bash setup.sh")
endif

# ─── BUILD ──────────────────────────────────────────────────

all: build

## Build rclone từ source + backup Go program
build: build-rclone build-backup

build-rclone:
	@echo "→ Building rclone $(shell cat $(RCLONE_SRC)/VERSION)..."
	@cd $(RCLONE_SRC) && $(GO) build -o ../$(RCLONE_BIN) .
	@echo "✓ $(RCLONE_BIN) đã build xong"

build-backup:
	@echo "→ Building backup program..."
	@cd cmd/backup && $(GO) build -o ../../$(BACKUP_BIN) .
	@echo "✓ $(BACKUP_BIN) đã build xong"

# ─── CHẠY ───────────────────────────────────────────────────

## Chạy backup thật sự
run: build
	./$(BACKUP_BIN) --env $(ENV_FILE) run

## Dry-run: xem trước thay đổi, không upload gì
check: build
	./$(BACKUP_BIN) --env $(ENV_FILE) check

## So sánh nguồn ↔ đích để kiểm tra tính toàn vẹn
verify: build
	./$(BACKUP_BIN) --env $(ENV_FILE) verify

## Hiển thị cấu hình từ .env
config: build
	./$(BACKUP_BIN) --env $(ENV_FILE) config

## Phiên bản rclone
version: build-rclone
	./$(RCLONE_BIN) version

# ─── SETUP ──────────────────────────────────────────────────

## Cấu hình remote (Google Drive / S3 / SFTP / ...)
setup-remote: build-rclone
	./$(RCLONE_BIN) config

## Liệt kê các remote đã cấu hình
list-remotes: build-rclone
	./$(RCLONE_BIN) listremotes

# ─── CÀI VÀO HỆ THỐNG ───────────────────────────────────────

## Cài rclone + backup vào /usr/local/bin
install: build
	@echo "→ Cài vào /usr/local/bin/..."
	sudo cp $(RCLONE_BIN) /usr/local/bin/rclone
	sudo cp $(BACKUP_BIN) /usr/local/bin/backup
	@echo "✓ Đã cài: rclone và backup"

# ─── TIỆN ÍCH ───────────────────────────────────────────────

## Xem log backup
log:
	@tail -f backup.log 2>/dev/null || echo "Chưa có log file"

## Dọn dẹp binary và log
clean:
	rm -f $(BACKUP_BIN) $(RCLONE_BIN)
	@echo "✓ Đã xoá binary"

clean-all: clean
	rm -f backup.log
	@echo "✓ Đã xoá log"

help:
	@echo ""
	@echo "=== Backup System - rclone wrapper ==="
	@echo ""
	@echo "BUILD:"
	@echo "  make build          Build rclone từ source + backup program"
	@echo "  make build-rclone   Chỉ build rclone"
	@echo "  make build-backup   Chỉ build backup program"
	@echo ""
	@echo "CHẠY:"
	@echo "  make run            Chạy backup thật sự"
	@echo "  make check          Dry-run (xem trước, không thay đổi)"
	@echo "  make verify         Kiểm tra tính toàn vẹn nguồn ↔ đích"
	@echo "  make config         Hiển thị cấu hình .env"
	@echo ""
	@echo "SETUP:"
	@echo "  make setup-remote   Cấu hình remote mới (interactive)"
	@echo "  make list-remotes   Liệt kê remote đã có"
	@echo "  make install        Cài vào /usr/local/bin"
	@echo ""
	@echo "TIỆN ÍCH:"
	@echo "  make log            Xem log theo thời gian thực"
	@echo "  make clean          Xoá binary"
	@echo "  make version        Phiên bản rclone"
	@echo ""
	@echo "BIẾN:"
	@echo "  ENV_FILE=prod.env make run    Dùng file .env khác"
	@echo ""
