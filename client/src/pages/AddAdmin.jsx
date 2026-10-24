import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../utils/api';

const AddAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      toast.warning('All admin credentials required.');
      return;
    }

    setLoading(true);
    try {
      // Calls secure admin-protected creation endpoint
      const res = await api.post('/admin/create-admin', formData);
      if (res.data.success) {
        toast.success(`Sub-admin [${formData.username}] created successfully!`);
        navigate('/admin');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create sub-admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#141414] border border-[#222222] rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="flex items-center justify-between pb-6 border-b border-[#222222] mb-6">
            <div>
              <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
                Security & Governance
              </span>
              <h1 className="text-2xl font-black text-white mt-1">Grant Administrative Rights</h1>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-3.5 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-[#0a0a0a] border border-[#262626] rounded-lg"
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Admin Username *
              </label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="manager_delhi"
                className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="manager@imovies.com"
                className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Temporary Password *
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914]"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUserShield} />
                <span>{loading ? 'Authorizing...' : 'Grant Admin Privileges'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddAdmin;
