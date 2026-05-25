import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// Manually parse .env to get credentials
function getEnvCredentials() {
  if (!fs.existsSync('.env')) {
    console.error("❌ .env file not found!");
    return null;
  }
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
  return env;
}

// 1. Update Contract Address in codebase
function updateContractAddress(newAddress) {
  const cleanAddress = newAddress.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    console.error("❌ Invalid Ethereum contract address format!");
    return false;
  }

  console.log(`\nUpdating contract address to: ${cleanAddress}...`);

  // Target 1: src/lib/ethereum.ts
  const ethPath = 'src/lib/ethereum.ts';
  if (fs.existsSync(ethPath)) {
    let content = fs.readFileSync(ethPath, 'utf-8');
    content = content.replace(
      /const CONTRACT_ADDRESS\s*=\s*["'][^"']+["']/g,
      `const CONTRACT_ADDRESS = "${cleanAddress}"`
    );
    fs.writeFileSync(ethPath, content, 'utf-8');
    console.log(`✅ Updated ${ethPath}`);
  } else {
    console.warn(`⚠️ Warning: ${ethPath} not found!`);
  }

  // Target 2: supabase/functions/verify-certificate-record/index.ts
  const funcPath = 'supabase/functions/verify-certificate-record/index.ts';
  if (fs.existsSync(funcPath)) {
    let content = fs.readFileSync(funcPath, 'utf-8');
    content = content.replace(
      /const CONTRACT_ADDRESS\s*=\s*["'][^"']+["']/g,
      `const CONTRACT_ADDRESS = "${cleanAddress}"`
    );
    fs.writeFileSync(funcPath, content, 'utf-8');
    console.log(`✅ Updated ${funcPath}`);
  } else {
    console.warn(`⚠️ Warning: ${funcPath} not found!`);
  }

  return true;
}

// 2. Clear Supabase Data
async function resetSupabaseData() {
  const env = getEnvCredentials();
  if (!env) return;

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes("PASTE_YOUR_NEW_SERVICE_ROLE_KEY_HERE")) {
    console.error("❌ Missing or invalid SUPABASE_SERVICE_ROLE_KEY in .env file! Please paste your service role key first.");
    return;
  }

  console.log("\nConnecting to Supabase using administrator privilege...");
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // A. Delete Student Records
    console.log("Cleaning student_records table...");
    const { error: srErr } = await supabase
      .from('student_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (srErr) console.error("❌ Error deleting student records:", srErr.message);
    else console.log("✅ Student records table cleared.");

    // B. Reset Departments
    console.log("Resetting departments table...");
    const { error: deptDeleteErr } = await supabase
      .from('departments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deptDeleteErr) {
      console.error("❌ Error clearing departments:", deptDeleteErr.message);
    } else {
      const defaultDepartments = [
        { name: 'Computer Science' },
        { name: 'Electronics' },
        { name: 'Mechanical' },
        { name: 'Civil' },
        { name: 'Electrical' },
        { name: 'Information Technology' },
        { name: 'Chemical' },
        { name: 'Biotechnology' }
      ];
      const { error: deptInsertErr } = await supabase.from('departments').insert(defaultDepartments);
      if (deptInsertErr) console.error("❌ Error re-seeding default departments:", deptInsertErr.message);
      else console.log("✅ Departments table reset and re-seeded with defaults.");
    }

    // C. Reset App Users (Truncate and re-seed only the admin user)
    console.log("Resetting app_users table...");
    const { error: appUserDeleteErr } = await supabase
      .from('app_users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (appUserDeleteErr) {
      console.error("❌ Error clearing app_users:", appUserDeleteErr.message);
    } else {
      const defaultAdmin = {
        username: 'admin',
        password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // SHA256 of admin123
        role: 'admin',
        name: 'University Admin'
      };
      const { error: appUserInsertErr } = await supabase.from('app_users').insert([defaultAdmin]);
      if (appUserInsertErr) console.error("❌ Error re-seeding default admin in app_users:", appUserInsertErr.message);
      else console.log("✅ App users reset. Default admin re-seeded.");
    }

    // D. Clear storage buckets (certificates & photos)
    const buckets = ['certificates', 'photos'];
    for (const bucket of buckets) {
      console.log(`Clearing storage bucket: ${bucket}...`);
      const { data: files, error: listErr } = await supabase.storage.from(bucket).list();
      if (listErr) {
        console.error(`❌ Error listing files in bucket ${bucket}:`, listErr.message);
        continue;
      }

      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        const { error: removeErr } = await supabase.storage.from(bucket).remove(filePaths);
        if (removeErr) console.error(`❌ Error clearing files from ${bucket}:`, removeErr.message);
        else console.log(`✅ Cleared ${files.length} files from storage bucket "${bucket}".`);
      } else {
        console.log(`Bucket "${bucket}" is already empty.`);
      }
    }

    // E. Clear all Supabase Auth users EXCEPT the administrators
    console.log("Cleaning Supabase Auth users...");
    const { data: { users }, error: listUsersErr } = await supabase.auth.admin.listUsers();
    if (listUsersErr) {
      console.error("❌ Error listing auth users:", listUsersErr.message);
    } else {
      let deletedCount = 0;
      for (const u of users) {
        const email = u.email?.toLowerCase();
        if (email !== 'admin@admin.com' && email !== 'admin@blockcert.edu') {
          const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
          if (delErr) console.error(`❌ Failed to delete auth user ${email}:`, delErr.message);
          else deletedCount++;
        }
      }
      console.log(`✅ Deleted ${deletedCount} student accounts from Supabase Auth (kept admin accounts).`);
    }

    console.log("\n🎉 Database & Storage Reset Completed Successfully!");
  } catch (err) {
    console.error("❌ Unexpected database error:", err);
  }
}

