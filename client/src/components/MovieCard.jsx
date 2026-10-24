import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faClock, faHeart, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import { getImageUrl, normalizeMovie, PLACEHOLDER_POSTER } from '../utils/imageHelper';

const MovieCard = ({ movie: rawMovie, onFavorite, isFavorited, rank }) => {
  const movie = normalizeMovie(rawMovie);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [movie?._id, movie?.tmdbId, movie?.poster_path, movie?.posterPath]);

  if (!movie) return null;

  const movieId = movie.tmdbId || movie._id;
  const rawPoster = movie.poster_path || movie.posterPath;
  const posterSrc = (!imageError && rawPoster) ? getImageUrl(rawPoster, 'w500') : PLACEHOLDER_POSTER;
  const displayRank = rank !== undefined ? rank : movie.rank;

  return (
    <div className="group relative bg-[#141414] rounded-xl overflow-hidden border border-[#222222] hover:border-[#e50914] transition-all duration-300 flex flex-col hover:shadow-2xl hover:shadow-red-950/20">
      {/* Poster Media Box */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1c1c1c]">
        <img
          src={posterSrc}
          alt={movie.movieName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => {
            setImageError(true);
          }}
        />

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30 opacity-70 group-hover:opacity-40 transition-opacity"></div>

        {/* Top 10 Rank Badge */}
        {displayRank && (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-[#e50914] to-red-800 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1 border border-red-500/60 z-20">
            <span className="text-[10px] tracking-wider text-red-200">TOP</span>
            <span className="text-sm font-black">#{displayRank}</span>
          </div>
        )}

        {/* Rating Badge */}
        {movie.voteAverage > 0 && (
          <div
            className={`absolute ${
              displayRank ? 'bottom-2.5 left-2.5' : 'top-2.5 left-2.5'
            } bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-white/10 z-10`}
          >
            <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xs" />
            <span className="text-xs font-black text-white">
              {Number(movie.voteAverage).toFixed(1)}
            </span>
          </div>
        )}

        {/* Watchlist Quick Button */}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(movieId);
            }}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
              isFavorited
                ? 'bg-[#e50914] border-[#e50914] text-white shadow-lg'
                : 'bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-[#e50914]'
            }`}
            title={isFavorited ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <FontAwesomeIcon icon={faHeart} className="text-xs" />
          </button>
        )}
      </div>

      {/* Card Body Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className="text-base font-bold text-white group-hover:text-[#e50914] transition-colors line-clamp-1"
            title={movie.movieName}
          >
            {movie.movieName}
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1.5">
            {movie.duration && (
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                {movie.duration}
              </span>
            )}
            {movie.language && (
              <>
                <span>•</span>
                <span
                  className={`uppercase text-[11px] ${
                    movie.original_language === 'hi' || String(movie.language).toLowerCase() === 'hindi'
                      ? 'text-amber-400 font-bold tracking-wider'
                      : 'font-semibold text-gray-300'
                  }`}
                >
                  {movie.original_language === 'hi' || String(movie.language).toLowerCase() === 'hindi'
                    ? 'Bollywood • Hindi'
                    : movie.language}
                </span>
              </>
            )}
            {movie.certification && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-gray-700 text-gray-300 font-mono">
                {movie.certification}
              </span>
            )}
          </div>

          {/* Genre Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {(movie.genres || []).slice(0, 2).map((genre, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-[#1e1e1e] text-gray-300 px-2 py-0.5 rounded border border-[#2a2a2a]"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* CTA Actions */}
        <div className="mt-4 pt-3 border-t border-[#1e1e1e] flex gap-2">
          <Link
            to={`/moviedetails/${movieId}`}
            className="flex-1 py-2 text-center text-xs font-bold bg-[#1e1e1e] hover:bg-[#282828] text-white rounded-lg transition-colors border border-[#2f2f2f]"
          >
            Overview
          </Link>
          <Link
            to={`/movieshows/${movieId}`}
            className="flex-1 py-2 text-center text-xs font-bold bg-[#e50914] hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 shadow-md shadow-red-900/20"
          >
            <FontAwesomeIcon icon={faTicketAlt} className="text-[11px]" />
            <span>Book</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
