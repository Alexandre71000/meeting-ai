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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}
