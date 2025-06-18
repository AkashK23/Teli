from flask import Blueprint, request, jsonify
import requests
import logging
import os

logger = logging.getLogger(__name__)

tmdb = Blueprint("tmdb", __name__)

def get_tmdb_authorization_token():
    try:
        # Get the directory where this file is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        token_path = os.path.join(current_dir, "authorizationToken.txt")
        
        with open(token_path, 'r') as file:
            data = file.read()
        return data
    except FileNotFoundError:
        logger.error("TMDB authorization token file not found")
        return None
    except Exception as e:
        logger.error(f"Error reading TMDB token: {e}")
        return None

TMDB_API_KEY = get_tmdb_authorization_token()
TMDB_BASE_URL = "https://api.themoviedb.org/3"

def get_tmdb_headers():
    headers = {
        "accept": "application/json",
        "Authorization": f"{TMDB_API_KEY}"
    }
    return headers

def handle_tmdb_api_error(error, api_name="TMDB API", default_status=500):
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
    error_response = jsonify({"error": message})
    return error_response, status

@tmdb.route("/shows/search", methods=["GET"])
def search_shows():
    query = request.args.get("query")
    
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400
    
    # Validate page parameter
    try:
        page = request.args.get("page", "1")
        page = int(page)
        if page < 1:
            page = 1
    except ValueError:
        return jsonify({"error": "Page parameter must be a positive integer"}), 400
    
    headers = get_tmdb_headers()
    url = f"{TMDB_BASE_URL}/search/tv?query={query}&include_adult=false&page={page}"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
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
        response_json = jsonify(result)
        return response_json, 200
    except Exception as e:
        return handle_tmdb_api_error(e)

def extract_wanted_fields(response_json, wanted_fields):
    results = response_json.get("results")
    filtered_data = []
    for result in results:
        filtered_item = {field: result.get(field, "") for field in wanted_fields}
        filtered_data.append(filtered_item)
    return filtered_data
    
