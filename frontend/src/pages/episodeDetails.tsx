import { useParams, Link } from "react-router-dom";
import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import ShareButton from "../components/ShareButton";
import EpisodeReviewCard from "../components/EpisodeReviewCard";
import { formatRelativeTime } from "../components/formatRelativeTime";
import { useUser } from "../UserContext";
import {
  useShowDetails,
  useShowSeason,
  useEpisodeAverageRating,
} from "../hooks/useShow";
import { useUserRatings, useEpisodeReviews } from "../hooks/useUser";
import {
  useFollowedEpisodeReviews,
  useAllEpisodeRatings,
} from "../hooks/useShow";
import { useSubmitEpisodeRating } from "../hooks/useMutations";

type ReviewTab = "you" | "following" | "all";

export default function EpisodeDetails() {
  const user_id = useUser().userId;
  const { id, season, episode } = useParams<{
    id: string;
    season: string;
    episode: string;
  }>();

  const seasonNumber = season ? parseInt(season, 10) : null;
  const episodeNumber = episode ? parseInt(episode, 10) : null;

  const [reviewTab, setReviewTab] = useState<ReviewTab>(
    user_id ? "you" : "all",
  );
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: showData, isLoading: showLoading } = useShowDetails(id);
  const { data: seasonData, isLoading: seasonLoading } = useShowSeason(
    id,
    seasonNumber,
  );
  const { data: avgRatingData } = useEpisodeAverageRating(
    id,
    seasonNumber,
    episodeNumber,
  );
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);
  const { data: episodeReviews = [] } = useEpisodeReviews(
    user_id,
    id,
    seasonNumber,
  );
  const {
    data: followedReviews = {
      results: [],
      followers_average_rating: null,
      followers_total_ratings: 0,
    },
    isLoading: followedLoading,
  } = useFollowedEpisodeReviews(user_id, id, seasonNumber, episodeNumber);
  const { data: allReviews = [], isLoading: allReviewsLoading } =
    useAllEpisodeRatings(user_id, id, seasonNumber, episodeNumber);

  const submitEpisodeRatingMutation = useSubmitEpisodeRating();

  const episodeData = (seasonData?.episodes ?? []).find(
    (e: any) => e.episode_number === episodeNumber,
  );

  const userReview = (episodeReviews as any[]).find(
    (r: any) => r.episode_number === episodeNumber,
  );
  const userHasRated = !!userReview;

  const avgRating = avgRatingData?.average_rating ?? null;
  const ratingCount = avgRatingData?.total_ratings ?? 0;
  const followersAvgRating =
    (followedReviews as any)?.followers_average_rating ?? null;
  const followersTotalRatings =
    (followedReviews as any)?.followers_total_ratings ?? 0;

  React.useEffect(() => {
    if (userReview) {
      setRating(userReview.rating);
      setReviewText(userReview.comment || "");
      console.log(userReview);
    }
  }, [userReview?.episode_number]); // eslint-disable-line

  React.useEffect(() => {
    setSubmitted(false);
    setIsEditingReview(false);
    setReviewTab(user_id ? "you" : "all");
  }, [id, season, episode]);

  const handleReviewSubmit = () => {
    if (!user_id) return;
    submitEpisodeRatingMutation.mutate(
      {
        user_id,
        show_id: id,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        rating,
        comment: reviewText,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setTimeout(() => setSubmitted(false), 3000);
          setIsEditingReview(false);
        },
      },
    );
  };

  const thumbColor = (val: number) =>
    val <= 3
      ? "#e05050"
      : val <= 6
        ? "#e0a830"
        : val <= 8
          ? "#5aab5a"
          : "#2d8a2d";

  const thumbLeft = (val: number) => `calc(${val / 10} * (100% - 3rem))`;

  const renderReviewList = (reviews: any[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      );
    }
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return (
        <div className="empty-state-card">
          <MessageSquare className="empty-state-icon" />
          <p>No reviews yet</p>
        </div>
      );
    }
    return (
      <div className="review-cards-container">
        {reviews.map((review: any) => (
          <EpisodeReviewCard
            key={
              review.id ??
              review.rating_id ??
              `${review.user_id}-${review.episode_number}`
            }
            showId={review.show_id}
            userId={review.user_id}
            seasonNumber={review.season_number}
            episodeNumber={review.episode_number}
            comment={review.comment}
            rating={review.rating}
            reviewDate={formatRelativeTime(review.timestamp)}
          />
        ))}
      </div>
    );
  };

  const isLoading = showLoading || seasonLoading || ratingsLoading;

  if (isLoading || !showData || !episodeData) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const stillUrl = episodeData.still_path
    ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}`
    : null;

  const effectiveReviewTab = user_id ? reviewTab : "all";

  const ratingsRow = (
    <div className="show-ratings-row">
      {avgRating !== null && ratingCount > 0 && (
        <div className="show-data-rating">
          <div className="show-data-rating-score">
            {(avgRating as number).toFixed(1)}
          </div>
          <div className="show-data-rating-reviews">
            ({ratingCount} ratings)
          </div>
        </div>
      )}
      {user_id && followersAvgRating !== null && followersTotalRatings > 0 && (
        <div className="show-data-rating show-data-rating--followers">
          <div className="show-data-rating-score">
            {(followersAvgRating as number).toFixed(1)}
          </div>
          <div className="show-data-rating-reviews">
            ({followersTotalRatings} following)
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="episode-details-container">
      {isMobile ? (
        <>
          <div className="episode-banner-wrapper">
            {stillUrl ? (
              <img src={stillUrl} className="episode-banner" />
            ) : (
              <div className="no-img-banner">No Image</div>
            )}
          </div>

          <div className="mobile-show-upper">
            <Link to={`/show/${id}`} className="episode-show-link">
              {showData.name} S{season}:E{episode}
            </Link>

            <div className="mobile-show-top">
              <div className="mobile-title-block">
                <h1 className="mobile-title">
                  {episodeData.name}
                  <ShareButton
                    title={episodeData.name}
                    text={`Check out ${episodeData.name}`}
                    url={window.location.href}
                  />
                </h1>
                <p className="episode-mobile-overview">
                  {episodeData.overview}
                </p>
              </div>
              <div className="mobile-rating-wrapper">{ratingsRow}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="show-details-upper">
          {stillUrl ? (
            <img src={stillUrl} className="show-poster" />
          ) : (
            <div className="no-img-poster">No Image</div>
          )}

          <div className="show-details-info">
            <div className="show-data">
              <div className="show-data-text">
                <Link to={`/show/${id}`} className="episode-show-link">
                  {showData.name} S{season}:E{episode}
                </Link>
                <h1>{episodeData.name}</h1>
                <p>{episodeData.overview}</p>
              </div>
              {ratingsRow}
            </div>
          </div>
        </div>
      )}

      {/* ================= REVIEWS ================= */}
      <h2 className="section-header">Reviews</h2>

      {user_id && (
        <div className="activity-tabContainer">
          <div
            onClick={() => setReviewTab("you")}
            className={`activity-tab ${
              effectiveReviewTab === "you" ? "activity-activeTab" : ""
            }`}
          >
            You
          </div>
          <div
            onClick={() => setReviewTab("following")}
            className={`activity-tab ${
              effectiveReviewTab === "following" ? "activity-activeTab" : ""
            }`}
          >
            Following
          </div>
          <div
            onClick={() => setReviewTab("all")}
            className={`activity-tab ${
              effectiveReviewTab === "all" ? "activity-activeTab" : ""
            }`}
          >
            All
          </div>
        </div>
      )}

      {effectiveReviewTab === "you" && (
        <div>
          {user_id && !ratingsLoading ? (
            <>
              {userHasRated && (
                <div className="review-cards-container">
                  <EpisodeReviewCard
                    showId={userReview.show_id}
                    userId={userReview.user_id}
                    seasonNumber={userReview.season_number}
                    episodeNumber={userReview.episode_number}
                    comment={userReview.comment}
                    rating={userReview.rating}
                    reviewDate={formatRelativeTime(userReview.timestamp)}
                  />
                </div>
              )}

              <div>
                <div className="write-review-container">
                  <div className="slider-container">
                    <div
                      className="slider-wrapper"
                      style={
                        {
                          "--slider-fill": `${rating * 10}%`,
                          "--thumb-color": thumbColor(rating),
                        } as React.CSSProperties
                      }
                    >
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                      />
                      <span
                        className="slider-thumb-label"
                        data-value={rating}
                        style={{ left: thumbLeft(rating) }}
                      >
                        {rating}
                      </span>
                    </div>
                  </div>

                  <div className="review-input-group">
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={4}
                      placeholder="What did you think?"
                      className="review-textbox"
                    />

                    <div className="submit-button-row">
                      <button
                        onClick={handleReviewSubmit}
                        className="submit-review-button"
                      >
                        {userHasRated ? "Update" : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {submitted && (
                <div className="review-submit-message">
                  <p>Review submitted!</p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state-card">
              <p>Sign in to leave a review.</p>
            </div>
          )}
        </div>
      )}

      {effectiveReviewTab === "following" &&
        renderReviewList(
          ((followedReviews as any)?.results ?? []) as any[],
          followedLoading,
        )}

      {effectiveReviewTab === "all" &&
        renderReviewList(
          Array.isArray(allReviews)
            ? allReviews
            : ((allReviews as any)?.results ?? []),
          allReviewsLoading,
        )}
    </div>
  );
}
