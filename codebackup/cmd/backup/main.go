package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const version = "1.0.0"

type Config struct {
	RcloneBinary string
	RcloneConfig string

	BackupSource   string
	BackupRemote   string
	BackupDestPath string
	BackupMode     string
	BackupFlags    string
	Transfers      string
	Checkers       string

	LogFile  string
	LogLevel string

	NotifyOnSuccess bool
	NotifyOnError   bool
}

func loadDotEnv(path string) error {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Bỏ inline comment
		if idx := strings.Index(val, " #"); idx >= 0 {
			val = strings.TrimSpace(val[:idx])
		}
		// Bỏ dấu ngoặc kép/đơn
		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') ||
				(val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}

		// Chỉ set nếu chưa có (biến môi trường hệ thống được ưu tiên)
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
	return scanner.Err()
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func loadConfig() Config {
	return Config{
		RcloneBinary:    getenv("RCLONE_BINARY", "./rclone_bin"),
		RcloneConfig:    getenv("RCLONE_CONFIG", ""),
		BackupSource:    getenv("BACKUP_SOURCE", ""),
		BackupRemote:    getenv("BACKUP_REMOTE", ""),
		BackupDestPath:  getenv("BACKUP_DEST_PATH", "backup"),
		BackupMode:      getenv("BACKUP_MODE", "sync"),
		BackupFlags:     getenv("BACKUP_FLAGS", ""),
		Transfers:       getenv("BACKUP_TRANSFERS", "4"),
		Checkers:        getenv("BACKUP_CHECKERS", "8"),
		LogFile:         getenv("LOG_FILE", "backup.log"),
		LogLevel:        getenv("LOG_LEVEL", "INFO"),
		NotifyOnSuccess: getenv("NOTIFY_ON_SUCCESS", "true") == "true",
		NotifyOnError:   getenv("NOTIFY_ON_ERROR", "true") == "true",
	}
}

func setupLogger(logFile string) (*os.File, error) {
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, err
	}
	log.SetOutput(f)
	log.SetFlags(log.Ldate | log.Ltime)
	return f, nil
}

func resolveBinary(path string) (string, error) {
	if !filepath.IsAbs(path) {
		wd, err := os.Getwd()
		if err != nil {
			return "", err
		}
		path = filepath.Join(wd, path)
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", fmt.Errorf("rclone binary không tìm thấy tại %s\n→ Chạy 'make build' để build từ source", path)
	}
	return path, nil
}

