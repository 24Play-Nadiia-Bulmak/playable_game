export interface IState {
    onEnter(): void;
    onUpdate(delta: number): void;
    onExit(): void;
}

export class StateMachine {
    private _currentState: IState | null = null;
    private _transitionTable: Map<IState, IState[]> | null = null;

    get currentState(): IState | null {
        return this._currentState;
    }

    setTransitionTable(table: Map<IState, IState[]>): void {
        this._transitionTable = table;
    }

    canTransitionTo(newState: IState): boolean {
        if (!this._transitionTable || !this._currentState) return true;
        const allowed = this._transitionTable.get(this._currentState);
        return allowed ? allowed.includes(newState) : true;
    }

    changeState(newState: IState): void {
        if (this._currentState === newState) return;
        if (!this.canTransitionTo(newState)) return;
        this._currentState?.onExit();
        this._currentState = newState;
        this._currentState.onEnter();
    }

    update(delta: number): void {
        this._currentState?.onUpdate(delta);
    }
}