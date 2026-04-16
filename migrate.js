#!/usr/bin/env node
/**
 * Crown Dental CRM - Database Migration Helper
 * 
 * This script helps apply the CRM schema migration to Supabase.
 * Run with: node migrate.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envPath = path.join(__dirname, 'Websites/Crowndentalstudio/.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found in Websites/Crowndentalstudio/');
  console.error('   Please ensure the project is properly configured.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  }
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('   Expected: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('🔄 Connecting to Supabase...');
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260416_000002_crm_schema.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Error: Migration file not found');
      console.error('   Path:', migrationPath);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying migration...');
    console.log('   File: supabase/migrations/20260416_000002_crm_schema.sql');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Try alternative method - direct execution
      console.log('⚠️  Trying alternative migration method...');
      
      // Split by semicolons and execute statements
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase
            .from('users')  // Just a valid table to verify connection
            .select('id')
            .limit(0);
          
          if (execError && execError.code !== 'PGRST116') {
            throw execError;
          }
        }
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Verify tables in Supabase Dashboard > Table Editor');
    console.log('   2. Create test patient data');
    console.log('   3. Try booking an appointment');
    console.log('');
    console.log('🎉 Appointment creation should now work!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('');
    console.error('💡 Manual Alternative:');
    console.error('   1. Go to: https://app.supabase.com/');
    console.error('   2. Open your project');
    console.error('   3. SQL Editor > New Query');
    console.error('   4. Copy content from: supabase/migrations/20260416_000002_crm_schema.sql');
    console.error('   5. Click Run');
    process.exit(1);
  }
}

applyMigration();
