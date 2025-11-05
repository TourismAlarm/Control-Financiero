const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySchema() {
  console.log('🔄 Reading SQL schema file...');

  const schemaPath = path.join(__dirname, 'supabase', 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('📄 Schema file loaded (436 lines)');
  console.log('🚀 Applying schema to Supabase...\n');

  try {
    // Execute the SQL using RPC
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      // If exec RPC doesn't exist, try direct query
      console.log('⚠️  RPC method not available, using direct SQL execution...\n');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📊 Found ${statements.length} SQL statements\n`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';

        // Skip comments
        if (statement.trim().startsWith('--')) continue;

        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            query: statement
          });

          if (stmtError) {
            console.error(`❌ Error in statement ${i + 1}:`, stmtError.message);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          } else {
            successCount++;
            if (successCount % 10 === 0) {
              console.log(`✓ Processed ${successCount} statements...`);
            }
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n📊 Summary:`);
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);

      if (errorCount === 0) {
        console.log('\n✅ Schema applied successfully!');
      } else {
        console.log('\n⚠️  Schema applied with some errors. Please check the output above.');
      }
    } else {
      console.log('✅ Schema applied successfully!');
      console.log('📊 Result:', data);
    }

  } catch (err) {
    console.error('❌ Fatal error applying schema:', err);
    console.error('\n💡 Alternative: Copy the SQL from supabase/migrations/001_initial_schema.sql');
    console.error('   and paste it directly in Supabase Dashboard > SQL Editor');
    console.error(`   URL: ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/')}/sql`);
    process.exit(1);
  }
}

// Run the migration
applySchema()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    console.log('🔍 Verify in Supabase Dashboard:');
    console.log(`   ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '')}/editor`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
