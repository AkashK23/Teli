import { useParams, Link } from "react-router-dom";
import React, { useState } from "react";
import ShareButton from "../components/ShareButton";
import { useUser } from "../UserContext";
import { useShowDetails, useShowSeason } from "../hooks/useShow";
import { useUserRatings, useEpisodeReviews } from "../hooks/useUser";
import { useSubmitEpisodeRating } from "../hooks/useMutations";

export default function EpisodeDetails() {
  const user_id = useUser().userId;
  const { id, season, episode } = useParams<{
    id: string;
    season: string;
    episode: string;
  }>();

  const seasonNumber = season ? parseInt(season, 10) : null;
  const episodeNumber = episode ? parseInt(episode, 10) : null;

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
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);
  const { data: episodeReviews = [] } = useEpisodeReviews(
    user_id,
    id,
    seasonNumber,
  );

  const submitEpisodeRatingMutation = useSubmitEpisodeRating();

  // Derive episode data from the season response
  const episodeData = (seasonData?.episodes ?? []).find(
    (e: any) => e.episode_number === episodeNumber,
  );

  // Find the user's existing review for this episode
  const userReview = (episodeReviews as any[]).find(
    (r: any) => r.episode_number === episodeNumber,
  );
  const userHasRated = !!userReview;

  // Populate form when an existing review is found
  React.useEffect(() => {
    if (userReview && !isEditingReview) {
      setRating(userReview.rating);
      setReviewText(userReview.comment || "");
    }
  }, [userReview?.episode_number]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when navigating to a different episode
  React.useEffect(() => {
    setRating(0);
    setReviewText("");
    setSubmitted(false);
    setIsEditingReview(false);
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

  return (
    <div className="show-details-container">
      {/* ✅ MOBILE */}
      {isMobile && (
        <>
          <div className="episode-banner-wrapper">
            {stillUrl ? (
              <img
                src={stillUrl}
                alt={episodeData.name}
                className="episode-banner"
              />
            ) : (
              <div className="no-img-banner">No Image</div>
            )}
          </div>

          {/* Info */}
          <div className="mobile-show-info">
            <div className="mobile-show-top">
              <div className="show-title-row">
                <div>
                  <Link to={`/show/${id}`} className="episode-show-link">
                    {showData.name}
                  </Link>

                  <p className="episode-meta">
                    S{season} E{episode}
                  </p>
                </div>

                <h1 className="ep-title-with-share">
                  {episodeData.name}
                  <span className="share-inline">
                    <ShareButton
                      title={episodeData.name}
                      text={`Check out ${episodeData.name} on Teli!`}
                      url={`${window.location.origin}/show/${id}/season/${season}/episode/${episode}`}
                    />
                  </span>
                </h1>
              </div>

              {episodeData.air_date && (
                <p className="mobile-date">
                  {new Date(episodeData.air_date).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              )}
            </div>
          </div>

          <p>
            <strong>Overview:</strong>{" "}
            {episodeData.overview || "No description available."}
          </p>
        </>
      )}

      {/* ✅ DESKTOP (unchanged) */}
      {!isMobile && (
        <div className="show-details-upper">
          {stillUrl ? (
            <img
              src={stillUrl}
              alt={episodeData.name}
              className="show-poster"
            />
          ) : (
            <div className="no-img-poster" style={{ width: 200, height: 300 }}>
              No Image
            </div>
          )}

          <div className="show-details-info">
            <div className="show-data">
              <div className="show-data-text">
                <div className="show-title-row">
                  <div>
                    <Link to={`/show/${id}`} className="episode-show-link">
                      {showData.name}
                    </Link>

                    <p className="episode-meta">
                      S{season} E{episode}
                    </p>
                  </div>

                  <h1 className="ep-title-with-share">
                    {episodeData.name}
                    <span className="share-inline">
                      <ShareButton
                        title={episodeData.name}
                        text={`Check out ${episodeData.name} on Teli!`}
                        url={`${window.location.origin}/show/${id}/season/${season}/episode/${episode}`}
                      />
                    </span>
                  </h1>
                </div>
                {episodeData.air_date && (
                  <p className="mobile-date">
                    {new Date(episodeData.air_date).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                )}

                <p>
                  <strong>Overview:</strong>{" "}
                  {episodeData.overview || "No description available."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews */}
      <div>
        {user_id && !ratingsLoading ? (
          <>
            {userHasRated && (
              <h3 className="show-details-headings">Your Review</h3>
            )}

            {userHasRated && (
              <div className="rating-cards-container">
                <div className="rating-card">
                  <div className="rating-details">
                    <div className="rating-score">{userReview.rating}</div>
                    <div className="rating-text">
                      <p>{userReview.comment}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingReview((prev) => !prev)}
                    className="edit-review-button"
                  >
                    {isEditingReview ? "Cancel" : "Update"}
                  </button>
                </div>
              </div>
            )}

            {(!userHasRated || isEditingReview) && (
              <div>
                {!userHasRated && (
                  <h3 className="show-details-headings">Leave a Review</h3>
                )}
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
                        step="1"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                      />
                      <span
                        className="slider-thumb-label"
                        style={{ left: thumbLeft(rating) }}
                        data-value={rating}
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
                      placeholder="What did you think of this episode?"
                      className="review-textbox"
                    />
                    <button
                      onClick={handleReviewSubmit}
                      className="submit-review-button"
                      disabled={submitEpisodeRatingMutation.isPending}
                    >
                      {submitEpisodeRatingMutation.isPending
                        ? "Submitting..."
                        : userHasRated
                          ? "Update"
                          : "Submit"}
                    </button>
                    {submitted && <p>Review submitted!</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state-card">
            <p>Sign in to leave a review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
