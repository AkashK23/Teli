import { Link, useMatch, useResolvedPath } from "react-router-dom"

export default function Navbar() {
    

    return <nav className="nav">
        <Link to="/" className="site-title">Teli</Link>
        <ul>
            <CustomLink to="/browse">Browse</CustomLink>
            <CustomLink to="/review">Review</CustomLink>
            <CustomLink to="/activity">Activity</CustomLink>
            <CustomLink to="/profile">Profile</CustomLink>        
        </ul>
    </nav>
}

// Define prop types for CustomLink
interface CustomLinkProps {
    to: string;
    children: React.ReactNode;
  }

function CustomLink({ to, children, ...props }: CustomLinkProps) {
    const resolvedPath = useResolvedPath(to)
    const isActive = useMatch({ path: resolvedPath.pathname, end:true })
    return (
        <li className={isActive ? "active" : ""}>
            <Link to={to} {...props}>
                {children}
            </Link>
        </li>
    )
}