import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faUser, faEnvelope, faLock, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../utils/api';
import OtpModal from '../components/OtpModal';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      toast.warning('Please complete all registration fields.');
      return;
    }
    if (formData.username.length < 3 || formData.username.length > 20) {
      toast.warning('Username must be between 3 and 20 characters.');
      return;
    }
    if (formData.password.length < 6) {
      toast.warning('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (res.data.success) {
        // If email verification with OTP is required (mandatory security flow)
        if (res.data.requireVerification) {
          setRegisteredEmail(res.data.email || formData.email);
          setShowOtpModal(true);
          toast.info(res.data.message || 'Verification code sent to your email! Please enter it to continue.');
          return;
        }

        // Direct success fallback
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem(
            'user',
            JSON.stringify({ ...(res.data.user || {}), isAdmin: false })
          );
          toast.success('Registration successful! Welcome to iMovies.');
          navigate('/home');
        }
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.requireVerification) {
        setRegisteredEmail(errData.email || formData.email);
        setShowOtpModal(true);
        toast.info(errData.message || 'Please enter the verification code sent to your email.');
      } else {
        toast.error(errData?.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = (token, user) => {
    setShowOtpModal(false);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/landing" className="inline-flex items-center gap-2.5 text-3xl font-black text-[#e50914]">
          <FontAwesomeIcon icon={faFilm} />
          <span>iMovies</span>
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Book seats in seconds and receive digital tickets instantly
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#141414] py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#222222]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <FontAwesomeIcon icon={faUser} />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
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
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
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
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/30 transition-all flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faUserPlus} />
              <span>{loading ? 'Creating Account...' : 'Sign Up Free'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-[#e50914] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* 6-Digit Email Verification Modal Window */}
      <OtpModal
        isOpen={showOtpModal}
        email={registeredEmail}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpSuccess}
        title="Verify Your Email"
        subtitle="To complete your registration, enter the 6-digit code sent to your email address."
      />
    </div>
  );
};

export default Register;
