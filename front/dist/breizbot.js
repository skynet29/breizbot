/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {
      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      this._maxListeners = conf.maxListeners !== undefined ? conf.maxListeners : defaultMaxListeners;

      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);
      conf.verboseMemoryLeak && (this.verboseMemoryLeak = conf.verboseMemoryLeak);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    } else {
      this._maxListeners = defaultMaxListeners;
    }
  }

  function logPossibleMemoryLeak(count, eventName) {
    var errorMsg = '(node) warning: possible EventEmitter memory ' +
        'leak detected. ' + count + ' listeners added. ' +
        'Use emitter.setMaxListeners() to increase limit.';

    if(this.verboseMemoryLeak){
      errorMsg += ' Event name: ' + eventName + '.';
    }

    if(typeof process !== 'undefined' && process.emitWarning){
      var e = new Error(errorMsg);
      e.name = 'MaxListenersExceededWarning';
      e.emitter = this;
      e.count = count;
      process.emitWarning(e);
    } else {
      console.error(errorMsg);

      if (console.trace){
        console.trace();
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    this.verboseMemoryLeak = false;
    configure.call(this, conf);
  }
  EventEmitter.EventEmitter2 = EventEmitter; // backwards compatibility for exporting EventEmitter property

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name !== undefined) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else {
          if (typeof tree._listeners === 'function') {
            tree._listeners = [tree._listeners];
          }

          tree._listeners.push(listener);

          if (
            !tree._listeners.warned &&
            this._maxListeners > 0 &&
            tree._listeners.length > this._maxListeners
          ) {
            tree._listeners.warned = true;
            logPossibleMemoryLeak.call(this, tree._listeners.length, name);
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    if (n !== undefined) {
      this._maxListeners = n;
      if (!this._conf) this._conf = {};
      this._conf.maxListeners = n;
    }
  };

  EventEmitter.prototype.event = '';


  EventEmitter.prototype.once = function(event, fn) {
    return this._once(event, fn, false);
  };

  EventEmitter.prototype.prependOnceListener = function(event, fn) {
    return this._once(event, fn, true);
  };

  EventEmitter.prototype._once = function(event, fn, prepend) {
    this._many(event, 1, fn, prepend);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    return this._many(event, ttl, fn, false);
  }

  EventEmitter.prototype.prependMany = function(event, ttl, fn) {
    return this._many(event, ttl, fn, true);
  }

  EventEmitter.prototype._many = function(event, ttl, fn, prepend) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      return fn.apply(this, arguments);
    }

    listener._origin = fn;

    this._on(event, listener, prepend);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) {
        return false;
      }
    }

    var al = arguments.length;
    var args,l,i,j;
    var handler;

    if (this._all && this._all.length) {
      handler = this._all.slice();
      if (al > 3) {
        args = new Array(al);
        for (j = 0; j < al; j++) args[j] = arguments[j];
      }

      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          handler[i].call(this, type);
          break;
        case 2:
          handler[i].call(this, type, arguments[1]);
          break;
        case 3:
          handler[i].call(this, type, arguments[1], arguments[2]);
          break;
        default:
          handler[i].apply(this, args);
        }
      }
    }

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
      if (typeof handler === 'function') {
        this.event = type;
        switch (al) {
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        default:
          args = new Array(al - 1);
          for (j = 1; j < al; j++) args[j - 1] = arguments[j];
          handler.apply(this, args);
        }
        return true;
      } else if (handler) {
        // need to make copy of handlers because list can change in the middle
        // of emit call
        handler = handler.slice();
      }
    }

    if (handler && handler.length) {
      if (al > 3) {
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
      }
      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          handler[i].call(this);
          break;
        case 2:
          handler[i].call(this, arguments[1]);
          break;
        case 3:
          handler[i].call(this, arguments[1], arguments[2]);
          break;
        default:
          handler[i].apply(this, args);
        }
      }
      return true;
    } else if (!this._all && type === 'error') {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }

    return !!this._all;
  };

  EventEmitter.prototype.emitAsync = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
        if (!this._events.newListener) { return Promise.resolve([false]); }
    }

    var promises= [];

    var al = arguments.length;
    var args,l,i,j;
    var handler;

    if (this._all) {
      if (al > 3) {
        args = new Array(al);
        for (j = 1; j < al; j++) args[j] = arguments[j];
      }
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          promises.push(this._all[i].call(this, type));
          break;
        case 2:
          promises.push(this._all[i].call(this, type, arguments[1]));
          break;
        case 3:
          promises.push(this._all[i].call(this, type, arguments[1], arguments[2]));
          break;
        default:
          promises.push(this._all[i].apply(this, args));
        }
      }
    }

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      switch (al) {
      case 1:
        promises.push(handler.call(this));
        break;
      case 2:
        promises.push(handler.call(this, arguments[1]));
        break;
      case 3:
        promises.push(handler.call(this, arguments[1], arguments[2]));
        break;
      default:
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
        promises.push(handler.apply(this, args));
      }
    } else if (handler && handler.length) {
      handler = handler.slice();
      if (al > 3) {
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
      }
      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          promises.push(handler[i].call(this));
          break;
        case 2:
          promises.push(handler[i].call(this, arguments[1]));
          break;
        case 3:
          promises.push(handler[i].call(this, arguments[1], arguments[2]));
          break;
        default:
          promises.push(handler[i].apply(this, args));
        }
      }
    } else if (!this._all && type === 'error') {
      if (arguments[1] instanceof Error) {
        return Promise.reject(arguments[1]); // Unhandled 'error' event
      } else {
        return Promise.reject("Uncaught, unspecified 'error' event.");
      }
    }

    return Promise.all(promises);
  };

  EventEmitter.prototype.on = function(type, listener) {
    return this._on(type, listener, false);
  };

  EventEmitter.prototype.prependListener = function(type, listener) {
    return this._on(type, listener, true);
  };

  EventEmitter.prototype.onAny = function(fn) {
    return this._onAny(fn, false);
  };

  EventEmitter.prototype.prependAny = function(fn) {
    return this._onAny(fn, true);
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype._onAny = function(fn, prepend){
    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if (!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    if(prepend){
      this._all.unshift(fn);
    }else{
      this._all.push(fn);
    }

    return this;
  }

  EventEmitter.prototype._on = function(type, listener, prepend) {
    if (typeof type === 'function') {
      this._onAny(type, listener);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if (this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else {
      if (typeof this._events[type] === 'function') {
        // Change to array.
        this._events[type] = [this._events[type]];
      }

      // If we've already got an array, just add
      if(prepend){
        this._events[type].unshift(listener);
      }else{
        this._events[type].push(listener);
      }

      // Check for listener leak
      if (
        !this._events[type].warned &&
        this._maxListeners > 0 &&
        this._events[type].length > this._maxListeners
      ) {
        this._events[type].warned = true;
        logPossibleMemoryLeak.call(this, this._events[type].length, type);
      }
    }

    return this;
  }

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }

        this.emit("removeListener", type, listener);

        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }

        this.emit("removeListener", type, listener);
      }
    }

    function recursivelyGarbageCollect(root) {
      if (root === undefined) {
        return;
      }
      var keys = Object.keys(root);
      for (var i in keys) {
        var key = keys[i];
        var obj = root[key];
        if ((obj instanceof Function) || (typeof obj !== "object") || (obj === null))
          continue;
        if (Object.keys(obj).length > 0) {
          recursivelyGarbageCollect(root[key]);
        }
        if (Object.keys(obj).length === 0) {
          delete root[key];
        }
      }
    }
    recursivelyGarbageCollect(this.listenerTree);

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          this.emit("removeListenerAny", fn);
          return this;
        }
      }
    } else {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++)
        this.emit("removeListenerAny", fns[i]);
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if (this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else if (this._events) {
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if (this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.eventNames = function(){
    return Object.keys(this._events);
  }

  EventEmitter.prototype.listenerCount = function(type) {
    return this.listeners(type).length;
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

$$.control.registerControl('breizbot.alexa', {

	deps: ['brainjs.http'],

	init(elt, http) {
		const hash = window.location.hash.substr(1)

		//console.log('hash', hash)
		const params = $$.util.parseUrlParams(hash)
		//console.log('params', params)
		http.post('/api/alexa/auth', params).then(() => {
			window.close()
		})
	}
});

$$.control.registerControl('breizbot.appTab', {

	props: {
		appUrl: 'about:blank'
	},

	template: "<iframe bn-attr=\"{src: appUrl}\" bn-bind=\"iframe\" bn-event=\"load: onFrameLoaded\"></iframe>",

	init: function(elt) {
		const {appUrl} = this.props;

		const ctrl = $$.viewController(elt, {
			data: {
				appUrl				
			},
			events: {
				onFrameLoaded: function() {
					//console.log('[appTab] onFrameLoaded')
				}
			}
		})

		this.onAppExit = function()  {
			//console.log('[appTab] onAppExit', ctrl.model.appUrl)
			const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
			const rootPage = $iframe.find('.rootPage').iface()
			if (rootPage && typeof rootPage.onAppExit == 'function') {
				return rootPage.onAppExit()
			}
			return Promise.resolve()		
		}	

		this.onAppSuspend = function()  {
			//console.log('[appTab] onAppSuspend', ctrl.model.appUrl)
			const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
			const rootPage = $iframe.find('.rootPage').iface()
			if (rootPage && typeof rootPage.onAppSuspend == 'function') {
				rootPage.onAppSuspend()
			}
		}

		this.onAppResume = function()  {
			//console.log('[appTab] onAppResume', ctrl.model.appUrl)
			const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
			const rootPage = $iframe.find('.rootPage').iface()
			if (rootPage && typeof rootPage.onAppResume == 'function') {
				rootPage.onAppResume()
			}
		}

		this.setAppUrl = function(appUrl) {
			//console.log('[appTab] setAppUrl', appUrl)
			ctrl.setData({appUrl: appUrl + '&date=' + Date.now()})
		}
	}
});

$$.control.registerControl('breizbot.apps', {

	deps: ['breizbot.scheduler'],

	props: {
		apps: [],
		showActivated: false,
		items: null
	},

	$iface: 'setData(data)',

	template: "<div class=\"scrollPanel\">\n	<div bn-each=\"apps\" \n		bn-iter=\"app\" \n		class=\"main\" \n		bn-event=\"click.tile: onTileClick, contextmenuchange.tile: onTileContextMenu\"\n		>			\n		<div bn-attr=\"class1\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n			<div class=\"arrow-right\" bn-show=\"show1\"></div>\n			<div bn-show=\"show2\" style=\"margin-bottom: 5px;\">\n				<i bn-attr=\"{class: $scope.app.props.iconCls}\"></i>\n			</div>\n\n			<span bn-text=\"$scope.app.props.title\"></span>\n		</div>\n\n	</div>\n</div>",

	init: function(elt, scheduler) {

		const {apps, showActivated, items} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				getItems: function(scope) {
					//console.log('getItems', scope.app)
					return (typeof items == 'function') ? items(scope.app) : items
				},
				apps,
				showActivated,
				show1: function(scope) {
					return this.showActivated && scope.app.activated
				},
				class1: function(scope) {
					return {class: `tile w3-btn ${scope.app.props.colorCls}`}
				},
				show2: function(scope) {
					return typeof scope.app.props.iconCls == 'string'
				}
			},
			events: {
				onTileClick: function(ev) {
					//console.log('onTileClick', $(this).data('item'))
					const idx = $(this).index()
					elt.trigger('appclick', ctrl.model.apps[idx])
				},
				onTileContextMenu: function(ev, data) {
					const idx = $(this).index()
					//console.log('onTileContextMenu', data)
					const {cmd} = data
					const info = $.extend({cmd}, ctrl.model.apps[idx])
					elt.trigger('appcontextmenu', info)
				}
			}
		})


		this.setData = function(data) {
			//console.log('data', data)
			ctrl.setData({
				apps: data.apps.filter((a) => a.props.visible != false && a.appName != 'template')
			})
		}

	},

	$iface: `setData(data)`,
	$events: 'appclick;appcontextmenu'
});


$$.control.registerControl('breizbot.contacts', {

	deps: ['breizbot.users'],

	props: {
		showSelection: false,
		showDeleteButton: false
	},	

	template: "<p bn-show=\"show2\">You have no contacts</p>\n<div class=\"scrollPanel\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-event=\"click.w3-bar: onItemClick, click.delete: onDeleteItem\"\n		bn-each=\"contacts\"\n		bn-show=\"show1\"\n		>\n		<li class=\"w3-bar\">\n			<span class=\"w3-button w3-right delete\" title=\"Delete\" bn-show=\"showDeleteButton\"><i class=\"fa fa-trash\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				<i class=\"fa fa-user w3-text-blue\"></i>\n				<strong bn-text=\"$scope.$i.contactName\"></strong><br>\n				<i class=\"fa fa-envelope w3-text-blue\"></i>\n				<span bn-text=\"$scope.$i.contactEmail\"></span>\n			</div>\n		</li>\n	</ul>		\n\n</div>\n",

	init: function(elt, users) {

		const {showSelection, showDeleteButton} = this.props


		const ctrl = $$.viewController(elt, {
			data: {
				contacts: [],
				showDeleteButton,
				show1: function() {
					return this.contacts.length > 0
				},
				show2: function() {
					return this.contacts.length == 0
				}
			},
			events: {
				onItemClick: function() {
					const idx =  $(this).index()
					const data = ctrl.model.contacts[idx]
					console.log('onItemClick', data)
					if (showSelection) {
						//$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).toggleClass('w3-blue')						
					}
					elt.trigger('contactclick', data)					
				},

				onDeleteItem: async function(ev) {
					ev.stopPropagation()
					const idx =  $(this).closest('li').index()
					const data = ctrl.model.contacts[idx]
					console.log('onDeleteItem', data)
					await users.removeContact(data._id)
					load()

				}
			}
		})	

		async function load() {
			const contacts = await users.getContacts()
			console.log('contacts', contacts)
			ctrl.setData({contacts})
		}

		load()

		this.update = load

		this.getSelection = function() {
			const ret = []
			elt.find('li.w3-blue').each(function() {
				const idx =  $(this).index()
				ret.push(ctrl.model.contacts[idx])
			})
			console.log('ret', ret)
			return ret
		}

	},
	$iface: `getSelection(): [ContactInfo]`,
	$events: 'contactclick'
});





(function () {

	function getIconClass(name) {
		name = name.toLowerCase()
		if (name.endsWith('.pdf')) {
			return 'fa-file-pdf'
		}
		if (name.endsWith('.hdoc')) {
			return 'fa-file-word'
		}
		if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
			return 'fa-file-audio'
		}
		if (name.endsWith('.mp4') || name.endsWith('.webm')) {
			return 'fa-file-video'
		}
		if (name.endsWith('.zip')) {
			return 'fa-file-archive'
		}

		return 'fa-file'
	}

	function sortFiles(files) {
		files.sort((a, b) => {
			if (a.folder && !b.folder) {
				return -1
			}
			if (!a.folder && b.folder) {
				return 1
			}
			return a.name.localeCompare(b.name)
		})
	}

	$$.control.registerControl('breizbot.files', {
		deps: ['breizbot.files'],
		props: {
			$pager: null,
			showToolbar: false,
			imageOnly: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null
		},

		template: "<div class=\"toolbar\" bn-show=\"showToolbar\" bn-bind=\"toolbar\">\n	<div class=\"left\">\n		<div class=\"group\" bn-show=\"!isMobileDevice\">\n			<button \n				class=\"w3-button\" \n				title=\"New folder\" \n				bn-event=\"click: onCreateFolder\" \n				data-cmd=\"newFolder\">\n					<i class=\"fas fa-folder-plus\"></i>\n				</button>\n	\n			<button \n				class=\"w3-button\" \n				title=\"Import file\" \n				data-cmd=\"importFile\"\n				bn-event=\"click: onImportFile\">\n					<i class=\"fa fa-upload\"></i>\n				</button>\n\n			<button \n				class=\"w3-button\" \n				title=\"Reload\" \n				data-cmd=\"reload\"\n				bn-event=\"click: onReload\">\n					<i class=\"fa fa-sync-alt\"></i>\n				</button>\n\n			<span class=\"separator\"></span>\n	\n	\n		</div>\n	\n		<div class=\"group\">\n			<button class=\"w3-button\" title=\"Toggle Selection\" bn-event=\"click: onTogleSelection\"><i class=\"fa fa-check\"></i></button>\n			<span class=\"separator\"></span>\n	\n	\n		</div>\n	\n		<div class=\"group\">\n			<button class=\"w3-button\" title=\"Delete\" bn-event=\"click: onDeleteFiles\" bn-prop=\"prop1\"><i class=\"fa fa-trash\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Cut\" bn-prop=\"prop1\" bn-event=\"click: onCutFiles\"><i class=\"fa fa-cut\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Copy\" bn-prop=\"prop1\" bn-event=\"click: onCopyFiles\"><i class=\"fa fa-copy\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Share\" bn-prop=\"prop2\" bn-event=\"click: onShareFiles\"><i class=\"fa fa-share-alt\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Paste\" bn-prop=\"prop3\" bn-event=\"click: onPasteFiles\"><i class=\"fa fa-paste\"></i></button>\n		</div>\n	\n	\n	</div>\n	<div bn-show=\"isMobileDevice\">\n		<button class=\"w3-button\" title=\"More actions\" \n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onToolbarContextMenu\"\n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n				 	newFolder: {name: \'New folder\', icon: \'fas fa-folder-plus\'},\n				 	importFile: {name: \'Import file\', icon: \'fas fa-upload\'},\n				 	reload: {name: \'Reload\', icon: \'fas fa-sync-alt\'}\n				}\n			}\">\n			<i class=\"fa fa-ellipsis-v\"></i></button>\n\n	</div>\n</div>\n\n<div class=\"download\" bn-show=\"hasDownloads\" bn-bind=\"downloads\">\n	<strong bn-event=\"click: onToggleDownload\"><i class=\"fa fa-caret-down fa-fw\"></i>\n			Uploads</strong>\n	<div bn-each=\"downloads\" class=\"downloadItems\">\n		<div class=\"w3-card w3-padding-small\">\n			<div bn-text=\"$scope.$i.fileName\"></div>\n			<progress max=\"1\" bn-val=\"$scope.$i.percentage\"></progress>\n		</div>\n	</div>\n</div>\n\n<div bn-text=\"info\" bn-bind=\"info\" class=\"info\"></div>\n\n<div bn-show=\"loading\" class=\"loading\">\n	<i class=\"fa fa-spinner fa-pulse\"></i>\n	loading ...\n</div>\n\n<div class=\"pathPanel\" bn-event=\"click.pathItem: onPathItem\" bn-show=\"!loading\">\n	<div bn-each=\"getPath\" bn-index=\"idx\">\n		<i class=\"fa fa-chevron-right\" bn-show=\"!isFirst\"></i>\n		<span>\n			<a class=\"pathItem\" bn-text=\"$scope.$i\" href=\"#\" bn-show=\"!isLast\" bn-data=\"{info: getPathInfo}\"></a>\n			<span bn-text=\"$scope.$i\" bn-show=\"isLast\" class=\"lastItem\"></span>\n\n		</span>\n	</div>\n\n\n</div>\n\n\n<div class=\"scrollPanel\">\n\n	<div bn-each=\"getFiles\" bn-iter=\"f\" bn-lazzy=\"10\" bn-bind=\"files\" class=\"container\"\n		bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick, contextmenuchange.thumbnail: onContextMenu\">\n\n		<div class=\"thumbnail w3-card-2\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n\n			<span bn-if=\"if1\">\n				<input type=\"checkbox\" bn-show=\"showToolbar\" class=\"check w3-check\">\n			</span>\n			<div bn-if=\"$scope.f.folder\" class=\"folder item\">\n				<div class=\"icon\">\n					<i class=\"fa fa-4x fa-folder-open w3-text-blue-grey\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\" bn-if=\"if1\"></span>\n				</div>\n			</div>\n			<div bn-if=\"if2\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"isMP3\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<div>Title:&nbsp;<strong bn-text=\"$scope.f.mp3.title\"></strong></div>\n\n					<div>Artist:&nbsp;<strong bn-text=\"$scope.f.mp3.artist\"></strong></div>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"if3\" class=\"file item\">\n				<div class=\"icon\">\n					<img bn-attr=\"{src: getThumbnailUrl}\">\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n					<span bn-text=\"getDimension\"></span>\n				</div>\n			</div>\n\n		</div>\n	</div>\n\n\n</div>",

		init: function (elt, srvFiles) {

			const thumbnailSize = '100x?'
			const maxUploadSize = 10 * 1024 * 2014 // 10 Mo

			let selected = false

			let {
				showToolbar,
				filterExtension,
				friendUser,
				imageOnly,
				getMP3Info,
				mp3Filters
			} = this.props

			if (friendUser != '') {
				showToolbar = false
			}

			function getSelFiles() {
				const selFiles = []
				elt.find('.check:checked').each(function () {
					const idx = $(this).closest('.thumbnail').index()
					const { name, folder } = ctrl.model.files[idx]

					selFiles.push({ fileName: ctrl.model.rootDir + name, idx, folder })
				})
				//console.log('selFiles', selFiles)	
				return selFiles
			}


			function getNbSelFiles() {
				return elt.find('.check:checked').length
			}

			function toggleSelection() {
				selected = !selected
				elt.find('.check').prop('checked', selected)
			}

			if (showToolbar) {
				const resizeObserver = new ResizeObserver(entries => {
					ctrl.model.isMobileDevice = $$.util.isMobileDevice()
					ctrl.updateNodeTree('toolbar')
				})

				resizeObserver.observe(elt.get(0));

			}


			const ctrl = $$.viewController(elt, {

				data: {
					downloads: [],
					hasDownloads: function () {
						return this.downloads.length > 0
					},
					isMobileDevice: false,
					loading: false,
					showToolbar,
					rootDir: '/',
					files: [],
					selectedFiles: [],
					operation: 'none',
					nbSelection: 0,
					isShareSelected: false,
					mp3Filters,
					info: function () {
						let nbFiles = 0
						let nbFolders = 0
						this.getFiles().forEach((i) => {
							if (i.folder) {
								if (i.name != '..') {
									nbFolders++
								}
							}
							else {
								nbFiles++
							}
						})

						let ret = []
						if (nbFolders == 1) {
							ret.push(`${nbFolders} folder`)
						}
						if (nbFolders > 1) {
							ret.push(`${nbFolders} folders`)
						}
						if (nbFiles == 1) {
							ret.push(`${nbFiles} file`)
						}
						if (nbFiles > 1) {
							ret.push(`${nbFiles} files`)
						}
						return ret.join(' / ')
					},

					isInFilter: function (mp3Info) {
						var ret = true
						for (var f in this.mp3Filters) {
							var value = mp3Info[f]
							var filterValue = this.mp3Filters[f]
							if (filterValue != null) {
								ret &= (filterValue === value)
							}
						}
						return ret
					},

					getFiles: function () {
						if (this.mp3Filters === null) {
							return this.files
						}
						return this.files.filter((f) => {
							return f.folder || (f.mp3 && f.mp3 && this.isInFilter(f.mp3))
						})
					},
					isMP3: function (scope) {
						return getMP3Info && scope.f.mp3 != undefined && scope.f.mp3.title != undefined &&
							scope.f.mp3.title != ''
					},
					getPath: function () {
						const tab = ('/home' + this.rootDir).split('/')
						tab.shift()
						tab.pop()
						return tab
					},
					isLast: function (scope) {
						return scope.idx == this.getPath().length - 1
					},
					isFirst: function (scope) {
						return scope.idx == 0
					},
					getPathInfo: function (scope) {
						return this.getPath().slice(1, scope.idx + 1).join('/')
					},

					getItems: function (scope) {
						const ret = {}
						if (showToolbar && scope.f.name != '..') {
							ret.delete = { name: 'Delete', icon: 'fas fa-trash' }
							ret.rename = { name: 'Rename', icon: 'fas fa-i-cursor' }
							if (scope.f.isImage) {
								ret.makeResizedCopy = { name: 'Make resized copy', icon: 'fas fa-compress-arrows-alt' }
							}
							if (!scope.f.folder) {
								ret.download = { name: 'Download', icon: 'fas fa-download' }
							}
							if (scope.f.name.toLowerCase().endsWith('.mp4')) {
								ret.convertToMP3 = { name: 'Convert to MP3' }
							}
							if (scope.f.folder) {
								ret.zipFolder = { name: 'Zip Folder', icon: 'fas fa-compress' }
							}
							if (!scope.f.folder && scope.f.name.endsWith('.zip')) {
								ret.unzipFile = { name: 'Unzip File', icon: 'fas fa-expand-alt' }
							}

						}
						return ret

					},
					getThumbnailUrl: function (scope) {
						return srvFiles.fileThumbnailUrl(this.rootDir + scope.f.name, thumbnailSize, friendUser)
					},
					if1: function (scope) {
						return scope.f.name != '..'
					},
					if2: function (scope) {
						return !scope.f.folder && !scope.f.isImage && !this.isMP3(scope)
					},
					if3: function (scope) {
						return !scope.f.folder && scope.f.isImage
					},
					class1: function (scope) {
						return `fa fa-4x w3-text-blue-grey ${getIconClass(scope.f.name)}`
					},
					getSize: function (scope) {
						let size = scope.f.size
						let unit = 'octets'
						if (size > 1024) {
							unit = 'Ko'
							size /= 1024
						}

						if (size > 1024) {
							unit = 'Mo'
							size /= 1024
						}

						size = Math.floor(size * 10) / 10
						return 'Size: ' + size + ' ' + unit
					},

					getDimension: function (scope) {
						const d = scope.f.dimension
						return `Dimension: ${d.width}x${d.height}`
					},


					getDate: function (scope) {
						const date = new Date(scope.f.mtime).toLocaleDateString()
						return 'Last Modif: ' + date

					},

					prop1: function () {
						return { disabled: this.nbSelection == 0 }
					},
					prop2: function () {
						return { disabled: this.nbSelection == 0 || this.rootDir.startsWith('/share/') || this.isShareSelected }
					},
					prop3: function () {
						return { disabled: this.selectedFiles.length == 0 }
					}

				},
				events: {
					onToolbarContextMenu: function (ev, data) {
						console.log('onToolbarContextMenu', data)
						elt.find(`button[data-cmd=${data.cmd}]`).click()
					},
					onToggleDownload: function () {
						console.log('onToggleDownload')
						const $i = $(this).find('i')
						const panel = $(this).siblings('.downloadItems')
						if ($i.hasClass('fa-caret-right')) {
							$i.removeClass('fa-caret-right').addClass('fa-caret-down')
							panel.slideDown()
						}
						else {
							$i.removeClass('fa-caret-down').addClass('fa-caret-right')
							panel.slideUp()
						}

					},
					onPathItem: function (ev) {
						const pathItem = $(this).data('info')
						console.log('onPathItem', pathItem)
						ev.preventDefault()

						loadData(pathItem == '' ? '/' : '/' + pathItem + '/')
					},
					onReload: function (ev) {
						loadData()
					},

					onContextMenu: async function (ev, data) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.files[idx]
						const { cmd } = data

						const { rootDir } = ctrl.model

						if (cmd == 'download') {
							const url = srvFiles.fileUrl(rootDir + info.name)
							$$.util.downloadUrl(url, info.name)
						}

						if (cmd == 'rename') {
							rename(info, idx)
						}

						if (cmd == 'makeResizedCopy') {
							makeResizedCopy(info, idx)
						}

						if (cmd == 'convertToMP3') {
							convertToMP3(info, idx)
						}

						if (cmd == 'zipFolder') {
							zipFolder(info, idx)
						}

						if (cmd == 'unzipFile') {
							unzipFile(info, idx)
						}

						if (cmd == 'delete') {
							const { name, folder } = info
							deleteFiles([{ fileName: rootDir + name, idx, folder }])
						}


					},

					onFileClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						ev.stopPropagation()
						const data = {
							fileName: info.name,
							rootDir: ctrl.model.rootDir,
							isImage: info.isImage
						}

						elt.trigger('fileclick', data)
					},
					onCheckClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						if (info.name == 'share' && ctrl.model.rootDir == '/') {
							ctrl.model.isShareSelected = $(this).getValue()
						}

						ctrl.setData({ nbSelection: getNbSelFiles() })
					},
					onFolderClick: function (ev) {

						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						const dirName = info.name
						//console.log('onFolderClick', dirName)
						if (dirName == '..') {
							const split = ctrl.model.rootDir.split('/')
							split.pop()
							split.pop()
							loadData(split.join('/') + '/')
						}
						else {
							loadData(ctrl.model.rootDir + dirName + '/')
						}
					},
					onCreateFolder: async function () {
						var rootDir = ctrl.model.rootDir
						const folderName = await $$.ui.showPrompt({
							label: 'Folder name:',
							title: 'New Folder'
						})
						console.log('folderName', folderName)
						if (folderName == null) return

						try {
							const resp = await srvFiles.mkdir(rootDir + folderName)
							console.log('resp', resp)
							insertFile(resp)
						}
						catch (resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					},
					onTogleSelection: function () {
						toggleSelection()
						ctrl.setData({ nbSelection: getNbSelFiles() })
					},

					onDeleteFiles: function (ev) {

						const selFiles = getSelFiles()

						if (selFiles.length == 0) {
							$$.ui.showAlert({
								title: 'Delete files',
								content: 'No files selected'
							})
							return
						}

						deleteFiles(selFiles)

					},
					onCutFiles: function (ev) {
						console.log('onCutFiles')
						ctrl.setData({
							selectedFiles: getSelFiles().map((i) => i.fileName),
							operation: 'cut'
						})
					},

					onCopyFiles: function (ev) {
						console.log('onCopyFiles')
						ctrl.setData({
							selectedFiles: getSelFiles().map((i) => i.fileName),
							operation: 'copy'
						})

					},

					onShareFiles: async function (ev) {
						console.log('onShareFiles')
						try {
							const resp = await srvFiles.shareFiles(getSelFiles().map((i) => i.fileName))
							console.log('resp', resp)
							ctrl.setData({ selectedFiles: [], operation: 'none' })
							loadData()
						}
						catch (resp) {
							console.log('resp', resp)
							//ctrl.setData({selectedFiles: [], operation: 'none'})
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					},

					onPasteFiles: async function (ev) {
						console.log('onPasteFiles')
						const { rootDir, selectedFiles, operation } = ctrl.model

						let resp = ''
						try {
							if (operation == 'copy') {
								resp = await srvFiles.copyFiles(selectedFiles, rootDir)
							}
							else {
								resp = await srvFiles.moveFiles(selectedFiles, rootDir)
							}
							console.log('resp', resp)
							ctrl.setData({ selectedFiles: [], operation: 'none' })
							loadData()
						}
						catch (resp) {
							console.log('resp', resp)
							//ctrl.setData({selectedFiles: [], operation: 'none'})
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					},
					onImportFile: function (ev) {

						$$.util.openFileDialog(async function (file) {
							//console.log('fileSize', file.size / 1024)
							console.log('Download file:', file.name)
							// if (file.size > maxUploadSize) {
							// 	$$.ui.showAlert({ content: 'File too big', title: 'Import file' })
							// 	return
							// }
							try {
								const data = {
									fileName: file.name,
									percentage: 0
								}

								const { downloads, rootDir } = ctrl.model
								downloads.push(data)
								ctrl.updateNodeTree('downloads')

								await srvFiles.uploadFile(file, file.name, ctrl.model.rootDir, function (percentComplete) {
									data.percentage = percentComplete
									ctrl.updateNodeTree('downloads')
								})
								console.log('Download Finished: ', data.fileName)
								const idx = downloads.indexOf(data)
								downloads.splice(idx, 1)
								ctrl.updateNodeTree('downloads')
								const fileInfo = await srvFiles.fileInfo(rootDir + data.fileName)
								insertFile(fileInfo)
							}
							catch (resp) {
								console.log('resp', resp)
								$$.ui.showAlert({ content: resp.responseText, title: 'Error' })
							}

						})

					}
				}

			})

			function deleteFiles(fileNames) {
				console.log('deleteFiles', fileNames)
				$$.ui.showConfirm({
					content: 'Are you sure ?',
					title: 'Delete files'
				}, async function () {
					try {
						const resp = await srvFiles.removeFiles(fileNames.map((i) => i.fileName))
						console.log('resp', resp)
						//loadData()	
						fileNames.reverse().forEach((i) => {
							ctrl.removeArrayItem('files', i.idx, 'files')
						})
						ctrl.updateNode('info')
						console.log('files', ctrl.model.files)
					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}
				})
			}


			async function loadData(rootDir, resetFilters) {
				if (rootDir == undefined) {
					rootDir = ctrl.model.rootDir
				}
				console.log('loadData', rootDir)
				ctrl.setData({ loading: true })
				const files = await srvFiles.list(rootDir, { filterExtension, imageOnly, getMP3Info }, friendUser)
				//console.log('files', files)


				if (rootDir != '/') {
					files.unshift({ name: '..', folder: true })
				}

				sortFiles(files)

				if (resetFilters !== false) {
					ctrl.model.mp3Filters = null
				}


				ctrl.setData({
					loading: false,
					files,
					rootDir,
					nbSelection: 0,
					isShareSelected: false
				})

			}

			async function unzipFile(info, idx) {
				try {
					const resp = await srvFiles.unzipFile(ctrl.model.rootDir, info.name)
					//console.log('resp', resp)
					loadData()
				}
				catch (resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				}

			}

			async function zipFolder(info, idx) {
				try {
					const resp = await srvFiles.zipFolder(ctrl.model.rootDir, info.name)
					//console.log('resp', resp)
					ctrl.insertArrayItemAfter('files', idx, resp, 'files')
					console.log('files', ctrl.model.files)
					ctrl.updateNode('info')

				}
				catch (resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				}
			}

			async function convertToMP3(info, idx) {
				try {
					const resp = await srvFiles.convertToMP3(ctrl.model.rootDir, info.name)
					//console.log('resp', resp)
					ctrl.insertArrayItemAfter('files', idx, resp, 'files')
					ctrl.updateNode('info')
					console.log('files', ctrl.model.files)

				}
				catch (resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				}
			}

			async function makeResizedCopy(info, idx) {
				const percentage = await $$.ui.showPrompt({
					label: 'Rescale percentage:',
					title: 'Make resized copy',
					attrs: { min: 10, max: 90, type: 'number' },
					value: 50
				})

				if (percentage != null) {
					const { rootDir } = ctrl.model
					try {
						const resp = await srvFiles.resizeImage(rootDir, info.name, percentage + '%')
						//console.log('resp', resp)
						ctrl.insertArrayItemAfter('files', idx, resp, 'files')
						console.log('files', ctrl.model.files)
						ctrl.updateNode('info')

					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}
				}

			}

			async function rename(info, idx) {
				const oldFileName = info.name
				const newFileName = await $$.ui.showPrompt({ label: 'New name', title: 'Rename', value: oldFileName })
				console.log('newFileName', newFileName)
				if (newFileName != null && newFileName != oldFileName) {
					try {
						const resp = await srvFiles.renameFile(ctrl.model.rootDir, oldFileName, newFileName)
						//console.log('resp', resp)
						ctrl.updateArrayItem('files', idx, resp, 'files')
						console.log('files', ctrl.model.files)
					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})

					}
				}
			}

			loadData()

			function insertFile(fileInfo) {
				let idx = ctrl.model.getFiles().filter((f) => f.folder).length
				//console.log('idx', idx)
				ctrl.insertArrayItemAfter('files', idx - 1, fileInfo, 'files')
				console.log('files', ctrl.model.files)
				ctrl.updateNode('info')

			}

			this.getFiles = function () {
				return ctrl.model.files.filter((f) => !f.folder)
			}

			this.getFilteredFiles = function () {
				return ctrl.model.getFiles().filter((f) => !f.folder)
			}

			this.update = function () {
				//console.log('[FileCtrl] update')
				loadData(undefined, false)
			}

			this.updateFile = async function (fileName, options) {
				const { files, rootDir } = ctrl.model
				let idx = ctrl.model.getFiles().findIndex((i) => i.name == fileName)
				//console.log('[FileCtrl] updateFile', idx, fileName, options)
				const info = await srvFiles.fileInfo(rootDir + fileName, friendUser, options)
				ctrl.updateArrayItem('files', idx, info)
				idx = files.findIndex((i) => i.name == fileName)
				files[idx] = info
				//console.log('files', files)
			}

			this.setMP3Filters = function (mp3Filters) {
				ctrl.setData({ mp3Filters })
			}

			this.getMP3Filters = function () {
				return ctrl.model.mp3Filters
			}
		},

		$iface: `
			update();
			updateFile(fileName: string, options);
			setMP3Filters(mp3Filter);
			getMP3Filters(): Mp3Filter;
			getFiles(): [FileInfo];
			getFilteredFiles(): [FileInfo]
		`,
		$events: 'fileclick'

	});

})();

