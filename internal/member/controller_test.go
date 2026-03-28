package member_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"go-auth-template/internal/member"
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"
)

func setupTestRouterAndController(t *testing.T) (*gin.Engine, *member.Controller, sqlmock.Sqlmock) {
	gin.SetMode(gin.TestMode)
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	assert.NoError(t, err)

	repo := member.NewRepository(gormDB)
	service := member.NewService(repo)
	controller := member.NewController(service)

	r := gin.Default()
	return r, controller, mock
}

func TestController_Login(t *testing.T) {
	r, ctrl, mock := setupTestRouterAndController(t)
	r.POST("/login", ctrl.Login)

	hashedPassword, _ := utils.HashPassword("password123")

	t.Run("Success", func(t *testing.T) {
		reqBody := member.MemberLoginDTO{
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
		reqBody := member.MemberLoginDTO{
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
		c.Set("user", models.Member{ID: 1, Name: "Test", Email: "test@example.com"})
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
