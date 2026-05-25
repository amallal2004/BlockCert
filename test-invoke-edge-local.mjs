import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Invoking create-student-user on remote project:", supabaseUrl);
  try {
    const { data, error } = await supabase.functions.invoke('create-student-user', {
      body: {
        email: "test_student_abc@blockcert.edu",
        password: "testpassword123",
        name: "Test Student ABC",
        rollNumber: "TEST12345",
        role: "student"
      },
      headers: {
        // Overriding the default Authorization header to prevent sending the non-JWT publishable key
        Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (error) {
      console.error("❌ Invocation failed:", error);
      if (error instanceof Error) {
        console.error("Error Stack:", error.stack);
      }
    } else {
      console.log("✅ Invocation succeeded:", data);
    }
  } catch (err) {
    console.error("❌ Exception during invocation:", err);
  }
}

run();
