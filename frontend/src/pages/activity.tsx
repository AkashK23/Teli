import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import { useLocation } from "react-router-dom";

export default function Activity() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab = params.get("tab") || "following"; // default
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followingReviews, setFollowingReviews] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
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

        const [followingRes, userRes] = await Promise.all([
          axios.get(`${url}/users/${user_id}/feed`),
          axios.get(`${url}/users/${user_id}/ratings`),
        ]);
        const fetchedFollowingRatings = followingRes.data.feed;
        const fetchedUserRatings = userRes.data;

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
      <p>No reviews yet.</p>
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
      <div className="activity-tabContainer">
        <div
          onClick={() => setActiveTab("following")}
          className={`activity-tab ${
            activeTab === "following" ? "activity-activeTab" : ""
          }`}
        >
          Following
        </div>
        <div
          onClick={() => setActiveTab("user")}
          className={`activity-tab ${
            activeTab === "user" ? "activity-activeTab" : ""
          }`}
        >
          You
        </div>
      </div>

      <div className="activity.contentContainer">
        {activeTab === "following"
          ? renderReviews(followingReviews)
          : renderReviews(userReviews)}
      </div>
    </div>
  );
}
