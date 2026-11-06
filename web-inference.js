/* PotatoGuard - on-device inference (runs the model inside the browser, no server).
 *
 * Uses ONNX Runtime Web (WebAssembly). The model (web-model/model.onnx, ~9 MB) is downloaded once and
 * then cached by the browser; the leaf photo never leaves the phone/laptop.
 * Same preprocessing as inference/app.py: RGB, 224x224, raw 0-255 floats (rescaling is inside the model).
 */
(function () {
  'use strict';
  var ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
  var MODEL_URL = 'web-model/model.onnx';
  var LABELS_URL = 'web-model/labels.json';
  var SIZE = 224;
  var THRESHOLD = 0.75; // below this the app says "Uncertain" instead of guessing

  var sessionPromise = null;
  var labels = null;

  function load() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async function () {
      if (typeof ort === 'undefined') {
        throw new Error('The AI engine could not be downloaded. Check your internet connection and reload.');
      }
      ort.env.wasm.wasmPaths = ORT_CDN;
      ort.env.wasm.numThreads = 1; // no cross-origin-isolation headers needed
      var res = await Promise.all([
        fetch(LABELS_URL).then(function (r) { if (!r.ok) throw new Error('labels.json missing'); return r.json(); }),
        fetch(MODEL_URL).then(function (r) { if (!r.ok) throw new Error('model.onnx missing'); return r.arrayBuffer(); })
      ]);
      labels = res[0].display_names;
      return ort.InferenceSession.create(new Uint8Array(res[1]), { executionProviders: ['wasm'] });
    })().catch(function (e) { sessionPromise = null; throw e; });
    return sessionPromise;
  }

  async function toImage(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall through */ }
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Not a valid image file')); };
      img.src = url;
    });
  }

  async function preprocess(file) {
    var img = await toImage(file);
    var c = document.createElement('canvas');
    c.width = c.height = SIZE;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    var px = ctx.getImageData(0, 0, SIZE, SIZE).data; // RGBA
    var out = new Float32Array(SIZE * SIZE * 3);
    for (var i = 0, j = 0; i < px.length; i += 4) { out[j++] = px[i]; out[j++] = px[i + 1]; out[j++] = px[i + 2]; }
    return out;
  }

  // Same response shape as the server's POST /predict.
  async function predict(file) {
    if (!file) throw new Error('No image selected');
    if (file.size > 12 * 1024 * 1024) throw new Error('Image too large (max 12 MB)');
    var session = await load();
    var data = await preprocess(file);
    var feeds = {};
    feeds[session.inputNames[0]] = new ort.Tensor('float32', data, [1, SIZE, SIZE, 3]);
    var out = await session.run(feeds);
    var probs = Array.from(out[session.outputNames[0]].data);
    var order = probs.map(function (_, i) { return i; }).sort(function (a, b) { return probs[b] - probs[a]; });
    var top = order[0], conf = probs[top], all = {};
    order.forEach(function (i) { all[labels[i]] = probs[i]; });
    return { disease: labels[top], confidence: conf, uncertain: conf < THRESHOLD, probabilities: all };
  }

  window.PGLocal = { predict: predict, ready: load, warmup: function () { return load().catch(function () {}); } };
})();
