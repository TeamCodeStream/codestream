namespace CodeStream.VisualStudio.Shared.Models {
	public class ResponseError {
		public int? Code { get; set; }
		public string Message { get; set; }

		public ResponseError(int? code, string message) {
			Code = code;
			Message = message;
		}
	}
}
