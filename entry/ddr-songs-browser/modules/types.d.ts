
export type GamepadStateEvent = {
    gamepadId: string,
    timestamp: DOMHighResTimeStamp,
    changes: {
        buttonIndex: 1 | 2 | 3 | 4 | number,
        newState: boolean,
    }[],
};