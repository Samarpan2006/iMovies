import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faEnvelope, faLock, faSignInAlt, faShieldAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../utils/api';
import OtpModal from '../components/OtpModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const Login = () => {
  const navigate = useNavigate();
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.warning('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isAdminLogin ? '/auth/admin/login' : '/auth/login';
      const res = await api.post(endpoint, formData);

      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        const userData = isAdminLogin
          ? { ...(res.data.admin || {}), isAdmin: true }
          : { ...(res.data.user || {}), isAdmin: false };
        localStorage.setItem('user', JSON.stringify(userData));

        toast.success(
          `Welcome back, ${userData.username || (isAdminLogin ? 'Admin' : 'User')}!`
        );

        if (isAdminLogin) {
          navigate('/admin');
        } else {
          navigate('/home');
        }
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.requireVerification) {
        setUnverifiedEmail(errData.email || formData.email);
        setShowOtpModal(true);
        toast.info(errData.message || 'Please verify your email with the 6-digit code to activate your account.');
      } else {
        toast.error(errData?.message || 'Invalid credentials or login failure.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = (token, user) => {
    setShowOtpModal(false);
    if (isAdminLogin) {
      navigate('/admin');
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/landing" className="inline-flex items-center gap-2.5 text-3xl font-black text-[#e50914]">
          <FontAwesomeIcon icon={faFilm} />
          <span>iMovies</span>
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Book shows, view tickets, or manage cinema listings
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#141414] py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#222222]">
          {/* User vs Admin Toggle Tabs */}
          <div className="flex bg-[#0a0a0a] p-1 rounded-xl mb-6 border border-[#222222]">
            <button
              type="button"
              onClick={() => setIsAdminLogin(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                !isAdminLogin
                  ? 'bg-[#e50914] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faUser} />
              <span>Moviegoer</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdminLogin(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                isAdminLogin
                  ? 'bg-[#e50914] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faShieldAlt} />
              <span>Admin Desk</span>
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isAdminLogin ? 'admin@imovies.com' : 'user@example.com'}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
                {!isAdminLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-[#e50914] hover:underline focus:outline-none transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/30 transition-all flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faSignInAlt} />
              <span>{loading ? 'Authenticating...' : isAdminLogin ? 'Admin Sign In' : 'Sign In'}</span>
            </button>
          </form>

          {!isAdminLogin && (
            <div className="mt-6 text-center text-sm text-gray-400">
              New to iMovies?{' '}
              <Link to="/register" className="font-bold text-[#e50914] hover:underline">
                Create an account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal Window */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        initialEmail={formData.email}
        onClose={() => setShowForgotModal(false)}
        onSuccess={() => {
          setShowForgotModal(false);
          toast.info('You can now log in with your updated password.');
        }}
      />

      {/* Unverified Account OTP Verification Modal Window */}
      <OtpModal
        isOpen={showOtpModal}
        email={unverifiedEmail}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpVerified}
        title="Verify Your Account"
        subtitle="Your email has not been activated yet. Please enter the 6-digit code sent to your email to continue."
      />
    </div>
  );
};

export default Login;
