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
