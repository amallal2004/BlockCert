import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually parse .env to get credentials
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env file!", { supabaseUrl, hasKey: !!supabaseServiceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminAccount(email, password) {
  console.log(`\nChecking administrator account: ${email}...`);
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("❌ Error listing users:", listError);
      return;
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      console.log(`Found existing user with ID: ${existingUser.id}. Resetting password to "${password}" and updating metadata...`);
      const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        user_metadata: { role: 'admin', name: 'University Admin' }
      });
      if (error) {
        console.error("❌ Failed to update admin user:", error.message);
      } else {
        console.log(`✅ Successfully updated admin user ${email}!`);
      }
    } else {
      console.log(`Admin user ${email} not found. Creating a new admin user...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'admin', name: 'University Admin' }
      });
      if (error) {
        console.error("❌ Failed to create admin user:", error.message);
      } else {
        console.log(`✅ Successfully created admin user ${email} with password "${password}"!`);
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

async function run() {
  // Ensure both email variants are provisioned and set to "admin123"
  await fixAdminAccount("admin@admin.com", "admin123");
  await fixAdminAccount("admin@blockcert.edu", "admin123");
  console.log("\nDone!");
  process.exit(0);
}

run();
