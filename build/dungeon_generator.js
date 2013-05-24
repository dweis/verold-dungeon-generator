(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.VAPI.CannonApp = factory();
  }
}(this, function () {

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("vendor/almond", function(){});

//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD define happens at the end for compatibility with AMD loaders
  // that don't enforce next-turn semantics on modules.
  if (typeof define === 'function' && define.amd) {
    define('underscore',[], function() {
      return _;
    });
  }

}).call(this);

/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.setImmediate = setImmediate;
            async.nextTick = setImmediate;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = setImmediate;
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define('async',[], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

/* 
  ===========================================================================

  dungCarv

  ===========================================================================

  Copyright 2009 Łukasz Jasiński
 
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
 
  http://www.apache.org/licenses/LICENSE-2.0
 
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  ===========================================================================

  For minified version check dungCarv.min.js file.

  ===========================================================================
*/ 
/*
 * Modified by Derrick Weis <derrick@derrickweis.com>
 */
define('dungcarv',[], function() {
  // Extending array prototype by function which returns random array cell,
  // removing it from array.

  Array.prototype.rnd = function() {
    if (this.length == 0) return null;
    var r = Math.floor(Math.random() * this.length);
    return this.splice(r, 1).pop();
  }

  // Extending Math namespace by function which returns random value
  // within [A, B] range (including A and B).

  Math.rnd = function(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  /* MAIN FUNCTION */
  function dungCarv(options) {
    // Set default values for some options (if they are undefined).
    if (!options.padding) options.padding = 1;
    if (!options.randomness) options.randomness = 0.0;
    if (!options.twistness) options.twistness = 0.0;
    if (!options.loops) options.loops = 0.0;
    if (!options.spaces) options.spaces = 0;
    if (!options.loopSpaceRepeat) options.loopSpaceRepeat = 1;
    if (!options.roomSize) options.roomSize = [];
    // Set probability of placing rooms to 0 if there are no room sizes specified.
    if (!options.rooms || options.roomSize.length == 0) options.rooms = 0.0;

    // Some options have to be set.
    if (!options.mapWidth || !options.mapHeight) {
      return {
        success: false
      };
    }

    /* Main object - dungeon carver */
    
    // To prevent name collisions object is created with object initializer
    // inside anonymous namespace.

    return ({
      /* Constants */
      
      // It is impossible to use const keyword, because it doesn't work in IE.
      // The solution is to use normal variables and pretend they are constants.

      MAP_WIDTH:       options.mapWidth,
      MAP_HEIGHT:      options.mapHeight,

      TILE_WALL:       0,
      TILE_CORRIDOR:   1,
      TILE_ROOM:       2,
      TILE_DOOR:       3,
      TILE_ENTRANCE:   4,
      TILE_EXIT:       5,
      TILE_ROOM_TMP:   9998,
      TILE_WALL_TMP:   9999,

      BOUND_TOP:       options.padding,
      BOUND_RIGHT:     options.mapWidth - options.padding - 1,
      BOUND_BOTTOM:    options.mapHeight - options.padding - 1,
      BOUND_LEFT:      options.padding,

      DIR_NONE:        0,
      DIR_UP:          1,
      DIR_RIGHT:       2,
      DIR_DOWN:        3,
      DIR_LEFT:        4,

      /* Variables */

      map:             [],
      queue:           [],
      success:         false,
      started:         false,
      finished:        false,
      dir:             this.DIR_NONE,
      elem:            null,

      /* Functions */

      // create() function is called after creating object.
      // It calls other functions in order to generate and return
      // dungeon map.

      create: function() {
        // First step: fill whole map with walls.
        this.fill(this.TILE_WALL);
        // Second step: generate basic maze with rooms.
        this.generate();
        // Third step: make some loops and erase some dead-ends in
        // order to make more space between rooms and corridors.
        if (options.loopSpaceRepeat > 0 && options.spacesBeforeLoops && options.spaces > 0)
          this.makeSpaces();
        for (var i = 0; i < options.loopSpaceRepeat; i++) {
          if (options.loops > 0.0)
            this.makeLoops();
          if (options.spaces > 0)
            this.makeSpaces();
        }
        // Fourth step: erase single-tile dead-ends growing from rooms.
        if (options.eraseRoomDeadEnds)
          this.eraseRoomDeadEnds();

        // Return generated map.
        return this.returnValue();
      },

      // generate() contains main loop of maze generating routine

      generate: function() {
        while (!this.finished) {
          this.step();
        }
      },

      // step() executes single step in main loop of maze generation
      // routine. It is easier to maintain this procedure when it is
      // stored in other function, called from main loop.

      step: function() {
        // First step. If dungCarv() function was called without
        // data describing entrance coordinates, these coordinates
        // will be chosen randomly.
        if (!this.started) {
          var x;
          var y;
          if (!options.entrance || !options.entrance.x || !options.entrance.y) {
            x = Math.rnd(this.BOUND_LEFT, this.BOUND_RIGHT);
            y = Math.rnd(this.BOUND_TOP, this.BOUND_BOTTOM);
          } else {
            x = options.entrance.x;
            y = options.entrance.y;
          }

          this.started = true;
          this.queue.push({x:x,y:y});

          this.set(x, y, this.TILE_ENTRANCE);
          return;
        }

        // Option "randomness" in action - if there is selected element and queue
        // isn't empty, it is possible that another element will be chosen.
        if (this.elem && this.queue.length > 0 && Math.random() < options.randomness) {
          var x = this.elem.x;
          var y = this.elem.y;
          this.elem = this.queue.rnd();
          this.queue.push({x:x,y:y});
        }

        // If there is no selected element, we have to select one.
        // If there are no elements to select left, we finished carving maze.
        if (!this.elem) {
          if (this.queue.length == 0) {
            this.finished = true;
            return;
          } else {
            this.elem = this.queue.rnd();
          }
        }

        // Check for avaible ways to carve. If there are no ways, drop
        // selected element - it is useless now.
        var dirs = this.avaibleDir(this.elem.x, this.elem.y);
        if (dirs.length == 0) {
          this.elem = null;
          return;
        }

        // Option "twistness" in action - if carver can't carve in current
        // directory anymore OR obtained random value is lower than "twistness",
        // there is a need to change carving direction.
        if (dirs.indexOf(this.dir) == -1 || Math.random() < options.twistness)
          this.dir = dirs.rnd();

        // Just move in valid direction.
        switch (this.dir) {
        case this.DIR_UP:
          this.elem.y--;
          break;
        case this.DIR_RIGHT:
          this.elem.x++;
          break;
        case this.DIR_DOWN:
          this.elem.y++;
          break;
        case this.DIR_LEFT:
          this.elem.x--;
          break;
        }

        // Check if there should be room placed now.
        if (Math.random() < options.rooms) {
          // Check if it is possible to place room.
          if (this.placeRoom(this.elem.x, this.elem.y, this.dir)) {
            this.queue.push({x:this.elem.x,y:this.elem.y});
            this.elem = null;
            return;
          }
        }

        // There is a new corridor in this place, store it in map array.
        this.set(this.elem.x, this.elem.y, this.TILE_CORRIDOR);

        // Insert new element in queue - carver will back to it later.
        this.queue.push({x:this.elem.x,y:this.elem.y});
      },

      // This function places room in given place (if possible)
      placeRoom: function(ex, ey, dir) {
        // Randomly choose room size.
        var s = Math.random();
        var t = 0.0;
        var n = -1;
        var rs;

        for (var i = 0; i < options.roomSize.length; i++) {
          rs = options.roomSize[i];
          t += rs.prob;
          if (t > s) {
            n = i;
            break;
          }
        }

        // n == -1 may happen when total probability of choosing room sizes 
        // doesn't sum up to 1.0 (when options.roomSize array is invalid). 
        // For example:
        // 
        //   options.roomSize = [
        //     { min: 3, max: 5, prob: 0.3 },
        //     { min: 6, max: 10, prob: 0.3 },
        //     { min: 11, max: 15, prob: 0.3 }
        //   ]
        //
        // Probability to choose each of these sizes is 3/10. Variable 's'
        // determines which size will be chosen:
        //
        // - when 0.0 <= s < 0.3, first size will be chosen
        // - when 0.3 <= s < 0.6, second size will be chosen
        // - when 0.6 <= s < 0.9, third size will be chosen
        //
        // Variable 's' has value in range [0.0, 1.0). In this case,
        // if value of variable 's' is higher or equal than 0.9,
        // no room will be chosen and value of variable 'n' will be -1.
        //
        // Probablity in options.roomSize array ALWAYS must sum up to 1.0!
        if (n == -1) return false;

        // Randomly choose width and height of room (in range determined
        // by selected room size).
        rs = options.roomSize[n];
        var w = Math.rnd(rs.min, rs.max);
        var h = Math.rnd(rs.min, rs.max);

        // Find all possible places to carve room with given parameters
        // (width, height, entrance coordinates ex and ey, direction dir).
        var placements = [];
        var bounds = {};
        
        switch (dir) {
        case this.DIR_UP:
          bounds = { t: ey - h, r: ex, b: ey - h, l: ex - w + 1 };
          break;
        case this.DIR_RIGHT:
          bounds = { t: ey - h + 1, r: ex + 1, b: ey, l: ex + 1 };
          break;
        case this.DIR_DOWN:
          bounds = { t: ey + 1, r: ex, b: ey + 1, l: ex - w + 1 };
          break;
        case this.DIR_LEFT:
          bounds = { t: ey - h + 1, r: ex - w + 1, b: ey, l: ex - w + 1 };
          break;
        }

        for (var sx = bounds.l; sx <= bounds.r; sx++) {
          for (var sy = bounds.t; sy <= bounds.b; sy++) {
            var is_ok = true;
            for (var x = sx - 1; x <= sx + w; x++) {
              for (var y = sy - 1; y <= sy + h; y++) {
                if (!this.testTile(x, y, [this.TILE_WALL])) {
                  is_ok = false;
                  break;
                }
                if (!is_ok) break;
              }
            }
            if (is_ok) {
              placements.push({x:sx,y:sy});
            }
          }
        }

        // placements array is empty if there is no place for room
        // with given parameters.
        if (placements.length == 0) return false;

        // Place corridor at entrance.
        this.set(ex, ey, this.TILE_CORRIDOR);

        // Choose one of places randomly.
        var placement = placements.rnd();

        // Fill area with temporary room tiles.
        for (var x = placement.x; x < placement.x + w; x++) {
          for (var y = placement.y; y < placement.y + h; y++) {
            this.set(x, y, this.TILE_ROOM_TMP);
          }
        }

        // Carve room in this place.
        for (var x = placement.x; x < placement.x + w; x++) {
          for (var y = placement.y; y < placement.y + h; y++) {
            // Check if we should round corner of this room.
            if (!options.roomRound || !this.roundCorner(x, y, placement.x, placement.y, w, h)) {
              // All tiles placed on edge of room should be added to
              // queue, so new corridors and rooms will be able to
              // grow from them.
              if (x == placement.x || x == placement.x + w - 1
              ||  y == placement.y || y == placement.y + h - 1) {
                this.queue.push({x:x,y:y});
              }
              this.set(x, y, this.TILE_ROOM);
            } else {
              this.set(x, y, this.TILE_WALL);
            }
          }
        }

        // Room is ready :)
        return true;
      },

      // This function is used when room is being placed and checks if
      // specific tile should be removed from room in order to make
      // room with rounded (cave-like) corners.
      roundCorner: function(x, y, sx, sy, w, h) {
        return false;
        // TODO
      },

      // Make loops in dungeon.
      // Function finds dead-ends (corridor tiles with only one adjacent
      // corridor or room tile), marks some of them and runs generate
      // routine again. Marked tiles are treat as walls, so it is possible
      // that generator will connect corridors or rooms with them.
      // After generating maze, function will replace marked tiles with
      // corridors again. 
      makeLoops: function() {
        var deadend = [];
        // marked array will contain list of all corridor tiles.
        // All these tiles will be added to maze-generator queue.
        var marked = [];
        // Mark all tiles.
        for (var x = this.BOUND_LEFT; x <= this.BOUND_RIGHT; x++) {
          for (var y = this.BOUND_TOP; y <= this.BOUND_BOTTOM; y++) {
            marked[this.xy(x,y)] = true;
          }
        }

        for (var x = this.BOUND_LEFT; x <= this.BOUND_RIGHT; x++) {
          for (var y = this.BOUND_TOP; y <= this.BOUND_BOTTOM; y++) {
            var pos = this.xy(x, y);
            // Test if tile is wall.
            if (this.testTile(x, y, [this.TILE_WALL])) {
              marked[pos] = false;
            } else {
              // Remove tile only when:
              // - rolled value lower than probability;
              // - tile has only one adjacent corridor or room tile.
              var adj = this.adjacent(x, y);
              if (adj.length == 1 && Math.random() < options.loops) {
                var t = adj.pop();
                // Unmark this tile and adjacent tile.
                marked[pos] = false;
                marked[this.xy(t.x, t.y)] = false;

                // This tile will be replaced with wall (removed).
                deadend.push({x:x,y:y});

                var s = this.map[this.xy(t.x, t.y)];
                this.set(t.x, t.y, this.TILE_WALL);
                // Unmark tiles adjacent diagonally.
                var d = this.diagonal(x, y);
                for (var i = 0; i < d.length; i++) {
                  marked[this.xy(d[i].x, d[i].y)] = false;
                }
                this.set(t.x, t.y, s);
              }
            }
          }
        }

        // Return if there were no dead-ends removed.
        if (deadend.length == 0) return;

        // Push all marked tiles into queue.
        for (var x = this.BOUND_LEFT; x <= this.BOUND_RIGHT; x++) {
          for (var y = this.BOUND_TOP; y <= this.BOUND_BOTTOM; y++) {
            if (marked[this.xy(x, y)])
              this.queue.push({x:x,y:y});
          }
        }

        // Remove dead-ends.
        for (var i = 0; i < deadend.length; i++) {
          this.set(deadend[i].x, deadend[i].y, this.TILE_WALL_TMP);
        }

        // Run generate routine again.
        this.finished = false;
        this.generate();

        // Restore removed dead-ends.
        for (var i = 0; i < deadend.length; i++) {
          this.set(deadend[i].x, deadend[i].y, this.TILE_CORRIDOR);
        }
      },

      // This function removes all dead-ends in order to make more space.
      // Routine is repeated few times (based on options.spaces argument).
      makeSpaces: function() {
        for (var i = 0; i < options.spaces; i++) {
          var deadend = [];
          for (var x = this.BOUND_LEFT; x <= this.BOUND_RIGHT; x++) {
            for (var y = this.BOUND_TOP; y <= this.BOUND_BOTTOM; y++) {
              // Check only corridors.
              if (!this.testTile(x, y, [this.TILE_CORRIDOR])) continue;
              // Get adjacent corridor of room tiles.
              var adj = this.adjacent(x, y);
              // Check if tile has only one adjacent corridor or room tile.
              if (adj.length != 1) continue;
              deadend.push({x:x,y:y});
            }
          }
          for (var j = 0; j < deadend.length; j++) {
            this.set(deadend[j].x, deadend[j].y, this.TILE_WALL);
          }
        }
      },

      // This function removes all dead-ends connected directly with rooms.
      eraseRoomDeadEnds: function() {
        for (var x = this.BOUND_LEFT; x <= this.BOUND_RIGHT; x++) {
          for (var y = this.BOUND_TOP; y <= this.BOUND_BOTTOM; y++) {
            // Check only corridors.
            if (!this.testTile(x, y, [this.TILE_CORRIDOR])) continue;
            // Get adjacent corridor of room tiles.
            var adj = this.adjacent(x, y);
            // Check if tile has only one adjacent corridor or room tile.
            if (adj.length != 1) continue;
            // Check if adjacent tile is room.
            if (this.testTile(adj[0].x, adj[0].y, [this.TILE_ROOM]));
            // Remove tile.
            this.set(x, y, this.TILE_WALL);
          }
        }
      },

      // Simple functions used to manage map array easier.
      set: function(x, y, tile) {
        this.map[this.xy(x, y)] = tile;
      },

      xy: function(x, y) {
        return x + y * options.mapWidth;
      },

      // avaibleDir() checks every direction to determine all directions avaible 
      // for carving (for given point x,y).
      avaibleDir: function(x, y) {
        var d = [];
        if (this.canCarve(x, y - 1)) d.push(this.DIR_UP);
        if (this.canCarve(x + 1, y)) d.push(this.DIR_RIGHT);
        if (this.canCarve(x, y + 1)) d.push(this.DIR_DOWN);
        if (this.canCarve(x - 1, y)) d.push(this.DIR_LEFT);
        return d;
      },

      // canCarve() returns true when target tile and all tiles around
      // target tile are occupied by wall. Examples (^ shows position of carver
      // before digging next corridor):
      //
      // ### 1. Valid. Carver can carve here.
      // ### 
      // .^. 
      // 
      // ... 2. Invalid. Carving will create loop.
      // ### 
      // .^. 
      // 
      // ### 3. Invalid. There is no wall on target tile.
      // #.# 
      // .^. 
      // 
      // ##. 4. Invalid. Carver refuse to create corridor tiles
      // ###    connected diagonally (due to aesthetical reasons).
      // .^. 
      // 
      canCarve: function(x, y, dir) {
        if (!this.testTile(x, y, [this.TILE_WALL])) return false;
        var a = this.adjacent(x, y);
        var d = this.diagonal(x, y);
        if (a.length != 1) return false;
        if (d.length != 0) return false;
        return true;
      },

      // This function finds all corridor or room tiles connected to given
      // tile and returns array containing coordinates of these tiles.
      adjacent: function(x, y) {
        var res = [];
        var test = [this.TILE_ROOM, this.TILE_CORRIDOR, this.TILE_ENTRANCE];
        if (this.testTile(x, y - 1, test)) res.push({x:x,y:y-1});
        if (this.testTile(x + 1, y, test)) res.push({x:x+1,y:y});
        if (this.testTile(x, y + 1, test)) res.push({x:x,y:y+1});
        if (this.testTile(x - 1, y, test)) res.push({x:x-1,y:y});
        return res;
      },

      // This function finds all corridor or room tiles adjacent diagonally to
      // given tile and returns array containing coordinates of these tiles.
      diagonal: function(x, y) {
        var res = [];
        var test = [this.TILE_WALL, this.TILE_WALL_TMP];
        if (!this.testTile(x-1, y-1, test) && this.testTile(x-1, y, test) && this.testTile(x, y-1, test)) res.push({x:x-1,y:y-1});
        if (!this.testTile(x+1, y-1, test) && this.testTile(x+1, y, test) && this.testTile(x, y-1, test)) res.push({x:x+1,y:y-1});
        if (!this.testTile(x+1, y+1, test) && this.testTile(x+1, y, test) && this.testTile(x, y+1, test)) res.push({x:x+1,y:y+1});
        if (!this.testTile(x-1, y+1, test) && this.testTile(x-1, y, test) && this.testTile(x, y+1, test)) res.push({x:x-1,y:y+1});
        return res;
      },

      // testTile() is simple function which checks content of tile.
      // It return false:
      // - when tile is outside defined bounds
      // - when tile content is different than every tile in array
      //   passed as argument to testTile()

      testTile: function(x, y, tiles) {
        if (x < this.BOUND_LEFT || x > this.BOUND_RIGHT) return false;
        if (y < this.BOUND_TOP || y > this.BOUND_BOTTOM) return false;
        return tiles.indexOf(this.map[this.xy(x, y)]) != -1;
      },

      // This function generates object which will be returned to user after
      // creating dungeon.

      returnValue: function() {
        this.success = true;
        var rv = {
          success: this.success
        };

        if (this.success) {
          rv.map = this.map;

          if (options.returnRoomData)
            rv.roomData = this.generateRoomData();

          if (options.returnDoorData)
            rv.doorData = this.generateDoorData();

          if (options.returnStatistics)
            rv.statistics = this.generateStatistics();
        }

        return rv;
      },

      // Fill whole map with given tile.
      fill: function(tile) {
        var xy = this.xy;
        for (var x = 0; x < this.MAP_WIDTH; x++) {
          for (var y = 0; y < this.MAP_HEIGHT; y++) {
            this.map[xy(x,y)] = tile;
          }
        }
      }

    // end of anonymous namespace...
    }).create();
  }

  return dungCarv;
});

/* jshint unused: false */
define('map',[ 'underscore', 'dungcarv' ], function(_, dungCarv) {
  

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

/* jshint unused:false */
/* global MeshObject, THREE */
define('tile',[ 'underscore' ], function(_) {
  

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

/* global SceneAsset, THREE */
/* jshint unused: false */
define('dungeon_generator',[ 'underscore', 'async', './map', './tile' ], function(_, async, Map, Tile) {
  

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

  DungeonGenerator.prototype.create = function(fn) {
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

      if (_.isFunction(fn)) {
        fn(that.mapObject);
      }
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
  return require('dungeon_generator');
}));
