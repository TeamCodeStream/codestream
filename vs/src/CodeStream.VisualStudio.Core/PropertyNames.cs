namespace CodeStream.VisualStudio.Core {
	/// <summary>
	/// Property key names that appear in a TextBuffer property collection
	/// </summary>
	public static class PropertyNames
	{
		private static string Prefix = "CodeStream:";
		public static string DocumentMarkers = $"{Prefix}{nameof(DocumentMarkers)}";
		public static string DocumentMarkerManager = $"{Prefix}{nameof(DocumentMarkerManager)}";
		public static string TextViewMarginProviders = $"{Prefix}{nameof(TextViewMarginProviders)}";
		public static string TextViewState = $"{Prefix}{nameof(TextViewState)}";
		public static string TextViewDocument = $"{Prefix}{nameof(TextViewDocument)}";
		public static string TextViewEvents = $"{Prefix}{nameof(TextViewEvents)}";
		public static string TextViewLocalEvents = $"{Prefix}{nameof(TextViewLocalEvents)}";
		public static string AdornmentManager = $"{Prefix}{nameof(AdornmentManager)}";
		public static string TextViewLayoutChangedSubject = $"{Prefix}{nameof(TextViewLayoutChangedSubject)}";
		public static string CaretPositionChangedSubject = $"{Prefix}{nameof(CaretPositionChangedSubject)}";
		public static string TextSelectionChangedSubject = $"{Prefix}{nameof(TextSelectionChangedSubject)}";
		public const string TextViewCreationListenerLayerName = "CodeStreamHighlightColor";

		public static string IsDiff = $"{Prefix}{nameof(IsDiff)}";
		public static string IsFRDiff = $"{Prefix}{nameof(IsFRDiff)}";
		public static string IsPRDiff = $"{Prefix}{nameof(IsPRDiff)}";
		public static string OverrideFileUri = $"{Prefix}{nameof(OverrideFileUri)}";
		public static string OriginalTempFileUri = $"{Prefix}{nameof(OriginalTempFileUri)}";
	}
}
