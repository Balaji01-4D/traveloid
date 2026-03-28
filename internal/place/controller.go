package place

import (
	"go-auth-template/internal/middlewares"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Controller struct {
	service *Service
}

func NewController(s *Service) *Controller {
	return &Controller{service: s}
}

func (ctrl *Controller) Register(c *gin.Context) {

	var placeDTO PlaceRegisterDTO
	if err := c.ShouldBindJSON(&placeDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	orgID := orgIDValue.(int64)
	place, err := ctrl.service.RegisterPlace(orgID, &placeDTO)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "place registered successfully",
		"place": gin.H{
			"id":              place.ID,
			"name":            place.Name,
			"image_link":      place.ImageLink,
			"capacity":        place.Capacity,
			"latitude":        place.Latitude,
			"longitude":       place.Longitude,
			"organisation_id": place.OrganisationID,
		},
	})
}

func (ctrl *Controller) GetPlaces(c *gin.Context) {
	orgIDValue, exists := c.Get("organisation_id")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	orgID := orgIDValue.(int64)
	places, err := ctrl.service.GetPlacesByOrganisationID(orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"places": places})
}

func (ctrl *Controller) UpdatePlace(c *gin.Context) {
	var placeDTO PlaceUpdateDTO
	if err := c.ShouldBindJSON(&placeDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.service.UpdatePlace(&placeDTO)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "place updated successfully",
	})
}

func (ctrl *Controller) DeletePlace(c *gin.Context) {
	var placeDTO PlaceDeleteDTO
	if err := c.ShouldBindJSON(&placeDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.service.DeletePlace(placeDTO.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "place deleted successfully",
	})
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	repo := NewRepository(db)
	svc := NewService(repo)
	ctrl := NewController(svc)

	users := r.Group("/auth")
	{
		users.GET("/places", middlewares.RequireAuth(db), ctrl.GetPlaces)
		users.POST("/places", middlewares.RequireAuth(db), ctrl.Register)
		users.PUT("/places", middlewares.RequireAuth(db), ctrl.UpdatePlace)
		users.DELETE("/places", middlewares.RequireAuth(db), ctrl.DeletePlace)

		// Legacy route aliases for compatibility.
		users.POST("/register", middlewares.RequireAuth(db), ctrl.Register)
		users.PUT("/update-place", middlewares.RequireAuth(db), ctrl.UpdatePlace)
		users.DELETE("/delete-place", middlewares.RequireAuth(db), ctrl.DeletePlace)
	}
}
