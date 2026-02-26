import pytest
import json
from datetime import datetime, timezone


class TestSearchUserRatedShows:
    """Test the search user rated shows endpoint using real database operations"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self, get_db, get_client):
        """Set up test data in the database before each test"""
        self.db = get_db
        self.client = get_client
        self.test_user_ids = []
        self.test_rating_ids = []
        
        # Create test user
        user_data = {
            'name': 'Test User',
            'username': 'testuser_rated_shows',
            'email': 'testuser_rated_shows@example.com',
            'bio': 'Test user for rated shows search'
        }
        
        response = self.client.post('/api/add_user', 
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        user_response = json.loads(response.data)
        self.test_user_id = user_response['id']
        self.test_user_ids.append(self.test_user_id)
        
        # Create test ratings with show names
        test_ratings = [
            {
                'user_id': self.test_user_id,
                'show_id': '1396',
                'show_name_lowercase': 'breaking bad',
                'rating': 9,
                'comment': 'Amazing show!'
            },
            {
                'user_id': self.test_user_id,
                'show_id': '66732',
                'show_name_lowercase': 'stranger things',
                'rating': 8,
                'comment': 'Great sci-fi show!'
            },
            {
                'user_id': self.test_user_id,
                'show_id': '1457',
                'show_name_lowercase': 'breaking point',
                'rating': 7,
                'comment': 'Decent thriller'
            },
            {
                'user_id': self.test_user_id,
                'show_id': '2316',
                'show_name_lowercase': 'the office',
                'rating': 10,
                'comment': 'Best comedy ever!'
            }
        ]
        
        # Add ratings using the API endpoint
        for rating_data in test_ratings:
            response = self.client.post('/api/ratings',
                                       data=json.dumps(rating_data),
                                       content_type='application/json')
            
            if response.status_code == 200:
                rating_response = json.loads(response.data)
                self.test_rating_ids.append(rating_response['id'])
        
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
    
    def test_search_rated_shows_user_not_found(self, get_client):
        """Test search when user doesn't exist"""
        response = get_client.get("/api/users/nonexistent_user/rated-shows/search?query=breaking")
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["error"] == "User not found"
    
    def test_search_rated_shows_missing_query(self, get_client):
        """Test search without query parameter"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "errors" in data
    
    def test_search_rated_shows_invalid_page(self, get_client):
        """Test search with invalid page parameter"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking&page=invalid')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["error"] == "Invalid parameter format"
    
    def test_search_rated_shows_invalid_limit(self, get_client):
        """Test search with invalid limit parameter"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking&limit=invalid')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["error"] == "Invalid parameter format"
    
    def test_search_rated_shows_successful_search(self, get_client):
        """Test successful search for rated shows"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert "results" in data
        assert "total_results" in data
        assert "total_pages" in data
        assert "current_page" in data
        assert "limit" in data
        
        # Should find shows with 'breaking' in the name
        assert len(data["results"]) == 2  # "breaking bad" and "breaking point"
        assert data["total_results"] == 2
        assert data["current_page"] == 1
        assert data["limit"] == 20
        
        # Verify the results contain the expected shows
        show_names = [result["show_name_lowercase"] for result in data["results"]]
        assert "breaking bad" in show_names
        assert "breaking point" in show_names
        
        # Verify each result has the required fields
        for result in data["results"]:
            assert "id" in result
            assert "user_id" in result
            assert "show_id" in result
            assert "show_name_lowercase" in result
            assert "rating" in result
            assert "timestamp" in result
            assert result["user_id"] == self.test_user_id
    
    def test_search_rated_shows_exact_match(self, get_client):
        """Test search with exact show name match"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=the office')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data["results"]) == 1
        assert data["results"][0]["show_name_lowercase"] == "the office"
        assert data["results"][0]["rating"] == 10
    
    def test_search_rated_shows_partial_match(self, get_client):
        """Test search with partial show name match"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=office')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data["results"]) == 1
        assert data["results"][0]["show_name_lowercase"] == "the office"
    
    def test_search_rated_shows_no_results(self, get_client):
        """Test search when no shows match the query"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=nonexistent')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data["results"] == []
        assert data["total_results"] == 0
        assert data["total_pages"] == 1
    
    def test_search_rated_shows_sorting_relevance(self, get_client):
        """Test that search results are sorted by relevance"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data["results"]) == 2
        
        # Results should be sorted by relevance
        # "breaking bad" should come before "breaking point" (prefix vs contains)
        show_names = [result["show_name_lowercase"] for result in data["results"]]
        
        # Both start with "breaking", so they should be sorted alphabetically
        assert show_names[0] == "breaking bad"
        assert show_names[1] == "breaking point"
    
    def test_search_rated_shows_pagination(self, get_client):
        """Test pagination functionality"""
        # Add more test ratings for pagination
        additional_ratings = []
        for i in range(15):
            rating_data = {
                'user_id': self.test_user_id,
                'show_id': f'show_{i}',
                'show_name_lowercase': f'test show {i}',
                'rating': 5,
                'comment': f'Test comment {i}'
            }
            
            response = self.client.post('/api/ratings',
                                       data=json.dumps(rating_data),
                                       content_type='application/json')
            
            if response.status_code == 200:
                rating_response = json.loads(response.data)
                additional_ratings.append(rating_response['id'])
        
        try:
            # Test first page
            response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=test&page=1&limit=10')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert len(data["results"]) == 10
            assert data["total_results"] == 15
            assert data["current_page"] == 1
            assert data["limit"] == 10
            assert data["total_pages"] == 2
            
            # Test second page
            response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=test&page=2&limit=10')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert len(data["results"]) == 5  # Remaining 5 shows
            assert data["current_page"] == 2
            
        finally:
            # Clean up additional ratings
            for rating_id in additional_ratings:
                try:
                    self.db.collection("ratings").document(rating_id).delete()
                except Exception:
                    pass
    
    def test_search_rated_shows_case_insensitive(self, get_client):
        """Test that search is case insensitive"""
        # Test with uppercase query
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=BREAKING')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data["results"]) == 2
        show_names = [result["show_name_lowercase"] for result in data["results"]]
        assert "breaking bad" in show_names
        assert "breaking point" in show_names
    
    def test_search_rated_shows_limit_validation(self, get_client):
        """Test limit parameter validation"""
        # Test with limit over maximum
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking&limit=150')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["limit"] == 100  # Should be capped at 100
        
        # Test with negative limit - should use default
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking&limit=-5')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["limit"] == 20  # Should use default
    
    def test_search_rated_shows_page_validation(self, get_client):
        """Test page parameter validation"""
        # Test with negative page - should use default
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking&page=-1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["current_page"] == 1  # Should use default
        
        # Test with zero page - should use default
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking&page=0')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["current_page"] == 1  # Should use default


