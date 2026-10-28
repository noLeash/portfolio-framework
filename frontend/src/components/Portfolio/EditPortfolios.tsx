import usePortfolio from "./usePortfolio";
import useGroups from "./useGroups";
import SortablePortfolioList from "./SortablePortolioList";
import { Modal, Input, Button, SelectPicker, IconButton } from "rsuite";
import CloseIcon from "@rsuite/icons/Close";
import type { CreatePortfolioParams } from "./usePortfolio";
import { useState } from "react";
import { useFlash } from "../../components/Flash/useFlash";

const EditPortfolios = () => {
  const { flash } = useFlash();
  const { portfolioListData, portfolioListError, refetchPortfolioList } =
    usePortfolio();
  const { groups, refetch: refetchGroups, createGroup, deleteGroup, assignGroup } =
    useGroups();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPortfolioParams, setNewPortfolioParams] =
    useState<CreatePortfolioParams>({
      portfolioName: "",
      description: "",
    });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);

  const portfolioList = (portfolioListData as any[]) ?? [];
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));

  const handleInputChange = (
    field: keyof CreatePortfolioParams,
    value: string,
  ) => {
    setNewPortfolioParams((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const {
    createPortfolioData,
    createPortfolioLoading,
    createPortfolioError,
    refetchCreatePortfolio,
  } = usePortfolio();

  const handleCreatePortfolio = async () => {
    try {
      const created = await refetchCreatePortfolio({
        body: {
          portfolioName: newPortfolioParams?.portfolioName,
          description: newPortfolioParams?.description,
        },
      });
      flash("Created portfolio:", created);
      setIsModalOpen(false);
      refetchPortfolioList();
    } catch (err) {
      flash("Failed to create portfolio:", err);
      // keep the modal open / show the error to the user
    }
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected =
    portfolioList.length > 0 && selectedIds.size === portfolioList.length;
  const toggleAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(portfolioList.map((p) => p.id)),
    );

  // One group request at a time: useFetch aborts in-flight requests on refetch
  const runGroupAction = async (
    action: () => Promise<unknown>,
    failure: string,
  ) => {
    setGroupBusy(true);
    try {
      await action();
      await Promise.all([refetchGroups(), refetchPortfolioList()]);
      return true;
    } catch (err) {
      flash(failure, err);
      return false;
    } finally {
      setGroupBusy(false);
    }
  };

  // groupId null takes the selected portfolios out of their group
  const handleAssign = async (groupId: string | null) => {
    const ok = await runGroupAction(
      () => assignGroup([...selectedIds], groupId),
      "Failed to update group:",
    );
    if (ok) setSelectedIds(new Set());
  };

  const handleCreateGroup = async () => {
    let created: { id: string } | undefined;
    const ok = await runGroupAction(async () => {
      created = await createGroup({ name: newGroupName.trim() });
    }, "Failed to create group:");
    if (!ok) return;
    setIsGroupModalOpen(false);
    // ready to assign the current selection to it
    if (created) setTargetGroupId(created.id);
  };

  const handleDeleteGroup = (id: string, name: string) => {
    if (!window.confirm(`Delete group "${name}"? Its portfolios stay, ungrouped.`))
      return;
    if (targetGroupId === id) setTargetGroupId(null);
    runGroupAction(() => deleteGroup(id), "Failed to delete group:");
  };

  return (
    <div>
      <div className="portfolio-list-container">
        <div className="portfolio-list-controls">
          <Button
            onClick={() => {
              setIsModalOpen(true);
              setNewPortfolioParams({ portfolioName: "", description: "" });
            }}
          >
            Create Portfolio
          </Button>
          <Button
            onClick={() => {
              setIsGroupModalOpen(true);
              setNewGroupName("");
            }}
          >
            New Group
          </Button>
          <Button appearance="subtle" onClick={toggleAll}>
            {allSelected ? "Select none" : "Select all"}
          </Button>
        </div>

        {groups.length > 0 && (
          <ul className="group-list">
            {groups.map((group) => (
              <li key={group.id} className="group-list__item">
                {group.name} ({group.portfolioCount})
                <IconButton
                  size="xs"
                  appearance="subtle"
                  icon={<CloseIcon />}
                  disabled={groupBusy}
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  aria-label={`Delete group ${group.name}`}
                />
              </li>
            ))}
          </ul>
        )}

        {selectedIds.size > 0 && (
          <div className="group-assign-bar">
            <span>{selectedIds.size} selected</span>
            <SelectPicker
              data={groups.map((group) => ({
                label: group.name,
                value: group.id,
              }))}
              value={targetGroupId}
              onChange={setTargetGroupId}
              placeholder="Choose a group"
              searchable={false}
              style={{ width: 200 }}
            />
            <Button
              appearance="primary"
              disabled={!targetGroupId || groupBusy}
              onClick={() => handleAssign(targetGroupId)}
            >
              Assign to group
            </Button>
            <Button disabled={groupBusy} onClick={() => handleAssign(null)}>
              Remove from group
            </Button>
            <Button appearance="subtle" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

        <SortablePortfolioList
          portfolioList={portfolioList}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          groupNames={groupNames}
        />
      </div>
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Modal.Header>
          <Modal.Title>Create Portfolio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input
            placeholder="Portfolio Name"
            onChange={(val) => handleInputChange("portfolioName", val)}
          />
          <Input
            placeholder="Description"
            onChange={(val) => handleInputChange("description", val)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            disabled={
              createPortfolioLoading || !newPortfolioParams?.portfolioName
            }
            appearance="primary"
            onClick={() => handleCreatePortfolio()}
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)}>
        <Modal.Header>
          <Modal.Title>New Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input
            placeholder="Group Name"
            value={newGroupName}
            onChange={setNewGroupName}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            disabled={groupBusy || !newGroupName.trim()}
            appearance="primary"
            onClick={handleCreateGroup}
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EditPortfolios;
