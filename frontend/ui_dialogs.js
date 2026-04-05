import { elements } from "./ui_dom.js";

export function resetComposer() {
  elements.todoForm.reset();
  elements.todoInput.focus();
}

export function openEditDialog({ todo, lists, mode }) {
  elements.editorTitle.textContent = mode === "create" ? "新建任务" : "编辑任务";
  elements.editorDescription.textContent =
    mode === "create"
      ? "直接写下这次要完成的具体动作，手机上会优先给你更宽的编辑区域。"
      : "你可以改任务标题、切换所属清单，保存后会继续同步到当前节点。";
  elements.editInput.value = todo.title;
  syncEditTextareaHeight();
  renderEditCharacterCount();
  renderEditorLists(lists, todo.listId);
  elements.editDialog.showModal();
  elements.editInput.focus();
  elements.editInput.setSelectionRange(0, elements.editInput.value.length);
}

export function closeEditDialog() {
  elements.editDialog.close();
}

export function openListDialog({ title, mode }) {
  elements.listEditorTitle.textContent = mode === "create" ? "新建清单" : "编辑清单";
  elements.listInput.value = title;
  elements.listDialog.showModal();
  elements.listInput.focus();
  elements.listInput.select();
}

export function closeListDialog() {
  elements.listDialog.close();
}

export function renderEditCharacterCount() {
  const maxLength = Number(elements.editInput.maxLength) || 120;
  const currentLength = elements.editInput.value.length;
  elements.editCharacterCount.textContent = `${currentLength} / ${maxLength}`;
  elements.editCharacterCount.dataset.state = currentLength >= maxLength ? "limit" : "default";
}

export function syncEditTextareaHeight() {
  if (!(elements.editInput instanceof HTMLTextAreaElement)) {
    return;
  }

  elements.editInput.style.height = "auto";
  elements.editInput.style.height = `${Math.max(elements.editInput.scrollHeight, 132)}px`;
}

function renderEditorLists(lists, activeListId) {
  elements.editListSelect.innerHTML = "";
  lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.title;
    option.selected = list.id === activeListId;
    elements.editListSelect.append(option);
  });
}
