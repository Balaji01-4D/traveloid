package organisation

import (
	"go-auth-template/internal/models"

	"gorm.io/gorm"
)

type Repository struct {
	DB *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{DB: db}
}

func (r *Repository) CreateOrg(org *models.Organisation) error {
	return r.DB.Create(org).Error
}

func (r *Repository) GetOrgByID(id int64) (*models.Organisation, error) {
	var org models.Organisation
	if err := r.DB.First(&org, id).Error; err != nil {
		return nil, err
	}
	return &org, nil
}

func (r *Repository) GetAllOrgs() ([]models.Organisation, error) {
	var orgs []models.Organisation
	if err := r.DB.Find(&orgs).Error; err != nil {
		return nil, err
	}
	return orgs, nil
}

func (r *Repository) GetOrgMembers(id int64) ([]models.Member, error) {
	var members []models.Member
	if err := r.DB.Find(&members, "organisation_id = ?", id).Error; err != nil {
		return members, err
	}
	return members, nil
}

func (r *Repository) CheckOrgNameExists(name string) (bool, error) {
	var org models.Organisation
	if err := r.DB.Where("name = ?", name).First(&org).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *Repository) DeleteOrg(id int64) error {
	return r.DB.Delete(&models.Organisation{}, id).Error
}
