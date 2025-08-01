# Available Claude Agent Commands

This directory contains specialized commands for each Claude agent type. Use these commands by calling them with the Task tool.

## Command Usage Example
```
Task(
    description="SWOT analysis", 
    prompt="/swot-analysis", 
    subagent_type="strategic-analyst"
)
```

## Strategic Analyst Commands

### `/swot-analysis`
Performs comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis with actionable recommendations.

### `/competitive-analysis`
Conducts competitive analysis using Porter's Five Forces and competitive positioning frameworks.

## KPI Dashboard Commands

### `/setup-metrics`
Designs and implements comprehensive KPI tracking system with real-time monitoring capabilities.

### `/performance-report`
Generates performance analysis report with trends, insights, and optimization recommendations.

## Revenue Optimizer Commands

### `/pricing-strategy`
Develops and optimizes pricing strategies to maximize revenue and market competitiveness.

### `/growth-opportunities`
Identifies and prioritizes revenue growth opportunities through market expansion and optimization.

## Business Case Commands

### `/roi-analysis`
Conducts comprehensive Return on Investment analysis for proposed initiatives.

### `/investment-proposal`
Creates investment proposals with financial justification and strategic alignment.

## QA Validator Commands

### `/security-audit`
Performs comprehensive security audit identifying vulnerabilities and compliance gaps.

### `/code-review`
Conducts thorough code review focusing on quality, security, performance, and maintainability.

## Synthesis Coordinator Commands

### `/executive-summary`
Synthesizes complex analyses into cohesive executive summary with actionable recommendations.

### `/integration-plan`
Creates comprehensive plan to integrate findings and initiatives from multiple analyses.

## Data Analyst Commands

### `/data-quality`
Performs comprehensive data quality analysis to identify issues and improvement opportunities.

### `/statistical-analysis`
Conducts advanced statistical analysis to uncover insights and patterns from data.

## Business Master Commands

### `/strategic-planning`
Orchestrates comprehensive strategic planning using 4-D methodology and multi-agent insights.

### `/transformation-roadmap`
Designs and orchestrates comprehensive business transformation initiatives.

## Command Structure

Each command follows a consistent structure:
1. **Context Analysis** - Understanding current state
2. **Framework Application** - Using relevant methodologies
3. **Multi-Perspective Integration** - Combining different viewpoints
4. **Actionable Outputs** - Specific deliverables and next steps
5. **Success Metrics** - How to measure effectiveness

## Best Practices

1. **Use specific commands** rather than generic prompts for better results
2. **Combine multiple agents** for comprehensive analysis
3. **Start with discovery** commands before jumping to solutions
4. **Use synthesis coordinator** to integrate findings from multiple agents
5. **Follow up with validation** using qa-validator commands

## Example Multi-Agent Workflow

```python
# 1. Strategic discovery
strategic_swot = Task(description="SWOT analysis", prompt="/swot-analysis", subagent_type="strategic-analyst")

# 2. Performance baseline
current_metrics = Task(description="Performance analysis", prompt="/performance-report", subagent_type="kpi-dashboard")

# 3. Growth identification
opportunities = Task(description="Growth analysis", prompt="/growth-opportunities", subagent_type="revenue-optimizer")

# 4. Integration
summary = Task(description="Synthesize findings", prompt="/executive-summary", subagent_type="synthesis-coordinator")
```