import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

export const getGenres = () =>
  axios.get(`${BASE_URL}/genres`).then((r) => r.data.data);

export const getCountries = () =>
  axios.get(`${BASE_URL}/countries`).then((r) => r.data.data);

export const getLanguages = () =>
  axios.get(`${BASE_URL}/languages`).then((r) => r.data.data);
