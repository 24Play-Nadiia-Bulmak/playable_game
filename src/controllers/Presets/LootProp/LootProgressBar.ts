import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Object3D, Vector3 } from "three";
import { Delegate, ResourcesC, UpdateController } from "@24tools/playable_template";
import { CameraC } from "../../CameraC";
import { ThreeC } from "../../ThreeC";
import { ResourcesType } from "../Enums/ResourcesType";
import { MeshType } from "../Enums/MeshType";

export class LootProgressBar
{
    private static readonly HEIGHT_OFFSET = 0;
    private static readonly MIDDLE_LERP_SPEED: number = 3;

    private readonly _root: Object3D;
    private _fillMesh: Object3D | null = null;
    private _middleGroundMesh: Object3D | null = null;
    private _fillInitialScaleX: number = 1;
    private _middleGroundInitialScaleX: number = 1;
    private _middleGroundTargetScaleX: number = 1;
    private _isVisible: boolean = false;
    private _percentage: number = 100;

    private readonly _updateDelegate: Delegate<number>;
    private readonly _worldPos = new Vector3();

    constructor(private readonly _getAnchor: () => Object3D | null, private readonly _totalSteps: number)
    {
        const gltf = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.ProgressBar);
        if (!gltf)
        {
            throw new Error("LootProgressBar: 'progress_bar' mesh resource not found.");
        }


        this._root = gltf.scene.clone(true);
        this._root.visible = false;
        ThreeC.addToScene(this._root);

        this._root.traverse((child) =>
        {
            if (this._fillMesh === null && child.name.toLowerCase().includes("ui_foreground"))
            {
                this._fillMesh = child;
                this._fillInitialScaleX = child.scale.x;
            }
            else if (this._middleGroundMesh === null && child.name.toLowerCase().includes("ui_middle"))
                {
                    this._middleGroundMesh = child;
                    this._middleGroundInitialScaleX = child.scale.x;
            }
        });

        this._updateDelegate = UpdateController.Instance.onUpdate.addDelegate((delta) => this._tick(delta));
    }

    get Percentage(): number
    {
        return this._percentage;
    }

    show(): void
    {
        if (this._middleGroundMesh)
        {
            this._middleGroundMesh.scale.x = this._middleGroundTargetScaleX;
        }

        this._root.visible = true;
        this._isVisible = true;
    }

    hide(): void
    {
        this._root.visible = false;
        this._isVisible = false;
    }

    setProgress(percent: number): void
    {
        if (!this._fillMesh) return;

        const clamped = Math.max(0, Math.min(1, percent));
        const targetScaleX = this._fillInitialScaleX * clamped;

        const delta = this._fillInitialScaleX - targetScaleX;
        this._fillMesh.scale.x = targetScaleX;

        this._middleGroundTargetScaleX = targetScaleX;
    }

    destroy(): void
    {
        UpdateController.Instance.onUpdate.removeListeners(this._updateDelegate);
        this._root.removeFromParent();
    }

    private _tick(delta: number): void
    {
        if (!this._isVisible) return;

        if (this._middleGroundMesh)
        {
            const current = this._middleGroundMesh.scale.x;
            const t = Math.min(1, LootProgressBar.MIDDLE_LERP_SPEED * delta);
            this._middleGroundMesh.scale.x = current + (this._middleGroundTargetScaleX - current) * t;
        }

        const anchor = this._getAnchor();
        if (!anchor) return;

        anchor.getWorldPosition(this._worldPos);
        this._root.position.set(
            this._worldPos.x + 0.25,
            this._worldPos.y + LootProgressBar.HEIGHT_OFFSET,
            this._worldPos.z,
        );

        const camera = CameraC.camera;
        if (camera)
        {
            this._root.quaternion.copy(camera.quaternion);
        }
    }
}
