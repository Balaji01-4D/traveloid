package member_test

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"go-auth-template/internal/member"
	"go-auth-template/internal/utils"
)

func TestService_GetUser(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, _ := gorm.Open(dialector, &gorm.Config{})

	repo := member.NewRepository(gormDB)
	service := member.NewService(repo)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE "users"."id" = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email"}).AddRow(1, "Alice", "alice@example.com"))

	u, err := service.GetUser(1)
	assert.NoError(t, err)
	assert.NotNil(t, u)
	assert.Equal(t, int64(1), u.ID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestService_AuthenticateUser(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, _ := gorm.Open(dialector, &gorm.Config{})

	repo := member.NewRepository(gormDB)
	service := member.NewService(repo)

	hashedPassword, _ := utils.HashPassword("password123")

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE email = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs("alice@example.com", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
			AddRow(1, "Alice", "alice@example.com", hashedPassword))

	u, err := service.AuthenticateUser("alice@example.com", "password123")
	assert.NoError(t, err)
	assert.NotNil(t, u)
	assert.Equal(t, int64(1), u.ID)

	// Test invalid password
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE email = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs("alice@example.com", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
			AddRow(1, "Alice", "alice@example.com", hashedPassword))

	uWrong, errWrong := service.AuthenticateUser("alice@example.com", "wrongpass")
	assert.Error(t, errWrong)
	assert.Nil(t, uWrong)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestService_ChangePassword(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{Conn: db, DriverName: "postgres"})
	gormDB, _ := gorm.Open(dialector, &gorm.Config{})

	repo := member.NewRepository(gormDB)
	service := member.NewService(repo)

	hashedPassword, _ := utils.HashPassword("oldpassword123")

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE "users"."id" = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "email", "password"}).
			AddRow(1, "Alice", "alice@example.com", hashedPassword))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "users" SET "name"=$1,"email"=$2,"password"=$3 WHERE "id" = $4`)).
		WithArgs("Alice", "alice@example.com", sqlmock.AnyArg(), 1).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err = service.ChangePassword(1, "oldpassword123", "newpassword456")
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}
