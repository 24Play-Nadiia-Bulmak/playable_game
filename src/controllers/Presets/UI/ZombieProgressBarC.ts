import { Delegate, UpdateController } from "@24tools/playable_template";

const CYCLE_DURATION = 5;
const RESET_PAUSE_MS = 800;

export class ZombieProgressBarC
{
    private static _trackEl:   HTMLElement | null = null;
    private static _elapsed:   number = 0;
    private static _resetting: boolean = false;
    private static _delegate:  Delegate<number> | null = null;

    static init(): void
    {
        this._trackEl = document.getElementById('zombie-progress__track');

        this._setPercent(100);

        this._delegate = UpdateController.Instance.onUpdate.addDelegate((delta) => this._tick(delta));
    }

    private static _tick(delta: number): void
    {
        if (this._resetting) return;

        this._elapsed += delta;

        const t = Math.min(this._elapsed / CYCLE_DURATION, 1);
        this._setPercent((1 - t) * 100);

        if (t >= 1)
        {
            this._onCycleComplete();
        }
    }

    private static _onCycleComplete(): void
    {
        this._resetting = true;
        this._triggerBump();

        setTimeout(() =>
        {
            this._trackEl?.classList.add('zombie-progress--resetting');
            this._setPercent(100);

            requestAnimationFrame(() => requestAnimationFrame(() =>
            {
                this._trackEl?.classList.remove('zombie-progress--resetting');
                this._elapsed = 0;
                this._resetting = false;
            }));
        }, RESET_PAUSE_MS);
    }

    private static _setPercent(percent: number): void
    {
        this._trackEl?.style.setProperty('--zombie-fill-pct', `${percent}%`);
    }

    private static _triggerBump(): void
    {
        if (!this._trackEl) return;
        this._trackEl.classList.remove('zombie-progress-bump');
        void this._trackEl.offsetWidth; // force reflow to restart animation
        this._trackEl.classList.add('zombie-progress-bump');
    }
}
