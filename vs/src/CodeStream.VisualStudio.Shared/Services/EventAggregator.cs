using CodeStream.VisualStudio.Core.Logging;
using Serilog;
using System;
using System.Collections.Concurrent;
using System.ComponentModel.Composition;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using CodeStream.VisualStudio.Core.Events;
#if DEBUG
using System.Runtime.CompilerServices;
#endif

namespace CodeStream.VisualStudio.Shared.Services {
	[Export(typeof(IEventAggregator))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class EventAggregator : IEventAggregator {
		private static readonly ILogger Log = LogManager.ForContext<EventAggregator>();

		private readonly ConcurrentDictionary<Type, object> _subjects = new ConcurrentDictionary<Type, object>();

		public IObservable<TEvent> GetEvent<TEvent>(
#if DEBUG
		[CallerFilePath] string callerFilePath = "",
		[CallerLineNumber] long callerLineNumber = 0,
		[CallerMemberName] string callerMember = ""
#endif
			) where TEvent : EventBase {
#if DEBUG
			Log.DebugWithCaller($"Subscribed={typeof(TEvent)}", callerFilePath, callerLineNumber, callerMember);
#else
			Log.Debug($"Subscribed={typeof(TEvent)}");
#endif
			return ((ISubject<TEvent>)_subjects.GetOrAdd(typeof(TEvent), t => new Subject<TEvent>())).AsObservable();
		}

		public void Publish<TEvent>(TEvent sampleEvent
#if DEBUG
	, [CallerFilePath] string callerFilePath = "",
	[CallerLineNumber] long callerLineNumber = 0,
	[CallerMemberName] string callerMember = ""
#endif

			) where TEvent : EventBase {
			if (_subjects.TryGetValue(typeof(TEvent), out var subject)) {
#if DEBUG
				Log.DebugWithCaller($"Published={typeof(TEvent)}", callerFilePath, callerLineNumber, callerMember);
#else
				Log.Debug($"Published={typeof(TEvent)}");
#endif

				((ISubject<TEvent>)subject).OnNext(sampleEvent);
			}
			else {
#if DEBUG
				Log.DebugWithCaller($"Subjects Not Found={typeof(TEvent)}", callerFilePath, callerLineNumber, callerMember);
#else
				Log.Debug($"Event Not Found={typeof(TEvent)}");
#endif
			}
		}
	}
}
