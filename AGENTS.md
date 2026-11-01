# Agent Instructions

Project-specific rules for AI coding agents. They add to the owner's global working rules; they never replace them. Keep this file short: every line is a rule the agent needs.

## 01 Before You Start
- Read docs/PRD.md to understand the product, its goal and what is out of scope
- Read docs/DESIGN_SYSTEM.md before building any UI
- Read docs/ARCHITECTURE.md before creating files or adding tools
- Read the spec in specs/ for the feature you work on
- Check existing code and components before creating new ones

## 02 General Rules
- Only build what the PRD and the approved spec describe. Ask before adding anything
- Follow the design system exactly. No new colours, fonts or sizes
- Reuse existing components. One component, one job
- Don't create unnecessary files
- [Language and framework rules. e.g. "Use TypeScript strict mode"]

## 03 Code Guidelines
- Clear, meaningful names
- Handle loading, error and empty states
- Every page works on mobile
- [Project conventions]

## 04 Security
- No secrets in code: use untracked .env files
- Validate all user input at trust boundaries
- [Project-specific rules: auth, permissions, data handling]

## 05 Useful Commands
```
[install command]
[dev server command]
[build command]
[test command]
```

## 06 When Unsure
- Check docs/ and specs/ first
- Look at how existing code does it
- Ask instead of guessing

## 07 Keep Docs Current
- A change to the stack, a feature or the design updates the matching file in docs/ in the same branch
- If the owner corrects the same thing twice, add a rule here
