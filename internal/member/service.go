package member

import (
	"errors"
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"
)

var (
	ErrForbiddenDeleteAction            = errors.New("forbidden delete action")
	ErrAdminDeleteRequiresConfirmation  = errors.New("admin delete requires confirmation")
	ErrAdminDeleteOrganisationNameCheck = errors.New("organisation name confirmation failed")
)

type Service struct {
	repository *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repository: r}
}

func (s *Service) GetUser(id int64) (*models.Member, error) {
	return s.repository.GetUserByID(id)
}

func (s *Service) GetUserByEmail(email string) (*models.Member, error) {
	return s.repository.GetUserByEmail(email)
}

func (s *Service) UpdateUser(user *models.Member) error {
	return s.repository.UpdateUser(user)
}

func (s *Service) ChangePassword(UserID int64, oldPassword string, NewPassword string) error {
	user, err := s.repository.GetUserByID(UserID)
	if err != nil {
		return err
	}

	if err := utils.CheckPasswordHash(oldPassword, user.Password); err != nil {
		return err
	}

	hashedPassword, err := utils.HashPassword(NewPassword)
	if err != nil {
		return err
	}

	user.Password = hashedPassword
	return s.repository.UpdateUser(user)
}

func (s *Service) DeleteUser(id int64) error {
	return s.repository.DeleteUser(id)
}

func (s *Service) DeleteMemberByAdmin(adminOrgID int64, targetID int64) error {
	target, err := s.repository.GetUserByID(targetID)
	if err != nil {
		return err
	}

	if target.OrganisationID != adminOrgID {
		return ErrForbiddenDeleteAction
	}

	if target.Role != models.RoleMember {
		return ErrForbiddenDeleteAction
	}

	return s.repository.DeleteUser(target.ID)
}

func (s *Service) DeleteAccount(currentMember models.Member, dto *DeleteAccountDTO) error {
	if currentMember.Role != models.RoleAdmin {
		return s.repository.DeleteUser(currentMember.ID)
	}

	if !dto.ConfirmDeleteOrganisation || dto.ConfirmText != "DELETE" {
		return ErrAdminDeleteRequiresConfirmation
	}

	org, err := s.repository.GetOrganisationByID(currentMember.OrganisationID)
	if err != nil {
		return err
	}

	if dto.ConfirmOrganisationName != org.Name {
		return ErrAdminDeleteOrganisationNameCheck
	}

	// Deleting organisation cascades to members and places via FK constraints.
	return s.repository.DeleteOrganisation(currentMember.OrganisationID)
}

func (s *Service) AuthenticateUser(email, password string) (*models.Member, error) {
	user, err := s.repository.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}

	if err := utils.CheckPasswordHash(password, user.Password); err != nil {
		return nil, err
	}
	return user, nil
}
