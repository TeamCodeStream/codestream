namespace CodeStream.VisualStudio.Core {

	public static class Constants {
		public static class CodeLevelMetrics {
			public static class Provider {
				public const string Id = "CodeStreamCodeLevelMetrics";
			}

			public static class Tokens {
				public const string AverageDuration = "${averageduration}";
				public const string ErrorRate = "${errorrate}";
				public const string Since = "${since}";
				public const string SampleSize = "${samplesize}";

			}
		}
		
		public static string CodeStreamCodeStream = "codestream.codestream";
	}
}
