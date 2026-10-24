const axios = require('axios');
const https = require('https');
const dns = require('dns');

const TMDB_BASE_URL = (process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
const TMDB_API_KEY = process.env.TMDB_API_KEY || '464a2686bc3d8b529c27060af717bdaf';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

const PLACEHOLDER_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
const PLACEHOLDER_BACKDROP = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1280&auto=format&fit=crop&q=80';

/**
 * Configure DNS & HTTPS Agent to bypass ISP DNS poisoning/blocking (e.g. Jio/Airtel sinkholing to 49.44.79.236).
 * Resolves api.themoviedb.org to verified AWS CloudFront Anycast IPs with round-robin load distribution.
 */
const CLOUDFRONT_IPS = ['13.224.245.47', '13.224.245.63', '13.224.245.92', '13.224.245.44'];
let dnsCounter = 0;

const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'api.themoviedb.org') {
    const ip = CLOUDFRONT_IPS[dnsCounter++ % CLOUDFRONT_IPS.length];
    if (options && options.all) {
      return callback(null, [{ address: ip, family: 4 }]);
    }
    return callback(null, ip, 4);
  }
  return dns.lookup(hostname, options, callback);
};

const httpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  maxSockets: 20,
  timeout: 10000
});

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  httpsAgent,
  timeout: 10000
});

/**
 * Resilient GET with retry on transient TLS handshake resets
 */
const getWithRetry = async (url, params, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await tmdbClient.get(url, { params });
    } catch (err) {
      const isTransient = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message?.includes('socket hang up');
      if (attempt < retries && isTransient) {
        await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
};

// TMDB Genre ID to Name mapping
const genreMap = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

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

/**
 * Builds clean image URLs using TMDB CDN: https://image.tmdb.org/t/p/w500${path}
 * Only falls back to placeholder if path is truly null, undefined, or empty.
 */
const buildImageUrl = (path, size = 'w500') => {
  if (!path || typeof path !== 'string' || path.trim() === '' || path === 'null' || path === 'undefined') {
    return size === 'w1280' ? PLACEHOLDER_BACKDROP : PLACEHOLDER_POSTER;
  }
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/([^:]\/)\/+/g, '$1');
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = size === 'w1280' ? TMDB_BACKDROP_BASE : TMDB_IMAGE_BASE;
  return `${base}${cleanPath}`;
};

/**
 * Normalizes movie data from live TMDB REST responses into the schema required by the UI.
 * Strictly preserves live poster_path and constructs valid CDN URLs.
 */
const formatTmdbMovie = (m) => {
  if (!m) return null;

  const id = m.id || m.tmdbId || m._id || '';
  const title = m.title || m.movieName || m.original_title || 'Untitled Movie';
  const rawPoster = m.poster_path || m.posterPath || null;
  const rawBackdrop = m.backdrop_path || m.backdropPath || null;

  let genres = [];
  if (Array.isArray(m.genres) && m.genres.length > 0) {
    genres = m.genres.map((g) => (typeof g === 'object' && g !== null ? g.name || 'Cinema' : String(g)));
  } else if (Array.isArray(m.genre_ids) && m.genre_ids.length > 0) {
    genres = m.genre_ids.map((id) => genreMap[id] || 'Cinema');
  } else if (typeof m.genres === 'string' && m.genres.trim()) {
    genres = m.genres.split(',').map((g) => g.trim());
  }
  if (genres.length === 0) genres = ['Cinema'];

  const posterPath = buildImageUrl(rawPoster, 'w500');
  const backdropPath = buildImageUrl(rawBackdrop, 'w1280');

  return {
    _id: String(id),
    id: Number(id) || id,
    tmdbId: String(id),
    movieName: title,
    title: title,
    description: m.overview || m.description || 'No description available.',
    overview: m.overview || m.description || 'No description available.',
    genres,
    genre_ids: m.genre_ids || [],
    releaseDate: m.release_date || m.releaseDate || new Date().toISOString(),
    release_date: m.release_date || m.releaseDate || new Date().toISOString(),
    language: m.language || (m.original_language ? (m.original_language === 'en' ? 'English' : m.original_language.toUpperCase()) : 'English'),
    original_language: m.original_language || 'en',
    duration: m.duration || (m.runtime ? `${m.runtime} min` : '120 min'),
    runtime: m.runtime || 120,
    certification: m.certification || 'U/A',
    voteAverage: Number(m.vote_average || m.voteAverage || 0),
    vote_average: Number(m.vote_average || m.voteAverage || 0),
    poster_path: rawPoster,
    posterPath,
    backdrop_path: rawBackdrop,
    backdropPath,
    trailerUrl: m.trailerUrl || null,
    cast: Array.isArray(m.cast) ? m.cast : [],
    origin_country: m.origin_country || ['IN'],
    country: m.country || (m.origin_country ? m.origin_country[0] : 'IN'),
    rank: m.rank !== undefined ? m.rank : undefined,
    section: m.section || undefined
  };
};

