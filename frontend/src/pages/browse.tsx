import { useState, useEffect, useMemo } from "react";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ShowsGrid from "../components/ShowsGrid";
import { useGenres, useCountries, useLanguages } from "../hooks/useReference";
import { useFilteredShows } from "../hooks/useShow";

interface CodeLabel {
  code: string;
  label: string;
}

export default function Browse() {
  const [genre, setGenre] = useState<string[]>([]);
  const [service, setService] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [country, setCountry] = useState<string[]>([]);
  const [language, setLanguage] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Reference data — cached forever
  const { data: genresRaw, isLoading: genresLoading } = useGenres();
  const { data: countriesRaw, isLoading: countriesLoading } = useCountries();
  const { data: languagesRaw, isLoading: languagesLoading } = useLanguages();

  const loading = genresLoading || countriesLoading || languagesLoading;

  // Transform raw reference data
  const countryOptions = useMemo<CodeLabel[]>(
    () =>
      (countriesRaw ?? [])
        .map((item: any) => ({ code: item.iso_3166_1, label: item.english_name }))
        .filter((c: CodeLabel) => c.code !== "CG")
        .sort((a: CodeLabel, b: CodeLabel) => a.label.localeCompare(b.label)),
    [countriesRaw]
  );

  const languageOptions = useMemo<CodeLabel[]>(
    () =>
      (languagesRaw ?? [])
        .map((item: any) => ({
          code: item.iso_639_1,
          label: `${item.english_name} (${item.iso_639_1})`,
        }))
        .sort((a: CodeLabel, b: CodeLabel) => a.label.localeCompare(b.label)),
    [languagesRaw]
  );

  const genreOptions = useMemo<CodeLabel[]>(
    () =>
      (genresRaw ?? [])
        .map((item: any) => ({ code: item.id, label: item.name }))
        .sort((a: CodeLabel, b: CodeLabel) => a.label.localeCompare(b.label)),
    [genresRaw]
  );

  // Set default country once options are available
  useEffect(() => {
    if (country.length === 0 && countryOptions.length > 0) {
      const defaultCountry = countryOptions.find(
        (c) => c.label === "United States of America"
      );
      if (defaultCountry) setCountry([defaultCountry.label]);
    }
  }, [countryOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set default language once options are available
  useEffect(() => {
    if (language.length === 0 && languageOptions.length > 0) {
      const defaultLang = languageOptions.find((l) =>
        l.label.startsWith("English")
      );
      if (defaultLang) setLanguage([defaultLang.label]);
    }
  }, [languageOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build filter params — derived from state + options
  const filterParams = useMemo(() => {
    if (!countryOptions.length && !languageOptions.length && !genreOptions.length)
      return null;

    const countryCodes = country
      .map((label) => countryOptions.find((c) => c.label === label)?.code)
      .filter(Boolean) as string[];

    const languageCodes = language
      .map((label) => languageOptions.find((l) => l.label === label)?.code)
      .filter(Boolean) as string[];

    const genreCodes = genre
      .map((label) => genreOptions.find((g) => g.label === label)?.code)
      .filter(Boolean) as string[];

    return {
      with_origin_country: countryCodes.join("|"),
      with_original_language: languageCodes.join("|"),
      with_genres: genreCodes.join("|"),
      without_genres: "10767,10763",
      sort_by: sortBy === "" ? "popularity.desc" : sortBy + ".desc",
      page: String(currentPage),
    };
  }, [country, language, genre, sortBy, currentPage, countryOptions, languageOptions, genreOptions]);

  const { data: filterResult, isFetching: showsLoading } = useFilteredShows(
    filterParams ?? {},
    filterParams !== null
  );

  const popularShows = filterResult?.results ?? [];
  const totalPages = filterResult?.total_pages ?? 1;

  const updateGenre = (newGenre: string[]) => {
    setGenre(newGenre);
    setCurrentPage(1);
  };

  const updateCountry = (newCountry: string[]) => {
    setCountry(newCountry);
    setCurrentPage(1);
  };

  const updateLanguage = (newLanguage: string[]) => {
    setLanguage(newLanguage);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setGenre([]);
    setService([]);
    setCountry([]);
    setLanguage([]);
    setSortBy("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="browse-container">
      {showMobileFilters && (
        <div
          className="filters-overlay"
          onClick={() => setShowMobileFilters(false)}
        />
      )}
      {/* Sidebar */}
      <div className={`filters-sidebar ${showMobileFilters ? "open" : ""}`}>
        <button
          className="close-filters"
          onClick={() => setShowMobileFilters(false)}
        >
          ✕
        </button>
        <h3 style={{ marginBottom: "1rem" }}>Filters</h3>
        <div className="filters-column">
          <div className="filter-group">
            <label className="filter-label">Country</label>
            <MultiSelectDropdown
              label=""
              options={countryOptions.map((c) => c.label)}
              selected={country}
              setSelected={updateCountry}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Language</label>
            <MultiSelectDropdown
              label=""
              options={languageOptions.map((l) => l.label)}
              selected={language}
              setSelected={updateLanguage}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Genre</label>
            <MultiSelectDropdown
              label=""
              options={genreOptions.map((g) => g.label)}
              selected={genre}
              setSelected={updateGenre}
            />
          </div>

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
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
                    : "#333",
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

      <button
        className="mobile-filter-btn"
        onClick={() => setShowMobileFilters(true)}
      >
        Filters
      </button>

      {/* Show Grid */}
      <div className="shows-grid-wrapper">
        {showsLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <ShowsGrid
            items={popularShows}
            searchType="shows"
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
