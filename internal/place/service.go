package place

import (
	"go-auth-template/internal/models"
	"time"
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

func (s *Service) GetCrowdData(orgID int64, placeID int64, start time.Time, end time.Time, interval string) ([]CrowdDataPoint, error) {
	_, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, err
	}

	data, err := s.repository.GetCrowdData(placeID, start, end, interval)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (s *Service) GetCrowdHeatmap(orgID int64, placeID int64, start time.Time, end time.Time) ([]CrowdHeatmapRow, error) {
	_, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, err
	}

	data, err := s.repository.GetCrowdHeatmap(placeID, start, end)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (s *Service) GetCrowdPeaks(orgID int64, placeID int64, start time.Time, end time.Time) (*CrowdPeaks, error) {
	_, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, err
	}

	busiestHour, err := s.repository.GetBusiestHour(placeID, start, end)
	if err != nil {
		return nil, err
	}

	leastCrowdedTime, err := s.repository.GetLeastCrowdedTime(placeID, start, end)
	if err != nil {
		return nil, err
	}

	return &CrowdPeaks{
		BusiestHour:      busiestHour,
		LeastCrowdedTime: leastCrowdedTime,
	}, nil
}

func (s *Service) GetForecast(orgID int64, placeID int64, start time.Time, end time.Time) ([]ForecastPoint, error) {
	_, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, err
	}

	data, err := s.repository.GetForecast(placeID, start, end)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (s *Service) GetForecastAlerts(orgID int64, placeID int64, start time.Time, end time.Time) ([]ForecastAlert, error) {
	place, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, err
	}

	alerts, err := s.repository.GetForecastOverloads(placeID, start, end, place.Capacity)
	if err != nil {
		return nil, err
	}

	return alerts, nil
}

func (s *Service) GetTimeSeries(orgID int64, placeID int64, start time.Time, end time.Time, interval string) ([]TimeSeriesPoint, error) {
	_, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, err
	}

	series, err := s.repository.GetTimeSeries(placeID, start, end, interval)
	if err != nil {
		return nil, err
	}

	return series, nil
}

func (s *Service) GetCurrentState(orgID int64, placeID int64, now time.Time) (*CurrentActual, []CurrentPrediction, int64, error) {
	place, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return nil, nil, 0, err
	}

	latestActualPoint, err := s.repository.GetLatestActual(placeID, now)
	if err != nil {
		return nil, nil, 0, err
	}

	nextForecast, err := s.repository.GetNextForecast(placeID, now, 2)
	if err != nil {
		return nil, nil, 0, err
	}

	var latestActual *CurrentActual
	if latestActualPoint != nil {
		latestActual = &CurrentActual{
			Timestamp: latestActualPoint.Timestamp,
			Count:     latestActualPoint.Count,
		}
		if place.Capacity > 0 {
			latestActual.PercentCapacity = float64(latestActualPoint.Count) / float64(place.Capacity) * 100
		}
	}

	predictions := make([]CurrentPrediction, 0, len(nextForecast))
	for _, f := range nextForecast {
		prediction := CurrentPrediction{
			Timestamp:  f.Timestamp,
			Predicted:  f.Count,
			UpperBound: f.UpperBound,
			LowerBound: f.LowerBound,
		}
		if place.Capacity > 0 {
			prediction.PercentCapacity = float64(f.Count) / float64(place.Capacity) * 100
		}
		predictions = append(predictions, prediction)
	}

	return latestActual, predictions, place.Capacity, nil
}
