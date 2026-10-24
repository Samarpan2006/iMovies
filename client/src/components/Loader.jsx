import React from 'react';

const Loader = ({ message = 'Loading cinema experience...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] p-8">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-[#222222] rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-400 tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default Loader;