/**
 * Handle TMDB API errors with explicit logging and throw.
 * Never silently fall back to mock data on 401, 404, or 500 errors.
 */
const handleTmdbError = (err, context = 'TMDB API') => {
  const status = err.response?.status;
  const message = err.response?.data?.status_message || err.message;
  console.error(`[${context}] Error HTTP ${status || 'Network'}: ${message}`);
  const error = new Error(`TMDB Error: ${message}`);
  error.status = status || 500;
  error.response = err.response;
  throw error;
};

/**
 * Live TMDB Search Endpoint
 * Calls GET https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}
 */
const searchMoviesLive = async (query, page = 1) => {
  const q = (query || '').trim();
  const pageNum = Math.max(1, parseInt(page) || 1);

  if (!q) {
    return { page: 1, total_pages: 0, total_results: 0, results: [] };
  }

  try {
    const res = await getWithRetry('/search/movie', {
      api_key: TMDB_API_KEY,
      query: q,
      include_adult: false,
      language: 'en-US',
      page: pageNum
    });

    return {
      page: res.data.page || pageNum,
      total_pages: res.data.total_pages || 1,
      total_results: res.data.total_results || res.data.results?.length || 0,
      results: (res.data.results || []).map(formatTmdbMovie)
    };
  } catch (err) {
    return handleTmdbError(err, `searchMoviesLive("${q}")`);
  }
};

/**
 * Live TMDB Trending Feed
 * India Top / Trending: https://api.themoviedb.org/3/discover/movie?region=IN&watch_region=IN&sort_by=popularity.desc
 */
const fetchTrendingLive = async (page = 1, region = 'IN') => {
  const pageNum = Math.max(1, parseInt(page) || 1);

  try {
    let res;
    if (region === 'IN') {
      res = await getWithRetry('/discover/movie', {
        api_key: TMDB_API_KEY,
        region: 'IN',
        watch_region: 'IN',
        sort_by: 'popularity.desc',
        include_adult: false,
        language: 'en-US',
        page: pageNum
      });
    } else {
      res = await getWithRetry('/trending/movie/day', {
        api_key: TMDB_API_KEY,
        page: pageNum,
        language: 'en-US'
      });
    }

    return {
      page: res.data.page || pageNum,
      total_pages: res.data.total_pages || 1,
      total_results: res.data.total_results || res.data.results?.length || 0,
      results: (res.data.results || []).map(formatTmdbMovie)
    };
  } catch (err) {
    return handleTmdbError(err, `fetchTrendingLive(page=${pageNum}, region=${region})`);
  }
};

/**
 * Live TMDB Discover by Genre Endpoint
 * Calls GET https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}
 */
const fetchDiscoverByGenre = async (genreId, page = 1) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const resolvedGenreId = GENRE_NAME_TO_ID[String(genreId).toLowerCase()] || Number(genreId) || 28;

  try {
    const res = await getWithRetry('/discover/movie', {
      api_key: TMDB_API_KEY,
      with_genres: resolvedGenreId,
      sort_by: 'popularity.desc',
      include_adult: false,
      language: 'en-US',
      page: pageNum
    });

    return {
      page: res.data.page || pageNum,
      total_pages: res.data.total_pages || 1,
      total_results: res.data.total_results || res.data.results?.length || 0,
      results: (res.data.results || []).map(formatTmdbMovie)
    };
  } catch (err) {
    return handleTmdbError(err, `fetchDiscoverByGenre(genre=${resolvedGenreId}, page=${pageNum})`);
  }
};

