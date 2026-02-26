import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";

import ReviewCard from "../components/ReviewCard";
import ShowTooltip from "../components/ShowTooltip";
import { formatRelativeTime } from "../components/formatRelativeTime";

export default function Profile() {
  const url = process.env.REACT_APP_API_URL;
  const { id } = useParams<{ id?: string }>();
  const loggedInUserId = useUser().userId;
  const navigate = useNavigate();

  const user_id = id || loggedInUserId;

  const [userInfo, setUserInfo] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(0);
  const [following, setFollowing] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<any[]>([]);
  const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] =
    useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Fetch user info
        const userRes = await axios.get(`${url}/user/${user_id}`);
        console.log(userRes.data)
        setUserInfo(userRes.data);

        console.log(user_id)
        console.log(loggedInUserId)
        console.log(id)

        // Fetch show number
        const W2Wres = await axios.get(`${url}/users/${user_id}/want_to_watch`);
        const CWres = await axios.get(`${url}/users/${user_id}/currently_watching`);
        const Wres = await axios.get(`${url}/users/${user_id}/watched`);
        setShowNumber(W2Wres.data.length + CWres.data.length + Wres.data.length)

        // Fetch followers/following counts
        const followingRes = await axios.get(
          `${url}/users/${user_id}/following`
        );
        setFollowing(followingRes.data.following.length);

        const followersRes = await axios.get(
          `${url}/users/${user_id}/followers`
        );
        setFollowers(followersRes.data.followers.length);

        // Check if logged-in user follows this profile
        if (loggedInUserId && loggedInUserId !== user_id) {
          const loggedInFollowingRes = await axios.get(
            `${url}/users/${loggedInUserId}/following`
          );
          const followingList = loggedInFollowingRes.data.following;
          setIsFollowing(followingList.some((u: any) => u === user_id));
        }

        // Fetch ratings
        const ratingsRes = await axios.get(`${url}/users/${user_id}/ratings`);
        setRatings(ratingsRes.data);

        // Fetch currently watching
        const currentlyWatchingRes = await axios.get(
          `${url}/users/${user_id}/currently_watching`
        );
        setCurrentlyWatching(currentlyWatchingRes.data);

        // Ratings with images
        const ratingsWithImagesRes = await Promise.all(
          ratingsRes.data.map(async (rating: any) => {
            try {
              const showRes = await axios.get(`${url}/shows/${rating.show_id}`);
              const showData = showRes.data;
              console.log(showData)
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              const userReviewInfo = await axios.get(`${url}/user/${rating.user_id}`);
               const ratingRes = await axios.get(
                 `${url}/shows/${rating.show_id}/average-rating`
               );
              return {
                ...rating,
                image_url:
                  showData?.image_url || showData?.thumbnail || imageUrl,
                user_name: userReviewInfo.data.name,
                user_id: userReviewInfo.data.id,
                user_profile_pic: userReviewInfo.data.picture,
                show_name: showData.name,
                overview: showData.overview,
                first_air_date: showData.first_air_date,
                average_rating: ratingRes.data.average_rating,
                review_date: formatRelativeTime(rating.timestamp),
              };
            } catch {
              return { ...rating, image_url: null };
            }
          })
        );
        setRatingsWithImages(ratingsWithImagesRes.slice(0,3));

        // Currently watching with images
        const currentlyWatchingWithImagesRes = await Promise.all(
          currentlyWatchingRes.data.map(async (show: any) => {
            try {
              const showRes = await axios.get(`${url}/shows/${show.show_id}`);
              const showData = showRes.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              const ratingRes = await axios.get(
                `${url}/shows/${show.show_id}/average-rating`
              );
              return {
                ...show,
                image_url:
                  showData?.image_url || showData?.thumbnail || imageUrl,
                name: showData.name || show.show_name,
                rating: ratingRes.data.average_rating,
                overview: showData.overview,
                first_air_date: showData.first_air_date,
              };
            } catch {
              return { ...show, image_url: null };
            }
          })
        );
        setCurrentlyWatchingWithImages(currentlyWatchingWithImagesRes);
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user_id, loggedInUserId]);

  const handleFollowToggle = async () => {
   
    const payload = {
      follower_id: loggedInUserId,
      followee_id: user_id,
    };

    try {
       
      if (isFollowing) {
        const res = await axios.post(`${url}/unfollow`, payload);
        console.log(res.data)
        setIsFollowing(false);
        setFollowers((prev) => prev - 1);
      } else {
        const res = await axios.post(`${url}/follow`, payload);
        console.log(res.data);
        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  const handleEditProfile = async () => {
    navigate(`/editprofile`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const isOwnProfile = user_id === loggedInUserId;

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
            referrerPolicy="no-referrer"
            className="profile-avatar"
          />
          <div className="profile-main">
            <h4 className="username">
              <b>{userInfo.name}</b>
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

          {/* Follow button */}
          {user_id !== loggedInUserId ? (
            <button
              className={`follow-btn ${!isFollowing ? "followed" : ""}`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          ) : (
            <button className="follow-btn followed" onClick={handleEditProfile}>
              {"Edit Profile"}
            </button>
          )}
        </div>

        {userInfo.bio && (
          <div className="profile-bio">
            <p className="bio-header">Bio</p>
            <p className="bio-content">{userInfo.bio}</p>
          </div>
        )}
      </div>

      <div className="profile-content">
        {/* Currently Watching */}
        {currentlyWatchingWithImages.length > 0 ? (
          <div className="favorite-shows">
            <h3 className="shows-label">Currently Watching</h3>
            <div className="favorite-shows-images">
              {currentlyWatchingWithImages.map((show) => (
                <Link
                  to={`/show/${show.show_id}`}
                  key={show.show_id}
                  className="show-link"
                >
                  <ShowTooltip
                    show={{
                      name: show.name,
                      first_air_date: show.first_air_date,
                      overview: show.overview,
                      rating: show.rating,
                    }}
                  >
                    <img
                      src={show.image_url}
                      alt={show.name}
                      className="show-icon small-icon"
                    />
                  </ShowTooltip>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="home-section">
            <h1 className="headings">You're Watching</h1>
            <div className="scroll-container">
              <p>
                Start watching shows <br />
                to see them here!
              </p>
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {ratingsWithImages.length > 0 ? (
          <div className="favorite-shows">
            <h3 className="shows-label">Recent Reviews</h3>
            <div className="user-ratings">
              <div className="review-cards-container">
                {ratingsWithImages.map((rating: any) => (
                  <ReviewCard
                    key={`${rating.user_id}-${rating.show_id}`}
                    showId={rating.show_id}
                    userId={rating.user_id}
                    userName={rating.user_name}
                    userProfilePic={rating.user_profile_pic}
                    comment={rating.comment}
                    rating={rating.rating}
                    showImageUrl={rating.image_url}
                    showName={rating.show_name}
                    overview={rating.overview}
                    averageRating={rating.average_rating}
                    firstAirDate={rating.first_air_date}
                    reviewDate={rating.review_date}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="home-section">
            <h1 className="headings">Recent Reviews</h1>
            <div className="scroll-container">
              <p>
                Start watching shows <br />
                to see them here!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
