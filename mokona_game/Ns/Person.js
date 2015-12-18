
var Ns = Ns || {};

Ns.Person = function(params, isHero)
{
	var floor = params.floor;
	isHero = isHero || false;

	var MAX_VX = 10;
	var DVX = 2;
	var DVY = 30;
	var G = 4;

	var boostX = 0;
	var boostY = 0;

	var vx = 0;
	var vy = -20;
	
	var makePersonShape = function(params, isHero)
    {
        params = params || {};
        isHero = isHero || false;

        var shape = new createjs.Shape();

        var r = 10; // head radius
        var t = r * 4; // torso length

        shape.graphics
            .beginFill('#f00').drawCircle(0, -t * 2 - r, r) // head
            .beginFill(isHero ? '#f80' : 'black').rect(-r, -t * 2, r * 2, t) // torso
            .beginFill('#00f').rect(-r, -t, r * 2/3, t) // leg 1
            .beginFill('#00f').rect(r * 1/3, -t, r * 2/3, t); // leg 2

        shape.graphics.beginFill('#ff0').rect(-1, -1, 2, 2);

        // aura
        shape.graphics.endFill().beginStroke('#88f').rect(-r, - 2 * t - 2 * r, r * 2, r * 2 + t * 2);

        shape.x = params.x || 50;
        shape.y = params.y || 50;
		
		/** @debug */
//		var sprite = new createjs.Container();
//		var head2 = new createjs.Shape();
//		head2.graphics.beginFill('green').drawCircle(0, 0, 50);
//		sprite.addChild(head2);
//		sprite.x = 50;
//		sprite.y = 50;
//		stage.addChild(sprite);

        return shape;
    };

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

		vx += DVX * boostX; boostX = 0;
		vy += DVY * boostY; boostY = 0;

		if (vx || vy || shape.y < floor()) {
			shape.x += vx;
			shape.y += vy;
			shape.y < floor()
				? vy += G
				: vx = Ns.lim(Ns.toZero(vx, DVX / 2), MAX_VX);


			if (shape.y >= floor()) {
				vy = 0;
				shape.y = floor();
			}
			if (shape.x < 0) {
				vx = 0;
				shape.x = 0;
			}

			lived = true;
		}

		//var lived = [shape.x, shape.y].some((e,i) => e != was[i]);
		return lived;
	};

	return $.extend({}, Ns.IElement, {
		haste: haste,
		live: live,
		getShape: _ => shape,
	});
};