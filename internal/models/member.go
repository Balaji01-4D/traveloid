package models

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
)

type Member struct {
	ID       int64  `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string `gorm:"type:varchar(100);not null" json:"name"`
	Email    string `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	Role     Role   `gorm:"type:role_enum;default:'member'" json:"role"`

	OrganisationID int64        `gorm:"not null;index" json:"organisation_id"`
	Organisation   Organisation `gorm:"foreignKey:OrganisationID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}
