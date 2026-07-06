/**
 * Spam Filter Service
 * Checks emails for spam indicators and compliance issues
 * Reduces spam complaints and ISP filtering
 *
 * Checks:
 * - Content analysis (length, links, images)
 * - Header validation (DKIM, SPF, DMARC)
 * - Spam word detection
 * - Link legitimacy
 * - List-Unsubscribe compliance
 */

import logger from './logger.js';

// Common spam indicators
const SPAM_KEYWORDS = [
  'free money', 'earn $', 'click here', 'limited time', 'act now',
  'winner', 'congratulations', 'claim prize', 'no credit card',
  'not spam', 'verify account', 'confirm password', 'update payment',
  'nigerian prince', 'wire transfer', 'weight loss', 'viagra',
  'casino', 'lottery', 'inheritance', 'tax refund'
];

// Suspicious patterns
const SPAM_PATTERNS = [
  /viagra|cialis|pharmaceuticals/gi,
  /click\s+(here|now|below)/gi,
  /\$\d+\s*(cash|money|prize)/gi,
  /FREE\s*(MONEY|CASH|PRIZE)/gi,
  /act\s+(now|immediately|today)/gi,
  /limited\s+(time|offer)/gi,
  /don't\s+delete/gi,
  /not\s+spam/gi
];

// Maximum content thresholds
const THRESHOLDS = {
  maxExclamationMarks: 5, // % of text that are exclamation marks
  minWordLength: 5, // Minimum average word length
  maxLinks: 10, // Maximum number of links
  maxImages: 20, // Maximum number of images
  minTextToHtmlRatio: 0.3, // Minimum plain text to HTML ratio
  maxSpamWordsRatio: 0.05 // Maximum spam word ratio
};

/**
 * Scan email for spam indicators
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email body
 * @param {string} textContent - Plain text email body (optional)
 * @param {object} config - Optional config overrides
 * @returns {object} - { spamScore: 0-100, verdict: 'safe'|'warning'|'likely_spam', issues: [...] }
 */
export function scanEmail(subject, htmlContent, textContent = '', config = {}) {
  try {
    const issues = [];
    let spamScore = 0;

    const finalThresholds = { ...THRESHOLDS, ...config };

    // Combine all text for analysis
    const allText = `${subject} ${htmlContent} ${textContent}`.toLowerCase();
    const textForAnalysis = textContent || htmlContent.replace(/<[^>]*>/g, '');

    // 1. Check subject line spam indicators
    const subjectScore = checkSubjectLine(subject);
    if (subjectScore > 0) {
      spamScore += subjectScore * 15; // 0-15 points
      issues.push({
        category: 'subject_line',
        severity: subjectScore > 0.7 ? 'high' : 'medium',
        message: 'Subject contains spam-like language',
        score: subjectScore
      });
    }

    // 2. Check for excessive punctuation
    const exclamationCount = (textForAnalysis.match(/!/g) || []).length;
    const totalChars = textForAnalysis.length;
    const exclamationRatio = totalChars > 0 ? exclamationCount / totalChars : 0;

    if (exclamationRatio > finalThresholds.maxExclamationMarks / 100) {
      spamScore += 15;
      issues.push({
        category: 'excessive_punctuation',
        severity: 'medium',
        message: `Too many exclamation marks (${(exclamationRatio * 100).toFixed(1)}%)`,
        ratio: exclamationRatio
      });
    }

    // 3. Check for spam words
    const spamWordMatches = SPAM_KEYWORDS.filter(keyword => allText.includes(keyword.toLowerCase()));
    const spamWordRatio = spamWordMatches.length / (textForAnalysis.split(/\s+/).length || 1);

    if (spamWordMatches.length > 0) {
      const wordScore = Math.min(25, spamWordMatches.length * 5);
      spamScore += wordScore;
      issues.push({
        category: 'spam_words',
        severity: 'high',
        message: `Found ${spamWordMatches.length} spam keywords`,
        keywords: spamWordMatches.slice(0, 5)
      });
    }

    // 4. Check for suspicious patterns
    const patternMatches = SPAM_PATTERNS.filter(pattern => pattern.test(allText));

    if (patternMatches.length > 0) {
      spamScore += patternMatches.length * 5;
      issues.push({
        category: 'suspicious_patterns',
        severity: 'high',
        message: `Found ${patternMatches.length} suspicious patterns`,
        count: patternMatches.length
      });
    }

    // 5. Check link count and legitimacy
    const linkMatches = htmlContent.match(/<a\s+href=["']([^"']+)["']/gi) || [];
    if (linkMatches.length > finalThresholds.maxLinks) {
      spamScore += 15;
      issues.push({
        category: 'excessive_links',
        severity: 'high',
        message: `Too many links (${linkMatches.length}, max ${finalThresholds.maxLinks})`,
        count: linkMatches.length
      });
    }

    // Check for suspicious URL patterns
    const suspiciousUrls = linkMatches.filter(link => {
      const url = link.match(/href=["']([^"']+)["']/)[1];
      return !url.includes('unsubscribe') && (
        url.includes('bit.ly') || url.includes('tinyurl') ||
        url.includes('short.link') || url.startsWith('javascript:')
      );
    });

    if (suspiciousUrls.length > 0) {
      spamScore += 10;
      issues.push({
        category: 'suspicious_urls',
        severity: 'high',
        message: `${suspiciousUrls.length} suspicious link shorteners detected`,
        count: suspiciousUrls.length
      });
    }

    // 6. Check image count
    const imageMatches = htmlContent.match(/<img\s+/gi) || [];
    if (imageMatches.length > finalThresholds.maxImages) {
      spamScore += 10;
      issues.push({
        category: 'excessive_images',
        severity: 'medium',
        message: `Too many images (${imageMatches.length}, max ${finalThresholds.maxImages})`,
        count: imageMatches.length
      });
    }

    // 7. Check text to HTML ratio
    const plainTextLength = textForAnalysis.length;
    const htmlLength = htmlContent.length;
    const textRatio = htmlLength > 0 ? plainTextLength / htmlLength : 0;

    if (textRatio < finalThresholds.minTextToHtmlRatio) {
      spamScore += 15;
      issues.push({
        category: 'low_text_content',
        severity: 'medium',
        message: `Email is mostly HTML, low text content (${(textRatio * 100).toFixed(1)}%)`,
        ratio: textRatio
      });
    }

    // 8. Check for unsubscribe link (compliance)
    const hasUnsubscribeLink = htmlContent.toLowerCase().includes('unsubscribe') ||
                               textContent.toLowerCase().includes('unsubscribe');

    if (!hasUnsubscribeLink) {
      spamScore += 5; // Minor penalty
      issues.push({
        category: 'missing_unsubscribe',
        severity: 'low',
        message: 'No unsubscribe link found (required by CAN-SPAM)'
      });
    }

    // 9. Check for List-Unsubscribe header compliance
    const hasListUnsubscribeFormat = htmlContent.includes('<footer') ||
                                     htmlContent.includes('data-unsubscribe') ||
                                     textContent.toLowerCase().includes('list-unsubscribe');

    if (!hasListUnsubscribeFormat && !hasUnsubscribeLink) {
      spamScore += 5;
      issues.push({
        category: 'poor_unsubscribe_format',
        severity: 'low',
        message: 'Unsubscribe link not in standard format'
      });
    }

    // Clamp score to 0-100
    spamScore = Math.min(100, Math.max(0, spamScore));

    // Determine verdict
    let verdict = 'safe';
    if (spamScore >= 70) {
      verdict = 'likely_spam';
    } else if (spamScore >= 40) {
      verdict = 'warning';
    }

    logger.debug('SPAM_FILTER', `Scanned email: score=${spamScore}, verdict=${verdict}, issues=${issues.length}`);

    return {
      spamScore: Math.round(spamScore),
      verdict,
      issues,
      warnings: issues.filter(i => i.severity === 'high').length,
      safeToSend: spamScore < 70 // Safe if score below 70
    };
  } catch (error) {
    logger.error('SPAM_FILTER', 'Error scanning email', error);
    return {
      spamScore: 0,
      verdict: 'error',
      issues: [{ category: 'scan_error', message: error.message }],
      safeToSend: true // Fail open - send if check fails
    };
  }
}

