import { Link, useMatch, useResolvedPath, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Navbar() {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await axios.get("http://127.0.0.1:5001/shows/search", {
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
  }, [searchInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        navigate(`/show/${encodeURIComponent(suggestions[selectedIndex].id)}`);
      } else if (searchInput.trim()) {
        navigate(`/search?query=${encodeURIComponent(searchInput.trim())}`);
      }

      // 🔹 Clear search bar and suggestions
      setSearchInput("");
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };


  const handleSelect = (name: string, id: string) => {
    setSearchInput("");
    navigate(`/show/${encodeURIComponent(id)}`);
    setSuggestions([]);
    setSelectedIndex(-1);
  };



  return (
    <nav className="nav" style={{ position: "relative" }}>
      <Link to="/" className="site-title">Teli</Link>
      <ul className="nav-links">
        <CustomLink to="/browse">Browse</CustomLink>
        <CustomLink to="/activity">Activity</CustomLink>
        <CustomLink to="/profile">Profile</CustomLink>
      </ul>

      <div className="nav-search" style={{ position: "relative", width: "250px" }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search titles..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        />

        {suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              background: "#fff",
              border: "1px solid #ccc",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              zIndex: 1000,
              listStyle: "none",
              margin: 0,
              padding: 0,
              maxHeight: "260px",
              overflowY: "auto",
              display: "block", // make sure it's block (or remove if it's default)
            }}
          >

            {suggestions.map((s, index) => {
              // console.log(s.name)
              const isSelected = index === selectedIndex;
              const img = s.poster_path?.startsWith("http")
                ? s.poster_path
                : `https://image.tmdb.org/t/p/w92${s.poster_path}`;

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
                    style={{
                      width: 40,
                      height: 60,
                      objectFit: "cover",
                      borderRadius: 4,
                      marginRight: 12,
                    }}
                  />
                  <span style={{ fontSize: "15px", lineHeight: "1.2", color: "#000" }}>{s.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}

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