/**
 * Live TMDB Movie Details Endpoint
 * Fetches movie metadata, cast credits, and YouTube trailers
 */
const fetchMovieDetails = async (tmdbId) => {
  try {
    const [details, credits, videos] = await Promise.all([
      getWithRetry(`/movie/${tmdbId}`, {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }),
      getWithRetry(`/movie/${tmdbId}/credits`, {
        api_key: TMDB_API_KEY
      }).catch(() => ({ data: {} })),
      getWithRetry(`/movie/${tmdbId}/videos`, {
        api_key: TMDB_API_KEY
      }).catch(() => ({ data: {} }))
    ]);

    const trailer = (videos.data.results || []).find(
      (v) => v.type === 'Trailer' && v.site === 'YouTube'
    ) || videos.data.results?.[0];

    const cast = (credits.data.cast || []).slice(0, 15).map((c) => ({
      name: c.name,
      character: c.character,
      profilePath: c.profile_path ? buildImageUrl(c.profile_path, 'w500') : null
    }));

    const formatted = formatTmdbMovie(details.data);
    return {
      ...formatted,
      cast,
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
    };
  } catch (err) {
    return handleTmdbError(err, `fetchMovieDetails(${tmdbId})`);
  }
};

/**
 * Live TMDB Bollywood Trending Feed
 * Queries TMDB for Hindi cinema blockbusters currently trending and streaming.
 * GET /discover/movie?with_original_language=hi&region=IN&watch_region=IN&sort_by=popularity.desc&page=${page}
 */
const fetchBollywoodTrending = async (page = 1, genre = null) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const params = {
    api_key: TMDB_API_KEY,
    with_original_language: 'hi',
    region: 'IN',
    watch_region: 'IN',
    sort_by: 'popularity.desc',
    include_adult: false,
    language: 'en-US',
    page: pageNum
  };

  if (genre) {
    const resolvedGenreId = GENRE_NAME_TO_ID[String(genre).toLowerCase()] || Number(genre);
    if (resolvedGenreId) {
      params.with_genres = resolvedGenreId;
    }
  }

  try {
    const res = await getWithRetry('/discover/movie', params);
    return {
      page: res.data.page || pageNum,
      total_pages: res.data.total_pages || 1,
      total_results: res.data.total_results || res.data.results?.length || 0,
      results: (res.data.results || []).map(formatTmdbMovie).filter(Boolean)
    };
  } catch (err) {
    return handleTmdbError(err, `fetchBollywoodTrending(page=${pageNum}, genre=${genre || 'all'})`);
  }
};

/**
 * Helper to interleave trending global titles with trending Bollywood hits.
 * Preserves popularity ranking while guaranteeing a rich presence of trending Bollywood cinema.
 */
const interleaveTrending = (primaryList = [], bollywoodList = [], limit = 20) => {
  const result = [];
  const seen = new Set();
  let p = 0;
  let b = 0;

  while (result.length < limit && (p < primaryList.length || b < bollywoodList.length)) {
    // Add up to 2 items from primary trending list
    for (let i = 0; i < 2 && p < primaryList.length && result.length < limit; i++) {
      const item = primaryList[p++];
      const id = String(item.tmdbId || item.id);
      if (!seen.has(id)) {
        seen.add(id);
        result.push(item);
      }
    }
    // Add 1 item from bollywood trending list
    if (b < bollywoodList.length && result.length < limit) {
      const item = bollywoodList[b++];
      const id = String(item.tmdbId || item.id);
      if (!seen.has(id)) {
        seen.add(id);
        result.push(item);
      }
    }
  }

  return result;
};

// In-memory sections cache (90 seconds TTL)
let sectionsCache = null;
let sectionsCacheExpiry = 0;

