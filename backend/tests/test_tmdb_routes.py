import pytest
import json
from datetime import datetime

class TestSearchEndpoint:
    def test_search_shows_basic(self, get_client):
        """Test basic search functionality with a common show name"""
        query = "breaking bad"
        response = get_client.get(f"/shows/search?query={query}")
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify response structure
        assert "results" in data
        assert "total_pages" in data
        assert "total_results" in data
        
        # Verify results contain expected data
        results = data["results"]
        assert len(results) > 0
        
        # Check first result has all required fields
        first_result = results[0]
        required_fields = [
            "backdrop_path", "genre_ids", "id", "name", "origin_country",
            "original_language", "original_name", "overview", "popularity",
            "poster_path", "first_air_date"
        ]
        for field in required_fields:
            assert field in first_result
            
        # Verify search relevance (Breaking Bad should be in top results)
        show_names = [r["name"].lower() for r in results[:5]]
        assert any("breaking bad" in name for name in show_names)
        
    def test_search_shows_pagination(self, get_client):
        """Test pagination works correctly"""
        query = "the"  # Common word that should return many results
        
        # Get first page
        response1 = get_client.get(f"/shows/search?query={query}&page=1")
        assert response1.status_code == 200
        data1 = response1.get_json()
        
        # Get second page
        response2 = get_client.get(f"/shows/search?query={query}&page=2")
        assert response2.status_code == 200
        data2 = response2.get_json()
        
        # Verify pages are different
        assert data1["results"] != data2["results"]
        
        # Verify total pages and results are consistent
        assert data1["total_pages"] == data2["total_pages"]
        assert data1["total_results"] == data2["total_results"]
        
    def test_search_shows_special_characters(self, get_client):
        """Test search with special characters in query"""
        query = "game of thrones!"  # Special character
        response = get_client.get(f"/shows/search?query={query}")
        
        assert response.status_code == 200
        data = response.get_json()
        assert "results" in data
        
    def test_search_shows_no_results(self, get_client):
        """Test search with query that should return no results"""
        query = "xyznonexistentshow123456789"
        response = get_client.get(f"/shows/search?query={query}")
        
        assert response.status_code == 200
        data = response.get_json()
        assert "results" in data
        assert len(data["results"]) == 0
        
    def test_search_shows_missing_query(self, get_client):
        """Test error handling when query parameter is missing"""
        response = get_client.get("/shows/search")
        
        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data
        
    def test_search_with_expected_results(self, get_client):
        """
        Comprehensive test for the search endpoint with validation of expected results.
        This test searches for 'Breaking Bad' and validates the exact response structure and content.
        """
        query = "Breaking Bad"
        response = get_client.get(f"/shows/search?query={query}")
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Validate response structure
        assert "results" in data
        assert "total_pages" in data
        assert "total_results" in data
        
        # There should be results
        assert len(data["results"]) > 0
        
        # Find Breaking Bad in the results
        breaking_bad = next((show for show in data["results"] if show["id"] == 1396), None)
        assert breaking_bad is not None
        
        # Validate all expected fields exist and have correct types
        assert isinstance(breaking_bad["backdrop_path"], str)
        assert isinstance(breaking_bad["genre_ids"], list)
        assert isinstance(breaking_bad["id"], int)
        assert breaking_bad["id"] == 1396
        assert isinstance(breaking_bad["name"], str)
        assert breaking_bad["name"] == "Breaking Bad"
        assert isinstance(breaking_bad["origin_country"], list)
        assert "US" in breaking_bad["origin_country"]
        assert isinstance(breaking_bad["original_language"], str)
        assert breaking_bad["original_language"] == "en"
        assert isinstance(breaking_bad["original_name"], str)
        assert breaking_bad["original_name"] == "Breaking Bad"
        assert isinstance(breaking_bad["overview"], str)
        assert "Walter White" in breaking_bad["overview"]
        assert isinstance(breaking_bad["popularity"], (int, float))
        assert isinstance(breaking_bad["poster_path"], str)
        assert isinstance(breaking_bad["first_air_date"], str)
        assert breaking_bad["first_air_date"] == "2008-01-20"
        
        # Validate genre IDs include Drama (18)
        assert 18 in breaking_bad["genre_ids"]


