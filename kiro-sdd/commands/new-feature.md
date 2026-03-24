---
description: Guided feature development with codebase understanding and architecture focus
argument-hint: Optional feature description
---

# Feature Development

You are helping a developer implement a new feature. Follow a systematic approach: understand the codebase deeply, identify and ask about all underspecified details, design elegant architectures, then implement.

## Core Principles

- **Ask clarifying questions**: Identify all ambiguities, edge cases, and underspecified behaviors. Ask specific, concrete questions rather than making assumptions. Wait for user answers before proceeding with implementation. Ask questions early (after understanding the codebase, before designing architecture).
- **Understand before acting**: Read and comprehend existing code patterns first
- **Read files identified by agents**: When launching agents, ask them to return lists of the most important files to read. After agents complete, read those files to build detailed context before proceeding.
- **Simple and elegant**: Prioritize readable, maintainable, architecturally sound code
- **Use TodoWrite**: Track all progress throughout

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built

Initial request: $ARGUMENTS

**Actions**:
1. Create todo list with all phases
2. If feature unclear, ask user for:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements?
3. Summarize understanding and confirm with user

---

## Phase 2: Requirements Analysis

**Goal**: Gather and analyze requirements using Kiro SDD methodology

**Actions**:
1. Launch kiro requirement agent to:
   - Analyze the feature request comprehensively
   - Identify functional and non-functional requirements
   - Map dependencies and constraints
   - Define acceptance criteria
   - Document technical requirements

   **Agent prompt**:
   - "Analyze requirements for [feature] and provide comprehensive SDD requirements documentation"

2. Review the requirements analysis output
3. Present comprehensive summary of:
   - Functional requirements
   - Non-functional requirements
   - Constraints and dependencies
   - Acceptance criteria

---

## Phase 3: Clarifying Questions

**Goal**: Fill in gaps and resolve all ambiguities before designing

**CRITICAL**: This is one of the most important phases. DO NOT SKIP.

**Actions**:
1. Review the codebase findings and original feature request
2. Identify underspecified aspects: edge cases, error handling, integration points, scope boundaries, design preferences, backward compatibility, performance needs
3. **Present all questions to the user in a clear, organized list**
4. **Wait for answers before proceeding to architecture design**

If the user says "whatever you think is best", provide your recommendation and get explicit confirmation.

---

## Phase 4: Design

**Goal**: Create comprehensive system design following Kiro SDD methodology

**Actions**:
1. Launch kiro design agent to:
   - Create detailed system architecture
   - Design component interactions
   - Define data models and interfaces
   - Specify integration points
   - Document design decisions and trade-offs

   **Agent prompt**:
   - "Create comprehensive SDD design for [feature] based on requirements"

2. Review the design output
3. Present to user:
   - System architecture overview
   - Component design details
   - Data flow and interfaces
   - Design decisions and rationale
4. **Ask user for design approval**

---

## Phase 5: Planning

**Goal**: Create detailed implementation plan using Kiro SDD methodology

**Actions**:
1. Launch kiro plan agent to:
   - Break down design into implementation tasks
   - Define task dependencies and sequencing
   - Estimate effort and complexity
   - Create detailed work breakdown structure
   - Identify risks and mitigation strategies

   **Agent prompt**:
   - "Create comprehensive implementation plan for [feature] based on design"

2. Review the planning output
3. Present to user:
   - Task breakdown and dependencies
   - Implementation sequence
   - Risk assessment
   - Resource requirements
4. **Get user approval for the plan**

---

## Phase 6: Implementation

**Goal**: Execute the implementation plan using Kiro SDD methodology

**DO NOT START WITHOUT USER APPROVAL**

**Actions**:
1. Wait for explicit user approval
2. Launch kiro executor agent to:
   - Implement according to the approved plan
   - Follow Kiro SDD coding standards
   - Execute tasks in planned sequence
   - Handle dependencies properly
   - Document code as specified

   **Agent prompt**:
   - "Execute implementation for [feature] following the approved plan"

3. Monitor implementation progress
4. Update todos as tasks complete
5. Ensure all acceptance criteria are met

---

## Phase 7: Quality Review

**Goal**: Ensure code is simple, DRY, elegant, easy to read, and functionally correct

**Actions**:
1. Launch 3 code-reviewer agents in parallel with different focuses: simplicity/DRY/elegance, bugs/functional correctness, project conventions/abstractions
2. Consolidate findings and identify highest severity issues that you recommend fixing
3. **Present findings to user and ask what they want to do** (fix now, fix later, or proceed as-is)
4. Address issues based on user decision

---

## Phase 8: Summary

**Goal**: Document what was accomplished

**Actions**:
1. Mark all todos complete
2. Summarize:
   - What was built
   - Key decisions made
   - Files modified
   - Suggested next steps

---
