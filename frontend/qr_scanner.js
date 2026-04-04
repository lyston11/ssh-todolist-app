import { scanNativeQrCode } from "./native_bridge.js";

export class QrScanCancelledError extends Error {
  constructor(message = "已取消二维码扫描") {
    super(message);
    this.name = "QrScanCancelledError";
  }
}

export async function scanConnectionQrCode() {
  const nativeResult = await tryNativeQrScan();
  if (nativeResult) {
    return nativeResult;
  }

  return pickAndDecodeQrImage();
}

async function tryNativeQrScan() {
  try {
    return await scanNativeQrCode();
  } catch (error) {
    if (error instanceof QrScanCancelledError) {
      throw error;
    }
    if (error?.message && /not supported/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function pickAndDecodeQrImage() {
  const detector = createDetector();
  if (!detector) {
    throw new Error("当前环境不支持二维码识别，请直接粘贴导入链接或 JSON 配置。");
  }

  const file = await chooseImageFile();
  const bitmap = await createImageBitmap(file);

  try {
    const results = await detector.detect(bitmap);
    const firstCode = Array.isArray(results) ? results.find((item) => typeof item.rawValue === "string") : null;
    if (!firstCode?.rawValue?.trim()) {
      throw new Error("没有在图片里识别到二维码，请换一张更清晰的截图或相机照片。");
    }
    return firstCode.rawValue.trim();
  } finally {
    bitmap.close?.();
  }
}

function createDetector() {
  const BarcodeDetector = globalThis.BarcodeDetector;
  if (typeof BarcodeDetector !== "function") {
    return null;
  }
  return new BarcodeDetector({ formats: ["qr_code"] });
}

function chooseImageFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        cleanup();
        if (!file) {
          reject(new QrScanCancelledError());
          return;
        }
        resolve(file);
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        cleanup();
        reject(new QrScanCancelledError());
      },
      { once: true },
    );

    document.body.append(input);
    input.click();
  });
}
