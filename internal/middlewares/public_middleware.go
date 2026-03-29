package middlewares

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func PublicOrgMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgIDParam := c.Param("org_id")
		if orgIDParam == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "org_id is required"})
			return
		}

		var orgID int64
		if _, err := fmt.Sscanf(orgIDParam, "%d", &orgID); err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid org_id"})
			return
		}

		c.Set("organisation_id", orgID)
		c.Next()
	}
}
