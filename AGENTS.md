# AGENTS.md

## Project overview

opa-ai is a React + Vite web app that helps Philadelphia homeowners appeal
their property tax assessment: it finds comparable, lower-assessed nearby
homes via the City of Philadelphia's public OPA/Carto SQL API and generates
an appeal PDF. No API key required.

## Setup

```
npm install
```

## Build / Run

```
npm run dev      # Vite dev server
npm run build     # production build
npm run preview   # preview the production build
```

Also runnable via Docker — see `Dockerfile` and `nginx.conf`.

## Test

```
npm test
```

Runs `vitest run`. Test files are colocated in `src/` (`*.test.js`).

## Lint / Format

```
npm run lint
```

Runs `oxlint`.

## Repository structure

- `src/App.jsx` — main app component
- `src/api.js` — Carto SQL API client
- `src/PropertyMap.jsx` — Leaflet map of property + comps
- `src/generatePdf.js` — jsPDF appeal report generation
- `src/AddressAutocomplete.jsx`, `src/Tooltip.jsx` — UI components
- `src/glossary.js`, `src/fields.json` — assessment field metadata
- `public/` — static assets

## Commit and PR conventions

- Commit messages and PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `build:`, `perf:`, `style:`, `revert:`), optionally with a scope, e.g. `fix(api): handle null response`.
- This repo squash-merges pull requests only; the PR title becomes the final commit message on `main`.
- A "Conventional Commits" CI check enforces this on both PR titles and direct-push commit messages.
- Branch protection on `main`: no force-pushes, no branch deletion, required status checks must pass.
