// backend/supabaseClient.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Optional: test connection when run directly
async function testConnection() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Supabase connection error:", error.message);
  } else {
    console.log("Supabase connection successful! Sample data:", data);
  }
}

// Run test only if this file is run directly (not imported)
if (require.main === module) {
  testConnection();
}

// Export supabase client
module.exports = { supabase };
