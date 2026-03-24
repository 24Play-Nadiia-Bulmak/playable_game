import * as THREE from "three";

const BAR_WIDTH = 0.9;
const BAR_HEIGHT = 0.08;

export class DamageProgressBar extends THREE.Group {
    private readonly _fill: THREE.Sprite;

    constructor(yOffset: number = 1) {
        super();
        this.position.y = yOffset;
        this.visible = false;

        const bg = new THREE.Sprite(
            new THREE.SpriteMaterial({ color: 0x1a1a1a, depthTest: false }),
        );
        bg.scale.set(BAR_WIDTH, BAR_HEIGHT, 1);
        bg.center.set(0.5, 0.5);
        this.add(bg);

        // Fill is left-anchored: center.x=0 means position is the left edge.
        this._fill = new THREE.Sprite(
            new THREE.SpriteMaterial({ color: 0x26d935, depthTest: false }),
        );
        this._fill.scale.set(BAR_WIDTH, BAR_HEIGHT, 1);
        this._fill.center.set(0, 0.5);
        this._fill.position.x = -BAR_WIDTH / 2;
        this.add(this._fill);
    }

    update(percent: number) {
        const p = Math.max(0, Math.min(1, percent));
        this._fill.scale.x = Math.max(0.001, BAR_WIDTH * p);
    }

    show() { this.visible = true; }

    hide() { this.visible = false; }
}

