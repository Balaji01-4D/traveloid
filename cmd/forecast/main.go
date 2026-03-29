package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go-auth-template/internal/database"
	"go-auth-template/internal/models"
	"go-auth-template/internal/place"
	"go-auth-template/internal/utils"
	"io/ioutil"
	"math/rand/v2"
	"net/http"
	"os"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"gorm.io/gorm"
)

func main() {
	db := getDB()

	var places []models.Place

	dbErr := db.Model(&models.Place{}).Where(&models.Place{OrganisationID: 17}).Scan(&places).Error
	if dbErr != nil {
		fmt.Printf("Error fetching places: %v\n", dbErr)
		return
	}

	if len(places) == 0 {
		fmt.Println("No places found for the organisation.")
		return
	}

	for _, place := range places {
		fmt.Printf("Processing place: %s (ID: %d)\n", place.Name, place.ID)
		times := simulateTimeForNext7Days()

		for _, now := range times {
			res, err := getForecast(place, now)
			if err != nil {
				fmt.Printf("Error fetching forecast: %v\n", err)
				continue
			}

			if err := db.Create(&res).Error; err != nil {
				fmt.Printf("Error saving forecast to DB: %v\n", err)
			}
		}
	}
}

func getDB() *gorm.DB {
	db := database.New()
	return db.GetDB()
}

// function to simulate time for one hour for next 7 days
func simulateTimeForNext7Days() []time.Time {
	var times []time.Time
	now := utils.NowIST().Truncate(time.Hour)
	for i := 0; i < 7*24; i++ {
		times = append(times, now.Add(time.Duration(i)*time.Hour))
	}
	return times
}

func getForecast(place models.Place, now time.Time) (models.Forecast, error) {
	var forecast models.Forecast

	temp := 31.5
	rainMM := 0.0
	humidity := 65.0
	windSpeed := 12.0

	if openWeatherKey := os.Getenv("OPENWEATHER_API_KEY"); openWeatherKey != "" {
		// Fetch weather for Goa coordinates using metric units
		weatherURL := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?lat=15.2993&lon=74.1240&appid=%s&units=metric", openWeatherKey)
		client := &http.Client{Timeout: 5 * time.Second}
		if weatherResp, err := client.Get(weatherURL); err == nil && weatherResp.StatusCode == 200 {
			defer weatherResp.Body.Close()
			var res map[string]interface{}
			if err := json.NewDecoder(weatherResp.Body).Decode(&res); err == nil {
				if mainData, ok := res["main"].(map[string]interface{}); ok {
					if t, ok := mainData["temp"].(float64); ok {
						temp = t
					}
					if h, ok := mainData["humidity"].(float64); ok {
						humidity = h
					}
				}
				if windData, ok := res["wind"].(map[string]interface{}); ok {
					if s, ok := windData["speed"].(float64); ok {
						windSpeed = s
					}
				}
				if rainData, ok := res["rain"].(map[string]interface{}); ok {
					if r, ok := rainData["1h"].(float64); ok {
						rainMM = r
					}
				}
			}
		}
	}

	// 2. Transmit to Hugging Face FastAPI Space
	hfURL := os.Getenv("HUGGINGFACE_API_URL")
	if hfURL == "" {
		hfURL = "https://kaamessh-aura-crowd-engine.hf.space/predict"
	}

	payload := map[string]interface{}{
		"site":        place.Name,
		"ds":          now.Format("2006-01-02 15:00:00"),
		"temp":        temp,
		"rain_mm":     rainMM,
		"humidity":    humidity,
		"wind_speed":  windSpeed,
		"is_holiday":  0,
		"is_weekend":  0,
		"month":       int(now.Month()),
		"day_of_week": int(now.Weekday()),
		"hour":        now.Hour(),
	}
	jsonPayload, _ := json.Marshal(payload)

	resp, err := http.Post(hfURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil || resp.StatusCode != 200 {
		return models.Forecast{}, fmt.Errorf("failed to fetch forecast for %s", place.Name)
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	fmt.Println(string(body))

	type ForecastResponse struct {
		Site              string `json:"site"`
		PredictedVisitors int    `json:"predicted_visitors"`
		Status            string `json:"status"`
	}

	var forecastResp ForecastResponse
	if err := json.Unmarshal(body, &forecastResp); err != nil {
		return models.Forecast{}, err
	}

	base := forecastResp.PredictedVisitors
	delta := int(float64(base) * (0.05 + rand.Float64()*0.1)) // 5%–15%

	forecast = models.Forecast{
		PlaceID:    place.ID,
		Timestamp:  now,
		Count:      base,
		UpperBound: base + delta,
		LowerBound: base - delta,
	}

	return forecast, nil
}

func getPlacesByOrgID(orgID int64, db *gorm.DB) ([]models.Place, error) {
	placeRepo := place.NewRepository(db)
	return placeRepo.GetPlacesByOrganisationID(orgID)
}
