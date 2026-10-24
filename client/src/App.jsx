import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Loader from './components/Loader';
import UserProtection from './components/UserProtection';
import AdminProtection from './components/AdminProtection';

// Lazy loading all pages with code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const MovieDetails = lazy(() => import('./pages/MovieDetails'));
const MovieShows = lazy(() => import('./pages/MovieShows'));
const SeatSlug = lazy(() => import('./pages/SeatSlug'));
const Bookings = lazy(() => import('./pages/Bookings'));
const TicketView = lazy(() => import('./pages/TicketView'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Profile = lazy(() => import('./pages/Profile'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Admin protected routes
const Admin = lazy(() => import('./pages/Admin'));
const AddMovie = lazy(() => import('./pages/AddMovie'));
const AddTheatre = lazy(() => import('./pages/AddTheatre'));
const AddShow = lazy(() => import('./pages/AddShow'));
const AddAdmin = lazy(() => import('./pages/AddAdmin'));
const AdminBookings = lazy(() => import('./pages/AdminBookings'));

const App = () => {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <Loader message="Loading iMovies auditorium..." />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/ticket/:bookingId" element={<TicketView />} />
          <Route path="/tickets/:bookingId" element={<TicketView />} />

          {/* User Protected Routes */}
          <Route
            path="/home"
            element={
              <UserProtection>
                <Home />
              </UserProtection>
            }
          />
          <Route
            path="/moviedetails/:movieId"
            element={
              <UserProtection>
                <MovieDetails />
              </UserProtection>
            }
          />
          <Route
            path="/movieshows/:movieId"
            element={
              <UserProtection>
                <MovieShows />
              </UserProtection>
            }
          />
          <Route
            path="/seatslug/:showId"
            element={
              <UserProtection>
                <SeatSlug />
              </UserProtection>
            }
          />
          <Route
            path="/bookings"
            element={
              <UserProtection>
                <Bookings />
              </UserProtection>
            }
          />
          <Route
            path="/favoriteshows"
            element={
              <UserProtection>
                <Favorites />
              </UserProtection>
            }
          />
          <Route
            path="/profile"
            element={
              <UserProtection>
                <Profile />
              </UserProtection>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <AdminProtection>
                <Admin />
              </AdminProtection>
            }
          />
          <Route
            path="/addmovie"
            element={
              <AdminProtection>
                <AddMovie />
              </AdminProtection>
            }
          />
          <Route
            path="/addtheatre"
            element={
              <AdminProtection>
                <AddTheatre />
              </AdminProtection>
            }
          />
          <Route
            path="/addshow"
            element={
              <AdminProtection>
                <AddShow />
              </AdminProtection>
            }
          />
          <Route
            path="/addadmin"
            element={
              <AdminProtection>
                <AddAdmin />
              </AdminProtection>
            }
          />
          <Route
            path="/adminbookings"
            element={
              <AdminProtection>
                <AdminBookings />
              </AdminProtection>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
