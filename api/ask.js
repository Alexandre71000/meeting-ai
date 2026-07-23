export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, context, history } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question vide' });
  }
  if (!context || !context.trim()) {
    return res.status(400).json({ error: "Aucun échange enregistré pour le moment" });
  }

  const systemPrompt = `Tu es un assistant qui aide un technico-commercial à retrouver des informations dans ses données déjà enregistrées : ses clients (contacts, postes, téléphones, emails, notes) et l'historique de ses échanges (réunions, appels, rendez-vous).

Voici les données disponibles :
${context}

Consignes :
- Réponds uniquement à partir des informations ci-dessus.
- Si la réponse ne s'y trouve pas, dis-le clairement au lieu d'inventer.
- Sois concis et va droit au but.
- Si pertinent, précise de quel client ou échange vient l'information.
- Tiens compte des questions précédentes de la conversation : si une question fait référence à "ce client", "ce produit", "cette action" etc. sans le nommer, comprends qu'elle se rapporte au sujet discuté juste avant.
- Réponds en français, en texte simple (pas de JSON, pas de markdown).`;

  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text })),
    { role: 'user', content: question }
  ];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 400,
        temperature: 0.2
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq error:', JSON.stringify(data));
      if (groqRes.status === 429) {
        return res.status(429).json({ error: "Trop de questions d'un coup, attends quelques secondes avant de réessayer." });
      }
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
