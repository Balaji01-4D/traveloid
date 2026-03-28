package models

type Organisation struct {
	ID       int64  `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string `gorm:"type:varchar(100);not null" json:"name"`
	Email    string `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`

	Members []Member `gorm:"foreignKey:OrganisationID"`
	Places  []Place  `gorm:"foreignKey:OrganisationID"`
}
