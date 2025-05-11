import pytest
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

@pytest.fixture(scope="module", autouse=True)
def setup_test_data(get_client, get_db):
    client = get_client
    db = get_db

    # Create test users
    user1_payload = {
        "email": "user1@example.com",
        "name": "Test User 1",
        "username": "testuser1",
        "bio": "Bio for Test User 1"
    }
    user2_payload = {
        "email": "user2@example.com",
        "name": "Test User 2",
        "username": "testuser2",
        "bio": "Bio for Test User 2"
    }
    
    response1 = client.post(
        "/add_user",
        json=user1_payload,
        headers={"Content-Type": "application/json"}
    )
    if response1.status_code == 200:
        user1_id = response1.get_json()["id"]
    else:
        # If user already exists, get their ID
        users = client.get("/get_users").get_json()
        user1_id = next((u["id"] for u in users if u["email"] == "user1@example.com"), "test_user_1")
    
    response2 = client.post(
        "/add_user",
        json=user2_payload,
        headers={"Content-Type": "application/json"}
    )
    if response2.status_code == 200:
        user2_id = response2.get_json()["id"]
    else:
        # If user already exists, get their ID
        users = client.get("/get_users").get_json()
        user2_id = next((u["id"] for u in users if u["email"] == "user2@example.com"), "test_user_2")
        
    # Create follow relationship
    follow_payload = {
        "follower_id": user1_id,
        "followee_id": user2_id
    }
    client.post(
        "/follow",
        json=follow_payload,
        headers={"Content-Type": "application/json"}
    )
    
    # Add rating
    rating_payload = {
        "user_id": user2_id,
        "show_id": "breaking_bad",
        "rating": 4,
        "comment": "Great show2!"
    }
    client.post(
        "/ratings",
        json=rating_payload,
        headers={"Content-Type": "application/json"}
    )
    
    # Store test data for use in tests
    test_data = {
        "user1_id": user1_id,
        "user2_id": user2_id,
        "show_id": "breaking_bad"
    }
    
    yield test_data
    
    # Optional cleanup code could go here

class TestBasicEndpoints:
    def test_hello_endpoint(self, get_client):
        client = get_client
        response = client.get("/")
        assert response.status_code == 200
        assert response.get_json()["message"] == "Hello from Teli!"

