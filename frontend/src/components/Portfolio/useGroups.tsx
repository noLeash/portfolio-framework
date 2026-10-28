import { useFetch } from "../hooks/useFetch";

// Mirrors GroupSchema in backend schema/project_groups.py
export type ProjectGroup = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  portfolioCount: number;
  createdAt: string;
  updatedAt: string | null;
};

type GroupBody = {
  name?: string;
  description?: string | null;
};

// groupId null removes the portfolios from their group
type AssignBody = {
  portfolioIds: string[];
  groupId: string | null;
};

// Groups that portfolios are filed under; each portfolio has at most one.
// Separate hooks, since useFetch aborts a hook's in-flight request on refetch
const useGroups = () => {
  const list = useFetch<ProjectGroup[]>({ url: "/api/groups" });
  const create = useFetch<ProjectGroup, GroupBody>({
    url: "/api/groups",
    method: "POST",
    manual: true,
  });
  const update = useFetch<ProjectGroup, GroupBody>({
    url: "/api/groups",
    method: "PATCH",
    manual: true,
  });
  const remove = useFetch<null>({
    url: "/api/groups",
    method: "DELETE",
    manual: true,
  });
  const assign = useFetch<ProjectGroup[], AssignBody>({
    url: "/api/groups/assign",
    method: "POST",
    manual: true,
  });

  return {
    groups: list.data ?? [],
    loading: list.loading,
    error: list.error,
    refetch: () => list.refetch(),
    createGroup: (body: GroupBody) => create.refetch({ body }),
    renameGroup: (id: string, name: string) =>
      update.refetch({ url: `/api/groups/${id}`, body: { name } }),
    // its portfolios stay, ungrouped
    deleteGroup: (id: string) => remove.refetch({ url: `/api/groups/${id}` }),
    assignGroup: (portfolioIds: string[], groupId: string | null) =>
      assign.refetch({ body: { portfolioIds, groupId } }),
  };
};

export default useGroups;
