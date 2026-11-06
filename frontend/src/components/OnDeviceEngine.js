import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Hidden WebView that runs the PotatoGuard model on the phone (ONNX Runtime Web -> engine.html).
 * Usage:
 *   const engine = useRef(null);
 *   <OnDeviceEngine ref={engine} url={ENGINE_URL} onStatus={(s) => ...} />   // s: 'loading' | 'ready' | 'failed'
 *   const p = await engine.current.predict(base64Jpeg);   // {disease, confidence, uncertain, probabilities}
 * The first run downloads the ~10 MB model from `url`; later runs use the WebView cache.
 */
const LOAD_TIMEOUT_MS = 90000;
const PREDICT_TIMEOUT_MS = 60000;

const OnDeviceEngine = forwardRef(function OnDeviceEngine({ url, onStatus }, ref) {
  const web = useRef(null);
  const state = useRef({ ready: false, failure: null, waiters: [], pending: {}, nextId: 1 });

  const setStatus = useCallback((s) => { if (onStatus) onStatus(s); }, [onStatus]);

  const fail = useCallback((message) => {
    const st = state.current;
    st.failure = message;
    st.waiters.splice(0).forEach((w) => w.reject(new Error(message)));
    Object.values(st.pending).forEach((p) => p.reject(new Error(message)));
    st.pending = {};
    setStatus('failed');
  }, [setStatus]);

  const whenReady = () => {
    const st = state.current;
    if (st.ready) return Promise.resolve();
    if (st.failure) return Promise.reject(new Error(st.failure));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('The on-device AI is still loading. Check your internet connection (needed once) and try again.')),
        LOAD_TIMEOUT_MS
      );
      st.waiters.push({
        resolve: () => { clearTimeout(timer); resolve(); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
    });
  };

  useImperativeHandle(ref, () => ({
    predict: async (base64) => {
      await whenReady();
      const st = state.current;
      const id = st.nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { delete st.pending[id]; reject(new Error('Analysis timed out. Try again.')); }, PREDICT_TIMEOUT_MS);
        st.pending[id] = {
          resolve: (r) => { clearTimeout(timer); resolve(r); },
          reject: (e) => { clearTimeout(timer); reject(e); },
        };
        web.current.postMessage(JSON.stringify({ type: 'predict', id, base64 }));
      });
    },
  }));

  const onMessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch (e) { return; }
    const st = state.current;
    if (msg.type === 'ready') {
      st.ready = true;
      st.waiters.splice(0).forEach((w) => w.resolve());
      setStatus('ready');
    } else if (msg.type === 'result' && st.pending[msg.id]) {
      st.pending[msg.id].resolve(msg.result);
      delete st.pending[msg.id];
    } else if (msg.type === 'error') {
      if (msg.id != null && st.pending[msg.id]) {
        st.pending[msg.id].reject(new Error(msg.message || 'Analysis failed'));
        delete st.pending[msg.id];
      } else if (!st.ready) {
        fail(msg.message || 'The on-device AI could not start');
      }
    }
  };

  if (!url) return null;
  return (
    // 1x1 and invisible: the page has no UI, it only runs the model.
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0.01, overflow: 'hidden' }}>
      <WebView
        ref={web}
        source={{ uri: `${url.replace(/\/+$/, '')}/engine.html` }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        onMessage={onMessage}
        onLoadStart={() => setStatus('loading')}
        onError={() => fail('Could not load the on-device AI. Connect to the internet once to download it.')}
        onHttpError={() => fail('The on-device AI page was not found. Check EXPO_PUBLIC_ENGINE_URL.')}
      />
    </View>
  );
});

export default OnDeviceEngine;
