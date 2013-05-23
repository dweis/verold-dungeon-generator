/* global SceneAsset */
/* jshint unused: false */
define([ 'underscore', 'dungcarv' ], function(_, dungCarv) {
  var TILESET_ASSET_ID = '5171f82046fdf86b72000a65',
      TILESET_PREFIX = 'Claimed',
      TILESET_SCALE = { x: 0.4, y: 0.4, z: 0.4 };

  var DungeonGenerator = window.DungeonGenerator = function(scene, opts) {
    if (!(scene instanceof SceneAsset)) {
      throw new Error('scene must be an instance of SceneAsset');
    }
    this.opts = opts || {};
  };

  DungeonGenerator.prototype.create = function() {
    var width = 100;
    var height = 50;

    var map = dungCarv({
      mapWidth: width,
      mapHeight: height,
      randomness: 1.0
    });

    // column headers
    window.console.log('+' + _.map(_.range(width), function(column) {
      return column % 10;
    }).join(''));

    // rows
    _.each(_.range(height), function(line) {
      var parts = map.map.splice(0, width);
      window.console.log(line % 10 + _.map(parts, function(part) {
        return part === 0 ? '#' : ' ';
      }).join(''));
    });
  };

  return DungeonGenerator;
});
