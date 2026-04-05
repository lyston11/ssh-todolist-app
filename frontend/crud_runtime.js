export function createCrudHandlers({
  getState,
  getActiveListId,
  createId,
  executeOrQueue,
  setLists,
  setTodos,
  setActiveListId,
  setEditorMode,
  setEditingTodoId,
  setListEditorMode,
  setEditingListId,
  openEditDialog,
  closeEditDialog,
  openListDialog,
  closeListDialog,
  resetComposer,
  failConnection,
  createOptimisticList,
  prependOptimisticTodo,
  applyTodoPatchesToCollection,
  updateListTitle,
  removeListAndTodos,
  removeTodoById,
  clearCompletedTodosFromList,
}) {
  async function createOrQueueTodo(todo) {
    await executeOrQueue({
      kind: "createTodo",
      payload: todo,
      optimisticApply: () => {
        setTodos(prependOptimisticTodo(getState().todos, todo));
      },
    });
  }

  async function updateOrQueueTodo(todoId, patch) {
    await executeOrQueue({
      kind: "updateTodo",
      payload: { todoId, ...patch },
      optimisticApply: () => {
        setTodos(
          applyTodoPatchesToCollection(getState().todos, [
            {
              todoId,
              title: patch.title,
              listId: patch.listId,
              completed: patch.completed,
            },
          ]),
        );
      },
    });
  }

  async function handleQuickCreate(rawValue) {
    const title = rawValue.trim();
    if (!title) {
      return;
    }

    await createOrQueueTodo({
      id: createId(),
      listId: getActiveListId(),
      title,
      completed: false,
    });
    resetComposer();
  }

  function handleOpenCreateDialog() {
    setEditorMode("create");
    setEditingTodoId(null);
    openEditDialog({
      mode: "create",
      lists: getState().lists,
      todo: {
        title: "",
        listId: getActiveListId(),
      },
    });
  }

  function handleOpenEdit(todoId) {
    const todo = getState().todos.find((item) => item.id === todoId);
    if (!todo) {
      return;
    }

    setEditorMode("edit");
    setEditingTodoId(todoId);
    openEditDialog({
      mode: "edit",
      lists: getState().lists,
      todo,
    });
  }

  async function handleSaveEdit({ title, listId }) {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }

    if (getState().editorMode === "create") {
      await createOrQueueTodo({
        id: createId(),
        listId,
        title: normalizedTitle,
        completed: false,
      });
    } else {
      const { editingTodoId } = getState();
      if (!editingTodoId) {
        closeEditDialog();
        return;
      }

      await updateOrQueueTodo(editingTodoId, { title: normalizedTitle, listId });
    }

    setEditingTodoId(null);
    closeEditDialog();
  }

  function handleCancelEdit() {
    setEditingTodoId(null);
    closeEditDialog();
  }

  function handleDialogClose() {
    setEditingTodoId(null);
  }

  function handleOpenListDialog(listId = null) {
    if (listId) {
      const list = getState().lists.find((item) => item.id === listId);
      if (!list) {
        return;
      }

      setListEditorMode("edit");
      setEditingListId(listId);
      openListDialog({ mode: "edit", title: list.title });
      return;
    }

    setListEditorMode("create");
    setEditingListId(null);
    openListDialog({ mode: "create", title: "" });
  }

  function handleEditActiveList() {
    const activeListId = getActiveListId();
    if (!activeListId) {
      return;
    }

    handleOpenListDialog(activeListId);
  }

  async function handleSaveList(rawValue) {
    const title = rawValue.trim();
    if (!title) {
      return;
    }

    if (getState().listEditorMode === "create") {
      const listId = createId();
      const optimisticList = createOptimisticList({ id: listId, title });
      try {
        await executeOrQueue({
          kind: "createList",
          payload: { id: listId, title },
          optimisticApply: () => {
            const lists = [...getState().lists, optimisticList];
            setLists(lists);
            setActiveListId(listId);
          },
        });
      } finally {
        closeListDialog();
      }
      return;
    }

    const { editingListId } = getState();
    if (!editingListId) {
      return;
    }

    try {
      await executeOrQueue({
        kind: "updateList",
        payload: { listId: editingListId, title },
        optimisticApply: () => {
          setLists(updateListTitle(getState().lists, editingListId, title));
        },
      });
    } finally {
      setEditingListId(null);
      closeListDialog();
    }
  }

  function handleCancelListEdit() {
    setEditingListId(null);
    closeListDialog();
  }

  function handleListDialogClose() {
    setEditingListId(null);
  }

  async function handleDeleteActiveList() {
    const activeListId = getActiveListId();
    if (!activeListId) {
      return;
    }

    if (getState().lists.length <= 1) {
      failConnection("至少保留一个清单后才能继续使用。");
      return;
    }

    const activeList = getState().lists.find((list) => list.id === activeListId);
    const confirmed =
      typeof globalThis.confirm !== "function"
        ? true
        : globalThis.confirm(
            `删除清单“${activeList?.title ?? "当前清单"}”后，其中任务也会一起删除。确定继续吗？`,
          );

    if (!confirmed) {
      return;
    }

    await executeOrQueue({
      kind: "deleteList",
      payload: { listId: activeListId },
      optimisticApply: () => {
        const nextState = removeListAndTodos(getState().lists, getState().todos, activeListId);
        setLists(nextState.lists);
        setTodos(nextState.todos);
        setActiveListId(nextState.lists[0]?.id ?? null);
      },
    });
  }

  async function handleDelete(todoId) {
    await executeOrQueue({
      kind: "deleteTodo",
      payload: { todoId },
      optimisticApply: () => {
        setTodos(removeTodoById(getState().todos, todoId));
      },
    });
  }

  async function handleToggle(todoId, completed) {
    await updateOrQueueTodo(todoId, { completed });
  }

  async function handleClearCompleted() {
    const listId = getActiveListId();
    await executeOrQueue({
      kind: "clearCompleted",
      payload: { listId },
      optimisticApply: () => {
        setTodos(clearCompletedTodosFromList(getState().todos, listId));
      },
    });
  }

  return {
    handleQuickCreate,
    handleOpenCreateDialog,
    handleOpenEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleDialogClose,
    handleOpenListDialog,
    handleEditActiveList,
    handleSaveList,
    handleCancelListEdit,
    handleListDialogClose,
    handleDeleteActiveList,
    handleDelete,
    handleToggle,
    handleClearCompleted,
  };
}
