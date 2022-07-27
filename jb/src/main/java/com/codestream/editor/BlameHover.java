package com.codestream.editor;

import com.codestream.actions.AddComment;
import com.codestream.protocols.agent.GetBlameResultLineInfo;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import com.intellij.ui.components.ActionLink;
import com.intellij.ui.components.labels.LinkLabel;
import com.intellij.util.ui.JBUI;
import kotlin.Unit;
import kotlin.jvm.functions.Function1;

import javax.swing.*;
import java.awt.event.ActionEvent;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class BlameHover {

    private Project _project;
    private Editor _editor;
    private PsiFile _psiFile;

    public void configure(Project project, Editor editor, PsiFile psiFile, GetBlameResultLineInfo blame, Map<String, CompletableFuture<Icon>> iconsCache) {
        _project = project;
        _editor = editor;
        _psiFile = psiFile;

        Icon icon = iconsCache.get(blame.getGravatarUrl()).join();
        userIcon.setIcon(icon);
        userIcon.setText(null);

        authorName.setText(blame.getAuthorName());
        authorEmail.setText(blame.getAuthorEmail());
        commitDate.setText(blame.getDateFromNow() + " (" + blame.getDateFormatted() + ")");
        commitSha.setText(blame.getSha().substring(0, 8));
        commitMessage.setText(blame.getSummary());

//        addComment.setForeground(JBUI.CurrentTheme.Link.Foreground.ENABLED);
//        createIssue.setForeground(JBUI.CurrentTheme.Link.Foreground.ENABLED);
//        sharePermalink.setForeground(JBUI.CurrentTheme.Link.Foreground.ENABLED);
//        linkLabel.sett
    }

    public JPanel rootPanel;
    private JLabel authorName;
    private JLabel commitDate;
    private JLabel userIcon;
    private JLabel commitMessage;
    private JLabel commitSha;
    private ActionLink sharePermalink;
    private ActionLink addComment;
    private ActionLink createIssue;
    private JPanel externalContents;
    private JLabel authorEmail;

    private void createUIComponents() {
        addComment = new ActionLink("Add Comment", actionEvent -> { (new AddComment()).invoke(_project, _editor, _psiFile); });
    }
}
