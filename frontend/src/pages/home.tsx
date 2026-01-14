import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import ShowTooltip from "../components/ShowTooltip";

export default function Home() {
  const navigate = useNavigate();
  const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
  const [userRatingsWithImages, setUserRatingsWithImages] = useState<any[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] =
    useState<any[]>([]);
  const [newFromFriends, setNewFromFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [watchedCount, setWatchedCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [watchedTicker, setWatchedTicker] = useState(0);
  
  const [staffPickIds] = useState([66732, 125935, 136311, 103540]);
  const [staffPicks, setStaffPicks] = useState<any[]>([]);

  const url = process.env.REACT_APP_API_URL;
  const user_id = useUser().userId;

  useEffect(() => {
    if (!user_id) return;

    const fetchData = async () => {
      try {
        const [currentlyWatchingRes, popularRes, ratingsRes, userRatingsRes] =
          await Promise.all([
            axios.get(`${url}/users/${user_id}/currently_watching`),
            axios.get(`${url}/shows/popular`, {
              params: { timeframe: 100, num_most_popular: 4 },
            }),
            axios.get(`${url}/users/${user_id}/feed`),
            axios.get(`${url}/users/${user_id}/ratings`),
          ]);

        const currentlyWatching = currentlyWatchingRes.data;
        const popularShows_backend = popularRes.data.popular_shows;
        const fetchedRatings = ratingsRes.data.feed;
        const fetchedUserRatings = userRatingsRes.data;

        const W2Wres = await axios.get(`${url}/users/${user_id}/want_to_watch`);
        const CWres = await axios.get(
          `${url}/users/${user_id}/currently_watching`
        );
        const Wres = await axios.get(`${url}/users/${user_id}/watched`);
        setWatchedCount(
          W2Wres.data.length + CWres.data.length + Wres.data.length
        );

        console.log(popularRes);

        // Fetch currently watching with details
        const updatedCurrentlyWatching = await Promise.all(
          currentlyWatching.map(async (show: any) => {
            try {
              const res = await axios.get(`${url}/shows/${show.show_id}`);
              const showData = res.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              const ratingRes = await axios.get(
                `${url}/shows/${show.show_id}/average-rating`
              );
              return {
                ...show,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
                name: showData.name || show.show_name,
                overview: showData.overview,
                first_air_date: showData.first_air_date,
                rating: ratingRes.data.average_rating,
              };
            } catch {
              return { ...show, image_url: null };
            }
          })
        );

        // Fetch popular shows with ratings
        const updatedPopularShows = await Promise.all(
          popularShows_backend.map(async (show: any) => {
            try {
              const ratingRes = await axios.get(
                `${url}/shows/${show.id}/average-rating`
              );
              return { ...show, rating: ratingRes.data.average_rating };
            } catch {
              return { ...show, rating: null };
            }
          })
        );

        // Feed reviews
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
              const ratingRes = await axios.get(
                `${url}/shows/${rating.show_id}/average-rating`
              );
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
                overview: showData.overview,
                first_air_date: showData.first_air_date,
                average_rating: ratingRes.data.average_rating,
              };
            } catch {
              return { ...rating, image_url: null };
            }
          })
        );

        // User reviews
        const updatedUserRatings = await Promise.all(
          fetchedUserRatings.map(async (rating: any) => {
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
              const ratingRes = await axios.get(
                `${url}/shows/${rating.show_id}/average-rating`
              );
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
                overview: showData.overview,
                first_air_date: showData.first_air_date,
                average_rating: ratingRes.data.average_rating,
              };
            } catch {
              return { ...rating, image_url: null };
            }
          })
        );

        // New from friends
        const top3Ratings = updatedRatings.slice(0, 10);
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

        const fetchedStaffPicks = await Promise.all(
          staffPickIds.map(async (id) => {
            try {
              const res = await axios.get(`${url}/shows/${id}`);
              const showData = res.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              const ratingRes = await axios.get(
                `${url}/shows/${id}/average-rating`
              );
              return {
                id,
                title: showData?.name,
                image_url:
                  showData?.image_url ||
                  showData?.thumbnail ||
                  imageUrl ||
                  null,
                name: showData.name,
                overview: showData.overview,
                first_air_date: showData.first_air_date,
                rating: ratingRes.data.average_rating,
              };
            } catch {
              return { id, title: "Unknown", image_url: null };
            }
          })
        );
        setStaffPicks(fetchedStaffPicks);

        setCurrentlyWatchingWithImages(updatedCurrentlyWatching);
        setPopularShows(updatedPopularShows);
        setRatingsWithImages(updatedRatings.slice(0,3));
        setUserRatingsWithImages(updatedUserRatings.slice(0,3));
        setNewFromFriends(newShows.filter(Boolean));
        console.log(newShows);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch home data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [user_id]);

  // Rotate through slides (title card + popular shows)
  useEffect(() => {
    if (!popularShows.length) return;
    const totalSlides = popularShows.length + 1; // +1 for the Teli card
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(interval);
  }, [popularShows.length]);

  useEffect(() => {
    if (!loading && watchedCount > 0) {
      let start = 0;
      const duration = 2000; // 2 seconds
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const eased = progress * (2 - progress); // ease-out
        const value = Math.floor(eased * watchedCount);
        setDisplayCount(value);

        if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }, [loading, watchedCount]);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setWatchedTicker(current);

      if (current >= watchedCount) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [user_id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  

  const totalSlides = popularShows.length + 1;
  const nextBanner = () => setBannerIndex((prev) => (prev + 1) % totalSlides);
  const prevBanner = () =>
    setBannerIndex((prev) => (prev - 1 + totalSlides) % totalSlides);

  const isTeliSlide = bannerIndex === 0;
  const currentBanner = isTeliSlide ? null : popularShows[bannerIndex - 1];

  return (
    <div className="page-container fade-in">
      <div className="hero-staff-wrapper">
        {/* Hero Banner */}
        <div className="hero-banner-wrapper">
          <div
            className="hero-banner-slider"
            style={{
              transform: `translateX(-${bannerIndex * 100}%)`,
              transition: "transform 0.8s ease-in-out",
            }}
          >
            {/* Slide 0: Teli Title Card */}
            <div className="hero-banner-slide hero-banner-teli">
              <img
                src="/TV Static Background.jpg" // Replace with your image path or URL
                alt="TV Static Background"
                className="hero-background-img"
              />
              <div className="hero-text">
                <h1 className="teli-title">Teli</h1>
                <h2 className="teli-subtitle">Channel What You Love</h2>
              </div>
            </div>

            {/* Slides 1+: Popular Shows */}
            {popularShows.map((show) => (
              <div key={show.id} className="hero-banner-slide">
                <Link to={`/show/${show.id}`} className="hero-card-link">
                  <img
                    src={`https://image.tmdb.org/t/p/original${
                      show.backdrop_path || show.poster_path
                    }`}
                    alt={show.name}
                  />
                  <div className="hero-banner-content">
                    <div className="hero-title-row">
                      <h1>{show.name}</h1>
                      {show.rating && (
                        <div className="hero-rating-box">
                          {parseFloat(show.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    {/* <p>
                      {show.overview || "Discover trending shows this week."}
                    </p> */}
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <button className="hero-banner-arrow left" onClick={prevBanner}>
            ❮
          </button>
          <button className="hero-banner-arrow right" onClick={nextBanner}>
            ❯
          </button>
        </div>

        {/* Staff Picks Section */}
        <div className="staff-picks-container">
          <h2 className="staff-picks-title">Staff Picks</h2>

          <ul className="staff-list">
            {staffPicks.map((show) => (
              <Link
                key={show.id}
                to={`/show/${show.id}`}
                className="staff-item"
              >
                <ShowTooltip
                  show={{
                    name: show.name,
                    first_air_date: show.first_air_date,
                    overview: show.overview,
                    rating: show.rating,
                  }}
                >
                  <img
                    src={show.image_url}
                    alt={show.name}
                    className="staff-thumb"
                  />
                </ShowTooltip>
                <span className="staff-title">{show.name}</span>
              </Link>
            ))}
          </ul>
        </div>
      </div>

      {/* <div className="watch-ticker-wrapper">
        <div className="watch-ticker-box">
          <span className="ticker-number">{displayCount}</span>
        </div>
        <p className="watch-ticker-label">Shows</p>
      </div> */}

      <div className="home-sections-row">
        {/* You're Watching */}
        {currentlyWatchingWithImages.length > 0 && (
          <div className="home-section">
            <h1 className="headings">You're Watching</h1>
            <div className="scroll-container">
              {currentlyWatchingWithImages.map((show) => (
                <Link
                  to={`/show/${show.show_id}`}
                  key={show.show_id}
                  className="show-link"
                >
                  <ShowTooltip
                    show={{
                      name: show.name,
                      first_air_date: show.first_air_date,
                      overview: show.overview,
                      rating: show.rating,
                    }}
                  >
                    <img
                      src={show.image_url}
                      alt={show.name}
                      className="show-icon home-icon"
                    />
                  </ShowTooltip>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Popular This Week */}
        {/* {popularShows.length > 0 && (
        <>
          <h1 className="headings">Popular This Week</h1>
          <div className="scroll-container">
            {popularShows.map((show) => (
              <Link to={`/show/${show.id}`} key={show.id} className="show-link">
                <ShowTooltip
                  show={{
                    name: show.name,
                    first_air_date: show.first_air_date,
                    overview: show.overview,
                    rating: show.rating,
                  }}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                    alt={show.name}
                    className="show-icon home-icon"
                  />
                </ShowTooltip>
              </Link>
            ))}
          </div>
        </>
      )} */}

        {/* New From Friends */}
        {newFromFriends.length > 0 && (
          <div className="home-section">
            <h1 className="headings">New From Friends</h1>
            <div className="scroll-container">
              {newFromFriends.map((show) => (
                <Link
                  to={`/show/${show.show_id}`}
                  key={show.show_id}
                  className="show-link"
                >
                  <ShowTooltip
                    show={{
                      name: show.name,
                      first_air_date: show.first_air_date,
                      overview: show.overview,
                      rating: show.rating,
                    }}
                  >
                    <img
                      src={show.image_url}
                      alt={show.name}
                      className="show-icon home-icon"
                    />
                  </ShowTooltip>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="home-sections-row">
        {/* Recent Reviews */}
        {userRatingsWithImages.length > 0 && (
          <div className="review-container">
            <h3 className="headings">Your Reviews</h3>
            <div className="review-cards-container">
              {userRatingsWithImages.map((rating: any) => (
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
                  overview={rating.overview}
                  averageRating={rating.average_rating}
                  firstAirDate={rating.first_air_date}
                  compact={true}
                />
              ))}
            </div>
            <div className="see-more-container">
              <button
                className="see-more-button"
                onClick={() => navigate("/activity?tab=user")}
              >
                See More
              </button>
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {ratingsWithImages.length > 0 && (
          <div className="review-container">
            <h3 className="headings">Following Reviews</h3>
            <div className="review-cards-container">
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
                  overview={rating.overview}
                  averageRating={rating.average_rating}
                  firstAirDate={rating.first_air_date}
                  compact={true}
                />
              ))}
            </div>
            <div className="see-more-container">
              <button
                className="see-more-button"
                onClick={() => navigate("/activity?tab=following")}
              >
                See More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Features Section */}
      <h2 className="features-title">Features</h2>

      <div className="features-grid">
        <Link to="/browse" className="feature-card">
          <img
            src="/features-browse.png"
            alt="Discover shows"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Discover Shows</h3>
            <p>Browse trending and popular TV shows to find your next watch</p>
          </div>
        </Link>

        <Link to="/activity" className="feature-card">
          <img
            src="/features-activity.png"
            alt="reviews"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Reviews</h3>
            <p>Rate and comment on your favorite shows, then see what your friends are saying</p>
          </div>
        </Link>

        <Link to="/profile" className="feature-card">
          <img
            src="/features-profile.png"
            alt="profile"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Profile</h3>
            <p>Customize your profile to show what you're watching</p>
          </div>
        </Link>

        <Link to="/search" className="feature-card">
          <img
            src="/features-search.png"
            alt="search"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Search</h3>
            <p>Quickly search for TV shows and users to find exactly what you’re looking for</p>
          </div>
        </Link>

        <Link to="/browse" className="feature-card">
          <img
            src="/features-showdetails.png"
            alt="show details"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Show Details</h3>
            <p>See more information about every show</p>
          </div>
        </Link>

        <Link to={`/users/${user_id}/yourshows`} className="feature-card">
          <img
            src="/features-watchlists.png"
            alt="watchlists"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Watchlists</h3>
            <p>Manage the shows you want to watch, are currently watching and have watched</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
