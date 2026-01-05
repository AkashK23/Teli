import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import ShowsGrid from "../components/ShowsGrid";

export default function Search() {
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<"shows" | "users">("shows");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");

  const url = process.env.REACT_APP_API_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get("query") || "";
  const typeParam = (queryParams.get("type") as "shows" | "users") || "shows";

  /* Sync state with query params */
  useEffect(() => {
    setSearchType(typeParam);
    setSearchInput(query);
    setCurrentPage(1);
  }, [typeParam, query]);

  /* Fetch search results */
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;

      try {
        if (searchType === "shows") {
          const response = await axios.get(
            `${url}/shows/search`,
            {
              params: { query, page: currentPage },
            }
          );

          // Fetch average ratings for filtered shows
          const updatedSearchShows = await Promise.all(
            response.data?.results.map(async (show: any) => {
              try {
                const ratingRes = await axios.get(
                  `${url}/shows/${show.id}/average-rating`
                );
                console.log(show, ratingRes);
                return {
                  ...show,
                  rating: ratingRes.data.average_rating,
                };
              } catch {
                return { ...show, image_url: null };
              }
            })
          );

          setSearchedShows(updatedSearchShows || []);
          setTotalPages(response.data?.total_pages || 1);
        } else {
          const response = await axios.get(
            `${url}/users/search`,
            {
              params: { query, page: currentPage },
            }
          );

          setSearchedUsers(response.data?.results || []);
          setTotalPages(response.data?.total_pages || 1);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
        setSearchedShows([]);
        setSearchedUsers([]);
      }
    };

    fetchSearchResults();
  }, [query, currentPage, searchType]);

  /* Handle search submission */
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedQuery = searchInput.trim();
    if (!trimmedQuery) return;
    navigate(
      `/search?query=${encodeURIComponent(trimmedQuery)}&type=${searchType}`
    );
  };

  return (
    <div className="page-container">
      {/* Search Bar */}
      <form className="search-bar-container" onSubmit={handleSearch}>
        <input
          type="text"
          value={searchInput}
          placeholder="Search shows or users..."
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-bar-input"
        />
      </form>

      {/* Toggle Tabs */}
      <div className="toggle-container">
        <div
          className={`toggle-option ${searchType === "shows" ? "active" : ""}`}
          onClick={() => {
            setSearchType("shows");
            setCurrentPage(1);
          }}
        >
          Shows
        </div>
        <div
          className={`toggle-option ${searchType === "users" ? "active" : ""}`}
          onClick={() => {
            setSearchType("users");
            setCurrentPage(1);
          }}
        >
          Users
        </div>
        <div className={`toggle-slider ${searchType}`} />
      </div>

      {/* Search results message */}
      <div className="search-results-message">
        Showing search results for "<b>{query}</b>"
      </div>

      {/* Results */}
      {searchType === "shows" && searchedShows.length > 0 && (
        <ShowsGrid
          items={searchedShows}
          searchType="shows"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {searchType === "users" && searchedUsers.length > 0 && (
        <ShowsGrid
          items={searchedUsers}
          searchType="users"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
