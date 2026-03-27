package user

import (
	"go-auth-template/internal/models"

	"gorm.io/gorm"
)

type Repository struct {
	DB *gorm.DB
}


func NewRepository(db *gorm.DB) *Repository {
	return &Repository{DB: db}
}


func (r *Repository) CreateUser(user *models.User) error {
	return r.DB.Create(user).Error
}

func (r *Repository) GetUserByID(id int64) (*models.User, error) {
	var user models.User
	if err := r.DB.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) UpdateUser(user *models.User) error {
	return r.DB.Save(user).Error
}

func (r *Repository) DeleteUser(id int64) error {
	return r.DB.Delete(&models.User{}, id).Error
}

