package com.lyston11.sshtodolist;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingLinkPlugin.class);
        registerPlugin(DeviceBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
