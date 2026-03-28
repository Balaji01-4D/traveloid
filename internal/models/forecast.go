package models

import "time"

type Forecast struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	PlaceID   int64     `gorm:"not null;index" json:"place_id"`
	Timestamp time.Time `gorm:"not null;index" json:"timestamp"`
	Count     int       `gorm:"not null" json:"count"`

	UpperBound int       `gorm:"not null" json:"upper_bound"`
	LowerBound int       `gorm:"not null" json:"lower_bound"`

	Place Place `gorm:"foreignKey:PlaceID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}