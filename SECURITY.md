# Security Policy

## API Key Security

### Important Notice
**Never commit API keys or sensitive credentials to the repository.** This includes:
- Moonshot API keys
- OpenAI API keys
- Database passwords
- Any other authentication credentials

### Environment Variable Management

1. **Use Environment Variables**: Always store sensitive data in environment variables
2. **Create .env file**: Copy `.env.example` to `.env` and fill in your actual credentials
3. **Never commit .env**: The `.env` file is already in `.gitignore`
4. **Use .env.example for templates**: Only commit the example file with placeholder values

### Best Practices

1. **Local Development**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

2. **Production Deployment**:
   - Use secure secret management systems
   - Rotate API keys regularly
   - Monitor API usage for anomalies
   - Use least-privilege access principles

3. **API Key Rotation**:
   - Regularly rotate your Moonshot API keys
   - Update environment variables when rotating keys
   - Test the application after key rotation

4. **Database Security**:
   - Change default Neo4j password
   - Use strong passwords
   - Enable Neo4j authentication
   - Restrict network access to database

### Security Checklist

Before committing code:
- [ ] No API keys in source code
- [ ] No database passwords in source code
- [ ] `.env` file is in `.gitignore`
- [ ] Only `.env.example` contains placeholder values
- [ ] Environment variables are used for all sensitive data

### Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** open a public issue
2. Email security concerns to: [security@graphiti.dev]
3. Include detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

### Security Features in the Code

1. **Configuration Validation**: All configuration is validated before use
2. **Environment Variable Loading**: Sensitive data is loaded from environment variables
3. **Error Handling**: Errors are caught and logged without exposing sensitive information
4. **Input Validation**: All user inputs are validated using Zod schemas

### Additional Security Considerations

1. **Network Security**:
   - Use HTTPS for API communications
   - Implement proper firewall rules
   - Use VPNs for database access in production

2. **Data Protection**:
   - Encrypt sensitive data at rest
   - Use secure communication protocols
   - Implement proper access controls

3. **Monitoring**:
   - Monitor API usage patterns
   - Set up alerts for unusual activity
   - Log security events

Remember: **Security is everyone's responsibility. When in doubt, don't commit sensitive data.**