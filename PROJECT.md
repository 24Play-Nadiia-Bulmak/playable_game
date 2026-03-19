# Playable Game — Документація проєкту

## Зміст
1. [Огляд проєкту](#огляд-проєкту)
2. [Технічний стек](#технічний-стек)
3. [Структура файлів](#структура-файлів)
4. [Запуск та збірка](#запуск-та-збірка)
5. [Архітектура та потік виконання](#архітектура-та-потік-виконання)
6. [Контролери](#контролери)
7. [Система гравця (Player)](#система-гравця-player)
8. [Система камери (FollowCameraC)](#система-камери-followcamerac)
9. [Система фізики (PhysicsC)](#система-фізики-physicsc)
10. [Система анімацій (Character)](#система-анімацій-character)
11. [Система вводу (PlayerInput)](#система-вводу-playerinput)
12. [Ресурси](#ресурси)
13. [ConfigUI параметри](#configui-параметри)
14. [Хелпери для дебагу](#хелпери-для-дебагу)
15. [Callbacks (хуки шаблону)](#callbacks-хуки-шаблону)
16. [Поширені задачі](#поширені-задачі)

---

## Огляд проєкту

3D playable-реклама на базі фреймворку `@24tools/playable_template`. Гравець керує персонажем через джойстик, камера слідує за гравцем. Проєкт будується у єдиний HTML-файл для запуску в рекламних мережах.

---

## Технічний стек

| Бібліотека | Версія | Призначення |
|---|---|---|
| `three` | ^0.183 | 3D рендерер |
| `cannon-es` | ^0.20 | Фізичний рушій |
| `nipplejs` | ^0.10 | Джойстик на тач-екрані |
| `@24tools/playable_template` | ^0.15.1 | Основний фреймворк шаблону |
| `@24tools/ads_common` | ^0.15.2 | ConfigUI, утиліти реклами |
| `@tweenjs/tween.js` | ^25.0 | Твін-анімації |
| `howler` | ^2.2 | Звуки |
| `typescript` | ^5.9 | Мова |
| `vite` | ^6.4 | Bundler для розробки |

---

## Структура файлів

```
src/
├── index.ts                        # Точка входу, ініціалізація Template
├── index.html                      # HTML-шаблон
│
├── controllers/
│   ├── TestSceneC.ts               # Головна сцена (init усього)
│   ├── ThreeC.ts                   # Обгортка Three.js (сцена, рендер, тіні)
│   ├── CameraC.ts                  # Ініціалізація камери
│   ├── PhysicsC.ts                 # PhysicsBody + PhysicsLayer enum
│   │
│   └── Presets/
│       ├── Player.ts               # Клас гравця (головний)
│       ├── Helper.ts               # Утиліти: Vector3 конвертація, BoxHelper, Wireframe
│       │
│       ├── Character/
│       │   └── Character.ts        # Модель + AnimationMixer
│       │
│       ├── Enums/
│       │   ├── BaseAnimation.ts    # Nan=-1, Idle=0, Run=1
│       │   ├── MeshType.ts         # Enum імен мешів (Character, Map тощо)
│       │   └── ResourcesType.ts    # Enum типів ресурсів (Mesh, Sound тощо)
│       │
│       ├── Input/
│       │   ├── MoveInput.ts        # Інтерфейс IMoveInput
│       │   └── PlayerInput.ts      # Реалізація через JoystickC
│       │
│       └── Movment/
│           ├── MoveC.ts            # Рух (вектор + швидкість)
│           ├── RotationC.ts        # Поворот через slerp
│           └── CameraMovment/
│               └── FollowCamera.ts # Камера що слідує за гравцем
│
├── configUIParams/
│   ├── configUIParams.ts           # Зведення всіх категорій ConfigUI
│   ├── globalSettings.ts           # Налаштування сцени і камери
│   ├── analytics.ts                # Параметри аналітики
│   ├── installBanner.ts            # Параметри банера
│   └── sounds.ts                   # Параметри звуку
│
├── templateConfig/
│   ├── afterResourcesLoadedCb.ts   # Ініціалізація сцени після завантаження
│   ├── beforeResourcesLoadedCb.ts  # Дії до завантаження ресурсів
│   ├── firstClickCb.ts             # Перший клік гравця
│   ├── gameRedirectedCb.ts         # Редірект в стор
│   ├── playableIsVisibleCb.ts      # Playable став видимим
│   └── resizeCb.ts                 # Resize екрана
│
└── resources/
    ├── resources.ts                # Зведення: [meshes, sounds]
    ├── meshes/
    │   ├── meshes.ts               # Список GLB моделей
    │   └── models/                 # GLB файли (character, map)
    └── sounds/
        ├── sounds.ts               # Список звуків
        └── (mp3 файли)
```

---

## Запуск та збірка

### Розробка
```bash
npm run start
```
Запускає Vite dev сервер. Відкрити `http://localhost:5173`.

### Експорт (єдиний HTML-файл)
```bash
npm run export
```
Збирає проєкт у єдиний `.html` файл у папку `export/`. Це фінальний файл для рекламних мереж.

### Збірка (ZIP)
```bash
npm run build
```
Збирає та запаковує проєкт у ZIP-архів.

### Оновлення шаблону
```bash
npm run update
```
Оновлює `@24tools/playable_template` та `@24tools/ads_common` до latest, після чого застосовує патчі шаблону.

---

## Архітектура та потік виконання

```
index.ts
  └─ Template.initConfig(...)
        └─ beforeResourcesLoadedCb()    ← дії до завантаження
        └─ [завантаження ресурсів]
        └─ afterResourcesLoadedCb()     ← тут стартує гра
              └─ TestSceneC.init()
                    ├─ createMap()          ← завантажує map.glb у сцену
                    └─ InitPlayer()         ← ініціалізує Player
                          └─ Player.Init()
                                ├─ Character(asset)        ← створює модель
                                ├─ InitPhisic()            ← PhysicsBody для гравця
                                ├─ PlayerInput()           ← джойстик
                                ├─ MoveC(input)            ← рух
                                ├─ RotationC(container, input) ← поворот
                                └─ FollowCameraC.Init(container) ← камера
```

Після ініціалізації `UpdateController` кожного кадру викликає зареєстровані `Delegate`:
- `Player.Update(delta)` — рух гравця, анімації, фізика
- `MoveC.update(delta)` — оновлення вектора руху
- `RotationC.update(delta)` — плавний поворот
- `FollowCameraC.Update(delta)` — переміщення камери

---

## Контролери

### TestSceneC
Точка старту гри. Метод `init()` викликається з `afterResourcesLoadedCb`.

```typescript
TestSceneC.init()
// createMap() — бере "map" з ресурсів і додає в сцену
// InitPlayer() — запускає Player.Init()
```

**Як додати об'єкт на сцену:**
```typescript
const obj = ThreeC.getObject("ім'я_з_ресурсів");
ThreeC.addToScene(obj);
```

**Як додати дебаг-хелпер на об'єкт:**
```typescript
import { addBoundingBoxHelper } from "./Presets/Helper";
addBoundingBoxHelper(someObject, 0x00ff00); // зелена рамка
```

---

## Система гравця (Player)

**Файл:** `src/controllers/Presets/Player.ts`

Статичний клас. Містить всю логіку гравця.

### Поля
| Поле | Тип | Опис |
|---|---|---|
| `container` | `Object3D` | Головний контейнер гравця (рухається через фізику) |
| `character` | `Character` | Візуальна модель + анімації |
| `physics` | `PhysicsBody` | Фізичне тіло (cannon-es) |
| `input` | `PlayerInput` | Джойстик |
| `movement` | `MoveC` | Вектор руху |
| `rotation` | `RotationC` | Поворот персонажа |

### Геттери
```typescript
Player.diraction   // поточний Vector3 напряму з джойстика
Player.runningState // чи бігає зараз
```

### Логіка Update (кожен кадр)
1. Отримує `diraction` і `weight` з `MoveC`
2. Якщо гравець рухається → `StartRunning()` + оновлення швидкості анімації
3. Якщо стоїть → `StopRunning()` (Idle-анімація)
4. Конвертує вектор в cannon-es і встановлює `velocity` фізичного тіла
5. `MoveVisual(delta)` — плавно підтягує `container` до фізичного тіла

### Швидкість анімації
Встановлюється через сетер `AnimationValue`:
```typescript
// у Player.ts
private static set AnimationValue(value: number) {
    this.character.AnimationSpeed = value;              // timeScale = value
    this.character.AnimationWeight = value * 12.5 + 87.5;
}
```
> Щоб анімація завжди була одноманітною швидкістю, замінити `this.character.AnimationSpeed = 1`

### MoveVisual — плавне слідування
```typescript
private static MoveVisual(delta: number) {
    const lerpSpeed = 10;
    const targetPos = Vector3CToT(this.physics.getPhysicsBody().position);
    this.container.position.lerp(targetPos, delta * lerpSpeed);
}
```
> Візуал слідує за фізикою через `lerp`, а не телепортується.

---

## Система камери (FollowCameraC)

**Файл:** `src/controllers/Presets/Movment/CameraMovment/FollowCamera.ts`

### Ієрархія об'єктів
```
mainContainer       ← слідує за гравцем (X, Z позиція + look-ahead)
  └─ cameraContainer ← зміщений по Y (висота камери)
       └─ cameraRotation ← повернутий на Math.PI (дивиться на гравця)
            └─ CameraC.cameraContainer ← фактична Three.js камера
```

### Ініціалізація
```typescript
FollowCameraC.Init(Player.container); // передається Object3D цілі
```

### Update — механіка look-ahead
Кожен кадр:
1. Бере `dir = Player.diraction.normalize()` — тільки напрямок руху
2. Рахує `targetPos = target.position + Offset`
3. Зміщує `targetPos` на `dir * 2` вперед (якщо рухається) або на `oldDir * 2` (якщо стоїть)
4. Плавно переміщує `mainContainer` від `oldPos` до `targetPos` через `lerpVectors`

```typescript
const lerpSpeed = 3;
this.mainContainer.position.lerpVectors(oldPos, targetPos, delta * lerpSpeed);
```

### Налаштування позиції камери
Через ConfigUI у `globalSettings.ts`:
- `camera_position_p` — портрет `[x, y, z]`
- `camera_position_l` — ландшафт `[x, y, z]`
- `camera_fov_p` / `camera_fov_l` — FOV

Геттер `Offset` автоматично зчитує актуальні значення під поточну орієнтацію екрана.

---

## Система фізики (PhysicsC)

**Файл:** `src/controllers/PhysicsC.ts`

### PhysicsLayer (enum)
```typescript
enum PhysicsLayer {
    Player = 1,
    Wall   = 2,
    Trigger = 4,
    Enemy  = 8,
}
```
Використовується для фільтрації колізій (col_group + col_mask).

### Створення PhysicsBody
```typescript
new PhysicsBody(
    threeObj,           // Object3D для синхронізації
    false,              // isTrigger (true = не фізична стіна, тільки детект)
    1,                  // маса (0 = статичний об'єкт)
    PhysicsLayer.Player, // група цього тіла
    PhysicsLayer.Wall,   // маска — з чим колідує
);
```

> Для гравця автоматично створюється сфера (не box), для всього іншого — box.

### Детектування колізій
```typescript
physics.getPhysicsBody().addEventListener("collide", (e) => {
    if (e.body.collisionFilterGroup === PhysicsLayer.Trigger) {
        // тригер спрацював
    }
    const name = (e.body as any).userData?.name;
});
```

### Конвертація координат
```typescript
import { Vector3CToT, Vector3TToC } from "./Presets/Helper";

Vector3TToC(threeVector)   // three.Vector3 → cannon.Vec3
Vector3CToT(cannonVec3)    // cannon.Vec3 → three.Vector3
```

---

## Система анімацій (Character)

**Файл:** `src/controllers/Presets/Character/Character.ts`

### Використання
```typescript
const character = new Character(gltfAsset);

// Програти анімацію (з crossfade)
character.playAnimation(BaseAnimation.Idle);
character.playAnimation(BaseAnimation.Run);

// Одноразова анімація
character.playAnimation(BaseAnimation.Idle, true);

// Налаштування швидкості та ваги
character.AnimationSpeed = 1.5;    // timeScale (прискорення)
character.AnimationWeight = 100;   // вага (0–100+)

// Підписка на події
character.onAnimLoop.addDelegate(() => { ... });
character.onAnimFinish.addDelegate(() => { ... });
```

### BaseAnimation enum
```typescript
enum BaseAnimation {
    Nan  = -1,  // немає анімації
    Idle = 0,   // стоїть (перший кліп у GLB)
    Run  = 1,   // біжить (другий кліп у GLB)
}
```
> Числа відповідають індексам кліпів у масиві `gltf.animations`. Якщо GLB має інший порядок кліпів — треба оновити enum.

---

## Система вводу (PlayerInput)

**Файл:** `src/controllers/Presets/Input/PlayerInput.ts`

### Джойстик
Ініціалізується один раз:
```typescript
PlayerInput.InitJoystick(); // викликається після першого кліку або в init
```

### Зчитування напряму
```typescript
const dir = Player.diraction; // Vector3, довжина 0..1+
```

### Поріг чутливості
```typescript
private static threshold = 0.25; // рухи менше 25% ігноруються
```
> Змінити значення в `PlayerInput.ts` щоб регулювати "мертву зону" джойстика.

---

## Ресурси

### Додати новий меш
1. Покласти `.glb` файл у `src/resources/meshes/models/`
2. Додати до `src/resources/meshes/meshes.ts`:
```typescript
{
    name: "my_object",
    value: ConvertToBase64WhenRelease('./models/my_object.glb'),
}
```
3. Додати константу в `src/controllers/Presets/Enums/MeshType.ts`:
```typescript
export enum MeshType {
    Character = "character",
    Map = "map",
    MyObject = "my_object", // нове
}
```
4. Завантажити в коді:
```typescript
const asset = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.MyObject);
```

### Додати звук
1. Покласти `.mp3` у `src/resources/sounds/`
2. Розкоментувати/додати запис у `src/resources/sounds/sounds.ts`:
```typescript
{
    name: "background",
    value: ConvertToBase64WhenRelease('./background.mp3'),
}
```
3. Відтворити:
```typescript
SoundC.play("background");
```

---

## ConfigUI параметри

**Файл:** `src/configUIParams/globalSettings.ts`

Значення зчитуються в рантаймі:
```typescript
Template.getValue<number[]>("global", "camera_position_p")
Template.getValue<number>("global", "light_intensity")
Template.getValue<string>("global", "light_color")
```

### Наявні глобальні параметри (категорія `"global"`)
| ID | Тип | Опис |
|---|---|---|
| `light_intensity` | float | Інтенсивність світла |
| `light_color` | color | Колір освітлення |
| `camera_fov_p` | int | FOV камери (портрет) |
| `camera_fov_l` | int | FOV камери (ландшафт) |
| `camera_position_p` | float[3] | Позиція камери [x,y,z] (портрет) |
| `camera_position_l` | float[3] | Позиція камери [x,y,z] (ландшафт) |
| `camera_rotation_p` | int[3] | Поворот камери [x,y,z] (портрет) |
| `camera_rotation_l` | int[3] | Поворот камери [x,y,z] (ландшафт) |

### Додати новий параметр
У відповідному файлі в `configUIParams/`, додати об'єкт у масив `params`:
```typescript
{
    id: "player_speed",
    name: "Player speed",
    type: "float",
    values: [0, 20, 5] // [min, max, default]
}
```

---

## Хелпери для дебагу

**Файл:** `src/controllers/Presets/Helper.ts`

### Зелена рамка навколо об'єкта (BoxHelper)
```typescript
import { addBoundingBoxHelper } from "./Presets/Helper";

addBoundingBoxHelper(Player.character.tObj, 0x00ff00);
addBoundingBoxHelper(mapMesh, 0xff0000); // червона
```

### Wireframe меша
```typescript
import { addWireframeHelper } from "./Presets/Helper";

addWireframeHelper(someObject, 0x0000ff); // синій wireframe
```

### Debug режим (index.ts)
```typescript
debug: {
    debug: true,    // загальний дебаг
    physics: true,  // відображення фізичних тіл cannon-es
    logger: true,   // логер
    fps_counter: true // лічильник FPS
}
```
> Перед експортом для рекламних мереж — виставити всі значення в `false`.

---

## Callbacks (хуки шаблону)

| Файл | Коли викликається | Типове використання |
|---|---|---|
| `beforeResourcesLoadedCb.ts` | До завантаження ресурсів | Налаштування UI, лоадер |
| `afterResourcesLoadedCb.ts` | Після завантаження всіх ресурсів | Старт гри (`TestSceneC.init()`) |
| `firstClickCb.ts` | Перший тач/клік гравця | Старт звуку, джойстика |
| `resizeCb.ts` | Зміна розміру/орієнтації екрана | `Template3d.resize()` |
| `playableIsVisibleCb.ts` | Playable з'явився на екрані | Автоплей, анімації |
| `gameRedirectedCb.ts` | Гравець натиснув CTA / редірект | Аналітика, cleanup |

---

## Поширені задачі

### Змінити швидкість персонажа
У `src/controllers/Presets/Movment/MoveC.ts`:
```typescript
private speed: number = 5; // збільшити це значення
```
Або передати при створенні в `Player.ts`:
```typescript
this.movement = new MoveC(this.input, 8); // speed = 8
```

### Вимкнути прискорення анімації при бігу
У `src/controllers/Presets/Player.ts` в сетері `AnimationValue`:
```typescript
private static set AnimationValue(value: number) {
    this.character.AnimationSpeed = 1; // завжди нормальна швидкість
    this.character.AnimationWeight = value * 12.5 + 87.5;
}
```

### Змінити плавність повороту персонажа
У `src/controllers/Presets/Movment/RotationC.ts`:
```typescript
private speed: number = 5; // менше = плавніше, більше = різкіше
```

### Змінити плавність камери
У `src/controllers/Presets/Movment/CameraMovment/FollowCamera.ts`:
```typescript
const lerpSpeed = 3; // менше = плавніше, більше = різкіше
```

### Змінити випередження камери вперед
```typescript
targetPos.add(dir.multiplyScalar(2)); // 2 = відстань випередження
```

### Додати колізію для нового об'єкта
```typescript
const wallPhysics = new PhysicsBody(
    wallMesh,
    false,           // не тригер
    0,               // маса 0 = статичний
    PhysicsLayer.Wall,
    PhysicsLayer.Player,
);
(wallPhysics.getPhysicsBody() as any).userData = { name: "wall" };
```

### Підписатися на Update в новому контролері
```typescript
import { Delegate, UpdateController } from "@24tools/playable_template";

private updateDelegate: Delegate<number>;

// в constructor або Init():
this.updateDelegate = new Delegate<number>(this.update.bind(this));
UpdateController.Instance.onUpdate.addListener(this.updateDelegate);

private update(delta: number) {
    // delta — час кадру в секундах
}
```

### Зчитати орієнтацію екрана
```typescript
const isPortrait = window.screenSize.portrait;
const { width, height } = window.screenSize;
```
