# Contributing to opa-ai

A property assessment appeal tool for Philadelphia homeowners — find
comparable, lower-assessed nearby homes and generate an appeal PDF, using
the City of Philadelphia's public OPA dataset. Contributions — UI
improvements, better comp-matching logic, bug fixes — are welcome.

## Getting started

```
git clone https://github.com/zackwag/opa-ai.git
cd opa-ai
npm install
```

## Development

```
npm run dev
```

Runs the Vite dev server. No API key is required — data comes from the
public City of Philadelphia Carto SQL API.

Run tests and lint before submitting:

```
npm test
npm run lint
```

Build for production:

```
npm run build
```

## Commit messages and pull requests

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, etc.). Pull requests are squash-merged, and the **PR title** becomes the commit on `main` — so PR titles must follow this format. This is enforced automatically by the "Conventional Commits" check.

Direct pushes to `main` are allowed but must also use a Conventional Commits-formatted commit message (validated by the same check).

## Opening a pull request

1. Fork the repo and create a branch off `main`.
2. Make your changes.
3. Open a pull request with a Conventional Commits-formatted title.
4. Wait for CI to pass — required checks must be green before merge.

## Reporting issues

Use [GitHub Issues](../../issues) for bugs and feature requests.
