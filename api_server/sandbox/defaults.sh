
# Create default variable settings in this file

# Set by development tools
# CS_API_NAME     Name of the sandbox
# CS_API_SANDBOX  /path/to/root/of/sandbox
# CS_API_TOP      /path/to/root/of/primary/git/project

export PATH=$CS_API_SANDBOX/node/bin:$CS_API_TOP/bin:$PATH

export CS_API_TOP=$CS_API_TOP
export CS_API_MONGO_HOST=$MDB_HOST
export CS_API_MONGO_PORT=$MDB_PORT
export CS_API_MONGO_DATABASE=codestream
export CS_API_HOST=localhost
export CS_API_PORT=12079
export CS_API_AUTH_SECRET="A*y8lN^erPHf$"
export CS_API_LOG_DIRECTORY=$CS_API_SANDBOX/log
export CS_API_LOG_CONSOLE_OK=1
export CS_API_SSL_KEYFILE=$HOME/.certs/wildcard.codestream.us/wildcard.codestream.us-key
export CS_API_SSL_CERTFILE=$HOME/.certs/wildcard.codestream.us/wildcard.codestream.us-crt
export CS_API_SSL_CAFILE=$HOME/.certs/wildcard.codestream.us/wildcard.codestream.us-ca

# Emails by default are not sent ... set this to "on" to send emails normally
# (as in production, and exercise extreme caution when testing) ...
# or set to a valid email to have all emails diverted to the specified address,
# this is good and risk-free for developer testing
export CS_API_EMAIL_TO=

# By default we do not require email confirmation, for developer convenience
# But for testing the email confirmation process, or in production,
# this should be set to "1"
export CS_API_CONFIRMATION_REQUIRED=

# see README.pubnub for more details
export CS_API_PUBNUB_PUBLISH_KEY=pub-c-8603fed4-39da-4feb-a82e-cf5311ddb4d6
export CS_API_PUBNUB_SUBSCRIBE_KEY=sub-c-e830d7da-fb14-11e6-9f57-02ee2ddab7fe
export CS_API_PUBNUB_SECRET=sec-c-MmU3MmNlOGQtNjNhYS00NTk1LWI3NDItZDZlMjk3NmJkMDVh
