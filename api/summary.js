module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { client, title, participants, type, date, transcript } = req.body;
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: 'Transcription trop courte' });
  }
  const prompt = `Tu es un assistant pour technico-commerciaux. Génère un compte rendu professionnel.\nClient: ${client}\nObjet: ${title}\nDate: ${date}\nParticipants: ${participants}\nRetranscription: ${transcript}\n\nSections: Résumé, Points clés, Décisions, Actions à suivre, Prochaines étapes. Texte brut sans markdown.`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, temperature: 0.3 } })
    });
    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
