import { useParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from "../UserContext";

type WatchStatus = "want_to_watch" | "currently_watching" | "watched" | "";

 /* Show details page */
export default function ShowDetails() {
  const url = process.env.REACT_APP_API_URL;
  const user_id = useUser().userId;

  const { id } = useParams();
  const [showData, setShowData] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userHasRated, setUserHasRated] = useState(false);
  const [loadingReview, setLoadingReview] = useState(true);
  const [episodeReviews, setEpisodeReviews] = useState<any[]>([]);
  const [episodeReviewStates, setEpisodeReviewStates] = useState<
    Record<number, { open: boolean; rating: number; text: string }>
  >({});
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("");
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* Pull show data from backend */
  useEffect(() => {
    let isMounted = true; // prevent race conditions

    const fetchData = async () => {
      try {
        // 🔹 Reset all show-specific states right away
        setSelectedSeason(null);
        setSeasonEpisodes([]);
        setShowData(null);
        setWatchStatus(""); // reset watch status
        setReviews([]);
        setUserHasRated(false);
        setRating(0);
        setReviewText("");
        setEpisodeReviews([]);
        setEpisodeReviewStates({});

        const res = await axios.get(`${url}/shows/${id}`);
        if (isMounted) setShowData(res.data);
      } catch (err) {
        console.error("Failed to fetch show details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false; // ✅ prevents stale updates if you navigate quickly
    };
  }, [id]);

  /* Get average rating of show */
  useEffect(() => {
    if (!id) return;

    const fetchAverageRating = async () => {
      try {
        const res = await axios.get(`${url}/shows/${id}/average-rating`);
        if (res.data) {
          setAvgRating(res.data.average_rating);
          setRatingCount(res.data.total_ratings);
        }
      } catch (err) {
        console.error("Failed to fetch average rating:", err);
      }
    };

    fetchAverageRating();
  }, [id]);


  // Fetch user review if userId exists
  useEffect(() => {
    if (!user_id) {
      setReviews([]);
      setUserHasRated(false);
      setLoadingReview(false);
      return;
    }

    const fetchUserReview = async () => {
      try {
        setLoadingReview(true);
        const res = await axios.get(`${url}/users/${user_id}/ratings`);
        const userReview = res.data.find(
          (r: any) => String(r.show_id) === String(id)
        );
        if (userReview) {
          setReviews([userReview]);
          setUserHasRated(true);
          setRating(userReview.rating);
          setReviewText(userReview.comment);
        } else {
          setReviews([]);
          setUserHasRated(false);
          setRating(0);
          setReviewText("");
        }
      } catch (err) {
        console.error("Failed to fetch user review:", err);
      } 
    };

    fetchUserReview();
  }, [user_id, id]);

  // Fetch existing status from backend
  useEffect(() => {
    if (!user_id) return;

    const fetchWatchStatus = async () => {
      try {
        const res = await axios.get(
          `${url}/users/${user_id}/watch_status/${id}`
        );
        console.log(res.data.status);
        if (res.data?.status) {
          setWatchStatus(res.data.status as WatchStatus);
        }
      } catch (err) {
        console.error("Error fetching watch status:", err);
      } finally {
        setLoadingReview(false);
      }
    };

    fetchWatchStatus();
  }, [user_id, id]);

  // After showData is updated, load Season 1 if available
  useEffect(() => {
    if (showData?.seasons?.some((s: any) => s.season_number === 1)) {
      fetchSeason(1);
    }
  }, [showData]);

  useEffect(() => {
    if (!user_id || !id || !selectedSeason) return;

    fetchEpisodeReviews();
  }, [user_id, id, selectedSeason]);


  /* Pull season data from backend */
  const fetchSeason = async (seasonNumber: number) => {
    if (seasonEpisodes[seasonNumber]) {
      setSelectedSeason(seasonNumber);
      setEpisodeReviewStates({});
      return;
    }

    try {
      const res = await axios.get(`${url}/shows/${id}/season/${seasonNumber}`);
      const data = res.data;
      // console.log(data);

      setSeasonEpisodes((prev) => ({
        ...prev,
        [seasonNumber]: {
          episodes: data.episodes,
          overview: data.overview,
          poster_path: data.poster_path,
        },
      }));

      setSelectedSeason(seasonNumber);
      setEpisodeReviewStates({});
    } catch (err) {
      console.error(`Failed to fetch season ${seasonNumber} episodes:`, err);
    }
  };

  /* Pull user reviews of the show from backend */
  const fetchReviews = async () => {
    const reviews_backend = await axios.get(`${url}/users/${user_id}/ratings`);
    setReviews(reviews_backend.data);
    setUserHasRated(
      reviews_backend.data.some((r: any) => String(r.show_id) === String(id))
    );
  };

  /* Pull user reviews of episodes from backend */
  const fetchEpisodeReviews = async () => {
    const episode_reviews_backend = await axios.get(
      `${url}/users/${user_id}/shows/${id}/season/${selectedSeason}/ratings`
    );
    // console.log("episode reviews:", episode_reviews_backend.data);

    setEpisodeReviews(episode_reviews_backend.data);
  };

  /* Show review submit function */
  const handleReviewSubmit = async () => {
    if (!user_id) return;

    const payload = {
      user_id: user_id, // Replace with actual user ID
      show_id: id, // ID from URL params
      show_name_lowercase: showData.name.toLowerCase(),
      rating: rating,
      comment: reviewText,
    };

    try {
      const res = await axios.post(`${url}/ratings`, payload);
      console.log("Review submitted:", res.data);

      await fetchReviews();

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setReviewText("");
      setRating(0);

      setWatchStatus("watched");
      const payloadWatchStatus = {
        user_id: user_id,
        show_id: id,
        status: "watched",
        // current_season:1,
        // current_episode:1,
      };

      try {
        const res = await axios.post(
          `${url}/update_watch_status`,
          payloadWatchStatus
        );
      } catch (err) {
        console.error("Error changing watch status:", err);
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    }
  };

  /* Episode review submit function */
  const submitEpisodeReview = async (
    episodeNumber: number,
    seasonNumber: number
  ) => {
    const state = episodeReviewStates[episodeNumber];
    if (!state || state.text.trim() === "") return;

    const payload = {
      user_id: user_id,
      show_id: id,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      rating: state.rating,
      comment: state.text,
    };

    try {
      const res = await axios.post(`${url}/episode_ratings`, payload);
      console.log("Episode review submitted:", res.data);

      setEpisodeReviewStates((prev) => ({
        ...prev,
        [episodeNumber]: {
          ...prev[episodeNumber],
          open: false,
          text: "",
          rating: 0,
        },
      }));

      await fetchEpisodeReviews();
    } catch (err) {
      console.error("Error submitting episode review:", err);
    }
  };

  if (!showData) return <div>Loading...</div>;

  const seasons =
    showData.seasons?.filter((s: any) => s.season_number > 0) || [];

  /* Toggle episode review visibility */
  const toggleEpisodeReview = (episodeNumber: number) => {
    const existingReview = episodeReviews.find(
      (review: any) => review.episode_number === episodeNumber
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


  /* Update review submit function */
  const updateEpisodeReview = (
    episodeId: number,
    field: "rating" | "text",
    value: string | number
  ) => {
    setEpisodeReviewStates((prev) => ({
      ...prev,
      [episodeId]: {
        ...prev[episodeId],
        [field]: value,
      },
    }));
  };

  /* Change watch status */
  const handleWatchStatusChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = event.target.value as WatchStatus;
    setWatchStatus(newStatus);

    if (newStatus == "") {
      const payload = {
        user_id: user_id,
        show_id: id,
      };

      try {
        const res = await axios.post(`${url}/delete_watch_status`, payload);
        console.log("Watch Status deleted:", res.data);
      } catch (err) {
        console.error("Error changing watch status:", err);
      }
    } else {
      const payload = {
        user_id: user_id,
        show_id: id,
        status: newStatus,
        // current_season:1,
        // current_episode:1,
      };

      try {
        const res = await axios.post(`${url}/update_watch_status`, payload);
        console.log("Watch Status updated:", res.data);
      } catch (err) {
        console.error("Error changing watch status:", err);
      }
    }

    // if (newStatus == "want_to_watch") {

    // } else if (newStatus == "currently_watching") {
    // } else if (newStatus == "watched") {
    // }
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
            {/* LEFT: Title + Metadata */}
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

            {/* RIGHT: Rating */}
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

          {/* --- Watch Status Dropdown --- */}
          {user_id && !loadingReview && (
            <div>
              <strong>Watch Status:</strong>
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
            </div>
          )}
        </div>
      </div>

      {/* Your Review */}
      {user_id && !loadingReview && (
        <>
          {userHasRated && <h3 className="headings">Your Review</h3>}

          {userHasRated && (
            <div className="rating-cards-container">
              {reviews
                .filter((review: any) => review.show_id === id)
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
                      onMouseEnter={(e) => (
                        (e.currentTarget.style.color = "white"),
                        (e.currentTarget.style.backgroundColor = "#333")
                      )}
                      onMouseLeave={(e) => (
                        (e.currentTarget.style.color = "#333"),
                        (e.currentTarget.style.backgroundColor = "transparent")
                      )}
                    >
                      {isEditingReview ? "Cancel" : "Update"}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Write a Review Section */}
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

                  {userHasRated ? (
                    <button
                      onClick={handleReviewSubmit}
                      className="submit-review-button"
                    >
                      Update
                    </button>
                  ) : (
                    <button
                      onClick={handleReviewSubmit}
                      className="submit-review-button"
                    >
                      Submit
                    </button>
                  )}
                  {submitted && <p>Review submitted!</p>}
                </div>
              </div>
            </div>
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
          <div className="episode-list-container">
            {seasonEpisodes[selectedSeason].episodes.map((episode: any) => {
              const stillUrl = episode.still_path
                ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
                : null;

              const epState = episodeReviewStates[episode.episode_number] || {
                open: false,
                rating: 0,
                text: "",
              };

              const hasEpisodeReview = episodeReviews.some(
                (review: any) =>
                  review.episode_number === episode.episode_number
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

                    {user_id && !loadingReview && (
                      <>
                        {/* Review toggle button */}
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
                      </>
                    )}
                  </div>

                  {/* Review form dropdown */}
                  {epState.open && (
                    <div className="episode-review-container">
                      {episodeReviews
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
                            {episodeReviews.some(
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
        </div>
      )}
    </div>
  );
}
