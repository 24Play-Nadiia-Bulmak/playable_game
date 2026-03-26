import { EasyEvent } from "@24tools/playable_template";
import { initialInventory } from "./initialInventory";

export interface Inventory {
    [key: string]: number;
}

export class ResourseSystem {
    private inventory: Inventory;

    readonly onChange: EasyEvent<Readonly<Inventory>> = new EasyEvent<Readonly<Inventory>>();

    constructor() {
        this.inventory = { ...initialInventory };
    }

    addResource(type: string, amount: number = 1) {
        if (!this.inventory[type]) {
            this.inventory[type] = 0;
        }

        this.inventory[type] += amount;
        this.onChange.Invoke(this.inventory);
    }

    /** Sets all resource counts to zero and fires the onChange event. */
    clearInventory(): void {
        for (const key of Object.keys(this.inventory)) {
            this.inventory[key] = 0;
        }
        this.onChange.Invoke(this.inventory);
    }

    minusResource(type: string, amount: number = 1) {
        if (!this.inventory[type]) {
            this.inventory[type] = 0;
        }
        this.inventory[type] = Math.max(0, this.inventory[type] - amount);
        this.onChange.Invoke(this.inventory);
    }

    get Inventory(): Readonly<Inventory> {
        return this.inventory;
    }
}