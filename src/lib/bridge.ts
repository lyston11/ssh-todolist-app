import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';

interface DeviceBridgeAddress {
  address: string;
  version: number;
  interfaceName?: string;
}

interface DeviceBridgeInterface {
  name: string;
  displayName?: string;
  tailscale: boolean;
  addresses: DeviceBridgeAddress[];
}

interface DeviceBridgeSnapshot {
  interfaces: DeviceBridgeInterface[];
  tailscale: DeviceBridgeAddress[];
}

interface DeviceBridgePlugin {
  getNetworkSnapshot(): Promise<DeviceBridgeSnapshot>;
  scanQrCode(): Promise<{ text: string }>;
}

interface IncomingLinkPlugin {
  getLaunchUrl(): Promise<{ url: string | null }>;
  addListener(
    eventName: 'incomingLink',
    listenerFunc: (payload: { url: string | null }) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const DeviceBridge = registerPlugin<DeviceBridgePlugin>('DeviceBridge');
const IncomingLink = registerPlugin<IncomingLinkPlugin>('IncomingLink');
const NOOP_LISTENER_HANDLE: PluginListenerHandle = {
  remove: async () => {}
};

export interface NetworkInfo {
  supported: boolean;
  wifi: string;
  tailscale: string;
  localIp: string;
}

function pickPreferredAddress(addresses: DeviceBridgeAddress[]) {
  return addresses.find((entry) => entry.version === 4)?.address || addresses[0]?.address || '';
}

export const nativeBridge = {
  isNative: () => Capacitor.isNativePlatform(),

  getNetworkInfo: async (): Promise<NetworkInfo> => {
    if (!Capacitor.isNativePlatform()) {
      return {
        supported: false,
        wifi: 'Web 浏览器环境',
        tailscale: '无法直接读取本机 Tailscale',
        localIp: '不可用'
      };
    }

    try {
      const snapshot = await DeviceBridge.getNetworkSnapshot();
      const interfaces = Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
      const tailscaleAddresses = Array.isArray(snapshot.tailscale) ? snapshot.tailscale : [];
      const tailscaleInterface = interfaces.find((entry) => entry.tailscale);
      const localInterface = interfaces.find((entry) => !entry.tailscale && entry.addresses?.length > 0);

      const wifiLabel = localInterface
        ? `${localInterface.displayName || localInterface.name} · ${pickPreferredAddress(localInterface.addresses)}`
        : '未检测到可用局域网接口';
      const tailscaleAddress = pickPreferredAddress(tailscaleAddresses);

      return {
        supported: true,
        wifi: wifiLabel,
        tailscale: tailscaleAddress || (tailscaleInterface ? '已检测到 Tailscale 接口' : '未检测到 Tailscale'),
        localIp: pickPreferredAddress(localInterface?.addresses || []) || tailscaleAddress || '未知'
      };
    } catch (error) {
      console.error('Failed to read native network snapshot:', error);
      return {
        supported: false,
        wifi: '原生网络读取失败',
        tailscale: '无法读取 Tailscale 接口',
        localIp: '未知'
      };
    }
  },

  scanQrCode: async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('扫码导入仅支持 Android 原生应用');
    }

    const result = await DeviceBridge.scanQrCode();
    return result.text?.trim() || '';
  },

  getLaunchUrl: async () => {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const result = await IncomingLink.getLaunchUrl();
      return result.url;
    } catch (error) {
      console.error('Failed to read launch url:', error);
      return null;
    }
  },

  addIncomingLinkListener: async (listener: (url: string | null) => void) => {
    if (!Capacitor.isNativePlatform()) {
      return NOOP_LISTENER_HANDLE;
    }

    return IncomingLink.addListener('incomingLink', (payload) => {
      listener(payload.url);
    });
  },

  copyToClipboard: async (text: string) => {
    await navigator.clipboard.writeText(text);
  }
};
