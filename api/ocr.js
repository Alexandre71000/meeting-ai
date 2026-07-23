export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  if (!buffer.length) {
    return res.status(400).json({ error: 'Image vide' });
  }

  try {
    const contentType = req.headers['content-type'] || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: "Transcris fidèlement tout le texte manuscrit visible sur cette photo de notes de réunion, en français. Ignore l'arrière-plan, la table, les mains ou tout autre élément visuel. Réponds UNIQUEMENT avec le texte transcrit, sans commentaire, sans introduction, sans mise en forme markdown. Si aucun texte lisible n'est visible, réponds exactement : AUCUN_TEXTE." }
            , { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }],
        max_completion_tokens: 1024,
        temperature: 0.2,
        reasoning_format: 'hidden'
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq vision error:', JSON.stringify(data));
      if (groqRes.status === 429) {
        return res.status(429).json({ error: "Trop de requêtes d'un coup, attends quelques secondes avant de réessayer." });
      }
      return res.status(500).json({ error: data?.error?.message || 'Erreur Groq' });
    }

    const rawContent = data?.choices?.[0]?.message?.content || '';
    const text = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!text || text === 'AUCUN_TEXTE') {
      return res.status(200).json({ error: 'Aucun texte lisible détecté sur la photo.' });
    }

    return res.status(200).json({ text });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur : ' + e.message });
  }
}
