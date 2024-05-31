import type { GamepadStateEvent } from "./types";

export default function GamepadControl({ gamepads_states_list }: {
    gamepads_states_list: HTMLElement,
}) {
    const GAMEPAD_ID_TO_BUTTONS_STATE: Record<string, Set<number>> = {};

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

    function progressGameLoop(onStateChange: (event: GamepadStateEvent) => void) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; ++i) {
            const gamepad = gamepads[i];
            if (!gamepad) {
                continue;
            }
            if (!(gamepad.id in GAMEPAD_ID_TO_BUTTONS_STATE)) {
                GAMEPAD_ID_TO_BUTTONS_STATE[gamepad.id] = new Set();
            }
            const state = GAMEPAD_ID_TO_BUTTONS_STATE[gamepad.id] ?? new Set();
            const changes = [];
            for (let j = 0; j < gamepad.buttons.length; ++j) {
                const button = gamepad.buttons[j];
                const oldPressed = state.has(j);
                const newPressed = button.pressed || button.touched || button.value > 0;
                if (oldPressed !== newPressed) {
                    updateButtonClass(gamepad.id, j, newPressed);
                    changes.push({
                        buttonIndex: j,
                        newState: newPressed,
                    });
                    if (newPressed) {
                        state.add(j);
                    } else {
                        state.delete(j);
                    }
                }
            }
            if (changes.length > 0) {
                onStateChange({
                    gamepadId: gamepad.id,
                    timestamp: gamepad.timestamp,
                    changes,
                });
            }
        }
    }

    function startGameLoop(onStateChange: (event: GamepadStateEvent) => void) {
        progressGameLoop(onStateChange);
        setInterval(() => progressGameLoop(onStateChange));
    }

    return { startGameLoop };
};