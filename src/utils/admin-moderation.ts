import type { AdminClaimListItem, FeaturedRequestListItem } from '@/api/admin';

export type AdminPriority = 'low' | 'medium' | 'high';
export type AdminSignalTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface AdminReviewSignal {
  label: string;
  tone: AdminSignalTone;
}

export interface ClaimModerationAssessment {
  score: number;
  priority: AdminPriority;
  summary: string;
  signals: AdminReviewSignal[];
}

export interface FeaturedRequestAssessment {
  score: number;
  priority: AdminPriority;
  summary: string;
  signals: AdminReviewSignal[];
}

export interface AdminQueueSummary {
  pending_claims: number;
  high_risk_claims: number;
  claims_missing_evidence: number;
  aging_claims: number;
  pending_featured_requests: number;
  high_priority_featured_requests: number;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
}

function getTokenOverlap(leftValue: string, rightValue: string): number {
  const leftTokens = new Set(normalizeText(leftValue).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeText(rightValue).split(' ').filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let matches = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  });

  return matches / Math.max(leftTokens.size, rightTokens.size);
}

function getDaysSince(value: string): number | null {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
}

function getEmailDomain(email: string | null): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }

  return email.split('@')[1]?.trim().toLowerCase() ?? null;
}

function getHostname(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch (_error) {
    return null;
  }
}

function isGenericMailbox(domain: string | null): boolean {
  if (!domain) {
    return false;
  }

  return ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domain);
}

function toPriority(score: number): AdminPriority {
  if (score >= 45) {
    return 'high';
  }

  if (score >= 20) {
    return 'medium';
  }

  return 'low';
}

export function assessClaimModerationRisk(claim: AdminClaimListItem): ClaimModerationAssessment {
  let score = 0;
  const signals: AdminReviewSignal[] = [];
  const claimantEmail = claim.claimant_email ?? claim.contact_email;
  const emailDomain = getEmailDomain(claimantEmail);
  const evidenceHost = getHostname(claim.evidence_url);
  const ageDays = getDaysSince(claim.created_at);
  const overlapScore = getTokenOverlap(claim.business_name, `${claim.place_name} ${claim.address}`);

  if (claim.evidence_url) {
    signals.push({
      label: 'Evidence attached',
      tone: 'positive',
    });
  } else {
    score += 30;
    signals.push({
      label: 'No evidence attached',
      tone: 'critical',
    });
  }

  if (claim.contact_phone) {
    signals.push({
      label: 'Phone contact included',
      tone: 'positive',
    });
  } else {
    score += 10;
    signals.push({
      label: 'No direct phone contact',
      tone: 'warning',
    });
  }

  if (!claim.claimant_display_name) {
    score += 8;
    signals.push({
      label: 'Claimant display name missing',
      tone: 'warning',
    });
  }

  if (isGenericMailbox(emailDomain)) {
    score += 8;
    signals.push({
      label: 'Generic mailbox used',
      tone: 'warning',
    });
  }

  if (overlapScore < 0.2) {
    score += 18;
    signals.push({
      label: 'Business name does not closely match the location',
      tone: 'critical',
    });
  }

  if (evidenceHost && emailDomain && evidenceHost.includes(emailDomain.split('.')[0] ?? '')) {
    score = Math.max(0, score - 10);
    signals.push({
      label: 'Evidence host aligns with claimant email domain',
      tone: 'positive',
    });
  }

  if (typeof ageDays === 'number' && ageDays >= 7) {
    score += 6;
    signals.push({
      label: `${ageDays} day${ageDays === 1 ? '' : 's'} in queue`,
      tone: 'warning',
    });
  }

  const priority = toPriority(score);
  const summary =
    priority === 'high'
      ? 'High-friction claim. Review supporting evidence before approving.'
      : priority === 'medium'
        ? 'Moderate review risk. Check business identity and supporting context.'
        : 'Low-friction claim with enough context for routine review.';

  return {
    score,
    priority,
    summary,
    signals,
  };
}

export function formatFeaturedScope(scope: Record<string, unknown>): string {
  const city = typeof scope.city === 'string' ? scope.city : null;
  const state = typeof scope.state === 'string' ? scope.state : null;
  const radiusKm = typeof scope.radius_km === 'number' ? scope.radius_km : null;

  if (city || state) {
    const locationLabel = [city, state].filter(Boolean).join(', ');
    return radiusKm ? `${locationLabel} within ${radiusKm} km` : locationLabel;
  }

  if (radiusKm) {
    return `${radiusKm} km radius`;
  }

  return 'No geographic scope provided';
}

export function assessFeaturedRequestPriority(
  request: FeaturedRequestListItem
): FeaturedRequestAssessment {
  let score = 0;
  const signals: AdminReviewSignal[] = [];
  const scopeLabel = formatFeaturedScope(request.geographic_scope);

  if (request.placement_type === 'map_priority') {
    score += 15;
    signals.push({
      label: 'Map priority inventory',
      tone: 'warning',
    });
  }

  if (request.requested_duration_days >= 90) {
    score += 18;
    signals.push({
      label: 'Long campaign request',
      tone: 'warning',
    });
  } else if (request.requested_duration_days >= 30) {
    score += 8;
    signals.push({
      label: 'Multi-week campaign',
      tone: 'neutral',
    });
  }

  if (scopeLabel === 'No geographic scope provided') {
    score += 12;
    signals.push({
      label: 'Scope needs clarification',
      tone: 'critical',
    });
  } else {
    signals.push({
      label: scopeLabel,
      tone: 'positive',
    });
  }

  if (!request.place_name) {
    score += 8;
    signals.push({
      label: 'Bathroom context missing',
      tone: 'warning',
    });
  }

  const priority = toPriority(score);
  const summary =
    priority === 'high'
      ? 'High-priority featured request. Validate scope and duration before approval.'
      : priority === 'medium'
        ? 'Review the requested scope and placement terms before scheduling.'
        : 'Low-friction request that is ready for routine review.';

  return {
    score,
    priority,
    summary,
    signals,
  };
}

export function summarizeAdminQueue(
  claims: AdminClaimListItem[],
  featuredRequests: FeaturedRequestListItem[]
): AdminQueueSummary {
  const pendingClaims = claims.filter((claim) => claim.review_status === 'pending');
  const pendingFeaturedRequests = featuredRequests.filter((request) => request.status === 'pending');

  return {
    pending_claims: pendingClaims.length,
    high_risk_claims: pendingClaims.filter((claim) => assessClaimModerationRisk(claim).priority === 'high').length,
    claims_missing_evidence: pendingClaims.filter((claim) => !claim.evidence_url).length,
    aging_claims: pendingClaims.filter((claim) => {
      const ageDays = getDaysSince(claim.created_at);
      return typeof ageDays === 'number' && ageDays >= 7;
    }).length,
    pending_featured_requests: pendingFeaturedRequests.length,
    high_priority_featured_requests: pendingFeaturedRequests.filter(
      (request) => assessFeaturedRequestPriority(request).priority === 'high'
    ).length,
  };
}
