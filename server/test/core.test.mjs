import assert from 'node:assert/strict';
import test from 'node:test';
import { fallbackQuestions } from '../src/assessment.js';
import { buildAnalytics } from '../src/analytics.js';
import { cleanPeriodInput, PeriodInputError } from '../src/periods.js';
import { loadConfig } from '../src/config.js';

test('built-in questions match the selected business type', () => {
  const transport = fallbackQuestions('Transport', 'Truck transport');
  const grocery = fallbackQuestions('Retail', 'Grocery shop');
  assert.equal(transport.length, 3);
  assert.ok(transport.some(question => question.id === 'distance-travelled'));
  assert.ok(grocery.some(question => question.id === 'stock-purchases'));
});

test('monthly data is normalized and invalid values are rejected', () => {
  const cleaned = cleanPeriodInput(
    { revenue: '12500.50', employees: '3', optionalAnswers: { 'food-waste': '240' } },
    [{ category: 'Supplies / stock', amount: '4200' }],
  );
  assert.equal(cleaned.values.revenue, 12500.5);
  assert.equal(cleaned.values.optionalAnswers['food-waste'], 240);
  assert.equal(cleaned.expenses[0].amount, 4200);
  assert.throws(() => cleanPeriodInput({ revenue: '-1' }, []), PeriodInputError);
  assert.throws(() => cleanPeriodInput({}, [{ category: 'Rent', amount: 'unknown' }]), PeriodInputError);
});

test('analytics uses recorded values and identifies meaningful checks', () => {
  const previous = { month: '2026-09', values: { revenue: 10000 }, expenses: [{ category: 'Rent', amount: 3000 }] };
  const current = {
    month: '2026-10',
    values: { revenue: 8000, fuelLitres: 100, fuelCost: 9500, optionalAnswers: { 'food-waste': 600 } },
    expenses: [{ category: 'Supplies / stock', amount: 5000 }, { category: 'Rent', amount: 3500 }],
  };
  const result = buildAnalytics(current, [previous, current]);
  assert.equal(result.summary.income, 8000);
  assert.equal(result.summary.totalExpenses, 8500);
  assert.equal(result.summary.moneyLeft, -500);
  assert.equal(result.expenseBreakdown[0].category, 'Supplies / stock');
  assert.ok(result.insights.some(insight => insight.title.includes('Recorded costs are higher')));
  assert.ok(result.insights.some(insight => insight.title.includes('stock or food loss')));
});

test('production config supports a same-domain website and API', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/profit-pulse-test',
    JWT_SECRET: 'a-very-long-test-secret-that-has-more-than-32-characters',
  });
  assert.equal(config.isProduction, true);
  assert.equal(config.clientOrigins.length, 0);
});
