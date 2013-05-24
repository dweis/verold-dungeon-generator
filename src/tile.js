/* jshint unused:false */
/* global MeshObject, THREE */
define([ 'underscore' ], function(_) {
  "use strict";

  function toBitMaskString(bitMask) {
    var toBits = { NW : 0x01, N  : 0x02, NE : 0x04, E  : 0x08, SE : 0x10, S  : 0x20, SW : 0x40, W  : 0x80 };

    var b = [];
    _.each(toBits, function(bit, s) {
      if (bitMask & bit) {
        b.push(s);
      }
    });
    return b.join('|');
  }

  var NONE = 0,
      NW   = 0x01,
      N    = 0x02,
      NE   = 0x04,
      E    = 0x08,
      SE   = 0x10,
      S    = 0x20,
      SW   = 0x40,
      W    = 0x80,
      ALL  = NW|N|NE|E|SE|S|SW|W;

  function getNameFromTileAndBits(set, tile, bits) {
    // Is this cell walkable? if yes, always return a floor tile
    if (tile !== 0) {
      return set + '0';
    }

    // If no directions are walkable return a top tile
    if (bits === NONE) {
      return set + '100';
    }

    // All directions surrounding this wall are walkable, so this is a column / post
    if (bits === ALL) {
      return set + '104';
    }

    switch (bits & ALL) {
    case NE|E|SE:
    case NE|E:
    case E|SE:
    case E:
      return set + '101E';

    case SE|S|SW:
    case SE|S:
    case S|SW:
    case S:
      return set + '101S';

    case NE|N|NW:
    case NE|N:
    case N|NW:
    case N:
      return set + '101N';

    case NW|W|SW:
    case NW|W:
    case W|SW:
    case W:
      return set + '101W';

    case NW|N|NE|SE|S|SW:
    case NW|N|NE|SE|S|SW:
    case NW|N|NE|SE|S:
    case NW|N|NE|S|SW:
    case NW|N|SE|S|SW:
    case N|NE|SE|S|SW:
    case N|NE|SE|S:
    case N|NE|SW|S:
    case N|NW|SE|S:
    case N|NW|SW|S:
    case N|NW|NE|S:
    case N|SE|S|SW:
    case N|NE|S:
    case N|NW|S:
    case N|SW|S:
    case N|SE|S:
    case N|S:
      return set + '102NS';

    case NW|NE|E|SE|SW|W:
    case NE|E|SE|SW|W:
    case NW|NE|E|SE|W:
    case NW|E|SE|SW|W:
    case NW|NE|E|SW|W:
    case NW|NE|E|W:
    case NE|E|SE|W:
    case NW|E|SW|W:
    case NE|E|SW|W:
    case NW|E|SE|W:
    case E|SE|SW|W:
    case E|SW|W:
    case E|SE|W:
    case NE|E|W:
    case NW|E|W:
    case E|W:
      return set + '102WE';

    case NE|E|SE|S|SW:
    case E|SE|S|SW:
    case NE|E|SE|S:
    case NW|E|SE|S:
    case E|SE|S:
      return set + '102SE';

    case NW|SE|S|SW|W:
    case NW|S|SW|W:
    case SE|S|SW|W:
    case S|SW|W:
      return set + '102SW';

    case NW|N|NE|E|SE:
    case NW|N|NE|E:
    case N|NE|E:
      return set + '102NE';

    case NW|N|NE|SW|W:
    case NW|N|SW|W:
    case NW|N|NE|W:
    case NW|N|W:
      return set + '102NW';

    case NW|N|NE|E|SE|SW|W:
    case NW|N|NE|E|SE|W:
    case NW|N|NE|E|SW|W:
    case NW|N|NE|E|W:
      return set + '103N';

    case NW|NE|E|SE|S|SW|W:
    case NE|E|SE|S|SW|W:
    case NW|E|SE|S|SW|W:
    case E|SE|S|SW|W:
      return set + '103S';

    case NW|N|NE|E|SE|S|SW:
    case NW|N|NE|E|SE|S:
    case N|NE|E|SE|S|SW:
    case N|NE|E|SE|S:
      return set + '103E';

    case NE|N|NW|W|SW|S|SE:
    case NW|N|SE|S|SW|W:
    case NW|N|NE|S|SW|W:
    case NW|N|S|SW|W:
      return set + '103W';

    case NW|NE|SE|SW:
      return set + 'Co100';

    case NW:
      return set + 'Co100NW';

    case NE:
      return set + 'Co100NE';

    case SE:
      return set + 'Co100SE';

    case SW:
      return set + 'Co100SW';

    case NE|SE:
      return set + 'Co100NE-SE';

    case NW|SW:
      return set + 'Co100NW-SW';

    case NW|NE:
      return set + 'Co100NW-NE';

    case SE|SW:
      return set + 'Co100SW-SE';

    case NW|SE:
      return set + 'Co100NW-SE';

    case NE|SW:
      return set + 'Co100NE-SW';

    case NW|NE:
      return set + 'Co100NW-NE';

    case NW|NE|SE:
      return set + 'Co100NW-NE-SE';

    case NW|NE|SW:
      return set + 'Co100NW-NE-SW';

    case NW|NE|SE|SW|W:
      return set + 'Co101W';

    case NW|N|NE|SE|SW:
    case NW|N|SE|SW:
      return set + 'Co101N';

    case NW|NE|SE|S|SW:
    case NW|NE|S|SW|W:
      return set + 'Co101S';

    case NW|NE|E|SE|SW:
      return set + 'Co101E';

    case NW|N|NE|SE:
    case N|NE|SE:
    case N|NW|SE:
    case N|SE:
      return set + 'Co101N-SE';

    case NW|NE|E|SE:
    case NW|E|SE:
    case NW|NE|E:
    case E|NW:
      return set + 'Co101E-NW';

    case NW|N|NE|SW:
    case NW|N|SW:
    case N|NE|SW:
    case N|SW:
      return set + 'Co101N-SW';

    case NE|SE|S|SW:
    case NE|SE|S:
    case NE|S|SW:
    case S|NE:
      return set + 'Co101S-NE';

    case NW|SE|S|SW:
    case NW|S|SW:
    case NW|SE|S:
    case NW|S:
      return set + 'Co101S-NW';

    case NW|SE|SW|W:
    case SE|SW|W:
    case NW|SE|W:
    case W|SE:
      return set + 'Co101W-SE';

    case NE|E|SE|SW:
    case NE|E|SW:
    case E|SE|SW:
    case E|SW:
      return set + 'Co101E-SW';

    case NW|NE|SW|W:
    case NW|NE|W:
    case NE|SW|W:
      return set + 'Co101W-NE';

    case NW|N|NE|SE|SW|W:
    case NW|N|NE|SE|W:
    case NW|N|SE|SW|W:
    case NW|N|SE|W:
      return set + 'Co102NW';

    case NW|N|NE|E|SE|SW:
    case NW|N|NE|SW|E:
    case N|NE|E|SE|SW:
    case N|NE|E|SE:
      return set + 'Co102NE';

    case NW|NE|SE|S|SW|W:
    case SW|S|SE|NE|W:
    case NW|NE|E|SE|S:
      return set + 'Co102SW';

    case NW|NE|E|SE|S|SW:
    case SW|S|SE|NW|E:
      return set + 'Co102SE';
    }
  }

  function Tile(root, prefix, tileSet, desc) {
    var that = this,
        found = false;

    tileSet.traverse(function(obj) {
      var name, o;

      if (obj instanceof MeshObject) {
        name = obj.entityModel.get('name');

        if (name === getNameFromTileAndBits(prefix, desc.tile, desc.bits)) {
          found = true;

          o = obj.threeData.clone();

          o.scale = new THREE.Vector3(0.4, 0.4, 0.4);
          o.position = new THREE.Vector3(desc.position.x, 0, desc.position.y);

          root.add(o);
        }
      }
    });
    if (!found) {
      window.console.error('Missing tile for bits: ', toBitMaskString(desc.bits));
    }
  }

  return Tile;

});
