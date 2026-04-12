import { useCallback, useEffect, useMemo, useState } from 'react';
import { TodoItem } from '../../../types/api';

interface UseTaskBatchStateOptions {
  batchEnabled: boolean;
  items: TodoItem[];
}

export function useTaskBatchState({ batchEnabled, items }: UseTaskBatchStateOptions) {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isMoveSheetOpen, setIsMoveSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);

  useEffect(() => {
    if (batchEnabled || !isBatchMode) {
      return;
    }

    setIsBatchMode(false);
    setSelectedTaskIds([]);
    setIsMoveSheetOpen(false);
    setIsDeleteConfirmOpen(false);
  }, [batchEnabled, isBatchMode]);

  useEffect(() => {
    setSelectedTaskIds((currentSelection) =>
      currentSelection.filter((id) => items.some((todo) => todo.id === id)),
    );
  }, [items]);

  const toggleBatchMode = useCallback(() => {
    setIsBatchMode((currentValue) => !currentValue);
    setSelectedTaskIds([]);
    setIsMoveSheetOpen(false);
    setIsDeleteConfirmOpen(false);
  }, []);

  const toggleTaskSelection = useCallback((id: string) => {
    setSelectedTaskIds((currentSelection) =>
      currentSelection.includes(id)
        ? currentSelection.filter((selectedId) => selectedId !== id)
        : [...currentSelection, id],
    );
  }, []);

  const resetBatchState = useCallback(() => {
    setIsBatchMode(false);
    setSelectedTaskIds([]);
    setIsMoveSheetOpen(false);
    setIsDeleteConfirmOpen(false);
  }, []);

  const openMoveSheet = useCallback(() => {
    setIsMoveSheetOpen(true);
  }, []);

  const closeMoveSheet = useCallback(() => {
    setIsMoveSheetOpen(false);
  }, []);

  const openDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  return {
    isBatchMode,
    selectedTaskIds,
    selectedTaskIdSet,
    isMoveSheetOpen,
    isDeleteConfirmOpen,
    toggleBatchMode,
    toggleTaskSelection,
    resetBatchState,
    openMoveSheet,
    closeMoveSheet,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
}
