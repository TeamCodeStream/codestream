using System;

namespace CodeStream.VisualStudio.Shared.Exceptions
{
	public class NRApiErrorException : Exception
	{
		public NRApiErrorException(string error)
			: base(error) { }
	}
}