class TestFilterEndpoint:
    def test_filter_shows_basic(self, get_client):
        """Test basic filter functionality"""
        response = get_client.get("/shows/filter?sort_by=popularity.desc")
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify response structure
        assert "results" in data
        assert "total_pages" in data
        assert "total_results" in data
        
        # Verify results are sorted by popularity
        results = data["results"]
        assert len(results) > 0
        
        # Check sorting is applied (popularity should be in descending order)
        popularities = [r["popularity"] for r in results]
        assert all(popularities[i] >= popularities[i+1] for i in range(len(popularities)-1))
        
    def test_filter_shows_by_year(self, get_client):
        """Test filtering by year range"""
        params = {
            "first_air_date.gte": "2020-01-01",
            "first_air_date.lte": "2020-12-31",
            "sort_by": "popularity.desc"
        }
        response = get_client.get("/shows/filter", query_string=params)
        
        assert response.status_code == 200
        data = response.get_json()
        results = data["results"]
        
        # Verify year filter is applied
        for show in results:
            if show["first_air_date"]:
                assert "2020-01-01" <= show["first_air_date"] <= "2020-12-31"
                
    def test_filter_shows_by_language(self, get_client):
        """Test filtering by original language"""
        params = {
            "with_original_language": "ko",  # Korean shows
            "sort_by": "popularity.desc"
        }
        response = get_client.get("/shows/filter", query_string=params)
        
        assert response.status_code == 200
        data = response.get_json()
        results = data["results"]
        
        # Verify language filter is applied
        for show in results:
            assert show["original_language"] == "ko"
            
    def test_filter_shows_multiple_criteria(self, get_client):
        """Test filtering with multiple criteria"""
        params = {
            "first_air_date.gte": "2018-01-01",
            "with_original_language": "en",
            "sort_by": "popularity.desc",
            "with_runtime.gte": 30,
            "with_runtime.lte": 60
        }
        response = get_client.get("/shows/filter", query_string=params)
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Just verify we get a valid response - we can't check all criteria
        # without additional API calls to get full show details
        assert "results" in data
        assert len(data["results"]) > 0
        
    def test_filter_shows_pagination(self, get_client):
        """Test pagination with filters"""
        params = {
            "with_original_language": "en",
            "sort_by": "popularity.desc",
            "page": 1
        }
        response1 = get_client.get("/shows/filter", query_string=params)
        
        params["page"] = 2
        response2 = get_client.get("/shows/filter", query_string=params)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.get_json()
        data2 = response2.get_json()
        
        # Verify pages are different
        assert data1["results"] != data2["results"]
        
    def test_advanced_sorting_and_filtering(self, get_client):
        """
        Comprehensive test for sorting options combined with multiple filters.
        This test verifies that sorting works correctly with various filter combinations.
        """
        # Step 1: Get shows sorted by popularity (descending)
        popularity_params = {
            "sort_by": "popularity.desc",
            "page": 1
        }
        
        pop_response = get_client.get("/shows/filter", query_string=popularity_params)
        assert pop_response.status_code == 200
        
        pop_data = pop_response.get_json()
        assert "results" in pop_data
        
        # Verify sorting by popularity (descending)
        popularities = [show["popularity"] for show in pop_data["results"]]
        assert all(popularities[i] >= popularities[i+1] for i in range(len(popularities)-1))
        
        # Step 2: Get shows sorted by first air date (descending)
        date_params = {
            "sort_by": "first_air_date.desc",
            "page": 1
        }
        
        date_response = get_client.get("/shows/filter", query_string=date_params)
        assert date_response.status_code == 200
        
        date_data = date_response.get_json()
        
        # Verify sorting by air date (descending)
        # Filter out shows with no air date first
        dated_shows = [s for s in date_data["results"] if s["first_air_date"]]
        if len(dated_shows) > 1:  # Only check if we have at least 2 shows with dates
            air_dates = [show["first_air_date"] for show in dated_shows]
            assert all(air_dates[i] >= air_dates[i+1] for i in range(len(air_dates)-1))
        
        # Step 3: Combine sorting with multiple filters
        combined_params = {
            "sort_by": "popularity.desc",
            "with_original_language": "en",
            "first_air_date.gte": "2020-01-01",
            "with_runtime.gte": 30,
            "page": 1
        }
        
        combined_response = get_client.get("/shows/filter", query_string=combined_params)
        assert combined_response.status_code == 200
        
        combined_data = combined_response.get_json()
        assert "results" in combined_data
        
        # Verify language filter is applied
        for show in combined_data["results"]:
            assert show["original_language"] == "en"
        
        # Verify date filter is applied
        for show in combined_data["results"]:
            if show["first_air_date"]:
                assert show["first_air_date"] >= "2020-01-01"
        
        # Verify sorting is still applied
        if len(combined_data["results"]) > 1:
            popularities = [show["popularity"] for show in combined_data["results"]]
            assert all(popularities[i] >= popularities[i+1] for i in range(len(popularities)-1))


