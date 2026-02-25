import { Link } from "react-router-dom";
import ShowTooltip from "../components/ShowTooltip";

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
  totalPages: number
): (number | string)[] => {
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (currentPage > 4) pages.push("...");
  for (
    let i = Math.max(2, currentPage - 1);
    i <= Math.min(totalPages - 1, currentPage + 1);
    i++
  ) {
    pages.push(i);
  }
  if (currentPage < totalPages - 3) pages.push("...");
  pages.push(totalPages);
  return pages;
};

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
          if (searchType === "shows") {
            const show = item as ShowItem;
            const id = show.id || show.show_id;
            const name = show.name || show.show_name;
            const imagePath = show.poster_path || show.image_url;
            const imageUrl = imagePath?.startsWith("http")
              ? imagePath
              : imagePath
              ? `https://image.tmdb.org/t/p/w500${imagePath}`
              : "https://via.placeholder.com/150x225?text=No+Image";

            return (
              <Link
                to={`/show/${encodeURIComponent(id ?? "")}`}
                key={id || name}
                className="search-result-link"
              >
                <div className="search-result">
                  <ShowTooltip
                    show={{
                      name: show.name,
                      first_air_date: show.first_air_date,
                      overview: show.overview,
                      rating: show.rating,
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={name ?? ""}
                      className="search-result-img-show"
                    />
                  </ShowTooltip>
                  <p>{name}</p>
                </div>
              </Link>
            );
          }

          const user = item as UserItem;
          const id = user.id || user.user_id;
          const name = user.name || user.username;
          const picture = user.picture
            ? user.picture.slice(0, -4) + "1080"
            : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg";

          return (
            <Link
              to={`/profile/${encodeURIComponent(id ?? "")}`}
              key={id || name}
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
      <div className="grid-container">
        <nav aria-label="Pagination" className="grid-nav">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="arrow-button-left"
            style={{
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ◀
          </button>

          <ul className="dots-container">
            {pageDots.map((page, idx) =>
              page === "..." ? (
                <li key={`ellipsis-${idx}`} className="page-ellipses">
                  &hellip;
                </li>
              ) : (
                <li
                  key={page}
                  style={{ textAlign: "center", cursor: "pointer" }}
                >
                  <div
                    onClick={() => onPageChange(Number(page))}
                    className="page-dots"
                    style={{
                      backgroundColor: page === currentPage ? "blue" : "#ccc",
                    }}
                  />
                  <div
                    className="current-page"
                    style={{
                      color: page === currentPage ? "blue" : "#333",
                      fontWeight: page === currentPage ? "bold" : "normal",
                    }}
                  >
                    {page}
                  </div>
                </li>
              )
            )}
          </ul>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="arrow-button-right"
            style={{
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            ▶
          </button>
        </nav>
      </div>
    </div>
  );
}
