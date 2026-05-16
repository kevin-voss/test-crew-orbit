# CLI Credentials Management Specification

## Overview

This specification defines a secure, standardized system for managing credentials used by command-line interface (CLI) tools within the ai-worker environment. The system enables users to add, store, encrypt, and use credentials for various CLI tools like AWS CLI, GitHub CLI, and others.

## Goals

- Provide a secure, centralized credential management system
- Support multiple CLI tools and credential types
- Encrypt all stored credentials at rest
- Enable easy addition and management of new credentials
- Maintain compatibility with existing CLI tools
- Minimize security attack surface

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────┐
│         User Interface / API                         │
│  (Add/Update/Delete/List Credentials)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│      Credential Manager Service                      │
│  (Validation, Encryption, Resolution)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│      Encrypted Credential Storage                    │
│  (Database/Files with Encryption at Rest)           │
└──────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│   CLI Tool Execution Environment                     │
│  (Environment Variables, Config Files)              │
└──────────────────────────────────────────────────────┘
```

## Core Components

### 1. Credential Store

**Purpose**: Persistent storage for encrypted credentials

**Storage Options**:
- **Primary**: JSON-based encrypted store (file system)
- **Alternative**: Database (SQL/NoSQL) with encryption
- **Location**: `~/.ai-worker/credentials/` (configurable)

**File Structure**:
```
~/.ai-worker/credentials/
├── config.json          # Encryption/meta configuration
├── credentials.enc      # Encrypted credential vault
└── metadata.json        # Credential metadata (names, types, updated-at)
```

### 2. Encryption Strategy

**Encryption Algorithm**: AES-256-GCM (Galois/Counter Mode)

**Key Management**:
- Master key derivation using PBKDF2 or similar KDF
- Master key stored securely (OS keychain integration where available)
- Fallback: User-provided passphrase with secure prompt
- Per-credential nonce for GCM mode

**Encryption Process**:
1. Generate random nonce (12 bytes for GCM)
2. Encrypt credential data with master key + nonce
3. Store: `{iv: hex, tag: hex, ciphertext: hex, nonce: hex}`
4. All metadata encrypted as well to prevent fingerprinting

### 3. Credential Manifest

**Data Structure**: Each credential entry contains:

```json
{
  "id": "unique-credential-id",
  "name": "user-friendly-name",
  "type": "credential-type",
  "tool": "cli-tool-name",
  "encryptedData": "base64-encoded-encrypted-payload",
  "metadata": {
    "createdAt": "2026-05-16T10:30:00Z",
    "updatedAt": "2026-05-16T10:30:00Z",
    "expiresAt": "2027-05-16T10:30:00Z",
    "description": "optional-description",
    "tags": ["production", "automation"]
  },
  "encryptionDetails": {
    "algorithm": "AES-256-GCM",
    "nonce": "hex-string",
    "tag": "hex-string"
  }
}
```

## Supported CLI Tools & Credential Types

### AWS CLI
- **Type**: `aws-credentials`
- **Fields**: `accessKeyId`, `secretAccessKey`, `sessionToken` (optional), `region`
- **Storage**: Injected as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
- **Profile Support**: Named profiles with `AWS_PROFILE` override

### GitHub CLI
- **Type**: `github-token`
- **Fields**: `token`, `hostname` (github.com or enterprise)
- **Storage**: Injected as `GH_TOKEN` or written to `~/.config/gh/hosts.yml`
- **Scope**: Personal access token (PAT) or OAuth token

### Generic Credential Types
- **Type**: `api-key` - Simple key-value pairs for generic APIs
- **Type**: `oauth2` - OAuth2 tokens with refresh capability
- **Type**: `ssh-key` - SSH private keys (with passphrase support)
- **Type**: `basic-auth` - Username/password pairs
- **Type**: `bearer-token` - Bearer tokens for APIs
- **Type**: `custom` - User-defined arbitrary key-value pairs

## API Specification

### Credential Management API

#### Add Credential
```
add(name: string, type: string, credentialData: object, options?: {
  tool?: string,
  description?: string,
  expiresAt?: Date,
  tags?: string[],
  skipValidation?: boolean
}): Promise<{ id: string }>
```

**Example**:
```javascript
await credentialManager.add("my-aws-prod", "aws-credentials", {
  accessKeyId: "AKIA...",
  secretAccessKey: "...",
  region: "us-east-1"
}, {
  tool: "aws-cli",
  description: "Production AWS account",
  tags: ["production", "terraform"]
});
```

#### Update Credential
```
update(credentialId: string, credentialData: Partial<object>, options?: {
  resetTimestamp?: boolean
}): Promise<void>
```

#### Get Credential
```
get(credentialId: string): Promise<object>
```

#### List Credentials
```
list(filters?: {
  type?: string,
  tool?: string,
  tags?: string[],
  includeExpired?: boolean
}): Promise<Array<CredentialMetadata>>
```

#### Delete Credential
```
delete(credentialId: string): Promise<void>
```

#### Validate Credential
```
validate(type: string, credentialData: object): Promise<{
  valid: boolean,
  errors?: string[]
}>
```

#### Export for Environment
```
getEnvironmentVariables(credentialIds: string[]): Promise<Record<string, string>>
```

## Integration with AI-Worker

### 1. Credential Injection

**Before CLI Tool Execution**:
1. Resolve requested credential IDs from task definition
2. Decrypt requested credentials
3. Inject as environment variables or write to temporary config files
4. Execute CLI tool with injected context
5. Clean up temporary files after execution

**Example Task Definition**:
```json
{
  "taskId": "deploy-app",
  "tool": "aws-cli",
  "credentials": ["my-aws-prod"],
  "command": "aws s3 sync ./dist s3://my-bucket/"
}
```

### 2. Execution Context

**Environment Injection**:
- Credentials injected as environment variables before process execution
- Temporary files deleted after CLI tool completion
- Separate process isolation for credential visibility

**Config File Injection**:
- AWS credentials in `~/.aws/credentials` format
- GitHub config in `~/.config/gh/hosts.yml` format
- Tool-specific placement based on CLI tool's expected paths

### 3. Permission & Access Control

**Access Levels**:
- **Read**: List and retrieve credential metadata
- **Use**: Execute with credential injection
- **Write**: Add/update credentials
- **Admin**: Delete/rotate credentials, manage access policies

**Implementation**:
- Role-based access control (RBAC) per credential
- User/service account isolation
- Audit logging for credential access/usage

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Credential theft at rest | AES-256-GCM encryption |
| Credential exposure in logs | Scrubbing of credential values from logs |
| Plaintext in memory | Secure string handling, immediate zeroing |
| Unauthorized access | Access control & audit trails |
| Master key compromise | OS keychain integration, no plaintext storage |
| Credential rotation | Versioning support, automatic rotation hooks |

### Best Practices

1. **Master Key Security**:
   - Store in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
   - Use secure key derivation (PBKDF2 with high iteration count)
   - Support hardware security modules (HSM) for enterprise

2. **Credential Handling**:
   - Wipe decrypted credentials from memory after use
   - Use secure string types that prevent accidental logging
   - Implement timeout-based session credentials

3. **Audit & Monitoring**:
   - Log all credential access (read, write, delete, use)
   - Log credential rotation events
   - Alert on unusual access patterns

4. **Rotation & Expiration**:
   - Support credential expiration dates
   - Enable automatic rotation reminders
   - Support versioning for zero-downtime rotation

## Configuration Schema

### Main Configuration File

**Location**: `~/.ai-worker/config.json`

```json
{
  "version": "1",
  "credentials": {
    "storageLocation": "~/.ai-worker/credentials",
    "encryptionAlgorithm": "AES-256-GCM",
    "keyDerivationFunction": "pbkdf2",
    "pbkdf2Iterations": 100000,
    "saltLength": 32,
    "nonceLength": 12,
    "useMasterKeyCache": true,
    "masterKeyExpirationMinutes": 30
  },
  "tools": {
    "aws": {
      "enabled": true,
      "configPath": "~/.aws/credentials"
    },
    "github": {
      "enabled": true,
      "configPath": "~/.config/gh/hosts.yml"
    }
  },
  "security": {
    "enableAuditLogging": true,
    "auditLogLocation": "~/.ai-worker/logs/audit.log",
    "maxAuditLogSizeMB": 100,
    "requireMFA": false,
    "sessionTimeoutMinutes": 60
  }
}
```

## CLI Commands

### Command-Line Interface

```bash
# Add a new credential
ai-worker credentials add \
  --name "my-aws-prod" \
  --type "aws-credentials" \
  --interactive

