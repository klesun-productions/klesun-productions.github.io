
import {Dom} from "./Dom";
import {S} from "./S";
import {Tls} from "./Tls";
var askedPassword: string = null;
let awaitingPassword: Array<(password: string) => void> = [];

let getPreEnteredPassword = () =>
    S.opt(<string>(<any>window).preEnteredPassword);

// TODO: set it to false when user presses "cancel" to prevent inconsistent state of UX
let askingForPassword = false;

export let askForPassword = () => S.promise(delayedReturn => {
    let pwd = getPreEnteredPassword().def(askedPassword);
    if (pwd) {
        delayedReturn(pwd);
    } else {
        if (askingForPassword === false) {
            askingForPassword = true;
            Dom.showPasswordDialog((pwd) => {
                askingForPassword = false;
                askedPassword = pwd;
                awaitingPassword.splice(0).forEach(c => c(pwd));
            });
        }
        awaitingPassword.push(delayedReturn);
    }
});

export let contribute = (serviceUrl: string, functionName: string, params: {}) => {
    let password = askForPassword();
    let response = S.promise<string>(done => password.then =
        pwd => Tls.http(serviceUrl + '?f=' + functionName, 'POST', {
            params: params,
            verySecurePassword: pwd,
        }).then = r => done(r)
    );
    return response.map(resp => {
        if (resp === null) {
            console.error('server error, see network log of ' + functionName);
            return null;
        }
        return JSON.parse(resp);
    });
};

export let ClientUtil = {
    askForPassword: askForPassword,
    contribute: contribute,
};