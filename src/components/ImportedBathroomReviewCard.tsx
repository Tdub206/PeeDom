import { memo } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { BathroomOriginBadge } from '@/components/BathroomOriginBadge';
import type { SourceFreshnessStatus } from '@/types';

interface ImportedBathroomReviewCardProps {
  confirmationCount: number;
  denialCount: number;
  freshnessStatus: SourceFreshnessStatus | null | undefined;
  isConfirmingCurrent?: boolean;
  isReportingMissing?: boolean;
  lastVerifiedAt: string | null | undefined;
  onConfirmCurrent?: () => void;
  onReportMissing?: () => void;
  badgeLabel?: string;
  title?: string;
  promotionHint?: string | null;
}

function getFreshnessHeadline(status: SourceFreshnessStatus | null | undefined): string {
  switch (status) {
    case 'fresh':
      return 'Community recently confirmed this imported location.';
    case 'aging':
      return 'This imported location needs a fresh visit.';
    case 'disputed':
      return 'Recent existence checks disagree.';
    case 'likely_removed':
      return 'Recent checks suggest this restroom may be gone.';
    case 'unreviewed':
    default:
      return 'Help confirm this imported bathroom is still real.';
  }
}

function getFreshnessBody(status: SourceFreshnessStatus | null | undefined): string {
  switch (status) {
    case 'fresh':
      return 'Keep the confirmation current so stale import data does not age out unnoticed.';
    case 'aging':
      return 'A quick yes or no keeps this listing from drifting into stale imported data.';
    case 'disputed':
      return 'One more recent visit can help break the tie between "still here" and "gone" reports.';
    case 'likely_removed':
      return 'If the restroom is gone, confirm that so it can be reviewed fast. If it is still there, say so now.';
    case 'unreviewed':
    default:
      return 'This listing came from a public dataset. If you visited, a quick confirmation helps keep it on the map. If the restroom is gone, flag it now so stale data gets reviewed fast.';
  }
}

function formatLastVerifiedAt(lastVerifiedAt: string | null | undefined): string | null {
  if (!lastVerifiedAt) {
    return null;
  }

  const parsedDate = new Date(lastVerifiedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleString();
}

function ImportedBathroomReviewCardComponent({
  confirmationCount,
  denialCount,
  freshnessStatus,
  isConfirmingCurrent = false,
  isReportingMissing = false,
  lastVerifiedAt,
  onConfirmCurrent,
  onReportMissing,
  badgeLabel = 'OSM Import',
  title = 'Imported Location Review',
  promotionHint = null,
}: ImportedBathroomReviewCardProps) {
  const formattedLastVerifiedAt = formatLastVerifiedAt(lastVerifiedAt);
  const showActions = Boolean(onConfirmCurrent && onReportMissing);

  return (
    <View className="mt-6 rounded-[32px] border border-brand-200 bg-brand-50 p-6">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-brand-700">{title}</Text>
        <BathroomOriginBadge label={badgeLabel} />
      </View>

      <Text className="mt-3 text-2xl font-bold text-ink-900">{getFreshnessHeadline(freshnessStatus)}</Text>
      <Text className="mt-2 text-base leading-6 text-ink-700">
        {getFreshnessBody(freshnessStatus)}
      </Text>

      <View className="mt-4 rounded-2xl bg-white/70 px-4 py-4">
        <Text className="text-sm font-semibold text-brand-900">
          {confirmationCount} confirm{confirmationCount === 1 ? '' : 's'} - {denialCount} removal report
          {denialCount === 1 ? '' : 's'}
        </Text>
        <Text className="mt-1 text-sm text-brand-700">
          {formattedLastVerifiedAt ? `Last existence check: ${formattedLastVerifiedAt}` : 'No completed checks yet'}
        </Text>
      </View>

      {promotionHint ? (
        <Text className="mt-4 text-sm leading-6 text-brand-700">{promotionHint}</Text>
      ) : null}

      {showActions ? (
        <View className="mt-5 gap-3">
          <Button
            label="Still Here"
            loading={isConfirmingCurrent}
            disabled={isReportingMissing}
            onPress={onConfirmCurrent}
          />
          <Button
            label="No Restroom Here"
            variant="destructive"
            loading={isReportingMissing}
            disabled={isConfirmingCurrent}
            onPress={onReportMissing}
          />
        </View>
      ) : null}
    </View>
  );
}

export const ImportedBathroomReviewCard = memo(ImportedBathroomReviewCardComponent);
