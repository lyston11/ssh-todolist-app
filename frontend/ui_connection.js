import { elements } from "./ui_dom.js";

export function renderOnboarding(state, handlers) {
  const model = buildOnboardingModel(state);

  elements.onboardingOverlay.hidden = !state.onboardingVisible;
  document.body.dataset.onboardingVisible = state.onboardingVisible ? "true" : "false";
  elements.onboardingTitle.textContent = model.title;
  elements.onboardingBody.textContent = model.body;
  elements.onboardingChecklist.innerHTML = "";

  model.checklist.forEach((item) => {
    const node = document.createElement("li");
    node.className = "onboarding-item";
    node.dataset.state = item.done ? "done" : "pending";
    node.textContent = `${item.done ? "已完成" : "下一步"} · ${item.label}`;
    elements.onboardingChecklist.append(node);
  });

  const hasDraftUrl = Boolean(state.serverDraftUrl.trim());
  const hasRecentConnections = state.recentConnections.length > 0;
  const isTesting = state.serverConnectionState === "testing";

  elements.onboardingUseDraftButton.disabled = isTesting || !hasDraftUrl;
  elements.onboardingFetchConfigButton.disabled = isTesting || !hasDraftUrl;
  elements.onboardingPasteConfigButton.disabled = isTesting;
  elements.onboardingScanConfigButton.disabled = isTesting;
  elements.onboardingDiscoverNetworkButton.disabled = isTesting || state.discoveryState === "testing";
  elements.onboardingConnectRecentButton.disabled =
    isTesting || !hasRecentConnections || !handlers.getPreferredRecentConnection();
}

export function renderConnection(state, handlers) {
  renderConnectionGuide(state, handlers);
  renderConnectionStatusCard(state);
  elements.serverUrlInput.value = state.serverDraftUrl;
  elements.serverTokenInput.value = state.serverDraftToken;
  elements.connectionConfigInput.value = state.connectionConfigDraft;
  elements.connectionMessage.textContent = state.serverConnectionMessage;
  elements.connectionMessage.dataset.state = state.serverConnectionState;
  renderRecentConnections(state.recentConnections);
  renderNetworkDiscovery(state);

  const isTesting = state.serverConnectionState === "testing";
  elements.connectServerButton.disabled = isTesting;
  elements.testServerUrlButton.disabled = isTesting;
  elements.fetchConnectionConfigButton.disabled = isTesting;
  elements.scanConnectionConfigButton.disabled = isTesting;
  elements.importConnectionConfigButton.disabled = isTesting;
  elements.pasteConnectionConfigButton.disabled = isTesting;
  elements.resetServerUrlButton.disabled = isTesting;
  elements.refreshNetworkSnapshotButton.disabled = isTesting || state.discoveryState === "testing";
  elements.probeNetworkCandidatesButton.disabled = isTesting || state.discoveryState === "testing";
}

function buildOnboardingModel(state) {
  const hasDraftUrl = Boolean(state.serverDraftUrl.trim());
  const hasToken = Boolean(state.serverDraftToken.trim());
  const hasConfigDraft = Boolean(state.connectionConfigDraft.trim());
  const hasRecentConnections = state.recentConnections.length > 0;

  if (hasRecentConnections) {
    return {
      title: "继续使用最近的同步节点",
      body: "你已经连接过至少一个节点。手机上最省事的方式是先直接回连最近节点，不够再去改配置。",
      checklist: [
        { label: "选择最近节点并回连", done: true },
        { label: "需要时再切换到其他节点", done: hasDraftUrl },
        { label: "连接成功后进入任务页", done: false },
      ],
    };
  }

  return {
    title: "先把这台设备接入你的同步节点",
    body: "先填 Tailscale 地址，然后拉取服务端配置；如果你已经复制了 JSON，也可以直接从剪贴板导入。",
    checklist: [
      { label: "填写同步节点地址", done: hasDraftUrl },
      { label: "准备 token 或导入完整配置", done: hasToken || hasConfigDraft },
      { label: "建立连接并进入任务页", done: false },
    ],
  };
}

function renderConnectionStatusCard(state) {
  const model = buildConnectionStatusModel(state);

  elements.connectionStatusTitle.textContent = model.title;
  elements.connectionStatusBody.textContent = model.body;
  elements.connectionStatusTags.innerHTML = "";

  model.tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "connection-status-tag";
    chip.dataset.tone = tag.tone;
    chip.textContent = tag.label;
    elements.connectionStatusTags.append(chip);
  });
}

