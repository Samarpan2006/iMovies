import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../utils/api';

const AddMovie = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    movieName: '',
    description: '',
    genres: 'Action, Thriller',
    releaseDate: new Date().toISOString().split('T')[0],
    language: 'English',
    duration: '140 min',
    certification: 'U/A',
    posterPath: '',
    backdropPath: '',
    trailerUrl: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.movieName || !formData.description) {
      toast.warning('Movie name and description are required.');
      return;
    }

    setLoading(true);
    try {
      const genresArray = formData.genres
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g.length > 0);

      const payload = {
        ...formData,
        genres: genresArray.length > 0 ? genresArray : ['Cinema'],
        releaseDate: new Date(formData.releaseDate)
      };

      const res = await api.post('/movie/add', payload);
      if (res.data.success) {
        toast.success('Movie created successfully in catalog!');
        navigate('/admin');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add movie listing.');
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
                Admin Management
              </span>
              <h1 className="text-2xl font-black text-white mt-1">Create Custom Movie Listing</h1>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-3.5 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-[#0a0a0a] border border-[#262626] rounded-lg"
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Movie Title *
                </label>
                <input
                  type="text"
                  name="movieName"
                  required
                  value={formData.movieName}
                  onChange={handleChange}
                  placeholder="e.g. Inception 2"
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Genres (Comma separated) *
                </label>
                <input
                  type="text"
                  name="genres"
                  required
                  value={formData.genres}
                  onChange={handleChange}
                  placeholder="Sci-Fi, Action, Thriller"
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Language *
                </label>
                <input
                  type="text"
                  name="language"
                  required
                  value={formData.language}
                  onChange={handleChange}
                  placeholder="English"
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Duration *
                </label>
                <input
                  type="text"
                  name="duration"
                  required
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="148 min"
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Release Date *
                </label>
                <input
                  type="date"
                  name="releaseDate"
                  required
                  value={formData.releaseDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Certification
                </label>
                <input
                  type="text"
                  name="certification"
                  value={formData.certification}
                  onChange={handleChange}
                  placeholder="U/A, A, or U"
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Description / Synopsis *
              </label>
              <textarea
                name="description"
                required
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Comprehensive movie plot and storyline details..."
                className="w-full p-3.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Poster Image URL
                </label>
                <input
                  type="url"
                  name="posterPath"
                  value={formData.posterPath}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  YouTube Trailer Link
                </label>
                <input
                  type="url"
                  name="trailerUrl"
                  value={formData.trailerUrl}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlusCircle} />
                <span>{loading ? 'Publishing...' : 'Save Movie Listing'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddMovie;
