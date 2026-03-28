package forecast

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

// get last 7 days of forecasts for a place
func (r *Repository) GetForecastsByPlaceID(placeID int64) ([]models.Forecast, error) {
	var forecasts []models.Forecast
	if err := r.DB.Where("place_id = ?", placeID).Order("created_at desc").Limit(7).Find(&forecasts).Error; err != nil {
		return nil, err
	}
	return forecasts, nil		
}

func (r *Repository) 
