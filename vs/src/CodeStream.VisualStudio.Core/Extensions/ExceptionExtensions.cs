using System;
using System.ComponentModel.Composition;
using System.ComponentModel.Composition.Primitives;
using System.Linq;

namespace CodeStream.VisualStudio.Core.Extensions {
	public static class ExceptionExtensions {

		public static Exception UnwrapCompositionException(this Exception exception) {
			var compositionException = exception as CompositionException;
			if (compositionException == null) {
				return exception;
			}

			var unwrapped = compositionException;
			while (unwrapped != null) {
				var firstError = unwrapped.Errors.FirstOrDefault();
				if (firstError == null) {
					break;
				}
				var currentException = firstError.Exception;

				if (currentException == null) {
					break;
				}

				var composablePartException = currentException as ComposablePartException;

				if (composablePartException != null
				    && composablePartException.InnerException != null) {
					var innerCompositionException = composablePartException.InnerException as CompositionException;
					if (innerCompositionException == null) {
						return currentException.InnerException ?? exception;
					}
					currentException = innerCompositionException;
				}

				unwrapped = currentException as CompositionException;
			}

			return exception; // Fuck it, couldn't find the real deal. Throw the original.
		}
	}
}
