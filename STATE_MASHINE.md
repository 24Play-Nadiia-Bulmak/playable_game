## Стейт машина (State Machine)

Стейт машина — це патерн, де **поведінка об'єкта визначається його поточним станом**. Є набір станів, і з кожного стану можна перейти в інший лише при певній умові (transition).

---

## Проблема без стейт машини

Подивись на свій поточний код у Player.ts:

```typescript
private static SetState(state: MovementState, weight: number) {
    if (state !== this.movementState) {
        switch (state) {
            case MovementState.Idle:        this.character.playAnimation(BaseAnimation.Idle); break;
            case MovementState.Forward:     this.character.playAnimation(BaseAnimation.Run); break;
            case MovementState.StrafeRight: this.character.playAnimation(BaseAnimation.PistolRight); break;
            // ...
        }
        this.movementState = state;
    }
}
```

Це вже **зародок** стейт машини, але:
- Логіка переходів перемішана з логікою відтворення анімацій
- Немає `onEnter` / `onExit` — немає місця для "що зробити при вході в стан"
- При додаванні нових станів (Jump, Attack, Death) — один величезний `switch`
- Неможливо легко заборонити перехід з одного стану в інший

---

## Концепція

```
[Idle] ──joystick──▶ [Walk] ──fast──▶ [Run]
  ▲                    │                │
  └────────────────────┘◀───────────────┘
         no input
         
[Any] ──health=0──▶ [Death]   (з будь-якого стану)
[Run/Walk] ──jump──▶ [Jump] ──land──▶ [previous]
```

Кожен стан — це **окремий об'єкт** з трьома методами:
```typescript
interface IState {
    onEnter(): void   // викликається один раз при вході
    onUpdate(delta: number): void  // кожен кадр
    onExit(): void    // викликається один раз при виході
}
```

---

## Простий приклад

```typescript
// Базовий інтерфейс стану
interface IState {
    onEnter(): void;
    onUpdate(delta: number): void;
    onExit(): void;
}

// Конкретний стан — Idle
class IdleState implements IState {
    constructor(private character: Character) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Idle);
        console.log("entered Idle");
    }
    onUpdate(delta: number) {
        // перевіряємо умову переходу
    }
    onExit() {
        console.log("left Idle");
    }
}

// Конкретний стан — Run
class RunState implements IState {
    constructor(private character: Character) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Run);
    }
    onUpdate(delta: number) {}
    onExit() {}
}

// Сама машина станів
class StateMachine {
    private currentState: IState | null = null;

    changeState(newState: IState) {
        this.currentState?.onExit();    // виходимо зі старого
        this.currentState = newState;
        this.currentState.onEnter();    // входимо в новий
    }

    update(delta: number) {
        this.currentState?.onUpdate(delta);
    }
}
```

Використання:
```typescript
const sm = new StateMachine();
const idle = new IdleState(character);
const run  = new RunState(character);

sm.changeState(idle);  // → "entered Idle"

// при русі:
sm.changeState(run);   // → "left Idle", "entered Run"
```

---

## Чому це краще за твій поточний switch

| | Switch у Player | State Machine |
|---|---|---|
| Відповідальність | Player знає все | Кожен стан знає тільки себе |
| `onEnter` / `onExit` | ❌ | ✅ (звук, партикли, cooldown) |
| Заборона переходу | Складно | `canTransitionTo()` в стані |
| Додати новий стан | Редагувати Player | Додати новий клас |
| Attack під час Run | Вкладені if | `AttackState` + повернення назад |

---

## У контексті твого проекту

Твій `MovementState` + `SetState()` + `UpdateMovementState()` — це вже **ручна стейт машина без onEnter/onExit**. Щоб її формалізувати, треба:

1. Витягнути `IdleState`, `RunState`, `StrafeState` тощо в окремі класи
2. Створити клас `StateMachine` 
3. `Player` та `Npc` лише викликають `stateMachine.update(delta)` і `stateMachine.changeState(newState)`

---

## Для NPC це особливо важливо

Зараз NPC просто ходить випадково. Але стейт машина дозволяє:

```
[Wander] ──бачить гравця──▶ [Chase] ──втратив гравця──▶ [Search]
                                          │
                               близько──▶ [Attack]
```

Кожен стан — окремий файл з власною логікою. Це стандарт у геймдеві.

---

Хочеш — реалізую базову `StateMachine` і перепишу `Npc` або `Player` на неї?