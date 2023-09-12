using System;
using System.Collections.Generic;
using System.Dynamic;
using System.IO;
using System.Reflection;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public static class DynamicExtensions
	{
		private static PropertyInfo[] GetProperties(this object value) =>
			value?.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);

		public static ExpandoObject GetValue(this object value, string propertyName)
		{
			foreach (var property in value.GetProperties())
			{
				if (!propertyName.EqualsIgnoreCase(property.Name))
					continue;
				var obj = new ExpandoObject() as IDictionary<string, object>;
				obj.Add(property.Name, property.GetValue(value, null));
				return obj as ExpandoObject;
			}

			return null;
		}

		/// <summary>
		/// Gets the value of the supplied property name[s]. Can be nested properties (aka Cat.Name)
		/// </summary>
		/// <typeparam name="T"></typeparam>
		/// <param name="value"></param>
		/// <param name="propertyNames"></param>
		/// <returns></returns>
		public static T GetValue<T>(this object value, string propertyNames)
		{
			var propertyNamesList = propertyNames.Split('.');
			var count = propertyNamesList.Length;
			foreach (var property in value.GetProperties())
			{
				for (var i = 0; i < propertyNamesList.Length; i++)
				{
					var propertyName = propertyNamesList[i];
					if (!propertyName.EqualsIgnoreCase(property.Name))
						continue;

					if (i == count - 1)
					{
						//if we've reached the end
						var result = property.GetValue(value, null);
						return (T)Convert.ChangeType(result, typeof(T));
					}
					else
					{
						return GetValue<T>(
							property.GetValue(value, null),
							propertyNamesList[i + 1]
						);
					}
				}
			}

			return default(T);
		}

		/// <summary>
		/// Loads an assembly from disk, using the install path of the vsix
		/// </summary>
		/// <param name="appDomain"></param>
		/// <param name="path"></param>
		/// <returns></returns>
		public static Assembly LoadFromDisk(this AppDomain appDomain, string path)
		{
			if (appDomain == null)
				return null;
			if (!path.EndsWithIgnoreCase(".dll"))
				throw new ArgumentException("Path must end in .dll");

			var directory = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
			var finalPath = $@"{directory}\{path}";
			if (!File.Exists(finalPath))
				return null;

			return appDomain.Load(File.ReadAllBytes(finalPath));
		}
	}
}
