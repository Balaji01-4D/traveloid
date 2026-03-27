# Contributing

Thanks for your interest in contributing. This project is a learning-oriented template to reduce boilerplate when starting new Go auth services.

## How to contribute

- Fork the repository and create your branch from `main`.
- If you’ve added code that should be tested, add tests.
- Ensure the code builds and tests pass locally.
- Open a pull request with a clear description and context.

## Development setup

- Copy `.env.example` to `.env` and set values.
- Start Postgres: `make docker-run`
- Run migrations: `go run migrate/migrate.go`
- Start API: `make run`
- Run tests: `make test` (integration tests require Docker running)

## Coding standards

- Keep the layering: controller → service → repository.
- Prefer small, focused packages in `internal/`.
- Handle errors explicitly and return typed/clear errors where useful.
- Keep public APIs and behavior documented in README when changed.

## Commit messages

- Use concise, descriptive messages, e.g.:
  - feat(user): add change-password endpoint
  - fix(db): ensure connection reuse in New()
  - test(server): add hello world handler test

## Pull request process

- Link related issues if any.
- Describe the change, motivation, and any risks or breaking changes.
- Include before/after behavior if applicable.
- Maintainers will review for correctness, tests, and docs.

## Code of conduct

Please be respectful and constructive. Report unacceptable behavior via a private channel rather than public issues.
