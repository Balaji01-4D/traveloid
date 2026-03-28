package member

import (
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"

	"go-auth-template/internal/middlewares"
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Controller struct {
	service *Service
}

func NewController(s *Service) *Controller {
	return &Controller{service: s}
}

func (ctrl *Controller) Login(c *gin.Context) {
	var loginDTO MemberLoginDTO
	if err := c.ShouldBindJSON(&loginDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	member, err := ctrl.service.AuthenticateUser(loginDTO.Email, loginDTO.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
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
		"status": "user login successfully",
		"user": gin.H{
			"id":              member.ID,
			"email":           member.Email,
			"name":            member.Name,
			"organisation_id": member.OrganisationID,
		},
		"token": token,
	})
}

func (ctrl *Controller) Me(c *gin.Context) {
	member, exists := c.Get("member")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	u := member.(models.Member)

	c.JSON(http.StatusOK, gin.H{
		"id":              u.ID,
		"name":            u.Name,
		"email":           u.Email,
		"organisation_id": u.OrganisationID,
		"role":            u.Role,
	})
}

func (ctrl *Controller) Logout(c *gin.Context) {
	domain := os.Getenv("COOKIE_DOMAIN")

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("Authorization", "", -1, "/", domain, false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "successfully logged out",
	})
}

func (ctrl *Controller) ChangePassword(c *gin.Context) {
	var pwdDTO ChangePasswordDTO
	if err := c.ShouldBindJSON(&pwdDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	member, exists := c.Get("member")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	u := member.(models.Member)
	err := ctrl.service.ChangePassword(u.ID, pwdDTO.OldPassword, pwdDTO.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "password changed successfully",
	})
}

func (ctrl *Controller) DeleteAccount(c *gin.Context) {
	member, exists := c.Get("member")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	var dto DeleteAccountDTO
	if err := c.ShouldBindJSON(&dto); err != nil && !errors.Is(err, io.EOF) {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	u := member.(models.Member)
	err := ctrl.service.DeleteAccount(u, &dto)
	if err != nil {
		if errors.Is(err, ErrAdminDeleteRequiresConfirmation) || errors.Is(err, ErrAdminDeleteOrganisationNameCheck) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	domain := os.Getenv("COOKIE_DOMAIN")

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("Authorization", "", -1, "/", domain, false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "account deleted successfully",
	})
}

func (ctrl *Controller) DeleteMember(c *gin.Context) {
	member, exists := c.Get("member")
	if !exists {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	idParam := c.Param("id")
	targetID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid member id"})
		return
	}

	admin := member.(models.Member)
	err = ctrl.service.DeleteMemberByAdmin(admin.OrganisationID, targetID)
	if err != nil {
		if errors.Is(err, ErrForbiddenDeleteAction) {
			c.JSON(http.StatusForbidden, gin.H{"error": "admins can only delete member-role accounts in their organisation"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "member deleted successfully",
	})
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	repo := NewRepository(db)
	svc := NewService(repo)
	ctrl := NewController(svc)

	users := r.Group("/auth")
	{
		users.POST("/login", ctrl.Login)
		users.GET("/me", middlewares.RequireAuth(db), ctrl.Me)
		users.POST("/logout", middlewares.RequireAuth(db), ctrl.Logout)
		users.POST("/change-password", middlewares.RequireAuth(db), ctrl.ChangePassword)
		users.DELETE("/delete-account", middlewares.RequireAuth(db), ctrl.DeleteAccount)
		users.DELETE("/members/:id", middlewares.RequireAuth(db), middlewares.RequireAdmin(db), ctrl.DeleteMember)
	}
}
