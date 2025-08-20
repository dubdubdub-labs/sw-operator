import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type RowsPerPage = 100 | 500 | 1000;

interface ExplorerState {
  currentPage: Record<string, number>;
  rowsPerPage: Record<string, RowsPerPage>;
  setCurrentPage: (entityName: string, page: number) => void;
  setRowsPerPage: (entityName: string, rows: RowsPerPage) => void;
  getCurrentPage: (entityName: string) => number;
  getRowsPerPage: (entityName: string) => RowsPerPage;
  resetPagination: (entityName: string) => void;
}

export const useExplorerStore = create<ExplorerState>()(
  devtools(
    persist(
      (set, get) => ({
        currentPage: {},
        rowsPerPage: {},

        setCurrentPage: (entityName: string, page: number) =>
          set((state) => ({
            currentPage: {
              ...state.currentPage,
              [entityName]: page,
            },
          })),

        setRowsPerPage: (entityName: string, rows: RowsPerPage) =>
          set((state) => ({
            rowsPerPage: {
              ...state.rowsPerPage,
              [entityName]: rows,
            },
            currentPage: {
              ...state.currentPage,
              [entityName]: 0,
            },
          })),

        getCurrentPage: (entityName: string) => {
          const state = get();
          return state.currentPage[entityName] ?? 0;
        },

        getRowsPerPage: (entityName: string) => {
          const state = get();
          return state.rowsPerPage[entityName] ?? 100;
        },

        resetPagination: (entityName: string) =>
          set((state) => {
            const { [entityName]: _, ...restCurrentPage } = state.currentPage;
            const { [entityName]: __, ...restRowsPerPage } = state.rowsPerPage;
            return {
              currentPage: restCurrentPage,
              rowsPerPage: restRowsPerPage,
            };
          }),
      }),
      {
        name: "explorer-storage",
      }
    )
  )
);
