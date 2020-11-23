const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

function play() {
    document.querySelector('#infoModal').style.display = 'none';
    Game.init();
}

const Game = {
    renderer: null,
    stage: null,
    loader: null,
    map: {},
    engine: null,
    player: null,
    pedro: null,
    ananas: null,

    init: function () {
        this.renderer = PIXI.autoDetectRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, {
            view: document.querySelector('#glCanvas'),
            transparent: true,
        });

        this.stage = new PIXI.Container();
        this.stage.width = CANVAS_WIDTH;
        this.stage.height = CANVAS_HEIGHT;

        this.loader = PIXI.loader;

        this.loader
            .add('Floor', 'images/Floor.png')
            .add('FloorBush', 'images/FloorBush.png')
            .add('FloorCrate', 'images/FloorCrate.png')
            .add('FloorRocky', 'images/FloorRocky.png')
            .add('Pedro', 'images/Pedro.png')
            .add('Player', 'images/Player.png')
            .load(this._postInit.bind(this));
    },

    _postInit: function () {
        this._generateMap();

        const scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        scheduler.add(this.pedro, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
    },

    _generateMap: function () {
        const digger = new ROT.Map.Digger();
        const freeCells = [];

        const diggerCallback = function (x, y, value) {
            if (value) { return; }

            const key = x + ',' + y;
            this.map[key] = '.';
            freeCells.push(key);
        }

        digger.create(diggerCallback.bind(this));

        this._generateBoxes(freeCells);
        this._drawWholeMap();

        this.player = this._createBeing(Player, freeCells);
        this.pedro = this._createBeing(Pedro, freeCells);
    },

    _createBeing: function (what, freeCells) {
        const index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        const key = freeCells.splice(index, 1)[0];
        const parts = key.split(',');
        const x = parseInt(parts[0]);
        const y = parseInt(parts[1]);
        return new what(x, y);
    },

    _generateBoxes: function (freeCells) {
        for (let i = 0; i < 10; i++) {
            const index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            const key = freeCells.splice(index, 1)[0];
            this.map[key] = "*";
            if (!i) { this.ananas = key; }
        }
    },

    _drawWholeMap: function () {
        for (let key in this.map) {
            const parts = key.split(',');
            const x = parseInt(parts[0]);
            const y = parseInt(parts[1]);

            let texture;
            switch (this.map[key]) {
                case '*':
                    texture = 'FloorCrate';
                    break;
                default:
                    const rand = Math.random();
                    if (rand > 0.95) {
                        texture = 'FloorBush';
                    } else if (rand > 0.9) {
                        texture = 'FloorRocky';
                    } else {
                        texture = 'Floor';
                    }
            }

            const tile = new PIXI.Sprite.fromImage(texture);
            tile.x = x * 16;
            tile.y = y * 16;

            this.stage.addChild(tile);
        }

        this.renderer.render(this.stage);
    }
};

const Player = function (x, y) {
    this._x = x;
    this._y = y;

    this._sprite = new PIXI.Sprite.fromImage('Player');
    Game.stage.addChild(this._sprite);

    this._draw();
}

Player.prototype.getSpeed = function () { return 100; }
Player.prototype.getX = function () { return this._x; }
Player.prototype.getY = function () { return this._y; }

Player.prototype.act = function () {
    Game.engine.lock();
    window.addEventListener('keydown', this);
}

Player.prototype.handleEvent = function (e) {
    const code = e.keyCode;
    if (code == 13 || code == 32) {
        this._checkBox();
        return;
    }

    const keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;

    if (!(code in keyMap)) { return; }

    const dir = ROT.DIRS[8][keyMap[code]];
    const newX = this._x + dir[0];
    const newY = this._y + dir[1];
    const newKey = newX + ',' + newY;
    if (!(newKey in Game.map)) { return; }

    this._x = newX;
    this._y = newY;
    this._draw();

    window.removeEventListener('keydown', this);
    Game.engine.unlock();
}

Player.prototype._draw = function () {
    this._sprite.position.x = this._x * 16;
    this._sprite.position.y = this._y * 16;

    Game.renderer.render(Game.stage);
}

Player.prototype._checkBox = function () {
    const key = this._x + ',' + this._y;
    if (Game.map[key] != '*') {
        return;
    } else if (key == Game.ananas) {
        alert('Hooray! You found the bananas and won the game!');
        Game.engine.lock();
        window.removeEventListener('keydown', this);
    } else {
        alert('No bananas here!');
    }
}

const Pedro = function (x, y) {
    this._x = x;
    this._y = y;

    this._sprite = new PIXI.Sprite.fromImage('Pedro');
    Game.stage.addChild(this._sprite);

    this._draw();
}

Pedro.prototype.getSpeed = function () { return 100; }

Pedro.prototype.act = function () {
    let x = Game.player.getX();
    let y = Game.player.getY();

    const passableCallback = function (x, y) {
        return (x + ',' + y in Game.map);
    }
    const astar = new ROT.Path.AStar(x, y, passableCallback, { topology: 4 });

    const path = [];
    const pathCallback = function (x, y) {
        path.push([x, y]);
    }
    astar.compute(this._x, this._y, pathCallback);

    path.shift();
    if (path.length == 1) {
        Game.engine.lock();
        alert('Game over - you were captured by Pedro!');
    } else {
        x = path[0][0];
        y = path[0][1];
        this._x = x;
        this._y = y;
        this._draw();
    }
}

Pedro.prototype._draw = function () {
    this._sprite.position.x = this._x * 16;
    this._sprite.position.y = this._y * 16;

    Game.renderer.render(Game.stage);
}

// Game.init();