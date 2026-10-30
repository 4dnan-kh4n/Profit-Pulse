const amount = value => Number(value || 0);

function optionalAnswer(values, id) {
  return amount(values?.optionalAnswers?.[id]);
}

export function buildAnalytics(period, recentPeriods) {
  const values = period.values || {};
  const income = amount(values.revenue) + amount(values.otherIncome);
  const totalExpenses = (period.expenses || []).reduce((sum, item) => sum + amount(item.amount), 0);
  const moneyLeft = income - totalExpenses;
  const sortedCosts = [...(period.expenses || [])].sort((a, b) => amount(b.amount) - amount(a.amount));
  const topCost = sortedCosts[0] || null;
  const insights = [];

  if (!values.revenue) insights.push({ type: 'missing', title: 'Add your sales total', detail: 'Add sales for this month to calculate how much money is left after costs.' });
  if (!period.expenses?.length) insights.push({ type: 'missing', title: 'Add your expenses', detail: 'Add costs such as rent, wages, stock, or repairs to see where money goes.' });
  if (income > 0 && totalExpenses > income) insights.push({ type: 'cost', title: 'Recorded costs are higher than income.', detail: 'Check whether a large cost belongs to this month, then review sales and spending before making a decision.' });
  else if (income > 0 && moneyLeft / income <= 0.1) insights.push({ type: 'cost', title: 'Little money is left after recorded costs.', detail: `${Math.round((moneyLeft / income) * 100)}% of income is left before taxes and unentered costs. Review the largest costs first.` });
  if (topCost && totalExpenses > 0) insights.push({ type: 'cost', title: `${topCost.custom || topCost.category} is your largest recorded cost.`, detail: `It is ${Math.round((amount(topCost.amount) / totalExpenses) * 100)}% of your recorded expenses. Check the receipts and compare it with last month.` });
  if (amount(values.itemsLow) > 0) insights.push({ type: 'stock', title: `${values.itemsLow} items are low on stock.`, detail: 'Check the item counts before you reorder so fast-selling products stay available.' });
  if (optionalAnswer(values, 'stock-loss') > 0 || optionalAnswer(values, 'food-waste') > 0 || optionalAnswer(values, 'produce-lost') > 0) {
    const loss = optionalAnswer(values, 'stock-loss') || optionalAnswer(values, 'food-waste') || optionalAnswer(values, 'produce-lost');
    insights.push({ type: 'stock', title: `You recorded ${loss.toLocaleString('en-IN')} in stock or food loss.`, detail: 'Find the items that expired, were damaged, or were wasted. Check ordering and storage before the next purchase.' });
  }
  const quietHours = amount(values.availableHours) - amount(values.bookedHours);
  if (quietHours > 0) insights.push({ type: 'capacity', title: `${quietHours} appointment hours were not booked.`, detail: 'Look at quiet days and times before deciding on an offer or staffing change.' });
  if (amount(values.wages) > 0 && amount(values.employees) > 0) insights.push({ type: 'staff', title: `Average recorded wages were ${(amount(values.wages) / amount(values.employees)).toFixed(0)} per employee.`, detail: 'Use this only as an internal check. Confirm staff hours and wage records before changing pay or shifts.' });
  if (amount(values.fuelLitres) > 0 && amount(values.fuelCost) > 0) insights.push({ type: 'fuel', title: `Fuel cost was ${(amount(values.fuelCost) / amount(values.fuelLitres)).toFixed(2)} per litre.`, detail: 'Use this as a baseline for your next month. Compare similar routes before changing a supplier.' });
  if (optionalAnswer(values, 'empty-trips') > 0) insights.push({ type: 'capacity', title: `${optionalAnswer(values, 'empty-trips')} trips had no paying customer.`, detail: 'Review routes and return journeys. Grouping jobs or planning return loads may reduce empty travel.' });

  const history = recentPeriods.map(item => ({ month: item.month, income: amount(item.values?.revenue) + amount(item.values?.otherIncome), expenses: (item.expenses || []).reduce((sum, expense) => sum + amount(expense.amount), 0) }));
  const previous = history.length > 1 ? history.at(-2) : null;
  if (previous?.income > 0 && income > 0) {
    const change = Math.round(((income - previous.income) / previous.income) * 100);
    insights.push({ type: 'trend', title: change === 0 ? 'Income is the same as last month.' : `Income is ${Math.abs(change)}% ${change > 0 ? 'higher' : 'lower'} than last month.`, detail: `This compares ${period.month} with ${previous.month}. Check sales records and unusual events before drawing a conclusion.` });
  }
  const expenseBreakdown = sortedCosts.map(item => ({ category: item.custom || item.category, amount: amount(item.amount), share: totalExpenses ? Math.round((amount(item.amount) / totalExpenses) * 100) : 0 }));
  return { summary: { income, totalExpenses, moneyLeft, topCost }, expenseBreakdown, history, insights: insights.slice(0, 4) };
}
