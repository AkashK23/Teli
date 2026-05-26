import React from "react";
import { useNavigate } from "react-router-dom";
import ShowTooltip from "../components/ShowTooltip";
import { useShowDetails, useShowAverageRating, useShowSeason } from "../hooks/useShow";
import { useUserProfile } from "../hooks/useUser";

interface EpisodeReviewCardProps {
  showId: string;
  userId: string;
  seasonNumber: number;
  episodeNumber: number;
  comment?: string;
  rating?: number;
  reviewDate?: string;
}

const EpisodeReviewCard: React.FC<EpisodeReviewCardProps> = ({
  showId,
  userId,
  seasonNumber,
  episodeNumber,
  comment,
  rating,
  reviewDate,
}) => {
  const navigate = useNavigate();
  const { data: show } = useShowDetails(showId);
  const { data: ratingData } = useShowAverageRating(showId);
  const { data: user } = useUserProfile(userId);
  const { data: seasonData } = useShowSeason(showId, seasonNumber);
  const episodeData = (seasonData?.episodes ?? []).find(
    (e: any) => e.episode_number === episodeNumber,
  );
  const commentRef = React.useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

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

  React.useEffect(() => {
    const el = commentRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollWidth > el.clientWidth);
  }, [comment]);

  const goToShow = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/show/${encodeURIComponent(showId)}`);
  };

  const goToEpisode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(
      `/show/${encodeURIComponent(showId)}/season/${seasonNumber}/episode/${episodeNumber}`,
    );
  };

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const goToReview = () => {
    navigate(
      `/show/${encodeURIComponent(showId)}/season/${seasonNumber}/episode/${episodeNumber}/review/${userId}`,
    );
  };

  const scoreColor = (n?: number) => {
    if (n === undefined) return "var(--color-bg-navbar)";
    if (n <= 3) return "#e05050";
    if (n <= 6) return "#e0a830";
    if (n <= 8) return "#5aab5a";
    return "#2d8a2d";
  };

  if (!show || !user || !episodeData) {
    console.log(episodeData);

    return <div>Not found</div>;
  }

  return (
    <div className="rc-row rc-row--episode" onClick={goToReview}>
      {/* Poster */}
      <ShowTooltip
        show={{
          name: showName,
          first_air_date: firstAirDate,
          overview,
          rating: averageRating,
        }}
      >
        <div className="rc-poster" onClick={goToShow}>
          {showImageUrl ? (
            <img
              src={showImageUrl}
              alt={showName || "Show poster"}
              className="rc-poster-img"
            />
          ) : (
            <div className="rc-poster-placeholder" />
          )}
        </div>
      </ShowTooltip>

      {/* Main content */}
      <div className="rc-body">
        <div className="rc-top rc-episode-top-row">
          {showName && (
            <span className="rc-episode-name" onClick={goToEpisode}>
              {showName} (S{seasonNumber}:E{episodeNumber})
            </span>
          )}
          <span
            className="rc-show-name rc-show-name--episode"
            onClick={goToShow}
          >
            <span className="rc-show-name-text">{episodeData.name}</span>
          </span>
        </div>

        <div className="rc-top">
          {comment && (
            <p
              ref={commentRef}
              className={`rc-comment ${isOverflowing ? "fade" : ""}`}
            >
              {comment}
            </p>
          )}
        </div>

        <div className="rc-meta">
          <img
            src={profilePic}
            alt={userName || "User"}
            className="rc-avatar"
            onClick={goToProfile}
          />
          <span className="rc-username" onClick={goToProfile}>
            {userName}
          </span>
          {reviewDate && <span className="rc-date">{reviewDate}</span>}
        </div>
      </div>

      {rating !== undefined && (
        <div className="rc-score-container">
          <span
            className="rc-score"
            style={{ backgroundColor: scoreColor(rating) }}
          >
            {rating}
          </span>
        </div>
      )}
    </div>
  );
};

export default EpisodeReviewCard;
