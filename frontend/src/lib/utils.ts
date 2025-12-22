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
