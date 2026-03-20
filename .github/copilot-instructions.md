# GitHub Copilot Rules & Guidelines

## 1. C# Code Style & Naming Conventions
- **Classes & Interfaces**: Use `PascalCase` (e.g., `PlayerController`, `IInteractable`).
- **Methods**: Method names must describe their action, use `PascalCase`, and start with a verb (e.g., `MovePlayer`, `GetHealth`, `CalculateDamage`).
- **Public Properties**: Use `PascalCase` (e.g., `Health`, `Speed`).
- **Private Variables**: Use `_camelCase` with an underscore prefix (e.g., `_speed`, `_health`).
- **Method Parameters & Local Variables**: Use `camelCase` without underscores (e.g., `damage`, `horizontalInput`).
- **Constants**: Use `UPPER_SNAKE_CASE` (e.g., `MAX_PLAYERS`, `DEFAULT_HEALTH`).
- **Fields with Attributes** (like `[SerializeField]` or `[Inject]`): Use `_camelCase` with an underscore prefix (e.g., `_audioService`, `_itemConfig`).
- **Formatting**: Use 4 spaces for indentation. Always open curly braces on a new line (Allman style). Keep lines to a maximum of 120 characters. Use a single empty line to logically separate code sections and methods.

## 2. Unity Performance & Anti-Patterns
- **Critical:** Never use `GameObject.Find()`, `FindObjectOfType()`, `FindAnyObjectByType()`, or `GetComponent()` inside `Update()`, `FixedUpdate()`, or `LateUpdate()`. Always cache these references in `Awake()` or `Start()`.
- **Asynchronous Operations:** Always use `UniTask` instead of standard Unity Coroutines (`IEnumerator`, `StartCoroutine()`). Use `async UniTask` and `async UniTaskVoid` to prevent unnecessary Garbage Collection (GC) allocations and improve async/await integration.
- Avoid using LINQ (`.Where()`, `.Select()`, etc.) in hot paths (methods that run every frame) to prevent GC spikes.
- Use `gameObject.CompareTag("Enemy")` instead of `gameObject.tag == "Enemy"` to avoid string allocation.
- Do not use `Instantiate()` and `Destroy()` for frequently created or destroyed objects (like projectiles, enemies, or VFX). Always use the project's universal `PoolService` instead. When writing code to spawn an object via the pool, you MUST add a comment reminding the developer to add the prefab to the pool configuration (e.g., `// TODO: Ensure this prefab is added to the PoolService configuration.`).

## 3. Architecture & Core Systems (Project Specific)
- **Single Responsibility Principle (SRP):** Strictly follow SRP. Keep classes and methods short, concise, and focused on one specific task. Favor composition over deep inheritance hierarchies.
- **Dependency Injection (Zenject):** Never use the Singleton pattern or Service Locator. All dependencies must be resolved via Constructor Injection using Zenject (`[Inject]` attribute is allowed only on private serialized fields if constructor injection is not possible in MonoBehaviours).
- **Service Initialization:** If a service requires initialization, explicitly create a custom `Initialize()` method. The developer will manually call this method in the appropriate context. Do not use Zenject's `IInitializable` interface unless explicitly requested.
- **Custom Update Loop:** **DO NOT** use Unity's built-in `Update()`, `FixedUpdate()`, or `LateUpdate()` methods. Instead, subscribe to the central `IMessagingService` to receive `TickData` and `FixedTickData` events, or use Zenject's `ITickable`.
- **Application Flow (FSM):** The application lifecycle is strictly controlled by the `ApplicationStateMachine`. Feature logic should be modular and respect the current application state (e.g., Bootstrap, Menu, GameLoop).
- **Event-Driven Architecture (IMessagingService):** Use `IMessagingService` **strictly** for cross-module communication or Module-to-UI communication. Do not use it for internal logic within a single system or module.
- **Intra-Module Communication:** For communication within the same module, use direct interface injection, standard C# `event`, `Action`, or `Func`.
- **UI Architecture:** UI scripts (Views, e.g., `UIRoot`) must remain "dumb". They should only handle visual representation and user input forwarding. Never put core gameplay logic or state calculations inside UI components.
- **Asset Management:** Always use `IAssetProvider` for loading Addressables and instantiating prefabs asynchronously. Do not use `Resources.Load` or make direct static calls to the `Addressables` class.
- **Debugging & Cheats:** Integrate cheat functionalities via `SRDebug` by creating and registering cheat containers (e.g., `LevelSRCheats`).

## 4. Prompting & Code Generation Rules
- **Clean & Self-Explanatory Code:** Write code that documents itself through clear, descriptive naming and logical structure. 
- **Meaningful Comments:** Do not generate obvious, redundant comments (e.g., do not write `// Adds 1 to health` for `health++`). Focus comments on explaining the *why* and the business logic, rather than the *what*.
- **Initialization Documentation:** Any `Initialize()` method MUST include an XML `/// <summary>` comment that explicitly describes the method's purpose and details all of its arguments (if any are present). Provide XML summary comments for core architectural systems and public API methods as well.
- When refactoring, maintain the existing logic flow and DI structure unless explicitly asked to optimize it.