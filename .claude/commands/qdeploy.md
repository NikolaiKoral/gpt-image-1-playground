Orchestrate safe deployment to production.

SMART DEPLOYMENT WORKFLOW:

1. **Pre-deployment Validation**
   - Run /qcheck for quality assurance
   - Run /qtest for functionality verification
   - Check git status for uncommitted changes
   - Verify branch is up to date with origin

2. **Build Verification**
   ```bash
   npm run build
   npm run lint
   npm run typecheck
   ```

3. **Environment Check**
   - Verify all required env vars in Fly.io:
     * OPENAI_API_KEY
     * GEMINI_API_KEY
     * REMOVE_BG_API_KEY
     * RUNWAYML_API_SECRET
   - Check fly.toml configuration
   - Validate health check endpoints

4. **Deployment Execution**
   ```bash
   git add -A
   git commit -m "chore: Pre-deployment updates"
   git push origin master
   fly deploy --config fly.toml
   ```

5. **Post-deployment Verification**
   - Monitor deployment logs
   - Test health endpoint
   - Verify core functionality:
     * Image upload/generation
     * Konverter tools
     * AI integrations
   - Check error rates
   - Monitor performance metrics

6. **Rollback Plan**
   - Keep previous deployment ID
   - Document rollback command
   - Test rollback procedure
   - Notify team of deployment status

OUTPUT: Deployment report with status, any issues encountered, and rollback instructions if needed.