package middlewares

import (
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)


var db *gorm.DB

func requireAuth(c *gin.Context) {
	tokenString, err := c.Cookie("Authorization")
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	userID, err := utils.ParseToken(tokenString)

	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil || user.ID == 0 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	c.Set("user", user)

	c.Next()
}




func RequireAuth(gormDB *gorm.DB) gin.HandlerFunc {
	db = gormDB
	return requireAuth
}