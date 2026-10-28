import { useState } from "react";
import { Button, Progress, Uploader } from "rsuite";
import type { FileType } from "rsuite";
import { RxVideo } from "react-icons/rx";
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from "./videoUpload";

type VideoUploaderProps = {
  disabled?: boolean;
  onUpload: (
    file: File,
    onProgress: (fraction: number) => void,
  ) => Promise<unknown>;
  onUploaded?: () => void;
};

const VideoUploader = ({
  disabled,
  onUpload,
  onUploaded,
}: VideoUploaderProps) => {
  const [fileList, setFileList] = useState<FileType[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File) => {
    if (!VIDEO_TYPES.includes(file.type))
      return `${file.name} is not a supported video type (mp4, webm, mov)`;
    if (file.size > MAX_VIDEO_BYTES)
      return `${file.name} exceeds ${MAX_VIDEO_BYTES / (1024 * 1024)} MB`;
    return null;
  };

  const handleUpload = async () => {
    const files = fileList.filter((f) => f.blobFile);
    const invalid = files.map((f) => validate(f.blobFile!)).find(Boolean);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!files.length) return;

    setUploading(true);
    setError(null);
    // One at a time: useFetch aborts in-flight requests on refetch
    const failed: FileType[] = [];
    for (const f of files) {
      const key = String(f.fileKey);
      try {
        await onUpload(f.blobFile!, (fraction) =>
          setProgress((p) => ({ ...p, [key]: Math.round(fraction * 100) })),
        );
      } catch (err) {
        failed.push(f);
        setError(
          `${f.name}: ${err instanceof Error ? err.message : "Upload failed"}`,
        );
      }
    }
    // Keep failed files in the list so they can be retried
    setFileList(failed);
    setProgress({});
    setUploading(false);
    if (failed.length < files.length) onUploaded?.();
  };

  return (
    <>
      <Uploader
        multiple
        action="#"
        autoUpload={false}
        listType="text"
        accept={VIDEO_TYPES.join(",")}
        disabled={disabled || uploading}
        fileList={fileList}
        onChange={setFileList}
      >
        <button type="button">
          <RxVideo size={24} />
        </button>
      </Uploader>
      {uploading &&
        fileList.map((f) => (
          <div key={f.fileKey}>
            <small>{f.name}</small>
            <Progress.Line
              percent={progress[String(f.fileKey)] ?? 0}
              status={progress[String(f.fileKey)] === 100 ? "success" : "active"}
            />
          </div>
        ))}
      <Button
        appearance="primary"
        onClick={handleUpload}
        loading={uploading}
        disabled={disabled || !fileList.length}
      >
        Upload videos
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
};

export default VideoUploader;
