using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Core.Services
{
	public delegate Task WindowMessageHandler(object sender, WindowEventArgs e);
}
