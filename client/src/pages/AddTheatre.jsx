import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faArrowLeft,
  faMapMarkerAlt,
  faChair,
  faTrash,
  faPlus,
  faSearch,
  faCalendarPlus,
  faCheckCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';

const AddTheatre = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingTheatres, setFetchingTheatres] = useState(true);
  const [theatres, setTheatres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    theatreName: '',
    location: '',
    balconySeatPrice: 400,
    middleSeatPrice: 280,
    lowerSeatPrice: 180,
    balconyRows: 3,
    middleRows: 5,
    lowerRows: 4,
    seatsPerRow: 10
  });

  useEffect(() => {
    fetchExistingTheatres();
  }, []);

  const fetchExistingTheatres = async () => {
    setFetchingTheatres(true);
    try {
      const res = await api.get('/theatre');
      if (res.data.success) {
        setTheatres(res.data.theatres || []);
      }
    } catch (err) {
      console.error('Failed to load theatres:', err);
      toast.error('Unable to fetch existing theatres.');
    } finally {
      setFetchingTheatres(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.theatreName.trim() || !formData.location.trim()) {
      toast.warning('Theatre name and location are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/theatre/add', formData);
      if (res.data.success) {
        toast.success(`"${formData.theatreName}" registered successfully!`);
        // Reset form to defaults
        setFormData({
          theatreName: '',
          location: '',
          balconySeatPrice: 400,
          middleSeatPrice: 280,
          lowerSeatPrice: 180,
          balconyRows: 3,
          middleRows: 5,
          lowerRows: 4,
          seatsPerRow: 10
        });
        // Refresh available theatres list
        await fetchExistingTheatres();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add theatre.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheatre = async (theatreId, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from available theatres?`)) {
      return;
    }

    setDeletingId(theatreId);
    try {
      const res = await api.delete(`/theatre/${theatreId}`);
      if (res.data.success) {
        toast.success(`"${name}" removed successfully.`);
        setTheatres((prev) => prev.filter((t) => t.theatreId !== theatreId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete theatre.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to calculate total seats for a tier object
  const countSeats = (seatObj) => {
    if (!seatObj || typeof seatObj !== 'object') return 0;
    let count = 0;
    for (const r of Object.keys(seatObj)) {
      if (seatObj[r] && typeof seatObj[r] === 'object') {
        count += Object.keys(seatObj[r]).length;
      }
    }
    return count;
  };

  // Filter theatres by search query
  const filteredTheatres = theatres.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.theatreName && t.theatreName.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q))
    );
  });

  const calculatedCapacity =
    (Number(formData.balconyRows) + Number(formData.middleRows) + Number(formData.lowerRows)) *
    Number(formData.seatsPerRow);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header / Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#222222] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Admin Dashboard</span>
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
                Auditorium Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <FontAwesomeIcon icon={faBuilding} className="text-[#e50914]" />
              <span>Cinemas & Theatres</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Configure new auditoriums or view and manage currently available multiplex venues.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-[#141414] border border-[#282828] px-3 py-1.5 rounded-xl text-gray-300">
              <span className="text-[#e50914] font-black">{theatres.length}</span> Theatres Active
            </span>
            <Link
              to="/addshow"
              className="inline-flex items-center gap-2 bg-[#1e1e1e] hover:bg-[#282828] text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-[#333] transition-colors"
            >
              <FontAwesomeIcon icon={faCalendarPlus} className="text-[#e50914]" />
              <span>Schedule Show</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Add Form (Left) & Existing Theatres (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Add Theatre Form (5 cols on large screens) */}
          <div className="lg:col-span-5 bg-[#141414] border border-[#242424] rounded-3xl p-6 sm:p-7 shadow-2xl sticky top-20">
            <div className="pb-4 border-b border-[#222222] mb-5">
              <span className="text-[11px] font-bold text-[#e50914] uppercase tracking-wider block">
                Auditorium Configuration
              </span>
              <h2 className="text-lg font-black text-white mt-0.5">Register New Cinema Theatre</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Theatre / Complex Name *
                </label>
                <input
                  type="text"
                  name="theatreName"
                  required
                  value={formData.theatreName}
                  onChange={handleChange}
                  placeholder="e.g., PVR Director's Cut"
                  className="w-full px-3.5 py-2 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  City / Location *
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Downtown Cineplex, Screen 1"
                  className="w-full px-3.5 py-2 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              {/* Tier Pricing Configuration */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Seat Tier Pricing (₹ INR)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-[#0a0a0a] border border-[#242424] rounded-xl">
                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                      Balcony
                    </label>
                    <input
                      type="number"
                      name="balconySeatPrice"
                      required
                      value={formData.balconySeatPrice}
                      onChange={handleChange}
                      className="w-full px-2 py-1 bg-[#141414] border border-[#333] rounded-lg text-white font-bold text-sm focus:outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div className="p-2.5 bg-[#0a0a0a] border border-[#242424] rounded-xl">
                    <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                      Middle
                    </label>
                    <input
                      type="number"
                      name="middleSeatPrice"
                      required
                      value={formData.middleSeatPrice}
                      onChange={handleChange}
                      className="w-full px-2 py-1 bg-[#141414] border border-[#333] rounded-lg text-white font-bold text-sm focus:outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div className="p-2.5 bg-[#0a0a0a] border border-[#242424] rounded-xl">
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      Lower
                    </label>
                    <input
                      type="number"
                      name="lowerSeatPrice"
                      required
                      value={formData.lowerSeatPrice}
                      onChange={handleChange}
                      className="w-full px-2 py-1 bg-[#141414] border border-[#333] rounded-lg text-white font-bold text-sm focus:outline-none focus:border-[#e50914]"
                    />
                  </div>
                </div>
              </div>

              {/* Matrix Layout Grid Rows & Columns */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Seating Layout Grid
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Cap: <span className="text-[#e50914] font-bold">{calculatedCapacity}</span> seats
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Balcony Rows</label>
                    <input
                      type="number"
                      name="balconyRows"
                      min="1"
                      max="10"
                      value={formData.balconyRows}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-lg text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Middle Rows</label>
                    <input
                      type="number"
                      name="middleRows"
                      min="1"
                      max="15"
                      value={formData.middleRows}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-lg text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Lower Rows</label>
                    <input
                      type="number"
                      name="lowerRows"
                      min="1"
                      max="15"
                      value={formData.lowerRows}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-lg text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Seats / Row</label>
                    <input
                      type="number"
                      name="seatsPerRow"
                      min="4"
                      max="20"
                      value={formData.seatsPerRow}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-lg text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>{loading ? 'Registering Auditorium...' : 'Save & Add Theatre'}</span>
              </button>
            </form>
          </div>

          {/* RIGHT: Already Available / Added Theatres (7 cols on large screens) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#141414] border border-[#242424] rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222222] gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">Available / Added Theatres</h2>
                    <span className="text-xs font-black bg-red-950/40 text-[#e50914] border border-red-900/40 px-2 py-0.5 rounded-full">
                      {theatres.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    These auditoriums are actively configured and ready for showtime schedules.
                  </p>
                </div>

                {/* Filter / Search Bar */}
                {theatres.length > 0 && (
                  <div className="relative w-full sm:w-56">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Search theatres..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e50914]"
                    />
                  </div>
                )}
              </div>

              {/* Theatres List */}
              {fetchingTheatres ? (
                <div className="py-12 text-center">
                  <Loader message="Loading available theatres..." />
                </div>
              ) : filteredTheatres.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#0c0c0c] rounded-2xl border border-[#222222]">
                  <FontAwesomeIcon icon={faBuilding} className="text-4xl text-gray-600 mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">
                    {searchQuery ? 'No matching theatres found' : 'No theatres added yet'}
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {searchQuery
                      ? `No theatres matched "${searchQuery}". Try clearing the search query.`
                      : 'Use the configuration form on the left to register your first multiplex auditorium.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTheatres.map((theatre) => {
                    const balconySeats = countSeats(theatre.balconySeats);
                    const middleSeats = countSeats(theatre.middleSeats);
                    const lowerSeats = countSeats(theatre.lowerSeats);
                    const totalCapacity = balconySeats + middleSeats + lowerSeats;

                    return (
                      <div
                        key={theatre.theatreId}
                        className="bg-[#0c0c0c] border border-[#222222] hover:border-[#333333] rounded-2xl p-4 sm:p-5 transition-all shadow-md group"
                      >
                        {/* Top row: Name, Location, and Delete */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-950/40 to-black text-[#e50914] flex items-center justify-center border border-red-900/30 flex-shrink-0 mt-0.5">
                              <FontAwesomeIcon icon={faBuilding} className="text-base" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-white group-hover:text-[#e50914] transition-colors">
                                {theatre.theatreName}
                              </h3>
                              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <FontAwesomeIcon
                                  icon={faMapMarkerAlt}
                                  className="text-[11px] text-[#e50914]"
                                />
                                <span>{theatre.location}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to="/addshow"
                              className="px-2.5 py-1 text-[11px] font-bold bg-[#141414] hover:bg-[#e50914] text-gray-300 hover:text-white rounded-lg border border-[#282828] hover:border-[#e50914] transition-colors flex items-center gap-1"
                              title="Schedule a movie show at this theatre"
                            >
                              <FontAwesomeIcon icon={faCalendarPlus} />
                              <span className="hidden sm:inline">Add Show</span>
                            </Link>

                            <button
                              onClick={() =>
                                handleDeleteTheatre(theatre.theatreId, theatre.theatreName)
                              }
                              disabled={deletingId === theatre.theatreId}
                              className="p-1.5 px-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 rounded-lg transition-colors"
                              title="Delete theatre"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>

                        {/* Middle row: Pricing breakdown badges */}
                        <div className="grid grid-cols-3 gap-2 mb-3 bg-[#141414] border border-[#1f1f1f] p-2.5 rounded-xl text-center">
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-gray-500">
                              Balcony Tier
                            </span>
                            <span className="text-xs font-black text-amber-400">
                              ₹{theatre.balconySeatPrice}
                            </span>
                          </div>
                          <div className="border-x border-[#1f1f1f]">
                            <span className="block text-[10px] font-bold uppercase text-gray-500">
                              Middle Tier
                            </span>
                            <span className="text-xs font-black text-blue-400">
                              ₹{theatre.middleSeatPrice}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-gray-500">
                              Lower Tier
                            </span>
                            <span className="text-xs font-black text-emerald-400">
                              ₹{theatre.lowerSeatPrice}
                            </span>
                          </div>
                        </div>

                        {/* Bottom row: Seating capacity breakdown */}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-[#1a1a1a] gap-2">
                          <div className="flex items-center gap-3 font-mono">
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faChair} className="text-amber-400/80 text-[10px]" />
                              <span>Balcony: <strong className="text-white">{balconySeats}</strong></span>
                            </span>
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faChair} className="text-blue-400/80 text-[10px]" />
                              <span>Middle: <strong className="text-white">{middleSeats}</strong></span>
                            </span>
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faChair} className="text-emerald-400/80 text-[10px]" />
                              <span>Lower: <strong className="text-white">{lowerSeats}</strong></span>
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded-md bg-[#161616] border border-[#2a2a2a] text-gray-300 font-bold font-mono">
                            {totalCapacity} Total Seats
                          </span>
                        </div>
                      </div>
                    );
                  })}
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

export default AddTheatre;
