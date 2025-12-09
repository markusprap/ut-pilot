import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface CustomAlertProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info'
}) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="w-12 h-12 text-green-500" />,
        error: <AlertCircle className="w-12 h-12 text-red-500" />,
        info: <Info className="w-12 h-12 text-blue-500" />
    };

    const colors = {
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    };

    const buttonColors = {
        success: 'bg-green-600 hover:bg-green-700',
        error: 'bg-red-600 hover:bg-red-700',
        info: 'bg-blue-600 hover:bg-blue-700'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                <div className={`p-6 rounded-t-2xl border-b ${colors[type]}`}>
                    <div className="flex items-center gap-4">
                        {icons[type]}
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{message}</p>
                </div>
                <div className="p-6 pt-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className={`px-6 py-2.5 ${buttonColors[type]} text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CustomConfirmProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const CustomConfirm: React.FC<CustomConfirmProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    type = 'warning'
}) => {
    if (!isOpen) return null;

    const icons = {
        danger: <AlertCircle className="w-12 h-12 text-red-500" />,
        warning: <AlertCircle className="w-12 h-12 text-yellow-500" />,
        info: <Info className="w-12 h-12 text-blue-500" />
    };

    const colors = {
        danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    };

    const buttonColors = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        info: 'bg-blue-600 hover:bg-blue-700'
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                <div className={`p-6 rounded-t-2xl border-b ${colors[type]}`}>
                    <div className="flex items-center gap-4">
                        {icons[type]}
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{message}</p>
                </div>
                <div className="p-6 pt-0 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2.5 ${buttonColors[type]} text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
