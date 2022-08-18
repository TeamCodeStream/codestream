using System.Linq;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.UnitTests.Stubs;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.UI {
	
	//public class TextViewRolesTest {
	//	[Theory]
	//	[InlineData(new [] { "PRIMARYDOCUMENT", "INTERACTIVE", "DOCUMENT","EDITABLE"})]
	//	[DataRow(new[] { "PRIMARYDOCUMENT", "INTERACTIVE", "DOCUMENT", "EDITABLE", "DIFF" })]
	//	[DataRow(new[] { "PRIMARYDOCUMENT", "INTERACTIVE", "DOCUMENT", "EDITABLE", "DIFF", "RIGHTDIFF" })]
	//	public void RolesValidTest(string[] s) {
	//		Assert.IsTrue(new TextViewRoleSet(s.ToList()).HasValidDocumentRoles());
	//	}

	//	[Theory]
	//	[DataRow(new[] { "PRIMARYDOCUMENT", "INTERACTIVE", "DOCUMENT", "EDITABLE", "LEFTDIFF" })]
	//	[DataRow(new[] { "PRIMARYDOCUMENT", "INTERACTIVE", "LEFTDIFF"})]
	//	public void RolesInvalidTest(string[] s) {
	//		Assert.IsFalse(new TextViewRoleSet(s.ToList()).HasValidDocumentRoles());
	//	}

	//	[Theory]  		
	//	[DataRow(new[] { "PRIMARYDOCUMENT", "INTERACTIVE", "LEFTDIFF" })]
	//	public void HasInvalidMarginRolesTest(string[] s) {
	//		Assert.IsFalse(new TextViewRoleSet(s.ToList()).HasValidMarginRoles());
	//	}
	//}
}
