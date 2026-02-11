-- Add CASCADE delete for project-related tables
-- This allows automatic deletion of related records when a project is deleted

-- 1. Documents table
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_project_id_projects_id_fk;

ALTER TABLE documents 
  ADD CONSTRAINT documents_project_id_projects_id_fk 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- 2. Mockups table
ALTER TABLE mockups 
  DROP CONSTRAINT IF EXISTS mockups_project_id_projects_id_fk;

ALTER TABLE mockups 
  ADD CONSTRAINT mockups_project_id_projects_id_fk 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- 3. Token Usage table
ALTER TABLE token_usage 
  DROP CONSTRAINT IF EXISTS token_usage_project_id_projects_id_fk;

ALTER TABLE token_usage 
  ADD CONSTRAINT token_usage_project_id_projects_id_fk 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- Verify constraints
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'project_id'
ORDER BY tc.table_name;
