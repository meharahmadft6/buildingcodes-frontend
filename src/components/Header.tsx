// src/components/Header.tsx
import React from "react";
import { User, Building } from "lucide-react";
import { useRouter } from "next/router";

const Header: React.FC = () => {
  const router = useRouter();

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-8xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left Section - Logo & Nav */}
        <div className="flex items-center space-x-12">
          {/* Logo + Title */}
          <div
            onClick={() => router.push("/")}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <Building className="h-7 w-7 text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200" />
            <span className="text-2xl font-bold text-gray-800 group-hover:text-indigo-700 transition-colors duration-200">
              Softune Solutions
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button
              className="relative px-5 py-2 font-semibold text-gray-800 
               rounded-full border border-gray-200 
               overflow-hidden transition-all duration-300
               hover:text-white hover:border-transparent
               hover:bg-gradient-to-r hover:from-indigo-600 hover:to-blue-500
               shadow-[0_0_15px_rgba(99,102,241,0.3)]
               hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]"
            >
              Library
            </button>
          </nav>
        </div>

        {/* Right Section - Profile Icon */}
        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors duration-200">
          <User className="h-5 w-5 text-gray-700" />
        </div>
      </div>
    </header>
  );
};

export default Header;
