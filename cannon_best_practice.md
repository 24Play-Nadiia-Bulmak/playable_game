## Cannon-es Best Practices — детально з прикладами

---

### 1. Use Low-Poly Physics Shapes

Фізичні форми **ніколи не повинні** повторювати візуальну геометрію. Гравець не бачить колайдери — тому вони мають бути максимально простими.

```
Візуальна модель дерева:  ~2000 трикутників
Фізичний колайдер:        1 Cylinder або Box  ← у 2000 разів менше роботи
```

```typescript
// ❌ Погано — Trimesh з повного меша персонажа
const trimesh = new Trimesh(fullMeshVertices, fullMeshIndices);

// ✅ Добре — одна сфера для персонажа
new Sphere(0.4);

// ✅ Добре — Box для будинку замість точної геометрії даху
new Box(new Vec3(2.5, 3, 4));

// ✅ Добре — CompoundBody для L-подібного об'єкта
const body = new Body({ mass: 0 });
body.addShape(new Box(new Vec3(1, 1, 3)), new Vec3(0, 0, 0));   // основа
body.addShape(new Box(new Vec3(1, 1, 1)), new Vec3(0, 0, 2));   // виступ
```

**Правило:** Sphere → Box → Cylinder → ConvexPolyhedron → Trimesh (останній варіант, тільки static).

---

### 2. Keep Time Step Fixed and Consistent

Фізика має рахуватись з **фіксованим кроком часу** (`fixedTimeStep`), а не з реальним `delta` кожного кадру. Інакше при просадці FPS об'єкти будуть "стрибати".

```typescript
// ❌ Погано — фізика залежить від FPS
world.step(delta); // при 10fps delta=0.1, об'єкт "перестрибує"

// ✅ Добре — фіксований крок 1/60 секунди
const FIXED_STEP = 1 / 60;
const MAX_SUB_STEPS = 3;

// У головному Update loop:
world.step(FIXED_STEP, delta, MAX_SUB_STEPS);
//          ↑ фіксований крок   ↑ реальний час   ↑ максимум кроків наздоганяння
```

При `60fps`: cannon робить 1 крок на кадр.  
При `30fps`: cannon робить 2 кроки на кадр (наздоганяє).  
При `10fps`: cannon робить 3 кроки (MAX_SUB_STEPS обмежує).

---

### 3. Let Cannon Run Multiple Steps to Catch Up

Це продовження попереднього. `maxSubSteps` — це "скільки фізичних кроків дозволено за один рендер-кадр". Якщо FPS впав — фізика наздожене без "телепортацій".

```typescript
// Якщо гравець рухається зі швидкістю 10 м/с при 10fps:
// ❌ Без subSteps: 1 великий крок 0.1с → об'єкт перестрибує через стіни
// ✅ З subSteps=3: 3 кроки по 0.033с → зіткнення виявляється коректно

world.step(1 / 60, delta, 3);
```

**Важливо:** `maxSubSteps * fixedStep` має бути ≥ максимально можливого `delta`. При 10fps delta≈0.1, тому потрібно мінімум `ceil(0.1 / (1/60)) = 6` кроків для повної точності. Але 3 — практичний компроміс між точністю і продуктивністю.

---

### 4. Don't Forget to Sync with Render

Після кожного `world.step()` — позиції cannon-тіл оновились, але Three.js меші ще на старих позиціях. Треба синхронізувати.

```typescript
// ❌ Об'єкти "відстають" — синхронізацію забули
world.step(1/60, delta, 3);
renderer.render(scene, camera); // меші на старих позиціях!

// ✅ Синхронізація після кожного кроку
world.step(1/60, delta, 3);

// Варіант 1 — вручну для кожного об'єкта:
playerMesh.position.copy(playerBody.position as any);
playerMesh.quaternion.copy(playerBody.quaternion as any);

// Варіант 2 — через PhysicsObjPair (вже є у проєкті):
// PhysicsObjPair.update() викликається через UpdateController делегат
// і копіює position/quaternion з cannon → three автоматично
```

