import React from 'react';
import { NavLink } from 'react-router-dom';
import { Music } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="backdrop-blur-md bg-black/30 fixed w-full z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center space-x-2">
            <Music className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-semibold">KeyScribe</span>
          </NavLink>
          <div className="flex space-x-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'} transition-colors`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'} transition-colors`
              }
            >
              About
            </NavLink>
            <NavLink
              to="/team"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'} transition-colors`
              }
            >
              Team
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}