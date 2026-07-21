const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client, title, participants, type, date, transcript } = req.body;

  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcription trop courte' });
  }

  const prompt = `Tu es un assistant pour technico-commerciaux. Analyse cette retranscription et génère un compte rendu ULTRA CONCIS en français.

Contexte : Client: ${client} | Objet: ${title} | Type: ${type} | Date: ${date} | Participants: ${participants}

Retranscription :
${transcript}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans balises, sans commentaires) :
{
  "summary": "Compte rendu en 5-8 lignes maximum. Uniquement les faits essentiels. Format bullet points avec tirets. Pas d'introduction ni de conclusion.",
  "nextAction": "L'action prioritaire à faire en une phrase courte, ou vide si aucune",
  "nextDate": "Date au format YYYY-MM-DD si mentionnée, sinon chaine vide"
}`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req2 = https.request(options, (r) => {
      let data = '';
      r.on('data', (chunk) => { data += chunk; });
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (!text) {
            return res.status(500).json({ error: 'Réponse vide de Gemini' });
          }

          // Extraire le JSON de la réponse
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              return res.status(200).json({
                summary: (parsed.summary || '').replace(/\\n/g, '\n'),
                nextAction: parsed.nextAction || '',
                nextDate: parsed.nextDate || ''
              });
            } catch (parseErr) {
              // Si le JSON interne est invalide, on retourne le texte brut
              return res.status(200).json({ summary: text, nextAction: '', nextDate: '' });
            }
          }

          // Pas de JSON trouvé, on retourne le texte brut
          return res.status(200).json({ summary: text, nextAction: '', nextDate: '' });

        } catch (e) {
          return res.status(500).json({ error: 'Erreur de parsing : ' + e.message });
        }
        resolve();
      });
    });

    req2.on('error', (e) => {
      res.status(500).json({ error: 'Erreur réseau : ' + e.message });
      resolve();
    });

    req2.write(body);
    req2.end();
    resolve();
  });
};
