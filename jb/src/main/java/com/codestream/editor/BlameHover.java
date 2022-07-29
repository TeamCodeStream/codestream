package com.codestream.editor;

import com.codestream.DirectoryKt;
import com.codestream.actions.AddComment;
import com.codestream.actions.CreateIssue;
import com.codestream.actions.GetPermalink;
import com.codestream.protocols.agent.GetBlameResultLineInfo;
import com.codestream.protocols.webview.PullRequestNotifications;
import com.codestream.protocols.webview.ReviewNotifications;
import com.codestream.protocols.webview.WebViewNotification;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.IconLoader;
import com.intellij.psi.PsiFile;
import com.intellij.ui.components.ActionLink;
import com.intellij.util.ui.JBUI;
import kotlin.Unit;
import kotlin.jvm.functions.Function0;

import javax.swing.*;
import java.awt.*;
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
        commitSha.setIcon(IconLoader.getIcon("/images/git-commit.svg"));
        commitMessage.setText(blame.getSummary());

        externalContents.setLayout(new BoxLayout(externalContents, BoxLayout.Y_AXIS));

        blame.getPrs().forEach(pr -> {
            ActionLink actionLink = new ActionLink(pr.getTitle(),  actionEvent -> {
                WebViewNotification notification = new PullRequestNotifications.Show(pr.getProviderId(), pr.getId(), null);
                DirectoryKt.getCodeStream(project).show(() -> {
                    DirectoryKt.getWebViewService(project).postNotification(notification, false);
                    return null;
                });
            });
            actionLink.setIcon(IconLoader.getIcon("/images/pull-request.svg"));
            actionLink.setMargin(JBUI.insets(3, 0));
            externalContents.add(actionLink);
        });

        blame.getReviews().stream().map(review -> new ActionLink(review.getTitle(), actionEvent -> {
            WebViewNotification notification = new ReviewNotifications.Show(review.getId(), null, null, null, false);
            DirectoryKt.getCodeStream(project).show(() -> {
                DirectoryKt.getWebViewService(project).postNotification(notification, false);
                return null;
            });


        })).forEach(actionLink -> {
            actionLink.setIcon(IconLoader.getIcon("/images/marker-fr.svg"));
            actionLink.setMargin(JBUI.insets(3, 0));
            externalContents.add(actionLink);
        });

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
        createIssue = new ActionLink("Create issue", actionEvent -> { (new CreateIssue()).invoke(_project, _editor, _psiFile); });
        sharePermalink = new ActionLink("Share permalink", actionEvent -> { (new GetPermalink()).invoke(_project, _editor, _psiFile); });
    }
}
