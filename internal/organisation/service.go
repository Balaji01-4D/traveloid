package organisation

import (
	"go-auth-template/internal/member"
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"
)

type Service struct {
	repository *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repository: r}
}

func (s *Service) RegisterOrg(orgRegistrationDTO *OrganisationRegisterDTO) (*models.Organisation, error) {
	org := &models.Organisation{
		Name: orgRegistrationDTO.Name,
	}
	if err := s.repository.CreateOrg(org); err != nil {
		return nil, err
	}
	return org, nil
}

func (s *Service) AddOrgMember(addMemberDTO *member.AddMemberDTO, role models.Role) (*models.Member, error) {
	hashedPassword, err := utils.HashPassword(addMemberDTO.Password)
	if err != nil {
		return nil, err
	}

	addMember := &models.Member{
		Name:           addMemberDTO.Name,
		Email:          addMemberDTO.Email,
		Password:       hashedPassword,
		Role:           role,
		OrganisationID: addMemberDTO.OrganisationID,
	}
	memberRepo := member.NewRepository(s.repository.DB)
	if err := memberRepo.CreateUser(addMember); err != nil {
		return nil, err
	}
	return addMember, nil
}

func (s *Service) GetOrg(id int64) (*models.Organisation, error) {
	return s.repository.GetOrgByID(id)
}

func (s *Service) GetAllOrgs() ([]models.Organisation, error) {
	return s.repository.GetAllOrgs()
}

func (s *Service) CheckOrgNameExists(name string) (bool, error) {
	return s.repository.CheckOrgNameExists(name)
}

func (s *Service) GetOrgMembers(id int64) ([]models.Member, error) {
	return s.repository.GetOrgMembers(id)
}

func (s *Service) DeleteOrg(id int64) error {
	return s.repository.DeleteOrg(id)
}
