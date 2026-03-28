package place

type PlaceRegisterDTO struct {
	Name      string  `json:"name" binding:"required"`
	ImageLink string  `json:"image_link"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type PlaceUpdateDTO struct {
	ID        int64   `json:"id" binding:"required"`
	Name      string  `json:"name"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type PlaceDeleteDTO struct {
	ID int64 `json:"id" binding:"required"`
}
