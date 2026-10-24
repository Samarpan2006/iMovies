import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faCheckCircle, faExclamationTriangle, faArrowRight, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Loader from '../components/Loader';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams();
  const navigate = useNavigate();

  const token = paramToken || searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Validating your email verification link...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please use the link sent to your email.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/auth/verify-email', { token, email });
        if (res.data.success) {
          if (res.data.token) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user || { email, isAdmin: false }));
          }
          setStatus('success');
          setMessage(res.data.message || 'Your email has been successfully verified!');
          toast.success('Email verified successfully! Welcome to iMovies.');
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            navigate('/home');
          }, 2500);
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
      }
    };

    verify();
  }, [token, email, navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/landing" className="inline-flex items-center gap-2.5 text-3xl font-black text-[#e50914]">
          <FontAwesomeIcon icon={faFilm} />
          <span>iMovies</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#141414] py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#222222] text-center">
          
          {status === 'verifying' && (
            <div className="py-6">
              <Loader message="Verifying your account credentials..." />
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-500 text-3xl shadow-lg shadow-green-950/20">
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h2 className="text-2xl font-black text-white">Email Verified!</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
              <div className="pt-2">
                <Link
                  to="/home"
                  className="w-full py-3 px-4 bg-[#e50914] hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/30 transition-all inline-flex items-center justify-center gap-2"
                >
                  <span>Go to Movies Home</span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 text-3xl shadow-lg shadow-red-950/20">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <h2 className="text-2xl font-black text-white">Verification Link Issue</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full py-3 px-4 bg-[#e50914] hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/30 transition-all inline-flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faSignInAlt} />
                  <span>Go to Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="text-xs text-gray-400 hover:text-white pt-2"
                >
                  Need to create an account? Sign Up
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
