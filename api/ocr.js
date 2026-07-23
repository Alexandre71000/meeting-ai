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

  const prompt = `Tu analyses une photo de notes manuscrites prises par un technico-commercial pendant ses rendez-vous clients.

Consignes importantes :
- Ne transcris QUE ce que tu peux lire avec une réelle confiance. Si un mot précis est illisible, écris [illisible] à sa place plutôt que d'inventer un mot plausible. N'invente jamais de nom, de chiffre ou de date que tu ne peux pas lire clairement.
- Les notes peuvent concerner UN SEUL client, ou PLUSIEURS clients différents sur la même page (souvent organisées avec le nom de l'entreprise/du client à gauche et le texte associé à côté ou en dessous). Repère chaque section clairement associée à un nom d'entreprise ou de client différent.
- Si tu identifies plusieurs clients distincts sur la photo, crée une entrée séparée par client, avec uniquement le texte qui lui correspond.
- Si la page ne concerne qu'un seul client, ou n'a pas de structure par client identifiable, retourne une seule entrée avec "client" laissé vide.
- Ignore l'arrière-plan, la table, les mains ou tout élément qui n'est pas du texte manuscrit.

Réponds UNIQUEMENT avec un JSON valide et complet (sans markdown, sans balises de code, sans texte avant ou après) au format :
{
  "entries": [
    { "client": "Nom de l'entreprise/client, ou chaîne vide si non identifiable", "text": "Texte transcrit correspondant à ce client" }
  ]
}

Sois concis dans le texte transcrit pour t'assurer que le JSON reste complet et valide. Si aucun texte manuscrit lisible n'est visible sur la photo, réponds : {"entries": []}`;

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
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }],
        max_completion_tokens: 4096,
        temperature: 0.1,
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
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let entries = [];
    let parseFailed = false;
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.entries)) entries = parsed.entries.filter(e => e && e.text && e.text.trim());
      } catch {
        parseFailed = true;
      }
    }

    if (!entries.length && cleaned && !jsonMatch) {
      entries = [{ client: '', text: cleaned }];
    }

    if (!entries.length && parseFailed) {
      return res.status(200).json({ error: "La photo contient beaucoup de texte, réessaie (éventuellement en prenant une section à la fois)." });
    }

    if (!entries.length) {
      console.error('OCR found no entries. Raw model output:', rawContent);
      return res.status(200).json({ error: 'Aucun texte lisible détecté sur la photo.' });
    }

    return res.status(200).json({ entries });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur : ' + e.message });
  }
}
