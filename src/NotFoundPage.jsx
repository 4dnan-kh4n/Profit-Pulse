import ProfitPulseLogo from './ProfitPulseLogo.jsx';

export default function NotFoundPage() {
  return <main className="not-found-page">
    <a className="auth-brand" href="#home" aria-label="Profit Pulse home"><ProfitPulseLogo /></a>
    <section className="not-found-panel">
      <p className="onboarding-kicker">Page not found</p>
      <h1>We could not find that page.</h1>
      <p className="auth-intro">The address may be typed wrong, or the page may have moved. You can go back home or continue to your account.</p>
      <div className="not-found-actions">
        <a className="button-primary" href="#home">Back to home</a>
        <a className="button-quiet" href="#login">Log in</a>
        <a className="button-quiet" href="#dashboard">Open dashboard</a>
      </div>
    </section>
  </main>;
}