class TestUserEndpoints:
    def test_add_user_success(self, get_client):
        client = get_client
        payload = {
            "email": "newuser@example.com",
            "name": "New User",
            "username": "newuser",
            "bio": "Bio for New User"
        }
        response = client.post(
            "/add_user",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert "id" in response.get_json()
        assert response.get_json()["message"] == "User added successfully!"
    
    def test_add_user_validation_error(self, get_client):
        client = get_client
        # Missing required fields
        payload = {
            "bio": "Just a bio"
        }
        response = client.post(
            "/add_user",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        assert "errors" in response.get_json()
    
    def test_add_user_invalid_email(self, get_client):
        client = get_client
        payload = {
            "email": "not-an-email",
            "name": "Invalid Email User",
            "username": "invalidemail"
        }
        response = client.post(
            "/add_user",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        errors = response.get_json()["errors"]
        assert any("email" in error["loc"] for error in errors)
    
    def test_get_users(self, get_client):
        client = get_client
        response = client.get("/get_users")
        assert response.status_code == 200
        users = response.get_json()
        assert isinstance(users, list)
        assert len(users) > 0
        assert "id" in users[0]
        assert "name" in users[0]
        assert "email" in users[0]
    
    def test_get_user_success(self, get_client):
        # First add a user to retrieve
        client = get_client
        add_payload = {
            "email": "getuser@example.com",
            "name": "Get User",
            "username": "getuser",
            "bio": "Bio for Get User"
        }
        add_response = client.post(
            "/add_user",
            json=add_payload,
            headers={"Content-Type": "application/json"}
        )
        assert add_response.status_code == 200
        
        # Get the user ID from the response
        user_id = add_response.get_json()["id"]
        
        # Now test the get user endpoint
        get_response = client.get(f"/user/{user_id}")
        assert get_response.status_code == 200
        
        user_data = get_response.get_json()
        assert user_data["id"] == user_id
        assert user_data["email"] == add_payload["email"]
        assert user_data["name"] == add_payload["name"]
        assert user_data["username"] == add_payload["username"]
        assert user_data["bio"] == add_payload["bio"]
        assert "password" not in user_data

    def test_get_user_not_found(self, get_client):
        client = get_client
        # Use a non-existent ID
        fake_id = "nonexistent-user-id"
        response = client.get(f"/user/{fake_id}")
        
        assert response.status_code == 404
        assert "error" in response.get_json()
        assert response.get_json()["error"] == "User not found"

class TestWatchlistEndpoints:
    def test_add_to_watchlist(self, get_client, setup_test_data):
        client = get_client
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": "game_of_thrones"
        }
        response = client.post(
            "/add_to_watchlist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert "id" in response.get_json()
        assert response.get_json()["message"] == "Added to watchlist!"
    
    def test_add_to_watchlist_validation_error(self, get_client):
        client = get_client
        # Missing required fields
        payload = {
            "user_id": "some_user"
        }
        response = client.post(
            "/add_to_watchlist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        assert "errors" in response.get_json()

class TestTMDBEndpoints:
    def test_search_shows(self, get_client):
        client = get_client
        query = "breaking bad"
        response = client.get(f"/shows/search?query={query}")
        assert response.status_code == 200
        response_json = response.get_json()
        assert "total_pages" in response_json
        assert "total_results" in response_json
        results = response.get_json()["results"]
        assert len(results) > 0
        first_result = results[0]
        assert first_result["name"].lower() == "breaking bad"
        assert first_result["id"] == 1396
        assert "genre_ids" in first_result
        assert "origin_country" in first_result
        assert "original_language" in first_result
        assert "original_name" in first_result
        assert "overview" in first_result
        assert "popularity" in first_result
        assert "poster_path" in first_result
        assert "backdrop_path" in first_result
        assert "first_air_date" in first_result
    
    def test_filter_shows(self, get_client):
        client = get_client
        query_params = {
            "air_date.gte": "2020-01-01",
            "air_date.lte": "2021-12-31",
            "first_air_date_year": 2021,
            "first_air_date.gte": "2021-01-01",
            "first_air_date.lte": "2021-12-31",
            "include_adult": "false",
            "include_null_first_air_dates": "false",
            "language": "en-US",
            "page": 1,
            "sort_by": "popularity.desc",
            "with_original_language": "en",
            "with_runtime.gte": 20,
            "with_runtime.lte": 60
        }
        response = client.get("/shows/filter", query_string=query_params)
        assert response.status_code == 200
        response_json = response.get_json()
        assert "results" in response_json
        assert "total_pages" in response_json
        assert "total_results" in response_json

        for result in response_json["results"]:
            # Check that essential fields exist
            assert "backdrop_path" in result
            assert "first_air_date" in result
            assert "genre_ids" in result
            assert "id" in result
            assert "name" in result
            assert "origin_country" in result
            assert "original_language" in result
            assert "original_name" in result
            assert "overview" in result
            assert "popularity" in result
            assert "poster_path" in result

            # Validate filters
            if result["first_air_date"]:
                assert "2021-01-01" <= result["first_air_date"] <= "2021-12-31"
            assert result["original_language"] == "en"

        popularities = [r["popularity"] for r in response_json["results"] if "popularity" in r]
        assert popularities == sorted(popularities, reverse=True)
    
    def test_search_shows_missing_query(self, get_client):
        client = get_client
        response = client.get("/shows/search")
        assert response.status_code == 400
        assert "error" in response.get_json()
    
    @patch('app.requests.get')
    def test_get_genres(self, mock_get, get_client):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"id": 1, "name": "Drama"}]}
        mock_get.return_value = mock_response
        
        client = get_client
        response = client.get("/genres")
        assert response.status_code == 200
        assert "data" in response.get_json()
    
    @patch('app.requests.get')
    def test_get_languages(self, mock_get, get_client):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"id": "eng", "name": "English"}]}
        mock_get.return_value = mock_response
        
        client = get_client
        response = client.get("/languages")
        assert response.status_code == 200
        assert "data" in response.get_json()
    
    @patch('app.requests.get')
    def test_get_countries(self, mock_get, get_client):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"id": "us", "name": "United States"}]}
        mock_get.return_value = mock_response
        
        client = get_client
        response = client.get("/countries")
        assert response.status_code == 200
        assert "data" in response.get_json()

