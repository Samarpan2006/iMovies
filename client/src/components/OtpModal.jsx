import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faCheckCircle, faRedo, faTimes, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../utils/api';

const OtpModal = ({
  isOpen,
  email,
  onClose,
  onSuccess,
  title = 'Verify Your Email',
  subtitle = 'Enter the 6-digit verification code sent to your email to activate your account.'
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Focus first input and initialize timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setCanResend(false);
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // 60-second countdown timer for Resend Code
  useEffect(() => {
    if (!isOpen) return;
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
  }, [timer, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (index, value) => {
    const cleaned = value.replace(/\D/g, ''); // Numbers only
    if (!cleaned) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const lastChar = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = lastChar;
    setOtp(newOtp);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // If 6th digit entered, auto submit if all filled
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        submitOtp(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      submitOtp(pastedData);
    }
  };

  const submitOtp = async (codeToVerify) => {
    const fullOtp = codeToVerify || otp.join('');
    if (fullOtp.length !== 6) {
      toast.warning('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        email: email?.trim(),
        otp: fullOtp
      });

      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user || { email, isAdmin: false }));
        }
        toast.success(res.data.message || 'Email verified successfully!');
        if (onSuccess) {
          onSuccess(res.data.token, res.data.user);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired verification code.';
      toast.error(msg);
      // Clear inputs for retry
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      const res = await api.post('/auth/resend-otp', {
        email: email?.trim()
      });
      toast.success(res.data.message || 'A fresh verification code has been dispatched to your email.');
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
        
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        )}

        {/* Icon & Heading */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-[#e50914]/10 border border-[#e50914]/30 rounded-2xl flex items-center justify-center text-[#e50914] text-2xl shadow-lg shadow-red-950/20">
            <FontAwesomeIcon icon={faShieldAlt} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
            {subtitle}
          </p>
          {email && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#1f1f1f] border border-[#333333] rounded-full text-xs font-semibold text-gray-300">
              <FontAwesomeIcon icon={faEnvelope} className="text-[#e50914]" />
              <span className="truncate max-w-[240px]">{email}</span>
            </div>
          )}
        </div>

        {/* 6 Digit Inputs */}
        <div className="flex justify-between gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl bg-[#0a0a0a] border transition-all outline-none ${
                digit
                  ? 'border-[#e50914] text-[#e50914] shadow-md shadow-red-950/30'
                  : 'border-[#2d2d2d] text-white focus:border-[#e50914]'
              }`}
            />
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => submitOtp()}
          disabled={loading || otp.join('').length !== 6}
          className="w-full py-3.5 px-4 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FontAwesomeIcon icon={faCheckCircle} />
          )}
          <span>{loading ? 'Verifying Code...' : 'Verify & Continue'}</span>
        </button>

        {/* Resend OTP & Cooldown */}
        <div className="mt-5 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <span>Didn't receive the code?</span>
          {canResend ? (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-[#e50914] hover:underline font-bold inline-flex items-center gap-1 transition-colors"
            >
              <FontAwesomeIcon icon={faRedo} className={resending ? 'animate-spin' : ''} />
              <span>{resending ? 'Resending...' : 'Resend Code'}</span>
            </button>
          ) : (
            <span className="text-gray-500 font-semibold">
              Resend in <span className="text-[#e50914] font-bold">{timer}s</span>
            </span>
          )}
        </div>

        {/* Safety Note */}
        <p className="mt-4 text-[11px] text-gray-500 text-center leading-normal">
          Check your spam or junk folder if you don't see the email within a minute.
        </p>
      </div>
    </div>
  );
};

export default OtpModal;
