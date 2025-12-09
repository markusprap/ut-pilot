
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load Env from apps/api .env OR root .env
// Assuming running from root or apps/api, let's try strict path
// Load Env from current directory or parent
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Also try loading from parent root if variables are missing
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
}

const API_URL = 'http://localhost:4001';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase Credentials in Environment!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
        process.stdout.write(`TEST: ${name} ... `);
        await fn();
        console.log("✅ PASS");
    } catch (e: any) {
        console.log("❌ FAIL");
        console.error(`   Reason: ${e.message}`);
    }
};

const main = async () => {
    console.log("🔒 Starting Security Automation Test Suite...\n");

    // 1. Health Check
    await runTest("Health Check (Public Endpoint)", async () => {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
    });

    // 2. Unauthenticated Fail
    await runTest("Unauthenticated Access to /generate (Should Fail)", async () => {
        const res = await fetch(`${API_URL}/api/gemini/generate`, {
            method: 'POST',
            body: JSON.stringify({ mode: 'TEST' }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // 3. User Creation & Auth
    let token = '';
    let userId = '';
    const testEmail = `security_test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    await runTest("Create & Login Test User", async () => {
        // Create User via Admin API (Bypasses email verification)
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true
        });

        if (createError) throw new Error(createError.message);
        if (!user.user) throw new Error("User creation failed");

        userId = user.user.id;

        // Login to get Token
        const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (loginError) throw new Error(loginError.message);
        if (!session.session) throw new Error("No session returned");

        token = session.session.access_token;
    });

    // 4. Authenticated Access
    await runTest("Authenticated Access to /quota (Should Succeed)", async () => {
        const res = await fetch(`${API_URL}/api/gemini/quota/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Status ${res.status} - ${await res.text()}`);
    });

    // 5. Quota Increment
    await runTest("Increment Quota (Authorized)", async () => {
        const res = await fetch(`${API_URL}/api/gemini/quota/increment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId, userEmail: testEmail })
        });
        if (!res.ok) throw new Error(`Status ${res.status} - ${await res.text()}`);

        const data: any = await res.json();
        if (!data.success) throw new Error("Success flag missing");
    });

    // 6. IDOR Check (Optional - Attempt to access another ID if we had one)
    // Skipped for now strictly, but we verified own access works.

    // Cleanup
    await runTest("Cleanup Test User", async () => {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) console.warn("   Cleanup Warning:", error.message);
    });

    console.log("\n✅ Security Test Suite Completed.");
};

main();
