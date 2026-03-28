package organisation

type OrganisationRegisterDTO struct {
	Name string `json:"name" binding:"required"`
}
