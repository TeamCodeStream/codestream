using System.Windows.Input;

namespace CodeStream.VisualStudio.Shared.UI.Wpf {
	public class KeyChordGesture : KeyGesture {
		private readonly Key _key;
		private bool _gotFirstGesture;
		private readonly InputGesture _firstGesture;

		public KeyChordGesture(ModifierKeys modifier, Key firstKey, Key secondKey) : base(Key.None) {
			_firstGesture = new KeyGesture(firstKey, modifier);
			_key = secondKey;
		}

		public override bool Matches(object obj, InputEventArgs inputEventArgs) {
			var keyArgs = inputEventArgs as System.Windows.Input.KeyEventArgs;
			if (keyArgs == null || keyArgs.IsRepeat) {
				return false;
			}

			if (_gotFirstGesture) {
				_gotFirstGesture = false;

				if (keyArgs.Key == _key) {
					inputEventArgs.Handled = true;
				}

				return keyArgs.Key == _key;
			}

			_gotFirstGesture = _firstGesture.Matches(null, inputEventArgs);
			if (_gotFirstGesture) {
				inputEventArgs.Handled = true;
			}

			return false;
		}
	}
}