# List all credentials
ai-worker credentials list

# List credentials by type
ai-worker credentials list --type aws-credentials

# Get credential metadata
ai-worker credentials describe my-aws-prod

# Update existing credential
ai-worker credentials update my-aws-prod --interactive

# Delete credential
ai-worker credentials delete my-aws-prod --force

# Validate credentials work
ai-worker credentials validate my-aws-prod

# Export for use in shell
eval $(ai-worker credentials export my-aws-prod)

# Rotate credential
ai-worker credentials rotate my-aws-prod
```

## Usage Examples

### Python SDK Example

```python
from ai_worker.credentials import CredentialManager

manager = CredentialManager()

# Add AWS credential
manager.add(
    name="production-aws",
    type="aws-credentials",
    credential_data={
        "access_key_id": "AKIA...",
        "secret_access_key": "...",
        "region": "us-east-1"
    },
    tool="aws-cli",
    tags=["production"]
)

# Use credential in task
env_vars = manager.get_environment_variables(["production-aws"])
```

### Node.js SDK Example

```javascript
const { CredentialManager } = require('@ai-worker/credentials');

const manager = new CredentialManager();

// Add GitHub credential
await manager.add('github-pat', 'github-token', {
  token: 'ghp_...',
  hostname: 'github.com'
}, {
  tool: 'gh-cli',
  tags: ['automation']
});

