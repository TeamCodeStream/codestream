using System;

namespace CodeStream.VisualStudio.Core.Exceptions {
	public class NRApiErrorException : Exception {
		public NRApiErrorException(string error) : base(error){ }
	}
}
