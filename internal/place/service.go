package place

import (
	"go-auth-template/internal/models"
	"math"
	"math/rand/v2"
	"sort"
	"time"

	"gorm.io/gorm"
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

	hourlyProfile, err := s.repository.GetHourlyCrowdProfile(placeID, start, end)
	if err != nil {
		return nil, err
	}

	leastCrowdedTime, err := s.repository.GetLeastCrowdedTime(placeID, start, end)
	if err != nil {
		return nil, err
	}

	if len(hourlyProfile) == 0 {
		return &CrowdPeaks{
			BusiestHour:      nil,
			LeastHour:        nil,
			TopHours:         []CrowdHourPeak{},
			HourlyProfile:    []CrowdHourPeak{},
			LeastCrowdedTime: leastCrowdedTime,
		}, nil
	}

	busiest := hourlyProfile[0]
	least := hourlyProfile[0]

	for _, point := range hourlyProfile[1:] {
		if point.AvgCount > busiest.AvgCount || (point.AvgCount == busiest.AvgCount && point.Hour < busiest.Hour) {
			busiest = point
		}
		if point.AvgCount < least.AvgCount || (point.AvgCount == least.AvgCount && point.Hour < least.Hour) {
			least = point
		}
	}

	topHours := append([]CrowdHourPeak(nil), hourlyProfile...)
	sort.Slice(topHours, func(i, j int) bool {
		if topHours[i].AvgCount == topHours[j].AvgCount {
			return topHours[i].Hour < topHours[j].Hour
		}
		return topHours[i].AvgCount > topHours[j].AvgCount
	})

	if len(topHours) > 3 {
		topHours = topHours[:3]
	}

	busiestCopy := busiest
	leastCopy := least

	return &CrowdPeaks{
		BusiestHour:      &busiestCopy,
		LeastHour:        &leastCopy,
		TopHours:         topHours,
		HourlyProfile:    hourlyProfile,
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

	if latestActualPoint == nil {
		// Reliability fallback: handle ingestion skew or timezone drift by taking
		// the nearest sample around now, instead of reporting an implicit zero.
		latestActualPoint, err = s.repository.GetNearestActual(placeID, now, 6*time.Hour)
		if err != nil {
			return nil, nil, 0, err
		}
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

func (s *Service) BootstrapPlaceData(orgID int64, placeID int64, anchor time.Time) (int, int, error) {
	_, err := s.repository.GetPlaceByIDAndOrganisationID(placeID, orgID)
	if err != nil {
		return 0, 0, err
	}

	actualEnd := anchor.Add(-1 * time.Hour)
	actualStart := actualEnd.Add(-719 * time.Hour)
	forecastStart := anchor.Add(1 * time.Hour)
	forecastEnd := forecastStart.Add(167 * time.Hour)

	actualRows := make([]models.PlaceCrowdData, 0, 720)
	for ts := actualStart; !ts.After(actualEnd); ts = ts.Add(time.Hour) {
		hour := ts.Hour()
		dow := int(ts.Weekday())

		value := 110 +
			65*math.Sin(2*math.Pi*((float64(hour)-8)/24.0)) +
			weekendBoost(dow, 35) +
			nightPenalty(hour, -44) +
			nightWave(hour, dow, 10) +
			nightWeekendBump(hour, dow) +
			randomNoise(hour)

		count := int(math.Round(math.Max(5, value)))

		actualRows = append(actualRows, models.PlaceCrowdData{
			PlaceID:     placeID,
			Timestamp:   ts,
			Count:       count,
			Temperature: 24 + 8*math.Sin(2*math.Pi*((float64(hour)-14)/24.0)),
			Rainfall:    rainfallByHour(hour, dow),
			IsHoliday:   dow == 0 || dow == 6,
		})
	}

	forecastRows := make([]models.Forecast, 0, 168)
	hoursFromStart := 0
	for ts := forecastStart; !ts.After(forecastEnd); ts = ts.Add(time.Hour) {
		hour := ts.Hour()
		dow := int(ts.Weekday())

		predicted := 115 +
			60*math.Sin(2*math.Pi*((float64(hour)-8)/24.0)) +
			weekendBoost(dow, 30) +
			float64(hoursFromStart)*0.08 +
			randomNoise(hour)

		base := int(math.Round(math.Max(5, predicted)))
		delta := int(math.Round(math.Max(6, float64(base)*(0.10+rand.Float64()*0.07))))

		forecastRows = append(forecastRows, models.Forecast{
			PlaceID:    placeID,
			Timestamp:  ts,
			Count:      base,
			UpperBound: base + delta,
			LowerBound: maxInt(0, base-delta),
		})

		hoursFromStart += 1
	}

	err = s.repository.DB.Transaction(func(tx *gorm.DB) error {
		repo := &Repository{DB: tx}
		if err := repo.DeleteCrowdDataRange(placeID, actualStart, actualEnd); err != nil {
			return err
		}
		if err := repo.DeleteForecastRange(placeID, forecastStart, forecastEnd); err != nil {
			return err
		}
		if err := repo.InsertCrowdDataBatch(actualRows); err != nil {
			return err
		}
		if err := repo.InsertForecastBatch(forecastRows); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return 0, 0, err
	}

	return len(actualRows), len(forecastRows), nil
}

func weekendBoost(dayOfWeek int, boost float64) float64 {
	if dayOfWeek == 0 || dayOfWeek == 6 {
		return boost
	}
	return 0
}

func nightPenalty(hour int, penalty float64) float64 {
	if hour >= 0 && hour <= 7 {
		return penalty
	}
	return 0
}

func nightWave(hour int, dayOfWeek int, amplitude float64) float64 {
	if hour >= 0 && hour <= 7 {
		return amplitude * math.Sin(2*math.Pi*((float64(hour)+float64(dayOfWeek))/8.0))
	}
	return 0
}

func nightWeekendBump(hour int, dayOfWeek int) float64 {
	if hour < 0 || hour > 7 {
		return 0
	}
	if dayOfWeek == 5 || dayOfWeek == 6 {
		return 12
	}
	if dayOfWeek == 0 {
		return 7
	}
	return 0
}

func randomNoise(hour int) float64 {
	if hour >= 0 && hour <= 7 {
		return (rand.Float64() - 0.5) * 18
	}
	return (rand.Float64() - 0.5) * 8
}

func rainfallByHour(hour int, dayOfWeek int) float64 {
	if (dayOfWeek == 2 || dayOfWeek == 3) && hour >= 14 && hour <= 18 {
		return 2.5
	}
	if hour >= 0 && hour <= 4 {
		return 0.4
	}
	return 0.1
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
