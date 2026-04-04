package com.lyston11.sshtodolist;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IncomingLink")
public class IncomingLinkPlugin extends Plugin {

    @PluginMethod
    public void getLaunchUrl(PluginCall call) {
        JSObject result = new JSObject();
        Uri intentUri = getBridge() != null ? getBridge().getIntentUri() : null;
        result.put("url", intentUri != null ? intentUri.toString() : null);
        call.resolve(result);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null || intent.getData() == null) {
            return;
        }

        JSObject payload = new JSObject();
        payload.put("url", intent.getData().toString());
        notifyListeners("incomingLink", payload, true);
    }
}
