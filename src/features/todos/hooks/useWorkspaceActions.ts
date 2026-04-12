import { useCallback, useState } from 'react';
import { nativeBridge } from '../../../lib/bridge';
import { TodoList } from '../../../types/api';

type BusyAction = 'reconnect' | 'paste' | 'scan' | null;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface UseWorkspaceActionsOptions {
  lists: TodoList[];
  connect: (url: string, token?: string) => Promise<void>;
  importConfig: (configStr: string) => Promise<void>;
  disconnect: () => void;
  createList: (title: string) => Promise<void>;
  updateList: (id: string, title: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
}

export function useWorkspaceActions({
  lists,
  connect,
  importConfig,
  disconnect,
  createList,
  updateList,
  deleteList,
}: UseWorkspaceActionsOptions) {
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleReconnect = useCallback(async (url: string) => {
    setMessage(null);
    try {
      setBusyAction('reconnect');
      await connect(url);
      setMessage('已发起节点连接。');
    } catch (error) {
      setMessage(getErrorMessage(error, '节点连接失败，请重新检查配置。'));
    } finally {
      setBusyAction(null);
    }
  }, [connect]);

  const handlePasteImport = useCallback(async () => {
    setMessage(null);
    try {
      setBusyAction('paste');
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        throw new Error('剪贴板里没有可导入的配置内容');
      }
      await importConfig(text);
      setMessage('剪贴板配置已导入，正在尝试连接节点。');
    } catch (error) {
      setMessage(getErrorMessage(error, '剪贴板导入失败'));
    } finally {
      setBusyAction(null);
    }
  }, [importConfig]);

  const handleScanImport = useCallback(async () => {
    setMessage(null);
    try {
      setBusyAction('scan');
      const text = await nativeBridge.scanQrCode();
      if (!text) {
        throw new Error('未读取到二维码内容');
      }
      await importConfig(text);
      setMessage('二维码配置已导入，正在尝试连接节点。');
    } catch (error) {
      setMessage(getErrorMessage(error, '扫码导入失败'));
    } finally {
      setBusyAction(null);
    }
  }, [importConfig]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setMessage('已断开当前节点连接，本地缓存仍然保留。');
  }, [disconnect]);

  const handleCreateList = useCallback(async (title: string) => {
    setMessage(null);
    try {
      await createList(title);
      setMessage(`已新增清单：${title.trim()}`);
    } catch (error) {
      setMessage(getErrorMessage(error, '新增清单失败'));
      throw error;
    }
  }, [createList]);

  const handleRenameList = useCallback(async (listId: string, title: string) => {
    setMessage(null);
    try {
      await updateList(listId, title);
      setMessage(`已更新清单名称：${title.trim()}`);
    } catch (error) {
      setMessage(getErrorMessage(error, '更新清单失败'));
      throw error;
    }
  }, [updateList]);

  const handleDeleteList = useCallback(async (listId: string) => {
    setMessage(null);
    const target = lists.find((todoList) => todoList.id === listId);
    try {
      await deleteList(listId);
      setMessage(`已删除清单：${target?.title || '未命名清单'}`);
    } catch (error) {
      setMessage(getErrorMessage(error, '删除清单失败'));
      throw error;
    }
  }, [deleteList, lists]);

  return {
    busyAction,
    message,
    handleReconnect,
    handlePasteImport,
    handleScanImport,
    handleDisconnect,
    handleCreateList,
    handleRenameList,
    handleDeleteList,
  };
}
