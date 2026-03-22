export type Role = "admin" | "manager" | "accountant" | "doctor" | "non_doctor";

export type ModerationStatus = "pending_review" | "approved" | "rejected";
export type DoctorStatus = "pending_review" | "approved" | "rejected" | "active" | "deactivated";
export type SubscriptionStatus = "active" | "expired" | "expiring_soon" | "never" | "pending_payment";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "expired" | "refunded" | "partially_refunded" | "canceled";
export type ProductType = "entry_fee" | "subscription" | "event";
export type EventStatus = "upcoming" | "ongoing" | "finished" | "cancelled";
export type ArticleStatus = "draft" | "published" | "archived";
export type VotingStatus = "draft" | "active" | "closed" | "cancelled";
export type NotificationType = "reminder" | "payment" | "moderation" | "manual";
export type NotificationChannel = "email" | "telegram" | "both";
export type ContentBlockType = "text" | "image" | "video" | "gallery" | "link";
export type DeviceType = "both" | "mobile" | "desktop";

export interface User {
  id: string;
  email: string;
  roles: Role[];
  email_verified: boolean;
  has_chosen_role: boolean;
  onboarding_completed: boolean;
  moderation_status: ModerationStatus | null;
  last_login_at: string | null;
  /** From GET /auth/me */
  sidebar_sections?: string[];
  is_staff?: boolean;
}

export interface AuthMeResponse {
  id: string;
  email: string;
  role: "admin" | "manager" | "accountant";
  is_staff: boolean;
  sidebar_sections: string[];
}

export interface City {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  doctors_count?: number;
}

