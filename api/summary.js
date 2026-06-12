const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { client, title, participants, type, date, transcript } = req.body;
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcription trop courte' });
  }
 const prompt = `Tu es un assistant expert en analyse de réunions commerciales pour technico-commerciaux. 
Analyse cette retranscription et génère un compte rendu commercial complet et structuré en français.

Contexte :
Client : ${client}
Objet : ${title}
Date : ${date}
Participants : ${participants}

Retranscription :
${transcript}

Génère un compte rendu avec TOUTES les sections pertinentes parmi :

1. RÉSUMÉ EXÉCUTIF (2-3 phrases synthétisant l'essentiel)
2. CONTEXTE & PARTICIPANTS (qui était présent, rôles, contexte)
3. BESOINS & PROBLÉMATIQUES DU CLIENT (ce que le client cherche, ses contraintes)
4. PRODUITS & SERVICES DISCUTÉS (ce qui a été présenté, démontré)
5. CONDITIONS COMMERCIALES (prix, remises négociées, conditions de paiement, délais)
6. OBJECTIONS SOULEVÉES (freins, hésitations du client et réponses apportées)
7. CONCURRENCE (concurrents mentionnés, comparaisons)
8. NIVEAU DE MATURITÉ (où en est le client dans sa décision, probabilité de signature)
9. DÉCISIONS PRISES (ce qui a été acté durant la réunion)
10. ACTIONS À SUIVRE (qui fait quoi et quand, côté client et côté commercial)
11. PROCHAINES ÉTAPES (prochain RDV, délai de réponse, relance prévue)
12. POINTS D'ATTENTION (risques, points sensibles à surveiller)

N'inclus que les sections pour lesquelles tu as des informations. Sois précis, professionnel et orienté action. Texte brut sans markdown.`;
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingLevel: "HIGH" } }
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
          const json = JSON.parse(data);
          const items = Array.isArray(json) ? json : [json];
          let summary = '';
          for (const item of items) {
            summary += item?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
          res.status(200).json({ summary });
        } catch (e) {
          res.status(500).json({ error: 'Parse error: ' + data.substring(0, 200) });
        }
        resolve();
      });
    });
    req2.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
    req2.write(body);
    req2.end();
  });
};
