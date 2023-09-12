using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.UnitTests.Stubs
{
	public class FakeTextViewRoleSet : ITextViewRoleSet
	{
		private readonly List<string> _roles;

		public FakeTextViewRoleSet(List<string> roles)
		{
			_roles = roles;
		}

		public IEnumerator<string> GetEnumerator() => _roles.GetEnumerator();

		IEnumerator IEnumerable.GetEnumerator() => _roles.GetEnumerator();

		public bool Contains(string textViewRole) => _roles.Contains(textViewRole);

		public bool ContainsAll(IEnumerable<string> textViewRoles) =>
			!textViewRoles.ToList().Except(_roles).Any();

		public bool ContainsAny(IEnumerable<string> textViewRoles) =>
			textViewRoles.Any(textViewRole => _roles.Contains(textViewRole));

		public ITextViewRoleSet UnionWith(ITextViewRoleSet roleSet)
		{
			throw new System.NotImplementedException();
		}
	}
}
