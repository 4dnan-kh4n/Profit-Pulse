function fallbackExplanation(insights) {
  if (!insights.length) return 'Add sales and expense details to receive a clearer business summary.';
  return `${insights[0].title} ${insights[0].detail}`;
}

export async function explainRecommendations({ businessType, insights, apiKey, model }) {
  const fallback = fallbackExplanation(insights);
  if (!apiKey || !model) return { text: fallback, source: 'built-in' };
  const evidence = insights.map(item => `- ${item.title} ${item.detail}`).join('\n');
  const prompt = `Explain these recorded business results for a ${businessType} owner using very simple words. Write 2 or 3 short sentences. Use only the facts below. Do not invent numbers, market comparisons, savings, or guaranteed results. Say that the owner should check their records before making a decision.\n\n${evidence || 'No complete recorded insight is available.'}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, thinkingConfig: { thinkingLevel: 'minimal' } },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return { text: fallback, source: 'built-in' };
    const text = (await response.json()).candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim();
    return text ? { text: text.slice(0, 700), source: 'ai' } : { text: fallback, source: 'built-in' };
  } catch {
    return { text: fallback, source: 'built-in' };
  }
}