$$.control.registerControl('breizbot.friends', {

	props: {
		showSelection: false,
		showSendMessage: false,
		showConnectionState: true
	},

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<ul class=\"w3-ul w3-border w3-white\" \n	bn-each=\"friends\" bn-show=\"show1\" bn-event=\"click.w3-bar: onItemClick, click.notif: onSendMessage\">\n	<li class=\"w3-bar\" style=\"cursor: pointer;\">\n		<span class=\"w3-button w3-right notif w3-blue\" title=\"Send Message\" bn-show=\"showSendMessage\"><i class=\"fa fa-envelope\"></i></span>\n\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-user\" bn-class=\"class1\"></i>\n			<span bn-text=\"$scope.$i.friendUserName\"></span>\n		</div>\n	</li>\n</ul>	\n<p bn-show=\"show2\">You have no friends</p>",

	init: function(elt, users, broker) {

		const {showSelection, showSendMessage, showConnectionState} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friends: [],
				showSendMessage,
				showConnectionState,
				show1: function() {
					return this.friends.length > 0
				},
				show2: function() {
					return this.friends.length == 0
				},
				class1: function(scope) {
					const $i = scope.$i
					const showConnectionState = this.showConnectionState
					return {
						'w3-text-green': $i.isConnected && showConnectionState,
						'w3-text-red': !$i.isConnected && showConnectionState,
						'w3-text-blue': !showConnectionState
					}
				}
			},
			events: {
				onItemClick: function() {
					const idx = $(this).closest('li').index()

					const userName =  ctrl.model.friends[idx].friendUserName
					//console.log('onItemClick', userName)
					if (showSelection) {
						$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).addClass('w3-blue')						
					}
					elt.trigger('friendclick', {userName})
				},
				onSendMessage: async function(ev) {
					ev.stopPropagation()
					const idx = $(this).closest('li').index()

					const userName =  ctrl.model.friends[idx].friendUserName
					//console.log('onSendMessage', userName)
					const text = await $$.ui.showPrompt({title: 'Send Message', label: 'Message:'})

					if (text != null) {
						users.sendNotif(userName, {text, reply: true})
					}
				}
			}
		})	

		function onUpdate(msg) {
			//console.log('msg', msg)
			if (msg.hist === true) {
				return
			}
			const {isConnected, userName} = msg.data
			const info = ctrl.model.friends.find((friend) => {return friend.friendUserName == userName})
			info.isConnected = isConnected
			ctrl.update()

		}
		broker.register('breizbot.friends', onUpdate)

		this.getSelection = function() {
			const idx = elt.find('li.w3-blue').index();
			return ctrl.model.friends[idx]
		}

		this.getFriends = function() {
			return ctrl.model.friends.map((friend) => friend.friendUserName)
		}

		this.update = function() {
			users.getFriends().then((friends) => {
				console.log('friends', friends)
				ctrl.setData({friends})
			})				
		}

		this.dispose = function() {
			console.log('[friends] dispose')
			broker.unregister('breizbot.friends', onUpdate)
		}


		this.update()

	},

	$iface: `
		getSelection():string;
		getFriends():[string]
	`,

	$events: 'friendclick'
});





