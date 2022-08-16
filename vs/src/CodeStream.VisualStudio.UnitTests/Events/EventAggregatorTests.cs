using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.UnitTests.Events {
	[TestClass]
	public class EventAggregatorTests {
		private readonly IEventAggregator _ea;

		public EventAggregatorTests() {
			_ea = new EventAggregator();
		}

		[TestMethod]
		public void GetEventTest() {
			IDisposable x = null;
			IDisposable y = null;

			try {
				x = _ea.GetEvent<Foo>().Subscribe(_ => { });
				Assert.IsNotNull(x);

				y = _ea.GetEvent<Foo>().Subscribe(_ => { });
				Assert.IsNotNull(y);
				Assert.AreNotSame(x, y);
			}
			finally {
				x?.Dispose();
				y?.Dispose();
			}
		}

		[TestMethod]
		public void PublishTest() {
			IDisposable x = null;
			bool called = false;

			try {
				x = _ea.GetEvent<Bar>().Subscribe(_ => { called = true; });
				_ea.Publish(new Bar());

				Assert.IsTrue(called);
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
