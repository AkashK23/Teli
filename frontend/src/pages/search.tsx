import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from 'react-router-dom';

export default function Search() {
  interface CodeLabel {
    code: string;
    label: string;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const [searchNames, setSearchNames] = useState<string[]>([]);



  const searchShows = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await axios.get("http://127.0.0.1:5001/shows/search", {
        params: { query: searchTerm }
      });
      console.log("Search results:", response.data);
      if (response.data?.results?.length > 0) {
        setSearchedShows(response.data.results);
        const names = response.data.results.map((show: any) => show.name);
        setSearchNames(names);
        console.log("First show's genres:", response.data.results[0].genres);
      } else {
        setSearchedShows([]);
        setSearchNames([]);
      }
    } catch (error) {
      console.error("Error fetching shows:", error);
      setSearchedShows([]);
      setSearchNames([]);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="search-bar-container">
        <input
          type="text"
          className="search-bar"
          placeholder="Search titles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchShows();
            }
          }}
        />
      </div>
      
      {searchedShows.length > 0 && (
      <div className="search-results-grid">
        {searchedShows.map((show) => {
          const imagePath = show.poster_path;
          // console.log(show)
          const imageUrl = imagePath?.startsWith("http")
            ? imagePath
            : `https://image.tmdb.org/t/p/w500${imagePath}`;

          return (
            <Link
              to={`/show/${encodeURIComponent(show.id)}`}
              key={show.id || show.name}
              className="search-result-link"
            >
              <div className="search-result">
                <img
                  src={imageUrl}
                  alt={show.name}
                  className="search-result-img"
                />
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
