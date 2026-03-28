package models

import "time"

type BacktestResults struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	PlaceID   int64     `gorm:"not null;index:idx_backtest_time" json:"place_id"`
	Timestamp time.Time `gorm:"not null;index:idx_backtest_time" json:"timestamp"`

	ActualCount    int `gorm:"not null" json:"actual_count"`
	PredictedCount int `gorm:"not null" json:"predicted_count"`

	Error float64 `gorm:"type:decimal(10,4)" json:"error"`

	Place Place `gorm:"foreignKey:PlaceID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}
