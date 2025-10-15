import pytest
import json
import uuid
import time
from datetime import datetime, timezone
from firebase_db import db


def generate_unique_id(prefix="test"):
    """Generate a unique identifier for test data"""
    timestamp = int(time.time())
    unique_suffix = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_suffix}"


def cleanup_test_data(user_ids=None, rating_ids=None):
    """Helper function to clean up test data"""
    if user_ids:
        for user_id in user_ids:
            try:
                db.collection("users").document(user_id).delete()
            except Exception:
                pass  # Continue cleanup even if some deletions fail
    
    if rating_ids:
        for rating_id in rating_ids:
            try:
                db.collection("ratings").document(rating_id).delete()
            except Exception:
                pass  # Continue cleanup even if some deletions fail


def test_get_show_average_rating_with_ratings(get_client):
    """Test getting average rating for a show that has ratings"""
    client = get_client
    
    # Generate unique identifiers for this test
    show_id = generate_unique_id("show")
    user_base_id = generate_unique_id("user")
    
    # Create test users
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
    
    # Create test ratings for the same show
    ratings_data = [
        {
            "user_id": user_ids[0],
            "show_id": show_id,
            "rating": 8,
            "comment": "Good show",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[1],
            "show_id": show_id,
            "rating": 9,
            "comment": "Great show",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[2],
            "show_id": show_id,
            "rating": 7,
            "comment": "Decent show",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    rating_ids = []
    for rating_data in ratings_data:
        rating_ref = db.collection("ratings").add(rating_data)
        rating_ids.append(rating_ref[1].id)
    
    try:
        # Test the endpoint
        response = client.get(f"/shows/{show_id}/average-rating")
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["total_ratings"] == 3
        
        # Expected average: (8 + 9 + 7) / 3 = 8.0
        expected_average = round((8 + 9 + 7) / 3, 2)
        assert data["average_rating"] == expected_average
        
    finally:
        # Cleanup
        cleanup_test_data(user_ids=user_ids, rating_ids=rating_ids)


def test_get_show_average_rating_no_ratings(get_client):
    """Test getting average rating for a show with no ratings"""
    client = get_client
    
    # Use a unique show ID that definitely has no ratings
    show_id = generate_unique_id("empty_show")
    
    response = client.get(f"/shows/{show_id}/average-rating")
    
    assert response.status_code == 200
    
    data = response.get_json()
    assert data["show_id"] == show_id
    assert data["average_rating"] is None
    assert data["total_ratings"] == 0


def test_get_show_average_rating_single_rating(get_client):
    """Test getting average rating for a show with a single rating"""
    client = get_client
    
    # Generate unique identifiers for this test
    show_id = generate_unique_id("single_show")
    user_base_id = generate_unique_id("single_user")
    
    # Create test user
    user_data = {
        "name": "Test User Single",
        "username": f"testuser_single_{user_base_id}",
        "email": f"test_single_{user_base_id}@example.com",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    user_ref = db.collection("users").add(user_data)
    user_id = user_ref[1].id
    
    # Create single test rating
    rating_data = {
        "user_id": user_id,
        "show_id": show_id,
        "rating": 10,
        "comment": "Perfect show",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    rating_ref = db.collection("ratings").add(rating_data)
    rating_id = rating_ref[1].id
    
    try:
        # Test the endpoint
        response = client.get(f"/shows/{show_id}/average-rating")
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["total_ratings"] == 1
        assert data["average_rating"] == 10.0
        
    finally:
        # Cleanup
        cleanup_test_data(user_ids=[user_id], rating_ids=[rating_id])


def test_get_show_average_rating_decimal_precision(get_client):
    """Test that average rating is rounded to 2 decimal places"""
    client = get_client
    
    # Generate unique identifiers for this test
    show_id = generate_unique_id("decimal_show")
    user_base_id = generate_unique_id("decimal_user")
    
    # Create test users
    user_ids = []
    for i in range(3):
        user_data = {
            "name": f"Test User Decimal {i}",
            "username": f"testuser_decimal_{user_base_id}_{i}",
            "email": f"test_decimal_{user_base_id}_{i}@example.com",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        user_ref = db.collection("users").add(user_data)
        user_ids.append(user_ref[1].id)
    
    # Create test ratings that will result in a decimal average
    ratings_data = [
        {
            "user_id": user_ids[0],
            "show_id": show_id,
            "rating": 8,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[1],
            "show_id": show_id,
            "rating": 9,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[2],
            "show_id": show_id,
            "rating": 10,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    rating_ids = []
    for rating_data in ratings_data:
        rating_ref = db.collection("ratings").add(rating_data)
        rating_ids.append(rating_ref[1].id)
    
    try:
        # Test the endpoint
        response = client.get(f"/shows/{show_id}/average-rating")
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["total_ratings"] == 3
        
        # Expected average: (8 + 9 + 10) / 3 = 9.0
        expected_average = round((8 + 9 + 10) / 3, 2)
        assert data["average_rating"] == expected_average
        
        # Verify it's exactly 2 decimal places when needed
        assert isinstance(data["average_rating"], float)
        
    finally:
        # Cleanup
        cleanup_test_data(user_ids=user_ids, rating_ids=rating_ids)


def test_get_show_average_rating_with_complex_decimal(get_client):
    """Test average rating calculation with a result that needs rounding"""
    client = get_client
    
    # Generate unique identifiers for this test
    show_id = generate_unique_id("complex_show")
    user_base_id = generate_unique_id("complex_user")
    
    # Create test users
    user_ids = []
    for i in range(3):
        user_data = {
            "name": f"Test User Complex {i}",
            "username": f"testuser_complex_{user_base_id}_{i}",
            "email": f"test_complex_{user_base_id}_{i}@example.com",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        user_ref = db.collection("users").add(user_data)
        user_ids.append(user_ref[1].id)
    
    # Create test ratings that will result in a complex decimal
    ratings_data = [
        {
            "user_id": user_ids[0],
            "show_id": show_id,
            "rating": 7,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[1],
            "show_id": show_id,
            "rating": 8,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[2],
            "show_id": show_id,
            "rating": 9,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    rating_ids = []
    for rating_data in ratings_data:
        rating_ref = db.collection("ratings").add(rating_data)
        rating_ids.append(rating_ref[1].id)
    
    try:
        # Test the endpoint
        response = client.get(f"/shows/{show_id}/average-rating")
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["total_ratings"] == 3
        
        # Expected average: (7 + 8 + 9) / 3 = 8.0
        expected_average = round((7 + 8 + 9) / 3, 2)
        assert data["average_rating"] == expected_average
        assert data["average_rating"] == 8.0
        
    finally:
        # Cleanup
        cleanup_test_data(user_ids=user_ids, rating_ids=rating_ids)


def test_get_show_average_rating_with_fractional_result(get_client):
    """Test average rating calculation with a result that has decimal places"""
    client = get_client
    
    # Generate unique identifiers for this test
    show_id = generate_unique_id("fractional_show")
    user_base_id = generate_unique_id("fractional_user")
    
    # Create test users
    user_ids = []
    for i in range(3):
        user_data = {
            "name": f"Test User Fractional {i}",
            "username": f"testuser_fractional_{user_base_id}_{i}",
            "email": f"test_fractional_{user_base_id}_{i}@example.com",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        user_ref = db.collection("users").add(user_data)
        user_ids.append(user_ref[1].id)
    
    # Create test ratings that will result in a fractional average
    ratings_data = [
        {
            "user_id": user_ids[0],
            "show_id": show_id,
            "rating": 6,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[1],
            "show_id": show_id,
            "rating": 7,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": user_ids[2],
            "show_id": show_id,
            "rating": 8,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    rating_ids = []
    for rating_data in ratings_data:
        rating_ref = db.collection("ratings").add(rating_data)
        rating_ids.append(rating_ref[1].id)
    
    try:
        # Test the endpoint
        response = client.get(f"/shows/{show_id}/average-rating")
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["show_id"] == show_id
        assert data["total_ratings"] == 3
        
        # Expected average: (6 + 7 + 8) / 3 = 7.0
        expected_average = round((6 + 7 + 8) / 3, 2)
        assert data["average_rating"] == expected_average
        assert data["average_rating"] == 7.0
        
    finally:
        # Cleanup
        cleanup_test_data(user_ids=user_ids, rating_ids=rating_ids)