func execRclone(cfg Config, args []string) error {
	binary, err := resolveBinary(cfg.RcloneBinary)
	if err != nil {
		return err
	}

	final := []string{}
	if cfg.RcloneConfig != "" {
		final = append(final, "--config", cfg.RcloneConfig)
	}
	final = append(final, "--log-level", cfg.LogLevel)
	if cfg.LogFile != "" {
		final = append(final, "--log-file", cfg.LogFile)
	}
	final = append(final, args...)

	cmd := exec.Command(binary, final...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	return cmd.Run()
}

func validate(cfg Config) error {
	if cfg.BackupSource == "" {
		return fmt.Errorf("BACKUP_SOURCE chưa được đặt trong .env")
	}
	if cfg.BackupRemote == "" {
		return fmt.Errorf("BACKUP_REMOTE chưa được đặt trong .env")
	}
	if _, err := os.Stat(cfg.BackupSource); os.IsNotExist(err) {
		return fmt.Errorf("BACKUP_SOURCE không tồn tại: %s", cfg.BackupSource)
	}
	return nil
}

func cmdRun(cfg Config, dryRun bool) error {
	if err := validate(cfg); err != nil {
		return err
	}

	dest := fmt.Sprintf("%s:%s", cfg.BackupRemote, cfg.BackupDestPath)
	args := []string{
		cfg.BackupMode,
		cfg.BackupSource,
		dest,
		"--progress",
		"--transfers", cfg.Transfers,
		"--checkers", cfg.Checkers,
	}
	if dryRun {
		args = append(args, "--dry-run")
	}
	if cfg.BackupFlags != "" {
		args = append(args, strings.Fields(cfg.BackupFlags)...)
	}

	label := "Backup"
	if dryRun {
		label = "Kiểm tra (dry-run)"
	}

	fmt.Printf("[%s] %s: %s → %s\n",
		time.Now().Format("2006-01-02 15:04:05"), label, cfg.BackupSource, dest)
	log.Printf("Bắt đầu %s: %s → %s (mode=%s)", label, cfg.BackupSource, dest, cfg.BackupMode)

	start := time.Now()
	err := execRclone(cfg, args)
	elapsed := time.Since(start).Round(time.Second)

	if err != nil {
		log.Printf("THẤT BẠI sau %s: %v", elapsed, err)
		if cfg.NotifyOnError {
			fmt.Fprintf(os.Stderr, "\n[BACKUP THẤT BẠI] Thời gian: %s | Lỗi: %v\n", elapsed, err)
		}
		return err
	}

	log.Printf("Hoàn thành trong %s", elapsed)
	if cfg.NotifyOnSuccess && !dryRun {
		fmt.Printf("\n[BACKUP OK] %s → %s | Thời gian: %s\n", cfg.BackupSource, dest, elapsed)
	}
	return nil
}

func cmdCheck(cfg Config) error {
	if err := validate(cfg); err != nil {
		return err
	}
	dest := fmt.Sprintf("%s:%s", cfg.BackupRemote, cfg.BackupDestPath)
	fmt.Printf("So sánh: %s ↔ %s\n", cfg.BackupSource, dest)
	return execRclone(cfg, []string{"check", cfg.BackupSource, dest, "--progress"})
}

func cmdConfig(cfg Config) {
	fmt.Println("=== Cấu hình Backup ===")
	fmt.Printf("  rclone binary : %s\n", cfg.RcloneBinary)
	fmt.Printf("  config file   : %s\n", func() string {
		if cfg.RcloneConfig == "" {
			return "(mặc định hệ thống)"
		}
		return cfg.RcloneConfig
	}())
	fmt.Printf("  nguồn         : %s\n", cfg.BackupSource)
	fmt.Printf("  remote        : %s\n", cfg.BackupRemote)
	fmt.Printf("  đích          : %s:%s\n", cfg.BackupRemote, cfg.BackupDestPath)
	fmt.Printf("  chế độ        : %s\n", cfg.BackupMode)
	fmt.Printf("  transfers     : %s\n", cfg.Transfers)
	fmt.Printf("  checkers      : %s\n", cfg.Checkers)
	fmt.Printf("  flags thêm    : %s\n", cfg.BackupFlags)
	fmt.Printf("  log file      : %s\n", cfg.LogFile)
	fmt.Printf("  log level     : %s\n", cfg.LogLevel)
	fmt.Printf("  thông báo OK  : %v\n", cfg.NotifyOnSuccess)
	fmt.Printf("  thông báo lỗi : %v\n", cfg.NotifyOnError)
}

func usage() {
	fmt.Fprintf(os.Stderr, `Backup Tool v%s - Wrapper cho rclone

Cách dùng:
  backup [--env FILE] <lệnh>

Lệnh:
  run      Chạy backup thật sự
  check    Dry-run: xem sẽ thay đổi gì, không thực sự upload
  verify   So sánh nguồn ↔ đích (kiểm tra tính toàn vẹn)
  config   Hiển thị cấu hình từ .env
  version  Hiển thị phiên bản rclone

Tuỳ chọn:
  --env FILE    Đường dẫn tới file .env (mặc định: .env)

Ví dụ:
  backup run               Chạy backup
  backup check             Xem trước thay đổi
  backup --env prod.env run
`, version)
}

func main() {
	envFile := flag.String("env", ".env", "Đường dẫn tới file .env")
	flag.Usage = usage
	flag.Parse()

	if err := loadDotEnv(*envFile); err != nil {
		fmt.Fprintf(os.Stderr, "Lỗi đọc %s: %v\n", *envFile, err)
		os.Exit(1)
	}

	cfg := loadConfig()

	if cfg.LogFile != "" {
		if f, err := setupLogger(cfg.LogFile); err == nil {
			defer f.Close()
		}
	}

	command := flag.Arg(0)
	if command == "" {
		usage()
		os.Exit(1)
	}

	var err error
	switch command {
	case "run":
		err = cmdRun(cfg, false)
	case "check":
		err = cmdRun(cfg, true)
	case "verify":
		err = cmdCheck(cfg)
	case "config":
		cmdConfig(cfg)
	case "version":
		err = execRclone(cfg, []string{"version"})
	default:
		fmt.Fprintf(os.Stderr, "Lệnh không hợp lệ: %q\n\n", command)
		usage()
		os.Exit(1)
	}

	if err != nil {
		os.Exit(1)
	}
}
