import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

import type { Database } from '@/types';

const reportModerationMigration = readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '003_bathroom_report_moderation.sql'),
  'utf8'
);

describe('bathroom report moderation migration', () => {
  it('extends bathroom moderation status with unverified', () => {
    const moderationStatus: Database['public']['Tables']['bathrooms']['Row']['moderation_status'] = 'unverified';

    expect(moderationStatus).toBe('unverified');
    expect(reportModerationMigration).toContain(
      "moderation_status in ('active', 'flagged', 'hidden', 'deleted', 'unverified')"
    );
  });

  it('escalates active bathrooms after repeated recent closed reports', () => {
    expect(reportModerationMigration).toContain("closed_report_count > 3");
    expect(reportModerationMigration).toContain("report_type = 'closed'");
    expect(reportModerationMigration).toContain("status in ('open', 'reviewing')");
    expect(reportModerationMigration).toContain("created_at >= now() - interval '24 hours'");
    expect(reportModerationMigration).toContain("moderation_status = 'unverified'");
    expect(reportModerationMigration).toContain("and moderation_status = 'active'");
  });
});