class TestAddRatingWithShowName:
    """Test that add_rating function properly stores show_name_lowercase"""
    
    @pytest.fixture(autouse=True)
    def setup_cleanup(self, get_db, get_client):
        """Set up cleanup for test data"""
        self.db = get_db
        self.client = get_client
        self.test_user_ids = []
        self.test_rating_ids = []
        
        # Create test user
        user_data = {
            'name': 'Rating Test User',
            'username': 'rating_test_user',
            'email': 'rating_test@example.com',
            'bio': 'Test user for rating tests'
        }
        
        response = self.client.post('/api/add_user', 
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        user_response = json.loads(response.data)
        self.test_user_id = user_response['id']
        self.test_user_ids.append(self.test_user_id)
        
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
    
    def test_add_rating_stores_show_name_lowercase(self, get_client):
        """Test that add_rating stores show_name_lowercase field"""
        rating_data = {
            'user_id': self.test_user_id,
            'show_id': '1396',
            'show_name_lowercase': 'breaking bad',
            'rating': 9,
            'comment': 'Test rating'
        }
        
        response = get_client.post("/api/ratings",
                                  data=json.dumps(rating_data),
                                  content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        rating_id = data['id']
        self.test_rating_ids.append(rating_id)
        
        # Verify the rating was stored with show_name_lowercase
        rating_doc = self.db.collection("ratings").document(rating_id).get()
        assert rating_doc.exists
        
        rating_data_from_db = rating_doc.to_dict()
        assert rating_data_from_db['show_name_lowercase'] == 'breaking bad'
        assert rating_data_from_db['user_id'] == self.test_user_id
        assert rating_data_from_db['show_id'] == '1396'
        assert rating_data_from_db['rating'] == 9
        assert 'timestamp' in rating_data_from_db
    
    def test_add_rating_missing_show_name_lowercase(self, get_client):
        """Test that add_rating fails when show_name_lowercase is missing"""
        rating_data = {
            'user_id': self.test_user_id,
            'show_id': '1396',
            'rating': 9,
            'comment': 'Test rating'
            # Missing show_name_lowercase
        }
        
        response = get_client.post("/api/ratings",
                                  data=json.dumps(rating_data),
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "errors" in data
        
        # Check that the error mentions the missing field
        errors = data["errors"]
        field_errors = [error for error in errors if error["loc"] == ["show_name_lowercase"]]
        assert len(field_errors) > 0
    
    def test_add_rating_update_existing_rating(self, get_client):
        """Test that updating an existing rating preserves show_name_lowercase"""
        # Add initial rating
        rating_data = {
            'user_id': self.test_user_id,
            'show_id': '1396',
            'show_name_lowercase': 'breaking bad',
            'rating': 8,
            'comment': 'Initial rating'
        }
        
        response = get_client.post("/api/ratings",
                                  data=json.dumps(rating_data),
                                  content_type='application/json')
        
        assert response.status_code == 200
        initial_response = json.loads(response.data)
        rating_id = initial_response['id']
        self.test_rating_ids.append(rating_id)
        
        # Update the rating
        updated_rating_data = {
            'user_id': self.test_user_id,
            'show_id': '1396',
            'show_name_lowercase': 'breaking bad',
            'rating': 10,
            'comment': 'Updated rating - even better!'
        }
        
        response = get_client.post("/api/ratings",
                                  data=json.dumps(updated_rating_data),
                                  content_type='application/json')
        
        assert response.status_code == 200
        
        # Verify the rating was updated and show_name_lowercase is preserved
        rating_doc = self.db.collection("ratings").document(rating_id).get()
        assert rating_doc.exists
        
        rating_data_from_db = rating_doc.to_dict()
        assert rating_data_from_db['show_name_lowercase'] == 'breaking bad'
        assert rating_data_from_db['rating'] == 10
        assert rating_data_from_db['comment'] == 'Updated rating - even better!'
    
    def test_search_rated_shows_empty_query_returns_empty_results(self, get_client):
        """Test search with empty query returns empty results"""
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "errors" in data
    
    def test_search_rated_shows_user_with_no_ratings(self, get_client):
        """Test search for user who has no ratings"""
        # Create a new user with no ratings
        user_data = {
            'name': 'No Ratings User',
            'username': 'no_ratings_user',
            'email': 'no_ratings@example.com',
            'bio': 'User with no ratings'
        }
        
        response = self.client.post('/api/add_user', 
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        user_response = json.loads(response.data)
        no_ratings_user_id = user_response['id']
        self.test_user_ids.append(no_ratings_user_id)
        
        # Search for rated shows
        response = get_client.get(f'/api/users/{no_ratings_user_id}/rated-shows/search?query=breaking')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data["results"] == []
        assert data["total_results"] == 0
        assert data["total_pages"] == 1
    
    def test_search_rated_shows_resilient_to_existing_data(self, get_client):
        """Test that search is resilient to existing data in the database"""
        # This test ensures our search only returns results for the specific user
        # even if there are other ratings in the database
        
        # First, add some ratings for our test user
        test_ratings = [
            {
                'user_id': self.test_user_id,
                'show_id': '1396',
                'show_name_lowercase': 'breaking bad',
                'rating': 9,
                'comment': 'Amazing show!'
            },
            {
                'user_id': self.test_user_id,
                'show_id': '1457',
                'show_name_lowercase': 'breaking point',
                'rating': 7,
                'comment': 'Decent thriller'
            }
        ]
        
        # Add ratings for our test user
        for rating_data in test_ratings:
            response = self.client.post('/api/ratings',
                                       data=json.dumps(rating_data),
                                       content_type='application/json')
            
            assert response.status_code == 200
            rating_response = json.loads(response.data)
            self.test_rating_ids.append(rating_response['id'])
        
        # Create another user and add ratings
        other_user_data = {
            'name': 'Other User',
            'username': 'other_user_search_test',
            'email': 'other_user_search@example.com',
            'bio': 'Other user for testing'
        }
        
        response = self.client.post('/api/add_user', 
                                   data=json.dumps(other_user_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        other_user_response = json.loads(response.data)
        other_user_id = other_user_response['id']
        self.test_user_ids.append(other_user_id)
        
        # Add rating for other user with similar show name
        other_rating_data = {
            'user_id': other_user_id,
            'show_id': '9999',
            'show_name_lowercase': 'breaking dawn',
            'rating': 6,
            'comment': 'Other user rating'
        }
        
        response = self.client.post('/api/ratings',
                                   data=json.dumps(other_rating_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        other_rating_response = json.loads(response.data)
        self.test_rating_ids.append(other_rating_response['id'])
        
        # Search for our test user's rated shows
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should only return our test user's ratings, not the other user's
        assert len(data["results"]) == 2  # Only "breaking bad" and "breaking point"
        
        for result in data["results"]:
            assert result["user_id"] == self.test_user_id
            assert result["show_name_lowercase"] in ["breaking bad", "breaking point"]
            # Should NOT include "breaking dawn" from other user
            assert result["show_name_lowercase"] != "breaking dawn"


class TestSearchRatedShowsTimestampSorting:
    """Test timestamp sorting functionality for search user rated shows endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_timestamp_test_data(self, get_db, get_client):
        """Set up test data with controlled timestamps for sorting tests"""
        self.db = get_db
        self.client = get_client
        self.test_user_ids = []
        self.test_rating_ids = []
        
        # Create test user
        user_data = {
            'name': 'Timestamp Sort User',
            'username': 'timestamp_sort_user',
            'email': 'timestamp_sort@example.com',
            'bio': 'Test user for timestamp sorting'
        }
        
        response = self.client.post('/api/add_user', 
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        user_response = json.loads(response.data)
        self.test_user_id = user_response['id']
        self.test_user_ids.append(self.test_user_id)
        
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

    def test_search_rated_shows_same_relevance_group_sorted_alphabetically(self, get_client):
        """Test that within same relevance groups, results are sorted alphabetically by show name"""
        from datetime import timedelta

        base_time = datetime.now(timezone.utc)

        # Create ratings — all prefix matches for "breaking"
        timestamp_ratings = [
            {
                'user_id': self.test_user_id,
                'show_id': 'show_1',
                'show_name_lowercase': 'breaking bad',
                'rating': 9,
                'comment': 'Older breaking bad rating',
                'timestamp': (base_time - timedelta(hours=3)).isoformat()
            },
            {
                'user_id': self.test_user_id,
                'show_id': 'show_2',
                'show_name_lowercase': 'breaking point',
                'rating': 7,
                'comment': 'Newer breaking point rating',
                'timestamp': (base_time - timedelta(hours=1)).isoformat()
            },
            {
                'user_id': self.test_user_id,
                'show_id': 'show_3',
                'show_name_lowercase': 'breaking dawn',
                'rating': 6,
                'comment': 'Most recent breaking dawn rating',
                'timestamp': base_time.isoformat()
            }
        ]

        for rating_data in timestamp_ratings:
            _, rating_ref = self.db.collection("ratings").add(rating_data)
            self.test_rating_ids.append(rating_ref.id)

        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=breaking')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Should find all 3 shows with "breaking" prefix
        assert len(data["results"]) == 3

        # All should be prefix matches
        for result in data["results"]:
            assert result["show_name_lowercase"].startswith("breaking")

        # Within the same relevance group, results are sorted alphabetically by show name
        show_names = [result["show_name_lowercase"] for result in data["results"]]
        assert show_names == sorted(show_names)
    
    def test_search_rated_shows_relevance_priority_over_timestamp(self, get_client):
        """Test that relevance takes priority over timestamp in sorting"""
        import time
        from datetime import timedelta
        
        base_time = datetime.now(timezone.utc)
        
        # Create ratings where a less relevant match has a more recent timestamp
        mixed_relevance_ratings = [
            {
                'user_id': self.test_user_id,
                'show_id': 'show_exact',
                'show_name_lowercase': 'test',  # Exact match
                'rating': 8,
                'comment': 'Exact match - older',
                'timestamp': (base_time - timedelta(hours=5)).isoformat()  # 5 hours ago (older)
            },
            {
                'user_id': self.test_user_id,
                'show_id': 'show_prefix',
                'show_name_lowercase': 'test show',  # Prefix match
                'rating': 7,
                'comment': 'Prefix match - newer',
                'timestamp': base_time.isoformat()  # Most recent
            },
            {
                'user_id': self.test_user_id,
                'show_id': 'show_contains',
                'show_name_lowercase': 'my test series',  # Contains match
                'rating': 6,
                'comment': 'Contains match - middle',
                'timestamp': (base_time - timedelta(hours=2)).isoformat()  # 2 hours ago
            }
        ]
        
        # Add ratings directly to database
        for rating_data in mixed_relevance_ratings:
            _, rating_ref = self.db.collection("ratings").add(rating_data)
            self.test_rating_ids.append(rating_ref.id)
        
        # Search for "test"
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=test')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should find 3 shows
        assert len(data["results"]) == 3
        
        # Verify relevance-based sorting takes priority over timestamp
        # Exact match should come first despite being older
        assert data["results"][0]["show_name_lowercase"] == "test"  # Exact match (oldest timestamp)
        
        # Prefix and contains matches should be sorted by timestamp within their relevance groups
        remaining_shows = data["results"][1:]
        remaining_timestamps = [result["timestamp"] for result in remaining_shows]
        
        # Convert to datetime objects for comparison
        remaining_datetime_objects = []
        for timestamp in remaining_timestamps:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            remaining_datetime_objects.append(dt)
        
        # Within same relevance group, should be sorted by timestamp (most recent first)
        for i in range(len(remaining_datetime_objects) - 1):
            assert remaining_datetime_objects[i] >= remaining_datetime_objects[i + 1]
    
    def test_search_rated_shows_identical_timestamps_same_relevance(self, get_client):
        """Test sorting when shows have identical timestamps and same relevance"""
        # Create ratings with identical timestamps and same relevance
        same_timestamp = datetime.now(timezone.utc).isoformat()
        identical_ratings = [
            {
                'user_id': self.test_user_id,
                'show_id': 'show_a',
                'show_name_lowercase': 'alpha show',  # Prefix match
                'rating': 8,
                'comment': 'Alpha show rating',
                'timestamp': same_timestamp
            },
            {
                'user_id': self.test_user_id,
                'show_id': 'show_b',
                'show_name_lowercase': 'alpha series',  # Prefix match
                'rating': 7,
                'comment': 'Alpha series rating',
                'timestamp': same_timestamp
            },
            {
                'user_id': self.test_user_id,
                'show_id': 'show_c',
                'show_name_lowercase': 'alpha drama',  # Prefix match
                'rating': 9,
                'comment': 'Alpha drama rating',
                'timestamp': same_timestamp
            }
        ]
        
        # Add ratings directly to database
        for rating_data in identical_ratings:
            _, rating_ref = self.db.collection("ratings").add(rating_data)
            self.test_rating_ids.append(rating_ref.id)
        
        # Search for "alpha"
        response = get_client.get(f'/api/users/{self.test_user_id}/rated-shows/search?query=alpha')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should find 3 shows
        assert len(data["results"]) == 3
        
        # All timestamps should be identical
        timestamps = [result["timestamp"] for result in data["results"]]
        assert all(ts == timestamps[0] for ts in timestamps)
        
        # All shows should be present
        show_names = [result["show_name_lowercase"] for result in data["results"]]
        assert "alpha show" in show_names
        assert "alpha series" in show_names
        assert "alpha drama" in show_names
        
        # All should have same relevance (prefix matches)
        for result in data["results"]:
            assert result["show_name_lowercase"].startswith("alpha")
