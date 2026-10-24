import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../utils/api';

const AddShow = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    movieId: '',
    theatreId: '',
    theatreName: '',
    showDate: dayjs().format('YYYY-MM-DD'),
    showTime: '19:30'
  });

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [moviesRes, theatresRes] = await Promise.all([
        api.get('/movie?page=1'),
        api.get('/theatre')
      ]);

      if (moviesRes.data.success) {
        setMovies(moviesRes.data.movies || []);
      }
      if (theatresRes.data.success) {
        setTheatres(theatresRes.data.theatres || []);
      }
    } catch (e) {
      toast.error('Unable to load movies or theatres for scheduling.');
    }
  };

  const handleTheatreSelect = (e) => {
    const selectedId = e.target.value;
    const found = theatres.find((t) => t.theatreId === selectedId);
    setFormData({
      ...formData,
      theatreId: selectedId,
      theatreName: found ? found.theatreName : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.movieId || !formData.theatreId || !formData.showDate || !formData.showTime) {
      toast.warning('Please select a movie, theatre auditorium, date, and showtime.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/shows/add', formData);
      if (res.data.success) {
        toast.success('Auditorium show scheduled and seats matrix initialized!');
        navigate('/admin');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule show.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#141414] border border-[#222222] rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="flex items-center justify-between pb-6 border-b border-[#222222] mb-6">
            <div>
              <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
                Screen Scheduling
              </span>
              <h1 className="text-2xl font-black text-white mt-1">Schedule New Movie Showtime</h1>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-3.5 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-[#0a0a0a] border border-[#262626] rounded-lg"
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Movie selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Select Movie *
              </label>
              <select
                required
                value={formData.movieId}
                onChange={(e) => setFormData({ ...formData, movieId: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
              >
                <option value="">-- Choose a film from catalog or TMDB --</option>
                {movies.map((m) => (
                  <option key={m.tmdbId || m._id} value={m.tmdbId || m._id}>
                    {m.movieName} ({m.language || 'English'} - {m.duration || '120m'})
                  </option>
                ))}
              </select>
            </div>

            {/* Theatre selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Select Theatre Auditorium *
              </label>
              {theatres.length === 0 ? (
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-300">
                  No theatres configured yet. Please use "Add Theatre" first to set up auditorium pricing.
                </div>
              ) : (
                <select
                  required
                  value={formData.theatreId}
                  onChange={handleTheatreSelect}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                >
                  <option value="">-- Choose Cinema Complex --</option>
                  {theatres.map((t) => (
                    <option key={t.theatreId} value={t.theatreId}>
                      {t.theatreName} — {t.location} (Balcony ₹{t.balconySeatPrice}, Mid ₹{t.middleSeatPrice}, Low ₹{t.lowerSeatPrice})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Show Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.showDate}
                  onChange={(e) => setFormData({ ...formData, showDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Show Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.showTime}
                  onChange={(e) => setFormData({ ...formData, showTime: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || theatres.length === 0}
                className="px-8 py-3 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faCalendarPlus} />
                <span>{loading ? 'Initializing Show...' : 'Schedule Showtime'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddShow;