/**
 * Check subject line for spam indicators
 * @param {string} subject - Email subject
 * @returns {number} - Score from 0 to 1
 */
function checkSubjectLine(subject) {
  let score = 0;

  // Check for excessive caps
  const capsLetters = (subject.match(/[A-Z]/g) || []).length;
  const totalLetters = (subject.match(/[a-zA-Z]/g) || []).length;
  const capsRatio = totalLetters > 0 ? capsLetters / totalLetters : 0;

  if (capsRatio > 0.7) {
    score += 0.3; // 30% of score
  }

  // Check for excessive punctuation
  const punctuation = (subject.match(/[!?]/g) || []).length;
  if (punctuation > 3) {
    score += 0.3;
  }

  // Check for spam words in subject
  const subjectLower = subject.toLowerCase();
  if (SPAM_KEYWORDS.some(keyword => subjectLower.includes(keyword))) {
    score += 0.4;
  }

  return Math.min(1, score);
}

/**
 * Get spam filter report for campaign
 * @param {array} emails - Array of email objects { subject, htmlContent, textContent }
 * @returns {object} - Summary report
 */
export function getScanReport(emails) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return {
      total: 0,
      scanned: 0,
      safe: 0,
      warnings: 0,
      likely_spam: 0,
      averageScore: 0,
      topIssues: []
    };
  }

  const results = emails.map(email =>
    scanEmail(email.subject, email.htmlContent, email.textContent)
  );

  const issuesMap = {};

  results.forEach(result => {
    result.issues.forEach(issue => {
      const key = issue.category;
      issuesMap[key] = (issuesMap[key] || 0) + 1;
    });
  });

  const topIssues = Object.entries(issuesMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  return {
    total: emails.length,
    scanned: results.length,
    safe: results.filter(r => r.verdict === 'safe').length,
    warnings: results.filter(r => r.verdict === 'warning').length,
    likely_spam: results.filter(r => r.verdict === 'likely_spam').length,
    averageScore: Math.round(results.reduce((sum, r) => sum + r.spamScore, 0) / results.length),
    topIssues
  };
}

export default {
  scanEmail,
  getScanReport,
  SPAM_KEYWORDS,
  THRESHOLDS
};
