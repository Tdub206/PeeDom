// StallPass Business Dashboard - Settings Page
const { useState } = React;

function SettingsPage() {
  const [profile, setProfile] = useState({
    name: MOCK_DATA.business.name,
    email: MOCK_DATA.business.email,
    website: MOCK_DATA.business.website,
  });
  const [notifs, setNotifs] = useState({
    newReview: true,
    claimUpdate: true,
    campaignEnd: true,
    weeklyDigest: false,
    couponRedeem: true,
  });
  const toast = useToast();
  const [showDanger, setShowDanger] = useState(false);

  function saveProfile(e) {
    e.preventDefault();
    toast('Profile saved', 'success');
  }

  function toggleNotif(key) {
    setNotifs((n) => ({ ...n, [key]: !n[key] }));
  }

  return (
    <div className="sp-page">
      <SectionHead eyebrow="Settings" title="Account &amp; preferences" />

      <div style={{ maxWidth: 680, display: 'grid', gap: 20 }}>
        <Card>
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: 'var(--ink)',
              marginBottom: 18,
              letterSpacing: '-0.02em',
            }}
          >
            Business profile
          </div>
          <form onSubmit={saveProfile} style={{ display: 'grid', gap: 14 }}>
            <div className="sp-field">
              <label className="sp-label">Business name</label>
              <input
                className="sp-input"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label">Contact email</label>
              <input
                className="sp-input"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label">Website</label>
              <input
                className="sp-input"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://"
              />
            </div>
            <div>
              <Btn variant="primary" type="submit">
                <IcoCheck size={14} /> Save changes
              </Btn>
            </div>
          </form>
        </Card>

        <Card>
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: 'var(--ink)',
              marginBottom: 4,
              letterSpacing: '-0.02em',
            }}
          >
            Notifications
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: 18 }}>
            Choose which emails you want to get from StallPass.
          </div>
          <div style={{ display: 'grid', gap: 2 }}>
            {[
              {
                key: 'newReview',
                label: 'New guest review',
                sub: 'When someone leaves a review on one of your locations.',
              },
              {
                key: 'claimUpdate',
                label: 'Claim status update',
                sub: 'When your claim is approved or rejected.',
              },
              {
                key: 'campaignEnd',
                label: 'Campaign ending soon',
                sub: '48 hours before a featured campaign ends.',
              },
              {
                key: 'couponRedeem',
                label: 'Coupon redemptions',
                sub: 'Daily summary of coupon activity across your locations.',
              },
              {
                key: 'weeklyDigest',
                label: 'Weekly summary',
                sub: 'Every Monday - views, directions taps, and rating summary.',
              },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 0',
                  borderBottom: '1px solid var(--surface-strong)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                    {item.sub}
                  </div>
                </div>
                <Toggle checked={notifs[item.key]} onChange={() => toggleNotif(item.key)} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: 'var(--ink)',
              marginBottom: 18,
              letterSpacing: '-0.02em',
            }}
          >
            Security
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Password</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Last changed 60 days ago</div>
              </div>
              <Btn variant="secondary" size="sm" onClick={() => toast('Password reset email sent', 'info')}>
                Change password
              </Btn>
            </div>
            <hr className="sp-divider" style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                  Two-factor authentication
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                  Add another layer of protection to your account.
                </div>
              </div>
              <Btn variant="secondary" size="sm" onClick={() => toast('2FA setup coming soon', 'info')}>
                Enable 2FA
              </Btn>
            </div>
          </div>
        </Card>

        <Card style={{ borderColor: 'rgba(192,57,43,0.2)' }}>
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: 'var(--danger)',
              marginBottom: 4,
              letterSpacing: '-0.02em',
            }}
          >
            Danger zone
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: 16 }}>
            These actions are permanent and cannot be undone.
          </div>
          {!showDanger ? (
            <Btn variant="danger" onClick={() => setShowDanger(true)}>
              Delete account
            </Btn>
          ) : (
            <div
              style={{
                padding: '16px',
                background: 'var(--danger-soft)',
                border: '1px solid rgba(192,57,43,0.25)',
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)', marginBottom: 12 }}>
                Are you sure? This will permanently remove your account, claims, coupons, and access codes.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn
                  variant="danger"
                  onClick={() => toast('Check your inbox to confirm account deletion', 'danger')}
                >
                  Yes, delete my account
                </Btn>
                <Btn variant="secondary" onClick={() => setShowDanger(false)}>
                  Cancel
                </Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsPage });
