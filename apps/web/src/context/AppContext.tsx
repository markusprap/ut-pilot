import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Course, UserProfile, AppMode, ModuleData, ExamHistoryItem } from '../types';
import { saveFileToDB, deleteFileFromDB } from '../services/db';
import { uploadFileToGemini } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';

interface AppContextType {
    // State
    courses: Course[];
    activeCourse: Course | null;
    userProfile: UserProfile | null;
    user: User | null; // Exposed Supabase User
    isDarkMode: boolean;
    mode: AppMode;
    isUploading: boolean;
    error: string | null;
    isAppLoading: boolean;

    // Auth State
    // user: User | null; // Removed duplicate
    sessionLoading: boolean;

    // Actions
    toggleTheme: () => void;
    setMode: (mode: AppMode) => void;
    createProfile: (name: string) => void;
    createCourse: (title: string, code: string, file: File, isPublic?: boolean) => Promise<void>;
    fetchPublicCourses: () => Promise<Course[]>;
    copyCourseFromPublic: (course: Course) => Promise<void>;
    deleteCourse: (id: string) => Promise<void>;
    selectCourse: (course: Course) => void;
    updateCourse: (updatedCourse: Course) => void;
    clearActiveCourse: () => void;
    setError: (error: string | null) => void;
    updateCourseModule: (courseId: string, chapter: number, data: Partial<ModuleData>) => void;
    updateCourseTOC: (courseId: string, toc: { chapter: number; title: string }[]) => void;
    updateUserNotes: (courseId: string, notes: string) => void;
    addExamHistory: (courseId: string, historyItem: ExamHistoryItem) => void;
    signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Theme State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('ut-pilot-theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);

    // User Profile State (Legacy LocalStorage + Supabase Metadata)
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

    // 1. Theme Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('ut-pilot-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ut-pilot-theme', 'light');
        }
    }, [isDarkMode]);

    // 2. Auth Session Check
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                if (session?.user) {
                    // Sync User Profile from Auth Metadata
                    const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Mahasiswa";
                    setUserProfile({ name: name, joinedAt: Date.now() });
                }

                setSessionLoading(false);
            } catch (err) {
                console.error("Auth check failed", err);
                setSessionLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Mahasiswa";
                setUserProfile({ name: name, joinedAt: Date.now() });
                // If moving from Landing to Logged In, go to Home
                setMode(prev => prev === AppMode.LANDING ? AppMode.HOME : prev);
            } else {
                setUserProfile(null);
                setMode(AppMode.LANDING);
            }
        });

        return () => subscription.unsubscribe();
    }, []);


    // 3. Load Courses from Supabase (Sync)
    useEffect(() => {
        if (!user) {
            // Fallback: Load from LocalStorage if not logged in
            const storedCourses = localStorage.getItem('ut-pilot-courses');
            if (storedCourses) {
                try {
                    const parsed = JSON.parse(storedCourses);
                    setCourses(parsed);
                } catch (e) {
                    console.error("Failed to load local courses", e);
                }
            }
            setIsStorageLoaded(true);
            return;
        }

        const fetchCourses = async () => {

            try {
                // 1. Fetch Owned Courses
                const { data: ownedData, error: ownedError } = await supabase
                    .from('courses')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('last_accessed', { ascending: false });

                if (ownedError) throw ownedError;


                // 2. Fetch Enrolled Course IDs (ONLY enrollment data, no JOIN)
                const { data: enrolledData, error: enrolledError } = await supabase
                    .from('course_enrollments')
                    .select('course_id, created_at, last_accessed, modules, exam_history, user_personal_notes')
                    .eq('user_id', user.id);

                if (enrolledError) throw enrolledError;


                // 3. Fetch Parent Courses for Enrollments
                // Using is_public=true filter (proven to work with RLS) then filter by IDs
                let parentCourses: any[] = [];
                if (enrolledData && enrolledData.length > 0) {
                    const courseIds = enrolledData.map(e => e.course_id);


                    // Fetch ALL public courses (this works because fetchPublicCourses uses same approach)
                    const { data: publicData, error: publicError } = await supabase
                        .from('courses')
                        .select('*')
                        .eq('is_public', true);

                    if (publicError) {
                        console.error("[ERROR] Failed to fetch public courses:", publicError);
                    } else {
                        // Filter to only the courses the user is enrolled in
                        parentCourses = (publicData || []).filter(c => courseIds.includes(c.id));

                        if (parentCourses.length === 0 && courseIds.length > 0) {
                        }
                    }
                }

                // 4. Map Owned Courses
                const mappedOwned: Course[] = (ownedData || []).map(d => ({
                    id: d.id,
                    title: d.title,
                    code: d.code,
                    fileUri: d.file_uri,
                    storageUrl: d.storage_url, // NEW: Supabase Storage URL
                    mimeType: d.mime_type,
                    fileName: d.file_name,
                    createdAt: new Date(d.created_at).getTime(),
                    lastAccessed: new Date(d.last_accessed).getTime(),
                    modules: d.modules || {},
                    examHistory: d.exam_history || [],
                    toc: d.toc, // New: Map TOC from DB
                    userPersonalNotes: d.user_personal_notes,
                    isPublic: d.is_public,
                    originalAuthorId: d.original_author_id,
                    authorName: d.author_name,
                    userId: d.user_id
                }));

                // 5. Map Enrolled Courses (Merge Progress with Parent Data)
                const mappedEnrolled: Course[] = (enrolledData || []).map((e: any) => {
                    // Find the parent course from our separate query
                    const parentCourse = parentCourses.find(p => p.id === e.course_id);

                    if (!parentCourse) {
                        return null;
                    }

                    // Deep Merge modules: Parent modules (base) + Enrollment modules (student progress)
                    const mergedModules: Record<number, any> = { ...(parentCourse.modules || {}) };

                    if (e.modules && typeof e.modules === 'object') {
                        Object.keys(e.modules).forEach((key: string) => {
                            const chapterNum = Number(key);
                            mergedModules[chapterNum] = {
                                ...(mergedModules[chapterNum] || {}),
                                ...e.modules[key]
                            };
                        });
                    }

                    return {
                        id: parentCourse.id,
                        title: parentCourse.title,
                        code: parentCourse.code,
                        fileUri: parentCourse.file_uri,
                        storageUrl: parentCourse.storage_url, // NEW: Supabase Storage URL
                        mimeType: parentCourse.mime_type,
                        fileName: parentCourse.file_name,
                        createdAt: new Date(e.created_at).getTime(),
                        lastAccessed: new Date(e.last_accessed).getTime(),
                        modules: mergedModules,
                        toc: parentCourse.toc, // New: Use Parent TOC
                        examHistory: e.exam_history || [],
                        userPersonalNotes: e.user_personal_notes,
                        isPublic: parentCourse.is_public,
                        originalAuthorId: parentCourse.user_id,
                        authorName: parentCourse.author_name,
                        userId: parentCourse.user_id
                    };
                }).filter(Boolean) as Course[];

                // 6. Combine and Sort
                const allCourses = [...mappedOwned, ...mappedEnrolled].sort((a, b) => b.lastAccessed - a.lastAccessed);
                setCourses(allCourses);

            } catch (err: any) {
                console.error("Failed to sync with Supabase:", err);
            } finally {
                setIsStorageLoaded(true);
            }
        };
        fetchCourses();
    }, [user]);

    // 4. Helper to Sync Partial Data to DB (Prevents Overwriting)
    // Refactored to accept 'courseObject' to avoid stale state lookups
    const updateCourseInDB = async (courseId: string, data: any, courseObject?: Course) => {
        if (!user) return;

        try {
            // Determine table based on ownership
            // Prefer the passed object, otherwise look it up (state might be stale)
            const course = courseObject || courses.find(c => c.id === courseId);
            if (!course) {
                console.error("[DB UPDATE] Course not found for ID:", courseId);
                return;
            }

            const isOwner = course.userId === user.id || !course.userId;


            if (isOwner) {
                // Update 'courses' table (Partial Update)
                // We map camelCase to snake_case for DB
                const dbData: any = {};
                if (data.active !== undefined) { /* skip */ }
                if (data.lastAccessed !== undefined) dbData.last_accessed = data.lastAccessed;
                if (data.modules !== undefined) dbData.modules = data.modules;
                if (data.toc !== undefined) dbData.toc = data.toc; // Save TOC to DB
                if (data.userPersonalNotes !== undefined) dbData.user_personal_notes = data.userPersonalNotes;
                if (data.examHistory !== undefined) dbData.exam_history = data.examHistory;

                if (Object.keys(dbData).length > 0) {

                    const { error } = await supabase.from('courses').update(dbData).eq('id', courseId).eq('user_id', user.id);
                    if (error) console.error("Update Course Error:", error);
                }

            } else {
                // I am Student: Update Enrollment Table
                const dbData: any = {};
                if (data.lastAccessed !== undefined) dbData.last_accessed = data.lastAccessed;
                if (data.modules !== undefined) dbData.modules = data.modules;
                if (data.toc !== undefined) dbData.toc = data.toc; // Save TOC as well
                if (data.userPersonalNotes !== undefined) dbData.user_personal_notes = data.userPersonalNotes;
                if (data.examHistory !== undefined) dbData.exam_history = data.examHistory;

                if (Object.keys(dbData).length > 0) {

                    const { error } = await supabase
                        .from('course_enrollments')
                        .update(dbData)
                        .eq('course_id', courseId)
                        .eq('user_id', user.id);
                    if (error) console.error("Update Enrollment Error:", error);
                }
            }
        } catch (e) {
            console.error("Sync Exception:", e);
        }
    };

    // Auto-save Courses to LocalStorage (Always keep local backup)
    useEffect(() => {
        if (isStorageLoaded) {
            localStorage.setItem('ut-pilot-courses', JSON.stringify(courses));
        }
    }, [courses, isStorageLoaded]);

    // --- Actions ---

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const createProfile = (name: string) => {
        const newProfile: UserProfile = { name: name, joinedAt: Date.now() };
        setUserProfile(newProfile);
        localStorage.setItem('ut-pilot-profile', JSON.stringify(newProfile));
        setMode(AppMode.HOME);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setCourses([]); // Clear courses on logout to prevent data leak
        setActiveCourse(null);
        setUserProfile(null); // Clear profile
        setMode(AppMode.LANDING);
    }

    // 5. Community: Fetch Public Courses
    const fetchPublicCourses = async (): Promise<Course[]> => {
        try {
            // Select courses where is_public is true AND user_id is NOT current user
            // Note: The RLS policy allows seeing public courses.
            // We filter out our own courses client side or server side.
            const query = supabase
                .from('courses')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(50); // Limit for safety

            // If logged in, filter out our own
            // If logged in, we usually filter out our own.
            // BUT for testing (since you are the only user), I will comment this out.
            // if (user) {
            //    query.neq('user_id', user.id);
            // }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                return data.map(d => ({
                    id: d.id,
                    title: d.title,
                    code: d.code,
                    fileUri: d.file_uri,
                    mimeType: d.mime_type,
                    fileName: d.file_name,
                    createdAt: new Date(d.created_at).getTime(),
                    lastAccessed: new Date(d.last_accessed).getTime(),
                    modules: d.modules || {},
                    toc: d.toc, // New: Public courses must include TOC
                    examHistory: d.exam_history || [],
                    userPersonalNotes: d.user_personal_notes,
                    isPublic: d.is_public,
                    originalAuthorId: d.original_author_id || d.user_id, // Use Creator ID if not a copy
                    authorName: d.author_name
                }));
            }
            return [];
        } catch (e) {
            console.error("Failed to fetch public courses", e);
            return [];
        }
    };

    // 6. Community: Enroll in Course (Refactored)
    const copyCourseFromPublic = async (course: Course) => {
        if (!user) {
            setError("Anda harus login untuk mengambil modul.");
            return;
        }

        try {
            // Enroll: Link User to Course
            // We do NOT create a new course row. We create an enrollment.

            // 1. Optimistic Update
            // We add the course to the user's list immediately.
            // Since it's an enrollment, we start with empty progress (modules={} relative to student).
            // But we must display the Base Course modules.
            const enrolledCourse: Course = {
                ...course,
                lastAccessed: Date.now(),
                // We keep the original modules for display,
                // but any updates will be merged into enrollment table via syncCourseToDB
                examHistory: [], // Reset history for student
                userId: course.userId // Keep original owner ID
            };

            setCourses(prev => [enrolledCourse, ...prev]);

            // 2. Insert into course_enrollments

            // FIX: Ensure user exists in public.users (if table exists) to satisfy FK
            // This handles cases where the Auth trigger is missing.
            const { error: userSyncError } = await supabase.from('users').upsert({
                id: user.id,
                email: user.email,
                name: userProfile?.name || user.email?.split('@')[0] || 'Mahasiswa',
                avatar_url: userProfile?.avatarUrl || '' // Optional if in schema
            }, { onConflict: 'id' }).select();

            if (userSyncError) {
                // Warning only - table might not exist or verify failed, but we try enrollment anyway
                console.warn("User sync warning (public.users):", userSyncError);
            }

            // 3. Proceed to Enrollment
            const { error: insertError } = await supabase.from('course_enrollments').insert({
                course_id: course.id,
                user_id: user.id,
                created_at: Date.now(),
                last_accessed: Date.now(),
                modules: {}, // Start empty
                exam_history: [],
                user_personal_notes: ''
            });

            if (insertError) {
                // Ignore "Unique Violation" if already enrolled (just in case UI check failed)
                if (insertError.code === '23505') {

                    return;
                }
                console.error("Enrollment Error:", insertError);
                throw new Error(`Gagal mendaftar kelas: ${insertError.message}`);
            }

            // DOUBLE CHECK: Verify persistence
            const { data: verifyData } = await supabase
                .from('course_enrollments')
                .select('course_id')
                .eq('course_id', course.id)
                .eq('user_id', user.id)
                .single();

            if (!verifyData) {
                console.error("Critical: Enrollment inserted but not found.");
                throw new Error("Gagal verifikasi pendaftaran! Cek koneksi.");
            }

        } catch (e: any) {
            console.error("Enrollment Exception:", e);
            setError(e.message || "Gagal mengambil modul.");
            // Revert optimistic update? For now, refresh might be needed if critical fail.
        }
    };

    const createCourse = async (title: string, code: string, file: File, isPublic: boolean = false) => {
        setError(null);
        setIsUploading(true);

        try {
            // 1. Upload to Gemini (Or Check if hash exists? Nah just upload)
            const result = await uploadFileToGemini(file);
            const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

            // 2. Save Physical File to IndexedDB
            await saveFileToDB(newId, file);

            // 3. Create Course Object
            const newCourse: Course = {
                id: newId,
                title: title,
                code: code,
                fileName: file.name,
                fileUri: result.fileUri,
                storageUrl: result.storageUrl, // NEW: Supabase Storage public URL
                mimeType: result.mimeType,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                modules: {},
                examHistory: [],
                isPublic: isPublic,
                authorName: userProfile?.name
            };

            setCourses(prev => [newCourse, ...prev]);

            // 4. Sync to DB if logged in
            if (user) {
                const { error: upsertError } = await supabase.from('courses').upsert({
                    id: newCourse.id,
                    user_id: user.id,
                    title: newCourse.title,
                    code: newCourse.code,
                    file_uri: newCourse.fileUri,
                    storage_url: newCourse.storageUrl, // NEW: Save to database
                    mime_type: newCourse.mimeType,
                    file_name: newCourse.fileName,
                    created_at: newCourse.createdAt,
                    last_accessed: newCourse.lastAccessed,
                    modules: newCourse.modules,
                    exam_history: newCourse.examHistory,
                    user_personal_notes: newCourse.userPersonalNotes,
                    is_public: isPublic,
                    author_name: userProfile?.name
                });

                if (upsertError) {
                    console.error("Supabase Upsert Error:", upsertError);
                    throw new Error(`Gagal menyimpan ke database: ${upsertError.message}`);
                }
            }

        } catch (err: any) {
            console.error(err);
            throw new Error(err.message || "Gagal mengupload file ke Google AI.");
        } finally {
            setIsUploading(false);
        }
    };

    const deleteCourse = async (id: string) => {
        try {
            // Find course to check ownership
            const courseToDelete = courses.find(c => c.id === id);

            // Delete local blob (Always try)
            await deleteFileFromDB(id);

            if (user && courseToDelete) {
                // Check Ownership
                const isOwner = courseToDelete.userId === user.id || !courseToDelete.userId;

                if (isOwner) {
                    // I am Owner: Delete from 'courses' (Cascades to enrollments)
                    await supabase.from('courses').delete().eq('id', id);
                } else {
                    // I am Student: Unenroll (Delete from 'course_enrollments')
                    // Note: We use course_id and user_id to identify specific enrollment
                    const { error } = await supabase
                        .from('course_enrollments')
                        .delete()
                        .eq('course_id', id)
                        .eq('user_id', user.id);

                    if (error) console.error("Unenroll Error:", error);
                }
            }
        } catch (e) {
            console.warn("Could not delete/unenroll from DB", e);
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


        // Sync ONLY 'lastAccessed'
        if (user) updateCourseInDB(course.id, { lastAccessed: updatedCourse.lastAccessed }, updatedCourse);
    };

    const updateCourse = (updatedCourse: Course) => {
        setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
        if (activeCourse?.id === updatedCourse.id) {
            setActiveCourse(updatedCourse);
        }
        // Full update logic replaced by partial
        if (user) updateCourseInDB(updatedCourse.id, { modules: updatedCourse.modules }, updatedCourse);
    };

    const clearActiveCourse = () => {
        setActiveCourse(null);
        setMode(AppMode.HOME);
    };

    // Helper to update specific fields and sync
    const updateCourseField = (courseId: string, updator: (c: Course) => Course, syncDataExtractor?: (c: Course) => any) => {
        setCourses(prevCourses => {
            const newCourses = prevCourses.map(course => {
                if (course.id === courseId) {
                    const updated = updator(course);
                    if (activeCourse?.id === courseId) setActiveCourse(updated);
                    // Sync specified fields or defaults
                    if (user && syncDataExtractor) {
                        // FIX: Pass 'updated' course to ensure updateCourseInDB uses latest state
                        updateCourseInDB(courseId, syncDataExtractor(updated), updated);
                    }
                    return updated;
                }
                return course;
            });
            return newCourses;
        });
    };

    const updateCourseModule = (courseId: string, chapter: number, data: Partial<ModuleData>) => {
        updateCourseField(courseId,
            (course) => {
                const updatedModules = { ...course.modules };
                updatedModules[chapter] = { ...(updatedModules[chapter] || {}), ...data };
                return { ...course, modules: updatedModules };
            },
            (updated) => ({ modules: updated.modules }) // Sync modules
        );
    };

    const updateCourseTOC = (courseId: string, toc: { chapter: number; title: string }[]) => {
        updateCourseField(courseId,
            (course) => ({ ...course, toc: toc }),
            (updated) => ({ toc: updated.toc })
        );
    };

    const updateUserNotes = (courseId: string, notes: string) => {
        updateCourseField(courseId,
            (course) => ({ ...course, userPersonalNotes: notes }),
            (updated) => ({ userPersonalNotes: updated.userPersonalNotes })
        );
    };

    const addExamHistory = (courseId: string, historyItem: ExamHistoryItem) => {
        updateCourseField(courseId,
            (course) => ({
                ...course,
                examHistory: [historyItem, ...course.examHistory]
            }),
            (updated) => ({ examHistory: updated.examHistory })
        );
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
            user,
            sessionLoading,
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
            updateCourseTOC,
            updateUserNotes,
            addExamHistory,
            signOut,
            isAppLoading: !isStorageLoaded,
            fetchPublicCourses, // Exported
            copyCourseFromPublic // Exported
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
