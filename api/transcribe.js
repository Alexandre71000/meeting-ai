export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  if (!buffer.length) {
    return res.status(400).json({ error: 'Audio vide' });
  }

  try {
    const contentType = req.headers['content-type'] || 'audio/webm';
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: contentType }), 'segment.webm');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'fr');
    form.append('response_format', 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: form
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq transcription error:', JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || 'Erreur Groq' });
    }

    return res.status(200).json({ text: data.text || '' });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur : ' + e.message });
  }
}
