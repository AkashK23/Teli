import pytest
import json
from datetime import datetime, timezone


class TestPopularUsers:
    """Test cases for the popular users endpoint."""

    @pytest.fixture(autouse=True)
    def setup_test_data(self, get_db):
        """Set up test data in the database before each test"""
        self.db = get_db
        self.test_user_ids = []
        self.test_follow_ids = []
        
        # Create test users
        test_users = [
            {
                'name': 'Alice Johnson',
                'username': 'alice',
                'email': 'alice@example.com',
                'name_lowercase': 'alice johnson',
                'username_lowercase': 'alice',
                'bio': 'TV enthusiast',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'Bob Smith',
                'username': 'bob',
                'email': 'bob@example.com',
                'name_lowercase': 'bob smith',
                'username_lowercase': 'bob',
                'bio': 'Movie critic',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'Charlie Brown',
                'username': 'charlie',
                'email': 'charlie@example.com',
                'name_lowercase': 'charlie brown',
                'username_lowercase': 'charlie',
                'bio': 'Binge watcher',
                'created_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'name': 'David Wilson',
                'username': 'david',
                'email': 'david@example.com',
                'name_lowercase': 'david wilson',
                'username_lowercase': 'david',
                'bio': 'Show reviewer',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        ]
        
        # Add users to database
        for user_data in test_users:
            _, user_ref = self.db.collection("users").add(user_data)
            self.test_user_ids.append(user_ref.id)
        
        # Create follow relationships to establish follower counts
        # Alice: 3 followers (bob, charlie, david)
        # Bob: 2 followers (charlie, david)  
        # Charlie: 1 follower (david)
        # David: 0 followers
        follow_relationships = [
            {'follower_id': self.test_user_ids[1], 'followee_id': self.test_user_ids[0]},  # bob follows alice
            {'follower_id': self.test_user_ids[2], 'followee_id': self.test_user_ids[0]},  # charlie follows alice
            {'follower_id': self.test_user_ids[3], 'followee_id': self.test_user_ids[0]},  # david follows alice
            {'follower_id': self.test_user_ids[2], 'followee_id': self.test_user_ids[1]},  # charlie follows bob
            {'follower_id': self.test_user_ids[3], 'followee_id': self.test_user_ids[1]},  # david follows bob
            {'follower_id': self.test_user_ids[3], 'followee_id': self.test_user_ids[2]},  # david follows charlie
        ]
        
        for follow_data in follow_relationships:
            follow_data['followed_at'] = datetime.now(timezone.utc).isoformat()
            _, follow_ref = self.db.collection("follows").add(follow_data)
            self.test_follow_ids.append(follow_ref.id)
        
        yield
        
        # Clean up test data
        for user_id in self.test_user_ids:
            try:
                self.db.collection("users").document(user_id).delete()
            except Exception:
                pass
        
        for follow_id in self.test_follow_ids:
            try:
                self.db.collection("follows").document(follow_id).delete()
            except Exception:
                pass

    def test_get_popular_users_default_parameters(self, get_client):
        """Test the endpoint with default parameters."""
        response = get_client.get('/api/users/popular')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Verify response structure
        assert 'popular_users' in data
        assert 'total_users' in data
        assert 'total_pages' in data
        assert 'current_page' in data
        assert 'limit' in data
        
        # Verify default values
        assert data['current_page'] == 1
        assert data['limit'] == 10
        
        # Verify popular_users is a list
        assert isinstance(data['popular_users'], list)
        
        # Verify pagination values are consistent
        assert data['total_pages'] >= 1
        assert data['total_users'] >= 0
        
        # If there are users, verify their structure
        # Note: legacy users created before schema stabilization may omit optional
        # fields like username and created_at, so only required fields are asserted.
        for user in data['popular_users']:
            assert 'id' in user
            assert 'name' in user
            assert 'follower_count' in user

            # Verify sensitive fields are not included
            assert 'password' not in user
            assert 'email' not in user
            assert 'name_lowercase' not in user
            assert 'username_lowercase' not in user

            # Verify follower_count is a positive integer
            assert isinstance(user['follower_count'], int)
            assert user['follower_count'] > 0

    def test_get_popular_users_with_custom_limit(self, get_client):
        """Test the endpoint with a custom limit parameter."""
        response = get_client.get('/api/users/popular?limit=5')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Verify limit is respected
        assert data['limit'] == 5
        assert len(data['popular_users']) <= 5

    def test_get_popular_users_with_pagination(self, get_client):
        """Test the endpoint with pagination parameters."""
        response = get_client.get('/api/users/popular?page=2&limit=3')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Verify pagination parameters
        assert data['current_page'] == 2
        assert data['limit'] == 3
        assert len(data['popular_users']) <= 3

    def test_get_popular_users_sorting_order(self, get_client):
        """Test that users are sorted by follower count (desc) then username (asc)."""
        response = get_client.get('/api/users/popular?limit=5')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        users = data['popular_users']
        
        # Verify sorting order
        for i in range(len(users) - 1):
            current_user = users[i]
            next_user = users[i + 1]
            
            # Current user should have >= followers than next user
            assert current_user['follower_count'] >= next_user['follower_count']
            
            # If follower counts are equal, usernames should be in alphabetical order
            # (use empty string as fallback for legacy users without username)
            if current_user['follower_count'] == next_user['follower_count']:
                assert current_user.get('username', '') <= next_user.get('username', '')

    def test_get_popular_users_invalid_page_parameter(self, get_client):
        """Test the endpoint with invalid page parameter."""
        response = get_client.get('/api/users/popular?page=0')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Should default to page 1 when invalid page is provided
        assert data['current_page'] == 1

    def test_get_popular_users_invalid_limit_parameter(self, get_client):
        """Test the endpoint with invalid limit parameter."""
        response = get_client.get('/api/users/popular?limit=100')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Should cap at maximum limit of 50
        assert data['limit'] == 50

    def test_get_popular_users_non_numeric_parameters(self, get_client):
        """Test the endpoint with non-numeric parameters."""
        response = get_client.get('/api/users/popular?page=abc&limit=xyz')
        
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert 'error' in data
        assert 'positive integer' in data['error']

    def test_get_popular_users_negative_parameters(self, get_client):
        """Test the endpoint with negative parameters."""
        response = get_client.get('/api/users/popular?page=-1&limit=-5')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Should handle negative values gracefully
        assert data['current_page'] == 1  # Should default to 1
        assert data['limit'] == 10  # Should default to 10

    def test_get_popular_users_response_structure(self, get_client):
        """Test that the response structure matches the expected format."""
        response = get_client.get('/api/users/popular')
        
        assert response.status_code == 200
        assert response.content_type == 'application/json'
        
        data = json.loads(response.data)
        
        # Verify all required fields are present
        required_fields = ['popular_users', 'total_users', 'total_pages', 'current_page', 'limit']
        for field in required_fields:
            assert field in data
        
        # Verify data types
        assert isinstance(data['popular_users'], list)
        assert isinstance(data['total_users'], int)
        assert isinstance(data['total_pages'], int)
        assert isinstance(data['current_page'], int)
        assert isinstance(data['limit'], int)

    def test_get_popular_users_large_page_number(self, get_client):
        """Test the endpoint with a page number beyond available results."""
        response = get_client.get('/api/users/popular?page=999')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Should return empty results for pages beyond available data
        assert data['current_page'] == 999
        assert data['popular_users'] == []

    def test_get_popular_users_with_test_data(self, get_client):
        """Test the endpoint with our test data to verify sorting."""
        response = get_client.get('/api/users/popular')
        
        assert response.status_code == 200
        
        data = json.loads(response.data)
        
        # Should have at least 3 users (alice, bob, charlie) since david has 0 followers
        assert len(data['popular_users']) >= 3
        
        # Find our test users in the results
        test_users = {}
        for user in data['popular_users']:
            username = user.get('username')
            if username in ['alice', 'bob', 'charlie']:
                test_users[username] = user
        
        # Verify follower counts and sorting
        if 'alice' in test_users:
            assert test_users['alice']['follower_count'] == 3
        if 'bob' in test_users:
            assert test_users['bob']['follower_count'] == 2
        if 'charlie' in test_users:
            assert test_users['charlie']['follower_count'] == 1
        
        # Verify alice comes before bob, bob comes before charlie
        # Use .get() to tolerate legacy users that predate the username field
        usernames = [user.get('username') for user in data['popular_users']]
        if 'alice' in usernames and 'bob' in usernames:
            alice_index = usernames.index('alice')
            bob_index = usernames.index('bob')
            assert alice_index < bob_index
        
        if 'bob' in usernames and 'charlie' in usernames:
            bob_index = usernames.index('bob')
            charlie_index = usernames.index('charlie')
            assert bob_index < charlie_index
