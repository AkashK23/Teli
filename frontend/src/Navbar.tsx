import { Link, useMatch, useResolvedPath, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "./UserContext";

/* Navigation Bar */
export default function Navbar() {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchType, setSearchType] = useState<"shows" | "users">("shows");
  const navigate = useNavigate();
  const url = `http://localhost:5001`;
  const { userId, setUserId } = useUser();

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

        {/* <CustomLink to="/activity">Activity</CustomLink>
        <CustomLink to="/profile">Profile</CustomLink> */}
        {userId ? (
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        ) : (
          <CustomLink to="/login">Login</CustomLink>
        )}
      </ul>

      {/* Search Bar */}
      <div
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
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        />

        {/* Suggestions Dropdown */}
        {(suggestions.length > 0 || searchInput.trim()) && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              background: "#fff",
              border: "1px solid #ccc",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              zIndex: 1000,
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
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

            {/* Search Results */}
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
              {suggestions.map((s, index) => {
                const isSelected = index === selectedIndex;
                const img =
                  searchType === "shows" ? s.poster_path?.startsWith("http") ? s.poster_path
                      : `https://image.tmdb.org/t/p/w92${s.poster_path}`
                    : (s.picture
                        ? s.picture.slice(0, -4) + "1080"
                        : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg")

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
                      className={searchType === "shows" ? "search-suggestions-show" : "search-suggestions-user"}
                    />
                    <span
                      style={{
                        fontSize: "15px",
                        lineHeight: "1.2",
                        color: "#000",
                      }}
                    >
                      {s.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
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
