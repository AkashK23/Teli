import pytest
import json
from datetime import datetime, timedelta, timezone

@pytest.fixture(scope="module", autouse=True)
def setup_test_data(get_client, get_db):
    client = get_client
    
    # Create test users
    user1_payload = {
        "email": "popular_test_user1@example.com",
        "name": "Popular Test User 1",
        "username": "popular_testuser1",
        "bio": "Bio for Popular Test User 1"
    }
    user2_payload = {
        "email": "popular_test_user2@example.com",
        "name": "Popular Test User 2",
        "username": "popular_testuser2",
        "bio": "Bio for Popular Test User 2"
    }
    user3_payload = {
        "email": "popular_test_user3@example.com",
        "name": "Popular Test User 3",
        "username": "popular_testuser3",
        "bio": "Bio for Popular Test User 3"
    }
    
    # Add users
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
        user1_id = next((u["id"] for u in users if u["email"] == "popular_test_user1@example.com"), "popular_test_user1")
    
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
        user2_id = next((u["id"] for u in users if u["email"] == "popular_test_user2@example.com"), "popular_test_user2")
    
    response3 = client.post(
        "/add_user",
        json=user3_payload,
        headers={"Content-Type": "application/json"}
    )
    if response3.status_code == 200:
        user3_id = response3.get_json()["id"]
    else:
        # If user already exists, get their ID
        users = client.get("/get_users").get_json()
        user3_id = next((u["id"] for u in users if u["email"] == "popular_test_user3@example.com"), "popular_test_user3")
    
    # Add ratings for different shows
    # We'll add more ratings for show1 to make it the most popular
    show1 = "1396"  # Some show ID
    show2 = "66732"  # Another show ID
    show3 = "1399"   # Yet another show ID
    
    # Add ratings for show1 (most popular)
    for i in range(5):
        rating_payload = {
            "user_id": user1_id,
            "show_id": show1,
            "rating": 9,
            "comment": f"Great show! Rating {i+1}"
        }
        client.post(
            "/ratings",
            json=rating_payload,
            headers={"Content-Type": "application/json"}
        )
    
    for i in range(3):
        rating_payload = {
            "user_id": user2_id,
            "show_id": show1,
            "rating": 8,
            "comment": f"Loved it! Rating {i+1}"
        }
        client.post(
            "/ratings",
            json=rating_payload,
            headers={"Content-Type": "application/json"}
        )
    
    # Add ratings for show2 (second most popular)
    for i in range(4):
        rating_payload = {
            "user_id": user1_id,
            "show_id": show2,
            "rating": 8,
            "comment": f"Great show! Rating {i+1}"
        }
        client.post(
            "/ratings",
            json=rating_payload,
            headers={"Content-Type": "application/json"}
        )
    
    for i in range(2):
        rating_payload = {
            "user_id": user3_id,
            "show_id": show2,
            "rating": 7,
            "comment": f"Good show! Rating {i+1}"
        }
        client.post(
            "/ratings",
            json=rating_payload,
            headers={"Content-Type": "application/json"}
        )
    
    # Add ratings for show3 (third most popular)
    for i in range(3):
        rating_payload = {
            "user_id": user2_id,
            "show_id": show3,
            "rating": 9,
            "comment": f"Epic show! Rating {i+1}"
        }
        client.post(
            "/ratings",
            json=rating_payload,
            headers={"Content-Type": "application/json"}
        )
    
    for i in range(1):
        rating_payload = {
            "user_id": user3_id,
            "show_id": show3,
            "rating": 8,
            "comment": f"Great finale! Rating {i+1}"
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
        "user3_id": user3_id,
        "show_ids": {
            "show1": show1,
            "show2": show2,
            "show3": show3
        }
    }
    
    yield test_data
    
    # Optional cleanup code could go here

class TestPopularShowsEndpoints:
    def test_get_popular_shows_default_params(self, get_client):
        """Test getting popular shows with default parameters"""
        client = get_client
        
        # Make the request
        response = client.get('/shows/popular')
        
        # Check the response
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify the response structure
        assert 'popular_shows' in data
        assert 'timeframe_days' in data
        assert 'total_shows_found' in data
        assert 'num_most_popular' in data
        
        # Verify default parameters
        assert data['timeframe_days'] == 7
        assert data['num_most_popular'] == 10
        
        # Verify the shows are ordered by rating count (most popular first)
        popular_shows = data['popular_shows']
        assert len(popular_shows) > 0
        
        # Check that each show has the required fields
        for show in popular_shows:
            assert 'id' in show
            assert 'name' in show
            assert 'poster_path' in show
            assert 'backdrop_path' in show
            assert 'overview' in show
            assert 'rating_count' in show
            assert 'timeframe_days' in show
        
        # Verify that shows are ordered by rating count (descending)
        if len(popular_shows) >= 2:
            for i in range(len(popular_shows) - 1):
                assert popular_shows[i]['rating_count'] >= popular_shows[i+1]['rating_count'], \
                    "Shows should be ordered by rating count (descending)"

    def test_get_popular_shows_custom_params(self, get_client):
        """Test getting popular shows with custom parameters"""
        client = get_client
        
        # Make the request with custom parameters
        response = client.get('/shows/popular?timeframe=30&num_most_popular=2')
        
        # Check the response
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify the custom parameters
        assert data['timeframe_days'] == 30
        assert data['num_most_popular'] == 2
        
        # Verify the shows are ordered by rating count (most popular first)
        popular_shows = data['popular_shows']
        assert len(popular_shows) <= 2, "Should be limited to 2 shows"
        
        # Check that each show has the required fields
        for show in popular_shows:
            assert 'id' in show
            assert 'name' in show
            assert 'poster_path' in show
            assert 'backdrop_path' in show
            assert 'overview' in show
            assert 'rating_count' in show
            assert 'timeframe_days' in show
        
        # Verify that shows are ordered by rating count (descending)
        if len(popular_shows) >= 2:
            assert popular_shows[0]['rating_count'] >= popular_shows[1]['rating_count'], \
                "Shows should be ordered by rating count (descending)"

    def test_get_popular_shows_invalid_timeframe(self, get_client):
        """Test getting popular shows with invalid timeframe parameter"""
        client = get_client
        response = client.get('/shows/popular?timeframe=invalid')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'Timeframe must be a valid integer' in data['error'] or 'timeframe parameter must be a valid integer' in data['error']

    def test_get_popular_shows_invalid_num_most_popular(self, get_client):
        """Test getting popular shows with invalid num_most_popular parameter"""
        client = get_client
        response = client.get('/shows/popular?num_most_popular=invalid')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'num_most_popular parameter must be a valid integer' in data['error']

    def test_get_popular_shows_negative_timeframe(self, get_client):
        """Test getting popular shows with negative timeframe parameter"""
        client = get_client
        response = client.get('/shows/popular?timeframe=-1')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'Timeframe must be a positive integer' in data['error'] or 'timeframe parameter must be a positive integer' in data['error']
