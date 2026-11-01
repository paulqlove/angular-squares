import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SanitizationService {
  private readonly HTML_TAG_PATTERN = /<[^>]*>/g;
  private readonly SCRIPT_PATTERNS = [
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:/gi,
    /vbscript:/gi
  ];

  sanitizePlayerName(name: string): string {
    return this.sanitizeString(name, 50);
  }

  sanitizeGameName(name: string): string {
    return this.sanitizeString(name, 100);
  }

  sanitizeTeamName(name: string): string {
    return this.sanitizeString(name, 50);
  }

  sanitizeDisplayName(name: string): string {
    return this.sanitizeString(name, 50);
  }

  sanitizePlainText(value: string, maxLength: number): string {
    return this.sanitizeString(value, maxLength);
  }

  /** Plain text that keeps line breaks. Tags are stripped. Angular still escapes on render. */
  sanitizeMultilineText(value: string, maxLength: number): string {
    if (!value) return '';
    let sanitized = value.replace(this.HTML_TAG_PATTERN, '');
    for (const pattern of this.SCRIPT_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    sanitized = sanitized.replace(/\r\n/g, '\n').trim();
    return sanitized.substring(0, maxLength);
  }

  validateScore(score: number | string): number {
    const num = typeof score === 'string' ? parseInt(score, 10) : score;
    if (isNaN(num) || num < 0 || num > 999) {
      return 0;
    }
    return Math.floor(num);
  }

  validatePrice(price: number | string): number {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num) || num < 0) {
      return 0;
    }
    if (num > 10000) {
      return 10000;
    }
    return Math.round(num * 100) / 100; // 2 decimal places
  }

  escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private sanitizeString(str: string, maxLength: number): string {
    if (!str) return '';

    let sanitized = str;

    // Remove HTML tags
    sanitized = sanitized.replace(this.HTML_TAG_PATTERN, '');

    // Remove dangerous patterns
    for (const pattern of this.SCRIPT_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Truncate to max length
    return sanitized.substring(0, maxLength);
  }
}
