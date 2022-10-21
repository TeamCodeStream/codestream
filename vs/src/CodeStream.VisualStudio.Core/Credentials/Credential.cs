using System;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Permissions;
using System.Text;

namespace CodeStream.VisualStudio.Core.Credentials
{
    public class Credential : IDisposable
    {
	    private static readonly object LockObject = new object();
	    private static readonly SecurityPermission UnmanagedCodePermission;

	    private bool _disposed;
	    private CredentialType _type;
	    private string _target;
	    private SecureString _password;
	    private string _username;
	    private string _description;
	    private DateTime _lastWriteTime;
	    private PersistanceType _persistanceType;

        static Credential()
        {
            lock (LockObject)
            {
                UnmanagedCodePermission = new SecurityPermission(SecurityPermissionFlag.UnmanagedCode);
            }
        }

        public Credential()
            : this(null, null)
        {
        }

        public Credential(string username)
            : this(username, null)
        {
        }

        public Credential(string username, string password)
            : this(username, password, null)
        {
        }

        public Credential(string username, string password, string target)
            : this(username, password, target, CredentialType.Generic)
        {
        }

        public Credential(string username, string password, string target, CredentialType type)
        {
            Username = username;
            Password = password;
            Target = target;
            Type = type;
            PersistanceType = PersistanceType.LocalComputer;
            _lastWriteTime = DateTime.MinValue;
        }


        public void Dispose()
        {
            Dispose(true);

            // Prevent GC Collection since we have already disposed of this object
            GC.SuppressFinalize(this);
        }
        ~Credential()
        {
            Dispose(false);
        }

        private void Dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    SecurePassword.Clear();
                    SecurePassword.Dispose();
                }
            }
            _disposed = true;
        }

        private void CheckNotDisposed()
        {
            if (_disposed)
            {
                throw new ObjectDisposedException("Credential object is already disposed.");
            }
        }


        public string Username
        {
            get
            {
                CheckNotDisposed();
                return _username;
            }
            set
            {
                CheckNotDisposed();
                _username = value;
            }
        }

        public string Password
        {
            get
            {
                return SecureStringHelper.CreateString(SecurePassword);
            }
            set
            {
                CheckNotDisposed();
                SecurePassword = SecureStringHelper.CreateSecureString(string.IsNullOrEmpty(value) ? string.Empty : value);
            }
        }
        public SecureString SecurePassword
        {
            get
            {
                CheckNotDisposed();
                UnmanagedCodePermission.Demand();
                return null == _password ? new SecureString() : _password.Copy();
            }
            set
            {
                CheckNotDisposed();
                if (null != _password)
                {
                    _password.Clear();
                    _password.Dispose();
                }
                _password = null == value ? new SecureString() : value.Copy();
            }
        }
        public string Target
        {
            get
            {
                CheckNotDisposed();
                return _target;
            }
            set
            {
                CheckNotDisposed();
                _target = value;
            }
        }

        public string Description
        {
            get
            {
                CheckNotDisposed();
                return _description;
            }
            set
            {
                CheckNotDisposed();
                _description = value;
            }
        }

        public DateTime LastWriteTime
        {
            get
            {
                return LastWriteTimeUtc.ToLocalTime();
            }
        }
        public DateTime LastWriteTimeUtc
        {
            get
            {
                CheckNotDisposed();
                return _lastWriteTime;
            }
            private set { _lastWriteTime = value; }
        }

        public CredentialType Type
        {
            get
            {
                CheckNotDisposed();
                return _type;
            }
            set
            {
                CheckNotDisposed();
                _type = value;
            }
        }

        public PersistanceType PersistanceType
        {
            get
            {
                CheckNotDisposed();
                return _persistanceType;
            }
            set
            {
                CheckNotDisposed();
                _persistanceType = value;
            }
        }

        public bool Save()
        {
            CheckNotDisposed();
            UnmanagedCodePermission.Demand();

            var passwordBytes = Encoding.Unicode.GetBytes(Password);
            if (Password.Length > (512))
            {
                throw new ArgumentOutOfRangeException("The password has exceeded 512 bytes.");
            }

            var credential = new NativeMethods.CREDENTIAL
            {
	            TargetName = Target,
	            UserName = Username,
	            CredentialBlob = Marshal.StringToCoTaskMemUni(Password),
	            CredentialBlobSize = passwordBytes.Length,
	            Comment = Description,
	            Type = (int)Type,
	            Persist = (int)PersistanceType
            };

            var result = NativeMethods.CredWrite(ref credential, 0);
            if (!result)
            {
                return false;
            }

            LastWriteTimeUtc = DateTime.UtcNow;
            return true;
        }


        public static void Save(string key, string username, string password)
        {
            var result = new Credential(username, password, key);
            result.Save();
        }

        public bool Delete()
        {
            CheckNotDisposed();
            UnmanagedCodePermission.Demand();

            if (string.IsNullOrEmpty(Target))
            {
                throw new InvalidOperationException("Target must be specified to delete a credential.");
            }

            var target = string.IsNullOrEmpty(Target) ? new StringBuilder() : new StringBuilder(Target);
            var result = NativeMethods.CredDelete(target, Type, 0);
            return result;
        }

        public static void Delete(string key)
        {
            var result = new Credential();
            result.Target = key;
            result.Type = CredentialType.Generic;
            result.Delete();
        }

        public static Credential Load(string key)
        {
            var result = new Credential();
            result.Target = key;
            result.Type = CredentialType.Generic;
            return result.Load() ? result : null;
        }

        public bool Load()
        {
            CheckNotDisposed();
            UnmanagedCodePermission.Demand();

            IntPtr credPointer;

            bool result = NativeMethods.CredRead(Target, Type, 0, out credPointer);
            if (!result)
            {
                return false;
            }
            using (NativeMethods.CriticalCredentialHandle credentialHandle = new NativeMethods.CriticalCredentialHandle(credPointer))
            {
                LoadInternal(credentialHandle.GetCredential());
            }
            return true;
        }

        public bool Exists()
        {
            CheckNotDisposed();
            UnmanagedCodePermission.Demand();

            if (string.IsNullOrEmpty(Target))
            {
                throw new InvalidOperationException("Target must be specified to check existance of a credential.");
            }

            using (Credential existing = new Credential { Target = Target, Type = Type })
            {
                return existing.Load();
            }
        }

        internal void LoadInternal(NativeMethods.CREDENTIAL credential)
        {
            Username = credential.UserName;
            if (credential.CredentialBlobSize > 0)
            {
                Password = Marshal.PtrToStringUni(credential.CredentialBlob, credential.CredentialBlobSize / 2);
            }
            Target = credential.TargetName;
            Type = (CredentialType)credential.Type;
            PersistanceType = (PersistanceType)credential.Persist;
            Description = credential.Comment;
            LastWriteTimeUtc = DateTime.FromFileTimeUtc(credential.LastWritten);
        }
    }
}
