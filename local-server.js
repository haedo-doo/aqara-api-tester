// 로컬 개발 전용 서버 (Vercel 배포 시에는 api/ 폴더의 Serverless Function 사용)
// 실행: node local-server.js
// ngrok 외부 접근: ngrok http 3001

const express = require('express');
const app = express();
app.use(express.json());

// openId별 메시지 저장소
const messageStore = {};

// Aqara Push 수신
app.post('/api/push', (req, res) => {
  const message = req.body;
  const openId = message?.openId;

  if (!openId) {
    console.warn('openId 없는 메시지');
    return res.json({ code: 0 });
  }

  console.log(`[${openId.slice(0, 8)}...] 메시지 수신:`, JSON.stringify(message, null, 2));

  if (!messageStore[openId]) messageStore[openId] = [];
  messageStore[openId].unshift({ ...message, receivedAt: Date.now() });
  if (messageStore[openId].length > 100) {
    messageStore[openId] = messageStore[openId].slice(0, 100);
  }

  res.json({ code: 0 });
});

// openId별 메시지 조회
app.get('/api/messages', (req, res) => {
  const { openId } = req.query;
  if (!openId) return res.status(400).json({ code: -1, message: 'openId 파라미터 필요' });

  const messages = messageStore[openId] || [];
  res.json({ code: 0, messages });
});

// openId별 메시지 삭제
app.delete('/api/messages', (req, res) => {
  const { openId } = req.query;
  if (!openId) return res.status(400).json({ code: -1, message: 'openId 파라미터 필요' });

  messageStore[openId] = [];
  res.json({ code: 0, message: '삭제 완료' });
});

app.listen(3001, () => {
  console.log('로컬 Push 서버 시작: http://localhost:3001');
  console.log('ngrok 사용 시: ngrok http 3001');
  console.log('Aqara 개발자 콘솔에 등록할 URL: https://xxxx.ngrok.io/api/push');
});