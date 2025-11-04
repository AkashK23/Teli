import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";

export default function Home() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] = useState<any[]>([]);
  const [newFromFriends, setNewFromFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const url = process.env.REACT_APP_API_URL;
  const user_id = useUser().userId;

  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      try {
        // Fetch everything in parallel
        const [
          userRes,
          currentlyWatchingRes,
          popularRes,
          ratingsRes
        ] = await Promise.all([
          axios.get(`${url}/user/${user_id}`),
          axios.get(`${url}/users/${user_id}/currently_watching`),
          axios.get(`${url}/shows/popular`, { params: { timeframe: 100, num_most_popular: 4 } }),
          axios.get(`${url}/users/${user_id}/feed`)
        ]);

        setUserInfo(userRes.data);
        const currentlyWatching = currentlyWatchingRes.data;
        const popularShows_backend = popularRes.data.popular_shows;
        const fetchedRatings = ratingsRes.data.feed;

        // Fetch images for currently watching
        const updatedCurrentlyWatching = await Promise.all(
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

        // Fetch show + user data for reviews
        const updatedRatings = await Promise.all(
          fetchedRatings.map(async (rating: any) => {
            try {
              const [showRes, userRes] = await Promise.all([
                axios.get(`${url}/shows/${rating.show_id}`),
                axios.get(`${url}/user/${rating.user_id}`),
              ]);
              const showData = showRes.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...rating,
                show_name: showData?.name,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
                user_name: userRes.data.name,
                user_id: userRes.data.id,
                user_profile_pic: userRes.data.picture,
              };
            } catch {
              return { ...rating, image_url: null };
            }
          })
        );

        // New from friends
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

        setCurrentlyWatchingWithImages(updatedCurrentlyWatching);
        setPopularShows(popularShows_backend);
        setRatingsWithImages(updatedRatings);
        setNewFromFriends(newShows.filter(Boolean));
      } catch (err) {
        console.error("Failed to fetch user/home data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user_id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {/* You're Watching */}
      {currentlyWatchingWithImages.length > 0 && (
        <>
          <h1 className="headings">You're Watching</h1>
          <div className="scroll-container">
            {currentlyWatchingWithImages.slice(0, 4).map((show) => (
              <Link to={`/show/${show.show_id}`} key={show.show_id} className="show-link">
                <img src={show.image_url} alt={show.name} className="show-icon home-icon" />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Popular This Week */}
      {popularShows.length > 0 && (
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
      {newFromFriends.length > 0 && (
        <>
          <h1 className="headings">New From Friends</h1>
          <div className="scroll-container">
            {newFromFriends.map((show) => (
              <Link to={`/show/${show.show_id}`} key={show.show_id} className="show-link">
                <img src={show.image_url} alt={show.name} className="show-icon home-icon" />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Recent Reviews */}
      {ratingsWithImages.length > 0 && (
        <div className="review-container">
          <h3 className="headings">Recent Reviews</h3>
          <div className="user-ratings">
            <div className="rating-cards-container">
              {ratingsWithImages.map((rating: any) => (
                <ReviewCard
                  key={`${rating.user_id}-${rating.show_id}`}
                  showId={rating.show_id}
                  userId={rating.user_id}
                  userName={rating.user_name}
                  userProfilePic={rating.user_profile_pic}
                  comment={rating.comment}
                  rating={rating.rating}
                  showImageUrl={rating.image_url}
                  showName={rating.show_name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
