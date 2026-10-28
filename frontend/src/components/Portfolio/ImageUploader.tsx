import { useState } from "react";
import { Button, Uploader } from "rsuite";
import type { FileType } from "rsuite";
import { RxCamera } from "react-icons/rx";

type ImageUploaderProps = {
  folder?: string;
  onUpload: (folder: string, files: File[]) => Promise<unknown>;
  onUploaded?: () => void;
};

const ImageUploader = ({ folder, onUpload, onUploaded }: ImageUploaderProps) => {
  const [fileList, setFileList] = useState<FileType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    const files = fileList
      .map((f) => f.blobFile)
      .filter((f): f is File => !!f);
    if (!folder || !files.length) return;

    setUploading(true);
    setError(null);
    try {
      // One multipart request: useFetch aborts in-flight requests on refetch
      await onUpload(folder, files);
      setFileList([]);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Uploader
        multiple
        action="#"
        autoUpload={false}
        listType="picture"
        accept="image/*"
        disabled={!folder || uploading}
        fileList={fileList}
        onChange={setFileList}
      >
        <button type="button">
          <RxCamera size={24} />
        </button>
      </Uploader>
      <Button
        appearance="primary"
        onClick={handleUpload}
        loading={uploading}
        disabled={!folder || !fileList.length}
      >
        Upload
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
};

export default ImageUploader;
