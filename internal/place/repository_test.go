package place_test

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"go-auth-template/internal/models"
	"go-auth-template/internal/place"
)

func setupMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
	}

	dialector := postgres.New(postgres.Config{
		Conn:       db,
		DriverName: "postgres",
	})

	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		t.Fatalf("An error '%s' was not expected when opening gorm database", err)
	}

	return gormDB, mock
}

func TestRepository_CreatePlace(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := place.NewRepository(db)

	p := &models.Place{
		Name:           "Eiffel Tower",
		ImageLink:      "http://example.com/eiffel.jpg",
		Latitude:       48.8584,
		Longitude:      2.2945,
		OrganisationID: 1,
	}

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "places" ("name","image_link","latitude","longitude","organisation_id") VALUES ($1,$2,$3,$4,$5) RETURNING "id"`)).
		WithArgs(p.Name, p.ImageLink, p.Latitude, p.Longitude, p.OrganisationID).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	err := repo.CreatePlace(p)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), p.ID)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_GetPlaceByID(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := place.NewRepository(db)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places" WHERE "places"."id" = $1 ORDER BY "places"."id" LIMIT $2`)).
		WithArgs(1, 1). // id 1, limit 1
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "latitude", "longitude", "organisation_id"}).
			AddRow(1, "Eiffel Tower", 48.8584, 2.2945, 1))

	p, err := repo.GetPlaceByID(1)
	assert.NoError(t, err)
	assert.NotNil(t, p)
	assert.Equal(t, int64(1), p.ID)
	assert.Equal(t, "Eiffel Tower", p.Name)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_GetPlacesByOrganisationID(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := place.NewRepository(db)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "places" WHERE organisation_id = $1`)).
		WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "latitude", "longitude", "organisation_id"}).
			AddRow(1, "Eiffel Tower", 48.8584, 2.2945, 1).
			AddRow(2, "Louvre Museum", 48.8606, 2.3376, 1))

	places, err := repo.GetPlacesByOrganisationID(1)
	assert.NoError(t, err)
	assert.Len(t, places, 2)
	assert.Equal(t, "Eiffel Tower", places[0].Name)
	assert.Equal(t, "Louvre Museum", places[1].Name)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_UpdatePlace(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := place.NewRepository(db)

	p := &models.Place{
		ID:             1,
		Name:           "Eiffel Tower Updated",
		Latitude:       48.8584,
		Longitude:      2.2945,
		OrganisationID: 1,
	}

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "places" SET "name"=$1,"image_link"=$2,"latitude"=$3,"longitude"=$4,"organisation_id"=$5 WHERE "id" = $6`)).
		WithArgs(p.Name, p.ImageLink, p.Latitude, p.Longitude, p.OrganisationID, p.ID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.UpdatePlace(p)
	assert.NoError(t, err)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_DeletePlace(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := place.NewRepository(db)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "places" WHERE "places"."id" = $1`)).
		WithArgs(1).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.DeletePlace(1)
	assert.NoError(t, err)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
