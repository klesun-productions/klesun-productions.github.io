
var Ns = Ns || {};

Ns.Background = function()
{
	var bg = new createjs.Container();
		
	var bgcolor = new createjs.Shape();
	bgcolor.graphics.beginFill('#90efff').rect(0,0,1920,1080).endFill();

	var makeSun = function()
	{
		var sun = new createjs.Shape();

		var x0, y0, r = 30;
		x0 = y0 = 70;

		var rayCount = 36;
		for (var i = 0; i < rayCount; ++i)
		{
			var angle = (i / rayCount) * 2 * Math.PI;
			var x = Math.sin(angle) * r;
			var y = Math.cos(angle) * r;

			sun.graphics.moveTo(0,0).beginStroke('#ff0').drawCircle(x, y, r);
			sun.x = x0; sun.y = y0;
		}

		createjs.Ticker.addEventListener('tick', _ => ++sun.rotation);

		return sun;
	};

	bg.addChild(bgcolor);
	bg.addChild(makeSun());
	
	return bg;
};