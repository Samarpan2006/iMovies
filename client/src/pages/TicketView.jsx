import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicketAlt,
  faCalendarAlt,
  faClock,
  faBuilding,
  faQrcode,
  faDownload,
  faPrint,
  faCheckCircle,
  faTimesCircle,
  faUndo,
  faArrowLeft,
  faShareAlt
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import {
  generateWhatsAppMessage,
  getTicketPdfUrl,
  shareTicket
} from '../utils/whatsappHelper';
import { formatSeatDisplay } from '../utils/seatHelper';
import { isShowtimePast } from '../utils/timeHelper';

const TicketView = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTicketPass();
  }, [bookingId]);

  const fetchTicketPass = async () => {
    setLoading(true);
    setError(null);
    try {
      // First try the public pass route (works for both guests, ushers and logged-in users)
      const res = await api.get(`/bookings/pass/${bookingId}`).catch(() => {
        // Fallback to standard booking route if pass endpoint fails
        return api.get(`/bookings/${bookingId}`);
      });

      if (res?.data?.success && res.data.booking) {
        setBooking(res.data.booking);
      } else {
        setError('Movie ticket could not be found or has expired.');
      }
    } catch (err) {
      console.error('Error fetching ticket pass:', err);
      setError(err.response?.data?.message || 'Unable to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!booking) return;
    try {
      await shareTicket({
        movieName: booking.movieName,
        theatreName: booking.theatreName,
        showDate: booking.showDate,
        showTime: booking.showTime,
        selectedSeats: (booking.selectedSeats || []).map(formatSeatDisplay),
        totalAmount: booking.totalAmount,
        bookingId: booking.bookingId
      });
    } catch (err) {
      const waUrl = generateWhatsAppMessage(booking);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadPdf = () => {
    if (!booking) return;
    const pdfUrl = getTicketPdfUrl(booking.bookingId);
    // Trigger download in new tab / browser handler
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading cinema admission pass..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
        <Header />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-red-950/40 text-red-500 flex items-center justify-center text-3xl mb-4 border border-red-900/50">
            <FontAwesomeIcon icon={faTimesCircle} />
          </div>
          <h2 className="text-2xl font-black mb-2">Ticket Not Available</h2>
          <p className="text-gray-400 text-sm mb-6">{error || 'Invalid booking identifier.'}</p>
          <Link
            to="/home"
            className="px-6 py-2.5 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg"
          >
            Explore Movies
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isPast = isShowtimePast(booking.showDate, booking.showTime);
  const isCancelled =
    booking.isCancelled ||
    booking.status === 'CANCELLED' ||
    booking.paymentStatus === 'Cancelled';
  const isRefunded =
    booking.isRefunded ||
    booking.status === 'REFUNDED' ||
    booking.paymentStatus === 'Refunded';
  const isExpired = !isCancelled && !isRefunded && isPast;
  const isActive = !isCancelled && !isRefunded && !isPast && (booking.paymentStatus === 'Completed' || booking.isActive);

  const qrValue = encodeURIComponent(
    `iMovies-Pass:${booking.bookingId}:${booking.showId}:${(booking.selectedSeats || []).join(',')}`
  );
  const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrValue}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to My Bookings</span>
          </Link>

          <span className="text-xs font-mono text-gray-500">
            PASS #{booking.bookingId?.slice(0, 12)}
          </span>
        </div>

        {/* Admission Ticket Boarding Pass Card */}
        <div className="bg-[#141414] border border-[#2c2c2c] rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Top Brand Ribbon */}
          <div className="bg-gradient-to-r from-[#e50914] via-[#b20710] to-[#80050b] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
                <FontAwesomeIcon icon={faTicketAlt} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">iMovies Cinema Pass</h2>
                <p className="text-xs text-white/80 font-medium">Digital Multiplex Admission Ticket</p>
              </div>
            </div>

            {/* Status Pill */}
            <div>
              {isActive ? (
                <div className="inline-flex items-center gap-2 bg-emerald-950/80 text-emerald-300 border border-emerald-400/50 px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>CONFIRMED ENTRY PASS</span>
                </div>
              ) : isExpired ? (
                <div className="inline-flex items-center gap-2 bg-zinc-900/90 text-amber-300 border border-amber-500/50 px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                  <FontAwesomeIcon icon={faClock} />
                  <span>EXPIRED • SHOW CONCLUDED</span>
                </div>
              ) : isCancelled ? (
                <div className="inline-flex items-center gap-2 bg-red-950/90 text-red-300 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                  <FontAwesomeIcon icon={faTimesCircle} />
                  <span>CANCELLED • ENTRY VOID</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-blue-950/90 text-blue-300 border border-blue-500/50 px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                  <FontAwesomeIcon icon={faUndo} />
                  <span>REFUNDED • PASS REVOKED</span>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Body: Two-column Layout on Desktop */}
          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Column: Movie & Showtime Details */}
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="text-[11px] font-bold text-[#e50914] uppercase tracking-wider block mb-1">
                  Movie Presentation
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  {booking.movieName}
                </h1>
              </div>

              {/* Auditorium & Showtime Grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#0d0d0d] border border-[#222222] p-4 rounded-2xl">
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold block mb-1">
                    <FontAwesomeIcon icon={faBuilding} className="mr-1 text-gray-400" /> Theatre
                  </span>
                  <p className="text-sm font-bold text-white line-clamp-1">{booking.theatreName}</p>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold block mb-1">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-1 text-gray-400" /> Date
                  </span>
                  <p className="text-sm font-bold text-white">{booking.showDate}</p>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold block mb-1">
                    <FontAwesomeIcon icon={faClock} className="mr-1 text-gray-400" /> Showtime
                  </span>
                  <p className="text-sm font-bold text-white">{booking.showTime}</p>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold block mb-1">Total Paid</span>
                  <p className="text-sm font-black text-[#e50914]">₹{booking.totalAmount || 0}</p>
                </div>
              </div>

              {/* Reserved Seats List */}
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-2">
                  {isActive ? 'Reserved Seats:' : 'Allocated Seats (Released):'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(booking.selectedSeats || []).map((seat) => (
                    <span
                      key={seat}
                      className={`text-sm font-black px-3 py-1 rounded-xl border ${
                        isActive
                          ? 'bg-[#1c1c1c] text-[#e50914] border-red-900/60 shadow-md'
                          : 'bg-[#121212] text-gray-500 border-[#222] line-through'
                      }`}
                    >
                      {formatSeatDisplay(seat)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Security Reference & Instructions */}
              <div className="text-[11px] text-gray-400 space-y-1 pt-2 border-t border-[#222]">
                <p>
                  <strong className="text-gray-300">Booking Reference:</strong> #{booking.bookingId}
                </p>
                <p>
                  Please present this pass or scanned QR code at the cinema entry gate 15 minutes before showtime.
                </p>
              </div>
            </div>

            {/* Right Column: High-Res QR Code or Invalidation Seal */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-[#0c0c0c] border border-[#222222] rounded-3xl text-center">
              {isActive ? (
                <>
                  <div className="bg-white p-4 rounded-2xl shadow-2xl mb-4 max-w-[220px] w-full aspect-square flex items-center justify-center">
                    <img
                      src={qrCodeSrc}
                      alt="Cinema Admission QR Pass"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                    <FontAwesomeIcon icon={faQrcode} />
                    <span>Scan at Multiplex Entrance</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    High-security encrypted QR code for contactless admission
                  </p>
                </>
              ) : (
                <div className="py-6 px-4">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 border ${
                    isExpired
                      ? 'bg-zinc-900 text-amber-400 border-amber-900/50'
                      : 'bg-red-950/40 text-red-500 border-red-900/50'
                  }`}>
                    <FontAwesomeIcon icon={isExpired ? faClock : faTimesCircle} />
                  </div>
                  <h3 className={`text-lg font-black mb-2 ${isExpired ? 'text-amber-300' : 'text-red-400'}`}>
                    {isExpired ? 'Pass Expired' : 'QR Code Deactivated'}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {isExpired
                      ? `This screening concluded on ${booking.showDate} at ${booking.showTime}. The digital admission pass has expired.`
                      : isCancelled
                      ? 'This ticket was cancelled by the user. The associated barcode is revoked and will be rejected at the gate.'
                      : 'This ticket was refunded by administration. The digital pass is void for entry.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Toolbar: WhatsApp, PDF Download, and Print */}
          <div className="p-6 bg-[#0d0d0d] border-t border-[#222222] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* WhatsApp Share Button */}
              {isActive ? (
                <button
                  onClick={handleShareWhatsApp}
                  className="px-5 py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-black font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                  <span>Share to WhatsApp</span>
                </button>
              ) : (
                <button
                  disabled
                  className="px-5 py-3 bg-[#161616] text-gray-600 border border-[#262626] font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-2 opacity-60"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                  <span>Cannot Share Inactive Pass</span>
                </button>
              )}

              {/* Download PDF Pass */}
              <button
                onClick={handleDownloadPdf}
                className="px-5 py-3 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <FontAwesomeIcon icon={faDownload} />
                <span>Download PDF Pass</span>
              </button>

              {/* Print Ticket */}
              {isActive && (
                <button
                  onClick={() => window.print()}
                  className="px-4 py-3 bg-[#1e1e1e] hover:bg-[#282828] border border-[#333333] text-gray-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faPrint} />
                  <span>Print Pass</span>
                </button>
              )}
            </div>

            <Link
              to="/home"
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
            >
              Browse More Movies &rarr;
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TicketView;
