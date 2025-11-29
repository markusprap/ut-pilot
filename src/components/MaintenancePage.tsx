import React from 'react';
import { Construction, Clock, ShieldAlert } from 'lucide-react';

const MaintenancePage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-center transition-colors duration-300">
            <div className="max-w-md w-full space-y-8">

                {/* Icon Animation */}
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white dark:bg-slate-900 p-4 rounded-full shadow-xl border border-slate-100 dark:border-slate-800">
                        <Construction className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Sedang Dalam Perbaikan
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                        UT-Pilot sedang menjalani pemeliharaan sistem untuk meningkatkan <span className="font-semibold text-blue-600 dark:text-blue-400">keamanan</span> dan <span className="font-semibold text-blue-600 dark:text-blue-400">performa</span>.
                    </p>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <ShieldAlert className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Security Update</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <Clock className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimasi</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Segera Kembali</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-8">
                    <p className="text-sm text-slate-400 dark:text-slate-600">
                        &copy; {new Date().getFullYear()} UT-Pilot AI Learning Partner
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MaintenancePage;
