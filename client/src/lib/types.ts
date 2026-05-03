// ─────────────────────────────────────────────────────────────────────────────
// Core enums
// ─────────────────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'barber' | 'client';
export type UserStatus = 'active' | 'inactive';
export type PlanType = 'bronze' | 'silver' | 'gold';
export type SubscriptionStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'cancelled'
  | 'payment_failed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type AppointmentService =
  | 'haircut'
  | 'beard'
  | 'haircut_beard'
  | 'shave'
  | 'styling'
  | 'other';
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type CancelledBy = 'client' | 'barber' | 'system';
export type ConversationType = 'barber_client' | 'support';
export type MessageType = 'text' | 'image' | 'system' | 'attachment';
// Aligned with server Prisma enums (see server/prisma/schema.prisma).
// Server's Zod schemas reject anything outside this set, so any drift here
// causes silent 400 errors on POST /tickets.
export type TicketCategory = 'payment' | 'account' | 'booking' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type NotificationType =
  | 'payment_success'
  | 'payment_failed'
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'cut_registered'
  | 'cuts_limit_reached'
  | 'subscription_renewed'
  | 'message_received'
  | 'ticket_update'
  | 'general';

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  fullName: string;
  phone: string | null;
  createdAt?: string;
}

export interface Barber {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  address: string | null;
  bio: string | null;
  rating: number | string;
  stripeAccountId?: string | null;
  stripeConnected?: boolean;
  user?: { email: string; fullName?: string };
}

export interface Client {
  id: string;
  userId: string;
  barberId: string | null;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  subscriptions?: Subscription[];
  user?: { email: string; fullName?: string; createdAt?: string };
}

export interface Plan {
  id: string;
  barberId: string;
  name: string;
  description: string | null;
  price: number | string;
  cutsPerMonth: number | null;
  isActive: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  stripePaymentLink: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { subscriptions: number };
}

export interface Subscription {
  id: string;
  clientId: string;
  planId?: string | null;
  planType: PlanType;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  price: number | string;
  cutsTotal?: number | null;
  cutsUsed?: number;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  plan?: Plan | null;
}

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number | string;
  status: PaymentStatus;
  method?: string | null;
  paymentDate: string;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  subscription?: { planType: PlanType; plan?: { name: string } | null };
}

export interface Cut {
  id: string;
  clientId: string;
  barberId: string;
  subscriptionId: string | null;
  date: string;
  notes: string | null;
  createdAt: string;
  client?: Pick<Client, 'id' | 'name' | 'email'>;
}

export interface Appointment {
  id: string;
  barberId: string;
  clientId: string;
  service: AppointmentService;
  date: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  clientNotes: string | null;
  cancelledBy: CancelledBy | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Pick<Client, 'id' | 'name' | 'email' | 'phone'>;
  barber?: Pick<Barber, 'id' | 'name'>;
}

export interface BarberAvailability {
  id: string;
  barberId: string;
  dayOfWeek: number; // 0=Sun .. 6=Sat
  startTime: string; // HH:MM
  endTime: string;
  slotDuration: number; // minutes
  isActive: boolean;
}

export interface BarberUnavailable {
  id: string;
  barberId: string;
  // Prisma columns: dateFrom / dateTo (ISO date strings).
  dateFrom: string;
  dateTo: string;
  reason: string | null;
  createdAt: string;
}

export interface Slot {
  time: string; // HH:MM
  available: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  barberId: string | null;
  clientId: string | null;
  adminId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  barber?: { id: string; name: string; user?: { email: string } } | null;
  client?: { id: string; name: string; email: string } | null;
  admin?: { id: string; fullName: string; email: string } | null;
  ticket?: SupportTicket | null;
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
  /** Convenience field set by admin tickets list */
  requester?: { id: string; fullName: string; email: string; role: Role };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: Role;
  type: MessageType;
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; fullName: string };
}

export interface SupportTicket {
  id: string;
  conversationId: string;
  requesterId: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  conversation?: Conversation;
  requester?: { id: string; fullName: string; email: string; role: Role };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; role: Role };
}

export interface StripeStatus {
  configured: boolean;
  connectConfigured?: boolean;
  publishableKey?: string | null;
  // Barber-specific:
  barberConnected?: boolean;
  stripeAccountId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface MeResponse {
  user: User;
  role: Role;
  barber: Barber | null;
  client: Client | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static helpers (legacy plan tiers — still used in some UI labels)
// ─────────────────────────────────────────────────────────────────────────────
export const PLAN_PRICE: Record<PlanType, number> = {
  bronze: 9.99,
  silver: 19.99,
  gold: 49.99,
};

export const PLAN_LABEL: Record<PlanType, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export const SERVICE_LABEL: Record<AppointmentService, string> = {
  haircut: 'Corte',
  beard: 'Barba',
  haircut_beard: 'Corte + Barba',
  shave: 'Shave',
  styling: 'Styling',
  other: 'Outro',
};

export const SERVICE_DURATION: Record<AppointmentService, number> = {
  haircut: 30,
  beard: 20,
  haircut_beard: 45,
  shave: 30,
  styling: 30,
  other: 30,
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  payment: 'Pagamento',
  account: 'Conta',
  booking: 'Marcações',
  other: 'Outro',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em curso',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export const DAY_OF_WEEK_LABEL: string[] = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];
