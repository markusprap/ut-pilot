import { supabase } from './supabase';
import { ForumThread, ForumPost } from '../types';

export const forumService = {
    // Get all threads for a specific course code
    async getThreads(courseCode: string): Promise<ForumThread[]> {
        const { data, error } = await supabase
            .from('forum_threads')
            .select('*, forum_posts(count)') // Get count of replies
            .eq('course_code', courseCode)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching threads:', error);
            return [];
        }

        return data.map((d: any) => ({
            ...d,
            reply_count: d.forum_posts?.[0]?.count || 0
        }));
    },

    // Get single thread with its posts
    async getThreadDetails(threadId: string): Promise<{ thread: ForumThread | null, posts: ForumPost[] }> {
        // 1. Fetch Thread
        const { data: threadData, error: threadError } = await supabase
            .from('forum_threads')
            .select('*')
            .eq('id', threadId)
            .single();

        if (threadError) {
            console.error('Error fetching thread details:', threadError);
            return { thread: null, posts: [] };
        }

        // 2. Fetch Posts
        const { data: postsData, error: postsError } = await supabase
            .from('forum_posts')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (postsError) console.error('Error fetching posts:', postsError);

        return {
            thread: threadData,
            posts: postsData || []
        };
    },

    // Create a new thread
    async createThread(courseCode: string, userId: string, userName: string, title: string, content: string): Promise<ForumThread | null> {
        const { data, error } = await supabase
            .from('forum_threads')
            .insert({
                course_code: courseCode,
                user_id: userId,
                user_name: userName,
                title,
                content
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating thread:', error);
            return null;
        }
        return data;
    },

    // Reply to a thread
    async replyToThread(threadId: string, userId: string, userName: string, content: string): Promise<ForumPost | null> {
        const { data, error } = await supabase
            .from('forum_posts')
            .insert({
                thread_id: threadId,
                user_id: userId,
                user_name: userName,
                content
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating post:', error);
            return null;
        }
        return data;
    }
};
