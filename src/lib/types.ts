// Shared shapes for the Supabase-backed data layer.
// Field names use snake_case so the UI components can read them unchanged.

export interface Profile {
  id?: string;
  user_id: string;
  full_name: string;
  advocate_name: string;
  bar_council_number: string;
  court_jurisdiction: string;
  plan?: 'free' | 'basic' | 'standard' | 'pro';
  drafts_limit?: number;
  drafts_used?: number;
  plan_expires_at?: string | null;
  razorpay_payment_id?: string | null;
  referral_code: string;
  referred_by: string | null;
  theme: 'dark' | 'light' | 'system';
  font_size?: 'small' | 'medium' | 'large';
  language?: string;
  phone_number?: string;
  profile_photo_url?: string;
  user_type?: 'advocate' | 'individual';
  daily_draft_count?: number;
  last_draft_date?: string | null;
  state?: string;
  city?: string;
  email?: string;
  whatsapp_number?: string;
  whatsapp_verified?: boolean;

  // AI Settings
  response_style?: string;
  response_length?: string;
  default_ai_mode?: string;
  preferred_court_format?: string;
  preferred_draft_language?: string;
  default_jurisdiction?: string;
  preferred_date_format?: string;
  default_export_format?: string;
  auto_download_drafts?: boolean;
  cloud_backup_enabled?: boolean;
  auto_save_drafts?: boolean;

  // Voice Settings
  voice_mode_enabled?: boolean;
  voice_type?: string;
  voice_speed?: number;
  auto_speak?: boolean;

  // Chat Settings
  save_chat_history?: boolean;
  auto_delete_chats?: string;

  // Notifications
  notify_product_updates?: boolean;
  notify_new_features?: boolean;
  notify_referrals?: boolean;
  promotional_emails?: boolean;
  two_factor_enabled?: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface Subscription {
  id?: string;
  plan: 'free' | 'starter' | 'standard' | 'pro';
  drafts_used: number;
  created_at?: string;
  chat_day_key: string;
  chat_count: number;
  drafts_count: number;
  last_reset: string;
}

export interface DraftRecord {
  id: string;
  user_id: string;
  draft_type: string;
  party1_name: string;
  party1_address: string;
  party2_name: string;
  party2_address: string;
  situation: string;
  amount: string | null;
  generated_draft: string;
  created_at: string;
}

export interface DraftInput {
  draftType: string;
  selectedDocumentType?: string;
  documentType?: string;
  party1Name?: string;
  party1Address?: string;
  party2Name?: string;
  party2Address?: string;
  situation: string;
  dynamicFields?: Record<string, string>;
  schema?: any; // The DocumentSchema
  amount?: string;
  generatedDraft: string;
}

export interface SessionUser {
  id: string;
  email: string | null;
  user_metadata: { full_name: string | null };
}

export interface Session {
  user: SessionUser;
}
