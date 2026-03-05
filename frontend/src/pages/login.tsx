import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import ShowTooltip from "../components/ShowTooltip";
import ShowPosterCard from "../components/ShowPosterCard";
import { usePopularShows, useShowAverageRating, useShowDetails } from "../hooks/useShow";

const STAFF_PICK_IDS = [66732, 125935, 136311, 103540];

function StaffPickCard({ showId }: { showId: number }) {
  const { data: show } = useShowDetails(showId);
  const { data: ratingData } = useShowAverageRating(showId);

  if (!show) return null;

  const imagePath = show.poster_path;
  const imageUrl = imagePath
    ? `https://image.tmdb.org/t/p/w500${imagePath}`
    : show.image_url || show.thumbnail || null;

  if (!imageUrl) return null;

  return (
    <Link to={`/show/${showId}`} className="staff-item">
      <ShowTooltip
        show={{
          name: show.name,
          first_air_date: show.first_air_date,
          overview: show.overview,
          rating: ratingData?.average_rating,
        }}
      >
        <img
          src={imageUrl}
          alt={show.name}
          className="staff-thumb"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </ShowTooltip>
      <span className="staff-title">{show.name}</span>
    </Link>
  );
}

function HeroBannerSlide({ show }: { show: any }) {
  const { data: ratingData } = useShowAverageRating(show.id);
  return (
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
            {ratingData?.average_rating && (
              <div className="hero-rating-box">
                {parseFloat(ratingData.average_rating).toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function Login() {
  const url = process.env.REACT_APP_API_URL;
  const { setUserId } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  const { data: popularShows = [], isLoading: popularLoading } =
    usePopularShows(100, 4);

  // Rotate banner
  useEffect(() => {
    if (!popularShows.length) return;
    const totalSlides = popularShows.length + 1;
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
      const response = await axios.post(`${url}/auth/google`, {
        token: credentialResponse.credential,
      });
      if (response.data.user && response.data.user.id) {
        setUserId(response.data.user.id);
        if (response.data.message === "User created successfully") {
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

  if (popularLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

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
                src="/TV Static Background.jpg"
                alt="TV Static Background"
                className="hero-background-img"
              />
              <div className="hero-text">
                <h1 className="teli-title">Teli</h1>
                <h2 className="teli-subtitle">Channel What You Love</h2>
              </div>
            </div>

            {/* Slides 1+: Popular Shows */}
            {(popularShows as any[]).map((show: any) => (
              <HeroBannerSlide key={show.id} show={show} />
            ))}
          </div>

          <button className="hero-banner-arrow left" onClick={prevBanner}>
            ❮
          </button>
          <button className="hero-banner-arrow right" onClick={nextBanner}>
            ❯
          </button>
        </div>

        {/* Staff Picks — desktop sidebar */}
        <div className="staff-picks-container desktop-only">
          <h2 className="staff-picks-title">Staff Picks</h2>
          <ul className="staff-list">
            {STAFF_PICK_IDS.map((id) => (
              <StaffPickCard key={id} showId={id} />
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile Staff Picks */}
      <div className="home-sections-row">
        <div className="staff-mobile home-section">
          <h1 className="headings">Staff Picks</h1>
          <div className="scroll-container">
            {STAFF_PICK_IDS.map((id) => (
              <ShowPosterCard key={id} showId={id} className="show-icon home-icon" />
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <h2 className="features-title">Features</h2>
      <div className="features-grid">
        <Link to="/browse" className="feature-card">
          <img src="/features-browse.png" alt="Discover shows" className="feature-icon-img" />
          <div className="feature-text">
            <h3>Discover Shows</h3>
            <p>Browse trending and popular TV shows to find your next watch</p>
          </div>
        </Link>

        <div className="feature-card-off">
          <img src="/features-activity.png" alt="reviews" className="feature-icon-img" />
          <div className="feature-text">
            <h3>Reviews</h3>
            <p>Rate and comment on your favorite shows, then see what your friends are saying</p>
          </div>
        </div>

        <div className="feature-card-off">
          <img src="/features-profile.png" alt="profile" className="feature-icon-img" />
          <div className="feature-text">
            <h3>Profile</h3>
            <p>Customize your profile to show what you're watching</p>
          </div>
        </div>

        <Link to="/search" className="feature-card">
          <img src="/features-search.png" alt="search" className="feature-icon-img" />
          <div className="feature-text">
            <h3>Search</h3>
            <p>Quickly search for TV shows and users to find exactly what you're looking for</p>
          </div>
        </Link>

        <Link to="/browse" className="feature-card">
          <img src="/features-showdetails.png" alt="show details" className="feature-icon-img" />
          <div className="feature-text">
            <h3>Show Details</h3>
            <p>See more information about every show</p>
          </div>
        </Link>

        <div className="feature-card-off">
          <img src="/features-watchlists.png" alt="watchlists" className="feature-icon-img" />
          <div className="feature-text">
            <h3>Watchlists</h3>
            <p>Manage the shows you want to watch, are currently watching and have watched</p>
          </div>
        </div>
      </div>
    </div>
  );
}