// List all credentials
const credentials = await manager.list();
console.log(credentials);
```

### Task Definition Example

```yaml
task:
  name: deploy-to-aws
  type: deployment
  tools:
    - aws-cli
  credentials:
    - production-aws
  steps:
    - name: Deploy
      command: aws cloudformation deploy --template-file template.yaml
```

## Error Handling

### Error Types

```
CredentialNotFoundError
  - Thrown when credential ID doesn't exist

CredentialValidationError
  - Thrown when credential validation fails
  - Includes list of validation errors

DecryptionError
  - Thrown when credential decryption fails
  - Indicates possible key corruption or master key mismatch

UnauthorizedAccessError
  - Thrown when user lacks permission for operation

CredentialExpiredError
  - Thrown when attempting to use expired credential
  - Includes expiration date and rotation recommendation
```

## Extensibility

### Adding New Credential Types

**Steps**:
1. Define credential schema (required/optional fields)
2. Implement validation logic
3. Register with credential manager
4. Document environment variable mappings

**Example**:
```json
{
  "type": "custom-api",
  "schema": {
    "required": ["apiKey", "endpoint"],
    "optional": ["apiVersion", "timeout"],
    "sensitive": ["apiKey"]
  },
  "validation": {
    "endpoint": "url",
    "timeout": "integer|positive"
  },
  "environmentMapping": {
    "apiKey": "CUSTOM_API_KEY",
    "endpoint": "CUSTOM_API_ENDPOINT"
  }
}
```

## Migration & Backward Compatibility

### Version Compatibility
- Support multiple credential store versions
- Automatic migration on first access
- Rollback capability for version downgrades

### Upgrade Path
```
v0.1 (plaintext storage) → v1.0 (encrypted) → v2.0 (database backend)
  Automatic migration with user confirmation
  Audit trail of migration events
```

## Testing Strategy

### Test Coverage Areas

1. **Unit Tests**:
   - Encryption/decryption correctness
   - Validation logic for each credential type
   - CRUD operations

2. **Integration Tests**:
   - End-to-end credential add/use/delete flow
   - Actual CLI tool execution with injected credentials
   - Permission and access control enforcement

3. **Security Tests**:
   - Master key extraction (negative test)
   - Credential leakage in logs/errors
   - Memory dumping protection
   - Replay attack prevention

## Future Enhancements

1. **Hardware Security Module (HSM) Support**: Store master key in HSM for enterprise
2. **Credential Rotation Service**: Automatic rotation based on schedule
3. **Credential Sharing**: Secure credential sharing between users/teams
4. **Audit Webhooks**: Real-time notifications on credential access
5. **Credential Templating**: Template-based credential creation for teams
6. **Multi-Factor Authentication**: TOTP/WebAuthn support for credential access
7. **Credential Expiration Reminders**: Proactive rotation notifications
8. **Backup & Recovery**: Secure backup and disaster recovery procedures

## Glossary

- **Master Key**: Encryption key derived from user's passphrase/OS keychain
- **Credential Vault**: Encrypted file/database containing all credentials
- **Nonce**: Random number used once with GCM encryption (prevents identical ciphertexts)
- **Credential ID**: Unique identifier for a stored credential
- **Credential Metadata**: Non-sensitive information about a credential (name, type, created date)
- **Sensitive Fields**: Credential fields marked for encryption and memory scrubbing
- **PBKDF2**: Password-Based Key Derivation Function 2
- **GCM**: Galois/Counter Mode (authenticated encryption)
- **KDF**: Key Derivation Function

## Related Documents

- Security Policy: `SECURITY.md`
- Implementation Guide: `IMPLEMENTATION.md`
- API Reference: `API.md`
- CLI Reference: `CLI.md`
