# Migration Guide

## Version 2.0.0 → 3.0.0 (Planned)

### Breaking Changes

The following deprecated methods will be removed in v3.0.0:

#### 1. `triggerReview()` 
**Deprecated since:** v2.0.0  
**Removal:** v3.0.0  
**Alternative:** Use GitHub Pull Requests to trigger CodeRabbit reviews

```typescript
// OLD (deprecated)
await coderabbitClient.triggerReview({
  repository: 'owner/repo',
  branch: 'feature-branch'
});

// NEW (recommended)
await githubIntegration.createPullRequest({
  owner: 'owner',
  repo: 'repo',
  title: 'Feature PR',
  head: 'feature-branch',
  base: 'main'
});
// CodeRabbit will automatically review the PR
```

#### 2. `getReviewStatus()`
**Deprecated since:** v2.0.0  
**Removal:** v3.0.0  
**Alternative:** Use GitHub API to get CodeRabbit comments

```typescript
// OLD (deprecated)
await coderabbitClient.getReviewStatus({
  repository: 'owner/repo',
  prNumber: 42
});

// NEW (recommended)
await githubIntegration.getCodeRabbitComments({
  owner: 'owner',
  repo: 'repo',
  prNumber: 42
});
```

#### 3. `askCodeRabbit()`
**Deprecated since:** v2.0.0  
**Removal:** v3.0.0  
**Alternative:** Use GitHub comments with @coderabbitai

```typescript
// OLD (deprecated)
await coderabbitClient.askCodeRabbit({
  reviewId: 'review-123',
  question: 'How can I improve this?'
});

// NEW (recommended)
await githubIntegration.askCodeRabbit({
  owner: 'owner',
  repo: 'repo',
  prNumber: 42,
  question: 'How can I improve this?'
});
```

#### 4. `getReviewHistory()`
**Deprecated since:** v2.0.0  
**Removal:** v3.0.0  
**Alternative:** Use GitHub API to list PR comments

```typescript
// OLD (deprecated)
await coderabbitClient.getReviewHistory({
  repository: 'owner/repo',
  limit: 10
});

// NEW (recommended)
// Use GitHub API to get PR list and filter for CodeRabbit comments
await githubIntegration.getCodeRabbitComments({
  owner: 'owner',
  repo: 'repo',
  prNumber: 42
});
```

#### 5. `configureReview()`
**Deprecated since:** v2.0.0  
**Removal:** v3.0.0  
**Alternative:** Use `.coderabbit.yaml` configuration file

```yaml
# OLD (deprecated)
await coderabbitClient.configureReview({
  repository: 'owner/repo',
  settings: {
    autoReview: true,
    reviewLevel: 'standard'
  }
});

# NEW (recommended)
# Create .coderabbit.yaml in your repository root:
reviews:
  auto: true
  level: standard
  ignore_patterns:
    - "*.min.js"
    - "dist/**"
```

## Migration Steps

1. **Update your code** to use the new GitHub-based methods
2. **Test thoroughly** with the new API endpoints
3. **Remove deprecated method calls** before upgrading to v3.0.0
4. **Configure CodeRabbit** via `.coderabbit.yaml` file instead of API calls

## Support

If you need help migrating, please:
- Check the [README](README.md) for examples
- Open an issue on [GitHub](https://github.com/yourusername/CodeRabbit_MCP_Server/issues)
- Contact CodeRabbit support at https://coderabbit.ai/support