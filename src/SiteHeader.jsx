import { useEffect, useRef, useState } from 'react';
import ProfitPulseLogo from './ProfitPulseLogo.jsx';

const links = [['#why', 'Why'], ['#workflow', 'How it works'], ['#business-types', 'Examples'], ['#questions', 'Questions']];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const close = () => setOpen(false);
    const onKey = event => { if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    const onPointer = event => { if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false); };
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { window.removeEventListener('hashchange', close); document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, []);

  function skipToContent(event) {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView();
  }

  return <header className="nav-wrap" ref={wrapRef}>
    <a className="skip-link" href="#main-content" onClick={skipToContent}>Skip to main content</a>
    <div className="nav shell">
      <a className="brand" href="#home" aria-label="Profit Pulse home"><ProfitPulseLogo /></a>
      <nav className="nav-links" id="site-menu" aria-label="Main navigation" data-open={open}>
        {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        <a className="nav-menu-login" href="#login">Log in</a>
      </nav>
      <div className="nav-actions">
        <a className="nav-login" href="#login">Log in</a>
        <a className="nav-cta" href="#signup">Sign up</a>
        <button ref={toggleRef} type="button" className="nav-toggle" aria-expanded={open} aria-controls="site-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(current => !current)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </div>
  </header>;
}