$$.control.registerControl('breizbot.home', {

	deps: [
		'breizbot.broker',
		'breizbot.users',
		'breizbot.rtc',
		'breizbot.apps',
		'breizbot.scheduler'
	],

	props: {
		userName: 'Unknown'
	},

	template: "<div class=\"header\">\n	<div>\n		<button class=\"w3-button\" title=\"FullScreen\" bn-event=\"click: onFullScreen\" bn-show=\"!fullScreen\">\n			<i class=\"fa fa-expand\"></i></button>\n		<button class=\"w3-button\" title=\"Exit FullScreen\" bn-event=\"click: onExitFullScreen\" bn-show=\"fullScreen\">\n			<i class=\"fa fa-compress\"></i></button>\n		<button class=\"w3-button\" title=\"Connection Status\">\n			<i bn-class=\"{w3-text-green: connected, w3-text-red: !connected}\" class=\"fa fa-circle\"></i>\n\n		</button>\n		<div bn-show=\"hasIncomingCall\" bn-control=\"brainjs.contextmenu\" bn-event=\"contextmenuchange: onCallResponse\"\n			bn-data=\"{\n				trigger: \'left\', \n				title: callInfo.from,\n				items: {\n					accept: {name: \'Accept\'},\n					deny: {name: \'Decline\'},\n				}\n			}\" class=\"w3-button\">\n			<i class=\"fa fa-spinner fa-pulse\"></i>\n			<i bn-attr=\"{class: callInfo.iconCls}\"></i>\n		</div>\n	</div>\n\n\n	<!-- 	<strong bn-text=\"title\"></strong>\n -->\n	<div>\n		<button class=\"notification w3-button\" title=\"Notification\" bn-event=\"click: onNotification\">\n			<i class=\"fa fa-lg fa-bell\"></i>\n			<span class=\"w3-badge w3-red w3-tiny\" bn-text=\"nbNotif\" bn-show=\"hasNotif\"></span>\n		</button>\n\n\n\n		<div bn-control=\"brainjs.contextmenu\" bn-data=\"{\n				items: {\n					pwd: {name: \'Change password\', icon: \'fas fa-lock\'},\n					apps: {name: \'Applications\', icon: \'fas fa-th\'},\n					sep: \'------\',\n					logout: {name: \'Logout\', icon: \'fas fa-power-off\'}\n				},\n				title: userName,\n				trigger: \'left\'\n			}\" class=\"w3-button\" bn-event=\"contextmenuchange: onContextMenu\">\n			<i class=\"fa fa-user fa-lg\"></i>\n			<!-- 				<span bn-text=\"userName\"></span>	\n --> <i class=\"fa fa-angle-down fa-lg\"></i>\n\n		</div>\n\n	</div>\n\n\n</div>\n\n<div bn-control=\"brainjs.tabs\" class=\"content\" bn-iface=\"tabs\"\n	bn-event=\"tabsremove: onTabRemove, tabsactivate: onTabActivate\">\n	<div bn-control=\"breizbot.apps\" bn-data=\"{\n			apps: getMyApps,\n			items\n		}\" bn-event=\"appclick: onAppClick, appcontextmenu: onTileContextMenu\" title=\"Home\">\n	</div>\n\n</div>",

	init: function (elt, broker, users, rtc, srvApps, scheduler) {

		function createAudio() {
			let audio = null
			return {
				play: function () {
					//console.log('audio play')
					audio = new Audio('/assets/skype.mp3')
					audio.loop = true
					setTimeout(() => { audio.play() }, 100)
				},

				stop: function () {
					//console.log('audio stop')
					if (audio != null) {
						audio.pause()
					}
					audio = null
				}
			}
		}

		rtc.processCall()

		rtc.on('call', function (callInfo) {
			ctrl.setData({ hasIncomingCall: true, callInfo })
			audio.play()
		})

		rtc.on('cancel', function () {
			ctrl.setData({ hasIncomingCall: false })
			audio.stop()
		})

		const { userName } = this.props

		const audio = createAudio()

		const ctrl = $$.viewController(elt, {
			data: {
				apps: [],
				userName,
				nbNotif: 0,
				hasIncomingCall: false,
				callInfo: null,
				fullScreen: false,
				connected: false,
				hasNotif: function () {
					return this.nbNotif > 0
				},
				getMyApps: function () {
					return this.apps.filter((a) => a.activated)
				},
				items: function () {
					return {
						remove: { name: 'Remove' }
					}
				}

			},
			events: {
				onTileContextMenu: async function (ev, data) {
					//console.log('onTileContextMenu', data)
					await users.activateApp(data.appName, false)
					loadApp()
				},
				onAppClick: function (ev, data) {
					//console.log('onAppClick', data)
					openApp(data.appName)

				},
				onContextMenu: async function (ev, data) {
					//console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						logout()
					}
					if (data.cmd == 'apps') {
						openApp('store')
					}
					if (data.cmd == 'pwd') {
						const newPwd = await $$.ui.showPrompt({ title: 'Change Password', label: 'New Password:' })
						console.log('newPwd', newPwd)
						if (newPwd != null) {
							try {
								await users.changePwd(newPwd)
								$$.ui.showAlert({ title: 'Change Password', content: 'Password has been changed' })
							}
							catch (e) {
								$$.ui.showAlert({ title: 'Error', content: e.responseText })
							}
						}
					}

				},
				onNotification: function (ev) {
					//console.log('onNotification')
					if (ctrl.model.nbNotif == 0) {
						$$.ui.showAlert({ content: 'no notifications', title: 'Notifications' })
					}
					else {
						openApp('notif')
					}
				},
				onCallResponse: function (ev, data) {
					const { cmd } = data
					//console.log('onCallResponse', data)
					ctrl.setData({ hasIncomingCall: false })
					audio.stop()
					if (cmd == 'accept') {
						const { from, appName } = ctrl.model.callInfo
						openApp(appName, {
							caller: from,
							clientId: rtc.getRemoteClientId()
						})
					}
					if (cmd == 'deny') {
						rtc.deny()
					}
				},

				onExitFullScreen: function() {
					//console.log('onExitFullScreen')
					document.exitFullscreen()
				},

				onFullScreen: function (ev) {
					//console.log('onFullScreen')
					const elem = document.documentElement
					const requestFullscreen = elem.requestFullscreen ||
						elem.webkitRequestFullscreen

					if (requestFullscreen) {
						requestFullscreen.call(elem)
					}
				},
				onTabRemove: function (ev, idx) {
					//console.log('onTabRemove', idx)
					const info = ctrl.scope.tabs.getTabInfo(idx)
					info.ctrlIface.onAppExit().then(() => {
						ctrl.scope.tabs.removeTab(idx)
					})
				},
				onTabActivate: function (ev, ui) {
					//console.log('onTabActivate')
					const { newTab, oldTab } = ui
					const newTabIdx = newTab.index()
					const oldTabIdx = oldTab.index()
					if (oldTabIdx > 0) {
						const info = ctrl.scope.tabs.getTabInfo(oldTabIdx)
						info.ctrlIface.onAppSuspend()
					}
					if (newTabIdx > 0) {
						const info = ctrl.scope.tabs.getTabInfo(newTabIdx)
						info.ctrlIface.onAppResume()
					}
					if (newTabIdx == 0) {
						loadApp()
					}


				}
			}
		})

		document.addEventListener("webkitfullscreenchange", function (ev) {
			console.log('fullscreenchange', ev)
			ctrl.setData({ fullScreen: !ctrl.model.fullScreen })
		})

		document.addEventListener("fullscreenchange", function (ev) {
			console.log('fullscreenchange', ev)
			ctrl.setData({ fullScreen: !ctrl.model.fullScreen })
		})

		function updateNotifs(nbNotif) {
			ctrl.setData({ nbNotif })

		}

		broker.on('connected', (state) => {
			ctrl.setData({ connected: state })
		})

		window.addEventListener('message', (ev) => {
			console.log('[home] message', ev.data)
			const { type, data } = ev.data
			if (type == 'openApp') {
				const { appName, appParams } = data
				openApp(appName, appParams)
			}

		}, false)

		broker.register('breizbot.notifCount', function (msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.onTopic('breizbot.logout', function (msg) {
			location.href = '/logout'
		})


		function openApp(appName, params) {
			const appInfo = ctrl.model.apps.find((a) => a.appName == appName)
			const title = appInfo.props.title
			//console.log('openApp', appName, params)
			let idx = ctrl.scope.tabs.getTabIndexFromTitle(title)
			const appUrl = $$.util.getUrlParams(`/apps/${appName}`, params)
			if (idx < 0) { // apps not already run
				idx = ctrl.scope.tabs.addTab(title, {
					removable: true,
					control: 'breizbot.appTab',
					props: {
						appUrl
					}
				})
			}
			else {
				const info = ctrl.scope.tabs.getTabInfo(idx)
				if (params != undefined) {
					info.ctrlIface.setAppUrl(appUrl)
				}
			}

			ctrl.scope.tabs.setSelectedTabIndex(idx)

		}

		users.getNotifCount().then(updateNotifs)

		function loadApp() {
			srvApps.listAll().then((apps) => {
				//console.log('apps', apps)
				ctrl.setData({
					apps
				})
			})
		}


		function logout() {
			scheduler.logout()
		}

		loadApp()

		setInterval(sendPosition, 30 * 1000) // every 30 sec

		let coords = null

		function geoError(e) {
			console.log('geoloc error:', e)
		}

		function updateLocation(position) {
			//console.log('updateLocation', position)
			coords = position.coords
		}

		navigator.geolocation.getCurrentPosition(updateLocation)

		navigator.geolocation.watchPosition(updateLocation, geoError,
			{
				enableHighAccuracy: true
			}
		)


		function sendPosition() {
			//console.log('sendPosition', coords)
			if (coords != null) {
				users.sendPosition({
					lat: coords.latitude,
					lng: coords.longitude
				})

			}
		}

		function requestWakeLock() {
			if (navigator.wakeLock && navigator.wakeLock.request) {
				navigator.wakeLock.request('screen').then((lock) => {
					console.log('take wakeLock')
					lock.addEventListener('release', () => {
						console.log('Wake Lock was released')
					  })
				})
				.catch((e) => {
					console.error('WakeLock', e)
				})
		
			}
		
		}
		
		function onVisibilityChange() {
			console.log('visibilitychange', document.visibilityState)
			if (document.visibilityState === 'visible') {
				requestWakeLock()
			}	
		}

		document.addEventListener('visibilitychange', onVisibilityChange)

		requestWakeLock()

	}
});


$$.control.registerControl('breizbot.pager', {

	props: {
		rootPage: ''
	},
	template: "<div bn-show=\"showBack\" class=\"toolbar\">\n	<div class=\"left\">\n		<button class=\"w3-button\" title=\"Back\" bn-event=\"click: onBack\">\n			<i class=\"fa fa-arrow-left\"></i>\n		</button>\n		<span bn-text=\"title\" class=\"title\"></span>\n	\n	</div>\n	<div bn-each=\"buttons\" bn-event=\"click.action: onAction\">\n		<button bn-show=\"show1\" class=\"w3-button action\" bn-text=\"$scope.$i.label\"\n			bn-data=\"{cmd: $scope.$i.name}\"></button>\n		<button bn-show=\"show2\" class=\"w3-button action\" bn-data=\"{cmd: $scope.$i.name}\"\n			bn-attr=\"{title: $scope.$i.title}\"><i bn-attr=\"{class: $scope.$i.icon}\"></i></button>\n	</div>\n</div>\n<div bn-bind=\"content\" class=\"content\"></div>",

	$iface: `
		popPage(data)
		pushPage(ctrlName, options)
		setButtonVisible(buttonsVisible: {[buttonName]:boolean})
	`,

	init: function(elt) {

		const {rootPage} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				showBack: false,
				title: '',
				buttons: [],
				show1: function(scope) {
					return scope.$i.icon == undefined && !(scope.$i.visible === false)
				},
				show2: function(scope) {
					return scope.$i.icon != undefined && !(scope.$i.visible === false)
				}
			},
			events: {
				onBack: function(ev) {
					//console.log('onBack')
					restorePage(true)
				},
				onAction: function(ev) {
					const cmd = $(this).data('cmd')
					const pageCtrlIface = curInfo.ctrl.iface()
					//console.log('onAction', cmd)
					const fn = curInfo.buttons[cmd].onClick
					if (typeof fn == 'function') {
						fn.call(pageCtrlIface)
					}
				}
			}
		})

		const content = ctrl.scope.content
		const stack = []
		let curInfo = null


		function restorePage(isBack, data) {
			
			const iface = curInfo.ctrl.iface()
			//console.log('popPage', pageCtrl)
			curInfo.ctrl.safeEmpty().remove()
			if (isBack) {
				if (typeof curInfo.onBack == 'function') {
					curInfo.onBack()
				}
			}
			else if (typeof curInfo.onReturn == 'function') {
				curInfo.onReturn(data)
			}

			curInfo = stack.pop()
			curInfo.ctrl.show()
			const {title, buttons} = curInfo
			ctrl.setData({showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name')})

		}

		this.popPage = function(data) {
			return restorePage(false, data)
		}

		this.pushPage = function(ctrlName, options) {
			//console.log('[pager] pushPage', ctrlName, options)


			if (curInfo != null) {
				curInfo.ctrl.hide()
				stack.push(curInfo)
			}

			options = options || {}

			let {title, props, onReturn, onBack, events} = options

			const control = content.addControl(ctrlName, $.extend({$pager: this}, props), events)

			let buttons = {}

			if (options.buttons != undefined) {
				buttons = options.buttons
			}
			else {
				const getButtons = control.iface().getButtons
				if (typeof getButtons == 'function') {
					buttons = getButtons()
				}
			}

			curInfo = {title, buttons, onReturn, onBack, ctrl: control}

			ctrl.setData({showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name')})
		}	

		this.setButtonVisible = function(buttonsVisible) {

			const {buttons} = curInfo

			for(let btn in buttonsVisible) {
				if (btn in buttons) {
					buttons[btn].visible = buttonsVisible[btn]
				}
			}
			 				
			ctrl.setData({buttons: $$.util.objToArray(buttons, 'name')})
		}


		this.pushPage(rootPage)

	}

});






$$.control.registerControl('breizbot.pdf', {

	template: "<div class=\"toolbar\">\n	<div bn-show=\"wait\" class=\"loading\">\n		<i class=\"fa fa-spinner fa-pulse\"></i> Rendering...\n	</div>\n	<div bn-show=\"!wait\">\n		<button \n			class=\"w3-button\" \n			title=\"Fit\" \n			bn-event=\"click: onFit\">\n				<i class=\"fa fa-expand\"></i>\n		</button>		\n	</div>\n	<div>\n	</div>\n	<div class=\"pages\" bn-show=\"show1\">\n		<div>\n			<button class=\"w3-button\" title=\"previous page\" bn-event=\"click: onPrevPage\">\n				<i class=\"fa fa-angle-left\"></i>\n			</button>	\n\n			<button class=\"w3-button\" title=\"next page\" bn-event=\"click: onNextPage\">\n				<i class=\"fa fa-angle-right\"></i>\n			</button>			\n		</div>\n		<div>\n			Pages: <span bn-text=\"currentPage\"></span> / <span bn-text=\"numPages\"></span>		\n		</div>\n	</div>\n</div>\n	\n<div bn-control=\"brainjs.pdf\" \n	bn-data=\"{worker: \'/brainjs/pdf/worker.js\'}\"\n	bn-iface=\"pdf\"\n	 \n></div>		\n",

	props: {
		url: ''
	},

	deps: ['breizbot.files'],

	init: function (elt, files) {

		const { url } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1,
				wait: false,
				show1: function () {
					return this.numPages > 1 && !this.wait
				}
			},
			events: {
				onNextPage: async function (ev) {
					//console.log('onNextPage')
					ctrl.setData({ wait: true })
					const currentPage = await ctrl.scope.pdf.nextPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onPrevPage: async function (ev) {
					//console.log('onPrevPage')
					ctrl.setData({ wait: true })
					const currentPage = await ctrl.scope.pdf.prevPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onFit: function (ev) {
					ctrl.scope.pdf.fit()
				}

			}
		})

		async function openFile(url, title) {

			ctrl.setData({ wait: true })

			const numPages = await ctrl.scope.pdf.openFile(url)
			console.log('file loaded')
			ctrl.setData({
				title,
				numPages,
				wait: false
			})
		}

		if (url != '') {
			openFile(url)
		}

		this.setData = function (data) {
			console.log('setData', data)
			if (data.url != undefined) {
				openFile(data.url)
			}
		}

	},

	$iface: `
		setData({url})
	`


});





$$.control.registerControl('breizbot.rtc', {

	deps: ['breizbot.rtc', 'breizbot.pager'],

	props: {
		appName: '',
		iconCls: '',
		title: 'Select a friend'
	},

	//template: "<div class=\"toolbar\">\n\n		<div class=\"status\">\n			<p>Status: <span bn-text=\"status\"></span></p>\n		</div>		\n\n		<div>\n			<button \n				title=\"Call a friend\" \n				bn-event=\"click: onCall\"\n				bn-show=\"show1\"\n				class=\"w3-button\"><i class=\"fa fa-phone\"></i></button>\n\n			<button \n				bn-event=\"click: onCancel\"\n				title=\"Cancel\"\n				bn-show=\"show2\"\n				class=\"w3-button\"><i class=\"fa fa-phone-slash\"></i></button>\n\n			<button \n				title=\"Hangup\" \n				bn-event=\"click: onHangup\"\n				bn-show=\"show3\"\n				class=\"w3-button\"><i class=\"fa fa-phone-slash\"></i></button>			\n		</div>\n\n\n</div>\n<div bn-show=\"show4\" bn-bind=\"panel\" class=\"panel\"></div>",

	init: function(elt, rtc, pager) {

		const {appName, iconCls, title} = this.props

		const $children = elt.children().remove()
		elt.append("<div class=\"toolbar\">\n\n		<div class=\"status\">\n			<p>Status: <span bn-text=\"status\"></span></p>\n		</div>		\n\n		<div>\n			<button \n				title=\"Call a friend\" \n				bn-event=\"click: onCall\"\n				bn-show=\"show1\"\n				class=\"w3-button\"><i class=\"fa fa-phone\"></i></button>\n\n			<button \n				bn-event=\"click: onCancel\"\n				title=\"Cancel\"\n				bn-show=\"show2\"\n				class=\"w3-button\"><i class=\"fa fa-phone-slash\"></i></button>\n\n			<button \n				title=\"Hangup\" \n				bn-event=\"click: onHangup\"\n				bn-show=\"show3\"\n				class=\"w3-button\"><i class=\"fa fa-phone-slash\"></i></button>			\n		</div>\n\n\n</div>\n<div bn-show=\"show4\" bn-bind=\"panel\" class=\"panel\"></div>")

		rtc.on('status', (data) => {
			//console.log('status', data)
			ctrl.setData(data)
		})		

		const ctrl = $$.viewController(elt, {
			data: {
				status: 'ready',
				distant: '',
				hasChildren: $children.length > 0,
				show1: function() { 
					return ['ready', 'disconnected', 'refused', 'canceled'].includes(this.status)
				},
				show2: function() {return this.status == 'calling'},
				show3: function() {return this.status == 'connected'},
				show4: function() {return this.status == 'connected' && this.hasChildren}
			},
			events: {
				onCall: function(ev) {
					console.log('onCall')

					pager.pushPage('breizbot.friends', {
						title,
						props: {
							showSelection: true
						},
						buttons: {
							call: {
								title: 'Call',
								icon: 'fa fa-check',
								onClick: function() {
									const selection = this.getSelection()
									if (selection == undefined) {
										$$.ui.showAlert({title: 'Error', content: 'Please select a friend'})
										return
									}
									const {friendUserName, isConnected} = selection
									console.log('userName', friendUserName)
									if (!isConnected) {
										$$.ui.showAlert({
											title: 'Error', 
											content: `User <strong>${friendUserName}</strong> is not connected`
										})
									}
									else {
										pager.popPage(friendUserName)
									}
						
								}
							}
						},
						onReturn: function(userName) {
							rtc.call(userName, appName, iconCls)					
						}						
					})

				},
				onCancel: function(ev) {
					rtc.cancel()
				},
				onHangup: function(ev) {
					rtc.bye()
					elt.trigger('rtchangup')
				}

			}
		})


		ctrl.scope.panel.append($children)		
	}

});
$$.control.registerControl('breizbot.searchbar', {

    template: "<form bn-event=\"submit: onSearch\" bn-bind=\"form\">\n	<input type=\"search\" \n        name=\"value\" \n        bn-attr=\"{placeholder}\"\n		required=\"\" \n		bn-control=\"brainjs.input\">\n	<button class=\"w3-button w3-text-blue\" type=\"submit\" ><i class=\"fa fa-search\"></i></button>\n</form>",

    props: {
        placeholder: ''
    },

    init: function(elt) {

        const {placeholder} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                placeholder
            },
            events: {
                onSearch: async function(ev) {					
					ev.preventDefault()
                    const {value} = $(this).getFormData()
                    elt.trigger('searchbarsubmit', {value})
                }

            }
        })

        this.setValue = function(value) {
            ctrl.scope.form.setFormData({value})
        }
    },
    $iface: `
        setValue(value: string)
    `,
    $events: 'searchbarsubmit'
});11

$$.control.registerControl('breizbot.addUser', {

	template: "<form bn-event=\"submit: onSubmit\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>UserName</label>\n		<input type=\"text\" placeholder=\"username\" name=\"username\" required=\"\">\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Pseudo</label>\n		<input type=\"text\" placeholder=\"pseudo\" name=\"pseudo\" required>\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Location</label>\n		<input type=\"text\" placeholder=\"location\" name=\"location\" required>\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email</label>\n		<input type=\"email\" placeholder=\"email\" name=\"email\" required>	\n	</div>\n	\n	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	props: {
		$pager: null
	},


	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					$pager.popPage($(this).getFormData())
				}
			}
		})

		this.getButtons = function() {
			return {
				create: {
					title: 'Create',
					icon: 'fa fa-check',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}
		
		}

	}

});

$$.control.registerControl('breizbot.users', {
	deps: ['breizbot.users'],

	template: "<div class=\"toolbar\">\n	<button bn-event=\"click: onUpdate\" class=\"w3-btn w3-blue\" title=\"Update\">\n		<i class=\"fa fa-redo\"></i>\n	</button>	\n	<button bn-event=\"click: onAddUser\" class=\"w3-btn w3-blue btnAddUser\" title=\"Add User\">\n		<i class=\"fa fa-user-plus\"></i>\n	</button>	\n</div>\n\n<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-small\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>User Name</th>\n                <th>Pseudo</th>\n                <th>Location</th>\n                <th>Email</th>\n                <th>Create Date</th>\n                <th>Last Login Date</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"data\" bn-event=\"click.delete: onDelete, click.notif: onNotif\">\n  			<tr>\n				<td bn-text=\"$scope.$i.username\"></td>\n				<td bn-text=\"$scope.$i.pseudo\"></td>\n				<td bn-text=\"$scope.$i.location\"></td>\n				<td bn-text=\"$scope.$i.email\"></td>\n				<td >\n					<span bn-text=\"text1\" bn-show=\"show1\"></span>\n				</td>\n				<td>\n					<span bn-show=\"show2\">\n\n						<span bn-text=\"text2\"></span><br>\n						at \n						<span bn-text=\"text3\"></span>\n					</span>\n				</td>\n				<td>\n					<button class=\"delete w3-btn w3-blue\" title=\"Delete User\">\n						<i class=\"fa fa-trash\"></i>\n					</button>\n					<button class=\"notif w3-btn w3-blue\" title=\"Send Notification\">\n						<i class=\"fa fa-bell\"></i>\n					</button>\n				</td>\n			</tr>      	\n\n        </tbody>\n    </table>\n</div>",

	props: {
		$pager: null
	},

	init: function(elt, users) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				data: [],
				text1: function(scope) {
					return new Date(scope.$i.createDate).toLocaleDateString('fr-FR')
				},
				text2: function(scope) {
					return new Date(scope.$i.lastLoginDate).toLocaleDateString('fr-FR')
				},
				text3: function(scope) {
					return new Date(scope.$i.lastLoginDate).toLocaleTimeString('fr-FR')
				},
				show1: function(scope) {
					return scope.$i.createDate != undefined
				},
				show2: function(scope) {
					return scope.$i.lastLoginDate != undefined && scope.$i.lastLoginDate != 0
				}
			},
			events: {
				onAddUser: function(ev) {
					$pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						onReturn: function(data) {
							//console.log('onReturn', data)
							users.add(data).then(getUsers)
						}						
					})
				},
				onDelete: function(ev) {
					const idx = $(this).closest('tr').index()
					const {username} = ctrl.model.data[idx]
					$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
						users.remove(username).then(getUsers)
					})
				},
				onNotif: async function(ev) {
					const idx = $(this).closest('tr').index()
					const {username} = ctrl.model.data[idx]
					const text = await $$.ui.showPrompt({title: 'Send Notification', label: 'Message'})
					if (text != null) {
						users.sendNotif(username, {text})
					}
				},
				onUpdate: function() {
					getUsers()
				}

			}
		})

		function getUsers() {
			users.list().then((data) => {
				console.log('data', data)
				ctrl.setData({data})
			})			
		}

		getUsers()



	}

});

$$.control.registerControl('breizbot.viewer', {

	deps: ['breizbot.files'],

	template: "<div bn-if=\"if1\">\n	<div \n		class=\"image\" \n		bn-control=\"brainjs.image\" \n		bn-data=\"{src: url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>\n	\n</div>\n\n\n<div bn-if=\"if2\">\n	<div \n		class=\"pdf\" \n		bn-control=\"breizbot.pdf\" \n		bn-data=\"{url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>		\n</div>\n\n<div bn-if=\"if3\" class=\"audio\">\n	<audio bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></audio>\n</div>\n\n<div bn-if=\"if4\" class=\"video\">\n	<video bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></video>\n</div>",

	props: {
		type: '',
		url: '#'
	},
	
	init: function(elt, files) {

		let {type, url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
				if1: function() {
					return this.type == 'image'
				},
				if2: function() {
					return this.type == 'pdf'
				},
				if3: function() {
					return this.type == 'audio'
				},
				if4: function() {
					return this.type == 'video'
				}

			}
		})



		this.setData = function(data) {
			//console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({url: data.url})
			}
		}

	},
	$iface: `
		setData({url: string})
		`

});





$$.service.registerService('breizbot.appData', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		let _data = config

		return {
			getData: function() {
				return _data
			},

			saveData: function(data) {
				_data = data
				return http.post('/api/appData', data)
			}
			
		}
	},

	$iface: `
		getData():Data;
		saveData(data):Promise 
		`
});

$$.service.registerService('breizbot.apps', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			listAll: function() {
				return http.get('/api/apps/all')
			}			
		}
	},

	$iface: `
		listAll():Promise;
		`
});

(function() {


	class BrokerClient extends EventEmitter2 {

		constructor() {
			super()

			this.sock = null
			this.isConnected = false
			this.tryReconnect = true
			this.isPingOk = true
			this.topics = new EventEmitter2({wildcard: true})
			this.pingInterval = 10*1000
			this.timeoutId = undefined

			this.registeredTopics = {}

			let {hostname, pathname, protocol} = location
			protocol= (protocol == 'http:') ? 'ws:' : 'wss:'


			this.url = `${protocol}//${hostname}/hmi${pathname}`
		}

		checkPing() {
			this.timeoutId = setTimeout(() => {
				
				if (!this.isPingOk) {
					console.log('timeout ping')
					this.sock.onmessage = null
					this.sock.onclose = null
					this.sock.close()
					this.onClose()
				}
				else {
					this.isPingOk = false
					this.sendMsg({type: 'ping'})
					this.checkPing()
				}
			}, this.pingInterval)			
		}

		onClose() {
			//console.log('onClose')
			if (this.isConnected) {
				console.log('[Broker] Disconnected !')
				this.emit('connected', false)
			}
			this.isConnected = false
			if (this.tryReconnect) {
				setTimeout(() => {this.connect()}, 5000)
			}			
		}

		connect() {

			console.log('try to connect...')

			this.sock = new WebSocket(this.url)
	
			this.sock.onopen = () => {
				console.log("Connected to broker")
				this.isConnected = true
				this.isPingOk = true
				this.emit('connected', true)
				this.checkPing()

			}


			this.sock.onmessage =  (ev) => {
				const msg = JSON.parse(ev.data)

				if (ev.currentTarget != this.sock) {
					console.log('[broker] message bad target', msg.type)
					ev.currentTarget.close()
					return
				}
				//console.log('[Broker] message', msg)
				
				if (msg.type == 'ready') {
					// this.topics.eventNames().forEach((topic) => {
					// 	this.sendMsg({type: 'register', topic})	
					// })		
					Object.keys(this.registeredTopics).forEach((topic) => {
						this.sendMsg({type: 'register', topic})	
					})	

					this.emit('ready', {clientId: msg.clientId})							
				}

				if (msg.type == 'pong') {
					this.isPingOk = true
				}

				if (msg.type == 'notif') {
					this.topics.emit(msg.topic, msg)
				}
				if (msg.type == 'error') {
					console.log('[Broker] log', msg.text)
					this.tryReconnect = false
					this.sock.close()
				}
											
			}

			this.sock.onclose = (ev) => {
				if (ev.currentTarget != this.sock) {
					console.log('[broker] close bad target')
					return
				}				
				console.log('[broker] close')
				if (this.timeoutId != undefined) {
					clearTimeout(this.timeoutId)
					this.timeoutId = undefined					
				}
				this.onClose()
			}

		}


		sendMsg(msg) {
			msg.time = Date.now()
			var text = JSON.stringify(msg)
			if (this.isConnected) {
				//console.log('[Broker] sendMsg', msg)
				this.sock.send(text)
			}
		}

		emitTopic(topic, data) {
			//console.log('[Broker] emitTopic', topic, data)
			var msg = {
				type: 'notif',
				topic,
				data
			}

			this.sendMsg(msg)
		}

		onTopic(topic, callback) {
			this.topics.on(topic, callback)
		}

		register(topic, callback) {
			//console.log('[Broker] register', topic)
			if (this.registeredTopics[topic] == undefined) {
				this.registeredTopics[topic] = 1
			}
			else {
				this.registeredTopics[topic]++;
			}
			this.topics.on(topic, callback)
			this.sendMsg({type: 'register', topic})			
		}

		unregister(topic, callback) {

			this.topics.off(topic, callback)
			// const nbListeners = this.topics.listeners(topic).length

			// if (nbListeners == 0) { // no more listeners for this topic
			// 	this.sendMsg({type: 'unregister', topic})
			// }	
			if (--this.registeredTopics[topic] == 0) {
				delete this.registeredTopics[topic]
				this.sendMsg({type: 'unregister', topic})
			}
		}		


		
	}




	$$.service.registerService('breizbot.broker', {

		init: function(config) {

			const client = new BrokerClient()
			client.connect()

			return client
		},

		$iface: `
			emitTopic(topicName, data);
			register(topicName, callback);
			unregister(topicName, callback);
			onTopic(topicName, callback)

		`
	})


})();


