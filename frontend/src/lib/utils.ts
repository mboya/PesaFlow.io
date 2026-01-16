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

/**
 * Get status badge color classes based on status type and value
 * @param status - Status value (e.g., 'active', 'paid', 'completed')
 * @param type - Status type ('subscription', 'invoice', 'refund', 'payment', 'system')
 * @returns Tailwind CSS classes for status badge (color only, base classes added by component)
 */
export function getStatusColor(status: string, type: 'subscription' | 'invoice' | 'refund' | 'payment' | 'system' = 'subscription'): string {
  const statusMap: Record<string, Record<string, string>> = {
    subscription: {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    },
    invoice: {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      draft: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400',
    },
    refund: {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    },
    payment: {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    },
    system: {
      ok: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
    },
  };
  
  return statusMap[type]?.[status.toLowerCase()] || 
         'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400';
}
