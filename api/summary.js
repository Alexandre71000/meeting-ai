export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client, title, participants, type, date, transcript, instructions } = req.body;

  if (!transcript || transcript.trim().split(/\s+/).length < 5) {
    return res.status(400).json({ error: 'Transcription trop courte' });
  }

  const consignes = (instructions && instructions.trim()) ? instructions.trim() : `- Le compte rendu doit tenir en 5 à 8 bullet points maximum (un tiret "-" par ligne).
- Va droit au but : besoins client, points bloquants, décisions, chiffres/prix évoqués, prochaines étapes commerciales.
- Pas de blabla, pas de reformulation inutile, pas de phrases d'introduction ou de conclusion.
- Priorise l'information actionnable pour un commercial (relance, devis, RDV, objection à traiter).`;

  const prompt = `Tu es un assistant pour technico-commerciaux qui analyse une retranscription de réunion et rédige un compte rendu, en français.

Contexte : Client: ${client} | Objet: ${title} | Type: ${type} | Date: ${date} | Participants: ${participants}

Retranscription :
${transcript}

Consignes pour le compte rendu (à suivre scrupuleusement, y compris pour la longueur et le format demandés — n'ajoute aucune mise en forme de ta propre initiative, comme des tirets, si ce n'est pas demandé ci-dessous) :
${consignes}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans balises de code, sans texte avant ou après) :
{
  "summary": "Le contenu rédigé en suivant EXACTEMENT les consignes ci-dessus, y compris leur format. Utilise \\n pour séparer les lignes si le contenu en comporte plusieurs.",
  "nextAction": "Action commerciale UNIQUEMENT si une suite précise et concrète a été explicitement évoquée dans la retranscription (ex: renvoyer un devis, rappeler tel jour, planifier un rdv). N'invente JAMAIS une action qui n'a pas été clairement mentionnée : si rien de précis n'a été dit sur la suite à donner, laisse une chaîne VIDE.",
  "nextDate": "Date au format YYYY-MM-DD UNIQUEMENT si une échéance précise a été mentionnée pour cette action, sinon chaîne vide"
}`;

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
        max_tokens: 600,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || 'Erreur Groq' });
    }

    const text = data?.choices?.[0]?.message?.content || '';

    if (!text) {
      return res.status(500).json({ error: 'Réponse vide de Groq' });
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
