import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';

const Header: React.FC<{ resetApp: () => void }> = ({ resetApp }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={resetApp}
        >
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">UT-Pilot</h1>
            <p className="text-xs text-slate-500 font-medium">AI Learning Partner</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-4">
          <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md border border-yellow-200">
            Beta v1.0
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;