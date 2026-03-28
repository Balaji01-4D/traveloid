package place

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

func (r *Repository) CreatePlace(place *models.Place) error {
	return r.DB.Create(place).Error
}

func (r *Repository) GetPlaceByID(id int64) (*models.Place, error) {
	var place models.Place
	if err := r.DB.First(&place, id).Error; err != nil {
		return nil, err
	}
	return &place, nil
}

func (r *Repository) GetPlacesByUserID(userID int64) ([]models.Place, error) {
	var places []models.Place
	if err := r.DB.Where("created_by = ?", userID).Find(&places).Error; err != nil {
		return nil, err
	}
	return places, nil
}

func (r *Repository) UpdatePlace(place *models.Place) error {
	return r.DB.Save(place).Error
}

func (r *Repository) DeletePlace(id int64) error {
	return r.DB.Delete(&models.Place{}, id).Error
}
