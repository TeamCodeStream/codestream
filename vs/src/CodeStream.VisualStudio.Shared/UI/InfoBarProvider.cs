using System;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace CodeStream.VisualStudio.Shared.UI
{
	public class InfoBarProvider : IVsInfoBarUIEvents
	{
		private readonly IServiceProvider _serviceProvider;
		private uint _cookie;

		private InfoBarProvider(IServiceProvider serviceProvider)
		{
			_serviceProvider = serviceProvider;
		}

		public static InfoBarProvider Instance { get; private set; }

		public static async System.Threading.Tasks.Task InitializeAsync(AsyncPackage package)
		{
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
			Instance = new InfoBarProvider(package);
		}

		public void OnClosed(IVsInfoBarUIElement infoBarUiElement)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			infoBarUiElement.Unadvise(_cookie);
		}

		public void OnActionItemClicked(
			IVsInfoBarUIElement infoBarUiElement,
			IVsInfoBarActionItem actionItem
		)
		{
			//string context = (string)actionItem.ActionContext;

			//if (context == "yes")
			//{
			//   // MessageBox.Show("You clicked Yes!");
			//}
			//else
			//{
			//  //  MessageBox.Show("You clicked No!");
			//}
		}

		public void ShowInfoBar(string message)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			var shell = _serviceProvider.GetService(typeof(SVsShell)) as IVsShell;
			if (shell == null)
				return;

			shell.GetProperty((int)__VSSPROPID7.VSSPROPID_MainWindowInfoBarHost, out var obj);
			var host = (IVsInfoBarHost)obj;

			if (host == null)
				return;

			var infoBarModel = new InfoBarModel(message);

			var factory =
				_serviceProvider.GetService(typeof(SVsInfoBarUIFactory)) as IVsInfoBarUIFactory;
			if (factory == null)
				return;

			var element = factory.CreateInfoBar(infoBarModel);
			element.Advise(this, out _cookie);
			host.AddInfoBar(element);
		}
	}
}