export interface DoctorListItem {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  phone: string;
  city: { id: string; name: string } | null;
  specialization: string | null;
  moderation_status: ModerationStatus;
  has_medical_diploma: boolean;
  has_pending_changes: boolean;
  has_photo_in_draft?: boolean;
  subscription: {
    id?: string | null;
    status: string | null;
    plan_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
  created_at: string;
}

export interface DoctorDocument {
  id: string;
  document_type: string;
  original_filename: string;
  file_url: string | null;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface DoctorDetail extends Omit<DoctorListItem, "subscription"> {
  passport_data: string | null;
  clinic_name: string | null;
  position: string | null;
  academic_degree: string | null;
  bio: string | null;
  public_email: string | null;
  public_phone: string | null;
  photo_url: string | null;
  is_public?: boolean;
  diploma_photo_url?: string | null;
  slug?: string | null;
  documents: DoctorDocument[];
  subscription: {
    id?: string | null;
    status: string | null;
    plan_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
  payments: PaymentItem[];
  pending_draft: DoctorDraft | null;
  moderation_history: ModerationHistoryItem[];
  content_blocks?: ContentBlock[];
}

export interface DoctorDraft {
  id: string;
  changes: Record<string, unknown>;
  changed_fields: string[];
  status: string;
  moderation_comment?: string | null;
  rejection_reason?: string | null;
  submitted_at: string;
}

export interface ModerationHistoryItem {
  id: string;
  admin_email: string | null;
  action: string;
  comment: string | null;
  created_at: string;
}

export interface PaymentItem {
  id: string;
  user?: { id: string; email: string; full_name: string };
  amount: number;
  product_type: ProductType;
  payment_provider?: string;
  status: PaymentStatus;
  status_label?: string;
  payment_url?: string | null;
  expires_at?: string | null;
  description?: string;
  has_receipt?: boolean;
  paid_at: string | null;
  created_at: string;
  event_registration_id?: string | null;
  event?: { id: string; title: string };
}

export interface PaymentsSummary {
  total_amount: number;
  count_completed: number;
  count_pending: number;
}

export interface Receipt {
  id: string;
  receipt_type: string;
  provider_receipt_id?: string | null;
  receipt_url?: string | null;
  fiscal_number?: string | null;
  fiscal_document?: string | null;
  fiscal_sign?: string | null;
  amount: number;
  status: string;
}

export interface EventListItem {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  status: EventStatus;
  registrations_count: number;
  revenue: number;
  cover_image_url: string | null;
}

export interface EventTariff {
  id: string;
  name: string;
  description: string | null;
  conditions?: string | null;
  details?: string | null;
  price: number;
  member_price: number;
  benefits: string[];
  seats_limit: number | null;
  seats_taken: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface EventRegistration {
  id: string;
  user?: { id: string; email: string; full_name?: string };
  guest_email?: string | null;
  tariff: { id: string; name: string };
  applied_price: number;
  is_member_price: boolean;
  status: string;
  created_at: string;
  payment?: {
    id: string;
    status: string;
    payment_url?: string | null;
    external_payment_url?: string | null;
    has_receipt?: boolean;
    paid_at?: string | null;
  };
}

export interface RegistrationSummary {
  total_registrations: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  total_revenue: number;
}

export interface RegistrationListResponse {
  data: EventRegistration[];
  summary: RegistrationSummary;
  total: number;
  limit: number;
  offset: number;
}

export interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  status: EventStatus;
  created_by: string;
  created_at: string;
  tariffs: EventTariff[];
  galleries?: EventGalleryNested[];
  recordings?: EventRecording[];
  content_blocks?: ContentBlock[];
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: ArticleStatus;
  author_id: string;
  published_at: string | null;
  cover_image_url: string | null;
  themes: { id: string; slug: string; title: string }[];
  created_at: string;
}

export interface OrgDocument {
  id: string;
  title: string;
  slug: string;
  file_url: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at?: string | null;
  content?: string | null;
  updated_by?: string | null;
  created_at?: string;
  content_blocks?: ContentBlock[];
}

export interface ContentBlock {
  id: string;
  entity_type: string;
  entity_id: string;
  locale: string;
  block_type: ContentBlockType;
  sort_order: number;
  title: string | null;
  content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  link_url: string | null;
  link_label: string | null;
  device_type: DeviceType;
  block_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type PlanType = "entry_fee" | "subscription";

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  is_active: boolean;
  sort_order: number;
  plan_type: PlanType;
}

export interface PageSeo {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_url: string | null;
  og_type: string | null;
  twitter_card: string | null;
  canonical_url: string | null;
  custom_meta: Record<string, string> | null;
  updated_at: string | null;
}

export interface SiteSettings {
  telegram_bot_link?: string | null;
  contacts_for_doctors?: { email: string; phone: string; address?: string };
  contacts_for_visitors?: { email: string; phone: string; address?: string };
  home_hero?: { title: string; text: string; image_url: string | null };
  home_mission?: { text: string };
  [key: string]: unknown;
}

export interface VotingSession {
  id: string;
  title: string;
  description: string | null;
  status: VotingStatus;
  starts_at: string;
  ends_at: string;
  candidates_count: number;
  created_at: string;
}

export interface VotingCandidate {
  id: string;
  doctor_profile_id?: string;
  full_name: string;
  photo_url: string | null;
  description: string | null;
  sort_order?: number;
}

export interface ResultSessionNested {
  id: string;
  title: string;
  status: string;
  total_votes: number;
  total_eligible_voters: number;
}

export interface ResultCandidateNested {
  id: string;
  full_name: string;
}

export interface VotingResultItem {
  candidate: ResultCandidateNested;
  votes_count: number;
  percentage: number;
}

export interface VotingSessionResults {
  session: ResultSessionNested;
  results: VotingResultItem[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  template_code: string;
  channel: NotificationChannel;
  title: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  role_display: string;
  is_active: boolean;
  is_verified: boolean;
  last_login_at: string | null;
  created_at: string;
}

export type PortalUserRole = "doctor" | "user" | "no_role";

export interface PortalUserLastPayment {
  id: string;
  amount: number;
  product_type: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface PortalUserListItem {
  id: string;
  email: string;
  full_name: string | null;
  role: PortalUserRole | null;
  role_display: string | null;
  onboarding_status?: string | null;
  doctor_profile_id?: string | null;
  subscription?: {
    id?: string;
    status: string;
    plan_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
  last_payment?: PortalUserLastPayment | null;
  created_at: string;
}

export interface PortalUserDetail extends Omit<PortalUserListItem, "last_payment"> {
  is_verified: boolean;
  doctor_profile_status?: string | null;
  payments: Array<{
    id: string;
    amount: number;
    product_type: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
}

export interface DashboardData {
  total_users: number;
  total_doctors: number;
  active_doctors: number;
  pending_review_doctors: number;
  active_subscriptions: number;
  expiring_30d: number;
  payment_total_month: number;
  payment_total_year: number;
  upcoming_events: number;
  moderation_queue: number;
}

export interface ArticleTheme {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  sort_order: number;
  articles_count?: number;
}

export interface ArticleDetail {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  status: ArticleStatus;
  author_id: string;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  themes: { id: string; slug: string; title: string }[];
  created_at: string;
  updated_at: string | null;
  content_blocks?: ContentBlock[];
}

export interface EventGalleryPhoto {
  id: string;
  file_url: string | null;
  thumbnail_url: string | null;
  caption?: string | null;
}

export interface EventGalleryNested {
  id: string;
  title: string;
  access_level: string;
  photos_count: number;
  created_at: string;
}

export interface EventGallery {
  id: string;
  title: string;
  access_level: string;
  photos: EventGalleryPhoto[];
}

export interface EventRecording {
  id: string;
  title: string;
  video_source: string;
  video_url: string | null;
  video_playback_url?: string | null;
  video_file_size?: number | null;
  video_mime_type?: string | null;
  duration_seconds?: number | null;
  access_level: string;
  status: string;
  sort_order?: number;
  created_at?: string;
}

export interface ImportTask {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  imported?: number;
  total_rows?: number;
  errors?: { row: number; error: string }[];
}

export interface VotingSessionDetail extends VotingSession {
  candidates: VotingCandidate[];
}

export interface SendNotificationRequest {
  user_id: string;
  type: string;
  title: string;
  body: string;
  channels: ("email" | "telegram")[];
}

export interface CertificateSettings {
  id: number;
  president_full_name: string | null;
  president_title: string | null;
  organization_full_name: string | null;
  organization_short_name: string | null;
  certificate_member_text: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  background_url: string | null;
  certificate_number_prefix: string;
  validity_text_template: string | null;
  updated_at: string;
}

export interface DoctorCertificate {
  id: string;
  certificate_type: "member" | "event";
  year: number;
  certificate_number: string;
  is_active: boolean;
  generated_at: string;
  download_url: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
