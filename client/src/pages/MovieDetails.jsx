import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faClock,
  faCalendarAlt,
  faLanguage,
  faTicketAlt,
  faHeart,
  faPlay,
  faCommentAlt,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import { getImageUrl, normalizeMovie, PLACEHOLDER_POSTER } from '../utils/imageHelper';

const MovieDetails = () => {
  const { movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState('0.0');
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posterError, setPosterError] = useState(false);

  // Review submission state
  const [newRating, setNewRating] = useState(8);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadMovieData();
  }, [movieId]);

  const loadMovieData = async () => {
    setLoading(true);
    setPosterError(false);
    try {
      const [movieRes, reviewRes, favRes] = await Promise.all([
        api.get(`/movie/${movieId}`),
        api.get(`/review/${movieId}`).catch(() => ({ data: { reviews: [], avgRating: '0.0' } })),
        api.get('/favorite').catch(() => ({ data: { favorites: [] } }))
      ]);

      const rawMovie = movieRes.data?.movie || movieRes.data?.result || movieRes.data;
      if (rawMovie) {
        setMovie(normalizeMovie(rawMovie));
      }
      setReviews(reviewRes.data?.reviews || []);
      setAvgRating(reviewRes.data?.avgRating || '0.0');

      const favList = (favRes.data?.favorites || []).map((f) => String(f.movieId || f.id || f._id));
      setIsFavorited(favList.includes(String(movieId)));
    } catch (err) {
      toast.error('Could not load movie information.');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    const idStr = String(movieId);
    try {
      if (isFavorited) {
        await api.delete(`/favorite/${idStr}`);
        setIsFavorited(false);
        toast.info('Removed from watchlist.');
      } else {
        await api.post('/favorite/add', { movieId: idStr });
        setIsFavorited(true);
        toast.success('Added to watchlist!');
      }
    } catch (err) {
      toast.error('Failed to update watchlist.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) {
      toast.warning('Please enter review remarks.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await api.post('/review/add', {
        movieId: String(movieId),
        rating: Number(newRating),
        reviewText: newReviewText.trim()
      });

      if (res.data.success) {
        toast.success('Your review has been submitted!');
        setNewReviewText('');
        // Reload reviews
        const revRes = await api.get(`/review/${movieId}`);
        setReviews(revRes.data?.reviews || []);
        setAvgRating(revRes.data?.avgRating || '0.0');
      }
    } catch (err) {
      toast.error('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading movie details, trailer, and reviews..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <h2 className="text-2xl font-bold text-white">Movie Not Found</h2>
          <p className="text-gray-400 mt-2">The requested movie could not be located in our records.</p>
          <Link
            to="/home"
            className="mt-4 px-6 py-2.5 bg-[#e50914] text-white font-bold rounded-xl"
          >
            Back to Movies
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const posterSrc = posterError ? PLACEHOLDER_POSTER : getImageUrl(movie.posterPath, 'w500');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      {/* Backdrop Hero Header */}
      <div className="relative w-full h-72 sm:h-96 lg:h-[450px] overflow-hidden bg-[#111111]">
        {movie.backdropPath && (
          <img
            src={getImageUrl(movie.backdropPath, 'w1280')}
            alt=""
            className="w-full h-full object-cover opacity-35"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent"></div>
      </div>

      {/* Main Details Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-40 sm:-mt-52 lg:-mt-64 relative z-10 pb-16">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Left Poster Column */}
          <div className="w-48 sm:w-64 lg:w-72 flex-shrink-0 mx-auto md:mx-0">
            <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2b2b2b] bg-[#141414] aspect-[2/3]">
              <img
                src={posterSrc}
                alt={movie.movieName}
                className="w-full h-full object-cover"
                onError={() => setPosterError(true)}
              />
            </div>

            <div className="mt-5 space-y-3">
              <Link
                to={`/movieshows/${movie.tmdbId || movie._id}`}
                className="w-full py-3.5 bg-[#e50914] hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-xl shadow-red-950/40 flex items-center justify-center gap-2 transition-all"
              >
                <FontAwesomeIcon icon={faTicketAlt} />
                <span>Select Showtime & Book</span>
              </Link>

              <button
                onClick={handleFavoriteToggle}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isFavorited
                    ? 'bg-[#1e1e1e] border-[#e50914] text-[#e50914]'
                    : 'bg-[#141414] border-[#2f2f2f] text-gray-300 hover:text-white hover:border-gray-500'
                }`}
              >
                <FontAwesomeIcon icon={faHeart} />
                <span>{isFavorited ? 'In Your Watchlist' : 'Add to Watchlist'}</span>
              </button>
            </div>
          </div>

          {/* Right Information Details Column */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {(movie.genres || []).map((g, i) => (
                  <span
                    key={i}
                    className="text-xs font-bold px-3 py-1 bg-[#1a1a1a] text-gray-200 border border-[#2f2f2f] rounded-full"
                  >
                    {g}
                  </span>
                ))}
                {movie.certification && (
                  <span className="text-xs font-bold px-2.5 py-0.5 border border-yellow-500/50 text-yellow-400 rounded">
                    {movie.certification}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                {movie.movieName}
              </h1>

              {/* Meta Stats Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-300 mt-3">
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <FontAwesomeIcon icon={faStar} />
                  <span>{movie.voteAverage ? Number(movie.voteAverage).toFixed(1) : avgRating} / 10</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faClock} className="text-gray-400" />
                  <span>{movie.duration || '135 min'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faLanguage} className="text-gray-400" />
                  <span>{movie.language || 'English'}</span>
                </span>
                {movie.releaseDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
                      <span>{new Date(movie.releaseDate).toLocaleDateString()}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Synopsis */}
            <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Movie Overview</h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                {movie.description}
              </p>
            </div>

            {/* Trailer embed / link */}
            {movie.trailerUrl && (
              <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FontAwesomeIcon icon={faPlay} className="text-[#e50914] text-sm" />
                    <span>Official Preview & Trailer</span>
                  </h2>
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#e50914] hover:underline"
                  >
                    Open on YouTube ↗
                  </a>
                </div>
                {movie.trailerUrl.includes('youtube.com/watch?v=') ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#262626]">
                    <iframe
                      src={`https://www.youtube.com/embed/${movie.trailerUrl.split('v=')[1]?.split('&')[0]}`}
                      title="Movie Trailer"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] text-white rounded-lg text-sm hover:bg-[#282828]"
                  >
                    <FontAwesomeIcon icon={faPlay} /> Watch Trailer
                  </a>
                )}
              </div>
            )}

            {/* Cast Members */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Top Billed Cast</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {movie.cast.slice(0, 10).map((actor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-[#0a0a0a] p-2.5 rounded-xl border border-[#222222]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1c1c1c] overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {actor.profilePath ? (
                          <img
                            src={getImageUrl(actor.profilePath, 'w500')}
                            alt={actor.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          actor.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{actor.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{actor.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ratings & Community Reviews */}
            <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCommentAlt} className="text-[#e50914] text-sm" />
                <span>Audience Reviews ({reviews.length})</span>
              </h2>

              {/* Add Review Form */}
              <form onSubmit={handleReviewSubmit} className="bg-[#0a0a0a] p-4 rounded-xl border border-[#222222] mb-6">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Share Your Movie Review
                </p>
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-xs text-gray-400">Score (1-10):</label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    className="bg-[#141414] border border-[#2f2f2f] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#e50914]"
                  >
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        ⭐ {r} / 10
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="What did you think of the pacing, performances, visuals, and story?"
                  rows={3}
                  className="w-full p-3 bg-[#141414] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                ></textarea>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow transition-all"
                  >
                    {submittingReview ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              </form>

              {/* Review Entries */}
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  Be the first moviegoer to leave a review for this show!
                </p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#0a0a0a] rounded-xl border border-[#222222]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faUser} className="text-gray-500 text-[10px]" />
                          <span>{rev.userEmail}</span>
                        </span>
                        <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                          <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                          <span>{rev.rating}/10</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{rev.reviewText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MovieDetails;
