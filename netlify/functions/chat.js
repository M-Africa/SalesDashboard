// Mixta Africa — Chat Proxy. GROQ_API_KEY lives in Netlify environment variables.
exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  try {
    if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty request body' }) };
    const { question, context } = JSON.parse(event.body);
    if (!question) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No question provided' }) };
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'GROQ_API_KEY is not set in Netlify environment variables' }) };

    const system = 'You are a senior data analyst for Mixta Africa, a Nigerian real estate company. You have FULL access to the dashboard data below: month-by-month inflow per project, monthly totals with month-on-month changes, rankings, sales per project, and KPIs.\n\n' +
      'Answer ANY question using this data: highest/lowest month, percentage change between any two months, rankings, comparisons, trends. ALWAYS do the arithmetic yourself and show the working briefly. Never say the data is unavailable when it is listed below. Format money with the Naira sign and bn/m suffixes. Be concise.\n\nDATA:\n' + (context || '');

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'system', content: system }, { role: 'user', content: question }], temperature: 0.2, max_tokens: 900 })
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch (e) { return { statusCode: 502, headers, body: JSON.stringify({ error: 'Groq returned an invalid response' }) }; }
    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: (data.error && data.error.message) || ('Groq error ' + r.status) }) };
    const answer = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No response received.';
    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Internal server error' }) };
  }
};
