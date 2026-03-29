package organisation

import (
	"fmt"
	"go-auth-template/internal/member"
	"go-auth-template/internal/middlewares"
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Controller struct {
	service *Service
}

func NewController(s *Service) *Controller {
	return &Controller{service: s}
}

func (ctrl *Controller) RegisterOrg(c *gin.Context) {

	var orgDTO OrganisationRegisterDTO
	if err := c.ShouldBindJSON(&orgDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	org, err := ctrl.service.RegisterOrg(&orgDTO)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "org registered successfully",
		"org": org,
	})
}

// this is a special endpoint to add the first member to an org, 
// one org can only have one admin, so this endpoint is for adding the first member with admin role,
// it will be used right after org registrated successfully,
// the first member will be assigned as admin role
func (ctrl *Controller) AddOrgAdmin(c *gin.Context) {
	var memberDTO member.AddMemberDTO
	if err := c.ShouldBindJSON(&memberDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	member, err := ctrl.service.AddOrgMember(&memberDTO, models.RoleAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	token, err := utils.GenerateAccessToken(member.ID, member.OrganisationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	domain := os.Getenv("COOKIE_DOMAIN")

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("Authorization", token, 3600*24*30, "/", domain, false, true)

	c.JSON(http.StatusCreated, gin.H{
		"status": "user registered successfully",
		"user": gin.H{
			"id":              member.ID,
			"email":           member.Email,
			"name":            member.Name,
			"organisation_id": member.OrganisationID,
		},
		"token": token,
	})
}

// this endpoint is for adding more members to an org, it requires auth and only admin can add members
// only one admin can be added through AddFirstOrgMember, other members must be added by the admin through this endpoint
func (ctrl *Controller) AddOrgMember(c *gin.Context) {
	var memberDTO member.AddMemberDTO
	if err := c.ShouldBindJSON(&memberDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	member, err := ctrl.service.AddOrgMember(&memberDTO, models.RoleMember)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "user registered successfully",
		"user": gin.H{
			"id":              member.ID,
			"email":           member.Email,
			"name":            member.Name,
			"organisation_id": member.OrganisationID,
		},
	})

}

func (ctrl *Controller) GetOrg(c *gin.Context) {
	idParam := c.Param("id")
	var id int64
	_, err := fmt.Sscanf(idParam, "%d", &id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	org, err := ctrl.service.GetOrg(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"org": org,
	})
}

func (ctrl *Controller) CheckOrgNameValid(c *gin.Context) {
	name := c.Query("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name query parameter is required"})
		return
	}

	exists, err := ctrl.service.CheckOrgNameExists(name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"exists": exists,
	})
}

func (ctrl *Controller) GetOrgMembers(c *gin.Context) {
	idParam := c.Param("id")
	var id int64
	_, err := fmt.Sscanf(idParam, "%d", &id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	members, err := ctrl.service.GetOrgMembers(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"members": members,
	})
}

func (ctrl *Controller) DeleteOrg(c *gin.Context) {
	orgID := c.Param("id")

	var id int64
	_, err := fmt.Sscanf(orgID, "%d", &id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	member, exists := c.Get("member")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	if member.(models.Member).Role != models.RoleAdmin {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	delErr := ctrl.service.DeleteOrg(id)
	if delErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": delErr.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "organisation deleted successfully",
	})
}

func (ctrl *Controller) GetAllOrgs(c *gin.Context) {
	orgs, err := ctrl.service.GetAllOrgs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"organisations": orgs,
	})
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	repo := NewRepository(db)
	svc := NewService(repo)
	ctrl := NewController(svc)

	org := r.Group("/organisation")
	{
		org.POST("/register", ctrl.RegisterOrg)
		org.GET("/check-name", ctrl.CheckOrgNameValid)
		org.GET("/:id", ctrl.GetOrg)
		org.GET("/:id/members", middlewares.RequireAuth(db), middlewares.RequireAdmin(db), ctrl.GetOrgMembers)
		org.DELETE("/:id", middlewares.RequireAuth(db), middlewares.RequireAdmin(db), ctrl.DeleteOrg)

		org.POST("/admin", ctrl.AddOrgAdmin) // first member with admin role, no auth required, right after org registered successfully
		org.POST("/member", middlewares.RequireAuth(db), middlewares.RequireAdmin(db), ctrl.AddOrgMember) // requires auth, only admin can add members
	}

	publicOrg := r.Group("/public/organisations")
	{
		publicOrg.GET("", ctrl.GetAllOrgs)
	}
}
