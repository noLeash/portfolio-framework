import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Button,
  ButtonGroup,
  IconButton,
  Input,
  Modal,
  Toggle,
} from "rsuite";
import TrashIcon from "@rsuite/icons/Trash";
import DragableIcon from "@rsuite/icons/Dragable";
import {
  DISPLAY_SIZES,
  PLAYBACK_MODES,
  useCollection,
  useMediaOptions,
  type DisplaySize,
  type PlaybackMode,
} from "./useCollections";
import type { PortfolioMedia } from "../Portfolio/usePortfolio";
import "../../styles/Components/collections.scss";

// Thumbnail for an image or video; videos without a poster show their first frame
const MediaThumb = ({ media }: { media: PortfolioMedia }) => (
  <>
    {media.mediaType === "video" && !media.thumbnailUrl ? (
      <video src={media.originalUrl} preload="metadata" muted playsInline />
    ) : (
      <img
        src={media.thumbnailUrl ?? media.originalUrl}
        alt={media.altText ?? media.filename}
        loading="lazy"
        draggable={false}
      />
    )}
    {media.mediaType === "video" && (
      <span className="media-thumb__video" aria-label="Video">
        ▶
      </span>
    )}
  </>
);

type PickerProps = {
  open: boolean;
  onClose: () => void;
  existingMediaIds: Set<string>;
  onAdd: (
    mediaIds: string[],
    displaySize: DisplaySize,
    playbackMode: PlaybackMode,
  ) => Promise<unknown>;
};

