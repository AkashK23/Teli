import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from flask_cors import CORS
from pydantic import BaseModel, EmailStr, Field, ValidationError
from werkzeug.exceptions import BadRequest
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
import requests
import logging
from firebase_db import db


logger = logging.getLogger(__name__)
teli = Blueprint("teli", __name__)

@teli.route("/")
def hello():
    return jsonify({"message": "Hello from Teli!"})

class AddUserRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    bio: Optional[str] = None

class UpdateUserProfileRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    picture: Optional[str] = None

@teli.route("/add_user", methods=["POST"])
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
    
    # Add lowercase fields for case-insensitive search
    user_data["name_lowercase"] = req_data.name.lower()
    user_data["username_lowercase"] = req_data.username.lower()
    
    try:
        user_ref = db.collection("users").add(user_data)
        return jsonify({"message": "User added successfully!", "id": user_ref[1].id})
    except Exception as e:
        logger.error(f"Error adding user: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    
@teli.route("/user/<user_id>", methods=["GET"])
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

@teli.route("/user/<user_id>/profile", methods=["PUT"])
def update_user_profile(user_id):
    try:
        # Validate and parse request
        req_data = UpdateUserProfileRequest.model_validate(request.get_json())
    except ValidationError as e:
        # If validation fails, return 400 with error details
        return jsonify({"errors": e.errors()}), 400

    # Check if user exists
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        return jsonify({"error": "User not found"}), 404

    # Get current user data
    current_user_data = user_doc.to_dict()
    
    # Prepare update data with only provided fields
    update_data = {}
    
    # Check for username conflicts if username is being updated
    if req_data.username is not None and req_data.username != current_user_data.get("username"):
        username_query = db.collection("users").where(
            filter=FieldFilter("username", "==", req_data.username)).limit(1).get()
        if len(username_query) > 0:
            return jsonify({"error": "Username already exists"}), 409
        update_data["username"] = req_data.username
        update_data["username_lowercase"] = req_data.username.lower()

    # Check for email conflicts if email is being updated
    if req_data.email is not None and req_data.email != current_user_data.get("email"):
        email_query = db.collection("users").where(
            filter=FieldFilter("email", "==", req_data.email)).limit(1).get()
        if len(email_query) > 0:
            return jsonify({"error": "Email already exists"}), 409
        update_data["email"] = req_data.email

    # Update name if provided
    if req_data.name is not None:
        update_data["name"] = req_data.name
        update_data["name_lowercase"] = req_data.name.lower()

    # Update bio if provided
    if req_data.bio is not None:
        update_data["bio"] = req_data.bio

    # Update picture if provided
    if req_data.picture is not None:
        update_data["picture"] = req_data.picture

    # Add updated timestamp
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        # Update the user document
        user_doc.reference.update(update_data)
        
        # Get updated user data
        updated_user_doc = db.collection("users").document(user_id).get()
        updated_user_data = updated_user_doc.to_dict()
        
        # Remove sensitive fields
        if "password" in updated_user_data:
            del updated_user_data["password"]
        
        # Add the document ID to the response
        updated_user_data["id"] = user_id
        
        result = {
            "message": "Profile updated successfully",
            "user": updated_user_data
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route('/get_users', methods=['GET'])
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

def get_prefix_range(prefix):
    """Convert 'joh' to range ['joh', 'joi') for Firestore queries"""
    if not prefix:
        return None, None
    
    start = prefix.lower()
    # Increment the last character for the end range
    if start:
        end = start[:-1] + chr(ord(start[-1]) + 1)
        return start, end
    return None, None

@teli.route('/users/search', methods=['GET'])
def search_users():
    try:
        # Get query parameter
        query = request.args.get('query', '').strip()
        
        if not query:
            return jsonify({"error": "Missing 'query' parameter"}), 400
        
        # Get pagination parameters
        try:
            page = int(request.args.get('page', 1))
            if page < 1:
                page = 1
        except ValueError:
            return jsonify({"error": "Page parameter must be a positive integer"}), 400
        
        try:
            limit = int(request.args.get('limit', 20))
            if limit < 1:
                limit = 20
            elif limit > 100:
                limit = 100
        except ValueError:
            return jsonify({"error": "Limit parameter must be a positive integer"}), 400
        
        # Get prefix range for efficient Firestore queries
        start_range, end_range = get_prefix_range(query)
        
        if not start_range or not end_range:
            result = {
                "results": [],
                "total_results": 0,
                "total_pages": 1,
                "current_page": page,
                "limit": limit
            }
            return jsonify(result), 200
        
        # Search by username_lowercase (prefix match)
        username_query = db.collection("users").where(
            filter=FieldFilter("username_lowercase", ">=", start_range)).where(
                filter=FieldFilter("username_lowercase", "<", end_range)).limit(limit * 2)
        
        # Search by name_lowercase (prefix match)
        name_query = db.collection("users").where(
            filter=FieldFilter("name_lowercase", ">=", start_range)).where(
                filter=FieldFilter("name_lowercase", "<", end_range)).limit(limit * 2)
        
        # Execute queries
        username_results = list(username_query.stream())
        name_results = list(name_query.stream())
        
        # Combine and deduplicate results
        all_results = {}
        
        for doc in username_results + name_results:
            user_data = doc.to_dict()
            user_data["id"] = doc.id
            
            # Remove sensitive fields
            if "email" in user_data:
                del user_data["email"]
            if "password" in user_data:
                del user_data["password"]
            if "name_lowercase" in user_data:
                del user_data["name_lowercase"]
            if "username_lowercase" in user_data:
                del user_data["username_lowercase"]
            
            all_results[doc.id] = user_data
        
        # Convert to list and sort by relevance
        matching_users = list(all_results.values())
        query_lower = query.lower()
        
        def sort_key(user):
            username = user.get('username', '').lower()
            name = user.get('name', '').lower()
            
            if username == query_lower:
                return (0, username)  # Exact username match first
            elif username.startswith(query_lower):
                return (1, username)  # Username prefix match
            elif name.startswith(query_lower):
                return (2, name)  # Name prefix match
            else:
                return (3, username)  # Fallback
        
        matching_users.sort(key=sort_key)
        
        # Calculate pagination
        total_results = len(matching_users)
        total_pages = (total_results + limit - 1) // limit if total_results > 0 else 1
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        # Get the page of results
        page_results = matching_users[start_index:end_index]
        
        result = {
            "results": page_results,
            "total_results": total_results,
            "total_pages": total_pages,
            "current_page": page,
            "limit": limit
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error searching users: {e}")
        return jsonify({"error": "Database error occurred"}), 500

class AddToWatchlistRequest(BaseModel):
    user_id: str
    show_id: str

@teli.route("/add_to_watchlist", methods=["POST"])
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

class AddRatingRequest(BaseModel):
    user_id: str
    show_id: str
    show_name_lowercase: str
    rating: int = Field(..., ge=1, le=10)  # Rating between 1-10
    comment: Optional[str] = None

class AddEpisodeRatingRequest(BaseModel):
    user_id: str
    show_id: str
    season_number: int = Field(..., ge=1)  # Season number must be positive
    episode_number: int = Field(..., ge=1)  # Episode number must be positive
    rating: int = Field(..., ge=1, le=10)  # Rating between 1-10
    comment: Optional[str] = None

@teli.route("/ratings", methods=["POST"])
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

@teli.route("/episode_ratings", methods=["POST"])
def add_episode_rating():
    try:
        req_data = AddEpisodeRatingRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    # Check if user exists
    user_ref = db.collection("users").document(req_data.user_id).get()
    if not user_ref.exists:
        return jsonify({"error": "User not found"}), 404
        
    rating_data = req_data.model_dump()
    rating_data["timestamp"] = datetime.now(timezone.utc).isoformat()

    try:
        # Check if a rating from the same user for the same episode already exists
        episode_ratings_ref = db.collection("episode_ratings")
        query = episode_ratings_ref.where(
            filter=FieldFilter("user_id", "==", rating_data["user_id"])).where(
                filter=FieldFilter("show_id", "==", rating_data["show_id"])).where(
                    filter=FieldFilter("season_number", "==", rating_data["season_number"])).where(
                        filter=FieldFilter("episode_number", "==", rating_data["episode_number"])).limit(1)

        existing_ratings = list(query.stream())
        existing_rating = existing_ratings[0] if existing_ratings else None

        if existing_rating:
            # If rating exists, update it
            existing_rating.reference.update(rating_data)
            rating_id = existing_rating.id
        else:
            # If rating does not exist, create a new one
            rating_ref = episode_ratings_ref.add(rating_data)
            rating_id = rating_ref[1].id

        return jsonify({"message": "Rating added successfully!", "id": rating_id})
    
    except Exception as e:
        logger.error(f"Error adding episode rating: {e}")
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
            # Use rating_id as document ID so the same rating can never be
            # written twice into any follower's feed
            feed_ref = db.collection("feeds").document(follower_id).collection("items").document(rating_id)
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

@teli.route("/users/<user_id>/ratings", methods=["GET"])
def get_user_ratings(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Use Firebase query ordering by timestamp (most recent first)
        ratings_ref = db.collection("ratings").where(
            filter=FieldFilter("user_id", "==", user_id)).order_by(
                "timestamp", direction=firestore.Query.DESCENDING)
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

@teli.route("/users/<user_id>/shows/<show_id>/season/<season_number>/ratings", methods=["GET"])
def get_episode_ratings(user_id, show_id, season_number):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Validate season number
        try:
            season_num = int(season_number)
        except ValueError:
            return jsonify({"error": "Season number must be an integer"}), 400
        
        # Check if the request is for a specific episode
        episode_number = request.args.get("episode_number")
        
        if episode_number:
            # Convert to integer
            try:
                episode_number = int(episode_number)
            except ValueError:
                return jsonify({"error": "Episode number must be an integer"}), 400
                
            # Get rating for a specific episode
            query = db.collection("episode_ratings").where(
                filter=FieldFilter("user_id", "==", user_id)).where(
                    filter=FieldFilter("show_id", "==", show_id)).where(
                        filter=FieldFilter("season_number", "==", season_num)).where(
                            filter=FieldFilter("episode_number", "==", episode_number)).limit(1)
                            
            docs = list(query.stream())
            
            if not docs:
                return jsonify({"error": "Episode rating not found"}), 404
                
            rating_data = docs[0].to_dict()
            rating_data["id"] = docs[0].id
            
            return jsonify(rating_data), 200
            
        else:
            # Get all ratings for the season
            query = db.collection("episode_ratings").where(
                filter=FieldFilter("user_id", "==", user_id)).where(
                    filter=FieldFilter("show_id", "==", show_id)).where(
                        filter=FieldFilter("season_number", "==", season_num)).order_by("timestamp", direction=firestore.Query.DESCENDING)
                        
            docs = query.stream()
            
            ratings_list = []
            for doc in docs:
                rating_data = doc.to_dict()
                rating_data["id"] = doc.id
                ratings_list.append(rating_data)
                
            return jsonify(ratings_list), 200
            
    except Exception as e:
        logger.error(f"Error getting episode ratings: {e}")
        return jsonify({"error": str(e)}), 500

@teli.route("/shows/<show_id>/ratings", methods=["GET"])
def get_show_ratings(show_id):
    try:
        ratings_ref = db.collection("ratings").where("show_id", "==", show_id).order_by("timestamp", direction=firestore.Query.DESCENDING)
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

@teli.route("/shows/<show_id>/season/<season_number>/episode/<episode_number>/ratings", methods=["GET"])
def get_all_episode_ratings(show_id, season_number, episode_number):
    try:
        season_num = int(season_number)
        episode_num = int(episode_number)
    except ValueError:
        return jsonify({"error": "Season and episode numbers must be integers"}), 400

    if season_num < 1 or episode_num < 1:
        return jsonify({"error": "Season and episode numbers must be positive integers"}), 400

    try:
        query = db.collection("episode_ratings").where(
            filter=FieldFilter("show_id", "==", show_id)).where(
            filter=FieldFilter("season_number", "==", season_num)).where(
            filter=FieldFilter("episode_number", "==", episode_num))

        docs = query.stream()

        ratings_list = []
        for doc in docs:
            rating_data = doc.to_dict()
            rating_data["id"] = doc.id
            ratings_list.append(rating_data)

        ratings_list.sort(key=lambda r: r.get("timestamp", ""), reverse=True)

        return jsonify(ratings_list), 200
    except Exception as e:
        logger.error(f"Error getting all episode ratings: {e}")
        return jsonify({"error": "Database error occurred"}), 500


@teli.route("/shows/<show_id>/average-rating", methods=["GET"])
def get_show_average_rating(show_id):
    try:
        ratings_ref = db.collection("ratings").where(
            filter=FieldFilter("show_id", "==", show_id))
        docs = list(ratings_ref.stream())

        total_ratings = len(docs)
        
        if total_ratings == 0:
            result = {
                "show_id": show_id,
                "average_rating": None,
                "total_ratings": 0
            }
            return jsonify(result), 200

        # Calculate average rating
        total_rating_sum = 0
        for doc in docs:
            rating_data = doc.to_dict()
            rating_value = rating_data.get("rating", 0)
            total_rating_sum += rating_value

        average_rating = total_rating_sum / total_ratings
        average_rating_rounded = round(average_rating, 2)

        result = {
            "show_id": show_id,
            "average_rating": average_rating_rounded,
            "total_ratings": total_ratings
        }

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting show average rating: {e}")
        return jsonify({"error": "Database error occurred"}), 500


@teli.route("/shows/<show_id>/season/<season_number>/episode/<episode_number>/average-rating", methods=["GET"])
def get_episode_average_rating(show_id, season_number, episode_number):
    try:
        season_num = int(season_number)
        episode_num = int(episode_number)
    except ValueError:
        return jsonify({"error": "Season and episode numbers must be integers"}), 400

    if season_num < 1 or episode_num < 1:
        return jsonify({"error": "Season and episode numbers must be positive integers"}), 400

    try:
        ratings_ref = db.collection("episode_ratings").where(
            filter=FieldFilter("show_id", "==", show_id)).where(
            filter=FieldFilter("season_number", "==", season_num)).where(
            filter=FieldFilter("episode_number", "==", episode_num))
        docs = list(ratings_ref.stream())

        total_ratings = len(docs)

        if total_ratings == 0:
            result = {
                "show_id": show_id,
                "season_number": season_num,
                "episode_number": episode_num,
                "average_rating": None,
                "total_ratings": 0
            }
            return jsonify(result), 200

        total_rating_sum = 0
        for doc in docs:
            rating_data = doc.to_dict()
            rating_value = rating_data.get("rating", 0)
            total_rating_sum += rating_value

        average_rating = total_rating_sum / total_ratings
        average_rating_rounded = round(average_rating, 2)

        result = {
            "show_id": show_id,
            "season_number": season_num,
            "episode_number": episode_num,
            "average_rating": average_rating_rounded,
            "total_ratings": total_ratings
        }

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting episode average rating: {e}")
        return jsonify({"error": "Database error occurred"}), 500


def _get_following_ids(user_id):
    follows = db.collection("follows").where(
        filter=FieldFilter("follower_id", "==", user_id)).stream()
    following_ids = []
    for doc in follows:
        following_ids.append(doc.to_dict()["followee_id"])
    return following_ids


def _parse_pagination_params():
    try:
        page = int(request.args.get("page", 1))
        if page < 1:
            page = 1
        limit = int(request.args.get("limit", 20))
        if limit < 1:
            limit = 20
        elif limit > 100:
            limit = 100
        result = (page, limit, None)
    except (ValueError, TypeError):
        result = (None, None, jsonify({"error": "Invalid parameter format"}))
    return result


def _enrich_with_user_info(items):
    user_cache = {}
    for item in items:
        reviewer_id = item.get("user_id")
        if not reviewer_id:
            continue
        if reviewer_id not in user_cache:
            user_doc = db.collection("users").document(reviewer_id).get()
            if user_doc.exists:
                user_cache[reviewer_id] = user_doc.to_dict()
            else:
                user_cache[reviewer_id] = {}
        user_data = user_cache[reviewer_id]
        item["user_name"] = user_data.get("name", "")
        item["user_username"] = user_data.get("username", "")
        item["user_picture"] = user_data.get("picture", "")
    return items


def _paginate_results(sorted_items, page, limit):
    total_results = len(sorted_items)
    total_pages = (total_results + limit - 1) // limit if total_results > 0 else 1
    start_index = (page - 1) * limit
    end_index = start_index + limit
    page_items = sorted_items[start_index:end_index]
    response = {
        "results": page_items,
        "total_results": total_results,
        "total_pages": total_pages,
        "current_page": page,
        "limit": limit,
    }
    return response


@teli.route("/users/<user_id>/followed-reviews/shows/<show_id>", methods=["GET"])
def get_followed_show_reviews(user_id, show_id):
    try:
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404

        page, limit, error_response = _parse_pagination_params()
        if error_response is not None:
            return error_response, 400

        following_ids = _get_following_ids(user_id)
        if not following_ids:
            empty_response = _paginate_results([], page, limit)
            empty_response["followers_average_rating"] = None
            empty_response["followers_total_ratings"] = 0
            return jsonify(empty_response), 200

        matching_reviews = []
        chunk_size = 30
        for i in range(0, len(following_ids), chunk_size):
            chunk = following_ids[i:i + chunk_size]
            query = db.collection("ratings").where(
                filter=FieldFilter("show_id", "==", show_id)).where(
                    filter=FieldFilter("user_id", "in", chunk))
            for doc in query.stream():
                review = doc.to_dict()
                review["id"] = doc.id
                matching_reviews.append(review)

        followers_total = len(matching_reviews)
        followers_avg = round(sum(r["rating"] for r in matching_reviews) / followers_total, 2) if followers_total > 0 else None

        matching_reviews.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
        response = _paginate_results(matching_reviews, page, limit)
        response["results"] = _enrich_with_user_info(response["results"])
        response["followers_average_rating"] = followers_avg
        response["followers_total_ratings"] = followers_total
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting followed show reviews: {e}")
        return jsonify({"error": "Database error occurred"}), 500


@teli.route(
    "/users/<user_id>/followed-reviews/shows/<show_id>"
    "/season/<int:season_number>/episode/<int:episode_number>",
    methods=["GET"])
def get_followed_episode_reviews(user_id, show_id, season_number, episode_number):
    try:
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404

        page, limit, error_response = _parse_pagination_params()
        if error_response is not None:
            return error_response, 400

        following_ids = _get_following_ids(user_id)
        if not following_ids:
            empty_response = _paginate_results([], page, limit)
            empty_response["followers_average_rating"] = None
            empty_response["followers_total_ratings"] = 0
            return jsonify(empty_response), 200

        matching_reviews = []
        chunk_size = 30
        for i in range(0, len(following_ids), chunk_size):
            chunk = following_ids[i:i + chunk_size]
            query = db.collection("episode_ratings").where(
                filter=FieldFilter("show_id", "==", show_id)).where(
                    filter=FieldFilter("season_number", "==", season_number)).where(
                        filter=FieldFilter("episode_number", "==", episode_number)).where(
                            filter=FieldFilter("user_id", "in", chunk))
            for doc in query.stream():
                review = doc.to_dict()
                review["id"] = doc.id
                matching_reviews.append(review)

        followers_total = len(matching_reviews)
        followers_avg = round(sum(r["rating"] for r in matching_reviews) / followers_total, 2) if followers_total > 0 else None

        matching_reviews.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
        response = _paginate_results(matching_reviews, page, limit)
        response["results"] = _enrich_with_user_info(response["results"])
        response["followers_average_rating"] = followers_avg
        response["followers_total_ratings"] = followers_total
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting followed episode reviews: {e}")
        return jsonify({"error": "Database error occurred"}), 500


class FollowRequest(BaseModel):
    follower_id: str
    followee_id: str

@teli.route("/follow", methods=["POST"])
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

            # Use the rating's own ID as the feed document ID so that
            # re-following the same user never creates duplicate feed items
            feed_ref = db.collection("feeds").document(follower_id).collection("items").document(rating.id)
            batch.set(feed_ref, rating_data)

        batch.commit()
    except Exception as e:
        logger.error(f"Error populating feed from follow: {e}")
        # Don't fail the main request if feed updates fail

@teli.route("/unfollow", methods=["POST"])
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

@teli.route("/users/<user_id>/following", methods=["GET"])
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

@teli.route("/users/<user_id>/followers", methods=["GET"])
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

@teli.route("/users/<user_id>/feed", methods=["GET"])
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
        seen_rating_ids = set()

        # Include user details in feed
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id

            # Deduplicate by rating_id to handle any legacy duplicate docs
            rating_id = item.get("rating_id")
            if rating_id:
                if rating_id in seen_rating_ids:
                    continue
                seen_rating_ids.add(rating_id)

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

@teli.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@teli.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405

@teli.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

# Watch Status Functionality

class UpdateWatchStatusRequest(BaseModel):
    user_id: str
    show_id: str
    status: str = Field(..., pattern="^(currently_watching|want_to_watch|watched)$")
    current_season: Optional[int] = None
    current_episode: Optional[int] = None
    notes: Optional[str] = None

class DeleteWatchStatusRequest(BaseModel):
    user_id: str
    show_id: str

class SearchUserRatedShowsRequest(BaseModel):
    query: str
    page: Optional[int] = Field(default=1, ge=1)
    limit: Optional[int] = Field(default=20, ge=1, le=100)

@teli.route("/update_watch_status", methods=["POST"])
def update_watch_status():
    try:
        # Validate and parse request
        req_data = UpdateWatchStatusRequest.model_validate(request.get_json())
    except ValidationError as e:
        # If validation fails, return 400 with error details
        return jsonify({"errors": e.errors()}), 400

    # Check if user exists
    user_ref = db.collection("users").document(req_data.user_id).get()
    if not user_ref.exists:
        return jsonify({"error": "User not found"}), 404

    # Prepare watch status data
    watch_status_data = req_data.model_dump()
    watch_status_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        # Check if a watch status for this user and show already exists
        status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", req_data.user_id)).where(
                filter=FieldFilter("show_id", "==", req_data.show_id)).limit(1).get()
        
        if len(status_query) > 0:
            # If status exists, update it
            existing_status = status_query[0]
            existing_status.reference.update(watch_status_data)
            status_id = existing_status.id
            return jsonify({"message": "Watch status updated successfully", "id": status_id}), 200
        else:
            # If status does not exist, create a new one
            status_ref = db.collection("watch_status").add(watch_status_data)
            status_id = status_ref[1].id
            return jsonify({"message": "Watch status added successfully", "id": status_id}), 201
    
    except Exception as e:
        logger.error(f"Error updating watch status: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/users/<user_id>/currently_watching", methods=["GET"])
def get_currently_watching(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Query for shows with "currently_watching" status
        status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", user_id)).where(
                filter=FieldFilter("status", "==", "currently_watching")).stream()
        
        # Prepare result list
        result = []
        for doc in status_query:
            status_data = doc.to_dict()
            status_data["id"] = doc.id
            result.append(status_data)
            
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error retrieving currently watching shows: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/users/<user_id>/want_to_watch", methods=["GET"])
def get_want_to_watch(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Query for shows with "want_to_watch" status
        status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", user_id)).where(
                filter=FieldFilter("status", "==", "want_to_watch")).stream()
        
        # Prepare result list
        result = []
        for doc in status_query:
            status_data = doc.to_dict()
            status_data["id"] = doc.id
            result.append(status_data)
            
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error retrieving want to watch shows: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/users/<user_id>/watched", methods=["GET"])
def get_watched(user_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Query for shows with "watched" status
        status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", user_id)).where(
                filter=FieldFilter("status", "==", "watched")).stream()
        
        # Prepare result list
        result = []
        for doc in status_query:
            status_data = doc.to_dict()
            status_data["id"] = doc.id
            result.append(status_data)
            
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error retrieving watched shows: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/users/<user_id>/watch_status/<show_id>", methods=["GET"])
def get_watch_status(user_id, show_id):
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Query for the watch status
        status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", user_id)).where(
                filter=FieldFilter("show_id", "==", show_id)).limit(1).get()
        
        # Check if status exists
        if len(status_query) == 0:
            return jsonify({"error": "No watch status found for this show"}), 404
        
        # Return the status
        status_data = status_query[0].to_dict()
        status_data["id"] = status_query[0].id
        
        return jsonify(status_data), 200
    
    except Exception as e:
        logger.error(f"Error retrieving watch status: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/users/<user_id>/suggested-shows", methods=["GET"])
def get_suggested_shows(user_id):
    try:
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404

        try:
            limit = int(request.args.get("limit", "10"))
            limit = max(1, min(limit, 50))
        except ValueError:
            return jsonify({"error": "Limit must be a valid integer"}), 400

        excluded_show_ids = set()

        user_ratings = db.collection("ratings").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        for doc in user_ratings:
            excluded_show_ids.add(doc.to_dict().get("show_id"))

        user_statuses = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        for doc in user_statuses:
            excluded_show_ids.add(doc.to_dict().get("show_id"))

        suggestions = []
        suggested_show_ids = set()

        following_ids = _get_following_ids(user_id)
        if following_ids:
            show_stats = {}
            chunk_size = 30
            for i in range(0, len(following_ids), chunk_size):
                chunk = following_ids[i:i + chunk_size]
                query = db.collection("ratings").where(
                    filter=FieldFilter("user_id", "in", chunk)).limit(1000)
                for doc in query.stream():
                    data = doc.to_dict()
                    sid = data.get("show_id")
                    if sid and sid not in excluded_show_ids:
                        if sid not in show_stats:
                            show_stats[sid] = {"total": 0, "count": 0}
                        show_stats[sid]["total"] += data.get("rating", 0)
                        show_stats[sid]["count"] += 1

            ranked = sorted(
                show_stats.items(),
                key=lambda x: (x[1]["count"], x[1]["total"] / x[1]["count"]),
                reverse=True)

            for sid, stats in ranked[:limit]:
                avg = round(stats["total"] / stats["count"], 2)
                suggestions.append({
                    "show_id": sid,
                    "source": "followers",
                    "followers_rating_count": stats["count"],
                    "followers_average_rating": avg
                })
                suggested_show_ids.add(sid)

        if len(suggestions) < limit:
            remaining = limit - len(suggestions)
            start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            recent_ratings = db.collection("ratings").where(
                filter=FieldFilter("timestamp", ">=", start_date)).limit(10000)

            popular_counts = {}
            for doc in recent_ratings.stream():
                data = doc.to_dict()
                sid = data.get("show_id")
                if sid and sid not in excluded_show_ids and sid not in suggested_show_ids:
                    popular_counts[sid] = popular_counts.get(sid, 0) + 1

            popular_ranked = sorted(
                popular_counts.items(), key=lambda x: x[1], reverse=True)

            for sid, count in popular_ranked[:remaining]:
                suggestions.append({
                    "show_id": sid,
                    "source": "popular",
                    "rating_count": count
                })

        from flask import current_app
        for suggestion in suggestions:
            try:
                with current_app.test_client() as client:
                    response = client.get(f"/api/shows/{suggestion['show_id']}")
                    if response.status_code == 200:
                        suggestion["show_details"] = response.get_json()
            except Exception as e:
                logger.error(f"Error fetching show details for {suggestion['show_id']}: {e}")

        result = {
            "suggestions": suggestions,
            "total_suggestions": len(suggestions)
        }
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting suggested shows: {e}")
        return jsonify({"error": "Database error occurred"}), 500


@teli.route("/shows/popular", methods=["GET"])
def get_popular_shows():
    try:
        # Get timeframe parameter (default to 7 days if not provided)
        timeframe_days = request.args.get("timeframe", "7")
        
        # Validate timeframe parameter
        try:
            timeframe_days = int(timeframe_days)
            if timeframe_days < 1:
                return jsonify({"error": "Timeframe must be a positive integer"}), 400
        except ValueError:
            return jsonify({"error": "Timeframe must be a valid integer"}), 400
        
        # Get num_most_popular parameter (default to 10 if not provided)
        try:
            num_most_popular = int(request.args.get("num_most_popular", "10"))
            if num_most_popular < 1:
                num_most_popular = 10
            elif num_most_popular > 100:  # Set a reasonable upper limit
                num_most_popular = 100
        except ValueError:
            return jsonify({"error": "num_most_popular parameter must be a valid integer"}), 400
        
        # Calculate the date based on the timeframe
        start_date = datetime.now(timezone.utc) - timedelta(days=timeframe_days)
        start_date_str = start_date.isoformat()
        
        # Query ratings from the specified timeframe with a reasonable limit
        ratings_ref = db.collection("ratings").where(
            filter=FieldFilter("timestamp", ">=", start_date_str)).limit(10000)
        
        # Get ratings from the specified timeframe
        ratings = list(ratings_ref.stream())
        
        # Count ratings per show
        show_rating_counts = {}
        
        for rating in ratings:
            rating_data = rating.to_dict()
            show_id = rating_data.get("show_id")
            
            if show_id:
                if show_id in show_rating_counts:
                    show_rating_counts[show_id] += 1
                else:
                    show_rating_counts[show_id] = 1
        
        # Sort shows by rating count (most popular first)
        sorted_shows = sorted(show_rating_counts.items(), 
                             key=lambda x: x[1], reverse=True)
        
        # Limit to the specified number of most popular shows
        top_shows = sorted_shows[:num_most_popular]
        
        # Prepare result with show details
        result = []
        for show_id, count in top_shows:
            # Use the existing endpoint to get show details
            try:
                # Import necessary modules
                from flask import current_app
                with current_app.test_client() as client:
                    response = client.get(f"/api/shows/{show_id}")
                    if response.status_code == 200:
                        show_details = response.get_json()
                        # Add rating count for the specified timeframe
                        show_details["rating_count"] = count
                        # Add the timeframe to the response
                        show_details["timeframe_days"] = timeframe_days
                        result.append(show_details)
            except Exception as e:
                logger.error(f"Error fetching show details for {show_id}: {e}")
                # Continue with the next show if there's an error
                continue
        
        return jsonify({
            "popular_shows": result,
            "timeframe_days": timeframe_days,
            "total_shows_found": len(sorted_shows),
            "num_most_popular": num_most_popular
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting popular shows: {e}")
        return jsonify({"error": str(e)}), 500

@teli.route("/delete_watch_status", methods=["POST"])
def delete_watch_status():
    try:
        # Validate and parse request
        req_data = DeleteWatchStatusRequest.model_validate(request.get_json())
    except ValidationError as e:
        # If validation fails, return 400 with error details
        return jsonify({"errors": e.errors()}), 400

    # Check if user exists
    user_ref = db.collection("users").document(req_data.user_id).get()
    if not user_ref.exists:
        return jsonify({"error": "User not found"}), 404
    
    try:
        # Query for the watch status
        status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", req_data.user_id)).where(
                filter=FieldFilter("show_id", "==", req_data.show_id)).limit(1).get()
        
        # Check if status exists
        if len(status_query) == 0:
            return jsonify({"error": "No watch status found for this show"}), 404
        
        # Delete the status
        status_query[0].reference.delete()
        
        return jsonify({"message": "Watch status deleted successfully"}), 200
    
    except Exception as e:
        logger.error(f"Error deleting watch status: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/user/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    """
    Delete a user and all associated data.
    This performs a complete removal including:
    - User profile
    - All ratings (show and episode)
    - Watch status records
    - Follow relationships (both directions)
    - Feed entries from all followers
    - Watchlist entries
    """
    try:
        # Check if user exists
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Perform cascading deletion using batch operations
        result = delete_user_and_related_data(user_id)
        
        if result["success"]:
            return jsonify({"message": "User deleted successfully"}), 200
        else:
            logger.error(f"Error deleting user {user_id}: {result['error']}")
            return jsonify({"error": "Database error occurred"}), 500
    
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        return jsonify({"error": "Database error occurred"}), 500

def delete_user_and_related_data(user_id):
    """
    Delete user and all related data using batch operations for atomicity.
    Returns dict with success status and error message if applicable.
    """
    try:
        # Get all followers to clean their feeds later
        followers_query = db.collection("follows").where(
            filter=FieldFilter("followee_id", "==", user_id)).stream()
        follower_ids = [doc.to_dict()["follower_id"] for doc in followers_query]
        
        # Start batch operations
        batches = []
        current_batch = db.batch()
        operation_count = 0
        
        def add_to_batch(operation_func, *args):
            nonlocal current_batch, operation_count, batches
            operation_func(current_batch, *args)
            operation_count += 1
            
            # Firestore batch limit is 500 operations
            if operation_count >= 500:
                batches.append(current_batch)
                current_batch = db.batch()
                operation_count = 0
        
        # 1. Delete user's ratings
        ratings_query = db.collection("ratings").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        for rating_doc in ratings_query:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), rating_doc)
        
        # 2. Delete user's episode ratings
        episode_ratings_query = db.collection("episode_ratings").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        for episode_rating_doc in episode_ratings_query:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), episode_rating_doc)
        
        # 3. Delete user's watch status records
        watch_status_query = db.collection("watch_status").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        for watch_status_doc in watch_status_query:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), watch_status_doc)
        
        # 4. Delete user's watchlist entries
        watchlist_query = db.collection("watchlists").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        for watchlist_doc in watchlist_query:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), watchlist_doc)
        
        # 5. Delete follow relationships where user is follower
        follower_query = db.collection("follows").where(
            filter=FieldFilter("follower_id", "==", user_id)).stream()
        for follow_doc in follower_query:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), follow_doc)
        
        # 6. Delete follow relationships where user is followee
        followee_query = db.collection("follows").where(
            filter=FieldFilter("followee_id", "==", user_id)).stream()
        for follow_doc in followee_query:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), follow_doc)
        
        # 7. Clean feeds - remove deleted user's content from all followers' feeds
        for follower_id in follower_ids:
            feed_items_query = db.collection("feeds").document(follower_id).collection("items").where(
                filter=FieldFilter("user_id", "==", user_id)).stream()
            for feed_item_doc in feed_items_query:
                add_to_batch(lambda batch, doc: batch.delete(doc.reference), feed_item_doc)
        
        # 8. Delete user's own feed
        user_feed_items = db.collection("feeds").document(user_id).collection("items").stream()
        for feed_item_doc in user_feed_items:
            add_to_batch(lambda batch, doc: batch.delete(doc.reference), feed_item_doc)
        
        # 9. Delete the user document itself
        user_doc_ref = db.collection("users").document(user_id)
        add_to_batch(lambda batch, doc_ref: batch.delete(doc_ref), user_doc_ref)
        
        # Add the final batch if it has operations
        if operation_count > 0:
            batches.append(current_batch)
        
        # Commit all batches
        for batch in batches:
            batch.commit()
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error in delete_user_and_related_data: {e}")
        return {"success": False, "error": str(e)}

@teli.route("/users/popular", methods=["GET"])
def get_popular_users():
    """
    Get the most popular users by followers count.
    Users are sorted by follower count (descending), then by username (ascending) for ties.
    """
    try:
        # Get and validate pagination parameters
        try:
            page = int(request.args.get('page', 1))
            if page < 1:
                page = 1
        except (ValueError, TypeError):
            return jsonify({"error": "Page parameter must be a positive integer"}), 400
        
        try:
            limit = int(request.args.get('limit', 10))
            if limit < 1:
                limit = 10
            elif limit > 50:
                limit = 50
        except (ValueError, TypeError):
            return jsonify({"error": "Limit parameter must be a positive integer"}), 400
        
        # Get all follow relationships
        follows_query = db.collection("follows").stream()
        
        # Count followers per user
        follower_counts = {}
        for follow_doc in follows_query:
            follow_data = follow_doc.to_dict()
            followee_id = follow_data.get("followee_id")
            
            if followee_id:
                if followee_id in follower_counts:
                    follower_counts[followee_id] += 1
                else:
                    follower_counts[followee_id] = 1
        
        # Get user details for users who have followers
        users_with_followers = []
        for user_id, follower_count in follower_counts.items():
            try:
                user_doc = db.collection("users").document(user_id).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    
                    # Remove sensitive fields
                    if "password" in user_data:
                        del user_data["password"]
                    if "email" in user_data:
                        del user_data["email"]
                    if "name_lowercase" in user_data:
                        del user_data["name_lowercase"]
                    if "username_lowercase" in user_data:
                        del user_data["username_lowercase"]
                    
                    # Add user ID and follower count
                    user_data["id"] = user_id
                    user_data["follower_count"] = follower_count
                    users_with_followers.append(user_data)
            except Exception as e:
                logger.error(f"Error fetching user {user_id}: {e}")
                # Continue with other users if one fails
                continue
        
        # Sort by follower count (descending), then by username (ascending)
        def sort_key(user):
            follower_count = user.get('follower_count', 0)
            username = user.get('username', '')
            return (-follower_count, username)  # Negative for descending order
        
        users_with_followers.sort(key=sort_key)
        
        # Calculate pagination
        total_users = len(users_with_followers)
        total_pages = (total_users + limit - 1) // limit if total_users > 0 else 1
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        # Get the page of results
        page_results = users_with_followers[start_index:end_index]
        
        result = {
            "popular_users": page_results,
            "total_users": total_users,
            "total_pages": total_pages,
            "current_page": page,
            "limit": limit
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error getting popular users: {e}")
        return jsonify({"error": "Database error occurred"}), 500

@teli.route("/users/<user_id>/rated-shows/search", methods=["GET"])
def search_user_rated_shows(user_id):
    """
    Search for shows that a specific user has rated.
    This searches within the Firebase database using the stored show_name_lowercase field.
    """
    try:
        # Check if user exists
        user_ref = db.collection("users").document(user_id).get()
        if not user_ref.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Get query parameter and validate it's not empty
        query = request.args.get('query', '').strip()
        if not query:
            return jsonify({"errors": [{"loc": ["query"], "msg": "Query parameter is required and cannot be empty", "type": "value_error"}]}), 400
        
        # Get and validate pagination parameters
        try:
            page = int(request.args.get('page', 1))
            if page < 1:
                page = 1
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid parameter format"}), 400
        
        try:
            limit = int(request.args.get('limit', 20))
            if limit < 1:
                limit = 20
            elif limit > 100:
                limit = 100
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid parameter format"}), 400
        
        # Get all ratings for this user first, then filter in memory
        # This avoids the Firestore composite index requirement
        ratings_query = db.collection("ratings").where(
            filter=FieldFilter("user_id", "==", user_id)).stream()
        
        # Process results and filter by query
        matching_shows = []
        query_lower = query.lower()
        
        for rating_doc in ratings_query:
            rating_data = rating_doc.to_dict()
            rating_data["id"] = rating_doc.id
            
            show_name_lowercase = rating_data.get("show_name_lowercase", "")
            
            # Check if query matches (prefix or contains)
            if (query_lower in show_name_lowercase or 
                show_name_lowercase.startswith(query_lower)):
                matching_shows.append(rating_data)
        
        # Sort by relevance (exact matches first, then prefix matches)
        def sort_key(rating):
            show_name = rating.get('show_name_lowercase', '')

            if show_name == query_lower:
                return (0, show_name)  # Exact match first
            elif show_name.startswith(query_lower):
                return (1, show_name)  # Prefix match
            else:
                return (2, show_name)  # Contains match

        matching_shows.sort(key=sort_key)
        
        # Calculate pagination
        total_results = len(matching_shows)
        total_pages = (total_results + limit - 1) // limit if total_results > 0 else 1
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        # Get the page of results
        page_results = matching_shows[start_index:end_index]
        
        result = {
            "results": page_results,
            "total_results": total_results,
            "total_pages": total_pages,
            "current_page": page,
            "limit": limit
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error searching user rated shows: {e}")
        return jsonify({"error": "Database error occurred"}), 500
