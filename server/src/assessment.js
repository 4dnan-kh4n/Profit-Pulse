const safeId = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

function question(id, label, help, unit = 'amount', decimal = true) {
  return { id, label, help, inputType: 'number', unit, decimal };
}

export function fallbackQuestions(category = '', businessType = '') {
  const subject = `${category} ${businessType}`.toLowerCase();
  if (/grocery|retail|pharmacy|clothing|electronics/.test(subject)) return [
    question('stock-purchases', 'Stock bought this month', 'Include items bought for resale.', 'amount'),
    question('stock-loss', 'Stock lost, expired, or damaged', 'Enter the value of stock that could not be sold.', 'amount'),
    question('slow-stock', 'Slow-moving items', 'Enter how many items have been on the shelf for a long time.', 'count', false),
  ];
  if (/cafe|restaurant|bakery|food truck|food/.test(subject)) return [
    question('ingredient-cost', 'Ingredient cost this month', 'Include food and drink ingredients.', 'amount'),
    question('food-waste', 'Food wasted this month', 'Enter the estimated cost of food that could not be sold.', 'amount'),
    question('orders-completed', 'Orders completed', 'Enter the number of customer orders.', 'count', false),
  ];
  if (/salon|barber|laundry|repair service|personal service/.test(subject)) return [
    question('cancelled-bookings', 'Cancelled bookings', 'Enter the number of bookings cancelled by customers.', 'count', false),
    question('service-supplies', 'Products and supplies used', 'Include products used while serving customers.', 'amount'),
    question('repeat-customers', 'Repeat customers', 'Enter the number of customers who came back this month.', 'count', false),
  ];
  if (/transport|delivery|taxi|bus|truck/.test(subject)) return [
    question('distance-travelled', 'Distance travelled', 'Enter the total distance travelled this month.', 'km'),
    question('tolls-permits', 'Tolls and permits', 'Include tolls, permits, and route charges.', 'amount'),
    question('empty-trips', 'Trips without a paying customer', 'Enter the number of empty or unpaid trips.', 'count', false),
  ];
  if (/farm|dairy|poultry|agriculture/.test(subject)) return [
    question('feed-seed-cost', 'Feed, seed, or fertiliser cost', 'Enter the cost for this month.', 'amount'),
    question('produce-lost', 'Produce lost or spoiled', 'Enter the estimated value that could not be sold.', 'amount'),
    question('units-produced', 'Units produced', 'Enter the number of items, litres, or animals sold.', 'count', false),
  ];
  return [
    question('main-supplies', 'Main materials or supplies', 'Enter what you spent to do your main work.', 'amount'),
    question('completed-jobs', 'Jobs or orders completed', 'Enter the number of jobs, orders, or customers served.', 'count', false),
    question('refunds-discounts', 'Refunds or discounts given', 'Enter the amount returned or discounted for customers.', 'amount'),
  ];
}

function cleanQuestions(candidate, fallback) {
  if (!Array.isArray(candidate)) return fallback;
  const cleaned = candidate.slice(0, 3).map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 100) : '';
    const help = typeof item.help === 'string' ? item.help.trim().slice(0, 160) : '';
    const unit = ['amount', 'count', 'km', 'hours', 'litres'].includes(item.unit) ? item.unit : 'amount';
    return label && help ? question(safeId(item.id || `question-${index + 1}`), label, help, unit, unit === 'amount' || unit === 'km' || unit === 'hours' || unit === 'litres') : null;
  }).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

export async function getAssessmentQuestions({ category, businessType, apiKey, model }) {
  const fallback = fallbackQuestions(category, businessType);
  if (!apiKey || !model) return { questions: fallback, source: 'built-in' };

  const prompt = `Create exactly 3 short, optional numeric monthly assessment questions for a ${businessType} in the ${category} category. Return only JSON: {"questions":[{"id":"short-id","label":"plain question","help":"simple explanation","unit":"amount|count|km|hours|litres"}]}. Do not ask for personal data. Do not ask for revenue, employee count, wages, or broad expenses because those are already collected. Keep each label under 100 characters and help text under 160 characters.`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 600,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return { questions: fallback, source: 'built-in' };
    const payload = await response.json();
    // Gemma may return an internal thinking part before the final JSON response.
    const text = payload.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || '';
    const parsed = JSON.parse(text);
    return { questions: cleanQuestions(parsed.questions, fallback), source: 'ai' };
  } catch {
    return { questions: fallback, source: 'built-in' };
  }
}
