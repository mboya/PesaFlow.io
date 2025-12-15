// TypeScript types for PesaFlow API responses

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  billing_frequency: 'monthly' | 'quarterly' | 'yearly';
  trial_days: number | null;
  features: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  customer_id: number;
  plan_id: number;
  reference_number: string;
  status: 'active' | 'suspended' | 'cancelled' | 'trial' | 'expired';
  billing_frequency: 'monthly' | 'quarterly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string | null;
  trial_start: string | null;
  trial_end: string | null;
  outstanding_amount: number;
  failed_payment_count: number;
  payment_method: 'ratiba' | 'stk_push' | 'manual' | null;
  standing_order_id: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  plan?: Plan;
}

export interface Payment {
  id: number;
  subscription_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'ratiba' | 'stk_push' | 'manual';
  transaction_id: string | null;
  mpesa_receipt_number: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  subscription?: Subscription;
}

export interface BillingAttempt {
  id: number;
  subscription_id: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  attempt_number: number;
  payment_id: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  subscription_id: number;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  subscription?: Subscription;
}

export interface Refund {
  id: number;
  payment_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason: string;
  mpesa_transaction_id: string | null;
  processed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  payment?: Payment;
}

export interface DashboardData {
  customer: Customer;
  active_subscriptions: Subscription[];
  total_outstanding: number;
  recent_payments: Payment[];
  upcoming_billing: Subscription[];
}

export interface ApiError {
  errors?: string[] | Record<string, string[]>;
  error?: string;
  message?: string;
}