/**
 * Live TMDB Sections Loader for Discovery Shelves.
 * Dynamically queries TMDB for:
 * 1. Top 10 in India (ranked 1-10)
 * 2. Trending Bollywood & Hindi Cinema
 * 3. Now Trending & Streaming
 * 4. Action Hits & Blockbusters (interleaved with Bollywood action)
 * 5. Comedy & Crowd Pleasers (interleaved with Bollywood comedy)
 * 6. Romance & Heartfelt Dramas (interleaved with Bollywood romance)
 * 7. Horror & Paranormal Thrillers (interleaved with Bollywood horror)
 * 8. Sci-Fi & Epic Fantasies (interleaved with Bollywood fantasy)
 */
const getSectionsData = async () => {
  const now = Date.now();
  if (sectionsCache && now < sectionsCacheExpiry) {
    return sectionsCache;
  }

  const safeFetch = async (url, params) => {
    try {
      const res = await getWithRetry(url, {
        api_key: TMDB_API_KEY,
        include_adult: false,
        language: 'en-US',
        ...params
      });
      return (res.data.results || []).map(formatTmdbMovie).filter(Boolean);
    } catch (err) {
      console.warn(`[getSectionsData SafeFetch Warning] ${url}:`, err.message);
      return [];
    }
  };

  // Run in 2 safe batched queries to prevent rate-limit and connection reset issues
  const [topIndiaRes, trendingDayRes, bollyTrendingRes, actionGlobal, actionBolly] = await Promise.all([
    safeFetch('/movie/now_playing', { region: 'IN', page: 1 }),
    safeFetch('/trending/movie/day', { page: 1 }),
    safeFetch('/discover/movie', {
      with_original_language: 'hi',
      region: 'IN',
      watch_region: 'IN',
      sort_by: 'popularity.desc',
      page: 1
    }),
    safeFetch('/discover/movie', { with_genres: 28, sort_by: 'popularity.desc', page: 1 }),
    safeFetch('/discover/movie', {
      with_genres: 28,
      with_original_language: 'hi',
      region: 'IN',
      sort_by: 'popularity.desc',
      page: 1
    })
  ]);

  const [
    comedyGlobal,
    comedyBolly,
    romanceGlobal,
    romanceBolly,
    horrorGlobal,
    horrorBolly,
    scifiGlobal,
    scifiBolly
  ] = await Promise.all([
    safeFetch('/discover/movie', { with_genres: 35, sort_by: 'popularity.desc', page: 1 }),
    safeFetch('/discover/movie', {
      with_genres: 35,
      with_original_language: 'hi',
      region: 'IN',
      sort_by: 'popularity.desc',
      page: 1
    }),
    safeFetch('/discover/movie', { with_genres: 10749, sort_by: 'popularity.desc', page: 1 }),
    safeFetch('/discover/movie', {
      with_genres: 10749,
      with_original_language: 'hi',
      region: 'IN',
      sort_by: 'popularity.desc',
      page: 1
    }),
    safeFetch('/discover/movie', { with_genres: 27, sort_by: 'popularity.desc', page: 1 }),
    safeFetch('/discover/movie', {
      with_genres: 27,
      with_original_language: 'hi',
      region: 'IN',
      sort_by: 'popularity.desc',
      page: 1
    }),
    safeFetch('/discover/movie', { with_genres: 878, sort_by: 'popularity.desc', page: 1 }),
    safeFetch('/discover/movie', {
      with_genres: 878,
      with_original_language: 'hi',
      region: 'IN',
      sort_by: 'popularity.desc',
      page: 1
    })
  ]);

  // Section 1: Top 10 in India with rank 1..10
  const top10Movies = (topIndiaRes.length > 0 ? topIndiaRes : bollyTrendingRes)
    .slice(0, 10)
    .map((m, idx) => ({
      ...m,
      rank: idx + 1,
      section: 'top10_india'
    }));

  const sections = [
    {
      id: 'top10_india',
      title: 'Top 10 Movies in India Today',
      subtitle: 'The biggest cinematic blockbusters trending across theatres and streaming nationwide',
      badge: 'TOP 10 IN INDIA',
      icon: 'trophy',
      movies: top10Movies
    },
    {
      id: 'bollywood',
      title: 'Trending Bollywood & Hindi Cinema',
      subtitle: 'The latest Hindi blockbusters, theatrical sensations, and trending streaming hits',
      badge: 'BOLLYWOOD TRENDING',
      icon: 'film',
      movies: bollyTrendingRes.slice(0, 20).map((m) => ({ ...m, section: 'bollywood' }))
    },
    {
      id: 'trending',
      title: 'Now Trending & Streaming',
      subtitle: 'The hottest movies currently buzzing on big screens and streaming platforms worldwide',
      badge: 'TRENDING TODAY',
      icon: 'fire',
      movies: trendingDayRes.slice(0, 20).map((m) => ({ ...m, section: 'trending' }))
    },
    {
      id: 'action',
      title: 'Action Hits & Blockbusters',
      subtitle: 'Explosive stunts, high-octane showdowns, and Bollywood action spectacles',
      badge: 'HIGH ADRENALINE',
      icon: 'bolt',
      movies: interleaveTrending(actionGlobal, actionBolly, 20).map((m) => ({ ...m, section: 'action' }))
    },
    {
      id: 'comedy',
      title: 'Comedy & Crowd Pleasers',
      subtitle: 'Side-splitting comedies, family entertainers, and Bollywood laugh riots',
      badge: 'CROWD PLEASERS',
      icon: 'laugh-beam',
      movies: interleaveTrending(comedyGlobal, comedyBolly, 20).map((m) => ({ ...m, section: 'comedy' }))
    },
    {
      id: 'romance',
      title: 'Romance & Heartfelt Dramas',
      subtitle: 'Poignant love stories, romantic sagas, and unforgettable Bollywood musical journeys',
      badge: 'DATE NIGHT HITS',
      icon: 'heart',
      movies: interleaveTrending(romanceGlobal, romanceBolly, 20).map((m) => ({ ...m, section: 'romance' }))
    },
    {
      id: 'horror',
      title: 'Horror & Paranormal Thrillers',
      subtitle: 'Nail-biting suspense, nocturnal chills, and spine-tingling Indian supernatural thrillers',
      badge: 'EDGE OF YOUR SEAT',
      icon: 'ghost',
      movies: interleaveTrending(horrorGlobal, horrorBolly, 20).map((m) => ({ ...m, section: 'horror' }))
    },
    {
      id: 'scifi',
      title: 'Sci-Fi & Epic Fantasies',
      subtitle: 'Interplanetary frontiers, futuristic technologies, and mythological fantasy epics',
      badge: 'IMAX SPECTACLES',
      icon: 'rocket',
      movies: interleaveTrending(scifiGlobal, scifiBolly, 20).map((m) => ({ ...m, section: 'scifi' }))
    }
  ];

  // Consolidate all unique movies across sections
  const movieMap = new Map();
  sections.forEach((sec) => {
    sec.movies.forEach((m) => {
      if (m && m.tmdbId && !movieMap.has(m.tmdbId)) {
        movieMap.set(m.tmdbId, m);
      }
    });
  });

  const allMovies = Array.from(movieMap.values());

  const result = {
    sections,
    allMovies,
    totalMovies: allMovies.length
  };

  sectionsCache = result;
  sectionsCacheExpiry = now + 90000; // Cache for 90 seconds

  return result;
};

const fetchNowPlaying = async (page = 1) => fetchTrendingLive(page, 'IN');
const fetchPopular = async (page = 1) => fetchTrendingLive(page, '');
const searchMovies = async (query, page = 1) => searchMoviesLive(query, page);

module.exports = {
  tmdbClient,
  searchMoviesLive,
  fetchTrendingLive,
  fetchDiscoverByGenre,
  fetchBollywoodTrending,
  fetchNowPlaying,
  fetchPopular,
  fetchMovieDetails,
  searchMovies,
  getSectionsData,
  formatTmdbMovie,
  buildImageUrl,
  genreMap,
  GENRE_NAME_TO_ID,
  TMDB_IMAGE_BASE,
  TMDB_BACKDROP_BASE,
  PLACEHOLDER_POSTER,
  PLACEHOLDER_BACKDROP
};
