import React from 'react';

const AuthNav = () => {
  return (
    <nav className="bg-white shadow fixed top-0 left-0 right-0 z-50 h-16 flex items-center">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 w-full flex justify-between items-center">
        <div className="text-2xl font-bold text-indigo-700">
          <a href="/">MindSight AI</a>
        </div>
      </div>
    </nav>
  );
};

export default AuthNav;