@tmdb.route("/shows/filter", methods=["GET"])
def filter_shows():
    if not TMDB_API_KEY:
        return jsonify({"error": "TMDB API key not available"}), 503

    # Validate page parameter
    try:
        page = request.args.get("page", "1")
        page = int(page)
        if page < 1:
            page = 1
    except ValueError:
        return jsonify({"error": "Page parameter must be a positive integer"}), 400

    # Optional filters
    params = {
        "air_date.gte": request.args.get("air_date.gte"),
        "air_date.lte": request.args.get("air_date.lte"),
        "first_air_date_year": request.args.get("first_air_date_year"),
        "first_air_date.gte": request.args.get("first_air_date.gte"),
        "first_air_date.lte": request.args.get("first_air_date.lte"),
        "include_adult": request.args.get("include_adult", False),
        "include_null_first_air_dates": request.args.get("include_null_first_air_dates", False),
        "language": request.args.get("language", "en-US"),
        "page": page,
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

    # Validate date parameters
    date_params = ["air_date.gte", "air_date.lte", "first_air_date.gte", "first_air_date.lte"]
    for param in date_params:
        if param in params and params[param]:
            # Simple date format validation (YYYY-MM-DD)
            date_value = params[param]
            if not (len(date_value) == 10 and date_value[4] == '-' and date_value[7] == '-'):
                return jsonify({"error": f"Invalid date format for {param}. Use YYYY-MM-DD"}), 400

    # Validate numeric parameters
    numeric_params = ["vote_average.gte", "vote_average.lte", "vote_count.gte", "vote_count.lte", 
                     "with_runtime.gte", "with_runtime.lte", "first_air_date_year"]
    for param in numeric_params:
        if param in params and params[param]:
            try:
                float(params[param])
            except ValueError:
                return jsonify({"error": f"Parameter {param} must be a number"}), 400

    clean_params = {k: v for k, v in params.items() if v is not None}

    headers = get_tmdb_headers()

    try:
        url = f"{TMDB_BASE_URL}/discover/tv"
        response = requests.get(url, headers=headers, params=clean_params)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
            
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
        return handle_tmdb_api_error(e)
    
def fetch_tmdb_data(endpoint: str, name_filter: str = None, filter_key: str = "name", data_key: str = None):
    if not TMDB_API_KEY:
        return jsonify({"error": "TMDB API key not available"}), 503
        
    headers = get_tmdb_headers()
    url = f"{TMDB_BASE_URL}{endpoint}"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()

        if data_key:
            data = response.json().get(data_key, [])
        else:
            data = response.json()

        if name_filter:
            data = [
                item for item in data
                if name_filter.lower() in item.get(filter_key, "").lower()
            ]
        return jsonify({"data": data}), 200
    except Exception as e:
        return handle_tmdb_api_error(e)
    
@tmdb.route("/shows/content-ratings/<series_id>", methods=["GET"])
def get_content_ratings(series_id):
    url = f"{TMDB_BASE_URL}/tv/{series_id}/content_ratings"
    headers = get_tmdb_headers()
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()

        data = response.json()
        return jsonify(data), 200
    except Exception as e:
        return handle_tmdb_api_error(e)

@tmdb.route("/shows/<series_id>", methods=["GET"])
def get_show_details(series_id):
    url = f"{TMDB_BASE_URL}/tv/{series_id}"
    headers = get_tmdb_headers()
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()
        result = response.json()
        wanted_fields = [
            "backdrop_path",
            "created_by",
            "episode_run_time",
            "first_air_date",
            "genres", 
            "id",
            "in_production", 
            "languages", 
            "last_air_date", 
            "last_episode_to_air", 
            "name",
            "next_episode_to_air",
            "networks", 
            "number_of_episodes", 
            "number_of_seasons", 
            "origin_country", 
            "original_language",
            "original_name",
            "overview", 
            "poster_path", 
            "production_companies", 
            "production_countries", 
            "seasons",
            "spoken_languages",
            "status", 
            "tagline", 
            "type"]
        
        filtered_item = {field: result.get(field, "") for field in wanted_fields}
        return jsonify(filtered_item), 200
    except Exception as e:
        return handle_tmdb_api_error(e)

@tmdb.route("/genres", methods=["GET"])
def get_genres():
    response = fetch_tmdb_data(endpoint="/genre/tv/list?language=en", name_filter=request.args.get("name"), data_key="genres")
    return response

@tmdb.route("/languages", methods=["GET"])
def get_languages():
    response = fetch_tmdb_data("/configuration/languages", request.args.get("name"))
    return response

@tmdb.route("/countries", methods=["GET"])
def get_countries():
    response = fetch_tmdb_data("/configuration/countries", request.args.get("name"))
    return response

@tmdb.route("/shows/<series_id>/season/<season_number>", methods=["GET"])
def get_season_details(series_id, season_number):
    """Get detailed information for a specific season of a TV show."""
    url = f"{TMDB_BASE_URL}/tv/{series_id}/season/{season_number}"
    headers = get_tmdb_headers()
    
    try:
        # Validate season_number is an integer
        try:
            int(season_number)
        except ValueError:
            return jsonify({"error": "Season number must be an integer"}), 400
            
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()
        result = response.json()
        
        return jsonify(result), 200
    except Exception as e:
        return handle_tmdb_api_error(e)

@tmdb.route("/shows/<series_id>/season/<season_number>/episode/<episode_number>", methods=["GET"])
def get_episode_details(series_id, season_number, episode_number):
    """Get detailed information for a specific episode of a TV show."""
    url = f"{TMDB_BASE_URL}/tv/{series_id}/season/{season_number}/episode/{episode_number}"
    headers = get_tmdb_headers()
    
    try:
        # Validate season_number and episode_number are integers
        try:
            int(season_number)
            int(episode_number)
        except ValueError:
            return jsonify({"error": "Season number and episode number must be integers"}), 400
            
        response = requests.get(url, headers=headers)
        if response.status_code == 401:
            logger.error("TMDB authentication failed")
            return jsonify({"error": "TMDB API authentication failed"}), 503
        elif response.status_code != 200:
            logger.error(f"TMDB API error: {response.status_code}")
            return jsonify({"error": f"TMDB API returned status {response.status_code}"}), 500
            
        response.raise_for_status()
        result = response.json()
        
        return jsonify(result), 200
    except Exception as e:
        return handle_tmdb_api_error(e)
