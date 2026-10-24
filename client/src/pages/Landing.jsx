import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilm,
  faTicketAlt,
  faPlay,
  faShieldAlt,
  faMobileAlt,
  faCheckCircle,
  faStar
} from '@fortawesome/free-solid-svg-icons';

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col selection:bg-[#e50914] selection:text-white">
      {/* Landing Navigation */}
      <nav className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-2xl font-black text-[#e50914]">
            <FontAwesomeIcon icon={faFilm} />
            <span>iMovies</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-bold text-gray-200 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm font-bold text-white bg-[#e50914] hover:bg-red-700 rounded-lg shadow-lg shadow-red-900/30 transition-all transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Visual Section */}
      <header className="relative flex-1 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Cinematic Backdrop Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(229,9,20,0.22),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,58,138,0.15),transparent_40%)]"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] text-[#e50914] text-xs font-bold tracking-wide uppercase mb-6">
            <FontAwesomeIcon icon={faTicketAlt} />
            <span>Next-Gen Cinema Ticketing Experience</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
            Welcome to <span className="text-[#e50914]">iMovies</span>
          </h1>

          <p className="mt-6 text-lg sm:text-2xl font-normal text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Your ultimate destination for the latest blockbusters and timeless classics.
          </p>

          <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
            Real-time seat locking, live TMDB movie streams, Razorpay UPI checkouts, and instant WhatsApp & email digital ticket delivery.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#e50914] hover:bg-red-700 text-white font-black text-base rounded-xl shadow-xl shadow-red-950/50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
            >
              <FontAwesomeIcon icon={faPlay} className="text-sm" />
              <span>Book Tickets Now</span>
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#333333] hover:border-gray-500 text-white font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Shows</span>
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-16 pt-8 border-t border-[#1f1f1f] grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white">100%</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">Live TMDB Data</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-[#e50914]">0 Delay</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">Socket.io Seat Lock</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white">Instant</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">UPI & QR Checkout</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-[#e50914]">1-Click</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">WhatsApp Share</p>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Highlights Grid */}
      <section className="py-20 bg-[#0d0d0d] border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Why moviegoers choose <span className="text-[#e50914]">iMovies</span>
            </h2>
            <p className="mt-3 text-gray-400 text-base">
              A modern full-stack cinema platform engineered for high speed, reliability, and visual delight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#141414] border border-[#222222] hover:border-[#e50914]/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-950/40 text-[#e50914] flex items-center justify-center text-xl mb-6 border border-red-900/30">
                <FontAwesomeIcon icon={faTicketAlt} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Interactive Seat Picker</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Choose precisely from Balcony, Middle, and Lower tiers with real-time seat lock prevention so your seats are guarded while you pay.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#141414] border border-[#222222] hover:border-[#e50914]/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-950/40 text-blue-400 flex items-center justify-center text-xl mb-6 border border-blue-900/30">
                <FontAwesomeIcon icon={faShieldAlt} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Razorpay Test Gateway</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Pay seamlessly with Google Pay, PhonePe, Paytm UPI, Credit/Debit cards, or NetBanking with instant cryptographic HMAC verification.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#141414] border border-[#222222] hover:border-[#e50914]/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center text-xl mb-6 border border-emerald-900/30">
                <FontAwesomeIcon icon={faMobileAlt} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Email & WhatsApp Tickets</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Get an HTML digital ticket confirmation sent straight to your inbox and share your seat reservation with friends via one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Simple */}
      <footer className="py-8 border-t border-[#1a1a1a] text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} iMovies - Movie ticket booking made simple.</p>
      </footer>
    </div>
  );
};

export default Landing;
