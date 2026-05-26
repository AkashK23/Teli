import { useNavigate, Link, useParams } from "react-router-dom";
import { Tv, Star, Bookmark } from "lucide-react";
import ShareButton from "../components/ShareButton";
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
  const isOwnProfile = user_id === loggedInUserId;

  const { data: userInfo, isLoading: userLoading } = useUserProfile(user_id);
  const firstName = userInfo?.name?.split(" ")[0] || "User";
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

  const recentRatings = (ratings as any[]).slice(0, 10);

  return (
    <div className="profile-page">
      {/* ── HEADER ROW ── */}
      <div className="profile-hdr">
        <img
          src={
            userInfo?.picture
              ? userInfo.picture.slice(0, -4) + "1080"
              : "/avatar.jpg"
          }
          alt={userInfo?.name || "Profile"}
          referrerPolicy="no-referrer"
          className="profile-hdr-avatar"
        />

        <div className="profile-hdr-meta">
          {/* Name/buttons on left, stats on right */}
          <div className="profile-hdr-name-row">
            <div className="profile-hdr-name-left">
              <h1 className="profile-hdr-name">{userInfo?.name}</h1>

              {user_id !== loggedInUserId ? (
                <button
                  className={`profile-follow-btn ${isFollowing ? "is-following" : ""}`}
                  onClick={handleFollowToggle}
                  disabled={
                    followUserMutation.isPending ||
                    unfollowUserMutation.isPending
                  }
                >
                  {followUserMutation.isPending ||
                  unfollowUserMutation.isPending
                    ? "..."
                    : isFollowing
                      ? "Following"
                      : "+ Follow"}
                </button>
              ) : (
                <button
                  className="profile-follow-btn is-following"
                  onClick={() => navigate("/editprofile")}
                >
                  Edit Profile
                </button>
              )}

              <ShareButton
                title={`${userInfo?.name} on Teli`}
                text={`Check out ${userInfo?.name}'s profile on Teli!`}
                url={`${window.location.origin}/profile/${user_id}`}
              />
            </div>

            {/* Stats pushed to the right */}
            <div className="profile-hdr-stats">
              {showNumber > 0 ? (
                <Link
                  to={`/users/${user_id}/yourshows`}
                  className="profile-hdr-stat-link"
                >
                  <span className="profile-hdr-stat-n">{showNumber}</span>
                  <span className="profile-hdr-stat-l">Shows</span>
                </Link>
              ) : (
                <div className="profile-hdr-stat">
                  <span className="profile-hdr-stat-n">{showNumber}</span>
                  <span className="profile-hdr-stat-l">Shows</span>
                </div>
              )}

              {following > 0 ? (
                <Link
                  to={`/users/${user_id}/following`}
                  className="profile-hdr-stat-link"
                >
                  <span className="profile-hdr-stat-n">{following}</span>
                  <span className="profile-hdr-stat-l">Following</span>
                </Link>
              ) : (
                <div className="profile-hdr-stat">
                  <span className="profile-hdr-stat-n">{following}</span>
                  <span className="profile-hdr-stat-l">Following</span>
                </div>
              )}

              {followers > 0 ? (
                <Link
                  to={`/users/${user_id}/followers`}
                  className="profile-hdr-stat-link"
                >
                  <span className="profile-hdr-stat-n">{followers}</span>
                  <span className="profile-hdr-stat-l">Followers</span>
                </Link>
              ) : (
                <div className="profile-hdr-stat">
                  <span className="profile-hdr-stat-n">{followers}</span>
                  <span className="profile-hdr-stat-l">Followers</span>
                </div>
              )}
            </div>
          </div>

          {userInfo?.bio && <p className="profile-hdr-bio">{userInfo.bio}</p>}
        </div>
      </div>

      <div className="profile-hdr-divider" />

      {/* ── TWO-COLUMN BODY ── */}
      <div className="profile-body-grid">
        {/* LEFT COLUMN */}
        <div className="profile-main-col">
          {/* Currently Watching */}
          {(cwList as any[]).length > 0 ? (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Currently Watching</span>
                <Link to={`/users/${user_id}/yourshows`} className="psc-more">
                  All shows →
                </Link>
              </div>
              <div className="psc-body">
                <div className="show-poster-strip">
                  {(cwList as any[]).map((show: any) => (
                    <ShowPosterCard
                      key={show.show_id}
                      showId={show.show_id}
                      className="strip-poster"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Currently Watching</span>
              </div>
              <div className="psc-body">
                <div className="psc-empty">
                  <Tv className="psc-empty-icon" />
                  {isOwnProfile ? (
                    <>
                      <p>Start tracking shows you're watching</p>
                      <Link to="/browse" className="psc-empty-cta">
                        Browse Shows
                      </Link>
                    </>
                  ) : (
                    <p>{firstName} isn’t watching any shows right now</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Reviews */}
          {recentRatings.length > 0 ? (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Recent Reviews</span>
                <Link to={`/activity`} className="psc-more">
                  All reviews →
                </Link>
              </div>
              <div className="psc-body psc-body--reviews">
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
          ) : (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Recent Reviews</span>
              </div>
              <div className="psc-body">
                <div className="psc-empty">
                  <Star className="psc-empty-icon" />
                  {isOwnProfile ? (
                    <>
                      <p>Share your thoughts on shows</p>
                      <Link to="/browse" className="psc-empty-cta">
                        Find a Show to Review
                      </Link>
                    </>
                  ) : (
                    <p>{firstName} hasn’t written any reviews yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="profile-sidebar">
          {/* Quick stats */}
          <div className="profile-section-card">
            <div className="psc-header">
              <span className="psc-title">Shows</span>
            </div>
            <div className="psc-body">
              <div className="sidebar-stat-grid">
                <div className="sidebar-stat">
                  <span className="sidebar-stat-n">
                    {(watchedList as any[]).length}
                  </span>
                  <span className="sidebar-stat-l">Watched</span>
                </div>
                <div className="sidebar-stat">
                  <span className="sidebar-stat-n">
                    {(ratings as any[]).length}
                  </span>
                  <span className="sidebar-stat-l">Reviews</span>
                </div>
                <div className="sidebar-stat">
                  <span className="sidebar-stat-n">
                    {(cwList as any[]).length}
                  </span>
                  <span className="sidebar-stat-l">Watching</span>
                </div>
                <div className="sidebar-stat">
                  <span className="sidebar-stat-n">
                    {(w2wList as any[]).length}
                  </span>
                  <span className="sidebar-stat-l">Saved</span>
                </div>
              </div>
            </div>
          </div>

          {/* Currently Watching poster grid */}
          {(cwList as any[]).length > 0 && (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Currently Watching</span>
                <Link
                  to={`/users/${user_id}/yourshows?list=currently_watching`}
                  className="psc-more"
                >
                  See all →
                </Link>
              </div>
              <div className="psc-body psc-body--w2w">
                <div className="w2w-poster-list">
                  {(cwList as any[]).slice(0, 6).map((show: any) => (
                    <ShowPosterCard
                      key={show.show_id}
                      showId={show.show_id}
                      className="w2w-poster"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Want to Watch */}
          {(w2wList as any[]).length > 0 && (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Want to Watch</span>
                <Link
                  to={`/users/${user_id}/yourshows?list=want_to_watch`}
                  className="psc-more"
                >
                  See all →
                </Link>
              </div>
              <div className="psc-body psc-body--w2w">
                <div className="w2w-poster-list">
                  {(w2wList as any[]).slice(0, 6).map((show: any) => (
                    <ShowPosterCard
                      key={show.show_id}
                      showId={show.show_id}
                      className="w2w-poster"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recently Watched */}
          {(watchedList as any[]).length > 0 && (
            <div className="profile-section-card">
              <div className="psc-header">
                <span className="psc-title">Recently Watched</span>
                <Link
                  to={`/users/${user_id}/yourshows?list=watched`}
                  className="psc-more"
                >
                  See all →
                </Link>
              </div>
              <div className="psc-body psc-body--w2w">
                <div className="w2w-poster-list">
                  {(watchedList as any[]).slice(0, 6).map((show: any) => (
                    <ShowPosterCard
                      key={show.show_id}
                      showId={show.show_id}
                      className="w2w-poster"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty sidebar fallback */}
          {(w2wList as any[]).length === 0 &&
            (watchedList as any[]).length === 0 &&
            (cwList as any[]).length === 0 && (
              <div className="profile-section-card">
                <div className="psc-header">
                  <span className="psc-title">Watchlist</span>
                </div>
                <div className="psc-body">
                  <div className="psc-empty">
                    <Bookmark className="psc-empty-icon" />
                    {isOwnProfile ? (
                      <>
                        <p>No shows saved yet</p>
                        <Link to="/browse" className="psc-empty-cta">
                          Browse Shows
                        </Link>
                      </>
                    ) : (
                      <p>{firstName} hasn’t saved any shows yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </aside>

        {/* FULL-WIDTH STATS ROW */}
        {(ratings as any[]).length > 0 && (
          <div className="profile-stats-full">
            <ProfileStats
              ratings={ratings as any[]}
              watchedShows={watchedShows as any[]}
              watchedCount={(watchedList as any[]).length}
              isLoadingShows={watchedShowsLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
