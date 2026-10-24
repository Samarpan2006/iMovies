import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faTicketAlt,
  faShieldAlt,
  faClock,
  faBuilding,
  faTv,
  faInfoCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import { generateWhatsAppMessage } from '../utils/whatsappHelper';
import { toCompositeSeatId, parseSeatIdentifier, formatSeatDisplay } from '../utils/seatHelper';
import { isShowtimePast } from '../utils/timeHelper';

const TIER_ORDER = ['balcony', 'middle', 'lower'];

const TIER_META = {
  balcony: { label: 'Balcony Tier (Premium)', color: 'text-amber-400', badge: 'bg-amber-950/40 text-amber-300 border-amber-800/40' },
  middle: { label: 'Middle Tier (Executive)', color: 'text-blue-400', badge: 'bg-blue-950/40 text-blue-300 border-blue-800/40' },
  lower: { label: 'Lower Tier (Standard)', color: 'text-emerald-400', badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' }
};

const SeatSlug = () => {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [theatre, setTheatre] = useState(null);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected seats state: array of { tier, row, col, label: 'A1', price: 250 }
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paying, setPaying] = useState(false);
  const [activeTier, setActiveTier] = useState('all');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchShowData = useCallback(async () => {
    try {
      const res = await api.get(`/shows/${showId}`);
      if (res.data.success) {
        setShow(res.data.show);
        setTheatre(res.data.theatre);

        if (res.data.show.movieId) {
          const mRes = await api.get(`/movie/${res.data.show.movieId}`).catch(() => null);
          if (mRes?.data?.success) {
            setMovie(mRes.data.movie);
          }
        }
      }
    } catch (err) {
      toast.error('Unable to fetch live seat map.');
    } finally {
      setLoading(false);
    }
  }, [showId]);

  // Connect WebSocket for live availability tracking
  useEffect(() => {
    fetchShowData();

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.emit('join-show', showId);

    socket.on('seat-status-update', () => {
      fetchShowData();
    });

    return () => {
      socket.disconnect();
    };
  }, [showId, fetchShowData]);

  const getTierPrice = (tierKey) => {
    if (!theatre) return 200;
    if (tierKey === 'balcony') return theatre.balconySeatPrice || 350;
    if (tierKey === 'middle') return theatre.middleSeatPrice || 250;
    return theatre.lowerSeatPrice || 150;
  };

  const getSeatStatus = (tierKey, row, col) => {
    const compositeKey = toCompositeSeatId(tierKey, row, col);
    const altCompositeKey = `${tierKey}:${row}:${col}`;

    // Dynamic Booking Check: check strictly against verified completed bookings for this tier
    // Never match against row+col label alone without tier, preventing cross-tier seat collisions
    if (Array.isArray(show?.bookedSeats)) {
      if (show.bookedSeats.includes(compositeKey) || show.bookedSeats.includes(altCompositeKey)) {
        return 'booked';
      }
    }

    const seatVal = show?.tickets?.[tierKey]?.[row]?.[col];
    if (!seatVal) return 'available';
    if (typeof seatVal === 'string') {
      return seatVal;
    }
    if (typeof seatVal === 'object') {
      if (seatVal.status === 'locked') {
        if (seatVal.lockExpiry && seatVal.lockExpiry < Date.now()) {
          return 'available';
        }
        return 'locked';
      }
      return seatVal.status || 'available';
    }
    return 'available';
  };

  const isSelected = (tierKey, row, col) => {
    const seatId = toCompositeSeatId(tierKey, row, col);
    return selectedSeats.some(
      (s) => s.id === seatId || s.seatId === seatId
    );
  };

  const isPastShow = isShowtimePast(show?.showDate, show?.showTime);

  const toggleSeat = (tierKey, row, col) => {
    if (isPastShow) {
      toast.warning('This show has already ended or started. Seat selection is closed.');
      return;
    }

    const status = getSeatStatus(tierKey, row, col);
    if (status === 'booked' || status === 'locked') {
      return;
    }

    const seatId = toCompositeSeatId(tierKey, row, col);
    const exists = isSelected(tierKey, row, col);

    if (exists) {
      setSelectedSeats((prev) =>
        prev.filter((s) => s.id !== seatId && s.seatId !== seatId)
      );
    } else {
      if (selectedSeats.length >= 8) {
        toast.warning('Maximum 8 tickets per transaction.');
        return;
      }
      const price = getTierPrice(tierKey);
      setSelectedSeats((prev) => [
        ...prev,
        {
          id: seatId,
          seatId,
          tierId: tierKey,
          sectionId: tierKey,
          tier: tierKey,
          row,
          col: String(col),
          seatNumber: String(col),
          number: String(col),
          label: `${row}${col}`,
          price
        }
      ]);
    }
  };

  const totalAmount = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  /**
   * Secure Razorpay Transaction Flow:
   * 1. Lock Seats: Sends composite unique keys (tier-row-col) to prevent tier collisions
   * 2. Booking Creation: Server calculates authoritative pricing (eliminates price tampering)
   * 3. Order Generation: Backend creates order from verified DB booking amount (no client amount trusted)
   * 4. Verification: Atomic signature & double booking verification
   */
  const handleProceedToPay = async () => {
    if (isPastShow) {
      toast.error('This show has already ended or started. Bookings are closed.');
      return;
    }

    if (selectedSeats.length === 0) {
      toast.warning('Please pick at least one seat on the auditorium map.');
      return;
    }

    setPaying(true);
    try {
      // Step 1: Use composite unique keys (tier-row-col) and structured seat detail objects
      const seatCompositeIds = selectedSeats.map(
        (s) => s.id || s.seatId || toCompositeSeatId(s.tier, s.row, s.col)
      );
      const seatPayload = selectedSeats.map((s) => ({
        id: s.id || s.seatId || toCompositeSeatId(s.tier, s.row, s.col),
        seatId: s.id || s.seatId || toCompositeSeatId(s.tier, s.row, s.col),
        tierId: s.tierId || s.tier,
        sectionId: s.sectionId || s.tier,
        tier: s.tier,
        row: s.row,
        col: String(s.col || s.seatNumber),
        seatNumber: String(s.seatNumber || s.col),
        number: String(s.seatNumber || s.col),
        label: s.label,
        price: s.price
      }));

      // Lock seats temporarily with TTL & concurrency control
      await api.post('/bookings/lock-seats', {
        showId,
        selectedSeats: seatCompositeIds,
        seats: seatPayload,
        userEmail: user.email
      });

      // Step 2: Create Pending Booking Record in MongoDB
      // (Server computes authoritative price - eliminates price tampering)
      const bookingRes = await api.post('/bookings/create', {
        showId,
        selectedSeats: seatCompositeIds,
        seats: seatPayload,
        ticketsData: { seats: seatPayload },
        movieName: movie?.movieName || 'Movie',
        moviePoster: movie?.posterPath || null,
        userName: user?.username || null,
        theatreName: show?.theatreName || 'Antigravity Cinemas Multiplex',
        showDate: show?.showDate || '',
        showTime: show?.showTime || '',
        userEmail: user?.email
      });

      const { bookingId, totalAmount: authoritativeTotal } = bookingRes.data;

      // Step 3: Gateway Order Creation
      // (Only sends bookingId; backend charges authoritative DB amount)
      const orderRes = await api.post('/payment/create-order', {
        bookingId
      });

      const { order, key } = orderRes.data;

      // Step 4: Checkout Modal with UPI Support
      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TpQ7mg5jyDRTt0',
        amount: order.amount,
        currency: order.currency,
        name: 'iMovies Cinema Ticketing',
        description: `Booking for ${movie?.movieName || 'Movie'} (${selectedSeats
          .map((s) => `${s.label} [${s.tier}]`)
          .join(', ')})`,
        order_id: order.id,
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
                name: 'Cards & NetBanking',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' }
                ]
              }
            },
            sequence: ['block.upi', 'block.cards'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        prefill: {
          name: user.username || 'Movie Enthusiast',
          email: user.email || 'guest@imovies.com'
        },
        theme: {
          color: '#e50914'
        },
        handler: async (response) => {
          // Cryptographic signature verification
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId
            });

            if (verifyRes.data.success) {
              const waLink = generateWhatsAppMessage({
                movieName: movie?.movieName,
                theatreName: show?.theatreName,
                showDate: show?.showDate,
                showTime: show?.showTime,
                selectedSeats: selectedSeats.map((s) => formatSeatDisplay(s)),
                totalAmount: authoritativeTotal || totalAmount,
                bookingId
              });

              toast.success('🎉 Payment confirmed! Your tickets are ready.');

              navigate('/bookings', {
                state: {
                  newBooking: verifyRes.data.booking,
                  waLink
                }
              });
            }
          } catch (vErr) {
            toast.error(vErr.response?.data?.message || 'Payment signature verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment was cancelled. Your temporary seat lock will expire.');
            setPaying(false);
          }
        }
      };

      if (!window.Razorpay) {
        toast.error('Razorpay SDK failed to load. Please refresh and check your internet connection.');
        setPaying(false);
        return;
      }

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', (failRes) => {
        toast.error(`Payment failed: ${failRes.error?.description || 'Transaction declined'}`);
        setPaying(false);
      });

      rzpInstance.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction initiation failed.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading interactive auditorium seat matrix..." />
        </div>
        <Footer />
      </div>
    );
  }

  const tickets = show?.tickets || {};

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation back */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={movie ? `/movieshows/${movie.tmdbId || movie._id}` : '/home'}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Change Showtime</span>
          </Link>
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live Availability Sync</span>
          </span>
        </div>

        {/* Showtime Banner */}
        <div className="bg-[#141414] border border-[#222222] rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
              {show?.theatreName}
            </span>
            <h1 className="text-2xl font-black text-white">{movie?.movieName || 'Movie Show'}</h1>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} /> {show?.showTime}
              </span>
              <span>•</span>
              <span>{show?.showDate}</span>
              {isPastShow && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded">
                  Show Expired
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2 text-xs">
            {TIER_ORDER.map((tier) => (
              <div
                key={tier}
                className={`px-3 py-1.5 rounded-lg border font-bold ${TIER_META[tier].badge}`}
              >
                {tier.toUpperCase()}: ₹{getTierPrice(tier)}
              </div>
            ))}
          </div>
        </div>

        {/* Expired Show Warning Banner */}
        {isPastShow && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 flex items-center gap-3 shadow-lg">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-lg flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Booking Closed — Past Showtime</p>
              <p className="text-xs text-red-300/80 mt-0.5">
                This screening on <strong className="text-white">{show?.showDate}</strong> at <strong className="text-white">{show?.showTime}</strong> has already commenced or concluded. Tickets can no longer be reserved.
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-3 bg-[#111111] border border-[#222222] rounded-xl mb-8 text-xs font-semibold text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#22c55e]"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#3b82f6] shadow-sm"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#eab308]"></div>
            <span>Locked (Checkout in Progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#ef4444] opacity-60"></div>
            <span>Booked</span>
          </div>
        </div>

        {/* Interactive Auditorium Grid */}
        <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6 sm:p-10 overflow-x-auto shadow-2xl mb-8">
          <div className="min-w-[500px] flex flex-col items-center space-y-8">
            {TIER_ORDER.map((tierKey) => {
              const tierData = tickets[tierKey];
              if (!tierData || Object.keys(tierData).length === 0) return null;

              const rows = Object.keys(tierData).sort();

              return (
                <div key={tierKey} className="w-full">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#222222]">
                    <span className={`text-xs font-black tracking-wider uppercase ${TIER_META[tierKey].color}`}>
                      {TIER_META[tierKey].label}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      ₹{getTierPrice(tierKey)} / ticket
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    {rows.map((rowChar) => {
                      const cols = Object.keys(tierData[rowChar]).sort((a, b) => Number(a) - Number(b));

                      return (
                        <div key={rowChar} className="flex items-center gap-2">
                          <span className="w-6 text-center text-xs font-mono font-bold text-gray-400">
                            {rowChar}
                          </span>

                          <div className="flex gap-2">
                            {cols.map((colNum) => {
                              const selected = isSelected(tierKey, rowChar, colNum);
                              const status = getSeatStatus(tierKey, rowChar, colNum);

                              let seatStyle = 'seat-available';
                              if (selected) seatStyle = 'seat-selected';
                              else if (status === 'locked') seatStyle = 'seat-locked';
                              else if (status === 'booked') seatStyle = 'seat-booked';

                              return (
                                <button
                                  key={colNum}
                                  type="button"
                                  disabled={status === 'booked' || status === 'locked'}
                                  onClick={() => toggleSeat(tierKey, rowChar, colNum)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold font-mono text-white flex items-center justify-center transition-all ${seatStyle}`}
                                  title={`Seat ${rowChar}${colNum} (${TIER_META[tierKey].label})`}
                                >
                                  {colNum}
                                </button>
                              );
                            })}
                          </div>

                          <span className="w-6 text-center text-xs font-mono font-bold text-gray-400">
                            {rowChar}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Cinema Screen Visual Curve (Bottom, facing upward toward front/lower tier seats) */}
            <div className="w-full max-w-2xl mx-auto pt-10 pb-4 text-center">
              {/* Upward curved projection beam / screen illumination */}
              <div className="relative mb-3">
                <div className="w-4/5 mx-auto h-3 bg-gradient-to-r from-transparent via-[#e50914] to-transparent rounded-t-full shadow-[0_-6px_25px_rgba(229,9,20,0.65)]"></div>
                <div className="w-3/5 mx-auto h-5 bg-gradient-to-t from-transparent via-red-950/20 to-red-600/30 blur-[2px]"></div>
              </div>
              <p className="text-[11px] font-black text-gray-300 tracking-[0.25em] uppercase flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faTv} className="text-xs text-[#e50914]" />
                <span>▲ SCREEN THIS WAY • ALL EYES FACE FORWARD</span>
              </p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">
                Lower Tier (Front Rows) closest to screen • Balcony Tier (Premium) at the top
              </p>
            </div>
          </div>
        </div>

        {/* Selected Seats Bottom Checkout Dock */}
        {selectedSeats.length > 0 && (
          <div className="sticky bottom-4 z-40 bg-[#141414]/95 backdrop-blur-md border-2 border-[#e50914] rounded-2xl p-5 shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Selected Seats ({selectedSeats.length})
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {selectedSeats.map((s) => (
                    <span
                      key={s.id || s.seatId}
                      className="px-2.5 py-1 bg-[#1e1e1e] border border-blue-500/50 text-blue-400 text-xs font-black rounded-lg"
                    >
                      {s.label} ({s.tier}) (₹{s.price})
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <span className="block text-xs text-gray-400 font-semibold">Total Payable</span>
                  <span className="block text-2xl font-black text-white">
                    ₹{totalAmount}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={paying || isPastShow}
                  onClick={handleProceedToPay}
                  className={`px-8 py-3.5 text-white font-black text-sm rounded-xl shadow-xl transition-all flex items-center gap-2 ${
                    isPastShow
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-[#e50914] hover:bg-red-700 disabled:opacity-50 shadow-red-950/50'
                  }`}
                >
                  <FontAwesomeIcon icon={faShieldAlt} />
                  <span>
                    {isPastShow
                      ? 'Showtime Closed'
                      : paying
                      ? 'Locking & Initializing...'
                      : `Proceed to Pay (₹${totalAmount})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SeatSlug;
