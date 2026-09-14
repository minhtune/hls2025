/**
 * HLS Image Compressor - Client-side High Efficiency Image Optimizer
 * Tự động nén và chuyển đổi ảnh sang định dạng WebP ngay trên trình duyệt trước khi upload
 */

const HLSCompressor = {
    // Format dung lượng dễ đọc
    formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    // Nén 1 file ảnh
    async compress(file, options = {}) {
        const maxWidth = options.maxWidth || 1600;
        const maxHeight = options.maxHeight || 1600;
        const quality = options.quality !== undefined ? options.quality : 0.82;
        let mimeType = options.mimeType || 'image/webp';

        // Nếu file không phải ảnh, giữ nguyên
        if (!file.type.startsWith('image/')) {
            return {
                file: file,
                originalSize: file.size,
                compressedSize: file.size,
                savedPercent: 0,
                dataUrl: null
            };
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    let w = img.naturalWidth || img.width;
                    let h = img.naturalHeight || img.height;

                    // Giữ tỷ lệ khung hình và tính toán kích thước mới
                    if (w > maxWidth || h > maxHeight) {
                        if (w / h > maxWidth / maxHeight) {
                            h = Math.round((h * maxWidth) / w);
                            w = maxWidth;
                        } else {
                            w = Math.round((w * maxHeight) / h);
                            h = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d', { alpha: true });

                    // Làm nét cạnh khi scale
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, w, h);

                    // Kiểm tra trình duyệt có hỗ trợ WebP export không
                    const isWebpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                    if (!isWebpSupported && mimeType === 'image/webp') {
                        mimeType = 'image/jpeg';
                    }

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve({
                                file: file,
                                originalSize: file.size,
                                compressedSize: file.size,
                                savedPercent: 0,
                                dataUrl: e.target.result
                            });
                            return;
                        }

                        // Nếu sau khi nén dung lượng lớn hơn ảnh gốc (ảnh rất nhỏ ban đầu), giữ ảnh gốc
                        if (blob.size >= file.size && file.type === 'image/webp') {
                            resolve({
                                file: file,
                                originalSize: file.size,
                                compressedSize: file.size,
                                savedPercent: 0,
                                dataUrl: e.target.result
                            });
                            return;
                        }

                        const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
                        const newName = file.name.replace(/\.[^/.]+$/, '') + ext;
                        const compressedFile = new File([blob], newName, {
                            type: mimeType,
                            lastModified: Date.now()
                        });

                        const savedPercent = Math.max(0, Math.round((1 - blob.size / file.size) * 100));

                        resolve({
                            file: compressedFile,
                            originalSize: file.size,
                            compressedSize: blob.size,
                            savedPercent: savedPercent,
                            dataUrl: canvas.toDataURL(mimeType, quality),
                            width: w,
                            height: h
                        });
                    }, mimeType, quality);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    },

    // Upload file đã nén lên API
    async upload(compressedFile, category = 'general', onProgress = null) {
        const formData = new FormData();
        formData.append('image', compressedFile);
        formData.append('category', category);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '../api/upload.php', true);
            xhr.withCredentials = true;

            if (onProgress && xhr.upload) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        onProgress(percent);
                    }
                };
            }

            xhr.onload = () => {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300 && res.success) {
                        resolve(res);
                    } else {
                        reject(new Error(res.message || 'Lỗi khi upload ảnh'));
                    }
                } catch (e) {
                    reject(new Error('Máy chủ phản hồi không đúng định dạng: ' + xhr.responseText));
                }
            };

            xhr.onerror = () => reject(new Error('Không thể kết nối đến máy chủ'));
            xhr.send(formData);
        });
    }
};

window.HLSCompressor = HLSCompressor;