class TestMetadataEndpoints:
    def test_get_genres(self, get_client):
        """Test getting TV show genres"""
        response = get_client.get("/genres")
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert "data" in data
        genres = data["data"]
        assert len(genres) > 0
        
        # Check structure of genre data
        first_genre = genres[0]
        assert "id" in first_genre
        assert "name" in first_genre
        
    def test_get_languages(self, get_client):
        """Test getting available languages"""
        response = get_client.get("/languages")
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert "data" in data
        languages = data["data"]
        assert len(languages) > 0
        
        # Check common languages are present
        language_codes = [lang["iso_639_1"] for lang in languages]
        common_languages = ["en", "es", "fr", "de", "ja", "ko"]
        for code in common_languages:
            assert code in language_codes
            
    def test_get_countries(self, get_client):
        """Test getting available countries"""
        response = get_client.get("/countries")
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert "data" in data
        countries = data["data"]
        assert len(countries) > 0
        
        # Check common countries are present
        country_codes = [country["iso_3166_1"] for country in countries]
        common_countries = ["US", "GB", "CA", "FR", "DE", "JP"]
        for code in common_countries:
            assert code in country_codes


class TestShowDetailsEndpoint:
    def test_get_show_details(self, get_client):
        """Test getting detailed information for a specific show"""
        # Breaking Bad ID
        show_id = 1396
        
        response = get_client.get(f"/shows/{show_id}")
        
        assert response.status_code == 200
        show_data = response.get_json()
        
        # Check essential fields
        assert show_data["id"] == show_id
        assert show_data["name"] == "Breaking Bad"
        assert "overview" in show_data
        assert "genres" in show_data
        assert "seasons" in show_data
        
        # Check detailed fields
        assert "created_by" in show_data
        assert "episode_run_time" in show_data
        assert "first_air_date" in show_data
        assert "last_air_date" in show_data
        assert "number_of_episodes" in show_data
        assert "number_of_seasons" in show_data
        
    def test_show_details_validation(self, get_client):
        """
        Comprehensive test for the show details endpoint with validation of expected results.
        This test gets details for 'Stranger Things' and validates the exact response structure and content.
        """
        # Stranger Things ID
        show_id = 66732
        
        response = get_client.get(f"/shows/{show_id}")
        assert response.status_code == 200
        
        show = response.get_json()
        
        # Validate all expected fields exist and have correct types
        assert isinstance(show["backdrop_path"], str)
        assert isinstance(show["created_by"], list)
        assert isinstance(show["episode_run_time"], list)
        assert isinstance(show["first_air_date"], str)
        assert isinstance(show["genres"], list)
        assert isinstance(show["id"], int)
        assert show["id"] == 66732
        assert isinstance(show["in_production"], bool)
        assert isinstance(show["languages"], list)
        assert isinstance(show["last_air_date"], str)
        assert isinstance(show["name"], str)
        assert show["name"] == "Stranger Things"
        assert isinstance(show["networks"], list)
        assert isinstance(show["number_of_episodes"], int)
        assert isinstance(show["number_of_seasons"], int)
        assert isinstance(show["origin_country"], list)
        assert "US" in show["origin_country"]
        assert isinstance(show["original_language"], str)
        assert show["original_language"] == "en"
        assert isinstance(show["original_name"], str)
        assert show["original_name"] == "Stranger Things"
        assert isinstance(show["overview"], str)
        # The overview text might change over time, so we'll check for common terms instead of specific text
        assert any(term in show["overview"].lower() for term in ["boy", "town", "supernatural", "experiments"])
        assert isinstance(show["poster_path"], str)
        assert isinstance(show["production_companies"], list)
        assert isinstance(show["production_countries"], list)
        assert isinstance(show["seasons"], list)
        assert isinstance(show["spoken_languages"], list)
        assert isinstance(show["status"], str)
        assert isinstance(show["tagline"], str)
        assert isinstance(show["type"], str)
        
        # Validate genres include expected ones (e.g., Drama, Sci-Fi & Fantasy)
        genre_ids = [genre["id"] for genre in show["genres"]]
        assert 18 in genre_ids  # Drama
        assert 10765 in genre_ids  # Sci-Fi & Fantasy
        
        # Validate created_by includes the Duffer Brothers
        creator_names = [creator["name"] for creator in show["created_by"]]
        assert "Matt Duffer" in creator_names
        assert "Ross Duffer" in creator_names
        
        # Validate networks includes Netflix
        network_names = [network["name"] for network in show["networks"]]
        assert "Netflix" in network_names
        
        # Validate seasons information
        assert len(show["seasons"]) >= 4  # At least 4 seasons
        
        # Validate production countries includes United States
        country_codes = [country["iso_3166_1"] for country in show["production_countries"]]
        assert "US" in country_codes


