namespace CodeStream.VisualStudio.Shared {
	public static class Constants {
		public static class CodeLevelMetrics {
			public static class Provider {
				public const string Id = "CodeStreamCodeLevelMetrics";
			}

			public static class Tokens {
				public const string Throughput = "${throughput}";
				public const string AverageDuration = "${averageduration}";
				public const string ErrorsPerMinute = "${errorsperminute}";
				public const string Since = "${since}";
			}
		}
	}
}
