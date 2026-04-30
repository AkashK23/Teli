import { useParams, Link } from "react-router-dom";
import React, { useState, useRef } from "react";
import { Tv, MessageSquare } from "lucide-react";
import ShareButton from "../components/ShareButton";
import ReviewCard from "../components/ReviewCard";
import { formatRelativeTime } from "../components/formatRelativeTime";
import { useUser } from "../UserContext";
import { useShowDetails, useShowAverageRating } from "../hooks/useShow";
import {
  useUserRatings,
  useUserWatchStatus,
  useEpisodeReviews,
} from "../hooks/useUser";
import { useFollowedShowReviews, useAllShowRatings } from "../hooks/useShow"; // adjust if you put them in a different file
import {
  useUpdateWatchStatus,
  useDeleteWatchStatus,
  useSubmitRating,
} from "../hooks/useMutations";
import { getShowSeason } from "../api/shows";

type WatchStatus = "want_to_watch" | "currently_watching" | "watched" | "";
type ReviewTab = "you" | "following" | "all";

export default function ShowDetails() {
  const user_id = useUser().userId;
  const { id } = useParams<{ id: string }>();

  const [reviewTab, setReviewTab] = useState<ReviewTab>(
    user_id ? "you" : "all",
  );
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any>({});
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("");
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [watchStatusSynced, setWatchStatusSynced] = useState(false);
  const [showStatusMessage, setShowStatusMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: showData, isLoading: showLoading } = useShowDetails(id);
  const { data: avgRatingData } = useShowAverageRating(id);
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);
  const { data: watchStatusData, isLoading: watchStatusLoading } =
    useUserWatchStatus(user_id, id);
  const { data: episodeReviews = [] } = useEpisodeReviews(
    user_id,
    id,
    selectedSeason,
  );
  const { data: followedReviews = [], isLoading: followedLoading } =
    useFollowedShowReviews(user_id, id);
  const { data: allReviews = [], isLoading: allReviewsLoading } =
    useAllShowRatings(id);

  const isUserDataLoading = ratingsLoading || watchStatusLoading;

  const updateWatchStatusMutation = useUpdateWatchStatus();
  const deleteWatchStatusMutation = useDeleteWatchStatus();
  const submitRatingMutation = useSubmitRating();

  const avgRating = avgRatingData?.average_rating ?? null;
  const ratingCount = avgRatingData?.total_ratings ?? 0;

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync watch status from query into local state once on load
  React.useEffect(() => {
    if (!watchStatusLoading && watchStatusData?.status) {
      setWatchStatus(watchStatusData.status as WatchStatus);
      setWatchStatusSynced(true);
    }
  }, [watchStatusLoading, watchStatusData]);

  // Reset local state only when show ID changes
  React.useEffect(() => {
    setSelectedSeason(null);
    setSeasonEpisodes({});
    setWatchStatusSynced(false);
    setIsEditingReview(false);
    setReviewTab(user_id ? "you" : "all");
  }, [id]);

  // Load Season 1 automatically once show data arrives
  React.useEffect(() => {
    if (showData?.seasons?.some((s: any) => s.season_number === 1)) {
      fetchSeason(1);
    }
  }, [showData]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSeason = async (seasonNumber: number) => {
    if (seasonEpisodes[seasonNumber]) {
      setSelectedSeason(seasonNumber);
      return;
    }
    try {
      const data = await getShowSeason(id!, seasonNumber);
      setSeasonEpisodes((prev: any) => ({
        ...prev,
        [seasonNumber]: {
          episodes: data.episodes,
          overview: data.overview,
          poster_path: data.poster_path,
        },
      }));
      setSelectedSeason(seasonNumber);
    } catch (err) {
      console.error(`Failed to fetch season ${seasonNumber} episodes:`, err);
    }
  };

  const userReview = (userRatings as any[]).find(
    (r: any) => String(r.show_id) === String(id),
  );
  const userHasRated = !!userReview;

  // Populate review form when existing review is found
  React.useEffect(() => {
    if (userReview && !isEditingReview) {
      setRating(userReview.rating);
      setReviewText(userReview.comment || "");
    }
  }, [userReview?.show_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReviewSubmit = async () => {
    if (!user_id) return;
    const payload = {
      user_id,
      show_id: id,
      show_name_lowercase: showData.name.toLowerCase(),
      rating,
      comment: reviewText,
    };
    submitRatingMutation.mutate(payload, {
      onSuccess: () => {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
        setIsEditingReview(false);
        if (user_id && id) {
          updateWatchStatusMutation.mutate({
            user_id,
            show_id: id,
            status: "watched",
          });
          setWatchStatus("watched");
        }
      },
    });
  };

  const handleWatchStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newStatus = event.target.value as WatchStatus;
    setWatchStatus(newStatus);

    if (!user_id || !id) return;

    let message = "";
    if (newStatus === "") {
      deleteWatchStatusMutation.mutate({ user_id, show_id: id });
      message = "Watch Status Cleared";
    } else {
      updateWatchStatusMutation.mutate({
        user_id,
        show_id: id,
        status: newStatus,
      });
      switch (newStatus) {
        case "want_to_watch":
          message = "Added to Want to Watch";
          break;
        case "currently_watching":
          message = "Added to Currently Watching";
          break;
        case "watched":
          message = "Added to Watched";
          break;
      }
    }

    setStatusMessage(message);
    setShowStatusMessage(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowStatusMessage(false), 2500);
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

  const loadingReview = ratingsLoading || watchStatusLoading;

  if (showLoading || !showData || isUserDataLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const seasons =
    showData.seasons?.filter((s: any) => s.season_number > 0) || [];

  // ── Helper: render a list of ReviewCards or an empty state ──────────────────
  const renderReviewList = (reviews: any[], isLoading: boolean) => {
    console.log(reviews)
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      );
    }
    if (reviews.length === 0) {
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
          <ReviewCard
            key={
              review.id ??
              review.rating_id ??
              `${review.user_id}-${review.show_id}`
            }
            showId={review.show_id}
            userId={review.user_id}
            comment={review.comment}
            rating={review.rating}
            compact={false}
            reviewDate={formatRelativeTime(review.timestamp)}
          />
        ))}
      </div>
    );
  };

  const effectiveReviewTab = user_id ? reviewTab : "all";

  return (
    <div className="show-details-container">
      {/* Show information */}
      {!isMobile ? (
        <div className="show-details-upper">
          <img
            src={`https://image.tmdb.org/t/p/w500${showData.poster_path}`}
            alt={showData.name}
            className="show-poster"
          />
          <div className="show-details-info">
            <div className="show-data">
              <div className="show-data-text">
                <div className="show-title-row">
                  <h1 className="title-with-share">
                    {showData.name}
                    <span className="share-inline">
                      <ShareButton
                        title={showData.name}
                        text={`Check out ${showData.name} on Teli!`}
                        url={`${window.location.origin}/show/${id}`}
                      />
                    </span>
                  </h1>
                </div>
                <p>
                  {showData.first_air_date?.slice(0, 4)}-
                  {showData.last_air_date?.slice(0, 4)}
                </p>
                {showData.networks?.[0]?.name && (
                  <p>
                    <strong>Network:</strong> {showData.networks[0].name}
                  </p>
                )}
              </div>
              {avgRating !== null && (
                <div className="show-data-rating">
                  <div className="show-data-rating-score">
                    {avgRating.toFixed(1)}
                  </div>
                  <div className="show-data-rating-reviews">
                    ({ratingCount} ratings)
                  </div>
                </div>
              )}
            </div>
            <p>
              <strong>Overview:</strong>{" "}
              {showData.overview || "No description available."}
            </p>

            {user_id && !loadingReview && (
              <div className="watch-status-row">
                <strong>Watch Status:</strong>
                <select
                  id="watchStatus"
                  value={watchStatus}
                  onChange={handleWatchStatusChange}
                  className="watch-status-dropdown"
                >
                  <option value="">Select...</option>
                  <option value="want_to_watch">Want to Watch</option>
                  <option value="currently_watching">Currently Watching</option>
                  <option value="watched">Watched</option>
                </select>
                {showStatusMessage && statusMessage && (
                  <span className="watch-status-label">{statusMessage}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mobile-show-upper">
            <img
              src={`https://image.tmdb.org/t/p/w500${showData.poster_path}`}
              alt={showData.name}
              className="mobile-show-poster"
            />
            <div className="mobile-show-info">
              <div className="mobile-show-top">
                <div className="show-title-row">
                  <h1 className="mobile-title">{showData.name}</h1>
                  <ShareButton
                    title={showData.name}
                    text={`Check out ${showData.name} on Teli!`}
                    url={`${window.location.origin}/show/${id}`}
                  />
                </div>
                <p className="mobile-date">
                  {showData.first_air_date?.slice(0, 4)}–
                  {showData.last_air_date?.slice(0, 4)}
                </p>
              </div>
              {avgRating !== null && (
                <div className="mobile-rating-wrapper">
                  <div className="show-data-rating">
                    <div className="show-data-rating-score">
                      {avgRating.toFixed(1)}
                    </div>
                    <div className="show-data-rating-reviews">
                      ({ratingCount} ratings)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p>
            <strong>Overview:</strong>{" "}
            {showData.overview || "No description available."}
          </p>

          {user_id && !loadingReview && (
            <div className="watch-status-row">
              <strong>Watch Status:</strong>
              <select
                id="watchStatusMobile"
                value={watchStatus}
                onChange={handleWatchStatusChange}
                className="watch-status-dropdown"
              >
                <option value="">Select...</option>
                <option value="want_to_watch">Want to Watch</option>
                <option value="currently_watching">Currently Watching</option>
                <option value="watched">Watched</option>
              </select>
            </div>
          )}
        </>
      )}

      {/* ================= REVIEWS SECTION ================= */}
      <h2 className="section-header">Reviews</h2>

      {/* 🔥 Keep your original slider UI */}
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

      {/* ===== YOUR REVIEW ===== */}
      {effectiveReviewTab === "you" && (
        <div>
          {!user_id ? (
            <div className="empty-state-card">
              <p>Sign in to leave a review.</p>
            </div>
          ) : loadingReview ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {userHasRated && (
                <>
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
                </>
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
              )}
              {submitted && (
                <div className="review-submit-message">
                  <p>Review submitted!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== FOLLOWING ===== */}
      {effectiveReviewTab === "following" && (
        <div>
          {renderReviewList(followedReviews.results as any[], followedLoading)}
        </div>
      )}

      {/* ===== ALL ===== */}
      {effectiveReviewTab === "all" && (
        <div>{renderReviewList(allReviews as any[], allReviewsLoading)}</div>
      )}

      {/* ================= EPISODES SECTION ================= */}
      <h2 className="section-header">Episodes</h2>

      {/* Season selector */}
      <div className="season-ticker-container">
        <div className="ticker-container">
          {seasons.map((season: any) => (
            <button
              key={season.season_number}
              onClick={() => fetchSeason(season.season_number)}
              className={`ticker-buttons ${
                selectedSeason === season.season_number ? "active" : ""
              }`}
            >
              S{season.season_number}
            </button>
          ))}
        </div>
      </div>

      {/* Season info */}
      {selectedSeason && seasonEpisodes[selectedSeason] && (
        <div className="season-info-container">
          {seasonEpisodes[selectedSeason].poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w300${seasonEpisodes[selectedSeason].poster_path}`}
              className="season-poster"
            />
          )}
          <div>
            <h3>Season {selectedSeason}</h3>
            <p>
              {seasonEpisodes[selectedSeason].overview ||
                "No description available."}
            </p>
          </div>
        </div>
      )}

      {/* Episodes list */}
      {selectedSeason && seasonEpisodes[selectedSeason] && (
        <div className="episode-list-container">
          {seasonEpisodes[selectedSeason].episodes.map((episode: any) => {
            const stillUrl = episode.still_path
              ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
              : null;

            const hasEpisodeReview = (episodeReviews as any[]).some(
              (review: any) => review.episode_number === episode.episode_number,
            );

            return (
              <Link
                key={episode.id}
                to={`/show/${id}/season/${selectedSeason}/episode/${episode.episode_number}`}
                className="episode-container episode-container--link"
              >
                <div className="episode-box">
                  {stillUrl ? (
                    <img src={stillUrl} className="episode-poster" />
                  ) : (
                    <div className="no-img-poster">
                      <Tv size={20} /> No Image
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <strong>
                      {episode.episode_number}. {episode.name}
                    </strong>
                    <p>{episode.overview}</p>
                  </div>
                  {hasEpisodeReview && (
                    <div className="episode-reviewed-badge">✓</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
