const PLACEHOLDER_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
const PLACEHOLDER_BACKDROP =
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1280&auto=format&fit=crop&q=80';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

export const genreMap = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

/**
 * Builds clean TMDB image URLs using the TMDB CDN.
 * Only returns fallback placeholder if path is null, undefined, or empty.
 */
export const getImageUrl = (path, size = 'w500') => {
  if (!path || typeof path !== 'string' || path.trim() === '' || path === 'null' || path === 'undefined') {
    return size === 'w1280' ? PLACEHOLDER_BACKDROP : PLACEHOLDER_POSTER;
  }

  const trimmed = path.trim();

  // Already a full URL (e.g. Unsplash or already formatted CDN URL)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/([^:]\/)\/+/g, '$1');
  }

  // Ensure path starts with single slash
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = size === 'w1280' ? TMDB_BACKDROP_BASE : TMDB_IMAGE_BASE;
  
  // Clean concatenation with CDN base URL
  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}${cleanPath}`;
};

/**
 * Normalizes any movie object from TMDB API or internal schema.
 * Ensures poster_path, backdrop_path, genres, and metadata are cleanly mapped.
 */
export const normalizeMovie = (m = {}) => {
  if (!m) return null;

  const id = m.tmdbId || m.id || m._id || '';
  const title = m.movieName || m.title || m.original_title || 'Untitled Movie';
  const rawPoster = m.poster_path || m.posterPath;
  const rawBackdrop = m.backdrop_path || m.backdropPath;

  let genres = [];
  if (Array.isArray(m.genres) && m.genres.length > 0) {
    genres = m.genres.map((g) => (typeof g === 'object' && g !== null ? g.name || 'Cinema' : String(g)));
  } else if (Array.isArray(m.genre_ids) && m.genre_ids.length > 0) {
    genres = m.genre_ids.map((gid) => genreMap[gid] || 'Cinema');
  } else if (typeof m.genres === 'string' && m.genres.trim()) {
    genres = m.genres.split(',').map((g) => g.trim());
  }
  if (genres.length === 0) genres = ['Cinema'];

  return {
    ...m,
    _id: String(id),
    tmdbId: String(id),
    movieName: title,
    title: title,
    description: m.overview || m.description || 'No synopsis available for this feature film.',
    overview: m.overview || m.description || 'No synopsis available for this feature film.',
    genres,
    releaseDate: m.releaseDate || m.release_date || new Date().toISOString(),
    release_date: m.releaseDate || m.release_date || new Date().toISOString(),
    language: m.language || (m.original_language ? (m.original_language === 'en' ? 'English' : m.original_language.toUpperCase()) : 'English'),
    duration: m.duration || (m.runtime ? `${m.runtime} min` : '120 min'),
    certification: m.certification || 'U/A',
    voteAverage: Number(m.voteAverage || m.vote_average || 0),
    vote_average: Number(m.voteAverage || m.vote_average || 0),
    poster_path: rawPoster || null,
    posterPath: rawPoster ? getImageUrl(rawPoster, 'w500') : PLACEHOLDER_POSTER,
    backdrop_path: rawBackdrop || null,
    backdropPath: rawBackdrop ? getImageUrl(rawBackdrop, 'w1280') : PLACEHOLDER_BACKDROP,
    trailerUrl: m.trailerUrl || null,
    cast: Array.isArray(m.cast) ? m.cast : []
  };
};

export const getPosterUrl = (path) => getImageUrl(path, 'w500');
export const getBackdropUrl = (path) => getImageUrl(path, 'w1280');

export { PLACEHOLDER_POSTER, PLACEHOLDER_BACKDROP };
