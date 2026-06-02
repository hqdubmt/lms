#!/usr/bin/env bash
# setup.sh - Cài đặt môi trường lần đầu (tải Go nếu chưa có)
set -euo pipefail

GO_VERSION="1.25.0"
GO_ARCH="linux-amd64"
GO_URL="https://go.dev/dl/go${GO_VERSION}.${GO_ARCH}.tar.gz"
SDK_DIR="$(pwd)/go_sdk"
PROFILE_LINE="export PATH=\"$SDK_DIR/bin:\$PATH\""

log()  { echo "  $*"; }
ok()   { echo "✓ $*"; }
info() { echo "→ $*"; }
err()  { echo "✗ $*" >&2; exit 1; }

echo "=== Setup Backup System (rclone v1.75.0) ==="
echo ""

# ---- 1. Kiểm tra / cài Go ----
echo "[1/3] Kiểm tra Go..."
if command -v go &>/dev/null; then
    ok "Go đã cài: $(go version)"
    export GO_BIN="$(command -v go)"
else
    info "Go chưa được cài. Đang tải Go ${GO_VERSION} (${GO_ARCH})..."
    mkdir -p "$SDK_DIR"
    if command -v curl &>/dev/null; then
        curl -fsSL "$GO_URL" | tar -xz -C "$SDK_DIR" --strip-components=1
    elif command -v wget &>/dev/null; then
        wget -qO- "$GO_URL" | tar -xz -C "$SDK_DIR" --strip-components=1
    else
        err "Cần curl hoặc wget để tải Go. Cài thủ công: https://go.dev/dl/"
    fi
    export PATH="$SDK_DIR/bin:$PATH"
    export GO_BIN="$SDK_DIR/bin/go"
    ok "Go ${GO_VERSION} đã cài vào: $SDK_DIR"
    echo ""
    echo "  QUAN TRỌNG: Thêm dòng sau vào ~/.bashrc (hoặc ~/.zshrc):"
    echo "  $PROFILE_LINE"
    echo ""
    # Tự thêm vào .bashrc nếu chưa có
    if ! grep -qF "$SDK_DIR/bin" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# Go SDK (thêm bởi backup/setup.sh)" >> ~/.bashrc
        echo "$PROFILE_LINE" >> ~/.bashrc
        log "Đã thêm vào ~/.bashrc tự động"
    fi
fi

# ---- 2. Tạo .env nếu chưa có ----
echo ""
echo "[2/3] Kiểm tra .env..."
if [[ ! -f .env ]]; then
    cp .env .env.bak 2>/dev/null || true
    ok "Đã tạo .env — hãy chỉnh sửa trước khi build"
else
    ok ".env đã tồn tại"
fi

# ---- 3. Hướng dẫn bước tiếp theo ----
echo ""
echo "[3/3] Sẵn sàng build!"
echo ""
echo "Bước tiếp theo:"
echo "  1. Chỉnh sửa .env (đặt BACKUP_SOURCE, BACKUP_REMOTE, BACKUP_DEST_PATH)"
echo "  2. make build          ← Build rclone + backup program"
echo "  3. make setup-remote   ← Cấu hình remote (Google Drive / S3 / SFTP...)"
echo "  4. make run            ← Chạy backup lần đầu"
echo ""
echo "Hoặc dùng shell script (không cần Go):"
echo "  bash backup.sh run"
echo ""
