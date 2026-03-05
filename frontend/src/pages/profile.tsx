import { useNavigate, Link, useParams } from "react-router-dom";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import ShowPosterCard from "../components/ShowPosterCard";
import ProfileStats from "../components/ProfileStats";
import { formatRelativeTime } from "../components/formatRelativeTime";
import {
  useUserProfile,
  useUserRatings,
  useUserWatchList,
  useUserFollowers,
  useUserFollowing,
  useWatchedShowDetails,
} from "../hooks/useUser";
import { useFollowUser, useUnfollowUser } from "../hooks/useMutations";

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const loggedInUserId = useUser().userId;
  const navigate = useNavigate();

  const user_id = id || loggedInUserId;

  const { data: userInfo, isLoading: userLoading } = useUserProfile(user_id);
  const { data: w2wList = [] } = useUserWatchList(user_id, "want_to_watch");
  const { data: cwList = [] } = useUserWatchList(user_id, "currently_watching");
  const { data: watchedList = [] } = useUserWatchList(user_id, "watched");
  const { data: followingList = [], isLoading: followingLoading } =
    useUserFollowing(user_id);
  const { data: followersList = [], isLoading: followersLoading } =
    useUserFollowers(user_id);
  const { data: loggedInFollowing = [] } = useUserFollowing(loggedInUserId);
  const { data: ratings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);
  const { data: watchedShows = [], isLoading: watchedShowsLoading } =
    useWatchedShowDetails(user_id);

  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  const loading =
    userLoading || followingLoading || followersLoading || ratingsLoading;

  const showNumber =
    (w2wList as any[]).length +
    (cwList as any[]).length +
    (watchedList as any[]).length;

  const following = (followingList as any[]).length;
  const followers = (followersList as any[]).length;

  const isFollowing =
    loggedInUserId && loggedInUserId !== user_id
      ? (loggedInFollowing as string[]).some((uid) => uid === user_id)
      : false;

  const handleFollowToggle = () => {
    if (!loggedInUserId || !user_id) return;
    if (isFollowing) {
      unfollowUserMutation.mutate({
        followerId: loggedInUserId,
        followeeId: user_id,
      });
    } else {
      followUserMutation.mutate({
        followerId: loggedInUserId,
        followeeId: user_id,
      });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const recentRatings = (ratings as any[]).slice(0, 3);

  return (
    <div className="page-container">
      {/* Profile Header + Bio */}
      <div className="profile-header">
        <div className="profile-pic">
          <img
            src={
              userInfo?.picture
                ? userInfo.picture.slice(0, -4) + "1080"
                : "/avatar.jpg"
            }
            alt={userInfo?.name || "Profile"}
            referrerPolicy="no-referrer"
            className="profile-avatar"
          />
          <div className="profile-main">
            <h4 className="username">
              <b>{userInfo?.name}</b>
            </h4>
          </div>
        </div>
        <div className="profile-stats">
          {/* Stats Row */}
          <div className="stats-top">
            <div className="stats-row">
              {showNumber > 0 ? (
                <Link to={`/users/${user_id}/yourshows`} className="stat-link">
                  <div className="stat">
                    <div className="stat-number">
                      <b>{showNumber}</b>
                    </div>
                    <div className="stat-label">Shows</div>
                  </div>
                </Link>
              ) : (
                <div className="stat">
                  <div className="stat-number">
                    <b>{showNumber}</b>
                  </div>
                  <div className="stat-label">Shows</div>
                </div>
              )}
              {following > 0 ? (
                <Link to={`/users/${user_id}/following`} className="stat-link">
                  <div className="stat">
                    <div className="stat-number">
                      <b>{following}</b>
                    </div>
                    <div className="stat-label">Following</div>
                  </div>
                </Link>
              ) : (
                <div className="stat">
                  <div className="stat-number">
                    <b>{following}</b>
                  </div>
                  <div className="stat-label">Following</div>
                </div>
              )}
              {followers > 0 ? (
                <Link to={`/users/${user_id}/followers`} className="stat-link">
                  <div className="stat">
                    <div className="stat-number">
                      <b>{followers}</b>
                    </div>
                    <div className="stat-label">Followers</div>
                  </div>
                </Link>
              ) : (
                <div className="stat">
                  <div className="stat-number">
                    <b>{followers}</b>
                  </div>
                  <div className="stat-label">Followers</div>
                </div>
              )}
            </div>
          </div>

          {/* Follow / Edit button */}
          {user_id !== loggedInUserId ? (
            <button
              className={`follow-btn ${!isFollowing ? "followed" : ""}`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          ) : (
            <button
              className="follow-btn followed"
              onClick={() => navigate("/editprofile")}
            >
              Edit Profile
            </button>
          )}
        </div>

        {userInfo?.bio && (
          <div className="profile-bio">
            <p className="bio-header">Bio</p>
            <p className="bio-content">{userInfo.bio}</p>
          </div>
        )}
      </div>

      <div className="profile-content">
        {/* Currently Watching */}
        {(cwList as any[]).length > 0 ? (
          <div className="favorite-shows">
            <h3 className="shows-label">Currently Watching</h3>
            <div className="favorite-shows-images">
              {(cwList as any[]).map((show: any) => (
                <ShowPosterCard
                  key={show.show_id}
                  showId={show.show_id}
                  className="show-icon small-icon"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-section-profile">
            <h1 className="headings">You're Watching</h1>
              <p>
                Start watching shows <br />
                to see them here!
              </p>
          </div>
        )}

        {/* Recent Reviews */}
        {recentRatings.length > 0 ? (
          <div className="favorite-shows">
            <h3 className="shows-label">Recent Reviews</h3>
            <div className="user-ratings">
              <div className="review-cards-container">
                {recentRatings.map((rating: any) => (
                  <ReviewCard
                    key={`${rating.user_id}-${rating.show_id}`}
                    showId={rating.show_id}
                    userId={rating.user_id}
                    comment={rating.comment}
                    rating={rating.rating}
                    reviewDate={formatRelativeTime(rating.timestamp)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="home-section-profile">
            <h1 className="headings">Recent Reviews</h1>
              <p>
                Start watching shows <br />
                to see them here!
              </p>
          </div>
        )}
      </div>

      {(ratings as any[]).length > 0 && (
        <ProfileStats
          ratings={ratings as any[]}
          watchedShows={watchedShows as any[]}
          watchedCount={(watchedList as any[]).length}
          isLoadingShows={watchedShowsLoading}
        />
      )}
    </div>
  );
}
