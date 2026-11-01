import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Star } from "lucide-react";
import ShowPosterCard from "../components/ShowPosterCard";
import ShowTooltip from "../components/ShowTooltip";
import ShowPlaceholder from "../components/ShowPlaceholder";
import FeaturedReviews from "../components/FeaturedReviews";
import PopularUsers from "../components/PopularUsers";
import {
  usePopularShows,
  useShowAverageRating,
  useShowDetails,
} from "../hooks/useShow";

const STAFF_PICK_IDS = [66732, 125935, 136311, 201834];

function StaffPickCard({ showId }: { showId: number }) {
  const { data: show } = useShowDetails(showId);
  const { data: ratingData } = useShowAverageRating(showId);

  if (!show) return null;

  const imagePath = show.poster_path;
  const imageUrl = imagePath
    ? `https://image.tmdb.org/t/p/w500${imagePath}`
    : show.image_url || show.thumbnail || null;

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
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={show.name}
            className="staff-thumb"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <ShowPlaceholder className="staff-thumb" />
        )}
      </ShowTooltip>
      <span className="staff-title">{show.name}</span>
      <div className="staff-score">
        {Number(ratingData?.average_rating).toFixed(1)}
      </div>
    </Link>
  );
}

function StaffPickBannerSlide({ showId }: { showId: number }) {
  const { data: show } = useShowDetails(showId);
  if (!show) return <div className="hero-banner-slide" />;
  return <HeroBannerSlide show={{ ...show, id: showId }} />;
}

function HeroBannerSlide({ show }: { show: any }) {
  const { data: ratingData } = useShowAverageRating(show.id);
  const year = show.first_air_date?.slice(0, 4);
  const rating = ratingData?.average_rating
    ? parseFloat(ratingData.average_rating).toFixed(1)
    : null;

  return (
    <div className="hero-banner-slide">
      <Link to={`/show/${show.id}`} className="hero-card-link">
        <img
          src={`https://image.tmdb.org/t/p/original${
            show.backdrop_path || show.poster_path
          }`}
          alt={show.name}
        />
        <div className="hero-content">
          <h2 className="hero-title">{show.name}</h2>
          <div className="hero-meta">
            {rating && (
              <span className="hero-rating-pill">
                <Star size={14} fill="currentColor" /> {rating}
              </span>
            )}
            {year && <span className="hero-year">{year}</span>}
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
  const [paused, setPaused] = useState(false);

  const { data: popularShows = [], isLoading: popularLoading } =
    usePopularShows(7, 4);

  const staffSlideIds = STAFF_PICK_IDS.filter(
    (id) => !popularShows.some((s: any) => s.id === id),
  );
  const totalSlides = popularShows.length + staffSlideIds.length;

  useEffect(() => {
    if (!totalSlides || paused) return;
    const timeout = setTimeout(() => {
      setBannerIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [totalSlides, paused, bannerIndex]);

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

  const googleButton = (
    <div className="login-google">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        theme="filled_blue"
        size="large"
        text="continue_with"
        shape="rectangular"
        width="260"
      />
    </div>
  );

  const trendingIds = popularShows.slice(0, 12).map((s: any) => s.id);

  return (
    <div className="page-container fade-in">
      <div className="hero-staff-wrapper">
        {/* Hero carousel (same as Home) */}
        <div
          className="hero-banner-wrapper"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="hero-logo-overlay">
            <h1>Popular Now</h1>
          </div>

          <div
            className="hero-banner-slider"
            style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
          >
            {popularShows.map((show: any) => (
              <HeroBannerSlide key={show.id} show={show} />
            ))}
            {staffSlideIds.map((id) => (
              <StaffPickBannerSlide key={`staff-${id}`} showId={id} />
            ))}
          </div>

          <button
            className="hero-banner-arrow left"
            onClick={prevBanner}
            aria-label="Previous"
          >
            ❮
          </button>
          <button
            className="hero-banner-arrow right"
            onClick={nextBanner}
            aria-label="Next"
          >
            ❯
          </button>

          <div className="hero-dots">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === bannerIndex ? "active" : ""}`}
                onClick={() => setBannerIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="staff-picks-container desktop-only">
          <h2 className="staff-picks-title">Our Picks</h2>
          <ul className="staff-list">
            {STAFF_PICK_IDS.map((id) => (
              <StaffPickCard key={id} showId={id} />
            ))}
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div className="home-sections-row">
        <div className="home-section home-section-full login-left">
          {/* <h1 className="headings">How Teli works</h1> */}
          <div className="steps-row">
            <Link to="/browse" className="step-item">
              <img
                src="/features-search.png"
                alt=""
                className="feature-icon-img"
              />
              <div>
                <h3>Find something to watch</h3>
                <p>
                  Browse trending and popular TV shows to find your next watch
                </p>
              </div>
            </Link>
            <div className="step-item">
              <img
                src="/features-watchlists.png"
                alt=""
                className="feature-icon-img"
              />
              <div>
                <h3>Keep your watchlists</h3>
                <p>Sort shows into want to watch, watching, and watched</p>
              </div>
            </div>
            <div className="step-item">
              <img
                src="/features-activity.png"
                alt=""
                className="feature-icon-img"
              />
              <div>
                <h3>Rate and review</h3>
                <p>
                  Rate shows and episodes, then read what your friends think
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeaturedReviews />

      <PopularUsers />

      {/* Closing CTA */}
      <section className="closing-cta">
        <h2>Ready to start your watchlist?</h2>
        <p>Sign in with Google and pick your first shows in under a minute.</p>
        {googleButton}
      </section>
    </div>
  );
}
