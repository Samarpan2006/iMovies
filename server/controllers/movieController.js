const Movie = require('../models/movieModel');
const {
  searchMoviesLive,
  fetchTrendingLive,
  fetchDiscoverByGenre,
  fetchBollywoodTrending,
  fetchNowPlaying,
  fetchPopular,
  fetchMovieDetails,
  searchMovies,
  getSectionsData,
  formatTmdbMovie
} = require('../services/tmdbService');
const { fuzzySearchMovies } = require('../utils/fuzzySearchHelper');

/**
 * GET /api/movie/search
 * Dynamic live TMDB search calling https://api.themoviedb.org/3/search/movie
 */
exports.searchMoviesEndpoint = async (req, res) => {
  try {
    const { query, q, page = 1 } = req.query;
    const searchTerm = (query || q || '').trim();
    if (!searchTerm) {
      return res.json({
        success: true,
        page: 1,
        total_pages: 0,
        total_results: 0,
        results: [],
        movies: []
      });
    }

    const [tmdbData, localMatches] = await Promise.all([
      searchMoviesLive(searchTerm, page),
      Movie.find({
        $or: [
          { movieName: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      }).catch(() => [])
    ]);

    const formattedLocal = localMatches.map(formatTmdbMovie).filter(Boolean);
    const combined = [...formattedLocal, ...(tmdbData.results || [])];

    // Deduplicate by ID
    const uniqueMap = new Map();
    combined.forEach((m) => {
      const key = String(m.tmdbId || m._id || m.movieName);
      if (!uniqueMap.has(key)) uniqueMap.set(key, m);
    });
    const deduplicated = Array.from(uniqueMap.values());

    return res.json({
      success: true,
      page: tmdbData.page || Number(page) || 1,
      total_pages: tmdbData.total_pages || 1,
      total_results: tmdbData.total_results || deduplicated.length,
      results: deduplicated,
      movies: deduplicated
    });
  } catch (err) {
    console.error('[movieController] searchMoviesEndpoint Error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Live TMDB search query failed.',
      error: err.message,
      statusCode: status,
      results: [],
      movies: []
    });
  }
};

/**
 * GET /api/movie/trending
 * Dynamic live TMDB trending calling /trending/movie/day or /movie/now_playing?region=IN
 */
exports.getTrendingEndpoint = async (req, res) => {
  try {
    const { page = 1, region = 'IN' } = req.query;
    const data = await fetchTrendingLive(page, region);
    return res.json({
      success: true,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: data.results,
      movies: data.results
    });
  } catch (err) {
    console.error('[movieController] getTrendingEndpoint Error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to fetch trending movies.',
      error: err.message,
      statusCode: status,
      results: [],
      movies: []
    });
  }
};

/**
 * GET /api/movie/bollywood
 * Dynamic live TMDB Bollywood & Hindi cinema feed
 * Calling /discover/movie?with_original_language=hi&region=IN&watch_region=IN&sort_by=popularity.desc
 */
exports.getBollywoodEndpoint = async (req, res) => {
  try {
    const { page = 1, genre } = req.query;
    const data = await fetchBollywoodTrending(page, genre);
    return res.json({
      success: true,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: data.results,
      movies: data.results
    });
  } catch (err) {
    console.error('[movieController] getBollywoodEndpoint Error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to fetch Bollywood trending movies.',
      error: err.message,
      statusCode: status,
      results: [],
      movies: []
    });
  }
};

/**
 * GET /api/movie/discover
 * Dynamic live TMDB discover calling /discover/movie?with_genres={genre_id}&sort_by=popularity.desc
 */
exports.getDiscoverEndpoint = async (req, res) => {
  try {
    const { genre, with_genres, page = 1 } = req.query;
    const rawGenre = genre || with_genres || '28';
    const data = await fetchDiscoverByGenre(rawGenre, page);
    return res.json({
      success: true,
      genre: rawGenre,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: data.results,
      movies: data.results
    });
  } catch (err) {
    console.error('[movieController] getDiscoverEndpoint Error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to discover movies by genre.',
      error: err.message,
      statusCode: status,
      results: [],
      movies: []
    });
  }
};

/**
 * GET /api/movie/sections
 * Fetches structured cinematic sections (Top 10 in India, Action, Comedy, Horror, Sci-Fi, Romance).
 */
exports.getMovieSections = async (req, res) => {
  try {
    const sectionsData = await getSectionsData();
    return res.json({
      success: true,
      ...sectionsData
    });
  } catch (err) {
    console.error('[movieController] getMovieSections Error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to retrieve movie sections.',
      error: err.message,
      statusCode: status
    });
  }
};

/**
 * GET /api/movie
 * Fetches now playing + popular movies or searches by query.
 * Enhanced with typo-tolerance, fuzzy matching, and contextual scoring.
 */
