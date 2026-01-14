import { Link, useMatch, useResolvedPath, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from "./UserContext";
import { GoogleLogin } from "@react-oauth/google";

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
        navigate(`/show/${encodeURIComponent(suggestions[selectedIndex].id)}`);
      } else if (searchInput.trim()) {
        navigate(`/search?query=${encodeURIComponent(searchInput.trim())}&type=${searchType}`);
      }

      setSearchInput("");
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  /* If search suggestion is selected go to show */
  const handleSelect = (name: string, id: string) => {
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google");
      return;
    }

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
    setUserId(null);
    localStorage.removeItem("user_id"); // Use consistent key with UserContext
    navigate("/login");
  };

  // if (loading) {
  //   return null; // Or a spinner
  // }

  return (
    <nav className="nav" style={{ position: "relative" }}>
      <div className="nav-left">
        {/* Links */}
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

      {/* Search Bar */}
      <div className="nav-right">
        <div
          ref={dropdownRef}
          className="nav-search"
          style={{ position: "relative", width: "250px" }}
        >
          <input
            type="text"
            className="search-input"
            placeholder="Search shows, users..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSelectedIndex(-1);
              setIsDropdownVisible(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsDropdownVisible(true)}
          />

          {isDropdownVisible && (
            <div className="search-dropdown visible">
              {/* Toggle Slider */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 6,
                  background: "#f5f5f5",
                  padding: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: "#e0e0e0",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => setSearchType("shows")}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      backgroundColor:
                        searchType === "shows" ? "#007bff" : "transparent",
                      color: searchType === "shows" ? "#fff" : "#000",
                      fontWeight: searchType === "shows" ? "bold" : "normal",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Shows
                  </button>
                  <button
                    onClick={() => setSearchType("users")}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      backgroundColor:
                        searchType === "users" ? "#007bff" : "transparent",
                      color: searchType === "users" ? "#fff" : "#000",
                      fontWeight: searchType === "users" ? "bold" : "normal",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Users
                  </button>
                </div>
              </div>

              {/* Suggestions */}
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  maxHeight: "240px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {suggestions.length > 0
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
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px",
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#f0f0f0" : "#fff",
                            borderBottom: "1px solid #eee",
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
                          <span
                            style={{
                              fontSize: "15px",
                              lineHeight: "1.2",
                              color: "#000",
                              marginLeft: "10px",
                            }}
                          >
                            {s.name}
                          </span>
                        </li>
                      );
                    })
                  : searchInput.trim() && (
                      <li
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          color: "#777",
                          fontSize: "14px",
                        }}
                      >
                        No results found.
                      </li>
                    )}
              </ul>
            </div>
          )}
        </div>
        {/* Auth Button */}
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
