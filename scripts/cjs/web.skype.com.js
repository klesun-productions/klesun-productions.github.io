var hideAds = function()
{
    var css = document.createElement("style");
    css.type = "text/css";
    css.innerHTML = '' 
        + '.conversationHeader { display: none !important;  }'
        + '.buttonRow button { display: none !important;  }'
        + '.form-holder { max-width: 100% !important;  }'
        + '.messageHistory { max-width: 100% !important;  }'
        + '.messageHistory * { font-family: Ubuntu Mono, Monospace;  }'
        // + '.messageHistory * { font-size: 16px;  }'
        ;
    document.body.appendChild(css);
};

hideAds();
