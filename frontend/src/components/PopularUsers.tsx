import { useState } from "react";
import { Link } from "react-router-dom";
import { usePopularUsers } from "../hooks/useUser";

type PopularUser = {
  id: string | number;
  name?: string;
  picture?: string;
};

function UserAvatar({ user }: { user: PopularUser }) {
  const [failed, setFailed] = useState(false);
  const name = user.name || "User";

  return (
    <Link
      to={`/profile/${encodeURIComponent(user.id)}`}
      className="pu-item"
      title={name}
    >
      {user.picture && !failed ? (
        <img
          src={user.picture}
          alt={name}
          className="pu-avatar"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="pu-avatar pu-avatar-fallback">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="pu-name">{name}</span>
    </Link>
  );
}

export default function PopularUsers() {
  const { data, isLoading, isError, error } = usePopularUsers();
  console.log("2. hook result:", { data, isLoading, isError, error });
  const users: PopularUser[] = Array.isArray(data?.popular_users)
    ? data.popular_users
    : [];
  

  // Hide the section entirely if there's nothing to show
  if (!isLoading && users.length === 0) return null;

  return (
    <div className="home-sections-row">
      <div className="home-section home-section-full login-left">
        <h1 className="headings">Popular Users</h1>
        <div className="pu-row">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pu-item">
                  <span className="pu-avatar pu-skeleton" />
                </div>
              ))
            : users.map((u) => <UserAvatar key={u.id} user={u} />)}
        </div>
      </div>
    </div>
  );
}
