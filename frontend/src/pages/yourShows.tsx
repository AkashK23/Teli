import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Tv } from "lucide-react";
import ShowsGrid from "../components/ShowsGrid";
import { useEnrichedWatchList } from "../hooks/useUser";
import { useSuggestedShows } from "../hooks/useShow";
import ShowPosterCard from "../components/ShowPosterCard";

export default function YourShows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialList =
    (searchParams.get("list") as
      | "want_to_watch"
      | "currently_watching"
      | "watched") || "want_to_watch";
  const [watchStatus, setWatchStatus] = useState<
    "want_to_watch" | "currently_watching" | "watched"
  >(initialList);
  const [currentPage, setCurrentPage] = useState(1);

  const { userId } = useParams<{ userId: string }>();

  const { data: shows, isLoading } = useEnrichedWatchList(userId, watchStatus);

  const { data: suggestedShows = [], isLoading: suggestedLoading } =
    useSuggestedShows(userId);

  console.log(suggestedShows.suggestions);

  const changeTab = (
    status: "want_to_watch" | "currently_watching" | "watched",
  ) => {
    setWatchStatus(status);
    setCurrentPage(1);
    setSearchParams({ list: status });
  };

  const totalPages = Math.max(1, Math.ceil((shows?.length ?? 0) / 20));

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="yourshows-padding">
        {/* Toggle Tabs for watch status */}
        <div className="toggle-container-yourshows">
          <div
            className={`toggle-option-yourshows ${
              watchStatus === "want_to_watch" ? "active" : ""
            }`}
            onClick={() => changeTab("want_to_watch")}
          >
            Want To Watch
          </div>
          <div
            className={`toggle-option-yourshows ${
              watchStatus === "currently_watching" ? "active" : ""
            }`}
            onClick={() => changeTab("currently_watching")}
          >
            Currently Watching
          </div>
          <div
            className={`toggle-option-yourshows ${
              watchStatus === "watched" ? "active" : ""
            }`}
            onClick={() => changeTab("watched")}
          >
            Watched
          </div>

          <div className={`toggle-slider-yourshows ${watchStatus}`} />
        </div>

        <div className="yourshows-content">
          {!shows || shows.length === 0 ? (
            <div className="empty-state-card">
              <Tv className="empty-state-icon" />
              <p>No shows in this list yet</p>
              <Link to="/browse" className="empty-state-cta">
                Browse Shows
              </Link>
            </div>
          ) : (
            <ShowsGrid
              items={shows}
              searchType="shows"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}

          {/* Suggested Shows */}
          <div className="home-section yourshows-suggested">
            <h1 className="headings">Suggested Shows</h1>

            {suggestedLoading ? (
              <div className="skeleton-row">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-poster" />
                ))}
              </div>
            ) : (
              <div className="scroll-container">
                {suggestedShows.suggestions.map((show: any) => (
                  <ShowPosterCard
                    key={show.show_id}
                    showId={show.show_id}
                    className="show-icon home-icon"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
