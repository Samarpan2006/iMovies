import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';

export const COUNTRIES = [
  { code: 'ALL', label: 'All Regions', flag: '🌍', languages: [] },
  { code: 'IN', label: 'India', flag: '🇮🇳', languages: ['Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'hi', 'ta', 'te', 'ml', 'kn'] },
  { code: 'US', label: 'United States', flag: '🇺🇸', languages: ['English', 'en'] },
  { code: 'KR', label: 'South Korea', flag: '🇰🇷', languages: ['Korean', 'ko'] },
  { code: 'JP', label: 'Japan', flag: '🇯🇵', languages: ['Japanese', 'ja'] },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧', languages: ['English', 'en'] },
  { code: 'FR', label: 'France', flag: '🇫🇷', languages: ['French', 'fr'] },
  { code: 'ES', label: 'Spain', flag: '🇪🇸', languages: ['Spanish', 'es'] }
];

const LocationFilter = ({ selectedCountry, onCountryChange, className = '' }) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={selectedCountry}
        onChange={(e) => onCountryChange(e.target.value)}
        className="w-full bg-[#0a0a0a] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#e50914] transition-all cursor-pointer shadow-sm"
        aria-label="Filter movies by country / location"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code} className="bg-[#141414] text-white py-1">
            {c.flag} {c.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LocationFilter;
