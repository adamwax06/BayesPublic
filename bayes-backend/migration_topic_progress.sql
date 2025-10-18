-- Database migration script to create topic_progress table
-- Run this in your Supabase SQL editor

-- Create the topic_progress table
CREATE TABLE IF NOT EXISTS topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  course TEXT NOT NULL,
  
  -- Current position
  current_subtopic_index INTEGER DEFAULT 0,
  current_problem_index INTEGER DEFAULT 0,
  current_step TEXT DEFAULT 'article', -- 'article' or 'problems'
  
  -- Progress tracking
  correct_answers INTEGER DEFAULT 0,
  total_problems_attempted INTEGER DEFAULT 0,
  completed_subtopics INTEGER[] DEFAULT '{}', -- Array of completed subtopic indices
  completed_problems INTEGER[] DEFAULT '{}', -- Array of completed problem indices
  
  -- Metadata
  started_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  total_time_spent INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one progress record per user per topic per course
  UNIQUE(user_id, topic_name, course)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_id ON topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_last_accessed ON topic_progress(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic_course ON topic_progress(topic_name, course);

-- Enable Row Level Security
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own topic progress" ON topic_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic progress" ON topic_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topic progress" ON topic_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topic progress" ON topic_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Migration: Convert existing saved_topics to topic_progress
-- This creates progress records for all existing saved topics
INSERT INTO topic_progress (
  user_id, 
  topic_name, 
  course, 
  started_at, 
  last_accessed, 
  created_at, 
  updated_at
)
SELECT 
  user_id,
  topic,
  course,
  created_at,
  updated_at,
  created_at,
  updated_at
FROM saved_topics
ON CONFLICT (user_id, topic_name, course) DO NOTHING;

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topic_progress_updated_at 
    BEFORE UPDATE ON topic_progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
