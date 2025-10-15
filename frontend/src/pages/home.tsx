import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useUser } from "../UserContext";

import ReviewCard from "../components/ReviewCard";

/* Home Page */
export default function Home() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<any[]>([]);
  const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] = useState<any[]>([]);
  const [newFromFriends, setNewFromFriends] = useState<any[]>([]);

  const [loading, setLoading] = useState({
    currentlyWatching: true,
    popular: true,
    newFromFriends: true,
    reviews: true,
  });

  const url = `http://localhost:5001`;
  const user_id = useUser().userId;

  /* Pull user info and shows */
  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      try {
        // User info
        const res = await axios.get(`${url}/user/${user_id}`);
        setUserInfo(res.data);
        console.log(res)

        // Currently watching
        const currentlyWatching_backend = await axios.get(
          `${url}/users/${user_id}/currently_watching`
        );
        setCurrentlyWatching(currentlyWatching_backend.data);
        setLoading((prev) => ({ ...prev, currentlyWatching: false }));

        // Popular shows
        const popularShows_backend = await axios.get(`${url}/shows/popular`, {
          params: { timeframe: 100, num_most_popular: 4 },
        });
        setPopularShows(popularShows_backend.data.popular_shows);
        setLoading((prev) => ({ ...prev, popular: false }));

        // User feed (reviews)
        const ratings_backend = await axios.get(`${url}/users/${user_id}/feed`);
        const fetchedRatings = ratings_backend.data.feed;
        console.log(fetchedRatings)
        setRatings(fetchedRatings);

        // Fetch show images for ratings
        const updatedRatings = await Promise.all(
          fetchedRatings.map(async (rating: any) => {
            try {
              const res = await axios.get(`${url}/shows/${rating.show_id}`);
              const showData = res.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              const userReviewInfo = await axios.get(`${url}/user/${rating.user_id}`);
              return {
                ...rating,
                show_name: showData?.name,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
                user_name: userReviewInfo.data.name,
                user_id: userReviewInfo.data.id,
                user_profile_pic: userReviewInfo.data.picture,
              };
            } catch {
              return { ...rating, image_url: null };
            }
          })
        );
        setRatingsWithImages(updatedRatings);
        console.log(updatedRatings);
        setLoading((prev) => ({ ...prev, reviews: false }));

        // New From Friends
        const top3Ratings = updatedRatings.slice(0, 3);
        const newShows = await Promise.all(
          top3Ratings.map(async (rating: any) => {
            try {
              const res = await axios.get(`${url}/shows/${rating.show_id}`);
              const showData = res.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...showData,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
                show_id: rating.show_id,
              };
            } catch {
              return null;
            }
          })
        );
        setNewFromFriends(newShows.filter(Boolean));
        setLoading((prev) => ({ ...prev, newFromFriends: false }));
      } catch (err) {
        console.error("Failed to fetch user/home data:", err);
      }
    };

    fetchData();
  }, [user_id]);

  /* Fetch images for currently watching shows */
  useEffect(() => {
    const fetchImagesForCurrentlyWatching = async () => {
      const updatedShows = await Promise.all(
        currentlyWatching.map(async (show: any) => {
          try {
            const res = await axios.get(`${url}/shows/${show.show_id}`);
            const showData = res.data;
            const imagePath = showData.poster_path;
            const imageUrl = imagePath?.startsWith("http")
              ? imagePath
              : `https://image.tmdb.org/t/p/w500${imagePath}`;
            return {
              ...show,
              image_url:
                showData?.image_url || showData?.thumbnail || imageUrl || null,
              name: showData.name || show.show_name,
            };
          } catch {
            return { ...show, image_url: null };
          }
        })
      );
      setCurrentlyWatchingWithImages(updatedShows);
    };

    if (currentlyWatching.length > 0) {
      fetchImagesForCurrentlyWatching();
    }
  }, [currentlyWatching]);

  return (
    <div className="page-container">
      {/* You're Watching */}
      {!loading.currentlyWatching && currentlyWatchingWithImages.length > 0 && (
        <>
          <h1 className="headings">You're Watching</h1>
          <div className="scroll-container">
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
        </>
      )}

      {/* Popular This Week */}
      {!loading.popular && popularShows.length > 0 && (
        <>
          <h1 className="headings">Popular This Week</h1>
          <div className="scroll-container">
            {popularShows.map((show) => (
              <Link to={`/show/${show.id}`} key={show.id} className="show-link">
                <img
                  src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                  alt={show.name}
                  className="show-icon home-icon"
                />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* New From Friends */}
      {!loading.newFromFriends && newFromFriends.length > 0 && (
        <>
          <h1 className="headings">New From Friends</h1>
          <div className="scroll-container">
            {newFromFriends.map((show) => (
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
        </>
      )}

      {/* Recent Reviews */}
      {!loading.reviews && ratingsWithImages.length > 0 && (
        <div className="review-container">
          <h3 className="headings">Recent Reviews</h3>
          <div className="user-ratings">
            <div className="rating-cards-container">
              {ratingsWithImages.map((rating: any) => (
                <ReviewCard
                  key={rating.show_id}
                  showId={rating.show_id}
                  userId={rating.user_id}
                  userName={rating.user_name}
                  userProfilePic={rating.user_profile_pic}
                  comment={rating.comment}
                  rating={rating.rating}
                  showImageUrl={rating.image_url}
                  showName={rating.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
