import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

export const getShowDetails = (showId: string | number) =>
  axios.get(`${BASE_URL}/shows/${showId}`).then((r) => r.data);

export const getShowAverageRating = (showId: string | number) =>
  axios.get(`${BASE_URL}/shows/${showId}/average-rating`).then((r) => r.data);

export const getPopularShows = (timeframe: number, count: number) =>
  axios
    .get(`${BASE_URL}/shows/popular`, {
      params: { timeframe, num_most_popular: count },
    })
    .then((r) => r.data.popular_shows);

export const filterShows = (params: Record<string, string>) =>
  axios.get(`${BASE_URL}/shows/filter`, { params }).then((r) => r.data);

export const searchShows = (query: string, page: number) =>
  axios
    .get(`${BASE_URL}/shows/search`, { params: { query, page } })
    .then((r) => r.data);

export const getShowSeason = (showId: string, seasonNumber: number) =>
  axios
    .get(`${BASE_URL}/shows/${showId}/season/${seasonNumber}`)
    .then((r) => r.data);

export const submitRating = (payload: object) =>
  axios.post(`${BASE_URL}/ratings`, payload).then((r) => r.data);

export const submitEpisodeRating = (payload: object) =>
  axios.post(`${BASE_URL}/episode_ratings`, payload).then((r) => r.data);

// Fetches reviews from users the current user follows, for a specific show
export const getFollowedShowReviews = (userId: string, showId: string) =>
  axios
    .get(`${BASE_URL}/users/${userId}/followed-reviews/shows/${showId}`)
    .then((r) => r.data);

// Fetches all user ratings/reviews for a specific show
export const getAllShowRatings = (showId: string) =>
  axios
    .get(`${BASE_URL}/shows/${showId}/ratings`)
    .then((r) => r.data);

    // Fetches reviews from users the current user follows, for a specific show
export const getFollowedEpisodeReviews = (userId: string, showId: string, season: number, episode: number) =>
  axios
    .get(`${BASE_URL}/users/${userId}/followed-reviews/shows/${showId}/season/${season}/episode/${episode}`)
    .then((r) => r.data);

// Fetches all user ratings/reviews for a specific show
export const getAllEpisodeRatings = (userId: string, showId: string, season: number, episode: number) =>
  axios
    .get(`${BASE_URL}/shows/${showId}/season/${season}/episode/${episode}/ratings`)
    .then((r) => r.data);

export const getEpisodeAverageRating =  (showId: string, seasonNumber: number, episodeNumber: number) => 
  axios
  .get(`${BASE_URL}/shows/${showId}/season/${seasonNumber}/episode/${episodeNumber}/average-rating`)
  .then((r) => r.data);

export const getSeasonEpisodeRatings = async (
  showId: string,
  seasonNumber: number,
  episodes: Array<{ episode_number: number }>,
): Promise<Record<string, { average_rating: number; total_ratings: number }>> => {
  const results = await Promise.allSettled(
    episodes.map((ep) =>
      getEpisodeAverageRating(showId, seasonNumber, ep.episode_number).then(
        (data) => ({ episodeNumber: ep.episode_number, data }),
      ),
    ),
  );

  const map: Record<string, { average_rating: number; total_ratings: number }> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      map[String(result.value.episodeNumber)] = result.value.data;
    }
  }
  return map;
};

// Fetches all user ratings/reviews for a specific show
export const getSuggestedShows = (userId: string) =>
  axios
    .get(`${BASE_URL}/users/${userId}/suggested-shows`)
    .then((r) => r.data);
 