// Mixta Africa — Chat Proxy Function
// Runs on Netlify's server. GROQ_API_KEY stored in Netlify Environment Variables.

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty request body' }) };
    }

    const { question, context } = JSON.parse(event.body);
    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No question provided' }) };
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'GROQ_API_KEY not set in Netlify environment variables' }) };
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligence assistant for the Mixta Africa Operations Dashboard. Answer concisely using the data below. Use ₦ with bn/m suffixes.\n\n' + (context || ''),
          },
          { role: 'user', content: question },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    const text = await groqRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Groq returned invalid response: ' + text.slice(0, 100) }) };
    }

    if (!groqRes.ok) {
      return { statusCode: groqRes.status, headers, body: JSON.stringify({ error: data.error?.message || 'Groq error ' + groqRes.status }) };
    }

    const answer = data.choices?.[0]?.message?.content || 'No response received.';
    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };

  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Internal server error' }) };
  }
};
