import React, { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import { useLocation } from "react-router-dom";
import { formatRelativeTime } from "../components/formatRelativeTime";
import { useUserFeed, useUserRatings } from "../hooks/useUser";

export default function Activity() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab = params.get("tab") || "following";
  const [activeTab, setActiveTab] = useState(initialTab);
  const user_id = useUser().userId;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: feed = [], isLoading: feedLoading } = useUserFeed(user_id);
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);

  const loading = feedLoading || ratingsLoading;

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
                comment={rating.comment}
                rating={rating.rating}
                compact={false}
                reviewDate={formatRelativeTime(rating.timestamp)}
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

      <div className="activity-contentContainer">
        {activeTab === "following"
          ? renderReviews(feed as any[])
          : renderReviews(userRatings as any[])}
      </div>
    </div>
  );
}
