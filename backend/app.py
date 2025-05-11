from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from flask_cors import CORS
from pydantic import BaseModel, EmailStr, Field, ValidationError
from werkzeug.exceptions import BadRequest
from typing import Optional, List
from datetime import datetime, timezone
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = Flask(__name__)

CORS(app)

# Load Firebase credentials
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    raise

@app.route("/")
def hello():
    return jsonify({"message": "Hello from Teli!"})

class AddUserRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    bio: Optional[str] = None

@app.route("/add_user", methods=["POST"])
def add_user():
    try:
        # Validate and parse request
        req_data = AddUserRequest.model_validate(request.get_json())
    except ValidationError as e:
        # If validation fails, return 400 with error details
        return jsonify({"errors": e.errors()}), 400

    # Check if username is already taken
    username_query = db.collection("users").where(
        filter=FieldFilter("username", "==", req_data.username)).limit(1).get()
    if len(username_query) > 0:
        return jsonify({"error": "Username already exists"}), 409

    # Check if email is already taken
    email_query = db.collection("users").where(
        filter=FieldFilter("email", "==", req_data.email)).limit(1).get()
    if len(email_query) > 0:
        return jsonify({"error": "Email already exists"}), 409

    # Now safe to use validated data
    user_data = req_data.model_dump()
    user_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        user_ref = db.collection("users").add(user_data)
        return jsonify({"message": "User added successfully!", "id": user_ref[1].id})
    except Exception as e:
        logger.error(f"Error adding user: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    
@app.route("/user/<user_id>", methods=["GET"])
def get_user(user_id):
    try:
        # Try to get user by ID
        user_doc = db.collection("users").document(user_id).get()
        
        # Check if user exists
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Get user data
        user_data = user_doc.to_dict()
        
        # Remove sensitive fields if needed
        if "password" in user_data:
            del user_data["password"]
        
        # Add the document ID to the response
        user_data["id"] = user_id
        
        return jsonify(user_data), 200
    
    except Exception as e:
        logger.error(f"Error retrieving user: {e}", exc_info=True)
        return jsonify({"error": "Database error occurred"}), 500

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

class AddToWatchlistRequest(BaseModel):
    user_id: str
    show_id: str

@app.route("/add_to_watchlist", methods=["POST"])
def add_to_watchlist():
    try:
        req_data = AddToWatchlistRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    # Check if user exists
    user_ref = db.collection("users").document(req_data.user_id).get()
    if not user_ref.exists:
        return jsonify({"error": "User not found"}), 404

    watchlist_data = {
        "user_id": req_data.user_id,
        "show_id": req_data.show_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        watchlist_ref = db.collection("watchlists").add(watchlist_data)
        return jsonify({"message": "Added to watchlist!", "id": watchlist_ref[1].id}), 200
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    
def get_tvdb_authorization_token():
    try:
        with open('authorizationToken.txt', 'r') as file:
            data = file.read()
        return data
    except FileNotFoundError:
        logger.error("TVDB authorization token file not found")
        return None
    except Exception as e:
        logger.error(f"Error reading TVDB token: {e}")
        return None

TMDB_API_KEY = get_tvdb_authorization_token()
TVDB_BASE_URL = "https://api.themoviedb.org/3"

def handle_tvdb_api_error(error, api_name="TVDB API", default_status=500):
    # Specific error mapping for known exception types
    error_mapping = {
        requests.ConnectionError: (f"Could not connect to {api_name}", 503),
        requests.Timeout: (f"{api_name} request timed out", 504),
        requests.HTTPError: (f"{api_name} returned an HTTP error", 502),
        requests.TooManyRedirects: (f"Too many redirects while connecting to {api_name}", 502),
    }
    error_class = type(error)
    
    if error_class in error_mapping:
        message, status = error_mapping[error_class]
    elif isinstance(error, requests.RequestException):
        # Handle any other RequestException not explicitly listed
        message = f"{api_name} request failed: {str(error)}"
        status = 500
    else:
        # Handle any other exception
        message = f"Error processing {api_name} request: {str(error)}"
        status = default_status
    
    logger.error(f"{api_name} error: {message}", exc_info=True)
    return jsonify({"error": message}), status

@app.route("/shows/search", methods=["GET"])
def search_shows():
    query = request.args.get("query")
    page = request.args.get("page", default=1, type=int)
    
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400
    
    # Ensure limit is within reasonable bounds
    if page < 1:
        page = 1
    
    headers = {
        "accept": "application/json",
        "Authorization": f"{TMDB_API_KEY}"
    }
    url = f"{TVDB_BASE_URL}/search/tv?query={query}&include_adult=false&page={page}"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TVDB authentication failed")
            return jsonify({"error": "TVDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TVDB API error: {response.status_code}")
            return jsonify({"error": f"TVDB API returned status {response.status_code}"}), 500
        response.raise_for_status()
        wanted_fields = [
            "backdrop_path",
            "genre_ids",
            "id",
            "origin_country",
            "original_language", 
            "original_name",
            "overview", 
            "popularity", 
            "poster_path", 
            "first_air_date", 
            "name"]
        response_data = response.json()
        total_pages = response_data["total_pages"]
        total_results = response_data["total_results"]
        filtered_data = extract_wanted_fields(response_data, wanted_fields)
        result = {
            "results": filtered_data,
            "total_pages": total_pages,
            "total_results": total_results
        }
        return jsonify(result), 200
    except Exception as e:
        return handle_tvdb_api_error(e)

def extract_wanted_fields(response_json, wanted_fields):
    results = response_json.get("results")
    filtered_data = []
    for result in results:
        filtered_item = {field: result.get(field, "") for field in wanted_fields}
        filtered_data.append(filtered_item)
    
    return filtered_data

    
@app.route("/shows/filter", methods=["GET"])
def filter_shows():
    if not TMDB_API_KEY:
        return jsonify({"error": "TVDB API key not available"}), 503

    # Optional filters
    params = {
        "air_date.gte": request.args.get("air_date.gte"),
        "air_date.lte": request.args.get("air_date.lte"),
        "first_air_date_year": request.args.get("first_air_date_year"),
        "first_air_date.gte": request.args.get("first_air_date.gte"),
        "include_adult": request.args.get("include_adult", False),
        "include_null_first_air_dates": request.args.get("include_null_first_air_dates", False),
        "language": request.args.get("language", "en-US"),
        "page": request.args.get("page", 1),
        "screened_theatrically": request.args.get("screened_theatrically"),
        "sort_by": request.args.get("sort_by", "popularity.desc"),
        "timezone": request.args.get("timezone"),
        "vote_average.gte": request.args.get("vote_average.gte"),
        "vote_average.lte": request.args.get("vote_average.lte"),
        "vote_count.gte": request.args.get("vote_count.gte"),
        "vote_count.lte": request.args.get("vote_count.lte"),
        "watch_region": request.args.get("watch_region"),
        "with_companies": request.args.get("with_companies"),
        "with_genres": request.args.get("with_genres"),
        "with_keywords": request.args.get("with_keywords"),
        "with_networks": request.args.get("with_networks"),
        "with_origin_country": request.args.get("with_origin_country"),
        "with_original_language": request.args.get("with_original_language"),
        "with_runtime.gte": request.args.get("with_runtime.gte"),
        "with_runtime.lte": request.args.get("with_runtime.lte"),
        "with_status": request.args.get("with_status"),
        "with_watch_monetization_types": request.args.get("with_watch_monetization_types"),
        "with_watch_providers": request.args.get("with_watch_providers"),
        "without_companies": request.args.get("without_companies"),
        "without_genres": request.args.get("without_genres"),
        "without_keywords": request.args.get("without_keywords"),
        "without_watch_providers": request.args.get("without_watch_providers"),
        "with_type": request.args.get("with_type"),
    }

    clean_params = {k: v for k, v in params.items() if v is not None}

    headers = {
        "accept": "application/json",
        "Authorization": f"{TMDB_API_KEY}"
    }

    try:
        url = f"{TVDB_BASE_URL}/discover/tv"
        response = requests.get(url, headers=headers, params=clean_params)
        if response.status_code == 401:
            logger.error("TVDB authentication failed")
            return jsonify({"error": "TVDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TVDB API error: {response.status_code}")
            return jsonify({"error": f"TVDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()
        wanted_fields = [
            "backdrop_path",
            "genre_ids",
            "id",
            "origin_country",
            "original_language", 
            "original_name",
            "overview", 
            "popularity", 
            "poster_path", 
            "first_air_date", 
            "name"]

        response_data = response.json()
        total_pages = response_data["total_pages"]
        total_results = response_data["total_results"]
        filtered_data = extract_wanted_fields(response_data, wanted_fields)
        result = {
            "results": filtered_data,
            "total_pages": total_pages,
            "total_results": total_results
            }
        return jsonify(result), 200
    except Exception as e:
        # This will now catch ALL exceptions, not just request-related ones
        return handle_tvdb_api_error(e)
    
def fetch_tvdb_data(endpoint: str, name_filter: str = None, filter_key: str = "name"):
    if not TMDB_API_KEY:
        return jsonify({"error": "TVDB API key not available"}), 503
        
    headers = {
        "accept": "application/json",
        "Authorization": f"{TMDB_API_KEY}"
    }
    url = f"{TVDB_BASE_URL}{endpoint}"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TVDB authentication failed")
            return jsonify({"error": "TVDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TVDB API error: {response.status_code}")
            return jsonify({"error": f"TVDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()

        data = response.json().get("data", [])

        if name_filter:
            data = [
                item for item in data
                if name_filter.lower() in item.get(filter_key, "").lower()
            ]
        return jsonify({"data": data}), 200
    except Exception as e:
        return handle_tvdb_api_error(e)

@app.route("/shows/content-ratings/<series_id>", methods=["GET"])
def get_content_ratings(series_id):
    url = f"{TVDB_BASE_URL}/discover/tv/{series_id}/content_ratings"
    headers = {
        "accept": "application/json",
        "Authorization": f"{TMDB_API_KEY}"
    }
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TVDB authentication failed")
            return jsonify({"error": "TVDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TVDB API error: {response.status_code}")
            return jsonify({"error": f"TVDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()

        data = response.json()
        return jsonify(data), 200
    except Exception as e:
        return handle_tvdb_api_error(e)

@app.route("/shows/<series_id>", methods=["GET"])
def get_show_details(series_id):
    url = f"{TVDB_BASE_URL}/tv/{series_id}"
    headers = {
        "accept": "application/json",
        "Authorization": f"{TMDB_API_KEY}"
    }
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TVDB authentication failed")
            return jsonify({"error": "TVDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TVDB API error: {response.status_code}")
            return jsonify({"error": f"TVDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()
        result = response.json()
        wanted_fields = [
            "backdrop_path",
            "genre_ids",
            "id",
            "origin_country",
            "original_language", 
            "original_name",
            "overview", 
            "popularity", 
            "poster_path", 
            "first_air_date", 
            "name"]
        
        filtered_item = {field: result.get(field, "") for field in wanted_fields}
        return jsonify(filtered_item), 200
    except Exception as e:
        return handle_tvdb_api_error(e)

@app.route("/genres", methods=["GET"])
def get_genres():
    response = fetch_tvdb_data("/genre/tv/list?language=en", request.args.get("name"))
    return response

@app.route("/languages", methods=["GET"])
def get_languages():
    response = fetch_tvdb_data("/configuration/languages", request.args.get("name"))
    return response

@app.route("/countries", methods=["GET"])
def get_countries():
    response = fetch_tvdb_data("/configuration/countries", request.args.get("name"))
    return response

class AddRatingRequest(BaseModel):
    user_id: str
    show_id: str
    rating: int = Field(..., ge=1, le=10)  # Rating between 1-10
    comment: Optional[str] = None

@app.route("/ratings", methods=["POST"])
def add_rating():
    try:
        req_data = AddRatingRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    # Check if user exists
    user_ref = db.collection("users").document(req_data.user_id).get()
    if not user_ref.exists:
        return jsonify({"error": "User not found"}), 404
        
    rating_data = req_data.model_dump()
    rating_data["timestamp"] = datetime.now(timezone.utc).isoformat()

    try:
        # Check if a rating from the same user for the same show already exists
        ratings_ref = db.collection("ratings")
        query = ratings_ref.where(
            filter=FieldFilter("user_id", "==", rating_data["user_id"])).where(
                filter=FieldFilter("show_id", "==", rating_data["show_id"])).limit(1)

        existing_ratings = list(query.stream())
        existing_rating = existing_ratings[0] if existing_ratings else None

        if existing_rating:
            # If rating exists, update it
            existing_rating.reference.update(rating_data)
            rating_id = existing_rating.id
            is_new_rating = False
        else:
            # If rating does not exist, create a new one
            rating_ref = ratings_ref.add(rating_data)
            rating_id = rating_ref[1].id
            is_new_rating = True

        # Only update feed if this is a new rating
        if is_new_rating:
            update_feeds_with_rating(req_data.user_id, rating_id, rating_data)

        return jsonify({"message": "Rating added successfully!", "id": rating_id})
    
    except Exception as e:
        logger.error(f"Error adding rating: {e}")
        return jsonify({"error": str(e)}), 500
    
def update_feeds_with_rating(user_id, rating_id, rating_data):
    """Update the feeds of all followers with this new rating"""
    try:
        # Get all followers
        followers = db.collection("follows").where("followee_id", "==", user_id).stream()

        # Create feed data with rating ID
        feed_data = {**rating_data, "rating_id": rating_id}
        
        # Use batched writes for efficiency
        batch = db.batch()
        batch_count = 0
        all_batches = []

        for follower in followers:
            follower_id = follower.to_dict()["follower_id"]
            feed_ref = db.collection("feeds").document(follower_id).collection("items").document()
            batch.set(feed_ref, feed_data)
            batch_count += 1
            # If we hit 500, commit the batch and start a new one
            if batch_count == 500:
                all_batches.append(batch)
                batch = db.batch()
                batch_count = 0

        # Commit any remaining writes
        if batch_count > 0:
            all_batches.append(batch)
        
        # Commit all batches
        for b in all_batches:
            b.commit()
            
    except Exception as e:
        logger.error(f"Error updating feeds: {e}")
        # Don't fail the main request if feed updates fail
        # Just log the error

@app.route("/users/<user_id>/ratings", methods=["GET"])
def get_user_ratings(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        ratings_ref = db.collection("ratings").where("user_id", "==", user_id)
        docs = ratings_ref.stream()

        ratings_list = []
        for doc in docs:
            rating_data = doc.to_dict()
            rating_data["id"] = doc.id
            ratings_list.append(rating_data)

        return jsonify(ratings_list), 200
    except Exception as e:
        logger.error(f"Error getting user ratings: {e}")
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
        logger.error(f"Error getting show ratings: {e}")
        return jsonify({"error": str(e)}), 500

    
class FollowRequest(BaseModel):
    follower_id: str
    followee_id: str

class FollowRequest(BaseModel):
    follower_id: str
    followee_id: str

@app.route("/follow", methods=["POST"])
def follow_user():
    try:
        req_data = FollowRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    follower_id = req_data.follower_id
    followee_id = req_data.followee_id
    
    # Check if follower and followee exist
    follower_ref = db.collection("users").document(follower_id).get()
    followee_ref = db.collection("users").document(followee_id).get()
    
    if not follower_ref.exists:
        return jsonify({"error": "Follower user not found"}), 404
    
    if not followee_ref.exists:
        return jsonify({"error": "Followee user not found"}), 404
    
    # Can't follow yourself
    if follower_id == followee_id:
        return jsonify({"error": "Cannot follow yourself"}), 400

    try:
        # Check if already following
        follow_ref = db.collection("follows") \
            .where("follower_id", "==", follower_id) \
            .where("followee_id", "==", followee_id) \
            .limit(1) \
            .get()

        if len(follow_ref) > 0:
            return jsonify({"message": "Already following"}), 200

        # Create new follow relationship
        db.collection("follows").add({
            "follower_id": follower_id,
            "followee_id": followee_id,
            "followed_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Populate feed with followee's recent ratings
        populate_feed_from_follow(follower_id, followee_id)
        
        return jsonify({"message": f"{follower_id} now follows {followee_id}"}), 200
    except Exception as e:
        logger.error(f"Error following user: {e}")
        return jsonify({"error": str(e)}), 500

def populate_feed_from_follow(follower_id, followee_id):
    """When a user follows someone, add that user's recent ratings to their feed"""
    try:
        # Get recent ratings from the followee
        ratings = db.collection("ratings") \
            .where("user_id", "==", followee_id) \
            .order_by("timestamp", direction=firestore.Query.DESCENDING) \
            .limit(20) \
            .stream()
            
        batch = db.batch()
        for rating in ratings:
            rating_data = rating.to_dict()
            rating_data["rating_id"] = rating.id
            
            feed_ref = db.collection("feeds").document(follower_id).collection("items").document()
            batch.set(feed_ref, rating_data)
            
        batch.commit()
    except Exception as e:
        logger.error(f"Error populating feed from follow: {e}")
        # Don't fail the main request if feed updates fail

@app.route("/unfollow", methods=["POST"])
def unfollow_user():
    try:
        req_data = FollowRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    follower_id = req_data.follower_id
    followee_id = req_data.followee_id

    try:
        follows = db.collection("follows") \
            .where("follower_id", "==", follower_id) \
            .where("followee_id", "==", followee_id) \
            .stream()

        deleted = False
        for doc in follows:
            doc.reference.delete()
            deleted = True

        if deleted:
            # Optional: Remove followee's items from follower's feed
            # This could be expensive if there are many items, so it's often skipped
            # clean_feed_after_unfollow(follower_id, followee_id)
            
            return jsonify({"message": "Unfollowed successfully"}), 200
        else:
            return jsonify({"message": "No follow relationship found"}), 404
    except Exception as e:
        logger.error(f"Error unfollowing user: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/users/<user_id>/following", methods=["GET"])
def get_following(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        follows = db.collection("follows").where("follower_id", "==", user_id).stream()
        following = []
        
        for doc in follows:
            followee_id = doc.to_dict()["followee_id"]
            following.append(followee_id)
            
        return jsonify({"following": following}), 200
    except Exception as e:
        logger.error(f"Error getting following list: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/users/<user_id>/followers", methods=["GET"])
def get_followers(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        followers = db.collection("follows").where("followee_id", "==", user_id).stream()
        follower_list = []
        
        for doc in followers:
            follower_id = doc.to_dict()["follower_id"]
            follower_list.append(follower_id)
            
        return jsonify({"followers": follower_list}), 200
    except Exception as e:
        logger.error(f"Error getting followers list: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/users/<user_id>/feed", methods=["GET"])
def get_feed(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Optional start_after param for pagination
        start_after_str = request.args.get("start_after")
        query = db.collection("feeds").document(user_id).collection("items") \
                  .order_by("timestamp", direction=firestore.Query.DESCENDING) \
                  .limit(50)

        if start_after_str:
            try:
                # Expecting ISO format, e.g., "2024-04-10T15:23:00Z"
                start_after = datetime.fromisoformat(start_after_str.replace("Z", "+00:00"))
                query = query.start_after({"timestamp": start_after})
            except ValueError:
                return jsonify({"error": "Invalid 'start_after' format. Use ISO 8601 (e.g., 2024-04-10T15:23:00Z)"}), 400

        docs = list(query.stream())
        feed = []
        
        # Include user details in feed
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            
            # Get user info if available
            if "user_id" in item:
                user_doc = db.collection("users").document(item["user_id"]).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    item["user_name"] = user_data.get("name", "")
                    item["user_username"] = user_data.get("username", "")
            
            feed.append(item)
            
        return jsonify({"feed": feed}), 200
    
    except Exception as e:
        logger.error(f"Error getting feed: {e}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)
