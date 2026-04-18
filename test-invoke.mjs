import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uqatkxmadedgfbobyrju.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_CImumDcW2-5CfubEQ0X9ow_ilZbBBzv";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  console.log("Testing signUp with existing user...");
  try {
    const email = "test@blockcert.edu";
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: "somepassword123",
    });
    console.log("SignUp Data:", JSON.stringify(signUpData, null, 2));
    console.log("SignUp Error:", signUpError);
  } catch (e) {
    console.error("Exception:", e);
  } finally {
    process.exit(0);
  }
}

test();