class TestRatingEndpoints:
    def test_add_rating(self, get_client, setup_test_data):
        client = get_client
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": "better_call_saul",
            "rating": 5,
            "comment": "Amazing spin-off!"
        }
        response = client.post(
            "/ratings",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert "id" in response.get_json()
        assert response.get_json()["message"] == "Rating added successfully!"
    
    def test_add_rating_validation_error(self, get_client):
        client = get_client
        # Invalid rating value
        payload = {
            "user_id": "some_user",
            "show_id": "some_show",
            "rating": 11,  # Rating should be 1-10
            "comment": "Test comment"
        }
        response = client.post(
            "/ratings",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        assert "errors" in response.get_json()
    
    def test_get_user_ratings(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/users/{setup_test_data['user2_id']}/ratings")
        assert response.status_code == 200
        ratings = response.get_json()
        assert isinstance(ratings, list)
        # At least one rating should exist from our test setup
        assert len(ratings) > 0
        assert ratings[0]["user_id"] == setup_test_data["user2_id"]
    
    def test_get_show_ratings(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/shows/{setup_test_data['show_id']}/ratings")
        assert response.status_code == 200
        ratings = response.get_json()
        assert isinstance(ratings, list)
        # At least one rating should exist from our test setup
        assert len(ratings) > 0
        assert ratings[0]["show_id"] == setup_test_data["show_id"]

class TestFollowEndpoints:
    def test_follow_user(self, get_client, setup_test_data):
        client = get_client
        # Create a new user to follow
        new_user_payload = {
            "email": "followtest@example.com",
            "name": "Follow Test User",
            "username": "followtest",
            "bio": "Bio for Follow Test"
        }
        user_response = client.post(
            "/add_user",
            json=new_user_payload,
            headers={"Content-Type": "application/json"}
        )
        new_user_id = user_response.get_json()["id"]
        
        payload = {
            "follower_id": setup_test_data["user1_id"],
            "followee_id": new_user_id
        }
        response = client.post(
            "/follow",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert "message" in response.get_json()
        assert f"{setup_test_data['user1_id']} now follows {new_user_id}" in response.get_json()["message"]
    
    def test_unfollow_user(self, get_client, setup_test_data):
        client = get_client
        # First ensure we're following
        follow_payload = {
            "follower_id": setup_test_data["user1_id"],
            "followee_id": setup_test_data["user2_id"]
        }
        client.post(
            "/follow",
            json=follow_payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Now unfollow
        unfollow_payload = {
            "follower_id": setup_test_data["user1_id"],
            "followee_id": setup_test_data["user2_id"]
        }
        response = client.post(
            "/unfollow",
            json=unfollow_payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert response.get_json()["message"] == "Unfollowed successfully"
        
        # Follow again for other tests
        client.post(
            "/follow",
            json=follow_payload,
            headers={"Content-Type": "application/json"}
        )
    
    def test_get_following(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/users/{setup_test_data['user1_id']}/following")
        assert response.status_code == 200
        following = response.get_json()["following"]
        assert isinstance(following, list)
        assert setup_test_data["user2_id"] in following
    
    def test_get_followers(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/users/{setup_test_data['user2_id']}/followers")
        assert response.status_code == 200
        followers = response.get_json()["followers"]
        assert isinstance(followers, list)
        assert setup_test_data["user1_id"] in followers

class TestFeedEndpoints:
    def test_get_feed(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/users/{setup_test_data['user1_id']}/feed")
        assert response.status_code == 200
        feed = response.get_json()["feed"]
        assert isinstance(feed, list)
        
        # The feed should contain at least one item (the rating from user2)
        assert feed[0]["user_id"] == setup_test_data["user2_id"]
        assert feed[0]["show_id"] == setup_test_data["show_id"]
    
    def test_get_feed_with_pagination(self, get_client, setup_test_data):
        client = get_client
        # Create a timestamp for pagination
        start_after = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().replace("+00:00", "Z")
        response = client.get(f"/users/{setup_test_data['user1_id']}/feed?start_after={start_after}")
        assert response.status_code == 200
        assert "feed" in response.get_json()
    
    def test_get_feed_invalid_pagination(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/users/{setup_test_data['user1_id']}/feed?start_after=invalid-date")
        assert response.status_code == 400
        assert "error" in response.get_json()