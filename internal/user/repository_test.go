package user_test

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"go-auth-template/internal/models"
	"go-auth-template/internal/user"
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

func TestRepository_CreateUser(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := user.NewRepository(db)

	u := &models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "hashedpassword",
	}

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "users" ("name","email","password") VALUES ($1,$2,$3) RETURNING "id"`)).
		WithArgs(u.Name, u.Email, u.Password).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	err := repo.CreateUser(u)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), u.ID)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_GetUserByID(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := user.NewRepository(db)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE "users"."id" = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(1, 1). // id 1, limit 1 (because First uses limit 1)
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
			AddRow(1, "Test User", "test@example.com", "hashedpassword"))

	u, err := repo.GetUserByID(1)
	assert.NoError(t, err)
	assert.NotNil(t, u)
	assert.Equal(t, int64(1), u.ID)
	assert.Equal(t, "test@example.com", u.Email)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_GetUserByEmail(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := user.NewRepository(db)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE email = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs("test@example.com", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
			AddRow(1, "Test User", "test@example.com", "hashedpassword"))

	u, err := repo.GetUserByEmail("test@example.com")
	assert.NoError(t, err)
	assert.NotNil(t, u)
	assert.Equal(t, "test@example.com", u.Email)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_UpdateUser(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := user.NewRepository(db)

	u := &models.User{
		ID:       1,
		Name:     "Updated User",
		Email:    "update@example.com",
		Password: "newpassword",
	}

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "users" SET "name"=$1,"email"=$2,"password"=$3 WHERE "id" = $4`)).
		WithArgs(u.Name, u.Email, u.Password, u.ID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.UpdateUser(u)
	assert.NoError(t, err)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestRepository_DeleteUser(t *testing.T) {
	db, mock := setupMockDB(t)
	repo := user.NewRepository(db)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "users" WHERE "users"."id" = $1`)).
		WithArgs(1).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.DeleteUser(1)
	assert.NoError(t, err)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
