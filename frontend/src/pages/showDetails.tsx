import { useParams } from 'react-router-dom';
import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from "../UserContext";
import ProtectedSection from "../components/ProtectedSection";

type WatchStatus = "want_to_watch" | "currently_watching" | "watched" | "";

 /* Show details page */
export default function ShowDetails() {
  const url = `http://localhost:5001`;
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
  const [loadingShow, setLoadingShow] = useState(true);
  const [loadingReview, setLoadingReview] = useState(true);
  const [episodeReviews, setEpisodeReviews] = useState<any[]>([]);
  const [episodeReviewStates, setEpisodeReviewStates] = useState<
    Record<number, { open: boolean; rating: number; text: string }>
  >({});
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("");

  /* Pull show data from backend */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSelectedSeason(null);
        setSeasonEpisodes([]);
        setShowData(null);
        setLoadingShow(true);
        const res = await axios.get(`${url}/shows/${id}`);
        setShowData(res.data);

        // await fetchReviews();
      } catch (err) {
        console.error("Failed to fetch show details:", err);
      } finally {
        setLoadingShow(false);
      }
    };

    fetchData();
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
      } finally {
        setLoadingReview(false);
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
          `http://localhost:5001/users/${user_id}/watch_status/${id}`
        );
        console.log(res.data.status);
        if (res.data?.status) {
          setWatchStatus(res.data.status as WatchStatus);
        }
      } catch (err) {
        console.error("Error fetching watch status:", err);
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
    fetchEpisodeReviews();
    setEpisodeReviewStates((prev) => ({
      ...prev,
      [episodeNumber]: {
        ...prev[episodeNumber],
        open: !prev[episodeNumber]?.open,
        rating: prev[episodeNumber]?.rating || 0,
        text: prev[episodeNumber]?.text || "",
      },
    }));
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

    }
    else {
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

  if (loadingShow) return <div>Loading show details...</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "2rem auto", padding: "0 1rem" }}>
      {/* Show information */}
      <div
        className="show-details-container"
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
        }}
      >
        <img
          src={`https://image.tmdb.org/t/p/w500${showData.poster_path}`}
          alt={showData.name}
          style={{ width: "300px", borderRadius: "10px" }}
        />
        <div>
          <h1 style={{ marginBottom: "1rem" }}>{showData.name}</h1>
          <p>
            {showData.first_air_date?.slice(0, 4)}-
            {showData.last_air_date?.slice(0, 4)}
          </p>
          {showData.networks?.[0]?.name && (
            <p>
              <strong>Network:</strong> {showData.networks[0].name}
            </p>
          )}
          <p>
            <strong>Overview:</strong>{" "}
            {showData.overview || "No description available."}
          </p>

          {/* --- Watch Status Dropdown --- */}
          {user_id && !loadingReview && (
            <div style={{ marginTop: "1rem" }}>
              <label htmlFor="watchStatus" style={{ fontWeight: "bold" }}>
                Watch Status:
              </label>
              <select
                id="watchStatus"
                value={watchStatus}
                onChange={handleWatchStatusChange}
                style={{
                  marginLeft: "0.5rem",
                  marginTop: "2rem",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  fontSize: "1rem",
                }}
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
          {userHasRated && (
            <h2
              className="text-lg font-semibold mb-2"
              style={{ marginBottom: "2rem" }}
            >
              Your Review
            </h2>
          )}

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
                  </div>
                ))}
            </div>
          )}

          {/* Write a Review Section */}

          <div style={{ marginTop: "3rem" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <div style={{ marginTop: "2rem" }}>
                  {userHasRated ? (
                    <h2 className="text-lg font-semibold mb-2">
                      Update Review
                    </h2>
                  ) : (
                    <h2 className="text-lg font-semibold mb-2">Review</h2>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      style={{
                        width: "90%",
                        appearance: "none",
                        height: "6px",
                        background: "#ddd",
                        borderRadius: "5px",
                        outline: "none",
                        padding: "0",
                        margin: "0",
                      }}
                    />
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "3rem",
                        color: "#333",
                        marginLeft: "1rem",
                        width: "40px",
                        textAlign: "right",
                        marginRight: "2rem",
                      }}
                    >
                      {rating}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <textarea
                  id="reviewText"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  placeholder="What did you think of this show?"
                  style={{
                    width: "100%",
                    padding: "1rem",
                    fontSize: "1rem",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    resize: "vertical",
                  }}
                />
              </div>

              {userHasRated ? (
                <button
                  onClick={handleReviewSubmit}
                  style={{
                    backgroundColor: "#333",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  Update Review
                </button>
              ) : (
                <button
                  onClick={handleReviewSubmit}
                  style={{
                    backgroundColor: "#333",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  Submit Review
                </button>
              )}
              {submitted && <p style={{ color: "green" }}>Review submitted!</p>}
            </div>
          </div>
        </>
      )}

      {/* Season ticker */}
      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <h3>Seasons</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "1rem",
          }}
        >
          {seasons.map((season: any) => (
            <button
              key={season.season_number}
              onClick={() => fetchSeason(season.season_number)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "2px solid #333",
                background:
                  selectedSeason === season.season_number ? "#333" : "white",
                color:
                  selectedSeason === season.season_number ? "white" : "#333",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              S{season.season_number}
            </button>
          ))}
        </div>
      </div>

      {/* Season overview and poster */}
      {selectedSeason && seasonEpisodes[selectedSeason] && (
        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            gap: "2rem",
            alignItems: "flex-start",
          }}
        >
          {seasonEpisodes[selectedSeason].poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w300${seasonEpisodes[selectedSeason].poster_path}`}
              alt={`Season ${selectedSeason} Poster`}
              style={{ borderRadius: "8px", width: "200px" }}
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
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Episodes</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
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

              return (
                <div
                  key={episode.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    background: "#f4f4f4",
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {stillUrl ? (
                      <img
                        src={stillUrl}
                        alt={`Episode ${episode.episode_number}`}
                        style={{
                          width: "160px",
                          height: "90px",
                          objectFit: "cover",
                          borderRadius: "6px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "160px",
                          height: "90px",
                          background: "#ccc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "6px",
                          color: "#666",
                          fontSize: "0.9rem",
                        }}
                      >
                        No Image
                      </div>
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
                          style={{
                            backgroundColor: "#333",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            height: "fit-content",
                            alignSelf: "center",
                          }}
                        >
                          {epState.open ? "Hide Review" : "Review"}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Review form dropdown */}
                  {epState.open && (
                    <div
                      style={{
                        marginLeft: "170px",
                        marginTop: "0.5rem",
                      }}
                    >
                      <div
                        className="rating-cards-container"
                        style={{
                          marginBottom: "1rem",
                        }}
                      >
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
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
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
                          style={{
                            width: "90%",
                            appearance: "none",
                            height: "6px",
                            background: "#ddd",
                            borderRadius: "5px",
                            outline: "none",
                            padding: "0",
                            margin: "0",
                          }}
                        />
                        <span
                          style={{
                            fontWeight: "bold",
                            fontSize: "2rem",
                            color: "#333",
                            marginLeft: "1rem",
                            width: "30px",
                            textAlign: "right",
                          }}
                        >
                          {epState.rating}
                        </span>
                      </div>

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
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          borderRadius: "8px",
                          border: "1px solid #ccc",
                          marginTop: "1rem",
                          resize: "vertical",
                        }}
                      />

                      <button
                        style={{
                          marginTop: "0.5rem",
                          backgroundColor: "#333",
                          color: "white",
                          border: "none",
                          padding: "0.4rem 0.8rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
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
                          ? "Update Review"
                          : "Submit Review"}
                      </button>
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