$$.service.registerService('breizbot.cities', {

	deps: ['brainjs.resource'],

	init: function(config, resource) {

		const http = resource('/api/cities')

		return {
			getCountries: function() {
				return http.get('/countries')
			},

			getCities: function(country, search) {
				return http.post('/cities', {country, search})
			}
			
		}
	},

	$iface: `
		getCountries():Promise;
		getCities(country, search):Promise;
		`
});

$$.service.registerService('breizbot.files', {

	deps: ['brainjs.resource'],

	init: function(config, resource) {
		const http = resource('/api/files')
		
		return {
			fileInfo: function(filePath, friendUser, options) {
				console.log('[FileService] fileInfo', filePath, friendUser, options)

				return http.post('/fileInfo', {filePath, friendUser, options})
			},
			list: function(destPath, options, friendUser) {
				console.log('[FileService] list', destPath)

				return http.post('/list', {destPath, options, friendUser})
			},

			fileUrl: function(fileName, friendUser) {
				return $$.util.getUrlParams('/api/files/load', {fileName, friendUser})
			},

			fileThumbnailUrl: function(fileName, size, friendUser) {
				return $$.util.getUrlParams('/api/files/loadThumbnail', {fileName, size, friendUser})
			},

			uploadFile: function(blob, saveAsfileName, destPath, onUploadProgress) {
				console.log('[FileService] uploadFile', saveAsfileName, destPath)
				if (!(blob instanceof Blob)) {
					console.warn('File format not supported')
					return Promise.reject('File format not supported')
				}
				//console.log('blob', blob)
				var fd = new FormData()
				fd.append('file', blob, saveAsfileName)
				fd.append('destPath', destPath)
				return http.postFormData('/save', fd, onUploadProgress)
			},

			removeFiles: function(fileNames) {
				console.log('[FileService] removeFiles', fileNames)
				return http.post('/delete', fileNames)
			},

			mkdir: function(fileName) {
				console.log('[FileService] mkdir', fileName)
				return http.post('/mkdir', {fileName})
			},

			moveFiles: function(fileNames, destPath) {
				console.log('[FileService] moveFiles', fileNames, destPath)
				return http.post('/move', {fileNames, destPath})
			},

			shareFiles: function(fileNames) {
				console.log('[FileService] shareFiles', fileNames)
				return http.post('/move', {fileNames, destPath: '/share'})
			},			

			copyFiles: function(fileNames, destPath) {
				console.log('[FileService] copyFiles', fileNames, destPath)
				return http.post('/copy', {fileNames, destPath})
			},	
			renameFile: function(filePath, oldFileName, newFileName) {
				console.log('[FileService] renameFile', filePath, oldFileName, newFileName)
				return http.post('/rename', {filePath, oldFileName, newFileName})
			},
			resizeImage: function(filePath, fileName, resizeFormat) {
				console.log('[FileService] resizeImage', filePath, fileName, resizeFormat)
				return http.post('/resizeImage', {filePath, fileName, resizeFormat})
			},
			convertToMP3: function(filePath, fileName) {
				console.log('[FileService] convertToMP3', filePath, fileName)
				return http.post('/convertToMP3', {filePath, fileName})
			},
			zipFolder: function(folderPath, folderName) {
				console.log('[FileService] zipFolder', folderPath, folderName)
				return http.post('/zipFolder', {folderPath, folderName})
			},
			unzipFile: function(folderPath, fileName) {
				console.log('[FileService] unzipFile', folderPath, fileName)
				return http.post('/unzipFile', {folderPath, fileName})
			}

		}
	},

	$iface: `
		list(path, options, friendUser):Promise<[FileInfo]>;
		fileInfo(filePath, friendUser, options):Promise<FileInfo>
		fileUrl(fileName, friendUser):string;
		fileThumbnailUrl(fileName, size, friendUser):string;
		uploadFile(blob, saveAsfileName, destPath):Promise;
		removeFiles(fileNames):Promise;
		mkdir(fileName):Promise;
		moveFiles(fileNames, destPath):Promise;
		copyFiles(fileNames, destPath):Promise;
		renameFile(filePath, oldFileName, newFileName):Promise;
		resizeImage(filePath, fileName, resizeFormat):Promise;
		convertToMP3(filePath, fileName):Promise
		zipFolder(folderPath, folderName):Promise
	`

});

$$.service.registerService('breizbot.http', {

	deps: ['brainjs.resource', 'breizbot.params'],

	init: function(config, resource, params) {

		return resource(`/api/app/${params.$appName}`)
	}

});

$$.service.registerService('breizbot.pager', {

	init: function(config) {

		return $('.breizbotPager').iface()
	}

});

$$.service.registerService('breizbot.params', {

	init: function(config) {

		return (typeof config == 'string') ? JSON.parse(config) : {}
	}
});

(function(){

class RTC extends EventEmitter2 {
	constructor(broker, http, params) {

		super()

		this.broker = broker
		this.http = http

		this.srdId = undefined
		this.destId = undefined
		this.distant = ''
		this.status = 'ready'
		this.isCallee = false
		if (params.caller != undefined) {
			this.status = 'connected'
			this.distant = params.caller
			this.destId = params.clientId
			this.isCallee = true
		}

		broker.on('ready', (msg) => {
			this.srcId = msg.clientId
			this.emit('ready')
		})

		broker.onTopic('breizbot.rtc.accept', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.cancel(false)
			this.destId = msg.srcId
			this.status = 'connected'
			this.emitStatus()	
			this.emit('accept')	
		})		

		broker.onTopic('breizbot.rtc.deny', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.status = 'refused'
			this.cancel(false)
			this.emitStatus()
			this.emit('deny')	

		})		

		broker.onTopic('breizbot.rtc.bye', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.status = 'disconnected'
			this.emitStatus()
			this.emit('bye')

		})				
	}

	getRemoteClientId() {
		return this.destId
	}

	processCall() {
		console.log('[RTC] processCall')
		this.broker.register('breizbot.rtc.call', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.destId = msg.srcId
			this.emit('call', msg.data)
		})

		this.broker.register('breizbot.rtc.cancel', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.emit('cancel')
		})		
	}

	onData(name, callback) {
		this.broker.onTopic('breizbot.rtc.' + name, (msg) => {
			if (msg.hist === true) {
				return
			}
			callback(msg.data, msg.time)
		})			
	}

	emitStatus() {
		this.emit('status', {status: this.status, distant: this.distant})
	}

	call(to, appName, iconCls) {
		this.distant = to
		this.status = 'calling'
		this.emitStatus()
		return this.http.post(`/api/rtc/sendToUser`, {
			to,
			srcId: this.srcId,
			type: 'call',
			data: {appName, iconCls}
		})
	}	

	cancel(updateStatus = true) {
		console.log('[RTC] cancel', updateStatus)
		if (updateStatus) {
			this.status = 'canceled'
			this.emitStatus()			
		}
		return this.http.post(`/api/rtc/sendToUser`, {to: this.distant, srcId: this.srcId, type: 'cancel'})
	}	

	accept() {
		console.log('[RTC] accept')

		this.emitStatus()
		return this.sendData('accept')
	}

	deny() {
		console.log('[RTC] deny')

		return this.sendData('deny')
	}

	bye() {
		console.log('[RTC] bye')

		if (this.status == 'connected') {
			this.status = 'ready'
			this.distant = ''
			this.emitStatus()
			return this.sendData('bye')			
		}

		return Promise.resolve()
	}

	exit() {
		if (this.status == 'calling') {
			return this.cancel()
		}
		if (this.status == 'connected') {
			return this.bye()
		}
		return Promise.resolve()
	}

	sendData(type, data) {
		return this.http.post(`/api/rtc/sendToClient`, {
			destId: this.destId, 
			srcId: this.srcId,
			type,
			data
		})
	}	

}

$$.service.registerService('breizbot.rtc', {

	deps: ['brainjs.http', 'breizbot.broker', 'breizbot.params'],

	init: function(config, http, broker, params) {

		return new RTC(broker, http, params)
	},
	$iface: `
		call(to):Promise;
		cancel(to):Promise;
		deny():Promise;
		bye():Promise;
		sendData(type, data):Promise;
		onData(callback(data, time))
	`
});


})();
$$.service.registerService('breizbot.scheduler', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			openApp: function(appName, appParams) {
				console.log('[scheduler] openApp', appName, appParams)
				window.parent.postMessage({
					type: 'openApp',
					 data: {appName, appParams}
					}, location.href)

			},
			logout: function() {
				console.log('[scheduler] logout')
				return http.post('/api/logout')
			}		 
		}
	},

	$iface: `
		openApp(appName, appParams);
		logout()
		`
});

