using System;
using System.Windows;
using System.Windows.Media.Animation;

namespace CodeStream.VisualStudio.UI.Extensions {
	public static class AnimationExtensions {
		public static UIElement FadeFromTo(this UIElement uiElement, double fromOpacity,
			double toOpacity, int durationInMilliseconds, bool loopAnimation, bool showOnStart, bool collapseOnFinish) {
			var timeSpan = TimeSpan.FromMilliseconds(durationInMilliseconds);
			var doubleAnimation =
				  new DoubleAnimation(fromOpacity, toOpacity,
									  new Duration(timeSpan));
			if (loopAnimation)
				doubleAnimation.RepeatBehavior = RepeatBehavior.Forever;

			uiElement.BeginAnimation(UIElement.OpacityProperty, doubleAnimation);
			if (showOnStart) {
				uiElement.ApplyAnimationClock(UIElement.VisibilityProperty, null);
				uiElement.Visibility = Visibility.Visible;
			}
			if (collapseOnFinish) {
				var keyAnimation = new ObjectAnimationUsingKeyFrames { Duration = new Duration(timeSpan) };
				keyAnimation.KeyFrames.Add(new DiscreteObjectKeyFrame(Visibility.Collapsed, KeyTime.FromTimeSpan(timeSpan)));
				uiElement.BeginAnimation(UIElement.VisibilityProperty, keyAnimation);
			}
			return uiElement;
		}

		public static UIElement FadeIn(this UIElement uiElement, int durationInMilliseconds) {
			return uiElement.FadeFromTo(0, 1, durationInMilliseconds, false, true, false);
		}

		public static UIElement FadeOut(this UIElement uiElement, int durationInMilliseconds) {
			return uiElement.FadeFromTo(1, 0, durationInMilliseconds, false, false, true);
		}
	}
}