exports.getAllMovies = async (req, res) => {
  try {
    const { genre, language, search, section, page = 1 } = req.query;

    if (search && search.trim().length > 0) {
      const q = search.trim();
      const tmdbSearch = await searchMoviesLive(q, page);
      let movies = tmdbSearch.results || [];

      // Merge with MongoDB local matches
      try {
        const localMatches = await Movie.find({
          $or: [
            { movieName: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
          ]
        });
        const formattedLocal = localMatches.map(formatTmdbMovie).filter(Boolean);
        movies = [...formattedLocal, ...movies];
      } catch (dbErr) {
        console.warn('[movieController] Local DB search notice:', dbErr.message);
      }

      // Deduplicate by ID
      const uniqueMap = new Map();
      movies.forEach((m) => {
        const key = String(m.tmdbId || m._id || m.movieName);
        if (!uniqueMap.has(key)) uniqueMap.set(key, m);
      });
      movies = Array.from(uniqueMap.values());

      if (genre && genre !== 'All') {
        movies = movies.filter(m =>
          (m.genres || []).some(g => String(g).toLowerCase().includes(genre.toLowerCase()))
        );
      }
      if (language && language !== 'All') {
        movies = movies.filter(m =>
          m.language && String(m.language).toLowerCase().includes(language.toLowerCase())
        );
      }

      return res.json({
        success: true,
        page: tmdbSearch.page || Number(page) || 1,
        total_pages: tmdbSearch.total_pages || 1,
        total_results: tmdbSearch.total_results || movies.length,
        movies,
        results: movies,
        total: movies.length
      });
    }

    const [nowPlaying, popular] = await Promise.all([
      fetchNowPlaying(page),
      fetchPopular(page)
    ]);

    const combinedMap = new Map();
    (nowPlaying.results || []).forEach(m => m && m.tmdbId && combinedMap.set(String(m.tmdbId), m));
    (popular.results || []).forEach(m => m && m.tmdbId && combinedMap.set(String(m.tmdbId), m));

    let movies = Array.from(combinedMap.values());

    // Merge with locally added movies in MongoDB
    try {
      const localMovies = await Movie.find().sort({ createdAt: -1 });
      const formattedLocal = localMovies.map(formatTmdbMovie).filter(Boolean);
      movies = [...formattedLocal, ...movies];
    } catch (dbErr) {
      console.warn('[movieController] Local DB movie fetch notice:', dbErr.message);
    }

    // Deduplicate by ID
    const uniqueMap = new Map();
    movies.forEach(m => {
      const key = String(m.tmdbId || m._id || m.movieName);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, m);
      }
    });
    movies = Array.from(uniqueMap.values());

    if (section && section !== 'All' && section !== 'all') {
      movies = movies.filter(m => String(m.section).toLowerCase() === String(section).toLowerCase());
    }
    if (genre && genre !== 'All') {
      movies = movies.filter(m =>
        (m.genres || []).some(g => String(g).toLowerCase().includes(genre.toLowerCase()))
      );
    }
    if (language && language !== 'All') {
      movies = movies.filter(m =>
        m.language && String(m.language).toLowerCase().includes(language.toLowerCase())
      );
    }

    return res.json({
      success: true,
      page: Number(page) || 1,
      total_pages: nowPlaying.total_pages || 1,
      total_results: movies.length,
      movies,
      results: movies,
      total: movies.length
    });
  } catch (err) {
    console.error('[movieController] getAllMovies Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch movies.',
      movies: [],
      results: [],
      error: err.message
    });
  }
};

/**
 * GET /api/movie/:movieId
 * Fetches movie details by TMDB ID or MongoDB _id.
 */
exports.getMovieById = async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!movieId) {
      return res.status(400).json({ success: false, message: 'Movie ID required.' });
    }

    // Check MongoDB by standard ObjectId
    if (movieId.match(/^[0-9a-fA-F]{24}$/)) {
      const local = await Movie.findById(movieId);
      if (local) {
        const formatted = formatTmdbMovie(local);
        return res.json({ success: true, movie: formatted });
      }
    }

    // Check MongoDB by tmdbId string
    const localByTmdb = await Movie.findOne({ tmdbId: String(movieId) });
    if (localByTmdb) {
      const formatted = formatTmdbMovie(localByTmdb);
      return res.json({ success: true, movie: formatted });
    }

    // Fetch from TMDB
    const tmdbData = await fetchMovieDetails(movieId);
    if (tmdbData) {
      const formatted = formatTmdbMovie(tmdbData);
      formatted.cast = tmdbData.cast || [];
      formatted.trailerUrl = tmdbData.trailerUrl || null;
      return res.json({ success: true, movie: formatted });
    }

    return res.status(404).json({ success: false, message: 'Movie details not found.' });
  } catch (err) {
    console.error(`[movieController] getMovieById Error for ${req.params.movieId}:`, err);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving movie details.',
      error: err.message
    });
  }
};

exports.addMovie = async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    const formatted = formatTmdbMovie(movie);
    return res.status(201).json({ success: true, message: 'Movie added successfully.', movie: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add movie.', error: err.message });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.movieId, req.body, { new: true });
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });
    const formatted = formatTmdbMovie(movie);
    return res.json({ success: true, message: 'Movie updated successfully.', movie: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update movie.', error: err.message });
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.movieId);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });
    return res.json({ success: true, message: 'Movie deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete movie.', error: err.message });
  }
};
