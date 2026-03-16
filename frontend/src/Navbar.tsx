import { Link, useMatch, useResolvedPath, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from "./UserContext";
import { GoogleLogin } from "@react-oauth/google";
import { FiSearch } from "react-icons/fi";

/* Navigation Bar */
export default function Navbar() {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchType, setSearchType] = useState<"shows" | "users">("shows");
  const navigate = useNavigate();
  const url = process.env.REACT_APP_API_URL;
  const { userId, setUserId } = useUser();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hasRecentSearches = recentSearches.length > 0;
  const shouldShowDropdown =
    isDropdownVisible && (searchInput.trim() !== "" || hasRecentSearches);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);




  const location = useLocation();

  /* Clear search when going to a new page */
  useEffect(() => {
    setSearchInput("");
    setSuggestions([]);
    setSelectedIndex(-1);
  }, [location.pathname]);

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
            searchInput.trim()
          )}&type=${searchType}`
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
   if(searchType === "shows") {
     navigate(`/show/${encodeURIComponent(id)}`);
    }
    else {
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


  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google");
      return;
    }
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setLoading(true);
    setError(null);

    try {
      // Send the Google token to our backend for verification
      const response = await axios.post(`${url}/auth/google`, {
        token: credentialResponse.credential,
      });
      console.log(response);

      if (response.data.user && response.data.user.id) {
        setUserId(response.data.user.id);

        if (response.data.message == "User created successfully") {
          navigate("/onboarding");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Login failed. Please try again.");
      } else {
        setError("Unable to connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };


  const handleLogout = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setUserId(null);
    localStorage.removeItem("user_id"); // Use consistent key with UserContext
    navigate("/login");
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
  


  // if (loading) {
  //   return null; // Or a spinner
  // }

  return (
    <nav className="nav">
      {/* ================= MOBILE TOP BAR ================= */}
      <div className="nav-mobile-top">
        <Link to="/" className="site-title">
          Teli
        </Link>

        <div className="nav-mobile-icons">
          <button
            className="icon-btn"
            onClick={() => {
              setIsMobileSearchOpen((prev) => !prev);
              setIsMobileMenuOpen(false);
            }}
          >
            <img
              src="/features-search.png"
              alt="Search"
              className="icon-btn-img"
            />
          </button>

          <button
            className="icon-btn"
            onClick={() => {
              setIsMobileMenuOpen((prev) => !prev);
              setIsMobileSearchOpen(false);
            }}
          >
            <img
              src="/hamburger-menu.png"
              alt="Hamburger"
              className="icon-btn-img"
            />
          </button>
        </div>
      </div>

      {/* ================= MOBILE SEARCH ================= */}
      {isMobileSearchOpen && (
        <div className="nav-mobile-search">
          <div ref={dropdownRef} className="nav-search mobile-search">
            <input
              type="text"
              className="search-input"
              placeholder="Search shows, users..."
              value={searchInput}
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
            />

            {shouldShowDropdown && (
              <div className="search-dropdown visible">
                {/* ---------- YOUR EXISTING DROPDOWN CODE (UNCHANGED) ---------- */}

                {searchInput.trim() === "" ? (
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
                ) : (
                  <div className="search-dropdown-toggle-container">
                    <div className="search-dropdown-toggle">
                      <button
                        onClick={() => setSearchType("shows")}
                        className={`search-dropdown-toggle-button ${
                          searchType === "shows" ? "selected" : ""
                        }`}
                      >
                        Shows
                      </button>

                      <button
                        onClick={() => setSearchType("users")}
                        className={`search-dropdown-toggle-button ${
                          searchType === "users" ? "selected" : ""
                        }`}
                      >
                        Users
                      </button>
                    </div>
                  </div>
                )}

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
                                backgroundColor: isSelected
                                  ? "#f0f0f0"
                                  : "#fff",
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
                          <li className="search-no-results">
                            No results found.
                          </li>
                        )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MOBILE MENU ================= */}
      {isMobileMenuOpen && (
        <ul className="mobile-menu">
          <CustomLink to="/browse">Browse</CustomLink>

          {userId && (
            <>
              <CustomLink to="/activity">Activity</CustomLink>
              <CustomLink to="/profile">Profile</CustomLink>

              <li>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </li>
            </>
          )}

          {!userId && (
            <li className="mobile-google">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="100%"
              />
            </li>
          )}
        </ul>
      )}

      {/* ================= DESKTOP (UNCHANGED) ================= */}
      <div className="nav-desktop">
        <div className="nav-left">
          <Link to="/" className="site-title">
            Teli
          </Link>

          <ul className="nav-links">
            <CustomLink to="/browse">Browse</CustomLink>
            {userId && (
              <>
                <CustomLink to="/activity">Activity</CustomLink>
                <CustomLink to="/profile">Profile</CustomLink>
              </>
            )}
          </ul>
        </div>

        <div className="nav-right">
          {/* ===== EXISTING DESKTOP SEARCH ===== */}
          <div ref={dropdownRef} className="nav-search">
            <input
              type="text"
              className="search-input"
              placeholder="Search shows, users..."
              value={searchInput}
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
            />
            {shouldShowDropdown && (
              <div className="search-dropdown visible">
                {searchInput.trim() === "" ? (
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
                ) : (
                  <div className="search-dropdown-toggle-container">
                    <div className="search-dropdown-toggle">
                      <button
                        onClick={() => setSearchType("shows")}
                        className={`search-dropdown-toggle-button ${
                          searchType === "shows" ? "selected" : ""
                        }`}
                      >
                        Shows
                      </button>

                      <button
                        onClick={() => setSearchType("users")}
                        className={`search-dropdown-toggle-button ${
                          searchType === "users" ? "selected" : ""
                        }`}
                      >
                        Users
                      </button>
                    </div>
                  </div>
                )}

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
                                backgroundColor: isSelected
                                  ? "#f0f0f0"
                                  : "#fff",
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
                          <li className="search-no-results">
                            No results found.
                          </li>
                        )}
                </ul>
              </div>
            )}
          </div>

          {!userId ? (
            <div className="teli-google-btn">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="200"
              />
            </div>
          ) : (
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

/* Highlights the active link */

interface CustomLinkProps {
  to: string;
  children: React.ReactNode;
}

function CustomLink({ to, children, ...props }: CustomLinkProps) {
  const resolvedPath = useResolvedPath(to);
  const isActive = useMatch({ path: resolvedPath.pathname, end: true });
  return (
    <li className={isActive ? "active" : ""}>
      <Link to={to} {...props}>
        {children}
      </Link>
    </li>
  );
}
