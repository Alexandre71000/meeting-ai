export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, context } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question vide' });
  }
  if (!context || !context.trim()) {
    return res.status(400).json({ error: "Aucun échange enregistré pour le moment" });
  }

  const prompt = `Tu es un assistant qui aide un technico-commercial à retrouver des informations dans l'historique de ses échanges (réunions, appels, rendez-vous) déjà enregistrés.

Voici l'historique disponible :
${context}

Question : ${question}

Consignes :
- Réponds uniquement à partir des informations ci-dessus.
- Si la réponse ne s'y trouve pas, dis-le clairement au lieu d'inventer.
- Sois concis et va droit au but.
- Si pertinent, précise de quel client ou échange vient l'information.
- Réponds en français, en texte simple (pas de JSON, pas de markdown).`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.2
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || 'Erreur Groq' });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || '';

    if (!answer) {
      return res.status(500).json({ error: 'Réponse vide de Groq' });
    }

    return res.status(200).json({ answer });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur : ' + e.message });
  }
}
