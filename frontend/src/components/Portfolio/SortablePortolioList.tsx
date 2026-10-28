import { useState, useEffect } from "react";
import usePortfolio from "./usePortfolio";
import "../../styles/Components/sortableList.scss";
import EditIcon from "@rsuite/icons/Edit";
import { Checkbox, IconButton, Tag } from "rsuite";

export default function SortablePortfolioList({
  portfolioList = [],
  selectedIds,
  onToggleSelect,
  groupNames,
}: {
  portfolioList?: any[];
  // checkboxes appear only when onToggleSelect is given
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  // group id -> name, for the tag on each item
  groupNames?: Map<string, string>;
}) {
  const {
    // reorderPortfolioData,
    // reorderPortfolioLoading,
    // reorderPortfolioError,
    refetchReorderPortfolio,
  } = usePortfolio();
  // Only the user's ordering is state; items always come from the current prop
  const [order, setOrder] = useState<string[]>([]);
  const byId = new Map(
    portfolioList.map((portfolio) => [portfolio.id, portfolio]),
  );
  const sortableItems = [
    ...order.filter((id) => byId.has(id)),
    ...portfolioList
      .map((portfolio) => portfolio.id)
      .filter((id) => !order.includes(id)),
  ].map((id) => byId.get(id));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  // 1. Capture the index of the item being picked up
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 2. Allow dropping by stopping default browser behavior
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 3. Reorder the array when dropped
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedList = [...sortableItems];
    const [draggedItem] = updatedList.splice(draggedIndex, 1); // Remove item
    updatedList.splice(targetIndex, 0, draggedItem); // Insert item at new position

    setOrder(updatedList.map((portfolio) => portfolio.id));
    setCurrentOrder(updatedList.map((portfolio) => portfolio.id));
    setDraggedIndex(null);
    const ids = updatedList.map((p) => p.id);
    setOrder(ids);
    console.log(ids);
    refetchReorderPortfolio({
      url: `/api/portfolio/reorder/portfolios`,
      body: { order: ids },
    }).catch(console.error);
  };

  return (
    <div>
      {sortableItems?.length ? (
        <ul className="sortable-list">
          {sortableItems.map((item, index) => (
            <li
              key={item.id ?? index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDraggedIndex(null)}
              style={{
                padding: "12px",
                margin: "6px 0",
                backgroundColor: draggedIndex === index ? "#f0f0f0" : "#fff",
                border: "1px solid #ccc",
                cursor: "grab",
                borderRadius: "4px",
              }}
            >
              <div className="sortable-list__row">
                {onToggleSelect && (
                  <Checkbox
                    checked={selectedIds?.has(item.id) ?? false}
                    onChange={() => onToggleSelect(item.id)}
                  />
                )}
                {item.name}
                {item.groupId && groupNames?.has(item.groupId) && (
                  <Tag size="sm">{groupNames.get(item.groupId)}</Tag>
                )}
                {item.publishedAt ? (
                  <Tag size="sm" color="green">
                    Published
                  </Tag>
                ) : (
                  <Tag size="sm">Draft</Tag>
                )}
                <IconButton
                  onClick={() => (window.location.href = `/edit/${item.slug}`)}
                  appearance="subtle"
                  size="sm"
                  icon={<EditIcon />}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div>No items to display</div>
      )}
      <pre>
        {JSON.stringify(sortableItems.map((item) => item.id) || [], null, 2)}
        {JSON.stringify(currentOrder || [], null, 2)}
      </pre>
    </div>
  );
}