function buildConnectionStatusModel(state) {
  const currentNode = state.serverBaseUrl || state.serverDraftUrl || "";
  const hasToken = Boolean((state.serverToken || state.serverDraftToken || "").trim());
  const baseTags = [
    {
      label: hasToken ? "已填写 token" : "未填写 token",
      tone: hasToken ? "ready" : "neutral",
    },
    {
      label: `${state.pendingOperations} 个待同步操作`,
      tone: state.pendingOperations > 0 ? "warning" : "neutral",
    },
  ];

  if (!currentNode) {
    return {
      title: "还没有连接节点",
      body: "先接入一个同步节点，后续最近连接、候选节点和离线缓存都会围绕这个节点工作。",
      tags: [{ label: "未配置节点", tone: "danger" }, ...baseTags],
    };
  }

  if (state.serverConnectionState === "testing" || state.syncState === "connecting") {
    return {
      title: `正在检查 ${currentNode}`,
      body: "正在验证节点、拉取快照或恢复实时同步连接，请稍等。",
      tags: [{ label: "连接中", tone: "warning" }, ...baseTags, { label: currentNode, tone: "neutral" }],
    };
  }

  if (state.syncState === "online") {
    return {
      title: "实时同步已经就绪",
      body: `当前节点 ${currentNode} 已连通，这台设备上的本地缓存和同步队列都绑定到这个节点。`,
      tags: [{ label: "在线", tone: "ready" }, ...baseTags, { label: currentNode, tone: "neutral" }],
    };
  }

  if (state.serverConnectionState === "error" || state.syncState === "offline") {
    return {
      title: "当前节点暂时不可用",
      body: `节点 ${currentNode} 当前不可用，但本地改动仍会进入离线队列，等连接恢复后继续同步。`,
      tags: [{ label: "离线", tone: "danger" }, ...baseTags, { label: currentNode, tone: "neutral" }],
    };
  }

  return {
    title: `已选中节点 ${currentNode}`,
    body: "节点地址已经就绪。你可以继续测试、拉取服务端配置，或者直接建立连接。",
    tags: [{ label: "待连接", tone: "neutral" }, ...baseTags],
  };
}

function renderConnectionGuide(state, handlers) {
  const guide = buildConnectionGuideModel(state);

  elements.connectionGuide.dataset.mode = guide.mode;
  elements.connectionGuideEyebrow.textContent = guide.eyebrow;
  elements.connectionGuideTitle.textContent = guide.title;
  elements.connectionGuideBody.textContent = guide.body;
  elements.connectionGuideChecklist.innerHTML = "";

  guide.checklist.forEach((item) => {
    const node = document.createElement("li");
    node.className = "connection-guide-item";
    node.dataset.state = item.done ? "done" : "pending";
    node.textContent = `${item.done ? "已完成" : "待完成"} · ${item.label}`;
    elements.connectionGuideChecklist.append(node);
  });

  const hasDraftUrl = Boolean(state.serverDraftUrl.trim());
  const hasRecentConnections = state.recentConnections.length > 0;
  const isOnline = state.syncState === "online";
  const isTesting = state.serverConnectionState === "testing";

  elements.guideFetchConfigButton.hidden = isOnline || !hasDraftUrl;
  elements.guideConnectCurrentButton.hidden = isOnline || !hasDraftUrl;
  elements.guideConnectRecentButton.hidden = isOnline || !hasRecentConnections;
  elements.guideScanConfigButton.hidden = isOnline;
  elements.guideDiscoverNetworkButton.hidden = false;
  elements.guideOpenTasksButton.hidden = !isOnline || state.activeView === "tasks";
  elements.guidePasteConfigButton.hidden = isOnline;

  elements.guideFetchConfigButton.disabled = isTesting || !hasDraftUrl;
  elements.guideConnectCurrentButton.disabled = isTesting || !hasDraftUrl;
  elements.guideConnectRecentButton.disabled =
    isTesting || !hasRecentConnections || !handlers.getPreferredRecentConnection();
  elements.guideScanConfigButton.disabled = isTesting;
  elements.guideDiscoverNetworkButton.disabled = isTesting || state.discoveryState === "testing";
  elements.guideOpenTasksButton.disabled = false;
  elements.guidePasteConfigButton.disabled = isTesting;
}

