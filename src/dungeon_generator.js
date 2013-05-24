/* global SceneAsset, THREE */
/* jshint unused: false */
define([ 'underscore', 'async', './map', './tile' ], function(_, async, Map, Tile) {
  "use strict";

  var entityIds = [
      '5171f82046fdf86b72000a65', // model
      '5171f82846fdf86b72000a67', // material
      '5171f80846fdf86b72000a60', // diffuse
      '5171f80146fdf86b72000a5c', // normal
      '5171f80246fdf86b72000a5d'  // specular
    ],
    TILESET_PREFIX = 'Claimed',
    TILESET_SCALE = { x: 0.4, y: 0.4, z: 0.4 };

  var DungeonGenerator = window.DungeonGenerator = function(scene, opts) {
    if (!(scene instanceof SceneAsset)) {
      throw new Error('scene must be an instance of SceneAsset');
    }
    this.scene = scene;
    this.opts = opts || {};

    this.opts.mapWidth = this.opts.mapWidth || 20;
    this.opts.mapHeight= this.opts.mapHeight || 20;
  };

  DungeonGenerator.prototype.create = function() {
    var that = this,
        EntityModel = this.scene.veroldEngine.assetRegistry.entityCollection.model;

    async.forEach(entityIds, function(entityId, next) {
      var model = new EntityModel({ id: entityId });

      model.fetch({ success: function() {
        that.scene.veroldEngine.assetRegistry.entityCollection.add(model);

        next();
      } });
    }, function() {
      that.generate();
      that.createMapObject();
    });
  };

  DungeonGenerator.prototype.generate = function() {
    this.map = new Map({
      width: this.opts.mapWidth,
      height: this.opts.mapHeight
    });
  };

  DungeonGenerator.prototype.createMapObject = function() {
    var that = this,
        mapObject = this.mapObject = new THREE.Object3D(),
        tileSet = this.scene.veroldEngine.assetRegistry.getAsset(entityIds[0]);

    tileSet.load({ success_hierarchy: function() {
      that.map.each(function(desc) {
        new Tile(mapObject, 'Claimed', tileSet, desc);
      });

      that.scene.threeData.add(mapObject);
    }});
  };

  return DungeonGenerator;
});
