# NDR-001 — Nova Language Decision Record

**Date:** 2025-10-25  
**Author:** Michael (Aeonath)  
**Status:** Approved  
**Decision:** Adopt Go as the primary implementation language for Nova

## Context

Nova is MiraNova Studios' flagship orchestration platform and will be released as a closed-source commercial product. The language choice determines how securely we can distribute binaries, how efficiently we can manage concurrent agent processes, and how quickly the team can iterate without introducing technical debt.

## Decision

Nova will be implemented in Go (Golang).

## Rationale

### Compiled Binaries
Go produces fully static, compiled binaries with no exposed source code, ensuring closed-source protection and easy cross-platform distribution.

### Low Complexity
Go provides near-Rust performance with a far lower learning curve, allowing faster iteration and lower onboarding cost.

### Native Concurrency
Goroutines and channels make concurrent orchestration of AI agents, tasks, and pipelines simple, efficient, and reliable.

### Cross-Platform Builds
Go can easily produce binaries for Windows, macOS, and Linux using native toolchain variables (GOOS, GOARCH).

### Expanding UI Options
Frameworks like Fyne and Wails enable both native and hybrid GUIs. Nova may contribute to Go's ecosystem by extending these libraries or building a custom orchestration dashboard toolkit.

### Strong Standard Library
Go's standard library supports robust networking, JSON/YAML parsing, and Git/OS integration—ideal for Nova's agent configuration and sprint management subsystems.

### Future-Proof Modularity
While Nova's initial release will be written in Go, the architecture will remain modular, allowing future components to be rewritten in Rust or integrated via FFI if performance demands it.

## Alternatives Considered

- **Rust:** Extremely performant and secure, but with a steep learning curve that would slow early development.
- **C++:** True compiled language but too low-level and cumbersome for Nova's multi-agent orchestration model.
- **Java:** Cross-platform but easily decompiled; unsuitable for closed-source distribution.
- **Python/Node:** Ideal for prototypes, but inherently interpreted and not appropriate for a secure commercial build.

## Consequences

- Nova's codebase will target Go 1.23 or later.
- All future architectural decisions should assume Go's concurrency and module system as the baseline.
- Nova's GUI layer will use Fyne or Wails as a foundation, depending on deployment mode.
- Long-term integration with Rust remains open for low-level modules (performance or system integration).

## Acceptance Criteria

- ✅ Nova builds as a single executable binary on Windows, macOS, and Linux.
- ✅ CLI and agent orchestration work identically across platforms.
- ✅ The GUI prototype (Fyne/Wails) compiles and runs natively without runtime dependencies.
- ✅ Documentation updated to reflect Go as the official implementation language.