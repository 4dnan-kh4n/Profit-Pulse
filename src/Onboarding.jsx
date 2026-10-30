import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api.js';

const options = {
  Retail: ['Grocery shop', 'Clothing store', 'Electronics shop', 'Pharmacy', 'Other retail business'],
  Food: ['Cafe', 'Restaurant', 'Bakery', 'Food truck', 'Other food business'],
  'Personal services': ['Salon', 'Barber shop', 'Laundry service', 'Repair service', 'Other personal service'],
  Transport: ['Truck transport', 'Local delivery', 'Taxi service', 'Bus service', 'Other transport business'],
  Manufacturing: ['Food production', 'Clothing production', 'Furniture making', 'Other manufacturing business'],
  'Professional services': ['Consultancy', 'Design studio', 'Accounting service', 'Other professional service'],
  Agriculture: ['Crop farm', 'Dairy farm', 'Poultry farm', 'Other agriculture business'],
  Other: ['Other business'],
};
const costTypes = ['Rent', 'Staff wages', 'Utilities', 'Supplies / stock', 'Repairs', 'Transport', 'Fees', 'Other'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customType, setCustomType] = useState('');
  const [costRows, setCostRows] = useState([{ category: '', amount: '' }]);
  const [values, setValues] = useState({ name: '', month: '', currency: 'INR', revenue: '', otherIncome: '', employees: '', wages: '', stockCount: '', itemsLow: '', appointments: '', availableHours: '', bookedHours: '', vehicles: '', trips: '', fuelLitres: '', fuelCost: '', repairs: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [optionalQuestions, setOptionalQuestions] = useState([]);
  const [optionalAnswers, setOptionalAnswers] = useState({});
  const [questionNotice, setQuestionNotice] = useState('');
  const types = options[category] || [];
  const resolvedType = businessType.startsWith('Other ') && customType.trim() ? customType.trim() : businessType;
  const isGrocery = /Grocery/i.test(resolvedType);
  const isSalon = /Salon|Barber/i.test(resolvedType);
  const isTransport = /transport|delivery|taxi|bus/i.test(resolvedType);
  const categoryTitle = useMemo(() => category || 'your business', [category]);
  const set = (key, value) => setValues(current => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    async function restoreSavedAssessment() {
      const token = localStorage.getItem('profit-pulse-token');
      if (!token) return;
      try {
        const [businessData, periodsData] = await Promise.all([
          apiRequest('/businesses/current', { token }),
          apiRequest('/periods', { token }),
        ]);
        const business = businessData.business;
        const period = periodsData.periods?.[0];
        if (!active || !business || !period || !options[business.category]) return;
        const listedType = options[business.category].includes(business.type) ? business.type : options[business.category].find(item => item.startsWith('Other '));
        setCategory(business.category);
        setBusinessType(listedType || '');
        if (listedType?.startsWith('Other ')) setCustomType(business.type);
        setValues(current => ({ ...current, ...period.values, name: business.name, month: period.month, currency: period.currency }));
        setOptionalAnswers(period.values?.optionalAnswers || {});
        setCostRows(Array.isArray(period.expenses) && period.expenses.length ? period.expenses : [{ category: '', amount: '' }]);
        setStep(2);
        const response = await apiRequest('/assessment/questions', { method: 'POST', token, body: { category: business.category, businessType: business.type } });
        if (active) {
          setOptionalQuestions(Array.isArray(response.questions) ? response.questions : []);
          setQuestionNotice(response.source === 'ai' ? 'Extra questions were tailored for your business.' : 'Extra questions were selected for your business.');
        }
      } catch {
        // A new account has no business yet; show the first setup step.
      }
    }
    try {
      const draft = JSON.parse(localStorage.getItem('profit-pulse-onboarding-draft') || 'null');
      const savedCategory = draft?.business?.category;
      const savedType = draft?.business?.type;
      if (savedCategory && savedType && options[savedCategory]) {
        const listedType = options[savedCategory].includes(savedType) ? savedType : options[savedCategory].find(item => item.startsWith('Other '));
        setCategory(savedCategory);
        setBusinessType(listedType || '');
        if (listedType?.startsWith('Other ')) setCustomType(savedType);
        setValues(current => ({ ...current, ...(draft.values || {}) }));
        setOptionalAnswers(draft.values?.optionalAnswers || {});
        if (Array.isArray(draft.expenses) && draft.expenses.length) setCostRows(draft.expenses);
        setStep(2);
      } else restoreSavedAssessment();
    } catch {
      localStorage.removeItem('profit-pulse-onboarding-draft');
      restoreSavedAssessment();
    }
    return () => { active = false; };
  }, []);

  async function loadOptionalQuestions() {
    const token = localStorage.getItem('profit-pulse-token');
    if (!token) return;
    try {
      const response = await apiRequest('/assessment/questions', { method: 'POST', token, body: { category, businessType: resolvedType } });
      setOptionalQuestions(Array.isArray(response.questions) ? response.questions : []);
      setQuestionNotice(response.source === 'ai' ? 'Extra questions were tailored for your business.' : 'Extra questions were selected for your business.');
    } catch {
      setQuestionNotice('We could not load extra questions. You can still complete this check-in.');
    }
  }
  async function next() {
    if (step === 0 && (!category || !businessType || (businessType.startsWith('Other ') && !customType.trim()))) return;
    if (step === 1) await loadOptionalQuestions();
    setStep(current => current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function submit(event) {
    event.preventDefault();
    const savedValues = { ...values, optionalAnswers };
    const draft = { business: { name: values.name, category, type: resolvedType }, period: { month: values.month, currency: values.currency }, values: savedValues, expenses: costRows.filter(row => row.category && row.amount !== '') };
    localStorage.setItem('profit-pulse-onboarding-draft', JSON.stringify(draft));
    const token = localStorage.getItem('profit-pulse-token');
    if (!token) { window.location.hash = '#signup'; return; }
    setSaving(true); setError('');
    try {
      await apiRequest('/businesses', { method: 'POST', token, body: { ...draft.business, currency: values.currency } });
      await apiRequest('/periods', { method: 'POST', token, body: { ...draft.period, values: draft.values, expenses: draft.expenses } });
      localStorage.removeItem('profit-pulse-onboarding-draft');
      setSaved(true); setStep(3);
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  }

  return <main className="onboarding section-shell">
    <header className="onboarding-head"><a href="#home">← Back to home</a><span>Business setup</span></header>
    <div className="onboarding-progress" aria-label={`Step ${Math.min(step + 1, 3)} of 3`}><i style={{ width: `${Math.min((step / 2) * 100, 100)}%` }} /></div>
    {step === 0 && <section className="onboarding-panel"><p className="onboarding-kicker">First, let’s identify your business</p><h1>What kind of business do you run?</h1><p className="onboarding-intro">Choose a category, then select the closest business type. We’ll ask questions that fit your work.</p><label>Business category<select value={category} onChange={event => { setCategory(event.target.value); setBusinessType(''); setCustomType(''); }}><option value="">Choose a category</option>{Object.keys(options).map(item => <option key={item}>{item}</option>)}</select></label>{category && <label>Business type<select value={businessType} onChange={event => { setBusinessType(event.target.value); setCustomType(''); }}><option value="">Choose a business type</option>{types.map(item => <option key={item}>{item}</option>)}</select></label>}{category && businessType.startsWith('Other ') && <label>Tell us your business type<input value={customType} onChange={event => setCustomType(event.target.value)} placeholder="For example, flower shop" /></label>}<button type="button" className="button-primary onboarding-next" onClick={next} disabled={!category || !businessType || (businessType.startsWith('Other ') && !customType.trim())}>Continue</button></section>}
    {step === 1 && <section className="onboarding-panel"><p className="onboarding-kicker">Please check this</p><h1>Your business is {resolvedType}.</h1><p className="onboarding-intro">We’ll ask about {categoryTitle.toLowerCase()} costs and activity. Is this the right type?</p><div className="confirm-box"><strong>{values.name || 'Your business'}</strong><span>{category} · {resolvedType}</span></div><div className="onboarding-actions"><button type="button" className="button-quiet" onClick={() => setStep(0)}>Change business type</button><button type="button" className="button-primary" onClick={next}>Yes, continue</button></div></section>}
    {step === 2 && <form className="onboarding-panel assessment-form" onSubmit={submit}><p className="onboarding-kicker">Monthly business check-in</p><h1>Tell us about this month.</h1><p className="onboarding-intro">Use your best numbers. You can leave optional questions blank or enter 0 when you know there was no cost.</p><div className="form-grid"><label>Business name<input required value={values.name} onChange={event => set('name', event.target.value)} placeholder="Your business name" /></label><label>Month<select required value={values.month} onChange={event => set('month', event.target.value)}><option value="">Choose month</option>{Array.from({ length: 12 }, (_, i) => { const date = new Date(); date.setMonth(date.getMonth() - i); const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; return <option key={value} value={value}>{date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>; })}</select></label><label>Currency<select value={values.currency} onChange={event => set('currency', event.target.value)}><option value="INR">INR — Indian Rupee (₹)</option><option value="USD">USD — US Dollar ($)</option><option value="EUR">EUR — Euro (€)</option><option value="GBP">GBP — British Pound (£)</option></select></label><label>Total sales / revenue<input type="number" min="0" step="0.01" value={values.revenue} onChange={event => set('revenue', event.target.value)} placeholder="Enter amount" /></label><label>Other income <small>Optional</small><input type="number" min="0" step="0.01" value={values.otherIncome} onChange={event => set('otherIncome', event.target.value)} placeholder="Enter amount" /></label></div>
      <fieldset><legend>Monthly expenses</legend><p>Add each cost once. If you include wages here, do not add them again below.</p>{costRows.map((row, index) => <div className="expense-row" key={index}><select aria-label={`Expense category ${index + 1}`} value={row.category} onChange={event => setCostRows(rows => rows.map((item, i) => i === index ? { ...item, category: event.target.value } : item))}><option value="">Choose a cost</option>{costTypes.map(type => <option key={type}>{type}</option>)}</select>{row.category === 'Other' && <input aria-label="Custom expense name" placeholder="Expense name" value={row.custom || ''} onChange={event => setCostRows(rows => rows.map((item, i) => i === index ? { ...item, custom: event.target.value } : item))} />}<input aria-label={`Expense amount ${index + 1}`} type="number" min="0" step="0.01" placeholder="Amount" value={row.amount} onChange={event => setCostRows(rows => rows.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} />{costRows.length > 1 && <button type="button" className="remove-expense" aria-label="Remove expense" onClick={() => setCostRows(rows => rows.filter((_, i) => i !== index))}>×</button>}</div>)}<button type="button" className="add-expense" onClick={() => setCostRows(rows => [...rows, { category: '', amount: '' }])}>+ Add another cost</button></fieldset>
      <div className="form-grid"><label>Number of employees <small>Optional</small><input type="number" min="0" step="1" value={values.employees} onChange={event => set('employees', event.target.value)} placeholder="For example, 4" /></label><label>Total staff wages <small>Optional</small><input type="number" min="0" step="0.01" value={values.wages} onChange={event => set('wages', event.target.value)} placeholder="Only if not listed above" /></label></div>
      {isGrocery && <fieldset><legend>Stock details</legend><div className="form-grid"><label>How many items do you track? <small>Optional</small><input type="number" min="0" value={values.stockCount} onChange={event => set('stockCount', event.target.value)} placeholder="Number of items" /></label><label>Items low on stock <small>Optional</small><input type="number" min="0" value={values.itemsLow} onChange={event => set('itemsLow', event.target.value)} placeholder="Number of items" /></label></div><p>You can add item names, amounts bought and sold, and stock levels in a later inventory step.</p></fieldset>}
      {isSalon && <fieldset><legend>Appointments</legend><div className="form-grid"><label>Appointments completed <small>Optional</small><input type="number" min="0" value={values.appointments} onChange={event => set('appointments', event.target.value)} placeholder="Number of appointments" /></label><label>Available hours <small>Optional</small><input type="number" min="0" step="0.5" value={values.availableHours} onChange={event => set('availableHours', event.target.value)} placeholder="Hours this month" /></label><label>Booked hours <small>Optional</small><input type="number" min="0" step="0.5" value={values.bookedHours} onChange={event => set('bookedHours', event.target.value)} placeholder="Hours this month" /></label></div></fieldset>}
      {isTransport && <fieldset><legend>Vehicles and fuel</legend><div className="form-grid"><label>Number of vehicles <small>Optional</small><input type="number" min="0" value={values.vehicles} onChange={event => set('vehicles', event.target.value)} placeholder="For example, 5 trucks" /></label><label>Trips completed <small>Optional</small><input type="number" min="0" value={values.trips} onChange={event => set('trips', event.target.value)} placeholder="Trips this month" /></label><label>Fuel used in litres <small>Optional</small><input type="number" min="0" step="0.01" value={values.fuelLitres} onChange={event => set('fuelLitres', event.target.value)} placeholder="Litres this month" /></label><label>Total fuel cost <small>Optional</small><input type="number" min="0" step="0.01" value={values.fuelCost} onChange={event => set('fuelCost', event.target.value)} placeholder="Amount this month" /></label><label>Vehicle repairs <small>Optional</small><input type="number" min="0" step="0.01" value={values.repairs} onChange={event => set('repairs', event.target.value)} placeholder="Amount this month" /></label></div></fieldset>}
      {optionalQuestions.length > 0 && <fieldset><legend>Extra questions for your business</legend><p>{questionNotice || 'Answer only what you know. These are optional.'}</p><div className="form-grid">{optionalQuestions.map(question => <label key={question.id}>{question.label} <small>Optional</small><span className="field-help">{question.help}</span><input type="number" min="0" step={question.decimal ? '0.01' : '1'} value={optionalAnswers[question.id] || ''} onChange={event => setOptionalAnswers(current => ({ ...current, [question.id]: event.target.value }))} placeholder={question.unit === 'amount' ? 'Enter amount' : `Enter ${question.unit}`} /></label>)}</div></fieldset>}
      {error && <p className="auth-message" role="alert">{error}</p>}<div className="onboarding-actions"><button type="button" className="button-quiet" onClick={() => setStep(1)}>Back</button><button className="button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save monthly details'}</button></div>
    </form>}
    {step === 3 && <section className="onboarding-panel"><p className="onboarding-kicker">Saved successfully</p><h1>Business details are ready.</h1><p className="onboarding-intro">We saved {values.name} and this month’s details. Your dashboard can now show the numbers you entered.</p><div className="confirm-box"><strong>{resolvedType}</strong><span>{values.month} · {values.currency}</span><span>{saved ? 'Saved to your Profit Pulse account' : ''}</span></div><a className="button-primary onboarding-next" href="#dashboard">View your dashboard</a></section>}
  </main>;
}
