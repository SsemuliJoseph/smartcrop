// Treatment advice shown with each diagnosis. Kept on the device so no server is needed for it.
export const TREATMENTS = {
  Healthy: 'Your plant is healthy! Keep monitoring weekly.',
  'Late Blight':
    'Apply fungicide (Mancozeb or Chlorothalonil) immediately. Remove infected leaves. Re-apply every 7 days in wet, cool weather.',
  'Early Blight':
    'Apply a copper-based fungicide. Remove infected lower leaves and improve air circulation between plants.',
  'Bacterial Wilt':
    'Remove and destroy infected plants. Do not replant potatoes or tomatoes in the same soil for 2-3 seasons.',
  Uncertain:
    'The model is not confident about this photo, so no diagnosis is given. Retake it: one leaf, in daylight, filling most of the frame. If the plant looks unwell, ask your agricultural extension officer.',
};

export const treatmentFor = (disease) =>
  TREATMENTS[disease] || 'Consult an agricultural extension officer.';
