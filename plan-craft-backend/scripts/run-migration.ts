/**
 * Run database migration for CASCADE delete
 * Execute: npx tsx scripts/run-migration.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index';

async function runMigration() {
  console.log('🔧 Starting database migration...');
  
  try {
    // 1. Documents table
    console.log('📄 Updating documents table...');
    await db.execute(sql`
      ALTER TABLE documents 
      DROP CONSTRAINT IF EXISTS documents_project_id_projects_id_fk
    `);
    
    await db.execute(sql`
      ALTER TABLE documents 
      ADD CONSTRAINT documents_project_id_projects_id_fk 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    `);
    console.log('✅ Documents table updated');

    // 2. Mockups table
    console.log('🎨 Updating mockups table...');
    await db.execute(sql`
      ALTER TABLE mockups 
      DROP CONSTRAINT IF EXISTS mockups_project_id_projects_id_fk
    `);
    
    await db.execute(sql`
      ALTER TABLE mockups 
      ADD CONSTRAINT mockups_project_id_projects_id_fk 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    `);
    console.log('✅ Mockups table updated');

    // 3. Token Usage table
    console.log('📊 Updating token_usage table...');
    await db.execute(sql`
      ALTER TABLE token_usage 
      DROP CONSTRAINT IF EXISTS token_usage_project_id_projects_id_fk
    `);
    
    await db.execute(sql`
      ALTER TABLE token_usage 
      ADD CONSTRAINT token_usage_project_id_projects_id_fk 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    `);
    console.log('✅ Token usage table updated');

    // Verify
    console.log('🔍 Verifying constraints...');
    const result = await db.execute(sql`
      SELECT 
        tc.table_name, 
        kcu.column_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'project_id'
      ORDER BY tc.table_name
    `);

    console.log('\n📋 Constraints verification:');
    console.table(result.rows);

    const allCascade = result.rows.every((row: any) => row.delete_rule === 'CASCADE');
    
    if (allCascade) {
      console.log('\n✅ Migration completed successfully! All constraints have CASCADE delete.');
    } else {
      console.warn('\n⚠️  Warning: Some constraints may not have CASCADE delete.');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
