import { useState, useEffect, useMemo } from "react";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { formatRelativeTime } from "../components/formatRelativeTime";
import { useUserFeed, useUserRatings } from "../hooks/useUser";

export default function Activity() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab = params.get("tab") || "following";
  const [activeTab, setActiveTab] = useState(initialTab);
  const user_id = useUser().userId;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
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

  // Deduplicate feed by rating_id (or id) to guard against legacy Firestore dupes
  const deduplicatedFeed = useMemo(() => {
    const seen = new Set<string>();
    return (feed as any[]).filter((item) => {
      const key = item.rating_id || item.id || `${item.user_id}-${item.show_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [feed]);

  const renderReviews = (reviews: any[]) => {
    return reviews.length === 0 ? (
      <div className="empty-state-card">
        <MessageSquare className="empty-state-icon" />
        <p>No reviews yet</p>
        <Link to="/browse" className="empty-state-cta">Browse Shows</Link>
      </div>
    ) : (
      <div className="review-container">
        <div className="user-ratings">
          <div className="review-cards-container">
            {reviews.map((rating: any) => (
              <ReviewCard
                key={rating.id}
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

      {/* key={activeTab} forces a full unmount/remount when switching tabs,
          preventing React from reusing ReviewCard instances across tabs
          which would cause stale props and visual duplicates */}
      <div key={activeTab} className="activity-contentContainer">
        {activeTab === "following"
          ? renderReviews(deduplicatedFeed)
          : renderReviews(userRatings as any[])}
      </div>
    </div>
  );
}
