
import {ServApi} from "../utils/ServApi";
var $$ = (el: any) => typeof el === 'string'
    ? (<any>Array).from(document.querySelectorAll(el))
    : {q: (s: string): HTMLElement => (<any>Array).from(el.querySelectorAll(s))};


/**
 * initializes the admin.html page controls
 */
export let Admin = function(mainControl: HTMLDivElement)
{
    let updateLinksBtn = $$(mainControl).q('#updateLinks')[0],
        O=0;

    updateLinksBtn.onclick = ServApi.get_ichigos_midi_names((songs) => {
        console.log(songs);

        alert('TODO: implement!');
    });
};
