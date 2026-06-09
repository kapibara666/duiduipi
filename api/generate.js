export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // IP 限流 — 10 次/天
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `${ip}:${today}`;

  if (!globalThis.__rateMap) globalThis.__rateMap = new Map();
  const count = globalThis.__rateMap.get(rateKey) || 0;
  if (count >= 10) {
    return res.status(429).json({ error: '今日免费额度已用完，明天再来吧~' });
  }
  globalThis.__rateMap.set(rateKey, count + 1);

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '参数错误' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 200,
        temperature: 0.9,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = (err.error?.message || '').toLowerCase();
      if (msg.includes('balance') || msg.includes('insufficient') || msg.includes('quota')) {
        return res.status(402).json({ error: '服务暂时不可用' });
      }
      if (resp.status === 401 || msg.includes('auth')) {
        return res.status(500).json({ error: '服务配置错误' });
      }
      if (msg.includes('content') || msg.includes('safety')) {
        return res.status(400).json({ error: '内容不适合展示，请换个说法' });
      }
      return res.status(500).json({ error: 'AI 服务异常，请稍后重试' });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 响应超时，请重试或缩短输入' });
    }
    return res.status(500).json({ error: '服务异常，请稍后重试' });
  }
}
