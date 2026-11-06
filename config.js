/* PotatoGuard runtime configuration.
 * DEFAULT (free, no server): leave INFERENCE_URL empty - the model runs inside the browser (web-model/model.onnx).
 * INFERENCE_URL : base URL of the model service (optional - leave empty to run the model on-device), e.g.
 *                 "https://<user>-potatoguard.hf.space". The browser sends the photo straight to
 *                 POST <INFERENCE_URL>/predict. Scan history is kept on the user's device (localStorage).
 * If empty the app shows "service not configured" - it never invents a diagnosis.
 */
window.POTATOGUARD_CONFIG = {
  INFERENCE_URL: '',
  // Where to take weather for the dashboard (Mbarara, Uganda). Replaced by the device location if allowed.
  DEFAULT_LAT: -0.6072,
  DEFAULT_LON: 30.6545,
  DEFAULT_PLACE: 'Mbarara, UG'
};
