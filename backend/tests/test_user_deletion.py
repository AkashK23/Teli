import pytest
import json
from datetime import datetime, timezone


class TestUserDeletion:
    """
    Comprehensive integration tests for user deletion functionality.
    Tests complete removal of user and all associated data using real database operations.
    """
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self, get_db, get_client):
        """Set up comprehensive test scenario with multiple users and relationships"""
        self.db = get_db
        self.client = get_client
        self.created_user_ids = []
        self.created_data_ids = {
            "ratings": [],
            "episode_ratings": [],
            "watch_status": [],
            "watchlists": [],
            "follows": []
        }
        
        yield
        
        # Cleanup any remaining test data
        self.cleanup_test_data()
    
    def cleanup_test_data(self):
        """Clean up any remaining test data"""
        # Delete users
        for user_id in self.created_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass
        
        # Delete other data types
        for collection_name, doc_ids in self.created_data_ids.items():
            for doc_id in doc_ids:
                try:
                    self.db.collection(collection_name).document(doc_id).delete()
                except Exception:
                    pass
        
        # Clean up feeds
        for user_id in self.created_user_ids:
            try:
                feed_items = self.db.collection("feeds").document(user_id).collection("items").stream()
                for item in feed_items:
                    item.reference.delete()
            except Exception:
                pass
    
    def create_test_user(self, username_suffix=""):
        """Create a test user and return user data"""
        user_data = {
            "name": f"Test User{username_suffix}",
            "username": f"testuser{username_suffix}",
            "email": f"test{username_suffix}@example.com",
            "bio": f"Test bio{username_suffix}"
        }
        
        response = self.client.post("/api/add_user", 
                                  json=user_data,
                                  content_type="application/json")
        
        assert response.status_code == 200
        result = json.loads(response.data)
        user_id = result["id"]
        self.created_user_ids.append(user_id)
        
        return user_id, user_data
    
    def add_rating(self, user_id, show_id="test_show", rating=8, comment="Great show!"):
        """Add a rating and return rating ID"""
        rating_data = {
            "user_id": user_id,
            "show_id": show_id,
            "show_name_lowercase": show_id.replace("_", " "),
            "rating": rating,
            "comment": comment
        }
        
        response = self.client.post("/api/ratings",
                                  json=rating_data,
                                  content_type="application/json")
        
        assert response.status_code == 200
        result = json.loads(response.data)
        rating_id = result["id"]
        self.created_data_ids["ratings"].append(rating_id)
        
        return rating_id
    
    def add_episode_rating(self, user_id, show_id="test_show", season=1, episode=1, rating=9):
        """Add an episode rating and return rating ID"""
        episode_rating_data = {
            "user_id": user_id,
            "show_id": show_id,
            "season_number": season,
            "episode_number": episode,
            "rating": rating,
            "comment": "Amazing episode!"
        }
        
        response = self.client.post("/api/episode_ratings",
                                  json=episode_rating_data,
                                  content_type="application/json")
        
        assert response.status_code == 200
        result = json.loads(response.data)
        rating_id = result["id"]
        self.created_data_ids["episode_ratings"].append(rating_id)
        
        return rating_id
    
    def add_watch_status(self, user_id, show_id="test_show", status="currently_watching"):
        """Add watch status and return status ID"""
        watch_data = {
            "user_id": user_id,
            "show_id": show_id,
            "status": status,
            "current_season": 2,
            "current_episode": 5,
            "notes": "Really enjoying this!"
        }
        
        response = self.client.post("/api/update_watch_status",
                                  json=watch_data,
                                  content_type="application/json")
        
        assert response.status_code in [200, 201]
        result = json.loads(response.data)
        status_id = result["id"]
        self.created_data_ids["watch_status"].append(status_id)
        
        return status_id
    
    def add_to_watchlist(self, user_id, show_id="test_show"):
        """Add to watchlist and return watchlist ID"""
        watchlist_data = {
            "user_id": user_id,
            "show_id": show_id
        }
        
        response = self.client.post("/api/add_to_watchlist",
                                  json=watchlist_data,
                                  content_type="application/json")
        
        assert response.status_code == 200
        result = json.loads(response.data)
        watchlist_id = result["id"]
        self.created_data_ids["watchlists"].append(watchlist_id)
        
        return watchlist_id
    
    def follow_user(self, follower_id, followee_id):
        """Create follow relationship"""
        follow_data = {
            "follower_id": follower_id,
            "followee_id": followee_id
        }
        
        response = self.client.post("/api/follow",
                                  json=follow_data,
                                  content_type="application/json")
        
        assert response.status_code == 200
        return True


class TestBasicUserDeletion(TestUserDeletion):
    """Test basic user deletion functionality"""
    
    def test_delete_existing_user(self):
        """Test successful deletion of an existing user"""
        # Create a user
        user_id, user_data = self.create_test_user("_basic")
        
        # Verify user exists
        response = self.client.get(f"/api/user/{user_id}")
        assert response.status_code == 200
        
        # Delete the user
        response = self.client.delete(f"/api/user/{user_id}")
        assert response.status_code == 200
        
        result = json.loads(response.data)
        assert result["message"] == "User deleted successfully"
        
        # Verify user no longer exists
        response = self.client.get(f"/api/user/{user_id}")
        assert response.status_code == 404
        
        # Remove from cleanup list since it's already deleted
        self.created_user_ids.remove(user_id)
    
    def test_delete_nonexistent_user(self):
        """Test deletion of non-existent user returns 404"""
        response = self.client.delete("/api/user/nonexistent123")
        assert response.status_code == 404
        
        result = json.loads(response.data)
        assert result["error"] == "User not found"


class TestRatingsCleanup(TestUserDeletion):
    """Test that user ratings are completely removed"""
    
    def test_show_ratings_cleanup(self):
        """Test that user's show ratings are removed from system"""
        # Create users
        user1_id, _ = self.create_test_user("_ratings1")
        user2_id, _ = self.create_test_user("_ratings2")
        
        # Add ratings for the same show
        show_id = "test_show_ratings"
        rating1_id = self.add_rating(user1_id, show_id, 8, "User 1 rating")
        rating2_id = self.add_rating(user2_id, show_id, 9, "User 2 rating")
        
        # Verify both ratings exist
        response = self.client.get(f"/api/shows/{show_id}/ratings")
        assert response.status_code == 200
        ratings = json.loads(response.data)
        assert len(ratings) == 2
        
        # Verify user1's ratings exist
        response = self.client.get(f"/api/users/{user1_id}/ratings")
        assert response.status_code == 200
        user1_ratings = json.loads(response.data)
        assert len(user1_ratings) == 1
        assert user1_ratings[0]["comment"] == "User 1 rating"
        
        # Delete user1
        response = self.client.delete(f"/api/user/{user1_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user1_id)
        
        # Verify user1's ratings are gone from show ratings
        response = self.client.get(f"/api/shows/{show_id}/ratings")
        assert response.status_code == 200
        remaining_ratings = json.loads(response.data)
        assert len(remaining_ratings) == 1
        assert remaining_ratings[0]["comment"] == "User 2 rating"
        assert remaining_ratings[0]["user_id"] == user2_id
        
        # Verify user1's ratings endpoint returns 404
        response = self.client.get(f"/api/users/{user1_id}/ratings")
        assert response.status_code == 404
        
        # Verify user2's ratings are unaffected
        response = self.client.get(f"/api/users/{user2_id}/ratings")
        assert response.status_code == 200
        user2_ratings = json.loads(response.data)
        assert len(user2_ratings) == 1
        assert user2_ratings[0]["comment"] == "User 2 rating"
    
    def test_episode_ratings_cleanup(self):
        """Test that user's episode ratings are completely removed"""
        # Create users
        user1_id, _ = self.create_test_user("_episode1")
        user2_id, _ = self.create_test_user("_episode2")
        
        # Add episode ratings
        show_id = "test_show_episodes"
        ep_rating1_id = self.add_episode_rating(user1_id, show_id, 1, 1, 8)
        ep_rating2_id = self.add_episode_rating(user1_id, show_id, 1, 2, 9)
        ep_rating3_id = self.add_episode_rating(user2_id, show_id, 1, 1, 7)
        
        # Verify user1's episode ratings exist
        response = self.client.get(f"/api/users/{user1_id}/shows/{show_id}/season/1/ratings")
        assert response.status_code == 200
        user1_episodes = json.loads(response.data)
        assert len(user1_episodes) == 2
        
        # Verify specific episode rating exists
        response = self.client.get(f"/api/users/{user1_id}/shows/{show_id}/season/1/ratings?episode_number=1")
        assert response.status_code == 200
        episode_rating = json.loads(response.data)
        assert episode_rating["rating"] == 8
        
        # Delete user1
        response = self.client.delete(f"/api/user/{user1_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user1_id)
        
        # Verify user1's episode ratings are gone
        response = self.client.get(f"/api/users/{user1_id}/shows/{show_id}/season/1/ratings")
        assert response.status_code == 404
        
        # Verify specific episode rating is gone
        response = self.client.get(f"/api/users/{user1_id}/shows/{show_id}/season/1/ratings?episode_number=1")
        assert response.status_code == 404
        
        # Verify user2's episode ratings are unaffected
        response = self.client.get(f"/api/users/{user2_id}/shows/{show_id}/season/1/ratings")
        assert response.status_code == 200
        user2_episodes = json.loads(response.data)
        assert len(user2_episodes) == 1
        assert user2_episodes[0]["rating"] == 7


class TestSocialFeaturesCleanup(TestUserDeletion):
    """Test that social features are properly cleaned up"""
    
    def test_follow_relationships_cleanup(self):
        """Test that all follow relationships are removed"""
        # Create users: A, B, C
        userA_id, _ = self.create_test_user("_socialA")
        userB_id, _ = self.create_test_user("_socialB")
        userC_id, _ = self.create_test_user("_socialC")
        
        # Create follow relationships:
        # A follows B, B follows C, C follows A
        self.follow_user(userA_id, userB_id)
        self.follow_user(userB_id, userC_id)
        self.follow_user(userC_id, userA_id)
        
        # Verify relationships exist
        response = self.client.get(f"/api/users/{userA_id}/following")
        assert response.status_code == 200
        following = json.loads(response.data)
        assert userB_id in following["following"]
        
        response = self.client.get(f"/api/users/{userB_id}/followers")
        assert response.status_code == 200
        followers = json.loads(response.data)
        assert userA_id in followers["followers"]
        
        response = self.client.get(f"/api/users/{userB_id}/following")
        assert response.status_code == 200
        following = json.loads(response.data)
        assert userC_id in following["following"]
        
        # Delete userB
        response = self.client.delete(f"/api/user/{userB_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(userB_id)
        
        # Verify userA no longer follows userB
        response = self.client.get(f"/api/users/{userA_id}/following")
        assert response.status_code == 200
        following = json.loads(response.data)
        assert userB_id not in following["following"]
        
        # Verify userC no longer has userB as follower
        response = self.client.get(f"/api/users/{userC_id}/followers")
        assert response.status_code == 200
        followers = json.loads(response.data)
        assert userB_id not in followers["followers"]
        
        # Verify userC still follows userA (unaffected relationship)
        response = self.client.get(f"/api/users/{userC_id}/following")
        assert response.status_code == 200
        following = json.loads(response.data)
        assert userA_id in following["following"]


class TestFeedCleanup(TestUserDeletion):
    """Test that deleted user's content is removed from all feeds"""
    
    def test_comprehensive_feed_cleanup(self):
        """Test that deleted user's ratings are removed from all followers' feeds"""
        # Create users: A, B, C
        userA_id, _ = self.create_test_user("_feedA")
        userB_id, _ = self.create_test_user("_feedB")
        userC_id, _ = self.create_test_user("_feedC")
        
        # Create follow relationships: A follows B, C follows B
        self.follow_user(userA_id, userB_id)
        self.follow_user(userC_id, userB_id)
        
        # UserB adds ratings (should appear in A's and C's feeds)
        rating1_id = self.add_rating(userB_id, "show1", 8, "B's rating 1")
        rating2_id = self.add_rating(userB_id, "show2", 9, "B's rating 2")
        
        # UserA also adds a rating (should appear in no one's feed since no one follows A)
        rating3_id = self.add_rating(userA_id, "show3", 7, "A's rating")
        
        # Verify userA's feed contains userB's ratings
        response = self.client.get(f"/api/users/{userA_id}/feed")
        assert response.status_code == 200
        feedA = json.loads(response.data)
        userB_items_in_A = [item for item in feedA["feed"] if item["user_id"] == userB_id]
        assert len(userB_items_in_A) >= 2  # Should have userB's ratings
        
        # Verify userC's feed contains userB's ratings
        response = self.client.get(f"/api/users/{userC_id}/feed")
        assert response.status_code == 200
        feedC = json.loads(response.data)
        userB_items_in_C = [item for item in feedC["feed"] if item["user_id"] == userB_id]
        assert len(userB_items_in_C) >= 2  # Should have userB's ratings
        
        # Delete userB
        response = self.client.delete(f"/api/user/{userB_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(userB_id)
        
        # Verify userA's feed no longer contains userB's content
        response = self.client.get(f"/api/users/{userA_id}/feed")
        assert response.status_code == 200
        feedA_after = json.loads(response.data)
        userB_items_after_A = [item for item in feedA_after["feed"] if item["user_id"] == userB_id]
        assert len(userB_items_after_A) == 0  # No userB content should remain
        
        # Verify userC's feed no longer contains userB's content
        response = self.client.get(f"/api/users/{userC_id}/feed")
        assert response.status_code == 200
        feedC_after = json.loads(response.data)
        userB_items_after_C = [item for item in feedC_after["feed"] if item["user_id"] == userB_id]
        assert len(userB_items_after_C) == 0  # No userB content should remain
        
        # Verify userA's own content is unaffected (if they had any followers)
        # Since no one follows userA, their feed should be empty anyway
        response = self.client.get(f"/api/users/{userA_id}/feed")
        assert response.status_code == 200


class TestWatchStatusCleanup(TestUserDeletion):
    """Test that watch status records are properly cleaned up"""
    
    def test_watch_status_cleanup(self):
        """Test that user's watch status records are completely removed"""
        # Create users
        user1_id, _ = self.create_test_user("_watch1")
        user2_id, _ = self.create_test_user("_watch2")
        
        # Add watch status for both users
        status1_id = self.add_watch_status(user1_id, "show1", "currently_watching")
        status2_id = self.add_watch_status(user1_id, "show2", "want_to_watch")
        status3_id = self.add_watch_status(user2_id, "show1", "currently_watching")
        
        # Verify user1's watch status exists
        response = self.client.get(f"/api/users/{user1_id}/currently_watching")
        assert response.status_code == 200
        watching = json.loads(response.data)
        assert len(watching) == 1
        assert watching[0]["show_id"] == "show1"
        
        response = self.client.get(f"/api/users/{user1_id}/want_to_watch")
        assert response.status_code == 200
        want_to_watch = json.loads(response.data)
        assert len(want_to_watch) == 1
        assert want_to_watch[0]["show_id"] == "show2"
        
        # Verify specific watch status exists
        response = self.client.get(f"/api/users/{user1_id}/watch_status/show1")
        assert response.status_code == 200
        status = json.loads(response.data)
        assert status["status"] == "currently_watching"
        
        # Delete user1
        response = self.client.delete(f"/api/user/{user1_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user1_id)
        
        # Verify user1's watch status is gone
        response = self.client.get(f"/api/users/{user1_id}/currently_watching")
        assert response.status_code == 404
        
        response = self.client.get(f"/api/users/{user1_id}/want_to_watch")
        assert response.status_code == 404
        
        response = self.client.get(f"/api/users/{user1_id}/watch_status/show1")
        assert response.status_code == 404
        
        # Verify user2's watch status is unaffected
        response = self.client.get(f"/api/users/{user2_id}/currently_watching")
        assert response.status_code == 200
        user2_watching = json.loads(response.data)
        assert len(user2_watching) == 1
        assert user2_watching[0]["show_id"] == "show1"


class TestWatchlistCleanup(TestUserDeletion):
    """Test that watchlist entries are properly cleaned up"""
    
    def test_watchlist_cleanup(self):
        """Test that user's watchlist entries are completely removed"""
        # Create users
        user1_id, _ = self.create_test_user("_watchlist1")
        user2_id, _ = self.create_test_user("_watchlist2")
        
        # Add to watchlists
        watchlist1_id = self.add_to_watchlist(user1_id, "show1")
        watchlist2_id = self.add_to_watchlist(user1_id, "show2")
        watchlist3_id = self.add_to_watchlist(user2_id, "show1")
        
        # Verify watchlist entries exist by checking database directly
        # (Note: There's no GET endpoint for watchlists, so we check the database)
        user1_watchlist = list(self.db.collection("watchlists").where("user_id", "==", user1_id).stream())
        assert len(user1_watchlist) == 2
        
        user2_watchlist = list(self.db.collection("watchlists").where("user_id", "==", user2_id).stream())
        assert len(user2_watchlist) == 1
        
        # Delete user1
        response = self.client.delete(f"/api/user/{user1_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user1_id)
        
        # Verify user1's watchlist entries are gone
        user1_watchlist_after = list(self.db.collection("watchlists").where("user_id", "==", user1_id).stream())
        assert len(user1_watchlist_after) == 0
        
        # Verify user2's watchlist is unaffected
        user2_watchlist_after = list(self.db.collection("watchlists").where("user_id", "==", user2_id).stream())
        assert len(user2_watchlist_after) == 1


class TestDataIntegrity(TestUserDeletion):
    """Test that other users' data remains intact after deletion"""
    
    def test_comprehensive_data_integrity(self):
        """Test that deleting one user doesn't affect other users' data"""
        # Create multiple users
        userA_id, userA_data = self.create_test_user("_integrityA")
        userB_id, userB_data = self.create_test_user("_integrityB")
        userC_id, userC_data = self.create_test_user("_integrityC")
        
        # Create comprehensive data for all users
        # Ratings
        ratingA1 = self.add_rating(userA_id, "show1", 8, "A's rating")
        ratingB1 = self.add_rating(userB_id, "show1", 9, "B's rating")
        ratingC1 = self.add_rating(userC_id, "show2", 7, "C's rating")
        
        # Episode ratings
        ep_ratingA = self.add_episode_rating(userA_id, "show1", 1, 1, 8)
        ep_ratingB = self.add_episode_rating(userB_id, "show1", 1, 2, 9)
        
        # Watch status
        watchA = self.add_watch_status(userA_id, "show1", "currently_watching")
        watchB = self.add_watch_status(userB_id, "show2", "want_to_watch")
        
        # Watchlists
        watchlistA = self.add_to_watchlist(userA_id, "show3")
        watchlistB = self.add_to_watchlist(userB_id, "show3")
        
        # Follow relationships
        self.follow_user(userA_id, userB_id)  # A follows B
        self.follow_user(userC_id, userB_id)  # C follows B
        self.follow_user(userB_id, userC_id)  # B follows C
        
        # Verify all data exists before deletion
        response = self.client.get(f"/api/users/{userB_id}/ratings")
        assert response.status_code == 200
        userB_ratings_before = json.loads(response.data)
        assert len(userB_ratings_before) == 1
        
        response = self.client.get(f"/api/users/{userC_id}/following")
        assert response.status_code == 200
        userC_following_before = json.loads(response.data)
        assert userB_id in userC_following_before["following"]
        
        # Delete userA (middle user with various relationships)
        response = self.client.delete(f"/api/user/{userA_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(userA_id)
        
        # Verify userB's data is completely intact
        response = self.client.get(f"/api/user/{userB_id}")
        assert response.status_code == 200
        userB_profile = json.loads(response.data)
        assert userB_profile["name"] == userB_data["name"]
        assert userB_profile["email"] == userB_data["email"]
        
        response = self.client.get(f"/api/users/{userB_id}/ratings")
        assert response.status_code == 200
        userB_ratings_after = json.loads(response.data)
        assert len(userB_ratings_after) == 1
        assert userB_ratings_after[0]["comment"] == "B's rating"
        
        response = self.client.get(f"/api/users/{userB_id}/shows/show1/season/1/ratings")
        assert response.status_code == 200
        userB_episodes = json.loads(response.data)
        assert len(userB_episodes) == 1
        assert userB_episodes[0]["episode_number"] == 2
        
        # Verify userC's data is completely intact
        response = self.client.get(f"/api/user/{userC_id}")
        assert response.status_code == 200
        userC_profile = json.loads(response.data)
        assert userC_profile["name"] == userC_data["name"]
        
        response = self.client.get(f"/api/users/{userC_id}/ratings")
        assert response.status_code == 200
        userC_ratings = json.loads(response.data)
        assert len(userC_ratings) == 1
        assert userC_ratings[0]["comment"] == "C's rating"
        
        # Verify follow relationships are properly updated
        response = self.client.get(f"/api/users/{userB_id}/followers")
        assert response.status_code == 200
        userB_followers = json.loads(response.data)
        assert userA_id not in userB_followers["followers"]  # A is gone
        assert userC_id in userB_followers["followers"]      # C still follows B
        
        response = self.client.get(f"/api/users/{userB_id}/following")
        assert response.status_code == 200
        userB_following = json.loads(response.data)
        assert userC_id in userB_following["following"]      # B still follows C
        
        # Verify show ratings still include remaining users
        response = self.client.get("/api/shows/show1/ratings")
        assert response.status_code == 200
        show1_ratings = json.loads(response.data)
        user_ids_in_ratings = [r["user_id"] for r in show1_ratings]
        assert userA_id not in user_ids_in_ratings  # A's rating is gone
        assert userB_id in user_ids_in_ratings      # B's rating remains


class TestErrorHandling(TestUserDeletion):
    """Test error handling scenarios"""
    
    def test_delete_nonexistent_user_detailed(self):
        """Test detailed error handling for non-existent user"""
        # Try to delete a user that never existed
        response = self.client.delete("/api/user/never_existed_123")
        assert response.status_code == 404
        
        result = json.loads(response.data)
        assert "error" in result
        assert result["error"] == "User not found"
    
    def test_delete_already_deleted_user(self):
        """Test deleting a user that was already deleted"""
        # Create and delete a user
        user_id, _ = self.create_test_user("_already_deleted")
        
        response = self.client.delete(f"/api/user/{user_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user_id)
        
        # Try to delete the same user again
        response = self.client.delete(f"/api/user/{user_id}")
        assert response.status_code == 404
        
        result = json.loads(response.data)
        assert result["error"] == "User not found"


class TestComplexScenarios(TestUserDeletion):
    """Test complex real-world scenarios"""
    
    def test_delete_user_with_maximum_data(self):
        """Test deleting a user with maximum amount of associated data"""
        # Create a user with extensive data
        user_id, _ = self.create_test_user("_maxdata")
        
        # Add multiple ratings
        for i in range(5):
            self.add_rating(user_id, f"show_{i}", 8 + i % 3, f"Rating {i}")
        
        # Add multiple episode ratings
        for season in range(1, 4):
            for episode in range(1, 6):
                self.add_episode_rating(user_id, "big_show", season, episode, 7 + (episode % 4))
        
        # Add multiple watch statuses
        for i in range(3):
            self.add_watch_status(user_id, f"watch_show_{i}", "currently_watching" if i % 2 == 0 else "want_to_watch")
        
        # Add multiple watchlist entries
        for i in range(4):
            self.add_to_watchlist(user_id, f"watchlist_show_{i}")
        
        # Create multiple followers and followees
        followers = []
        followees = []
        for i in range(3):
            follower_id, _ = self.create_test_user(f"_follower_{i}")
            followee_id, _ = self.create_test_user(f"_followee_{i}")
            followers.append(follower_id)
            followees.append(followee_id)
            
            self.follow_user(follower_id, user_id)  # They follow our user
            self.follow_user(user_id, followee_id)  # Our user follows them
        
        # Verify extensive data exists
        response = self.client.get(f"/api/users/{user_id}/ratings")
        assert response.status_code == 200
        ratings = json.loads(response.data)
        assert len(ratings) == 5
        
        response = self.client.get(f"/api/users/{user_id}/following")
        assert response.status_code == 200
        following = json.loads(response.data)
        assert len(following["following"]) == 3
        
        response = self.client.get(f"/api/users/{user_id}/followers")
        assert response.status_code == 200
        followers_data = json.loads(response.data)
        assert len(followers_data["followers"]) == 3
        
        # Verify episode ratings exist
        response = self.client.get(f"/api/users/{user_id}/shows/big_show/season/1/ratings")
        assert response.status_code == 200
        episodes = json.loads(response.data)
        assert len(episodes) == 5  # 5 episodes in season 1
        
        # Verify watch status exists
        response = self.client.get(f"/api/users/{user_id}/currently_watching")
        assert response.status_code == 200
        watching = json.loads(response.data)
        assert len(watching) == 2  # 2 currently watching (even indices)
        
        response = self.client.get(f"/api/users/{user_id}/want_to_watch")
        assert response.status_code == 200
        want_to_watch = json.loads(response.data)
        assert len(want_to_watch) == 1  # 1 want to watch (odd indices)
        
        # Verify watchlist exists (check database directly)
        user_watchlist = list(self.db.collection("watchlists").where("user_id", "==", user_id).stream())
        assert len(user_watchlist) == 4
        
        # Delete the user with extensive data
        response = self.client.delete(f"/api/user/{user_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user_id)
        
        # Verify complete deletion
        response = self.client.get(f"/api/user/{user_id}")
        assert response.status_code == 404
        
        # Verify all ratings are gone
        response = self.client.get(f"/api/users/{user_id}/ratings")
        assert response.status_code == 404
        
        # Verify all episode ratings are gone
        response = self.client.get(f"/api/users/{user_id}/shows/big_show/season/1/ratings")
        assert response.status_code == 404
        
        # Verify all watch status is gone
        response = self.client.get(f"/api/users/{user_id}/currently_watching")
        assert response.status_code == 404
        
        response = self.client.get(f"/api/users/{user_id}/want_to_watch")
        assert response.status_code == 404
        
        # Verify all watchlist entries are gone
        user_watchlist_after = list(self.db.collection("watchlists").where("user_id", "==", user_id).stream())
        assert len(user_watchlist_after) == 0
        
        # Verify all follow relationships are gone
        response = self.client.get(f"/api/users/{user_id}/following")
        assert response.status_code == 404
        
        response = self.client.get(f"/api/users/{user_id}/followers")
        assert response.status_code == 404
        
        # Verify followers no longer follow the deleted user
        for follower_id in followers:
            response = self.client.get(f"/api/users/{follower_id}/following")
            assert response.status_code == 200
            following_data = json.loads(response.data)
            assert user_id not in following_data["following"]
        
        # Verify followees no longer have the deleted user as follower
        for followee_id in followees:
            response = self.client.get(f"/api/users/{followee_id}/followers")
            assert response.status_code == 200
            followers_data = json.loads(response.data)
            assert user_id not in followers_data["followers"]
        
        # Verify feeds are cleaned (check that deleted user's content is gone from followers' feeds)
        for follower_id in followers:
            response = self.client.get(f"/api/users/{follower_id}/feed")
            assert response.status_code == 200
            feed_data = json.loads(response.data)
            deleted_user_items = [item for item in feed_data["feed"] if item["user_id"] == user_id]
            assert len(deleted_user_items) == 0  # No content from deleted user should remain


class TestBatchOperationLimits(TestUserDeletion):
    """Test that batch operation limits are handled correctly"""
    
    def test_large_dataset_deletion(self):
        """Test deletion works correctly even with large amounts of data"""
        # Create a user
        user_id, _ = self.create_test_user("_large_dataset")
        
        # Create a moderate amount of data (not enough to hit batch limits, but substantial)
        # Add 20 ratings
        for i in range(20):
            self.add_rating(user_id, f"show_{i}", 8, f"Rating {i}")
        
        # Add 30 episode ratings across multiple shows and seasons
        for show_num in range(3):
            for season in range(1, 3):
                for episode in range(1, 6):
                    self.add_episode_rating(user_id, f"large_show_{show_num}", season, episode, 8)
        
        # Add 10 watch statuses
        for i in range(10):
            self.add_watch_status(user_id, f"watch_show_{i}", "currently_watching" if i % 2 == 0 else "want_to_watch")
        
        # Add 15 watchlist entries
        for i in range(15):
            self.add_to_watchlist(user_id, f"watchlist_show_{i}")
        
        # Create 10 followers (each will have feed entries)
        followers = []
        for i in range(10):
            follower_id, _ = self.create_test_user(f"_large_follower_{i}")
            followers.append(follower_id)
            self.follow_user(follower_id, user_id)
        
        # Verify data exists
        response = self.client.get(f"/api/users/{user_id}/ratings")
        assert response.status_code == 200
        ratings = json.loads(response.data)
        assert len(ratings) == 20
        
        response = self.client.get(f"/api/users/{user_id}/followers")
        assert response.status_code == 200
        followers_data = json.loads(response.data)
        assert len(followers_data["followers"]) == 10
        
        # Delete the user with large dataset
        response = self.client.delete(f"/api/user/{user_id}")
        assert response.status_code == 200
        self.created_user_ids.remove(user_id)
        
        # Verify complete deletion
        response = self.client.get(f"/api/user/{user_id}")
        assert response.status_code == 404
        
        # Verify all data is gone
        response = self.client.get(f"/api/users/{user_id}/ratings")
        assert response.status_code == 404
        
        # Verify followers' feeds are cleaned
        for follower_id in followers:
            response = self.client.get(f"/api/users/{follower_id}/feed")
            assert response.status_code == 200
            feed_data = json.loads(response.data)
            deleted_user_items = [item for item in feed_data["feed"] if item["user_id"] == user_id]
            assert len(deleted_user_items) == 0
