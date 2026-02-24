import pytest
import json
from datetime import datetime, timezone

@pytest.fixture(scope="module")
def client(get_client):
    return get_client

@pytest.fixture(scope="module")
def user_fixture(client, get_db):
    # Create test user for episode ratings
    user_payload = {
        "email": "episodeuser@example.com",
        "name": "Episode Test User",
        "username": "episodeuser",
        "bio": "Bio for Episode Test User"
    }
    
    response = client.post(
        "/api/add_user",
        json=user_payload,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        user_id = response.get_json()["id"]
    else:
        # If user already exists, get their ID
        users = client.get("/api/get_users").get_json()
        user_id = next((u["id"] for u in users if u["email"] == "episodeuser@example.com"), "test_episode_user")
    
    # Return user data for tests
    return {
        "id": user_id,
        "email": "episodeuser@example.com",
        "name": "Episode Test User",
        "username": "episodeuser"
    }

def test_add_episode_rating(client, user_fixture):
    """Test successfully adding an episode rating."""
    # Arrange
    user_id = user_fixture["id"]
    rating_data = {
        "user_id": user_id,
        "show_id": "1396",
        "season_number": 1,
        "episode_number": 1,
        "rating": 9,
        "comment": "Amazing pilot episode!"
    }
    
    # Act
    response = client.post(
        "/api/episode_ratings",
        data=json.dumps(rating_data),
        content_type="application/json"
    )
    
    # Assert
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "message" in data
    assert "id" in data
    assert data["message"] == "Rating added successfully!"

def test_add_episode_rating_missing_fields(client, user_fixture):
    """Test adding an episode rating with missing required fields."""
    # Arrange
    user_id = user_fixture["id"]
    rating_data = {
        "user_id": user_id,
        "show_id": "1396",
        # Missing season_number
        "episode_number": 1,
        "rating": 9
    }
    
    # Act
    response = client.post(
        "/api/episode_ratings",
        data=json.dumps(rating_data),
        content_type="application/json"
    )
    
    # Assert
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "errors" in data

def test_add_episode_rating_invalid_rating(client, user_fixture):
    """Test adding an episode rating with an invalid rating value."""
    # Arrange
    user_id = user_fixture["id"]
    rating_data = {
        "user_id": user_id,
        "show_id": "1396",
        "season_number": 1,
        "episode_number": 1,
        "rating": 11,  # Invalid: greater than 10
        "comment": "Amazing pilot episode!"
    }
    
    # Act
    response = client.post(
        "/api/episode_ratings",
        data=json.dumps(rating_data),
        content_type="application/json"
    )
    
    # Assert
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "errors" in data

def test_add_episode_rating_invalid_user(client):
    """Test adding an episode rating with a non-existent user."""
    # Arrange
    rating_data = {
        "user_id": "non_existent_user",
        "show_id": "1396",
        "season_number": 1,
        "episode_number": 1,
        "rating": 9,
        "comment": "Amazing pilot episode!"
    }
    
    # Act
    response = client.post(
        "/api/episode_ratings",
        data=json.dumps(rating_data),
        content_type="application/json"
    )
    
    # Assert
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data["error"] == "User not found"

def test_add_episode_rating_update_existing(client, user_fixture):
    """Test updating an existing episode rating."""
    # Arrange
    user_id = user_fixture["id"]
    rating_data = {
        "user_id": user_id,
        "show_id": "1396",
        "season_number": 1,
        "episode_number": 1,
        "rating": 9,
        "comment": "Amazing pilot episode!"
    }
    
    # Add initial rating
    client.post(
        "/api/episode_ratings",
        data=json.dumps(rating_data),
        content_type="application/json"
    )
    
    # Update the rating
    updated_rating_data = {
        "user_id": user_id,
        "show_id": "1396",
        "season_number": 1,
        "episode_number": 1,
        "rating": 8,
        "comment": "Updated: Still great but not perfect"
    }
    
    # Act
    response = client.post(
        "/api/episode_ratings",
        data=json.dumps(updated_rating_data),
        content_type="application/json"
    )
    
    # Assert
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "message" in data
    assert "id" in data
    assert data["message"] == "Rating added successfully!"
    
    # Verify the update by getting the rating
    get_response = client.get(f"/api/users/{user_id}/shows/1396/season/1/ratings?episode_number=1")
    get_data = json.loads(get_response.data)
    assert get_data["rating"] == 8
    assert get_data["comment"] == "Updated: Still great but not perfect"

def test_get_episode_ratings_for_season(client, user_fixture):
    """Test getting all episode ratings for a specific season."""
    # Arrange
    user_id = user_fixture["id"]
    
    # Add ratings for multiple episodes in season 1
    episode_ratings = [
        {
            "user_id": user_id,
            "show_id": "1396",
            "season_number": 1,
            "episode_number": 1,
            "rating": 9,
            "comment": "Amazing pilot episode!"
        },
        {
            "user_id": user_id,
            "show_id": "1396",
            "season_number": 1,
            "episode_number": 2,
            "rating": 8,
            "comment": "Great follow-up episode"
        },
        {
            "user_id": user_id,
            "show_id": "1396",
            "season_number": 1,
            "episode_number": 3,
            "rating": 7,
            "comment": "Good but not as strong"
        }
    ]
    
    for rating in episode_ratings:
        client.post(
            "/api/episode_ratings",
            data=json.dumps(rating),
            content_type="application/json"
        )
    
    # Act
    response = client.get(f"/api/users/{user_id}/shows/1396/season/1/ratings")
    
    # Assert
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) == 3
    
    # Check each episode is present with correct rating
    episode_numbers = [item["episode_number"] for item in data]
    assert sorted(episode_numbers) == [1, 2, 3]
    
    # Verify ratings match what we added
    ratings_map = {item["episode_number"]: item["rating"] for item in data}
    assert ratings_map[1] == 9
    assert ratings_map[2] == 8
    assert ratings_map[3] == 7

