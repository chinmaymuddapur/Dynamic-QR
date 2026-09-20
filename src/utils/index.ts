import { APP_CONFIG } from '../lib/constants';

/**
 * Generate an uppercase alphanumeric token like 7KQ4M8X2
 */
export function generatePublicToken(length: number = 8): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Omitting ambiguous characters 0, 1, I, O
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Format number into CARD-0001 format
 */
export function formatCardNumber(num: number): string {
  return `CARD-${String(num).padStart(4, '0')}`;
}

/**
 * Generate full dynamic URL for a card token
 */
export function getDynamicUrl(token: string): string {
  return `${APP_CONFIG.dynamicBaseUrl}${APP_CONFIG.dynamicPathPrefix}${token}`;
}

/**
 * Format ISO date string into readable format
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format relative time (e.g. 5m ago, 2h ago)
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}

/**
 * Parse a dynamic URL or input string to extract public token
 */
export function extractTokenFromUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // If it matches pure token format (6-12 alphanumeric characters)
  if (/^[A-HJ-NP-Z2-9]{6,12}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // If it's a dynamic URL: /c/{token}
  const match = trimmed.match(/\/c\/([A-Za-z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  // Try URL parser
  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const cIndex = pathParts.indexOf('c');
    if (cIndex !== -1 && pathParts[cIndex + 1]) {
      return pathParts[cIndex + 1].toUpperCase();
    }
  } catch {
    // not a valid URL
  }

  return null;
}
