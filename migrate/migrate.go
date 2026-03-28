package main

import (
	"fmt"
	"go-auth-template/internal/models"
	"os"

	_ "github.com/joho/godotenv/autoload"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Migrate() {
	dsn := os.Getenv("DIRECT_URL")

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		panic("failed to connect database")
	}

	// Migrate enum types
	MigrateEnum(db)

	// Migrate the schema
	err = db.AutoMigrate(&models.Organisation{})
	err = db.AutoMigrate(&models.Member{})
	err = db.AutoMigrate(&models.Place{})
	if err != nil {
		panic("failed to migrate database")
	}

	fmt.Println("Database migration completed successfully.")
}

func MigrateEnum(db *gorm.DB) {
	db.Exec(`
DO $$ BEGIN
	CREATE TYPE role_enum AS ENUM ('admin', 'member');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
`)
}

func main() {
	Migrate()
}