def test_get_episode_rating_for_specific_episode(client, user_fixture):
    """Test getting a rating for a specific episode."""
    # Arrange
    user_id = user_fixture["id"]
    
    # Add a rating for episode 1
    rating_data = {
        "user_id": user_id,
        "show_id": "1396",
        "season_number": 1,
        "episode_number": 1,
        "rating": 9,
        "comment": "Amazing pilot episode!"
    }
    
    client.post(
        "/api/episode_ratings",
        data=json.dumps(rating_data),
        content_type="application/json"
    )
    
    # Act
    response = client.get(f"/api/users/{user_id}/shows/1396/season/1/ratings?episode_number=1")
    
    # Assert
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, dict)
    assert data["user_id"] == user_id
    assert data["show_id"] == "1396"
    assert data["season_number"] == 1
    assert data["episode_number"] == 1
    assert data["rating"] == 9
    assert data["comment"] == "Amazing pilot episode!"
    assert "timestamp" in data
    assert "id" in data

def test_get_episode_rating_user_not_found(client):
    """Test getting episode ratings for a non-existent user."""
    # Act
    response = client.get("/api/users/non_existent_user/shows/1396/season/1/ratings")
    
    # Assert
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data["error"] == "User not found"

def test_get_episode_rating_not_found(client, user_fixture):
    """Test getting a rating for an episode that hasn't been rated."""
    # Arrange
    user_id = user_fixture["id"]
    
    # Act
    response = client.get(f"/api/users/{user_id}/shows/1396/season/1/ratings?episode_number=999")
    
    # Assert
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data["error"] == "Episode rating not found"

def test_get_episode_ratings_invalid_season_number(client, user_fixture):
    """Test getting episode ratings with an invalid season number."""
    # Arrange
    user_id = user_fixture["id"]
    
    # Act
    response = client.get(f"/api/users/{user_id}/shows/1396/season/invalid/ratings")
    
    # Assert
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

def test_get_episode_ratings_invalid_episode_number(client, user_fixture):
    """Test getting a specific episode rating with an invalid episode number."""
    # Arrange
    user_id = user_fixture["id"]
    
    # Act
    response = client.get(f"/api/users/{user_id}/shows/1396/season/1/ratings?episode_number=invalid")
    
    # Assert
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

def test_get_episode_ratings_empty_result(client, user_fixture):
    """Test getting all episode ratings for a season with no ratings."""
    # Arrange
    user_id = user_fixture["id"]
    
    # Act
    response = client.get(f"/api/users/{user_id}/shows/1396/season/5/ratings")
    
    # Assert
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) == 0

