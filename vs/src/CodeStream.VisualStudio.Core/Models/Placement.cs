namespace CodeStream.VisualStudio.Core.Models
{
	public struct Placement
	{
		public Placement(double left, double width)
		{
			Left = left;
			Width = width;
		}

		public double Left { get; }
		public double Width { get; }
	}
}
