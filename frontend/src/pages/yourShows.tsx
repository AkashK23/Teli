import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import ShowsGrid from "../components/ShowsGrid";

export default function YourShows() {
  const [watchStatus, setWatchStatus] = useState<
    "want_to_watch" | "currently_watching" | "watched"
  >("want_to_watch");
  const [shows, setShows] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  

  const url = process.env.REACT_APP_API_URL;
  const { userId } = useParams<{ userId: string }>();

  /* Fetch shows for current watch status */
  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await axios.get(`${url}/users/${userId}/${watchStatus}`);
        const watchStatusShows = res.data;

        const updated = await Promise.all(
          watchStatusShows.map(async (show: any) => {
            try {
              const detailRes = await axios.get(`${url}/shows/${show.show_id}`);
              const showData = detailRes.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...show,
                show_name: showData?.name,
                image_url: imageUrl || null,
                id: showData.id.toString(),
              };
            } catch (err) {
              console.error("Failed to fetch image for:", show.show_name);
              return { ...show, image_url: null };
            }
          })
        );

        setShows(updated || []);
        setTotalPages(Math.max(1, Math.ceil(updated.length / 20)));
      } catch (error) {
        console.error("Error fetching shows:", error);
        setShows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, [watchStatus, currentPage, url, userId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      {/* Toggle Tabs for watch status */}
      <div className="toggle-container-yourshows">
        <div
          className={`toggle-option-yourshows ${
            watchStatus === "want_to_watch" ? "active" : ""
          }`}
          onClick={() => setWatchStatus("want_to_watch")}
        >
          Watchlist
        </div>
        <div
          className={`toggle-option-yourshows ${
            watchStatus === "currently_watching" ? "active" : ""
          }`}
          onClick={() => setWatchStatus("currently_watching")}
        >
          Currently Watching
        </div>
        <div
          className={`toggle-option-yourshows ${
            watchStatus === "watched" ? "active" : ""
          }`}
          onClick={() => setWatchStatus("watched")}
        >
          Watched
        </div>

        <div className={`toggle-slider-yourshows ${watchStatus}`} />
      </div>

      {/* If empty, show message */}
      {shows.length === 0 ? (
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
  );
}
