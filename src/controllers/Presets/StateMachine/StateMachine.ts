export interface IState {
    onEnter(): void;
    onUpdate(delta: number): void;
    onExit(): void;
}

export class StateMachine {
    private _currentState: IState | null = null;

    get currentState(): IState | null {
        return this._currentState;
    }

    changeState(newState: IState) {
        this._currentState?.onExit();
        this._currentState = newState;
        this._currentState.onEnter();
    }

    update(delta: number) {
        this._currentState?.onUpdate(delta);
    }
}