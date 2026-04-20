import axios from 'axios';
import { getConfig } from './apiConfig';

// ===== OAuth 인증 URL 생성 =====
export const getAuthUrl = () => {
  const config = getConfig();
  if (!config) throw new Error('설정이 없습니다.');

  const { appId, domain } = config;
  // REDIRECT_URI를 현재 도메인에서 동적으로 생성 (로컬/Vercel 모두 대응)
  const redirectUri = window.location.origin;

  const params = new URLSearchParams({
    client_id: appId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: 'aqara_state',
    theme: '0',
    lang: 'en',
  });

  return `https://${domain}/v3.0/open/authorize?${params.toString()}`;
};

// ===== Authorization Code → Access Token 교환 =====
export const exchangeCodeForToken = async (code) => {
  const config = getConfig();
  if (!config) throw new Error('설정이 없습니다.');

  const { appId, appKey, domain } = config;
  const redirectUri = window.location.origin;

  const params = new URLSearchParams();
  params.append('client_id', appId);
  params.append('client_secret', appKey);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);

  const res = await axios.post(
    `https://${domain}/v3.0/open/access_token`,
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
};
