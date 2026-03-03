import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../UserContext";
import ReviewCard from "../components/ReviewCard";
import ShowPosterCard from "../components/ShowPosterCard";
import { formatRelativeTime } from "../components/formatRelativeTime";
import ShowTooltip from "../components/ShowTooltip";
import { usePopularShows, useShowAverageRating, useShowDetails } from "../hooks/useShow";
import {
  useUserWatchList,
  useUserFeed,
  useUserRatings,
} from "../hooks/useUser";

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

export default function Home() {
  const [bannerIndex, setBannerIndex] = useState(0);

  const user_id = useUser().userId;

  const { data: popularShows = [], isLoading: popularLoading } =
    usePopularShows(100, 4);
  const { data: cwList = [], isLoading: cwLoading } = useUserWatchList(
    user_id,
    "currently_watching"
  );
const { data: feed = [], isLoading: feedLoading } = useUserFeed(user_id);
  const { data: userRatings = [], isLoading: ratingsLoading } =
    useUserRatings(user_id);

  const loading = popularLoading || cwLoading || feedLoading || ratingsLoading;

  // Rotate banner
  useEffect(() => {
    if (!popularShows.length) return;
    const totalSlides = popularShows.length + 1;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(interval);
  }, [popularShows.length]);


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
          <div
            className="hero-banner-slider"
            style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
          >
            {/* Slide 0: Teli Title Card */}
            <div className="hero-banner-slide hero-banner-teli">
              <img
                src="/Teli Slide.jpg"
                alt="Teli Slide"
                className="hero-background-img"
              />
              <div className="hero-text">
                <h1 className="teli-title">Teli</h1>
                <h2 className="teli-subtitle">Channel What You Love</h2>
              </div>
            </div>

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

      <div className="home-sections-row">
        {/* You're Watching */}
        {cwList.length > 0 ? (
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
            <div className="scroll-container">
              <p>
                Start watching shows <br />
                to see them here!
              </p>
            </div>
          </div>
        )}

        {/* New From Friends */}
        {friendShowIds.length > 0 ? (
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
            <div className="scroll-container">
              <p>
                Add friends to see <br />
                what they're watching!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="home-sections-row">
        {/* Your Reviews */}
        {userReviews.length > 0 ? (
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
            <div className="scroll-container">
              <p>No shows reviewed</p>
            </div>
          </div>
        )}

        {/* Following Reviews */}
        {feedReviews.length > 0 ? (
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
            <div className="scroll-container">
              <p>No reviews in your feed</p>
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

        <Link to="/search" className="feature-card">
          <img
            src="/features-search.png"
            alt="search"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Search</h3>
            <p>
              Quickly search for TV shows and users to find exactly what you're
              looking for
            </p>
          </div>
        </Link>

        <Link
          to={popularShows.length > 0 ? `/show/${popularShows[0].id}` : "/browse"}
          className="feature-card"
        >
          <img
            src="/features-showdetails.png"
            alt="show details"
            className="feature-icon-img"
          />
          <div className="feature-text">
            <h3>Show Details</h3>
            <p>Explore seasons, episodes, and ratings for any show</p>
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
  );
}
