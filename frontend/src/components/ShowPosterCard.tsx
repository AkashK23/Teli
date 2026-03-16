import { useState } from "react";
import { Link } from "react-router-dom";
import ShowTooltip from "./ShowTooltip";
import ShowPlaceholder from "./ShowPlaceholder";
import { useShowDetails } from "../hooks/useShow";
import { useShowAverageRating } from "../hooks/useShow";

interface ShowPosterCardProps {
  showId: string | number;
  className?: string;
  showName?: boolean;
}

export default function ShowPosterCard({ showId, className, showName }: ShowPosterCardProps) {
  const [imgError, setImgError] = useState(false);
  const { data: show } = useShowDetails(showId);
  const { data: ratingData } = useShowAverageRating(showId);

  const imagePath = show?.poster_path;
  const imageUrl = imagePath?.startsWith("http")
    ? imagePath
    : imagePath
    ? `https://image.tmdb.org/t/p/w500${imagePath}`
    : show?.image_url || show?.thumbnail || null;

  return (
    <Link to={`/show/${showId}`} className="show-link">
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
      {showName && show?.name && (
        <span className="staff-title">{show.name}</span>
      )}
    </Link>
  );
}
