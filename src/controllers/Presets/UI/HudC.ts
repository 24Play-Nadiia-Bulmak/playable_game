import { Delegate } from "@24tools/playable_template";
import { CameraC } from "../../CameraC";
import { Vector3 } from "three";
import { Inventory, ResourseSystem } from "../ResourseSystem/ResourseSystem";

const ICON_BY_TYPE: Record<string, string> = {
    wood:  'url(../assets/wood-board.png)',
    stone: '⛏',
    herb:  'url(../assets/herb.png)',
};

/** Lightweight DOM HUD that displays the player's current resource counts. */
export class HudC
{
    private static _woodEl:  HTMLElement | null = null;
    private static _stoneEl: HTMLElement | null = null;
    private static _herbEl:  HTMLElement | null = null;

    private static _delegate: Delegate<Readonly<Inventory>>;

    /**
     * Binds HUD elements to the given inventory instance and starts listening for changes.
     *
     * @param inventory  The player's `ResourseSystem` whose `onChange` event drives updates.
     */
    static init(inventory: ResourseSystem): void
    {
        this._woodEl  = document.getElementById('hud-wood');
        this._stoneEl = document.getElementById('hud-stone');
        this._herbEl  = document.getElementById('hud-herb');

        // onChange only updates numbers; fly animation is triggered separately.
        this._delegate = new Delegate<Readonly<Inventory>>((inv) => this._refresh(inv));
        inventory.onChange.addListener(this._delegate);

        this._refresh(inventory.Inventory);
    }

    /**
     * Spawns a DOM projectile from the given 3-D world position and flies it to
     * the matching HUD counter, then bumps the counter with a scale pop.
     *
     * @param resourceType  Resource key, e.g. `"wood"`.
     * @param worldPos      3-D world-space origin of the resource that was collected.
     */
    static flyToHud(resourceType: string, worldPos: Vector3): void
    {
        const counterEl = this._counterEl(resourceType);
        if (!counterEl) return;

        const camera = CameraC.camera;
        if (!camera) return;

        // Project world → NDC → screen pixels
        const ndc = worldPos.clone().project(camera);
        const startX = (ndc.x * 0.5 + 0.5) * window.innerWidth;
        const startY = (-ndc.y * 0.5 + 0.5) * window.innerHeight;

        const targetRect = counterEl.getBoundingClientRect();
        const endX = targetRect.left + targetRect.width  * 0.5;
        const endY = targetRect.top  + targetRect.height * 0.5;

        const el = document.createElement('div');
        el.className = 'hud-fly-particle';

        const icon = ICON_BY_TYPE[resourceType];
        if (icon?.startsWith('url(')) {
            el.style.backgroundImage = icon;
        } else {
            el.textContent = icon ?? '●';
        }

        el.style.left = `${startX}px`;
        el.style.top  = `${startY}px`;
        el.style.setProperty('--dx', `${endX - startX}px`);
        el.style.setProperty('--dy', `${endY - startY}px`);

        document.body.appendChild(el);

        el.addEventListener('animationend', () =>
        {
            el.remove();
            this._bumpCounter(counterEl);
        }, { once: true });
    }

    private static _counterEl(type: string): HTMLElement | null
    {
        if (type === 'wood')  return this._woodEl;
        if (type === 'stone') return this._stoneEl;
        if (type === 'herb')  return this._herbEl;
        return null;
    }

    private static _bumpCounter(el: HTMLElement): void
    {
        el.classList.remove('hud-bump');
        // Force reflow so re-adding the class re-triggers the animation
        void el.offsetWidth;
        el.classList.add('hud-bump');
    }

    private static _refresh(inv: Readonly<Inventory>): void
    {
        if (this._woodEl)  this._woodEl.textContent  = String(inv['wood']  ?? 0);
        if (this._stoneEl) this._stoneEl.textContent = String(inv['stone'] ?? 0);
        if (this._herbEl)  this._herbEl.textContent  = String(inv['herb']  ?? 0);
    }
}

