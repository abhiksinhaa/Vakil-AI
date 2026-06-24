// Shared shapes for the Firestore-backed data layer.
// Field names use snake_case so the UI components can read them unchanged.

export interface Profile {
  user_id: string;
  full_name: string;
  advocate_name: string;
  bar_council_number: string;
  court_jurisdiction: string;
  referral_code: string;
  referred_by: string | null;
  theme: 'dark' | 'light';
  language?: string;
  user_type?: 'advocate' | 'individual';
  state?: string;
  city?: string;
  pincode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Subscription {
  user_id: string;
  plan: 'free' | 'pro';
  pro_until: string | null;
  drafts_this_month: number;
  month_key: string;
  referral_rewards_granted: number;
  chat_messages_today: number;
  chat_day_key: string;
  paid_drafts_balance?: number;
  updated_at?: string;
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
