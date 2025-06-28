import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from 'react-router-dom';

/* Multiple Select Dropdown Function */
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

/* Page Tracker Function */
const generatePageDots = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  // Show ellipsis after
  if (currentPage > 2) {
    pages.push("...");
  }

  // Middle range
  for (
    let i = Math.max(1, currentPage - 1);
    i <= Math.min(totalPages, currentPage + 1);
    i++
  ) {
    pages.push(i);
  }

  // Show ellipsis after
  if (currentPage < totalPages - 3) {
    pages.push("...");
  }

  return pages;
};




/* Browse Page */
export default function Browse() {
  {/* Code Label */}
  interface CodeLabel {
    code: string;
    label: string;
  }


  const [genre, setGenre] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  // const [minYear, setMinYear] = useState(1920);
  // const [maxYear, setMaxYear] = useState(new Date().getFullYear());
  const [service, setService] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [country, setCountry] = useState<string[]>([]);
  const [language, setLanguage] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<CodeLabel[]>([]);
  const [languageOptions, setLanguageOptions] = useState<CodeLabel[]>([]);
  const [genreOptions, setGenreOptions] = useState<CodeLabel[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersReady, setFiltersReady] = useState(false);


  const pageDots = generatePageDots(currentPage, totalPages);
  const goPrev = () => {
    setCurrentPage((p) => (p > 1 ? p - 1 : p));
  };

  const goNext = () => {
    setCurrentPage((p) => (p < totalPages ? p + 1 : p));
  };

  const streamingServices = [
    "Netflix", "Hulu", "Amazon Prime Video", "Disney+", "HBO Max", "Apple TV+", "Peacock", 
    "Paramount+", "YouTube", "Tubi", "Crunchyroll"
  ];

  const getCodeFromLabel = (label: string, options: CodeLabel[]) =>
    options.find((opt) => opt.label === label)?.code || "";

  /* Pull filter options from backend */
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

        // console.log(languages)
        setCountryOptions(countries);
        setLanguageOptions(languages);
        setGenreOptions(genres);

        setFiltersReady(true);
        
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchData();
  }, [currentPage]);

  useEffect(() => {
    if (countryOptions.length > 0 && country.length === 0) {
      const defaultCountry = countryOptions.find(
        (c) => c.label === "United States of America"
      );
      if (defaultCountry) setCountry([defaultCountry.label]);
    }
  }, [countryOptions]);

  useEffect(() => {
    if (languageOptions.length > 0 && language.length === 0) {
      const defaultLang = languageOptions.find((l) =>
        l.label.startsWith("English")
      );
      if (defaultLang) setLanguage([defaultLang.label]);
    }
  }, [languageOptions]);
  
  
  /* Fetch filtered shows from backend */
  useEffect(() => {
    if (!filtersReady) return;
    fetchFilteredShows();
  }, [genre, service, country, language, sortBy, currentPage]);

  const fetchFilteredShows = async (
    updatedGenre = genre,
    updatedService = service,
    updatedCountry = country,
    updatedLanguage = language,
    updatedSortBy = sortBy,
    updatedPage = currentPage
  ) => {
    try {
      const countryCodes = updatedCountry
        .map(label => countryOptions.find(c => c.label === label)?.code)
        .filter(Boolean);
  
      const languageCodes = updatedLanguage
        .map(label => languageOptions.find(l => l.label === label)?.code)
        .filter(Boolean);
  
      const genreCodes = updatedGenre
        .map(label => genreOptions.find(g => g.label === label)?.code)
        .filter(Boolean);
  
      const res = await axios.get("http://127.0.0.1:5001/shows/filter", {
        params: {
          with_origin_country: countryCodes.join("|"),
          with_original_language: languageCodes.join("|"),
          with_genres: genreCodes.join("|"),
          without_genres: "10767,10763",
          sort_by: updatedSortBy === "" ? "popularity.desc" : updatedSortBy + ".desc",
          page: updatedPage,
        },
      });
  
      setPopularShows(res.data.results || []);
      setTotalPages(res.data.total_pages);
    } catch (error) {
      console.error("Error fetching filtered shows:", error);
      setPopularShows([]);
    }
  };
  

  /* Update filters for next page */
  const updateGenre = (newGenre: string[]) => {
    setGenre(newGenre);
    setCurrentPage(1);
    fetchFilteredShows(newGenre, service, country, language, sortBy, 1);
  };

  const updateService = (newService: string[]) => {
    setService(newService);
    setCurrentPage(1);
    fetchFilteredShows(genre, newService, country, language, sortBy, 1);
  };

  const updateCountry = (newCountry: string[]) => {
    setCountry(newCountry);
    setCurrentPage(1);
    fetchFilteredShows(genre, service, newCountry, language, sortBy, 1);
  };

  const updateLanguage = (newLanguage: string[]) => {
    setLanguage(newLanguage);
    setCurrentPage(1);
    fetchFilteredShows(genre, service, country, newLanguage, sortBy, 1);
  };

  const updateSortBy = (newSortBy: string) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
    fetchFilteredShows(genre, service, country, language, newSortBy, 1);
  };

  const clearAllFilters = () => {
    setGenre([]);
    setService([]);
    setCountry([]);
    setLanguage([]);
    setSortBy("");
    setCurrentPage(1);
  };
  
  return (
    <div className="browse-container" style={{ display: "flex" }}>
      {/* Sidebar */}
      <div
        className="filters-sidebar"
        style={{
          width: "250px",
          padding: "1rem",
          borderRight: "1px solid #ccc",
        }}
      >
        <h3 style={{ marginBottom: "1rem" }}>Filters</h3>
        <div
          className="filters-column"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <SortByDropdown selected={sortBy} setSelected={updateSortBy} />
          <MultiSelectDropdown
            label="Genre"
            options={genreOptions.map((g) => g.label)}
            selected={genre}
            setSelected={updateGenre}
          />
          <MultiSelectDropdown
            label="Service"
            options={streamingServices}
            selected={service}
            setSelected={updateService}
          />
          <MultiSelectDropdown
            label="Country"
            options={countryOptions.map((c) => c.label)}
            selected={country}
            setSelected={updateCountry}
          />
          <MultiSelectDropdown
            label="Language"
            options={languageOptions.map((l) => l.label)}
            selected={language}
            setSelected={updateLanguage}
          />
          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={clearAllFilters}
              disabled={
                genre.length === 0 &&
                service.length === 0 &&
                country.length === 0 &&
                language.length === 0 &&
                sortBy === ""
              }
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  genre.length === 0 &&
                  service.length === 0 &&
                  country.length === 0 &&
                  language.length === 0 &&
                  sortBy === ""
                    ? "#ccc"
                    : "#888",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Show Grid */}
      <div style={{ flex: 1, padding: "1rem" }}>
        {popularShows.length > 0 && (
          <div className="search-results-grid">
            {popularShows.map((show) => {
              const imagePath = show.poster_path;
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

        {/* Page Ticker */}
        <div
          style={{ width: "320px", margin: "40px auto", userSelect: "none" }}
        >
          <nav
            aria-label="Pagination"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* First page « */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "24px",
                border: "none",
                background: "none",
                marginRight: 12,
                userSelect: "none",
              }}
              aria-label="First page"
            >
              ◀◀
            </button>

            {/* Previous page ◀ */}
            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              aria-label="Previous page"
              style={{
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "24px",
                border: "none",
                background: "none",
                marginRight: 12,
                userSelect: "none",
              }}
            >
              ◀
            </button>

            {/* Page Dots */}
            <ul
              style={{
                display: "flex",
                gap: 24,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {pageDots.map((page, idx) => {
                if (page === "...") {
                  return (
                    <li
                      key={`ellipsis-${idx}`}
                      style={{ width: 24, textAlign: "center", fontSize: 18 }}
                    >
                      &hellip;
                    </li>
                  );
                }

                const isActive = page === currentPage;

                return (
                  <li
                    key={page}
                    style={{ textAlign: "center", cursor: "pointer" }}
                  >
                    <div
                      onClick={() => setCurrentPage(Number(page))}
                      style={{
                        width: 16,
                        height: 16,
                        margin: "0 auto",
                        borderRadius: "50%",
                        backgroundColor: isActive ? "blue" : "#ccc",
                        transition: "background-color 0.2s",
                      }}
                    />
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: isActive ? "blue" : "#333",
                        fontWeight: isActive ? "bold" : "normal",
                      }}
                    >
                      {page}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Next page ▶ */}
            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              style={{
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "24px",
                border: "none",
                background: "none",
                marginLeft: 12,
                userSelect: "none",
              }}
            >
              ▶
            </button>

            {/* Last page » */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "24px",
                border: "none",
                background: "none",
                marginLeft: 12,
                userSelect: "none",
              }}
              aria-label="Last page"
            >
              ▶▶
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
