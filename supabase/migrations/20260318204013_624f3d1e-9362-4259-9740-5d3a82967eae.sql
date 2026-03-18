
-- ============================================================
-- WINGATE ACADEMY — Full Schema
-- ============================================================

-- 1. STUDENTS
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  math_level INT DEFAULT 3 CHECK (math_level IN (3, 4, 5)),
  overall_status TEXT NOT NULL DEFAULT 'green' CHECK (overall_status IN ('green', 'yellow', 'red')),
  completion_percent INT NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,1) DEFAULT 0,
  parent_user_id UUID,
  coach_sport TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Public read for now (demo app, no real auth)
CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anyone can update students" ON public.students FOR UPDATE USING (true);

-- 2. SUBJECTS
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_name TEXT NOT NULL UNIQUE
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);

-- 3. STUDENT_SUBJECT_PROGRESS
CREATE TABLE public.student_subject_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  grade NUMERIC(5,1) DEFAULT 0,
  completion_percent INT NOT NULL DEFAULT 0,
  absences INT NOT NULL DEFAULT 0,
  missing_items TEXT[] DEFAULT '{}',
  covered_topics TEXT[] DEFAULT '{}',
  notes TEXT,
  UNIQUE(student_id, subject_id)
);

ALTER TABLE public.student_subject_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read student_subject_progress" ON public.student_subject_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can update student_subject_progress" ON public.student_subject_progress FOR UPDATE USING (true);

-- 4. SUBJECT_ROADMAPS
CREATE TABLE public.subject_roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  level_option INT DEFAULT NULL,
  topic_name TEXT NOT NULL,
  required_for_completion BOOLEAN NOT NULL DEFAULT true,
  order_index INT NOT NULL DEFAULT 0
);

ALTER TABLE public.subject_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subject_roadmaps" ON public.subject_roadmaps FOR SELECT USING (true);

-- 5. STUDENT_ROADMAP_PROGRESS
CREATE TABLE public.student_roadmap_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES public.subject_roadmaps(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completion_date TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, roadmap_item_id)
);

ALTER TABLE public.student_roadmap_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read student_roadmap_progress" ON public.student_roadmap_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can update student_roadmap_progress" ON public.student_roadmap_progress FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert student_roadmap_progress" ON public.student_roadmap_progress FOR INSERT WITH CHECK (true);

-- 6. APP_USERS (demo roles, not auth.users)
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'coach')),
  linked_student_id UUID REFERENCES public.students(id),
  linked_sport TEXT
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app_users" ON public.app_users FOR SELECT USING (true);
