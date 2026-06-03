#!/usr/bin/env bash
# backup.sh - Shell script wrapper cho rclone (không cần Go)
set -euo pipefail

# Load .env
ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
else
    echo "Cảnh báo: không tìm thấy $ENV_FILE" >&2
fi

# ---- Giá trị mặc định ----
RCLONE_BIN="${RCLONE_BINARY:-./rclone_bin}"
MODE="${BACKUP_MODE:-sync}"
TRANSFERS="${BACKUP_TRANSFERS:-4}"
CHECKERS="${BACKUP_CHECKERS:-8}"
LEVEL="${LOG_LEVEL:-INFO}"
LOG="${LOG_FILE:-./backup.log}"
NOTIFY_OK="${NOTIFY_ON_SUCCESS:-true}"
NOTIFY_ERR="${NOTIFY_ON_ERROR:-true}"

# ---- Kiểm tra bắt buộc ----
if [[ -z "${BACKUP_SOURCE:-}" ]]; then
    echo "Lỗi: BACKUP_SOURCE chưa được đặt trong $ENV_FILE" >&2
    exit 1
fi
if [[ -z "${BACKUP_REMOTE:-}" ]]; then
    echo "Lỗi: BACKUP_REMOTE chưa được đặt trong $ENV_FILE" >&2
    exit 1
fi
if [[ ! -f "$RCLONE_BIN" && ! $(command -v "$RCLONE_BIN" 2>/dev/null) ]]; then
    echo "Lỗi: rclone binary không tìm thấy tại $RCLONE_BIN" >&2
    echo "→ Chạy 'make build' để build từ source" >&2
    exit 1
fi

DEST="${BACKUP_REMOTE}:${BACKUP_DEST_PATH:-backup}"
CMD="${1:-help}"

# ---- Hàm chạy rclone ----
rclone_run() {
    local extra_args=()
    [[ -n "${RCLONE_CONFIG:-}" ]] && extra_args+=("--config" "$RCLONE_CONFIG")
    extra_args+=(
        "--log-level" "$LEVEL"
        "--log-file"  "$LOG"
        "--transfers" "$TRANSFERS"
        "--checkers"  "$CHECKERS"
        "--progress"
    )
    "$RCLONE_BIN" "${extra_args[@]}" "$@"
}

ts() { date "+%Y-%m-%d %H:%M:%S"; }

# ---- Xử lý lệnh ----
case "$CMD" in
    run)
        echo "[$(ts)] Dump database trước khi backup..."
        DB_SCRIPT="$(dirname "$BACKUP_SOURCE")/lms/database/db-backup.sh"
        # Thử đường dẫn tương đối từ BACKUP_SOURCE
        if [[ -f "$BACKUP_SOURCE/database/db-backup.sh" ]]; then
            if bash "$BACKUP_SOURCE/database/db-backup.sh"; then
                echo "[$(ts)] Database dump OK"
            else
                [[ "$NOTIFY_ERR" == "true" ]] && echo "[$(ts)] CẢNH BÁO: database dump có lỗi, tiếp tục backup file..." >&2
            fi
        else
            echo "[$(ts)] Không tìm thấy db-backup.sh, bỏ qua dump" >&2
        fi

        echo "[$(ts)] Bắt đầu backup: $BACKUP_SOURCE → $DEST"
        if rclone_run "$MODE" "$BACKUP_SOURCE" "$DEST" ${BACKUP_FLAGS:-}; then
            [[ "$NOTIFY_OK" == "true" ]] && echo "[$(ts)] BACKUP OK: $BACKUP_SOURCE → $DEST"
        else
            [[ "$NOTIFY_ERR" == "true" ]] && echo "[$(ts)] BACKUP THẤT BẠI!" >&2
            exit 1
        fi
        ;;
    check)
        echo "[$(ts)] Kiểm tra (dry-run): $BACKUP_SOURCE → $DEST"
        rclone_run "$MODE" "$BACKUP_SOURCE" "$DEST" --dry-run ${BACKUP_FLAGS:-}
        ;;
    verify)
        echo "[$(ts)] So sánh: $BACKUP_SOURCE ↔ $DEST"
        rclone_run check "$BACKUP_SOURCE" "$DEST"
        ;;
    config)
        echo "=== Cấu hình Backup ==="
        echo "  rclone binary : $RCLONE_BIN"
        echo "  nguồn         : $BACKUP_SOURCE"
        echo "  remote        : $BACKUP_REMOTE"
        echo "  đích          : $DEST"
        echo "  chế độ        : $MODE"
        echo "  transfers     : $TRANSFERS"
        echo "  checkers      : $CHECKERS"
        echo "  log file      : $LOG"
        echo "  log level     : $LEVEL"
        ;;
    version)
        "$RCLONE_BIN" version
        ;;
    setup-remote)
        "$RCLONE_BIN" config
        ;;
    *)
        echo "Cách dùng: $0 <lệnh>"
        echo ""
        echo "Lệnh:"
        echo "  run           Chạy backup thật sự"
        echo "  check         Dry-run: xem trước thay đổi"
        echo "  verify        So sánh nguồn ↔ đích"
        echo "  config        Hiển thị cấu hình từ .env"
        echo "  setup-remote  Cấu hình remote mới (rclone config)"
        echo "  version       Phiên bản rclone"
        echo ""
        echo "Biến môi trường:"
        echo "  ENV_FILE=path/to/.env  (mặc định: .env)"
        exit 1
        ;;
esac
