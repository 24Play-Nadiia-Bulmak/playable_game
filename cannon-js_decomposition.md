Explore game codebase structure

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/PhysicsC.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Player.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Npc.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Character/Character.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/TestSceneC.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Movment/MoveC.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/resources/resources.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/package.json)

Read [](file:///d%3A/MyGamePlayable/playable_game/PROJECT.md#1-1), lines 1 to 300

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Input/NpcInput.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Movment/RotationC.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Enums/BaseAnimation.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Enums/NpcAnimation.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Enums/MovementState.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/controllers/Presets/Enums/MeshType.ts)

Read [](file:///d%3A/MyGamePlayable/playable_game/src/resources/meshes/meshes.ts)

Created 1 todo

Ось повна декомпозиція задачі з контекстом вашого проєкту (Three.js + cannon-es, `PhysicsBody`, `PhysicsLayer`):

---

## Task 1 — Add Colliders to the Map Objects

**Що робити:**
У `TestSceneC.createMap()` зараз додаються колайдери тільки для об'єктів з іменем `Wooden_Box_mesh*`. Потрібно розширити логіку: пройтись по всіх дочірніх об'єктах `scene.glb` і додати `PhysicsBody` для всіх статичних перешкод — стіни, підлога, платформи, огорожі тощо. Використовувати `mass=0` та `PhysicsLayer.Wall`.

**Підказки:**
- Фільтруй об'єкти за іменем або за кастомним `userData.isCollidable = true`, виставленим у блендері/редакторі.
- Для складної геометрії (арки, нерівний терен) використовуй `Trimesh` або `Heightfield` з cannon-es замість `Box`, але враховуй, що `Trimesh` не підтримує динамічні тіла.
- Групи зіткнень уже є: `PhysicsLayer.Wall` має маску `Player | Npc` — перевір, що нові тіла використовують ті самі.
- Можна відокремити LOD: замість точної геометрії моделі — окремий спрощений меш-колайдер, прихований у сцені за конвенцією імені, наприклад `_col`.

**Можливі помилки:**
- `Box3` рахується з урахуванням поточного `quaternion` — `PhysicsBody` вже обнуляє обертання "тимчасово" при розрахунку bbox, але якщо об'єкт має вкладені трансформації (батько теж обернений) — розміри будуть хибні.
- Якщо меш містить `SkinnedMesh` частини — `Box3.setFromObject` може дати некоректний приймак.
- Надто велика кількість окремих `Box` тіл (100+) суттєво просадить cannon-es. Для статичних частин можна злити геометрію або замінити одним великим `Box` там, де деталізація не потрібна.

---

## Task 2 — Add Colliders to Player and Other Characters

**Що робити:**
Гравець і NPC вже мають `PhysicsBody` зі сферою (`player_sphere=0.3`). Задача — переконатись у правильності форми, розміру та поведінки: `Player` — кінематичний або динамічний з блокованою ротацією, `Npc` — кінематичний. Налаштувати `linearDamping`, `angularFactor`, щоб персонажі не "падали" і не крутились від зіткнень.

**Підказки:**
- Гравець зараз пише `velocity` напряму в cannon body (`Vector3TToC`). Щоб персонаж не пролітав крізь стіни при великій швидкості — ввімкни `body.sleepSpeedLimit = 0` і перевір, що фізика крокує з достатньою роздільністю.
- Для персонажа типова форма — **capsule** (циліндр + дві сфери). Cannon-es не має `Capsule` — імітуй двома `Sphere` та одним `Cylinder` через `CompoundBody`, або просто використовуй трохи витягнуту сферу для спрощення.
- Заблокуй обертання тіл персонажів: `body.angularFactor.set(0, 0, 0)` — інакше при зіткненні зі стіною персонаж "завалиться".
- Для NPC (`KINEMATIC`) — позиції вручну синхронізуються через `PhysicsObjPair`. Переконайся, що `body.type = Body.KINEMATIC` не ламає коллізійне виявлення (кінематичні тіла у cannon-es виявляють зіткнення тільки якщо другий об'єкт динамічний).

**Можливі помилки:**
- `CharacterController` кінематичного типу не реагує на сили — якщо очікуєш відштовхування від стін, потрібно або перейти на динамічне тіло з сильним `linearDamping`, або вручну реалізовувати sliding по нормалі зіткнення.
- Якщо сфера колайдера сильно відрізняється від візуального меша персонажа, гравець буде "ширяти" над землею або "провалюватись" в підлогу — налаштуй `player_sphere` і зміщення `Vec3` offset.
- При `mass=0` (або кінематичний тип) NPC не реагують на зіткнення з динамічними об'єктами сцени фізично.

---

## Task 3 — Add Invisible Triggers for Resource Gathering

**Що робити:**
Створити клас `TriggerZone` (або `ResourceTrigger`) — невидимий `PhysicsBody` у заданій позиції з `trigger=true`, `PhysicsLayer.Trigger`. Тригери позначати у сцені як `Object3D` без рендерингу (або hardcode позиції). Кожен тригер знає, який ресурс він представляє.

**Підказки:**
- `PhysicsBody` вже приймає `trigger: boolean` у конструкторі. Переконайся, що в cannon-es `isTrigger` коректно реалізовано: у cannon-es тригери — це `Body` тип `STATIC` з `collisionResponse = false`, а зіткнення виявляються через `addEventListener('collide', ...)` або ручну перевірку через `world.broadphase`.
- Маска колізій: `PhysicsLayer.Trigger` з маскою `Player` — тоді тригер реагує тільки на гравця.
- Додавати `THREE.BoxHelper` або `THREE.SphereGeometry` з `wireframe=true` для дебагу в режимі розробки.
- Зручно зберігати тригери у `Map<string, TriggerZone>` з ключем типу ресурсу.

**Можливі помилки:**
- У cannon-es `collisionResponse = false` **не зупиняє** нотифікацію події — переконайся, що collide event все одно спрацьовує.
- Якщо тригер і гравець мають `KINEMATIC` тип одночасно — cannon-es **не генерує** подію `collide` між двома кінематичними тілами. Один з них має бути `DYNAMIC` або використовуй ручну перевірку відстані.
- При видаленні ресурсу (уже зібраний) — обов'язково видаляй `PhysicsBody` через `.destroy()`, інакше тригер залишиться активним.

---

## Task 4 — Implement Start and Stop Trigger Events

**Що робити:**
Реалізувати систему подій тригерів: `onTriggerEnter` та `onTriggerExit`. Cannon-es не має вбудованого `onExit` — потрібно вручну зберігати стан "хто зараз у тригері" і порівнювати кожен кадр.

**Підказки:**
- Патерн: у `PhysicsC` або окремому `TriggerSystem` — зберігай `Set<Body>` "активних зіткнень". На `world.addEventListener('beginContact', ...)` і `'endContact', ...` — додавай/видаляй з сету, стріляй відповідні EasyEvent.
- Альтернатива без cannon events (якщо кінематичні тіла): у `Update` перебирати всі тригери і рахувати `distance(player.position, trigger.position) < triggerRadius` — простіше і надійніше для невеликої кількості тригерів.
- Використовуй `Delegate` / `EasyEvent` (вже є у проєкті в `Character.ts`) для `onEnter(resourceType)` та `onExit(resourceType)`.
- Додай `cooldown` після `onEnter`, щоб збір не спрацьовував щокадру.

**Можливі помилки:**
- `beginContact`/`endContact` у cannon-es спрацьовують **після** кроку фізики — якщо гравець рухається дуже швидко і "пролітає" через тригер за один кадр, жодна подія не спрацює (tunnel effect). Для тригерів збирання це не критично, але варто знати.
- Якщо використовуєш `world.contacts` напряму — не забувай, що він очищається на початку кожного кроку.
- `onExit` не спрацює, якщо тригер видалено раніше, ніж гравець вийде — добав fallback cleanup при `destroy()`.

---

## Task 5 — Add Props Breaking Logic

**Що робити:**
Для руйнівних об'єктів (наприклад, `Wooden_Box_mesh`) — зберігати `HP`, при зіткненні/атаці зменшувати HP, при 0 — видаляти меш і `PhysicsBody`, спавнити "зламаний" варіант або партиклі.

**Підказки:**
- Зберігай `HP` у `userData` меша або в окремому `Map<string, PropState>`.
- Клас `BreakableProp` — конструктор приймає `Object3D` + `HP`, підписується на collision event: `body.addEventListener('collide', (e) => {...})`. Перевіряй `e.contact.getImpactVelocityAlongNormal()` — реагуй тільки на сильні удари.
- "Зламана" версія — окремий заздалегідь завантажений GLTF з окремими шматками з `mass > 0`, або той самий меш з анімацією руйнування.
- Або простіше: `playAnimation("break")` + через 1с `destroy()`.

**Можливі помилки:**
- Cannon-es collide event між статичними (`mass=0`) тілами **не генерується**. Для того щоб дерев'яна скринька "реагувала" на гравця — вона має бути `mass > 0` (або мати `KINEMATIC` тип і окрему логіку атаки).
- При видаленні `PhysicsBody` у тому ж кадрі, де сталось зіткнення — може кинути помилку. Використовуй `setTimeout(0)` або `queueMicrotask` для відкладеного знищення.
- Не забудь видалити об'єкт з `ThreeC.scene` (`scene.remove(mesh)`) — інакше невидимий меш залишиться у сцені і впливатиме на рейкасти.

---

## Task 6 — Player Attack Animation

**Що робити:**
Додати кнопку/жест атаки до `PlayerInput`. При натисканні — перевіряти `MovementState` і грати відповідну атакуючу анімацію з `BaseAnimation` (або нову). Після завершення — повертатись до поточного стану (Idle/Run).

**Підказки:**
- `Character.ts` вже має `onAnimFinish` event — підпишись на нього щоб знати, коли one-shot анімація завершилась і можна відновити рух.
- Встанови `IsAttacking = true` на час анімації, заборонивши `UpdateMovementState` перезаписувати анімацію.
- Для мобільного контролю (nipplejs) — додай окрему кнопку атаки в `ui.css` / `PlayerInput`, або реалізуй double-tap на joystick.
- Рекомендована схема: `PlayerInput.onAttack` → `Player.Attack()` → `character.playAnimation(BaseAnimation.Attack, true)` → `onAnimFinish` → відновлення.

**Можливі помилки:**
- crossFade між Run → Attack → Run може виглядати різко, якщо `fade` занадто малий або анімації несумісні (різні кількості кісток).
- Якщо NPC чи об'єкти щось перевіряють через `Player.movementState` — встанови окремий `IsAttacking` щоб не зламати логіку руху.
- `LoopOnce` анімація у `AnimationMixer` після завершення "зависає" на останньому кадрі — обов'язково вмикай `clampWhenFinished = false` або скидай action після `onAnimFinish`.

---

## Task 7 — Resource Spawn Logic

**Що робити:**
Створити `ResourceSpawner` — менеджер, який спавнить ресурси (меш + тригер) у визначених або випадкових позиціях. Ресурс — це пара: `Object3D` (візуальний меш) + `TriggerZone` (з Task 3). Після збору — ресурс зникає, через `respawnTime` з'являється знову.

**Підказки:**
- Визначай позиції спавну у масиві `spawnPoints: Vector3[]` у `TestSceneC` або окремому конфігу.
- Для ресурсів можна використовувати вже завантажені GLTF або прості `THREE.Mesh` з геометрії (сфера, куб) — це не потребує завантаження нових ресурсів.
- Додай просте hovering анімацію (`mesh.position.y += Math.sin(time) * 0.1`) та обертання в `Update` для візуальної привабливості.
- Зберігай стан у `enum ResourceState { Available, Collected }`.

**Можливі помилки:**
- Якщо `spawnPoints` накладаються на колайдери карти — гравець може не дійти або ресурс буде "у стіні". Перевіряй позиції вручну у дебаг-режимі.
- При respawn — не створюй новий `PhysicsBody` кожного разу без видалення старого, інакше тіла накопичуватимуться у `physicsWorld`.
- Якщо ресурсів багато і вони всі мають `Update` delегат — це може впливати на продуктивність. Використовуй один центральний `ResourceSpawner.Update` замість окремого делегату на кожен ресурс.

---

## Task 8 — Implement Resource Gather Logic

**Що робити:**
Підключити `TriggerZone.onEnter` (Task 4) до системи інвентарю або лічильника. При вході гравця у тригер ресурсу — видалити ресурс, додати до `PlayerInventory`, показати UI-фідбек.

**Підказки:**
- Простий інвентар: `static PlayerInventory = { wood: 0, stone: 0 }` у конфігу або окремому класі.
- Ланцюг: `TriggerZone.onEnter` → `ResourceSpawner.onResourceCollected(type)` → `PlayerInventory.add(type)` → `UIController.updateCounter(type)`.
- UI лічильник з `configUIParams/` вже є у проєкті — використай наявну систему для відображення.
- Для естетики: додай коротку анімацію "підбирання" (`BaseAnimation.Loot = 6`) з `Player.IsAttacking`-подібним блокуванням руху на 0.5-1с.

**Можливі помилки:**
- Якщо гравець стоїть у тригері кілька кадрів — `onEnter` спращює один раз, але якщо реалізовано через перевірку відстані (альтернатива з Task 4) — збір спрацює кожен кадр. Обов'язково встановлюй `ResourceState.Collected` **до** виклику callback, щоб запобігти повторному збору.
- При видаленні тригера під час активного зіткнення (`onExit` не прийшов) — наступні збори можуть не спрацювати через "забруднений" стан у `TriggerSystem`.
- Синхронізація між `ResourceSpawner` (respawn таймер) і `TriggerZone` (видалення тіла) — видаляй тригер **після** підтвердження збору, і заново стоворюй при respawn.

---

**Рекомендована послідовність виконання:** 1 → 2 → 3 → 4 → 7 → 8 → 5 → 6 (колізії карти і персонажів спочатку, потім тригерна система, потім геймплейна логіка). 

Completed: *Decompose all 8 subtasks* (1/1)