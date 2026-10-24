import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilm,
  faSignOutAlt,
  faTicketAlt,
  faHeart,
  faUser,
  faBars,
  faTimes,
  faChartPie,
  faPlusSquare,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.isAdmin || false;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Signed out successfully.');
    navigate('/landing');
  };

  const userNav = [
    { to: '/home', label: 'Movies', icon: faFilm },
    { to: '/bookings', label: 'My Tickets', icon: faTicketAlt },
    { to: '/favoriteshows', label: 'Watchlist', icon: faHeart },
    { to: '/profile', label: 'Profile', icon: faUser }
  ];

  const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: faChartPie },
    { to: '/addmovie', label: 'Add Movie', icon: faPlusSquare },
    { to: '/addtheatre', label: 'Add Theatre', icon: faBuilding },
    { to: '/addshow', label: 'Add Show', icon: faTicketAlt },
    { to: '/adminbookings', label: 'All Bookings', icon: faFilm }
  ];

  const links = isAdmin ? adminNav : userNav;

  return (
    <header className="sticky top-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-[#222222]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to={isAdmin ? '/admin' : '/home'}
          className="flex items-center gap-2.5 text-2xl font-black tracking-wider text-[#e50914] hover:opacity-90 transition-opacity"
        >
          <FontAwesomeIcon icon={faFilm} className="text-2xl" />
          <span>iMovies</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
          {links.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#e50914] text-white shadow-lg shadow-red-900/30'
                    : 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="text-xs" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Badge & Logout */}
        <div className="hidden md:flex items-center gap-4">
          {user && (
            <div className="text-right">
              <span className="block text-xs text-gray-400 font-medium">
                {isAdmin ? '🛡️ Admin' : '👤 Signed in as'}
              </span>
              <span className="block text-sm font-bold text-white max-w-[120px] truncate">
                {user.username}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold bg-[#1a1a1a] hover:bg-[#e50914] text-gray-200 hover:text-white rounded-lg border border-[#333333] hover:border-[#e50914] transition-all"
            title="Log out"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-300 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden bg-[#141414] border-b border-[#222222] px-4 pt-2 pb-4 space-y-2">
          {links.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#e50914] text-white'
                    : 'text-gray-300 hover:bg-[#202020]'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
            <span className="text-sm text-gray-400 truncate">
              {user ? user.username : ''}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 bg-[#e50914] hover:bg-red-700 text-white rounded font-bold"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
