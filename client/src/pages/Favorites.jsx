import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faTrash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import MovieCard from '../components/MovieCard';
import api from '../utils/api';
import { normalizeMovie } from '../utils/imageHelper';

const Favorites = () => {
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoritesWithDetails();
  }, []);

  const fetchFavoritesWithDetails = async () => {
    setLoading(true);
    try {
      const favRes = await api.get('/favorite');
      const favItems = Array.isArray(favRes.data?.favorites)
        ? favRes.data.favorites
        : Array.isArray(favRes.data)
        ? favRes.data
        : [];

      if (favItems.length === 0) {
        setFavoriteMovies([]);
        setLoading(false);
        return;
      }

      // Fetch each movie's metadata
      const moviePromises = favItems.map((f) => {
        const targetId = f.movieId || f.id || f._id;
        return api
          .get(`/movie/${targetId}`)
          .then((r) => r.data?.movie || r.data?.result || r.data)
          .catch(() => null);
      });

      const resolved = await Promise.all(moviePromises);
      const normalized = resolved.filter(Boolean).map(normalizeMovie);
      setFavoriteMovies(normalized);
    } catch (err) {
      toast.error('Unable to fetch your watchlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (movieId) => {
    const idStr = String(movieId);
    try {
      await api.delete(`/favorite/${idStr}`);
      setFavoriteMovies((prev) =>
        prev.filter((m) => (m.tmdbId || m._id) !== idStr)
      );
      toast.info('Removed from watchlist.');
    } catch (err) {
      toast.error('Failed to remove movie.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="pb-6 border-b border-[#222222] mb-8">
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-3">
            <FontAwesomeIcon icon={faHeart} className="text-[#e50914]" />
            <span>My Movie Watchlist</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Keep track of upcoming releases and must-watch blockbusters.
          </p>
        </div>

        {loading ? (
          <Loader message="Loading your saved movies..." />
        ) : favoriteMovies.length === 0 ? (
          <div className="text-center py-20 bg-[#141414] border border-[#222222] rounded-2xl p-8">
            <FontAwesomeIcon icon={faHeart} className="text-5xl text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-white">Your watchlist is empty</h3>
            <p className="text-gray-400 text-sm mt-1">
              Tap the heart icon on any movie poster to save it here for later.
            </p>
            <Link
              to="/home"
              className="mt-5 inline-block px-6 py-2.5 bg-[#e50914] text-white font-bold text-xs rounded-xl shadow-md"
            >
              Browse Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {favoriteMovies.map((movie) => {
              const movieId = movie.tmdbId || movie._id;
              return (
                <MovieCard
                  key={movieId}
                  movie={movie}
                  onFavorite={() => handleRemoveFavorite(movieId)}
                  isFavorited={true}
                />
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;
