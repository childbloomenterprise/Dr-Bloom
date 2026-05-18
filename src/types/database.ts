// Types derived from unified_schema.sql — ChildBloom + Dr Bloom shared database.
// Every Supabase response should be cast to one of these types; no `any` allowed.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enumerations ────────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'doctor' | 'admin'
export type ConnectionStatus = 'pending' | 'active' | 'revoked' | 'declined'
export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'emergency'
export type IrisContextType = 'general' | 'consultation' | 'parent_concern' | 'pre_visit_brief'
export type Gender = 'male' | 'female' | 'other'
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown'
export type MeasurementSource = 'parent' | 'doctor' | 'clinic'
export type SleepType = 'night' | 'nap'
export type FeedingType = 'breast' | 'bottle' | 'formula' | 'solid' | 'water' | 'other'
export type MilestoneCategory = 'motor' | 'language' | 'social' | 'cognitive' | 'feeding' | 'other'
export type FileType = 'image' | 'video' | 'document'
export type VaccinationSource = 'doctor' | 'parent' | 'import'
export type InitiatedBy = 'doctor' | 'parent'
export type InviteStatus = 'pending' | 'accepted' | 'expired'
export type AppSource = 'childbloom' | 'drbloom'
export type VisitType = 'routine' | 'sick' | 'follow_up' | 'emergency' | 'telehealth'
export type ConsultationStatus = 'in_progress' | 'completed' | 'cancelled'
export type MedicationRoute = 'oral' | 'topical' | 'inhaled' | 'injection' | 'drops' | 'other'
export type ReferralUrgency = 'routine' | 'urgent' | 'emergency'
export type ReferralStatus = 'pending' | 'sent' | 'accepted' | 'completed' | 'cancelled'
export type AlertTriggeredBy = 'ai' | 'parent' | 'doctor' | 'system'

// ─── Layer 1: Identity ────────────────────────────────────────────────────────

