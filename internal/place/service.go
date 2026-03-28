package place

import (
	"go-auth-template/internal/models"
)

type Service struct {
	repository *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repository: r}
}

func (s *Service) RegisterPlace(orgID int64, placeRegistrationDTO *PlaceRegisterDTO) (*models.Place, error) {

	place := &models.Place{
		Name:           placeRegistrationDTO.Name,
		ImageLink:      placeRegistrationDTO.ImageLink,
		Capacity:       placeRegistrationDTO.Capacity,
		Latitude:       placeRegistrationDTO.Latitude,
		Longitude:      placeRegistrationDTO.Longitude,
		OrganisationID: orgID,
	}
	if err := s.repository.CreatePlace(place); err != nil {
		return nil, err
	}
	return place, nil
}

func (s *Service) GetPlace(id int64) (*models.Place, error) {
	return s.repository.GetPlaceByID(id)
}

func (s *Service) GetPlacesByOrganisationID(orgID int64) ([]models.Place, error) {
	return s.repository.GetPlacesByOrganisationID(orgID)
}

func (s *Service) UpdatePlace(place *PlaceUpdateDTO) error {
	existingPlace, err := s.repository.GetPlaceByID(place.ID)
	if err != nil {
		return err
	}

	existingPlace.Name = place.Name
	existingPlace.Capacity = place.Capacity
	existingPlace.Latitude = place.Latitude
	existingPlace.Longitude = place.Longitude

	return s.repository.UpdatePlace(existingPlace)
}

func (s *Service) DeletePlace(id int64) error {
	return s.repository.DeletePlace(id)
}
