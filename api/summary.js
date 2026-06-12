const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { client, title, participants, type, date, transcript } = req.body;
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcription trop courte' });
  }
  const prompt = `Tu es un assistant pour technico-commerciaux. Génère un compte rendu professionnel.\nClient: ${client}\nObjet: ${title}\nDate: ${date}\nParticipants: ${participants}\nRetranscription: ${transcript}\n\nSections: Résumé, Points clés, Décisions, Actions à suivre, Prochaines étapes. Texte brut sans markdown.`;

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
