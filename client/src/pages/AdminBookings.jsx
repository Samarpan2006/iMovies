import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilm,
  faCalendarAlt,
  faBuilding,
  faUser,
  faTicketAlt
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import { formatSeatDisplay } from '../utils/seatHelper';

const AdminBookings = () => {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/all');
      if (res.data.success) {
        setAllBookings(res.data.bookings || []);
      }
    } catch (err) {
      toast.error('Unable to fetch platform reservations.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40';
      case 'Pending':
        return 'bg-amber-950/50 text-amber-400 border-amber-800/40';
      case 'Cancelled':
        return 'bg-red-950/50 text-red-400 border-red-800/40';
      case 'Refunded':
        return 'bg-blue-950/50 text-blue-400 border-blue-800/40';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="pb-6 border-b border-[#222222] mb-8">
          <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
            Auditorium Moderation
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white mt-1 flex items-center gap-3">
            <FontAwesomeIcon icon={faTicketAlt} className="text-[#e50914]" />
            <span>All Platform Reservations</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Global view of all booked cinema seats, customer identities, and show allocations.
          </p>
        </div>

        {loading ? (
          <Loader message="Loading platform bookings register..." />
        ) : allBookings.length === 0 ? (
          <div className="text-center py-20 bg-[#141414] border border-[#222222] rounded-2xl p-8">
            <p className="text-gray-400 text-sm">No reservations exist on the system currently.</p>
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6 shadow-2xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Booking ID</th>
                  <th className="py-3 px-3">Movie</th>
                  <th className="py-3 px-3">Auditorium & Showtime</th>
                  <th className="py-3 px-3">User Email</th>
                  <th className="py-3 px-3">Seats</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c1c]">
                {allBookings.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-[#191919] transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-gray-300">
                      #{b.bookingId?.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white max-w-[160px] truncate">
                      {b.movieName || 'Movie'}
                    </td>
                    <td className="py-3.5 px-3 text-gray-300">
                      {b.theatreName} <span className="text-gray-500">({b.showDate} @ {b.showTime})</span>
                    </td>
                    <td className="py-3.5 px-3 text-gray-300">
                      {b.userEmail}
                    </td>
                    <td className="py-3.5 px-3">
                      {(b.selectedSeats || []).map((s) => (
                        <span
                          key={s}
                          className="inline-block px-1.5 py-0.5 bg-[#202020] text-gray-200 border border-[#303030] rounded mr-1 text-[11px]"
                        >
                          {formatSeatDisplay(s)}
                        </span>
                      ))}
                    </td>
                    <td className="py-3.5 px-3 font-black text-white">
                      ₹{b.totalAmount || 0}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(
                          b.paymentStatus
                        )}`}
                      >
                        ● {b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminBookings;
