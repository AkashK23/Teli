import React from "react";
import { useNavigate } from "react-router-dom";
import ShowTooltip from "../components/ShowTooltip";
import ReactDOM from "react-dom";
import { useShowDetails, useShowAverageRating } from "../hooks/useShow";
import { useUserProfile } from "../hooks/useUser";

interface ReviewCardProps {
  showId: string;
  userId: string;
  comment?: string;
  rating?: number;
  compact?: boolean;
  reviewDate?: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  showId,
  userId,
  comment,
  rating,
  compact,
  reviewDate,
}) => {
  const navigate = useNavigate();
  const { data: show } = useShowDetails(showId);
  const { data: ratingData } = useShowAverageRating(showId);
  const { data: user } = useUserProfile(userId);

  const imagePath = show?.poster_path;
  const showImageUrl = imagePath?.startsWith("http")
    ? imagePath
    : imagePath
    ? `https://image.tmdb.org/t/p/w500${imagePath}`
    : show?.image_url || show?.thumbnail || null;

  const showName = show?.name;
  const overview = show?.overview;
  const firstAirDate = show?.first_air_date;
  const averageRating = ratingData?.average_rating;
  const profilePic =
    (user?.picture ? user.picture.slice(0, -4) + "1080" : null) ||
    "/avatar.jpg";
  const userName = user?.name;

const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    navigate(`/profile/${userId}`);
};

const goToShow = () => {
    navigate(`/show/${encodeURIComponent(showId)}`);
};

const [expanded, setExpanded] = React.useState(false);
const commentRef = React.useRef<HTMLParagraphElement>(null);
const [isOverflowing, setIsOverflowing] = React.useState(false);
const cardRef = React.useRef<HTMLDivElement>(null);
const [cardPosition, setCardPosition] = React.useState<{
  top: number;
  left: number;
} | null>(null);


React.useEffect(() => {
  if (commentRef.current) {
    const el = commentRef.current;
    setIsOverflowing(el.scrollHeight > el.clientHeight);
  }
}, [comment, expanded]);


const handleCardClick = (e: React.MouseEvent) => {
  if (cardRef.current) {
    const rect = cardRef.current.getBoundingClientRect();
    setCardPosition({
      top: rect.top + window.scrollY, // account for scroll
      left: rect.left + window.scrollX,
    });
  }
  setExpanded(true);
};


return (
  <>
    {/* COLLAPSED CARD */}
    <div
      ref={cardRef}
      className={`rating-card ${compact ? "compact" : ""}`}
      onClick={handleCardClick}
    >
      {showImageUrl && (
        <ShowTooltip
          show={{
            name: showName,
            first_air_date: firstAirDate,
            overview: overview,
            rating: averageRating,
          }}
        >
          <img
            src={showImageUrl}
            alt={showName || "Show poster"}
            className="rating-show-img"
            onClick={(e) => {
              e.stopPropagation();
              goToShow();
            }}
          />
        </ShowTooltip>
      )}

      <div className="rating-details">
        <div className="rating-text">
          <p
            className="rating-show-name"
            onClick={(e) => {
              e.stopPropagation();
              goToShow();
            }}
          >
            {showName}
          </p>

          <p
            ref={commentRef}
            className={`rating-comment ${
              !expanded && isOverflowing ? "fade" : ""
            }`}
          >
            {comment}
          </p>

          <div className="rating-user" onClick={goToProfile}>
            <img
              src={profilePic}
              className="review-avatar"
              alt={`${userName}'s profile`}
            />
            <p className="rating-user-name">{userName}</p>
            <span className="review-date">{reviewDate}</span>
          </div>
        </div>
      </div>

      <div className="rating-score">{rating}</div>
    </div>

    {/* EXPANDED OVERLAY */}
    {expanded &&
      ReactDOM.createPortal(
        <div className="review-overlay" onClick={() => setExpanded(false)}>
          <div
            className="rating-card expanded"
            onClick={(e) => e.stopPropagation()}
          >
            {showImageUrl && (
              <img
                src={showImageUrl}
                alt={showName || "Show poster"}
                className="rating-show-img"
                onClick={(e) => {
                  e.stopPropagation();
                  goToShow();
                }}
              />
            )}

            <div className="rating-details">
              <div className="rating-text">
                <p
                  className="rating-show-name"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToShow();
                  }}
                >
                  {showName}
                </p>

                <p className="rating-comment full">{comment}</p>

                <div className="rating-user" onClick={goToProfile}>
                  <img
                    src={profilePic}
                    className="review-avatar"
                    alt={`${userName}'s profile`}
                  />
                  <p className="rating-user-name">{userName}</p>
                  <span className="review-date">{reviewDate}</span>
                </div>
              </div>
            </div>

            <div className="rating-score">{rating}</div>
          </div>
        </div>,
      document.body
  )}
  </>
);
};


export default ReviewCard;
