import { Delegate } from "@24tools/playable_template";
import { CameraC } from "../../CameraC";
import { Vector3 } from "three";
import { Inventory, ResourseSystem } from "../ResourseSystem/ResourseSystem";
import { MAX_PLANKS } from "../PayZone/PayZone";

const SLOTS: ReadonlyArray<{ type: string }> = [
    { type: 'wood' },
    { type: 'herb' },
];

const PLANKS_PER_LEVEL = MAX_PLANKS;

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

    static init(inventory: ResourseSystem): void
    {
        const ui = document.getElementById('ui');
        if (!ui) return;

        this._hud = ui.querySelector<HTMLElement>('#hud');

        for (const slot of SLOTS)
        {
            const el = ui.querySelector<HTMLElement>(`.hud-count[data-type="${slot.type}"]`);
            if (el) this._counters.set(slot.type, el);
        }

        this._delegate = new Delegate<Readonly<Inventory>>((inv) => this._refresh(inv));
        inventory.onChange.addListener(this._delegate);

        this._refresh(inventory.Inventory);
        this._initDeliveryBar();
    }

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

        const el = document.createElement('div');
        el.className = `hud-fly-particle hud-fly-particle--${resourceType}`;

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
        this._deliveryBarEl   = document.getElementById('delivery-bar');
        this._deliveryTrackEl = document.getElementById('delivery-bar__track');
        this._deliveryFillEl  = document.getElementById('delivery-bar__fill');
        this._deliveryLvlEl   = document.getElementById('delivery-bar__level');
        this._deliveryCountEl = document.getElementById('delivery-bar__count');
    }

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

    static pulseTrack(): void
    {
        if (!this._deliveryTrackEl) return;
        this._deliveryTrackEl.classList.remove('delivery-track-grow');
        void this._deliveryTrackEl.offsetWidth;
        this._deliveryTrackEl.classList.add('delivery-track-grow');
    }

    static getDeliveryBarRect(): DOMRect | null
    {
        return this._deliveryBarEl?.getBoundingClientRect() ?? null;
    }

    static isLevelComplete(): boolean
    {
        return this._deliveryTotal > 0 && this._deliveryTotal % PLANKS_PER_LEVEL === 0;
    }
}
