import React from 'react';
import { AppMode } from '../types';
import { BookOpen, Award } from 'lucide-react';

interface ModeSelectorProps {
  onSelectMode: (mode: AppMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode }) => {
  const modes = [
    {
      id: AppMode.STUDY_SESSION,
      title: "Study Session",
      description: "Pelajari materi per modul dengan Smart Notes dan Latihan Soal.",
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "hover:border-blue-200",
    },
    {
      id: AppMode.EXAM_SIMULATION,
      title: "Exam Simulation",
      description: "Simulasi UAS dengan sampling materi dari seluruh modul.",
      icon: Award,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "hover:border-yellow-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto mt-8 px-4">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelectMode(mode.id)}
          className={`flex flex-col text-left p-6 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${mode.border} group`}
        >
          <div className={`w-12 h-12 ${mode.bg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <mode.icon className={`w-6 h-6 ${mode.color}`} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{mode.title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{mode.description}</p>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;