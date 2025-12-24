/**
 * Helper functions for handling rate limit errors gracefully
 */

export interface RateLimitInfo {
  retryAfter: number | null;
  message: string;
  limit?: string;
  remaining?: string;
  reset?: string;
}

/**
 * Extract rate limit information from an error object
 */
export function extractRateLimitInfo(error: any): RateLimitInfo | null {
  if (error?.response?.status === 429) {
    const rateLimitInfo = error.rateLimitInfo || {};
    const responseData = error.response?.data;
    
    return {
      retryAfter: rateLimitInfo.retryAfter || 
                  parseInt(error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'] || '0', 10) ||
                  responseData?.retry_after ||
                  null,
      message: rateLimitInfo.message ||
               responseData?.status?.message ||
               responseData?.message ||
               'Too many requests. Please try again later.',
      limit: rateLimitInfo.limit || 
             error.response?.headers?.['x-ratelimit-limit'] || 
             error.response?.headers?.['X-RateLimit-Limit'],
      remaining: rateLimitInfo.remaining || 
                 error.response?.headers?.['x-ratelimit-remaining'] || 
                 error.response?.headers?.['X-RateLimit-Remaining'],
      reset: rateLimitInfo.reset || 
             error.response?.headers?.['x-ratelimit-reset'] || 
             error.response?.headers?.['X-RateLimit-Reset']
    };
  }
  
  return null;
}

/**
 * Format retry after time in a user-friendly way
 */
export function formatRetryAfter(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return 'a moment';
  }
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

/**
 * Get a user-friendly error message for rate limit errors
 */
export function getRateLimitErrorMessage(error: any): string {
  const rateLimitInfo = extractRateLimitInfo(error);
  
  if (!rateLimitInfo) {
    // Fallback to generic error message
    const statusMessage = error?.response?.data?.status?.message || 
                         error?.response?.data?.message || 
                         error?.message || 
                         'An error occurred. Please try again.';
    return statusMessage;
  }
  
  // Use the message from the server if available
  if (rateLimitInfo.message && !rateLimitInfo.message.includes('try again in')) {
    return rateLimitInfo.message;
  }
  
  // Format a custom message with retry time
  if (rateLimitInfo.retryAfter) {
    const retryTime = formatRetryAfter(rateLimitInfo.retryAfter);
    return `Too many requests. Please try again in ${retryTime}.`;
  }
  
  return rateLimitInfo.message || 'Too many requests. Please try again later.';
}
