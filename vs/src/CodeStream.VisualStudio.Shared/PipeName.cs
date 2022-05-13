namespace CodeStream.VisualStudio.Shared {
	public static class PipeName {
		// Pipe needs to be scoped by PID so multiple VS instances don't compete for connecting CodeLenses.
		public static string Get(int pid) => $@"codestream\vs\{pid}";
	}
}
