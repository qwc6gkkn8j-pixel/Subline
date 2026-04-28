export type Role = 'admin' | 'barber' | 'client';
export type UserStatus = 'active' | 'inactive';
export type PlanType = 'bronze' | 'silver' | 'gold';
export type SubscriptionStatus = 'active' | 'inactive' | 'pending' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

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
}

export interface Subscription {
  id: string;
  clientId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  price: number | string;
}

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number | string;
  status: PaymentStatus;
  paymentDate: string;
  subscription?: { planType: PlanType };
}

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
