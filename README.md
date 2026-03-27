# go-auth-template

A minimal, production-friendly user authentication template for Go. It reduces boilerplate for common auth workflows using Gin, GORM, Postgres, bcrypt, and JWT. It ships with clean layering (controller → service → repository), auth middleware, cookie-based JWT session handling, migrations, CORS, health checks, and tests (including Docker-backed integration tests).

Background and inspiration: I built this primarily for my own learning and because I was tired of rewriting the same boilerplate for every new project. The structure and setup were influenced by Melkey's go-blueprint: https://github.com/Melkeydev/go-blueprint.

## Features

- RESTful auth endpoints: register, login, me, logout, change password, delete account
- Cookie-based JWT authentication (HTTP-only cookie named `Authorization`)
- Password hashing with bcrypt
- Postgres with GORM ORM and a simple migration entrypoint
- Config via environment variables, auto-loaded from `.env`
- CORS configured for credentialed requests
- Health endpoint and graceful shutdown
- Unit tests and integration tests using Testcontainers

## Tech Stack

- Go (Gin HTTP framework)
- GORM with Postgres driver
- JWT (github.com/golang-jwt/jwt/v5)
- bcrypt (golang.org/x/crypto/bcrypt)
- Testcontainers for integration testing

## Project Structure

```
cmd/
	api/
		main.go                 # server startup with graceful shutdown
internal/
	database/                # DB service, health, connection management
	middlewares/             # auth middleware (JWT + DB lookup)
	models/                  # GORM models (User)
	server/                  # HTTP server, routes, CORS, health
	user/                    # auth module: DTOs, repository, service, controller
	utils/                   # bcrypt and JWT helpers
migrate/
	migrate.go               # simple migration runner (AutoMigrate)
Makefile                   # common tasks (run, test, docker, watch)
docker-compose.yml         # Postgres service for local dev
```

## Environment Variables

This project uses `github.com/joho/godotenv/autoload`, so variables from a `.env` file in the repository root will be loaded automatically for the API and migrations. Docker Compose also reads `.env`.

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

Required variables:

- Server
	- `PORT` (e.g., 8080)
	- `SECRET_KEY` – HMAC secret for signing JWTs
	- `COOKIE_DOMAIN` – domain to set on the `Authorization` cookie (e.g., `localhost`)
- Database
	- `BLUEPRINT_DB_HOST` (e.g., `localhost`)
	- `BLUEPRINT_DB_PORT` (e.g., `5432`)
	- `BLUEPRINT_DB_USERNAME`
	- `BLUEPRINT_DB_PASSWORD`
	- `BLUEPRINT_DB_DATABASE`
	- `BLUEPRINT_DB_SCHEMA` (e.g., `public`)

## Quickstart

1) Start Postgres with Docker Compose:

```bash
make docker-run
```

2) Run migrations:

```bash
go run migrate/migrate.go
```

3) Start the API:

```bash
make run
```

The server listens on `:$PORT`.

## CORS and Frontend

`internal/server/routes.go` enables CORS with credentials for `http://localhost:5173` by default. If your frontend runs elsewhere, update the `AllowOrigins` list.

To make authenticated browser requests, ensure your frontend sends credentials (cookies) with each request.

## Auth Model

- On register and login, the server returns a JWT access token and sets an HTTP-only cookie `Authorization` with the token value. SameSite is set to Lax.
- Token expiration is 7 days. The cookie lifetime is configured in the controller (currently 30 days). Clients should handle 401 responses and re-authenticate when the token is expired.
- Protected routes require the cookie and will fetch the user from the database by the token subject (`sub`).

## API Endpoints

Base URL: `http://localhost:$PORT`

- GET `/` – Hello world
- GET `/health` – Database health stats

Auth routes (all under `/auth`):

- POST `/auth/register`
	- Body: `{ "name": string, "email": string, "password": string(min 6) }`
	- Effects: Creates user, sets `Authorization` cookie, returns `token` and user info
	- Responses: `201 Created` on success

- POST `/auth/login`
	- Body: `{ "email": string, "password": string }`
	- Effects: Verifies credentials, sets `Authorization` cookie, returns `token` and user info
	- Responses: `201 Created` on success, `401 Unauthorized` on invalid credentials

- GET `/auth/me` (protected)
	- Reads user from `Authorization` cookie
	- Responses: `200 OK` with `{ id, name, email }`, or `401 Unauthorized`

- POST `/auth/logout` (protected)
	- Clears the `Authorization` cookie
	- Responses: `200 OK`

- POST `/auth/change-password` (protected)
	- Body: `{ "old_password": string, "new_password": string(min 6) }`
	- Effects: Validates old password and updates to hashed new password
	- Responses: `200 OK` or `400 Bad Request`

- DELETE `/auth/delete-account` (protected)
	- Effects: Deletes the current user and clears cookie
	- Responses: `200 OK`

### cURL examples

Register:

```bash
curl -i \
	-H 'Content-Type: application/json' \
	-d '{"name":"Alice","email":"alice@example.com","password":"secret123"}' \
	http://localhost:$PORT/auth/register
```

Login:

```bash
curl -i \
	-H 'Content-Type: application/json' \
	-d '{"email":"alice@example.com","password":"secret123"}' \
	http://localhost:$PORT/auth/login
```

Me (reusing the cookie captured from the previous response headers):

```bash
curl -i \
	--cookie 'Authorization=YOUR_JWT' \
	http://localhost:$PORT/auth/me
```

## Database and Migrations

This template uses GORM with Postgres. The `migrate/migrate.go` file connects using the environment variables above and runs `AutoMigrate` for `internal/models.User`.

Run migrations:

```bash
go run migrate/migrate.go
```

## Makefile Targets

- `make all` – build and test
- `make build` – build binary to `./main`
- `make run` – run the API
- `make docker-run` – start Postgres via Docker Compose
- `make docker-down` – stop Postgres
- `make test` – run all tests
- `make itest` – run database integration tests only
- `make clean` – remove `./main`
- `make watch` – live reload using `air` (prompts to install if missing)

## Testing

- Unit tests: `go test ./... -v`
- Integration tests: `make itest` (uses Testcontainers; Docker must be running)

Notable tests:

- `internal/server/routes_test.go` covers the hello world handler
- `internal/database/database_test.go` boots a real Postgres container and validates connection health and lifecycle

## Implementation Notes

- JWT signing uses `HS256` with `SECRET_KEY`. Claims include `sub` (user ID) and `exp` (expiration).
- The auth middleware reads the `Authorization` cookie, validates the token, loads the user by ID, and sets `c.Set("user", models.User)` for downstream handlers.
- CORS is configured with `AllowCredentials: true` and `AllowOrigins: ["http://localhost:5173"]`. Update this for your frontend.
- Graceful shutdown is implemented in `cmd/api/main.go` and handles SIGINT/SIGTERM with a 5s drain period.


## Contributing

Contributions are welcome. See `CONTRIBUTING.md` for how to get started, coding standards, and the PR process.

## Security

If you discover a vulnerability, please follow the guidance in `SECURITY.md` and do not open a public issue.

## License

MIT. See `LICENSE` for details.

