# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Teli

Teli is a social TV show tracking and rating application. Users can browse/search shows (via TMDB), rate them, maintain watch lists, follow other users, and see a social activity feed.

## Commands

### Running the App

```bash
# Backend (runs on port 5001)
cd backend && python app.py

# Frontend (runs on port 3000)
cd frontend && npm start
```

### Running Tests

```bash
# Run all backend tests (from repo root — pytest.ini sets pythonpath=backend)
pytest

# Run a single test file
pytest backend/tests/test_user_search.py

# Run a single test class/method
pytest backend/tests/test_user_search.py::TestUserSearch::test_search_by_username
```

### Linting

```bash
# Backend
flake8

# Frontend
cd frontend && npm run lint
```

### Build (for deployment)

```bash
npm run build   # builds frontend via package.json at repo root
```

### Kill dev servers

```bash
lsof -ti:3000 | xargs kill -9 && lsof -ti:5001 | xargs kill -9
```

## Architecture

### Backend (Flask + Firebase)

The backend is a Flask app (`backend/app.py`) that uses the application factory pattern (`create_app()`). It registers three blueprints, all under the `/api` prefix:

- **`tmdb_routes.py`** — Proxies requests to the TMDB API (show search, details, popular shows, episode info). TMDB auth token is read from `TMDB_API_KEY` env var or falls back to `backend/authorizationToken.txt`.
- **`teli_routes.py`** — Core Teli data: users, ratings, follow relationships, watch statuses, activity feed, popular shows (computed from Firestore).
- **`auth_routes.py`** — Google OAuth flow.

**Database**: Firebase Firestore, initialized in `firebase_db.py`. Credentials come from `FIREBASE_SERVICE_ACCOUNT_JSON` env var (production) or `backend/serviceAccountKey.json` (local dev). The `db` object is imported by routes.

**Request validation**: Pydantic `BaseModel` subclasses are used to validate all incoming request bodies. Validation errors return 400 with the Pydantic error detail.

**Tests**: Integration tests in `backend/tests/` use real Firestore (via `conftest.py` fixtures `get_client` and `get_db`). Tests create and clean up their own Firestore documents.

### Frontend (React + TypeScript)

Single-page app bootstrapped with Create React App. Entry: `frontend/src/App.tsx`.

**Routing**: React Router. Protected routes (require auth) wrap pages in `<ProtectedRoute>`. Public routes include `/browse`, `/search`, `/login`, `/show/:id`.

**Auth state**: `UserContext.tsx` provides `userId` (Firestore user document ID, stored in `localStorage`) and `loadingUser` via `useUser()` hook. Auth is simple: after login, the Firestore user doc ID is stored client-side.

**API calls**: All frontend API calls go through `process.env.REACT_APP_API_URL` (set to the backend base URL). Use `axios` for HTTP requests.

**Pages** (`frontend/src/pages/`): `home`, `browse`, `search`, `showDetails`, `profile`, `editProfile`, `activity`, `yourShows`, `followers`, `following`, `login`, `onboarding`.

**Components** (`frontend/src/components/`): `ReviewCard`, `ShowsGrid`, `ShowTooltip`, `UserList`, `MultiSelectDropdown`, `SingleSelectDropdown`, `ProtectedRoute`, `ProtectedSection`, `GeneratePageDots`, `formatRelativeTime`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase credentials JSON (single-line string) |
| `TMDB_API_KEY` | TMDB Bearer token |
| `REACT_APP_API_URL` | Frontend → backend base URL (e.g. `http://localhost:5001/api`) |

For local dev, backend env vars go in `backend/.env`. The test account is `hi@hello.com` / `applejacks`.

## Code Style

### Backend (Python)

- `snake_case` for functions and variables; `CamelCase` for classes; `UPPER_SNAKE_CASE` for constants.
- Always assign return values to a variable first; use a single `return` at the end of functions.
- Avoid reassigning the same variable (treat variables as final after assignment).
- Use specific `except` clauses; log errors with `logger.error()`.
- Keep functions under ~50 lines; keep files under ~500 lines.

### Frontend (TypeScript/React)

- Functional components with hooks only — no class components.
- Define TypeScript `interface` for all component props; avoid `any`.
- Always use real API data — no hardcoded mock arrays.
- Always implement loading and error states when fetching.
- Use `React Context` (`useUser`) for global auth state; keep other state local.
- Only make **titles** clickable in card layouts — do not wrap entire cards in `<Link>`.
- Images must have `onError` fallback handlers.

## API Documentation

When adding a new backend endpoint, update `backend/API_DOCUMENTATION.md` with: URL, method, parameters, example request/response, and error responses. See `.clinerules/api_documentation.md` for the required format.
