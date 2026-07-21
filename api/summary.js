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

Réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{
  "summary": "Compte rendu en 5-8 lignes maximum. Uniquement les faits essentiels : ce qui a été dit, décidé, et les points bloquants. Pas d'introduction, pas de conclusion, pas de blabla. Format : bullet points courts avec tirets.",
  "nextAction": "L'action prioritaire à faire (une phrase courte ex: Envoyer devis) ou vide",
  "nextDate": "Date au format YYYY-MM-DD si mentionnée sinon vide"
}`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3-flash-preview:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req2 = https.request(options, (r) => {
      let data = '';
      r.on('data', (chunk) => { data += chunk; });
      r.on('end', () => {
        try {
          const items = JSON.parse(data);
          const arr = Array.isArray(items) ? items : [items];
          let text = '';
          for (const item of arr) {
            text += item?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.status(200).json({ summary: parsed.summary || text, nextAction: parsed.nextAction || '', nextDate: parsed.nextDate || '' });
          }
          return res.status(200).json({ summary: text, nextAction: '', nextDate: '' });
        } catch (e) {
          return res.status(500).json({ error: 'Erreur de génération, veuillez réessayer.' });
        }
        resolve();
      });
    });

    req2.on('error', (e) => { res.status(500).json({ error: 'Erreur réseau : ' + e.message }); resolve(); });
    req2.write(body);
    req2.end();
    resolve();
  });
};
