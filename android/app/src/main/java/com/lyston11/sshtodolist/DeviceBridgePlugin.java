package com.lyston11.sshtodolist;

import android.Manifest;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.zxing.integration.android.IntentIntegrator;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.Enumeration;

@CapacitorPlugin(
    name = "DeviceBridge",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class DeviceBridgePlugin extends Plugin {

    @PluginMethod
    public void getNetworkSnapshot(PluginCall call) {
        JSArray interfaces = new JSArray();
        JSArray tailscale = new JSArray();

        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
            if (networkInterfaces == null) {
                JSObject result = new JSObject();
                result.put("interfaces", interfaces);
                result.put("tailscale", tailscale);
                call.resolve(result);
                return;
            }

            for (NetworkInterface networkInterface : Collections.list(networkInterfaces)) {
                if (networkInterface == null || !networkInterface.isUp()) {
                    continue;
                }

                JSArray addresses = new JSArray();
                boolean hasAddress = false;
                boolean isTailscale = isTailscaleInterface(networkInterface);

                for (InetAddress address : Collections.list(networkInterface.getInetAddresses())) {
                    if (address == null || address.isLoopbackAddress()) {
                        continue;
                    }

                    String hostAddress = normalizeHostAddress(address);
                    if (hostAddress == null || hostAddress.isBlank()) {
                        continue;
                    }

                    hasAddress = true;
                    JSObject addressResult = new JSObject();
                    addressResult.put("address", hostAddress);
                    addressResult.put("version", address instanceof Inet6Address ? 6 : 4);
                    addresses.put(addressResult);

                    if (isTailscale) {
                        JSObject tailscaleAddress = new JSObject();
                        tailscaleAddress.put("address", hostAddress);
                        tailscaleAddress.put("version", address instanceof Inet6Address ? 6 : 4);
                        tailscaleAddress.put("interfaceName", networkInterface.getName());
                        tailscale.put(tailscaleAddress);
                    }
                }

                if (!hasAddress) {
                    continue;
                }

                JSObject interfaceResult = new JSObject();
                interfaceResult.put("name", networkInterface.getName());
                interfaceResult.put("displayName", networkInterface.getDisplayName());
                interfaceResult.put("tailscale", isTailscale);
                interfaceResult.put("addresses", addresses);
                interfaces.put(interfaceResult);
            }

            JSObject result = new JSObject();
            result.put("interfaces", interfaces);
            result.put("tailscale", tailscale);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Failed to read network interfaces", error);
        }
    }

    @PluginMethod
    public void scanQrCode(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }

        launchQrScanner(call);
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        if (call == null) {
            return;
        }

        if (getPermissionState("camera") != PermissionState.GRANTED) {
            call.reject("已取消二维码扫描：没有相机权限");
            return;
        }

        launchQrScanner(call);
    }

    private void launchQrScanner(PluginCall call) {
        IntentIntegrator integrator = new IntentIntegrator(getActivity());
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE);
        integrator.setPrompt("扫描 ssh-todolist 导入二维码");
        integrator.setBeepEnabled(false);
        integrator.setOrientationLocked(false);
        Intent intent = integrator.createScanIntent();
        startActivityForResult(call, intent, "handleQrScanResult");
    }

    @ActivityCallback
    private void handleQrScanResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        Intent data = result.getData();
        String scanResult = data != null ? data.getStringExtra("SCAN_RESULT") : null;
        if (scanResult == null || scanResult.trim().isEmpty()) {
            call.reject("已取消二维码扫描");
            return;
        }

        JSObject payload = new JSObject();
        payload.put("text", scanResult.trim());
        call.resolve(payload);
    }

    private boolean isTailscaleInterface(NetworkInterface networkInterface) {
        String name = networkInterface.getName() != null ? networkInterface.getName().toLowerCase() : "";
        String displayName = networkInterface.getDisplayName() != null
            ? networkInterface.getDisplayName().toLowerCase()
            : "";
        return name.contains("tailscale") || name.startsWith("tun") || displayName.contains("tailscale");
    }

    private String normalizeHostAddress(InetAddress address) {
        if (address instanceof Inet4Address) {
            return address.getHostAddress();
        }

        if (address instanceof Inet6Address) {
            String hostAddress = address.getHostAddress();
            int zoneIndex = hostAddress.indexOf('%');
            return zoneIndex >= 0 ? hostAddress.substring(0, zoneIndex) : hostAddress;
        }

        return null;
    }
}
