package place

import (
	"errors"
	"fmt"
	"go-auth-template/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (ctrl *Controller) GetCrowdData(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	startRaw := c.Query("start")
	endRaw := c.Query("end")
	interval := c.DefaultQuery("interval", "hour")

	if startRaw == "" || endRaw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start and end are required query params (RFC3339)"})
		return
	}

	if interval != "hour" && interval != "day" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interval must be one of: hour, day"})
		return
	}

	start, err := parseTime(startRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start format, expected RFC3339"})
		return
	}

	end, err := parseTime(endRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end format, expected RFC3339"})
		return
	}

	if !start.Before(end) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start must be before end"})
		return
	}

	data, err := ctrl.service.GetCrowdData(orgIDValue.(int64), placeID, start, end, interval)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id": placeID,
		"start":    start,
		"end":      end,
		"interval": interval,
		"data":     data,
	})
}

func parseTime(timeStr string) (time.Time, error) {
	timestamp, err := time.Parse(time.RFC3339, timeStr)
	if err != nil {
		return time.Time{}, err
	}

	return utils.InIST(timestamp), nil
}

func (ctrl *Controller) GetCrowdHeatmap(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	rangeRaw := c.DefaultQuery("range", "30d")
	duration, err := parseRange(rangeRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid range format, expected Nd (e.g. 30d)"})
		return
	}

	end := utils.NowIST()
	start := end.Add(-duration)

	rows, err := ctrl.service.GetCrowdHeatmap(orgIDValue.(int64), placeID, start, end)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	heatmap := make([][]*float64, 7)
	for day := 0; day < 7; day++ {
		heatmap[day] = make([]*float64, 24)
	}

	for _, row := range rows {
		if row.DayOfWeek < 0 || row.DayOfWeek > 6 || row.Hour < 0 || row.Hour > 23 {
			continue
		}
		value := row.AvgCount
		heatmap[row.DayOfWeek][row.Hour] = &value
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id": placeID,
		"range":    rangeRaw,
		"start":    start,
		"end":      end,
		"heatmap":  heatmap,
	})
}

func (ctrl *Controller) GetCrowdPeaks(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	rangeRaw := c.DefaultQuery("range", "7d")
	duration, err := parseRange(rangeRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid range format, expected Nd (e.g. 7d)"})
		return
	}

	end := utils.NowIST()
	start := end.Add(-duration)

	peaks, err := ctrl.service.GetCrowdPeaks(orgIDValue.(int64), placeID, start, end)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id":           placeID,
		"range":              rangeRaw,
		"start":              start,
		"end":                end,
		"busiest_hour":       peaks.BusiestHour,
		"least_crowded_time": peaks.LeastCrowdedTime,
	})
}

func (ctrl *Controller) GetForecast(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	now := utils.NowIST()
	start := now
	end := now.Add(7 * 24 * time.Hour)

	startRaw := strings.TrimSpace(c.Query("start"))
	endRaw := strings.TrimSpace(c.Query("end"))

	var err error
	if startRaw != "" {
		start, err = parseTime(startRaw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start format, expected RFC3339"})
			return
		}
	}

	if endRaw != "" {
		end, err = parseTime(endRaw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end format, expected RFC3339"})
			return
		}
	}

	if !start.Before(end) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start must be before end"})
		return
	}

	if start.Before(now) {
		// Accept hour-aligned client ranges that may start slightly behind current time.
		start = now
	}

	if end.Sub(start) > 7*24*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "forecast window cannot exceed 7 days"})
		return
	}

	data, err := ctrl.service.GetForecast(orgIDValue.(int64), placeID, start, end)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id": placeID,
		"start":    start,
		"end":      end,
		"forecast": data,
	})
}

func (ctrl *Controller) GetForecastNext(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	hoursRaw := strings.TrimSpace(c.DefaultQuery("hours", "24"))
	hours, err := strconv.Atoi(hoursRaw)
	if err != nil || hours <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "hours must be a positive integer"})
		return
	}

	if hours > 168 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "hours cannot exceed 168"})
		return
	}

	start := utils.NowIST()
	end := start.Add(time.Duration(hours) * time.Hour)

	data, err := ctrl.service.GetForecast(orgIDValue.(int64), placeID, start, end)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id": placeID,
		"hours":    hours,
		"start":    start,
		"end":      end,
		"forecast": data,
	})
}

func (ctrl *Controller) GetForecastAlerts(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	start := utils.NowIST()
	end := start.Add(7 * 24 * time.Hour)

	alerts, err := ctrl.service.GetForecastAlerts(orgIDValue.(int64), placeID, start, end)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id":       placeID,
		"start":          start,
		"end":            end,
		"overload_count": len(alerts),
		"alerts":         alerts,
	})
}

func (ctrl *Controller) GetTimeSeries(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	startRaw := strings.TrimSpace(c.Query("start"))
	endRaw := strings.TrimSpace(c.Query("end"))
	interval := strings.TrimSpace(strings.ToLower(c.DefaultQuery("interval", "hour")))
	if startRaw == "" || endRaw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start and end are required query params (RFC3339)"})
		return
	}

	if interval != "hour" && interval != "day" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interval must be one of: hour, day"})
		return
	}

	start, err := parseTime(startRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start format, expected RFC3339"})
		return
	}

	end, err := parseTime(endRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end format, expected RFC3339"})
		return
	}

	if !start.Before(end) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start must be before end"})
		return
	}

	data, err := ctrl.service.GetTimeSeries(orgIDValue.(int64), placeID, start, end, interval)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id":   placeID,
		"start":      start,
		"end":        end,
		"interval":   interval,
		"timeseries": data,
	})
}

func (ctrl *Controller) GetCurrent(c *gin.Context) {
	placeIDParam := c.Param("place_id")
	var placeID int64
	if _, err := fmt.Sscanf(placeIDParam, "%d", &placeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid place_id"})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	now := utils.NowIST()
	latestActual, nextPredictions, capacity, err := ctrl.service.GetCurrentState(orgIDValue.(int64), placeID, now)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"place_id":         placeID,
		"as_of":            now,
		"capacity":         capacity,
		"latest_actual":    latestActual,
		"next_predictions": nextPredictions,
	})
}

func parseRange(raw string) (time.Duration, error) {
	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" || !strings.HasSuffix(raw, "d") {
		return 0, fmt.Errorf("invalid range")
	}

	daysPart := strings.TrimSuffix(raw, "d")
	days, err := strconv.Atoi(daysPart)
	if err != nil || days <= 0 {
		return 0, fmt.Errorf("invalid range")
	}

	return time.Duration(days) * 24 * time.Hour, nil
}
