import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useShowDetails, useShowAverageRating } from "../hooks/useShow";
import { useUserProfile, useUserRatings } from "../hooks/useUser";
import { formatRelativeTime } from "../components/formatRelativeTime";

export default function ReviewDetails() {
  const { id, userId } = useParams<{ id: string; userId: string }>();
  const navigate = useNavigate();

  const { data: show } = useShowDetails(id);
  const { data: ratingData } = useShowAverageRating(id);
  const { data: user } = useUserProfile(userId);
  const { data: userRatings = [] } = useUserRatings(userId);

  const review = (userRatings as any[]).find(
    (r: any) => String(r.show_id) === String(id),
  );

  if (!show || !user || !review) return <div>Not found</div>;

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
            <div className="review-hero-title-row">
              <Link to={`/show/${id}`} className="review-hero-title">
                {show.name}
              </Link>
              {show.first_air_date && (
                <span className="review-hero-year">
                  {show.first_air_date.slice(0, 4)}
                </span>
              )}
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

        {/* DESKTOP: title+score in main grid. MOBILE: already shown in banner */}
        <div className="review-hero-main review-hero-desktop-main">
          <div className="review-hero-left">
            <div className="review-hero-title-row">
              <Link to={`/show/${id}`} className="review-hero-title">
                {show.name}
              </Link>
              {show.first_air_date && (
                <span className="review-hero-year">
                  {show.first_air_date.slice(0, 4)}
                </span>
              )}
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
