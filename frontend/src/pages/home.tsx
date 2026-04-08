import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tv, Users, Star, MessageSquare } from "lucide-react";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import ShowPosterCard from "../components/ShowPosterCard";
import { formatRelativeTime } from "../components/formatRelativeTime";
import ShowTooltip from "../components/ShowTooltip";
import ShowPlaceholder from "../components/ShowPlaceholder";
import { usePopularShows, useShowAverageRating, useShowDetails } from "../hooks/useShow";
import {
  useUserWatchList,
  useUserFeed,
  useUserRatings,
} from "../hooks/useUser";

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

// Renders a single hero banner slide with its own average rating query
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
        <div className="hero-top-right">
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

export default function Home() {
  const [bannerIndex, setBannerIndex] = useState(0);

  const user_id = useUser().userId;

  const { data: popularShows = [], isLoading: popularLoading } =
    usePopularShows(7, 4);
  const { data: cwList = [], isLoading: cwLoading } = useUserWatchList(
    user_id,
    "currently_watching"
  );
const { data: feed = [], isLoading: feedLoading } = useUserFeed(user_id);
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);

  // Rotate banner
  useEffect(() => {
    if (!popularShows.length) return;
    const totalSlides = popularShows.length;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    console.log(popularShows)
    return () => clearInterval(interval);
  }, [popularShows.length]);

  // Only block on popular shows for the hero banner; let other sections load independently
  if (popularLoading) {
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

  // Unique show IDs from feed for "New From Friends"
  const friendShowIds = [
    ...new Set(
      (feed as any[]).slice(0, 10).map((item: any) => item.show_id)
    ),
  ];

  // Feed reviews (top 3) — ReviewCard fetches its own show/user data
  const feedReviews = (feed as any[]).slice(0, 3);

  // User reviews (top 3) — ReviewCard fetches its own show/user data
  const userReviews = (userRatings as any[]).slice(0, 3);

  return (
    <div className="page-container fade-in">
      <div className="hero-staff-wrapper">
        {/* Hero Banner */}
        <div className="hero-banner-wrapper">
          {/* 🔥 Top-left logo */}
          <div className="hero-logo-overlay">
            <img src="/teli-logo.svg" alt="Teli" />
          </div>

          {/* 🔥 Bottom-center tagline */}
          <div className="hero-tagline-overlay">
            <p>Discover Shows • Track What You're Watching • Share Reviews with Friends</p>
          </div>

          <div
            className="hero-banner-slider"
            style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
          >
            {/* Slide 0: Teli Title Card */}
            {/* <div className="hero-banner-slide hero-banner-teli">
              <img
                src="/teli-slide.jpg"
                alt="Teli Slide"
                className="hero-background-img"
              />
              <div className="hero-text">
                <h1 className="teli-title">Teli</h1>
                <h2 className="teli-subtitle">Channel What You Love</h2>
              </div>
            </div> */}

            {/* Slides 1+: Popular Shows */}
            {popularShows.map((show: any) => (
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
          <h2 className="staff-picks-title">Our Picks</h2>
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
              <ShowPosterCard
                key={id}
                showId={id}
                className="show-icon home-icon"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="home-sections-row">
        {/* You're Watching */}
        {cwLoading ? (
          <div className="home-section">
            <h1 className="headings">You're Watching</h1>
            <div className="skeleton-row">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-poster" />
              ))}
            </div>
          </div>
        ) : cwList.length > 0 ? (
          <div className="home-section">
            <h1 className="headings">You're Watching</h1>
            <div className="scroll-container">
              {(cwList as any[]).map((show: any) => (
                <ShowPosterCard
                  key={show.show_id}
                  showId={show.show_id}
                  className="show-icon home-icon"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-section">
            <h1 className="headings">You're Watching</h1>
            <div className="empty-state-card">
              <Tv className="empty-state-icon" />
              <p>Start tracking shows you're watching</p>
              <Link to="/browse" className="empty-state-cta">
                Browse Shows
              </Link>
            </div>
          </div>
        )}

        {/* New From Friends */}
        {feedLoading ? (
          <div className="home-section">
            <h1 className="headings">New From Friends</h1>
            <div className="skeleton-row">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-poster" />
              ))}
            </div>
          </div>
        ) : friendShowIds.length > 0 ? (
          <div className="home-section">
            <h1 className="headings">New From Friends</h1>
            <div className="scroll-container">
              {friendShowIds.map((showId: any) => (
                <ShowPosterCard
                  key={showId}
                  showId={showId}
                  className="show-icon home-icon"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-section">
            <h1 className="headings">New From Friends</h1>
            <div className="empty-state-card">
              <Users className="empty-state-icon" />
              <p>See what your friends are watching</p>
              <Link to="/search" className="empty-state-cta">
                Find Friends
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="home-sections-row">
        {/* Your Reviews */}
        {ratingsLoading ? (
          <div className="home-section">
            <h1 className="headings">Your Reviews</h1>
            <div className="skeleton-row">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-review" />
              ))}
            </div>
          </div>
        ) : userReviews.length > 0 ? (
          <div className="review-container">
            <Link to="/activity?tab=user" className="heading-link">
              <h1 className="headings">Your Reviews</h1>
            </Link>
            <div className="review-cards-container">
              {userReviews.map((rating: any) => (
                <ReviewCard
                  key={`${rating.user_id}-${rating.show_id}`}
                  showId={rating.show_id}
                  userId={rating.user_id}
                  comment={rating.comment}
                  rating={rating.rating}
                  compact={true}
                  reviewDate={formatRelativeTime(rating.timestamp)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-section">
            <h1 className="headings">Your Reviews</h1>
            <div className="empty-state-card">
              <Star className="empty-state-icon" />
              <p>Share your thoughts on shows</p>
              <Link to="/browse" className="empty-state-cta">
                Find a Show to Review
              </Link>
            </div>
          </div>
        )}

        {/* Following Reviews */}
        {feedLoading ? (
          <div className="home-section">
            <h1 className="headings">Following Reviews</h1>
            <div className="skeleton-row">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-review" />
              ))}
            </div>
          </div>
        ) : feedReviews.length > 0 ? (
          <div className="review-container">
            <Link to="/activity?tab=following" className="heading-link">
              <h1 className="headings">Following Reviews</h1>
            </Link>
            <div className="review-cards-container">
              {feedReviews.map((rating: any) => (
                <ReviewCard
                  key={`${rating.user_id}-${rating.show_id}`}
                  showId={rating.show_id}
                  userId={rating.user_id}
                  comment={rating.comment}
                  rating={rating.rating}
                  compact={true}
                  reviewDate={formatRelativeTime(rating.timestamp)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-section">
            <h1 className="headings">Following Reviews</h1>
            <div className="empty-state-card">
              <MessageSquare className="empty-state-icon" />
              <p>Follow people to see their reviews</p>
              <Link to="/search" className="empty-state-cta">
                Find People
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Features Section */}
      <h2 className="features-title">Features</h2>

      <div className="features-columns">
        {/* LEFT: Available Now */}
        <div className="features-column">
          <div className="features-grid">
            <Link to="/browse" className="feature-card">
              <img
                src="/features-browse.png"
                alt="Discover shows"
                className="feature-icon-img"
              />
              <div className="feature-text">
                <h3>Discover Shows</h3>
                <p>
                  Browse trending and popular TV shows to find your next watch
                </p>
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
                <p>
                  Quickly search for TV shows and users to find exactly what
                  you're looking for
                </p>
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
          </div>
        </div>

        <div className="features-column">
          <div className="features-grid">
            <Link to="/activity" className="feature-card">
              <img
                src="/features-activity.png"
                alt="reviews"
                className="feature-icon-img"
              />
              <div className="feature-text">
                <h3>Reviews</h3>
                <p>
                  Rate and comment on your favorite shows, then see what your
                  friends are saying
                </p>
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

            <Link to={`/users/${user_id}/yourshows`} className="feature-card">
              <img
                src="/features-watchlists.png"
                alt="watchlists"
                className="feature-icon-img"
              />
              <div className="feature-text">
                <h3>Watchlists</h3>
                <p>
                  Manage the shows you want to watch, are currently watching and
                  have watched
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
