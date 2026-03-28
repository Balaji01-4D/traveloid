package server

import (
	"fmt"
	"log/slog"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
)

func requestLogger(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		attrs := []any{
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"query", c.Request.URL.RawQuery,
			"status", status,
			"latency_ms", latency.Milliseconds(),
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		}

		if err := c.Errors.ByType(gin.ErrorTypeAny).Last(); err != nil {
			attrs = append(attrs, "error", err.Error())
		}

		switch {
		case status >= 500:
			log.Error("request failed", attrs...)
		case status >= 400:
			log.Warn("request client error", attrs...)
		default:
			log.Info("request completed", attrs...)
		}
	}
}

func recoveryWithSlog(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error("panic recovered",
					"method", c.Request.Method,
					"path", c.Request.URL.Path,
					"client_ip", c.ClientIP(),
					"panic", fmt.Sprint(rec),
					"stack", string(debug.Stack()),
				)

				c.AbortWithStatusJSON(500, gin.H{"error": "internal server error"})
			}
		}()

		c.Next()
	}
}
