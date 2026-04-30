// StallPass Business Dashboard — Hub Page
const { useState } = React;

const ACTIVITY = [
  { text: 'Coupon STALL10 redeemed 3 times today', time: '2 hours ago', dot: 'var(--brand)' },
  { text: 'Featured campaign started — Downtown', time: '4 hours ago', dot: 'var(--success)' },
  { text: 'New route request from the Downtown location', time: '6 hours ago', dot: 'var(--brand)' },
  { text: 'SoHo claim submitted for review', time: '3 days ago', dot: 'var(--warning)' },
  { text: 'Midtown listing verified and live', time: '5 days ago', dot: 'var(--success)' },
];

function HubPage({ setPage }) {
  const { analytics, locations, coupons, claims } = MOCK_DATA;
  const activeCoupons = coupons.filter(c => c.active).length;
  const pendingClaims = claims.filter(c => c.status === 'pending').length;

  return (
    <div className="sp-page">
      {/* Hero */}
      <div className="sp-hero" style={{marginBottom: 28}}>
        <div className="sp-hero-kicker">Business dashboard</div>
        <h1>
          {locations.length === 0
            ? `Welcome to StallPass Business`
            : `${locations.length} location${locations.length === 1 ? '' : 's'} under management`}
        </h1>
        <p>
          Changes you make here show up in the StallPass app, so customers see updated details quickly.
        </p>
        <div style={{display:'flex', gap:10, marginTop:18, flexWrap:'wrap'}}>
          <Btn variant="secondary" style={{background:'rgba(255,255,255,0.18)', color:'#fff', border:'1px solid rgba(255,255,255,0.25)', backdropFilter:'blur(8px)'}}
            onClick={() => setPage('locations')}>
            <IcoBuilding size={15}/> Manage locations
          </Btn>
          <Btn variant="secondary" style={{background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', backdropFilter:'blur(8px)'}}
            onClick={() => setPage('analytics')}>
            <IcoChart size={15}/> View analytics
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="sp-grid-4" style={{marginBottom:28}}>
        <StatCard label="Locations" value={locations.length}
          icon={<IcoBuilding size={18}/>} iconBg="var(--brand-soft)" iconColor="var(--brand)"/>
        <StatCard label="Weekly reach" value={analytics.overview.totalViews.value.toLocaleString()}
          delta={analytics.overview.totalViews.delta}
          icon={<IcoTrend size={18}/>} iconBg="var(--success-soft)" iconColor="var(--success)"/>
        <StatCard label="Active coupons" value={activeCoupons}
          icon={<IcoTag size={18}/>} iconBg="var(--warning-soft)" iconColor="var(--warning)"/>
        <StatCard label="Pending claims" value={pendingClaims}
          icon={<IcoFile size={18}/>}
          iconBg={pendingClaims > 0 ? 'var(--danger-soft)' : 'var(--surface-muted)'}
          iconColor={pendingClaims > 0 ? 'var(--danger)' : 'var(--ink-muted)'}/>
      </div>

      <div className="sp-grid-2" style={{gap: 24, marginBottom: 28}}>
        {/* Quick actions */}
        <div>
          <SectionHead eyebrow="Quick actions" title="Jump straight in"/>
          <div className="sp-grid-2" style={{gap:12}}>
            {[
              { id:'locations', icon:<IcoBuilding size={20}/>, title:'Locations', sub:'Hours, access, and details', bg:'var(--brand-soft)', color:'var(--brand)' },
              { id:'coupons',   icon:<IcoTag size={20}/>,     title:'Coupons',   sub:'Create and manage offers', bg:'var(--success-soft)', color:'var(--success)' },
              { id:'codes',     icon:<IcoKey size={20}/>,     title:'Access Codes', sub:'Set or change entry codes', bg:'var(--warning-soft)', color:'var(--warning)' },
              { id:'featured',  icon:<IcoSpark size={20}/>,   title:'Featured',  sub:'Boost on the map', bg:'rgba(139,92,246,0.1)', color:'#7c3aed' },
            ].map(a => (
              <button key={a.id} className="sp-action-tile" onClick={() => setPage(a.id)}>
                <div className="sp-action-tile-icon" style={{background: a.bg, color: a.color}}>
                  {a.icon}
                </div>
                <div className="sp-action-tile-title">{a.title}</div>
                <div className="sp-action-tile-sub">{a.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <SectionHead eyebrow="Activity" title="Recent updates"/>
          <Card style={{padding:'8px 20px'}}>
            {ACTIVITY.map((a, i) => (
              <div key={i} className="sp-activity">
                <div style={{width:8, height:8, borderRadius:'50%', background: a.dot, marginTop:6, flexShrink:0}}/>
                <div>
                  <div className="sp-activity-text">{a.text}</div>
                  <div className="sp-activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Location list overview */}
      <SectionHead eyebrow="Your locations" title="All of your managed bathrooms"
        action={<Btn variant="primary" size="sm" onClick={() => setPage('claims')}><IcoPlus size={14}/> Add location</Btn>}/>
      <div className="sp-stack">
        {MOCK_DATA.locations.map(loc => (
          <Card key={loc.id} clickable onClick={() => setPage('locations')}>
            <div className="sp-loc-card">
              <div className="sp-loc-icon"><IcoBuilding size={20}/></div>
              <div className="sp-loc-info">
                <div className="sp-loc-name">{loc.businessName}</div>
                <div className="sp-loc-place">{loc.placeName}</div>
                <div className="sp-loc-address">{loc.address}</div>
                <div className="sp-loc-chips">
                  <Badge tone={loc.verified ? 'success' : 'warning'}>{loc.verified ? 'Verified' : 'Pending verification'}</Badge>
                  <Badge tone={loc.visibleOnMap ? 'brand' : 'neutral'}>{loc.visibleOnMap ? 'Live on map' : 'Hidden'}</Badge>
                  <Badge tone={loc.premiumAccess ? 'warning' : 'neutral'}>{loc.premiumAccess ? 'Premium only' : 'Public'}</Badge>
                </div>
              </div>
              <div style={{textAlign:'right', flexShrink:0}}>
                <div style={{fontSize:'1.4rem', fontFamily:'var(--font-head)', fontWeight:800, letterSpacing:'-0.04em', color:'var(--ink)'}}>{loc.impressions.toLocaleString()}</div>
                <div style={{fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-muted)'}}>impressions</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HubPage });
