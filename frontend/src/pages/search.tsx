import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";

/* Page Tracker Function */
const generatePageDots = (currentPage: number, totalPages: number): (number | string)[] => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (currentPage > 4) pages.push("...");

  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 3) pages.push("...");

  pages.push(totalPages);

  return pages;
};

/* Search Page */
export default function Search() {
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<"shows" | "users">("shows"); // <-- toggle state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const location = useLocation();

  const pageDots = generatePageDots(currentPage, totalPages);
  const goPrev = () => setCurrentPage((p) => (p > 1 ? p - 1 : p));
  const goNext = () => setCurrentPage((p) => (p < totalPages ? p + 1 : p));

  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get("query") || "";
  const typeParam = (queryParams.get("type") as "shows" | "users") || "shows";

  /* Sync state with query params */
  useEffect(() => {
    setSearchType(typeParam);
    setCurrentPage(1);
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
        <div className="search-results-grid">
          {searchedShows.map((show) => {
            const imageUrl = show.poster_path?.startsWith("http")
              ? show.poster_path
              : `https://image.tmdb.org/t/p/w500${show.poster_path}`;

            return (
              <Link
                to={`/show/${encodeURIComponent(show.id)}`}
                key={show.id || show.name}
                className="search-result-link"
              >
                <div className="search-result">
                  <img
                    src={imageUrl}
                    alt={show.name}
                    className="search-result-img-show"
                  />
                  <p>{show.name}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {searchType === "users" && searchedUsers.length > 0 && (
        <div className="search-results-grid">
          {searchedUsers.map((user) => (
            <Link
              to={`/profile/${encodeURIComponent(user.id)}`}
              key={user.id || user.name}
              className="search-result-link"
            >
              <div className="search-result">
                <img
                  src={
                    user.picture
                      ? user.picture.slice(0, -4) + "1080"
                      : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
                  }
                  alt={user.name}
                  className="search-result-img-user"
                />
                <p>{user.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Page Ticker */}
      <div style={{ width: "320px", margin: "40px auto", userSelect: "none" }}>
        <nav
          aria-label="Pagination"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={goPrev}
            disabled={currentPage === 1}
            aria-label="Previous page"
            style={{
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "24px",
              border: "none",
              background: "none",
              marginRight: 12,
              userSelect: "none",
            }}
          >
            ◀
          </button>

          <ul
            style={{
              display: "flex",
              gap: 24,
              listStyle: "none",
              padding: 0,
              margin: 0,
              justifyContent: "center",
            }}
          >
            {pageDots.map((page, idx) =>
              page === "..." ? (
                <li
                  key={`ellipsis-${idx}`}
                  style={{
                    width: 24,
                    textAlign: "center",
                    userSelect: "none",
                    fontSize: 18,
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                >
                  &hellip;
                </li>
              ) : (
                <li
                  key={page}
                  style={{ textAlign: "center", cursor: "pointer" }}
                >
                  <div
                    onClick={() => setCurrentPage(Number(page))}
                    style={{
                      width: 16,
                      height: 16,
                      margin: "0 auto",
                      borderRadius: "50%",
                      backgroundColor: page === currentPage ? "blue" : "#ccc",
                      transition: "background-color 0.2s",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      color: page === currentPage ? "blue" : "#333",
                      fontWeight: page === currentPage ? "bold" : "normal",
                    }}
                  >
                    {page}
                  </div>
                </li>
              )
            )}
          </ul>

          <button
            onClick={goNext}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            style={{
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "24px",
              border: "none",
              background: "none",
              marginLeft: 12,
              userSelect: "none",
            }}
          >
            ▶
          </button>
        </nav>
      </div>
    </div>
  );
}
