import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const couponConcurrencyMigration = readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '042_coupon_redemption_concurrency.sql'),
  'utf8'
);

describe('coupon redemption concurrency hardening', () => {
  it('locks the coupon row before validating redemption availability', () => {
    expect(couponConcurrencyMigration).toContain('for update;');
    expect(couponConcurrencyMigration).toContain("if v_coupon.starts_at > v_now then");
    expect(couponConcurrencyMigration).toContain("raise exception 'This coupon is not active yet';");
  });

  it('uses the unique redemption constraint and increments the counter only after insert', () => {
    expect(couponConcurrencyMigration).toContain('when unique_violation then');
    expect(couponConcurrencyMigration).toContain("raise exception 'You have already redeemed this coupon';");
    expect(couponConcurrencyMigration).toContain("current_redemptions = current_redemptions + 1");

    const insertIndex = couponConcurrencyMigration.indexOf('insert into public.coupon_redemptions');
    const updateIndex = couponConcurrencyMigration.indexOf('update public.business_coupons');

    expect(insertIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBeGreaterThan(insertIndex);
  });
});
