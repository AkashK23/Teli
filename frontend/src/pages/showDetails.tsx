import { useParams } from "react-router-dom";
import React, { useState } from "react";
import { useUser } from "../UserContext";
import { useToast } from "../ToastContext";
import { useShowDetails, useShowAverageRating } from "../hooks/useShow";
import {
  useUserRatings,
  useUserWatchStatus,
  useEpisodeReviews,
} from "../hooks/useUser";
import {
  useUpdateWatchStatus,
  useDeleteWatchStatus,
  useSubmitRating,
  useSubmitEpisodeRating,
} from "../hooks/useMutations";
import { getShowSeason } from "../api/shows";

type WatchStatus = "want_to_watch" | "currently_watching" | "watched" | "";

export default function ShowDetails() {
  const user_id = useUser().userId;
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any>({});
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [episodeReviewStates, setEpisodeReviewStates] = useState<
    Record<number, { open: boolean; rating: number; text: string }>
  >({});
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("");
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [watchStatusSynced, setWatchStatusSynced] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  const { data: showData, isLoading: showLoading } = useShowDetails(id);
  const { data: avgRatingData } = useShowAverageRating(id);
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);
  const { data: watchStatusData, isLoading: watchStatusLoading } =
    useUserWatchStatus(user_id, id);
  const { data: episodeReviews = [], isLoading: episodeReviewsLoading } =
    useEpisodeReviews(user_id, id, selectedSeason);

  const updateWatchStatusMutation = useUpdateWatchStatus();
  const deleteWatchStatusMutation = useDeleteWatchStatus();
  const submitRatingMutation = useSubmitRating();
  const submitEpisodeRatingMutation = useSubmitEpisodeRating();

  const avgRating = avgRatingData?.average_rating ?? null;
  const ratingCount = avgRatingData?.total_ratings ?? 0;

  // Sync watch status from query into local state once on load
  React.useEffect(() => {
    if (!watchStatusLoading && !watchStatusSynced && watchStatusData?.status) {
      setWatchStatus(watchStatusData.status as WatchStatus);
      setWatchStatusSynced(true);
    }
  }, [watchStatusLoading, watchStatusSynced, watchStatusData]);

  // Reset local state when show ID changes
  React.useEffect(() => {
    setSelectedSeason(null);
    setSeasonEpisodes({});
    setWatchStatus("");
    setWatchStatusSynced(false);
    setReviewText("");
    setRating(0);
    setEpisodeReviewStates({});
    setIsEditingReview(false);
    setShowAllEpisodes(false);
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
      setEpisodeReviewStates({});
      setShowAllEpisodes(false);
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
      setEpisodeReviewStates({});
      setShowAllEpisodes(false);
    } catch (err) {
      console.error(`Failed to fetch season ${seasonNumber} episodes:`, err);
    }
  };

  const userReview = (userRatings as any[]).find(
    (r: any) => String(r.show_id) === String(id)
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
        showToast(userHasRated ? "Review updated!" : "Review submitted!");
        setReviewText("");
        setRating(0);
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

  const submitEpisodeReview = (episodeNumber: number, seasonNumber: number) => {
    const state = episodeReviewStates[episodeNumber];
    if (!state || state.text.trim() === "") return;
    const hasExisting = (episodeReviews as any[]).some(
      (r: any) => r.episode_number === episodeNumber
    );
    const payload = {
      user_id,
      show_id: id,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      rating: state.rating,
      comment: state.text,
    };
    submitEpisodeRatingMutation.mutate(payload, {
      onSuccess: () => {
        showToast(hasExisting ? "Episode review updated!" : "Episode review submitted!");
        setEpisodeReviewStates((prev) => ({
          ...prev,
          [episodeNumber]: { ...prev[episodeNumber], open: false, text: "", rating: 0 },
        }));
      },
    });
  };

  const handleWatchStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = event.target.value as WatchStatus;
    setWatchStatus(newStatus);
    if (!user_id || !id) return;

    if (newStatus === "") {
      deleteWatchStatusMutation.mutate({ user_id, show_id: id });
    } else {
      updateWatchStatusMutation.mutate({ user_id, show_id: id, status: newStatus });
    }
  };

  const toggleEpisodeReview = (episodeNumber: number) => {
    const existingReview = (episodeReviews as any[]).find(
      (r: any) => r.episode_number === episodeNumber
    );
    setEpisodeReviewStates((prev) => {
      const isOpen = prev[episodeNumber]?.open;
      return {
        ...prev,
        [episodeNumber]: {
          open: !isOpen,
          rating: existingReview?.rating ?? prev[episodeNumber]?.rating ?? 0,
          text: existingReview?.comment ?? prev[episodeNumber]?.text ?? "",
        },
      };
    });
  };

  const updateEpisodeReview = (
    episodeId: number,
    field: "rating" | "text",
    value: string | number
  ) => {
    setEpisodeReviewStates((prev) => ({
      ...prev,
      [episodeId]: { ...prev[episodeId], [field]: value },
    }));
  };

  if (showLoading || !showData) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const seasons =
    showData.seasons?.filter((s: any) => s.season_number > 0) || [];

  return (
    <div className="show-details-container">
      {/* Show information */}
      <div className="show-details-upper">
        <img
          src={`https://image.tmdb.org/t/p/w500${showData.poster_path}`}
          alt={showData.name}
          className="show-poster"
        />
        <div className="show-details-info">
          <div className="show-data">
            <div className="show-data-text">
              <h1>{showData.name}</h1>
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

          {user_id && (
            <div>
              <strong>Watch Status:</strong>
              {watchStatusLoading ? (
                <span style={{ marginLeft: "0.5rem", color: "#aaa" }}>...</span>
              ) : (
                <select
                  id="watchStatus"
                  value={watchStatus}
                  onChange={handleWatchStatusChange}
                  className="watch-status-dropdown"
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f0f0f0")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f9f9f9")
                  }
                >
                  <option value="">Select...</option>
                  <option value="want_to_watch">Want to Watch</option>
                  <option value="currently_watching">Currently Watching</option>
                  <option value="watched">Watched</option>
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Your Review — always reserve space, show spinner while loading */}
      {user_id && (
        <>
          {ratingsLoading ? (
            <div className="review-section-loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {userHasRated && <h3 className="headings">Your Review</h3>}

              {userHasRated && (
                <div className="rating-cards-container">
                  {[userReview]
                    .filter((review: any) => String(review.show_id) === String(id))
                    .map((review: any) => (
                      <div className="rating-card" key={review.show_id}>
                        <div className="rating-details">
                          <div className="rating-score">{review.rating}</div>
                          <div className="rating-text">
                            <p>{review.comment}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsEditingReview((prev) => !prev)}
                          className="edit-review-button"
                          onMouseEnter={(e) => {
                            (e.currentTarget.style.color = "white");
                            (e.currentTarget.style.backgroundColor = "#333");
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget.style.color = "#333");
                            (e.currentTarget.style.backgroundColor = "transparent");
                          }}
                        >
                          {isEditingReview ? "Cancel" : "Update"}
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {(!userHasRated || isEditingReview) && (
                <div>
                  {!userHasRated && <h3 className="headings">Review</h3>}
                  <div className="write-review-container">
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        style={
                          { "--slider-fill": `${rating * 10}%` } as React.CSSProperties
                        }
                      />
                      <span>{rating}</span>
                    </div>
                    <div className="review-input-group">
                      <textarea
                        id="reviewText"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={4}
                        placeholder="What did you think of this show?"
                        className="review-textbox"
                      />
                      <button
                        onClick={handleReviewSubmit}
                        className="submit-review-button"
                      >
                        {userHasRated ? "Update" : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Season ticker */}
      <div className="season-ticker-container">
        <h3 className="headings">Seasons</h3>
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

      {/* Season overview and poster */}
      {selectedSeason && seasonEpisodes[selectedSeason] && (
        <div className="season-info-container">
          {seasonEpisodes[selectedSeason].poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w300${seasonEpisodes[selectedSeason].poster_path}`}
              alt={`Season ${selectedSeason} Poster`}
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
        <div>
          <h3 className="episodes-header">Episodes</h3>
          <div
            className={`episode-list-container${
              showAllEpisodes ? "" : " episode-list-collapsed"
            }`}
          >
            {seasonEpisodes[selectedSeason].episodes.map((episode: any) => {
              const stillUrl = episode.still_path
                ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
                : null;

              const epState = episodeReviewStates[episode.episode_number] || {
                open: false,
                rating: 0,
                text: "",
              };

              const hasEpisodeReview = (episodeReviews as any[]).some(
                (review: any) => review.episode_number === episode.episode_number
              );

              return (
                <div key={episode.id} className="episode-container">
                  <div className="episode-box">
                    {stillUrl ? (
                      <img
                        src={stillUrl}
                        alt={`Episode ${episode.episode_number}`}
                        className="episode-poster"
                      />
                    ) : (
                      <div className="no-img-poster">No Image</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <strong>
                        {episode.episode_number}. {episode.name}
                      </strong>
                      <p style={{ marginTop: "0.5rem" }}>
                        {episode.overview || "No description available."}
                      </p>
                    </div>

                    {user_id && !episodeReviewsLoading && (
                      <button
                        onClick={() =>
                          toggleEpisodeReview(episode.episode_number)
                        }
                        className={`episode-review-button ${
                          hasEpisodeReview ? "has-review" : "no-review"
                        }`}
                      >
                        {epState.open
                          ? "Hide"
                          : hasEpisodeReview
                          ? "Update"
                          : "Review"}
                      </button>
                    )}
                  </div>

                  {epState.open && (
                    <div className="episode-review-container">
                      {(episodeReviews as any[])
                        .filter(
                          (review: any) =>
                            review.episode_number === episode.episode_number
                        )
                        .map((review: any) => (
                          <div
                            className="rating-card"
                            key={review.episode_number}
                          >
                            <div className="rating-details">
                              <div className="rating-score">
                                {review.rating}
                              </div>
                              <div className="rating-text">
                                <p>{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      <div className="write-review-container">
                        <div className="slider-container">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={epState.rating}
                            onChange={(e) =>
                              updateEpisodeReview(
                                episode.episode_number,
                                "rating",
                                Number(e.target.value)
                              )
                            }
                            style={
                              {
                                "--slider-fill": `${epState.rating * 10}%`,
                              } as React.CSSProperties
                            }
                          />
                          <span>{epState.rating}</span>
                        </div>
                        <div className="review-input-group">
                          <textarea
                            value={epState.text}
                            onChange={(e) =>
                              updateEpisodeReview(
                                episode.episode_number,
                                "text",
                                e.target.value
                              )
                            }
                            rows={3}
                            placeholder="What did you think of this episode?"
                            className="review-textbox"
                          />
                          <button
                            className="submit-review-button"
                            onClick={() =>
                              submitEpisodeReview(
                                episode.episode_number,
                                selectedSeason!
                              )
                            }
                          >
                            {(episodeReviews as any[]).some(
                              (review: any) =>
                                review.episode_number === episode.episode_number
                            )
                              ? "Update"
                              : "Submit"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {seasonEpisodes[selectedSeason].episodes.length > 5 && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllEpisodes((prev) => !prev)}
            >
              {showAllEpisodes
                ? "Show Less"
                : `Show All ${seasonEpisodes[selectedSeason].episodes.length} Episodes`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
