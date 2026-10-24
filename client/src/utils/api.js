import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['auth-token'] = token;
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register') &&
        !window.location.pathname.includes('/landing')
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Live TMDB Search API caller
 * Calls: GET /api/movie/search?query={query}&page={page}
 */
export const searchMoviesApi = async (query, page = 1) => {
  const res = await api.get('/movie/search', {
    params: { query: query.trim(), page }
  });
  return res.data;
};

/**
 * Dynamic Trending / Now Playing Feed API caller
 * Calls: GET /api/movie/trending?page={page}&region=IN
 */
export const getTrendingMoviesApi = async (page = 1, region = 'IN') => {
  const res = await api.get('/movie/trending', {
    params: { page, region }
  });
  return res.data;
};

/**
 * Dynamic Bollywood / Hindi Cinema Trending Feed API caller
 * Calls: GET /api/movie/bollywood?page={page}&genre={genre}
 */
export const getBollywoodMoviesApi = async (page = 1, genre = '') => {
  const params = { page };
  if (genre) params.genre = genre;
  const res = await api.get('/movie/bollywood', { params });
  return res.data;
};

/**
 * Dynamic Category & Genre Feed API caller
 * Calls: GET /api/movie/discover?genre={genreId}&page={page}
 */
export const getDiscoverMoviesApi = async (genre, page = 1) => {
  const res = await api.get('/movie/discover', {
    params: { genre, page }
  });
  return res.data;
};

/**
 * Curated Movie Sections caller
 * Calls: GET /api/movie/sections
 */
export const getMovieSectionsApi = async () => {
  const res = await api.get('/movie/sections');
  return res.data;
};

export default api;