const MediaPicker = ({ open, onClose, existingMediaIds, onAdd }: PickerProps) => {
  const { portfolios, loading, error, load } = useMediaOptions();
  const [selected, setSelected] = useState<string[]>([]);
  const [size, setSize] = useState<DisplaySize>("m");
  const [playback, setPlayback] = useState<PlaybackMode>("modal");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setAddError(null);
      load();
    }
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      await onAdd(selected, size, playback);
      onClose();
    } catch (err) {
      // stay open so the selection isn't lost
      setAddError(err instanceof Error ? err.message : "Adding media failed");
    } finally {
      setAdding(false);
    }
  };

  const withMedia = portfolios.filter((p) => p.media.length);
  const videoIds = new Set(
    withMedia.flatMap((p) => p.media.filter((m) => m.mediaType === "video").map((m) => m.id)),
  );
  const selectedVideos = selected.some((id) => videoIds.has(id));

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>Add images and videos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <p role="alert">{error.message}</p>}
        {addError && <p role="alert">{addError}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : withMedia.length ? (
          withMedia.map((p) => (
            <section key={p.id} className="image-picker__portfolio">
              <h4>{p.name}</h4>
              <ul className="image-picker__grid">
                {p.media.map((m) => {
                  const inCollection = existingMediaIds.has(m.id);
                  const order = selected.indexOf(m.id);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={[
                          "image-picker__item",
                          order >= 0 ? "is-selected" : "",
                        ].join(" ")}
                        disabled={inCollection}
                        aria-pressed={order >= 0}
                        title={inCollection ? "Already in this collection" : m.filename}
                        onClick={() => toggle(m.id)}
                      >
                        <MediaThumb media={m} />
                        {/* Media is added in the order it's picked */}
                        {order >= 0 && (
                          <span className="image-picker__badge">{order + 1}</span>
                        )}
                        {inCollection && (
                          <span className="image-picker__badge">Added</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <p>No portfolio media yet. Upload some to a portfolio first.</p>
        )}
      </Modal.Body>
      <Modal.Footer className="image-picker__footer">
        <div className="image-picker__options">
          <span>
            Display size <SizePicker value={size} onChange={setSize} />
          </span>
          {selectedVideos && (
            <span>
              Videos play{" "}
              <PlaybackPicker value={playback} onChange={setPlayback} />
            </span>
          )}
        </div>
        <Button
          appearance="primary"
          disabled={!selected.length}
          loading={adding}
          onClick={handleAdd}
        >
          Add {selected.length || ""} item{selected.length === 1 ? "" : "s"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const SizePicker = ({
  value,
  onChange,
  disabled,
}: {
  value: DisplaySize;
  onChange: (size: DisplaySize) => void;
  disabled?: boolean;
}) => (
  <ButtonGroup size="xs">
    {DISPLAY_SIZES.map((s) => (
      <Button
        key={s.value}
        appearance={value === s.value ? "primary" : "default"}
        aria-pressed={value === s.value}
        disabled={disabled}
        onClick={() => value !== s.value && onChange(s.value)}
      >
        {s.label}
      </Button>
    ))}
  </ButtonGroup>
);

const PlaybackPicker = ({
  value,
  onChange,
  disabled,
}: {
  value: PlaybackMode;
  onChange: (mode: PlaybackMode) => void;
  disabled?: boolean;
}) => (
  <ButtonGroup size="xs">
    {PLAYBACK_MODES.map((mode) => (
      <Button
        key={mode.value}
        appearance={value === mode.value ? "primary" : "default"}
        aria-pressed={value === mode.value}
        title={mode.hint}
        disabled={disabled}
        onClick={() => value !== mode.value && onChange(mode.value)}
      >
        {mode.label}
      </Button>
    ))}
  </ButtonGroup>
);

const EditCollection = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const {
    collection,
    loading,
    error,
    saving,
    saveError,
    update,
    addItems,
    updateItem,
    removeItem,
    reorder,
  } = useCollection(collectionId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description ?? "");
    }
  }, [collection?.id]);

  if (error) return <div>Error: {error.message}</div>;
  if (loading || !collection) return <div>Loading…</div>;

  const items = collection.items;
  const detailsChanged =
    name.trim() !== collection.name ||
    (description.trim() || null) !== (collection.description || null);

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const order = items.map((item) => item.id);
    const [moved] = order.splice(draggedIndex, 1);
    order.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    reorder(order);
  };

  return (
    <div className="collections-admin">
      <Link to="/collections">← All collections</Link>

      <div className="collections-admin__details">
        <Input value={name} onChange={setName} placeholder="Name" />
        <Input
          value={description}
          onChange={setDescription}
          placeholder="Description (optional)"
        />
        <Button
          disabled={!detailsChanged || !name.trim() || saving}
          onClick={() =>
            update({ name: name.trim(), description: description.trim() || null })
          }
        >
          Save
        </Button>
        <label className="collections-admin__active">
          <Toggle
            checked={collection.isActive}
            disabled={saving}
            onChange={(checked) => update({ isActive: checked })}
          />
          {collection.isActive ? "Live on home page" : "Not live"}
        </label>
      </div>
      {saveError && <p role="alert">{saveError.message}</p>}

      <div className="collections-admin__header">
        <h3>
          {items.length} item{items.length === 1 ? "" : "s"}
        </h3>
        <Button appearance="primary" onClick={() => setPickerOpen(true)}>
          Add media
        </Button>
      </div>
      <p className="collections-admin__help">
        Drag to reorder. S / M / L sets how tall each item appears on the home
        page. Videos play either inline (muted, looping in their tile) or in a
        modal player when clicked.
      </p>

      {items.length ? (
        <ul className="collection-items">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={[
                "collection-items__item",
                `is-${item.displaySize}`,
                draggedIndex === index ? "is-dragging" : "",
              ].join(" ")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
            >
              <span
                className="collection-items__handle"
                draggable={!saving}
                onDragStart={(e) => {
                  setDraggedIndex(index);
                  // Firefox won't start a drag without data
                  e.dataTransfer.setData("text/plain", String(index));
                  const row = (e.currentTarget as HTMLElement).closest("li");
                  if (row) e.dataTransfer.setDragImage(row, 0, 0);
                }}
                onDragEnd={() => setDraggedIndex(null)}
                aria-label="Drag to reorder"
              >
                <DragableIcon />
              </span>
              <div className="collection-items__thumb">
                <MediaThumb media={item.media} />
              </div>
              <small className="collection-items__source">
                {item.portfolioName}
              </small>
              <div className="collection-items__controls">
                <SizePicker
                  value={item.displaySize}
                  disabled={saving}
                  onChange={(size) => updateItem(item.id, { displaySize: size })}
                />
                {item.media.mediaType === "video" && (
                  <PlaybackPicker
                    value={item.playbackMode}
                    disabled={saving}
                    onChange={(mode) => updateItem(item.id, { playbackMode: mode })}
                  />
                )}
                <IconButton
                  size="xs"
                  icon={<TrashIcon />}
                  aria-label="Remove from collection"
                  disabled={saving}
                  onClick={() => removeItem(item.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>This collection is empty. Add images or videos from your portfolios.</p>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingMediaIds={new Set(items.map((item) => item.media.id))}
        onAdd={addItems}
      />
    </div>
  );
};

export default EditCollection;
