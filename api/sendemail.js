const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, client, date, participants, summary } = req.body;

  const emailBody = JSON.stringify({
    from: 'MeetingAI <onboarding@resend.dev>',
    to: ['adeabreu@adt-industrie.fr'],
    subject: `Compte rendu - ${title} - ${client}`,
    text: `COMPTE RENDU DE RÉUNION\n\nClient : ${client}\nDate : ${date}\nParticipants : ${participants}\n\n${summary}`
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(emailBody)
      }
    };

    const req2 = https.request(options, (r) => {
      let data = '';
      r.on('data', (chunk) => { data += chunk; });
      r.on('end', () => {
        res.status(200).json({ success: true });
        resolve();
      });
    });

    req2.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    req2.write(emailBody);
    req2.end();
  });
};
