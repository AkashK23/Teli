import pytest
import time
import uuid
from datetime import datetime, timezone
from firebase_db import db


def generate_unique_id(prefix="test"):
    timestamp = int(time.time())
    unique_suffix = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_suffix}"


def cleanup_test_data(user_ids=None, episode_rating_ids=None):
    if user_ids:
        for user_id in user_ids:
            try:
                db.collection("users").document(user_id).delete()
            except Exception:
                pass

    if episode_rating_ids:
        for rating_id in episode_rating_ids:
            try:
                db.collection("episode_ratings").document(rating_id).delete()
            except Exception:
                pass


def test_get_episode_average_rating_with_ratings(get_client):
    client = get_client

    show_id = generate_unique_id("show")
    user_base_id = generate_unique_id("user")

    user_ids = []
    for i in range(3):
        user_data = {
            "name": f"Test User {i}",
            "username": f"testuser_{user_base_id}_{i}",
            "email": f"test_{user_base_id}_{i}@example.com",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        user_ref = db.collection("users").add(user_data)
        user_ids.append(user_ref[1].id)

    ratings_data = [
        {
            "user_id": user_ids[0],
            "show_id": show_id,
            "season_number": 1,
            "episode_number": 1,
            "rating": 8,
            "comment": "Good episode",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[1],
            "show_id": show_id,
            "season_number": 1,
            "episode_number": 1,
            "rating": 9,
            "comment": "Great episode",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[2],
            "show_id": show_id,
            "season_number": 1,
            "episode_number": 1,
            "rating": 7,
            "comment": "Decent episode",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]

    episode_rating_ids = []
    for rating_data in ratings_data:
        rating_ref = db.collection("episode_ratings").add(rating_data)
        episode_rating_ids.append(rating_ref[1].id)

    try:
        response = client.get(
            f"/api/shows/{show_id}/season/1/episode/1/average-rating")

        assert response.status_code == 200

        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["season_number"] == 1
        assert data["episode_number"] == 1
        assert data["total_ratings"] == 3

        expected_average = round((8 + 9 + 7) / 3, 2)
        assert data["average_rating"] == expected_average

    finally:
        cleanup_test_data(
            user_ids=user_ids, episode_rating_ids=episode_rating_ids)


def test_get_episode_average_rating_no_ratings(get_client):
    client = get_client

    show_id = generate_unique_id("empty_show")

    response = client.get(
        f"/api/shows/{show_id}/season/1/episode/1/average-rating")

    assert response.status_code == 200

    data = response.get_json()
    assert data["show_id"] == show_id
    assert data["season_number"] == 1
    assert data["episode_number"] == 1
    assert data["average_rating"] is None
    assert data["total_ratings"] == 0


def test_get_episode_average_rating_single_rating(get_client):
    client = get_client

    show_id = generate_unique_id("single_show")
    user_base_id = generate_unique_id("single_user")

    user_data = {
        "name": "Test User Single",
        "username": f"testuser_single_{user_base_id}",
        "email": f"test_single_{user_base_id}@example.com",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    user_ref = db.collection("users").add(user_data)
    user_id = user_ref[1].id

    rating_data = {
        "user_id": user_id,
        "show_id": show_id,
        "season_number": 2,
        "episode_number": 5,
        "rating": 10,
        "comment": "Perfect episode",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    rating_ref = db.collection("episode_ratings").add(rating_data)
    episode_rating_id = rating_ref[1].id

    try:
        response = client.get(
            f"/api/shows/{show_id}/season/2/episode/5/average-rating")

        assert response.status_code == 200

        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["season_number"] == 2
        assert data["episode_number"] == 5
        assert data["total_ratings"] == 1
        assert data["average_rating"] == 10.0

    finally:
        cleanup_test_data(
            user_ids=[user_id], episode_rating_ids=[episode_rating_id])
