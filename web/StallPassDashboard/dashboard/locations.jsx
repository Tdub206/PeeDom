// StallPass Business Dashboard — Locations Page
const { useState } = React;

function LocationsPage() {
  const [selected, setSelected] = useState(null);
  const [locations, setLocations] = useState(MOCK_DATA.locations);
  const toast = useToast();

  if (selected) {
    const loc = locations.find(l => l.id === selected);
    return <LocationDetail loc={loc} onBack={() => setSelected(null)}
      onUpdate={(updated) => {
        setLocations(ls => ls.map(l => l.id === updated.id ? updated : l));
        toast('Location updated', 'success');
      }}/>;
  }

  return (
    <div className="sp-page">
      <SectionHead eyebrow="Locations" title="Your managed bathrooms"
        sub="Every approved StallPass claim tied to your account."
        action={<Btn variant="primary" size="sm"><IcoPlus size={14}/> Claim location</Btn>}/>

      {locations.length === 0
        ? <Card><EmptyState icon={<IcoBuilding size={22}/>} title="No locations yet"
            sub="Once your claims are approved, they'll appear here automatically."
            action={<Btn variant="primary"><IcoPlus size={14}/> Submit a claim</Btn>}/></Card>
        : <div className="sp-stack">
            {locations.map(loc => (
              <Card key={loc.id} clickable onClick={() => setSelected(loc.id)}>
                <div className="sp-loc-card">
                  <div className="sp-loc-icon"><IcoBuilding size={20}/></div>
                  <div className="sp-loc-info">
                    <div className="sp-loc-name">{loc.businessName}</div>
                    <div className="sp-loc-place">{loc.placeName}</div>
                    <div className="sp-loc-address">{loc.address}</div>
                    <div className="sp-loc-chips">
                      <Badge tone={loc.verified ? 'success' : 'warning'}>{loc.verified ? 'Verified' : 'Pending verification'}</Badge>
                      <Badge tone={loc.visibleOnMap ? 'brand' : 'neutral'}>{loc.visibleOnMap ? 'Live on map' : 'Hidden from map'}</Badge>
                      <Badge tone={loc.premiumAccess ? 'warning' : 'neutral'}>{loc.premiumAccess ? 'Premium access' : 'Public access'}</Badge>
                      {loc.requiresCode && <Badge tone="neutral"><IcoLock size={10}/> Code required</Badge>}
                    </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0}}>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'1.3rem', fontFamily:'var(--font-head)', fontWeight:800, letterSpacing:'-0.04em', color:'var(--ink)'}}>{loc.impressions.toLocaleString()}</div>
                      <div style={{fontSize:'0.69rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-muted)'}}>impressions</div>
                    </div>
                    <div style={{fontSize:'0.82rem', fontWeight:700, color:'var(--brand)', display:'flex', alignItems:'center', gap:4}}>
                      Manage <IcoArrowRight size={13}/>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
      }
    </div>
  );
}

