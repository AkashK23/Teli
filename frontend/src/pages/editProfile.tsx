import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";

export default function EditProfile() {
  const { userId } = useUser();
  const navigate = useNavigate();
  const url = "http://localhost:5001";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [picture, setPicture] = useState("");
  const [bio, setBio] = useState("");
  const [watched, setWatched] = useState<string[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<string[]>([]);

  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [mostWatchedShows, setMostWatchedShows] = useState<any[]>([]);

  // Fetch existing user info to prepopulate
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${url}/user/${userId}`);
        console.log(res)
        if (res.data) {
          setName(res.data.name || "");
          setUsername(res.data.username || "");
          setEmail(res.data.email || "");
          setPicture(res.data.picture || "");
          setBio(res.data.bio || "");
        }

        const mostWatchedShows_backend = await axios.get(`${url}/shows/filter`, {
            params: {
            without_genres: "10767,10763",
            sort_by: "popularity.desc",
            page: 1,
            },
        });
        setMostWatchedShows(mostWatchedShows_backend.data.results);
        console.log(mostWatchedShows_backend.data.results);

        const popularShows_backend = await axios.get(`${url}/shows/popular`, {
          params: { timeframe: 100, num_most_popular: 20 },
        });
        setPopularShows(popularShows_backend.data.popular_shows);
        console.log(popularShows_backend.data.popular_shows);
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

  const handleSubmit = async () => {
    try {
      const resUpdate = await axios.put(`${url}/user/${userId}/profile`, {
        username,
        email,
        name,
        bio,
        picture,
      });
      console.log(resUpdate);


      const requestsWatched = watched.map((show) =>
        axios.post(`${url}/update_watch_status`, {
          user_id: userId,
          show_id: show,
          status: "watched",
        })
      );

      await Promise.all(requestsWatched);

      const requestsCurrentlyWatching = currentlyWatching.map((show) =>
        axios.post(`${url}/update_watch_status`, {
          user_id: userId,
          show_id: show,
          status: "currently Watching",
        })
      );

      await Promise.all(requestsCurrentlyWatching);

      navigate(`/profile`);
    } catch (err) {
      console.error("Failed to save onboarding:", err);
    }
  };

  return (
    <div className="onboarding-container">
      <h1 className="onboarding-title">Edit Profile</h1>

      <div className="onboarding-form">
        {/* Name */}
        <div className="onboarding-field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Username */}
        <div className="onboarding-field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="onboarding-field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {/* Picture */}
        <div className="onboarding-field">
          <label>Profile Picture</label>
          {picture && (
            <img
              src={
                picture
                  ? picture.replace(/=s\d+-c$/, "=s512-c")
                  : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
              }
              className="onboarding-pic-preview"
            />
          )}
        </div>

        {/* Bio */}
        <div className="onboarding-field">
          <label>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        

        <button className="onboarding-submit" onClick={handleSubmit}>
          Update
        </button>
      </div>
    </div>
  );
}
