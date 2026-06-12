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
    generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req2 = https.request(options, (
