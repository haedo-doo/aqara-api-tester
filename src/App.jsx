import React, { useState, useEffect, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { getAuthUrl, exchangeCodeForToken } from './utils/oauth';
import { callApi, getConfig, saveConfig, clearConfig } from './utils/apiConfig';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';

// ============================================================
// Toast 컴포넌트
// ============================================================
const Toast = ({ toasts, removeToast }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        <span className="toast-icon">{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
        <span className="toast-message">{t.message}</span>
        <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
      </div>
    ))}
  </div>
);

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, addToast, removeToast };
};

// ============================================================
// 설정 화면
// ============================================================
const SettingsPage = ({ onSave, onCancel, currentConfig }) => {
  const [form, setForm] = useState({
    appId: currentConfig?.appId || '',
    appKey: currentConfig?.appKey || '',
    keyId: currentConfig?.keyId || '',
    domain: currentConfig?.domain || 'open-kr.aqara.com',
  });
  const [showKey, setShowKey] = useState(false);

  const domainOptions = [
    { value: 'open-kr.aqara.com', label: '🇰🇷 한국 (open-kr.aqara.com)' },
    { value: 'open-cn.aqara.com', label: '🇨🇳 중국 (open-cn.aqara.com)' },
    { value: 'open-usa.aqara.com', label: '🇺🇸 미국 (open-usa.aqara.com)' },
    { value: 'open-ger.aqara.com', label: '🇩🇪 유럽 (open-ger.aqara.com)' },
    { value: 'open-ru.aqara.com', label: '🇷🇺 러시아 (open-ru.aqara.com)' },
  ];

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>⚙️ API 설정</h2>
          {currentConfig && <button className="btn-ghost" onClick={onCancel}>✕ 닫기</button>}
        </div>
        <div className="settings-notice">
          <span>🔒</span>
          <span>입력한 키는 이 브라우저의 localStorage에만 저장됩니다. 외부 서버로는 전송되지 않습니다.</span>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (form.appId && form.appKey && form.keyId) onSave(form); }} className="settings-form">
          <div className="form-group">
            <label className="label">서버 도메인</label>
            <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} className="input-field">
              {domainOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">App ID <span className="required">*</span></label>
            <input type="text" value={form.appId} onChange={e => setForm(f => ({ ...f, appId: e.target.value }))}
              placeholder="예: ah_xxxxxxxxxxxxxxxx" className="input-field" required />
          </div>
          <div className="form-group">
            <label className="label">App Key <span className="required">*</span></label>
            <div className="input-with-toggle">
              <input type={showKey ? 'text' : 'password'} value={form.appKey}
                onChange={e => setForm(f => ({ ...f, appKey: e.target.value }))}
                placeholder="App Key 입력" className="input-field" required />
              <button type="button" className="toggle-visibility" onClick={() => setShowKey(v => !v)}>
                {showKey ? '숨김' : '표시'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Key ID <span className="required">*</span></label>
            <input type="text" value={form.keyId} onChange={e => setForm(f => ({ ...f, keyId: e.target.value }))}
              placeholder="Key ID 입력" className="input-field" required />
          </div>
          <button type="submit" className="btn-primary btn-full">저장하고 시작하기</button>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// 기기 선택 모달
// ============================================================
const DeviceModal = ({ devices, onSelect, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-panel" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>📱 내 기기 선택 (하나만 선택)</h2>
        <button className="btn-ghost" onClick={onClose}>✕ 닫기</button>
      </div>
      <div className="modal-body">
        {devices.length === 0 ? (
          <p className="empty-msg">등록된 기기가 없습니다.</p>
        ) : (
          <div className="device-list">
            {devices.map((d, i) => (
              <button key={i} className="device-item" onClick={() => onSelect(d)}>
                <div className="device-name">{d.deviceName || '이름 없음'}</div>
                <div className="device-did">DID: {d.did}</div>
                <div className="device-model">Model: {d.model}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ============================================================
// 리소스 선택 모달
// ============================================================
const ResourceModal = ({ resources, selected, onToggle, onSelectAll, onAutoSelect, onApply, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-panel" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>🔌 Resource ID 선택 (최대 100개)</h2>
        <button className="btn-ghost" onClick={onClose}>✕ 닫기</button>
      </div>
      <div className="modal-body">
        <div className="resource-summary">
          총 {resources.length}개 ·
          <strong style={{ color: selected.length >= 100 ? 'var(--danger)' : 'var(--accent)' }}>
            {selected.length}/100 선택됨
          </strong>
        </div>
        <div className="resource-actions">
          <button className="btn-ghost-sm" onClick={onSelectAll}>
            {selected.length === resources.length ? '전체 해제' : '전체 선택 (최대 100)'}
          </button>
          <button className="btn-ghost-sm" onClick={onAutoSelect}>
            나머지 자동 선택 ({100 - selected.length}개 남음)
          </button>
        </div>
        <div className="resource-list">
          {resources.map((res, i) => {
            const isDisabled = selected.length >= 100 && !selected.includes(res.resourceId);
            return (
              <label key={i} className={`resource-item ${isDisabled ? 'disabled' : ''}`}>
                <input type="checkbox" checked={selected.includes(res.resourceId)}
                  onChange={() => onToggle(res.resourceId)} disabled={isDisabled} />
                <span className="resource-id">{res.resourceId}</span>
                <span className="resource-name">{res.name || res.description || '이름 없음'}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-primary" style={{ flex: 1 }} onClick={onApply}>
          적용 ({selected.length}개)
        </button>
        <button className="btn-danger" style={{ flex: 1 }} onClick={onClose}>취소</button>
      </div>
    </div>
  </div>
);

// ============================================================
// 진행 바
// ============================================================
const ProgressBar = ({ current }) => (
  <div className="progress-container">
    <div className="progress-header">
      <span>전체 데이터 수집 중...</span>
      <span className="progress-count">{current.toLocaleString()}건</span>
    </div>
    <div className="progress-bar"><div className="progress-fill" /></div>
  </div>
);

// ============================================================
// 메인 App
// ============================================================
function App() {
  const { toasts, addToast, removeToast } = useToast();

  // ----- 탭 -----
  const [activeMainTab, setActiveMainTab] = useState('history'); // 'history' | 'push'

  // ----- 설정 -----
  const [config, setConfig] = useState(getConfig());
  const [showSettings, setShowSettings] = useState(false);

  // ----- 인증 -----
  const [token, setToken] = useState(null);
  const loginDoneRef = useRef(false); // 토스트 중복 방지

  // ----- 로딩 -----
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const fetchingRef = useRef(false);

  // ----- 기기 / 리소스 -----
  const [deviceList, setDeviceList] = useState([]);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [resourceList, setResourceList] = useState([]);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);

  // ----- 구독 -----
  const [wsStatus, setWsStatus] = useState('중지됨');

  // ----- Push 수신 화면 -----
  const [pushMessages, setPushMessages] = useState([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  // ----- 쿼리 파라미터 -----
  const [subjectId, setSubjectId] = useState('');
  const [resourceIdsStr, setResourceIdsStr] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  // ----- 결과 -----
  const [rawResponse, setRawResponse] = useState(null);
  const [allHistoryData, setAllHistoryData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('formatted');

  // ===== 설정 저장 / 초기화 =====
  const handleSaveConfig = (newConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
    setShowSettings(false);
    addToast('설정이 저장되었습니다.', 'success');
  };
  const handleClearConfig = () => {
    clearConfig(); setConfig(null); setToken(null);
    loginDoneRef.current = false;
    localStorage.removeItem('aqara_token');
    addToast('설정이 초기화되었습니다.', 'info');
  };

  // ===== 토큰 세팅 (중복 토스트 방지) =====
  const applyToken = useCallback((tokenData) => {
    setToken(tokenData);
    localStorage.setItem('aqara_token', JSON.stringify(tokenData));
    if (!loginDoneRef.current) {
      loginDoneRef.current = true;
      addToast('로그인 성공!', 'success');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== OAuth 콜백: 팝업이면 postMessage 후 닫기, 메인창이면 직접 처리 =====
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      if (window.opener && !window.opener.closed) {
        // 팝업창: 부모창에 code 전달 후 닫기
        window.opener.postMessage({ type: 'AQARA_AUTH_CODE', code }, window.location.origin);
        window.close();
        return;
      }
      // 메인창 직접 리디렉션 (팝업 차단 시)
      setLoading(true);
      exchangeCodeForToken(code)
        .then(applyToken)
        .catch(err => addToast('토큰 획득 실패: ' + err.message, 'error'))
        .finally(() => { setLoading(false); window.history.replaceState({}, '', '/'); });
    } else {
      const saved = localStorage.getItem('aqara_token');
      if (saved) setToken(JSON.parse(saved));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 팝업 → 메인창 메시지 수신 =====
  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'AQARA_AUTH_CODE') return;
      setLoading(true);
      exchangeCodeForToken(event.data.code)
        .then(applyToken)
        .catch(err => addToast('토큰 획득 실패: ' + err.message, 'error'))
        .finally(() => setLoading(false));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 로그인 팝업 =====
  const openLoginPopup = () => {
    if (!config) { addToast('먼저 API 설정을 완료해 주세요.', 'error'); setShowSettings(true); return; }
    try {
      loginDoneRef.current = false;
      const popup = window.open(getAuthUrl(), 'AqaraLogin', 'width=560,height=720');
      if (!popup) addToast('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.', 'error');
    } catch (err) { addToast(err.message, 'error'); }
  };

  // ===== 로그아웃 =====
  const logout = () => {
    setToken(null); loginDoneRef.current = false;
    localStorage.removeItem('aqara_token');
    setRawResponse(null); setAllHistoryData([]); setTotalCount(0);
    setSubjectId(''); setResourceIdsStr(''); setStartTime(null); setEndTime(null);
    setDeviceList([]); setResourceList([]); setSelectedResources([]);
    setWsStatus('중지됨');
    addToast('로그아웃되었습니다.', 'info');
  };

  const pushApiBase = import.meta.env.VITE_PUSH_API_URL || '';

  // ===== Push 메시지 조회 =====
  const fetchPushMessages = async () => {
    if (!token?.openId) return;
    setPushLoading(true);
    try {
      // const res = await fetch(`/api/messages?openId=${encodeURIComponent(token.openId)}`);
      const res = await fetch(`${pushApiBase}/api/messages?openId=${encodeURIComponent(token.openId)}`);
      const data = await res.json();
      if (data.code === 0) {
        setPushMessages(data.messages || []);
      } else {
        addToast('메시지 조회 실패: ' + data.message, 'error');
      }
    } catch (err) {
      addToast('메시지 조회 오류: ' + err.message, 'error');
    } finally {
      setPushLoading(false);
    }
  };

  // ===== Push 메시지 전체 삭제 =====
  const clearPushMessages = async () => {
    if (!token?.openId) return;
    try {
      // const res = await fetch(`/api/messages?openId=${encodeURIComponent(token.openId)}`, { method: 'DELETE' });
      const res = await fetch(`${pushApiBase}/api/messages?openId=${encodeURIComponent(token.openId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 0) {
        setPushMessages([]);
        addToast('메시지가 삭제되었습니다.', 'success');
      }
    } catch (err) {
      addToast('삭제 오류: ' + err.message, 'error');
    }
  };

  // ===== 자동 새로고침 토글 =====
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
      setAutoRefresh(false);
      addToast('자동 새로고침 중지', 'info');
    } else {
      fetchPushMessages();
      autoRefreshRef.current = setInterval(fetchPushMessages, 5000);
      setAutoRefresh(true);
      addToast('5초마다 자동 새로고침 시작', 'success');
    }
  };

  // 탭 변경 시 자동 새로고침 정리
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, []);

  // ===== 기기 목록 조회 =====
  const fetchDeviceList = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await callApi('query.device.info', {}, token.access_token);

      // 실제 응답 구조 확인 (F12 콘솔에서 확인 가능)
      // console.log('=== query.device.info 응답 ===', JSON.stringify(data, null, 2));

      // callApi 반환: { code:0, result: { data:[...] } }
      const list = data?.result?.data || [];
      // console.log('=== 추출된 기기 목록:', list);

      if (list.length === 0) {
        addToast('등록된 기기가 없습니다. F12 콘솔에서 실제 응답 구조를 확인해 주세요.', 'info');
        return;
      }
      setDeviceList(list);
      setShowDeviceModal(true);
    } catch (err) {
      addToast('기기 조회 실패: ' + err.message, 'error');
    } finally { setLoading(false); }
  };

  // ===== 기기 선택 → 리소스 조회 =====
  const handleSelectDevice = async (dev) => {
    setSubjectId(dev.did);
    setShowDeviceModal(false);
    addToast(`기기 선택됨: ${dev.deviceName || dev.did}`, 'success');

    // 기기 객체 전체 확인용 로그 (모델명 필드 확인)
    // console.log('=== 선택된 기기 전체 객체 ===', JSON.stringify(dev, null, 2));

    // 가능한 모든 model 필드명 시도
    const model = dev.model || dev.productId || dev.modelId || dev.deviceModel || dev.modelName;
    // console.log('=== 추출된 model 값 ===', model);

    if (!model) {
      addToast('이 기기의 모델명을 확인할 수 없습니다. F12 콘솔을 확인해 주세요.', 'error');
      return;
    }

    // API로 리소스 조회
    // console.log('=== callApi 호출 직전 ===', model, token?.access_token?.slice(0,10));
    setLoading(true);
    try {
      const data = await callApi('query.resource.info', { model }, token.access_token);

      // console.log('=== callApi 응답 수신 ===', JSON.stringify(data, null, 2));

      // query.resource.info: callApi가 res.data 전체 반환 → result가 직접 배열
      // { code:0, result: [...] }
      let resourceArray = [];
      if (Array.isArray(data?.result))           resourceArray = data.result;
      else if (Array.isArray(data?.result?.data)) resourceArray = data.result.data;
      else if (Array.isArray(data))              resourceArray = data;

      // console.log('=== resourceArray 길이 ===', resourceArray.length);

      if (resourceArray.length === 0) {
        addToast(`이 기기(${model})는 API에서 리소스 정보를 제공하지 않습니다. Resource ID를 직접 입력해 주세요.`, 'info');
        return;
      }

      setLoading(false);
      setResourceList(resourceArray);
      setSelectedResources([]);
      setShowResourceModal(true);
    } catch (err) {
      // console.log('=== callApi catch ===', err.message);
      addToast('리소스 조회 실패: ' + err.message, 'error');
    } finally { setLoading(false); }
  };

  // ===== 리소스 선택 핸들러 =====
  const toggleResource = (id) => {
    setSelectedResources(prev =>
      prev.includes(id) ? prev.filter(r => r !== id)
        : prev.length >= 100 ? (addToast('최대 100개까지만 선택 가능합니다.', 'error'), prev)
        : [...prev, id]
    );
  };
  const selectAllResources = () => {
    if (selectedResources.length === resourceList.length) setSelectedResources([]);
    else setSelectedResources(resourceList.slice(0, 100).map(r => r.resourceId));
  };
  const autoSelectResources = () => {
    const remaining = 100 - selectedResources.length;
    if (remaining <= 0) { addToast('이미 100개를 선택했습니다.', 'error'); return; }
    const unselected = resourceList.filter(r => !selectedResources.includes(r.resourceId)).slice(0, remaining);
    setSelectedResources(prev => [...prev, ...unselected.map(r => r.resourceId)]);
  };
  const applyResources = () => {
    if (selectedResources.length === 0) { addToast('최소 1개 이상 선택해 주세요.', 'error'); return; }
    setResourceIdsStr(selectedResources.join(','));
    setShowResourceModal(false);
    addToast(`${selectedResources.length}개 Resource ID가 적용되었습니다.`, 'success');
  };

  // ===== 구독 시작 =====
  const startSubscribe = async () => {
    if (!token || !subjectId || !resourceIdsStr) {
      addToast('Subject ID와 Resource IDs를 먼저 선택해 주세요.', 'error'); return;
    }
    const resourceIds = resourceIdsStr.split(',').map(s => s.trim()).filter(Boolean);
    setLoading(true);
    try {
      const data = await callApi('config.resource.subscribe', {
        resources: [{ subjectId: subjectId.trim(), resourceIds }]
      }, token.access_token);
      // 구독 성공 후 Push 수신 탭으로 자동 이동
      setWsStatus('구독됨');
      addToast('구독 성공! Push 수신 탭으로 이동합니다.', 'success');
      setActiveMainTab('push');
      fetchPushMessages();
    } catch (err) {
      // console.log('## config.resource.subscribe 에러:', err.message);
      addToast('구독 오류: ' + err.message, 'error');
    } finally { setLoading(false); }
  };

  // ===== 구독 취소 =====
  const stopSubscribe = async () => {
    if (!token || !subjectId || !resourceIdsStr) return;
    const resourceIds = resourceIdsStr.split(',').map(s => s.trim()).filter(Boolean);
    setLoading(true);
    try {
      await callApi('config.resource.unsubscribe', {
        resources: [{ subjectId: subjectId.trim(), resourceIds }]
      }, token.access_token);
      // callApi가 에러 없이 반환되면 성공
      setWsStatus('중지됨');
      addToast('구독이 중지되었습니다.', 'info');
    } catch (err) {
      addToast('중지 오류: ' + err.message, 'error');
    } finally { setLoading(false); }
  };

  // ===== 첫 페이지 조회 =====
  const fetchHistory = async () => {
    if (!token || !subjectId.trim() || !resourceIdsStr.trim() || !startTime) {
      addToast('모든 필드를 입력해 주세요.', 'error'); return;
    }
    const resourceIds = resourceIdsStr.split(',').map(s => s.trim()).filter(Boolean);
    const start = startTime.getTime().toString();
    const end = endTime ? endTime.getTime().toString() : Date.now().toString();
    if (parseInt(end) - parseInt(start) > 7 * 24 * 60 * 60 * 1000) {
      addToast('조회 기간은 최대 7일 이내로 설정해 주세요.', 'error'); return;
    }
    try {
      setLoading(true);
      setRawResponse(null); setAllHistoryData([]); setTotalCount(0);
      const data = await callApi('fetch.resource.history', {
        subjectId: subjectId.trim(), resourceIds, startTime: start, endTime: end, size: 300,
      }, token.access_token);

      // callApi는 res.data 전체를 반환: { code:0, result: { data:[...], scanId:... } }
      const result = data?.result;
      setRawResponse(result);
      addToast(`첫 페이지 조회 성공! (${result?.data?.length || 0}건)`, 'success');
    } catch (err) {
      addToast('조회 실패: ' + err.message, 'error');
    } finally { setLoading(false); }
  };

  // ===== 전체 페이지 순회 =====
  const fetchAllHistory = async () => {
    if (!rawResponse || fetchingRef.current) return;
    fetchingRef.current = true;
    setFetchingAll(true);
    let allData = [...(rawResponse.data || [])];
    let currentScanId = rawResponse.scanId;
    while (currentScanId) {
      try {
        const data = await callApi('fetch.resource.history', {
          subjectId: subjectId.trim(),
          resourceIds: resourceIdsStr.split(',').map(s => s.trim()).filter(Boolean),
          startTime: startTime.getTime().toString(),
          endTime: endTime ? endTime.getTime().toString() : Date.now().toString(),
          scanId: currentScanId, size: 300,
        }, token.access_token);
        const result = data?.result;
        if (result?.data?.length > 0) allData = allData.concat(result.data);
        currentScanId = result?.scanId || null;
        setAllHistoryData([...allData]);
        setTotalCount(allData.length);
      } catch (err) {
        addToast('페이지 조회 실패: ' + err.message, 'error');
        break;
      }
    }
    setAllHistoryData(allData); setTotalCount(allData.length);
    fetchingRef.current = false; setFetchingAll(false);
    addToast(`전체 데이터 조회 완료! 총 ${allData.length}건`, 'success', 6000);
  };

  // ===== JSON 다운로드 =====
  const downloadJson = () => {
    if (allHistoryData.length === 0) { addToast('다운로드할 데이터가 없습니다.', 'error'); return; }
    const safeName = subjectId.trim().replace(/[<>:"/\\|?*]/g, '_');
    const blob = new Blob([JSON.stringify(allHistoryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeName}_history.json`; a.click();
    URL.revokeObjectURL(url);
    addToast('JSON 다운로드 시작', 'success');
  };

  // ===== CSV 다운로드 =====
  const downloadCsv = () => {
    if (allHistoryData.length === 0) { addToast('다운로드할 데이터가 없습니다.', 'error'); return; }
    const safeName = subjectId.trim().replace(/[<>:"/\\|?*]/g, '_');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const fmt = ts => {
      const d = new Date(parseInt(ts)); const p = n => String(n).padStart(2, '0');
      const h = d.getHours(); const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]} ${h < 12 ? '오전' : '오후'} ${h12}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };
    const escCsv = str => {
      str = str == null ? '' : String(str);
      return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const headers = ['Timestamp', 'Date Time (Korean)', 'Resource ID', 'Value', 'Device DID'];
    let csv = '\uFEFF' + headers.join(',') + '\n';
    allHistoryData.forEach(item => {
      let val = item.value;
      try { val = JSON.stringify(JSON.parse(val)); } catch {}
      csv += [item.timeStamp, fmt(item.timeStamp), item.resourceId, escCsv(val), item.subjectId].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeName}_history_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast('CSV 다운로드 시작', 'success');
  };

  // ============================================================
  // 렌더링
  // ============================================================
  return (
    <div className="app-root">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* 설정 오버레이 */}
      {(!config || showSettings) && (
        <SettingsPage onSave={handleSaveConfig}
          onCancel={showSettings ? () => setShowSettings(false) : null}
          currentConfig={config} />
      )}

      {/* 기기 선택 모달 */}
      {showDeviceModal && (
        <DeviceModal devices={deviceList}
          onSelect={handleSelectDevice}
          onClose={() => setShowDeviceModal(false)} />
      )}

      {/* 리소스 선택 모달 */}
      {showResourceModal && (
        <ResourceModal
          resources={resourceList} selected={selectedResources}
          onToggle={toggleResource} onSelectAll={selectAllResources}
          onAutoSelect={autoSelectResources} onApply={applyResources}
          onClose={() => setShowResourceModal(false)} />
      )}

      {/* 헤더 */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-dot" />
            <span className="brand-name">Aqara API Tester</span>
            {config && <span className="brand-domain">{config.domain}</span>}
          </div>
          <div className="header-actions">
            <button className="btn-icon" onClick={() => setShowSettings(true)} title="API 설정">⚙️</button>
            {config && <button className="btn-ghost-sm" onClick={handleClearConfig}>설정 초기화</button>}
          </div>
        </div>
      </header>

      {loading && <div className="loading-bar"><div className="loading-bar-fill" /></div>}

      {/* 메인 탭 메뉴 - 로그인 후에만 표시 */}
      {token && (
        <div className="main-tab-bar">
          <div className="main-tab-inner">
            <button
              className={`main-tab ${activeMainTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('history')}
            >
              📊 히스토리 조회
            </button>
            <button
              className={`main-tab ${activeMainTab === 'push' ? 'active' : ''}`}
              onClick={() => { setActiveMainTab('push'); fetchPushMessages(); }}
            >
              📡 Push 수신
              {pushMessages.length > 0 && (
                <span className="tab-badge">{pushMessages.length}</span>
              )}
            </button>
          </div>
        </div>
      )}

      <main className="app-main">
        {/* ===== 로그인 전 ===== */}
        {!token ? (
          <div className="login-section">
            <div className="login-card">
              <div className="login-icon">🏠</div>
              <h1 className="login-title">Aqara API Tester</h1>
              <p className="login-desc">Aqara 계정으로 로그인하여<br />디바이스 데이터를 조회하세요.</p>
              {!config && <p className="login-warning">⚠️ 상단 ⚙️ 버튼에서 API 설정을 먼저 완료해 주세요.</p>}
              <button className="btn-primary btn-login" onClick={openLoginPopup} disabled={loading}>
                {loading ? '처리 중...' : 'Aqara 계정으로 로그인'}
              </button>
              {config && <p className="login-hint">현재 설정: <strong>{config.domain}</strong> · App ID: <strong>{config.appId}</strong></p>}
            </div>
          </div>
        ) : (
          <div className="dashboard">

            {/* 상태 바 + 구독 버튼 - 항상 표시 */}
            <div className="status-bar">
              <div className="status-info">
                <span className="status-dot" />
                <span className="status-text">로그인됨</span>
                <span className="status-openid">{token.openId}</span>
              </div>
              <div className="status-actions">
                {wsStatus === '중지됨' ? (
                  <button className="btn-subscribe" onClick={startSubscribe} disabled={loading}>구독 시작</button>
                ) : (
                  <button className="btn-unsubscribe" onClick={stopSubscribe} disabled={loading}>구독 중지</button>
                )}
                <span className={`subscribe-badge ${wsStatus === '구독됨' ? 'active' : ''}`}>{wsStatus}</span>
                <button className="btn-ghost-sm" onClick={logout}>로그아웃</button>
              </div>
            </div>

            {/* ===== 히스토리 조회 탭 ===== */}
            {activeMainTab === 'history' && (<>

            {/* 파라미터 카드 */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📋 조회 파라미터</h3>
                <button className="btn-select-device" onClick={fetchDeviceList} disabled={loading}>
                  {loading ? '불러오는 중...' : '📱 내 기기 선택하기'}
                </button>
              </div>
              <div className="param-grid">
                <div className="form-group">
                  <label className="label">Subject ID <span className="label-hint">(디바이스 DID)</span></label>
                  <input type="text" value={subjectId} onChange={e => setSubjectId(e.target.value)}
                    placeholder="예: lumi.158d00041a3e08" className="input-field" />
                </div>
                <div className="form-group">
                  <label className="label">Resource IDs <span className="label-hint">(쉼표로 구분)</span></label>
                  <input type="text" value={resourceIdsStr} onChange={e => setResourceIdsStr(e.target.value)}
                    placeholder="예: 0.1.2, 4.1.85, 13.1.85" className="input-field" />
                </div>
                <div className="form-group">
                  <label className="label">시작 시간</label>
                  <DatePicker selected={startTime} onChange={setStartTime}
                    showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                    dateFormat="yyyy-MM-dd HH:mm" placeholderText="시작 시간 선택"
                    className="input-field datepicker-input" />
                </div>
                <div className="form-group">
                  <label className="label">종료 시간 <span className="label-hint">(미선택 시 현재)</span></label>
                  <DatePicker selected={endTime} onChange={setEndTime}
                    showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                    dateFormat="yyyy-MM-dd HH:mm" placeholderText="종료 시간 (선택사항)"
                    className="input-field datepicker-input" />
                </div>
              </div>
              <div className="card-footer">
                <button className="btn-primary" onClick={fetchHistory} disabled={loading}>
                  {loading ? '⏳ 조회 중...' : '🔍 첫 페이지 데이터 조회'}
                </button>
                <span className="hint-text">조회 가능 기간: 최대 7일</span>
              </div>
            </div>

            {fetchingAll && <ProgressBar current={totalCount} />}

            {/* 결과 카드 */}
            {rawResponse && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    📊 조회 결과
                    <span className="result-count">{(allHistoryData.length > 0 ? allHistoryData : rawResponse.data || []).length}건</span>
                    {rawResponse.scanId && allHistoryData.length === 0 && <span className="more-badge">추가 데이터 있음</span>}
                  </h3>
                  <div className="tab-group">
                    <button className={`tab ${activeTab === 'formatted' ? 'active' : ''}`} onClick={() => setActiveTab('formatted')}>표 형식</button>
                    <button className={`tab ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>JSON</button>
                  </div>
                </div>
                {activeTab === 'formatted' ? (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead><tr><th>#</th><th>타임스탬프</th><th>날짜/시간</th><th>Resource ID</th><th>Value</th></tr></thead>
                      <tbody>
                        {(allHistoryData.length > 0 ? allHistoryData : rawResponse.data || []).map((item, i) => (
                          <tr key={i}>
                            <td className="td-num">{i + 1}</td>
                            <td className="td-mono">{item.timeStamp}</td>
                            <td className="td-mono">{new Date(parseInt(item.timeStamp)).toLocaleString('ko-KR')}</td>
                            <td className="td-mono">{item.resourceId}</td>
                            <td className="td-value">{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre className="json-view">{JSON.stringify(allHistoryData.length > 0 ? allHistoryData : rawResponse, null, 2)}</pre>
                )}
                {rawResponse.scanId && !fetchingAll && allHistoryData.length === 0 && (
                  <div className="card-footer">
                    <button className="btn-warning" onClick={fetchAllHistory}>📥 전체 데이터 모두 가져오기</button>
                    <span className="hint-text">첫 페이지 이후 추가 데이터가 있습니다.</span>
                  </div>
                )}
              </div>
            )}

            {/* 다운로드 카드 */}
            {allHistoryData.length > 0 && (
              <div className="card card-download">
                <div className="download-summary">
                  <div className="download-count">
                    <span className="count-num">{totalCount.toLocaleString()}</span>
                    <span className="count-label">건 수집 완료</span>
                  </div>
                  <div className="download-actions">
                    <button className="btn-download btn-json" onClick={downloadJson}>⬇ JSON 다운로드</button>
                    <button className="btn-download btn-csv" onClick={downloadCsv}>⬇ CSV 다운로드</button>
                  </div>
                </div>
              </div>
            )}

            </>)}

            {/* ===== Push 수신 탭 ===== */}
            {activeMainTab === 'push' && (
              <div className="push-section">
                {/* Push 서버 URL 안내 */}
                <div className="card card-push-info">
                  <div className="card-header">
                    <h3 className="card-title">📡 Push 수신 서버</h3>
                    <div className="push-controls">
                      <button
                        className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
                        onClick={toggleAutoRefresh}
                      >
                        {autoRefresh ? '⏹ 자동 새로고침 중지' : '▶ 자동 새로고침 (5초)'}
                      </button>
                      <button className="btn-ghost-sm" onClick={fetchPushMessages} disabled={pushLoading}>
                        {pushLoading ? '로딩...' : '🔄 새로고침'}
                      </button>
                      <button className="btn-danger-sm" onClick={clearPushMessages} disabled={pushMessages.length === 0}>
                        🗑 전체 삭제
                      </button>
                    </div>
                  </div>
                  <div className="push-url-box">
                    <span className="push-url-label">Push 서버 URL (Aqara 개발자 콘솔에 등록)</span>
                    <div className="push-url-value">
                      {/* <code>{window.location.origin}/api/push</code> */}
                      <code>{pushApiBase || window.location.origin}/api/push</code>
                      <button
                        className="btn-copy"
                        onClick={() => {
                          // navigator.clipboard.writeText(`${window.location.origin}/api/push`);
                          navigator.clipboard.writeText(`${pushApiBase || window.location.origin}/api/push`);
                          addToast('URL이 복사되었습니다.', 'success');
                        }}
                      >
                        복사
                      </button>
                    </div>
                  </div>
                </div>

                {/* 메시지 목록 */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      수신된 메시지
                      <span className="result-count">{pushMessages.length}건</span>
                    </h3>
                    <div className="tab-group">
                      <button
                        className={`tab ${activeTab === 'formatted' ? 'active' : ''}`}
                        onClick={() => setActiveTab('formatted')}
                      >표 형식</button>
                      <button
                        className={`tab ${activeTab === 'raw' ? 'active' : ''}`}
                        onClick={() => setActiveTab('raw')}
                      >JSON</button>
                    </div>
                  </div>

                  {pushMessages.length === 0 ? (
                    <div className="push-empty">
                      <div className="push-empty-icon">📭</div>
                      <p>수신된 메시지가 없습니다.</p>
                      <p className="push-empty-hint">Aqara 개발자 콘솔에서 위 URL을 Push Server로 등록해 주세요.</p>
                    </div>
                  ) : activeTab === 'formatted' ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>수신 시간</th>
                            <th>msgType</th>
                            <th>Subject ID</th>
                            <th>Resource ID</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pushMessages.map((msg, i) => {
                            const dataItem = msg?.data?.[0] || {};
                            return (
                              <tr key={i}>
                                <td className="td-num">{i + 1}</td>
                                <td className="td-mono">{msg.receivedAt ? new Date(msg.receivedAt).toLocaleString('ko-KR') : '-'}</td>
                                <td className="td-mono">{msg.msgType || '-'}</td>
                                <td className="td-mono">{dataItem.subjectId || '-'}</td>
                                <td className="td-mono">{dataItem.resourceId || '-'}</td>
                                <td className="td-value">{dataItem.value || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="json-view">
                      {JSON.stringify(pushMessages, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>Aqara API Tester — 테스트 목적 전용</span>
      </footer>
    </div>
  );
}

export default App;