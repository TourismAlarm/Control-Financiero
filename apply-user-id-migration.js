/**
 * Script para cambiar user_id de UUID a TEXT en todas las tablas
 * Esto permite que NextAuth funcione correctamente con Google OAuth
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });


const migrations = [
  'ALTER TABLE profiles ALTER COLUMN id TYPE TEXT',
  'ALTER TABLE profiles ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE accounts ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE transactions ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE categories ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE budgets ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE recurring_rules ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE savings_goals ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE transfers ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE loans ALTER COLUMN user_id TYPE TEXT',
  'ALTER TABLE loan_payments ALTER COLUMN user_id TYPE TEXT'
];

async function applyMigrations() {
  console.log('🚀 Iniciando migración de user_id: UUID → TEXT\n');

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    const tableName = migration.match(/ALTER TABLE (\w+)/)[1];
    const columnName = migration.match(/ALTER COLUMN (\w+)/)[1];

    console.log(`📝 [${i + 1}/${migrations.length}] ${tableName}.${columnName}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: migration
      });

      if (error) {
        // Si la función exec_sql no existe, intentar con una query directa
        // Esto es un workaround, normalmente deberías usar el SQL Editor del dashboard
        console.log(`   ⚠️  No se pudo aplicar automáticamente`);
        console.log(`   📋 Aplica manualmente: ${migration}`);
      } else {
        console.log(`   ✅ Completado`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
      console.log(`   📋 Debes aplicar manualmente en el SQL Editor de Supabase`);
    }
  }

  console.log('\n📊 Verificando cambios...');
  await verifyChanges();
}

async function verifyChanges() {
  const query = `
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE column_name IN ('user_id', 'id')
      AND table_schema = 'public'
      AND table_name IN (
        'profiles', 'accounts', 'transactions', 'categories',
        'budgets', 'recurring_rules', 'savings_goals',
        'transfers', 'loans', 'loan_payments'
      )
    ORDER BY table_name, column_name;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });

    if (error) {
      console.log('\n⚠️  No se pudo verificar automáticamente');
      console.log('👉 Verifica manualmente en el SQL Editor de Supabase con esta query:');
      console.log('\n' + query);
    } else {
      console.log('\n✅ Columnas actualizadas:');
      console.table(data);
    }
  } catch (err) {
    console.log('\n⚠️  No se pudo verificar automáticamente');
    console.log('👉 Verifica manualmente en el SQL Editor de Supabase');
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('  MIGRACIÓN: Cambiar user_id de UUID a TEXT');
console.log('═══════════════════════════════════════════════════════\n');
console.log('⚠️  IMPORTANTE:');
console.log('   Supabase no permite ALTER TABLE directamente desde el SDK');
console.log('   Necesitas aplicar el script FIX_USER_ID_TYPE.sql manualmente\n');
console.log('👉 PASOS:');
console.log('   1. Abre https://supabase.com/dashboard/project/ngmpkgkftxeqmvjahide/editor');
console.log('   2. Copia el contenido de FIX_USER_ID_TYPE.sql');
console.log('   3. Pégalo en el SQL Editor');
console.log('   4. Ejecuta el script');
console.log('   5. Verifica los resultados\n');
console.log('═══════════════════════════════════════════════════════\n');

// Intentar aplicar automáticamente (probablemente fallará)
// applyMigrations().catch(console.error);
