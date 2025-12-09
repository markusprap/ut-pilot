
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Reuse env vars from server config (loaded first) check env
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Middleware Auth: Supabase Credentials Missing.");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export interface AuthenticatedRequest extends Request {
    user?: any;
}

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: "Authentication Required. Missing Authorization Header." });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: "Authentication Required. Invalid Token Format." });
        }

        // Verify Token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.warn("Auth Failed:", error?.message);
            return res.status(401).json({ error: "Invalid or Expired Token." });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(500).json({ error: "Internal Auth Error" });
    }
};
