export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: string; full_name: string | null; email: string | null; specialty: string | null; hospital: string | null; avatar_url: string | null; created_at: string };
        Insert: { id: string; role?: string; full_name?: string | null; email?: string | null; specialty?: string | null; hospital?: string | null; avatar_url?: string | null };
        Update: { role?: string; full_name?: string | null; email?: string | null; specialty?: string | null; hospital?: string | null; avatar_url?: string | null };
      };
      children: {
        Row: { id: string; parent_id: string; doctor_id: string | null; name: string; date_of_birth: string; sex: string | null; weight_kg: number | null; height_cm: number | null; notes: string | null; created_at: string };
        Insert: { parent_id: string; name: string; date_of_birth: string; doctor_id?: string | null; sex?: string | null; weight_kg?: number | null; height_cm?: number | null; notes?: string | null };
        Update: { name?: string; date_of_birth?: string; doctor_id?: string | null; sex?: string | null; weight_kg?: number | null; height_cm?: number | null; notes?: string | null };
      };
      vitals: {
        Row: { id: string; child_id: string; recorded_at: string; temp_c: number | null; heart_rate: number | null; resp_rate: number | null; sleep_hours: number | null; mood: string | null; notes: string | null };
        Insert: { child_id: string; recorded_at?: string; temp_c?: number | null; heart_rate?: number | null; resp_rate?: number | null; sleep_hours?: number | null; mood?: string | null; notes?: string | null };
        Update: { temp_c?: number | null; heart_rate?: number | null; resp_rate?: number | null; sleep_hours?: number | null; mood?: string | null; notes?: string | null };
      };
      growth: {
        Row: { id: string; child_id: string; measured_at: string; weight_kg: number | null; height_cm: number | null; head_cm: number | null };
        Insert: { child_id: string; measured_at?: string; weight_kg?: number | null; height_cm?: number | null; head_cm?: number | null };
        Update: { weight_kg?: number | null; height_cm?: number | null; head_cm?: number | null };
      };
      milestones: {
        Row: { id: string; child_id: string; title: string; target_date: string | null; achieved_at: string | null; notes: string | null };
        Insert: { child_id: string; title: string; target_date?: string | null; achieved_at?: string | null; notes?: string | null };
        Update: { title?: string; target_date?: string | null; achieved_at?: string | null; notes?: string | null };
      };
      consultations: {
        Row: { id: string; child_id: string; opened_by: string; summary: string | null; status: string; created_at: string; updated_at: string };
        Insert: { child_id: string; opened_by: string; summary?: string | null; status?: string };
        Update: { summary?: string | null; status?: string; updated_at?: string };
      };
      messages: {
        Row: { id: string; consultation_id: string; author_role: string; author_id: string | null; content: string; created_at: string };
        Insert: { consultation_id: string; author_role: string; author_id?: string | null; content: string };
        Update: { content?: string };
      };
      emergency_contacts: {
        Row: { id: string; child_id: string; label: string; name: string; phone: string; relation: string | null };
        Insert: { child_id: string; label: string; name: string; phone: string; relation?: string | null };
        Update: { label?: string; name?: string; phone?: string; relation?: string | null };
      };
      notifications: {
        Row: { id: string; user_id: string; title: string; body: string | null; kind: string; read_at: string | null; created_at: string; link: string | null };
        Insert: { user_id: string; title: string; body?: string | null; kind?: string; read_at?: string | null; link?: string | null };
        Update: { title?: string; body?: string | null; kind?: string; read_at?: string | null; link?: string | null };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
