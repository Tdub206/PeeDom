export type CodeTrustTone = 'high' | 'low' | 'medium' | 'unknown';

export interface CodeTrustSnapshot {
  confidenceScore: number | null;
  downVotes?: number | null;
  lastVerifiedAt?: string | null;
  upVotes?: number | null;
}

export interface CodeTrustSummary {
  approvalRatio: number | null;
  downVotes: number;
  freshnessLabel: string | null;
  isStale: boolean;
  score: number;
  tone: CodeTrustTone;
  toneLabel: string;
  totalVotes: number;
  upVotes: number;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRelativeTimeLabel(date: Date): string {
  const deltaMs = date.getTime() - Date.now();
  const deltaMinutes = Math.round(deltaMs / (60 * 1000));
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  });

  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, 'hour');
  }

  const deltaDays = Math.round(deltaHours / 24);

  if (Math.abs(deltaDays) < 30) {
    return formatter.format(deltaDays, 'day');
  }

  const deltaMonths = Math.round(deltaDays / 30);

  if (Math.abs(deltaMonths) < 12) {
    return formatter.format(deltaMonths, 'month');
  }

  const deltaYears = Math.round(deltaMonths / 12);
  return formatter.format(deltaYears, 'year');
}

export function getCodeTrustSummary(snapshot: CodeTrustSnapshot): CodeTrustSummary {
  const upVotes = Math.max(0, snapshot.upVotes ?? 0);
  const downVotes = Math.max(0, snapshot.downVotes ?? 0);
  const totalVotes = upVotes + downVotes;
  const approvalRatio = totalVotes > 0 ? upVotes / totalVotes : null;
  const fallbackScore = approvalRatio === null ? 0 : approvalRatio * 100;
  const score = clampScore(snapshot.confidenceScore ?? fallbackScore);
  const tone: CodeTrustTone =
    totalVotes === 0 && snapshot.confidenceScore === null
      ? 'unknown'
      : score >= 80
        ? 'high'
        : score >= 55
          ? 'medium'
          : 'low';

  const toneLabel =
    tone === 'high'
      ? 'High trust'
      : tone === 'medium'
        ? 'Mixed trust'
        : tone === 'low'
          ? 'Low trust'
          : 'Trust still building';

  const parsedLastVerifiedAt = snapshot.lastVerifiedAt ? new Date(snapshot.lastVerifiedAt) : null;
  const isValidVerificationDate = Boolean(
    parsedLastVerifiedAt && !Number.isNaN(parsedLastVerifiedAt.getTime())
  );
  const freshnessLabel = isValidVerificationDate
    ? `Verified ${getRelativeTimeLabel(parsedLastVerifiedAt as Date)}`
    : null;
  const staleThresholdMs = 90 * 24 * 60 * 60 * 1000;
  const isStale = Boolean(
    parsedLastVerifiedAt &&
      !Number.isNaN(parsedLastVerifiedAt.getTime()) &&
      Date.now() - parsedLastVerifiedAt.getTime() >= staleThresholdMs
  );

  return {
    approvalRatio,
    downVotes,
    freshnessLabel,
    isStale,
    score,
    tone,
    toneLabel,
    totalVotes,
    upVotes,
  };
}
