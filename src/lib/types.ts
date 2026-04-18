// ============================================================
// Database types (mirrors Supabase schema)
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type TonePreference = "formal" | "balanced" | "conversational";
export type ApplicationStatus = string; // user-defined via user_status_buckets
export type MatchRecommendation = "apply" | "stretch" | "skip";

export interface ExtendedProfile {
  q1: string; // proud achievement not on resume
  q2: string; // owned end-to-end
  q3: string; // skills not on resume
  q4: string; // work they want more of
  q5: string; // career path explanation
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  current_role_title: string | null;
  current_company: string | null;
  years_of_experience: number | null;
  target_roles: string[] | null;
  work_preference: string[] | null;
  tone_preference: TonePreference;
  industries_of_interest: string[] | null;
  base_resume: ResumeJSON | null;
  extended_profile: ExtendedProfile | null;
  onboarding_complete: boolean;
  created_at: string;
}

// Skills can be a flat list OR labeled categories e.g. { "Languages": ["Python"], "Tools": ["Git"] }
export type SkillsData = string[] | Record<string, string[]>;

export interface ResumeJSON {
  summary?: string;
  contact?: { phone?: string; location?: string };
  experience: ExperienceEntry[];
  skills: SkillsData;
  education: EducationEntry[];
  projects?: ProjectEntry[];
  links: Record<string, string>; // { linkedin, github, portfolio, ... }
}

export interface ExperienceEntry {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null; // null = present
  location: string | null;
  bullets: string[];
}

export interface ProjectEntry {
  name: string;
  tech?: string | null;
  date?: string | null;
  url?: string | null;
  bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string | null;
  graduation_year: number | null;
}

export interface UserStatusBucket {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface ApplicationStage {
  id: string;
  application_id: string;
  stage_name: string;
  stage_date: string; // ISO date string
  notes: string | null;
  created_at: string;
}

export type ATSPriority = "High" | "Medium" | "Low";

export interface ATSSuggestion {
  what: string; // short headline — what to change
  location: string; // where in the resume
  reason: string; // why it helps with ATS
  replace_this: string | null; // current text to replace; null = pure addition
  with_this: string; // exact copy-pasteable replacement
  priority: ATSPriority;
}

export interface JDExtracted {
  role_title: string;
  company: string;
  location: string | null;
  target_persona: string | null;
  years_required: string | null;
  required_skills: string[];
  tools_technologies: string[];
  certifications: string[];
  nice_to_haves: string[];
  benefits: string[];
  seniority: string;
  employment_type: string;
}

export interface MatchBreakdown {
  score: number;
  strengths: string[];
  gaps: string[];
  recommendation: MatchRecommendation;
  reasoning: string;
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string | null;
  role_title: string | null;
  job_url: string | null;
  jd_raw: string | null;
  jd_extracted: JDExtracted | null;
  match_score: number | null;
  match_breakdown: MatchBreakdown | null;
  status: ApplicationStatus;
  applied_via_referral: boolean;
  reached_out_to_hm: boolean;
  channels: string[];
  custom_tags: string[];
  notes: string | null;
  attached_resume_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  application_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ============================================================
// Supabase Database type (for typed client)
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserProfile & { extended_profile: ExtendedProfile | null };
        Insert: Partial<
          UserProfile & { extended_profile: ExtendedProfile | null }
        > & { id: string };
        Update: Partial<
          UserProfile & { extended_profile: ExtendedProfile | null }
        >;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Application, "id" | "user_id" | "created_at">>;
      };
      application_stages: {
        Row: ApplicationStage;
        Insert: Omit<ApplicationStage, "id" | "created_at">;
        Update: Partial<
          Omit<ApplicationStage, "id" | "application_id" | "created_at">
        >;
      };
      user_status_buckets: {
        Row: UserStatusBucket;
        Insert: Omit<UserStatusBucket, "id" | "created_at">;
        Update: Partial<
          Omit<UserStatusBucket, "id" | "user_id" | "created_at">
        >;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at">;
        Update: never;
      };
    };
  };
}
