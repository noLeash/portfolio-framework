import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, IconButton, Input, Modal, Toggle } from "rsuite";
import TrashIcon from "@rsuite/icons/Trash";
import { useCollectionList } from "./useCollections";
import "../../styles/Components/collections.scss";

const EditCollections = () => {
  const navigate = useNavigate();
  const {
    collections,
    loading,
    error,
    refetch,
    createCollection,
    setActive,
    deleteCollection,
  } = useCollectionList();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // One request at a time: useFetch aborts in-flight requests on refetch
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const created = await createCollection({
        name: name.trim(),
        description: description.trim() || null,
      });
      setIsModalOpen(false);
      if (created) navigate(`/collections/${created.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (id: string, collectionName: string) => {
    if (!window.confirm(`Delete "${collectionName}"? This can't be undone.`)) return;
    act(() => deleteCollection(id));
  };

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="collections-admin">
      <div className="collections-admin__header">
        <h2>Landing page collections</h2>
        <Button
          appearance="primary"
          onClick={() => {
            setName("");
            setDescription("");
            setIsModalOpen(true);
          }}
        >
          New collection
        </Button>
      </div>
      <p className="collections-admin__help">
        The active collection is what visitors see on the home page. Only one
        can be active at a time.
      </p>
      {actionError && <p role="alert">{actionError}</p>}

      {loading && !collections.length ? (
        <p>Loading…</p>
      ) : collections.length ? (
        <ul className="collections-admin__list">
          {collections.map((c) => (
            <li key={c.id} className={c.isActive ? "is-active" : undefined}>
              <div className="collections-admin__info">
                <Link to={`/collections/${c.id}`}>
                  <strong>{c.name}</strong>
                </Link>
                {c.description && <span>{c.description}</span>}
                <small>
                  {c.itemCount} image{c.itemCount === 1 ? "" : "s"}
                </small>
              </div>
              <label className="collections-admin__active">
                <Toggle
                  checked={c.isActive}
                  disabled={busy}
                  onChange={(checked) => act(() => setActive(c.id, checked))}
                />
                {c.isActive ? "Live on home page" : "Not live"}
              </label>
              <IconButton
                size="sm"
                icon={<TrashIcon />}
                aria-label={`Delete ${c.name}`}
                disabled={busy}
                onClick={() => handleDelete(c.id, c.name)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p>No collections yet. Create one to build a landing page.</p>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Modal.Header>
          <Modal.Title>New collection</Modal.Title>
        </Modal.Header>
        <Modal.Body className="collections-admin__form">
          <Input placeholder="Name" value={name} onChange={setName} />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={setDescription}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="primary"
            loading={busy}
            disabled={!name.trim()}
            onClick={handleCreate}
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EditCollections;