async function run() {
  console.log("==================================================");
  console.log("        BLOCKCERT PROJECT RESET UTILITY           ");
  console.log("==================================================");

  // 1. Prompt for Ethereum Smart Contract
  const contractInput = await askQuestion("Enter your new Smart Contract address (or press enter to skip): ");
  if (contractInput.trim().length > 0) {
    updateContractAddress(contractInput);
  } else {
    console.log("Skipping contract address update.");
  }

  // 2. Prompt for Data Reset
  const resetInput = await askQuestion("\nWould you like to delete all database and storage data related to old university details to start fresh? (y/n): ");
  if (['y', 'yes'].includes(resetInput.trim().toLowerCase())) {
    await resetSupabaseData();
  } else {
    console.log("Skipping data reset.");
  }

  // 3. Prompt for Database Migrations Push
  const pushDbInput = await askQuestion("\nWould you like to push database migrations to align your remote database schema? (y/n): ");
  if (['y', 'yes'].includes(pushDbInput.trim().toLowerCase())) {
    const env = getEnvCredentials() || {};
    const projectId = env.VITE_SUPABASE_PROJECT_ID || "uqatkxmadedgfbobyrju";
    const dbPassword = await askQuestion("Enter your Supabase database password: ");
    if (dbPassword.trim().length > 0) {
      console.log(`\n🚀 Pushing database migrations to project "${projectId}" using direct DB connection...`);
      try {
        const dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword.trim())}@db.${projectId}.supabase.co:5432/postgres`;
        execSync(`npx supabase db push --db-url "${dbUrl}" --yes`, { stdio: 'inherit' });
        console.log("✅ Database migrations successfully applied!");
      } catch (e) {
        console.error("\n❌ Database migration push failed.");
        console.error("👉 Make sure your database password is correct and your database is online.");
      }
    } else {
      console.log("Skipping database migration push (password was empty).");
    }
  } else {
    console.log("Skipping database migration push.");
  }

  // 4. Prompt for Supabase Edge Function Deployment
  console.log("\n==================================================");
  console.log("       SUPABASE EDGE FUNCTION DEPLOYMENT          ");
  console.log("==================================================");
  console.log("1. Deploy ONLY the verification Edge Function (Choose if you only changed the blockchain contract)");
  console.log("2. Full Initial Setup (Link project, deploy all 5 functions, and set UNIVERSITY_SALT secret)");
  console.log("3. Skip deployment");

  const deployOption = await askQuestion("\nSelect an option (1/2/3): ");

  if (deployOption.trim() === '1') {
    const env = getEnvCredentials() || {};
    const projectId = env.VITE_SUPABASE_PROJECT_ID || "uqatkxmadedgfbobyrju";
    
    // Check if linked project is outdated or missing
    let cachedRef = "";
    if (fs.existsSync("supabase/.temp/project-ref")) {
      cachedRef = fs.readFileSync("supabase/.temp/project-ref", "utf-8").trim();
    }
    
    if (cachedRef !== projectId) {
      console.log(`\n⚠️ Warning: Local CLI is linked to project "${cachedRef || 'NONE'}", but your active project in .env is "${projectId}".`);
      console.log(`🔗 Automatically linking local project to active project: ${projectId}...`);
      try {
        execSync(`npx supabase link --project-ref ${projectId} --yes`, { stdio: 'inherit' });
      } catch (e) {
        console.warn("⚠️ Automatic link completed with warnings. Proceeding with explicit deployment flags...");
      }
    }

    console.log(`\n🚀 Deploying verify-certificate-record Edge Function to Supabase project "${projectId}"...`);
    try {
      execSync(`npx supabase functions deploy verify-certificate-record --project-ref ${projectId}`, { stdio: 'inherit' });
      console.log("✅ Verification Edge Function successfully deployed!");
    } catch (e) {
      console.error("\n❌ Edge Function deployment failed.");
      console.error("👉 Make sure your Supabase CLI is logged in with the correct account. Try running: npx supabase login");
    }
  } else if (deployOption.trim() === '2') {
    const env = getEnvCredentials() || {};
    const projectId = env.VITE_SUPABASE_PROJECT_ID || "uqatkxmadedgfbobyrju";
    const salt = env.UNIVERSITY_SALT || "amal123";

    console.log(`\n🔗 Linking local project to Supabase project ID: ${projectId}...`);
    try {
      execSync(`npx supabase link --project-ref ${projectId} --yes`, { stdio: 'inherit' });
    } catch (e) {
      console.warn("⚠️ Link completed with warnings. Proceeding with explicit deployment flags...");
    }

    try {
      console.log(`\n🚀 Deploying all five Edge Functions to project "${projectId}"...`);
      execSync(`npx supabase functions deploy verify-certificate-record --project-ref ${projectId}`, { stdio: 'inherit' });
      execSync(`npx supabase functions deploy create-student-user --project-ref ${projectId}`, { stdio: 'inherit' });
      execSync(`npx supabase functions deploy reset-student-password --project-ref ${projectId}`, { stdio: 'inherit' });
      execSync(`npx supabase functions deploy generate-certificate-hash --project-ref ${projectId}`, { stdio: 'inherit' });
      execSync(`npx supabase functions deploy delete-student-user --project-ref ${projectId}`, { stdio: 'inherit' });

      console.log(`\n🔑 Setting UNIVERSITY_SALT secret on Supabase project "${projectId}"...`);
      execSync(`npx supabase secrets set UNIVERSITY_SALT="${salt}" --project-ref ${projectId}`, { stdio: 'inherit' });
      
      console.log("\n✅ Full Supabase project setup, functions, and secrets initialized successfully!");
    } catch (e) {
      console.error("\n❌ Full deployment setup failed.");
      console.error("👉 Make sure your Supabase CLI is logged in with the correct account. Try running: npx supabase login");
    }
  } else {
    console.log("Skipping Supabase deployment.");
  }

  console.log("\nAll done!");
  rl.close();
  process.exit(0);
}

run();