class TestIntegratedFlows:
    def test_genre_based_filtering_flow(self, get_client):
        """
        Comprehensive test that chains genre retrieval with filtering.
        This test demonstrates a complete user flow of finding shows by genre.
        """
        # Step 1: Get all genres
        genre_response = get_client.get("/genres")
        assert genre_response.status_code == 200
        
        genres_data = genre_response.get_json()
        assert "data" in genres_data
        
        # Find the Drama genre (ID 18)
        drama_genre = next((g for g in genres_data["data"] if g["id"] == 18), None)
        assert drama_genre is not None
        assert drama_genre["name"] == "Drama"
        
        # Step 2: Filter shows by the Drama genre
        filter_params = {
            "with_genres": drama_genre["id"],
            "sort_by": "popularity.desc",
            "page": 1
        }
        
        filter_response = get_client.get("/shows/filter", query_string=filter_params)
        assert filter_response.status_code == 200
        
        filter_data = filter_response.get_json()
        assert "results" in filter_data
        assert len(filter_data["results"]) > 0
        
        # Step 3: Verify pagination by getting page 2
        filter_params["page"] = 2
        page2_response = get_client.get("/shows/filter", query_string=filter_params)
        assert page2_response.status_code == 200
        
        page2_data = page2_response.get_json()
        assert page2_data["results"] != filter_data["results"]
        
        # Step 4: Add language filter to narrow results further
        filter_params["with_original_language"] = "en"
        filter_params["page"] = 1
        
        refined_response = get_client.get("/shows/filter", query_string=filter_params)
        assert refined_response.status_code == 200
        
        refined_data = refined_response.get_json()
        assert "results" in refined_data
        
        # Verify all results have English as original language
        for show in refined_data["results"]:
            assert show["original_language"] == "en"
        
        # Step 5: Add year range filter for recent shows
        filter_params["first_air_date.gte"] = "2020-01-01"
        filter_params["first_air_date.lte"] = "2023-12-31"
        
        year_filtered_response = get_client.get("/shows/filter", query_string=filter_params)
        assert year_filtered_response.status_code == 200
        
        year_data = year_filtered_response.get_json()
        
        # Verify date filtering works
        for show in year_data["results"]:
            if show["first_air_date"]:
                assert "2020-01-01" <= show["first_air_date"] <= "2023-12-31"
        
        # Step 6: Get details for the top show from our filtered results
        if year_data["results"]:
            top_show_id = year_data["results"][0]["id"]
            show_response = get_client.get(f"/shows/{top_show_id}")
            assert show_response.status_code == 200
            
            show_details = show_response.get_json()
            assert show_details["id"] == top_show_id
            
            # Verify the show has the Drama genre
            genre_ids = [genre["id"] for genre in show_details["genres"]]
            assert drama_genre["id"] in genre_ids
            
    def test_language_and_country_filtering(self, get_client):
        """
        Comprehensive test that chains language and country metadata with filtering.
        This test demonstrates filtering shows by language and production country.
        """
        # Step 1: Get all languages
        lang_response = get_client.get("/languages")
        assert lang_response.status_code == 200
        
        langs_data = lang_response.get_json()
        assert "data" in langs_data
        
        # Find Korean language (ko)
        korean_lang = next((l for l in langs_data["data"] if l["iso_639_1"] == "ko"), None)
        assert korean_lang is not None
        assert korean_lang["english_name"] == "Korean"
        
        # Step 2: Get all countries
        country_response = get_client.get("/countries")
        assert country_response.status_code == 200
        
        countries_data = country_response.get_json()
        assert "data" in countries_data
        
        # Find South Korea (KR)
        korea = next((c for c in countries_data["data"] if c["iso_3166_1"] == "KR"), None)
        assert korea is not None
        assert korea["english_name"] == "South Korea"
        
        # Step 3: Filter shows by Korean language
        filter_params = {
            "with_original_language": korean_lang["iso_639_1"],
            "sort_by": "popularity.desc",
            "page": 1
        }
        
        lang_filter_response = get_client.get("/shows/filter", query_string=filter_params)
        assert lang_filter_response.status_code == 200
        
        lang_filter_data = lang_filter_response.get_json()
        assert "results" in lang_filter_data
        assert len(lang_filter_data["results"]) > 0
        
        # Verify all results have Korean as original language
        for show in lang_filter_data["results"]:
            assert show["original_language"] == "ko"
        
        # Step 4: Add origin country filter for South Korea
        filter_params["with_origin_country"] = korea["iso_3166_1"]
        
        country_filter_response = get_client.get("/shows/filter", query_string=filter_params)
        assert country_filter_response.status_code == 200
        
        country_filter_data = country_filter_response.get_json()
        assert "results" in country_filter_data
        
        # Verify all results have Korea in origin countries
        for show in country_filter_data["results"]:
            assert "KR" in show["origin_country"]
        
        # Step 5: Get a popular Korean show and verify its details
        if country_filter_data["results"]:
            top_show_id = country_filter_data["results"][0]["id"]
            show_response = get_client.get(f"/shows/{top_show_id}")
            assert show_response.status_code == 200
            
            show_details = show_response.get_json()
            assert show_details["id"] == top_show_id
            assert show_details["original_language"] == "ko"
            assert "KR" in show_details["origin_country"]
