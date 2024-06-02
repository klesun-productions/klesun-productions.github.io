import { loadModule } from "https://klesun.github.io/ts-browser/src/ts-browser.js";

const BACKEND_URL = "https://api.klesun.net";
const DATA_DIR_URL = BACKEND_URL + "/entry/ddr-songs-browser/data";

// const whenPacks = fetch(DATA_DIR_URL + "/indexed_packs.json.gz")
// const whenPacks = fetch("https://drive.google.com/uc?export=download&id=10uuDp3NRtRiywShjmo1cPv_169SSLMhH")
const whenPacks = fetch("https://klesun-misc.github.io/ddr-songs-index/indexed_packs.json")
    .then(rs => rs.json());

const whenFirstGamepadConnected = new Promise(resolve => {
    /** @param {GamepadEvent} e */
    window.addEventListener("gamepadconnected", function onFirstGamepadConnected (e) {
        window.removeEventListener("gamepadconnected", onFirstGamepadConnected);
        resolve(e);
    });
});

document.getElementById("song_search_by_name").focus();

// language=file-reference
loadModule("./modules/App.ts")
    .then(module => {
        const init = () => module.default({
            DATA_DIR_URL,
            whenPacks,
            whenFirstGamepadConnected,
        });
        if (document.readyState !== "complete") {
            window.addEventListener("load", init);
        } else {
            init();
        }
    });

window.addEventListener("error", (event) => {
    alert(String(event.message));
    console.info("Uncaught Error reached global listener", event);
    console.error(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
    alert(String(event.reason));
    console.info("Unhandled Promise Rejection", event);
    console.error(event.reason);
});