// Must match VIDEO_TYPES / MAX_VIDEO_BYTES in backend routes/portfolio.py
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export type VideoMeta = {
  width: number | null;
  height: number | null;
  duration: number | null;
  poster: Blob | null;
};

const EMPTY_META: VideoMeta = {
  width: null,
  height: null,
  duration: null,
  poster: null,
};

// Reads dimensions/duration and captures a poster frame in the browser.
// Never rejects: a codec the browser can't decode (e.g. some .mov files)
// still uploads, just without a poster.
export function readVideoMeta(file: File, timeoutMs = 10000): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (meta: VideoMeta) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    const timer = setTimeout(() => finish(EMPTY_META), timeoutMs);

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => finish(EMPTY_META);
    video.onloadedmetadata = () => {
      // Skip the first frame, which is often black
      video.currentTime = Math.min(1, (video.duration || 0) / 2);
    };
    video.onseeked = () => {
      const meta = {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
      };
      if (!video.videoWidth || !video.videoHeight) {
        finish({ ...meta, poster: null });
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      canvas.toBlob(
        (poster) => finish({ ...meta, poster }),
        "image/jpeg",
        0.9,
      );
    };
    video.src = url;
  });
}

// PUTs straight to S3 with a presigned URL. Uses XHR rather than fetch
// because fetch has no upload progress events.
export function putToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    // Part of the signature: must match the type sent to /uploadVideo/start
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 upload failed (HTTP ${xhr.status})`));
    // CORS rejections land here too, with no further detail
    xhr.onerror = () =>
      reject(new Error("S3 upload failed (network error or CORS)"));
    xhr.send(file);
  });
}
