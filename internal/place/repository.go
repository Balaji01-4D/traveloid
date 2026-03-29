package place

import (
	"database/sql"
	"fmt"
	"go-auth-template/internal/models"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	DB *gorm.DB
}

const istTimeZoneSQL = "Asia/Kolkata"

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

func (r *Repository) GetPlaceByIDAndOrganisationID(id int64, orgID int64) (*models.Place, error) {
	var place models.Place
	if err := r.DB.Where("id = ? AND organisation_id = ?", id, orgID).First(&place).Error; err != nil {
		return nil, err
	}
	return &place, nil
}

func (r *Repository) GetPlacesByOrganisationID(orgID int64) ([]models.Place, error) {
	var places []models.Place
	if err := r.DB.Where("organisation_id = ?", orgID).Find(&places).Error; err != nil {
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

func (r *Repository) GetCrowdData(placeID int64, start time.Time, end time.Time, interval string) ([]CrowdDataPoint, error) {
	rows := make([]CrowdDataPoint, 0)
	bucketExpr := fmt.Sprintf("date_trunc('%s', timestamp AT TIME ZONE '%s') AT TIME ZONE '%s'", interval, istTimeZoneSQL, istTimeZoneSQL)

	err := r.DB.Model(&models.PlaceCrowdData{}).
		Select(bucketExpr+" AS timestamp, AVG(count)::float8 AS count").
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ?", placeID, start, end).
		Group(bucketExpr).
		Order("timestamp ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *Repository) GetCrowdHeatmap(placeID int64, start time.Time, end time.Time) ([]CrowdHeatmapRow, error) {
	rows := make([]CrowdHeatmapRow, 0)

	err := r.DB.Model(&models.PlaceCrowdData{}).
		Select("EXTRACT(DOW FROM timestamp AT TIME ZONE 'Asia/Kolkata')::int AS day_of_week, EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Kolkata')::int AS hour, AVG(count)::float8 AS avg_count").
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ?", placeID, start, end).
		Group("day_of_week, hour").
		Order("day_of_week ASC, hour ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *Repository) GetBusiestHour(placeID int64, start time.Time, end time.Time) (*CrowdHourPeak, error) {
	row := &CrowdHourPeak{}

	tx := r.DB.Model(&models.PlaceCrowdData{}).
		Select("EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Kolkata')::int AS hour, AVG(count)::float8 AS avg_count").
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ?", placeID, start, end).
		Group("hour").
		Order("avg_count DESC, hour ASC").
		Limit(1).
		Scan(row)

	if tx.Error != nil {
		return nil, tx.Error
	}

	if tx.RowsAffected == 0 {
		return nil, nil
	}

	return row, nil
}

func (r *Repository) GetLeastCrowdedTime(placeID int64, start time.Time, end time.Time) (*CrowdHeatmapRow, error) {
	row := &CrowdHeatmapRow{}

	tx := r.DB.Model(&models.PlaceCrowdData{}).
		Select("EXTRACT(DOW FROM timestamp AT TIME ZONE 'Asia/Kolkata')::int AS day_of_week, EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Kolkata')::int AS hour, AVG(count)::float8 AS avg_count").
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ?", placeID, start, end).
		Group("day_of_week, hour").
		Order("avg_count ASC, day_of_week ASC, hour ASC").
		Limit(1).
		Scan(row)

	if tx.Error != nil {
		return nil, tx.Error
	}

	if tx.RowsAffected == 0 {
		return nil, nil
	}

	return row, nil
}

func (r *Repository) GetForecast(placeID int64, start time.Time, end time.Time) ([]ForecastPoint, error) {
	rows := make([]ForecastPoint, 0)

	err := r.DB.Model(&models.Forecast{}).
		Select("timestamp, count, upper_bound, lower_bound").
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ?", placeID, start, end).
		Order("timestamp ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *Repository) GetForecastOverloads(placeID int64, start time.Time, end time.Time, capacity int64) ([]ForecastAlert, error) {
	rows := make([]ForecastAlert, 0)

	err := r.DB.Model(&models.Forecast{}).
		Select("timestamp, count AS predicted_count, upper_bound, lower_bound, ?::bigint AS capacity, GREATEST(count - ?, upper_bound - ?, 0)::bigint AS overload_by", capacity, capacity, capacity).
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ? AND (count > ? OR upper_bound > ?)", placeID, start, end, capacity, capacity).
		Order("timestamp ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *Repository) GetActualSeries(placeID int64, start time.Time, end time.Time) ([]ActualPoint, error) {
	rows := make([]ActualPoint, 0)

	err := r.DB.Model(&models.PlaceCrowdData{}).
		Select("timestamp, count").
		Where("place_id = ? AND timestamp >= ? AND timestamp <= ?", placeID, start, end).
		Order("timestamp ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *Repository) GetLatestActual(placeID int64, asOf time.Time) (*ActualPoint, error) {
	row := &ActualPoint{}

	tx := r.DB.Model(&models.PlaceCrowdData{}).
		Select("timestamp, count").
		Where("place_id = ? AND timestamp <= ?", placeID, asOf).
		Order("timestamp DESC").
		Limit(1).
		Scan(row)

	if tx.Error != nil {
		return nil, tx.Error
	}

	if tx.RowsAffected == 0 {
		return nil, nil
	}

	return row, nil
}

func (r *Repository) GetNextForecast(placeID int64, start time.Time, limit int) ([]ForecastPoint, error) {
	rows := make([]ForecastPoint, 0)

	err := r.DB.Model(&models.Forecast{}).
		Select("timestamp, count, upper_bound, lower_bound").
		Where("place_id = ? AND timestamp >= ?", placeID, start).
		Order("timestamp ASC").
		Limit(limit).
		Scan(&rows).Error

	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *Repository) GetTimeSeries(placeID int64, start time.Time, end time.Time, interval string) ([]TimeSeriesPoint, error) {
	if interval != "hour" && interval != "day" {
		interval = "hour"
	}

	step := "1 hour"
	if interval == "day" {
		step = "1 day"
	}

	type timeSeriesRow struct {
		Timestamp time.Time
		Actual    sql.NullInt64
		Predicted sql.NullInt64
	}

	rows := make([]timeSeriesRow, 0)

	query := `
		WITH buckets AS (
			SELECT generate_series(
				date_trunc(?, ?::timestamptz AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata',
				date_trunc(?, ?::timestamptz AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata',
				?::interval
			) AS ts
		),
		actual AS (
			SELECT date_trunc(?, timestamp AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' AS ts, ROUND(AVG(count))::int AS actual
			FROM place_crowd_data
			WHERE place_id = ? AND timestamp >= ? AND timestamp <= ?
			GROUP BY ts
		), forecast AS (
			SELECT date_trunc(?, timestamp AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' AS ts, ROUND(AVG(count))::int AS predicted
			FROM forecasts
			WHERE place_id = ? AND timestamp >= ? AND timestamp <= ?
			GROUP BY ts
		)
		SELECT buckets.ts AS timestamp, actual.actual, forecast.predicted
		FROM buckets
		LEFT JOIN actual ON buckets.ts = actual.ts
		LEFT JOIN forecast ON buckets.ts = forecast.ts
		ORDER BY timestamp ASC
	`

	err := r.DB.Raw(
		query,
		interval,
		start,
		interval,
		end,
		step,
		interval,
		placeID,
		start,
		end,
		interval,
		placeID,
		start,
		end,
	).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make([]TimeSeriesPoint, 0, len(rows))
	for _, row := range rows {
		point := TimeSeriesPoint{Timestamp: row.Timestamp}
		if row.Actual.Valid {
			value := int(row.Actual.Int64)
			point.Actual = &value
		}
		if row.Predicted.Valid {
			value := int(row.Predicted.Int64)
			point.Predicted = &value
		}
		result = append(result, point)
	}

	// Stitch a common ingestion-lag gap: if there's exactly one empty bucket between
	// the latest actual and first future forecast, mirror the first forecast into
	// that missing handoff bucket to keep trend continuity.
	lastActualIdx := -1
	for i := len(result) - 1; i >= 0; i-- {
		if result[i].Actual != nil {
			lastActualIdx = i
			break
		}
	}

	if lastActualIdx >= 0 {
		firstForecastAfterActualIdx := -1
		for i := lastActualIdx + 1; i < len(result); i++ {
			if result[i].Predicted != nil {
				firstForecastAfterActualIdx = i
				break
			}
		}

		if firstForecastAfterActualIdx > lastActualIdx+1 {
			handoffIdx := lastActualIdx + 1
			if result[handoffIdx].Actual == nil && result[handoffIdx].Predicted == nil {
				if result[firstForecastAfterActualIdx].Predicted != nil {
					value := *result[firstForecastAfterActualIdx].Predicted
					result[handoffIdx].Predicted = &value
				}
			}
		}
	}

	return result, nil
}
