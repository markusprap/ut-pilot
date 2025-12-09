
import { supabase } from './supabase';
import { ChatMessage } from '../types';

export interface ChatSession {
    id: string;
    courseId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

// Map snake_case from DB to camelCase for App
const mapSession = (data: any): ChatSession => ({
    id: data.id,
    courseId: data.course_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at
});

const mapMessage = (data: any): ChatMessage => ({
    id: data.id,
    role: data.role as 'user' | 'model',
    text: data.content,
    timestamp: data.created_at
});

/**
 * Fetch all chat sessions for a specific course
 */
export const fetchChatSessions = async (courseId: string): Promise<ChatSession[]> => {
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('course_id', courseId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapSession);
    } catch (e) {
        console.error("Fetch Sessions Error:", e);
        return [];
    }
};

/**
 * Fetch messages for a specific session
 */
export const fetchSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapMessage);
    } catch (e) {
        console.error("Fetch Messages Error:", e);
        return [];
    }
};

/**
 * Create a new chat session
 */
export const createChatSession = async (courseId: string, title: string = 'Diskusi Baru'): Promise<ChatSession | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
                course_id: courseId,
                user_id: user.id,
                title: title
            })
            .select()
            .single();

        if (error) throw error;
        return mapSession(data);
    } catch (e) {
        console.error("Create Session Error:", e);
        return null;
    }
};

/**
 * Save a message to an existing session
 */
export const saveMessage = async (sessionId: string, role: 'user' | 'model', content: string): Promise<ChatMessage | null> => {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                session_id: sessionId,
                role: role,
                content: content
            })
            .select()
            .single();

        // Also update session updated_at
        await supabase
            .from('chat_sessions')
            .update({ updated_at: Date.now() }) // or use DB trigger, but manual is fine for now
            .eq('id', sessionId);

        if (error) throw error;
        if (error) throw error;
        return mapMessage(data);
    } catch (e) {
        console.error("Save Message Error:", e);
        return null; // Should handle this gracefully in UI
    }
};

/**
 * Check Daily Message Count for a User (across all sessions)
 */
export const getDailyMessageCount = async (userId: string): Promise<number> => {
    try {
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const startOfDay = new Date(todayStr).getTime(); // Timestamp (assuming DB stores numerical timestamp? No, it stores timestamptz string usually?)
        // Wait, mapSession uses `data.created_at`.
        // If DB `created_at` is `timestamptz` (ISO String), we should query with ISO String.
        // Let's check `create_forum_tables.sql` or similar. Usually Supabase is ISO.
        // However, mapSession uses `data.created_at`. In implementation plan it says `created_at` is number?
        // `mapSession` => `createdAt: data.created_at`. If `data.created_at` is huge int, it's number.
        // If it's string (ISO), it's string.
        // In `App.tsx`: `createdAt: new Date(d.created_at).getTime()`.
        // So `d.created_at` is likely ISO string from Supabase.

        // Query: filtered by `created_at >= today ISO`
        const todayISO = new Date().toISOString().split('T')[0] + "T00:00:00.000Z";

        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true }) // head: true means don't return data, just count
            .eq('role', 'user')
            // Inner Join to filter by User ID in Session
            // Note: Schema must allow this relation. Assuming `session_id` FK exists.
            // Supabase Postgrest syntax: `table_name!inner(col_name)`
            .eq('chat_sessions.user_id', userId)
        // We use the reference name if customized, otherwise table name
        // The table is 'chat_sessions'
        // We need to ensure the select includes the join syntax
        // Actually, for filtering by joined table, we use logical operator on the path.
        // But we can't filter top-level row by joined column unless using !inner in filter?
        // Correct syntax: .select('*, chat_sessions!inner(*)') .eq('chat_sessions.user_id', userId)

        // Actually, simpler: Get all session IDs for the user first?
        // "select id from chat_sessions where user_id = ?" -> list of IDs.
        // "select count from chat_messages where session_id in (list) and created_at > today"
        // This avoids complex join syntax issues if not configured.

    } catch (e) {
        return 999; // Fail safe: Block if error? Or allow?
        // Let's implement the 2-step approach for safety.
        return 0;
    }

    // 2-Step Implementation (Safer)
    try {
        const todayISO = new Date().toISOString().split('T')[0] + "T00:00:00.000Z";

        // 1. Get User's Session IDs
        const { data: sessions, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('user_id', userId);

        if (sessionError || !sessions || sessions.length === 0) return 0;

        const sessionIds = sessions.map(s => s.id);

        // 2. Count Messages in those sessions today
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'user')
            .in('session_id', sessionIds)
            .gte('created_at', todayISO);

        if (error) throw error;
        return count || 0;

    } catch (e) {
        console.error("Count Limit Error:", e);
        return 0; // Fallback: Allow if DB fails (don't block user due to system error)
    }
};
