import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import ShowsGrid from "../components/ShowsGrid";

export default function Search() {
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchType, setSearchType] = useState<"shows" | "users">("shows");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const hasRecentSearches = recentSearches.length > 0;

  const shouldShowDropdown =
    isDropdownVisible && (searchInput.trim() !== "" || hasRecentSearches);

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
    setSuggestions([]);
    setCurrentPage(1);
  }, [typeParam, query]);

  /* Find search suggestions */
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const endpoint =
          searchType === "shows"
            ? `${url}/shows/search`
            : `${url}/users/search`;

        const response = await axios.get(endpoint, {
          params: { query: searchInput.trim(), page: 1 },
        });

        setSuggestions(response.data.results?.slice(0, 6) || []);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      }
    };

    const delayDebounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(delayDebounce);
  }, [searchInput, searchType]);

  /* Arrow Key Tracking */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        saveRecentSearch(suggestions[selectedIndex].name);
        navigate(`/show/${encodeURIComponent(suggestions[selectedIndex].id)}`);
      } else if (searchInput.trim()) {
        saveRecentSearch(searchInput.trim());
        navigate(
          `/search?query=${encodeURIComponent(
            searchInput.trim(),
          )}&type=${searchType}`,
        );
      }

      searchInputRef.current?.blur();

      setSearchInput("");
      setSuggestions([]);
      setSelectedIndex(-1);
      setIsDropdownVisible(false);
    }
  };

  /* If search suggestion is selected go to show */
  const handleSelect = (name: string, id: string) => {
    saveRecentSearch(name);
    setSearchInput("");
    setSuggestions([]);
    setSelectedIndex(-1);
    if (searchType === "shows") {
      navigate(`/show/${encodeURIComponent(id)}`);
    } else {
      navigate(`/profile/${encodeURIComponent(id)}`);
    }
  };

  /* Handle dropown disappearance */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  /* Fetch search results */
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;

      setIsLoading(true);
      setError(null);

      try {
        if (searchType === "shows") {
          const response = await axios.get(`${url}/shows/search`, {
            params: { query, page: currentPage },
          });

          // Fetch average ratings for filtered shows
          const updatedSearchShows = await Promise.all(
            response.data?.results.map(async (show: any) => {
              try {
                const ratingRes = await axios.get(
                  `${url}/shows/${show.id}/average-rating`,
                );
                return {
                  ...show,
                  rating: ratingRes.data.average_rating,
                };
              } catch {
                return { ...show, image_url: null };
              }
            }),
          );

          setSearchedShows(updatedSearchShows || []);
          setTotalPages(response.data?.total_pages || 1);
        } else {
          const response = await axios.get(`${url}/users/search`, {
            params: { query, page: currentPage },
          });

          setSearchedUsers(response.data?.results || []);
          setTotalPages(response.data?.total_pages || 1);
        }
      } catch (err) {
        console.error("Error fetching search results:", err);
        setError("Something went wrong. Please try again.");
        setSearchedShows([]);
        setSearchedUsers([]);
      } finally {
        setIsLoading(false);
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
      `/search?query=${encodeURIComponent(trimmedQuery)}&type=${searchType}`,
    );
  };

  const RECENT_SEARCHES_KEY = "recentSearches";

  const getRecentSearches = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;

    const existing = getRecentSearches();
    const updated = [query, ...existing.filter((q) => q !== query)].slice(0, 5); // keep last 5

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  return (
    <div className="page-container">
      {/* Toggle Tabs */}
      <div className="toggle-container">
        <div
          className={`toggle-option ${searchType === "shows" ? "active" : ""}`}
          onClick={() => {
            setSearchType("shows");
            setCurrentPage(1);
            if (query)
              navigate(`/search?query=${encodeURIComponent(query)}&type=shows`);
          }}
        >
          Shows
        </div>
        <div
          className={`toggle-option ${searchType === "users" ? "active" : ""}`}
          onClick={() => {
            setSearchType("users");
            setCurrentPage(1);
            if (query)
              navigate(`/search?query=${encodeURIComponent(query)}&type=users`);
          }}
        >
          Users
        </div>
        <div className={`toggle-slider ${searchType}`} />
      </div>

      {/* Search Bar */}
      <form className="search-bar-container" onSubmit={handleSearch}>
        <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            value={searchInput}
            placeholder="Search shows or users..."
            ref={searchInputRef}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSelectedIndex(-1);
              setIsDropdownVisible(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setRecentSearches(getRecentSearches());
              setIsDropdownVisible(true);
            }}
            className="search-bar-input"
          />
          {shouldShowDropdown && (
            <div className="search-dropdown visible">
              <div className="search-dropdown-toggle-container">
                {recentSearches.length > 0 && (
                  <button
                    className="search-clear-btn"
                    onMouseDown={() => {
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                      setRecentSearches([]);
                      setIsDropdownVisible(false);
                    }}
                  >
                    Clear Recent Searches
                  </button>
                )}
              </div>

              <ul className="search-dropdown-list-container">
                {searchInput.trim() === "" && recentSearches.length > 0
                  ? recentSearches.map((query) => (
                      <li
                        key={query}
                        className="search-option"
                        onMouseDown={() => {
                          setSearchInput(query);
                          saveRecentSearch(query);
                          navigate(
                            `/search?query=${encodeURIComponent(
                              query,
                            )}&type=${searchType}`,
                          );
                        }}
                      >
                        <span className="search-option-show-name">
                          🔍 {query}
                        </span>
                      </li>
                    ))
                  : suggestions.length > 0
                    ? suggestions.map((s, index) => {
                        const isSelected = index === selectedIndex;

                        const img =
                          searchType === "shows"
                            ? s.poster_path?.startsWith("http")
                              ? s.poster_path
                              : `https://image.tmdb.org/t/p/w92${s.poster_path}`
                            : s.picture
                              ? s.picture.slice(0, -4) + "1080"
                              : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg";

                        return (
                          <li
                            key={s.id}
                            onMouseDown={() => handleSelect(s.name, s.id)}
                            className="search-option"
                            style={{
                              backgroundColor: isSelected ? "#f0f0f0" : "#fff",
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                          >
                            <img
                              src={img}
                              alt={s.name}
                              className={
                                searchType === "shows"
                                  ? "search-suggestions-show"
                                  : "search-suggestions-user"
                              }
                            />

                            <span className="search-option-show-name">
                              {s.name}
                            </span>
                          </li>
                        );
                      })
                    : searchInput.trim() && (
                        <li className="search-no-results">No results found.</li>
                      )}
              </ul>
            </div>
          )}
        </div>
      </form>

      {/* Search results message */}
      {query && (
        <div className="search-results-message">
          Showing search results for "<b>{query}</b>"
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div
          className="loading-container"
          style={{ minHeight: "auto", padding: "3rem 0" }}
        >
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="empty-state-card">
          <p>{error}</p>
          <button
            onClick={() => handleSearch()}
            className="empty-state-cta"
            style={{ border: "none", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      ) : !query ? (
        <div className="empty-state-card">
          <SearchIcon className="empty-state-icon" />
          <p>Search for shows or users above</p>
        </div>
      ) : searchType === "shows" && searchedShows.length > 0 ? (
        <ShowsGrid
          items={searchedShows}
          searchType="shows"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : searchType === "users" && searchedUsers.length > 0 ? (
        <ShowsGrid
          items={searchedUsers}
          searchType="users"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : query ? (
        <div className="empty-state-card">
          <SearchIcon className="empty-state-icon" />
          <p>
            No {searchType} found for "{query}"
          </p>
        </div>
      ) : null}
    </div>
  );
}
