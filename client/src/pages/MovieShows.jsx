import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faBuilding,
  faMapMarkerAlt,
  faTicketAlt,
  faArrowLeft,
  faFire,
  faCheckCircle,
  faExclamationTriangle,
  faTv,
  faCalendarDay
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import { getPosterUrl, getBackdropUrl } from '../utils/imageHelper';
import { isShowtimePast, compareShowtimes } from '../utils/timeHelper';

const MovieShows = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loadingMovie, setLoadingMovie] = useState(true);
  const [loadingShows, setLoadingShows] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  // Live clock reference to keep showtime status real-time as time progresses
  const [nowTime, setNowTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(dayjs());
    }, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Generate 7 upcoming day selectors
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return {
      dateStr: d.format('YYYY-MM-DD'),
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.format('ddd'),
      dayNum: d.format('DD'),
      monthName: d.format('MMM'),
      fullLabel: d.format('dddd, MMMM D, YYYY')
    };
  });

  // Fetch Movie details once
  useEffect(() => {
    const fetchMovieDetails = async () => {
      setLoadingMovie(true);
      try {
        const res = await api.get(`/movie/${movieId}`);
        if (res.data.success) {
          setMovie(res.data.movie);
        }
      } catch (err) {
        console.error('Error fetching movie details:', err);
      } finally {
        setLoadingMovie(false);
      }
    };

    if (movieId) {
      fetchMovieDetails();
    }
  }, [movieId]);

  // Fetch Shows dynamically whenever selectedDate or movieId changes
  useEffect(() => {
    const fetchShowtimes = async () => {
      setLoadingShows(true);
      try {
        const res = await api.get(`/shows`, {
          params: { movieId, date: selectedDate }
        });
        if (res.data.success) {
          setShows(res.data.shows || []);
        } else {
          setShows([]);
        }
      } catch (err) {
        console.error('Error fetching showtimes:', err);
        toast.error('Unable to load show schedules for selected date.');
        setShows([]);
      } finally {
        setLoadingShows(false);
      }
    };

    if (movieId && selectedDate) {
      fetchShowtimes();
    }
  }, [movieId, selectedDate]);

  // Available formats filter
  const availableFormats = ['ALL', ...new Set(shows.map(s => s.format).filter(Boolean))];

  // Filter shows by format if selected
  const filteredShows = selectedFormat === 'ALL'
    ? shows
    : shows.filter(s => s.format === selectedFormat);

  // Group shows by Theatre Location
  const groupedTheatres = filteredShows.reduce((acc, show) => {
    const tName = show.theatreName || 'PVR Cinema Complex';
    if (!acc[tName]) {
      acc[tName] = {
        theatreName: tName,
        theatreLocation: show.theatreLocation || 'Auditorium Complex',
        pricing: show.pricing || { balcony: 400, middle: 280, lower: 180 },
        shows: []
      };
    }
    acc[tName].shows.push(show);
    return acc;
  }, {});

  // Chronological Sorting: Ensure all showtimes within every theatre appear in strict chronological order
  // (e.g. 09:45 AM -> 01:00 PM -> 05:15 PM -> 08:30 PM)
  Object.values(groupedTheatres).forEach((group) => {
    group.shows.sort((a, b) => compareShowtimes(a.showTime, b.showTime));
  });

  // Availability badge styling helper
  const getAvailabilityBadge = (status) => {
    switch (status) {
      case 'Fast Filling':
        return {
          bg: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
          icon: faFire,
          label: 'Fast Filling'
        };
      case 'Almost Full':
        return {
          bg: 'bg-red-950/40 text-red-400 border-red-800/40',
          icon: faExclamationTriangle,
          label: 'Almost Full'
        };
      case 'Available':
      default:
        return {
          bg: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
          icon: faCheckCircle,
          label: 'Available'
        };
    }
  };

  const selectedDayObj = calendarDays.find(d => d.dateStr === selectedDate) || calendarDays[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link
            to={`/moviedetails/${movieId}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Movie Info</span>
          </Link>
        </div>

        {/* Selected Movie Summary Bar */}
        {loadingMovie ? (
          <div className="h-32 bg-[#141414] rounded-2xl animate-pulse mb-8 border border-[#222222]"></div>
        ) : movie ? (
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center gap-5 shadow-xl">
            <div className="w-20 h-28 rounded-xl overflow-hidden bg-[#222222] flex-shrink-0 shadow-md">
              <img
                src={getPosterUrl(movie.posterPath, movie.movieName)}
                alt={movie.movieName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getPosterUrl(null, movie.movieName);
                }}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="text-[11px] font-black text-[#e50914] uppercase tracking-wider bg-red-950/30 px-2.5 py-0.5 rounded-full border border-red-900/40">
                  Select Showtime
                </span>
                {movie.certification && (
                  <span className="text-[11px] font-bold border border-yellow-500/50 text-yellow-400 px-2 py-0.5 rounded">
                    {movie.certification}
                  </span>
                )}
                {movie.language && (
                  <span className="text-[11px] font-medium bg-[#1e1e1e] text-gray-300 px-2 py-0.5 rounded border border-[#2a2a2a]">
                    {movie.language}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{movie.movieName}</h1>
              <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {movie.duration && <span>{movie.duration}</span>}
                {movie.duration && <span>•</span>}
                <span>{(movie.genres || []).join(', ')}</span>
              </p>
            </div>
          </div>
        ) : null}

        {/* Dynamic Date Selector Tabs */}
        <div className="bg-[#141414] border border-[#222222] rounded-2xl p-5 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-[#1f1f1f] gap-2">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-[#e50914]" />
              <span>Select Date: <span className="text-white font-black">{selectedDayObj.fullLabel}</span></span>
            </p>
            {availableFormats.length > 2 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-medium">Format:</span>
                <div className="flex gap-1">
                  {availableFormats.map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                        selectedFormat === fmt
                          ? 'bg-[#e50914] text-white'
                          : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Selector Carousel */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#e50914] scrollbar-track-[#1a1a1a]">
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`flex-shrink-0 w-24 py-3 px-2 rounded-xl text-center border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#e50914] border-[#e50914] text-white shadow-xl shadow-red-950/60 transform scale-105 font-black ring-2 ring-red-500/50'
                      : 'bg-[#0e0e0e] border-[#242424] text-gray-300 hover:text-white hover:border-gray-500 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className={`block text-[11px] font-bold uppercase ${isSelected ? 'text-red-100 opacity-90' : 'text-gray-400'}`}>
                    {day.dayName}
                  </span>
                  <span className="block text-xl font-black my-0.5 tracking-tight">{day.dayNum}</span>
                  <span className={`block text-[10px] font-semibold uppercase ${isSelected ? 'text-red-100 opacity-90' : 'text-gray-500'}`}>
                    {day.monthName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Showtime Details & Venues */}
        {loadingShows ? (
          <div className="py-16 bg-[#141414] border border-[#222222] rounded-2xl p-8 text-center">
            <Loader message={`Loading available showtimes for ${selectedDayObj.dayName} (${selectedDayObj.monthName} ${selectedDayObj.dayNum})...`} />
          </div>
        ) : Object.keys(groupedTheatres).length === 0 ? (
          /* Fallback UI: Zero showtimes clean empty state */
          <div className="text-center py-16 bg-[#141414] border border-[#222222] rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-950/30 text-[#e50914] flex items-center justify-center mx-auto mb-5 border border-red-900/40">
              <FontAwesomeIcon icon={faCalendarDay} className="text-2xl" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              No shows available for this date. Please check back later or select another date.
            </h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              Screenings for <span className="text-white font-bold">{movie?.movieName || 'this movie'}</span> have not yet been scheduled on {selectedDayObj.fullLabel}.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setSelectedDate(calendarDays[0].dateStr)}
                className="bg-[#e50914] hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-red-950/40"
              >
                View Today's Shows
              </button>
              {calendarDays.slice(1, 4).map(d => (
                <button
                  key={d.dateStr}
                  onClick={() => setSelectedDate(d.dateStr)}
                  className="bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 hover:text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors border border-[#2a2a2a]"
                >
                  {d.dayName} ({d.monthName} {d.dayNum})
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Showtime Details Cards */
          <div className="space-y-6">
            {Object.values(groupedTheatres).map((group, idx) => (
              <div
                key={idx}
                className="bg-[#141414] border border-[#242424] rounded-2xl p-6 hover:border-[#383838] transition-all shadow-xl"
              >
                {/* Cinema / Theater Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#222222] gap-4 mb-5">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-950/40 to-black text-[#e50914] flex items-center justify-center border border-red-900/30 flex-shrink-0">
                      <FontAwesomeIcon icon={faBuilding} className="text-lg" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white hover:text-[#e50914] transition-colors">
                        {group.theatreName}
                      </h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[11px] text-[#e50914]" />
                        <span>{group.theatreLocation}</span>
                      </p>
                    </div>
                  </div>

                  {/* Pricing / Ticket Category Breakdown */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[11px] bg-[#0c0c0c] border border-[#282828] px-3 py-1.5 rounded-lg flex items-center gap-3 text-gray-300">
                      <span className="font-semibold text-gray-400">Pricing:</span>
                      <span className="text-amber-400 font-bold">Balcony ₹{group.pricing?.balcony || 420}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-blue-400 font-bold">Middle ₹{group.pricing?.middle || 290}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-emerald-400 font-bold">Lower ₹{group.pricing?.lower || 190}</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-900/40 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live Seat Lock</span>
                    </div>
                  </div>
                </div>

                {/* Available Timings as Clickable Badges/Buttons */}
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Available Show Timings
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {group.shows.map((show) => {
                      const isPast = isShowtimePast(selectedDate, show.showTime, nowTime);
                      const availBadge = getAvailabilityBadge(show.availabilityStatus);

                      return (
                        <button
                          key={show.showId}
                          disabled={isPast}
                          onClick={isPast ? undefined : () => navigate(`/seatslug/${show.showId}`)}
                          className={`group/btn relative rounded-xl p-3 text-left transition-all duration-200 flex flex-col justify-between ${
                            isPast
                              ? 'bg-[#0a0a0a]/80 border border-[#1f1f1f] opacity-45 cursor-not-allowed select-none'
                              : 'bg-[#0c0c0c] hover:bg-[#181818] border border-[#282828] hover:border-[#e50914] cursor-pointer shadow hover:shadow-lg hover:shadow-red-950/30'
                          }`}
                          title={
                            isPast
                              ? `This ${show.showTime} screening has already started or ended (Booking closed).`
                              : `Book tickets for ${show.showTime}`
                          }
                        >
                          {/* Top: Screen Type / Format */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
                                isPast
                                  ? 'bg-[#181818] text-gray-500'
                                  : 'bg-[#1f1f1f] group-hover/btn:bg-[#e50914] group-hover/btn:text-white text-gray-300'
                              }`}
                            >
                              {show.format || '2D'}
                            </span>
                            {isPast ? (
                              <span className="text-[9px] font-black uppercase tracking-wider text-red-500/90 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/40">
                                Expired
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500 font-medium">
                                {show.screenType || 'Screen 1'}
                              </span>
                            )}
                          </div>

                          {/* Middle: Show Timing */}
                          <div className="my-1.5">
                            <div
                              className={`flex items-center gap-1.5 text-base font-black transition-colors ${
                                isPast
                                  ? 'text-gray-500 line-through decoration-red-900/60'
                                  : 'text-white group-hover/btn:text-[#e50914]'
                              }`}
                            >
                              <FontAwesomeIcon
                                icon={faClock}
                                className={`text-xs ${isPast ? 'text-gray-600' : 'text-[#e50914]'}`}
                              />
                              <span>{show.showTime}</span>
                            </div>
                            <span
                              className={`text-[11px] font-medium block mt-0.5 ${
                                isPast ? 'text-gray-600' : 'text-gray-400'
                              }`}
                            >
                              {isPast
                                ? 'Booking Closed'
                                : `Starts ₹${show.pricing?.lower || group.pricing?.lower || 180}`}
                            </span>
                          </div>

                          {/* Bottom: Seat Availability Status */}
                          {isPast ? (
                            <div className="mt-2 text-[10px] font-bold px-2 py-1 rounded-md border border-gray-800/60 bg-[#121212] text-gray-500 flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                <span>Closed</span>
                              </span>
                              <span className="text-[9px] uppercase tracking-wider text-gray-600 font-mono">
                                Past Show
                              </span>
                            </div>
                          ) : (
                            <div
                              className={`mt-2 text-[10px] font-bold px-2 py-1 rounded-md border flex items-center justify-between gap-1 ${availBadge.bg}`}
                            >
                              <span className="flex items-center gap-1">
                                <FontAwesomeIcon icon={availBadge.icon} className="text-[9px]" />
                                <span>{availBadge.label}</span>
                              </span>
                              {show.availableSeatsCount !== undefined && (
                                <span className="opacity-75 font-mono text-[9px]">
                                  {show.availableSeatsCount} left
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MovieShows;
