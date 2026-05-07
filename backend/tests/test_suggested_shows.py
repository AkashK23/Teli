import pytest
from datetime import datetime, timezone
from firebase_db import db


TMDB_SHOW_ALREADY_RATED = "1396"
TMDB_SHOW_FROM_FOLLOWERS = "1399"
TMDB_SHOW_FROM_BOTH = "66732"
TMDB_SHOW_POPULAR = "76479"


@pytest.fixture(scope="module")
def suggested_shows_data(get_client, get_db):
    ts = datetime.now().strftime("%Y%m%d%H%M%S%f")

    viewer = get_client.post("/api/add_user", json={
        "email": f"viewer_{ts}@example.com",
        "name": "Viewer",
        "username": f"viewer_{ts}",
    }).get_json()

    followed_a = get_client.post("/api/add_user", json={
        "email": f"followed_a_{ts}@example.com",
        "name": "Followed A",
        "username": f"followed_a_{ts}",
    }).get_json()

    followed_b = get_client.post("/api/add_user", json={
        "email": f"followed_b_{ts}@example.com",
        "name": "Followed B",
        "username": f"followed_b_{ts}",
    }).get_json()

    loner = get_client.post("/api/add_user", json={
        "email": f"loner_{ts}@example.com",
        "name": "Loner",
        "username": f"loner_{ts}",
    }).get_json()

    stranger = get_client.post("/api/add_user", json={
        "email": f"stranger_{ts}@example.com",
        "name": "Stranger",
        "username": f"stranger_{ts}",
    }).get_json()

    viewer_id = viewer["id"]
    followed_a_id = followed_a["id"]
    followed_b_id = followed_b["id"]
    loner_id = loner["id"]
    stranger_id = stranger["id"]

    get_client.post("/api/follow", json={
        "follower_id": viewer_id, "followee_id": followed_a_id})
    get_client.post("/api/follow", json={
        "follower_id": viewer_id, "followee_id": followed_b_id})

    rating_ids = []

    resp = get_client.post("/api/ratings", json={
        "user_id": viewer_id,
        "show_id": TMDB_SHOW_ALREADY_RATED,
        "show_name_lowercase": "breaking bad",
        "rating": 7,
    })
    rating_ids.append(resp.get_json()["id"])

    resp = get_client.post("/api/ratings", json={
        "user_id": followed_a_id,
        "show_id": TMDB_SHOW_ALREADY_RATED,
        "show_name_lowercase": "breaking bad",
        "rating": 8,
    })
    rating_ids.append(resp.get_json()["id"])

    resp = get_client.post("/api/ratings", json={
        "user_id": followed_a_id,
        "show_id": TMDB_SHOW_FROM_FOLLOWERS,
        "show_name_lowercase": "the sopranos",
        "rating": 9,
    })
    rating_ids.append(resp.get_json()["id"])

    resp = get_client.post("/api/ratings", json={
        "user_id": followed_b_id,
        "show_id": TMDB_SHOW_FROM_FOLLOWERS,
        "show_name_lowercase": "the sopranos",
        "rating": 8,
    })
    rating_ids.append(resp.get_json()["id"])

    resp = get_client.post("/api/ratings", json={
        "user_id": followed_a_id,
        "show_id": TMDB_SHOW_FROM_BOTH,
        "show_name_lowercase": "the boys",
        "rating": 7,
    })
    rating_ids.append(resp.get_json()["id"])

    resp = get_client.post("/api/ratings", json={
        "user_id": stranger_id,
        "show_id": TMDB_SHOW_POPULAR,
        "show_name_lowercase": "the boys",
        "rating": 9,
    })
    rating_ids.append(resp.get_json()["id"])

    data = {
        "viewer_id": viewer_id,
        "followed_a_id": followed_a_id,
        "followed_b_id": followed_b_id,
        "loner_id": loner_id,
        "stranger_id": stranger_id,
        "show_already_rated": TMDB_SHOW_ALREADY_RATED,
        "show_from_followers": TMDB_SHOW_FROM_FOLLOWERS,
        "show_from_both": TMDB_SHOW_FROM_BOTH,
        "show_popular": TMDB_SHOW_POPULAR,
        "rating_ids": rating_ids,
    }

    yield data

    for rid in rating_ids:
        try:
            get_db.collection("ratings").document(rid).delete()
        except Exception:
            pass
    for uid in [viewer_id, followed_a_id, followed_b_id, loner_id, stranger_id]:
        follows = get_db.collection("follows").where(
            "follower_id", "==", uid).stream()
        for doc in follows:
            doc.reference.delete()
        try:
            get_db.collection("users").document(uid).delete()
        except Exception:
            pass


def test_returns_follower_suggestions(get_client, suggested_shows_data):
    viewer_id = suggested_shows_data["viewer_id"]
    response = get_client.get(f"/api/users/{viewer_id}/suggested-shows")
    assert response.status_code == 200
    body = response.get_json()

    suggested_ids = [s["show_id"] for s in body["suggestions"]]
    assert suggested_shows_data["show_from_followers"] in suggested_ids

    follower_suggestions = [
        s for s in body["suggestions"] if s["source"] == "followers"]
    for s in follower_suggestions:
        assert "followers_rating_count" in s
        assert "followers_average_rating" in s
        assert s.get("show_details") is not None


def test_excludes_already_rated_shows(get_client, suggested_shows_data):
    viewer_id = suggested_shows_data["viewer_id"]
    response = get_client.get(f"/api/users/{viewer_id}/suggested-shows")
    assert response.status_code == 200
    body = response.get_json()

    suggested_ids = [s["show_id"] for s in body["suggestions"]]
    assert suggested_shows_data["show_already_rated"] not in suggested_ids


def test_no_follows_returns_popular(get_client, suggested_shows_data):
    loner_id = suggested_shows_data["loner_id"]
    response = get_client.get(f"/api/users/{loner_id}/suggested-shows")
    assert response.status_code == 200
    body = response.get_json()

    for s in body["suggestions"]:
        assert s["source"] == "popular"
        assert s.get("show_details") is not None


def test_backfill_with_popular(get_client, suggested_shows_data):
    viewer_id = suggested_shows_data["viewer_id"]
    response = get_client.get(
        f"/api/users/{viewer_id}/suggested-shows?limit=50")
    assert response.status_code == 200
    body = response.get_json()

    sources = {s["source"] for s in body["suggestions"]}
    assert "followers" in sources
    if len(body["suggestions"]) > 2:
        assert "popular" in sources


def test_all_suggestions_have_show_details(get_client, suggested_shows_data):
    viewer_id = suggested_shows_data["viewer_id"]
    response = get_client.get(f"/api/users/{viewer_id}/suggested-shows")
    assert response.status_code == 200
    body = response.get_json()

    for s in body["suggestions"]:
        assert s.get("show_details") is not None


def test_user_not_found(get_client):
    response = get_client.get(
        "/api/users/nonexistent-user-xyz/suggested-shows")
    assert response.status_code == 404
    assert response.get_json()["error"] == "User not found"
