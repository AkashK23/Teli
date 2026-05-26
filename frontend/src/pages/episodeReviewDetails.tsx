import { useParams, useNavigate, Link } from "react-router-dom";
import { useShowDetails, useShowSeason } from "../hooks/useShow";
import {
  useUserProfile,
  useUserRatings,
  useEpisodeReviews,
} from "../hooks/useUser";
import { formatRelativeTime } from "../components/formatRelativeTime";

export default function EpisodeReviewDetails() {
  const { id, season, episode, userId } = useParams<{
    id: string;
    season: string;
    episode: string;
    userId: string;
  }>();

  const navigate = useNavigate();

  const seasonNumber = season ? parseInt(season, 10) : null;
  const episodeNumber = episode ? parseInt(episode, 10) : null;

  const { data: show } = useShowDetails(id);
  const { data: seasonData } = useShowSeason(id, seasonNumber);
  const { data: user } = useUserProfile(userId);

  const episodeData = (seasonData?.episodes ?? []).find(
    (e: any) => e.episode_number === episodeNumber,
  );

  const { data: episodeReviews = [] } = useEpisodeReviews(
    userId,
    id,
    seasonNumber,
  );

  const review = (episodeReviews as any[]).find(
    (r: any) => r.episode_number === episodeNumber,
  );

  if (!show || !user || !review || !episodeData) return <div>Not found</div>;

  const showImageUrl = show.poster_path?.startsWith("http")
    ? show.poster_path
    : `https://image.tmdb.org/t/p/w780${show.poster_path}`;

  const profilePic =
    (user.picture ? user.picture.slice(0, -4) + "1080" : null) || "/avatar.jpg";

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="review-hero">
      {/* MOBILE BANNER HEADER */}
      <div className="review-hero-mobile-banner">
        <div className="review-hero-banner-content">
          <Link to={`/show/${id}`}>
            <img
              src={showImageUrl}
              alt={show.name}
              className="review-hero-poster"
            />
          </Link>
          <div className="review-hero-banner-meta">
            <div>
              <div className="review-hero-title-row">
                <span className="review-hero-title">{episodeData.name}</span>
              </div>
              <div className="review-hero-subtitle-row">
                <Link to={`/show/${id}`} className="review-hero-subtitle-show">
                  {show.name}
                </Link>
                <span className="review-hero-subtitle-se">
                  {" "}
                  · S{seasonNumber}E{episodeNumber}
                </span>
              </div>
            </div>
            {review.rating !== undefined && (
              <div className="show-data-rating review-hero-banner-score">
                <div className="show-data-rating-score">
                  {review.rating.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP POSTER — hidden on mobile */}
      <Link to={`/show/${id}`} className="review-hero-desktop-poster">
        <img
          src={showImageUrl}
          alt={show.name}
          className="review-hero-poster"
        />
      </Link>

      {/* CONTENT */}
      <div className="review-hero-content">
        {/* USER */}
        <div className="review-hero-user">
          <img
            src={profilePic}
            className="review-hero-avatar"
            onClick={goToProfile}
          />
          <span>
            Review by{" "}
            <strong className="review-hero-user-name" onClick={goToProfile}>
              {user.name}
            </strong>
          </span>
        </div>

        <div className="review-hero-divider" />

        {/* DESKTOP: title + score in main grid */}
        <div className="review-hero-main review-hero-desktop-main">
          <div className="review-hero-left">
            <div className="review-hero-title-row">
              <span className="review-hero-title">{episodeData.name}</span>
            </div>
            <div className="review-hero-subtitle-row">
              <Link to={`/show/${id}`} className="review-hero-subtitle-show">
                {show.name}
              </Link>
              <span className="review-hero-subtitle-se">
                {" "}
                · S{seasonNumber}E{episodeNumber}
              </span>
            </div>
            {review.timestamp && (
              <p className="review-hero-date">
                Reviewed {formatRelativeTime(review.timestamp)}
              </p>
            )}
            <p className="review-hero-text">{review.comment}</p>
          </div>
          {review.rating !== undefined && (
            <div className="review-hero-right">
              <div className="show-data-rating">
                <div className="show-data-rating-score">
                  {review.rating.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE: date + review text only */}
        <div className="review-hero-mobile-body">
          {review.timestamp && (
            <p className="review-hero-date">
              Reviewed {formatRelativeTime(review.timestamp)}
            </p>
          )}
          <p className="review-hero-text">{review.comment}</p>
        </div>
      </div>
    </div>
  );
}
