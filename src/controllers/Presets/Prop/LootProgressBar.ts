import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Object3D, Vector3 } from "three";
import { Delegate, ResourcesC, UpdateController } from "@24tools/playable_template";
import { CameraC } from "../../CameraC";
import { ThreeC } from "../../ThreeC";
import { ResourcesType } from "../Enums/ResourcesType";
import { MeshType } from "../Enums/MeshType";

/// <summary>
/// 3-D world-space progress bar that hovers above a prop anchor mesh and
/// always faces the camera. Designed to visualise looting/HP progress.
/// Call show()/hide() to toggle visibility and setProgress(percent) to
/// update the fill level.
/// </summary>
export class LootProgressBar
{
    private static readonly HEIGHT_OFFSET = -0.75;
    /** Lerp speed for the middle-ground "delayed" indicator (units/sec). */
    private static readonly MIDDLE_LERP_SPEED: number = 3;

    private readonly _root: Object3D;
    private _fillMesh: Object3D | null = null;
    private _middleGroundMesh: Object3D | null = null;
    private _fillInitialScaleX: number = 1;
    private _middleGroundInitialScaleX: number = 1;
    /** Target scale X that the middle-ground mesh lerps towards each frame. */
    private _middleGroundTargetScaleX: number = 1;
    private _isVisible: boolean = false;
    private _percentage: number = 100;

    private readonly _updateDelegate: Delegate<number>;
    private readonly _worldPos = new Vector3();
    private readonly _camWorldPos = new Vector3();

    /// <summary>
    /// Initializes the progress bar by cloning the shared 'progress_bar' GLTF resource
    /// and adding it to the scene. The bar is hidden by default.
    ///
    /// @param getAnchor   Callback that returns the live anchor Object3D above which
    ///                    the bar should be positioned each frame.
    /// @param totalSteps  Total number of mesh layers the owning Prop has.
    ///                    Used to derive the fill percentage from a step index.
    /// </summary>
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

        // The fill mesh is identified by "fill" in its name (case-insensitive).
        // This mesh is scaled on the X axis to represent the current fill percentage.
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
        // Snap the middle-ground to the current fill target so it never "slides in" from
        // a stale position when the bar becomes visible again after being hidden.
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

    /// <summary>
    /// Updates the visual fill level of the progress bar.
    ///
    /// @param percent  Value in [0, 1] — 1 means full, 0 means empty.
    ///                 Values outside the range are clamped.
    /// </summary>
    setProgress(percent: number): void
    {
        if (!this._fillMesh) return;

        const clamped = Math.max(0, Math.min(1, percent));
        console.log(`[LootProgressBar] setProgress → ${(clamped * 100).toFixed(1)}% (raw=${percent.toFixed(3)})`);
        const targetScaleX = this._fillInitialScaleX * clamped;

        // Compensate X position so the fill always shrinks from the right
        // (left-anchored effect) even when the mesh pivot is at its centre.
        const delta = this._fillInitialScaleX - targetScaleX;
        this._fillMesh.scale.x = targetScaleX;
        // this._fillMesh.position.x = -delta / 2;

        // Middle-ground trails the fill via lerp — just update the target here.
        this._middleGroundTargetScaleX = targetScaleX;
    }

    /// <summary>
    /// Removes the bar from the scene and unregisters the update delegate.
    /// Must be called when the owning Prop is permanently destroyed.
    /// </summary>
    destroy(): void
    {
        UpdateController.Instance.onUpdate.removeListeners(this._updateDelegate);
        this._root.removeFromParent();
    }

    private _tick(delta: number): void
    {
        if (!this._isVisible) return;

        // Lerp the middle-ground mesh scale towards the fill target.
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
            this._worldPos.x,
            this._worldPos.y + LootProgressBar.HEIGHT_OFFSET,
            this._worldPos.z,
        );

        const camera = CameraC.camera;
        if (camera)
        {
            // camera.position is local — getWorldPosition is required to get the actual world position
            // so that lookAt faces the viewport correctly regardless of the camera hierarchy depth.
            camera.getWorldPosition(this._camWorldPos);
            this._root.lookAt(this._camWorldPos);
        }
    }
}
