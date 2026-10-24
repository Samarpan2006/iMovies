import React, { useState } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faLock, faCheckCircle, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../utils/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams();
  const navigate = useNavigate();

  const token = paramToken || searchParams.get('token');
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Please enter your email address.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        token,
        newPassword
      });

      if (res.data.success) {
        setResetSuccess(true);
        toast.success(res.data.message || 'Password reset successfully! Please sign in.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Link may be invalid or expired.');
    } finally {
      setLoading(false);
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
          Reset Your Password
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Create a new, secure password for your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#141414] py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#222222]">
          
          {resetSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-500 text-3xl shadow-lg shadow-green-950/20">
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h3 className="text-xl font-black text-white">Password Updated!</h3>
              <p className="text-sm text-gray-300">
                Your password has been securely updated. You can now log in with your new credentials.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full py-3 px-4 bg-[#e50914] hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/30 transition-all inline-flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faSignInAlt} />
                  <span>Sign In Now</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!emailParam && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <FontAwesomeIcon icon={faLock} />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <FontAwesomeIcon icon={faLock} />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FontAwesomeIcon icon={faCheckCircle} />
                )}
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-gray-400 hover:text-white">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
