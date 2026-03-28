package member

type AddMemberDTO struct {
	Name           string `json:"name" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=6"`
	OrganisationID int64  `json:"organisation_id" binding:"required"`
}

type MemberLoginDTO struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type ChangePasswordDTO struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type DeleteAccountDTO struct {
	ConfirmDeleteOrganisation bool   `json:"confirm_delete_organisation"`
	ConfirmOrganisationName   string `json:"confirm_organisation_name"`
	ConfirmText               string `json:"confirm_text"`
}
