import { Delegate, ResourcesC, UpdateController } from "@24tools/playable_template";
import { Character } from "./Character/Character";
import { ResourcesType } from "./Enums/ResourcesType";
import { MeshType } from "./Enums/MeshType";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { BaseAnimation } from "./Enums/BaseAnimation";
import { PhysicsBody, PhysicsLayer } from "../PhysicsC";
import { Object3D } from "three";
import { ThreeC } from "../ThreeC";
import { PlayerInput } from "./Input/PlayerInput";
import { MoveC } from "./Movment/MoveC";
import { Vec3 } from "cannon-es";
import { contain } from "three/src/extras/TextureUtils";
import { Vector3CToT, Vector3TToC } from "./Helper";
import { RotationC } from "./Movment/RotationC";
import { FollowCameraC } from "./Movment/CameraMovment/FollowCamera";
import * as THREE from 'three';

export class Player {
    private static inited: boolean = false;
    private static isRunning: boolean = false;

    private static updateDelegate: Delegate<number>;

    private static container: Object3D = new Object3D;
    private static input: PlayerInput;
    private static movement: MoveC;
    private static rotation: RotationC;

    static character: Character;
    static physics: PhysicsBody;

    static Init() {
        if (this.inited) return;
        this.inited = true
        const asset = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.Character)
        this.character = new Character(asset);

        this.character.playAnimation(BaseAnimation.Idle)
        this.container.add(this.character.tObj); // контейнер для візуального представлення гравця, який буде рухатися по фізиці, а не сама модель, щоб не було проблем з колізією та анімацією
        ThreeC.addToScene(this.container);

        this.InitPhisic();
        const input = new PlayerInput();
        // const speed = 1;
        this.movement = new MoveC(input/*, speed*/);
        this.rotation = new RotationC(this.container, input/*, speed*/);

        this.updateDelegate = new Delegate<number>((delta) => this.Update(delta)); // прив'язуємо оновлення гравця до загального оновлення гри
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate); // додаємо наш метод оновлення до контролера оновлення, щоб він викликався кожного кадру

        FollowCameraC.Init(this.container); // ініціалізуємо камеру, щоб вона слідувала за гравцем
    }

    private static InitPhisic() {
        this.physics = new PhysicsBody(
            this.container,
            false,
            1,
            PhysicsLayer.Player,
            PhysicsLayer.Wall,
        );
        (this.physics.getPhysicsBody() as any).userData = { name: "player" }; // додаємо userData для можливості ідентифікувати це тіло при колізії
    }

    private static StartRunning() {
        if (this.isRunning) return;
        this.character.playAnimation(BaseAnimation.Run);
        this.isRunning = true;
    }

    private static StopRunning() {
        if (!this.isRunning) return;
        this.character.playAnimation(BaseAnimation.Idle);
        this.AnimationValue = 1;
        this.isRunning = false;
    }

    private static checkCollision() {
    }

    private static set AnimationValue(value: number) {
        this.character.AnimationSpeed = value;
        this.character.AnimationWeight = value * 12.5 + 87.5;
    }

    private static Update(delta: number) {
        const diraction = this.movement.Diraction;
        const weight = this.movement.Weight;
        const characterBox = new THREE.Box3().setFromObject(this.character.tObj);


        if (diraction.length() > 0) {
            this.StartRunning();
            this.AnimationValue = weight;
        }
        else this.StopRunning();

        const cPos = Vector3TToC(diraction); // конвертуємо вектор руху з формату three.js в формат cannon-es
        this.physics.getPhysicsBody().velocity.copy(cPos); // встановлюємо швидкість фізичного тіла гравця відповідно до напрямку руху, який ми отримали від компонента руху
        this.MoveVisual(delta); 
    }

    private static MoveVisual(delta: number) {
        const lerpSpeed = 10;
        const targetPos = (Vector3CToT(this.physics.getPhysicsBody().position));

        this.container.position.lerp(targetPos, delta * lerpSpeed)
    }
}

