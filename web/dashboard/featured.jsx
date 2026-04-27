// StallPass Business Dashboard — Featured Placements Page
const { useState } = React;

function FeaturedPage() {
  const [campaigns, setCampaigns] = useState(MOCK_DATA.featured);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  function pauseCampaign(id) {
    setCampaigns(cs => cs.map(c => c.id === id ? {...c, active: false} : c));
    toast('Campaign paused', 'info');
  }

  return (
    <div className="sp-page">
      <SectionHead eyebrow="Featured placements" title="Boost on the map"
        sub="Put your location at the top of the StallPass map for guests nearby. Pay only for the days you run."
        action={<Btn variant="primary" onClick={() => setShowForm(true)}><IcoSpark size={14}/> New campaign</Btn>}/>

      {/* How it works */}
      <div className="sp-grid-3" style={{marginBottom:28}}>
        {[
          { n:'1', title:'Pick a location', sub:'Choose which bathroom to feature on the map.' },
          { n:'2', title:'Set your budget', sub:'Choose daily spend. Most campaigns run at $0.25–$1/day.' },
          { n:'3', title:'Go live instantly', sub:'Your listing appears at the top for nearby guests immediately.' },
        ].map(step => (
          <div key={step.n} style={{padding:'18px 20px', background:'var(--surface)', border:'1px solid var(--surface-strong)', borderRadius:16, boxShadow:'var(--shadow-card)'}}>
            <div style={{width:28, height:28, borderRadius:8, background:'var(--brand)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-head)', fontWeight:800, fontSize:'0.82rem', marginBottom:10}}>{step.n}</div>
            <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)', marginBottom:4}}>{step.title}</div>
            <div style={{fontSize:'0.82rem', color:'var(--ink-soft)', lineHeight:1.5}}>{step.sub}</div>
          </div>
        ))}
      </div>

      {/* Active campaigns */}
      <SectionHead eyebrow="Active campaigns" title="Running now"/>
      {campaigns.filter(c => c.active).length === 0 ? (
        <Card style={{marginBottom:24}}>
          <EmptyState icon={<IcoSpark size={22}/>} title="No active campaigns"
            sub="Boost a location and it will appear at the top of the StallPass map for nearby users."
            action={<Btn variant="primary" onClick={() => setShowForm(true)}><IcoSpark size={14}/> Start a campaign</Btn>}/>
        </Card>
      ) : (
        <div className="sp-stack" style={{marginBottom:24}}>
          {campaigns.filter(c => c.active).map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} onPause={() => pauseCampaign(campaign.id)}/>
          ))}
        </div>
      )}

      {/* Paused */}
      {campaigns.some(c => !c.active) && (
        <>
          <SectionHead eyebrow="Paused" title="Inactive campaigns"/>
          <div className="sp-stack">
            {campaigns.filter(c => !c.active).map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} faded/>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <NewCampaignModal
          onClose={() => setShowForm(false)}
          onSave={(c) => {
            setCampaigns(cs => [c, ...cs]);
            setShowForm(false);
            toast('Campaign launched!', 'success');
          }}/>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onPause, faded }) {
  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : '0.0';
  return (
    <Card style={{opacity: faded ? 0.6 : 1}}>
      <div style={{display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap'}}>
        <div style={{width:44, height:44, borderRadius:12, background:'rgba(139,92,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#7c3aed', flexShrink:0}}>
          <IcoSpark size={20}/>
        </div>
        <div style={{flex:1, minWidth:160}}>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1rem', letterSpacing:'-0.02em', color:'var(--ink)'}}>{campaign.locationName}</div>
          <div style={{fontSize:'0.8rem', color:'var(--ink-soft)', marginTop:2}}>
            {campaign.startDate} → {campaign.endDate} · ${campaign.budget.toFixed(2)}/day
          </div>
        </div>
        <Badge size="lg" tone={campaign.active ? 'success' : 'neutral'}>{campaign.active ? 'Running' : 'Paused'}</Badge>
      </div>

      <div className="sp-grid-3" style={{marginTop:20, paddingTop:16, borderTop:'1px solid var(--surface-strong)', gap:12}}>
        <div style={{textAlign:'center', padding:'12px', background:'var(--surface-muted)', borderRadius:12}}>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.6rem', letterSpacing:'-0.05em', color:'var(--ink)'}}>{campaign.impressions.toLocaleString()}</div>
          <div style={{fontSize:'0.69rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)', marginTop:2}}>Impressions</div>
        </div>
        <div style={{textAlign:'center', padding:'12px', background:'var(--surface-muted)', borderRadius:12}}>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.6rem', letterSpacing:'-0.05em', color:'var(--brand)'}}>{campaign.clicks.toLocaleString()}</div>
          <div style={{fontSize:'0.69rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)', marginTop:2}}>Taps</div>
        </div>
        <div style={{textAlign:'center', padding:'12px', background:'var(--surface-muted)', borderRadius:12}}>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.6rem', letterSpacing:'-0.05em', color:'var(--success)'}}>{ctr}%</div>
          <div style={{fontSize:'0.69rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)', marginTop:2}}>CTR</div>
        </div>
      </div>

      {onPause && campaign.active && (
        <div style={{marginTop:14}}>
          <Btn variant="secondary" size="sm" onClick={onPause}>Pause campaign</Btn>
        </div>
      )}
    </Card>
  );
}

function NewCampaignModal({ onClose, onSave }) {
  const [form, setForm] = useState({ locationId: MOCK_DATA.locations[0]?.id || '', budget:'0.50', days:'14' });
  function set(k,v) { setForm(f => ({...f, [k]: v})); }
  const loc = MOCK_DATA.locations.find(l => l.id === form.locationId);
  const total = (parseFloat(form.budget || 0) * parseInt(form.days || 0)).toFixed(2);

  function submit() {
    const today = new Date();
    const end = new Date(today); end.setDate(end.getDate() + parseInt(form.days));
    onSave({
      id: 'feat-' + Date.now(),
      locationId: form.locationId,
      locationName: loc ? `${loc.businessName} — ${loc.placeName}` : '',
      active: true,
      budget: parseFloat(form.budget),
      impressions: 0, clicks: 0,
      startDate: today.toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}),
      endDate: end.toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}),
    });
  }

  return (
    <Modal title="Launch a campaign" onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit}>Launch campaign</Btn></>}>
      <div style={{display:'grid', gap:16}}>
        <div className="sp-field">
          <label className="sp-label">Location to feature</label>
          <select className="sp-select" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
            {MOCK_DATA.locations.map(l => <option key={l.id} value={l.id}>{l.businessName} — {l.placeName}</option>)}
          </select>
        </div>
        <div className="sp-grid-2">
          <div className="sp-field">
            <label className="sp-label">Daily budget ($)</label>
            <input className="sp-input" type="number" step="0.25" min="0.25" max="10" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0.50"/>
          </div>
          <div className="sp-field">
            <label className="sp-label">Duration (days)</label>
            <input className="sp-input" type="number" min="1" max="90" value={form.days} onChange={e => set('days', e.target.value)} placeholder="14"/>
          </div>
        </div>
        <div style={{background:'var(--brand-50)', border:'1px solid rgba(29,92,242,0.15)', borderRadius:12, padding:'14px 16px'}}>
          <div style={{fontSize:'0.78rem', fontWeight:700, color:'var(--brand)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.08em'}}>Campaign summary</div>
          <div style={{fontSize:'0.9rem', color:'var(--ink)', lineHeight:1.7}}>
            <div>{loc?.placeName} · {form.days} day{form.days !== '1' ? 's' : ''}</div>
            <div><strong>${form.budget}/day</strong> · <strong>${total} total</strong></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { FeaturedPage });
