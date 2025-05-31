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
        "email": "watchuser1@example.com",
        "name": "Watch Test User 1",
        "username": "watchuser1",
        "bio": "Bio for Watch Test User 1"
    }
    user2_payload = {
        "email": "watchuser2@example.com",
        "name": "Watch Test User 2",
        "username": "watchuser2",
        "bio": "Bio for Watch Test User 2"
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
        user1_id = next((u["id"] for u in users if u["email"] == "watchuser1@example.com"), "test_watch_user_1")
    
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
        user2_id = next((u["id"] for u in users if u["email"] == "watchuser2@example.com"), "test_watch_user_2")
    
    # Add some initial watch statuses
    currently_watching_payload = {
        "user_id": user1_id,
        "show_id": "breaking_bad",
        "status": "currently_watching",
        "current_season": 2,
        "current_episode": 5,
        "notes": "Great show, watching season 2"
    }
    
    want_to_watch_payload = {
        "user_id": user1_id,
        "show_id": "better_call_saul",
        "status": "want_to_watch",
        "notes": "Heard this is good"
    }
    
    client.post(
        "/update_watch_status",
        json=currently_watching_payload,
        headers={"Content-Type": "application/json"}
    )
    
    client.post(
        "/update_watch_status",
        json=want_to_watch_payload,
        headers={"Content-Type": "application/json"}
    )
    
    # Store test data for use in tests
    test_data = {
        "user1_id": user1_id,
        "user2_id": user2_id,
        "currently_watching_show_id": "breaking_bad",
        "want_to_watch_show_id": "better_call_saul",
        "non_existent_show_id": "non_existent_show"
    }
    
    yield test_data
    
    # Optional cleanup code could go here

class TestWatchStatusEndpoints:
    def test_update_watch_status_new(self, get_client, setup_test_data):
        client = get_client
        # Use a unique show ID with timestamp to ensure it's new
        unique_show_id = f"unique_show_{datetime.now(timezone.utc).timestamp()}"
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": unique_show_id,
            "status": "currently_watching",
            "current_season": 1,
            "current_episode": 3,
            "notes": "Just started watching"
        }
        
        response = client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 201
        assert "id" in response.get_json()
        assert response.get_json()["message"] == "Watch status added successfully"
    
    def test_update_watch_status_existing(self, get_client, setup_test_data):
        client = get_client
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": setup_test_data["currently_watching_show_id"],
            "status": "currently_watching",
            "current_season": 3,  # Updated season
            "current_episode": 1,  # Updated episode
            "notes": "Now watching season 3"
        }
        
        response = client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        assert "id" in response.get_json()
        assert response.get_json()["message"] == "Watch status updated successfully"
        
        # Verify the update by getting the status
        get_response = client.get(
            f"/users/{setup_test_data['user1_id']}/watch_status/{setup_test_data['currently_watching_show_id']}"
        )
        
        assert get_response.status_code == 200
        status_data = get_response.get_json()
        assert status_data["current_season"] == 3
        assert status_data["current_episode"] == 1
        assert status_data["notes"] == "Now watching season 3"
    
    def test_update_watch_status_change_status(self, get_client, setup_test_data):
        client = get_client
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": setup_test_data["want_to_watch_show_id"],
            "status": "currently_watching",  # Changed from want_to_watch to currently_watching
            "current_season": 1,
            "current_episode": 1,
            "notes": "Started watching"
        }
        
        response = client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        assert "id" in response.get_json()
        
        # Verify the status change
        get_response = client.get(
            f"/users/{setup_test_data['user1_id']}/watch_status/{setup_test_data['want_to_watch_show_id']}"
        )
        
        assert get_response.status_code == 200
        status_data = get_response.get_json()
        assert status_data["status"] == "currently_watching"
        assert status_data["current_season"] == 1
        assert status_data["current_episode"] == 1
    
    def test_update_watch_status_validation_error(self, get_client, setup_test_data):
        client = get_client
        # Invalid status value
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": "some_show",
            "status": "invalid_status",  # Not one of the allowed values
            "notes": "Test notes"
        }
        
        response = client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        assert "errors" in response.get_json()
    
    def test_update_watch_status_user_not_found(self, get_client):
        client = get_client
        payload = {
            "user_id": "non_existent_user",
            "show_id": "some_show",
            "status": "currently_watching",
            "current_season": 1,
            "current_episode": 1
        }
        
        response = client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "User not found"
    
    def test_get_currently_watching(self, get_client, setup_test_data):
        client = get_client
        response = client.get(f"/users/{setup_test_data['user1_id']}/currently_watching")
        
        assert response.status_code == 200
        shows = response.get_json()
        assert isinstance(shows, list)
        assert len(shows) > 0
        
        # At least one show should be "breaking_bad" (from setup)
        assert any(show["show_id"] == setup_test_data["currently_watching_show_id"] for show in shows)
        
        # All shows should have status "currently_watching"
        for show in shows:
            assert show["status"] == "currently_watching"
    
    def test_get_currently_watching_empty(self, get_client, setup_test_data):
        client = get_client
        # User2 doesn't have any shows in currently watching
        response = client.get(f"/users/{setup_test_data['user2_id']}/currently_watching")
        
        assert response.status_code == 200
        shows = response.get_json()
        assert isinstance(shows, list)
        assert len(shows) == 0
    
    def test_get_currently_watching_user_not_found(self, get_client):
        client = get_client
        response = client.get("/users/non_existent_user/currently_watching")
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "User not found"
    
    def test_get_want_to_watch(self, get_client, setup_test_data):
        client = get_client
        # Add a new show to want_to_watch for testing
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": "stranger_things",
            "status": "want_to_watch",
            "notes": "Heard good things about this"
        }
        
        client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        response = client.get(f"/users/{setup_test_data['user1_id']}/want_to_watch")
        
        assert response.status_code == 200
        shows = response.get_json()
        assert isinstance(shows, list)
        assert len(shows) > 0
        
        # Should include the newly added show
        assert any(show["show_id"] == "stranger_things" for show in shows)
        
        # All shows should have status "want_to_watch"
        for show in shows:
            assert show["status"] == "want_to_watch"
    
    def test_get_want_to_watch_empty(self, get_client, setup_test_data):
        client = get_client
        # User2 doesn't have any shows in want to watch
        response = client.get(f"/users/{setup_test_data['user2_id']}/want_to_watch")
        
        assert response.status_code == 200
        shows = response.get_json()
        assert isinstance(shows, list)
        assert len(shows) == 0
    
    def test_get_want_to_watch_user_not_found(self, get_client):
        client = get_client
        response = client.get("/users/non_existent_user/want_to_watch")
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "User not found"
    
    def test_get_watch_status(self, get_client, setup_test_data):
        client = get_client
        response = client.get(
            f"/users/{setup_test_data['user1_id']}/watch_status/{setup_test_data['currently_watching_show_id']}"
        )
        
        assert response.status_code == 200
        status = response.get_json()
        assert status["user_id"] == setup_test_data["user1_id"]
        assert status["show_id"] == setup_test_data["currently_watching_show_id"]
        assert status["status"] == "currently_watching"
        assert "current_season" in status
        assert "current_episode" in status
        assert "notes" in status
        assert "updated_at" in status
        assert "id" in status
    
    def test_get_watch_status_not_found(self, get_client, setup_test_data):
        client = get_client
        response = client.get(
            f"/users/{setup_test_data['user1_id']}/watch_status/{setup_test_data['non_existent_show_id']}"
        )
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "No watch status found for this show"
    
    def test_get_watch_status_user_not_found(self, get_client, setup_test_data):
        client = get_client
        response = client.get(
            f"/users/non_existent_user/watch_status/{setup_test_data['currently_watching_show_id']}"
        )
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "User not found"
    
    def test_delete_watch_status(self, get_client, setup_test_data):
        client = get_client
        # First add a show to delete
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": "show_to_delete",
            "status": "want_to_watch"
        }
        
        client.post(
            "/update_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Now delete it
        delete_payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": "show_to_delete"
        }
        
        response = client.post(
            "/delete_watch_status",
            json=delete_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        assert response.get_json()["message"] == "Watch status deleted successfully"
        
        # Verify it's deleted
        get_response = client.get(
            f"/users/{setup_test_data['user1_id']}/watch_status/show_to_delete"
        )
        
        assert get_response.status_code == 404
    
    def test_delete_watch_status_not_found(self, get_client, setup_test_data):
        client = get_client
        payload = {
            "user_id": setup_test_data["user1_id"],
            "show_id": setup_test_data["non_existent_show_id"]
        }
        
        response = client.post(
            "/delete_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "No watch status found for this show"
    
    def test_delete_watch_status_user_not_found(self, get_client, setup_test_data):
        client = get_client
        payload = {
            "user_id": "non_existent_user",
            "show_id": setup_test_data["currently_watching_show_id"]
        }
        
        response = client.post(
            "/delete_watch_status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404
        assert response.get_json()["error"] == "User not found"
