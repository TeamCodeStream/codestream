using System;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Shared.Services;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Events {
	
	public class EventAggregatorTests {
		private readonly IEventAggregator _ea;

		public EventAggregatorTests() {
			_ea = new EventAggregator();
		}

		[Fact]
		public void GetEventTest() {
			IDisposable x = null;
			IDisposable y = null;

			try {
				x = _ea.GetEvent<Foo>().Subscribe(_ => { });
				Assert.NotNull(x);

				y = _ea.GetEvent<Foo>().Subscribe(_ => { });
				Assert.NotNull(y);
				Assert.NotSame(x, y);
			}
			finally {
				x?.Dispose();
				y?.Dispose();
			}
		}

		[Fact]
		public void PublishTest() {
			IDisposable x = null;
			bool called = false;

			try {
				x = _ea.GetEvent<Bar>().Subscribe(_ => { called = true; });
				_ea.Publish(new Bar());

				Assert.True(called);
			}
			finally {
				x?.Dispose();
			}
		}
	}

	class Foo : EventBase {

	}

	class Bar : EventBase {

	}
}
