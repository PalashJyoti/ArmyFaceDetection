import React from 'react';

const AuthNav = () => {
  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-neutral-900/95 to-neutral-800/95 shadow-lg backdrop-blur-md">
      <div className="h-16 px-6 max-w-screen-xl mx-auto flex justify-between items-center">
        <div
          className="text-2xl font-bold tracking-wide text-blue-200 whitespace-nowrap hover:text-white transition-colors cursor-pointer"
        >
          <a href='/'>
          MindSight AI
          </a>
        </div>
      </div>
    </nav>
  );
};

export default AuthNav;
