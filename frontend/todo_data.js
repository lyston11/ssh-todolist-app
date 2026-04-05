export function resolveActiveListId(lists, currentActiveListId, defaultListId) {
  if (currentActiveListId && lists.some((list) => list.id === currentActiveListId)) {
    return currentActiveListId;
  }

  if (defaultListId && lists.some((list) => list.id === defaultListId)) {
    return defaultListId;
  }

  return lists[0]?.id ?? null;
}

export function createOptimisticTodo({ id, listId, title, completed }) {
  const now = Date.now();
  return {
    id,
    listId,
    title,
    completed,
    createdAt: now,
    updatedAt: now,
    completedAt: completed ? now : null,
  };
}

export function createOptimisticList({ id, title }) {
  const now = Date.now();
  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
  };
}

export function prependOptimisticTodo(todos, todo) {
  return [createOptimisticTodo(todo), ...todos.filter((item) => item.id !== todo.id)];
}

export function updateListTitle(lists, listId, title, updatedAt = Date.now()) {
  return lists.map((list) => (list.id === listId ? { ...list, title, updatedAt } : list));
}

export function removeListAndTodos(lists, todos, listId) {
  return {
    lists: lists.filter((list) => list.id !== listId),
    todos: todos.filter((todo) => todo.listId !== listId),
  };
}

export function removeTodoById(todos, todoId) {
  return todos.filter((todo) => todo.id !== todoId);
}

export function removeTodosByIds(todos, todoIds) {
  const todoIdSet = new Set(todoIds);
  return todos.filter((todo) => !todoIdSet.has(todo.id));
}

export function clearCompletedTodosFromList(todos, listId) {
  return todos.filter((todo) => !(todo.listId === listId && todo.completed));
}

export function applyTodoPatches(todos, patches, updatedAt = Date.now()) {
  const patchByTodoId = new Map(
    patches.map((patch) => [
      patch.todoId,
      {
        title: patch.title,
        listId: patch.listId,
        completed: patch.completed,
        completedAt: patch.completedAt,
      },
    ]),
  );

  return todos.map((todo) => {
    const patch = patchByTodoId.get(todo.id);
    if (!patch) {
      return todo;
    }

    return {
      ...todo,
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.listId === undefined ? {} : { listId: patch.listId }),
      ...(patch.completed === undefined ? {} : { completed: patch.completed }),
      updatedAt,
      completedAt:
        patch.completed === true
          ? (patch.completedAt ?? updatedAt)
          : patch.completed === false
            ? null
            : todo.completedAt,
    };
  });
}

export function captureSnapshot(state) {
  return {
    lists: state.lists.map((list) => ({ ...list })),
    todos: state.todos.map((todo) => ({ ...todo })),
    activeListId: state.activeListId,
    selectionMode: state.selectionMode,
    selectedTodoIds: [...state.selectedTodoIds],
    batchMoveListId: state.batchMoveListId,
  };
}
