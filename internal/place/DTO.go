package place

import "time"

type PlaceRegisterDTO struct {
	Name      string  `json:"name" binding:"required"`
	ImageLink string  `json:"image_link"`
	Capacity  int64   `json:"capacity" binding:"required"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type PlaceUpdateDTO struct {
	ID        int64   `json:"id" binding:"required"`
	Name      string  `json:"name"`
	Capacity  int64   `json:"capacity"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type PlaceDeleteDTO struct {
	ID int64 `json:"id" binding:"required"`
}

type CrowdDataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Count     float64   `json:"count"`
}

type CrowdHeatmapRow struct {
	DayOfWeek int     `json:"day_of_week"`
	Hour      int     `json:"hour"`
	AvgCount  float64 `json:"avg_count"`
}

type CrowdHourPeak struct {
	Hour     int     `json:"hour"`
	AvgCount float64 `json:"avg_count"`
}

type CrowdPeaks struct {
	BusiestHour      *CrowdHourPeak   `json:"busiest_hour"`
	LeastCrowdedTime *CrowdHeatmapRow `json:"least_crowded_time"`
}

type ForecastPoint struct {
	Timestamp  time.Time `json:"timestamp"`
	Count      int       `json:"count"`
	UpperBound int       `json:"upper_bound"`
	LowerBound int       `json:"lower_bound"`
}

type ForecastAlert struct {
	Timestamp      time.Time `json:"timestamp"`
	PredictedCount int       `json:"predicted_count"`
	UpperBound     int       `json:"upper_bound"`
	LowerBound     int       `json:"lower_bound"`
	Capacity       int64     `json:"capacity"`
	OverloadBy     int64     `json:"overload_by"`
}

type ActualPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Count     int       `json:"count"`
}

type TimeSeriesPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Actual    *int      `json:"actual"`
	Predicted *int      `json:"predicted"`
}

type CurrentActual struct {
	Timestamp       time.Time `json:"timestamp"`
	Count           int       `json:"count"`
	PercentCapacity float64   `json:"percent_capacity"`
}

type CurrentPrediction struct {
	Timestamp       time.Time `json:"timestamp"`
	Predicted       int       `json:"predicted"`
	UpperBound      int       `json:"upper_bound"`
	LowerBound      int       `json:"lower_bound"`
	PercentCapacity float64   `json:"percent_capacity"`
}
