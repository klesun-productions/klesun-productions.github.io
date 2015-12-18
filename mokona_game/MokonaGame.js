
var Ns = Ns || {};

Ns.MokonaGame = function(canvasEl)
{
    /** dict of objects with method live()
     * the method returns true if something happened... my live would always return false =( */
    var elements = [];

    var stage = new createjs.Stage(canvasEl);
    setInterval(_ => elements.reduce((a,b) => a.live() | b.live()) && stage.update(), 40);

    var handlerDict = {};
    document.onkeydown = function(e) { 
		e.keyCode in handlerDict && handlerDict[e.keyCode]();
	};
    var handleKey = (n,cb) => (handlerDict[n] = cb);
    var floor = _ => canvasEl.height - 20;
	
	/** @param {Ns.IElement} element */
	var addElement = function(element)
	{
		elements.push(element);
		stage.addChild(element.getShape());

        return element;
	};

    var initKeyHandlers = function(hero)
    {
        handleKey(37, _ => hero.haste(-1,0));
        handleKey(38, _ => hero.haste( 0,-1));
        handleKey(39, _ => hero.haste(+1,0));
    };

    var start = function()
    {
		createjs.Ticker.setFPS(24);
		createjs.Ticker.addEventListener('tick', _ => stage.update());
		
		stage.addChild(Ns.Background());
        var hero = addElement(Ns.Person({x: 100, y: floor(), floor: floor}, true));
        var villain = addElement(Ns.Person({x: 200, y: floor(), floor: floor}));

        initKeyHandlers(hero);
    };

    return {
        start: start
    };
};