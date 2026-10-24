import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faShieldAlt, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Profile = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#141414] border border-[#222222] rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[#222222]">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#e50914] to-red-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-red-950/50">
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold text-[#e50914] uppercase tracking-wider">
                {user.isAdmin ? 'Platform Administrator' : 'Verified Moviegoer'}
              </span>
              <h1 className="text-3xl font-black text-white mt-1">{user.username || 'User'}</h1>
              <p className="text-sm text-gray-400 mt-1">{user.email || 'user@example.com'}</p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <h2 className="text-lg font-bold text-white">Account Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0a0a0a] border border-[#222222] rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-semibold">
                  <FontAwesomeIcon icon={faUser} className="text-[#e50914]" />
                  <span>Username</span>
                </span>
                <p className="text-sm font-bold text-white mt-1">{user.username || 'N/A'}</p>
              </div>

              <div className="p-4 bg-[#0a0a0a] border border-[#222222] rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-semibold">
                  <FontAwesomeIcon icon={faEnvelope} className="text-[#e50914]" />
                  <span>Email Address</span>
                </span>
                <p className="text-sm font-bold text-white mt-1">{user.email || 'N/A'}</p>
              </div>

              <div className="p-4 bg-[#0a0a0a] border border-[#222222] rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-semibold">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-[#e50914]" />
                  <span>Role Authorization</span>
                </span>
                <p className="text-sm font-bold text-white mt-1">
                  {user.isAdmin ? 'Platform Admin (Full Privileges)' : 'Standard User'}
                </p>
              </div>

              <div className="p-4 bg-[#0a0a0a] border border-[#222222] rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-semibold">
                  <FontAwesomeIcon icon={faTicketAlt} className="text-[#e50914]" />
                  <span>Platform Status</span>
                </span>
                <p className="text-sm font-bold text-emerald-400 mt-1">● Active & Synchronized</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
