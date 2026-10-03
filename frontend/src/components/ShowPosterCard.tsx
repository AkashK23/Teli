
import { useState } from "react";
import { Link } from "react-router-dom";
import ShowTooltip from "./ShowTooltip";
import ShowPlaceholder from "./ShowPlaceholder";
import { useShowDetails, useShowAverageRating } from "../hooks/useShow";
import { useUserWatchStatus } from "../hooks/useUser";
import { useUpdateWatchStatus } from "../hooks/useMutations";
import { useUser } from "../UserContext";

interface ShowPosterCardProps {
  showId: string | number;
  className?: string;
  showName?: boolean;
}

export default function ShowPosterCard({
  showId,
  className,
  showName,
}: ShowPosterCardProps) {
  const [imgError, setImgError] = useState(false);

  const user_id = useUser().userId;

  const { data: show } = useShowDetails(showId);
  const { data: ratingData } = useShowAverageRating(showId);

  const { data: watchStatusData } =
    useUserWatchStatus(user_id, String(showId));

  const updateWatchStatusMutation = useUpdateWatchStatus();

  const isOnWatchList = !!watchStatusData?.status;

  const imagePath = show?.poster_path;
  const imageUrl = imagePath?.startsWith("http")
    ? imagePath
    : imagePath
      ? `https://image.tmdb.org/t/p/w500${imagePath}`
      : show?.image_url || show?.thumbnail || null;

  const handleAddToWatchList = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user_id || isOnWatchList) return;

    updateWatchStatusMutation.mutate({
      user_id,
      show_id: String(showId),
      status: "want_to_watch",
    });
  };

  return (
    <Link to={`/show/${showId}`} className="show-link">
      <div className="show-poster-wrapper">
        <ShowTooltip
          show={{
            name: show?.name,
            first_air_date: show?.first_air_date,
            overview: show?.overview,
            rating: ratingData?.average_rating,
          }}
        >
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={show?.name || "Show poster"}
              className={className}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <ShowPlaceholder className={className} />
          )}
        </ShowTooltip>

        {ratingData?.average_rating != null && (
          <div className="poster-rating">
            {Number(ratingData.average_rating).toFixed(1)}
          </div>
        )}

        {user_id && !isOnWatchList && (
          <button
            type="button"
            className="watch-list-button"
            onClick={handleAddToWatchList}
            disabled={updateWatchStatusMutation.isPending}
            aria-label="Add to Watchlist"
            title="Add to Watchlist"
          >
            +
          </button>
        )}
      </div>

      {showName && show?.name && (
        <span className="staff-title">{show.name}</span>
      )}
    </Link>
  );
}
