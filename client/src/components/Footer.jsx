import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faHeart } from '@fortawesome/free-solid-svg-icons';

const Footer = () => {
  return (
    <footer className="bg-[#080808] border-t border-[#1f1f1f] py-10 mt-auto text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-xl font-black text-[#e50914]">
            <FontAwesomeIcon icon={faFilm} />
            <span>iMovies</span>
          </div>

          <p className="text-sm text-center md:text-left text-gray-400">
            Movie ticket booking made simple. Live TMDB integration, Razorpay UPI payments & real-time seat lock.
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Built with</span>
            <FontAwesomeIcon icon={faHeart} className="text-[#e50914] animate-pulse" />
            <span>for Cinema Lovers</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} iMovies Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <span className="hover:text-gray-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-300 cursor-pointer">Help Center</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
