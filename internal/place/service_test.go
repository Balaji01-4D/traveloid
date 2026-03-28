package place_test

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"go-auth-template/internal/place"
)

func TestService_RegisterPlace(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{
		Conn:       db,
		DriverName: "postgres",
	})
	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	assert.NoError(t, err)

	repo := place.NewRepository(gormDB)
	service := place.NewService(repo)

	dto := &place.PlaceRegisterDTO{
		Name:      "New Place",
		Capacity:  120,
		Latitude:  12.34,
		Longitude: 56.78,
	}

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "places" ("name","image_link","capacity","latitude","longitude","organisation_id") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "id"`)).
		WithArgs(dto.Name, "", dto.Capacity, dto.Latitude, dto.Longitude, int64(1)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	p, err := service.RegisterPlace(1, dto)
	assert.NoError(t, err)
	assert.NotNil(t, p)
	assert.Equal(t, dto.Name, p.Name)
	assert.Equal(t, int64(1), p.ID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestService_GetPlace(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, _ := gorm.Open(dialector, &gorm.Config{})

	repo := place.NewRepository(gormDB)
	service := place.NewService(repo)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places" WHERE "places"."id" = $1 ORDER BY "places"."id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "latitude", "longitude", "organisation_id"}).
			AddRow(1, "New Place", 12.34, 56.78, 1))

	p, err := service.GetPlace(1)
	assert.NoError(t, err)
	assert.NotNil(t, p)
	assert.Equal(t, int64(1), p.ID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestService_GetPlacesByOrganisationID(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, _ := gorm.Open(dialector, &gorm.Config{})

	repo := place.NewRepository(gormDB)
	service := place.NewService(repo)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places" WHERE organisation_id = $1`)).
		WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).
			AddRow(1, "Place 1").
			AddRow(2, "Place 2"))

	places, err := service.GetPlacesByOrganisationID(1)
	assert.NoError(t, err)
	assert.Len(t, places, 2)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestService_UpdatePlace(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, _ := gorm.Open(dialector, &gorm.Config{})

	repo := place.NewRepository(gormDB)
	service := place.NewService(repo)

	dto := &place.PlaceUpdateDTO{
		ID:        1,
		Name:      "Updated Place",
		Capacity:  240,
		Latitude:  11.11,
		Longitude: 22.22,
	}

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places" WHERE "places"."id" = $1 ORDER BY "places"."id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "image_link", "capacity", "latitude", "longitude", "organisation_id"}).
			AddRow(1, "Old Place", "http://example.com/old.jpg", 100, 12.34, 56.78, 1))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "places" SET "name"=$1,"image_link"=$2,"capacity"=$3,"latitude"=$4,"longitude"=$5,"organisation_id"=$6 WHERE "id" = $7`)).
		WithArgs(dto.Name, "http://example.com/old.jpg", dto.Capacity, dto.Latitude, dto.Longitude, int64(1), dto.ID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err = service.UpdatePlace(dto)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}
