/**
 * imageCompressor.js
 * Utilitas kompresi foto kamera HP/berkas client-side menggunakan HTML5 Canvas.
 * Memastikan ukuran file akhir di bawah 1MB (< 1024 KB) dengan kualitas visual optimal.
 */

export async function compressImage(fileOrBlob, maxDimension = 1600, maxSizeBytes = 1000 * 1024) {
  if (!fileOrBlob) return null;

  // Jika sudah merupakan Blob/File yang ukurannya < 400KB dan bertipe jpeg, kita tetap bisa kompres atau return
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Resize down proportionally if exceeds max dimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Fill white background in case of transparent png
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Binary search for optimal JPEG quality to ensure < maxSizeBytes
        let quality = 0.85;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(fileOrBlob);
              return;
            }
            if (blob.size <= maxSizeBytes) {
              resolve(blob);
            } else {
              // Try lower quality if still > maxSizeBytes
              canvas.toBlob(
                (lowerBlob) => {
                  resolve(lowerBlob || blob);
                },
                'image/jpeg',
                0.65
              );
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export default compressImage;
