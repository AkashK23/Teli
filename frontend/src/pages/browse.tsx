import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from 'react-router-dom';

interface MultiSelectProps {
  label: string;
  options: (string | { label: string; years: string[] })[];
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

  useEffect(() => {
    setIsOpen(false);
  }, [selected]);

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
  interface CodeLabel {
    code: string;
    label: string;
  }

  const [genre, setGenre] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [year, setYear] = useState<string[]>([]);
  const [service, setService] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedShows, setSearchedShows] = useState<any[]>([]);
  const [searchNames, setSearchNames] = useState<string[]>([]);
  const [country, setCountry] = useState<string[]>(["United States of America"]);
  const [language, setLanguage] = useState<string[]>(["English"]);
  const [countryOptions, setCountryOptions] = useState<CodeLabel[]>([]);
  const [languageOptions, setLanguageOptions] = useState<CodeLabel[]>([]);
  const [genreOptions, setGenreOptions] = useState<CodeLabel[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);




  // const tvGenres = [
  //   "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", 
  //   "Family", "Fantasy", "Game-Show", "History", "Horror", "Music", "Musical", "Mystery", 
  //   "News", "Reality-TV", "Romance", "Sci-Fi", "Sport", "Talk-Show", "Thriller", "War", "Western"
  // ];

  const streamingServices = [
    "Netflix", "Hulu", "Amazon Prime Video", "Disney+", "HBO Max", "Apple TV+", "Peacock", 
    "Paramount+", "YouTube", "Tubi", "Crunchyroll"
  ];

  const decades = Array.from({ length: 11 }, (_, i) => {
    const start = 1920 + i * 10;
    const years = Array.from({ length: 10 }, (_, j) => (start + j).toString()).reverse();
    const label = `${start + 9}s`;
    return { label, years };
  });

  const sortedDecades = decades.sort((a, b) => {
    const startA = parseInt(a.label.split('s')[0]);
    const startB = parseInt(b.label.split('s')[0]);
    return startB - startA;
  });

  const getCodeFromLabel = (label: string, options: CodeLabel[]) =>
    options.find((opt) => opt.label === label)?.code || "";
  
  const fetchFilteredShows = async () => {
    try {
      // Convert country names to ISO 3166-1 codes
      const countryCodes = country
        .map(label => countryOptions.find(c => c.label === label)?.code)
        .filter(Boolean) // Remove undefined values
  
      const languageCodes = language
        .map(label => languageOptions.find(l => l.label === label)?.code)
        .filter(Boolean) // Remove undefined values

      const genreCodes = genre
        .map(label => genreOptions.find(g => g.label === label)?.code)
        .filter(Boolean) // Remove undefined values
  
        console.log(genre)
      const res = await axios.get("http://127.0.0.1:5001/shows/filter", {
        params: {
          with_origin_country: countryCodes.join(","),
          with_original_language: languageCodes.join(","),
          sort_by: "popularity.desc",
          with_genres: genreCodes.join(","),
          without_genres: "10767,10763"
        }
      });
  
      setPopularShows(res.data.results || []);
      console.log("Popular shows:", res);
      console.log("Genre codes used:", genreCodes);
    } catch (error) {
      console.error("Error fetching default shows:", error);
      setPopularShows([]);
    }
  };
  
  
  

  useEffect(() => {
    console.log("Filters changed:", { genre, year, service, country, sortBy });
    fetchFilteredShows();
  }, [genre, year, service, country, language, sortBy]);
  

  const searchShows = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await axios.get("http://127.0.0.1:5001/shows/search", {
        params: { query: searchTerm }
      });
      console.log("Search results:", response.data);
      if (response.data?.data?.length > 0) {
        setSearchedShows(response.data.data);
        const names = response.data.data.map((show: any) => show.name);
        setSearchNames(names);
        console.log("First show's genres:", response.data.data[0].genres);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const genresRes = await axios.get(`http://localhost:5001/genres`);
        const genreNames = genresRes.data.data.map((genre: any) => genre.name);
        setGenres(genreNames); 
        

        const genreRes = await axios.get(`http://localhost:5001/genres`);
        const countryRes = await axios.get("http://localhost:5001/countries");
        const langRes = await axios.get("http://localhost:5001/languages");
        const countries = countryRes.data.data
        .map((item: any): { code: string; label: string } => ({
          code: item.iso_3166_1,
          label: item.english_name
        }))
        .sort((a: { code: string; label: string }, b: { code: string; label: string }) =>
          a.label.localeCompare(b.label)
        );

        const languages = langRes.data.data
        .map((item: any): { code: string; label: string } => ({
          code: item.iso_639_1,
          label: `${item.english_name} (${item.iso_639_1})`
        }))
        .sort((a: { code: string; label: string }, b: { code: string; label: string }) =>
          a.label.localeCompare(b.label)
        );

        const genres = genreRes.data.data
        .map((item: any): { code: string; label: string } => ({
          code: item.id,
          label: item.name
        }))
        .sort((a: { code: string; label: string }, b: { code: string; label: string }) =>
          a.label.localeCompare(b.label)
        );


        setCountryOptions(countries);
        setLanguageOptions(languages);
        setGenreOptions(genres);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
  
    fetchData();
  }, []); // <== empty array here

  useEffect(() => {
    const fetchPopularShows = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5001/shows/filter", {
          params: {
            with_origin_country: "US",
            with_original_language: "en",
            sort_by: "popularity.desc",
            without_genres: "10767, 10763"
          }
        });
        setPopularShows(res.data.results || []);
        console.log("Popular shows:", res.data.results)
        // console.log("Genre:", genre)
      } catch (error) {
        console.error("Error fetching default shows:", error);
        setPopularShows([]);
      }
    };
  
    fetchPopularShows();
  }, []);

  return (
    <div className="content-wrapper">
      <div className="search-bar-container">
        {/* <input
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
        /> */}
      </div>

      <div className="filters-row">
        <MultiSelectDropdown label="Genre" options={genreOptions.map((g) => g.label)} selected={genre} setSelected={setGenre} />
        <MultiSelectDropdown label="Year" options={sortedDecades} selected={year} setSelected={setYear} />
        <MultiSelectDropdown label="Service" options={streamingServices} selected={service} setSelected={setService} />
        <MultiSelectDropdown label="Country" options={countryOptions.map((c) => c.label)} selected={country} setSelected={setCountry}/>
        <MultiSelectDropdown label="Language" options={languageOptions.map((l) => l.label)} selected={language} setSelected={setLanguage}/>

        <SortByDropdown selected={sortBy} setSelected={setSortBy} />
      </div>

      {popularShows.length > 0 && (
      <div className="search-results-grid">
        {popularShows.map((show) => {
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
