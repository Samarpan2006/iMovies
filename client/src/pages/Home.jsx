import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faTimes,
  faFilm,
  faGlobe,
  faStar,
  faTicketAlt,
  faChevronRight,
  faChevronLeft,
  faBolt,
  faClock,
  faFire,
  faTrophy,
  faLaughBeam,
  faGhost,
  faRocket,
  faHeart,
  faThLarge,
  faLayerGroup,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import LocationFilter, { COUNTRIES } from '../components/LocationFilter';
import api, {
  searchMoviesApi,
  getTrendingMoviesApi,
  getBollywoodMoviesApi,
  getDiscoverMoviesApi,
  getMovieSectionsApi
} from '../utils/api';
import { normalizeMovie, getPosterUrl } from '../utils/imageHelper';
import { fuzzySearchMovies } from '../utils/fuzzySearchHelper';

const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Drama',
  'Fantasy',
  'Horror',
  'Romance',
  'Science Fiction',
  'Thriller'
];

const GENRE_NAME_TO_ID = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  scifi: 878,
  'science fiction': 878,
  thriller: 53,
  war: 10752,
  western: 37
};

const SECTION_TABS = [
  { id: 'all', label: 'All Shelves', icon: faLayerGroup },
  { id: 'top10_india', label: 'Top 10 in India', icon: faFire, color: 'text-orange-500' },
  { id: 'bollywood', label: 'Bollywood Hits', icon: faFilm, color: 'text-amber-500' },
  { id: 'trending', label: 'Trending & Streaming', icon: faBolt, color: 'text-yellow-400' },
  { id: 'action', label: 'Action Hits', icon: faBolt, color: 'text-red-500' },
  { id: 'comedy', label: 'Comedy', icon: faLaughBeam, color: 'text-amber-400' },
  { id: 'romance', label: 'Romance & Drama', icon: faHeart, color: 'text-pink-500' },
  { id: 'horror', label: 'Horror & Thrillers', icon: faGhost, color: 'text-purple-400' },
  { id: 'scifi', label: 'Sci-Fi & Fantasy', icon: faRocket, color: 'text-cyan-400' }
];

/**
 * Reusable Pagination Controls
 */
const PaginationControls = ({ currentPage, totalPages, onPageChange, loading }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-10 pt-6 border-t border-[#222222]">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading}
        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#141414] hover:bg-[#202020] text-white border border-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
        <span>Previous</span>
      </button>

      <span className="text-xs sm:text-sm font-semibold text-gray-400 px-3">
        Page <strong className="text-white">{currentPage}</strong> of{' '}
        <strong className="text-white">{totalPages}</strong>
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#141414] hover:bg-[#202020] text-white border border-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
      >
        <span>Next</span>
        <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
      </button>
    </div>
  );
};

/**
 * Horizontal Carousel Shelf for a curated TMDB section.
 */
