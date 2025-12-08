import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/store";
import { useTheme } from "../context/ThemeContext";
import { logout, selectCurrentUser } from "../features/auth/authSlice";

const Navbar: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    // Fixed the dark:bg color here
    <nav className="h-16 w-full z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 backdrop-blur-md sticky top-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
              Grade
              <span className="text-indigo-600 dark:text-indigo-500">
                Master
              </span>
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden md:flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center gap-4 pl-4 border-l border-gray-200 dark:border-gray-800">
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="bg-indigo-100 dark:bg-indigo-500/20 p-1 rounded-full">
                      <User
                        size={16}
                        className="text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                    {user.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <LogOut size={16} />
                    <span>Exit</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/40"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
