import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format phone number to 254XXXXXXXXX format (Kenya M-Pesa format)
 * Handles various input formats: 0712345678, 712345678, 254712345678
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `254${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('7')) {
    return `254${cleaned}`;
  } else if (cleaned.startsWith('254')) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Format currency amount with locale support
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'KES')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date string to readable format
 * @param dateString - ISO date string
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Date(dateString).toLocaleDateString('en-KE', options || defaultOptions);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Get HTTP status code from an API error object if available.
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const response = error.response;
  if (!isRecord(response)) return undefined;
  return typeof response.status === 'number' ? response.status : undefined;
}

/**
 * Extract a user-friendly message from API/client errors.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response)) {
      const data = response.data;
      if (typeof data === 'string' && data.trim()) return data;

      if (isRecord(data)) {
        if (typeof data.error === 'string' && data.error.trim()) return data.error;
        if (typeof data.message === 'string' && data.message.trim()) return data.message;

        const errors = data.errors;
        if (Array.isArray(errors)) {
          const message = errors.find((item) => typeof item === 'string');
          if (typeof message === 'string' && message.trim()) return message;
        }

        const status = data.status;
        if (isRecord(status) && typeof status.message === 'string' && status.message.trim()) {
          return status.message;
        }
      }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }

  return fallback;
}

/**
 * Get status badge color classes based on status type and value
 * @param status - Status value (e.g., 'active', 'paid', 'completed')
 * @param type - Status type ('subscription', 'invoice', 'refund', 'payment', 'system')
 * @returns Tailwind CSS classes for status badge (color only, base classes added by component)
 */
export function getStatusColor(status: string, type: 'subscription' | 'invoice' | 'refund' | 'payment' | 'system' = 'subscription'): string {
  const statusMap: Record<string, Record<string, string>> = {
    subscription: {
      active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      trial: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      suspended: 'border-amber-200 bg-amber-50 text-amber-800',
      cancelled: 'border-red-200 bg-red-50 text-red-800',
    },
    invoice: {
      paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      overdue: 'border-red-200 bg-red-50 text-red-800',
      sent: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      draft: 'border-slate-200 bg-slate-100 text-slate-700',
    },
    refund: {
      completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      processing: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      failed: 'border-red-200 bg-red-50 text-red-800',
      pending: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    payment: {
      completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      pending: 'border-amber-200 bg-amber-50 text-amber-800',
      failed: 'border-red-200 bg-red-50 text-red-800',
    },
    system: {
      ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      error: 'border-red-200 bg-red-50 text-red-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-700',
    },
  };
  
  return statusMap[type]?.[status.toLowerCase()] || 
         'border-slate-200 bg-slate-100 text-slate-700';
}
