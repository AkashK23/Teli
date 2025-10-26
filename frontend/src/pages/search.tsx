import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import ShowsGrid from "../components/ShowsGrid";

/* Search Page */
export default function Search() {
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<"shows" | "users">("shows"); // <-- toggle state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get("query") || "";
  const typeParam = (queryParams.get("type") as "shows" | "users") || "shows";

  /* Sync state with query params */
  useEffect(() => {
    setSearchType(typeParam);
    setCurrentPage(1);
    console.log(typeParam)
  }, [typeParam]);
  

  /* Pull search results from backend */
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;

      try {
        if (searchType === "shows") {
          const response = await axios.get("http://127.0.0.1:5001/shows/search", {
            params: { query, page: currentPage },
          });

          if (response.data?.results?.length > 0) {
            setSearchedShows(response.data.results);
            setTotalPages(response.data.total_pages);
          } else {
            setSearchedShows([]);
          }
        } else if (searchType === "users") {
          const response = await axios.get("http://127.0.0.1:5001/users/search", {
            params: { query, page: currentPage },
          });

          if (response.data?.results?.length > 0) {
            setSearchedUsers(response.data.results);
            setTotalPages(response.data.total_pages);
          } else {
            setSearchedUsers([]);
          }
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
        if (searchType === "shows") setSearchedShows([]);
        else setSearchedUsers([]);
      }
    };

    fetchSearchResults();
  }, [query, currentPage, searchType]);

  return (
    <div className="content-wrapper">
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

      <div className="search-results-message">
        Showing search results for "<b>{query}</b>"
      </div>

      {/* Search results grid */}
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
