package logger

import (
	"log/slog"
	"os"
	"strings"
)

func New() *slog.Logger {
	level := parseLevel(os.Getenv("LOG_LEVEL"))
	format := strings.ToLower(os.Getenv("LOG_FORMAT"))

	opts := &slog.HandlerOptions{Level: level}
	if format == "json" {
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}

	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}

func parseLevel(raw string) slog.Level {
	switch strings.ToLower(raw) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
