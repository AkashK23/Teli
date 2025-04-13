from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from flask_cors import CORS
from pydantic import BaseModel, EmailStr, ValidationError
from werkzeug.exceptions import BadRequest
from typing import Optional, List
import requests

app = Flask(__name__)

CORS(app)


# Load Firebase credentials
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()

@app.route("/")
def hello():
    return jsonify({"message": "Hello from Teli!"})

class AddUserRequest(BaseModel):
    name: str
    email: EmailStr
    bio: Optional[str] = None
    watchlist: Optional[List[str]] = None

@app.route("/add_user", methods=["POST"])
def add_user():
    try:
        # Validate and parse request
        req_data = AddUserRequest.model_validate(request.get_json())
    except ValidationError as e:
        # If validation fails, return 400 with error details
        return jsonify({"errors": e.errors()}), 400

    # Now safe to use validated data
    user_data = req_data.model_dump()
    print(user_data)
    user_ref = db.collection("users").add(user_data)
    return jsonify({"message": "User added successfully!", "id": user_ref[1].id})

@app.route('/get_users', methods=['GET'])
def get_users():
    try:
        users_ref = db.collection('users')
        docs = users_ref.stream()

        users_list = []
        for doc in docs:
            user_data = doc.to_dict()
            user_data["id"] = doc.id  # Include the document ID
            users_list.append(user_data)

        return jsonify(users_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
def get_tvdb_authorization_token():
    with open('authorizationToken.txt', 'r') as file:
        data = file.read()
    return data

TVDB_API_KEY = get_tvdb_authorization_token()
TVDB_BASE_URL = "https://api4.thetvdb.com/v4"

@app.route("/shows/search", methods=["GET"])
def search_shows():
    print("here")
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400
    print(TVDB_API_KEY)
    headers = {
        "accept": "application/json",
        "Authorization": f"{TVDB_API_KEY}"
        }
    print(headers)
    url = f"{TVDB_BASE_URL}/search?query={query}&type=series&limit=1"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        wanted_fields = [
            "name", 
            "overview", 
            "thumbnail", 
            "image_url", 
            "links", 
            "network", 
            "primary_language", 
            "year", 
            "id"]

        filtered_data = [
            {field: item[field] for field in wanted_fields if field in item}
            for item in response.json()["data"]
        ]
        result = {"data": filtered_data}
        return jsonify(result), 200
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

class AddRatingRequest(BaseModel):
    user_id: str
    show_id: str
    rating: int
    comment: Optional[str] = None

@app.route("/ratings", methods=["POST"])
def add_rating():
    try:
        req_data = AddRatingRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    rating_data = req_data.model_dump()
    rating_ref = db.collection("ratings").add(rating_data)
    return jsonify({"message": "Rating added successfully!", "id": rating_ref[1].id})

@app.route("/users/<user_id>/ratings", methods=["GET"])
def get_user_ratings(user_id):
    try:
        ratings_ref = db.collection("ratings").where("user_id", "==", user_id)
        docs = ratings_ref.stream()

        ratings_list = []
        for doc in docs:
            rating_data = doc.to_dict()
            rating_data["id"] = doc.id
            ratings_list.append(rating_data)

        return jsonify(ratings_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/shows/<show_id>/ratings", methods=["GET"])
def get_show_ratings(show_id):
    try:
        ratings_ref = db.collection("ratings").where("show_id", "==", show_id)
        docs = ratings_ref.stream()

        ratings_list = []
        for doc in docs:
            rating_data = doc.to_dict()
            rating_data["id"] = doc.id
            ratings_list.append(rating_data)

        return jsonify(ratings_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)
