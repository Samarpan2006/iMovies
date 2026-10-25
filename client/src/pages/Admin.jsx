import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faUsers,
  faFilm,
  faTicketAlt,
  faRupeeSign,
  faUndo,
  faExchangeAlt,
  faTrash,
  faTimes,
  faSearch,
  faEnvelope,
  faCalendarAlt,
  faUser,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { io } from 'socket.io-client';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import api from '../utils/api';
import { formatSeatDisplay } from '../utils/seatHelper';

const Admin = () => {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);

  // Registered Users Modal State
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);

  useEffect(() => {
    loadDashboard();

    // Real-time synchronization via Socket.io
    const rawSocket = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
    const socketUrl = rawSocket.replace(/\/api\/?$/, '').replace(/\/+$/, '') || 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('user-count-updated', (data) => {
      if (data && typeof data.totalUsers === 'number') {
        setStats((prev) => (prev ? { ...prev, totalUsers: data.totalUsers } : prev));
        if (data.deletedUserId) {
          setUsers((prev) => prev.filter((u) => u._id !== data.deletedUserId));
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, txRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/transactions')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }
    } catch (err) {
      toast.error('Unable to fetch admin statistics or transactions.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all registered users from database
   */
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      toast.error('Failed to retrieve registered users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenUsersModal = () => {
    setShowUsersModal(true);
    fetchUsers();
  };

  /**
   * Remove User Account Action:
   * Triggers DELETE /api/admin/users/:userId, removes user from local state,
   * updates the active registered users KPI metric in real-time.
   */
  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${user.username}" (${user.email})? This action will remove their account and credentials from the system.`
      )
    ) {
      return;
    }

    setDeletingUserId(user._id);
    try {
      const res = await api.delete(`/admin/users/${user._id}`);
      if (res.data.success) {
        toast.success(`User "${user.username || user.email}" removed successfully.`);

        // Optimistically update users list
        setUsers((prev) => prev.filter((u) => u._id !== user._id));

        // Update active registered users count in real-time
        if (typeof res.data.totalUsers === 'number') {
          setStats((prev) => (prev ? { ...prev, totalUsers: res.data.totalUsers } : prev));
        } else {
          setStats((prev) =>
            prev ? { ...prev, totalUsers: Math.max(0, (prev.totalUsers || 1) - 1) } : prev
          );
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove user account.');
    } finally {
      setDeletingUserId(null);
    }
  };

  /**
   * Admin Refund Action:
   * Issues refund via Razorpay, updates status to 'Refunded', and releases seats.
   */
  const handleRefund = async (tx) => {
    const targetPaymentId = tx.razorpayPaymentId || tx.bookingId;
    if (!targetPaymentId) {
      toast.error('No valid payment ID or reference on this transaction.');
      return;
    }

    if (
      !window.confirm(
        `Issue a refund of ₹${tx.totalAmount} for Booking ID #${tx.bookingId}? This will automatically free up all reserved seats.`
      )
    ) {
      return;
    }

    setRefundingId(targetPaymentId);
    try {
      const res = await api.post(`/admin/refund/${targetPaymentId}`);
      if (res.data.success) {
        toast.success(`Refund of ₹${tx.totalAmount} successfully processed.`);
        setTransactions((prev) =>
          prev.map((t) =>
            t.bookingId === tx.bookingId ? { ...t, paymentStatus: 'Refunded' } : t
          )
        );
        // Refresh aggregate analytics
        const statsRes = await api.get('/admin/stats');
        if (statsRes.data.success) setStats(statsRes.data.stats);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund processing failed.');
    } finally {
      setRefundingId(null);
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

  // Filtered users for modal search
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u._id && String(u._id).toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="pb-6 border-b border-[#222222] mb-8">
          <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white mt-1 flex items-center gap-3">
            <FontAwesomeIcon icon={faChartLine} className="text-[#e50914]" />
            <span>Admin Analytics & Refund Desk</span>
          </h1>
        </div>

        {loading ? (
          <Loader message="Aggregating platform financial statistics..." />
        ) : (
          <>
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
              <div className="p-6 bg-[#141414] border border-[#222222] rounded-2xl shadow-xl">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-red-950/40 text-[#e50914] flex items-center justify-center">
                    <FontAwesomeIcon icon={faRupeeSign} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  ₹{stats?.totalRevenue || 0}
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                  ● Verified Razorpay transactions
                </p>
              </div>

              <div className="p-6 bg-[#141414] border border-[#222222] rounded-2xl shadow-xl">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Bookings</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-950/40 text-blue-400 flex items-center justify-center">
                    <FontAwesomeIcon icon={faTicketAlt} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalBookings || 0}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {stats?.completedBookings || 0} completed
                </p>
              </div>

              <div className="p-6 bg-[#141414] border border-[#222222] rounded-2xl shadow-xl">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Movies Listed</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-950/40 text-purple-400 flex items-center justify-center">
                    <FontAwesomeIcon icon={faFilm} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalMovies || 0}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  TMDB Live + Local Custom
                </p>
              </div>

              {/* Interactive REGISTERED USERS Card */}
              <div
                onClick={handleOpenUsersModal}
                className="p-6 bg-[#141414] border border-[#222222] hover:border-emerald-500/50 hover:bg-[#171717] rounded-2xl shadow-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] group select-none relative"
                title="Click to view and manage registered users"
              >
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                    Registered Users
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-900/60 transition-colors">
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">
                  {stats?.totalUsers || 0}
                </p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold mt-1">
                  <span>● Verified Accounts</span>
                  <span className="text-xs text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                    Manage →
                  </span>
                </div>
              </div>
            </div>

            {/* Transactions and Refund Management Table */}
            <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222222] gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FontAwesomeIcon icon={faExchangeAlt} className="text-[#e50914]" />
                    <span>Transactions & Refund Management</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live payments processed via Razorpay Test-Mode Gateway
                  </p>
                </div>
                <button
                  onClick={loadDashboard}
                  className="px-3.5 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-white text-xs font-bold rounded-lg border border-[#333333] transition-colors"
                >
                  Refresh Feed
                </button>
              </div>

              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm italic py-8 text-center">
                  No payment transactions recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222222] text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Booking ID</th>
                        <th className="py-3 px-3">Movie & Theatre</th>
                        <th className="py-3 px-3">User Email</th>
                        <th className="py-3 px-3">Seats</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Payment ID</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c]">
                      {transactions.map((tx) => (
                        <tr key={tx.bookingId} className="hover:bg-[#191919] transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-gray-300">
                            #{tx.bookingId ? tx.bookingId.slice(0, 8) : 'N/A'}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-white block truncate max-w-[160px]">
                              {tx.movieName || 'Movie'}
                            </span>
                            <span className="text-[11px] text-gray-400 block truncate max-w-[160px]">
                              {tx.theatreName} ({tx.showDate})
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-gray-300 truncate max-w-[140px]">
                            {tx.userEmail}
                          </td>
                          <td className="py-3.5 px-3 text-gray-300">
                            {(tx.selectedSeats || []).map(formatSeatDisplay).join(', ') || 'N/A'}
                          </td>
                          <td className="py-3.5 px-3 font-black text-white">
                            ₹{tx.totalAmount || 0}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-gray-400">
                            {tx.razorpayPaymentId ? (
                              <span className="text-gray-300">{tx.razorpayPaymentId}</span>
                            ) : (
                              <span className="text-gray-600">Pending / None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(
                                tx.paymentStatus
                              )}`}
                            >
                              ● {tx.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {tx.paymentStatus === 'Completed' ? (
                              <button
                                onClick={() => handleRefund(tx)}
                                disabled={refundingId === (tx.razorpayPaymentId || tx.bookingId)}
                                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ml-auto whitespace-nowrap"
                              >
                                <FontAwesomeIcon icon={faUndo} className="text-[10px]" />
                                <span>
                                  {refundingId === (tx.razorpayPaymentId || tx.bookingId)
                                    ? 'Processing...'
                                    : 'Issue Refund'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-gray-600 text-[11px]">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* REGISTERED USERS MANAGEMENT MODAL */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222222] bg-[#181818] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      Registered Users
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-xs font-bold">
                      {users.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Active user accounts registered in iMovies database
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowUsersModal(false)}
                className="w-8 h-8 rounded-lg bg-[#222222] hover:bg-[#333333] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                title="Close modal"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-[#222222] bg-[#161616]">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs"
                />
                <input
                  type="text"
                  placeholder="Search by username, email, or user ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#0e0e0e] border border-[#282828] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/70 transition-colors"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body / Users Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingUsers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400 text-xs">Loading registered users from database...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#1e1e1e] text-gray-500 flex items-center justify-center mx-auto mb-3">
                    <FontAwesomeIcon icon={faUsers} className="text-xl" />
                  </div>
                  <p className="text-gray-300 font-bold text-sm">
                    {userSearch ? 'No matching users found' : 'No registered users found'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {userSearch
                      ? `No user records matching "${userSearch}"`
                      : 'Newly registered customer accounts will appear here automatically.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222222] text-gray-400 uppercase tracking-wider text-[11px]">
                        <th className="pb-3 px-3">User / Identity</th>
                        <th className="pb-3 px-3">Email Address</th>
                        <th className="pb-3 px-3">Role</th>
                        <th className="pb-3 px-3">Joined On</th>
                        <th className="pb-3 px-3 text-center">Bookings</th>
                        <th className="pb-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      {filteredUsers.map((u) => {
                        const isDeleting = deletingUserId === u._id;
                        const initial = (u.username || u.email || 'U')[0].toUpperCase();

                        return (
                          <tr key={u._id} className="hover:bg-[#191919] transition-colors">
                            {/* User Avatar + Name + ID */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                  {initial}
                                </div>
                                <div>
                                  <span className="font-bold text-white block text-xs">
                                    {u.username || 'Unnamed User'}
                                  </span>
                                  <span
                                    className="font-mono text-[10px] text-gray-500 block truncate max-w-[130px]"
                                    title={u._id}
                                  >
                                    ID: #{u._id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-3">
                              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                                <FontAwesomeIcon
                                  icon={faEnvelope}
                                  className="text-gray-500 text-[10px]"
                                />
                                <span className="truncate max-w-[170px]" title={u.email}>
                                  {u.email}
                                </span>
                              </span>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  u.role === 'admin'
                                    ? 'bg-purple-950/50 text-purple-300 border-purple-800/40'
                                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30'
                                }`}
                              >
                                {u.role === 'admin' ? (
                                  <>
                                    <FontAwesomeIcon icon={faShieldAlt} className="mr-1 text-[9px]" />
                                    Admin
                                  </>
                                ) : (
                                  'User'
                                )}
                              </span>
                            </td>

                            {/* Registration Date */}
                            <td className="py-3.5 px-3 text-gray-400 text-[11px] whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <FontAwesomeIcon
                                  icon={faCalendarAlt}
                                  className="text-gray-600 text-[10px]"
                                />
                                {u.createdAt
                                  ? dayjs(u.createdAt).format('MMM D, YYYY h:mm A')
                                  : 'N/A'}
                              </span>
                            </td>

                            {/* Bookings Count */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-lg bg-[#222222] text-gray-300 font-bold text-[11px] border border-[#2d2d2d]">
                                {u.bookingsCount ?? 0}
                              </span>
                            </td>

                            {/* Action Button: Remove User */}
                            <td className="py-3.5 px-3 text-right">
                              {u.role === 'admin' ? (
                                <span className="text-gray-600 text-[10px] font-semibold italic">
                                  Protected
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={isDeleting}
                                  className="px-2.5 py-1.5 bg-red-950/30 hover:bg-red-900/60 border border-red-800/40 hover:border-red-600 text-red-300 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={`Permanently delete user ${u.username || u.email}`}
                                >
                                  {isDeleting ? (
                                    <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                  )}
                                  <span>{isDeleting ? 'Removing...' : 'Remove User'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#222222] bg-[#161616] flex items-center justify-between text-xs text-gray-400">
              <span>
                Showing <strong className="text-white">{filteredUsers.length}</strong> of{' '}
                <strong className="text-white">{users.length}</strong> registered users
              </span>
              <button
                onClick={() => setShowUsersModal(false)}
                className="px-4 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-bold rounded-lg border border-[#333333] transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Admin;
