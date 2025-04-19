import React, { useState } from "react";
import axios from "axios";
import { Link } from 'react-router-dom';

interface MultiSelectProps {
  label: string;
  options: (string | { label: string; years: string[] })[]; // Updated type to support groups
  selected: string[];
  setSelected: (values: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({ label, options, selected, setSelected }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };



  return (
    <div className="multi-select-container">
      <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}>
        {selected.length === 0 ? label : selected.join(", ")}
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="dropdown-list">
          {options.map((option, index) => {
            if (typeof option === "string") {
              return (
                <label key={option} className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  {option}
                </label>
              );
            } else {
              return (
                <div key={index}>
                  <div className="decade-header">{option.label}</div>
                  {option.years.map((year) => (
                    <label key={year} className="dropdown-item">
                      <input
                        type="checkbox"
                        checked={selected.includes(year)}
                        onChange={() => toggleOption(year)}
                      />
                      {year}
                    </label>
                  ))}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

const SortByDropdown: React.FC<{ selected: string; setSelected: (value: string) => void }> = ({ selected, setSelected }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionSelect = (value: string) => {
    setSelected(value);
    setIsOpen(false);
  };

  const options = [
    { label: "Most Popular", value: "popular" },
    { label: "Highest Rating", value: "rating" },
    { label: "Newest", value: "newest" },
    { label: "Recommended", value: "recommended" },
  ];

  return (
    <div className="multi-select-container">
      <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}>
        {selected === "" ? "Sort By" : options.find((option) => option.value === selected)?.label}
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="dropdown-list">
          {options.map((option) => (
            <label key={option.value} className="dropdown-item">
              <input
                type="checkbox"
                checked={selected === option.value}
                onChange={() => handleOptionSelect(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Browse() {
  const [genre, setGenre] = useState<string[]>([]);
  const [year, setYear] = useState<string[]>([]);
  const [service, setService] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // ← search state
  const [searchedShow, setSearchedShow] = useState<any>(null); // Store search result


  const tvGenres = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", 
    "Family", "Fantasy", "Game-Show", "History", "Horror", "Music", "Musical", "Mystery", 
    "News", "Reality-TV", "Romance", "Sci-Fi", "Sport", "Talk-Show", "Thriller", "War", "Western"
  ];

  const streamingServices = [
    "Netflix", "Hulu", "Amazon Prime Video", "Disney+", "HBO Max", "Apple TV+", "Peacock", 
    "Paramount+", "YouTube", "Tubi", "Crunchyroll"
  ];

  // Create decades sorted from latest to earliest with years reversed within each decade
  const decades = Array.from({ length: 11 }, (_, i) => {
    const start = 1920 + i * 10;
    const years = Array.from({ length: 10 }, (_, j) => (start + j).toString()).reverse(); // Reverse years within the decade
    const label = `${start + 9}s`; // Update label to display in "X0s" format
    return { label, years };
  });

  // Ensure the decades are ordered from latest to earliest
  const sortedDecades = decades.sort((a, b) => {
    const startA = parseInt(a.label.split('s')[0]);
    const startB = parseInt(b.label.split('s')[0]);
    return startB - startA; // Change the order to descending
  });

  const searchShows = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await axios.get("http://127.0.0.1:5001/shows/search", {
        params: { query: searchTerm }
      });
      console.log("Search results:", response.data);
      if (response.data?.data?.length > 0) {
        setSearchedShow(response.data.data[0]); // store the first match
      } else {
        setSearchedShow(null); // clear if no match
      }
    } catch (error) {
      console.error("Error fetching shows:", error);
      setSearchedShow(null);
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

        <div className="filters-row">
            <MultiSelectDropdown label="Genre" options={tvGenres} selected={genre} setSelected={setGenre} />
            <MultiSelectDropdown label="Year" options={sortedDecades} selected={year} setSelected={setYear} />
            <MultiSelectDropdown label="Service" options={streamingServices} selected={service} setSelected={setService} />
            <SortByDropdown selected={sortBy} setSelected={setSortBy} />
        </div>

        {searchedShow && searchedShow.image_url && (
        <Link to={`/show/${encodeURIComponent(searchedShow.name)}`} className="search-result-link">
          <div className="search-result">
            <img
              src={searchedShow.image_url}
              alt={searchedShow.name}
              className="search-result-img"
            />
            <p>{searchedShow.name}</p>
          </div>
        </Link>
      )}
        </div>


  );
}
