import { useParams, Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useUser } from "../UserContext";
import { useFollowerProfiles, useUserFollowing } from "../hooks/useUser";
import { useFollowUser, useUnfollowUser } from "../hooks/useMutations";

export default function Followers() {
  const { userId } = useParams<{ userId: string }>();
  const loggedInUserId = useUser().userId;

  const { data: followers = [], isLoading } = useFollowerProfiles(userId);
  const { data: loggedInFollowing = [] } = useUserFollowing(loggedInUserId);

  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  const handleFollowToggle = (followeeId: string, alreadyFollowing: boolean) => {
    if (!loggedInUserId) return;
    if (alreadyFollowing) {
      unfollowUserMutation.mutate({ followerId: loggedInUserId, followeeId });
    } else {
      followUserMutation.mutate({ followerId: loggedInUserId, followeeId });
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="following-page">
      <h2 className="following-title">Followers</h2>
      <div className="following-container">
        {(followers as any[]).length === 0 ? (
          <div className="empty-state-card">
            <Users className="empty-state-icon" />
            <p>No followers yet</p>
            <Link to="/search?type=users" className="empty-state-cta">Find People</Link>
          </div>
        ) : (
        <ul className="following-list">
          {(followers as any[]).map((user) => {
            const isFollowingBack = (loggedInFollowing as string[]).some(
              (uid) => uid === user.id
            );
            const isSelf = loggedInUserId === user.id;

            return (
              <li key={user.id} className="following-item">
                <div className="following-item-row">
                  <Link to={`/profile/${user.id}`}>
                    <img
                      src={
                        user?.picture
                          ? user.picture.slice(0, -4) + "1080"
                          : "/avatar.jpg"
                      }
                      alt={user.name}
                      className="following-avatar"
                    />
                    <span className="following-name">{user.name}</span>
                  </Link>
                  {loggedInUserId && !isSelf && (
                    <button
                      className={`follow-back-btn ${isFollowingBack ? "already-following" : ""}`}
                      onClick={() => handleFollowToggle(user.id, isFollowingBack)}
                    >
                      {isFollowingBack ? "Following" : "Follow Back"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}
