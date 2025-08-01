# Code Review Command

Conduct a thorough code review focusing on quality, security, performance, and maintainability.

## Review Categories:

### 1. Code Quality
- **Standards Compliance**: Coding conventions
- **Readability**: Clear naming, comments
- **Complexity**: Cyclomatic complexity
- **Duplication**: DRY principle adherence
- **Test Coverage**: Unit, integration tests

### 2. Security Review
- **Input Validation**: All user inputs
- **Authentication**: Secure implementation
- **Authorization**: Proper access controls
- **Sensitive Data**: No hardcoded secrets
- **Dependencies**: Known vulnerabilities

### 3. Performance Analysis
- **Algorithm Efficiency**: Time/space complexity
- **Database Queries**: N+1, optimization
- **Caching Strategy**: Appropriate usage
- **Resource Management**: Memory leaks
- **Async Operations**: Proper handling

### 4. Architecture Review
- **Design Patterns**: Appropriate usage
- **SOLID Principles**: Adherence check
- **Modularity**: Component separation
- **Dependencies**: Coupling analysis
- **Scalability**: Growth considerations

### 5. Error Handling
- **Exception Management**: Proper catching
- **Error Messages**: User-friendly, secure
- **Logging**: Appropriate levels
- **Recovery**: Graceful degradation
- **Monitoring**: Error tracking

### 6. Documentation
- **Code Comments**: Clarity, relevance
- **API Documentation**: Completeness
- **README**: Setup, usage instructions
- **Architecture Docs**: System design
- **Change History**: Commit messages

## Review Process:
1. Static analysis results
2. Manual inspection findings
3. Performance profiling
4. Security scanning
5. Test execution results

## Output Format:
- Issue severity (Blocker/Critical/Major/Minor)
- Code location (file:line)
- Problem description
- Suggested fix
- References/examples