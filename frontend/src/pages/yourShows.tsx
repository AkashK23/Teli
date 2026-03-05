import { useState } from "react";
import { useParams } from "react-router-dom";
import ShowsGrid from "../components/ShowsGrid";
import { useEnrichedWatchList } from "../hooks/useUser";

export default function YourShows() {
  const [watchStatus, setWatchStatus] = useState<
    "want_to_watch" | "currently_watching" | "watched"
  >("want_to_watch");
  const [currentPage, setCurrentPage] = useState(1);

  const { userId } = useParams<{ userId: string }>();

  const { data: shows, isLoading } = useEnrichedWatchList(userId, watchStatus);

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
            onClick={() => {
              setWatchStatus("want_to_watch");
              setCurrentPage(1);
            }}
          >
            Want To Watch
          </div>
          <div
            className={`toggle-option-yourshows ${
              watchStatus === "currently_watching" ? "active" : ""
            }`}
            onClick={() => {
              setWatchStatus("currently_watching");
              setCurrentPage(1);
            }}
          >
            Currently Watching
          </div>
          <div
            className={`toggle-option-yourshows ${
              watchStatus === "watched" ? "active" : ""
            }`}
            onClick={() => {
              setWatchStatus("watched");
              setCurrentPage(1);
            }}
          >
            Watched
          </div>

          <div className={`toggle-slider-yourshows ${watchStatus}`} />
        </div>

        <div className="yourshows-content">
          {!shows || shows.length === 0 ? (
            <div className="no-shows-message">No shows in this list.</div>
          ) : (
            <ShowsGrid
              items={shows}
              searchType="shows"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
