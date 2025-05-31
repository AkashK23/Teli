import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";

export default function Search() {
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const location = useLocation();

  const query = new URLSearchParams(location.search).get("query") || "";

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;

      try {
        const response = await axios.get("http://127.0.0.1:5001/shows/search", {
          params: { query }
        });
        if (response.data?.results?.length > 0) {
          setSearchedShows(response.data.results);
        } else {
          setSearchedShows([]);
        }
      } catch (error) {
        console.error("Error fetching shows:", error);
        setSearchedShows([]);
      }
    };

    fetchSearchResults();
  }, [query]);

  return (
    <div className="content-wrapper">
      {searchedShows.length > 0 && (
        <div className="search-results-grid">
          {searchedShows.map((show) => {
            const imageUrl = show.poster_path?.startsWith("http")
              ? show.poster_path
              : `https://image.tmdb.org/t/p/w500${show.poster_path}`;

            return (
              <Link
                to={`/show/${encodeURIComponent(show.id)}`}
                key={show.id || show.name}
                className="search-result-link"
              >
                <div className="search-result">
                  <img src={imageUrl} alt={show.name} className="search-result-img" />
                  <p>{show.name}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