function buildConnectionGuideModel(state) {
  const hasDraftUrl = Boolean(state.serverDraftUrl.trim() || state.serverBaseUrl.trim());
  const hasConfigDraft = Boolean(state.connectionConfigDraft.trim());
  const hasToken = Boolean(state.serverDraftToken.trim() || state.serverToken.trim());
  const hasRecentConnections = state.recentConnections.length > 0;
  const isOnline = state.syncState === "online";

  if (isOnline) {
    return {
      mode: "online",
      eyebrow: "已连接",
      title: "同步节点已经就绪",
      body: `当前节点 ${state.serverBaseUrl || state.serverDraftUrl} 已连通，现在可以直接进入任务页继续使用。`,
      checklist: [
        { label: "同步节点地址可用", done: true },
        { label: "实时同步已建立", done: true },
        { label: "本地缓存和待同步队列已绑定当前节点", done: true },
      ],
    };
  }

  if (hasRecentConnections) {
    return {
      mode: "returning",
      eyebrow: "快速回连",
      title: "优先试试最近成功连接过的节点",
      body: "在手机上最省事的方式通常是一键回连最近节点，不必重新手填 Tailscale 地址。",
      checklist: [
        { label: "已有可复用的最近节点", done: true },
        { label: "当前节点地址已填写", done: hasDraftUrl },
        { label: "当前 token 已准备", done: hasToken },
      ],
    };
  }

  return {
    mode: "setup",
    eyebrow: "首次连接",
    title: "先连接一个同步节点",
    body: "先填一个 Tailscale 节点地址，再拉取服务端配置，或者直接导入服务端导出的 JSON。",
    checklist: [
      { label: "填写节点地址或导入连接配置", done: hasDraftUrl || hasConfigDraft },
      { label: "准备好 token", done: hasToken },
      { label: "建立同步连接", done: false },
    ],
  };
}

function renderRecentConnections(recentConnections) {
  elements.recentConnectionsList.innerHTML = "";
  elements.recentConnectionsEmpty.hidden = recentConnections.length > 0;

  recentConnections.forEach((connection) => {
    const item = document.createElement("article");
    item.className = "recent-connection-card";
    item.dataset.serverBaseUrl = connection.serverBaseUrl;

    const title = document.createElement("p");
    title.className = "recent-connection-title";
    title.textContent = connection.serverBaseUrl;

    const meta = document.createElement("p");
    meta.className = "recent-connection-meta";
    meta.textContent = buildRecentConnectionMeta(connection);

    const actions = document.createElement("div");
    actions.className = "recent-connection-actions";

    const connectButton = document.createElement("button");
    connectButton.type = "button";
    connectButton.className = "recent-connection-connect";
    connectButton.textContent = "连接";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-button recent-connection-remove";
    removeButton.textContent = "删除";

    actions.append(connectButton, removeButton);
    item.append(title, meta, actions);
    elements.recentConnectionsList.append(item);
  });
}

function renderNetworkDiscovery(state) {
  elements.networkDiscoverySummary.textContent = buildNetworkSummary(state);
  elements.networkDiscoveryList.innerHTML = "";

  state.discoveryCandidates.forEach((candidate) => {
    const item = document.createElement("article");
    item.className = "network-candidate-card";
    item.dataset.serverBaseUrl = candidate.serverBaseUrl;
    item.dataset.status = candidate.status;

    const title = document.createElement("p");
    title.className = "network-candidate-title";
    title.textContent = candidate.serverBaseUrl;

    const meta = document.createElement("p");
    meta.className = "network-candidate-meta";
    meta.textContent = buildDiscoveryCandidateMeta(candidate);

    const actions = document.createElement("div");
    actions.className = "network-candidate-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "network-candidate-use";
    useButton.textContent = candidate.serverToken ? "连接" : "使用";

    actions.append(useButton);
    item.append(title, meta, actions);
    elements.networkDiscoveryList.append(item);
  });
}

function buildRecentConnectionMeta(connection) {
  const tokenState = connection.authRequired ? "需要重新输入 token" : "无需 token";
  const lastUsedAt = new Date(connection.lastUsedAt).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tokenState} · 最近使用 ${lastUsedAt}`;
}

function buildNetworkSummary(state) {
  if (state.discoveryState === "testing") {
    return "正在读取网络信息或测试候选节点...";
  }

  if (!state.networkSnapshot?.lastUpdatedAt) {
    return "还没有读取本机网络信息。";
  }

  const tailscaleIps = Array.isArray(state.networkSnapshot?.tailscale)
    ? state.networkSnapshot.tailscale.map((item) => item.address).filter(Boolean)
    : [];

  if (tailscaleIps.length === 0) {
    return "未检测到本机 Tailscale 地址。可以先打开 Tailscale，再重新读取网络。";
  }

  return `本机 Tailscale 地址：${tailscaleIps.join(" / ")}`;
}

function buildDiscoveryCandidateMeta(candidate) {
  const latency = typeof candidate.latencyMs === "number" ? ` · ${candidate.latencyMs} ms` : "";
  const tokenHint = candidate.serverToken ? " · 已带 token" : "";
  return `${candidate.label} · ${candidate.message}${latency}${tokenHint}`;
}
