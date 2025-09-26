import requests
import json

def test_user_search():
    # Test the basic endpoint first
    try:
        response = requests.get("http://localhost:5001/")
        print(f"Basic endpoint status: {response.status_code}")
        print(f"Basic endpoint response: {response.text}")
    except Exception as e:
        print(f"Error with basic endpoint: {e}")
        return
    
    # Test adding a user
    try:
        user_data = {
            "name": "Sujay Test",
            "username": "sujay",
            "email": "sujay@test.com",
            "bio": "Test user for search"
        }
        response = requests.post("http://localhost:5001/add_user", json=user_data)
        print(f"Add user status: {response.status_code}")
        print(f"Add user response: {response.text}")
    except Exception as e:
        print(f"Error adding user: {e}")
    
    # Test searching for the user
    try:
        response = requests.get("http://localhost:5001/users/search?query=sujay")
        print(f"Search status: {response.status_code}")
        print(f"Search response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Number of results: {len(data.get('results', []))}")
            for user in data.get('results', []):
                print(f"Found user: {user.get('name')} ({user.get('username')})")
        
    except Exception as e:
        print(f"Error searching users: {e}")
    
    # Test getting all users
    try:
        response = requests.get("http://localhost:5001/get_users")
        print(f"Get all users status: {response.status_code}")
        if response.status_code == 200:
            users = response.json()
            print(f"Total users in database: {len(users)}")
            for user in users:
                print(f"User: {user.get('name')} ({user.get('username')})")
        else:
            print(f"Get all users response: {response.text}")
    except Exception as e:
        print(f"Error getting all users: {e}")

if __name__ == "__main__":
    test_user_search()
