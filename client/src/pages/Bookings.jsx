import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicketAlt,
  faCalendarAlt,
  faClock,
  faBuilding,
  faBan,
  faCheckCircle,
  faPrint,
  faQrcode,
  faTimesCircle,
  faUndo,
  faTimes,
  faDownload,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import {
  getTicketPdfUrl,
  shareTicket
} from '../utils/whatsappHelper';
import { formatSeatDisplay } from '../utils/seatHelper';
import { isShowtimePast } from '../utils/timeHelper';

/**
 * Digital Admission Pass Modal Subcomponent
 */
const TicketPassModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const modalIsCancelled =
    booking.isCancelled ||
    booking.status === 'CANCELLED' ||
    booking.paymentStatus === 'Cancelled';
  const modalIsRefunded =
    booking.isRefunded ||
    booking.status === 'REFUNDED' ||
    booking.paymentStatus === 'Refunded';
  const modalIsPast = isShowtimePast(booking.showDate, booking.showTime);
  const modalIsExpired = !modalIsCancelled && !modalIsRefunded && modalIsPast;
  const modalIsActive =
    !modalIsCancelled &&
    !modalIsRefunded &&
    !modalIsPast &&
    Boolean(booking.isActive || booking.paymentStatus === 'Completed');

  const formattedSeats = (booking.selectedSeats || []).map(formatSeatDisplay);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2c2c2c] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#202020] transition-colors"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} className="text-base" />
        </button>

        <div className="text-center pb-4 border-b border-[#222222] mb-6">
          <span className="text-[11px] font-black text-[#e50914] uppercase tracking-wider block mb-1">
            iMovies Digital Cinema Pass
          </span>
          <h3 className="text-xl font-black text-white">
            {booking.movieName || 'Movie'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ref ID: #{booking.bookingId || 'N/A'}
          </p>
        </div>

        {/* Status Header & QR Display */}
        {modalIsActive ? (
          /* ACTIVE UPCOMING TICKET PASS */
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 mb-4">
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>VALID ADMISSION PASS</span>
            </div>

            {/* QR Code Container */}
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `iMovies-Pass:${booking.bookingId}:${booking.showId}:${(booking.selectedSeats || []).join(',')}`
                )}`}
                alt="Digital Admission QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[11px] text-gray-400 mb-6">
              Scan this QR code at the multiplex entrance gate for admission.
            </p>
          </div>
        ) : modalIsExpired ? (
          /* EXPIRED / PAST SHOWING */
          <div className="text-center my-4">
            <div className="p-4 bg-zinc-900 border border-zinc-700/60 rounded-2xl mb-4">
              <FontAwesomeIcon icon={faClock} className="text-3xl text-amber-400 mb-2" />
              <h4 className="text-base font-black text-amber-200">
                SCREENING CONCLUDED — PASS EXPIRED
              </h4>
              <p className="text-xs text-gray-300 mt-1">
                This show ({booking.showTime} on {booking.showDate}) has already passed.
                This ticket is archived and cannot be cancelled or reused.
              </p>
            </div>
            <div className="w-48 h-48 mx-auto bg-[#0a0a0a] border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center text-gray-500 mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-gray-600 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                SHOW COMPLETED
              </span>
            </div>
          </div>
        ) : (
          /* VOID / INACTIVE TICKET */
          <div className="text-center my-4">
            <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl mb-4">
              <FontAwesomeIcon icon={faTimesCircle} className="text-4xl text-red-500 mb-2" />
              <h4 className="text-base font-black text-red-300">
                {booking.status === 'REFUNDED' || booking.paymentStatus === 'Refunded'
                  ? 'ADMISSION REVOKED — PAYMENT REFUNDED'
                  : 'ENTRY VOID — TICKET CANCELLED'}
              </h4>
              <p className="text-xs text-red-200/80 mt-1">
                This reservation is permanently inactive. The associated entry barcode has been
                invalidated and cannot be scanned.
              </p>
            </div>
            <div className="w-48 h-48 mx-auto bg-[#0a0a0a] border-2 border-dashed border-red-900/40 rounded-2xl flex flex-col items-center justify-center text-gray-600 mb-4">
              <FontAwesomeIcon icon={faBan} className="text-4xl text-red-500/60 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                QR CODE INVALIDATED
              </span>
            </div>
          </div>
        )}

        {/* Show Details Summary Table */}
        <div className="bg-[#0c0c0c] border border-[#222222] rounded-2xl p-4 text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500 font-semibold">Auditorium</span>
            <span className="text-white font-bold">{booking.theatreName || 'Theatre'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-semibold">Date & Time</span>
            <span className="text-white font-bold">
              {booking.showDate} @ {booking.showTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-semibold">Allocated Seats</span>
            <span className="text-[#e50914] font-black font-mono">
              {formattedSeats.length > 0 ? formattedSeats.join(', ') : 'None'}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#1f1f1f]">
            <span className="text-gray-500 font-semibold">Total Paid</span>
            <span className="text-white font-black text-sm">
              ₹{booking.totalAmount || 0}
            </span>
          </div>
        </div>

        {/* Modal Action Toolbar: WhatsApp, PDF, and View Full Page */}
        <div className="space-y-2 mb-4">
          {modalIsActive ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  shareTicket({
                    movieName: booking.movieName,
                    theatreName: booking.theatreName,
                    showDate: booking.showDate,
                    showTime: booking.showTime,
                    selectedSeats: (booking.selectedSeats || []).map(formatSeatDisplay),
                    totalAmount: booking.totalAmount,
                    bookingId: booking.bookingId
                  })
                }
                className="py-2.5 px-3 bg-[#25D366] hover:bg-[#1ebd5a] text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
                <span>WhatsApp</span>
              </button>

              <a
                href={getTicketPdfUrl(booking.bookingId)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-[#e50914] hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow text-center"
              >
                <FontAwesomeIcon icon={faDownload} />
                <span>PDF Pass</span>
              </a>
            </div>
          ) : (
            <a
              href={getTicketPdfUrl(booking.bookingId)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-[#333] text-center"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>{modalIsExpired ? 'Download Show Receipt (PDF)' : 'Download Void Receipt (PDF)'}</span>
            </a>
          )}

          <Link
            to={`/ticket/${booking.bookingId}`}
            target="_blank"
            className="w-full py-2 bg-[#121212] hover:bg-[#1c1c1c] text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-[#222] transition-colors"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[11px]" />
            <span>Open Dedicated Pass URL</span>
          </Link>
        </div>

        {/* Close Action */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#1f1f1f] hover:bg-[#282828] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Close Pass
        </button>
      </div>
    </div>
  );
};

const Bookings = () => {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'expired' | 'cancelled'
  const [selectedTicketModal, setSelectedTicketModal] = useState(null);

  // New booking just confirmed via Razorpay
  const newBooking = location.state?.newBooking;
  const initialWaLink = location.state?.waLink;

  const fetchUserBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/user');
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to retrieve bookings:', err);
      toast.error('Unable to fetch your booking history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserBookings();

    // Real-time synchronization: listen for admin refunds or cancellations
    const rawSocket = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
    const socketUrl = rawSocket.replace(/\/api\/?$/, '').replace(/\/+$/, '') || 'http://localhost:5000';

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('booking-status-changed', (data) => {
      if (data && data.bookingId) {
        setBookings((prev) =>
          prev.map((b) =>
            b.bookingId === data.bookingId
              ? {
                  ...b,
                  status: data.status,
                  paymentStatus:
                    data.paymentStatus || (data.status === 'CANCELLED' ? 'Cancelled' : 'Refunded'),
                  isActive: false,
                  isCancelled: data.status === 'CANCELLED',
                  isRefunded: data.status === 'REFUNDED'
                }
              : b
          )
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchUserBookings]);

  const handleCancelBooking = async (bookingId) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this booking and free the reserved seats? This action cannot be undone.'
      )
    ) {
      return;
    }

    setCancellingId(bookingId);
    try {
      const res = await api.post(`/bookings/cancel/${bookingId}`);
      if (res.data?.success) {
        toast.success('Booking cancelled successfully. Reserved seats have been freed.');
        // Update local state immediately
        setBookings((prev) =>
          prev.map((b) =>
            b.bookingId === bookingId
              ? {
                  ...b,
                  paymentStatus: 'Cancelled',
                  status: 'CANCELLED',
                  isActive: false,
                  isCancelled: true,
                  cancelledAt: new Date().toISOString()
                }
              : b
          )
        );
        // Also re-fetch from server to ensure complete cache synchronization
        await fetchUserBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  // Filter bookings based on show date and cancellation state
  const activeBookings = bookings.filter((b) => {
    const isPast = isShowtimePast(b.showDate, b.showTime);
    const isCancelled = b.isCancelled || b.status === 'CANCELLED' || b.paymentStatus === 'Cancelled';
    const isRefunded = b.isRefunded || b.status === 'REFUNDED' || b.paymentStatus === 'Refunded';
    return !isCancelled && !isRefunded && Boolean(b.isActive || b.paymentStatus === 'Completed') && !isPast;
  });

  const expiredBookings = bookings.filter((b) => {
    const isPast = isShowtimePast(b.showDate, b.showTime);
    const isCancelled = b.isCancelled || b.status === 'CANCELLED' || b.paymentStatus === 'Cancelled';
    const isRefunded = b.isRefunded || b.status === 'REFUNDED' || b.paymentStatus === 'Refunded';
    return !isCancelled && !isRefunded && Boolean(b.paymentStatus === 'Completed' || b.isActive) && isPast;
  });

  const inactiveBookings = bookings.filter(
    (b) =>
      b.isCancelled ||
      b.isRefunded ||
      b.status === 'CANCELLED' ||
      b.status === 'REFUNDED' ||
      b.paymentStatus === 'Cancelled' ||
      b.paymentStatus === 'Refunded'
  );

  const displayedBookings =
    activeTab === 'active'
      ? activeBookings
      : activeTab === 'expired'
      ? expiredBookings
      : activeTab === 'cancelled'
      ? inactiveBookings
      : bookings;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
      case 'ACTIVE':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
      case 'EXPIRED':
        return 'bg-zinc-800 text-amber-300 border-amber-900/40';
      case 'Pending':
      case 'PENDING':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
      case 'Cancelled':
      case 'CANCELLED':
        return 'bg-red-950/40 text-red-400 border-red-800/40';
      case 'Refunded':
      case 'REFUNDED':
        return 'bg-blue-950/40 text-blue-400 border-blue-800/40';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#222222] mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-3">
              <FontAwesomeIcon icon={faTicketAlt} className="text-[#e50914]" />
              <span>My Ticket Bookings</span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Access your digital admission passes, share confirmed tickets, or review your booking history.
            </p>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-3 py-1.5 rounded-xl font-bold">
              {activeBookings.length} Upcoming Pass{activeBookings.length === 1 ? '' : 'es'}
            </span>
            {expiredBookings.length > 0 && (
              <span className="text-xs bg-zinc-900 text-amber-400/90 border border-amber-900/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                <span>{expiredBookings.length} Expired (Past Date)</span>
              </span>
            )}
            {inactiveBookings.length > 0 && (
              <span className="text-xs bg-red-950/30 text-red-400 border border-red-900/40 px-3 py-1.5 rounded-xl font-bold">
                {inactiveBookings.length} Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-[#141414] p-1.5 rounded-2xl border border-[#222222] w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#e50914] text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-[#e50914] text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Upcoming Passes ({activeBookings.length})</span>
          </button>
          {expiredBookings.length > 0 && (
            <button
              onClick={() => setActiveTab('expired')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'expired'
                  ? 'bg-[#e50914] text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Expired / Past ({expiredBookings.length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cancelled'
                ? 'bg-[#e50914] text-white shadow-lg shadow-red-950/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Cancelled & Refunded ({inactiveBookings.length})</span>
          </button>
        </div>

        {/* Highlight Alert for Recent Checkout */}
        {newBooking && (
          <div className="mb-8 p-5 bg-gradient-to-r from-emerald-950/60 to-[#141414] border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Payment Verified & Ticket Issued!</h3>
                <p className="text-xs text-gray-300">
                  Confirmation sent to {newBooking.userEmail}. Share your ticket details instantly:
                </p>
              </div>
            </div>
            {initialWaLink && (
              <a
                href={initialWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebd5a] text-black font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
                <span>Share to WhatsApp</span>
              </a>
            )}
          </div>
        )}

        {/* Bookings Collection */}
        {loading ? (
          <Loader message="Loading your ticket history..." />
        ) : displayedBookings.length === 0 ? (
          <div className="text-center py-20 bg-[#141414] border border-[#222222] rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
            <FontAwesomeIcon icon={faTicketAlt} className="text-5xl text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-white">
              {activeTab === 'active'
                ? 'No active tickets'
                : activeTab === 'expired'
                ? 'No expired or past-date tickets'
                : activeTab === 'cancelled'
                ? 'No cancelled or refunded tickets'
                : 'No tickets booked yet'}
            </h3>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 mb-6">
              {activeTab === 'active'
                ? 'You do not have any upcoming movie admissions scheduled.'
                : activeTab === 'expired'
                ? 'You have no concluded screening tickets in your archive.'
                : activeTab === 'cancelled'
                ? 'None of your reservations have been cancelled or refunded.'
                : 'Browse now-showing movies, select an auditorium, and book your seats!'}
            </p>
            <Link
              to="/home"
              className="px-6 py-2.5 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-950/40 inline-block"
            >
              Browse Movies Now
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {displayedBookings.map((booking) => {
              const isPast = isShowtimePast(booking.showDate, booking.showTime);
              const isCancelled =
                booking.isCancelled ||
                booking.status === 'CANCELLED' ||
                booking.paymentStatus === 'Cancelled';
              const isRefunded =
                booking.isRefunded ||
                booking.status === 'REFUNDED' ||
                booking.paymentStatus === 'Refunded';
              const isInactive = isCancelled || isRefunded;
              const isExpired = !isInactive && isPast;
              const isUpcoming =
                !isInactive && !isPast && Boolean(booking.paymentStatus === 'Completed' || booking.isActive);
              const isCancellable = isUpcoming;
              // Defensive definition of isActive to ensure full backwards compatibility and prevent ReferenceError
              const isActive = isUpcoming;

              const bookingRef = booking.bookingId || (booking._id ? String(booking._id) : 'N/A');

              return (
                <div
                  key={booking.bookingId || booking._id}
                  className={`border rounded-2xl p-6 transition-all relative overflow-hidden ${
                    isInactive
                      ? 'bg-[#0c0c0c] border-[#222222] opacity-80'
                      : isExpired
                      ? 'bg-[#101010] border-[#252525] opacity-90 shadow-md'
                      : 'bg-[#141414] border-[#262626] hover:border-[#383838] shadow-xl'
                  }`}
                >
                  {/* Expired / Past Date Screening Banner */}
                  {isExpired && (
                    <div className="bg-zinc-900/90 border-b border-zinc-700/60 px-4 py-2 -mx-6 -mt-6 mb-4 flex items-center justify-between text-xs text-gray-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faClock} className="text-amber-400" />
                        <span>SCREENING CONCLUDED — SHOWTIME HAS PASSED</span>
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Concluded on {booking.showDate} @ {booking.showTime}
                      </span>
                    </div>
                  )}

                  {/* Inactive Watermark / Warning Banner */}
                  {isCancelled && (
                    <div className="bg-red-950/50 border-b border-red-900/40 px-4 py-2 -mx-6 -mt-6 mb-4 flex items-center justify-between text-xs text-red-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faTimesCircle} className="text-red-400" />
                        <span>TICKET CANCELLED — VOID FOR ADMISSION</span>
                      </span>
                      {booking.cancelledAt && (
                        <span className="text-[11px] text-gray-400 font-mono">
                          Cancelled on {dayjs(booking.cancelledAt).format('MMM D, YYYY h:mm A')}
                        </span>
                      )}
                    </div>
                  )}

                  {isRefunded && (
                    <div className="bg-blue-950/50 border-b border-blue-900/40 px-4 py-2 -mx-6 -mt-6 mb-4 flex items-center justify-between text-xs text-blue-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faUndo} className="text-blue-400" />
                        <span>PAYMENT REFUNDED — ADMISSION REVOKED</span>
                      </span>
                      {booking.refundedAt && (
                        <span className="text-[11px] text-gray-400 font-mono">
                          Refunded on {dayjs(booking.refundedAt).format('MMM D, YYYY h:mm A')}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left Meta Block */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            isUpcoming
                              ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40'
                              : isExpired
                              ? 'bg-zinc-900 text-amber-300 border-amber-900/40'
                              : isCancelled
                              ? 'bg-red-950/40 text-red-400 border-red-800/40'
                              : isRefunded
                              ? 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                              : getStatusBadge(booking.paymentStatus)
                          }`}
                        >
                          ● {isUpcoming ? 'UPCOMING PASS' : isExpired ? 'EXPIRED (PAST SHOW)' : isCancelled ? 'CANCELLED' : isRefunded ? 'REFUNDED' : booking.paymentStatus}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          Ref: #{bookingRef.slice(0, 10)}
                        </span>
                      </div>

                      <h3
                        className={`text-xl font-black ${
                          isInactive ? 'text-gray-400' : 'text-white'
                        }`}
                      >
                        {booking.movieName || 'Movie Title'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                        <span className="flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faBuilding} className="text-gray-500" />
                          <span>{booking.theatreName || 'Antigravity Cinemas'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500" />
                          <span>{booking.showDate}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                          <span>{booking.showTime}</span>
                        </span>
                      </div>

                      {/* Seat Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs text-gray-400 font-semibold mr-1">
                          {isInactive ? 'Seats (Released):' : 'Seats:'}
                        </span>
                        {(booking.selectedSeats || []).map((seat) => (
                          <span
                            key={seat}
                            className={`text-xs font-black px-2.5 py-0.5 rounded-md border ${
                              isInactive
                                ? 'bg-[#161616] text-gray-500 border-[#262626] line-through'
                                : 'bg-[#1c1c1c] text-[#e50914] border-red-950/50'
                            }`}
                          >
                            {formatSeatDisplay(seat)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right Amount & Actions Dock */}
                    <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-[#222222] gap-4">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-gray-400 font-semibold block">
                          {isRefunded ? 'Refunded Amount' : 'Total Amount'}
                        </span>
                        <span
                          className={`text-2xl font-black ${
                            isInactive ? 'text-gray-400 line-through' : 'text-white'
                          }`}
                        >
                          ₹{booking.totalAmount || 0}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Digital Admission Pass / QR Code Modal Button */}
                        <button
                          onClick={() => setSelectedTicketModal(booking)}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border ${
                            isActive
                              ? 'bg-[#1e1e1e] hover:bg-[#282828] text-white border-[#333]'
                              : 'bg-[#141414] text-gray-400 border-[#222] hover:text-white'
                          }`}
                        >
                          <FontAwesomeIcon icon={faQrcode} className={isActive ? 'text-[#e50914]' : 'text-gray-500'} />
                          <span>{isActive ? 'View Pass' : 'Receipt'}</span>
                        </button>

                        {/* PDF Download Button */}
                        <a
                          href={getTicketPdfUrl(booking.bookingId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-[#1c1c1c] hover:bg-[#282828] border border-[#333] text-gray-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                          title="Download high-resolution PDF pass"
                        >
                          <FontAwesomeIcon icon={faDownload} className="text-[#e50914]" />
                          <span>PDF</span>
                        </a>

                        {/* WhatsApp Share Button: ONLY ACTIVE WHEN TICKET IS CONFIRMED AND NOT EXPIRED */}
                        {isUpcoming ? (
                          <button
                            onClick={() =>
                              shareTicket({
                                movieName: booking.movieName,
                                theatreName: booking.theatreName,
                                showDate: booking.showDate,
                                showTime: booking.showTime,
                                selectedSeats: booking.selectedSeats,
                                totalAmount: booking.totalAmount,
                                bookingId: booking.bookingId
                              })
                            }
                            className="px-3.5 py-2 bg-[#25D366] hover:bg-[#1ebd5a] text-black font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Share ticket to WhatsApp"
                          >
                            <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                            <span>Share</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-2 bg-[#161616] text-gray-600 border border-[#222] font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5 opacity-60"
                            title={isExpired ? 'Showtime has already passed' : 'Cannot share cancelled or refunded ticket'}
                          >
                            <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                            <span>{isExpired ? 'Concluded' : 'Inactive'}</span>
                          </button>
                        )}

                        {/* Printable Ticket View: Disabled if inactive */}
                        {isUpcoming ? (
                          <button
                            onClick={() => window.print()}
                            className="px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#252525] border border-[#333333] text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <FontAwesomeIcon icon={faPrint} />
                            <span>Print</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3.5 py-2 bg-[#141414] border border-[#222] text-gray-600 text-xs font-bold rounded-xl cursor-not-allowed opacity-50 flex items-center gap-1.5"
                            title={isExpired ? 'Print disabled for concluded screenings' : 'Print disabled for void tickets'}
                          >
                            <FontAwesomeIcon icon={faPrint} />
                            <span>{isExpired ? 'Past' : 'Void'}</span>
                          </button>
                        )}

                        {/* Cancellation Button: ONLY FOR ACTIVE UPCOMING TICKETS (REMOVED FOR EXPIRED/PAST TICKETS) */}
                        {isCancellable ? (
                          <button
                            onClick={() => handleCancelBooking(booking.bookingId)}
                            disabled={cancellingId === booking.bookingId}
                            className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Cancel booking and free seats"
                          >
                            <FontAwesomeIcon icon={faBan} />
                            <span>{cancellingId === booking.bookingId ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        ) : isExpired ? (
                          <span
                            className="px-3 py-2 bg-[#181818] border border-[#2a2a2a] text-gray-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 select-none"
                            title="This movie showtime has already passed and cannot be cancelled."
                          >
                            <FontAwesomeIcon icon={faClock} className="text-gray-500 text-[11px]" />
                            <span>Show Ended</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Digital Admission Pass Modal */}
        <TicketPassModal
          booking={selectedTicketModal}
          onClose={() => setSelectedTicketModal(null)}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Bookings;
