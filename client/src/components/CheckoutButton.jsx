import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faSpinner, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

/**
 * Reusable Razorpay CheckoutButton component configured for prominent UPI,
 * QR code scans, Google Pay, PhonePe, Paytm, Cards, and NetBanking.
 */
const CheckoutButton = ({
  amount,
  bookingId,
  movieTitle = 'Movie Ticket',
  seatLabels = [],
  customerEmail = '',
  customerName = '',
  onSuccess,
  onFailure,
  onDismiss,
  isLoading = false,
  className = ''
}) => {
  const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TpQ7mg5jyDRTt0';

  const handlePaymentClick = () => {
    if (!window.Razorpay) {
      toast.error('Razorpay payment gateway SDK failed to load. Please refresh.');
      if (onFailure) onFailure(new Error('Razorpay SDK not found'));
      return;
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: Math.round(Number(amount) * 100), // paise
      currency: 'INR',
      name: 'iMovies Cinema Ticketing',
      description: `${movieTitle} • Seats: ${seatLabels.join(', ') || 'N/A'}`,
      image: '',
      // Native UPI config ensuring UPI apps (GPay, PhonePe, Paytm) and dynamic QR codes display prominently
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay using UPI / QR Code',
              instruments: [
                { method: 'upi', flows: ['collect', 'intent', 'qr'] }
              ]
            },
            cards: {
              name: 'Credit / Debit Cards',
              instruments: [{ method: 'card' }]
            },
            netbanking: {
              name: 'Net Banking & Wallets',
              instruments: [{ method: 'netbanking' }, { method: 'wallet' }]
            }
          },
          sequence: ['block.upi', 'block.cards', 'block.netbanking'],
          preferences: {
            show_default_blocks: true
          }
        }
      },
      prefill: {
        name: customerName || 'Moviegoer',
        email: customerEmail || 'guest@imovies.com',
        contact: '9999999999'
      },
      theme: {
        color: '#e50914'
      },
      handler: async (response) => {
        if (onSuccess) {
          onSuccess(response);
        }
      },
      modal: {
        ondismiss: () => {
          toast.info('Payment was cancelled.');
          if (onDismiss) onDismiss();
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (failRes) => {
      toast.error(`Payment failed: ${failRes.error?.description || 'Transaction declined'}`);
      if (onFailure) onFailure(failRes.error);
    });

    rzp.open();
  };

  return (
    <button
      type="button"
      disabled={isLoading || Number(amount) <= 0}
      onClick={handlePaymentClick}
      className={`px-8 py-3.5 bg-[#e50914] hover:bg-red-700 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-xl shadow-red-950/50 transition-all flex items-center justify-center gap-2 ${className}`}
    >
      {isLoading ? (
        <>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          <span>Processing Payment...</span>
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faQrcode} className="text-sm" />
          <span>Pay ₹{amount} (UPI / Cards)</span>
        </>
      )}
    </button>
  );
};

export default CheckoutButton;
