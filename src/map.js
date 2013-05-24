/* jshint unused: false */
define([ 'underscore', 'dungcarv' ], function(_, dungCarv) {
  "use strict";

  var bits = {
    0x01: 'NW',
    0x02: 'N',
    0x04: 'NE',
    0x08: 'E',
    0x10: 'SE',
    0x20: 'S',
    0x40: 'SW',
    0x80: 'W'
  };

  var toDirection = {
    0x01 : { x: -1, y: -1 },
    0x02 : { x:  0, y: -1 },
    0x04 : { x:  1, y: -1 },
    0x08 : { x:  1, y:  0 },
    0x10 : { x:  1, y:  1 },
    0x20 : { x:  0, y:  1 },
    0x40 : { x: -1, y:  1 },
    0x80 : { x: -1, y:  0 }
  };

  var cells = {
    WALL: 0,
    CORRIDOR: 1,
    ROOM: 2,
    DOOR: 3,
    ENTRANCE: 4,
    EXIT: 5
  };

  function Map(params) {
    params = params || {};

    this.walkables = [];

    if (params.map) {
      this.width = params.width;
      this.height = params.height;
      this.map = params.map;
    } else {
      this.width = params.width || 5;
      this.height = params.height || 5;
      var r = dungCarv({
        mapWidth: this.width,
        mapHeight: this.height,
        padding: 1,
        randomness: 10 / 100.0,
        twistness: 20 / 100.0,
        rooms: 25 / 100.0,
        roomSize: [
          { min: 4, max: 10, prob: 1 }
        ],
        roomRound: false,
        loops: 0 / 100.0,
        spaces: 0,
        loopSpaceRepeat: 2,
        eraseRoomDeadEnds: true,
        spacesBeforeLoops: false
      });

      this.map = r.map;
    }

    if (!this.width || !this.height) {
      throw new Error('You must provide both a width and height value');
    }

    for (var i in this.map) {
      if (this.map.hasOwnProperty(i)) {
        if (this.map[i] === cells.ENTRANCE)  {
          this.entrance = i;
        } else if (this.map[i] === cells.EXIT) {
          this.exit = i;
        }

        if (this.map[i] !== cells.WALL) {
          this.walkables.push(i);
        }
      }
    }
  }

  Map.prototype.getBits = function(idx) {
    var x = idx % this.width,
        y = Math.floor(idx / this.height),
        mask = 0;

    _.each(toDirection, function(pos, bit) {
      var tx = x + pos.x,
          ty = y + pos.y,
          idx = ty * this.height + tx;

      if (tx > 0 && tx < this.width - 1 && ty > 0 && ty < this.height - 1) {
        if (this.map[idx] !== cells.WALL) {
          mask = mask | parseInt(bit, 10);
        }
      }
    }, this);

    return mask;
  };

  Map.prototype.getEntrance = function() {
    return this.get(this.entrance);
  };

  Map.prototype.getExit = function() {
    return this.get(this.exit);
  };

  Map.prototype.getRandomWalkable = function() {
    return this.get(this.walkables[Math.floor(Math.random() * this.walkables.length)]);
  };

  Map.prototype.each = function(fn) {
    for (var i = 0; i < this.map.length; i++) {
      fn(this.get(i), parseInt(i, 10));
    }
  };

  Map.prototype.get = function(idx) {
    var tile = this.map[idx],
        position = this._getPosition(idx),
        bits = this.getBits(idx);

    return {
      idx: parseInt(idx, 10),
      position: position,
      tile: tile,
      bits: bits,
      walkable: tile !== cells.WALL
    };
  };

  Map.prototype._getPosition = function(idx) {
    var position = { x: idx % this.width,
               y: Math.floor(idx / this.width) };

    return position;
  };

  return Map;
});