def test_get_episode_ratings_sorted_by_timestamp(client, user_fixture, get_db):
    """Test that episode ratings are returned sorted by most recent timestamp first."""
    # Arrange
    user_id = user_fixture["id"]
    db = get_db
    
    # Add multiple episode ratings with controlled timestamps
    import time
    from datetime import timedelta
    
    base_time = datetime.now(timezone.utc)
    episode_ratings = [
        {
            "user_id": user_id,
            "show_id": "sorting_test_show",
            "season_number": 1,
            "episode_number": 1,
            "rating": 8,
            "comment": "First episode - oldest rating"
        },
        {
            "user_id": user_id,
            "show_id": "sorting_test_show", 
            "season_number": 1,
            "episode_number": 2,
            "rating": 9,
            "comment": "Second episode - middle rating"
        },
        {
            "user_id": user_id,
            "show_id": "sorting_test_show",
            "season_number": 1,
            "episode_number": 3,
            "rating": 7,
            "comment": "Third episode - newest rating"
        }
    ]
    
    rating_ids = []
    
    try:
        # Add ratings with delays to ensure different timestamps
        for i, rating_data in enumerate(episode_ratings):
            if i > 0:
                time.sleep(1)  # Ensure different timestamps
            
            response = client.post(
                "/api/episode_ratings",
                data=json.dumps(rating_data),
                content_type="application/json"
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            rating_ids.append(data["id"])
        
        # Act - Get all episode ratings for the season
        response = client.get(f"/api/users/{user_id}/shows/sorting_test_show/season/1/ratings")
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 3 episode ratings
        assert len(data) == 3
        
        # Verify sorting - most recent first
        timestamps = [rating["timestamp"] for rating in data]
        
        # Check that timestamps are in descending order (most recent first)
        for i in range(len(timestamps) - 1):
            current_time = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
            next_time = datetime.fromisoformat(timestamps[i + 1].replace('Z', '+00:00'))
            assert current_time >= next_time
        
        # The last added rating (episode 3) should be first due to most recent timestamp
        assert data[0]["episode_number"] == 3
        assert data[0]["comment"] == "Third episode - newest rating"
        
        # The first added rating (episode 1) should be last due to oldest timestamp
        assert data[2]["episode_number"] == 1
        assert data[2]["comment"] == "First episode - oldest rating"
    
    finally:
        # Clean up test data
        for rating_id in rating_ids:
            try:
                db.collection("episode_ratings").document(rating_id).delete()
            except Exception:
                pass

def test_episode_ratings_sorting_with_identical_timestamps(client, user_fixture, get_db):
    """Test episode ratings sorting when timestamps are identical."""
    # Arrange
    user_id = user_fixture["id"]
    db = get_db
    
    # Create episode ratings with identical timestamps by adding them to database directly
    same_timestamp = datetime.now(timezone.utc).isoformat()
    episode_ratings = [
        {
            'user_id': user_id,
            'show_id': 'identical_timestamp_show',
            'season_number': 1,
            'episode_number': 1,
            'rating': 8,
            'comment': 'Episode 1',
            'timestamp': same_timestamp
        },
        {
            'user_id': user_id,
            'show_id': 'identical_timestamp_show',
            'season_number': 1,
            'episode_number': 2,
            'rating': 9,
            'comment': 'Episode 2',
            'timestamp': same_timestamp
        },
        {
            'user_id': user_id,
            'show_id': 'identical_timestamp_show',
            'season_number': 1,
            'episode_number': 3,
            'rating': 7,
            'comment': 'Episode 3',
            'timestamp': same_timestamp
        }
    ]
    
    rating_ids = []
    
    try:
        # Add ratings directly to database with identical timestamps
        for rating_data in episode_ratings:
            _, rating_ref = db.collection("episode_ratings").add(rating_data)
            rating_ids.append(rating_ref.id)
        
        # Act
        response = client.get(f"/api/users/{user_id}/shows/identical_timestamp_show/season/1/ratings")
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 3 episode ratings
        assert len(data) == 3
        
        # All timestamps should be identical
        timestamps = [rating["timestamp"] for rating in data]
        assert all(ts == timestamps[0] for ts in timestamps)
        
        # All episodes should be present
        episode_numbers = [rating["episode_number"] for rating in data]
        assert sorted(episode_numbers) == [1, 2, 3]
    
    finally:
        # Clean up test data
        for rating_id in rating_ids:
            try:
                db.collection("episode_ratings").document(rating_id).delete()
            except Exception:
                pass
