import { Redis } from '@upstash/redis';

// Aqara HTTP Push 수신 엔드포인트
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, token, time, nonce, appkey, sign');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET 요청 시에도 검증용으로 { code: 0 } 반환 (일부 검증 도구가 GET으로 확인)
  if (req.method === 'GET') {
    return res.status(200).json({ code: 0 });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: -1, message: '허용되지 않는 메서드' });
  }

  const message = req.body;

  // openId 없는 경우 = Aqara 연결 검증 요청
  // Redis 연결 없이 즉시 성공 응답
  if (!message || !message.openId) {
    console.log('검증 요청 수신 - body:', JSON.stringify(message));
    return res.status(200).json({ code: 0 });
  }

  // 실제 메시지 저장
  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const key = `aqara:messages:${message.openId}`;
    const entry = { ...message, receivedAt: Date.now() };

    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 99);

    return res.status(200).json({ code: 0 });
  } catch (err) {
    console.error('Push 저장 오류:', err.message);
    return res.status(500).json({ code: -1, message: err.message });
  }
}