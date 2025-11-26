
import React from 'react';
import { BrainCircuit, Sun, Moon, UserCircle } from 'lucide-react';

interface HeaderProps {
  resetApp: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ resetApp, isDarkMode, toggleTheme, userName }) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={resetApp}
        >
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">UT-Pilot</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">AI Learning Partner</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block text-xs font-medium px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md border border-yellow-200 dark:border-yellow-800">
            Beta v2.0
          </span>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {userName && (
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Halo, <span className="font-bold text-blue-600 dark:text-blue-400">{userName}</span>
              </span>
              <UserCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;