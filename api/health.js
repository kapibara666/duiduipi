export default async function handler(req, res) {
  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = (err.error?.message || '').toLowerCase();
      if (msg.includes('balance') || msg.includes('insufficient')) {
        return res.status(402).json({ status: 'balance_low', hint: 'DeepSeek 余额不足，请充值' });
      }
      return res.status(500).json({ status: 'error', detail: err });
    }
    return res.json({ status: 'ok' });
  } catch (e) {
    return res.status(500).json({ status: 'down' });
  }
}
