import { useState } from "react";
import { Link } from "react-router-dom";
import ShowTooltip from "../components/ShowTooltip";
import ShowPlaceholder from "../components/ShowPlaceholder";
import { useUser } from "../UserContext";
import { useUserWatchStatus } from "../hooks/useUser";
import { useUpdateWatchStatus } from "../hooks/useMutations";
import { useShowAverageRating } from "../hooks/useShow";

type ShowItem = {
  id?: string | number;
  show_id?: string | number;
  name?: string;
  show_name?: string;
  poster_path?: string;
  image_url?: string;
  first_air_date?: string;
  rating?: number;
  overview?: string;
};

type UserItem = {
  id?: string | number;
  user_id?: string | number;
  name?: string;
  username?: string;
  picture?: string;
};

type SearchResultsWithPaginationProps = {
  items: ShowItem[] | UserItem[];
  searchType: "shows" | "users";
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/* Page tracker function */
const generatePageDots = (
  currentPage: number,
  totalPages: number,
): (number | string)[] => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return pages;
  }

  pages.push(1);

  if (currentPage > 4) {
    pages.push("...");
  }

  for (
    let i = Math.max(2, currentPage - 1);
    i <= Math.min(totalPages - 1, currentPage + 1);
    i++
  ) {
    pages.push(i);
  }

  if (currentPage < totalPages - 3) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
};

/* Show image */
function ShowResultImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return <ShowPlaceholder className="search-result-img-show" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="search-result-img-show"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

/* Watchlist button */
function WatchListButton({ showId }: { showId: string | number }) {
  const user_id = useUser().userId;

  const { data: watchStatusData, isLoading: watchStatusLoading } =
    useUserWatchStatus(user_id, String(showId));

  const updateWatchStatusMutation = useUpdateWatchStatus();

  const isOnWatchList = !!watchStatusData?.status;

  const handleAddToWatchList = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user_id || isOnWatchList) {
      return;
    }

    updateWatchStatusMutation.mutate({
      user_id,
      show_id: String(showId),
      status: "want_to_watch",
    });
  };

  // Don't show anything for logged-out users,
  // while loading, or if already in any watch status.
  if (!user_id || isOnWatchList) {
    return null;
  }

  return (
    <button
      type="button"
      className="watch-list-button watch-list-button-grid"
      onClick={handleAddToWatchList}
      disabled={updateWatchStatusMutation.isPending}
      aria-label="Add to Want to Watch"
      title="Add to Want to Watch"
    >
      +
    </button>
  );
}

/* Show grid result (poster + rating + watchlist button + title) */
function ShowGridResult({ show }: { show: ShowItem }) {
  const id = show.id ?? show.show_id;
  const name = show.name ?? show.show_name;
  const imagePath = show.poster_path ?? show.image_url;

  const imageUrl = imagePath?.startsWith("http")
    ? imagePath
    : imagePath
      ? `https://image.tmdb.org/t/p/w500${imagePath}`
      : null;

  const { data: ratingData } = useShowAverageRating(id);

  return (
    <div className="search-result">
      {/* Poster area */}
      <div className="search-result-poster-wrapper">
        <Link
          to={`/show/${encodeURIComponent(id ?? "")}`}
          className="search-result-link"
        >
          <div className="search-result-poster-content">
            <ShowTooltip
              show={{
                name: show.name,
                first_air_date: show.first_air_date,
                overview: show.overview,
                rating: ratingData?.average_rating,
              }}
            >
              {imageUrl ? (
                <ShowResultImage src={imageUrl} alt={name ?? ""} />
              ) : (
                <ShowPlaceholder className="search-result-img-show" />
              )}
            </ShowTooltip>

            {/* Rating */}
            {ratingData?.average_rating != null && (
              <div className="poster-rating">
                {Number(ratingData.average_rating).toFixed(1)}
              </div>
            )}

            {/* Watchlist button */}
            {id !== undefined && id !== null && <WatchListButton showId={id} />}
          </div>
        </Link>
      </div>

      {/* Show title */}
      <Link
        to={`/show/${encodeURIComponent(id ?? "")}`}
        className="search-result-link"
      >
        <p>{name}</p>
      </Link>
    </div>
  );
}

export default function SearchResultsWithPagination({
  items,
  searchType,
  currentPage,
  totalPages,
  onPageChange,
}: SearchResultsWithPaginationProps) {
  const pageDots = generatePageDots(currentPage, totalPages);

  return (
    <div>
      {/* Grid */}
      <div className="search-results-grid">
        {items.map((item) => {
          /* =========================
             SHOW RESULT
          ========================= */
          if (searchType === "shows") {
            const show = item as ShowItem;
            const id = show.id ?? show.show_id;
            const name = show.name ?? show.show_name;

            return <ShowGridResult key={id ?? name} show={show} />;
          }

          /* =========================
             USER RESULT
          ========================= */
          const user = item as UserItem;

          const id = user.id ?? user.user_id;
          const name = user.name ?? user.username;

          const picture = user.picture
            ? user.picture.slice(0, -4) + "1080"
            : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg";

          return (
            <Link
              to={`/profile/${encodeURIComponent(id ?? "")}`}
              key={id ?? name}
              className="search-result-link"
            >
              <div className="search-result user-result">
                <img
                  src={picture}
                  alt={name ?? ""}
                  className="search-result-img-user"
                />

                <p>{name}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <nav aria-label="Pagination" className="pagination-nav">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="pagination-arrow"
            >
              ◀
            </button>

            <ul className="pagination-list">
              {pageDots.map((page, idx) =>
                page === "..." ? (
                  <li key={`ellipsis-${idx}`} className="pagination-ellipsis">
                    &hellip;
                  </li>
                ) : (
                  <li key={page}>
                    <button
                      onClick={() => onPageChange(Number(page))}
                      className={`pagination-btn ${
                        page === currentPage ? "active" : ""
                      }`}
                    >
                      {page}
                    </button>
                  </li>
                ),
              )}
            </ul>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="pagination-arrow"
            >
              ▶
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
