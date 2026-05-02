// Resize an image File into a base64 JPEG data URL that fits comfortably
// inside a Firestore document (1 MB hard limit). The model still receives
// the original full-quality file via the FastAPI multipart upload.

const MAX_EDGE = 1024;
// Aim for < 700 KB of base64 (~525 KB binary) so the final doc — including
// metadata, probabilities, predictions — stays well under the 1 MB cap.
const TARGET_DATAURL_LENGTH = 700_000;

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function resizeImageForFirestore(file) {
  const img = await loadImage(file);
  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= TARGET_DATAURL_LENGTH) {
      return { dataUrl, width: w, height: h, quality };
    }
  }
  // Fallback: tiny preview rather than failing.
  const fallback = canvas.toDataURL('image/jpeg', 0.2);
  return { dataUrl: fallback, width: w, height: h, quality: 0.2 };
}
