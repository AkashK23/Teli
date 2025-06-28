import React, { useState, useEffect } from "react";
import axios from "axios";

/* Activity Page */
export default function Activity() {
  const [activeTab, setActiveTab] = useState<"following" | "user">("following");
  const [followingReviews, setFollowingReviews] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);

  /* Pull review info from backend */
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const [followingRes, userRes] = await Promise.all([
          axios.get("http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/feed"),
          axios.get("http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/ratings"),
        ]);
        const fetchedFollowingRatings = followingRes.data.feed;
        setFollowingReviews(fetchedFollowingRatings);
        const fetchedUserRatings = userRes.data;
        setUserReviews(fetchedUserRatings);

        const updatedRatingsFollowing = await Promise.all(
          fetchedFollowingRatings.map(async (rating: any) => {
            try {
              const res = await axios.get(
                `http://localhost:5001/shows/${rating.show_id}`
              );
              console.log("res:", res);
              const showData = res.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...rating,
                show_name: showData?.name,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
              };
            } catch (err) {
              console.error("Failed to fetch image for:", rating.show_name);
              return { ...rating, image_url: null };
            }
          })
        );

        setFollowingReviews(updatedRatingsFollowing);

        const updatedRatingsUser = await Promise.all(
          fetchedUserRatings.map(async (rating: any) => {
            try {
              const res = await axios.get(
                `http://localhost:5001/shows/${rating.show_id}`
              );
              console.log("res:", res);
              const showData = res.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...rating,
                show_name: showData?.name,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
              };
            } catch (err) {
              console.error("Failed to fetch image for:", rating.show_name);
              return { ...rating, image_url: null };
            }
          })
        );

        setUserReviews(updatedRatingsUser);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      }
    };

    fetchReviews();
  }, []);

  /* Render Reviews */
  const renderReviews = (reviews: any[]) => {
    return reviews.length === 0 ? (
      <p>No reviews yet.</p>
    ) : (
      <div className="review-container">
        <div className="user-ratings">
          <div className="rating-cards-container">
            {reviews.map((rating: any) => (
              <div className="rating-card" key={rating.show_id}>
                <img
                  src="https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
                  className="profile-avatar-home"
                />
                <div className="rating-details">
                  <div className="rating-text">
                    <h4>{rating.user_name}</h4>
                    <p>{rating.comment}</p>
                  </div>
                  <div className="rating-score">{rating.rating}</div>
                </div>
                <img
                  src={rating.image_url}
                  alt={rating.name}
                  className="rating-show-img"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Tabs */}
      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === "following" ? "active" : ""}`}
          onClick={() => setActiveTab("following")}
        >
          Following
        </button>
        <button
          className={`tab-button ${activeTab === "user" ? "active" : ""}`}
          onClick={() => setActiveTab("user")}
        >
          You
        </button>
        <div
          className="tab-slider"
          style={{
            transform:
              activeTab === "following" ? "translateX(0%)" : "translateX(100%)",
          }}
        />
      </div>

      {/* Render reviews for each tab */}
      <div className="tab-content">
        {activeTab === "following"
          ? renderReviews(followingReviews)
          : renderReviews(userReviews)}
      </div>
    </div>
  );
}
