import pytest
import json
from datetime import datetime, timezone, timedelta


class TestRatingSorting:
    """Test sorting functionality for all rating endpoints using real database operations"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self, get_db):
        """Set up test data in the database before each test"""
        self.db = get_db
        self.test_user_ids = []
        self.test_rating_ids = []
        self.test_episode_rating_ids = []
        
        # Create test users
        base_time = datetime.now(timezone.utc)
        test_users = [
            {
                'name': 'Test User One',
                'username': 'testuser1',
                'email': 'testuser1@example.com',
                'name_lowercase': 'test user one',
                'username_lowercase': 'testuser1',
                'created_at': base_time.isoformat()
            },
            {
                'name': 'Test User Two',
                'username': 'testuser2',
                'email': 'testuser2@example.com',
                'name_lowercase': 'test user two',
                'username_lowercase': 'testuser2',
                'created_at': base_time.isoformat()
            }
        ]
        
        # Add users to database
        for user_data in test_users:
            _, user_ref = self.db.collection("users").add(user_data)
            self.test_user_ids.append(user_ref.id)
        
        # Create test ratings with controlled timestamps
        test_ratings = [
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_1',
                'show_name_lowercase': 'breaking bad',
                'rating': 9,
                'comment': 'Amazing show!',
                'timestamp': (base_time - timedelta(hours=3)).isoformat()  # 3 hours ago
            },
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_2',
                'show_name_lowercase': 'stranger things',
                'rating': 8,
                'comment': 'Great series!',
                'timestamp': (base_time - timedelta(hours=1)).isoformat()  # 1 hour ago
            },
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_3',
                'show_name_lowercase': 'the wire',
                'rating': 10,
                'comment': 'Masterpiece!',
                'timestamp': base_time.isoformat()  # Most recent
            },
            {
                'user_id': self.test_user_ids[1],
                'show_id': 'show_1',
                'show_name_lowercase': 'breaking bad',
                'rating': 8,
                'comment': 'Really good!',
                'timestamp': (base_time - timedelta(hours=2)).isoformat()  # 2 hours ago
            }
        ]
        
        # Add ratings to database
        for rating_data in test_ratings:
            _, rating_ref = self.db.collection("ratings").add(rating_data)
            self.test_rating_ids.append(rating_ref.id)
        
        # Create test episode ratings with controlled timestamps
        test_episode_ratings = [
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_1',
                'season_number': 1,
                'episode_number': 1,
                'rating': 8,
                'comment': 'Good pilot!',
                'timestamp': (base_time - timedelta(hours=5)).isoformat()  # 5 hours ago
            },
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_1',
                'season_number': 1,
                'episode_number': 2,
                'rating': 9,
                'comment': 'Even better!',
                'timestamp': (base_time - timedelta(hours=2)).isoformat()  # 2 hours ago
            },
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_1',
                'season_number': 1,
                'episode_number': 3,
                'rating': 7,
                'comment': 'Decent episode',
                'timestamp': (base_time - timedelta(minutes=30)).isoformat()  # 30 minutes ago (most recent)
            }
        ]
        
        # Add episode ratings to database
        for episode_rating_data in test_episode_ratings:
            _, episode_rating_ref = self.db.collection("episode_ratings").add(episode_rating_data)
            self.test_episode_rating_ids.append(episode_rating_ref.id)
        
        yield
        
        # Clean up test data
        for rating_id in self.test_rating_ids:
            try:
                self.db.collection("ratings").document(rating_id).delete()
            except Exception:
                pass
        
        for episode_rating_id in self.test_episode_rating_ids:
            try:
                self.db.collection("episode_ratings").document(episode_rating_id).delete()
            except Exception:
                pass
        
        for user_id in self.test_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass
    
    def test_get_user_ratings_sorted_by_most_recent(self, get_client):
        """Test that user ratings are returned sorted by most recent timestamp first"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 3 ratings for this user
        assert len(data) == 3
        
        # Verify sorting - most recent first
        timestamps = [rating["timestamp"] for rating in data]
        
        # Check that timestamps are in descending order (most recent first)
        for i in range(len(timestamps) - 1):
            current_time = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
            next_time = datetime.fromisoformat(timestamps[i + 1].replace('Z', '+00:00'))
            assert current_time >= next_time
        
        # Verify the specific order based on our test data
        assert data[0]["show_name_lowercase"] == "the wire"  # Most recent
        assert data[1]["show_name_lowercase"] == "stranger things"  # 1 hour ago
        assert data[2]["show_name_lowercase"] == "breaking bad"  # 3 hours ago
    
    def test_get_user_ratings_empty_result(self, get_client):
        """Test user ratings endpoint with user who has no ratings"""
        # Create a user with no ratings
        user_data = {
            'name': 'No Ratings User',
            'username': 'noratings',
            'email': 'noratings@example.com',
            'name_lowercase': 'no ratings user',
            'username_lowercase': 'noratings',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        _, user_ref = self.db.collection("users").add(user_data)
        user_id = user_ref.id
        self.test_user_ids.append(user_id)
        
        response = get_client.get(f"/api/users/{user_id}/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []
    
    def test_get_user_ratings_user_not_found(self, get_client):
        """Test user ratings endpoint when user doesn't exist"""
        response = get_client.get("/api/users/nonexistent_user/ratings")
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["error"] == "User not found"
    
    def test_get_show_ratings_sorted_by_most_recent(self, get_client):
        """Test that show ratings are returned sorted by most recent timestamp first"""
        response = get_client.get("/api/shows/show_1/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 2 ratings for show_1 (from both users)
        assert len(data) == 2
        
        # Verify sorting - most recent first
        timestamps = [rating["timestamp"] for rating in data]
        
        # Check that timestamps are in descending order
        for i in range(len(timestamps) - 1):
            current_time = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
            next_time = datetime.fromisoformat(timestamps[i + 1].replace('Z', '+00:00'))
            assert current_time >= next_time
        
        # Verify the specific order - user2's rating (2 hours ago) should come before user1's rating (3 hours ago)
        assert data[0]["user_id"] == self.test_user_ids[1]  # More recent rating
        assert data[1]["user_id"] == self.test_user_ids[0]  # Older rating
    
    def test_get_show_ratings_empty_result(self, get_client):
        """Test show ratings endpoint with show that has no ratings"""
        response = get_client.get("/api/shows/nonexistent_show/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []
    
    def test_get_episode_ratings_sorted_by_most_recent(self, get_client):
        """Test that episode ratings are returned sorted by most recent timestamp first"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/shows/show_1/season/1/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 3 episode ratings for this season
        assert len(data) == 3
        
        # Verify sorting - most recent first
        timestamps = [rating["timestamp"] for rating in data]
        
        # Check that timestamps are in descending order
        for i in range(len(timestamps) - 1):
            current_time = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
            next_time = datetime.fromisoformat(timestamps[i + 1].replace('Z', '+00:00'))
            assert current_time >= next_time
        
        # Verify the specific order based on our test data
        assert data[0]["episode_number"] == 3  # Most recent (30 minutes ago)
        assert data[1]["episode_number"] == 2  # 2 hours ago
        assert data[2]["episode_number"] == 1  # 5 hours ago
    
    def test_get_specific_episode_rating(self, get_client):
        """Test getting a specific episode rating (no sorting needed for single result)"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/shows/show_1/season/1/ratings?episode_number=2")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should return single episode rating
        assert data["episode_number"] == 2
        assert data["rating"] == 9
        assert data["comment"] == "Even better!"
    
    def test_get_episode_ratings_user_not_found(self, get_client):
        """Test episode ratings endpoint when user doesn't exist"""
        response = get_client.get("/api/users/nonexistent_user/shows/show_1/season/1/ratings")
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["error"] == "User not found"
    
    def test_get_episode_ratings_invalid_season_number(self, get_client):
        """Test episode ratings endpoint with invalid season number"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/shows/show_1/season/invalid/ratings")
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["error"] == "Season number must be an integer"
    
    def test_search_user_rated_shows_sorted_by_relevance_then_timestamp(self, get_client):
        """Test that search results are sorted by relevance first, then by timestamp"""
        user_id = self.test_user_ids[0]
        
        # Add additional ratings for testing search sorting
        base_time = datetime.now(timezone.utc)
        additional_ratings = [
            {
                'user_id': user_id,
                'show_id': 'show_4',
                'show_name_lowercase': 'breaking point',  # Prefix match
                'rating': 7,
                'comment': 'Decent show',
                'timestamp': (base_time - timedelta(minutes=30)).isoformat()  # Recent prefix match
            },
            {
                'user_id': user_id,
                'show_id': 'show_5',
                'show_name_lowercase': 'breaking dawn',  # Prefix match
                'rating': 6,
                'comment': 'Okay show',
                'timestamp': (base_time - timedelta(hours=4)).isoformat()  # Older prefix match
            }
        ]
        
        # Add additional ratings to database
        additional_rating_ids = []
        for rating_data in additional_ratings:
            _, rating_ref = self.db.collection("ratings").add(rating_data)
            additional_rating_ids.append(rating_ref.id)
        
        try:
            # Search for "breaking" - should find "breaking bad", "breaking point", "breaking dawn"
            response = get_client.get(f"/api/users/{user_id}/rated-shows/search?query=breaking")
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Should find 3 shows with "breaking" in the name
            results = data["results"]
            assert len(results) == 3
            
            # Verify sorting logic:
            # 1. Exact matches first (none in this case)
            # 2. Prefix matches sorted by timestamp (most recent first)
            # 3. Contains matches sorted by timestamp (most recent first)
            
            show_names = [result["show_name_lowercase"] for result in results]
            timestamps = [result["timestamp"] for result in results]
            
            # All should be prefix matches starting with "breaking"
            for show_name in show_names:
                assert show_name.startswith("breaking")
        
        finally:
            # Clean up additional ratings
            for rating_id in additional_rating_ids:
                try:
                    self.db.collection("ratings").document(rating_id).delete()
                except Exception:
                    pass
    
    def test_search_user_rated_shows_empty_query(self, get_client):
        """Test search with empty query returns error"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/rated-shows/search?query=")
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "errors" in data
        assert any("Query parameter is required" in str(error) for error in data["errors"])
    
    def test_search_user_rated_shows_no_matches(self, get_client):
        """Test search with no matching results"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/rated-shows/search?query=nonexistent")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["results"] == []
        assert data["total_results"] == 0
    
    def test_search_user_rated_shows_user_not_found(self, get_client):
        """Test search when user doesn't exist"""
        response = get_client.get("/api/users/nonexistent_user/rated-shows/search?query=breaking")
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["error"] == "User not found"


class TestRatingSortingWithIdenticalTimestamps:
    """Test edge cases with identical timestamps"""
    
    @pytest.fixture(autouse=True)
    def setup_identical_timestamp_data(self, get_db):
        """Set up test data with identical timestamps"""
        self.db = get_db
        self.test_user_ids = []
        self.test_rating_ids = []
        
        # Create test user
        user_data = {
            'name': 'Timestamp Test User',
            'username': 'timestampuser',
            'email': 'timestamp@example.com',
            'name_lowercase': 'timestamp test user',
            'username_lowercase': 'timestampuser',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        _, user_ref = self.db.collection("users").add(user_data)
        self.test_user_ids.append(user_ref.id)
        
        # Create ratings with identical timestamps
        same_timestamp = datetime.now(timezone.utc).isoformat()
        identical_timestamp_ratings = [
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_a',
                'show_name_lowercase': 'show a',
                'rating': 9,
                'comment': 'First rating',
                'timestamp': same_timestamp
            },
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_b',
                'show_name_lowercase': 'show b',
                'rating': 8,
                'comment': 'Second rating',
                'timestamp': same_timestamp
            },
            {
                'user_id': self.test_user_ids[0],
                'show_id': 'show_c',
                'show_name_lowercase': 'show c',
                'rating': 7,
                'comment': 'Third rating',
                'timestamp': same_timestamp
            }
        ]
        
        # Add ratings to database
        for rating_data in identical_timestamp_ratings:
            _, rating_ref = self.db.collection("ratings").add(rating_data)
            self.test_rating_ids.append(rating_ref.id)
        
        yield
        
        # Clean up test data
        for rating_id in self.test_rating_ids:
            try:
                self.db.collection("ratings").document(rating_id).delete()
            except Exception:
                pass
        
        for user_id in self.test_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass
    
    def test_user_ratings_with_identical_timestamps(self, get_client):
        """Test that ratings with identical timestamps are handled gracefully"""
        user_id = self.test_user_ids[0]
        
        response = get_client.get(f"/api/users/{user_id}/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 3 ratings
        assert len(data) == 3
        
        # All timestamps should be identical
        timestamps = [rating["timestamp"] for rating in data]
        assert all(ts == timestamps[0] for ts in timestamps)
        
        # All ratings should be present
        show_ids = [rating["show_id"] for rating in data]
        assert "show_a" in show_ids
        assert "show_b" in show_ids
        assert "show_c" in show_ids


class TestRatingSortingIntegration:
    """Integration tests for rating sorting across multiple endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_integration_data(self, get_db):
        """Set up comprehensive test data for integration testing"""
        self.db = get_db
        self.test_user_ids = []
        self.test_rating_ids = []
        
        # Create test user
        user_data = {
            'name': 'Integration Test User',
            'username': 'integrationuser',
            'email': 'integration@example.com',
            'name_lowercase': 'integration test user',
            'username_lowercase': 'integrationuser',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        _, user_ref = self.db.collection("users").add(user_data)
        self.test_user_ids.append(user_ref.id)
        
        yield
        
        # Clean up test data
        for rating_id in self.test_rating_ids:
            try:
                self.db.collection("ratings").document(rating_id).delete()
            except Exception:
                pass
        
        for user_id in self.test_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass
    
    def test_add_rating_and_verify_sorting(self, get_client):
        """Test adding ratings and verifying they appear in correct sorted order"""
        user_id = self.test_user_ids[0]
        
        # Add first rating
        rating_data_1 = {
            'user_id': user_id,
            'show_id': 'integration_show_1',
            'show_name_lowercase': 'integration show one',
            'rating': 8,
            'comment': 'First rating'
        }
        
        response = get_client.post("/api/ratings",
                                 data=json.dumps(rating_data_1),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        self.test_rating_ids.append(data["id"])
        
        # Wait a moment to ensure different timestamps
        import time
        time.sleep(1)
        
        # Add second rating
        rating_data_2 = {
            'user_id': user_id,
            'show_id': 'integration_show_2',
            'show_name_lowercase': 'integration show two',
            'rating': 9,
            'comment': 'Second rating'
        }
        
        response = get_client.post("/api/ratings",
                                 data=json.dumps(rating_data_2),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        self.test_rating_ids.append(data["id"])
        
        # Get user ratings and verify sorting
        response = get_client.get(f"/api/users/{user_id}/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have 2 ratings, with most recent first
        assert len(data) == 2
        assert data[0]["show_name_lowercase"] == "integration show two"  # More recent
        assert data[1]["show_name_lowercase"] == "integration show one"  # Older
        
        # Verify timestamps are in descending order
        timestamp_1 = datetime.fromisoformat(data[0]["timestamp"].replace('Z', '+00:00'))
        timestamp_2 = datetime.fromisoformat(data[1]["timestamp"].replace('Z', '+00:00'))
        assert timestamp_1 >= timestamp_2
    
    def test_update_existing_rating_maintains_sorting(self, get_client):
        """Test that updating an existing rating maintains proper sorting"""
        user_id = self.test_user_ids[0]
        
        # Add initial rating
        rating_data = {
            'user_id': user_id,
            'show_id': 'update_test_show',
            'show_name_lowercase': 'update test show',
            'rating': 7,
            'comment': 'Initial rating'
        }
        
        response = get_client.post("/api/ratings",
                                 data=json.dumps(rating_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        self.test_rating_ids.append(data["id"])
        
        # Wait a moment
        import time
        time.sleep(1)
        
        # Update the same rating
        updated_rating_data = {
            'user_id': user_id,
            'show_id': 'update_test_show',
            'show_name_lowercase': 'update test show',
            'rating': 9,
            'comment': 'Updated rating'
        }
        
        response = get_client.post("/api/ratings",
                                 data=json.dumps(updated_rating_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        
        # Get user ratings and verify the updated rating has new timestamp
        response = get_client.get(f"/api/users/{user_id}/ratings")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should still have only 1 rating (updated, not duplicated)
        assert len(data) == 1
        assert data[0]["rating"] == 9
        assert data[0]["comment"] == "Updated rating"
        
        # Timestamp should be recent (within last few seconds)
        rating_time = datetime.fromisoformat(data[0]["timestamp"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        time_diff = now - rating_time
        assert time_diff.total_seconds() < 10  # Should be very recent
