import { create } from "zustand";
import { type CommitmentStatus } from "~/server/db/schema";

interface FiltersState {
  projectIds: string[];
  checkerIds: string[];
  statuses: CommitmentStatus[];
  setProjectIds: (ids: string[]) => void;
  setCheckerIds: (ids: string[]) => void;
  setStatuses: (statuses: CommitmentStatus[]) => void;
  clearAll: () => void;
  hasActiveFilters: () => boolean;
}

export const useFiltersStore = create<FiltersState>((set, get) => ({
  projectIds: [],
  checkerIds: [],
  statuses: [],
  setProjectIds: (ids) => set({ projectIds: ids }),
  setCheckerIds: (ids) => set({ checkerIds: ids }),
  setStatuses: (statuses) => set({ statuses }),
  clearAll: () => set({ projectIds: [], checkerIds: [], statuses: [] }),
  hasActiveFilters: () => {
    const { projectIds, checkerIds, statuses } = get();
    return projectIds.length > 0 || checkerIds.length > 0 || statuses.length > 0;
  },
}));
