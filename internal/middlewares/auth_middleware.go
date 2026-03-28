package middlewares

import (
	"net/http"

	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"

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

	memberID, orgID, err := utils.ParseToken(tokenString)
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	var member models.Member
	if err := db.Where("id = ?", memberID).First(&member).Error; err != nil || member.ID == 0 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	if member.OrganisationID != orgID {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	if member.Role != models.RoleAdmin && member.Role != models.RoleDeveloper {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	c.Set("member", member)
	c.Set("organisation_id", orgID)

	c.Next()
}

func RequireAuth(gormDB *gorm.DB) gin.HandlerFunc {
	db = gormDB
	return requireAuth
}
