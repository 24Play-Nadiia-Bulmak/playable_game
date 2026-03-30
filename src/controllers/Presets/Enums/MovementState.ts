export enum MovementState { 
    Idle, 
    Forward, 

    Loot,

    StrafeRight, 
    StrafeLeft, 
    Back,
    PistolForward,
    PistolShoot, 

    WeaponTakeOut,
    WeaponPutDown,

    Death,
}

export enum NpcMovementState { 
    Idle, 
    Forward 
}