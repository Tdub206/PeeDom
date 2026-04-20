// StallPass Business Dashboard — Sidebar
const { useState } = React;

const NAV_ITEMS = [
  { id: 'hub',       label: 'Overview',       icon: () => <IcoHome size={17}/>,     section: null },
  { id: 'locations', label: 'Locations',      icon: () => <IcoBuilding size={17}/>, section: 'Manage' },
  { id: 'analytics', label: 'Analytics',      icon: () => <IcoChart size={17}/>,   section: null },
  { id: 'coupons',   label: 'Coupons',        icon: () => <IcoTag size={17}/>,     section: null },
  { id: 'codes',     label: 'Access Codes',   icon: () => <IcoKey size={17}/>,     section: null },
  { id: 'featured',  label: 'Featured',       icon: () => <IcoSpark size={17}/>,   section: 'Grow' },
  { id: 'claims',    label: 'Claim History',  icon: () => <IcoFile size={17}/>,    section: null },
  { id: 'settings',  label: 'Settings',       icon: () => <IcoSettings size={17}/>,section: 'Account' },
];

function Sidebar({ page, setPage, open, onClose }) {
  const { name, initials, role } = MOCK_DATA.business;
  let lastSection = null;

  return (
    <>
      {open && <div className="sp-drawer-overlay" onClick={onClose}/>}
      <aside className={`sp-sidebar${open ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sp-brand">
          <div className="sp-brand-mark">SP</div>
          <div className="sp-brand-text">
            <div className="sp-brand-title">StallPass</div>
            <div className="sp-brand-sub">Business Hub</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sp-nav">
          {NAV_ITEMS.map(item => {
            const showSection = item.section && item.section !== lastSection;
            if (showSection) lastSection = item.section;
            return (
              <React.Fragment key={item.id}>
                {showSection && <div className="sp-nav-section">{item.section}</div>}
                <button
                  className={`sp-nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => { setPage(item.id); onClose(); }}
                >
                  <span className="nav-icon"><item.icon/></span>
                  {item.label}
                  {item.id === 'claims' && MOCK_DATA.claims.some(c => c.status === 'pending') && (
                    <span className="nav-badge">{MOCK_DATA.claims.filter(c => c.status === 'pending').length}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User */}
        <div className="sp-user">
          <div className="sp-avatar">{initials}</div>
          <div className="sp-user-info">
            <div className="sp-user-name">{name}</div>
            <div className="sp-user-role">{role}</div>
          </div>
          <button className="sp-signout" title="Sign out"><IcoLogOut size={15}/></button>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Sidebar });
