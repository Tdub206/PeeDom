// StallPass Business Dashboard — Coupons Page
const { useState } = React;

const TYPE_LABELS = { percent_off:'% Off', dollar_off:'$ Off', bogo:'BOGO', free_item:'Free item', custom:'Custom' };

function CouponsPage() {
  const [coupons, setCoupons] = useState(MOCK_DATA.coupons);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  function deactivate(id) {
    setCoupons(cs => cs.map(c => c.id === id ? {...c, active: false} : c));
    toast('Coupon deactivated', 'info');
  }

  return (
    <div className="sp-page">
      <SectionHead eyebrow="Coupons" title="Discounts &amp; offers"
        sub="Create and manage the coupons that appear inside StallPass for guests at your locations."
        action={<Btn variant="primary" onClick={() => setShowForm(true)}><IcoPlus size={14}/> New coupon</Btn>}/>

      {/* Active */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:12}}>
          Active · {coupons.filter(c => c.active).length}
        </div>
        <div className="sp-grid-2">
          {coupons.filter(c => c.active).map(c => (
            <CouponCard key={c.id} coupon={c} onDeactivate={() => deactivate(c.id)}/>
          ))}
        </div>
        {coupons.filter(c => c.active).length === 0 && (
          <Card><EmptyState icon={<IcoTicket size={22}/>} title="No active coupons"
            sub="Create your first offer and it will appear to StallPass guests visiting your locations."
            action={<Btn variant="primary" onClick={() => setShowForm(true)}><IcoPlus size={14}/> Create coupon</Btn>}/></Card>
        )}
      </div>

      {/* Inactive / expired */}
      {coupons.some(c => !c.active) && (
        <div>
          <div style={{fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:12}}>
            Inactive / expired · {coupons.filter(c => !c.active).length}
          </div>
          <div className="sp-grid-2">
            {coupons.filter(c => !c.active).map(c => (
              <CouponCard key={c.id} coupon={c} faded/>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <CreateCouponModal
          onClose={() => setShowForm(false)}
          onSave={(newCoupon) => {
            setCoupons(cs => [newCoupon, ...cs]);
            setShowForm(false);
            toast('Coupon created and live!', 'success');
          }}/>
      )}
    </div>
  );
}

function CouponCard({ coupon, onDeactivate, faded }) {
  const loc = MOCK_DATA.locations.find(l => l.id === coupon.locationId);
  const pct = coupon.maxRedemptions ? Math.round((coupon.redemptions / coupon.maxRedemptions) * 100) : null;
  return (
    <Card style={{opacity: faded ? 0.6 : 1}}>
      <div style={{display:'flex', alignItems:'flex-start', gap:14, marginBottom:16}}>
        <div style={{width:44, height:44, borderRadius:12, background:'var(--brand-50)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--brand)', flexShrink:0}}>
          <IcoTicket size={20}/>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:'0.69rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--brand)', marginBottom:2}}>
            {TYPE_LABELS[coupon.type]}
            {coupon.value != null && coupon.type === 'percent_off' ? ` · ${coupon.value}%` : ''}
            {coupon.value != null && coupon.type === 'dollar_off'  ? ` · $${coupon.value}` : ''}
          </div>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.05rem', letterSpacing:'-0.02em', color:'var(--ink)', marginBottom:2}}>{coupon.title}</div>
          {coupon.description && <div style={{fontSize:'0.82rem', color:'var(--ink-soft)'}}>{coupon.description}</div>}
          {loc && <div style={{fontSize:'0.76rem', fontWeight:600, color:'var(--ink-muted)', marginTop:4}}>{loc.placeName}</div>}
        </div>
        <Badge tone={coupon.active ? 'success' : 'neutral'} size="lg">{coupon.active ? 'Active' : 'Inactive'}</Badge>
      </div>

      {/* Code */}
      <div style={{background:'var(--surface-muted)', borderRadius:10, padding:'10px 14px', fontFamily:'var(--font-head)', fontWeight:800, letterSpacing:'0.14em', fontSize:'0.95rem', color:'var(--ink)', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        {coupon.code}
        <Btn variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(coupon.code)}><IcoFile size={13}/> Copy</Btn>
      </div>

      {/* Progress */}
      {pct !== null && (
        <div style={{marginBottom:14}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.76rem', fontWeight:600, color:'var(--ink-muted)', marginBottom:5}}>
            <span>{coupon.redemptions} redeemed</span>
            <span>{coupon.maxRedemptions} max</span>
          </div>
          <div style={{height:6, background:'var(--surface-strong)', borderRadius:999, overflow:'hidden'}}>
            <div style={{height:'100%', width:`${pct}%`, background: pct > 80 ? 'var(--warning)' : 'var(--brand)', borderRadius:'inherit', transition:'width 600ms ease'}}/>
          </div>
        </div>
      )}

      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:14}}>
        {coupon.premiumOnly && <Badge tone="brand">Premium only</Badge>}
        {coupon.minPurchase  && <Badge tone="neutral">Min ${coupon.minPurchase} purchase</Badge>}
        <Badge tone="neutral">Starts {coupon.startsAt}</Badge>
        {coupon.expiresAt && <Badge tone="neutral">Expires {coupon.expiresAt}</Badge>}
      </div>

      {onDeactivate && coupon.active && (
        <Btn variant="danger" size="sm" onClick={onDeactivate}><IcoX size={13}/> Deactivate</Btn>
      )}
    </Card>
  );
}

function CreateCouponModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title:'', description:'', type:'percent_off', value:'', code:'', locationId: MOCK_DATA.locations[0]?.id || '', premiumOnly: false, maxRedemptions:'', expiresAt:'' });
  function set(k, v) { setForm(f => ({...f, [k]: v})); }
  function submit(e) {
    e.preventDefault();
    if (!form.title || !form.code) return;
    onSave({
      id: 'cpn-' + Date.now(),
      title: form.title, description: form.description,
      type: form.type, value: form.value ? Number(form.value) : null,
      code: form.code.toUpperCase(), locationId: form.locationId,
      active: true, premiumOnly: form.premiumOnly,
      redemptions: 0, maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      startsAt: new Date().toISOString().slice(0,10),
      expiresAt: form.expiresAt || null, minPurchase: null,
    });
  }
  return (
    <Modal title="Create a coupon" onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} type="submit">Create &amp; publish</Btn></>}>
      <form onSubmit={submit} style={{display:'grid', gap:16}}>
        <div className="sp-field">
          <label className="sp-label">Coupon title</label>
          <input className="sp-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 10% Off Any Drink" required/>
        </div>
        <div className="sp-field">
          <label className="sp-label">Description (optional)</label>
          <input className="sp-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short guest-facing description"/>
        </div>
        <div className="sp-grid-2">
          <div className="sp-field">
            <label className="sp-label">Offer type</label>
            <select className="sp-select" value={form.type} onChange={e => set('type', e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {(form.type === 'percent_off' || form.type === 'dollar_off') && (
            <div className="sp-field">
              <label className="sp-label">{form.type === 'percent_off' ? 'Percent off' : 'Dollar amount'}</label>
              <input className="sp-input" type="number" min="1" value={form.value} onChange={e => set('value', e.target.value)} placeholder={form.type === 'percent_off' ? '10' : '5'}/>
            </div>
          )}
        </div>
        <div className="sp-grid-2">
          <div className="sp-field">
            <label className="sp-label">Coupon code</label>
            <input className="sp-input" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="MYCODE" required style={{fontFamily:'var(--font-head)', letterSpacing:'0.1em'}}/>
          </div>
          <div className="sp-field">
            <label className="sp-label">Max redemptions</label>
            <input className="sp-input" type="number" min="1" value={form.maxRedemptions} onChange={e => set('maxRedemptions', e.target.value)} placeholder="Unlimited"/>
          </div>
        </div>
        <div className="sp-grid-2">
          <div className="sp-field">
            <label className="sp-label">Location</label>
            <select className="sp-select" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
              {MOCK_DATA.locations.map(l => <option key={l.id} value={l.id}>{l.placeName}</option>)}
            </select>
          </div>
          <div className="sp-field">
            <label className="sp-label">Expiry date</label>
            <input className="sp-input" type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)}/>
          </div>
        </div>
        <label style={{display:'flex', alignItems:'center', gap:12, cursor:'pointer'}}>
          <input type="checkbox" checked={form.premiumOnly} onChange={e => set('premiumOnly', e.target.checked)} style={{accentColor:'var(--brand)', width:16, height:16}}/>
          <span style={{fontSize:'0.88rem', fontWeight:600, color:'var(--ink)'}}>Premium members only</span>
        </label>
      </form>
    </Modal>
  );
}

Object.assign(window, { CouponsPage });
