# Teli API Documentation

This document provides comprehensive documentation for all API endpoints in the Teli application. It's designed to help frontend developers understand and use the backend services effectively.

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:5001/api
```

## Table of Contents

- [General Information](#general-information)
  - [Error Handling](#error-handling)
  - [Authentication](#authentication)
- [Authentication Endpoints](#authentication-endpoints)
  - [Google Authentication](#google-authentication)
  - [Verify User](#verify-user)
- [TMDB Endpoints](#tmdb-endpoints)
  - [Search Shows](#search-shows)
  - [Filter Shows](#filter-shows)
  - [Get Show Details](#get-show-details)
  - [Get Content Ratings](#get-content-ratings)
  - [Get Season Details](#get-season-details)
  - [Get Episode Details](#get-episode-details)
  - [Get Genres](#get-genres)
  - [Get Languages](#get-languages)
  - [Get Countries](#get-countries)
- [User Endpoints](#user-endpoints)
  - [Add User](#add-user)
  - [Get User](#get-user)
  - [Get All Users](#get-all-users)
  - [Search Users](#search-users)
  - [Get Popular Users](#get-popular-users)
- [Social Endpoints](#social-endpoints)
  - [Follow User](#follow-user)
  - [Unfollow User](#unfollow-user)
  - [Get Following](#get-following)
  - [Get Followers](#get-followers)
  - [Get User Feed](#get-user-feed)
- [Rating Endpoints](#rating-endpoints)
  - [Add Rating](#add-rating)
  - [Get User Ratings](#get-user-ratings)
  - [Search User Rated Shows](#search-user-rated-shows)
  - [Get Show Ratings](#get-show-ratings)
  - [Get Show Average Rating](#get-show-average-rating)
  - [Get Followed Users' Show Reviews](#get-followed-users-show-reviews)
  - [Get Popular Shows](#get-popular-shows)
  - [Get Suggested Shows](#get-suggested-shows)
- [Episode Rating Endpoints](#episode-rating-endpoints)
  - [Add Episode Rating](#add-episode-rating)
  - [Get Episode Ratings](#get-episode-ratings)
  - [Get Episode Average Rating](#get-episode-average-rating)
  - [Get Followed Users' Episode Reviews](#get-followed-users-episode-reviews)
- [Watch Status Endpoints](#watch-status-endpoints)
  - [Update Watch Status](#update-watch-status)
  - [Get Currently Watching](#get-currently-watching)
  - [Get Want to Watch](#get-want-to-watch)
  - [Get Watched](#get-watched)
  - [Get Watch Status](#get-watch-status)
  - [Delete Watch Status](#delete-watch-status)
- [Watchlist Endpoints](#watchlist-endpoints)
  - [Add to Watchlist](#add-to-watchlist)
- [Common Data Structures](#common-data-structures)
  - [User Object](#user-object)
  - [Show Object](#show-object)
  - [Rating Object](#rating-object)
  - [Watch Status Object](#watch-status-object)
  - [Feed Item Object](#feed-item-object)

## General Information

### Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server-side error

For validation errors, the response will include detailed error information:

```json
{
  "errors": [
    {
      "loc": ["field_name"],
      "msg": "Error message for this field",
      "type": "error_type"
    }
  ]
}
```

### Authentication

The API uses Google OAuth for authentication. Users authenticate via Google and receive a user ID that should be stored and used for subsequent requests.

## Authentication Endpoints

These endpoints handle user authentication via Google OAuth.

### Google Authentication

Authenticate a user with a Google OAuth token. Creates a new user if they don't exist.

**URL**: `/auth/google`

**Method**: `POST`

**Request Body**:

| Field | Type   | Required | Description                    |
|-------|--------|----------|--------------------------------|
| token | string | Yes      | Google OAuth JWT token         |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/auth/google" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI..."
  }'
```

**Example Response (Existing User)**:

```json
{
  "message": "Login successful",
  "user": {
    "id": "user123",
    "google_id": "google123",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "user",
    "picture": "https://example.com/picture.jpg",
    "created_at": "2023-05-31T12:34:56.789Z",
    "last_login": "2024-05-30T14:22:10Z"
  }
}
```

**Example Response (New User)**:

```json
{
  "message": "User created successfully",
  "user": {
    "id": "newuser123",
    "google_id": "google456",
    "email": "newuser@example.com",
    "name": "Jane Smith",
    "username": "newuser",
    "picture": "https://example.com/picture.jpg",
    "created_at": "2024-05-30T14:22:10Z",
    "last_login": "2024-05-30T14:22:10Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Missing token
  ```json
  {
    "errors": [
      {
        "loc": ["token"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `401 Unauthorized`: Invalid token
  ```json
  {
    "error": "Invalid token format"
  }
  ```
- `401 Unauthorized`: Invalid Google token
  ```json
  {
    "error": "Invalid Google token"
  }
  ```
- `500 Internal Server Error`: Authentication failed
  ```json
  {
    "error": "Authentication failed"
  }
  ```

### Verify User

Verify if a user ID is valid. Used for checking authentication status.

**URL**: `/auth/verify`

**Method**: `GET`

**Headers**:

| Header    | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| X-User-ID | string | Yes      | The user ID to verify      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/auth/verify" \
  -H "X-User-ID: user123"
```

**Example Response**:

```json
{
  "valid": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "user",
    "google_id": "google123",
    "picture": "https://example.com/picture.jpg"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: No user ID provided
  ```json
  {
    "error": "No user ID provided"
  }
  ```
- `401 Unauthorized`: Invalid user ID
  ```json
  {
    "error": "Invalid user ID"
  }
  ```
- `500 Internal Server Error`: Verification failed
  ```json
  {
    "error": "Verification failed"
  }
  ```

## TMDB Endpoints

These endpoints interact with The Movie Database (TMDB) API to provide information about TV shows.

### Search Shows

Search for TV shows by name.

**URL**: `/shows/search`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| query     | string | Yes      | The search term to find TV shows           |
| page      | number | No       | Page number for pagination (default: 1)    |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/search?query=breaking%20bad&page=1"
```

**Example Response**:

```json
{
  "results": [
    {
      "backdrop_path": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
      "genre_ids": [18, 80],
      "id": 1396,
      "origin_country": ["US"],
      "original_language": "en",
      "original_name": "Breaking Bad",
      "overview": "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future at any cost as he enters the dangerous world of drugs and crime.",
      "popularity": 380.063,
      "poster_path": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      "first_air_date": "2008-01-20",
      "name": "Breaking Bad"
    }
    // Additional results...
  ],
  "total_pages": 5,
  "total_results": 98
}
```

**Error Responses**:

- `400 Bad Request`: Missing query parameter
  ```json
  {
    "error": "Missing 'query' parameter"
  }
  ```
- `400 Bad Request`: Invalid page parameter
  ```json
  {
    "error": "Page parameter must be a positive integer"
  }
  ```
- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Filter Shows

Filter TV shows by various criteria.

**URL**: `/shows/filter`

**Method**: `GET`

**Query Parameters**:

| Parameter                    | Type   | Required | Description                                                |
|------------------------------|--------|----------|------------------------------------------------------------|
| page                         | number | No       | Page number for pagination (default: 1)                    |
| air_date.gte                 | string | No       | Min air date (YYYY-MM-DD)                                  |
| air_date.lte                 | string | No       | Max air date (YYYY-MM-DD)                                  |
| first_air_date_year          | number | No       | Filter by year of first air date                           |
| first_air_date.gte           | string | No       | Min first air date (YYYY-MM-DD)                            |
| first_air_date.lte           | string | No       | Max first air date (YYYY-MM-DD)                            |
| include_adult                | boolean| No       | Include adult content (default: false)                     |
| include_null_first_air_dates | boolean| No       | Include shows with no air date (default: false)            |
| language                     | string | No       | Language code (default: en-US)                             |
| sort_by                      | string | No       | Sort order (default: popularity.desc)                      |
| vote_average.gte             | number | No       | Min vote average                                           |
| vote_average.lte             | number | No       | Max vote average                                           |
| vote_count.gte               | number | No       | Min vote count                                             |
| vote_count.lte               | number | No       | Max vote count                                             |
| with_genres                  | string | No       | Filter by genre IDs (comma separated)                      |
| with_networks                | string | No       | Filter by network IDs (comma separated)                    |
| with_origin_country          | string | No       | Filter by origin country (ISO 3166-1 code)                 |
| with_original_language       | string | No       | Filter by original language (ISO 639-1 code)               |
| with_runtime.gte             | number | No       | Min runtime in minutes                                     |
| with_runtime.lte             | number | No       | Max runtime in minutes                                     |
| with_status                  | string | No       | Filter by show status                                      |
| with_type                    | string | No       | Filter by show type                                        |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/filter?sort_by=popularity.desc&with_original_language=en&first_air_date.gte=2020-01-01&first_air_date.lte=2023-12-31&with_genres=18&page=1"
```

**Example Response**:

```json
{
  "results": [
    {
      "backdrop_path": "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
      "genre_ids": [18, 10765],
      "id": 66732,
      "origin_country": ["US"],
      "original_language": "en",
      "original_name": "Stranger Things",
      "overview": "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
      "popularity": 675.042,
      "poster_path": "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      "first_air_date": "2016-07-15",
      "name": "Stranger Things"
    }
    // Additional results...
  ],
  "total_pages": 20,
  "total_results": 384
}
```

**Error Responses**:

- `400 Bad Request`: Invalid date format
  ```json
  {
    "error": "Invalid date format for first_air_date.gte. Use YYYY-MM-DD"
  }
  ```
- `400 Bad Request`: Invalid numeric parameter
  ```json
  {
    "error": "Parameter vote_average.gte must be a number"
  }
  ```
- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Show Details

Get detailed information about a specific TV show.

**URL**: `/shows/:series_id`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| series_id | string | Yes      | The ID of the TV show      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/1396"
```

**Example Response**:

```json
{
  "backdrop_path": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
  "created_by": [
    {
      "id": 66633,
      "credit_id": "52542286760ee31328001a7b",
      "name": "Vince Gilligan",
      "gender": 2,
      "profile_path": "/lYqC8Amj4owX05xQg5Yo7EUPLOg.jpg"
    }
  ],
  "episode_run_time": [45, 47],
  "first_air_date": "2008-01-20",
  "genres": [
    {
      "id": 18,
      "name": "Drama"
    },
    {
      "id": 80,
      "name": "Crime"
    }
  ],
  "id": 1396,
  "in_production": false,
  "languages": ["en"],
  "last_air_date": "2013-09-29",
  "last_episode_to_air": {
    "id": 62161,
    "name": "Felina",
    "overview": "All bad things must come to an end.",
    "vote_average": 9.2,
    "vote_count": 175,
    "air_date": "2013-09-29",
    "episode_number": 16,
    "episode_type": "finale",
    "production_code": "",
    "runtime": 56,
    "season_number": 5,
    "show_id": 1396,
    "still_path": "/pA0YwyhvdDXP3BEGL2grrIhq8aM.jpg"
  },
  "name": "Breaking Bad",
  "next_episode_to_air": null,
  "networks": [
    {
      "id": 174,
      "logo_path": "/alqLicR1ZMHMaZGP3xRQxn9sq7p.png",
      "name": "AMC",
      "origin_country": "US"
    }
  ],
  "number_of_episodes": 62,
  "number_of_seasons": 5,
  "origin_country": ["US"],
  "original_language": "en",
  "original_name": "Breaking Bad",
  "overview": "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future at any cost as he enters the dangerous world of drugs and crime.",
  "poster_path": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
  "production_companies": [
    {
      "id": 11073,
      "logo_path": "/aCbASRcI1MI7DXjPbSW9Fcv9uGR.png",
      "name": "Sony Pictures Television Studios",
      "origin_country": "US"
    },
    {
      "id": 33742,
      "logo_path": null,
      "name": "High Bridge Productions",
      "origin_country": "US"
    },
    {
      "id": 2605,
      "logo_path": null,
      "name": "Gran Via Productions",
      "origin_country": "US"
    }
  ],
  "production_countries": [
    {
      "iso_3166_1": "US",
      "name": "United States of America"
    }
  ],
  "seasons": [
    {
      "air_date": "2009-02-17",
      "episode_count": 5,
      "id": 3577,
      "name": "Specials",
      "overview": "",
      "poster_path": "/40dT79mDEZwXkQlPUCpKGNMhRqN.jpg",
      "season_number": 0,
      "vote_average": 0.0
    },
    {
      "air_date": "2008-01-20",
      "episode_count": 7,
      "id": 3572,
      "name": "Season 1",
      "overview": "High school chemistry teacher Walter White's life is suddenly transformed by a dire medical diagnosis. Street-savvy former student Jesse Pinkman \"teaches\" Walter a new trade.",
      "poster_path": "/1BP4xYv9ZG4ZVHkL7ocOziBbSYH.jpg",
      "season_number": 1,
      "vote_average": 8.3
    }
    // Additional seasons...
  ],
  "spoken_languages": [
    {
      "english_name": "English",
      "iso_639_1": "en",
      "name": "English"
    }
  ],
  "status": "Ended",
  "tagline": "Remember my name",
  "type": "Scripted"
}
```

**Error Responses**:

- `404 Not Found`: Show not found
  ```json
  {
    "error": "The resource you requested could not be found"
  }
  ```
- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Content Ratings

Get content ratings for a specific TV show.

**URL**: `/shows/content-ratings/:series_id`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| series_id | string | Yes      | The ID of the TV show      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/content-ratings/1396"
```

**Example Response**:

```json
{
  "id": 1396,
  "results": [
    {
      "descriptors": [],
      "iso_3166_1": "US",
      "rating": "TV-MA"
    },
    {
      "descriptors": [],
      "iso_3166_1": "DE",
      "rating": "16"
    },
    {
      "descriptors": [],
      "iso_3166_1": "FR",
      "rating": "16"
    }
    // Additional ratings...
  ]
}
```

**Error Responses**:

- `404 Not Found`: Show not found
  ```json
  {
    "error": "The resource you requested could not be found"
  }
  ```
- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Season Details

Get detailed information about a specific season of a TV show.

**URL**: `/shows/:series_id/season/:season_number`

**Method**: `GET`

**URL Parameters**:

| Parameter     | Type   | Required | Description                |
|---------------|--------|----------|----------------------------|
| series_id     | string | Yes      | The ID of the TV show      |
| season_number | number | Yes      | The season number          |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/1396/season/1"
```

**Example Response**:

```json
{
  "_id": "5256c89f19c2956ff6046d47",
  "air_date": "2008-01-20",
  "episodes": [
    {
      "air_date": "2008-01-20",
      "episode_number": 1,
      "id": 62085,
      "name": "Pilot",
      "overview": "When an unassuming high school chemistry teacher discovers he has a rare form of lung cancer, he decides to team up with a former student and create a top of the line crystal meth in a used RV, to provide for his family once he is gone.",
      "production_code": "",
      "runtime": 58,
      "season_number": 1,
      "show_id": 1396,
      "still_path": "/ydlY3iPfeOAvu8gVqrxPoMvzNCn.jpg",
      "vote_average": 7.9,
      "vote_count": 155,
      "crew": [
        {
          "department": "Directing",
          "job": "Director",
          "credit_id": "52542275760ee313280006ce",
          "adult": false,
          "gender": 2,
          "id": 66633,
          "known_for_department": "Writing",
          "name": "Vince Gilligan",
          "original_name": "Vince Gilligan",
          "popularity": 4.953,
          "profile_path": "/lYqC8Amj4owX05xQg5Yo7EUPLOg.jpg"
        }
      ],
      "guest_stars": [
        {
          "character": "Krazy-8",
          "credit_id": "52542275760ee313280006e4",
          "order": 0,
          "adult": false,
          "gender": 2,
          "id": 92495,
          "known_for_department": "Acting",
          "name": "Max Arciniega",
          "original_name": "Max Arciniega",
          "popularity": 3.262,
          "profile_path": "/zRIINchwAhqnkZ1jnWqWPLjQSaO.jpg"
        }
      ]
    },
    {
      "air_date": "2008-01-27",
      "episode_number": 2,
      "id": 62086,
      "name": "Cat's in the Bag...",
      "overview": "Walt and Jesse attempt to tie up loose ends. The desperate situation gets more complicated with the flip of a coin. Walt's wife, Skyler, becomes suspicious of Walt's strange behavior.",
      "production_code": "",
      "runtime": 48,
      "season_number": 1,
      "show_id": 1396,
      "still_path": "/tjDNvbokPLtEnpFyFPyXMoMHRnT.jpg",
      "vote_average": 7.9,
      "vote_count": 125
    }
    // Additional episodes...
  ],
  "name": "Season 1",
  "overview": "High school chemistry teacher Walter White's life is suddenly transformed by a dire medical diagnosis. Street-savvy former student Jesse Pinkman \"teaches\" Walter a new trade.",
  "id": 3572,
  "poster_path": "/1BP4xYv9ZG4ZVHkL7ocOziBbSYH.jpg",
  "season_number": 1
}
```

**Error Responses**:

- `400 Bad Request`: Invalid parameters
  ```json
  {
    "error": "Season number must be an integer"
  }
  ```
- `404 Not Found`: Season not found
  ```json
  {
    "error": "The resource you requested could not be found"
  }
  ```
- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Episode Details

Get detailed information about a specific episode of a TV show.

**URL**: `/shows/:series_id/season/:season_number/episode/:episode_number`

**Method**: `GET`

**URL Parameters**:

| Parameter      | Type   | Required | Description                |
|----------------|--------|----------|----------------------------|
| series_id      | string | Yes      | The ID of the TV show      |
| season_number  | number | Yes      | The season number          |
| episode_number | number | Yes      | The episode number         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/1396/season/1/episode/1"
```

**Example Response**:

```json
{
  "air_date": "2008-01-20",
  "crew": [
    {
      "department": "Directing",
      "job": "Director",
      "credit_id": "52542275760ee313280006ce",
      "adult": false,
      "gender": 2,
      "id": 66633,
      "known_for_department": "Writing",
      "name": "Vince Gilligan",
      "original_name": "Vince Gilligan",
      "popularity": 4.953,
      "profile_path": "/lYqC8Amj4owX05xQg5Yo7EUPLOg.jpg"
    },
    {
      "department": "Writing",
      "job": "Writer",
      "credit_id": "52542275760ee313280006d4",
      "adult": false,
      "gender": 2,
      "id": 66633,
      "known_for_department": "Writing",
      "name": "Vince Gilligan",
      "original_name": "Vince Gilligan",
      "popularity": 4.953,
      "profile_path": "/lYqC8Amj4owX05xQg5Yo7EUPLOg.jpg"
    }
  ],
  "episode_number": 1,
  "guest_stars": [
    {
      "character": "Krazy-8",
      "credit_id": "52542275760ee313280006e4",
      "order": 0,
      "adult": false,
      "gender": 2,
      "id": 92495,
      "known_for_department": "Acting",
      "name": "Max Arciniega",
      "original_name": "Max Arciniega",
      "popularity": 3.262,
      "profile_path": "/zRIINchwAhqnkZ1jnWqWPLjQSaO.jpg"
    }
  ],
  "id": 62085,
  "name": "Pilot",
  "overview": "When an unassuming high school chemistry teacher discovers he has a rare form of lung cancer, he decides to team up with a former student and create a top of the line crystal meth in a used RV, to provide for his family once he is gone.",
  "production_code": "",
  "runtime": 58,
  "season_number": 1,
  "still_path": "/ydlY3iPfeOAvu8gVqrxPoMvzNCn.jpg",
  "vote_average": 7.9,
  "vote_count": 155
}
```

**Error Responses**:

- `400 Bad Request`: Invalid parameters
  ```json
  {
    "error": "Season number and episode number must be integers"
  }
  ```
- `404 Not Found`: Episode not found
  ```json
  {
    "error": "The resource you requested could not be found"
  }
  ```
- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Genres

Get a list of TV show genres.

**URL**: `/genres`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| name      | string | No       | Filter genres by name (case-insensitive)   |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/genres"
```

**Example Response**:

```json
{
  "data": [
    {
      "id": 10759,
      "name": "Action & Adventure"
    },
    {
      "id": 16,
      "name": "Animation"
    },
    {
      "id": 35,
      "name": "Comedy"
    },
    {
      "id": 80,
      "name": "Crime"
    },
    {
      "id": 99,
      "name": "Documentary"
    },
    {
      "id": 18,
      "name": "Drama"
    },
    {
      "id": 10751,
      "name": "Family"
    },
    {
      "id": 10762,
      "name": "Kids"
    },
    {
      "id": 9648,
      "name": "Mystery"
    },
    {
      "id": 10763,
      "name": "News"
    },
    {
      "id": 10764,
      "name": "Reality"
    },
    {
      "id": 10765,
      "name": "Sci-Fi & Fantasy"
    },
    {
      "id": 10766,
      "name": "Soap"
    },
    {
      "id": 10767,
      "name": "Talk"
    },
    {
      "id": 10768,
      "name": "War & Politics"
    },
    {
      "id": 37,
      "name": "Western"
    }
  ]
}
```

**Error Responses**:

- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Languages

Get a list of available languages.

**URL**: `/languages`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| name      | string | No       | Filter languages by name (case-insensitive)|

**Example Request**:

```bash
curl -X GET "http://localhost:5001/languages"
```

**Example Response**:

```json
{
  "data": [
    {
      "iso_639_1": "aa",
      "english_name": "Afar",
      "name": ""
    },
    {
      "iso_639_1": "ab",
      "english_name": "Abkhazian",
      "name": ""
    },
    {
      "iso_639_1": "af",
      "english_name": "Afrikaans",
      "name": "Afrikaans"
    },
    {
      "iso_639_1": "ak",
      "english_name": "Akan",
      "name": ""
    },
    {
      "iso_639_1": "an",
      "english_name": "Aragonese",
      "name": ""
    },
    // Additional languages...
    {
      "iso_639_1": "en",
      "english_name": "English",
      "name": "English"
    },
    {
      "iso_639_1": "es",
      "english_name": "Spanish",
      "name": "Español"
    },
    {
      "iso_639_1": "fr",
      "english_name": "French",
      "name": "Français"
    }
    // Additional languages...
  ]
}
```

**Error Responses**:

- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

### Get Countries

Get a list of available countries.

**URL**: `/countries`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| name      | string | No       | Filter countries by name (case-insensitive)|

**Example Request**:

```bash
curl -X GET "http://localhost:5001/countries"
```

**Example Response**:

```json
{
  "data": [
    {
      "iso_3166_1": "AD",
      "english_name": "Andorra",
      "native_name": "Andorra"
    },
    {
      "iso_3166_1": "AE",
      "english_name": "United Arab Emirates",
      "native_name": "United Arab Emirates"
    },
    {
      "iso_3166_1": "AF",
      "english_name": "Afghanistan",
      "native_name": "Afghanistan"
    },
    // Additional countries...
    {
      "iso_3166_1": "US",
      "english_name": "United States of America",
      "native_name": "United States"
    },
    {
      "iso_3166_1": "GB",
      "english_name": "United Kingdom",
      "native_name": "United Kingdom"
    }
    // Additional countries...
  ]
}
```

**Error Responses**:

- `500 Internal Server Error`: TMDB API error
  ```json
  {
    "error": "TMDB API returned status 500"
  }
  ```

## User Endpoints

These endpoints manage user accounts and profiles.

### Add User

Create a new user account.

**URL**: `/add_user`

**Method**: `POST`

**Request Body**:

| Field    | Type   | Required | Description                |
|----------|--------|----------|----------------------------|
| name     | string | Yes      | User's full name           |
| username | string | Yes      | Unique username            |
| email    | string | Yes      | Valid email address        |
| bio      | string | No       | User biography             |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/add_user" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "bio": "TV show enthusiast"
  }'
```

**Example Response**:

```json
{
  "message": "User added successfully!",
  "id": "user123"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["email"],
        "msg": "value is not a valid email address",
        "type": "value_error.email"
      }
    ]
  }
  ```
- `409 Conflict`: Username already exists
  ```json
  {
    "error": "Username already exists"
  }
  ```
- `409 Conflict`: Email already exists
  ```json
  {
    "error": "Email already exists"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get User

Get a user's profile information.

**URL**: `/user/:user_id`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/user/user123"
```

**Example Response**:

```json
{
  "id": "user123",
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "bio": "TV show enthusiast",
  "created_at": "2023-05-31T12:34:56.789Z"
}
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get All Users

Get a list of all users.

**URL**: `/get_users`

**Method**: `GET`

**Example Request**:

```bash
curl -X GET "http://localhost:5001/get_users"
```

**Example Response**:

```json
[
  {
    "id": "user123",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "bio": "TV show enthusiast",
    "created_at": "2023-05-31T12:34:56.789Z"
  },
  {
    "id": "user456",
    "name": "Jane Smith",
    "username": "janesmith",
    "email": "jane@example.com",
    "bio": "Movie critic",
    "created_at": "2023-05-30T10:20:30.456Z"
  }
  // Additional users...
]
```

**Error Responses**:

- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Search Users

Search for users by username or name with case-insensitive prefix matching.

**URL**: `/users/search`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| query     | string | Yes      | The search term to find users              |
| page      | number | No       | Page number for pagination (default: 1)    |
| limit     | number | No       | Results per page (default: 20, max: 100)   |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/search?query=john"
```

**Example Request with Pagination**:

```bash
curl -X GET "http://localhost:5001/users/search?query=john&page=2&limit=10"
```

**Example Response**:

```json
{
  "results": [
    {
      "id": "user123",
      "name": "John Doe",
      "username": "john",
      "bio": "TV show enthusiast",
      "created_at": "2023-05-31T12:34:56.789Z"
    },
    {
      "id": "user456",
      "name": "Johnny Smith",
      "username": "johnny_s",
      "bio": "Movie critic",
      "created_at": "2023-05-30T10:20:30.456Z"
    },
    {
      "id": "user789",
      "name": "John Wilson",
      "username": "jwilson",
      "bio": "Binge watcher",
      "created_at": "2023-05-29T14:15:20.123Z"
    }
  ],
  "total_results": 15,
  "total_pages": 2,
  "current_page": 1,
  "limit": 20
}
```

**Search Behavior**:
- Case-insensitive prefix matching on both usernames and names
- Results are sorted by relevance:
  1. Exact username matches first
  2. Username prefix matches
  3. Name prefix matches
  4. Alphabetical fallback
- Sensitive fields (email, password) are automatically removed from results
- Supports pagination for large result sets

**Error Responses**:

- `400 Bad Request`: Missing query parameter
  ```json
  {
    "error": "Missing 'query' parameter"
  }
  ```
- `400 Bad Request`: Invalid page parameter
  ```json
  {
    "error": "Page parameter must be a positive integer"
  }
  ```
- `400 Bad Request`: Invalid limit parameter
  ```json
  {
    "error": "Limit parameter must be a positive integer"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Popular Users

Get the most popular users by followers count. Users are sorted by follower count (descending), then by username (ascending) for ties.

**URL**: `/users/popular`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| page      | number | No       | Page number for pagination (default: 1)    |
| limit     | number | No       | Results per page (default: 10, max: 50)    |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/popular"
```

**Example Request with Pagination**:

```bash
curl -X GET "http://localhost:5001/users/popular?page=2&limit=5"
```

**Example Response**:

```json
{
  "popular_users": [
    {
      "id": "user123",
      "name": "Alice Johnson",
      "username": "alice",
      "bio": "TV enthusiast and critic",
      "picture": "https://example.com/avatar1.jpg",
      "follower_count": 1250,
      "created_at": "2023-01-15T10:30:00Z"
    },
    {
      "id": "user456",
      "name": "Bob Smith",
      "username": "bob",
      "bio": "Movie and TV show reviewer",
      "picture": "https://example.com/avatar2.jpg",
      "follower_count": 980,
      "created_at": "2023-02-20T14:15:30Z"
    },
    {
      "id": "user789",
      "name": "Charlie Brown",
      "username": "charlie",
      "bio": "Binge watcher extraordinaire",
      "picture": "https://example.com/avatar3.jpg",
      "follower_count": 750,
      "created_at": "2023-03-10T09:45:15Z"
    }
  ],
  "total_users": 25,
  "total_pages": 3,
  "current_page": 1,
  "limit": 10
}
```

**Sorting Behavior**:
- Users are sorted by follower count in descending order (most followers first)
- For users with the same follower count, they are sorted by username in ascending order (alphabetical)
- Only users who have at least 1 follower are included in the results
- Sensitive fields (email, password, lowercase fields) are automatically removed from results

**Error Responses**:

- `400 Bad Request`: Invalid page parameter
  ```json
  {
    "error": "Page parameter must be a positive integer"
  }
  ```
- `400 Bad Request`: Invalid limit parameter
  ```json
  {
    "error": "Limit parameter must be a positive integer"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

## Social Endpoints

These endpoints manage social interactions between users.

### Follow User

Follow another user.

**URL**: `/follow`

**Method**: `POST`

**Request Body**:

| Field       | Type   | Required | Description                |
|-------------|--------|----------|----------------------------|
| follower_id | string | Yes      | ID of the user following   |
| followee_id | string | Yes      | ID of the user to follow   |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/follow" \
  -H "Content-Type: application/json" \
  -d '{
    "follower_id": "user123",
    "followee_id": "user456"
  }'
```

**Example Response**:

```json
{
  "message": "user123 now follows user456"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["follower_id"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `400 Bad Request`: Cannot follow yourself
  ```json
  {
    "error": "Cannot follow yourself"
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "Follower user not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Unfollow User

Unfollow a user.

**URL**: `/unfollow`

**Method**: `POST`

**Request Body**:

| Field       | Type   | Required | Description                  |
|-------------|--------|----------|------------------------------|
| follower_id | string | Yes      | ID of the user unfollowing   |
| followee_id | string | Yes      | ID of the user to unfollow   |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/unfollow" \
  -H "Content-Type: application/json" \
  -d '{
    "follower_id": "user123",
    "followee_id": "user456"
  }'
```

**Example Response**:

```json
{
  "message": "Unfollowed successfully"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["follower_id"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `404 Not Found`: No follow relationship found
  ```json
  {
    "message": "No follow relationship found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Following

Get a list of users that a user is following.

**URL**: `/users/:user_id/following`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/following"
```

**Example Response**:

```json
{
  "following": ["user456", "user789", "user101"]
}
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Followers

Get a list of users who follow a specific user.

**URL**: `/users/:user_id/followers`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user456/followers"
```

**Example Response**:

```json
{
  "followers": ["user123", "user789", "user202"]
}
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get User Feed

Get a user's feed of activities from followed users.

**URL**: `/users/:user_id/feed`

**Method**: `GET`

**URL Parameters**:

| Parameter  | Type   | Required | Description                |
|------------|--------|----------|----------------------------|
| user_id    | string | Yes      | The ID of the user         |

**Query Parameters**:

| Parameter  | Type   | Required | Description                                           |
|------------|--------|----------|-------------------------------------------------------|
| start_after| string | No       | ISO timestamp for pagination (e.g., 2024-04-10T15:23:00Z) |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/feed"
```

**Example Request with Pagination**:

```bash
curl -X GET "http://localhost:5001/users/user123/feed?start_after=2024-04-10T15:23:00Z"
```

**Example Response**:

```json
{
  "feed": [
    {
      "id": "feed_item_1",
      "user_id": "user456",
      "user_name": "Jane Smith",
      "user_username": "janesmith",
      "show_id": "breaking_bad",
      "rating": 5,
      "comment": "Amazing show!",
      "timestamp": "2024-05-30T14:22:10Z",
      "rating_id": "rating123"
    },
    {
      "id": "feed_item_2",
      "user_id": "user789",
      "user_name": "Bob Johnson",
      "user_username": "bobjohnson",
      "show_id": "stranger_things",
      "rating": 4,
      "comment": "Great season!",
      "timestamp": "2024-05-29T18:45:30Z",
      "rating_id": "rating456"
    }
    // Additional feed items...
  ]
}
```

**Error Responses**:

- `400 Bad Request`: Invalid start_after format
  ```json
  {
    "error": "Invalid 'start_after' format. Use ISO 8601 (e.g., 2024-04-10T15:23:00Z)"
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

## Rating Endpoints

These endpoints manage user ratings for TV shows. **All rating endpoints return results sorted by most recent rating date first.**

### Add Rating

Add or update a rating for a TV show.

**URL**: `/ratings`

**Method**: `POST`

**Request Body**:

| Field               | Type   | Required | Description                |
|---------------------|--------|----------|----------------------------|
| user_id             | string | Yes      | ID of the user             |
| show_id             | string | Yes      | ID of the TV show          |
| show_name_lowercase | string | Yes      | Show name in lowercase for searching |
| rating              | number | Yes      | Rating value (1-10)        |
| comment             | string | No       | Optional review comment    |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/ratings" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "show_id": "1396",
    "show_name_lowercase": "breaking bad",
    "rating": 9,
    "comment": "One of the best shows ever made!"
  }'
```

**Example Response**:

```json
{
  "message": "Rating added successfully!",
  "id": "rating123"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["rating"],
        "msg": "ensure this value is less than or equal to 10",
        "type": "value_error.number.not_le"
      }
    ]
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get User Ratings

Get all ratings submitted by a specific user, sorted by most recent rating date first.

**URL**: `/users/:user_id/ratings`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/ratings"
```

**Example Response**:

```json
[
  {
    "id": "rating123",
    "user_id": "user123",
    "show_id": "breaking_bad",
    "rating": 9,
    "comment": "One of the best shows ever made!",
    "timestamp": "2024-05-30T14:22:10Z"
  },
  {
    "id": "rating456",
    "user_id": "user123",
    "show_id": "stranger_things",
    "rating": 8,
    "comment": "Great show with amazing characters",
    "timestamp": "2024-05-25T09:15:30Z"
  }
  // Additional ratings...
]
```

**Sorting Behavior**:
- Results are sorted by timestamp in descending order (most recent rating first)
- This ensures users see their latest rating activity at the top

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Search User Rated Shows

Search for shows that a specific user has rated by show name. This searches within the Firebase database using stored show names, not the TMDB API.

**URL**: `/users/:user_id/rated-shows/search`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Query Parameters**:

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| query     | string | Yes      | The search term to find rated shows        |
| page      | number | No       | Page number for pagination (default: 1)    |
| limit     | number | No       | Results per page (default: 20, max: 100)   |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/rated-shows/search?query=breaking"
```

**Example Request with Pagination**:

```bash
curl -X GET "http://localhost:5001/users/user123/rated-shows/search?query=breaking&page=1&limit=10"
```

**Example Response**:

```json
{
  "results": [
    {
      "id": "rating123",
      "user_id": "user123",
      "show_id": "1396",
      "show_name_lowercase": "breaking bad",
      "rating": 9,
      "comment": "One of the best shows ever made!",
      "timestamp": "2024-05-30T14:22:10Z"
    },
    {
      "id": "rating456",
      "user_id": "user123",
      "show_id": "1457",
      "show_name_lowercase": "breaking point",
      "rating": 7,
      "comment": "Decent thriller series",
      "timestamp": "2024-05-25T09:15:30Z"
    }
  ],
  "total_results": 2,
  "total_pages": 1,
  "current_page": 1,
  "limit": 20
}
```

**Search Behavior**:
- Case-insensitive matching on stored show names
- Results are sorted by relevance first, then by timestamp (most recent first):
  1. Exact show name matches first
  2. Show name prefix matches
  3. Show name contains matches
  4. Within each relevance group, sorted by most recent rating date
- Only searches within shows that the user has actually rated
- Supports pagination for large result sets

**Error Responses**:

- `400 Bad Request`: Missing query parameter
  ```json
  {
    "errors": [
      {
        "loc": ["query"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `400 Bad Request`: Invalid page parameter
  ```json
  {
    "error": "Invalid parameter format"
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Show Ratings

Get all ratings for a specific TV show, sorted by most recent rating date first.

**URL**: `/shows/:show_id/ratings`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| show_id   | string | Yes      | The ID of the TV show      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/breaking_bad/ratings"
```

**Example Response**:

```json
[
  {
    "id": "rating123",
    "user_id": "user123",
    "show_id": "breaking_bad",
    "rating": 9,
    "comment": "One of the best shows ever made!",
    "timestamp": "2024-05-30T14:22:10Z"
  },
  {
    "id": "rating789",
    "user_id": "user456",
    "show_id": "breaking_bad",
    "rating": 10,
    "comment": "Masterpiece!",
    "timestamp": "2024-05-28T16:40:20Z"
  }
  // Additional ratings...
]
```

**Sorting Behavior**:
- Results are sorted by timestamp in descending order (most recent rating first)
- This shows the latest community feedback for a show at the top

**Error Responses**:

- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Show Average Rating

Get the average rating for a specific TV show.

**URL**: `/shows/:show_id/average-rating`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| show_id   | string | Yes      | The ID of the TV show      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/shows/1396/average-rating"
```

**Example Response (Show with ratings)**:

```json
{
  "show_id": "1396",
  "average_rating": 8.67,
  "total_ratings": 42
}
```

**Example Response (Show with no ratings)**:

```json
{
  "show_id": "1396",
  "average_rating": null,
  "total_ratings": 0
}
```

**Error Responses**:

- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Followed Users' Show Reviews

Get show-level reviews from users that a given user follows, scoped to a single show. Results are paginated and sorted by most recent timestamp first. Each review is enriched with the reviewer's name, username, and profile picture.

**URL**: `/users/:user_id/followed-reviews/shows/:show_id`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                                               |
|-----------|--------|----------|-----------------------------------------------------------|
| user_id   | string | Yes      | ID of the current user whose following list is the filter |
| show_id   | string | Yes      | ID of the show                                            |

**Query Parameters**:

| Parameter | Type   | Required | Description                                   |
|-----------|--------|----------|-----------------------------------------------|
| page      | number | No       | Page number, 1-indexed (default: 1)           |
| limit     | number | No       | Results per page (default: 20, max: 100)      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/api/users/user123/followed-reviews/shows/breaking_bad?page=1&limit=20"
```

**Example Response**:

```json
{
  "results": [
    {
      "id": "rating456",
      "user_id": "friend789",
      "user_name": "Alex Rivera",
      "user_username": "alexr",
      "user_picture": "https://example.com/pic.jpg",
      "show_id": "breaking_bad",
      "show_name_lowercase": "breaking bad",
      "rating": 9,
      "comment": "Walter's descent is masterful.",
      "timestamp": "2026-04-12T14:22:10+00:00"
    }
  ],
  "total_results": 1,
  "total_pages": 1,
  "current_page": 1,
  "limit": 20,
  "followers_average_rating": 9.0,
  "followers_total_ratings": 1
}
```

**Error Responses**:

- `400 Bad Request`: Invalid `page` or `limit` parameter
  ```json
  { "error": "Invalid parameter format" }
  ```
- `404 Not Found`: User does not exist
  ```json
  { "error": "User not found" }
  ```
- `500 Internal Server Error`: Database error
  ```json
  { "error": "Database error occurred" }
  ```

### Get Popular Shows

Get a list of the most popular shows based on the number of ratings within a specified timeframe.

**URL**: `/shows/popular`

**Method**: `GET`

**Query Parameters**:

| Parameter        | Type   | Required | Description                                           |
|------------------|--------|----------|-------------------------------------------------------|
| timeframe        | number | No       | Number of days to look back (default: 7)              |
| num_most_popular | number | No       | Number of most popular shows to return (default: 10, max: 100) |

**Example Request (Default parameters)**:

```bash
curl -X GET "http://localhost:5001/shows/popular"
```

**Example Request (Custom timeframe)**:

```bash
curl -X GET "http://localhost:5001/shows/popular?timeframe=30"
```

**Example Request (Custom number of shows)**:

```bash
curl -X GET "http://localhost:5001/shows/popular?num_most_popular=5"
```

**Example Response**:

```json
{
  "popular_shows": [
    {
      "id": 1396,
      "name": "Breaking Bad",
      "poster_path": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      "backdrop_path": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
      "overview": "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future at any cost as he enters the dangerous world of drugs and crime.",
      "rating_count": 42,
      "timeframe_days": 7
    },
    {
      "id": 66732,
      "name": "Stranger Things",
      "poster_path": "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      "backdrop_path": "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
      "overview": "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
      "rating_count": 38,
      "timeframe_days": 7
    }
    // Additional shows...
  ],
  "timeframe_days": 7,
  "total_shows_found": 25,
  "num_most_popular": 10
}
```

**Error Responses**:

- `400 Bad Request`: Invalid parameters
  ```json
  {
    "error": "Timeframe must be a positive integer"
  }
  ```
- `400 Bad Request`: Invalid parameters
  ```json
  {
    "error": "num_most_popular parameter must be a valid integer"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Error getting popular shows: [error details]"
  }
  ```

### Get Suggested Shows

Get personalized show suggestions for a user. Prioritizes shows highly rated by followed users that the user hasn't rated or added to their watchlist. Backfills with globally popular shows when the social pool is too small.

**URL**: `/users/:user_id/suggested-shows`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| user_id   | string | Yes      | The ID of the user    |

**Query Parameters**:

| Parameter | Type   | Required | Description                              |
|-----------|--------|----------|------------------------------------------|
| limit     | number | No       | Number of suggestions (default: 10, max: 50) |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/api/users/user123/suggested-shows?limit=5"
```

**Example Response**:

```json
{
  "suggestions": [
    {
      "show_id": "1396",
      "source": "followers",
      "followers_rating_count": 3,
      "followers_average_rating": 8.67,
      "show_details": { ... }
    },
    {
      "show_id": "62286",
      "source": "popular",
      "rating_count": 15,
      "show_details": { ... }
    }
  ],
  "total_suggestions": 2
}
```

**Source Types**:
- `"followers"` — show was rated by followed users. Includes `followers_rating_count` and `followers_average_rating`.
- `"popular"` — show is globally popular (backfill). Includes `rating_count` (ratings in the last 30 days).

**Error Responses**:

- `400 Bad Request`: Invalid limit parameter
  ```json
  { "error": "Limit must be a valid integer" }
  ```
- `404 Not Found`: User does not exist
  ```json
  { "error": "User not found" }
  ```
- `500 Internal Server Error`: Database error
  ```json
  { "error": "Database error occurred" }
  ```

## Episode Rating Endpoints

These endpoints manage user ratings for specific TV show episodes. **Episode rating endpoints return results sorted by most recent rating date first.**

### Add Episode Rating

Add or update a rating for a specific episode of a TV show.

**URL**: `/episode_ratings`

**Method**: `POST`

**Request Body**:

| Field          | Type   | Required | Description                |
|----------------|--------|----------|----------------------------|
| user_id        | string | Yes      | ID of the user             |
| show_id        | string | Yes      | ID of the TV show          |
| season_number  | number | Yes      | Season number (must be ≥ 1)|
| episode_number | number | Yes      | Episode number (must be ≥ 1)|
| rating         | number | Yes      | Rating value (1-10)        |
| comment        | string | No       | Optional review comment    |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/episode_ratings" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "show_id": "1396",
    "season_number": 1,
    "episode_number": 1,
    "rating": 9,
    "comment": "Amazing pilot episode!"
  }'
```

**Example Response**:

```json
{
  "message": "Rating added successfully!",
  "id": "episode_rating123"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["rating"],
        "msg": "ensure this value is less than or equal to 10",
        "type": "value_error.number.not_le"
      }
    ]
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Episode Ratings

Get ratings for episodes in a specific season of a TV show, sorted by most recent rating date first.

**URL**: `/users/:user_id/shows/:show_id/season/:season_number/ratings`

**Method**: `GET`

**URL Parameters**:

| Parameter     | Type   | Required | Description                |
|---------------|--------|----------|----------------------------|
| user_id       | string | Yes      | The ID of the user         |
| show_id       | string | Yes      | The ID of the TV show      |
| season_number | number | Yes      | The season number          |

**Query Parameters**:

| Parameter      | Type   | Required | Description                      |
|----------------|--------|----------|----------------------------------|
| episode_number | number | No       | Filter by specific episode number|

**Example Request (All Episodes in Season)**:

```bash
curl -X GET "http://localhost:5001/users/user123/shows/1396/season/1/ratings"
```

**Example Request (Specific Episode)**:

```bash
curl -X GET "http://localhost:5001/users/user123/shows/1396/season/1/ratings?episode_number=1"
```

**Example Response (All Episodes in Season)**:

```json
[
  {
    "id": "episode_rating456",
    "user_id": "user123",
    "show_id": "1396",
    "season_number": 1,
    "episode_number": 2,
    "rating": 8,
    "comment": "Great follow-up to the pilot",
    "timestamp": "2024-05-31T09:15:30Z"
  },
  {
    "id": "episode_rating123",
    "user_id": "user123",
    "show_id": "1396",
    "season_number": 1,
    "episode_number": 1,
    "rating": 9,
    "comment": "Amazing pilot episode!",
    "timestamp": "2024-05-30T14:22:10Z"
  }
]
```

**Example Response (Specific Episode)**:

```json
{
  "id": "episode_rating123",
  "user_id": "user123",
  "show_id": "1396",
  "season_number": 1,
  "episode_number": 1,
  "rating": 9,
  "comment": "Amazing pilot episode!",
  "timestamp": "2024-05-30T14:22:10Z"
}
```

**Sorting Behavior**:
- When retrieving all episodes in a season, results are sorted by timestamp in descending order (most recent rating first)
- This shows the user's latest episode rating activity at the top
- Single episode requests return the specific episode rating without sorting

**Error Responses**:

- `400 Bad Request`: Invalid parameters
  ```json
  {
    "error": "Episode number must be an integer"
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `404 Not Found`: Episode rating not found
  ```json
  {
    "error": "Episode rating not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Episode Average Rating

Get the global average rating for a specific episode across all users.

**URL**: `/shows/:show_id/season/:season_number/episode/:episode_number/average-rating`

**Method**: `GET`

**URL Parameters**:

| Parameter      | Type   | Required | Description           |
|----------------|--------|----------|-----------------------|
| show_id        | string | Yes      | The ID of the TV show |
| season_number  | number | Yes      | The season number     |
| episode_number | number | Yes      | The episode number    |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/api/shows/1396/season/1/episode/1/average-rating"
```

**Example Response (With Ratings)**:

```json
{
  "show_id": "1396",
  "season_number": 1,
  "episode_number": 1,
  "average_rating": 8.67,
  "total_ratings": 3
}
```

**Example Response (No Ratings)**:

```json
{
  "show_id": "1396",
  "season_number": 1,
  "episode_number": 1,
  "average_rating": null,
  "total_ratings": 0
}
```

**Error Responses**:

- `400 Bad Request`: Invalid parameters
  ```json
  {
    "error": "Season and episode numbers must be integers"
  }
  ```
- `400 Bad Request`: Non-positive numbers
  ```json
  {
    "error": "Season and episode numbers must be positive integers"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Followed Users' Episode Reviews

Get episode-level reviews from users that a given user follows, scoped to a single episode of a show. Results are paginated and sorted by most recent timestamp first. Each review is enriched with the reviewer's name, username, and profile picture.

**URL**: `/users/:user_id/followed-reviews/shows/:show_id/season/:season_number/episode/:episode_number`

**Method**: `GET`

**URL Parameters**:

| Parameter      | Type   | Required | Description                                               |
|----------------|--------|----------|-----------------------------------------------------------|
| user_id        | string | Yes      | ID of the current user whose following list is the filter |
| show_id        | string | Yes      | ID of the show                                            |
| season_number  | number | Yes      | Season number (integer, ≥ 1)                              |
| episode_number | number | Yes      | Episode number (integer, ≥ 1)                             |

**Query Parameters**:

| Parameter | Type   | Required | Description                                   |
|-----------|--------|----------|-----------------------------------------------|
| page      | number | No       | Page number, 1-indexed (default: 1)           |
| limit     | number | No       | Results per page (default: 20, max: 100)      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/api/users/user123/followed-reviews/shows/1396/season/1/episode/1"
```

**Example Response**:

```json
{
  "results": [
    {
      "id": "episode_rating789",
      "user_id": "friend789",
      "user_name": "Alex Rivera",
      "user_username": "alexr",
      "user_picture": "https://example.com/pic.jpg",
      "show_id": "1396",
      "season_number": 1,
      "episode_number": 1,
      "rating": 9,
      "comment": "Pilot set the tone perfectly.",
      "timestamp": "2026-04-12T14:22:10+00:00"
    }
  ],
  "total_results": 1,
  "total_pages": 1,
  "current_page": 1,
  "limit": 20,
  "followers_average_rating": 9.0,
  "followers_total_ratings": 1
}
```

**Error Responses**:

- `400 Bad Request`: Invalid `page` or `limit` parameter
  ```json
  { "error": "Invalid parameter format" }
  ```
- `404 Not Found`: User does not exist
  ```json
  { "error": "User not found" }
  ```
- `500 Internal Server Error`: Database error
  ```json
  { "error": "Database error occurred" }
  ```

## Watch Status Endpoints

These endpoints manage users' watch status for TV shows.

### Update Watch Status

Add or update a watch status for a TV show.

**URL**: `/update_watch_status`

**Method**: `POST`

**Request Body**:

| Field           | Type   | Required | Description                                      |
|-----------------|--------|----------|--------------------------------------------------|
| user_id         | string | Yes      | ID of the user                                   |
| show_id         | string | Yes      | ID of the TV show                                |
| status          | string | Yes      | Status value ("currently_watching", "want_to_watch", or "watched") |
| current_season  | number | No       | Current season number (for "currently_watching") |
| current_episode | number | No       | Current episode number (for "currently_watching")|
| notes           | string | No       | Optional notes about the show                    |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/update_watch_status" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "show_id": "breaking_bad",
    "status": "currently_watching",
    "current_season": 3,
    "current_episode": 5,
    "notes": "Getting really intense now!"
  }'
```

**Example Response (New Status)**:

```json
{
  "message": "Watch status added successfully",
  "id": "status123"
}
```

**Example Response (Updated Status)**:

```json
{
  "message": "Watch status updated successfully",
  "id": "status123"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["status"],
        "msg": "string does not match pattern '^(currently_watching|want_to_watch|watched)$'",
        "type": "value_error.str.pattern"
      }
    ]
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Currently Watching

Get all shows that a user is currently watching.

**URL**: `/users/:user_id/currently_watching`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/currently_watching"
```

**Example Response**:

```json
[
  {
    "id": "status123",
    "user_id": "user123",
    "show_id": "breaking_bad",
    "status": "currently_watching",
    "current_season": 3,
    "current_episode": 5,
    "notes": "Getting really intense now!",
    "updated_at": "2024-05-30T14:22:10Z"
  },
  {
    "id": "status456",
    "user_id": "user123",
    "show_id": "stranger_things",
    "status": "currently_watching",
    "current_season": 2,
    "current_episode": 3,
    "notes": "Love the 80s vibe",
    "updated_at": "2024-05-28T16:40:20Z"
  }
  // Additional shows...
]
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Want to Watch

Get all shows that a user wants to watch.

**URL**: `/users/:user_id/want_to_watch`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/want_to_watch"
```

**Example Response**:

```json
[
  {
    "id": "status789",
    "user_id": "user123",
    "show_id": "better_call_saul",
    "status": "want_to_watch",
    "notes": "Heard it's as good as Breaking Bad",
    "updated_at": "2024-05-29T10:15:30Z"
  },
  {
    "id": "status101",
    "user_id": "user123",
    "show_id": "the_wire",
    "status": "want_to_watch",
    "notes": "Classic HBO show",
    "updated_at": "2024-05-27T20:30:45Z"
  }
  // Additional shows...
]
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Watched

Get all shows that a user has watched.

**URL**: `/users/:user_id/watched`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/watched"
```

**Example Response**:

```json
[
  {
    "id": "status456",
    "user_id": "user123",
    "show_id": "breaking_bad",
    "status": "watched",
    "notes": "One of the best shows ever made!",
    "updated_at": "2024-05-30T14:22:10Z"
  },
  {
    "id": "status789",
    "user_id": "user123",
    "show_id": "the_sopranos",
    "status": "watched",
    "notes": "Classic HBO series",
    "updated_at": "2024-05-25T09:15:30Z"
  }
  // Additional shows...
]
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Get Watch Status

Get the watch status for a specific show for a user.

**URL**: `/users/:user_id/watch_status/:show_id`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| user_id   | string | Yes      | The ID of the user         |
| show_id   | string | Yes      | The ID of the TV show      |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/users/user123/watch_status/breaking_bad"
```

**Example Response**:

```json
{
  "id": "status123",
  "user_id": "user123",
  "show_id": "breaking_bad",
  "status": "currently_watching",
  "current_season": 3,
  "current_episode": 5,
  "notes": "Getting really intense now!",
  "updated_at": "2024-05-30T14:22:10Z"
}
```

**Error Responses**:

- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `404 Not Found`: No watch status found
  ```json
  {
    "error": "No watch status found for this show"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

### Delete Watch Status

Delete a watch status for a TV show.

**URL**: `/delete_watch_status`

**Method**: `POST`

**Request Body**:

| Field    | Type   | Required | Description                |
|----------|--------|----------|----------------------------|
| user_id  | string | Yes      | ID of the user             |
| show_id  | string | Yes      | ID of the TV show          |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/delete_watch_status" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "show_id": "breaking_bad"
  }'
```

**Example Response**:

```json
{
  "message": "Watch status deleted successfully"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["user_id"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `404 Not Found`: No watch status found
  ```json
  {
    "error": "No watch status found for this show"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

## Watchlist Endpoints

These endpoints manage users' watchlists.

### Add to Watchlist

Add a TV show to a user's watchlist.

**URL**: `/add_to_watchlist`

**Method**: `POST`

**Request Body**:

| Field    | Type   | Required | Description                |
|----------|--------|----------|----------------------------|
| user_id  | string | Yes      | ID of the user             |
| show_id  | string | Yes      | ID of the TV show          |

**Example Request**:

```bash
curl -X POST "http://localhost:5001/add_to_watchlist" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "show_id": "game_of_thrones"
  }'
```

**Example Response**:

```json
{
  "message": "Added to watchlist!",
  "id": "watchlist123"
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
  ```json
  {
    "errors": [
      {
        "loc": ["user_id"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `404 Not Found`: User not found
  ```json
  {
    "error": "User not found"
  }
  ```
- `500 Internal Server Error`: Database error
  ```json
  {
    "error": "Database error occurred"
  }
  ```

## Common Data Structures

### User Object

```json
{
  "id": "user123",
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "bio": "TV show enthusiast",
  "created_at": "2023-05-31T12:34:56.789Z"
}
```

### Show Object

Basic show object (from search/filter results):

```json
{
  "backdrop_path": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
  "genre_ids": [18, 80],
  "id": 1396,
  "origin_country": ["US"],
  "original_language": "en",
  "original_name": "Breaking Bad",
  "overview": "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future at any cost as he enters the dangerous world of drugs and crime.",
  "popularity": 380.063,
  "poster_path": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
  "first_air_date": "2008-01-20",
  "name": "Breaking Bad"
}
```

Detailed show object (from show details endpoint) includes additional fields:

- `created_by`: Array of creator objects
- `episode_run_time`: Array of episode runtimes in minutes
- `genres`: Array of genre objects with id and name
- `in_production`: Boolean indicating if show is still in production
- `languages`: Array of language codes
- `last_air_date`: Date of last aired episode
- `last_episode_to_air`: Object with details of last aired episode
- `next_episode_to_air`: Object with details of next episode (or null)
- `networks`: Array of network objects
- `number_of_episodes`: Total number of episodes
- `number_of_seasons`: Total number of seasons
- `production_companies`: Array of production company objects
- `production_countries`: Array of production country objects
- `seasons`: Array of season objects
- `spoken_languages`: Array of language objects
- `status`: Show status (e.g., "Ended", "Returning Series")
- `tagline`: Show tagline
- `type`: Show type (e.g., "Scripted")

### Rating Object

```json
{
  "id": "rating123",
  "user_id": "user123",
  "show_id": "breaking_bad",
  "rating": 9,
  "comment": "One of the best shows ever made!",
  "timestamp": "2024-05-30T14:22:10Z"
}
```

### Watch Status Object

```json
{
  "id": "status123",
  "user_id": "user123",
  "show_id": "breaking_bad",
  "status": "currently_watching",
  "current_season": 3,
  "current_episode": 5,
  "notes": "Getting really intense now!",
  "updated_at": "2024-05-30T14:22:10Z"
}
```

**Possible status values**:
- `"currently_watching"`: User is currently watching the show
- `"want_to_watch"`: User wants to watch the show
- `"watched"`: User has finished watching the show

**Note**: The `current_season` and `current_episode` fields are typically used only with the `"currently_watching"` status to track progress.

### Feed Item Object

```json
{
  "id": "feed_item_1",
  "user_id": "user456",
  "user_name": "Jane Smith",
  "user_username": "janesmith",
  "show_id": "breaking_bad",
  "rating": 5,
  "comment": "Amazing show!",
  "timestamp": "2024-05-30T14:22:10Z",
  "rating_id": "rating123"
}
