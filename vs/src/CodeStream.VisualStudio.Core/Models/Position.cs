namespace CodeStream.VisualStudio.Core.Models
{
	/// <summary>
	/// This is a copy of the Position object that ships with MS.LanguageServer.Protocol
	/// </summary>
	public class Position
	{
		public Position() { }

		public Position(int line, int character)
		{
			Line = line;
			Character = character;
		}

		public int Line { get; set; }

		public int Character { get; set; }
	}
}
