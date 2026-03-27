package user

import (
	"go-auth-template/internal/models"
	"go-auth-template/internal/utils"
)

type Service struct {
	repository *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repository: r}
}

func (s *Service) RegisterUser(userRegistrationDTO *UserRegisterDTO) (*models.User, error) {

	hashedPassword, err := utils.HashPassword(userRegistrationDTO.Password)

	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:     userRegistrationDTO.Name,
		Email:    userRegistrationDTO.Email,
		Password: hashedPassword,
	}
	if err := s.repository.CreateUser(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *Service) GetUser(id int64) (*models.User, error) {
	return s.repository.GetUserByID(id)
}

func (s *Service) GetUserByEmail(email string) (*models.User, error) {
	return s.repository.GetUserByEmail(email)
}

func (s *Service) UpdateUser(user *models.User) error {
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

func (s *Service) AuthenticateUser(email, password string) (*models.User, error) {
	user, err := s.repository.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}

	if err := utils.CheckPasswordHash(password, user.Password); err != nil {
		return nil, err
	}
	return user, nil
}
