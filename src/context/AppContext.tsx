import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Course, UserProfile, AppMode, ModuleData, ExamHistoryItem } from '../types';
import { saveFileToDB, deleteFileFromDB } from '../services/db';
import { uploadFileToGemini } from '../services/geminiService';

interface AppContextType {
    // State
    courses: Course[];
    activeCourse: Course | null;
    userProfile: UserProfile | null;
    isDarkMode: boolean;
    mode: AppMode;
    isUploading: boolean;
    error: string | null;
    isAppLoading: boolean;

    // Actions
    toggleTheme: () => void;
    setMode: (mode: AppMode) => void;
    createProfile: (name: string) => void;
    createCourse: (title: string, code: string, file: File) => Promise<void>;
    deleteCourse: (id: string) => Promise<void>;
    selectCourse: (course: Course) => void;
    updateCourse: (updatedCourse: Course) => void;
    clearActiveCourse: () => void;
    setError: (error: string | null) => void;
    updateCourseModule: (courseId: string, chapter: number, data: Partial<ModuleData>) => void;
    updateUserNotes: (courseId: string, notes: string) => void;
    addExamHistory: (courseId: string, historyItem: ExamHistoryItem) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Theme State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('ut-pilot-theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // User Profile State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Course State
    const [courses, setCourses] = useState<Course[]>([]);
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);

    // App State
    const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Effects ---

    // Theme Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('ut-pilot-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ut-pilot-theme', 'light');
        }
    }, [isDarkMode]);

    // Load Data on Mount
    useEffect(() => {
        // Load Profile
        const storedProfile = localStorage.getItem('ut-pilot-profile');
        if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile));
        }

        // Load Courses
        const storedCourses = localStorage.getItem('ut-pilot-courses');
        if (storedCourses) {
            try {
                const parsed = JSON.parse(storedCourses);
                // Migration check: ensure all courses have modules and examHistory
                const migrated = parsed.map((c: any) => ({
                    ...c,
                    modules: c.modules || {},
                    examHistory: c.examHistory || []
                }));
                setCourses(migrated);
            } catch (e) {
                console.error("Failed to load courses", e);
            }
        }
        setIsStorageLoaded(true);
    }, []);

    // Auto-save Courses
    useEffect(() => {
        if (isStorageLoaded) {
            try {
                localStorage.setItem('ut-pilot-courses', JSON.stringify(courses));
            } catch (e) {
                console.error("Failed to save to LocalStorage", e);
            }
        }
    }, [courses, isStorageLoaded]);

    // --- Actions ---

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const createProfile = (name: string) => {
        const newProfile: UserProfile = {
            name: name,
            joinedAt: Date.now()
        };
        setUserProfile(newProfile);
        localStorage.setItem('ut-pilot-profile', JSON.stringify(newProfile));
        setMode(AppMode.HOME);
    };

    const createCourse = async (title: string, code: string, file: File) => {
        setError(null);
        setIsUploading(true);

        try {
            // 1. Upload to Gemini
            const result = await uploadFileToGemini(file);
            const newId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

            // 2. Save Physical File to IndexedDB
            await saveFileToDB(newId, file);

            // 3. Create Course Object
            const newCourse: Course = {
                id: newId,
                title: title,
                code: code,
                fileName: file.name,
                fileUri: result.fileUri,
                mimeType: result.mimeType,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                modules: {},
                examHistory: []
            };

            setCourses(prev => [newCourse, ...prev]);
        } catch (err: any) {
            console.error(err);
            throw new Error(err.message || "Gagal mengupload file ke Google AI.");
        } finally {
            setIsUploading(false);
        }
    };

    const deleteCourse = async (id: string) => {
        try {
            await deleteFileFromDB(id);
        } catch (e) {
            console.warn("Could not delete from DB", e);
        }

        setCourses(prev => prev.filter(c => c.id !== id));
        if (activeCourse?.id === id) {
            setActiveCourse(null);
            setMode(AppMode.HOME);
        }
    };

    const selectCourse = (course: Course) => {
        const updatedCourse = { ...course, lastAccessed: Date.now() };
        setCourses(prev => prev.map(c => c.id === course.id ? updatedCourse : c));
        setActiveCourse(updatedCourse);
        setMode(AppMode.COURSE_DASHBOARD);
    };

    const updateCourse = (updatedCourse: Course) => {
        setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
        if (activeCourse?.id === updatedCourse.id) {
            setActiveCourse(updatedCourse);
        }
    };

    const clearActiveCourse = () => {
        setActiveCourse(null);
        setMode(AppMode.HOME);
    };

    const updateCourseModule = (courseId: string, chapter: number, data: Partial<ModuleData>) => {
        setCourses(prevCourses => {
            const newCourses = prevCourses.map(course => {
                if (course.id === courseId) {
                    const updatedModules = { ...course.modules };
                    updatedModules[chapter] = {
                        ...(updatedModules[chapter] || {}),
                        ...data
                    };
                    const updatedCourse = { ...course, modules: updatedModules };
                    if (activeCourse?.id === courseId) {
                        setActiveCourse(updatedCourse);
                    }
                    return updatedCourse;
                }
                return course;
            });
            return newCourses;
        });
    };

    const updateUserNotes = (courseId: string, notes: string) => {
        setCourses(prevCourses => {
            const newCourses = prevCourses.map(course => {
                if (course.id === courseId) {
                    const updatedCourse = { ...course, userPersonalNotes: notes };
                    if (activeCourse?.id === courseId) {
                        setActiveCourse(updatedCourse);
                    }
                    return updatedCourse;
                }
                return course;
            });
            return newCourses;
        });
    };

    const addExamHistory = (courseId: string, historyItem: ExamHistoryItem) => {
        setCourses(prevCourses => {
            const newCourses = prevCourses.map(course => {
                if (course.id === courseId) {
                    const updatedCourse = {
                        ...course,
                        examHistory: [historyItem, ...course.examHistory]
                    };
                    if (activeCourse?.id === courseId) {
                        setActiveCourse(updatedCourse);
                    }
                    return updatedCourse;
                }
                return course;
            });
            return newCourses;
        });
    };

    return (
        <AppContext.Provider value={{
            courses,
            activeCourse,
            userProfile,
            isDarkMode,
            mode,
            isUploading,
            error,
            toggleTheme,
            setMode,
            createProfile,
            createCourse,
            deleteCourse,
            selectCourse,
            updateCourse,
            clearActiveCourse,
            setError,
            updateCourseModule,
            updateUserNotes,
            addExamHistory,
            isAppLoading: !isStorageLoaded
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
