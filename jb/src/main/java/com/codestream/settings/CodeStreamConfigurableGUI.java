package com.codestream.settings;

import com.intellij.openapi.ui.ComboBox;
import com.intellij.ui.EnumComboBoxModel;

import javax.swing.*;

public class CodeStreamConfigurableGUI {
    private JPanel rootPanel;
    private JCheckBox autoSignIn;
    private JTextField serverUrl;
    private JCheckBox disableStrictSSL;
    private JCheckBox showAvatars;
    private JCheckBox showFeedbackSmiley;
    private JCheckBox autoHideMarkers;
    private JCheckBox showMarkers;
    private JComboBox proxySupport;
    private JCheckBox proxyStrictSSL;
    private JCheckBox jcef;
    private JCheckBox showNewCodemarkGutterIconOnHover;
    private JCheckBox showGoldenSignalsInEditor;

    public JPanel getRootPanel() {
        return rootPanel;
    }

    public JCheckBox getAutoSignIn() {
        return autoSignIn;
    }

    public JTextField getServerUrl() {
        return serverUrl;
    }

    public JCheckBox getDisableStrictSSL() {
        return disableStrictSSL;
    }

    public JCheckBox getShowAvatars() {
        return showAvatars;
    }

    public JCheckBox getShowFeedbackSmiley() {
        return showFeedbackSmiley;
    }

    public JCheckBox getAutoHideMarkers() {
        return autoHideMarkers;
    }

    public JCheckBox getShowMarkers() {
        return showMarkers;
    }

    public JCheckBox getShowNewCodemarkGutterIconOnHover() {
        return showNewCodemarkGutterIconOnHover;
    }

    public JComboBox<ProxySupport> getProxySupport() {
        return proxySupport;
    }

    public JCheckBox getProxyStrictSSL() {
        return proxyStrictSSL;
    }

    public JCheckBox getJcef() {
        return jcef;
    }

    public JCheckBox getShowGoldenSignalsInEditor() {
        return showGoldenSignalsInEditor;
    }

    private void createUIComponents() {
        proxySupport = new ComboBox(new EnumComboBoxModel(ProxySupport.class));
    }
}
