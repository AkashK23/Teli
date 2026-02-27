import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

export const getUserProfile = (userId: string) =>
  axios.get(`${BASE_URL}/user/${userId}`).then((r) => r.data);

export const getUserRatings = (userId: string) =>
  axios.get(`${BASE_URL}/users/${userId}/ratings`).then((r) => r.data);

export const getUserFeed = (userId: string) =>
  axios.get(`${BASE_URL}/users/${userId}/feed`).then((r) => r.data.feed);

export const getUserWatchList = (userId: string, status: string) =>
  axios.get(`${BASE_URL}/users/${userId}/${status}`).then((r) => r.data);

export const getUserFollowers = (userId: string) =>
  axios
    .get(`${BASE_URL}/users/${userId}/followers`)
    .then((r) => r.data.followers);

export const getUserFollowing = (userId: string) =>
  axios
    .get(`${BASE_URL}/users/${userId}/following`)
    .then((r) => r.data.following);

export const getUserWatchStatus = (userId: string, showId: string) =>
  axios
    .get(`${BASE_URL}/users/${userId}/watch_status/${showId}`)
    .then((r) => r.data);

export const getEpisodeReviews = (
  userId: string,
  showId: string,
  seasonNumber: number
) =>
  axios
    .get(
      `${BASE_URL}/users/${userId}/shows/${showId}/season/${seasonNumber}/ratings`
    )
    .then((r) => r.data);

export const searchUsers = (query: string, page: number) =>
  axios
    .get(`${BASE_URL}/users/search`, { params: { query, page } })
    .then((r) => r.data);

export const postFollow = (followerId: string, followeeId: string) =>
  axios
    .post(`${BASE_URL}/follow`, {
      follower_id: followerId,
      followee_id: followeeId,
    })
    .then((r) => r.data);

export const postUnfollow = (followerId: string, followeeId: string) =>
  axios
    .post(`${BASE_URL}/unfollow`, {
      follower_id: followerId,
      followee_id: followeeId,
    })
    .then((r) => r.data);

export const updateWatchStatus = (payload: {
  user_id: string;
  show_id: string;
  status: string;
}) => axios.post(`${BASE_URL}/update_watch_status`, payload).then((r) => r.data);

export const deleteWatchStatus = (payload: {
  user_id: string;
  show_id: string;
}) => axios.post(`${BASE_URL}/delete_watch_status`, payload).then((r) => r.data);

export const updateUserProfile = (userId: string, data: object) =>
  axios.put(`${BASE_URL}/user/${userId}/profile`, data).then((r) => r.data);

export const deleteUser = (userId: string) =>
  axios.delete(`${BASE_URL}/user/${userId}`).then((r) => r.data);