$$.service.registerService('breizbot.users', {

	deps: ['brainjs.resource'],

	init: function(config, resource) {

		const http = resource('/api/users')

		return {
			list: function() {
				return http.get('/')
			},

			match: function(match) {
				return http.get('/', {match})
			},

			add: function(data) {
				return http.post('/', data)
			},

			remove: function(user) {
				return http.delete(`/${user}`)
			},

			update: function(user, data) {
				return http.put(`/${user}`, data)
			},

			get: function(user) {
				return http.get(`/${user}`)
			},

			activateApp: function(appName, activated) {
				return http.post(`/activateApp`, {appName, activated})
			},

			sendNotif: function(to, notif) {
				return http.post(`/sendNotif`, {to, notif})
			},

			removeNotif: function(notifId) {
				return http.delete(`/removeNotif/${notifId}`)
			},

			getNotifs: function() {
				return http.get(`/getNotifs`)
			},
			
			getNotifCount: function() {
				return http.get(`/getNotifCount`)
			},

			getFriends: function() {
				return http.get(`/getFriends`)
			},

			addFriend: function(friendUserName) {
				return http.post(`/addFriend`, {friendUserName})
			},

			changePwd: function(newPwd) {
				return http.post(`/changePwd`, {newPwd})
			},

			addContact: function(name, email) {
				return http.post(`/addContact`, {name, email})
			},
			getContacts: function() {
				return http.get(`/getContacts`)
			},

			removeContact: function(contactId) {
				return http.delete(`/removeContact/${contactId}`)
			},
			
			sendPosition: function(coords) {
				//console.log('sendFriendPosition', coords)
				return http.post('/position', coords)
			}
		}
	},
	$iface: `
		list():Promise;
		add(data):Promise;
		remove(user):Promise;
		update(user, data):Promise;
		get(user):Promise;
		activateApp(appName, activated):Promise;
		sendNotif(to, notif):Promise;
		removeNotif(notifId):Promise;
		getNotifs():Promise;
		getNotifCount():Promise;
		getFriends():Promise;
		addFriend(friendUserName):Promise;
		changePwd(newPwd):Promise;
		addContact(name, email):Promise;
		getContacts():Promise(contacts);
		removeContact(contactId):Promise;
		sendPosition(coords):Promise
	`
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9jb250YWN0cy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwiZnJpZW5kcy9mcmllbmRzLmpzIiwiaG9tZS9ob21lLmpzIiwicGFnZXIvcGFnZXIuanMiLCJwZGYvbWFpbi5qcyIsInJ0Yy9ydGMuanMiLCJzZWFyY2hiYXIvc2VhcmNoYmFyLmpzIiwidXNlcnMvYWRkVXNlci5qcyIsInVzZXJzL3VzZXJzLmpzIiwidmlld2VyL3ZpZXdlci5qcyIsImFwcERhdGEuanMiLCJhcHBzLmpzIiwiYnJva2VyLmpzIiwiY2l0aWVzLmpzIiwiZmlsZXMuanMiLCJodHRwLmpzIiwicGFnZXIuanMiLCJwYXJhbXMuanMiLCJydGMuanMiLCJzY2hlZHVsZXIuanMiLCJ1c2Vycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNydUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJyZWl6Ym90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xuXG4gICAgICBjb25mLmRlbGltaXRlciAmJiAodGhpcy5kZWxpbWl0ZXIgPSBjb25mLmRlbGltaXRlcik7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyAhPT0gdW5kZWZpbmVkID8gY29uZi5tYXhMaXN0ZW5lcnMgOiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG4gICAgICBjb25mLnZlcmJvc2VNZW1vcnlMZWFrICYmICh0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gY29uZi52ZXJib3NlTWVtb3J5TGVhayk7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbG9nUG9zc2libGVNZW1vcnlMZWFrKGNvdW50LCBldmVudE5hbWUpIHtcbiAgICB2YXIgZXJyb3JNc2cgPSAnKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICdsZWFrIGRldGVjdGVkLiAnICsgY291bnQgKyAnIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nO1xuXG4gICAgaWYodGhpcy52ZXJib3NlTWVtb3J5TGVhayl7XG4gICAgICBlcnJvck1zZyArPSAnIEV2ZW50IG5hbWU6ICcgKyBldmVudE5hbWUgKyAnLic7XG4gICAgfVxuXG4gICAgaWYodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW1pdFdhcm5pbmcpe1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgICAgZS5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICBlLmVtaXR0ZXIgPSB0aGlzO1xuICAgICAgZS5jb3VudCA9IGNvdW50O1xuICAgICAgcHJvY2Vzcy5lbWl0V2FybmluZyhlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvck1zZyk7XG5cbiAgICAgIGlmIChjb25zb2xlLnRyYWNlKXtcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBmYWxzZTtcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcbiAgfVxuICBFdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjsgLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgZm9yIGV4cG9ydGluZyBFdmVudEVtaXR0ZXIgcHJvcGVydHlcblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcbiAgICAgICAgdHJlZVtuYW1lXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtuYW1lXTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVyc107XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIXRyZWUuX2xpc3RlbmVycy53YXJuZWQgJiZcbiAgICAgICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCwgbmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gICAgICBpZiAoIXRoaXMuX2NvbmYpIHRoaXMuX2NvbmYgPSB7fTtcbiAgICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgICB9XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuLCBwcmVwZW5kKSB7XG4gICAgdGhpcy5fbWFueShldmVudCwgMSwgZm4sIHByZXBlbmQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIGZhbHNlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCB0cnVlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbiwgcHJlcGVuZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMuX29uKGV2ZW50LCBsaXN0ZW5lciwgcHJlcGVuZCk7XG5cbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2FsbC5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG5cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIC8vIG5lZWQgdG8gbWFrZSBjb3B5IG9mIGhhbmRsZXJzIGJlY2F1c2UgbGlzdCBjYW4gY2hhbmdlIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gb2YgZW1pdCBjYWxsXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0QXN5bmMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoW2ZhbHNlXSk7IH1cbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZXM9IFtdO1xuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGFyZ3VtZW50c1sxXSk7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25BbnkgPSBmdW5jdGlvbihmbiwgcHJlcGVuZCl7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgaWYocHJlcGVuZCl7XG4gICAgICB0aGlzLl9hbGwudW5zaGlmdChmbik7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9vbkFueSh0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGdyb3dMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBDaGFuZ2UgdG8gYXJyYXkuXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhZGRcbiAgICAgIGlmKHByZXBlbmQpe1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0udW5zaGlmdChsaXN0ZW5lcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCAmJlxuICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICkge1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCwgdHlwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyxsZWFmcz1bXTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgIGhhbmRsZXJzID0gbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgKGhhbmRsZXJzLmxpc3RlbmVyICYmIGhhbmRsZXJzLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290KSB7XG4gICAgICBpZiAocm9vdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocm9vdCk7XG4gICAgICBmb3IgKHZhciBpIGluIGtleXMpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBvYmogPSByb290W2tleV07XG4gICAgICAgIGlmICgob2JqIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKSB8fCAob2JqID09PSBudWxsKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgcm9vdFtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3QodGhpcy5saXN0ZW5lclRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKVxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbnNbaV0pO1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgIXRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9ldmVudHMpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiB0aGlzLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuX2FsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWxleGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0KGVsdCwgaHR0cCkge1xuXHRcdGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSlcblxuXHRcdC8vY29uc29sZS5sb2coJ2hhc2gnLCBoYXNoKVxuXHRcdGNvbnN0IHBhcmFtcyA9ICQkLnV0aWwucGFyc2VVcmxQYXJhbXMoaGFzaClcblx0XHQvL2NvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG5cdFx0aHR0cC5wb3N0KCcvYXBpL2FsZXhhL2F1dGgnLCBwYXJhbXMpLnRoZW4oKCkgPT4ge1xuXHRcdFx0d2luZG93LmNsb3NlKClcblx0XHR9KVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBUYWInLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBVcmw6ICdhYm91dDpibGFuaydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmM6IGFwcFVybH1cXFwiIGJuLWJpbmQ9XFxcImlmcmFtZVxcXCIgYm4tZXZlbnQ9XFxcImxvYWQ6IG9uRnJhbWVMb2FkZWRcXFwiPjwvaWZyYW1lPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXHRcdGNvbnN0IHthcHBVcmx9ID0gdGhpcy5wcm9wcztcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwVXJsXHRcdFx0XHRcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GcmFtZUxvYWRlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25GcmFtZUxvYWRlZCcpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFwcEV4aXQgPSBmdW5jdGlvbigpICB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcEV4aXQnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBFeGl0ID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cmV0dXJuIHJvb3RQYWdlLm9uQXBwRXhpdCgpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcdFx0XG5cdFx0fVx0XG5cblx0XHR0aGlzLm9uQXBwU3VzcGVuZCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwU3VzcGVuZCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFN1c3BlbmQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMub25BcHBSZXN1bWUgPSBmdW5jdGlvbigpICB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcFJlc3VtZScsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFJlc3VtZSA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwUmVzdW1lKClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnNldEFwcFVybCA9IGZ1bmN0aW9uKGFwcFVybCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gc2V0QXBwVXJsJywgYXBwVXJsKVxuXHRcdFx0Y3RybC5zZXREYXRhKHthcHBVcmw6IGFwcFVybCArICcmZGF0ZT0nICsgRGF0ZS5ub3coKX0pXG5cdFx0fVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3Quc2NoZWR1bGVyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhcHBzOiBbXSxcblx0XHRzaG93QWN0aXZhdGVkOiBmYWxzZSxcblx0XHRpdGVtczogbnVsbFxuXHR9LFxuXG5cdCRpZmFjZTogJ3NldERhdGEoZGF0YSknLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYXBwc1xcXCIgXFxuXHRcdGJuLWl0ZXI9XFxcImFwcFxcXCIgXFxuXHRcdGNsYXNzPVxcXCJtYWluXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aWxlOiBvblRpbGVDb250ZXh0TWVudVxcXCJcXG5cdFx0Plx0XHRcdFxcblx0XHQ8ZGl2IGJuLWF0dHI9XFxcImNsYXNzMVxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZXRJdGVtc31cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImFycm93LXJpZ2h0XFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuYXBwLnByb3BzLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLmFwcC5wcm9wcy50aXRsZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc2NoZWR1bGVyKSB7XG5cblx0XHRjb25zdCB7YXBwcywgc2hvd0FjdGl2YXRlZCwgaXRlbXN9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRnZXRJdGVtczogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXRJdGVtcycsIHNjb3BlLmFwcClcblx0XHRcdFx0XHRyZXR1cm4gKHR5cGVvZiBpdGVtcyA9PSAnZnVuY3Rpb24nKSA/IGl0ZW1zKHNjb3BlLmFwcCkgOiBpdGVtc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhcHBzLFxuXHRcdFx0XHRzaG93QWN0aXZhdGVkLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zaG93QWN0aXZhdGVkICYmIHNjb3BlLmFwcC5hY3RpdmF0ZWRcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB7Y2xhc3M6IGB0aWxlIHczLWJ0biAke3Njb3BlLmFwcC5wcm9wcy5jb2xvckNsc31gfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIHNjb3BlLmFwcC5wcm9wcy5pY29uQ2xzID09ICdzdHJpbmcnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY2xpY2snLCBjdHJsLm1vZGVsLmFwcHNbaWR4XSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UaWxlQ29udGV4dE1lbnU6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHtjbWR9ID0gZGF0YVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSAkLmV4dGVuZCh7Y21kfSwgY3RybC5tb2RlbC5hcHBzW2lkeF0pXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2FwcGNvbnRleHRtZW51JywgaW5mbylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0YXBwczogZGF0YS5hcHBzLmZpbHRlcigoYSkgPT4gYS5wcm9wcy52aXNpYmxlICE9IGZhbHNlICYmIGEuYXBwTmFtZSAhPSAndGVtcGxhdGUnKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBzZXREYXRhKGRhdGEpYCxcblx0JGV2ZW50czogJ2FwcGNsaWNrO2FwcGNvbnRleHRtZW51J1xufSk7XG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRzaG93U2VsZWN0aW9uOiBmYWxzZSxcblx0XHRzaG93RGVsZXRlQnV0dG9uOiBmYWxzZVxuXHR9LFx0XG5cblx0dGVtcGxhdGU6IFwiPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGNvbnRhY3RzPC9wPlxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLmRlbGV0ZTogb25EZWxldGVJdGVtXFxcIlxcblx0XHRibi1lYWNoPVxcXCJjb250YWN0c1xcXCJcXG5cdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdD5cXG5cdFx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIiBibi1zaG93PVxcXCJzaG93RGVsZXRlQnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5jb250YWN0TmFtZVxcXCI+PC9zdHJvbmc+PGJyPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlIHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmNvbnRhY3RFbWFpbFxcXCI+PC9zcGFuPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2xpPlxcblx0PC91bD5cdFx0XFxuXFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2Vycykge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dEZWxldGVCdXR0b259ID0gdGhpcy5wcm9wc1xuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdFx0c2hvd0RlbGV0ZUJ1dHRvbixcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gY3RybC5tb2RlbC5jb250YWN0c1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0Ly8kKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignY29udGFjdGNsaWNrJywgZGF0YSlcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25EZWxldGVJdGVtOiBhc3luYyBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IGN0cmwubW9kZWwuY29udGFjdHNbaWR4XVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZUl0ZW0nLCBkYXRhKVxuXHRcdFx0XHRcdGF3YWl0IHVzZXJzLnJlbW92ZUNvbnRhY3QoZGF0YS5faWQpXG5cdFx0XHRcdFx0bG9hZCgpXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XG5cdFx0XHRjb25zdCBjb250YWN0cyA9IGF3YWl0IHVzZXJzLmdldENvbnRhY3RzKClcblx0XHRcdGNvbnNvbGUubG9nKCdjb250YWN0cycsIGNvbnRhY3RzKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtjb250YWN0c30pXG5cdFx0fVxuXG5cdFx0bG9hZCgpXG5cblx0XHR0aGlzLnVwZGF0ZSA9IGxvYWRcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCByZXQgPSBbXVxuXHRcdFx0ZWx0LmZpbmQoJ2xpLnczLWJsdWUnKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAgJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdHJldC5wdXNoKGN0cmwubW9kZWwuY29udGFjdHNbaWR4XSlcblx0XHRcdH0pXG5cdFx0XHRjb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHR9LFxuXHQkaWZhY2U6IGBnZXRTZWxlY3Rpb24oKTogW0NvbnRhY3RJbmZvXWAsXG5cdCRldmVudHM6ICdjb250YWN0Y2xpY2snXG59KTtcblxuXG5cblxuIiwiKGZ1bmN0aW9uICgpIHtcblxuXHRmdW5jdGlvbiBnZXRJY29uQ2xhc3MobmFtZSkge1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKClcblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnBkZicpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtcGRmJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLmhkb2MnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLXdvcmQnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcub2dnJykgfHwgbmFtZS5lbmRzV2l0aCgnLm1wMycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtYXVkaW8nXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcubXA0JykgfHwgbmFtZS5lbmRzV2l0aCgnLndlYm0nKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLXZpZGVvJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnppcCcpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtYXJjaGl2ZSdcblx0XHR9XG5cblx0XHRyZXR1cm4gJ2ZhLWZpbGUnXG5cdH1cblxuXHRmdW5jdGlvbiBzb3J0RmlsZXMoZmlsZXMpIHtcblx0XHRmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG5cdFx0XHRpZiAoYS5mb2xkZXIgJiYgIWIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAtMVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFhLmZvbGRlciAmJiBiLmZvbGRlcikge1xuXHRcdFx0XHRyZXR1cm4gMVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSlcblx0XHR9KVxuXHR9XG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblx0XHRwcm9wczoge1xuXHRcdFx0JHBhZ2VyOiBudWxsLFxuXHRcdFx0c2hvd1Rvb2xiYXI6IGZhbHNlLFxuXHRcdFx0aW1hZ2VPbmx5OiBmYWxzZSxcblx0XHRcdGZpbHRlckV4dGVuc2lvbjogdW5kZWZpbmVkLFxuXHRcdFx0Z2V0TVAzSW5mbzogZmFsc2UsXG5cdFx0XHRmcmllbmRVc2VyOiAnJyxcblx0XHRcdG1wM0ZpbHRlcnM6IG51bGxcblx0XHR9LFxuXG5cdFx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCIgYm4tc2hvdz1cXFwic2hvd1Rvb2xiYXJcXFwiIGJuLWJpbmQ9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIiBibi1zaG93PVxcXCIhaXNNb2JpbGVEZXZpY2VcXFwiPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJOZXcgZm9sZGVyXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVGb2xkZXJcXFwiIFxcblx0XHRcdFx0ZGF0YS1jbWQ9XFxcIm5ld0ZvbGRlclxcXCI+XFxuXHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtZm9sZGVyLXBsdXNcXFwiPjwvaT5cXG5cdFx0XHRcdDwvYnV0dG9uPlxcblx0XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdFx0dGl0bGU9XFxcIkltcG9ydCBmaWxlXFxcIiBcXG5cdFx0XHRcdGRhdGEtY21kPVxcXCJpbXBvcnRGaWxlXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkltcG9ydEZpbGVcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXBsb2FkXFxcIj48L2k+XFxuXHRcdFx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0XHR0aXRsZT1cXFwiUmVsb2FkXFxcIiBcXG5cdFx0XHRcdGRhdGEtY21kPVxcXCJyZWxvYWRcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUmVsb2FkXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXN5bmMtYWx0XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXHRcXG5cdFxcblx0XHQ8L2Rpdj5cXG5cdFxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFNlbGVjdGlvblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2xlU2VsZWN0aW9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2hlY2tcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXHRcXG5cdFxcblx0XHQ8L2Rpdj5cXG5cdFxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRGVsZXRlRmlsZXNcXFwiIGJuLXByb3A9XFxcInByb3AxXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkN1dFxcXCIgYm4tcHJvcD1cXFwicHJvcDFcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25DdXRGaWxlc1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWN1dFxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQ29weVxcXCIgYm4tcHJvcD1cXFwicHJvcDFcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Db3B5RmlsZXNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jb3B5XFxcIj48L2k+PC9idXR0b24+XFxuXHRcXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJTaGFyZVxcXCIgYm4tcHJvcD1cXFwicHJvcDJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZUZpbGVzXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0XFxcIj48L2k+PC9idXR0b24+XFxuXHRcXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJQYXN0ZVxcXCIgYm4tcHJvcD1cXFwicHJvcDNcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QYXN0ZUZpbGVzXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGFzdGVcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PC9kaXY+XFxuXHRcXG5cdFxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcImlzTW9iaWxlRGV2aWNlXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiTW9yZSBhY3Rpb25zXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Ub29sYmFyQ29udGV4dE1lbnVcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHQgXHRuZXdGb2xkZXI6IHtuYW1lOiBcXCdOZXcgZm9sZGVyXFwnLCBpY29uOiBcXCdmYXMgZmEtZm9sZGVyLXBsdXNcXCd9LFxcblx0XHRcdFx0IFx0aW1wb3J0RmlsZToge25hbWU6IFxcJ0ltcG9ydCBmaWxlXFwnLCBpY29uOiBcXCdmYXMgZmEtdXBsb2FkXFwnfSxcXG5cdFx0XHRcdCBcdHJlbG9hZDoge25hbWU6IFxcJ1JlbG9hZFxcJywgaWNvbjogXFwnZmFzIGZhLXN5bmMtYWx0XFwnfVxcblx0XHRcdFx0fVxcblx0XHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1lbGxpcHNpcy12XFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJkb3dubG9hZFxcXCIgYm4tc2hvdz1cXFwiaGFzRG93bmxvYWRzXFxcIiBibi1iaW5kPVxcXCJkb3dubG9hZHNcXFwiPlxcblx0PHN0cm9uZyBibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9nZ2xlRG93bmxvYWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duIGZhLWZ3XFxcIj48L2k+XFxuXHRcdFx0VXBsb2Fkczwvc3Ryb25nPlxcblx0PGRpdiBibi1lYWNoPVxcXCJkb3dubG9hZHNcXFwiIGNsYXNzPVxcXCJkb3dubG9hZEl0ZW1zXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtY2FyZCB3My1wYWRkaW5nLXNtYWxsXFxcIj5cXG5cdFx0XHQ8ZGl2IGJuLXRleHQ9XFxcIiRzY29wZS4kaS5maWxlTmFtZVxcXCI+PC9kaXY+XFxuXHRcdFx0PHByb2dyZXNzIG1heD1cXFwiMVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkucGVyY2VudGFnZVxcXCI+PC9wcm9ncmVzcz5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLXRleHQ9XFxcImluZm9cXFwiIGJuLWJpbmQ9XFxcImluZm9cXFwiIGNsYXNzPVxcXCJpbmZvXFxcIj48L2Rpdj5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImxvYWRpbmdcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRsb2FkaW5nIC4uLlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInBhdGhQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnBhdGhJdGVtOiBvblBhdGhJdGVtXFxcIiBibi1zaG93PVxcXCIhbG9hZGluZ1xcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImdldFBhdGhcXFwiIGJuLWluZGV4PVxcXCJpZHhcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1yaWdodFxcXCIgYm4tc2hvdz1cXFwiIWlzRmlyc3RcXFwiPjwvaT5cXG5cdFx0PHNwYW4+XFxuXHRcdFx0PGEgY2xhc3M9XFxcInBhdGhJdGVtXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGhyZWY9XFxcIiNcXFwiIGJuLXNob3c9XFxcIiFpc0xhc3RcXFwiIGJuLWRhdGE9XFxcIntpbmZvOiBnZXRQYXRoSW5mb31cXFwiPjwvYT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGJuLXNob3c9XFxcImlzTGFzdFxcXCIgY2xhc3M9XFxcImxhc3RJdGVtXFxcIj48L3NwYW4+XFxuXFxuXHRcdDwvc3Bhbj5cXG5cdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZ2V0RmlsZXNcXFwiIGJuLWl0ZXI9XFxcImZcXFwiIGJuLWxhenp5PVxcXCIxMFxcXCIgYm4tYmluZD1cXFwiZmlsZXNcXFwiIGNsYXNzPVxcXCJjb250YWluZXJcXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay5mb2xkZXI6IG9uRm9sZGVyQ2xpY2ssIGNsaWNrLmNoZWNrOiBvbkNoZWNrQ2xpY2ssIGNsaWNrLmZpbGU6IG9uRmlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aHVtYm5haWw6IG9uQ29udGV4dE1lbnVcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ0aHVtYm5haWwgdzMtY2FyZC0yXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGdldEl0ZW1zfVxcXCI+XFxuXFxuXHRcdFx0PHNwYW4gYm4taWY9XFxcImlmMVxcXCI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLXNob3c9XFxcInNob3dUb29sYmFyXFxcIiBjbGFzcz1cXFwiY2hlY2sgdzMtY2hlY2tcXFwiPlxcblx0XHRcdDwvc3Bhbj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCIkc2NvcGUuZi5mb2xkZXJcXFwiIGNsYXNzPVxcXCJmb2xkZXIgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLTR4IGZhLWZvbGRlci1vcGVuIHczLXRleHQtYmx1ZS1ncmV5XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIiBibi1pZj1cXFwiaWYxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpZjJcXFwiIGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2xhc3MxfVxcXCI+PC9pPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpc01QM1xcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjbGFzczF9XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8ZGl2PlRpdGxlOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubXAzLnRpdGxlXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cXG5cdFx0XHRcdFx0PGRpdj5BcnRpc3Q6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMuYXJ0aXN0XFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PGRpdiBibi1pZj1cXFwiaWYzXFxcIiBjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IGdldFRodW1ibmFpbFVybH1cXFwiPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERpbWVuc2lvblxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XCIsXG5cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0XHRjb25zdCB0aHVtYm5haWxTaXplID0gJzEwMHg/J1xuXHRcdFx0Y29uc3QgbWF4VXBsb2FkU2l6ZSA9IDEwICogMTAyNCAqIDIwMTQgLy8gMTAgTW9cblxuXHRcdFx0bGV0IHNlbGVjdGVkID0gZmFsc2VcblxuXHRcdFx0bGV0IHtcblx0XHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0aW1hZ2VPbmx5LFxuXHRcdFx0XHRnZXRNUDNJbmZvLFxuXHRcdFx0XHRtcDNGaWx0ZXJzXG5cdFx0XHR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0XHRpZiAoZnJpZW5kVXNlciAhPSAnJykge1xuXHRcdFx0XHRzaG93VG9vbGJhciA9IGZhbHNlXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldFNlbEZpbGVzKCkge1xuXHRcdFx0XHRjb25zdCBzZWxGaWxlcyA9IFtdXG5cdFx0XHRcdGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7IG5hbWUsIGZvbGRlciB9ID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRzZWxGaWxlcy5wdXNoKHsgZmlsZU5hbWU6IGN0cmwubW9kZWwucm9vdERpciArIG5hbWUsIGlkeCwgZm9sZGVyIH0pXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdFx0cmV0dXJuIHNlbEZpbGVzXG5cdFx0XHR9XG5cblxuXHRcdFx0ZnVuY3Rpb24gZ2V0TmJTZWxGaWxlcygpIHtcblx0XHRcdFx0cmV0dXJuIGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmxlbmd0aFxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiB0b2dnbGVTZWxlY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGVjdGVkID0gIXNlbGVjdGVkXG5cdFx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgc2VsZWN0ZWQpXG5cdFx0XHR9XG5cblx0XHRcdGlmIChzaG93VG9vbGJhcikge1xuXHRcdFx0XHRjb25zdCByZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcihlbnRyaWVzID0+IHtcblx0XHRcdFx0XHRjdHJsLm1vZGVsLmlzTW9iaWxlRGV2aWNlID0gJCQudXRpbC5pc01vYmlsZURldmljZSgpXG5cdFx0XHRcdFx0Y3RybC51cGRhdGVOb2RlVHJlZSgndG9vbGJhcicpXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0cmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShlbHQuZ2V0KDApKTtcblxuXHRcdFx0fVxuXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0ZG93bmxvYWRzOiBbXSxcblx0XHRcdFx0XHRoYXNEb3dubG9hZHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRvd25sb2Fkcy5sZW5ndGggPiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc01vYmlsZURldmljZTogZmFsc2UsXG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBbXSxcblx0XHRcdFx0XHRvcGVyYXRpb246ICdub25lJyxcblx0XHRcdFx0XHRuYlNlbGVjdGlvbjogMCxcblx0XHRcdFx0XHRpc1NoYXJlU2VsZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnMsXG5cdFx0XHRcdFx0aW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0bGV0IG5iRmlsZXMgPSAwXG5cdFx0XHRcdFx0XHRsZXQgbmJGb2xkZXJzID0gMFxuXHRcdFx0XHRcdFx0dGhpcy5nZXRGaWxlcygpLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKGkuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGkubmFtZSAhPSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRuYkZvbGRlcnMrK1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRuYkZpbGVzKytcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0bGV0IHJldCA9IFtdXG5cdFx0XHRcdFx0XHRpZiAobmJGb2xkZXJzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG5iRm9sZGVycyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJzYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChuYkZpbGVzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZWApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobmJGaWxlcyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZXNgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldC5qb2luKCcgLyAnKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRpc0luRmlsdGVyOiBmdW5jdGlvbiAobXAzSW5mbykge1xuXHRcdFx0XHRcdFx0dmFyIHJldCA9IHRydWVcblx0XHRcdFx0XHRcdGZvciAodmFyIGYgaW4gdGhpcy5tcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB2YWx1ZSA9IG1wM0luZm9bZl1cblx0XHRcdFx0XHRcdFx0dmFyIGZpbHRlclZhbHVlID0gdGhpcy5tcDNGaWx0ZXJzW2ZdXG5cdFx0XHRcdFx0XHRcdGlmIChmaWx0ZXJWYWx1ZSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0ICY9IChmaWx0ZXJWYWx1ZSA9PT0gdmFsdWUpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiByZXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RmlsZXM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLm1wM0ZpbHRlcnMgPT09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXNcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGVzLmZpbHRlcigoZikgPT4ge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZi5mb2xkZXIgfHwgKGYubXAzICYmIGYubXAzICYmIHRoaXMuaXNJbkZpbHRlcihmLm1wMykpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNNUDM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGdldE1QM0luZm8gJiYgc2NvcGUuZi5tcDMgIT0gdW5kZWZpbmVkICYmIHNjb3BlLmYubXAzLnRpdGxlICE9IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdFx0XHRzY29wZS5mLm1wMy50aXRsZSAhPSAnJ1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0UGF0aDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdGFiID0gKCcvaG9tZScgKyB0aGlzLnJvb3REaXIpLnNwbGl0KCcvJylcblx0XHRcdFx0XHRcdHRhYi5zaGlmdCgpXG5cdFx0XHRcdFx0XHR0YWIucG9wKClcblx0XHRcdFx0XHRcdHJldHVybiB0YWJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzTGFzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IHRoaXMuZ2V0UGF0aCgpLmxlbmd0aCAtIDFcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzRmlyc3Q6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoSW5mbzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRQYXRoKCkuc2xpY2UoMSwgc2NvcGUuaWR4ICsgMSkuam9pbignLycpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldEl0ZW1zOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHJldCA9IHt9XG5cdFx0XHRcdFx0XHRpZiAoc2hvd1Rvb2xiYXIgJiYgc2NvcGUuZi5uYW1lICE9ICcuLicpIHtcblx0XHRcdFx0XHRcdFx0cmV0LmRlbGV0ZSA9IHsgbmFtZTogJ0RlbGV0ZScsIGljb246ICdmYXMgZmEtdHJhc2gnIH1cblx0XHRcdFx0XHRcdFx0cmV0LnJlbmFtZSA9IHsgbmFtZTogJ1JlbmFtZScsIGljb246ICdmYXMgZmEtaS1jdXJzb3InIH1cblx0XHRcdFx0XHRcdFx0aWYgKHNjb3BlLmYuaXNJbWFnZSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldC5tYWtlUmVzaXplZENvcHkgPSB7IG5hbWU6ICdNYWtlIHJlc2l6ZWQgY29weScsIGljb246ICdmYXMgZmEtY29tcHJlc3MtYXJyb3dzLWFsdCcgfVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmICghc2NvcGUuZi5mb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQuZG93bmxvYWQgPSB7IG5hbWU6ICdEb3dubG9hZCcsIGljb246ICdmYXMgZmEtZG93bmxvYWQnIH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoc2NvcGUuZi5uYW1lLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5tcDQnKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldC5jb252ZXJ0VG9NUDMgPSB7IG5hbWU6ICdDb252ZXJ0IHRvIE1QMycgfVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmIChzY29wZS5mLmZvbGRlcikge1xuXHRcdFx0XHRcdFx0XHRcdHJldC56aXBGb2xkZXIgPSB7IG5hbWU6ICdaaXAgRm9sZGVyJywgaWNvbjogJ2ZhcyBmYS1jb21wcmVzcycgfVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmICghc2NvcGUuZi5mb2xkZXIgJiYgc2NvcGUuZi5uYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQudW56aXBGaWxlID0geyBuYW1lOiAnVW56aXAgRmlsZScsIGljb246ICdmYXMgZmEtZXhwYW5kLWFsdCcgfVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiByZXRcblxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0VGh1bWJuYWlsVXJsOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzcnZGaWxlcy5maWxlVGh1bWJuYWlsVXJsKHRoaXMucm9vdERpciArIHNjb3BlLmYubmFtZSwgdGh1bWJuYWlsU2l6ZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlmMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuZi5uYW1lICE9ICcuLidcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlmMjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmICFzY29wZS5mLmlzSW1hZ2UgJiYgIXRoaXMuaXNNUDMoc2NvcGUpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpZjM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiBzY29wZS5mLmlzSW1hZ2Vcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYGZhIGZhLTR4IHczLXRleHQtYmx1ZS1ncmV5ICR7Z2V0SWNvbkNsYXNzKHNjb3BlLmYubmFtZSl9YFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLmYuc2l6ZVxuXHRcdFx0XHRcdFx0bGV0IHVuaXQgPSAnb2N0ZXRzJ1xuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNpemUgPSBNYXRoLmZsb29yKHNpemUgKiAxMCkgLyAxMFxuXHRcdFx0XHRcdFx0cmV0dXJuICdTaXplOiAnICsgc2l6ZSArICcgJyArIHVuaXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RGltZW5zaW9uOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGQgPSBzY29wZS5mLmRpbWVuc2lvblxuXHRcdFx0XHRcdFx0cmV0dXJuIGBEaW1lbnNpb246ICR7ZC53aWR0aH14JHtkLmhlaWdodH1gXG5cdFx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoc2NvcGUuZi5tdGltZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcblx0XHRcdFx0XHRcdHJldHVybiAnTGFzdCBNb2RpZjogJyArIGRhdGVcblxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRwcm9wMTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHsgZGlzYWJsZWQ6IHRoaXMubmJTZWxlY3Rpb24gPT0gMCB9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRwcm9wMjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHsgZGlzYWJsZWQ6IHRoaXMubmJTZWxlY3Rpb24gPT0gMCB8fCB0aGlzLnJvb3REaXIuc3RhcnRzV2l0aCgnL3NoYXJlLycpIHx8IHRoaXMuaXNTaGFyZVNlbGVjdGVkIH1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHByb3AzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4geyBkaXNhYmxlZDogdGhpcy5zZWxlY3RlZEZpbGVzLmxlbmd0aCA9PSAwIH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0b25Ub29sYmFyQ29udGV4dE1lbnU6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9vbGJhckNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRcdGVsdC5maW5kKGBidXR0b25bZGF0YS1jbWQ9JHtkYXRhLmNtZH1dYCkuY2xpY2soKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25Ub2dnbGVEb3dubG9hZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9nZ2xlRG93bmxvYWQnKVxuXHRcdFx0XHRcdFx0Y29uc3QgJGkgPSAkKHRoaXMpLmZpbmQoJ2knKVxuXHRcdFx0XHRcdFx0Y29uc3QgcGFuZWwgPSAkKHRoaXMpLnNpYmxpbmdzKCcuZG93bmxvYWRJdGVtcycpXG5cdFx0XHRcdFx0XHRpZiAoJGkuaGFzQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JykpIHtcblx0XHRcdFx0XHRcdFx0JGkucmVtb3ZlQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JykuYWRkQ2xhc3MoJ2ZhLWNhcmV0LWRvd24nKVxuXHRcdFx0XHRcdFx0XHRwYW5lbC5zbGlkZURvd24oKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1kb3duJykuYWRkQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0Jylcblx0XHRcdFx0XHRcdFx0cGFuZWwuc2xpZGVVcCgpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uUGF0aEl0ZW06IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGF0aEl0ZW0gPSAkKHRoaXMpLmRhdGEoJ2luZm8nKVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUGF0aEl0ZW0nLCBwYXRoSXRlbSlcblx0XHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblxuXHRcdFx0XHRcdFx0bG9hZERhdGEocGF0aEl0ZW0gPT0gJycgPyAnLycgOiAnLycgKyBwYXRoSXRlbSArICcvJylcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uUmVsb2FkOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cdFx0XHRcdFx0XHRjb25zdCB7IGNtZCB9ID0gZGF0YVxuXG5cdFx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdFx0aWYgKGNtZCA9PSAnZG93bmxvYWQnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IHNydkZpbGVzLmZpbGVVcmwocm9vdERpciArIGluZm8ubmFtZSlcblx0XHRcdFx0XHRcdFx0JCQudXRpbC5kb3dubG9hZFVybCh1cmwsIGluZm8ubmFtZSlcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGNtZCA9PSAncmVuYW1lJykge1xuXHRcdFx0XHRcdFx0XHRyZW5hbWUoaW5mbywgaWR4KVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoY21kID09ICdtYWtlUmVzaXplZENvcHknKSB7XG5cdFx0XHRcdFx0XHRcdG1ha2VSZXNpemVkQ29weShpbmZvLCBpZHgpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChjbWQgPT0gJ2NvbnZlcnRUb01QMycpIHtcblx0XHRcdFx0XHRcdFx0Y29udmVydFRvTVAzKGluZm8sIGlkeClcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGNtZCA9PSAnemlwRm9sZGVyJykge1xuXHRcdFx0XHRcdFx0XHR6aXBGb2xkZXIoaW5mbywgaWR4KVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoY21kID09ICd1bnppcEZpbGUnKSB7XG5cdFx0XHRcdFx0XHRcdHVuemlwRmlsZShpbmZvLCBpZHgpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbGV0ZScpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgeyBuYW1lLCBmb2xkZXIgfSA9IGluZm9cblx0XHRcdFx0XHRcdFx0ZGVsZXRlRmlsZXMoW3sgZmlsZU5hbWU6IHJvb3REaXIgKyBuYW1lLCBpZHgsIGZvbGRlciB9XSlcblx0XHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHRcdFx0ZmlsZU5hbWU6IGluZm8ubmFtZSxcblx0XHRcdFx0XHRcdFx0cm9vdERpcjogY3RybC5tb2RlbC5yb290RGlyLFxuXHRcdFx0XHRcdFx0XHRpc0ltYWdlOiBpbmZvLmlzSW1hZ2Vcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkNoZWNrQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cblx0XHRcdFx0XHRcdGlmIChpbmZvLm5hbWUgPT0gJ3NoYXJlJyAmJiBjdHJsLm1vZGVsLnJvb3REaXIgPT0gJy8nKSB7XG5cdFx0XHRcdFx0XHRcdGN0cmwubW9kZWwuaXNTaGFyZVNlbGVjdGVkID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IG5iU2VsZWN0aW9uOiBnZXROYlNlbEZpbGVzKCkgfSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uRm9sZGVyQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblxuXHRcdFx0XHRcdFx0Y29uc3QgZGlyTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Gb2xkZXJDbGljaycsIGRpck5hbWUpXG5cdFx0XHRcdFx0XHRpZiAoZGlyTmFtZSA9PSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHNwbGl0ID0gY3RybC5tb2RlbC5yb290RGlyLnNwbGl0KCcvJylcblx0XHRcdFx0XHRcdFx0c3BsaXQucG9wKClcblx0XHRcdFx0XHRcdFx0c3BsaXQucG9wKClcblx0XHRcdFx0XHRcdFx0bG9hZERhdGEoc3BsaXQuam9pbignLycpICsgJy8nKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLycpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkNyZWF0ZUZvbGRlcjogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0dmFyIHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0XHRcdGNvbnN0IGZvbGRlck5hbWUgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdFx0bGFiZWw6ICdGb2xkZXIgbmFtZTonLFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ05ldyBGb2xkZXInXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZvbGRlck5hbWUnLCBmb2xkZXJOYW1lKVxuXHRcdFx0XHRcdFx0aWYgKGZvbGRlck5hbWUgPT0gbnVsbCkgcmV0dXJuXG5cblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5ta2Rpcihyb290RGlyICsgZm9sZGVyTmFtZSlcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRpbnNlcnRGaWxlKHJlc3ApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uVG9nbGVTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHRvZ2dsZVNlbGVjdGlvbigpXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBuYlNlbGVjdGlvbjogZ2V0TmJTZWxGaWxlcygpIH0pXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uRGVsZXRlRmlsZXM6IGZ1bmN0aW9uIChldikge1xuXG5cdFx0XHRcdFx0XHRjb25zdCBzZWxGaWxlcyA9IGdldFNlbEZpbGVzKClcblxuXHRcdFx0XHRcdFx0aWYgKHNlbEZpbGVzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdEZWxldGUgZmlsZXMnLFxuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBmaWxlcyBzZWxlY3RlZCdcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGRlbGV0ZUZpbGVzKHNlbEZpbGVzKVxuXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkN1dEZpbGVzOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkN1dEZpbGVzJylcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCkubWFwKChpKSA9PiBpLmZpbGVOYW1lKSxcblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY3V0J1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25Db3B5RmlsZXM6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29weUZpbGVzJylcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCkubWFwKChpKSA9PiBpLmZpbGVOYW1lKSxcblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY29weSdcblx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25TaGFyZUZpbGVzOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNoYXJlRmlsZXMnKVxuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IHNydkZpbGVzLnNoYXJlRmlsZXMoZ2V0U2VsRmlsZXMoKS5tYXAoKGkpID0+IGkuZmlsZU5hbWUpKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHNlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJyB9KVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGFzdGVGaWxlczogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25QYXN0ZUZpbGVzJylcblx0XHRcdFx0XHRcdGNvbnN0IHsgcm9vdERpciwgc2VsZWN0ZWRGaWxlcywgb3BlcmF0aW9uIH0gPSBjdHJsLm1vZGVsXG5cblx0XHRcdFx0XHRcdGxldCByZXNwID0gJydcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGlmIChvcGVyYXRpb24gPT0gJ2NvcHknKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVzcCA9IGF3YWl0IHNydkZpbGVzLmNvcHlGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5tb3ZlRmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcilcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHNlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJyB9KVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkltcG9ydEZpbGU6IGZ1bmN0aW9uIChldikge1xuXG5cdFx0XHRcdFx0XHQkJC51dGlsLm9wZW5GaWxlRGlhbG9nKGFzeW5jIGZ1bmN0aW9uIChmaWxlKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVTaXplJywgZmlsZS5zaXplIC8gMTAyNClcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Rvd25sb2FkIGZpbGU6JywgZmlsZS5uYW1lKVxuXHRcdFx0XHRcdFx0XHQvLyBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkU2l6ZSkge1xuXHRcdFx0XHRcdFx0XHQvLyBcdCQkLnVpLnNob3dBbGVydCh7IGNvbnRlbnQ6ICdGaWxlIHRvbyBiaWcnLCB0aXRsZTogJ0ltcG9ydCBmaWxlJyB9KVxuXHRcdFx0XHRcdFx0XHQvLyBcdHJldHVyblxuXHRcdFx0XHRcdFx0XHQvLyB9XG5cdFx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBmaWxlLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRwZXJjZW50YWdlOiAwXG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgeyBkb3dubG9hZHMsIHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRcdFx0XHRkb3dubG9hZHMucHVzaChkYXRhKVxuXHRcdFx0XHRcdFx0XHRcdGN0cmwudXBkYXRlTm9kZVRyZWUoJ2Rvd25sb2FkcycpXG5cblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzcnZGaWxlcy51cGxvYWRGaWxlKGZpbGUsIGZpbGUubmFtZSwgY3RybC5tb2RlbC5yb290RGlyLCBmdW5jdGlvbiAocGVyY2VudENvbXBsZXRlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLnBlcmNlbnRhZ2UgPSBwZXJjZW50Q29tcGxldGVcblx0XHRcdFx0XHRcdFx0XHRcdGN0cmwudXBkYXRlTm9kZVRyZWUoJ2Rvd25sb2FkcycpXG5cdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnRG93bmxvYWQgRmluaXNoZWQ6ICcsIGRhdGEuZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gZG93bmxvYWRzLmluZGV4T2YoZGF0YSlcblx0XHRcdFx0XHRcdFx0XHRkb3dubG9hZHMuc3BsaWNlKGlkeCwgMSlcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGVUcmVlKCdkb3dubG9hZHMnKVxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGZpbGVJbmZvID0gYXdhaXQgc3J2RmlsZXMuZmlsZUluZm8ocm9vdERpciArIGRhdGEuZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0aW5zZXJ0RmlsZShmaWxlSW5mbylcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyBjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCwgdGl0bGU6ICdFcnJvcicgfSlcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH0pXG5cblx0XHRcdGZ1bmN0aW9uIGRlbGV0ZUZpbGVzKGZpbGVOYW1lcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZGVsZXRlRmlsZXMnLCBmaWxlTmFtZXMpXG5cdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0XHRjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nLFxuXHRcdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJ1xuXHRcdFx0XHR9LCBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5yZW1vdmVGaWxlcyhmaWxlTmFtZXMubWFwKChpKSA9PiBpLmZpbGVOYW1lKSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdC8vbG9hZERhdGEoKVx0XG5cdFx0XHRcdFx0XHRmaWxlTmFtZXMucmV2ZXJzZSgpLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0XHRcdFx0Y3RybC5yZW1vdmVBcnJheUl0ZW0oJ2ZpbGVzJywgaS5pZHgsICdmaWxlcycpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0Y3RybC51cGRhdGVOb2RlKCdpbmZvJylcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cblx0XHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWREYXRhKHJvb3REaXIsIHJlc2V0RmlsdGVycykge1xuXHRcdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRyb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc29sZS5sb2coJ2xvYWREYXRhJywgcm9vdERpcilcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbG9hZGluZzogdHJ1ZSB9KVxuXHRcdFx0XHRjb25zdCBmaWxlcyA9IGF3YWl0IHNydkZpbGVzLmxpc3Qocm9vdERpciwgeyBmaWx0ZXJFeHRlbnNpb24sIGltYWdlT25seSwgZ2V0TVAzSW5mbyB9LCBmcmllbmRVc2VyKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXG5cblx0XHRcdFx0aWYgKHJvb3REaXIgIT0gJy8nKSB7XG5cdFx0XHRcdFx0ZmlsZXMudW5zaGlmdCh7IG5hbWU6ICcuLicsIGZvbGRlcjogdHJ1ZSB9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRcdGlmIChyZXNldEZpbHRlcnMgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5tcDNGaWx0ZXJzID0gbnVsbFxuXHRcdFx0XHR9XG5cblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdHJvb3REaXIsXG5cdFx0XHRcdFx0bmJTZWxlY3Rpb246IDAsXG5cdFx0XHRcdFx0aXNTaGFyZVNlbGVjdGVkOiBmYWxzZVxuXHRcdFx0XHR9KVxuXG5cdFx0XHR9XG5cblx0XHRcdGFzeW5jIGZ1bmN0aW9uIHVuemlwRmlsZShpbmZvLCBpZHgpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgc3J2RmlsZXMudW56aXBGaWxlKGN0cmwubW9kZWwucm9vdERpciwgaW5mby5uYW1lKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiB6aXBGb2xkZXIoaW5mbywgaWR4KSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IHNydkZpbGVzLnppcEZvbGRlcihjdHJsLm1vZGVsLnJvb3REaXIsIGluZm8ubmFtZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUFmdGVyKCdmaWxlcycsIGlkeCwgcmVzcCwgJ2ZpbGVzJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gY29udmVydFRvTVAzKGluZm8sIGlkeCkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5jb252ZXJ0VG9NUDMoY3RybC5tb2RlbC5yb290RGlyLCBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1BZnRlcignZmlsZXMnLCBpZHgsIHJlc3AsICdmaWxlcycpXG5cdFx0XHRcdFx0Y3RybC51cGRhdGVOb2RlKCdpbmZvJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGFzeW5jIGZ1bmN0aW9uIG1ha2VSZXNpemVkQ29weShpbmZvLCBpZHgpIHtcblx0XHRcdFx0Y29uc3QgcGVyY2VudGFnZSA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdGxhYmVsOiAnUmVzY2FsZSBwZXJjZW50YWdlOicsXG5cdFx0XHRcdFx0dGl0bGU6ICdNYWtlIHJlc2l6ZWQgY29weScsXG5cdFx0XHRcdFx0YXR0cnM6IHsgbWluOiAxMCwgbWF4OiA5MCwgdHlwZTogJ251bWJlcicgfSxcblx0XHRcdFx0XHR2YWx1ZTogNTBcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRpZiAocGVyY2VudGFnZSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyByb290RGlyIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5yZXNpemVJbWFnZShyb290RGlyLCBpbmZvLm5hbWUsIHBlcmNlbnRhZ2UgKyAnJScpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGN0cmwuaW5zZXJ0QXJyYXlJdGVtQWZ0ZXIoJ2ZpbGVzJywgaWR4LCByZXNwLCAnZmlsZXMnKVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVzJywgY3RybC5tb2RlbC5maWxlcylcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiByZW5hbWUoaW5mbywgaWR4KSB7XG5cdFx0XHRcdGNvbnN0IG9sZEZpbGVOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdGNvbnN0IG5ld0ZpbGVOYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IGxhYmVsOiAnTmV3IG5hbWUnLCB0aXRsZTogJ1JlbmFtZScsIHZhbHVlOiBvbGRGaWxlTmFtZSB9KVxuXHRcdFx0XHRjb25zb2xlLmxvZygnbmV3RmlsZU5hbWUnLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0aWYgKG5ld0ZpbGVOYW1lICE9IG51bGwgJiYgbmV3RmlsZU5hbWUgIT0gb2xkRmlsZU5hbWUpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IHNydkZpbGVzLnJlbmFtZUZpbGUoY3RybC5tb2RlbC5yb290RGlyLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlQXJyYXlJdGVtKCdmaWxlcycsIGlkeCwgcmVzcCwgJ2ZpbGVzJylcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0bG9hZERhdGEoKVxuXG5cdFx0XHRmdW5jdGlvbiBpbnNlcnRGaWxlKGZpbGVJbmZvKSB7XG5cdFx0XHRcdGxldCBpZHggPSBjdHJsLm1vZGVsLmdldEZpbGVzKCkuZmlsdGVyKChmKSA9PiBmLmZvbGRlcikubGVuZ3RoXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1BZnRlcignZmlsZXMnLCBpZHggLSAxLCBmaWxlSW5mbywgJ2ZpbGVzJylcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVzJywgY3RybC5tb2RlbC5maWxlcylcblx0XHRcdFx0Y3RybC51cGRhdGVOb2RlKCdpbmZvJylcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5maWxlcy5maWx0ZXIoKGYpID0+ICFmLmZvbGRlcilcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRGaWx0ZXJlZEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbHRlcigoZikgPT4gIWYuZm9sZGVyKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGUnKVxuXHRcdFx0XHRsb2FkRGF0YSh1bmRlZmluZWQsIGZhbHNlKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZUZpbGUgPSBhc3luYyBmdW5jdGlvbiAoZmlsZU5hbWUsIG9wdGlvbnMpIHtcblx0XHRcdFx0Y29uc3QgeyBmaWxlcywgcm9vdERpciB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRsZXQgaWR4ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbmRJbmRleCgoaSkgPT4gaS5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZUZpbGUnLCBpZHgsIGZpbGVOYW1lLCBvcHRpb25zKVxuXHRcdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgc3J2RmlsZXMuZmlsZUluZm8ocm9vdERpciArIGZpbGVOYW1lLCBmcmllbmRVc2VyLCBvcHRpb25zKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5SXRlbSgnZmlsZXMnLCBpZHgsIGluZm8pXG5cdFx0XHRcdGlkeCA9IGZpbGVzLmZpbmRJbmRleCgoaSkgPT4gaS5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHRmaWxlc1tpZHhdID0gaW5mb1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAobXAzRmlsdGVycykge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBtcDNGaWx0ZXJzIH0pXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0TVAzRmlsdGVycyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwubXAzRmlsdGVyc1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQkaWZhY2U6IGBcblx0XHRcdHVwZGF0ZSgpO1xuXHRcdFx0dXBkYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nLCBvcHRpb25zKTtcblx0XHRcdHNldE1QM0ZpbHRlcnMobXAzRmlsdGVyKTtcblx0XHRcdGdldE1QM0ZpbHRlcnMoKTogTXAzRmlsdGVyO1xuXHRcdFx0Z2V0RmlsZXMoKTogW0ZpbGVJbmZvXTtcblx0XHRcdGdldEZpbHRlcmVkRmlsZXMoKTogW0ZpbGVJbmZvXVxuXHRcdGAsXG5cdFx0JGV2ZW50czogJ2ZpbGVjbGljaydcblxuXHR9KTtcblxufSkoKTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5mcmllbmRzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0c2hvd1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0c2hvd1NlbmRNZXNzYWdlOiBmYWxzZSxcblx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiB0cnVlXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1lYWNoPVxcXCJmcmllbmRzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLm5vdGlmOiBvblNlbmRNZXNzYWdlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1xcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgbm90aWYgdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTWVzc2FnZVxcXCIgYm4tc2hvdz1cXFwic2hvd1NlbmRNZXNzYWdlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGVcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCIgYm4tY2xhc3M9XFxcImNsYXNzMVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5mcmllbmRVc2VyTmFtZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFxcbjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBmcmllbmRzPC9wPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIGJyb2tlcikge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dTZW5kTWVzc2FnZSwgc2hvd0Nvbm5lY3Rpb25TdGF0ZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdLFxuXHRcdFx0XHRzaG93U2VuZE1lc3NhZ2UsXG5cdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZyaWVuZHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0ICRpID0gc2NvcGUuJGlcblx0XHRcdFx0XHRjb25zdCBzaG93Q29ubmVjdGlvblN0YXRlID0gdGhpcy5zaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdCd3My10ZXh0LWdyZWVuJzogJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LXJlZCc6ICEkaS5pc0Nvbm5lY3RlZCAmJiBzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRcdFx0J3czLXRleHQtYmx1ZSc6ICFzaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgdXNlck5hbWUgPSAgY3RybC5tb2RlbC5mcmllbmRzW2lkeF0uZnJpZW5kVXNlck5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZnJpZW5kY2xpY2snLCB7dXNlck5hbWV9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNlbmRNZXNzYWdlOiBhc3luYyBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZW5kTWVzc2FnZScsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGNvbnN0IHRleHQgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTWVzc2FnZScsIGxhYmVsOiAnTWVzc2FnZTonfSlcblxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VyTmFtZSwge3RleHQsIHJlcGx5OiB0cnVlfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiBvblVwZGF0ZShtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHtpc0Nvbm5lY3RlZCwgdXNlck5hbWV9ID0gbXNnLmRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZyaWVuZHMuZmluZCgoZnJpZW5kKSA9PiB7cmV0dXJuIGZyaWVuZC5mcmllbmRVc2VyTmFtZSA9PSB1c2VyTmFtZX0pXG5cdFx0XHRpbmZvLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWRcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBpZHggPSBlbHQuZmluZCgnbGkudzMtYmx1ZScpLmluZGV4KCk7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzW2lkeF1cblx0XHR9XG5cblx0XHR0aGlzLmdldEZyaWVuZHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHMubWFwKChmcmllbmQpID0+IGZyaWVuZC5mcmllbmRVc2VyTmFtZSlcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dXNlcnMuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tmcmllbmRzXSBkaXNwb3NlJylcblx0XHRcdGJyb2tlci51bnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cdFx0fVxuXG5cblx0XHR0aGlzLnVwZGF0ZSgpXG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTpzdHJpbmc7XG5cdFx0Z2V0RnJpZW5kcygpOltzdHJpbmddXG5cdGAsXG5cblx0JGV2ZW50czogJ2ZyaWVuZGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ob21lJywge1xuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QuYnJva2VyJyxcblx0XHQnYnJlaXpib3QudXNlcnMnLFxuXHRcdCdicmVpemJvdC5ydGMnLFxuXHRcdCdicmVpemJvdC5hcHBzJyxcblx0XHQnYnJlaXpib3Quc2NoZWR1bGVyJ1xuXHRdLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlclxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRnVsbFNjcmVlblxcXCIgYm4tc2hvdz1cXFwiIWZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRXhpdCBGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRXhpdEZ1bGxTY3JlZW5cXFwiIGJuLXNob3c9XFxcImZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jb21wcmVzc1xcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDb25uZWN0aW9uIFN0YXR1c1xcXCI+XFxuXHRcdFx0PGkgYm4tY2xhc3M9XFxcInt3My10ZXh0LWdyZWVuOiBjb25uZWN0ZWQsIHczLXRleHQtcmVkOiAhY29ubmVjdGVkfVxcXCIgY2xhc3M9XFxcImZhIGZhLWNpcmNsZVxcXCI+PC9pPlxcblxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJoYXNJbmNvbWluZ0NhbGxcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25DYWxsUmVzcG9uc2VcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJywgXFxuXHRcdFx0XHR0aXRsZTogY2FsbEluZm8uZnJvbSxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGFjY2VwdDoge25hbWU6IFxcJ0FjY2VwdFxcJ30sXFxuXHRcdFx0XHRcdGRlbnk6IHtuYW1lOiBcXCdEZWNsaW5lXFwnfSxcXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2FsbEluZm8uaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cXG5cdDwhLS0gXHQ8c3Ryb25nIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3N0cm9uZz5cXG4gLS0+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZmljYXRpb24gdzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiTm90aWZpY2F0aW9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtYmVsbFxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1iYWRnZSB3My1yZWQgdzMtdGlueVxcXCIgYm4tdGV4dD1cXFwibmJOb3RpZlxcXCIgYm4tc2hvdz1cXFwiaGFzTm90aWZcXFwiPjwvc3Bhbj5cXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie1xcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0cHdkOiB7bmFtZTogXFwnQ2hhbmdlIHBhc3N3b3JkXFwnLCBpY29uOiBcXCdmYXMgZmEtbG9ja1xcJ30sXFxuXHRcdFx0XHRcdGFwcHM6IHtuYW1lOiBcXCdBcHBsaWNhdGlvbnNcXCcsIGljb246IFxcJ2ZhcyBmYS10aFxcJ30sXFxuXHRcdFx0XHRcdHNlcDogXFwnLS0tLS0tXFwnLFxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiBcXCdMb2dvdXRcXCcsIGljb246IFxcJ2ZhcyBmYS1wb3dlci1vZmZcXCd9XFxuXHRcdFx0XHR9LFxcblx0XHRcdFx0dGl0bGU6IHVzZXJOYW1lLFxcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJ1xcblx0XHRcdH1cXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgZmEtbGdcXFwiPjwvaT5cXG5cdFx0XHQ8IS0tIFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidXNlck5hbWVcXFwiPjwvc3Bhbj5cdFxcbiAtLT4gPGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd24gZmEtbGdcXFwiPjwvaT5cXG5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMudGFic1xcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiIGJuLWlmYWNlPVxcXCJ0YWJzXFxcIlxcblx0Ym4tZXZlbnQ9XFxcInRhYnNyZW1vdmU6IG9uVGFiUmVtb3ZlLCB0YWJzYWN0aXZhdGU6IG9uVGFiQWN0aXZhdGVcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0YXBwczogZ2V0TXlBcHBzLFxcblx0XHRcdGl0ZW1zXFxuXHRcdH1cXFwiIGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGljaywgYXBwY29udGV4dG1lbnU6IG9uVGlsZUNvbnRleHRNZW51XFxcIiB0aXRsZT1cXFwiSG9tZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBicm9rZXIsIHVzZXJzLCBydGMsIHNydkFwcHMsIHNjaGVkdWxlcikge1xuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQXVkaW8oKSB7XG5cdFx0XHRsZXQgYXVkaW8gPSBudWxsXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gcGxheScpXG5cdFx0XHRcdFx0YXVkaW8gPSBuZXcgQXVkaW8oJy9hc3NldHMvc2t5cGUubXAzJylcblx0XHRcdFx0XHRhdWRpby5sb29wID0gdHJ1ZVxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4geyBhdWRpby5wbGF5KCkgfSwgMTAwKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBzdG9wJylcblx0XHRcdFx0XHRpZiAoYXVkaW8gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhdWRpbyA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ0Yy5wcm9jZXNzQ2FsbCgpXG5cblx0XHRydGMub24oJ2NhbGwnLCBmdW5jdGlvbiAoY2FsbEluZm8pIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogdHJ1ZSwgY2FsbEluZm8gfSlcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRydGMub24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogZmFsc2UgfSlcblx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdH0pXG5cblx0XHRjb25zdCB7IHVzZXJOYW1lIH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBhdWRpbyA9IGNyZWF0ZUF1ZGlvKClcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW10sXG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsSW5mbzogbnVsbCxcblx0XHRcdFx0ZnVsbFNjcmVlbjogZmFsc2UsXG5cdFx0XHRcdGNvbm5lY3RlZDogZmFsc2UsXG5cdFx0XHRcdGhhc05vdGlmOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubmJOb3RpZiA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0TXlBcHBzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXBwcy5maWx0ZXIoKGEpID0+IGEuYWN0aXZhdGVkKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpdGVtczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRyZW1vdmU6IHsgbmFtZTogJ1JlbW92ZScgfVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0YXdhaXQgdXNlcnMuYWN0aXZhdGVBcHAoZGF0YS5hcHBOYW1lLCBmYWxzZSlcblx0XHRcdFx0XHRsb2FkQXBwKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BcHBDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0b3BlbkFwcChkYXRhLmFwcE5hbWUpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRsb2dvdXQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2FwcHMnKSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdzdG9yZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAncHdkJykge1xuXHRcdFx0XHRcdFx0Y29uc3QgbmV3UHdkID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IHRpdGxlOiAnQ2hhbmdlIFBhc3N3b3JkJywgbGFiZWw6ICdOZXcgUGFzc3dvcmQ6JyB9KVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ25ld1B3ZCcsIG5ld1B3ZClcblx0XHRcdFx0XHRcdGlmIChuZXdQd2QgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLmNoYW5nZVB3ZChuZXdQd2QpXG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdDaGFuZ2UgUGFzc3dvcmQnLCBjb250ZW50OiAnUGFzc3dvcmQgaGFzIGJlZW4gY2hhbmdlZCcgfSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dCB9KVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyBjb250ZW50OiAnbm8gbm90aWZpY2F0aW9ucycsIHRpdGxlOiAnTm90aWZpY2F0aW9ucycgfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdub3RpZicpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNhbGxSZXNwb25zZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzSW5jb21pbmdDYWxsOiBmYWxzZSB9KVxuXHRcdFx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgZnJvbSwgYXBwTmFtZSB9ID0gY3RybC5tb2RlbC5jYWxsSW5mb1xuXHRcdFx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNhbGxlcjogZnJvbSxcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1xuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkV4aXRGdWxsU2NyZWVuOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkV4aXRGdWxsU2NyZWVuJylcblx0XHRcdFx0XHRkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GdWxsU2NyZWVuOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZ1bGxTY3JlZW4nKVxuXHRcdFx0XHRcdGNvbnN0IGVsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcblx0XHRcdFx0XHRjb25zdCByZXF1ZXN0RnVsbHNjcmVlbiA9IGVsZW0ucmVxdWVzdEZ1bGxzY3JlZW4gfHxcblx0XHRcdFx0XHRcdGVsZW0ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW5cblxuXHRcdFx0XHRcdGlmIChyZXF1ZXN0RnVsbHNjcmVlbikge1xuXHRcdFx0XHRcdFx0cmVxdWVzdEZ1bGxzY3JlZW4uY2FsbChlbGVtKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJSZW1vdmU6IGZ1bmN0aW9uIChldiwgaWR4KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UYWJSZW1vdmUnLCBpZHgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcEV4aXQoKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUudGFicy5yZW1vdmVUYWIoaWR4KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiQWN0aXZhdGU6IGZ1bmN0aW9uIChldiwgdWkpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRhYkFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB7IG5ld1RhYiwgb2xkVGFiIH0gPSB1aVxuXHRcdFx0XHRcdGNvbnN0IG5ld1RhYklkeCA9IG5ld1RhYi5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qgb2xkVGFiSWR4ID0gb2xkVGFiLmluZGV4KClcblx0XHRcdFx0XHRpZiAob2xkVGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKG9sZFRhYklkeClcblx0XHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8obmV3VGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID09IDApIHtcblx0XHRcdFx0XHRcdGxvYWRBcHAoKVxuXHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmtpdGZ1bGxzY3JlZW5jaGFuZ2VcIiwgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZnVsbHNjcmVlbmNoYW5nZScsIGV2KVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgZnVsbFNjcmVlbjogIWN0cmwubW9kZWwuZnVsbFNjcmVlbiB9KVxuXHRcdH0pXG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZnVsbHNjcmVlbmNoYW5nZVwiLCBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdmdWxsc2NyZWVuY2hhbmdlJywgZXYpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBmdWxsU2NyZWVuOiAhY3RybC5tb2RlbC5mdWxsU2NyZWVuIH0pXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZU5vdGlmcyhuYk5vdGlmKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBuYk5vdGlmIH0pXG5cblx0XHR9XG5cblx0XHRicm9rZXIub24oJ2Nvbm5lY3RlZCcsIChzdGF0ZSkgPT4ge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgY29ubmVjdGVkOiBzdGF0ZSB9KVxuXHRcdH0pXG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tob21lXSBtZXNzYWdlJywgZXYuZGF0YSlcblx0XHRcdGNvbnN0IHsgdHlwZSwgZGF0YSB9ID0gZXYuZGF0YVxuXHRcdFx0aWYgKHR5cGUgPT0gJ29wZW5BcHAnKSB7XG5cdFx0XHRcdGNvbnN0IHsgYXBwTmFtZSwgYXBwUGFyYW1zIH0gPSBkYXRhXG5cdFx0XHRcdG9wZW5BcHAoYXBwTmFtZSwgYXBwUGFyYW1zKVxuXHRcdFx0fVxuXG5cdFx0fSwgZmFsc2UpXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMobXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5sb2dvdXQnLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHRsb2NhdGlvbi5ocmVmID0gJy9sb2dvdXQnXG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gb3BlbkFwcChhcHBOYW1lLCBwYXJhbXMpIHtcblx0XHRcdGNvbnN0IGFwcEluZm8gPSBjdHJsLm1vZGVsLmFwcHMuZmluZCgoYSkgPT4gYS5hcHBOYW1lID09IGFwcE5hbWUpXG5cdFx0XHRjb25zdCB0aXRsZSA9IGFwcEluZm8ucHJvcHMudGl0bGVcblx0XHRcdC8vY29uc29sZS5sb2coJ29wZW5BcHAnLCBhcHBOYW1lLCBwYXJhbXMpXG5cdFx0XHRsZXQgaWR4ID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZGV4RnJvbVRpdGxlKHRpdGxlKVxuXHRcdFx0Y29uc3QgYXBwVXJsID0gJCQudXRpbC5nZXRVcmxQYXJhbXMoYC9hcHBzLyR7YXBwTmFtZX1gLCBwYXJhbXMpXG5cdFx0XHRpZiAoaWR4IDwgMCkgeyAvLyBhcHBzIG5vdCBhbHJlYWR5IHJ1blxuXHRcdFx0XHRpZHggPSBjdHJsLnNjb3BlLnRhYnMuYWRkVGFiKHRpdGxlLCB7XG5cdFx0XHRcdFx0cmVtb3ZhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdGNvbnRyb2w6ICdicmVpemJvdC5hcHBUYWInLFxuXHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRhcHBVcmxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0aWYgKHBhcmFtcyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5zZXRBcHBVcmwoYXBwVXJsKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2NvcGUudGFicy5zZXRTZWxlY3RlZFRhYkluZGV4KGlkeClcblxuXHRcdH1cblxuXHRcdHVzZXJzLmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblxuXHRcdGZ1bmN0aW9uIGxvYWRBcHAoKSB7XG5cdFx0XHRzcnZBcHBzLmxpc3RBbGwoKS50aGVuKChhcHBzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGFwcHNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHR9XG5cblx0XHRsb2FkQXBwKClcblxuXHRcdHNldEludGVydmFsKHNlbmRQb3NpdGlvbiwgMzAgKiAxMDAwKSAvLyBldmVyeSAzMCBzZWNcblxuXHRcdGxldCBjb29yZHMgPSBudWxsXG5cblx0XHRmdW5jdGlvbiBnZW9FcnJvcihlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZ2VvbG9jIGVycm9yOicsIGUpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTG9jYXRpb24ocG9zaXRpb24pIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3VwZGF0ZUxvY2F0aW9uJywgcG9zaXRpb24pXG5cdFx0XHRjb29yZHMgPSBwb3NpdGlvbi5jb29yZHNcblx0XHR9XG5cblx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKHVwZGF0ZUxvY2F0aW9uKVxuXG5cdFx0bmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24odXBkYXRlTG9jYXRpb24sIGdlb0Vycm9yLFxuXHRcdFx0e1xuXHRcdFx0XHRlbmFibGVIaWdoQWNjdXJhY3k6IHRydWVcblx0XHRcdH1cblx0XHQpXG5cblxuXHRcdGZ1bmN0aW9uIHNlbmRQb3NpdGlvbigpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbmRQb3NpdGlvbicsIGNvb3Jkcylcblx0XHRcdGlmIChjb29yZHMgIT0gbnVsbCkge1xuXHRcdFx0XHR1c2Vycy5zZW5kUG9zaXRpb24oe1xuXHRcdFx0XHRcdGxhdDogY29vcmRzLmxhdGl0dWRlLFxuXHRcdFx0XHRcdGxuZzogY29vcmRzLmxvbmdpdHVkZVxuXHRcdFx0XHR9KVxuXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVxdWVzdFdha2VMb2NrKCkge1xuXHRcdFx0aWYgKG5hdmlnYXRvci53YWtlTG9jayAmJiBuYXZpZ2F0b3Iud2FrZUxvY2sucmVxdWVzdCkge1xuXHRcdFx0XHRuYXZpZ2F0b3Iud2FrZUxvY2sucmVxdWVzdCgnc2NyZWVuJykudGhlbigobG9jaykgPT4ge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCd0YWtlIHdha2VMb2NrJylcblx0XHRcdFx0XHRsb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbGVhc2UnLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnV2FrZSBMb2NrIHdhcyByZWxlYXNlZCcpXG5cdFx0XHRcdFx0ICB9KVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKCdXYWtlTG9jaycsIGUpXG5cdFx0XHRcdH0pXG5cdFx0XG5cdFx0XHR9XG5cdFx0XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIG9uVmlzaWJpbGl0eUNoYW5nZSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCd2aXNpYmlsaXR5Y2hhbmdlJywgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlKVxuXHRcdFx0aWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG5cdFx0XHRcdHJlcXVlc3RXYWtlTG9jaygpXG5cdFx0XHR9XHRcblx0XHR9XG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgb25WaXNpYmlsaXR5Q2hhbmdlKVxuXG5cdFx0cmVxdWVzdFdha2VMb2NrKClcblxuXHR9XG59KTtcbiIsIlxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnBhZ2VyJywge1xuXG5cdHByb3BzOiB7XG5cdFx0cm9vdFBhZ2U6ICcnXG5cdH0sXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwic2hvd0JhY2tcXFwiIGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImxlZnRcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJCYWNrXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQmFja1xcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFycm93LWxlZnRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdDxzcGFuIGJuLXRleHQ9XFxcInRpdGxlXFxcIiBjbGFzcz1cXFwidGl0bGVcXFwiPjwvc3Bhbj5cXG5cdFxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImJ1dHRvbnNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb246IG9uQWN0aW9uXFxcIj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBhY3Rpb25cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sYWJlbFxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInNob3cyXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgYm4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLnRpdGxlfVxcXCI+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgYm4tYmluZD1cXFwiY29udGVudFxcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiPjwvZGl2PlwiLFxuXG5cdCRpZmFjZTogYFxuXHRcdHBvcFBhZ2UoZGF0YSlcblx0XHRwdXNoUGFnZShjdHJsTmFtZSwgb3B0aW9ucylcblx0XHRzZXRCdXR0b25WaXNpYmxlKGJ1dHRvbnNWaXNpYmxlOiB7W2J1dHRvbk5hbWVdOmJvb2xlYW59KVxuXHRgLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3Qge3Jvb3RQYWdlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2hvd0JhY2s6IGZhbHNlLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGJ1dHRvbnM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaWNvbiA9PSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmljb24gIT0gdW5kZWZpbmVkICYmICEoc2NvcGUuJGkudmlzaWJsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25CYWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQmFjaycpXG5cdFx0XHRcdFx0cmVzdG9yZVBhZ2UodHJ1ZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BY3Rpb246IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdGNvbnN0IHBhZ2VDdHJsSWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0XHRcdGNvbnN0IGZuID0gY3VySW5mby5idXR0b25zW2NtZF0ub25DbGlja1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0Zm4uY2FsbChwYWdlQ3RybElmYWNlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBjb250ZW50ID0gY3RybC5zY29wZS5jb250ZW50XG5cdFx0Y29uc3Qgc3RhY2sgPSBbXVxuXHRcdGxldCBjdXJJbmZvID0gbnVsbFxuXG5cblx0XHRmdW5jdGlvbiByZXN0b3JlUGFnZShpc0JhY2ssIGRhdGEpIHtcblx0XHRcdFxuXHRcdFx0Y29uc3QgaWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygncG9wUGFnZScsIHBhZ2VDdHJsKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNhZmVFbXB0eSgpLnJlbW92ZSgpXG5cdFx0XHRpZiAoaXNCYWNrKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgY3VySW5mby5vbkJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGN1ckluZm8ub25CYWNrKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZW9mIGN1ckluZm8ub25SZXR1cm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRjdXJJbmZvLm9uUmV0dXJuKGRhdGEpXG5cdFx0XHR9XG5cblx0XHRcdGN1ckluZm8gPSBzdGFjay5wb3AoKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNob3coKVxuXHRcdFx0Y29uc3Qge3RpdGxlLCBidXR0b25zfSA9IGN1ckluZm9cblx0XHRcdGN0cmwuc2V0RGF0YSh7c2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKX0pXG5cblx0XHR9XG5cblx0XHR0aGlzLnBvcFBhZ2UgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRyZXR1cm4gcmVzdG9yZVBhZ2UoZmFsc2UsIGRhdGEpXG5cdFx0fVxuXG5cdFx0dGhpcy5wdXNoUGFnZSA9IGZ1bmN0aW9uKGN0cmxOYW1lLCBvcHRpb25zKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbcGFnZXJdIHB1c2hQYWdlJywgY3RybE5hbWUsIG9wdGlvbnMpXG5cblxuXHRcdFx0aWYgKGN1ckluZm8gIT0gbnVsbCkge1xuXHRcdFx0XHRjdXJJbmZvLmN0cmwuaGlkZSgpXG5cdFx0XHRcdHN0YWNrLnB1c2goY3VySW5mbylcblx0XHRcdH1cblxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuXHRcdFx0bGV0IHt0aXRsZSwgcHJvcHMsIG9uUmV0dXJuLCBvbkJhY2ssIGV2ZW50c30gPSBvcHRpb25zXG5cblx0XHRcdGNvbnN0IGNvbnRyb2wgPSBjb250ZW50LmFkZENvbnRyb2woY3RybE5hbWUsICQuZXh0ZW5kKHskcGFnZXI6IHRoaXN9LCBwcm9wcyksIGV2ZW50cylcblxuXHRcdFx0bGV0IGJ1dHRvbnMgPSB7fVxuXG5cdFx0XHRpZiAob3B0aW9ucy5idXR0b25zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRidXR0b25zID0gb3B0aW9ucy5idXR0b25zXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgZ2V0QnV0dG9ucyA9IGNvbnRyb2wuaWZhY2UoKS5nZXRCdXR0b25zXG5cdFx0XHRcdGlmICh0eXBlb2YgZ2V0QnV0dG9ucyA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0YnV0dG9ucyA9IGdldEJ1dHRvbnMoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN1ckluZm8gPSB7dGl0bGUsIGJ1dHRvbnMsIG9uUmV0dXJuLCBvbkJhY2ssIGN0cmw6IGNvbnRyb2x9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7c2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKX0pXG5cdFx0fVx0XG5cblx0XHR0aGlzLnNldEJ1dHRvblZpc2libGUgPSBmdW5jdGlvbihidXR0b25zVmlzaWJsZSkge1xuXG5cdFx0XHRjb25zdCB7YnV0dG9uc30gPSBjdXJJbmZvXG5cblx0XHRcdGZvcihsZXQgYnRuIGluIGJ1dHRvbnNWaXNpYmxlKSB7XG5cdFx0XHRcdGlmIChidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdGJ1dHRvbnNbYnRuXS52aXNpYmxlID0gYnV0dG9uc1Zpc2libGVbYnRuXVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHQgXHRcdFx0XHRcblx0XHRcdGN0cmwuc2V0RGF0YSh7YnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXHRcdH1cblxuXG5cdFx0dGhpcy5wdXNoUGFnZShyb290UGFnZSlcblxuXHR9XG5cbn0pO1xuXG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wZGYnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIndhaXRcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT4gUmVuZGVyaW5nLi4uXFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwiIXdhaXRcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJGaXRcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25GaXRcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcInBhZ2VzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwicHJldmlvdXMgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1sZWZ0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJuZXh0IHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtcmlnaHRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXY+XFxuXHRcdFx0UGFnZXM6IDxzcGFuIGJuLXRleHQ9XFxcImN1cnJlbnRQYWdlXFxcIj48L3NwYW4+IC8gPHNwYW4gYm4tdGV4dD1cXFwibnVtUGFnZXNcXFwiPjwvc3Bhbj5cdFx0XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXHRcXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucGRmXFxcIiBcXG5cdGJuLWRhdGE9XFxcInt3b3JrZXI6IFxcJy9icmFpbmpzL3BkZi93b3JrZXIuanNcXCd9XFxcIlxcblx0Ym4taWZhY2U9XFxcInBkZlxcXCJcXG5cdCBcXG4+PC9kaXY+XHRcdFxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0dXJsOiAnJ1xuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBmaWxlcykge1xuXG5cdFx0Y29uc3QgeyB1cmwgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bnVtUGFnZXM6IDAsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0Y3VycmVudFBhZ2U6IDEsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm51bVBhZ2VzID4gMSAmJiAhdGhpcy53YWl0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25OZXh0UGFnZTogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25OZXh0UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRQYWdlID0gYXdhaXQgY3RybC5zY29wZS5wZGYubmV4dFBhZ2UoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZSB9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUHJldlBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9IGF3YWl0IGN0cmwuc2NvcGUucGRmLnByZXZQYWdlKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50UGFnZSwgd2FpdDogZmFsc2UgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpdDogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y3RybC5zY29wZS5wZGYuZml0KClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIG9wZW5GaWxlKHVybCwgdGl0bGUpIHtcblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXG5cdFx0XHRjb25zdCBudW1QYWdlcyA9IGF3YWl0IGN0cmwuc2NvcGUucGRmLm9wZW5GaWxlKHVybClcblx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIGxvYWRlZCcpXG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0bnVtUGFnZXMsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGlmICh1cmwgIT0gJycpIHtcblx0XHRcdG9wZW5GaWxlKHVybClcblx0XHR9XG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3NldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRvcGVuRmlsZShkYXRhLnVybClcblx0XHRcdH1cblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmx9KVxuXHRgXG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcE5hbWU6ICcnLFxuXHRcdGljb25DbHM6ICcnLFxuXHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJ1xuXHR9LFxuXG5cdC8vdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInN0YXR1c1xcXCI+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbmNlbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cyXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2FwcE5hbWUsIGljb25DbHMsIHRpdGxlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0ICRjaGlsZHJlbiA9IGVsdC5jaGlsZHJlbigpLnJlbW92ZSgpXG5cdFx0ZWx0LmFwcGVuZChcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzdGF0dXNcXFwiPlxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmVcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG48ZGl2IGJuLXNob3c9XFxcInNob3c0XFxcIiBibi1iaW5kPVxcXCJwYW5lbFxcXCIgY2xhc3M9XFxcInBhbmVsXFxcIj48L2Rpdj5cIilcblxuXHRcdHJ0Yy5vbignc3RhdHVzJywgKGRhdGEpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3N0YXR1cycsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoZGF0YSlcblx0XHR9KVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0XHRkaXN0YW50OiAnJyxcblx0XHRcdFx0aGFzQ2hpbGRyZW46ICRjaGlsZHJlbi5sZW5ndGggPiAwLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7IFxuXHRcdFx0XHRcdHJldHVybiBbJ3JlYWR5JywgJ2Rpc2Nvbm5lY3RlZCcsICdyZWZ1c2VkJywgJ2NhbmNlbGVkJ10uaW5jbHVkZXModGhpcy5zdGF0dXMpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2NhbGxpbmcnfSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJ30sXG5cdFx0XHRcdHNob3c0OiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcgJiYgdGhpcy5oYXNDaGlsZHJlbn1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNhbGwnKVxuXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dTZWxlY3Rpb246IHRydWVcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRidXR0b25zOiB7XG5cdFx0XHRcdFx0XHRcdGNhbGw6IHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0NhbGwnLFxuXHRcdFx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB0aGlzLmdldFNlbGVjdGlvbigpXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoc2VsZWN0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGZyaWVuZCd9KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHtmcmllbmRVc2VyTmFtZSwgaXNDb25uZWN0ZWR9ID0gc2VsZWN0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlck5hbWUnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJywgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogYFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odXNlck5hbWUpIHtcblx0XHRcdFx0XHRcdFx0cnRjLmNhbGwodXNlck5hbWUsIGFwcE5hbWUsIGljb25DbHMpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdydGNoYW5ndXAnKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRjdHJsLnNjb3BlLnBhbmVsLmFwcGVuZCgkY2hpbGRyZW4pXHRcdFxuXHR9XG5cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5zZWFyY2hiYXInLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCIgYm4tYmluZD1cXFwiZm9ybVxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwic2VhcmNoXFxcIiBcXG4gICAgICAgIG5hbWU9XFxcInZhbHVlXFxcIiBcXG4gICAgICAgIGJuLWF0dHI9XFxcIntwbGFjZWhvbGRlcn1cXFwiXFxuXHRcdHJlcXVpcmVkPVxcXCJcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0XFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My10ZXh0LWJsdWVcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCIgPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XCIsXG5cbiAgICBwcm9wczoge1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cbiAgICAgICAgY29uc3Qge3BsYWNlaG9sZGVyfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvblNlYXJjaDogYXN5bmMgZnVuY3Rpb24oZXYpIHtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7dmFsdWV9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG4gICAgICAgICAgICAgICAgICAgIGVsdC50cmlnZ2VyKCdzZWFyY2hiYXJzdWJtaXQnLCB7dmFsdWV9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgY3RybC5zY29wZS5mb3JtLnNldEZvcm1EYXRhKHt2YWx1ZX0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgICRpZmFjZTogYFxuICAgICAgICBzZXRWYWx1ZSh2YWx1ZTogc3RyaW5nKVxuICAgIGAsXG4gICAgJGV2ZW50czogJ3NlYXJjaGJhcnN1Ym1pdCdcbn0pOzExXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWRkVXNlcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Vc2VyTmFtZTwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwidXNlcm5hbWVcXFwiIG5hbWU9XFxcInVzZXJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+UHNldWRvPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJwc2V1ZG9cXFwiIG5hbWU9XFxcInBzZXVkb1xcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkxvY2F0aW9uPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJsb2NhdGlvblxcXCIgbmFtZT1cXFwibG9jYXRpb25cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgcGxhY2Vob2xkZXI9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ+XHRcXG5cdDwvZGl2Plxcblx0XFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHQkcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjcmVhdGU6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0NyZWF0ZScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcblx0XHR9XG5cblx0fVxuXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC51c2VycycsIHtcblx0ZGVwczogWydicmVpemJvdC51c2VycyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJVcGRhdGVcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtcmVkb1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIiB0aXRsZT1cXFwiQWRkIFVzZXJcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1wbHVzXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+VXNlciBOYW1lPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlBzZXVkbzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Mb2NhdGlvbjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5FbWFpbDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5DcmVhdGUgRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5MYXN0IExvZ2luIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uczwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiZGF0YVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGUsIGNsaWNrLm5vdGlmOiBvbk5vdGlmXFxcIj5cXG4gIFx0XHRcdDx0cj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudXNlcm5hbWVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBzZXVkb1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubG9jYXRpb25cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkID5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8c3BhbiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDJcXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHRcdFx0YXQgXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDNcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwiZGVsZXRlIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiRGVsZXRlIFVzZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWYgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdDwvdHI+ICAgICAgXHRcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YTogW10sXG5cdFx0XHRcdHRleHQxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5jcmVhdGVEYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkubGFzdExvZ2luRGF0ZSkudG9Mb2NhbGVUaW1lU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5jcmVhdGVEYXRlICE9IHVuZGVmaW5lZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSB1bmRlZmluZWQgJiYgc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRVc2VyOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuYWRkVXNlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHR1c2Vycy5hZGQoZGF0YSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHt1c2VybmFtZX0gPSBjdHJsLm1vZGVsLmRhdGFbaWR4XVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ0RlbGV0ZSBVc2VyJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0dXNlcnMucmVtb3ZlKHVzZXJuYW1lKS50aGVuKGdldFVzZXJzKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWY6IGFzeW5jIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7dXNlcm5hbWV9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE5vdGlmaWNhdGlvbicsIGxhYmVsOiAnTWVzc2FnZSd9KVxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VybmFtZSwge3RleHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25VcGRhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuXHRcdFx0dXNlcnMubGlzdCgpLnRoZW4oKGRhdGEpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2RhdGF9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRnZXRVc2VycygpXG5cblxuXG5cdH1cblxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3Qudmlld2VyJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWlmPVxcXCJpZjFcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcImltYWdlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5pbWFnZVxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcIntzcmM6IHVybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBibi1pZj1cXFwiaWYyXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJwZGZcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmVpemJvdC5wZGZcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7dXJsfVxcXCIgXFxuXHRcdFxcblx0XHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlmM1xcXCIgY2xhc3M9XFxcImF1ZGlvXFxcIj5cXG5cdDxhdWRpbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L2F1ZGlvPlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlmNFxcXCIgY2xhc3M9XFxcInZpZGVvXFxcIj5cXG5cdDx2aWRlbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L3ZpZGVvPlxcbjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0dHlwZTogJycsXG5cdFx0dXJsOiAnIydcblx0fSxcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXMpIHtcblxuXHRcdGxldCB7dHlwZSwgdXJsfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dXJsLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRpZjE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2ltYWdlJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3BkZidcblx0XHRcdFx0fSxcblx0XHRcdFx0aWYzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdhdWRpbydcblx0XHRcdFx0fSxcblx0XHRcdFx0aWY0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICd2aWRlbydcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbVmlld2VyXSBzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCkge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3VybDogZGF0YS51cmx9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmw6IHN0cmluZ30pXG5cdFx0YFxuXG59KTtcblxuXG5cblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcERhdGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdGxldCBfZGF0YSA9IGNvbmZpZ1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldERhdGE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gX2RhdGFcblx0XHRcdH0sXG5cblx0XHRcdHNhdmVEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdF9kYXRhID0gZGF0YVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2FwcERhdGEnLCBkYXRhKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldERhdGEoKTpEYXRhO1xuXHRcdHNhdmVEYXRhKGRhdGEpOlByb21pc2UgXG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3RBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0QWxsKCk6UHJvbWlzZTtcblx0XHRgXG59KTtcbiIsIihmdW5jdGlvbigpIHtcblxuXG5cdGNsYXNzIEJyb2tlckNsaWVudCBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXG5cdFx0Y29uc3RydWN0b3IoKSB7XG5cdFx0XHRzdXBlcigpXG5cblx0XHRcdHRoaXMuc29jayA9IG51bGxcblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSB0cnVlXG5cdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0dGhpcy50b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7d2lsZGNhcmQ6IHRydWV9KVxuXHRcdFx0dGhpcy5waW5nSW50ZXJ2YWwgPSAxMCoxMDAwXG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFxuXG5cdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3MgPSB7fVxuXG5cdFx0XHRsZXQge2hvc3RuYW1lLCBwYXRobmFtZSwgcHJvdG9jb2x9ID0gbG9jYXRpb25cblx0XHRcdHByb3RvY29sPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRcdHRoaXMudXJsID0gYCR7cHJvdG9jb2x9Ly8ke2hvc3RuYW1lfS9obWkke3BhdGhuYW1lfWBcblx0XHR9XG5cblx0XHRjaGVja1BpbmcoKSB7XG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCF0aGlzLmlzUGluZ09rKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3RpbWVvdXQgcGluZycpXG5cdFx0XHRcdFx0dGhpcy5zb2NrLm9ubWVzc2FnZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2suY2xvc2UoKVxuXHRcdFx0XHRcdHRoaXMub25DbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncGluZyd9KVxuXHRcdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGhpcy5waW5nSW50ZXJ2YWwpXHRcdFx0XG5cdFx0fVxuXG5cdFx0b25DbG9zZSgpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQ2xvc2UnKVxuXHRcdFx0aWYgKHRoaXMuaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0dGhpcy5lbWl0KCdjb25uZWN0ZWQnLCBmYWxzZSlcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRoaXMudHJ5UmVjb25uZWN0KSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge3RoaXMuY29ubmVjdCgpfSwgNTAwMClcblx0XHRcdH1cdFx0XHRcblx0XHR9XG5cblx0XHRjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHR0aGlzLnNvY2sgPSBuZXcgV2ViU29ja2V0KHRoaXMudXJsKVxuXHRcblx0XHRcdHRoaXMuc29jay5vbm9wZW4gPSAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIHRydWUpXG5cdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuc29jay5vbm1lc3NhZ2UgPSAgKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSB0aGlzLnNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gbWVzc2FnZSBiYWQgdGFyZ2V0JywgbXNnLnR5cGUpXG5cdFx0XHRcdFx0ZXYuY3VycmVudFRhcmdldC5jbG9zZSgpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gbWVzc2FnZScsIG1zZylcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAncmVhZHknKSB7XG5cdFx0XHRcdFx0Ly8gdGhpcy50b3BpY3MuZXZlbnROYW1lcygpLmZvckVhY2goKHRvcGljKSA9PiB7XG5cdFx0XHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFxuXHRcdFx0XHRcdC8vIH0pXHRcdFxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMucmVnaXN0ZXJlZFRvcGljcykuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0fSlcdFxuXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWFkeScsIHtjbGllbnRJZDogbXNnLmNsaWVudElkfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRoaXMudG9waWNzLmVtaXQobXNnLnRvcGljLCBtc2cpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSBmYWxzZVxuXHRcdFx0XHRcdHRoaXMuc29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gdGhpcy5zb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlIGJhZCB0YXJnZXQnKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlJylcblx0XHRcdFx0aWYgKHRoaXMudGltZW91dElkICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRJZClcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLm9uQ2xvc2UoKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cblx0XHRzZW5kTXNnKG1zZykge1xuXHRcdFx0bXNnLnRpbWUgPSBEYXRlLm5vdygpXG5cdFx0XHR2YXIgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHNlbmRNc2cnLCBtc2cpXG5cdFx0XHRcdHRoaXMuc29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdHZhciBtc2cgPSB7XG5cdFx0XHRcdHR5cGU6ICdub3RpZicsXG5cdFx0XHRcdHRvcGljLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0b25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRyZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAodGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9IDFcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFx0XHRcblx0XHR9XG5cblx0XHR1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0aGlzLnRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0Ly8gY29uc3QgbmJMaXN0ZW5lcnMgPSB0aGlzLnRvcGljcy5saXN0ZW5lcnModG9waWMpLmxlbmd0aFxuXG5cdFx0XHQvLyBpZiAobmJMaXN0ZW5lcnMgPT0gMCkgeyAvLyBubyBtb3JlIGxpc3RlbmVycyBmb3IgdGhpcyB0b3BpY1xuXHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0Ly8gfVx0XG5cdFx0XHRpZiAoLS10aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljfSlcblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cblx0XHRcblx0fVxuXG5cblxuXG5cdCQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCB7XG5cblx0XHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdFx0Y29uc3QgY2xpZW50ID0gbmV3IEJyb2tlckNsaWVudCgpXG5cdFx0XHRjbGllbnQuY29ubmVjdCgpXG5cblx0XHRcdHJldHVybiBjbGllbnRcblx0XHR9LFxuXG5cdFx0JGlmYWNlOiBgXG5cdFx0XHRlbWl0VG9waWModG9waWNOYW1lLCBkYXRhKTtcblx0XHRcdHJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0dW5yZWdpc3Rlcih0b3BpY05hbWUsIGNhbGxiYWNrKTtcblx0XHRcdG9uVG9waWModG9waWNOYW1lLCBjYWxsYmFjaylcblxuXHRcdGBcblx0fSlcblxuXG59KSgpO1xuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuY2l0aWVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9jaXRpZXMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldENvdW50cmllczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2NvdW50cmllcycpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRDaXRpZXM6IGZ1bmN0aW9uKGNvdW50cnksIHNlYXJjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY2l0aWVzJywge2NvdW50cnksIHNlYXJjaH0pXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0Q291bnRyaWVzKCk6UHJvbWlzZTtcblx0XHRnZXRDaXRpZXMoY291bnRyeSwgc2VhcmNoKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvZmlsZXMnKVxuXHRcdFxuXHRcdHJldHVybiB7XG5cdFx0XHRmaWxlSW5mbzogZnVuY3Rpb24oZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gZmlsZUluZm8nLCBmaWxlUGF0aCwgZnJpZW5kVXNlciwgb3B0aW9ucylcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZmlsZUluZm8nLCB7ZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnN9KVxuXHRcdFx0fSxcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uKGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGxpc3QnLCBkZXN0UGF0aClcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvbGlzdCcsIHtkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHtmaWxlTmFtZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVGh1bWJuYWlsVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHtmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGxvYWRGaWxlOiBmdW5jdGlvbihibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgsIG9uVXBsb2FkUHJvZ3Jlc3MpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gdXBsb2FkRmlsZScsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aClcblx0XHRcdFx0aWYgKCEoYmxvYiBpbnN0YW5jZW9mIEJsb2IpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2Jsb2InLCBibG9iKVxuXHRcdFx0XHR2YXIgZmQgPSBuZXcgRm9ybURhdGEoKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0ZmQuYXBwZW5kKCdkZXN0UGF0aCcsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0Rm9ybURhdGEoJy9zYXZlJywgZmQsIG9uVXBsb2FkUHJvZ3Jlc3MpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZGVsZXRlJywgZmlsZU5hbWVzKVxuXHRcdFx0fSxcblxuXHRcdFx0bWtkaXI6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1rZGlyJywgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9ta2RpcicsIHtmaWxlTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbW92ZUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzaGFyZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gc2hhcmVGaWxlcycsIGZpbGVOYW1lcylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aDogJy9zaGFyZSd9KVxuXHRcdFx0fSxcdFx0XHRcblxuXHRcdFx0Y29weUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGNvcHlGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb3B5Jywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fSxcdFxuXHRcdFx0cmVuYW1lRmlsZTogZnVuY3Rpb24oZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW5hbWVGaWxlJywgZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3JlbmFtZScsIHtmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHRyZXNpemVJbWFnZTogZnVuY3Rpb24oZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVzaXplSW1hZ2UnLCBmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3Jlc2l6ZUltYWdlJywge2ZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0fSlcblx0XHRcdH0sXG5cdFx0XHRjb252ZXJ0VG9NUDM6IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBjb252ZXJ0VG9NUDMnLCBmaWxlUGF0aCwgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb252ZXJ0VG9NUDMnLCB7ZmlsZVBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHR6aXBGb2xkZXI6IGZ1bmN0aW9uKGZvbGRlclBhdGgsIGZvbGRlck5hbWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gemlwRm9sZGVyJywgZm9sZGVyUGF0aCwgZm9sZGVyTmFtZSlcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3ppcEZvbGRlcicsIHtmb2xkZXJQYXRoLCBmb2xkZXJOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHR1bnppcEZpbGU6IGZ1bmN0aW9uKGZvbGRlclBhdGgsIGZpbGVOYW1lKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVuemlwRmlsZScsIGZvbGRlclBhdGgsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvdW56aXBGaWxlJywge2ZvbGRlclBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdH1cblxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KHBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXIpOlByb21pc2U8W0ZpbGVJbmZvXT47XG5cdFx0ZmlsZUluZm8oZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMpOlByb21pc2U8RmlsZUluZm8+XG5cdFx0ZmlsZVVybChmaWxlTmFtZSwgZnJpZW5kVXNlcik6c3RyaW5nO1xuXHRcdGZpbGVUaHVtYm5haWxVcmwoZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpOnN0cmluZztcblx0XHR1cGxvYWRGaWxlKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCk6UHJvbWlzZTtcblx0XHRyZW1vdmVGaWxlcyhmaWxlTmFtZXMpOlByb21pc2U7XG5cdFx0bWtkaXIoZmlsZU5hbWUpOlByb21pc2U7XG5cdFx0bW92ZUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0Y29weUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0cmVuYW1lRmlsZShmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKTpQcm9taXNlO1xuXHRcdHJlc2l6ZUltYWdlKGZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0KTpQcm9taXNlO1xuXHRcdGNvbnZlcnRUb01QMyhmaWxlUGF0aCwgZmlsZU5hbWUpOlByb21pc2Vcblx0XHR6aXBGb2xkZXIoZm9sZGVyUGF0aCwgZm9sZGVyTmFtZSk6UHJvbWlzZVxuXHRgXG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lmh0dHAnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIHJlc291cmNlKGAvYXBpL2FwcC8ke3BhcmFtcy4kYXBwTmFtZX1gKVxuXHR9XG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhZ2VyJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0cmV0dXJuICQoJy5icmVpemJvdFBhZ2VyJykuaWZhY2UoKVxuXHR9XG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhcmFtcycsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAodHlwZW9mIGNvbmZpZyA9PSAnc3RyaW5nJykgPyBKU09OLnBhcnNlKGNvbmZpZykgOiB7fVxuXHR9XG59KTtcbiIsIihmdW5jdGlvbigpe1xuXG5jbGFzcyBSVEMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIyIHtcblx0Y29uc3RydWN0b3IoYnJva2VyLCBodHRwLCBwYXJhbXMpIHtcblxuXHRcdHN1cGVyKClcblxuXHRcdHRoaXMuYnJva2VyID0gYnJva2VyXG5cdFx0dGhpcy5odHRwID0gaHR0cFxuXG5cdFx0dGhpcy5zcmRJZCA9IHVuZGVmaW5lZFxuXHRcdHRoaXMuZGVzdElkID0gdW5kZWZpbmVkXG5cdFx0dGhpcy5kaXN0YW50ID0gJydcblx0XHR0aGlzLnN0YXR1cyA9ICdyZWFkeSdcblx0XHR0aGlzLmlzQ2FsbGVlID0gZmFsc2Vcblx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdHRoaXMuZGlzdGFudCA9IHBhcmFtcy5jYWxsZXJcblx0XHRcdHRoaXMuZGVzdElkID0gcGFyYW1zLmNsaWVudElkXG5cdFx0XHR0aGlzLmlzQ2FsbGVlID0gdHJ1ZVxuXHRcdH1cblxuXHRcdGJyb2tlci5vbigncmVhZHknLCAobXNnKSA9PiB7XG5cdFx0XHR0aGlzLnNyY0lkID0gbXNnLmNsaWVudElkXG5cdFx0XHR0aGlzLmVtaXQoJ3JlYWR5Jylcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5hY2NlcHQnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5jYW5jZWwoZmFsc2UpXG5cdFx0XHR0aGlzLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0dGhpcy5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcdFxuXHRcdFx0dGhpcy5lbWl0KCdhY2NlcHQnKVx0XG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmRlbnknLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5zdGF0dXMgPSAncmVmdXNlZCdcblx0XHRcdHRoaXMuY2FuY2VsKGZhbHNlKVxuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRcdHRoaXMuZW1pdCgnZGVueScpXHRcblxuXHRcdH0pXHRcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5ieWUnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5zdGF0dXMgPSAnZGlzY29ubmVjdGVkJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRcdHRoaXMuZW1pdCgnYnllJylcblxuXHRcdH0pXHRcdFx0XHRcblx0fVxuXG5cdGdldFJlbW90ZUNsaWVudElkKCkge1xuXHRcdHJldHVybiB0aGlzLmRlc3RJZFxuXHR9XG5cblx0cHJvY2Vzc0NhbGwoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIHByb2Nlc3NDYWxsJylcblx0XHR0aGlzLmJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmNhbGwnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5kZXN0SWQgPSBtc2cuc3JjSWRcblx0XHRcdHRoaXMuZW1pdCgnY2FsbCcsIG1zZy5kYXRhKVxuXHRcdH0pXG5cblx0XHR0aGlzLmJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmNhbmNlbCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLmVtaXQoJ2NhbmNlbCcpXG5cdFx0fSlcdFx0XG5cdH1cblxuXHRvbkRhdGEobmFtZSwgY2FsbGJhY2spIHtcblx0XHR0aGlzLmJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuJyArIG5hbWUsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKG1zZy5kYXRhLCBtc2cudGltZSlcblx0XHR9KVx0XHRcdFxuXHR9XG5cblx0ZW1pdFN0YXR1cygpIHtcblx0XHR0aGlzLmVtaXQoJ3N0YXR1cycsIHtzdGF0dXM6IHRoaXMuc3RhdHVzLCBkaXN0YW50OiB0aGlzLmRpc3RhbnR9KVxuXHR9XG5cblx0Y2FsbCh0bywgYXBwTmFtZSwgaWNvbkNscykge1xuXHRcdHRoaXMuZGlzdGFudCA9IHRvXG5cdFx0dGhpcy5zdGF0dXMgPSAnY2FsbGluZydcblx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdHJldHVybiB0aGlzLmh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvVXNlcmAsIHtcblx0XHRcdHRvLFxuXHRcdFx0c3JjSWQ6IHRoaXMuc3JjSWQsXG5cdFx0XHR0eXBlOiAnY2FsbCcsXG5cdFx0XHRkYXRhOiB7YXBwTmFtZSwgaWNvbkNsc31cblx0XHR9KVxuXHR9XHRcblxuXHRjYW5jZWwodXBkYXRlU3RhdHVzID0gdHJ1ZSkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBjYW5jZWwnLCB1cGRhdGVTdGF0dXMpXG5cdFx0aWYgKHVwZGF0ZVN0YXR1cykge1xuXHRcdFx0dGhpcy5zdGF0dXMgPSAnY2FuY2VsZWQnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVx0XHRcdFxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5odHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7dG86IHRoaXMuZGlzdGFudCwgc3JjSWQ6IHRoaXMuc3JjSWQsIHR5cGU6ICdjYW5jZWwnfSlcblx0fVx0XG5cblx0YWNjZXB0KCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBhY2NlcHQnKVxuXG5cdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRyZXR1cm4gdGhpcy5zZW5kRGF0YSgnYWNjZXB0Jylcblx0fVxuXG5cdGRlbnkoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGRlbnknKVxuXG5cdFx0cmV0dXJuIHRoaXMuc2VuZERhdGEoJ2RlbnknKVxuXHR9XG5cblx0YnllKCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBieWUnKVxuXG5cdFx0aWYgKHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdyZWFkeSdcblx0XHRcdHRoaXMuZGlzdGFudCA9ICcnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdFx0cmV0dXJuIHRoaXMuc2VuZERhdGEoJ2J5ZScpXHRcdFx0XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdH1cblxuXHRleGl0KCkge1xuXHRcdGlmICh0aGlzLnN0YXR1cyA9PSAnY2FsbGluZycpIHtcblx0XHRcdHJldHVybiB0aGlzLmNhbmNlbCgpXG5cdFx0fVxuXHRcdGlmICh0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xuXHRcdFx0cmV0dXJuIHRoaXMuYnllKClcblx0XHR9XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdH1cblxuXHRzZW5kRGF0YSh0eXBlLCBkYXRhKSB7XG5cdFx0cmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9DbGllbnRgLCB7XG5cdFx0XHRkZXN0SWQ6IHRoaXMuZGVzdElkLCBcblx0XHRcdHNyY0lkOiB0aGlzLnNyY0lkLFxuXHRcdFx0dHlwZSxcblx0XHRcdGRhdGFcblx0XHR9KVxuXHR9XHRcblxufVxuXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJywgJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHAsIGJyb2tlciwgcGFyYW1zKSB7XG5cblx0XHRyZXR1cm4gbmV3IFJUQyhicm9rZXIsIGh0dHAsIHBhcmFtcylcblx0fSxcblx0JGlmYWNlOiBgXG5cdFx0Y2FsbCh0byk6UHJvbWlzZTtcblx0XHRjYW5jZWwodG8pOlByb21pc2U7XG5cdFx0ZGVueSgpOlByb21pc2U7XG5cdFx0YnllKCk6UHJvbWlzZTtcblx0XHRzZW5kRGF0YSh0eXBlLCBkYXRhKTpQcm9taXNlO1xuXHRcdG9uRGF0YShjYWxsYmFjayhkYXRhLCB0aW1lKSlcblx0YFxufSk7XG5cblxufSkoKTsiLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Quc2NoZWR1bGVyJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbkFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYXBwUGFyYW1zKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbc2NoZWR1bGVyXSBvcGVuQXBwJywgYXBwTmFtZSwgYXBwUGFyYW1zKVxuXHRcdFx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0XHR0eXBlOiAnb3BlbkFwcCcsXG5cdFx0XHRcdFx0IGRhdGE6IHthcHBOYW1lLCBhcHBQYXJhbXN9XG5cdFx0XHRcdFx0fSwgbG9jYXRpb24uaHJlZilcblxuXHRcdFx0fSxcblx0XHRcdGxvZ291dDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbc2NoZWR1bGVyXSBsb2dvdXQnKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2xvZ291dCcpXG5cdFx0XHR9XHRcdCBcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0b3BlbkFwcChhcHBOYW1lLCBhcHBQYXJhbXMpO1xuXHRcdGxvZ291dCgpXG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QudXNlcnMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3VzZXJzJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJylcblx0XHRcdH0sXG5cblx0XHRcdG1hdGNoOiBmdW5jdGlvbihtYXRjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nLCB7bWF0Y2h9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy8nLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgLyR7dXNlcn1gKVxuXHRcdFx0fSxcblxuXHRcdFx0dXBkYXRlOiBmdW5jdGlvbih1c2VyLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnB1dChgLyR7dXNlcn1gLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0OiBmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgLyR7dXNlcn1gKVxuXHRcdFx0fSxcblxuXHRcdFx0YWN0aXZhdGVBcHA6IGZ1bmN0aW9uKGFwcE5hbWUsIGFjdGl2YXRlZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWN0aXZhdGVBcHBgLCB7YXBwTmFtZSwgYWN0aXZhdGVkfSlcblx0XHRcdH0sXG5cblx0XHRcdHNlbmROb3RpZjogZnVuY3Rpb24odG8sIG5vdGlmKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZW5kTm90aWZgLCB7dG8sIG5vdGlmfSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZU5vdGlmOiBmdW5jdGlvbihub3RpZklkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZU5vdGlmLyR7bm90aWZJZH1gKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Tm90aWZzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Tm90aWZzYClcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdGdldE5vdGlmQ291bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXROb3RpZkNvdW50YClcblx0XHRcdH0sXG5cblx0XHRcdGdldEZyaWVuZHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRGcmllbmRzYClcblx0XHRcdH0sXG5cblx0XHRcdGFkZEZyaWVuZDogZnVuY3Rpb24oZnJpZW5kVXNlck5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZEZyaWVuZGAsIHtmcmllbmRVc2VyTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjaGFuZ2VQd2Q6IGZ1bmN0aW9uKG5ld1B3ZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvY2hhbmdlUHdkYCwge25ld1B3ZH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRDb250YWN0OiBmdW5jdGlvbihuYW1lLCBlbWFpbCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkQ29udGFjdGAsIHtuYW1lLCBlbWFpbH0pXG5cdFx0XHR9LFxuXHRcdFx0Z2V0Q29udGFjdHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbihjb250YWN0SWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlQ29udGFjdC8ke2NvbnRhY3RJZH1gKVxuXHRcdFx0fSxcblx0XHRcdFxuXHRcdFx0c2VuZFBvc2l0aW9uOiBmdW5jdGlvbihjb29yZHMpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2VuZEZyaWVuZFBvc2l0aW9uJywgY29vcmRzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvcG9zaXRpb24nLCBjb29yZHMpXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KCk6UHJvbWlzZTtcblx0XHRhZGQoZGF0YSk6UHJvbWlzZTtcblx0XHRyZW1vdmUodXNlcik6UHJvbWlzZTtcblx0XHR1cGRhdGUodXNlciwgZGF0YSk6UHJvbWlzZTtcblx0XHRnZXQodXNlcik6UHJvbWlzZTtcblx0XHRhY3RpdmF0ZUFwcChhcHBOYW1lLCBhY3RpdmF0ZWQpOlByb21pc2U7XG5cdFx0c2VuZE5vdGlmKHRvLCBub3RpZik6UHJvbWlzZTtcblx0XHRyZW1vdmVOb3RpZihub3RpZklkKTpQcm9taXNlO1xuXHRcdGdldE5vdGlmcygpOlByb21pc2U7XG5cdFx0Z2V0Tm90aWZDb3VudCgpOlByb21pc2U7XG5cdFx0Z2V0RnJpZW5kcygpOlByb21pc2U7XG5cdFx0YWRkRnJpZW5kKGZyaWVuZFVzZXJOYW1lKTpQcm9taXNlO1xuXHRcdGNoYW5nZVB3ZChuZXdQd2QpOlByb21pc2U7XG5cdFx0YWRkQ29udGFjdChuYW1lLCBlbWFpbCk6UHJvbWlzZTtcblx0XHRnZXRDb250YWN0cygpOlByb21pc2UoY29udGFjdHMpO1xuXHRcdHJlbW92ZUNvbnRhY3QoY29udGFjdElkKTpQcm9taXNlO1xuXHRcdHNlbmRQb3NpdGlvbihjb29yZHMpOlByb21pc2Vcblx0YFxufSk7XG4iXX0=