У вашому проєкті гравець робить це вручну через `MoveVisual()` → `lerp` до позиції cannon body. `lerp` дає плавність, але додає затримку ~1-2 кадри.

---

### 5. Use `sleeping` for Performance

Об'єкт "засинає" якщо давно не рухається — cannon перестає рахувати для нього фізику. Критично важливо для сцени з 50+ динамічних об'єктів.

```typescript
// Глобально для всього world:
world.allowSleep = true;
world.sleepTimeLimit = 1;      // засинає через 1 секунду нерухомості
world.sleepSpeedLimit = 0.1;   // вважається нерухомим при швидкості < 0.1 м/с

// Для конкретного тіла (наприклад, ящики на карті):
boxBody.allowSleep = true;
boxBody.sleepSpeedLimit = 0.5;
boxBody.sleepTimeLimit = 0.5;

// Для гравця — НЕ давати засинати (він завжди активний):
playerBody.sleepSpeedLimit = 0; // ← вже є у вашому InitPhisic()
```

Коли тіло спить → `body.sleepState === Body.SLEEPING`. Прокинеться автоматично при зіткненні з активним тілом.

```typescript
// Перевірка стану:
if (body.sleepState === Body.SLEEPING) {
    console.log("тіло спить, фізика не рахується");
}
// Примусове пробудження:
body.wakeUp();
```

---

### 6. Use a Visual Debugger

Без дебагу ти ніколи не знаєш де насправді знаходяться колайдери. Популярна бібліотека — `cannon-es-debugger`.

```typescript
import CannonDebugger from 'cannon-es-debugger';

const cannonDebugger = CannonDebugger(scene, world, {
    color: 0x00ff00,  // колір wireframe
    scale: 1.0,
});

// У головному Update loop — після world.step():
world.step(1/60, delta, 3);
cannonDebugger.update(); // ← оновлює wireframe колайдерів у сцені
renderer.render(scene, camera);
```

Показує точні форми і позиції всіх cannon тіл як wireframe поверх Three.js сцени. Вимикай перед білдом.

У вашому проєкті сурогат дебагу — `addBoundingBoxHelper()` з червоними Box3 помічниками. Це не те саме (показує Three.js bbox, не cannon body), але краще ніж нічого.

---

### 7. Use Collision Layers

Без шарів — кожен об'єкт перевіряється на зіткнення з кожним. При 100 об'єктах це 100×100/2 = 5000 перевірок. Шари фільтрують зайві пари.

```typescript
// У вашому проєкті вже є:
export enum PhysicsLayer {
    Player  = 1,   // 0001
    Npc     = 2,   // 0010
    Wall    = 4,   // 0100
    Trigger = 8,   // 1000
    Enemy   = 16,  // 10000
}

// col_group  — "я є"
// col_mask   — "з ким я взаємодію" (бітова маска)

// Гравець взаємодіє зі стінами і NPC, але не сам з собою:
new PhysicsBody(container, false, 1,
    PhysicsLayer.Player,
    PhysicsLayer.Wall | PhysicsLayer.Npc
//  ↑ 4 | 2 = 6 = 0110 — тільки ці два шари
);

// NPC не взаємодіють між собою (маска не включає Npc):
new PhysicsBody(container, false, 1,
    PhysicsLayer.Npc,
    PhysicsLayer.Wall | PhysicsLayer.Player
//  NPC ігнорує інших NPC — вони проходять крізь одне одного
);

// Тригер реагує тільки на гравця:
new PhysicsBody(triggerObj, true, 0,
    PhysicsLayer.Trigger,
    PhysicsLayer.Player   // ← тільки гравець активує тригер
);
```

**Бітова логіка:** зіткнення відбувається якщо:
```
(A.group & B.mask) !== 0  AND  (B.group & A.mask) !== 0
```
Тобто обидва мають "дозволити" одне одного.