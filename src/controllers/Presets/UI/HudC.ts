import { Delegate } from "@24tools/playable_template";
import { CameraC } from "../../CameraC";
import { Vector3 } from "three";
import { Inventory, ResourseSystem } from "../ResourseSystem/ResourseSystem";
import { MAX_PLANKS } from "../PayZone/PayZone";

import woodBgUrl  from "../../../resources/images/ResourceBackground_Wood.webp";
import metalBgUrl from "../../../resources/images/ResourceBackground_Metal.webp";

/** Slot descriptors - order defines top-to-bottom render order. */
const SLOTS: ReadonlyArray<{ type: string; bgUrl: string }> = [
    { type: 'wood', bgUrl: woodBgUrl  },
    { type: 'herb', bgUrl: metalBgUrl },
];

const PLANKS_PER_LEVEL = MAX_PLANKS;

/** Lightweight DOM HUD that displays the player's current resource counts. */
export class HudC
{
    private static _counters: Map<string, HTMLElement> = new Map();
    private static _delegate: Delegate<Readonly<Inventory>>;
    private static _hud: HTMLElement | null = null;

    private static _deliveryBarEl:   HTMLElement | null = null;
    private static _deliveryTrackEl: HTMLElement | null = null;
    private static _deliveryFillEl:  HTMLElement | null = null;
    private static _deliveryLvlEl:   HTMLElement | null = null;
    private static _deliveryCountEl: HTMLElement | null = null;
    private static _deliveryTotal:   number = 0;

    /**
     * Creates all HUD elements programmatically, appends them to `#ui`, and
     * starts listening for inventory changes.
     *
     * @param inventory  The player's ResourseSystem whose onChange event drives updates.
     */
    static init(inventory: ResourseSystem): void
    {
        const ui = document.getElementById('ui');
        if (!ui) return;

        ui.insertAdjacentHTML('beforeend', `
            <div id="hud">
                ${SLOTS.map(slot => `
                <div class="hud-item" style="background-image: url(${slot.bgUrl})">
                    <span class="hud-count" data-type="${slot.type}">0</span>
                </div>`).join('')}
            </div>
        `);

        this._hud = ui.querySelector<HTMLElement>('#hud');

        for (const slot of SLOTS)
        {
            const el = ui.querySelector<HTMLElement>(`.hud-count[data-type="${slot.type}"]`);
            if (el) this._counters.set(slot.type, el);
        }

        this._repositionHud();
        window.addEventListener('resize', () => this._repositionHud());

        this._delegate = new Delegate<Readonly<Inventory>>((inv) => this._refresh(inv));
        inventory.onChange.addListener(this._delegate);

        this._refresh(inventory.Inventory);
        this._initDeliveryBar();
    }

    /**
     * Spawns a DOM projectile from the given 3-D world position and flies it to
     * the matching HUD counter, then bumps the counter with a scale pop.
     *
     * @param resourceType  Resource key, e.g. "wood".
     * @param worldPos      3-D world-space origin of the resource that was collected.
     */
    static flyToHud(resourceType: string, worldPos: Vector3): void
    {
        const counterEl = this._counters.get(resourceType);
        if (!counterEl) return;

        const camera = CameraC.camera;
        if (!camera) return;

        const ndc = worldPos.clone().project(camera);
        const startX = (ndc.x * 0.5 + 0.5) * window.innerWidth;
        const startY = (-ndc.y * 0.5 + 0.5) * window.innerHeight;

        const targetRect = counterEl.getBoundingClientRect();
        const endX = targetRect.left + targetRect.width  * 0.5;
        const endY = targetRect.top  + targetRect.height * 0.5;

        const slot = SLOTS.find(s => s.type === resourceType);

        const el = document.createElement('div');
        el.className = 'hud-fly-particle';
        if (slot) el.style.backgroundImage = `url(${slot.bgUrl})`;

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

    private static _repositionHud(): void
    {
        if (!this._hud) return;
        const x = window.innerWidth - this._hud.offsetWidth;
        this._hud.style.left = `${x}px`;
    }

    private static _bumpCounter(el: HTMLElement): void
    {
        el.classList.remove('hud-bump');
        void el.offsetWidth;
        el.classList.add('hud-bump');
    }

    private static _refresh(inv: Readonly<Inventory>): void
    {
        for (const [type, el] of this._counters)
        {
            el.textContent = String(inv[type] ?? 0);
        }
    }

    private static _initDeliveryBar(): void
    {
        const ui = document.getElementById('ui');
        if (!ui) return;

        ui.insertAdjacentHTML('beforeend', `
            <div id="delivery-bar">
                <div id="delivery-bar__header">
                    <span id="delivery-bar__level">Lv. 1</span>
                    <span id="delivery-bar__count">0 / ${PLANKS_PER_LEVEL}</span>
                </div>
                <div id="delivery-bar__track">
                    <div id="delivery-bar__fill"></div>
                </div>
            </div>
        `);

        this._deliveryBarEl   = document.getElementById('delivery-bar');
        this._deliveryTrackEl = document.getElementById('delivery-bar__track');
        this._deliveryFillEl  = document.getElementById('delivery-bar__fill');
        this._deliveryLvlEl   = document.getElementById('delivery-bar__level');
        this._deliveryCountEl = document.getElementById('delivery-bar__count');
    }

    /**
     * Adds `count` delivered planks to the running total and refreshes the
     * delivery-progress bar, advancing the level counter every PLANKS_PER_LEVEL planks.
     *
     * @param count  Number of planks just delivered to the pay zone.
     */
    static addDelivered(count: number): void
    {
        this._deliveryTotal += count;
        const level   = Math.floor(this._deliveryTotal / PLANKS_PER_LEVEL) + 1;
        const inLevel = this._deliveryTotal % PLANKS_PER_LEVEL;
        const percent = (inLevel / PLANKS_PER_LEVEL) * 100;

        if (this._deliveryLvlEl)   this._deliveryLvlEl.textContent   = `Lv. ${level}`;
        if (this._deliveryCountEl) this._deliveryCountEl.textContent  = `${inLevel} / ${PLANKS_PER_LEVEL}`;
        if (this._deliveryFillEl)  this._deliveryFillEl.style.width   = `${percent}%`;
        if (this._deliveryTrackEl) this._deliveryTrackEl.style.height = `${12 + percent * 0.12}px`;

        if (this._deliveryBarEl)
        {
            this._deliveryBarEl.classList.remove('delivery-bump');
            void this._deliveryBarEl.offsetWidth;
            this._deliveryBarEl.classList.add('delivery-bump');
        }
    }

    /**
     * Triggers a scale-bounce animation on the delivery track, called when planks
     * start flying from the pay zone toward the HUD so the bar responds immediately.
     */
    static pulseTrack(): void
    {
        if (!this._deliveryTrackEl) return;
        this._deliveryTrackEl.classList.remove('delivery-track-grow');
        void this._deliveryTrackEl.offsetWidth;
        this._deliveryTrackEl.classList.add('delivery-track-grow');
    }

    /** Returns the bounding rect of the delivery bar element, used by PayZone to compute a 3-D world-space fly target. */
    static getDeliveryBarRect(): DOMRect | null
    {
        return this._deliveryBarEl?.getBoundingClientRect() ?? null;
    }

    /** Returns true if the last `addDelivered` call filled the current level bar to 100%. */
    static isLevelComplete(): boolean
    {
        return this._deliveryTotal > 0 && this._deliveryTotal % PLANKS_PER_LEVEL === 0;
    }
}