const MovieSectionShelf = ({ section, favorites, onFavorite, onExploreAll }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScroll = (dir) => {
    if (scrollRef.current) {
      const offset = dir === 'left' ? -scrollRef.current.clientWidth * 0.75 : scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScroll();
  }, [section.movies]);

  const isTop10 = section.id === 'top10_india';

  return (
    <section className="mb-14 relative group/shelf">
      {/* Shelf Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {section.badge && (
              <span
                className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
                  isTop10
                    ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-green-600 text-white font-extrabold shadow-sm'
                    : section.id === 'bollywood'
                    ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 text-white font-extrabold shadow-sm'
                    : section.id === 'trending'
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-extrabold shadow-sm'
                    : 'bg-[#e50914]/15 text-[#e50914] border border-[#e50914]/30'
                }`}
              >
                {section.badge}
              </span>
            )}
            <span className="text-xs text-gray-400 font-semibold">
              • {section.movies.length} Titles
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            {isTop10 && <FontAwesomeIcon icon={faTrophy} className="text-yellow-400 text-lg" />}
            {section.id === 'bollywood' && <FontAwesomeIcon icon={faFilm} className="text-amber-400 text-lg" />}
            {section.id === 'trending' && <FontAwesomeIcon icon={faFire} className="text-orange-500 text-lg" />}
            {section.id === 'action' && <FontAwesomeIcon icon={faBolt} className="text-[#e50914] text-lg" />}
            {section.id === 'comedy' && <FontAwesomeIcon icon={faLaughBeam} className="text-amber-400 text-lg" />}
            {section.id === 'horror' && <FontAwesomeIcon icon={faGhost} className="text-purple-400 text-lg" />}
            {section.id === 'scifi' && <FontAwesomeIcon icon={faRocket} className="text-cyan-400 text-lg" />}
            {section.id === 'romance' && <FontAwesomeIcon icon={faHeart} className="text-pink-500 text-lg" />}
            <span>{section.title}</span>
          </h2>

          {section.subtitle && (
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5 max-w-2xl">{section.subtitle}</p>
          )}
        </div>

        {/* Scroll Controls & Explore All */}
        <div className="flex items-center gap-2">
          {onExploreAll && (
            <button
              onClick={() => onExploreAll(section.id, section.title)}
              className="text-xs font-bold text-gray-400 hover:text-[#e50914] transition-colors px-2 py-1 flex items-center gap-1"
            >
              <span>Explore all</span>
              <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2a2a2a] text-white flex items-center justify-center hover:bg-[#252525] disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-md"
              title="Scroll shelf left"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2a2a2a] text-white flex items-center justify-center hover:bg-[#252525] disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-md"
              title="Scroll shelf right"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Row */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1 px-0.5"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {section.movies.map((movie, idx) => {
          const movieId = movie.tmdbId || movie._id || String(idx);
          const rankNum = isTop10 ? movie.rank || idx + 1 : undefined;

          return (
            <div
              key={movieId}
              className="w-[190px] sm:w-[220px] md:w-[240px] flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              <MovieCard
                movie={movie}
                rank={rankNum}
                onFavorite={onFavorite}
                isFavorited={favorites.includes(String(movieId))}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalResults, setSearchTotalResults] = useState(0);

  // Dynamic Category Feed States
  const [categoryMovies, setCategoryMovies] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryTotalPages, setCategoryTotalPages] = useState(1);
  const [categoryTotalResults, setCategoryTotalResults] = useState(0);

  // Filters and Views
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [activeSectionTab, setActiveSectionTab] = useState('all');
  const [viewMode, setViewMode] = useState('shelves'); // 'shelves' | 'search' | 'category' | 'grid'

  // Live Recommendation Dropdown State
  const [recommendations, setRecommendations] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Initial load: Fetch sections and favorites
  useEffect(() => {
    fetchSectionsAndMovies();
    fetchFavorites();
  }, []);

  // Debounce search query (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger live TMDB search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.length > 0) {
      setViewMode('search');
      setSearchPage(1);
      executeSearch(debouncedSearchQuery, 1);
    } else {
      if (viewMode === 'search') {
        setViewMode('shelves');
        setSearchResults([]);
      }
    }
  }, [debouncedSearchQuery]);

  const fetchSectionsAndMovies = async () => {
    setLoading(true);
    try {
      const data = await getMovieSectionsApi();
      if (data && data.success) {
        setSections(data.sections || []);
        const normalizedAll = (data.allMovies || []).map(normalizeMovie).filter(Boolean);
        setAllMovies(normalizedAll);
      } else {
        const fallbackRes = await api.get('/movie');
        let list = fallbackRes.data.movies || fallbackRes.data.results || [];
        setAllMovies(list.map(normalizeMovie).filter(Boolean));
      }
    } catch (err) {
      console.warn('Home.jsx fetchSections notice:', err.message);
      try {
        const fallbackRes = await api.get('/movie');
        let list = fallbackRes.data.movies || fallbackRes.data.results || [];
        setAllMovies(list.map(normalizeMovie).filter(Boolean));
      } catch (e) {
        toast.error('Unable to fetch movie feed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await api.get('/favorite');
      if (res.data && res.data.success) {
        const list = Array.isArray(res.data.favorites) ? res.data.favorites : [];
        setFavorites(list.map((f) => String(f.movieId || f.id || f._id)));
      }
    } catch (e) {
      // Non-blocking
    }
  };

  // Live TMDB Search executor with pagination
  const executeSearch = async (query, page = 1) => {
    setSearchLoading(true);
    try {
      const data = await searchMoviesApi(query, page);
      const list = (data.results || data.movies || []).map(normalizeMovie).filter(Boolean);
      setSearchResults(list);
      setSearchPage(data.page || page);
      setSearchTotalPages(data.total_pages || 1);
      setSearchTotalResults(data.total_results || list.length);
    } catch (err) {
      console.error('Search API error:', err);
      toast.error('Live search query failed.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Dynamic Category Feed Loader with pagination
  const loadCategoryFeed = async (categoryId, customTitle, page = 1) => {
    setSelectedCategoryId(categoryId);
    setCategoryTitle(customTitle || categoryId);
    setViewMode('category');
    setCategoryPage(page);
    setCategoryLoading(true);

    try {
      let data;
      if (categoryId === 'bollywood') {
        data = await getBollywoodMoviesApi(page);
      } else if (categoryId === 'top10_india') {
        data = await getTrendingMoviesApi(page, 'IN');
      } else if (categoryId === 'trending') {
        data = await getTrendingMoviesApi(page, 'ALL');
      } else {
        const genreId = GENRE_NAME_TO_ID[categoryId] || 28;
        data = await getDiscoverMoviesApi(genreId, page);
      }

      const list = (data.results || data.movies || []).map(normalizeMovie).filter(Boolean);
      setCategoryMovies(list);
      setCategoryPage(data.page || page);
      setCategoryTotalPages(data.total_pages || 1);
      setCategoryTotalResults(data.total_results || list.length);
    } catch (err) {
      console.error('Category feed error:', err);
      toast.error('Failed to load category feed.');
    } finally {
      setCategoryLoading(false);
    }
  };

  // Real-time keystroke handler for input & instant recommendation dropdown
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    const trimmed = val.trim();
    if (trimmed.length >= 1) {
      // Instant client-side fuzzy ranking across cached in-memory catalog
      const matches = fuzzySearchMovies(allMovies, trimmed, {
        threshold: 0.35,
        limit: 6
      });
      setRecommendations(matches);
      setIsDropdownOpen(true);
      setSelectedIndex(-1);
    } else {
      setRecommendations([]);
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e) => {
    if (!isDropdownOpen || recommendations.length === 0) {
      if (e.key === 'Escape') setIsDropdownOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < recommendations.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && recommendations[selectedIndex]) {
        e.preventDefault();
        const selected = recommendations[selectedIndex];
        handleNavigateToMovie(selected, 'details');
      } else {
        setIsDropdownOpen(false);
      }
    }
  };

  const handleNavigateToMovie = (movie, destination = 'details') => {
    const targetId = movie.tmdbId || movie._id;
    setIsDropdownOpen(false);
    if (destination === 'showtimes') {
      navigate(`/movieshows/${targetId}`);
    } else {
      navigate(`/moviedetails/${targetId}`);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsDropdownOpen(false);
    if (searchQuery.trim()) {
      setViewMode('search');
      executeSearch(searchQuery.trim(), 1);
    }
  };

  const handleGenreChange = (genre) => {
    setSelectedGenre(genre);
    if (genre !== 'All') {
      const gId = GENRE_NAME_TO_ID[genre.toLowerCase()] || genre;
      loadCategoryFeed(genre.toLowerCase(), `${genre} Movies`, 1);
    } else {
      setViewMode('shelves');
    }
  };

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    if (countryCode !== 'ALL') {
      setViewMode('grid');
    }
  };

  const handleSectionTabClick = (tabId) => {
    setActiveSectionTab(tabId);
    if (tabId === 'all') {
      setViewMode('shelves');
    } else {
      const tabObj = SECTION_TABS.find((t) => t.id === tabId);
      loadCategoryFeed(tabId, tabObj ? tabObj.label : tabId, 1);
    }
  };

  // Filter movies dynamically for grid or search mode
  const displayedFilteredMovies = useMemo(() => {
    let list = allMovies;

    if (activeSectionTab !== 'all') {
      list = list.filter((m) => {
        if (activeSectionTab === 'bollywood') {
          return (
            m.section === 'bollywood' ||
            m.original_language === 'hi' ||
            String(m.language).toLowerCase() === 'hindi'
          );
        }
        if (activeSectionTab === 'trending') {
          return m.section === 'trending' || m.section === 'top10_india';
        }
        return m.section === activeSectionTab;
      });
    }

    if (selectedGenre !== 'All') {
      list = list.filter((m) =>
        (m.genres || []).some((g) => String(g).toLowerCase().includes(selectedGenre.toLowerCase()))
      );
    }

    if (selectedCountry !== 'ALL') {
      const countryObj = COUNTRIES.find((c) => c.code === selectedCountry);
      if (countryObj) {
        list = list.filter((m) => {
          if (Array.isArray(m.origin_country) && m.origin_country.includes(selectedCountry)) {
            return true;
          }
          if (m.country && String(m.country).toUpperCase().includes(selectedCountry)) {
            return true;
          }
          const lang = String(m.language || m.original_language || '').toLowerCase();
          if (countryObj.languages.some((l) => lang.includes(l.toLowerCase()))) {
            return true;
          }
          return false;
        });
      }
    }

    return list;
  }, [allMovies, activeSectionTab, selectedGenre, selectedCountry]);

  const handleFavoriteToggle = async (movieId) => {
    const idStr = String(movieId);
    try {
      if (favorites.includes(idStr)) {
        await api.delete(`/favorite/${idStr}`);
        setFavorites((prev) => prev.filter((id) => id !== idStr));
        toast.info('Removed from watchlist.');
      } else {
        await api.post('/favorite/add', { movieId: idStr });
        setFavorites((prev) => [...prev, idStr]);
        toast.success('Added to watchlist!');
      }
    } catch (err) {
      toast.error('Failed to update watchlist.');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setRecommendations([]);
    setIsDropdownOpen(false);
    setSelectedGenre('All');
    setSelectedCountry('ALL');
    setActiveSectionTab('all');
    setViewMode('shelves');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Announcement */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-950/70 via-[#141414] to-black border border-[#262626] p-6 sm:p-10 mb-8 shadow-2xl">
          <div className="max-w-2xl">
            <span className="text-[#e50914] text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
              <FontAwesomeIcon icon={faFilm} /> LIVE TMDB REST API INTEGRATION
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white mt-2 leading-tight">
              Live Movie Discovery & Showtimes
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-2">
              Browse Top 10 in India, trending Bollywood blockbusters, currently streaming sensations, and genre hits with real-time TMDB discovery.
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {SECTION_TABS.map((tab) => {
            const isActive = activeSectionTab === tab.id && viewMode !== 'search';
            return (
              <button
                key={tab.id}
                onClick={() => handleSectionTabClick(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all shadow-sm ${
                  isActive
                    ? 'bg-[#e50914] text-white shadow-lg shadow-red-950/40 border border-red-500/50 scale-[1.02]'
                    : 'bg-[#141414] text-gray-300 hover:text-white border border-[#222222] hover:border-[#333333]'
                }`}
              >
                <FontAwesomeIcon
                  icon={tab.icon}
                  className={isActive ? 'text-white' : tab.color || 'text-gray-400'}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* View Mode Toggle */}
          <div className="ml-auto hidden md:flex items-center bg-[#141414] border border-[#262626] rounded-xl p-1 gap-1">
            <button
              onClick={() => {
                setViewMode('shelves');
                setActiveSectionTab('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'shelves'
                  ? 'bg-[#e50914] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Curated Horizontal Shelves"
            >
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>Shelves</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#e50914] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Full Movie Grid"
            >
              <FontAwesomeIcon icon={faThLarge} />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-[#141414] border border-[#222222] rounded-2xl p-5 mb-10 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            {/* Search Input with Live Dropdown & Debounced Request */}
            <div className="relative flex-1" ref={searchContainerRef}>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 z-10"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 1 && recommendations.length > 0) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Live search TMDB by title, actor, or genre (e.g. 'Oppenheimer', 'Gladiator', 'Kalki')..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setRecommendations([]);
                      setIsDropdownOpen(false);
                      setViewMode('shelves');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10 p-1"
                    title="Clear search"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>

              {/* Instant Dropdown Suggestions */}
              {isDropdownOpen && searchQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#141414]/98 backdrop-blur-xl border border-[#2a2a2a] rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-[#202020] animate-fadeIn max-h-[480px] overflow-y-auto">
                  <div className="px-4 py-2.5 bg-[#181818] flex items-center justify-between text-xs font-semibold text-gray-400">
                    <span className="flex items-center gap-1.5 text-white">
                      <FontAwesomeIcon icon={faBolt} className="text-[#e50914]" />
                      <span>Instant Movie Suggestions</span>
                    </span>
                    <span className="bg-[#242424] text-gray-300 px-2 py-0.5 rounded-full text-[11px]">
                      {recommendations.length} {recommendations.length === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  {recommendations.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      <p className="font-semibold text-white">Searching live TMDB...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Press Enter or pause typing to see full search results below.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1e1e1e]">
                      {recommendations.map((movie, idx) => {
                        const movieId = movie.tmdbId || movie._id || String(idx);
                        const isSelected = selectedIndex === idx;
                        const poster = movie.posterPath || getPosterUrl(movie.poster_path);
                        const rating = Number(movie.voteAverage || movie.vote_average || 0);
                        const year = movie.releaseDate
                          ? new Date(movie.releaseDate).getFullYear()
                          : movie.release_date
                          ? new Date(movie.release_date).getFullYear()
                          : '2024';

                        return (
                          <div
                            key={movieId}
                            onClick={() => handleNavigateToMovie(movie, 'details')}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-3 group ${
                              isSelected
                                ? 'bg-red-950/30 border-l-4 border-l-[#e50914]'
                                : 'hover:bg-[#1a1a1a]'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <img
                                src={poster}
                                alt={movie.movieName || movie.title}
                                className="w-11 h-16 object-cover rounded-lg shadow-md border border-[#2a2a2a] flex-shrink-0"
                                onError={(e) => {
                                  e.target.src =
                                    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white text-sm truncate group-hover:text-[#e50914] transition-colors">
                                    {movie.movieName || movie.title}
                                  </h4>
                                  {movie.certification && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-400 uppercase font-mono">
                                      {movie.certification}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                                  {year && <span>{year}</span>}
                                  {movie.duration && (
                                    <span className="flex items-center gap-1">
                                      • <FontAwesomeIcon icon={faClock} className="text-[10px]" />{' '}
                                      {movie.duration}
                                    </span>
                                  )}
                                  {rating > 0 && (
                                    <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                                      • <FontAwesomeIcon icon={faStar} className="text-[10px]" />{' '}
                                      {rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {(movie.genres || []).slice(0, 2).map((g, gi) => (
                                    <span
                                      key={gi}
                                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#222222] text-gray-300"
                                    >
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigateToMovie(movie, 'showtimes');
                                }}
                                className="px-3 py-1.5 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                title="Directly select showtimes and seats"
                              >
                                <FontAwesomeIcon icon={faTicketAlt} className="text-[11px]" />
                                <span className="hidden sm:inline">Book Tickets</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigateToMovie(movie, 'details');
                                }}
                                className="p-2 bg-[#202020] hover:bg-[#2b2b2b] text-gray-300 hover:text-white rounded-lg transition-colors text-xs"
                                title="View movie synopsis, trailer & reviews"
                              >
                                <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-2.5 bg-[#171717] flex items-center justify-between text-xs text-gray-400">
                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                      Use ↑ ↓ arrows to navigate • Enter to select • Esc to close
                    </span>
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-xs font-semibold text-[#e50914] hover:underline flex items-center gap-1 ml-auto"
                    >
                      <span>View all live results</span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filters Row: Genre Dropdown + Location Dropdown Side-by-Side */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <div className="relative min-w-[140px] flex-1 sm:flex-initial">
                <select
                  value={selectedGenre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  className="w-full bg-[#0a0a0a] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#e50914] transition-all cursor-pointer shadow-sm"
                  aria-label="Filter movies by genre"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g} className="bg-[#141414] text-white py-1">
                      {g === 'All' ? '🎭 All Genres' : g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[150px] flex-1 sm:flex-initial">
                <LocationFilter
                  selectedCountry={selectedCountry}
                  onCountryChange={handleCountryChange}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950/30 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faSearch} />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Quick Genre Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-[#1f1f1f]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
              <FontAwesomeIcon icon={faFilter} className="text-[10px]" /> Genres:
            </span>
            {GENRES.slice(0, 8).map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreChange(genre)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGenre === genre
                    ? 'bg-[#e50914] text-white shadow-md shadow-red-950/40'
                    : 'bg-[#0a0a0a] text-gray-400 hover:text-white border border-[#222222]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: DYNAMIC LIVE TMDB SEARCH RESULTS VIEW             */}
        {/* ======================================================== */}
        {viewMode === 'search' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-[#222222] gap-3">
              <div>
                <span className="text-xs text-[#e50914] font-black uppercase tracking-wider">
                  LIVE TMDB SEARCH RESULTS
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                  <span>Results for</span>
                  <span className="text-[#e50914]">"{debouncedSearchQuery}"</span>
                  <span className="text-xs bg-[#e50914] text-white px-2.5 py-0.5 rounded-full font-bold ml-1">
                    {searchTotalResults} found
                  </span>
                </h2>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="self-start sm:self-auto text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626]"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Curated Shelves</span>
              </button>
            </div>

            {searchLoading ? (
              <Loader message={`Searching TMDB database for "${debouncedSearchQuery}"...`} />
            ) : searchResults.length === 0 ? (
              <div className="text-center py-20 bg-[#141414] border border-[#222222] rounded-2xl p-8">
                <FontAwesomeIcon icon={faFilm} className="text-5xl text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-white">No movies found on TMDB</h3>
                <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
                  We couldn't find any titles matching "{debouncedSearchQuery}". Please check your spelling or search by actor or franchise.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-5 px-5 py-2 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Clear Search & View Shelves
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {searchResults.map((movie, index) => {
                    const movieId = movie.tmdbId || movie._id || String(index);
                    return (
                      <MovieCard
                        key={movieId}
                        movie={movie}
                        onFavorite={handleFavoriteToggle}
                        isFavorited={favorites.includes(String(movieId))}
                      />
                    );
                  })}
                </div>

                <PaginationControls
                  currentPage={searchPage}
                  totalPages={searchTotalPages}
                  onPageChange={(p) => executeSearch(debouncedSearchQuery, p)}
                  loading={searchLoading}
                />
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: DYNAMIC CATEGORY FEED VIEW (Explore All)         */}
        {/* ======================================================== */}
        {viewMode === 'category' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-[#222222] gap-3">
              <div>
                <span className="text-xs text-[#e50914] font-black uppercase tracking-wider">
                  EXPLORE TMDB CATEGORY FEED
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                  <span>{categoryTitle}</span>
                  <span className="text-xs bg-[#e50914] text-white px-2.5 py-0.5 rounded-full font-bold ml-1">
                    {categoryTotalResults} titles
                  </span>
                </h2>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="self-start sm:self-auto text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626]"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to All Shelves</span>
              </button>
            </div>

            {categoryLoading ? (
              <Loader message={`Fetching live TMDB titles for ${categoryTitle}...`} />
            ) : categoryMovies.length === 0 ? (
              <div className="text-center py-20 bg-[#141414] border border-[#222222] rounded-2xl p-8">
                <FontAwesomeIcon icon={faFilm} className="text-5xl text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-white">No titles in this category</h3>
                <button
                  onClick={clearFilters}
                  className="mt-5 px-5 py-2 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Return to All Shelves
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {categoryMovies.map((movie, index) => {
                    const movieId = movie.tmdbId || movie._id || String(index);
                    const rankNum = selectedCategoryId === 'top10_india'
                      ? movie.rank || (categoryPage === 1 ? index + 1 : undefined)
                      : undefined;

                    return (
                      <MovieCard
                        key={movieId}
                        movie={movie}
                        rank={rankNum}
                        onFavorite={handleFavoriteToggle}
                        isFavorited={favorites.includes(String(movieId))}
                      />
                    );
                  })}
                </div>

                <PaginationControls
                  currentPage={categoryPage}
                  totalPages={categoryTotalPages}
                  onPageChange={(p) => loadCategoryFeed(selectedCategoryId, categoryTitle, p)}
                  loading={categoryLoading}
                />
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: CURATED HORIZONTAL SHELVES VIEW (Default)        */}
        {/* ======================================================== */}
        {viewMode === 'shelves' && (
          <div>
            {loading ? (
              <Loader message="Connecting live TMDB database and assembling cinema sections..." />
            ) : (
              sections.map((section) => (
                <MovieSectionShelf
                  key={section.id}
                  section={section}
                  favorites={favorites}
                  onFavorite={handleFavoriteToggle}
                  onExploreAll={(secId, title) => loadCategoryFeed(secId, title, 1)}
                />
              ))
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FILTERED GRID VIEW (Manual Grid Mode / Location)  */}
        {/* ======================================================== */}
        {viewMode === 'grid' && (
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#222222]">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Filtered Movie Lineup</span>
                  <span className="text-xs bg-[#e50914] text-white px-2 py-0.5 rounded-full font-bold">
                    {displayedFilteredMovies.length}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing movies matching your location, country, or category selection.
                </p>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-[#e50914] hover:underline flex items-center gap-1"
              >
                <span>Reset to All Shelves</span>
              </button>
            </div>

            {displayedFilteredMovies.length === 0 ? (
              <div className="text-center py-20 bg-[#141414] border border-[#222222] rounded-2xl p-8">
                <FontAwesomeIcon icon={faFilm} className="text-5xl text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-white">No movies match your criteria</h3>
                <button
                  onClick={clearFilters}
                  className="mt-5 px-5 py-2 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {displayedFilteredMovies.map((movie, index) => {
                  const movieId = movie.tmdbId || movie._id || String(index);
                  return (
                    <MovieCard
                      key={movieId}
                      movie={movie}
                      onFavorite={handleFavoriteToggle}
                      isFavorited={favorites.includes(String(movieId))}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;
