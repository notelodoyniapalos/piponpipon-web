// Client-side image compression. Returns a JPEG data URL.
// Defaults tuned for a no-backend menu: thumb size ~25-50KB.
export function compressImage(file, {
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.78,
  mime = 'image/jpeg'
} = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('No es una imagen'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      // White background so transparent PNGs don't go black on JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve({
            dataUrl: reader.result,
            width,
            height,
            bytes: blob.size
          });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        },
        mime,
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
  });
}

export function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
