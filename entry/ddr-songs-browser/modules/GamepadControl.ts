
export default function GamepadControl({ gamepads_states_list }: {
    gamepads_states_list: HTMLElement,
}) {
    const GAMEPAD_ID_TO_BUTTONS_STATE: Record<string, boolean[]> = {};

    function updateButtonClass(gamepadId: string, buttonIndex: number, state: boolean) {
        let existing = null;
        for (const gamepadDiv of gamepads_states_list.children) {
            if (gamepadDiv.getAttribute("data-id") === gamepadId) {
                existing = gamepadDiv;
                break;
            }
        }
        if (existing === null) {
            existing = document.createElement("div");
            gamepads_states_list.appendChild(existing);
            existing.setAttribute("data-id", gamepadId);
            for (let i = 0; i < 4; ++i) {
                existing.appendChild(document.createElement("div"));
            }
            existing.children[0].textContent = "🡸";
            existing.children[1].textContent = "🡺";
            existing.children[2].textContent = "🡹";
            existing.children[3].textContent = "🡻";
        }
        if (buttonIndex < existing.children.length) {
            existing.children[buttonIndex].classList.toggle("pressed", state);
        }
    }

    function progressGameLoop() {
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad) {
                continue;
            }
            const oldState = GAMEPAD_ID_TO_BUTTONS_STATE[gamepad.id] ?? [false, false, false, false];
            const newState = gamepad.buttons.map(b => b.pressed);
            for (let i = 0; i < newState.length; ++i) {
                const oldPressed = oldState[i] ?? false;
                const newPressed = newState[i];
                if (oldPressed !== newPressed) {
                    updateButtonClass(gamepad.id, i, newPressed);
                }
            }
            GAMEPAD_ID_TO_BUTTONS_STATE[gamepad.id] = gamepad.buttons.map(b => b.pressed);
        }
    }

    return { progressGameLoop };
};