import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";



export default function Home() {

const [userInfo, setUserInfo] = useState<any>(null);
const [ratings, setRatings] = useState<any[]>([]);
const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
const [currentlyWatching, setCurrentlyWatching] = useState<any[]>([]);
const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] = useState<any[]>([]);
const [newFromFriends, setNewFromFriends] = useState<any[]>([]);



useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/user/Gem55qTyh44NPdFwWZgw`);
      setUserInfo(res.data);

      const currentlyWatching_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/currently_watching`);
      setCurrentlyWatching(currentlyWatching_backend.data);
      console.log("Currently Watching:", currentlyWatching);

      const ratings_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/feed`);
      const fetchedRatings = ratings_backend.data.feed;
      setRatings(fetchedRatings);
      console.log("Fetched Ratings:", fetchedRatings);

      // Immediately fetch images after setting ratings
      const updatedRatings = await Promise.all(fetchedRatings.map(async (rating: any) => {
        try {
          const res = await axios.get(`http://localhost:5001/shows/${rating.show_id}`);
          console.log("res:",res)
          const showData = res.data;
          const imagePath = showData.poster_path;
          const imageUrl = imagePath?.startsWith("http")
            ? imagePath
            : `https://image.tmdb.org/t/p/w500${imagePath}`;
          return {
            ...rating,
            show_name: showData?.name,
            image_url: showData?.image_url || showData?.thumbnail || imageUrl || null
          };
        } catch (err) {
          console.error("Failed to fetch image for:", rating.show_name);
          return { ...rating, image_url: null };
        }
      }));
      setRatingsWithImages(updatedRatings);

      const top4Ratings = updatedRatings.slice(0, 4);

      const newShows = await Promise.all(
        top4Ratings.map(async (rating: any) => {
          try {
            const res = await axios.get(`http://localhost:5001/shows/${rating.show_id}`);
            const showData = res.data;
            const imagePath = showData.poster_path;
            const imageUrl = imagePath?.startsWith("http")
              ? imagePath
              : `https://image.tmdb.org/t/p/w500${imagePath}`;

            return {
              ...showData,
              image_url: showData?.image_url || showData?.thumbnail || imageUrl || null,
              show_id: rating.show_id,
            };
          } catch (err) {
            console.error("Failed to fetch New From Friends show:", rating.show_id);
            return null;
          }
        })
      );

      setNewFromFriends(newShows.filter(Boolean)); // filter out nulls

    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  fetchData();
}, []);

  useEffect(() => {
  const fetchImagesForCurrentlyWatching = async () => {
    const updatedShows = await Promise.all(currentlyWatching.map(async (show: any) => {
      try {
        const res = await axios.get(`http://localhost:5001/shows/${show.show_id}`);
        const showData = res.data;
        const imagePath = showData.poster_path;
        const imageUrl = imagePath?.startsWith("http")
          ? imagePath
          : `https://image.tmdb.org/t/p/w500${imagePath}`;

        return {
          ...show,
          image_url: showData?.image_url || showData?.thumbnail || imageUrl || null,
          name: showData.name || show.show_name
        };
      } catch (err) {
        console.error("Failed to fetch currently watching show:", show.show_name);
        return { ...show, image_url: null };
      }
    }));
    setCurrentlyWatchingWithImages(updatedShows);
  };

  if (currentlyWatching.length > 0) {
    fetchImagesForCurrentlyWatching();
  }
}, [currentlyWatching]);
    

  return (
    <div className="page-container">
        <div className="favorite-shows">
          <h1 className="headings">You're Watching</h1>
            <div className="favorite-shows-images">
              {currentlyWatchingWithImages.slice(0, 4).map((show) => (

                <Link
                  to={`/show/${show.show_id}`}
                  key={show.show_id}
                  className="show-link"
                >
                  <img
                    src={show.image_url}
                    alt={show.name}
                    className="show-icon home-icon"
                  />
                </Link>
              ))}
            </div>
        </div>
        <h1 className="headings">Popular This Week</h1>
        <div className="scroll-container">
            <img src="https://m.media-amazon.com/images/M/MV5BMTg5NjY0NGEtMDFhOS00MzJiLTg1NWEtZDhhNWQ5MmE4ZWIxXkEyXkFqcGc@._V1_.jpg" alt="Squid Games" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BOTc2YTFiOTItZmRiNi00OWE5LThhOTEtMmZhMTkzYmRiNjIxXkEyXkFqcGc@._V1_.jpg" alt="Dune Prophecy" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BOWJhYjdjNWEtMWFmNC00ZjNkLThlZGEtN2NkM2U3NTVmMjZkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="Arcane" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BZmM1MGM0MDQtZTAzNy00ZGJkLWI4MDUtNjBmMzdhYjhlM2QwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="White Lotus" className="show-icon"/>
        </div>
        <h1 className="headings">New From Friends</h1>
        <div className="scroll-container">
          {newFromFriends.map((show) => (
            <Link to={`/show/${show.show_id}`} key={show.show_id} className="show-link">
              <img
                src={show.image_url}
                alt={show.name}
                className="show-icon home-icon"
              />
            </Link>
          ))}
        </div>
        <div className="review-container">
          <h3 className="shows-label">Recent Reviews</h3>
          <div className="user-ratings">
            <div className="rating-cards-container">
              {ratingsWithImages.map((rating: any) => (
                  <div className="rating-card" key={rating.show_id}>
                    <img
                      src="https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
                      className="profile-avatar-home"
                    />
                    <div className="rating-details">
                      <div className="rating-text">
                        <h4>{rating.user_name}</h4>
                        {/* <h4>{rating.show_name}</h4> */}
                        <p>{rating.comment}</p>
                      </div>
                      <div className="rating-score">{rating.rating}</div>
                    </div>
                    <img
                      src={rating.image_url}
                      alt={rating.name}
                      className="rating-show-img"
                    />
                  </div>
                ))}
              </div>
            </div>
        </div>
    </div>
  )
}