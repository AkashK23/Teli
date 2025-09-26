import pytest
import json
from datetime import datetime, timezone
from teli_routes import teli, get_prefix_range


class TestGetPrefixRange:
    """Test the get_prefix_range helper function"""
    
    def test_get_prefix_range_valid_input(self):
        """Test prefix range calculation with valid input"""
        start, end = get_prefix_range("joh")
        assert start == "joh"
        assert end == "joi"
    
    def test_get_prefix_range_single_char(self):
        """Test prefix range with single character"""
        start, end = get_prefix_range("j")
        assert start == "j"
        assert end == "k"
    
    def test_get_prefix_range_empty_string(self):
        """Test prefix range with empty string"""
        start, end = get_prefix_range("")
        assert start is None
        assert end is None
    
    def test_get_prefix_range_none(self):
        """Test prefix range with None input"""
        start, end = get_prefix_range(None)
        assert start is None
        assert end is None
    
    def test_get_prefix_range_case_insensitive(self):
        """Test that prefix range converts to lowercase"""
        start, end = get_prefix_range("JOH")
        assert start == "joh"
        assert end == "joi"


class TestUserSearch:
    """Test the user search endpoint using real database operations"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self, get_db):
        """Set up test data in the database before each test"""
        self.db = get_db
        self.test_user_ids = []
        
        # Create test users
        test_users = [
            {
                'name': 'John Doe',
                'username': 'johndoe',
                'email': 'john@example.com',
                'name_lowercase': 'john doe',
                'username_lowercase': 'johndoe',
                'bio': 'Test user',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'Jane Johnson',
                'username': 'janej',
                'email': 'jane@example.com',
                'name_lowercase': 'jane johnson',
                'username_lowercase': 'janej',
                'bio': 'Another test user',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'Johnny Walker',
                'username': 'johnny',
                'email': 'johnny@example.com',
                'name_lowercase': 'johnny walker',
                'username_lowercase': 'johnny',
                'bio': 'Third test user',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'Test User',
                'username': 'john',
                'email': 'testuser@example.com',
                'name_lowercase': 'test user',
                'username_lowercase': 'john',
                'bio': 'Exact match user',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'John Smith',
                'username': 'jsmith',
                'email': 'jsmith@example.com',
                'name_lowercase': 'john smith',
                'username_lowercase': 'jsmith',
                'bio': 'Name prefix match user',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        ]
        
        # Add users to database
        for user_data in test_users:
            _, user_ref = self.db.collection("users").add(user_data)
            self.test_user_ids.append(user_ref.id)
        
        yield
        
        # Clean up test data
        for user_id in self.test_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass  # Ignore errors during cleanup
    
    def test_search_users_missing_query_parameter(self, get_client):
        """Test search without query parameter returns error"""
        response = get_client.get('/users/search')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Missing 'query' parameter" in data['error']
    
    def test_search_users_empty_query_parameter(self, get_client):
        """Test search with empty query parameter returns error"""
        response = get_client.get('/users/search?query=')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Missing 'query' parameter" in data['error']
    
    def test_search_users_invalid_page_parameter(self, get_client):
        """Test search with invalid page parameter"""
        response = get_client.get('/users/search?query=john&page=invalid')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Page parameter must be a positive integer" in data['error']
    
    def test_search_users_invalid_limit_parameter(self, get_client):
        """Test search with invalid limit parameter"""
        response = get_client.get('/users/search?query=john&limit=invalid')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Limit parameter must be a positive integer" in data['error']
    
    def test_search_users_negative_page(self, get_client):
        """Test search with negative page number defaults to 1"""
        response = get_client.get('/users/search?query=john&page=-1')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['current_page'] == 1
    
    def test_search_users_limit_exceeds_maximum(self, get_client):
        """Test search with limit exceeding maximum gets capped"""
        response = get_client.get('/users/search?query=john&limit=200')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['limit'] == 100
    
    def test_search_users_invalid_prefix_range(self, get_client):
        """Test search when prefix range is invalid"""
        response = get_client.get('/users/search?query=')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Missing 'query' parameter" in data['error']
    
    def test_search_users_successful_search(self, get_client):
        """Test successful user search"""
        response = get_client.get('/users/search?query=jo')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should find users with 'jo' prefix in username or name
        assert len(data['results']) >= 2  # At least johndoe and john users
        assert data['total_results'] >= 2
        assert data['current_page'] == 1
        assert data['limit'] == 20
        
        # Check that sensitive fields are removed
        for user in data['results']:
            assert 'email' not in user
            assert 'password' not in user
            assert 'name_lowercase' not in user
            assert 'username_lowercase' not in user
            assert 'id' in user
            assert 'name' in user
            assert 'username' in user
        
        # Verify we found expected users
        usernames = [user['username'] for user in data['results']]
        assert 'johndoe' in usernames
        assert 'john' in usernames
    
    def test_search_users_deduplication(self, get_client):
        """Test that duplicate users are removed from results"""
        response = get_client.get('/users/search?query=john')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Check that all user IDs are unique
        user_ids = [user['id'] for user in data['results']]
        assert len(user_ids) == len(set(user_ids))
    
    def test_search_users_pagination(self, get_client):
        """Test pagination functionality"""
        # Create additional test users for pagination
        additional_users = []
        for i in range(15):
            user_data = {
                'name': f'User {i}',
                'username': f'user{i}',
                'email': f'user{i}@example.com',
                'name_lowercase': f'user {i}',
                'username_lowercase': f'user{i}',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            _, user_ref = self.db.collection("users").add(user_data)
            additional_users.append(user_ref.id)
        
        try:
            # Test first page
            response = get_client.get('/users/search?query=user&page=1&limit=10')
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert len(data['results']) == 10
            assert data['total_results'] >= 15
            assert data['current_page'] == 1
            assert data['limit'] == 10
            
            # Test second page
            response = get_client.get('/users/search?query=user&page=2&limit=10')
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert len(data['results']) >= 5  # At least 5 remaining users
            assert data['current_page'] == 2
            
        finally:
            # Clean up additional users
            for user_id in additional_users:
                try:
                    self.db.collection("users").document(user_id).delete()
                except Exception:
                    pass
    
    def test_search_users_sorting_relevance(self, get_client):
        """Test that results are sorted by relevance"""
        response = get_client.get('/users/search?query=john')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['results']) >= 3
        
        # Find the positions of our test users
        usernames = [user['username'] for user in data['results']]
        names = [user['name'] for user in data['results']]
        
        # Exact username match should come before prefix matches
        if 'john' in usernames and 'johndoe' in usernames:
            john_index = usernames.index('john')
            johndoe_index = usernames.index('johndoe')
            assert john_index < johndoe_index
        
        # Username matches should generally come before name matches
        # (though this depends on the specific implementation)
        assert 'john' in usernames or 'johndoe' in usernames
    
    def test_search_users_no_results(self, get_client):
        """Test search with query that returns no results"""
        response = get_client.get('/users/search?query=xyz123nonexistent')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['results'] == []
        assert data['total_results'] == 0
        assert data['total_pages'] == 1
        assert data['current_page'] == 1


class TestAddUserWithLowercaseFields:
    """Test that add_user function properly stores lowercase fields"""
    
    @pytest.fixture(autouse=True)
    def setup_cleanup(self, get_db):
        """Set up cleanup for test users"""
        self.db = get_db
        self.test_user_ids = []
        
        yield
        
        # Clean up test data
        for user_id in self.test_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass
    
    def test_add_user_stores_lowercase_fields(self, get_client):
        """Test that add_user stores name_lowercase and username_lowercase"""
        user_data = {
            'name': 'John Doe',
            'username': 'JohnDoe123',
            'email': 'john123@example.com',
            'bio': 'Test user'
        }
        
        response = get_client.post('/add_user', 
                                 data=json.dumps(user_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        user_id = data['id']
        self.test_user_ids.append(user_id)
        
        # Verify the user was created with lowercase fields
        user_doc = self.db.collection("users").document(user_id).get()
        assert user_doc.exists
        
        user_data_from_db = user_doc.to_dict()
        assert user_data_from_db['name'] == 'John Doe'
        assert user_data_from_db['username'] == 'JohnDoe123'
        assert user_data_from_db['name_lowercase'] == 'john doe'
        assert user_data_from_db['username_lowercase'] == 'johndoe123'
        assert 'created_at' in user_data_from_db
    
    def test_add_user_duplicate_username(self, get_client):
        """Test that adding a user with duplicate username fails"""
        user_data = {
            'name': 'First User',
            'username': 'duplicate_test',
            'email': 'first@example.com',
            'bio': 'First user'
        }
        
        # Add first user
        response = get_client.post('/add_user', 
                                 data=json.dumps(user_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        self.test_user_ids.append(data['id'])
        
        # Try to add second user with same username
        user_data2 = {
            'name': 'Second User',
            'username': 'duplicate_test',
            'email': 'second@example.com',
            'bio': 'Second user'
        }
        
        response = get_client.post('/add_user', 
                                 data=json.dumps(user_data2),
                                 content_type='application/json')
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert "Username already exists" in data['error']
    
    def test_add_user_duplicate_email(self, get_client):
        """Test that adding a user with duplicate email fails"""
        user_data = {
            'name': 'First User',
            'username': 'first_user',
            'email': 'duplicate@example.com',
            'bio': 'First user'
        }
        
        # Add first user
        response = get_client.post('/add_user', 
                                 data=json.dumps(user_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        self.test_user_ids.append(data['id'])
        
        # Try to add second user with same email
        user_data2 = {
            'name': 'Second User',
            'username': 'second_user',
            'email': 'duplicate@example.com',
            'bio': 'Second user'
        }
        
        response = get_client.post('/add_user', 
                                 data=json.dumps(user_data2),
                                 content_type='application/json')
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert "Email already exists" in data['error']
