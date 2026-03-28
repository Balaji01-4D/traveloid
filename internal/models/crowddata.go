package models

import "time"

type PlaceCrowdData struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	PlaceID   int64     `gorm:"not null;index:idx_place_time" json:"place_id"`
	Timestamp time.Time `gorm:"not null;index:idx_place_time" json:"timestamp"`

	Count int `gorm:"not null" json:"count"`

	Temperature float64 `gorm:"type:decimal(5,2)" json:"temperature"`
	Rainfall    float64 `gorm:"type:decimal(5,2)" json:"rainfall"`
	IsHoliday   bool    `gorm:"default:false" json:"is_holiday"`

	Place Place `gorm:"foreignKey:PlaceID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}
