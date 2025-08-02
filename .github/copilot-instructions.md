<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions for Favorites Store Project

This is a JavaScript project focused on demonstrating design patterns and state management techniques.

## Project Context
- **Main Focus**: Closure pattern with observer pattern implementation
- **Language**: Vanilla JavaScript (ES6+)
- **Patterns**: Closure, Observer, Factory, Immutable State
- **Purpose**: Educational code review and pattern demonstration

## Code Style Guidelines
- Use modern ES6+ JavaScript features
- Prefer `const` over `let` where possible
- Use descriptive function and variable names
- Include JSDoc comments for public APIs
- Follow observer pattern conventions for state management

## Architecture Principles
- Private state encapsulation using closures
- Immutable state sharing (return copies, not references)
- Observer pattern for reactive updates
- Functional programming approach where appropriate
- No external dependencies for core functionality

## Testing Approach
- Unit tests for all public methods
- Test state immutability and encapsulation
- Verify observer pattern notifications
- Test edge cases and error conditions

## Performance Considerations
- Use Set for O(1) lookup performance
- Minimize unnecessary observer notifications
- Avoid memory leaks in subscriber management
- Consider unsubscribe mechanisms for cleanup
