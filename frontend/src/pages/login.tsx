import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Link } from "react-router-dom";
import ShowTooltip from "../components/ShowTooltip";

export default function Login() {
  const url = process.env.REACT_APP_API_URL;
  const { setUserId } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);

  const [staffPickIds] = useState([66732, 125935, 136311, 103540]);
  const [staffPicks, setStaffPicks] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [popularRes] =
          await Promise.all([
            axios.get(`${url}/shows/popular`, {
              params: { timeframe: 100, num_most_popular: 4 },
            }),
          ]);

        const popularShows_backend = popularRes.data.popular_shows;

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
        setPopularShows(updatedPopularShows);

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
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch home data:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Rotate through slides (title card + popular shows)
  useEffect(() => {
    if (!popularShows.length) return;
    const totalSlides = popularShows.length + 1; // +1 for the Teli card
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(interval);
  }, [popularShows.length]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send the Google token to our backend for verification
      const response = await axios.post(`${url}/auth/google`, {
        token: credentialResponse.credential
      });
      console.log(response)

      if (response.data.user && response.data.user.id) {
        setUserId(response.data.user.id);

        if (response.data.message == "User created successfully") {
          navigate("/onboarding");
        } else {
          navigate("/");
        }
      }

    } catch (err) {
      console.error("Login error:", err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Login failed. Please try again.");
      } else {
        setError("Unable to connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };

  const totalSlides = popularShows.length + 1;
  const nextBanner = () => setBannerIndex((prev) => (prev + 1) % totalSlides);
  const prevBanner = () =>
    setBannerIndex((prev) => (prev - 1 + totalSlides) % totalSlides);

  const isTeliSlide = bannerIndex === 0;
  const currentBanner = isTeliSlide ? null : popularShows[bannerIndex - 1];

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
      {/* Hero Banner */}
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

              <div className="teli-google-btn">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="260"
                />
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

          <div className="feature-card-off">
            <img
              src="/features-activity.png"
              alt="reviews"
              className="feature-icon-img"
            />
            <div className="feature-text">
              <h3>Reviews</h3>
              <p>Rate and comment on your favorite shows, then see what your friends are saying</p>
            </div>
          </div>

          <div className="feature-card-off">
            <img
              src="/features-profile.png"
              alt="profile"
              className="feature-icon-img"
            />
            <div className="feature-text">
              <h3>Profile</h3>
              <p>Customize your profile to show what you're watching</p>
            </div>
          </div>

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

          <div className="feature-card-off">
            <img
              src="/features-watchlists.png"
              alt="watchlists"
              className="feature-icon-img"
            />
            <div className="feature-text">
              <h3>Watchlists</h3>
              <p>Manage the shows you want to watch, are currently watching and have watched</p>
            </div>
          </div>
        </div>

      {/* <div className="login-box"> */}
      {/* <h1 className="login-title">Teli</h1>
        <p className="login-slogan">Channel What You Love</p>

        <div className="login-divider" /> */}

      {/* <h2 className="login-subtitle">Sign in to continue</h2>
        <p className="login-description">
          Use your Google account to sign in and start tracking your favorite
          shows
        </p>

        {error && <div className="login-error-message">{error}</div>}

        <div className="login-google-button-container">
          {loading ? (
            <div className="login-loading-container">
              <p>Signing in...</p>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="300"
            />
          )}
        </div>

        <p className="login-privacy-note">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div> */}
    </div>
  );
}