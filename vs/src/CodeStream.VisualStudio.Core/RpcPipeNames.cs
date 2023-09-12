namespace CodeStream.VisualStudio.Core
{
	public static class RpcPipeNames
	{
		// Pipe needs to be scoped by PID so multiple VS instances don't compete for connecting CodeLenses.
		public static string ForCodeLens(int pid) => $@"codestream\vs\{pid}";
	}
}
