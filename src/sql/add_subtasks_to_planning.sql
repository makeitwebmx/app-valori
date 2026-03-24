-- SQL script to add subtasks to planning_tasks table
-- This allows coaches to add a checklist of activities to a planning task.

ALTER TABLE planning_tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
