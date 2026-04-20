// StallPass Business Dashboard — Claims Page
const { useState } = React;

const STATUS_TONE = { approved:'success', pending:'warning', rejected:'danger' };
const STATUS_LABEL = { approved:'Approved', pending:'Under review', rejected:'Rejected' };

function ClaimsPage() {
  const [claims] = useState(MOCK_DATA.claims);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  return (
    <div className="sp-page">
      <SectionHead eyebrow="Claim history" title="Ownership claims"
        sub="Track the status of every bathroom ownership verification. Approved claims appear in your Locations."
        action={<Btn variant="primary" onClick={() => setShowForm(true)}><IcoPlus size={14}/> New claim</Btn>}/>

      {/* Status key */}
      <div style={{display:'flex', gap:16, marginBottom:24, flexWrap:'wrap'}}>
        {[['approved','Approved — listing is live'],['pending','Under review — usually 1–3 days'],['rejected','Rejected — contact support']].map(([tone, label]) => (
          <div key={tone} style={{display:'flex', alignItems:'center', gap:8}}>
            <Badge tone={STATUS_TONE[tone]}>{STATUS_LABEL[tone]}</Badge>
            <span style={{fontSize:'0.8rem', color:'var(--ink-soft)'}}>{label}</span>
          </div>
        ))}
      </div>

      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Address</th>
              <th>Submitted</th>
              <th>Reviewed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {claims.map(claim => (
              <tr key={claim.id}>
                <td style={{fontWeight:700, color:'var(--ink)'}}>{claim.locationName}</td>
                <td>{claim.address}</td>
                <td>{claim.submittedAt}</td>
                <td>{claim.reviewedAt || <span style={{color:'var(--ink-muted)'}}>Pending</span>}</td>
                <td><Badge tone={STATUS_TONE[claim.status]} size="lg">{STATUS_LABEL[claim.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {claims.some(c => c.status === 'pending') && (
        <div style={{marginTop:16, padding:'14px 18px', background:'var(--warning-soft)', border:'1px solid rgba(164,99,18,0.15)', borderRadius:14, display:'flex', gap:12, alignItems:'flex-start'}}>
          <IcoBell size={16} style={{color:'var(--warning)', marginTop:2, flexShrink:0}}/>
          <div style={{fontSize:'0.86rem', color:'var(--ink-soft)', lineHeight:1.6}}>
            <strong style={{color:'var(--ink)'}}>You have a pending claim.</strong> Our team reviews submissions within 1–3 business days. You'll receive an email once it's approved.
          </div>
        </div>
      )}

      {showForm && (
        <NewClaimModal onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); toast('Claim submitted for review', 'success'); }}/>
      )}
    </div>
  );
}

function NewClaimModal({ onClose, onSave }) {
  const [form, setForm] = useState({ businessName:'', address:'', placeId:'', docs:'' });
  function set(k,v) { setForm(f => ({...f, [k]: v})); }
  return (
    <Modal title="Submit an ownership claim" onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={onSave}>Submit claim</Btn></>}>
      <div style={{marginBottom:16, padding:'12px 16px', background:'var(--brand-50)', border:'1px solid rgba(29,92,242,0.15)', borderRadius:12, fontSize:'0.84rem', color:'var(--ink-soft)', lineHeight:1.6}}>
        After submission, our team will verify your ownership and approve the claim within 1–3 business days.
      </div>
      <div style={{display:'grid', gap:14}}>
        <div className="sp-field">
          <label className="sp-label">Business name</label>
          <input className="sp-input" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="The Corner Cafe"/>
        </div>
        <div className="sp-field">
          <label className="sp-label">Street address</label>
          <input className="sp-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, State ZIP"/>
        </div>
        <div className="sp-field">
          <label className="sp-label">Google Place ID (optional)</label>
          <input className="sp-input" value={form.placeId} onChange={e => set('placeId', e.target.value)} placeholder="ChIJ..." style={{fontFamily:'monospace', fontSize:'0.85rem'}}/>
          <span style={{fontSize:'0.76rem', color:'var(--ink-muted)'}}>Find this in Google Maps URL or Places API. Helps us match your listing faster.</span>
        </div>
        <div className="sp-field">
          <label className="sp-label">Proof of ownership (describe or link)</label>
          <textarea className="sp-textarea" rows={3} value={form.docs} onChange={e => set('docs', e.target.value)} placeholder="e.g. Business license URL, utility bill, or manager authorization letter link"/>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { ClaimsPage });
