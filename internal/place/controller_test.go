package place_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"go-auth-template/internal/models"
	"go-auth-template/internal/place"
)

func setupTestRouterAndController(t *testing.T) (*gin.Engine, *place.Controller, sqlmock.Sqlmock) {
	gin.SetMode(gin.TestMode)
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	assert.NoError(t, err)

	repo := place.NewRepository(gormDB)
	service := place.NewService(repo)
	controller := place.NewController(service)

	r := gin.Default()
	return r, controller, mock
}

func mockUserMiddleware(userId int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user", models.User{ID: userId, Name: "TestUser"})
		c.Next()
	}
}

func TestController_Register(t *testing.T) {
	r, ctrl, mock := setupTestRouterAndController(t)
	r.POST("/register", mockUserMiddleware(1), ctrl.Register)
	r.POST("/register-unauth", ctrl.Register)

	t.Run("Success", func(t *testing.T) {
		reqBody := place.PlaceRegisterDTO{
			Name:      "New Place",
			Latitude:  12.34,
			Longitude: 56.78,
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectBegin()
		mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "places" ("name","image_link","latitude","longitude","created_by") VALUES ($1,$2,$3,$4,$5) RETURNING "id"`)).
			WithArgs(reqBody.Name, "", reqBody.Latitude, reqBody.Longitude, int64(1)).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
		mock.ExpectCommit()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "place registered successfully", response["status"])
	})

	t.Run("Binding Error", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Unauthorized Error", func(t *testing.T) {
		reqBody := place.PlaceRegisterDTO{
			Name:      "New Place",
			Latitude:  12.34,
			Longitude: 56.78,
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/register-unauth", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("DB Failure", func(t *testing.T) {
		reqBody := place.PlaceRegisterDTO{
			Name:      "Bad Place",
			Latitude:  12.34,
			Longitude: 56.78,
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectBegin()
		mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "places"`)).
			WillReturnError(errors.New("db error"))
		mock.ExpectRollback()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestController_UpdatePlace(t *testing.T) {
	r, ctrl, mock := setupTestRouterAndController(t)
	r.PUT("/update", mockUserMiddleware(1), ctrl.UpdatePlace)

	t.Run("Success", func(t *testing.T) {
		reqBody := place.PlaceUpdateDTO{
			ID:        1,
			Name:      "Updated Place",
			Latitude:  11.11,
			Longitude: 22.22,
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPut, "/update", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places" WHERE "places"."id" = $1 ORDER BY "places"."id" LIMIT $2`)).
			WithArgs(1, 1). // place.ID = 1
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "image_link", "latitude", "longitude", "created_by"}).
				AddRow(1, "Old Place", "http://old-image.com/img.jpg", 12.34, 56.78, 1))

		mock.ExpectBegin()
		mock.ExpectExec(regexp.QuoteMeta(`UPDATE "places" SET "name"=$1,"image_link"=$2,"latitude"=$3,"longitude"=$4,"created_by"=$5 WHERE "id" = $6`)).
			WithArgs(reqBody.Name, "http://old-image.com/img.jpg", reqBody.Latitude, reqBody.Longitude, int64(1), reqBody.ID).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectCommit()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "place updated successfully", response["message"])
	})

	t.Run("Forbidden - Not Owner", func(t *testing.T) {
		reqBody := place.PlaceUpdateDTO{
			ID:        2,
			Name:      "Updated Place",
			Latitude:  11.11,
			Longitude: 22.22,
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPut, "/update", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("Place Not Found", func(t *testing.T) {
		reqBody := place.PlaceUpdateDTO{
			ID:        1,
			Name:      "Updated Place",
			Latitude:  11.11,
			Longitude: 22.22,
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPut, "/update", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places"`)).
			WithArgs(1, 1).
			WillReturnError(gorm.ErrRecordNotFound)

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestController_DeletePlace(t *testing.T) {
	r, ctrl, mock := setupTestRouterAndController(t)
	r.DELETE("/delete", mockUserMiddleware(1), ctrl.DeletePlace)

	t.Run("Success", func(t *testing.T) {
		reqBody := struct {
			ID int64 `json:"id"`
		}{ID: 1}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodDelete, "/delete", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectBegin()
		mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "places" WHERE "places"."id" = $1`)).
			WithArgs(1).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectCommit()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Forbidden - Not Owner", func(t *testing.T) {
		reqBody := struct {
			ID int64 `json:"id"`
		}{ID: 2} // place ID does not match user ID (1)
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodDelete, "/delete", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}
