// StallPass Business Dashboard — Analytics Page
const { useState } = React;

const RANGES = ['7 days', '30 days', '90 days'];

// Extend mock data for 30/90 day ranges
const DATA_30 = [210,310,420,380,490,310,520,445,582,400,370,480,510,430,560,390,420,470,530,480,620,540,480,510,570,490,630,550,580,640];
const DATA_90 = Array.from({length:90}, (_,i) => Math.round(180 + Math.sin(i/6)*80 + i*2.4 + Math.random()*60));

function AnalyticsPage() {
  const [range, setRange] = useState('7 days');
  const { analytics } = MOCK_DATA;

  const chartData = range === '7 days'  ? analytics.daily.views
    : range === '30 days' ? DATA_30
    : DATA_90;
  const chartLabels = range === '7 days' ? analytics.daily.labels
    : range === '30 days' ? ['Week 1','Week 2','Week 3','Week 4'].reduce((a,w,i) => { a[Math.floor(i*7.5)] = w; return a; }, Array(30).fill(''))
    : ['Jan','Feb','Mar'].reduce((a,m,i) => { a[Math.floor(i*30)] = m; return a; }, Array(90).fill(''));

  const totalForRange = chartData.reduce((a,b) => a+b, 0);
  const avgForRange = Math.round(totalForRange / chartData.length);

  return (
    <div className="sp-page">
      <SectionHead eyebrow="Analytics" title="Views and guest activity"
        sub="See how people are finding and using your locations in StallPass."
        action={
          <div style={{display:'flex', gap:4, background:'var(--surface-muted)', borderRadius:999, padding:3}}>
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{border:'none', borderRadius:999, padding:'6px 14px', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', transition:'all 160ms ease',
                  background: range === r ? 'var(--surface)' : 'transparent',
                  color: range === r ? 'var(--ink)' : 'var(--ink-muted)',
                  boxShadow: range === r ? 'var(--shadow-xs)' : 'none'}}>
                {r}
              </button>
            ))}
          </div>
        }/>

      {/* Overview stats */}
      <div className="sp-grid-4" style={{marginBottom:24}}>
        <StatCard label="Total views"      value={analytics.overview.totalViews.value.toLocaleString()}    delta={analytics.overview.totalViews.delta}     icon={<IcoEye size={18}/>}   iconBg="var(--brand-soft)"   iconColor="var(--brand)"/>
        <StatCard label="Unique visitors"  value={analytics.overview.uniqueVisits.value.toLocaleString()}  delta={analytics.overview.uniqueVisits.delta}    icon={<IcoUser size={18}/>}  iconBg="var(--success-soft)" iconColor="var(--success)"/>
        <StatCard label="Directions taps"  value={analytics.overview.routeRequests.value.toLocaleString()} delta={analytics.overview.routeRequests.delta}   icon={<IcoArrowRight size={18}/>} iconBg="var(--warning-soft)" iconColor="var(--warning)"/>
        <StatCard label="Average rating"   value={`${analytics.overview.trustScore.value}/5`}              delta={analytics.overview.trustScore.delta}      icon={<IcoStar size={18}/>}  iconBg="rgba(139,92,246,0.1)" iconColor="#7c3aed"/>
      </div>

      {/* Main chart */}
      <Card style={{marginBottom:24}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
          <div>
            <div className="sp-eyebrow">Views over time</div>
            <div style={{fontFamily:'var(--font-head)', fontSize:'1.4rem', fontWeight:800, letterSpacing:'-0.04em', color:'var(--ink)'}}>
              {totalForRange.toLocaleString()} <span style={{fontSize:'0.9rem', fontWeight:500, color:'var(--ink-muted)', letterSpacing:0}}>total · {avgForRange.toLocaleString()} avg/day</span>
            </div>
          </div>
          <Badge tone="success" size="lg">↑ {analytics.overview.totalViews.delta}% vs prior period</Badge>
        </div>
        <AreaChart data={chartData} height={140}
          labels={range === '7 days' ? analytics.daily.labels : undefined}/>
      </Card>

      {/* Per-location breakdown */}
      <SectionHead eyebrow="By location" title="Each location at a glance"/>
      <div className="sp-table-wrap" style={{marginBottom:24}}>
        <table className="sp-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Views</th>
              <th>Directions taps</th>
              <th>Rating</th>
              <th>Trend</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {analytics.byLocation.map(row => (
              <tr key={row.id}>
                <td style={{fontWeight:700, color:'var(--ink)'}}>{row.name}</td>
                <td>{row.views.toLocaleString()}</td>
                <td>{row.routes.toLocaleString()}</td>
                <td>
                  {row.trust
                    ? <span style={{display:'flex', alignItems:'center', gap:5}}>
                        <IcoStar size={13} style={{color:'#f59e0b', fill:'#f59e0b'}}/>
                        {row.trust}
                      </span>
                    : <span style={{color:'var(--ink-muted)'}}>—</span>}
                </td>
                <td><Sparkline data={row.sparkline} color={row.views > 0 ? 'var(--brand)' : 'var(--ink-muted)'} width={80} height={36}/></td>
                <td>
                  <Badge tone={row.views > 0 ? 'success' : 'neutral'}>{row.views > 0 ? 'Live' : 'Pending'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Routes chart */}
      <Card>
        <div style={{marginBottom:16}}>
          <div className="sp-eyebrow">Directions taps</div>
          <div style={{fontFamily:'var(--font-head)', fontSize:'1.1rem', fontWeight:800, letterSpacing:'-0.03em', color:'var(--ink)'}}>
            People opening directions to your locations
          </div>
        </div>
        <AreaChart data={analytics.daily.routes} height={100} color="var(--success)" labels={analytics.daily.labels}/>
        <div style={{display:'flex', gap:24, marginTop:16, paddingTop:16, borderTop:'1px solid var(--surface-strong)'}}>
          <div>
            <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.5rem', letterSpacing:'-0.04em', color:'var(--success)'}}>{analytics.overview.routeRequests.value}</div>
            <div style={{fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)'}}>This week</div>
          </div>
          <div>
            <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.5rem', letterSpacing:'-0.04em', color:'var(--ink)'}}>
              {Math.round(analytics.overview.routeRequests.value / analytics.overview.totalViews.value * 100)}%
            </div>
            <div style={{fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)'}}>Tap rate</div>
          </div>
          <div>
            <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.5rem', letterSpacing:'-0.04em', color:'var(--ink)', display:'flex', alignItems:'center', gap:4}}>
              <span style={{color:'var(--success)', fontSize:'1rem'}}>↑</span>{analytics.overview.routeRequests.delta}%
            </div>
            <div style={{fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)'}}>vs last week</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { AnalyticsPage });
