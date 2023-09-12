using Serilog;
using System;
using System.Diagnostics;

namespace CodeStream.VisualStudio.Core.Logging.Instrumentation
{
	public static class MetricsExtensions
	{
		public static IDisposable Measure(this IMetricsBase metrics, string message)
		{
			if (metrics == null)
				return null;

			return new MeasureDisposer(metrics, new Metric("\t" + message) { Id = metrics.Id });
		}

		//[Conditional("DEBUG")]
		//public static void Instrument(this Metrics metrics, string message) {
		//  TODO a single, non-wrapped point
		//}
	}

	public interface IMetricsBase : IDisposable
	{
		string Id { get; set; }
		void Log(string message);
	}

	public class EmptyMetrics : IMetricsBase
	{
		public static IMetricsBase Instance = new EmptyMetrics();

		public string Id { get; set; }

		public void Dispose() { }

		public void Log(string message) { }
	}

	public class Metrics : IMetricsBase
	{
		private readonly ILogger _logger;
		private readonly string _message;
		public string Id { get; set; }
		public Stopwatch Stopwatch { get; }

		/// <summary>
		/// Disposable class that writes all entries to a single log entry on dispose
		/// </summary>
		/// <param name="logger"></param>
		/// <param name="message"></param>
		protected Metrics(ILogger logger, string message, string id)
		{
			_logger = logger;
			_message = message;
			Id = id;
			Stopwatch = new Stopwatch();
			Stopwatch.Start();
		}

		public void Log(string message)
		{
			_logger.Verbose(message + $" ({Stopwatch.Elapsed.TotalMilliseconds}ms elapsed)");
		}

		public void Dispose()
		{
			Stopwatch.Stop();
			_logger.Verbose(
				_message
					+ " completed in "
					+ Stopwatch.Elapsed.TotalMilliseconds
					+ "ms"
					+ (Stopwatch.Elapsed.TotalMilliseconds > 100 ? " (SLOW)" : "")
			);
		}
	}

	public class MetricsStarter : Metrics
	{
		/// <summary>
		/// Disposable class that writes all entries to a single log entry on dispose
		/// </summary>
		/// <param name="logger"></param>
		/// <param name="message"></param>
		public MetricsStarter(ILogger logger, string message, string id)
			: base(logger, message, id)
		{
			if (logger != null)
			{
				logger.Verbose(message + $" grouping starting {id}");
			}
		}
	}

	public class MeasureDisposer : IDisposable
	{
		private readonly IMetricsBase _metrics;
		private readonly Metric _metric;

		public MeasureDisposer(IMetricsBase metrics, Metric metric)
		{
			_metrics = metrics;
			_metric = metric;
			_metrics.Log(metric.Message + " starting ");
		}

		public void Dispose()
		{
			var elapsed = _metric.GetElapsed();
			_metric.Ticks = elapsed.Ticks;
			_metric.Milliseconds = elapsed.TotalMilliseconds;
			_metrics.Log(
				_metric.Message
					+ " completed in "
					+ _metric.Milliseconds
					+ "ms"
					+ (_metric.Milliseconds > 100 ? " (SLOW)" : "")
			);
		}
	}

	public class Metric
	{
		private readonly Stopwatch _stopwatch;

		public Metric(string message)
		{
			Message = message;
			_stopwatch = new Stopwatch();
			_stopwatch.Start();
		}

		/// <summary>
		/// Stops the stopwatch and returns the elapsed timespan
		/// </summary>
		/// <returns></returns>
		public TimeSpan GetElapsed()
		{
			_stopwatch.Stop();
			return _stopwatch.Elapsed;
		}

		public string Message { get; }
		public long Ticks { get; set; }
		public double Milliseconds { get; set; }
		public long ElapsedTicks { get; set; }
		public string Id { get; set; }
	}
}
