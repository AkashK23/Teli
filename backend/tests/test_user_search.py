import pytest
import json
from unittest.mock import Mock, patch
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
    """Test the user search endpoint"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(teli)
        app.config['TESTING'] = True
        return app.test_client()
    
    @pytest.fixture
    def mock_db(self):
        """Mock the database"""
        with patch('teli_routes.db') as mock:
            yield mock
    
    def test_search_users_missing_query_parameter(self, client):
        """Test search without query parameter returns error"""
        response = client.get('/users/search')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Missing 'query' parameter" in data['error']
    
    def test_search_users_empty_query_parameter(self, client):
        """Test search with empty query parameter returns error"""
        response = client.get('/users/search?query=')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Missing 'query' parameter" in data['error']
    
    def test_search_users_invalid_page_parameter(self, client, mock_db):
        """Test search with invalid page parameter"""
        response = client.get('/users/search?query=john&page=invalid')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Page parameter must be a positive integer" in data['error']
    
    def test_search_users_invalid_limit_parameter(self, client, mock_db):
        """Test search with invalid limit parameter"""
        response = client.get('/users/search?query=john&limit=invalid')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "Limit parameter must be a positive integer" in data['error']
    
    def test_search_users_negative_page(self, client, mock_db):
        """Test search with negative page number defaults to 1"""
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.stream.return_value = []
        
        response = client.get('/users/search?query=john&page=-1')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['current_page'] == 1
    
    def test_search_users_limit_exceeds_maximum(self, client, mock_db):
        """Test search with limit exceeding maximum gets capped"""
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.stream.return_value = []
        
        response = client.get('/users/search?query=john&limit=200')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['limit'] == 100
    
    @patch('teli_routes.get_prefix_range')
    def test_search_users_invalid_prefix_range(self, mock_get_prefix_range, client, mock_db):
        """Test search when prefix range is invalid"""
        mock_get_prefix_range.return_value = (None, None)
        
        response = client.get('/users/search?query=john')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['results'] == []
        assert data['total_results'] == 0
    
    def test_search_users_successful_search(self, client, mock_db):
        """Test successful user search"""
        # Mock user documents
        mock_user1 = Mock()
        mock_user1.to_dict.return_value = {
            'name': 'John Doe',
            'username': 'johndoe',
            'email': 'john@example.com',
            'name_lowercase': 'john doe',
            'username_lowercase': 'johndoe',
            'bio': 'Test user'
        }
        mock_user1.id = 'user1'
        
        mock_user2 = Mock()
        mock_user2.to_dict.return_value = {
            'name': 'Jane Johnson',
            'username': 'janej',
            'email': 'jane@example.com',
            'name_lowercase': 'jane johnson',
            'username_lowercase': 'janej',
            'bio': 'Another test user'
        }
        mock_user2.id = 'user2'
        
        # Mock database queries
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        # First call returns username matches, second call returns name matches
        mock_query.stream.side_effect = [[mock_user1], [mock_user2]]
        
        response = client.get('/users/search?query=jo')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['results']) == 2
        assert data['total_results'] == 2
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
    
    def test_search_users_deduplication(self, client, mock_db):
        """Test that duplicate users are removed from results"""
        # Mock the same user appearing in both username and name searches
        mock_user = Mock()
        mock_user.to_dict.return_value = {
            'name': 'John Doe',
            'username': 'johndoe',
            'email': 'john@example.com',
            'name_lowercase': 'john doe',
            'username_lowercase': 'johndoe'
        }
        mock_user.id = 'user1'
        
        # Mock database queries
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        # Both queries return the same user
        mock_query.stream.side_effect = [[mock_user], [mock_user]]
        
        response = client.get('/users/search?query=john')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should only have one result despite appearing in both queries
        assert len(data['results']) == 1
        assert data['total_results'] == 1
    
    def test_search_users_pagination(self, client, mock_db):
        """Test pagination functionality"""
        # Create mock users
        mock_users = []
        for i in range(25):
            mock_user = Mock()
            mock_user.to_dict.return_value = {
                'name': f'User {i}',
                'username': f'user{i}',
                'name_lowercase': f'user {i}',
                'username_lowercase': f'user{i}'
            }
            mock_user.id = f'user{i}'
            mock_users.append(mock_user)
        
        # Mock database queries
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.stream.side_effect = [mock_users, []]  # Username search returns all, name search returns none
        
        # Test first page
        response = client.get('/users/search?query=user&page=1&limit=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['results']) == 10
        assert data['total_results'] == 25
        assert data['total_pages'] == 3
        assert data['current_page'] == 1
        assert data['limit'] == 10
        
        # Test second page
        response = client.get('/users/search?query=user&page=2&limit=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['results']) == 10
        assert data['current_page'] == 2
        
        # Test last page
        response = client.get('/users/search?query=user&page=3&limit=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['results']) == 5  # Remaining users
        assert data['current_page'] == 3
    
    def test_search_users_sorting_relevance(self, client, mock_db):
        """Test that results are sorted by relevance"""
        # Create mock users with different match types
        mock_exact_username = Mock()
        mock_exact_username.to_dict.return_value = {
            'name': 'Test User',
            'username': 'john',  # Exact username match
            'name_lowercase': 'test user',
            'username_lowercase': 'john'
        }
        mock_exact_username.id = 'exact_username'
        
        mock_username_prefix = Mock()
        mock_username_prefix.to_dict.return_value = {
            'name': 'Another User',
            'username': 'johnny',  # Username prefix match
            'name_lowercase': 'another user',
            'username_lowercase': 'johnny'
        }
        mock_username_prefix.id = 'username_prefix'
        
        mock_name_prefix = Mock()
        mock_name_prefix.to_dict.return_value = {
            'name': 'John Smith',  # Name prefix match
            'username': 'jsmith',
            'name_lowercase': 'john smith',
            'username_lowercase': 'jsmith'
        }
        mock_name_prefix.id = 'name_prefix'
        
        # Mock database queries
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        # Return users in mixed order
        mock_query.stream.side_effect = [
            [mock_username_prefix, mock_exact_username],  # Username search
            [mock_name_prefix]  # Name search
        ]
        
        response = client.get('/users/search?query=john')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert len(data['results']) == 3
        
        # Check sorting: exact username match should be first
        assert data['results'][0]['username'] == 'john'  # Exact match
        assert data['results'][1]['username'] == 'johnny'  # Username prefix
        assert data['results'][2]['name'] == 'John Smith'  # Name prefix
    
    def test_search_users_database_error(self, client, mock_db):
        """Test handling of database errors"""
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_collection.where.side_effect = Exception("Database error")
        
        response = client.get('/users/search?query=john')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert "Database error occurred" in data['error']


class TestAddUserWithLowercaseFields:
    """Test that add_user function properly stores lowercase fields"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(teli)
        app.config['TESTING'] = True
        return app.test_client()
    
    @pytest.fixture
    def mock_db(self):
        """Mock the database"""
        with patch('teli_routes.db') as mock:
            yield mock
    
    def test_add_user_stores_lowercase_fields(self, client, mock_db):
        """Test that add_user stores name_lowercase and username_lowercase"""
        # Mock database queries for uniqueness checks
        mock_collection = Mock()
        mock_db.collection.return_value = mock_collection
        mock_query = Mock()
        mock_collection.where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.get.return_value = []  # No existing users
        
        # Mock the add operation
        mock_ref = Mock()
        mock_ref.id = 'new_user_id'
        mock_collection.add.return_value = (None, mock_ref)
        
        user_data = {
            'name': 'John Doe',
            'username': 'JohnDoe',
            'email': 'john@example.com',
            'bio': 'Test user'
        }
        
        response = client.post('/add_user', 
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        
        # Verify that add was called with lowercase fields
        mock_collection.add.assert_called_once()
        call_args = mock_collection.add.call_args[0][0]
        
        assert call_args['name'] == 'John Doe'
        assert call_args['username'] == 'JohnDoe'
        assert call_args['name_lowercase'] == 'john doe'
        assert call_args['username_lowercase'] == 'johndoe'
        assert 'created_at' in call_args
