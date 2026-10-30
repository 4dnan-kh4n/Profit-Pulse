const NUMBER_FIELDS = ['revenue', 'otherIncome', 'employees', 'wages', 'stockCount', 'itemsLow', 'appointments', 'availableHours', 'bookedHours', 'vehicles', 'trips', 'fuelLitres', 'fuelCost', 'repairs'];
const MAX_AMOUNT = 1_000_000_000_000;

export class PeriodInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PeriodInputError';
  }
}

function optionalNumber(value, label) {
  if (value === '' || value === undefined || value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_AMOUNT) throw new PeriodInputError(`${label} must be a number from 0 to ${MAX_AMOUNT.toLocaleString('en-IN')}.`);
  return parsed;
}

function cleanExpenses(expenses) {
  if (!Array.isArray(expenses) || expenses.length > 20) throw new PeriodInputError('Add up to 20 expense rows at a time.');
  return expenses.reduce((rows, row) => {
    if (!row || typeof row !== 'object') throw new PeriodInputError('Each expense must include a category and amount.');
    const category = typeof row.category === 'string' ? row.category.trim() : '';
    const hasAmount = row.amount !== '' && row.amount !== undefined && row.amount !== null;
    if (!category && !hasAmount) return rows;
    if (!category || !hasAmount || category.length > 60) throw new PeriodInputError('Each expense needs a category and a valid amount.');
    const custom = typeof row.custom === 'string' ? row.custom.trim() : '';
    if (custom.length > 60) throw new PeriodInputError('An expense name can be up to 60 characters.');
    rows.push({ category, custom: custom || undefined, amount: optionalNumber(row.amount, 'Expense amount') });
    return rows;
  }, []);
}

function cleanOptionalAnswers(answers) {
  if (answers === undefined) return undefined;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 10) throw new PeriodInputError('Extra answers could not be read. Please check them and try again.');
  const cleaned = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!/^[a-z0-9-]{1,40}$/.test(key)) throw new PeriodInputError('An extra question answer is not valid.');
    const amount = optionalNumber(value, 'Extra answer');
    if (amount !== undefined) cleaned[key] = amount;
  }
  return cleaned;
}

export function cleanPeriodInput(values, expenses) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new PeriodInputError('The monthly details could not be read. Please check them and try again.');
  const cleanedValues = {};
  for (const field of NUMBER_FIELDS) {
    const value = optionalNumber(values[field], 'Monthly detail');
    if (value !== undefined) cleanedValues[field] = value;
  }
  const optionalAnswers = cleanOptionalAnswers(values.optionalAnswers);
  if (optionalAnswers && Object.keys(optionalAnswers).length) cleanedValues.optionalAnswers = optionalAnswers;
  return { values: cleanedValues, expenses: cleanExpenses(expenses) };
}
