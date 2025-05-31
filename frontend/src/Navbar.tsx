import { Link, useMatch, useResolvedPath, useNavigate } from "react-router-dom"
import { useState } from "react"

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <nav className="nav">
      <Link to="/" className="site-title">Teli</Link>
      <ul className="nav-links">
        <CustomLink to="/browse">Browse</CustomLink>
        <CustomLink to="/activity">Activity</CustomLink>
        <CustomLink to="/profile">Profile</CustomLink>
      </ul>

      <div className="nav-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search titles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearch}
        />
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
