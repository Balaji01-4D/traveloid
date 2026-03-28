package user_test

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
	"go-auth-template/internal/user"
	"go-auth-template/internal/utils"
)

func setupTestRouterAndController(t *testing.T) (*gin.Engine, *user.Controller, sqlmock.Sqlmock) {
	gin.SetMode(gin.TestMode)
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	assert.NoError(t, err)

	repo := user.NewRepository(gormDB)
	service := user.NewService(repo)
	controller := user.NewController(service)

	r := gin.Default()
	return r, controller, mock
}

func TestController_Register(t *testing.T) {
	r, ctrl, mock := setupTestRouterAndController(t)
	r.POST("/register", ctrl.Register)

	t.Run("Success", func(t *testing.T) {
		reqBody := user.UserRegisterDTO{
			Name:     "Test",
			Email:    "test@example.com",
			Password: "password123",
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectBegin()
		mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "users" ("name","email","password") VALUES ($1,$2,$3) RETURNING "id"`)).
			WithArgs(reqBody.Name, reqBody.Email, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
		mock.ExpectCommit()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "user registered successfully", response["status"])
		assert.NotEmpty(t, response["token"])
	})

	t.Run("Binding Error", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Service Error - Duplicate Email", func(t *testing.T) {
		reqBody := user.UserRegisterDTO{
			Name:     "Test",
			Email:    "test@example.com",
			Password: "password123",
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectBegin()
		mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "users"`)).
			WillReturnError(errors.New("duplicate key value violates unique constraint"))
		mock.ExpectRollback()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestController_Login(t *testing.T) {
	r, ctrl, mock := setupTestRouterAndController(t)
	r.POST("/login", ctrl.Login)

	hashedPassword, _ := utils.HashPassword("password123")

	t.Run("Success", func(t *testing.T) {
		reqBody := user.UserLoginDTO{
			Email:    "test@example.com",
			Password: "password123",
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE email = $1`)).
			WithArgs(reqBody.Email, 1).
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
				AddRow(1, "Test", "test@example.com", hashedPassword))

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "user login successfully", response["status"])
	})

	t.Run("Invalid Credentials", func(t *testing.T) {
		reqBody := user.UserLoginDTO{
			Email:    "test@example.com",
			Password: "wrongpassword",
		}
		jsonData, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE email = $1`)).
			WithArgs(reqBody.Email, 1).
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
				AddRow(1, "Test", "test@example.com", hashedPassword))

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestController_Me(t *testing.T) {
	r, ctrl, _ := setupTestRouterAndController(t)

	// Create a dummy middleware to inject user context
	r.GET("/me", func(c *gin.Context) {
		c.Set("user", models.User{ID: 1, Name: "Test", Email: "test@example.com"})
		c.Next()
	}, ctrl.Me)

	r.GET("/me-unauth", ctrl.Me)

	t.Run("Success", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/me", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "test@example.com", response["email"])
	})

	t.Run("Unauthorized - No User in Context", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/me-unauth", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
