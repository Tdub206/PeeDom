// StallPass Business Dashboard - Access Codes Page
const { useState } = React;

function AccessCodesPage() {
  const [codes, setCodes] = useState(
    MOCK_DATA.locations.map((loc) => ({
      locationId: loc.id,
      businessName: loc.businessName,
      placeName: loc.placeName,
      requiresCode: loc.requiresCode,
      code: loc.code,
      codeLastChanged: loc.codeLastChanged,
      visible: false,
    }))
  );
  const [rotating, setRotating] = useState(null);
  const [newCode, setNewCode] = useState('');
  const toast = useToast();

  function toggleVisible(id) {
    setCodes((cs) => cs.map((c) => (c.locationId === id ? { ...c, visible: !c.visible } : c)));
  }

  function rotateCode(id) {
    setRotating(id);
    setNewCode('');
  }

  function confirmRotate(id) {
    if (!newCode || newCode.length < 4) return;
    setCodes((cs) =>
      cs.map((c) =>
        c.locationId === id ? { ...c, code: newCode, codeLastChanged: 'just now', visible: false } : c
      )
    );
    setRotating(null);
    setNewCode('');
    toast('Access code updated', 'success');
  }

  function toggleRequired(id) {
    setCodes((cs) => cs.map((c) => (c.locationId === id ? { ...c, requiresCode: !c.requiresCode } : c)));
    toast('Access policy updated', 'info');
  }

  return (
    <div className="sp-page">
      <SectionHead
        eyebrow="Access codes"
        title="Door &amp; entry codes"
        sub="Manage who can enter each location. Codes are only shown inside the StallPass app."
      />

      <div
        style={{
          background: 'var(--brand-50)',
          border: '1px solid rgba(29,92,242,0.15)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 28,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <IcoLock size={16} style={{ color: 'var(--brand)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.86rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink)' }}>Codes stay private.</strong> Only approved StallPass users in the
          app can see entry codes for your locations. They are not shown publicly.
        </div>
      </div>

      <div className="sp-stack">
        {codes.map((loc) => (
          <Card key={loc.locationId}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand)',
                    flexShrink: 0,
                  }}
                >
                  <IcoBuilding size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-head)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      letterSpacing: '-0.02em',
                      color: 'var(--ink)',
                    }}
                  >
                    {loc.businessName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{loc.placeName}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)' }}>Code required</span>
                <Toggle checked={loc.requiresCode} onChange={() => toggleRequired(loc.locationId)} />
              </div>
            </div>

            {loc.requiresCode && (
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--surface-strong)' }}>
                {rotating === loc.locationId ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="sp-input"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="New 4-8 digit code"
                      maxLength={8}
                      style={{
                        maxWidth: 180,
                        fontFamily: 'var(--font-head)',
                        letterSpacing: '0.18em',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                      }}
                      autoFocus
                    />
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => confirmRotate(loc.locationId)}
                      disabled={newCode.length < 4}
                    >
                      <IcoCheck size={14} /> Save code
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setRotating(null)}>
                      Cancel
                    </Btn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        background: 'var(--surface-muted)',
                        borderRadius: 10,
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-head)',
                          fontWeight: 800,
                          fontSize: '1.4rem',
                          letterSpacing: '0.24em',
                          color: loc.visible ? 'var(--ink)' : 'var(--ink-muted)',
                        }}
                      >
                        {loc.code ? (loc.visible ? loc.code : '****') : '-'}
                      </span>
                      {loc.code && (
                        <button
                          className="sp-btn sp-btn-ghost sp-btn-sm"
                          onClick={() => toggleVisible(loc.locationId)}
                          style={{ padding: '4px 6px' }}
                        >
                          {loc.visible ? <IcoEyeOff size={15} /> : <IcoEye size={15} />}
                        </button>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
                        {loc.codeLastChanged ? `Changed ${loc.codeLastChanged}` : 'No code set'}
                      </div>
                    </div>
                    <Btn variant="secondary" size="sm" onClick={() => rotateCode(loc.locationId)}>
                      <IcoRefresh size={13} /> {loc.code ? 'Change code' : 'Set code'}
                    </Btn>
                    {loc.code && loc.visible && (
                      <Btn variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(loc.code)}>
                        <IcoFile size={13} /> Copy
                      </Btn>
                    )}
                  </div>
                )}
              </div>
            )}

            {!loc.requiresCode && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: 'var(--success-soft)',
                  borderRadius: 10,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <IcoCheck size={14} /> Open access - no code needed
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { AccessCodesPage });
