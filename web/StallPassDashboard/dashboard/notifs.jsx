// StallPass Business Dashboard — Notifications Panel
const { useState } = React;

const MOCK_NOTIFS = [
  { id:1, type:'coupon',   title:'Coupon redeemed',         body:'STALL10 was used 3 times today at Downtown.',          time:'2h ago',  read:false },
  { id:2, type:'campaign', title:'Campaign performing well', body:'Your Downtown featured campaign hit 1,200 impressions.', time:'4h ago',  read:false },
  { id:3, type:'claim',    title:'Claim approved',           body:'The Corner Lounge — SoHo ownership claim was approved.', time:'3d ago', read:false },
  { id:4, type:'review',   title:'New guest review',         body:'Someone left a 4-star review on the Midtown location.',  time:'4d ago', read:true  },
  { id:5, type:'info',     title:'Weekly digest ready',      body:'Your performance summary for Apr 7–14 is ready to view.','time':'1w ago', read:true },
];

const TYPE_ICON = {
  coupon:   () => <IcoTag size={15}/>,
  campaign: () => <IcoSpark size={15}/>,
  claim:    () => <IcoFile size={15}/>,
  review:   () => <IcoStar size={15}/>,
  info:     () => <IcoBell size={15}/>,
};
const TYPE_BG = { coupon:'var(--brand-soft)', campaign:'rgba(139,92,246,0.1)', claim:'var(--success-soft)', review:'var(--warning-soft)', info:'var(--surface-muted)' };
const TYPE_COLOR = { coupon:'var(--brand)', campaign:'#7c3aed', claim:'var(--success)', review:'var(--warning)', info:'var(--ink-muted)' };

function NotifPanel({ onClose }) {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  function markAllRead() { setNotifs(ns => ns.map(n => ({...n, read:true}))); }
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div style={{
      position:'fixed', top:0, right:0, bottom:0, width:'min(360px, 100vw)',
      background:'var(--surface)', borderLeft:'1px solid var(--surface-strong)',
      boxShadow:'-8px 0 40px rgba(16,35,60,0.12)',
      display:'flex', flexDirection:'column', zIndex:100,
      animation:'slideInRight 220ms ease',
    }}>
      {/* Header */}
      <div style={{padding:'18px 20px', borderBottom:'1px solid var(--surface-strong)', display:'flex', alignItems:'center', gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1rem', color:'var(--ink)', letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap:8}}>
            Notifications
            {unread > 0 && <span style={{background:'var(--brand)', color:'#fff', fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.65rem', minWidth:18, height:18, borderRadius:999, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px'}}>{unread}</span>}
          </div>
        </div>
        {unread > 0 && <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={markAllRead} style={{fontSize:'0.75rem'}}>Mark all read</button>}
        <button className="sp-modal-close" onClick={onClose}><IcoX size={15}/></button>
      </div>

      {/* List */}
      <div style={{flex:1, overflowY:'auto'}}>
        {notifs.map(n => (
          <div key={n.id} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? {...x, read:true} : x))}
            style={{display:'flex', gap:13, padding:'16px 20px', borderBottom:'1px solid var(--surface-strong)', cursor:'pointer',
              background: n.read ? 'transparent' : 'rgba(29,92,242,0.03)', transition:'background 160ms ease'}}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-muted)'}
            onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(29,92,242,0.03)'}>
            <div style={{width:34, height:34, borderRadius:10, background: TYPE_BG[n.type], display:'flex', alignItems:'center', justifyContent:'center', color: TYPE_COLOR[n.type], flexShrink:0, marginTop:2}}>
              {TYPE_ICON[n.type]?.()}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2}}>
                <span style={{fontFamily:'var(--font-head)', fontWeight:700, fontSize:'0.86rem', color:'var(--ink)'}}>{n.title}</span>
                {!n.read && <span style={{width:7, height:7, borderRadius:'50%', background:'var(--brand)', flexShrink:0, display:'inline-block'}}/>}
              </div>
              <div style={{fontSize:'0.8rem', color:'var(--ink-soft)', lineHeight:1.5}}>{n.body}</div>
              <div style={{fontSize:'0.72rem', color:'var(--ink-muted)', marginTop:4, fontWeight:600}}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { NotifPanel });
