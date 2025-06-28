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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const location = useLocation();

  const pageDots = generatePageDots(currentPage, totalPages);
  const goPrev = () => {
    setCurrentPage((p) => (p > 1 ? p - 1 : p));
  };

  const goNext = () => {
    setCurrentPage((p) => (p < totalPages ? p + 1 : p));
  };

  const query = new URLSearchParams(location.search).get("query") || "";

  /* Pull search results from backend */
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;

      try {
        const response = await axios.get("http://127.0.0.1:5001/shows/search", {
          params: {
            query,
            page: currentPage, // send page param here
          },
        });
        if (response.data?.results?.length > 0) {
          setSearchedShows(response.data.results);
          setTotalPages(response.data.total_pages);
        } else {
          setSearchedShows([]);
        }
      } catch (error) {
        console.error("Error fetching shows:", error);
        setSearchedShows([]);
      }
    };

    fetchSearchResults();
  }, [query, currentPage]);

  return (
    <div className="content-wrapper">
      {/* Search results grid */}
      {searchedShows.length > 0 && (
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
                    className="search-result-img"
                  />
                  <p>{show.name}</p>
                </div>
              </Link>
            );
          })}
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
          {/* Left arrow */}
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

          {/* Dots with numbers underneath */}
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
            {pageDots.map((page, idx) => {
              if (page === "...") {
                // Ellipsis
                return (
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
                );
              }

              // Dot + number underneath
              const isActive = page === currentPage;

              return (
                <li
                  key={page}
                  style={{ textAlign: "center", cursor: "pointer" }}
                >
                  {/* The dot */}
                  <div
                    onClick={() => setCurrentPage(Number(page))}
                    style={{
                      width: 16,
                      height: 16,
                      margin: "0 auto",
                      borderRadius: "50%",
                      backgroundColor: isActive ? "blue" : "#ccc",
                      transition: "background-color 0.2s",
                    }}
                  />
                  {/* Number underneath */}
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      color: isActive ? "blue" : "#333",
                      fontWeight: isActive ? "bold" : "normal",
                    }}
                  >
                    {page}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Right arrow */}
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
