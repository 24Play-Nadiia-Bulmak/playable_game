export interface IState {
    onEnter(): void;
    onUpdate(delta: number): void;
    onExit(): void;
}