namespace CodeStream.VisualStudio.Core
{
	public static class Constants
	{
		public static class CodeLevelMetrics
		{
			public static string GoldenSignalsFormat =
				$"avg duration: {Tokens.AverageDuration} | error rate: {Tokens.ErrorRate} - {Tokens.SampleSize} samples in the last {Tokens.Since}";

			public static class Provider
			{
				public const string Id = "CodeStreamCodeLevelMetrics";
			}

			public static class Tokens
			{
				// Still using these, even though it seems redundant just in case we add back in the format string as a user preference
				public const string AverageDuration = "${averageduration}";
				public const string ErrorRate = "${errorrate}";
				public const string Since = "${since}";
				public const string SampleSize = "${samplesize}";
			}
		}

		public static string CodeStreamCodeStream = "codestream.codestream";
	}
}
