// StallPass Business Dashboard — App Root
const { useState, useEffect } = React;

const PAGE_TITLES = {
  hub: 'Overview', locations: 'Locations', analytics: 'Analytics',
  coupons: 'Coupons', codes: 'Access Codes', featured: 'Featured',
  claims: 'Claim History', settings: 'Settings',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#1d5cf2",
  "density": "comfortable",
  "sidebarVariant": "light"
}/*EDITMODE-END*/;

function App() {
  const [page, setPage] = useState(() => localStorage.getItem('sp-biz-page') || 'hub');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = 3;

  useEffect(() => {
    localStorage.setItem('sp-biz-page', page);
    setDrawerOpen(false);
  }, [page]);

  // Tweaks protocol
  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === '__activate_edit_mode')   setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksVisible(false);
    }
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function applyTweak(key, value) {
    const next = {...tweaks, [key]: value};
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
  }

  // Apply accent color via CSS var
  useEffect(() => {
    const root = document.documentElement;
    const c = tweaks.accentColor;
    root.style.setProperty('--brand', c);
    // Derive strong variant (slightly darker)
    root.style.setProperty('--brand-strong', c);
    root.style.setProperty('--brand-soft', c.replace('#', 'rgba(') === c ? c : `${hexToRgba(c, 0.09)}`);
    root.style.setProperty('--brand-50', `${hexToRgba(c, 0.06)}`);
  }, [tweaks.accentColor]);

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const PAGES = { hub: HubPage, locations: LocationsPage, analytics: AnalyticsPage, coupons: CouponsPage, codes: AccessCodesPage, featured: FeaturedPage, claims: ClaimsPage, settings: SettingsPage };
  const PageComponent = PAGES[page] || HubPage;

  const ACCENT_OPTIONS = [
    { color:'#1d5cf2', label:'Signal blue' },
    { color:'#18725a', label:'Forest green' },
    { color:'#7c3aed', label:'Violet' },
    { color:'#dc2626', label:'Coral red' },
  ];

  return (
    <ToastProvider>
      <div className="sp-layout">
        <Sidebar page={page} setPage={setPage} open={drawerOpen} onClose={() => setDrawerOpen(false)}/>

        <div className="sp-main">
          {/* Topbar */}
          <div className="sp-topbar">
            <button className="sp-hamburger" onClick={() => setDrawerOpen(o => !o)} aria-label="Open menu">
              <IcoMenu size={20}/>
            </button>
            <span className="sp-topbar-title">{PAGE_TITLES[page]}</span>
            <div className="sp-topbar-gap"/>
            <div className="sp-topbar-actions">
              {/* AI assistant button */}
              <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => { setShowAI(a => !a); setShowNotifs(false); }}
                title="StallPass AI" style={{gap:6, color: showAI ? 'var(--brand)' : undefined}}>
                <IcoSpark size={16}/> <span style={{fontSize:'0.78rem', fontWeight:700}}>AI</span>
              </button>
              {/* Notifications */}
              <button className="sp-btn sp-btn-ghost sp-btn-sm" title="Notifications"
                onClick={() => { setShowNotifs(n => !n); setShowAI(false); }}
                style={{position:'relative', color: showNotifs ? 'var(--brand)' : undefined}}>
                <IcoBell size={16}/>
                {unreadCount > 0 && !showNotifs && (
                  <span style={{position:'absolute', top:2, right:2, width:8, height:8, borderRadius:'50%', background:'var(--brand)', border:'2px solid var(--bg)'}}/>
                )}
              </button>
              <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => setPage('settings')} title="Settings"><IcoSettings size={16}/></button>
              <div style={{width:1, height:22, background:'var(--surface-strong)', margin:'0 4px'}}/>
              <div style={{width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg, var(--brand), var(--brand-strong))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'var(--font-head)', fontWeight:800, fontSize:'0.72rem'}}>
                CC
              </div>
            </div>
          </div>

          {/* Page */}
          <PageComponent setPage={setPage}/>
        </div>

        {/* Slide-out panels */}
        {showAI     && <AIPanel    onClose={() => setShowAI(false)}/>}
        {showNotifs && <NotifPanel onClose={() => setShowNotifs(false)}/>}

        {/* Tweaks panel */}
        {tweaksVisible && (
          <div className="sp-tweaks">
            <div className="sp-tweaks-title">Tweaks</div>

            <div className="sp-tweaks-row">
              <span className="sp-tweaks-label">Accent color</span>
              <div className="sp-tweak-swatches">
                {ACCENT_OPTIONS.map(o => (
                  <div key={o.color} className={`sp-swatch${tweaks.accentColor === o.color ? ' active' : ''}`}
                    style={{background: o.color}} title={o.label}
                    onClick={() => applyTweak('accentColor', o.color)}/>
                ))}
              </div>
            </div>

            <div className="sp-tweaks-row">
              <span className="sp-tweaks-label">Density</span>
              <div style={{display:'flex', gap:4}}>
                {['comfortable','compact'].map(d => (
                  <button key={d} onClick={() => applyTweak('density', d)}
                    style={{fontSize:'0.72rem', fontWeight:700, padding:'4px 10px', borderRadius:999, border:'1px solid var(--surface-strong)', cursor:'pointer',
                      background: tweaks.density === d ? 'var(--brand)' : 'transparent',
                      color: tweaks.density === d ? '#fff' : 'var(--ink-soft)'}}>
                    {d === 'comfortable' ? 'Cozy' : 'Compact'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
