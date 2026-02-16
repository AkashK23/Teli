import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import { useLocation } from "react-router-dom";
import { formatRelativeTime } from "../components/formatRelativeTime";

export default function Activity() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab = params.get("tab") || "following"; // default
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followingReviews, setFollowingReviews] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const url = process.env.REACT_APP_API_URL;
  const user_id = useUser().userId;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const userDataRes = await axios.get(`${url}/user/${user_id}`);
        setUserInfo(userDataRes.data);

        const [followingRes, userRes, watchlistsRes] = await Promise.all([
          axios.get(`${url}/users/${user_id}/feed`),
          axios.get(`${url}/users/${user_id}/ratings`),
          Promise.all([
            axios.get(`${url}/users/${user_id}/want_to_watch`),
            axios.get(`${url}/users/${user_id}/currently_watching`),
            axios.get(`${url}/users/${user_id}/watched`),
          ])
        ]);
        
        const fetchedFollowingRatings = followingRes.data.feed;
        const fetchedUserRatings = userRes.data;
        const [wantToWatch, currentlyWatching, watched] = watchlistsRes;

        // Calculate user statistics
        const totalShows = wantToWatch.data.length + currentlyWatching.data.length + watched.data.length;
        const totalReviews = fetchedUserRatings.length;
        const averageRating = totalReviews > 0 
          ? (fetchedUserRatings.reduce((sum: number, rating: any) => sum + rating.rating, 0) / totalReviews).toFixed(1)
          : 0;

        setUserStats({
          totalShows,
          totalReviews,
          averageRating,
          watchedShows: watched.data.length,
          currentlyWatching: currentlyWatching.data.length,
          wantToWatch: wantToWatch.data.length,
        });

        const enrichRatings = async (ratings: any[]) => {
          return await Promise.all(
            ratings.map(async (rating: any) => {
              try {
                const res = await axios.get(`${url}/shows/${rating.show_id}`);
                const showData = res.data;
                const imagePath = showData.poster_path;
                const imageUrl = imagePath?.startsWith("http")
                  ? imagePath
                  : `https://image.tmdb.org/t/p/w500${imagePath}`;
                const userReviewInfo = await axios.get(
                  `${url}/user/${rating.user_id}`
                );
                const ratingRes = await axios.get(
                  `${url}/shows/${rating.show_id}/average-rating`
                );
                return {
                  ...rating,
                  show_name: showData?.name,
                  image_url:
                    showData?.image_url ||
                    showData?.thumbnail ||
                    imageUrl ||
                    null,
                  user_name: userReviewInfo.data.name,
                  user_id: userReviewInfo.data.id,
                  user_profile_pic: userReviewInfo.data.picture,
                  overview: showData.overview,
                  first_air_date: showData.first_air_date,
                  average_rating: ratingRes.data.average_rating,
                  review_date: formatRelativeTime(rating.timestamp),
                };
              } catch (err) {
                console.error("Failed to fetch image for:", rating.show_name);
                return { ...rating, image_url: null };
              }
            })
          );
        };

        setFollowingReviews(await enrichRatings(fetchedFollowingRatings));
        setUserReviews(await enrichRatings(fetchedUserRatings));
        console.log(fetchedUserRatings);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const renderReviews = (reviews: any[]) => {
    return reviews.length === 0 ? (
      <div className="no-reviews-message">
        <p>{activeTab === "following" ? "No reviews from people you follow yet." : "You haven't written any reviews yet."}</p>
        <p>{activeTab === "following" ? "Follow some users to see their reviews here!" : "Start reviewing shows to track your thoughts!"}</p>
      </div>
    ) : (
      <div className="review-container">
        <div className="user-ratings">
          <div className="review-cards-container">
            {reviews.map((rating: any) => (
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
                compact={false}
                reviewDate={rating.review_date}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="activity-layout">
        {/* Main Content Area */}
        <div className="activity-main-content">
          <div className="activity-tabContainer">
            <div
              onClick={() => setActiveTab("following")}
              className={`activity-tab ${
                activeTab === "following" ? "activity-activeTab" : ""
              }`}
            >
              Following ({followingReviews.length})
            </div>
            <div
              onClick={() => setActiveTab("user")}
              className={`activity-tab ${
                activeTab === "user" ? "activity-activeTab" : ""
              }`}
            >
              You ({userReviews.length})
            </div>
          </div>

          <div className="activity-contentContainer">
            {activeTab === "following"
              ? renderReviews(followingReviews)
              : renderReviews(userReviews)}
          </div>
        </div>

        {/* Sidebar with Statistics */}
        <div className="activity-sidebar">
          <div className="activity-stats-sidebar">
            <h3 className="activity-stats-title">Your Stats</h3>
            <div className="activity-stat-item">
              <div className="activity-stat-number">{userStats.totalReviews}</div>
              <div className="activity-stat-label">Reviews</div>
            </div>
            <div className="activity-stat-item">
              <div className="activity-stat-number">{userStats.averageRating}</div>
              <div className="activity-stat-label">Avg Rating</div>
            </div>
            <div className="activity-stat-item">
              <div className="activity-stat-number">{userStats.totalShows}</div>
              <div className="activity-stat-label">Shows in Lists</div>
            </div>
            <div className="activity-stat-item">
              <div className="activity-stat-number">{userStats.watchedShows}</div>
              <div className="activity-stat-label">Watched</div>
            </div>
            <div className="activity-stat-item">
              <div className="activity-stat-number">{userStats.currentlyWatching}</div>
              <div className="activity-stat-label">Watching</div>
            </div>
            <div className="activity-stat-item">
              <div className="activity-stat-number">{userStats.wantToWatch}</div>
              <div className="activity-stat-label">Want to Watch</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