function LocationDetail({ loc, onBack, onUpdate }) {
  const toast = useToast();
  const [data, setData] = useState({ ...loc });
  const [showHours, setShowHours] = useState(false);

  function field(key) {
    return (val) => { const updated = {...data, [key]: val}; setData(updated); onUpdate(updated); };
  }
  function amenityToggle(key) {
    const updated = {...data, amenities: {...data.amenities, [key]: !data.amenities[key]}};
    setData(updated); onUpdate(updated);
  }
  function toggle(key) {
    const updated = {...data, [key]: !data[key]};
    setData(updated); onUpdate(updated);
    toast(`${key === 'visibleOnMap' ? 'Map visibility' : key === 'premiumAccess' ? 'Premium access' : key} updated`, 'success');
  }

  const AMENITY_LABELS = {
    changingTable: 'Changing table',
    accessible: 'Wheelchair accessible',
    genderNeutral: 'Gender-neutral',
    singleOccupancy: 'Single occupancy',
    keypad: 'Keypad/code entry',
  };

  return (
    <div className="sp-page">
      {/* Back button */}
      <button className="sp-btn sp-btn-ghost" style={{marginBottom:16, paddingLeft:0}} onClick={onBack}>
        ← Back to locations
      </button>

      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-start', gap:16, marginBottom:28}}>
        <div className="sp-loc-icon" style={{width:52, height:52, borderRadius:14}}>
          <IcoBuilding size={24}/>
        </div>
        <div style={{flex:1}}>
          <div className="sp-eyebrow">{data.placeName}</div>
          <h1 style={{fontFamily:'var(--font-head)', fontSize:'1.8rem', fontWeight:800, letterSpacing:'-0.04em', color:'var(--ink)', margin:'4px 0'}}>{data.businessName}</h1>
          <div style={{fontSize:'0.88rem', color:'var(--ink-soft)'}}>{data.address}</div>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <Badge size="lg" tone={data.verified ? 'success' : 'warning'}>{data.verified ? 'Verified' : 'Pending'}</Badge>
          <Badge size="lg" tone={data.visibleOnMap ? 'brand' : 'neutral'}>{data.visibleOnMap ? 'Live' : 'Hidden'}</Badge>
        </div>
      </div>

      <div className="sp-grid-2" style={{gap: 20}}>
        {/* Listing info */}
        <div className="sp-stack">
          <Card>
            <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)', marginBottom:4}}>Listing details</div>
            <div style={{fontSize:'0.8rem', color:'var(--ink-muted)', marginBottom:14}}>Click any field to edit inline</div>
            <EditRow label="Business name"  value={data.businessName}  onSave={field('businessName')}/>
            <EditRow label="Location name"  value={data.placeName}     onSave={field('placeName')}/>
            <EditRow label="Street address" value={data.address}       onSave={field('address')}/>
            <EditRow label="Staff notes"    value={data.notes}         onSave={field('notes')}/>
          </Card>

          {/* Hours */}
          <Card>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showHours ? 16 : 0}}>
              <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)'}}>Operating hours</div>
              <Btn variant="ghost" size="sm" onClick={() => setShowHours(h => !h)}>
                {showHours ? 'Collapse' : 'Edit hours'}
              </Btn>
            </div>
            {showHours && Object.entries(data.hours).map(([day, h]) => (
              <div key={day} style={{display:'flex', alignItems:'center', gap:12, paddingBottom:8, borderBottom:'1px solid var(--surface-strong)', marginBottom:8}}>
                <span style={{minWidth:36, fontSize:'0.8rem', fontWeight:700, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.08em'}}>{day}</span>
                <input className="sp-input" style={{fontSize:'0.88rem', padding:'6px 10px'}} defaultValue={h}
                  onBlur={e => {
                    const updated = {...data, hours: {...data.hours, [day]: e.target.value}};
                    setData(updated); onUpdate(updated);
                  }}/>
              </div>
            ))}
            {!showHours && (
              <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
                {Object.entries(data.hours).slice(0, 3).map(([d, h]) => (
                  <div key={d} style={{background:'var(--surface-muted)', borderRadius:8, padding:'4px 10px', fontSize:'0.78rem', fontWeight:600, color:'var(--ink-soft)'}}>
                    {d}: {h}
                  </div>
                ))}
                <div style={{background:'var(--surface-muted)', borderRadius:8, padding:'4px 10px', fontSize:'0.78rem', fontWeight:600, color:'var(--ink-muted)'}}>
                  +{Object.keys(data.hours).length - 3} more…
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Controls */}
        <div className="sp-stack">
          {/* Visibility toggles */}
          <Card>
            <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)', marginBottom:16}}>Visibility &amp; access</div>
            {[
              { key:'visibleOnMap', label:'Visible on free map', sub:'Appears to all StallPass users when enabled.' },
              { key:'premiumAccess', label:'Require premium access', sub:'Only StallPass Premium members can see this location.' },
              { key:'requiresCode', label:'Requires access code', sub:'Guests will need a code shown in-app to enter.' },
            ].map(item => (
              <div key={item.key} style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, paddingBottom:14, borderBottom:'1px solid var(--surface-strong)', marginBottom:14}}>
                <div>
                  <div style={{fontSize:'0.9rem', fontWeight:600, color:'var(--ink)'}}>{item.label}</div>
                  <div style={{fontSize:'0.78rem', color:'var(--ink-muted)', marginTop:2}}>{item.sub}</div>
                </div>
                <Toggle checked={Boolean(data[item.key])} onChange={() => toggle(item.key)}/>
              </div>
            ))}
          </Card>

          {/* Amenities */}
          <Card>
            <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)', marginBottom:14}}>Amenities</div>
            <div style={{display:'grid', gap:10}}>
              {Object.entries(AMENITY_LABELS).map(([key, label]) => (
                <label key={key} style={{display:'flex', alignItems:'center', gap:12, cursor:'pointer', padding:'10px 14px',
                  background: data.amenities[key] ? 'var(--brand-soft)' : 'var(--surface-muted)',
                  borderRadius:12, border:`1px solid ${data.amenities[key] ? 'rgba(29,92,242,0.2)' : 'transparent'}`,
                  transition:'all 160ms ease'}}>
                  <input type="checkbox" checked={Boolean(data.amenities[key])} onChange={() => amenityToggle(key)}
                    style={{accentColor:'var(--brand)', width:16, height:16}}/>
                  <span style={{fontSize:'0.88rem', fontWeight:600, color: data.amenities[key] ? 'var(--brand)' : 'var(--ink)'}}>{label}</span>
                  {data.amenities[key] && <IcoCheck size={14} style={{marginLeft:'auto', color:'var(--brand)'}}/>}
                </label>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <Card style={{background:'linear-gradient(135deg, var(--brand-50), var(--surface))'}}>
            <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)', marginBottom:14}}>This week</div>
            <div style={{display:'flex', gap:24}}>
              <div>
                <div style={{fontFamily:'var(--font-head)', fontSize:'2rem', fontWeight:800, letterSpacing:'-0.05em', color:'var(--brand)'}}>{data.impressions.toLocaleString()}</div>
                <div style={{fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)', marginTop:2}}>Impressions</div>
              </div>
              <div>
                <div style={{fontFamily:'var(--font-head)', fontSize:'2rem', fontWeight:800, letterSpacing:'-0.05em', color:'var(--success)'}}>{data.routes.toLocaleString()}</div>
                <div style={{fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-muted)', marginTop:2}}>Route requests</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Photos — full width below */}
      <div style={{marginTop:20}}>
        <PhotoUploadCard locationName={data.businessName} toast={toast}/>
      </div>
    </div>
  );
}

// ── Photo Upload Card ──────────────────────────────────────
function PhotoUploadCard({ locationName, toast }) {
  const [photos, setPhotos] = useState([
    { id:1, label:'Entrance view', placeholder:true },
    { id:2, label:'Interior',      placeholder:true },
  ]);
  const [dragging, setDragging] = useState(false);
  const inputRef = React.useRef(null);

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      setPhotos(ps => [...ps, { id: Date.now() + Math.random(), label: file.name.replace(/\.[^.]+$/, ''), url, placeholder: false }]);
    });
    toast('Photo added to listing', 'success');
  }

  function removePhoto(id) {
    setPhotos(ps => ps.filter(p => p.id !== id));
    toast('Photo removed', 'info');
  }

  return (
    <Card>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div>
          <div style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.95rem', color:'var(--ink)'}}>Listing photos</div>
          <div style={{fontSize:'0.78rem', color:'var(--ink-muted)', marginTop:2}}>Photos help guests recognize your location. Drag &amp; drop or click to upload.</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <IcoPlus size={13}/> Add photo
        </Btn>
        <input ref={inputRef} type="file" accept="image/*" multiple style={{display:'none'}}
          onChange={e => handleFiles(e.target.files)}/>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => photos.length === 0 && inputRef.current?.click()}
        style={{
          border:`2px dashed ${dragging ? 'var(--brand)' : 'var(--surface-strong)'}`,
          borderRadius:14, padding: photos.length ? '16px' : '40px 24px',
          background: dragging ? 'var(--brand-soft)' : 'var(--surface-muted)',
          transition:'all 160ms ease', textAlign: photos.length ? 'left' : 'center',
          cursor: photos.length ? 'default' : 'pointer',
        }}>
        {photos.length === 0 ? (
          <div>
            <div style={{fontSize:'1.8rem', marginBottom:8, opacity:0.5}}>🖼</div>
            <div style={{fontFamily:'var(--font-head)', fontWeight:700, color:'var(--ink)', marginBottom:4}}>Drop photos here</div>
            <div style={{fontSize:'0.82rem', color:'var(--ink-muted)'}}>JPG, PNG or WEBP · Max 10MB each</div>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:12}}>
            {photos.map(photo => (
              <div key={photo.id} style={{position:'relative', borderRadius:10, overflow:'hidden', aspectRatio:'4/3', background:'var(--surface-strong)'}}>
                {photo.url
                  ? <img src={photo.url} alt={photo.label} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                  : <div style={{width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
                      backgroundImage:'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(16,35,60,0.04) 8px, rgba(16,35,60,0.04) 16px)'}}>
                      <IcoBuilding size={20} style={{color:'var(--ink-muted)'}}/>
                      <span style={{fontSize:'0.72rem', fontWeight:600, color:'var(--ink-muted)', textAlign:'center', padding:'0 6px'}}>{photo.label}</span>
                    </div>
                }
                <button onClick={e => { e.stopPropagation(); removePhoto(photo.id); }}
                  style={{position:'absolute', top:6, right:6, width:22, height:22, borderRadius:999, background:'rgba(0,0,0,0.55)', border:'none', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                  <IcoX size={11}/>
                </button>
                <div style={{position:'absolute', bottom:0, left:0, right:0, padding:'4px 8px', background:'rgba(0,0,0,0.45)', fontSize:'0.68rem', fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                  {photo.label}
                </div>
              </div>
            ))}
            <div onClick={() => inputRef.current?.click()}
              style={{borderRadius:10, aspectRatio:'4/3', background:'var(--surface)', border:'2px dashed var(--surface-strong)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', transition:'all 160ms ease'}}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--brand)'; e.currentTarget.style.background='var(--brand-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--surface-strong)'; e.currentTarget.style.background='var(--surface)'; }}>
              <IcoPlus size={18} style={{color:'var(--ink-muted)'}}/>
              <span style={{fontSize:'0.72rem', fontWeight:600, color:'var(--ink-muted)'}}>Add photo</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

Object.assign(window, { LocationsPage });
