// StallPass AI Assistant Panel
const { useState, useRef, useEffect } = React;

const SYSTEM_PROMPT = `You are StallPass AI — a smart, friendly assistant built for business owners managing bathroom listings on StallPass.

Business context:
- Business: The Corner Cafe Group (ops@cornercafe.co)
- Locations: Downtown (147 Main St — verified, 1,240 impressions/week), Midtown (892 Park Ave — verified, premium access), SoHo (34 Spring St — pending verification)
- Active coupons: "10% Off Any Drink" (STALL10, 34 redemptions), "Free Coffee with Purchase" (FREELOUNGE, 8 redemptions)
- Analytics: 2,847 total views this week (+18%), 436 route requests (+24%), trust score 4.2/5

Your job: help business owners improve their listings, write copy, answer questions about StallPass features, suggest marketing strategies, draft reply templates, and provide practical operational advice. Be concise, warm, and specific. Use bullet points for lists. Keep responses brief — 2–5 sentences or a short list. If asked to write something, just write it without preamble.`;

const SUGGESTED = [
  'How can I improve my trust score?',
  'Write a reply template for a negative review',
  'What should I add to my Downtown listing?',
  'Suggest a good coupon for the SoHo location',
  'Why is my SoHo location not showing on the map?',
  'How do featured placements work?',
];

function AIPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm StallPass AI. I can help you improve your listings, write copy, troubleshoot issues, or answer any questions about your account. What can I help with?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      const el = bottomRef.current.parentElement;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', text: userText }];
    setMessages(next);
    setLoading(true);

    try {
      const history = next.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
      const reply = await window.claude.complete({
        messages: [
          { role: 'user', content: `[System: ${SYSTEM_PROMPT}]\n\n${history[0].content}` },
          ...history.slice(1),
        ],
      });
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }

  return (
    <div style={{
      position:'fixed', top:0, right:0, bottom:0, width:'min(400px, 100vw)',
      background:'var(--surface)', borderLeft:'1px solid var(--surface-strong)',
      boxShadow:'-8px 0 40px rgba(16,35,60,0.12)',
      display:'flex', flexDirection:'column', zIndex:100,
      animation:'slideInRight 220ms ease',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>

      {/* Header */}
      <div style={{padding:'18px 20px', borderBottom:'1px solid var(--surface-strong)', display:'flex', alignItems:'center', gap:12}}>
        <div style={{width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, var(--brand), #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0}}>
          <IcoSpark size={16}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'var(--font-head)', fontWeight:800, fontSize:'0.95rem', color:'var(--ink)', letterSpacing:'-0.02em'}}>StallPass AI</div>
          <div style={{fontSize:'0.72rem', color:'var(--ink-muted)', fontWeight:500}}>Powered by Claude</div>
        </div>
        <button className="sp-modal-close" onClick={onClose}><IcoX size={15}/></button>
      </div>

      {/* Messages */}
      <div style={{flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12}}>
        {messages.map((m, i) => (
          <div key={i} style={{display:'flex', flexDirection:'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'}}>
            <div style={{
              maxWidth:'85%', padding:'11px 15px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? 'linear-gradient(135deg, var(--brand), var(--brand-strong))' : 'var(--surface-muted)',
              color: m.role === 'user' ? '#fff' : 'var(--ink)',
              fontSize:'0.875rem', lineHeight:1.65, whiteSpace:'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{display:'flex', alignItems:'flex-start'}}>
            <div style={{padding:'12px 16px', borderRadius:'18px 18px 18px 4px', background:'var(--surface-muted)', display:'flex', gap:5, alignItems:'center'}}>
              {[0,1,2].map(i => (
                <div key={i} style={{width:7, height:7, borderRadius:'50%', background:'var(--ink-muted)', animation:`bounce 1s ${i*0.18}s ease infinite`}}/>
              ))}
              <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
            </div>
          </div>
        )}

        {/* Suggested prompts — only at start */}
        {messages.length === 1 && !loading && (
          <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:8}}>
            <div style={{fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:2}}>Try asking</div>
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                style={{background:'var(--surface)', border:'1px solid var(--surface-strong)', borderRadius:12,
                  padding:'9px 13px', fontSize:'0.82rem', color:'var(--ink-soft)', cursor:'pointer',
                  textAlign:'left', transition:'all 160ms ease', fontFamily:'var(--font-body)', fontWeight:500}}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-strong)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:'12px 16px', borderTop:'1px solid var(--surface-strong)', display:'flex', gap:8}}>
        <input ref={inputRef} className="sp-input" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your listings…"
          style={{flex:1, borderRadius:999, padding:'10px 16px', fontSize:'0.88rem'}}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          disabled={loading}/>
        <button className="sp-btn sp-btn-primary" onClick={() => send()} disabled={loading || !input.trim()}
          style={{borderRadius:999, padding:'0 16px', minWidth:44}}>
          <IcoArrowRight size={16}/>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AIPanel });
