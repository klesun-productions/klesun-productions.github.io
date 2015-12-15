
var Ns = Ns || {};

Ns.MokonaGame = function(canvasEl)
{
    /** dict of objects with method live()
     * the method returns true if something happened... my live would always return false =( */
    var elements = [];

    var stage = new createjs.Stage(canvasEl);
    setInterval(_ => elements.reduce((a,b) => a.live() | b.live()) && stage.update(), 40);

    var handlerDict = {};
    document.onkeydown = (e => e.keyCode in handlerDict && handlerDict[e.keyCode]());
    var handleKey = (n,cb) => handlerDict[n] = cb;
    var floor = _ => canvasEl.height;

    var makePersonShape = function(params, isHero)
    {
        params = params || {};
        isHero = isHero || false;

        var shape = new createjs.Shape();

        var r = 20; // head radius
        var torso_length = r * 4;

        shape.graphics
            .beginFill('#f00').drawCircle(0,0,r) // head
            .beginFill(isHero ? '#0ff' : 'black').rect(-r, r, r * 2, torso_length) // torso
            .beginFill('#00f').rect(-r, r + torso_length, r * 2/3, torso_length) // leg 1
            .beginFill('#00f').rect(r * 1/3, r + torso_length, r * 2/3, torso_length); // leg 2

        shape.graphics.beginFill('#ff0').rect(-1, -1, 2, 2);

        // aura
        shape.graphics.endFill().beginStroke('#88f').rect(-r, -r, r * 2, r * 2 + torso_length * 2);

        shape.x = params.x || 50;
        shape.y = params.y || 50;

        stage.addChild(shape);

        return shape;
    };

    var Person = function(params, isHero)
    {
        params = params || {};
        isHero = isHero || false;

        var MAX_VX = 10;
        var DVX = 2;
        var DVY = 15;

        var boostX = 0;
        var boostY = 0;

        /** @debug */
        Person.zhopa = 'huj';

        var vx = 0;
        var vy = -20;

        var shape = makePersonShape(params, isHero);

        var haste = function(dvx,dvy) {
            if (shape.y === floor()) {
                boostX = dvx;
                boostY = dvy;
            }
        };

        var live = function()
        {
            var lived = false;
            //var was = [shape.x, shape.y];

            (vx += DVX * boostX) && (boostX = 0);
            (vy += DVY * boostY) && (boostY = 0);

            if (vx || vy || shape.y < floor()) {
                shape.x += vx;
                shape.y += vy;
                shape.y < floor()
                    ? vy += 1
                    : vx = Ns.lim(Ns.toZero(vx, DVX / 2), MAX_VX);


                if (shape.y >= floor()) {
                    vy = 0;
                    shape.y = floor();
                }

                lived = true;
            }

            //var lived = [shape.x, shape.y].some((e,i) => e != was[i]);
            return lived;
        };

        var self = {
            haste: haste,
            live: live,
        };
        elements.push(self);

        return self;
    };

    var initKeyHandlers = function(hero)
    {
        handleKey(37, _ => hero.haste(-1,0));
        handleKey(38, _ => hero.haste( 0,-1));
        handleKey(39, _ => hero.haste(+1,0));
    };

    var start = function()
    {
        var hero = Person({x: 100, y: floor()}, true);

        /** @debug */
        HERO = hero;

        var villain = Person({x: 200, y: floor()});

        initKeyHandlers(hero);
    };

    return {
        start: start
    };
};