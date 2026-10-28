import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import usePortfolio from "./usePortfolio";
import type { PortfolioChanges } from "./usePortfolio";
import ImageUploader from "./ImageUploader";
import VideoUploader from "./VideoUploader";
import SortableAssetList from "./SortableImageList";
import { Button, IconButton, Input, Toggle } from "rsuite";
import EditIcon from "@rsuite/icons/Edit";
import "../../styles/Components/portfolio.scss";

type EditableFieldProps = {
  label: string;
  value: string;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  // Rejects with an Error to keep the field open and show the message
  onSave: (value: string) => Promise<unknown>;
};

// Shows a value with an edit button; editing swaps in an input with Save/Cancel
const EditableField = ({
  label,
  value,
  multiline,
  required,
  placeholder,
  onSave,
}: EditableFieldProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (draft.trim() === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setEditing(false);
    // Enter saves single-line fields; multiline needs Cmd/Ctrl+Enter
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className="portfolio-name key">
      <div>
        {label}:{" "}
        {!editing && (
          <IconButton
            icon={<EditIcon />}
            size="xs"
            aria-label={`Edit ${label.toLowerCase()}`}
            onClick={start}
          />
        )}
      </div>
      {editing ? (
        <div className="editable-field">
          {multiline ? (
            <Input
              autoFocus
              as="textarea"
              rows={3}
              value={draft}
              placeholder={placeholder}
              onChange={setDraft}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <Input
              autoFocus
              value={draft}
              placeholder={placeholder}
              onChange={setDraft}
              onKeyDown={handleKeyDown}
            />
          )}
          <div className="editable-field__actions">
            <Button
              size="sm"
              appearance="primary"
              loading={saving}
              disabled={required && !draft.trim()}
              onClick={save}
            >
              Save
            </Button>
            <Button size="sm" appearance="subtle" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      ) : (
        <h3>{value || <span className="editable-field__empty">None</span>}</h3>
      )}
    </div>
  );
};

// The API returns errors as {"detail": "..."}; show just the message
const readableError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  try {
    const detail = JSON.parse(message).detail;
    return new Error(typeof detail === "string" ? detail : "Check the value and try again");
  } catch {
    return new Error(message);
  }
};

const EditPortfolio = () => {
  const navigate = useNavigate();
  const {
    editPortfolioData,
    editPortfolioError,
    refetchEditPortfolio,
    uploadImages,
    uploadVideo,
    updatePortfolio,
    purgeDeleted,
    purgeLoading,
  } = usePortfolio();
  const [showDeleted, setShowDeleted] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const { portfolioSlug } = useParams<{
    portfolioSlug: string;
  }>();
  const reload = () =>
    refetchEditPortfolio({ url: `/api/portfolio/edit/${portfolioSlug}` });

  useEffect(() => {
    reload();
  }, [portfolioSlug]);

  if (editPortfolioError) {
    return <div>Error: {editPortfolioError.message}</div>;
  }

  const deletedCount =
    editPortfolioData?.media.filter((m) => m.deletedAt).length ?? 0;

  const purge = async () => {
    if (!editPortfolioData || !deletedCount) return;
    const ok = window.confirm(
      `Permanently delete ${deletedCount} asset${deletedCount === 1 ? "" : "s"} and their files? This can't be undone.`,
    );
    if (!ok) return;
    setPurgeMessage(null);
    try {
      const result = await purgeDeleted(editPortfolioData.id);
      if (result) {
        setPurgeMessage(
          result.failed.length
            ? `Purged ${result.purged}; ${result.failed.length} couldn't be removed from S3 and were kept. Try again later.`
            : `Purged ${result.purged} asset${result.purged === 1 ? "" : "s"} (${result.deletedFiles} files).`,
        );
      }
    } catch (err) {
      setPurgeMessage(readableError(err).message);
    }
    reload();
  };

  const save = async (changes: PortfolioChanges) => {
    if (!editPortfolioData) return;
    try {
      const updated = await updatePortfolio(editPortfolioData.id, changes);
      // Renaming changes the slug, so follow the portfolio to its new URL
      if (updated && updated.slug !== portfolioSlug) {
        navigate(`/edit/${updated.slug}`, { replace: true });
      } else {
        reload();
      }
    } catch (err) {
      throw readableError(err);
    }
  };

  return (
    <>
      <div>
        <EditableField
          label="Name"
          value={editPortfolioData?.name ?? ""}
          required
          onSave={(name) => save({ name })}
        />
        {editPortfolioData?.slug && (
          <small className="portfolio-url">
            URL: /{editPortfolioData.slug}
          </small>
        )}
        <label className="portfolio-publish">
          <Toggle
            size="sm"
            checked={!!editPortfolioData?.publishedAt}
            disabled={!editPortfolioData}
            onChange={(published) =>
              save({ published }).catch((err) => window.alert(err.message))
            }
          />{" "}
          {editPortfolioData?.publishedAt
            ? `Published ${new Date(editPortfolioData.publishedAt).toLocaleDateString()}`
            : "Draft (not in the index)"}
        </label>
        <EditableField
          label="Description"
          value={editPortfolioData?.description ?? ""}
          multiline
          placeholder="Shown under the name on the portfolio page"
          onSave={(description) => save({ description: description || null })}
        />
      </div>
      <ImageUploader
        folder={editPortfolioData?.folder}
        onUpload={uploadImages}
        onUploaded={reload}
      />
      <VideoUploader
        disabled={!editPortfolioData?.id}
        onUpload={uploadVideo}
        onUploaded={reload}
      />
      <div className="deleted-toolbar">
        <label>
          <Toggle
            size="sm"
            checked={showDeleted}
            onChange={setShowDeleted}
          />{" "}
          Show deleted ({deletedCount})
        </label>
        <Button
          size="sm"
          color="red"
          appearance="ghost"
          disabled={!deletedCount}
          loading={purgeLoading}
          onClick={purge}
        >
          Purge deleted
        </Button>
        {purgeMessage && <small role="status">{purgeMessage}</small>}
      </div>
      <SortableAssetList
        images={editPortfolioData?.media ?? []}
        portfolioId={editPortfolioData?.id}
        showDeleted={showDeleted}
        onMediaUpdated={reload}
        primaryMediaId={editPortfolioData?.primaryMediaId}
        onSetPrimary={(primaryMediaId) => save({ primaryMediaId })}
      />
    </>
  );
};

export default EditPortfolio;
