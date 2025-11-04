import  {useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ShowsGrid from "../components/ShowsGrid";

/* Browse Page */
export default function Browse() {
  {
    /* Code Label */
  }
  interface CodeLabel {
    code: string;
    label: string;
  }

  const url = process.env.REACT_APP_API_URL;
  const user_id = useUser().userId;

  const [genre, setGenre] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
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
  const [watchStatus, setWatchStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const isFirstLoad = useRef(true);

  /* Pull filter options from backend */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const genresRes = await axios.get(`${url}/genres`);
        const genreNames = genresRes.data.data.map((genre: any) => genre.name);
        setGenres(genreNames);

        const genreRes = await axios.get(`${url}/genres`);
        const countryRes = await axios.get(`${url}/countries`);
        const langRes = await axios.get(`${url}/languages`);
        const countries = countryRes.data.data
          .map((item: any): { code: string; label: string } => ({
            code: item.iso_3166_1,
            label: item.english_name,
          }))
          .sort(
            (
              a: { code: string; label: string },
              b: { code: string; label: string }
            ) => a.label.localeCompare(b.label)
          );

        const languages = langRes.data.data
          .map((item: any): { code: string; label: string } => ({
            code: item.iso_639_1,
            label: `${item.english_name} (${item.iso_639_1})`,
          }))
          .sort(
            (
              a: { code: string; label: string },
              b: { code: string; label: string }
            ) => a.label.localeCompare(b.label)
          );

        const genres = genreRes.data.data
          .map((item: any): { code: string; label: string } => ({
            code: item.id,
            label: item.name,
          }))
          .sort(
            (
              a: { code: string; label: string },
              b: { code: string; label: string }
            ) => a.label.localeCompare(b.label)
          );

        // console.log(languages)
        setCountryOptions(countries);
        setLanguageOptions(languages);
        setGenreOptions(genres);

        setFiltersReady(true);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  useEffect(() => {
    if (
      countryOptions.length > 0 &&
      country.length === 0 &&
      isFirstLoad.current
    ) {
      const defaultCountry = countryOptions.find(
        (c) => c.label === "United States of America"
      );
      if (defaultCountry) {
        setCountry([defaultCountry.label]);
      }
    }
  }, [countryOptions]);

  useEffect(() => {
    if (
      languageOptions.length > 0 &&
      language.length === 0 &&
      isFirstLoad.current
    ) {
      const defaultLang = languageOptions.find((l) =>
        l.label.startsWith("English")
      );
      if (defaultLang) {
        setLanguage([defaultLang.label]);
        isFirstLoad.current = false; // Mark end of defaulting
      }
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
        .map((label) => countryOptions.find((c) => c.label === label)?.code)
        .filter(Boolean);

      const languageCodes = updatedLanguage
        .map((label) => languageOptions.find((l) => l.label === label)?.code)
        .filter(Boolean);

      const genreCodes = updatedGenre
        .map((label) => genreOptions.find((g) => g.label === label)?.code)
        .filter(Boolean);

      const res = await axios.get(`${url}/shows/filter`, {
        params: {
          with_origin_country: countryCodes.join("|"),
          with_original_language: languageCodes.join("|"),
          with_genres: genreCodes.join("|"),
          without_genres: "10767,10763",
          sort_by:
            updatedSortBy === "" ? "popularity.desc" : updatedSortBy + ".desc",
          page: updatedPage,
        },
      });

      setPopularShows(res.data.results || []);
      console.log(res.data.results);
      setTotalPages(res.data.total_pages);
    } catch (error) {
      console.error("Error fetching filtered shows:", error);
      setPopularShows([]);
    }
  };

  const fetchWatchStatusShows = async (newWatchStatus: string) => {
    try {
      const res = await axios.get(`${url}/users/${user_id}/${newWatchStatus}`);
      const watchStatusShows = res.data;

      // Immediately fetch images after setting ratings
      const updatedWatchStatusShows = await Promise.all(
        watchStatusShows.map(async (show: any) => {
          try {
            const res = await axios.get(`${url}/shows/${show.show_id}`);
            console.log("res:", res);
            const showData = res.data;
            const imagePath = showData.poster_path;
            const imageUrl = imagePath?.startsWith("http")
              ? imagePath
              : `https://image.tmdb.org/t/p/w500${imagePath}`;
            return {
              ...show,
              show_name: showData?.name,
              image_url:
                showData?.image_url || showData?.thumbnail || imageUrl || null,
            };
          } catch (err) {
            console.error("Failed to fetch image for:", show.show_name);
            return { ...show, image_url: null };
          }
        })
      );
      setPopularShows(updatedWatchStatusShows || []);
      setTotalPages(Math.floor(updatedWatchStatusShows.length / 20 + 1));
    } catch (error) {
      console.error("Error fetching want to watch shows:", error);
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

  const updateWatchStatus = (newWatchStatus: string) => {
    setWatchStatus(newWatchStatus);
    fetchWatchStatusShows(newWatchStatus);
    setCurrentPage(1)
  };

  const clearAllFilters = () => {
    setGenre([]);
    setService([]);
    setCountry([]);
    setLanguage([]);
    setSortBy("");
    setWatchStatus("");
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
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <SingleSelectDropdown
              selected={sortBy}
              setSelected={updateSortBy}
              options={sortOptions}
            />
          </div> */}

          {/* <div className="filter-group">
            <label className="filter-label">Streaming Service</label>
            <MultiSelectDropdown
              label=""
              options={streamingServices}
              selected={service}
              setSelected={updateService}
            />
          </div> */}

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

          {/* <div className="filter-group">
            <label className="filter-label">Watch Status</label>
            <SingleSelectDropdown
              selected={watchStatus}
              setSelected={updateWatchStatus}
              options={watchStatusOptions}
            />
          </div> */}

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button
              onClick={clearAllFilters}
              disabled={
                genre.length === 0 &&
                service.length === 0 &&
                country.length === 0 &&
                language.length === 0 &&
                sortBy === "" &&
                watchStatus === ""
              }
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  genre.length === 0 &&
                  service.length === 0 &&
                  country.length === 0 &&
                  language.length === 0 &&
                  sortBy === "" &&
                  watchStatus === ""
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

      {/* Show Grid */}
      <ShowsGrid
        items={popularShows}
        searchType="shows"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
