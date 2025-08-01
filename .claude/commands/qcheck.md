Execute parallel quality checks using specialized agents.

PARALLEL QUALITY CHECKS:

1. **Security Scan** (using check-security agent)
   - API key exposure
   - Authentication vulnerabilities
   - Input validation issues
   - File upload security
   - AI prompt injection risks

2. **Danish Localization** (using check-danish agent)
   - UI text consistency
   - Error message translations
   - Template descriptions
   - Number formatting
   - Currency displays

3. **Memory Leaks** (using check-memory agent)
   - Blob URL cleanup
   - React effect cleanup
   - Buffer disposal
   - Stream closures
   - Storage cleanup

4. **Code Quality**
   - TypeScript errors
   - ESLint violations
   - Unused imports
   - Console.log statements
   - TODO comments

5. **API Best Practices**
   - Error handling
   - Response formats
   - Status codes
   - Rate limiting
   - Timeout handling

Execute all checks in parallel using Task tool with subagent_type for each area.
Compile results into a single report with severity levels and actionable fixes.
Prioritize Critical and High severity issues.