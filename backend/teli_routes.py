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

@teli.route("/users/<user_id>/ratings", methods=["GET"])
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
                        filter=FieldFilter("season_number", "==", season_num))
                        
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
            
            feed_ref = db.collection("feeds").document(follower_id).collection("items").document()
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
    status: str = Field(..., pattern="^(currently_watching|want_to_watch)$")
    current_season: Optional[int] = None
    current_episode: Optional[int] = None
    notes: Optional[str] = None

class DeleteWatchStatusRequest(BaseModel):
    user_id: str
    show_id: str

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
                    response = client.get(f"/shows/{show_id}")
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
