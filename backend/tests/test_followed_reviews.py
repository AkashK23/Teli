import pytest
from datetime import datetime, timezone


SHOW_ID = "followed_reviews_test_show"
SEASON = 1
EPISODE = 3


@pytest.fixture(scope="module")
def followed_reviews_data(get_client, get_db):
    client = get_client
    db = get_db

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")

    viewer_payload = {
        "email": f"viewer_{timestamp}@example.com",
        "name": "Viewer User",
        "username": f"viewer_{timestamp}",
    }
    followed_a_payload = {
        "email": f"followed_a_{timestamp}@example.com",
        "name": "Followed A",
        "username": f"followed_a_{timestamp}",
    }
    followed_b_payload = {
        "email": f"followed_b_{timestamp}@example.com",
        "name": "Followed B",
        "username": f"followed_b_{timestamp}",
    }
    stranger_payload = {
        "email": f"stranger_{timestamp}@example.com",
        "name": "Stranger",
        "username": f"stranger_{timestamp}",
    }

    viewer_id = client.post("/api/add_user", json=viewer_payload).get_json()["id"]
    followed_a_id = client.post("/api/add_user", json=followed_a_payload).get_json()["id"]
    followed_b_id = client.post("/api/add_user", json=followed_b_payload).get_json()["id"]
    stranger_id = client.post("/api/add_user", json=stranger_payload).get_json()["id"]

    client.post("/api/follow", json={"follower_id": viewer_id, "followee_id": followed_a_id})
    client.post("/api/follow", json={"follower_id": viewer_id, "followee_id": followed_b_id})

    rating_ids = []
    for uid, rating in [(followed_a_id, 9), (followed_b_id, 6), (stranger_id, 10)]:
        resp = client.post("/api/ratings", json={
            "user_id": uid,
            "show_id": SHOW_ID,
            "show_name_lowercase": "followed reviews test show",
            "rating": rating,
            "comment": f"Show review from {uid}",
        })
        rating_ids.append(resp.get_json()["id"])

    episode_rating_ids = []
    for uid, rating in [(followed_a_id, 8), (stranger_id, 7)]:
        resp = client.post("/api/episode_ratings", json={
            "user_id": uid,
            "show_id": SHOW_ID,
            "season_number": SEASON,
            "episode_number": EPISODE,
            "rating": rating,
            "comment": f"Episode review from {uid}",
        })
        episode_rating_ids.append(resp.get_json()["id"])

    data = {
        "viewer_id": viewer_id,
        "followed_a_id": followed_a_id,
        "followed_b_id": followed_b_id,
        "stranger_id": stranger_id,
        "rating_ids": rating_ids,
        "episode_rating_ids": episode_rating_ids,
    }

    yield data

    for rid in rating_ids:
        try:
            db.collection("ratings").document(rid).delete()
        except Exception:
            pass
    for rid in episode_rating_ids:
        try:
            db.collection("episode_ratings").document(rid).delete()
        except Exception:
            pass
    follows = db.collection("follows").where("follower_id", "==", viewer_id).stream()
    for doc in follows:
        doc.reference.delete()
    for uid in [viewer_id, followed_a_id, followed_b_id, stranger_id]:
        try:
            db.collection("users").document(uid).delete()
        except Exception:
            pass


class TestFollowedShowReviews:
    def test_returns_only_followed_users_reviews(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}")
        assert response.status_code == 200
        body = response.get_json()

        reviewer_ids = {r["user_id"] for r in body["results"]}
        assert followed_reviews_data["followed_a_id"] in reviewer_ids
        assert followed_reviews_data["followed_b_id"] in reviewer_ids
        assert followed_reviews_data["stranger_id"] not in reviewer_ids
        assert body["total_results"] == 2
        assert body["followers_average_rating"] == 7.5
        assert body["followers_total_ratings"] == 2

    def test_response_includes_user_enrichment(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}")
        assert response.status_code == 200
        for review in response.get_json()["results"]:
            assert "user_name" in review
            assert "user_username" in review
            assert "user_picture" in review
            assert review["user_name"]

    def test_results_sorted_by_timestamp_desc(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}")
        results = response.get_json()["results"]
        timestamps = [r["timestamp"] for r in results]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_pagination(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(
            f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}?page=1&limit=1")
        body = response.get_json()
        assert response.status_code == 200
        assert len(body["results"]) == 1
        assert body["total_results"] == 2
        assert body["total_pages"] == 2
        assert body["current_page"] == 1
        assert body["limit"] == 1

    def test_page_beyond_last(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(
            f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}?page=99&limit=10")
        body = response.get_json()
        assert response.status_code == 200
        assert body["results"] == []
        assert body["total_results"] == 2

    def test_user_follows_nobody(self, get_client, get_db):
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        loner_resp = get_client.post("/api/add_user", json={
            "email": f"loner_{timestamp}@example.com",
            "name": "Loner",
            "username": f"loner_{timestamp}",
        })
        loner_id = loner_resp.get_json()["id"]
        try:
            response = get_client.get(
                f"/api/users/{loner_id}/followed-reviews/shows/{SHOW_ID}")
            assert response.status_code == 200
            body = response.get_json()
            assert body["results"] == []
            assert body["total_results"] == 0
            assert body["total_pages"] == 1
            assert body["followers_average_rating"] is None
            assert body["followers_total_ratings"] == 0
        finally:
            get_db.collection("users").document(loner_id).delete()

    def test_user_not_found(self, get_client):
        response = get_client.get(
            f"/api/users/nonexistent-user/followed-reviews/shows/{SHOW_ID}")
        assert response.status_code == 404
        assert response.get_json()["error"] == "User not found"

    def test_invalid_pagination_params(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(
            f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}?page=abc")
        assert response.status_code == 400


class TestFollowedEpisodeReviews:
    def test_returns_only_followed_users_episode_reviews(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(
            f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}"
            f"/season/{SEASON}/episode/{EPISODE}")
        assert response.status_code == 200
        body = response.get_json()
        reviewer_ids = {r["user_id"] for r in body["results"]}
        assert followed_reviews_data["followed_a_id"] in reviewer_ids
        assert followed_reviews_data["stranger_id"] not in reviewer_ids
        assert body["total_results"] == 1
        assert body["followers_average_rating"] == 8.0
        assert body["followers_total_ratings"] == 1

    def test_episode_with_no_followed_reviews(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(
            f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}"
            f"/season/{SEASON}/episode/99")
        assert response.status_code == 200
        body = response.get_json()
        assert body["results"] == []
        assert body["total_results"] == 0
        assert body["followers_average_rating"] is None
        assert body["followers_total_ratings"] == 0

    def test_episode_user_enrichment(self, get_client, followed_reviews_data):
        viewer_id = followed_reviews_data["viewer_id"]
        response = get_client.get(
            f"/api/users/{viewer_id}/followed-reviews/shows/{SHOW_ID}"
            f"/season/{SEASON}/episode/{EPISODE}")
        for review in response.get_json()["results"]:
            assert "user_name" in review
            assert review["season_number"] == SEASON
            assert review["episode_number"] == EPISODE

    def test_episode_user_not_found(self, get_client):
        response = get_client.get(
            f"/api/users/nonexistent-user/followed-reviews/shows/{SHOW_ID}"
            f"/season/{SEASON}/episode/{EPISODE}")
        assert response.status_code == 404
