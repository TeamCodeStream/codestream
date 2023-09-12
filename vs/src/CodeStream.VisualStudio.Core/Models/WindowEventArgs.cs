namespace CodeStream.VisualStudio.Core.Models
{
	public class WindowEventArgs
	{
		public WindowEventArgs(string message)
		{
			Message = message;
		}

		public string Message { get; }
	}
}
