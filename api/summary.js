export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client, title, participants, type, date, transcript } = req.body;

  if (!transcript || transcript.trim().split(/\s+/).length < 5) {
    return res.status(400).json({ error: 'Transcription trop courte' });
  }

  const prompt = `Tu es un assistant pour technico-commerciaux. Analyse cette retranscription et génère un compte rendu ULTRA CONCIS en français.

Contexte : Client: ${client} | Objet: ${title} | Type: ${type} | Date: ${date} | Participants: ${participants}

Retranscription :
${transcript}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans balises) :
{
  "summary": "Compte rendu en 5-8 lignes max. Faits essentiels uniquement. Format bullet points avec tirets.",
  "nextAction": "Action prioritaire en une phrase courte, ou chaine vide",
  "nextDate": "Date au format YYYY-MM-DD si mentionnée, sinon chaine vide"
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'Réponse vide de Gemini' });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json({
          summary: (parsed.summary || text).replace(/\\n/g, '\n'),
          nextAction: parsed.nextAction || '',
          nextDate: parsed.nextDate || ''
        });
      } catch {
        return res.status(200).json({ summary: text, nextAction: '', nextDate: '' });
      }
    }

    return res.status(200).json({ summary: text, nextAction: '', nextDate: '' });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur : ' + e.message });
  }
}
