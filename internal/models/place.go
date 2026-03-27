package models

type Place struct {
	ID        int64   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string  `gorm:"type:varchar(100);not null" json:"name"`
	Latitude  float64 `gorm:"type:decimal(10,8);not null" json:"latitude"`
	Longitude float64 `gorm:"type:decimal(11,8);not null" json:"longitude"`
	CreatedBy int64   `gorm:"not null;index" json:"created_by"`

	User      User    `gorm:"foreignKey:CreatedBy;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}
