# Generate Plan Command

Ultrathink to generate a new plan file in the docs/plans directory based on user input.

## Usage
`generate-plan`

## Purpose
This command creates a structured plan file in the @docs/plans directory with the file name `{task}-plan.md` format based on the user's task description, following a systematic planning process.

## Process

1. **Receive Task Input**
   - Ask for task name (e.g., "api-refactor", "auth-implementation")
   - Get detailed description of what needs to be planned

2. **Analyze Task Objective**
   - Break down the high-level goal
   - Identify key deliverables
   - Define success criteria

3. **Context Gathering**
   - Identify relevant guides and documentation
   - List relevant files that will be affected
   - Note any existing patterns or conventions to follow

4. **Ask Clarifying Questions**
   - Present any ambiguities or assumptions
   - Wait for user confirmation before proceeding
   - Ensure full understanding of requirements

5. **Generate Initial Goals**
   - Create high-level parent goals
   - Present to user for validation
   - Wait for confirmation or adjustments

6. **Decompose into Sub-Goals**
   - Break each parent goal into concrete steps
   - Ensure each step is actionable and verifiable
   - Include checkboxes for progress tracking

7. **Save Plan**
   - Generate the plan file at `docs/plans/{task}-plan.md`
   - Include all gathered context and validated goals

## Plan Structure

The generated plan should include:

```markdown
# {Task Name} Plan

## Objective
[Clear statement of what this plan aims to achieve]

## Context
- **Created**: [Date]
- **Status**: [ ] Not Started / [ ] In Progress / [ ] Completed
- **Complexity**: Low / Medium / High

## Prerequisites
[Dependencies and requirements that must be met before starting]

## Relevant Resources
### Guides
- [List of relevant documentation or guides]

### Files
- [List of files that will be modified]

### Documentation
- [External docs, APIs, or references needed]

## Goals

### Parent Goal 1: [High-level objective]
- [ ] Sub-goal 1.1: [Specific actionable step]
- [ ] Sub-goal 1.2: [Specific actionable step]
- [ ] Sub-goal 1.3: [Specific actionable step]

### Parent Goal 2: [High-level objective]
- [ ] Sub-goal 2.1: [Specific actionable step]
- [ ] Sub-goal 2.2: [Specific actionable step]

## Implementation Notes
[Any specific constraints, patterns to follow, or important considerations]

## Testing Strategy
[How to verify each goal has been successfully completed]

## Risks & Mitigations
[Potential issues and their solutions]

## Timeline Estimate
- Planning: [Duration]
- Implementation: [Duration]
- Testing: [Duration]
- Total: [Duration]

## Discussion
[Any clarifying questions or decisions made during planning]
```

## Best Practices

1. **Be Thorough**: Take time to understand the full scope before generating the plan
2. **Ask Questions**: Always clarify ambiguities rather than making assumptions
3. **Validate with User**: Get confirmation at key decision points
4. **Actionable Steps**: Each sub-goal should be a concrete, verifiable action
5. **Track Progress**: Use checkboxes to enable progress tracking
6. **Document Context**: Include all relevant information for future reference

## Example

User input:
- Task name: `auth-implementation`
- Description: "Implement JWT authentication with refresh tokens for the API"

Process:
1. Analyze: Need to add authentication to existing API
2. Clarify: Which endpoints? User roles? Token expiration?
3. Goals: Setup JWT, implement login/logout, add middleware, handle refresh
4. Validate: Present plan and adjust based on feedback

Generated file: `docs/plans/auth-implementation-plan.md`