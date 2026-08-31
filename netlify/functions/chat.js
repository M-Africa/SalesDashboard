// Mixta Africa — Chat Proxy Function
// Runs on Netlify's server. Keeps the Groq API key secure.
// The key is stored in Netlify Environment Variables as GROQ_API_KEY.

exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Parse request body
  let question, context;
  try {
    const body = JSON.parse(event.body);
    question = body.question;
    context  = body.context;
    if (!question) throw new Error('No question provided');
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request: ' + e.message }) };
  }

  // Get API key from environment (never exposed to browser)
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Groq API key not configured. Please add GROQ_API_KEY to Netlify environment variables.' })
    };
  }

  // Call Groq
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligence assistant for the Mixta Africa Operations Dashboard. Answer questions concisely and accurately using the data provided. Format numbers clearly with ₦ symbol and bn/m suffixes.\n\n' + (context || '')
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Groq API error ' + response.status);
    }

    const answer = data.choices?.[0]?.message?.content || 'No response received.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