export interface Clinic {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  phone: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface DoctorProfile {
  id: string
  clinic_id: string | null
  specialty: string
  license_number: string | null
  license_country: string | null
  bio: string | null
  years_experience: number | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface ParentProfile {
  id: string
  preferred_language: string
  created_at: string
  updated_at: string
}

// ─── Layer 2: Children ────────────────────────────────────────────────────────

export interface Child {
  id: string
  parent_id: string
  first_name: string
  last_name: string | null
  date_of_birth: string
  gender: Gender | null
  blood_type: BloodType | null
  birth_weight_grams: number | null
  birth_height_cm: number | null
  birth_head_circumference_cm: number | null
  gestational_age_weeks: number | null
  photo_url: string | null
  allergies: string[] | null
  medical_conditions: string[] | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GrowthMeasurement {
  id: string
  child_id: string
  logged_by: string
  source: MeasurementSource
  measured_at: string
  weight_grams: number | null
  height_cm: number | null
  head_circumference_cm: number | null
  bmi: number | null
  notes: string | null
  created_at: string
}

export interface SleepLog {
  id: string
  child_id: string
  logged_by: string
  sleep_start: string
  sleep_end: string | null
  duration_minutes: number | null
  quality_score: number | null
  sleep_type: SleepType | null
  interruptions: number
  notes: string | null
  created_at: string
}

export interface FeedingLog {
  id: string
  child_id: string
  logged_by: string
  fed_at: string
  feeding_type: FeedingType
  duration_minutes: number | null
  amount_ml: number | null
  food_description: string | null
  refused_food: boolean
  notes: string | null
  created_at: string
}

export interface SymptomReport {
  id: string
  child_id: string
  logged_by: string
  reported_at: string
  symptom: string
  severity: number
  body_location: string | null
  duration_hours: number | null
  is_ongoing: boolean
  resolved_at: string | null
  parent_notes: string | null
  created_at: string
}

export interface Milestone {
  id: string
  child_id: string
  logged_by: string
  achieved_at: string
  category: MilestoneCategory
  milestone_name: string
  description: string | null
  photo_url: string | null
  video_url: string | null
  created_at: string
}

export interface MedicationsLog {
  id: string
  child_id: string
  logged_by: string
  given_at: string
  medication_name: string
  dosage: string | null
  unit: string | null
  reason: string | null
  prescribed_by: string | null
  notes: string | null
  created_at: string
}

export interface MediaAttachment {
  id: string
  child_id: string
  uploaded_by: string
  entity_type: string
  entity_id: string
  file_url: string
  file_type: FileType
  file_size_bytes: number | null
  caption: string | null
  created_at: string
}

export interface VaccinationRecord {
  id: string
  child_id: string
  logged_by: string
  source: VaccinationSource
  vaccine_name: string
  dose_number: number | null
  administered_at: string
  batch_number: string | null
  administered_by: string | null
  facility: string | null
  next_due_date: string | null
  notes: string | null
  created_at: string
}

// ─── Layer 3: Connections ─────────────────────────────────────────────────────

export interface DoctorChildConnection {
  id: string
  doctor_id: string
  child_id: string
  status: ConnectionStatus
  initiated_by: InitiatedBy
  request_message: string | null
  consent_signed_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  created_at: string
  updated_at: string
}

export interface ChildbloomInvite {
  id: string
  invited_by: string
  parent_email: string
  child_name: string | null
  child_dob: string | null
  invite_token: string
  status: InviteStatus
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface DataAccessLog {
  id: string
  accessor_id: string
  child_id: string
  action: string
  app_source: AppSource
  ip_address: string | null
  accessed_at: string
}

// ─── Layer 4: Clinical ────────────────────────────────────────────────────────

export interface Consultation {
  id: string
  doctor_id: string
  child_id: string
  consultation_date: string
  visit_type: VisitType
  chief_complaint: string | null
  history_of_present_illness: string | null
  examination_findings: string | null
  assessment: string | null
  plan: string | null
  diagnosis_codes: string[] | null
  follow_up_days: number | null
  status: ConsultationStatus
  created_at: string
  updated_at: string
}

export interface Prescription {
  id: string
  consultation_id: string
  doctor_id: string
  child_id: string
  medication_name: string
  generic_name: string | null
  dosage: string
  unit: string
  frequency: string
  duration_days: number | null
  route: MedicationRoute
  instructions: string | null
  is_active: boolean
  prescribed_at: string
  created_at: string
}

export interface Referral {
  id: string
  consultation_id: string
  doctor_id: string
  child_id: string
  specialist_type: string
  reason: string
  urgency: ReferralUrgency
  referred_to_name: string | null
  referred_to_facility: string | null
  notes: string | null
  status: ReferralStatus
  created_at: string
}

// ─── Layer 5: Intelligence ────────────────────────────────────────────────────

export interface AiPrediction {
  id: string
  child_id: string
  prediction_type: string
  model_version: string
  confidence_score: number | null
  prediction_data: Json
  data_window_start: string | null
  data_window_end: string | null
  expires_at: string | null
  created_at: string
}

export interface HealthAlert {
  id: string
  child_id: string
  triggered_by: AlertTriggeredBy
  alert_type: string
  severity: AlertSeverity
  title: string
  description: string
  related_entity_type: string | null
  related_entity_id: string | null
  notified_doctor: boolean
  notified_parent: boolean
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  created_at: string
}

export interface IrisMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface IrisConversation {
  id: string
  user_id: string
  child_id: string | null
  consultation_id: string | null
  context_type: IrisContextType
  messages: IrisMessage[]
  summary: string | null
  created_at: string
  updated_at: string
}

// ─── Layer 6: Notifications ───────────────────────────────────────────────────

export interface Notification {
  id: string
  recipient_id: string
  type: string
  title: string
  body: string
  data: Json | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ─── Composite / join types ───────────────────────────────────────────────────

export interface ChildWithParent extends Child {
  parent: Pick<UserProfile, 'id' | 'full_name' | 'email'>
}

export interface ConnectionWithChild extends DoctorChildConnection {
  child: Child
}

export interface AlertWithChild extends HealthAlert {
  child: Pick<Child, 'id' | 'first_name' | 'last_name'>
}

export interface ConsultationWithChild extends Consultation {
  child: Pick<Child, 'id' | 'first_name' | 'last_name'>
}

// ─── Search result (enriched with connection status) ─────────────────────────

export type SearchConnectionStatus = 'none' | 'pending' | 'active' | 'revoked' | 'declined'

export interface PatientSearchResult {
  child: Child
  connectionStatus: SearchConnectionStatus
  connectionId: string | null
  parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null
}
