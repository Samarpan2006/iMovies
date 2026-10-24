import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faEnvelope, faLock, faCheckCircle, faRedo, faTimes, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../utils/api';

const ForgotPasswordModal = ({ isOpen, initialEmail = '', onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep(1);
      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setTimer(60);
      setCanResend(false);
    }
  }, [isOpen, initialEmail]);

  useEffect(() => {
    if (!isOpen || step !== 2) return;
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer, isOpen, step]);

  if (!isOpen) return null;

  // Step 1: Send OTP to Email
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.warning('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      if (res.data.success) {
        toast.success(res.data.message || 'Recovery code dispatched! Please check your inbox.');
        setStep(2);
        setTimer(60);
        setCanResend(false);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newArr = [...otp];
      newArr[index] = '';
      setOtp(newArr);
      return;
    }

    const lastChar = cleaned.slice(-1);
    const newArr = [...otp];
    newArr[index] = lastChar;
    setOtp(newArr);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newArr = [...otp];
    for (let i = 0; i < 6; i++) {
      newArr[i] = pasted[i] || '';
    }
    setOtp(newArr);
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // Step 2: Submit Reset Password with OTP
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      toast.warning('Please enter the full 6-digit verification code.');
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
        otp: fullOtp,
        newPassword
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Password reset successfully! Please sign in with your new password.');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      toast.success(res.data.message || 'A fresh recovery code has been sent to your email.');
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend recovery code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} className="text-lg" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-[#e50914]/10 border border-[#e50914]/30 rounded-2xl flex items-center justify-center text-[#e50914] text-2xl shadow-lg shadow-red-950/20">
            <FontAwesomeIcon icon={faKey} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {step === 1 ? 'Forgot Password?' : 'Reset Your Password'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
            {step === 1
              ? 'Enter your registered email address and we will send you a 6-digit recovery code.'
              : `Enter the 6-digit code sent to ${email} along with your new password.`}
          </p>
        </div>

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2c2c2c] rounded-xl text-white text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FontAwesomeIcon icon={faEnvelope} />
              )}
              <span>{loading ? 'Sending Code...' : 'Send Recovery Code'}</span>
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP + New Password */}
        {step === 2 && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 text-center">
                6-Digit Recovery Code
              </label>
              <div className="flex justify-between gap-2 mb-2" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-11 h-12 text-center text-xl font-black rounded-xl bg-[#0a0a0a] border transition-all outline-none ${
                      digit
                        ? 'border-[#e50914] text-[#e50914]'
                        : 'border-[#2d2d2d] text-white focus:border-[#e50914]'
                    }`}
                  />
                ))}
              </div>
            </div>

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
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3 px-4 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FontAwesomeIcon icon={faCheckCircle} />
              )}
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>

            {/* Resend and Back Buttons */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Change Email</span>
              </button>

              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-[#e50914] hover:underline font-bold inline-flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faRedo} className={resending ? 'animate-spin' : ''} />
                  <span>{resending ? 'Resending...' : 'Resend Code'}</span>
                </button>
              ) : (
                <span className="text-gray-500">
                  Resend in <span className="text-[#e50914] font-bold">{timer}s</span>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
