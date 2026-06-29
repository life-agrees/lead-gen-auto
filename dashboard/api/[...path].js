export default async function handler(req, res) {
  const path = req.url.replace(/^\/api/, '') || '/';
  const targetUrl = `https://p01--lead-gen--yg8hh58rzsgq.code.run/api${path}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.send(data);
  } catch (err) {
    res.status(502).json({ error: 'Backend unreachable', detail: err.message });
  }
}
