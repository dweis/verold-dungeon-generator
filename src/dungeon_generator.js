/* global SceneAsset */
define([], function() {
  var DungeonGenerator = window.DungeonGenerator = function(scene, opts) {
    if (!(scene instanceof SceneAsset)) {
      throw new Error('scene must be an instance of BaseAsset');
    }

    this.opts = opts || {};
  };

  DungeonGenerator.prototype.create = function() {
  };

  return DungeonGenerator;
});
