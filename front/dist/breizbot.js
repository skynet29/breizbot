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

		template: "<div class=\"toolbar\" bn-show=\"showToolbar\" bn-bind=\"toolbar\">\n	<div class=\"left\">\n		<div class=\"group\" bn-show=\"!isMobileDevice\">\n			<button \n				class=\"w3-button\" \n				title=\"New folder\" \n				bn-event=\"click: onCreateFolder\" \n				data-cmd=\"newFolder\">\n					<i class=\"fas fa-folder-plus\"></i>\n				</button>\n	\n			<button \n				class=\"w3-button\" \n				title=\"Import file\" \n				data-cmd=\"importFile\"\n				bn-event=\"click: onImportFile\">\n					<i class=\"fa fa-upload\"></i>\n				</button>\n\n			<button \n				class=\"w3-button\" \n				title=\"Reload\" \n				data-cmd=\"reload\"\n				bn-event=\"click: onReload\">\n					<i class=\"fa fa-sync-alt\"></i>\n				</button>\n\n			<span class=\"separator\"></span>\n	\n	\n		</div>\n	\n		<div class=\"group\">\n			<button class=\"w3-button\" title=\"Toggle Selection\" bn-event=\"click: onTogleSelection\"><i class=\"fa fa-check\"></i></button>\n			<span class=\"separator\"></span>\n	\n	\n		</div>\n	\n		<div class=\"group\">\n			<button class=\"w3-button\" title=\"Delete\" bn-event=\"click: onDeleteFiles\" bn-prop=\"prop1\"><i class=\"fa fa-trash\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Cut\" bn-prop=\"prop1\" bn-event=\"click: onCutFiles\"><i class=\"fa fa-cut\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Copy\" bn-prop=\"prop1\" bn-event=\"click: onCopyFiles\"><i class=\"fa fa-copy\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Share\" bn-prop=\"prop2\" bn-event=\"click: onShareFiles\"><i class=\"fa fa-share-alt\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Paste\" bn-prop=\"prop3\" bn-event=\"click: onPasteFiles\"><i class=\"fa fa-paste\"></i></button>\n		</div>\n	\n	\n	</div>\n	<div bn-show=\"isMobileDevice\">\n		<button class=\"w3-button\" title=\"More actions\" \n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onToolbarContextMenu\"\n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n				 	newFolder: {name: \'New folder\', icon: \'fas fa-folder-plus\'},\n				 	importFile: {name: \'Import file\', icon: \'fas fa-upload\'},\n				 	reload: {name: \'Reload\', icon: \'fas fa-sync-alt\'}\n				}\n			}\">\n			<i class=\"fa fa-ellipsis-v\"></i></button>\n\n	</div>\n</div>\n\n<div class=\"download\" bn-show=\"hasDownloads\" bn-bind=\"downloads\">\n	<strong bn-event=\"click: onToggleDownload\"><i class=\"fa fa-caret-down fa-fw\"></i>\n			Uploads</strong>\n	<div bn-each=\"downloads\" class=\"downloadItems\">\n		<div class=\"w3-card w3-padding-small\">\n			<div bn-text=\"$scope.$i.fileName\"></div>\n			<progress max=\"1\" bn-val=\"$scope.$i.percentage\"></progress>\n		</div>\n	</div>\n</div>\n\n<div bn-text=\"info\" bn-bind=\"info\" class=\"info\"></div>\n\n<div bn-show=\"loading\" class=\"loading\">\n	<i class=\"fa fa-spinner fa-pulse\"></i>\n	loading ...\n</div>\n\n<div class=\"pathPanel\" bn-event=\"click.pathItem: onPathItem\" bn-show=\"!loading\">\n	<div bn-each=\"getPath\" bn-index=\"idx\">\n		<i class=\"fa fa-chevron-right\" bn-show=\"!isFirst\"></i>\n		<span>\n			<a class=\"pathItem\" bn-text=\"$scope.$i\" href=\"#\" bn-show=\"!isLast\" bn-data=\"{info: getPathInfo}\"></a>\n			<span bn-text=\"$scope.$i\" bn-show=\"isLast\" class=\"lastItem\"></span>\n\n		</span>\n	</div>\n\n\n</div>\n\n\n<div class=\"scrollPanel\">\n\n	<div bn-each=\"getFiles\" bn-iter=\"f\" bn-lazzy=\"10\" bn-bind=\"files\" class=\"container\"\n		bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick, contextmenuchange.thumbnail: onContextMenu\">\n\n		<div class=\"thumbnail w3-card-2\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n\n			<span bn-if=\"if1\">\n				<input type=\"checkbox\" bn-show=\"showToolbar\" class=\"check w3-check\">\n			</span>\n			<div bn-if=\"$scope.f.folder\" class=\"folder item\">\n				<div class=\"icon\">\n					<i class=\"fa fa-4x fa-folder-open w3-text-blue-grey\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\" bn-if=\"if1\"></span>\n				</div>\n			</div>\n			<div bn-if=\"if2\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"isMP3\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<div>Title:&nbsp;<strong bn-text=\"$scope.f.mp3.title\"></strong></div>\n\n					<div>Artist:&nbsp;<strong bn-text=\"$scope.f.mp3.artist\"></strong></div>\n					<div bn-show=\"hasGenre\">Genre:&nbsp;<strong bn-text=\"$scope.f.mp3.genre\"></strong></div>\n					<div bn-show=\"hasYear\"> Year:&nbsp;<strong bn-text=\"getYear\"></strong></div>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"if3\" class=\"file item\">\n				<div class=\"icon\">\n					<img bn-attr=\"{src: getThumbnailUrl}\">\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n					<span bn-text=\"getDimension\"></span>\n				</div>\n			</div>\n\n		</div>\n	</div>\n\n\n</div>",

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
						for (let f in this.mp3Filters) {
							//console.log('filter', f)
							const value = mp3Info[f]
							//console.log('value', value)
							const filterValue = this.mp3Filters[f]
							//console.log('filterValue', filterValue)
							if (filterValue != 'All') {
								ret &= (filterValue === value)
							}
						}
						//console.log('ret', ret)
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

					hasGenre: function(scope) {
						let {genre} = scope.f.mp3
						return genre != undefined && genre != '' && !genre.startsWith('(')
					},

					hasYear: function(scope) {
						let {year} = scope.f.mp3
						return year != undefined && year != ''
					},

					getYear: function(scope) {
						return parseInt(scope.f.mp3.year)
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


$$.control.registerControl('breizbot.pager', {

	props: {
		rootPage: ''
	},
	template: "<div bn-show=\"showBack\" class=\"toolbar\">\n	<div class=\"left\">\n		<button class=\"w3-button\" title=\"Back\" bn-event=\"click: onBack\">\n			<i class=\"fa fa-arrow-left\"></i>\n		</button>\n		<span bn-text=\"title\" class=\"title\"></span>\n	\n	</div>\n	<div bn-each=\"buttons\" bn-event=\"click.action: onAction, contextmenuchange.menu: onContextMenu\">\n		<button bn-show=\"show1\" class=\"w3-button action\" bn-text=\"$scope.$i.label\"\n			bn-data=\"{cmd: $scope.$i.name}\"></button>\n		<button bn-show=\"show2\" class=\"w3-button action\" bn-data=\"{cmd: $scope.$i.name}\"\n			bn-attr=\"{title: $scope.$i.title}\"><i bn-attr=\"{class: $scope.$i.icon}\"></i></button>\n\n			<button bn-show=\"show3\" class=\"w3-button menu\" \n			bn-control=\"brainjs.contextmenu\" bn-data=\"{items: $scope.$i.items, trigger: \'left\', cmd: $scope.$i.name}\"\n			bn-attr=\"{title: $scope.$i.title}\"><i bn-attr=\"{class: $scope.$i.icon}\"></i></button>\n		</div>			\n	</div>\n</div>\n<div bn-bind=\"content\" class=\"content\"></div>",

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
					return scope.$i.items == undefined && scope.$i.icon == undefined && !(scope.$i.visible === false)
				},
				show2: function(scope) {
					return scope.$i.items == undefined && scope.$i.icon != undefined && !(scope.$i.visible === false)
				},
				show3: function(scope) {
					return scope.$i.items != undefined && !(scope.$i.visible === false)
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
				},
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					const cmd = $(this).data('cmd')
					const pageCtrlIface = curInfo.ctrl.iface()
					console.log('onAction', cmd)
					const fn = curInfo.buttons[cmd].onClick
					if (typeof fn == 'function') {
						fn.call(pageCtrlIface, data.cmd)
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9jb250YWN0cy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwicGFnZXIvcGFnZXIuanMiLCJmcmllbmRzL2ZyaWVuZHMuanMiLCJob21lL2hvbWUuanMiLCJwZGYvbWFpbi5qcyIsInJ0Yy9ydGMuanMiLCJzZWFyY2hiYXIvc2VhcmNoYmFyLmpzIiwidXNlcnMvYWRkVXNlci5qcyIsInVzZXJzL3VzZXJzLmpzIiwidmlld2VyL3ZpZXdlci5qcyIsImFwcERhdGEuanMiLCJhcHBzLmpzIiwiYnJva2VyLmpzIiwiY2l0aWVzLmpzIiwiZmlsZXMuanMiLCJodHRwLmpzIiwicGFnZXIuanMiLCJwYXJhbXMuanMiLCJydGMuanMiLCJzY2hlZHVsZXIuanMiLCJ1c2Vycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDclVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnJlaXpib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQgPyBjb25mLm1heExpc3RlbmVycyA6IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcbiAgICAgIGNvbmYudmVyYm9zZU1lbW9yeUxlYWsgJiYgKHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBjb25mLnZlcmJvc2VNZW1vcnlMZWFrKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBsb2dQb3NzaWJsZU1lbW9yeUxlYWsoY291bnQsIGV2ZW50TmFtZSkge1xuICAgIHZhciBlcnJvck1zZyA9ICcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICcgKyBjb3VudCArICcgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0Lic7XG5cbiAgICBpZih0aGlzLnZlcmJvc2VNZW1vcnlMZWFrKXtcbiAgICAgIGVycm9yTXNnICs9ICcgRXZlbnQgbmFtZTogJyArIGV2ZW50TmFtZSArICcuJztcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbWl0V2FybmluZyl7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICBlLm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgIGUuZW1pdHRlciA9IHRoaXM7XG4gICAgICBlLmNvdW50ID0gY291bnQ7XG4gICAgICBwcm9jZXNzLmVtaXRXYXJuaW5nKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yTXNnKTtcblxuICAgICAgaWYgKGNvbnNvbGUudHJhY2Upe1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgdGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG4gIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmb3IgZXhwb3J0aW5nIEV2ZW50RW1pdHRlciBwcm9wZXJ0eVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdHJlZS5fbGlzdGVuZXJzLndhcm5lZCAmJlxuICAgICAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoLCBuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKG4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIH1cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uY2UgPSBmdW5jdGlvbihldmVudCwgZm4sIHByZXBlbmQpIHtcbiAgICB0aGlzLl9tYW55KGV2ZW50LCAxLCBmbiwgcHJlcGVuZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgZmFsc2UpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIHRydWUpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuLCBwcmVwZW5kKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5fb24oZXZlbnQsIGxpc3RlbmVyLCBwcmVwZW5kKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fYWxsLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBvZiBlbWl0IGNhbGxcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXRBc3luYyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbZmFsc2VdKTsgfVxuICAgIH1cblxuICAgIHZhciBwcm9taXNlcz0gW107XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYXJndW1lbnRzWzFdKTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZEFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbkFueSA9IGZ1bmN0aW9uKGZuLCBwcmVwZW5kKXtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICBpZihwcmVwZW5kKXtcbiAgICAgIHRoaXMuX2FsbC51bnNoaWZ0KGZuKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX29uQW55KHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIENoYW5nZSB0byBhcnJheS5cbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFkZFxuICAgICAgaWYocHJlcGVuZCl7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkICYmXG4gICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3QpIHtcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb290KTtcbiAgICAgIGZvciAodmFyIGkgaW4ga2V5cykge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIG9iaiA9IHJvb3Rba2V5XTtcbiAgICAgICAgaWYgKChvYmogaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpIHx8IChvYmogPT09IG51bGwpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290W2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSByb290W2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdCh0aGlzLmxpc3RlbmVyVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm4pO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuc1tpXSk7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hbGV4YScsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQoZWx0LCBodHRwKSB7XG5cdFx0Y29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cigxKVxuXG5cdFx0Ly9jb25zb2xlLmxvZygnaGFzaCcsIGhhc2gpXG5cdFx0Y29uc3QgcGFyYW1zID0gJCQudXRpbC5wYXJzZVVybFBhcmFtcyhoYXNoKVxuXHRcdC8vY29uc29sZS5sb2coJ3BhcmFtcycsIHBhcmFtcylcblx0XHRodHRwLnBvc3QoJy9hcGkvYWxleGEvYXV0aCcsIHBhcmFtcykudGhlbigoKSA9PiB7XG5cdFx0XHR3aW5kb3cuY2xvc2UoKVxuXHRcdH0pXG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcFRhYicsIHtcblxuXHRwcm9wczoge1xuXHRcdGFwcFVybDogJ2Fib3V0OmJsYW5rJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxpZnJhbWUgYm4tYXR0cj1cXFwie3NyYzogYXBwVXJsfVxcXCIgYm4tYmluZD1cXFwiaWZyYW1lXFxcIiBibi1ldmVudD1cXFwibG9hZDogb25GcmFtZUxvYWRlZFxcXCI+PC9pZnJhbWU+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cdFx0Y29uc3Qge2FwcFVybH0gPSB0aGlzLnByb3BzO1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBVcmxcdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZyYW1lTG9hZGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkZyYW1lTG9hZGVkJylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQXBwRXhpdCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwRXhpdCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcEV4aXQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gcm9vdFBhZ2Uub25BcHBFeGl0KClcblx0XHRcdH1cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVx0XHRcblx0XHR9XHRcblxuXHRcdHRoaXMub25BcHBTdXNwZW5kID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBTdXNwZW5kJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwU3VzcGVuZCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFwcFJlc3VtZSA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwUmVzdW1lJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwUmVzdW1lID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cm9vdFBhZ2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QXBwVXJsID0gZnVuY3Rpb24oYXBwVXJsKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBzZXRBcHBVcmwnLCBhcHBVcmwpXG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcFVybDogYXBwVXJsICsgJyZkYXRlPScgKyBEYXRlLm5vdygpfSlcblx0XHR9XG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5zY2hlZHVsZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcHM6IFtdLFxuXHRcdHNob3dBY3RpdmF0ZWQ6IGZhbHNlLFxuXHRcdGl0ZW1zOiBudWxsXG5cdH0sXG5cblx0JGlmYWNlOiAnc2V0RGF0YShkYXRhKScsXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1lYWNoPVxcXCJhcHBzXFxcIiBcXG5cdFx0Ym4taXRlcj1cXFwiYXBwXFxcIiBcXG5cdFx0Y2xhc3M9XFxcIm1haW5cXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2sudGlsZTogb25UaWxlQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLnRpbGU6IG9uVGlsZUNvbnRleHRNZW51XFxcIlxcblx0XHQ+XHRcdFx0XFxuXHRcdDxkaXYgYm4tYXR0cj1cXFwiY2xhc3MxXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGdldEl0ZW1zfVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYXJyb3ctcmlnaHRcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cyXFxcIiBzdHlsZT1cXFwibWFyZ2luLWJvdHRvbTogNXB4O1xcXCI+XFxuXHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS5hcHAucHJvcHMuaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuYXBwLnByb3BzLnRpdGxlXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblxcblx0PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzY2hlZHVsZXIpIHtcblxuXHRcdGNvbnN0IHthcHBzLCBzaG93QWN0aXZhdGVkLCBpdGVtc30gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGdldEl0ZW1zOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2dldEl0ZW1zJywgc2NvcGUuYXBwKVxuXHRcdFx0XHRcdHJldHVybiAodHlwZW9mIGl0ZW1zID09ICdmdW5jdGlvbicpID8gaXRlbXMoc2NvcGUuYXBwKSA6IGl0ZW1zXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFwcHMsXG5cdFx0XHRcdHNob3dBY3RpdmF0ZWQsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNob3dBY3RpdmF0ZWQgJiYgc2NvcGUuYXBwLmFjdGl2YXRlZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtjbGFzczogYHRpbGUgdzMtYnRuICR7c2NvcGUuYXBwLnByb3BzLmNvbG9yQ2xzfWB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0eXBlb2Ygc2NvcGUuYXBwLnByb3BzLmljb25DbHMgPT0gJ3N0cmluZydcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRpbGVDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDbGljaycsICQodGhpcykuZGF0YSgnaXRlbScpKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdhcHBjbGljaycsIGN0cmwubW9kZWwuYXBwc1tpZHhdKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRpbGVDb250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3Qge2NtZH0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9ICQuZXh0ZW5kKHtjbWR9LCBjdHJsLm1vZGVsLmFwcHNbaWR4XSlcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY29udGV4dG1lbnUnLCBpbmZvKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRhcHBzOiBkYXRhLmFwcHMuZmlsdGVyKChhKSA9PiBhLnByb3BzLnZpc2libGUgIT0gZmFsc2UgJiYgYS5hcHBOYW1lICE9ICd0ZW1wbGF0ZScpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYHNldERhdGEoZGF0YSlgLFxuXHQkZXZlbnRzOiAnYXBwY2xpY2s7YXBwY29udGV4dG1lbnUnXG59KTtcblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmNvbnRhY3RzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdHNob3dEZWxldGVCdXR0b246IGZhbHNlXG5cdH0sXHRcblxuXHR0ZW1wbGF0ZTogXCI8cCBibi1zaG93PVxcXCJzaG93MlxcXCI+WW91IGhhdmUgbm8gY29udGFjdHM8L3A+XFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGljaywgY2xpY2suZGVsZXRlOiBvbkRlbGV0ZUl0ZW1cXFwiXFxuXHRcdGJuLWVhY2g9XFxcImNvbnRhY3RzXFxcIlxcblx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiIGJuLXNob3c9XFxcInNob3dEZWxldGVCdXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPjwvc3Bhbj5cXG5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlciB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmNvbnRhY3ROYW1lXFxcIj48L3N0cm9uZz48YnI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGUgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuY29udGFjdEVtYWlsXFxcIj48L3NwYW4+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvbGk+XFxuXHQ8L3VsPlx0XHRcXG5cXG48L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7c2hvd1NlbGVjdGlvbiwgc2hvd0RlbGV0ZUJ1dHRvbn0gPSB0aGlzLnByb3BzXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y29udGFjdHM6IFtdLFxuXHRcdFx0XHRzaG93RGVsZXRlQnV0dG9uLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID09IDBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBjdHJsLm1vZGVsLmNvbnRhY3RzW2lkeF1cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQvLyQodGhpcykuc2libGluZ3MoJy53My1ibHVlJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS50b2dnbGVDbGFzcygndzMtYmx1ZScpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdjb250YWN0Y2xpY2snLCBkYXRhKVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkRlbGV0ZUl0ZW06IGFzeW5jIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRjb25zdCBpZHggPSAgJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gY3RybC5tb2RlbC5jb250YWN0c1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVsZXRlSXRlbScsIGRhdGEpXG5cdFx0XHRcdFx0YXdhaXQgdXNlcnMucmVtb3ZlQ29udGFjdChkYXRhLl9pZClcblx0XHRcdFx0XHRsb2FkKClcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZCgpIHtcblx0XHRcdGNvbnN0IGNvbnRhY3RzID0gYXdhaXQgdXNlcnMuZ2V0Q29udGFjdHMoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3RzJywgY29udGFjdHMpXG5cdFx0XHRjdHJsLnNldERhdGEoe2NvbnRhY3RzfSlcblx0XHR9XG5cblx0XHRsb2FkKClcblxuXHRcdHRoaXMudXBkYXRlID0gbG9hZFxuXG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnN0IHJldCA9IFtdXG5cdFx0XHRlbHQuZmluZCgnbGkudzMtYmx1ZScpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9ICAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0cmV0LnB1c2goY3RybC5tb2RlbC5jb250YWN0c1tpZHhdKVxuXHRcdFx0fSlcblx0XHRcdGNvbnNvbGUubG9nKCdyZXQnLCByZXQpXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdH0sXG5cdCRpZmFjZTogYGdldFNlbGVjdGlvbigpOiBbQ29udGFjdEluZm9dYCxcblx0JGV2ZW50czogJ2NvbnRhY3RjbGljaydcbn0pO1xuXG5cblxuXG4iLCIoZnVuY3Rpb24gKCkge1xuXG5cdGZ1bmN0aW9uIGdldEljb25DbGFzcyhuYW1lKSB7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcucGRmJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1wZGYnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuaGRvYycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtd29yZCdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5vZ2cnKSB8fCBuYW1lLmVuZHNXaXRoKCcubXAzJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1hdWRpbydcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5tcDQnKSB8fCBuYW1lLmVuZHNXaXRoKCcud2VibScpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtdmlkZW8nXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1hcmNoaXZlJ1xuXHRcdH1cblxuXHRcdHJldHVybiAnZmEtZmlsZSdcblx0fVxuXG5cdGZ1bmN0aW9uIHNvcnRGaWxlcyhmaWxlcykge1xuXHRcdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0XHRcdGlmIChhLmZvbGRlciAmJiAhYi5mb2xkZXIpIHtcblx0XHRcdFx0cmV0dXJuIC0xXG5cdFx0XHR9XG5cdFx0XHRpZiAoIWEuZm9sZGVyICYmIGIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKVxuXHRcdH0pXG5cdH1cblxuXHQkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXHRcdHByb3BzOiB7XG5cdFx0XHQkcGFnZXI6IG51bGwsXG5cdFx0XHRzaG93VG9vbGJhcjogZmFsc2UsXG5cdFx0XHRpbWFnZU9ubHk6IGZhbHNlLFxuXHRcdFx0ZmlsdGVyRXh0ZW5zaW9uOiB1bmRlZmluZWQsXG5cdFx0XHRnZXRNUDNJbmZvOiBmYWxzZSxcblx0XHRcdGZyaWVuZFVzZXI6ICcnLFxuXHRcdFx0bXAzRmlsdGVyczogbnVsbFxuXHRcdH0sXG5cblx0XHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIiBibi1zaG93PVxcXCJzaG93VG9vbGJhclxcXCIgYm4tYmluZD1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJsZWZ0XFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiIGJuLXNob3c9XFxcIiFpc01vYmlsZURldmljZVxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdFx0dGl0bGU9XFxcIk5ldyBmb2xkZXJcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNyZWF0ZUZvbGRlclxcXCIgXFxuXHRcdFx0XHRkYXRhLWNtZD1cXFwibmV3Rm9sZGVyXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1mb2xkZXItcGx1c1xcXCI+PC9pPlxcblx0XHRcdFx0PC9idXR0b24+XFxuXHRcXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0XHR0aXRsZT1cXFwiSW1wb3J0IGZpbGVcXFwiIFxcblx0XHRcdFx0ZGF0YS1jbWQ9XFxcImltcG9ydEZpbGVcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0RmlsZVxcXCI+XFxuXHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11cGxvYWRcXFwiPjwvaT5cXG5cdFx0XHRcdDwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJSZWxvYWRcXFwiIFxcblx0XHRcdFx0ZGF0YS1jbWQ9XFxcInJlbG9hZFxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25SZWxvYWRcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3luYy1hbHRcXFwiPjwvaT5cXG5cdFx0XHRcdDwvYnV0dG9uPlxcblxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cdFxcblx0XFxuXHRcdDwvZGl2Plxcblx0XFxuXHRcdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJUb2dnbGUgU2VsZWN0aW9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9nbGVTZWxlY3Rpb25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jaGVja1xcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cdFxcblx0XFxuXHRcdDwvZGl2Plxcblx0XFxuXHRcdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25EZWxldGVGaWxlc1xcXCIgYm4tcHJvcD1cXFwicHJvcDFcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQ3V0XFxcIiBibi1wcm9wPVxcXCJwcm9wMVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkN1dEZpbGVzXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY3V0XFxcIj48L2k+PC9idXR0b24+XFxuXHRcXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDb3B5XFxcIiBibi1wcm9wPVxcXCJwcm9wMVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvcHlGaWxlc1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNvcHlcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIlNoYXJlXFxcIiBibi1wcm9wPVxcXCJwcm9wMlxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNoYXJlRmlsZXNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1hbHRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIlBhc3RlXFxcIiBibi1wcm9wPVxcXCJwcm9wM1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBhc3RlRmlsZXNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wYXN0ZVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8L2Rpdj5cXG5cdFxcblx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwiaXNNb2JpbGVEZXZpY2VcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJNb3JlIGFjdGlvbnNcXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvblRvb2xiYXJDb250ZXh0TWVudVxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdCBcdG5ld0ZvbGRlcjoge25hbWU6IFxcJ05ldyBmb2xkZXJcXCcsIGljb246IFxcJ2ZhcyBmYS1mb2xkZXItcGx1c1xcJ30sXFxuXHRcdFx0XHQgXHRpbXBvcnRGaWxlOiB7bmFtZTogXFwnSW1wb3J0IGZpbGVcXCcsIGljb246IFxcJ2ZhcyBmYS11cGxvYWRcXCd9LFxcblx0XHRcdFx0IFx0cmVsb2FkOiB7bmFtZTogXFwnUmVsb2FkXFwnLCBpY29uOiBcXCdmYXMgZmEtc3luYy1hbHRcXCd9XFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVsbGlwc2lzLXZcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImRvd25sb2FkXFxcIiBibi1zaG93PVxcXCJoYXNEb3dubG9hZHNcXFwiIGJuLWJpbmQ9XFxcImRvd25sb2Fkc1xcXCI+XFxuXHQ8c3Ryb25nIGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dnbGVEb3dubG9hZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd24gZmEtZndcXFwiPjwvaT5cXG5cdFx0XHRVcGxvYWRzPC9zdHJvbmc+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImRvd25sb2Fkc1xcXCIgY2xhc3M9XFxcImRvd25sb2FkSXRlbXNcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1jYXJkIHczLXBhZGRpbmctc21hbGxcXFwiPlxcblx0XHRcdDxkaXYgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmZpbGVOYW1lXFxcIj48L2Rpdj5cXG5cdFx0XHQ8cHJvZ3Jlc3MgbWF4PVxcXCIxXFxcIiBibi12YWw9XFxcIiRzY29wZS4kaS5wZXJjZW50YWdlXFxcIj48L3Byb2dyZXNzPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgYm4tdGV4dD1cXFwiaW5mb1xcXCIgYm4tYmluZD1cXFwiaW5mb1xcXCIgY2xhc3M9XFxcImluZm9cXFwiPjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdGxvYWRpbmcgLi4uXFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwicGF0aFBhbmVsXFxcIiBibi1ldmVudD1cXFwiY2xpY2sucGF0aEl0ZW06IG9uUGF0aEl0ZW1cXFwiIGJuLXNob3c9XFxcIiFsb2FkaW5nXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZ2V0UGF0aFxcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jaGV2cm9uLXJpZ2h0XFxcIiBibi1zaG93PVxcXCIhaXNGaXJzdFxcXCI+PC9pPlxcblx0XHQ8c3Bhbj5cXG5cdFx0XHQ8YSBjbGFzcz1cXFwicGF0aEl0ZW1cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgaHJlZj1cXFwiI1xcXCIgYm4tc2hvdz1cXFwiIWlzTGFzdFxcXCIgYm4tZGF0YT1cXFwie2luZm86IGdldFBhdGhJbmZvfVxcXCI+PC9hPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgYm4tc2hvdz1cXFwiaXNMYXN0XFxcIiBjbGFzcz1cXFwibGFzdEl0ZW1cXFwiPjwvc3Bhbj5cXG5cXG5cdFx0PC9zcGFuPlxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblxcblx0PGRpdiBibi1lYWNoPVxcXCJnZXRGaWxlc1xcXCIgYm4taXRlcj1cXFwiZlxcXCIgYm4tbGF6enk9XFxcIjEwXFxcIiBibi1iaW5kPVxcXCJmaWxlc1xcXCIgY2xhc3M9XFxcImNvbnRhaW5lclxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLmZvbGRlcjogb25Gb2xkZXJDbGljaywgY2xpY2suY2hlY2s6IG9uQ2hlY2tDbGljaywgY2xpY2suZmlsZTogb25GaWxlQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLnRodW1ibmFpbDogb25Db250ZXh0TWVudVxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbCB3My1jYXJkLTJcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogZ2V0SXRlbXN9XFxcIj5cXG5cXG5cdFx0XHQ8c3BhbiBibi1pZj1cXFwiaWYxXFxcIj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tc2hvdz1cXFwic2hvd1Rvb2xiYXJcXFwiIGNsYXNzPVxcXCJjaGVjayB3My1jaGVja1xcXCI+XFxuXHRcdFx0PC9zcGFuPlxcblx0XHRcdDxkaXYgYm4taWY9XFxcIiRzY29wZS5mLmZvbGRlclxcXCIgY2xhc3M9XFxcImZvbGRlciBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtNHggZmEtZm9sZGVyLW9wZW4gdzMtdGV4dC1ibHVlLWdyZXlcXFwiPjwvaT5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiIGJuLWlmPVxcXCJpZjFcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgYm4taWY9XFxcImlmMlxcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjbGFzczF9XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHRcdDxkaXYgYm4taWY9XFxcImlzTVAzXFxcIiBjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNsYXNzMX1cXFwiPjwvaT5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxkaXY+VGl0bGU6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMudGl0bGVcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblxcblx0XHRcdFx0XHQ8ZGl2PkFydGlzdDombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm1wMy5hcnRpc3RcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcImhhc0dlbnJlXFxcIj5HZW5yZTombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm1wMy5nZW5yZVxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXHRcdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzWWVhclxcXCI+IFllYXI6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCJnZXRZZWFyXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PGRpdiBibi1pZj1cXFwiaWYzXFxcIiBjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IGdldFRodW1ibmFpbFVybH1cXFwiPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERpbWVuc2lvblxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XCIsXG5cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0XHRjb25zdCB0aHVtYm5haWxTaXplID0gJzEwMHg/J1xuXHRcdFx0Y29uc3QgbWF4VXBsb2FkU2l6ZSA9IDEwICogMTAyNCAqIDIwMTQgLy8gMTAgTW9cblxuXHRcdFx0bGV0IHNlbGVjdGVkID0gZmFsc2VcblxuXHRcdFx0bGV0IHtcblx0XHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0aW1hZ2VPbmx5LFxuXHRcdFx0XHRnZXRNUDNJbmZvLFxuXHRcdFx0XHRtcDNGaWx0ZXJzXG5cdFx0XHR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0XHRpZiAoZnJpZW5kVXNlciAhPSAnJykge1xuXHRcdFx0XHRzaG93VG9vbGJhciA9IGZhbHNlXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldFNlbEZpbGVzKCkge1xuXHRcdFx0XHRjb25zdCBzZWxGaWxlcyA9IFtdXG5cdFx0XHRcdGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7IG5hbWUsIGZvbGRlciB9ID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRzZWxGaWxlcy5wdXNoKHsgZmlsZU5hbWU6IGN0cmwubW9kZWwucm9vdERpciArIG5hbWUsIGlkeCwgZm9sZGVyIH0pXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdFx0cmV0dXJuIHNlbEZpbGVzXG5cdFx0XHR9XG5cblxuXHRcdFx0ZnVuY3Rpb24gZ2V0TmJTZWxGaWxlcygpIHtcblx0XHRcdFx0cmV0dXJuIGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmxlbmd0aFxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiB0b2dnbGVTZWxlY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGVjdGVkID0gIXNlbGVjdGVkXG5cdFx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgc2VsZWN0ZWQpXG5cdFx0XHR9XG5cblx0XHRcdGlmIChzaG93VG9vbGJhcikge1xuXHRcdFx0XHRjb25zdCByZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcihlbnRyaWVzID0+IHtcblx0XHRcdFx0XHRjdHJsLm1vZGVsLmlzTW9iaWxlRGV2aWNlID0gJCQudXRpbC5pc01vYmlsZURldmljZSgpXG5cdFx0XHRcdFx0Y3RybC51cGRhdGVOb2RlVHJlZSgndG9vbGJhcicpXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0cmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShlbHQuZ2V0KDApKTtcblxuXHRcdFx0fVxuXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0ZG93bmxvYWRzOiBbXSxcblx0XHRcdFx0XHRoYXNEb3dubG9hZHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRvd25sb2Fkcy5sZW5ndGggPiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc01vYmlsZURldmljZTogZmFsc2UsXG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBbXSxcblx0XHRcdFx0XHRvcGVyYXRpb246ICdub25lJyxcblx0XHRcdFx0XHRuYlNlbGVjdGlvbjogMCxcblx0XHRcdFx0XHRpc1NoYXJlU2VsZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnMsXG5cdFx0XHRcdFx0aW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0bGV0IG5iRmlsZXMgPSAwXG5cdFx0XHRcdFx0XHRsZXQgbmJGb2xkZXJzID0gMFxuXHRcdFx0XHRcdFx0dGhpcy5nZXRGaWxlcygpLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKGkuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGkubmFtZSAhPSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRuYkZvbGRlcnMrK1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRuYkZpbGVzKytcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0bGV0IHJldCA9IFtdXG5cdFx0XHRcdFx0XHRpZiAobmJGb2xkZXJzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG5iRm9sZGVycyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJzYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChuYkZpbGVzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZWApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobmJGaWxlcyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZXNgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldC5qb2luKCcgLyAnKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRpc0luRmlsdGVyOiBmdW5jdGlvbiAobXAzSW5mbykge1xuXHRcdFx0XHRcdFx0dmFyIHJldCA9IHRydWVcblx0XHRcdFx0XHRcdGZvciAobGV0IGYgaW4gdGhpcy5tcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlcicsIGYpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gbXAzSW5mb1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd2YWx1ZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWx0ZXJWYWx1ZSA9IHRoaXMubXAzRmlsdGVyc1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXJWYWx1ZScsIGZpbHRlclZhbHVlKVxuXHRcdFx0XHRcdFx0XHRpZiAoZmlsdGVyVmFsdWUgIT0gJ0FsbCcpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQgJj0gKGZpbHRlclZhbHVlID09PSB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRGaWxlczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMubXAzRmlsdGVycyA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlc1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXMuZmlsdGVyKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmLmZvbGRlciB8fCAoZi5tcDMgJiYgZi5tcDMgJiYgdGhpcy5pc0luRmlsdGVyKGYubXAzKSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc01QMzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2V0TVAzSW5mbyAmJiBzY29wZS5mLm1wMyAhPSB1bmRlZmluZWQgJiYgc2NvcGUuZi5tcDMudGl0bGUgIT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0XHRcdHNjb3BlLmYubXAzLnRpdGxlICE9ICcnXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB0YWIgPSAoJy9ob21lJyArIHRoaXMucm9vdERpcikuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdFx0dGFiLnNoaWZ0KClcblx0XHRcdFx0XHRcdHRhYi5wb3AoKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRhYlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNMYXN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gdGhpcy5nZXRQYXRoKCkubGVuZ3RoIC0gMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNGaXJzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFBhdGhJbmZvOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmdldFBhdGgoKS5zbGljZSgxLCBzY29wZS5pZHggKyAxKS5qb2luKCcvJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aGFzR2VucmU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQge2dlbnJlfSA9IHNjb3BlLmYubXAzXG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2VucmUgIT0gdW5kZWZpbmVkICYmIGdlbnJlICE9ICcnICYmICFnZW5yZS5zdGFydHNXaXRoKCcoJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aGFzWWVhcjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRcdGxldCB7eWVhcn0gPSBzY29wZS5mLm1wM1xuXHRcdFx0XHRcdFx0cmV0dXJuIHllYXIgIT0gdW5kZWZpbmVkICYmIHllYXIgIT0gJydcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0WWVhcjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwYXJzZUludChzY29wZS5mLm1wMy55ZWFyKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRJdGVtczogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCByZXQgPSB7fVxuXHRcdFx0XHRcdFx0aWYgKHNob3dUb29sYmFyICYmIHNjb3BlLmYubmFtZSAhPSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRcdHJldC5kZWxldGUgPSB7IG5hbWU6ICdEZWxldGUnLCBpY29uOiAnZmFzIGZhLXRyYXNoJyB9XG5cdFx0XHRcdFx0XHRcdHJldC5yZW5hbWUgPSB7IG5hbWU6ICdSZW5hbWUnLCBpY29uOiAnZmFzIGZhLWktY3Vyc29yJyB9XG5cdFx0XHRcdFx0XHRcdGlmIChzY29wZS5mLmlzSW1hZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQubWFrZVJlc2l6ZWRDb3B5ID0geyBuYW1lOiAnTWFrZSByZXNpemVkIGNvcHknLCBpY29uOiAnZmFzIGZhLWNvbXByZXNzLWFycm93cy1hbHQnIH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoIXNjb3BlLmYuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0LmRvd25sb2FkID0geyBuYW1lOiAnRG93bmxvYWQnLCBpY29uOiAnZmFzIGZhLWRvd25sb2FkJyB9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKHNjb3BlLmYubmFtZS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcubXA0JykpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQuY29udmVydFRvTVAzID0geyBuYW1lOiAnQ29udmVydCB0byBNUDMnIH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoc2NvcGUuZi5mb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQuemlwRm9sZGVyID0geyBuYW1lOiAnWmlwIEZvbGRlcicsIGljb246ICdmYXMgZmEtY29tcHJlc3MnIH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoIXNjb3BlLmYuZm9sZGVyICYmIHNjb3BlLmYubmFtZS5lbmRzV2l0aCgnLnppcCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0LnVuemlwRmlsZSA9IHsgbmFtZTogJ1VuemlwIEZpbGUnLCBpY29uOiAnZmFzIGZhLWV4cGFuZC1hbHQnIH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0XG5cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFRodW1ibmFpbFVybDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc3J2RmlsZXMuZmlsZVRodW1ibmFpbFVybCh0aGlzLnJvb3REaXIgKyBzY29wZS5mLm5hbWUsIHRodW1ibmFpbFNpemUsIGZyaWVuZFVzZXIpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpZjE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmYubmFtZSAhPSAnLi4nXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpZjI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiAhc2NvcGUuZi5pc0ltYWdlICYmICF0aGlzLmlzTVAzKHNjb3BlKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aWYzOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAhc2NvcGUuZi5mb2xkZXIgJiYgc2NvcGUuZi5pc0ltYWdlXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGBmYSBmYS00eCB3My10ZXh0LWJsdWUtZ3JleSAke2dldEljb25DbGFzcyhzY29wZS5mLm5hbWUpfWBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0bGV0IHNpemUgPSBzY29wZS5mLnNpemVcblx0XHRcdFx0XHRcdGxldCB1bml0ID0gJ29jdGV0cydcblx0XHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0XHR1bml0ID0gJ0tvJ1xuXHRcdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnTW8nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzaXplID0gTWF0aC5mbG9vcihzaXplICogMTApIC8gMTBcblx0XHRcdFx0XHRcdHJldHVybiAnU2l6ZTogJyArIHNpemUgKyAnICcgKyB1bml0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldERpbWVuc2lvbjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkID0gc2NvcGUuZi5kaW1lbnNpb25cblx0XHRcdFx0XHRcdHJldHVybiBgRGltZW5zaW9uOiAke2Qud2lkdGh9eCR7ZC5oZWlnaHR9YFxuXHRcdFx0XHRcdH0sXG5cblxuXHRcdFx0XHRcdGdldERhdGU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKHNjb3BlLmYubXRpbWUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXG5cdFx0XHRcdFx0XHRyZXR1cm4gJ0xhc3QgTW9kaWY6ICcgKyBkYXRlXG5cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0cHJvcDE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiB7IGRpc2FibGVkOiB0aGlzLm5iU2VsZWN0aW9uID09IDAgfVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0cHJvcDI6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiB7IGRpc2FibGVkOiB0aGlzLm5iU2VsZWN0aW9uID09IDAgfHwgdGhpcy5yb290RGlyLnN0YXJ0c1dpdGgoJy9zaGFyZS8nKSB8fCB0aGlzLmlzU2hhcmVTZWxlY3RlZCB9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRwcm9wMzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHsgZGlzYWJsZWQ6IHRoaXMuc2VsZWN0ZWRGaWxlcy5sZW5ndGggPT0gMCB9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdG9uVG9vbGJhckNvbnRleHRNZW51OiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblRvb2xiYXJDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0XHRlbHQuZmluZChgYnV0dG9uW2RhdGEtY21kPSR7ZGF0YS5jbWR9XWApLmNsaWNrKClcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uVG9nZ2xlRG93bmxvYWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblRvZ2dsZURvd25sb2FkJylcblx0XHRcdFx0XHRcdGNvbnN0ICRpID0gJCh0aGlzKS5maW5kKCdpJylcblx0XHRcdFx0XHRcdGNvbnN0IHBhbmVsID0gJCh0aGlzKS5zaWJsaW5ncygnLmRvd25sb2FkSXRlbXMnKVxuXHRcdFx0XHRcdFx0aWYgKCRpLmhhc0NsYXNzKCdmYS1jYXJldC1yaWdodCcpKSB7XG5cdFx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1yaWdodCcpLmFkZENsYXNzKCdmYS1jYXJldC1kb3duJylcblx0XHRcdFx0XHRcdFx0cGFuZWwuc2xpZGVEb3duKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkaS5yZW1vdmVDbGFzcygnZmEtY2FyZXQtZG93bicpLmFkZENsYXNzKCdmYS1jYXJldC1yaWdodCcpXG5cdFx0XHRcdFx0XHRcdHBhbmVsLnNsaWRlVXAoKVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblBhdGhJdGVtOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBhdGhJdGVtID0gJCh0aGlzKS5kYXRhKCdpbmZvJylcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblBhdGhJdGVtJywgcGF0aEl0ZW0pXG5cdFx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRcdFx0XHRcdGxvYWREYXRhKHBhdGhJdGVtID09ICcnID8gJy8nIDogJy8nICsgcGF0aEl0ZW0gKyAnLycpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblJlbG9hZDogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uQ29udGV4dE1lbnU6IGFzeW5jIGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXHRcdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblxuXHRcdFx0XHRcdFx0Y29uc3QgeyByb290RGlyIH0gPSBjdHJsLm1vZGVsXG5cblx0XHRcdFx0XHRcdGlmIChjbWQgPT0gJ2Rvd25sb2FkJykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBzcnZGaWxlcy5maWxlVXJsKHJvb3REaXIgKyBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0XHRcdCQkLnV0aWwuZG93bmxvYWRVcmwodXJsLCBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChjbWQgPT0gJ3JlbmFtZScpIHtcblx0XHRcdFx0XHRcdFx0cmVuYW1lKGluZm8sIGlkeClcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGNtZCA9PSAnbWFrZVJlc2l6ZWRDb3B5Jykge1xuXHRcdFx0XHRcdFx0XHRtYWtlUmVzaXplZENvcHkoaW5mbywgaWR4KVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoY21kID09ICdjb252ZXJ0VG9NUDMnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnZlcnRUb01QMyhpbmZvLCBpZHgpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChjbWQgPT0gJ3ppcEZvbGRlcicpIHtcblx0XHRcdFx0XHRcdFx0emlwRm9sZGVyKGluZm8sIGlkeClcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGNtZCA9PSAndW56aXBGaWxlJykge1xuXHRcdFx0XHRcdFx0XHR1bnppcEZpbGUoaW5mbywgaWR4KVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoY21kID09ICdkZWxldGUnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHsgbmFtZSwgZm9sZGVyIH0gPSBpbmZvXG5cdFx0XHRcdFx0XHRcdGRlbGV0ZUZpbGVzKFt7IGZpbGVOYW1lOiByb290RGlyICsgbmFtZSwgaWR4LCBmb2xkZXIgfV0pXG5cdFx0XHRcdFx0XHR9XG5cblxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblxuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdHJvb3REaXI6IGN0cmwubW9kZWwucm9vdERpcixcblx0XHRcdFx0XHRcdFx0aXNJbWFnZTogaW5mby5pc0ltYWdlXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmaWxlY2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25DaGVja0NsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXG5cdFx0XHRcdFx0XHRpZiAoaW5mby5uYW1lID09ICdzaGFyZScgJiYgY3RybC5tb2RlbC5yb290RGlyID09ICcvJykge1xuXHRcdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmlzU2hhcmVTZWxlY3RlZCA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBuYlNlbGVjdGlvbjogZ2V0TmJTZWxGaWxlcygpIH0pXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkZvbGRlckNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cblx0XHRcdFx0XHRcdGNvbnN0IGRpck5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRm9sZGVyQ2xpY2snLCBkaXJOYW1lKVxuXHRcdFx0XHRcdFx0aWYgKGRpck5hbWUgPT0gJy4uJykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBzcGxpdCA9IGN0cmwubW9kZWwucm9vdERpci5zcGxpdCgnLycpXG5cdFx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXG5cdFx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKHNwbGl0LmpvaW4oJy8nKSArICcvJylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YShjdHJsLm1vZGVsLnJvb3REaXIgKyBkaXJOYW1lICsgJy8nKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25DcmVhdGVGb2xkZXI6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHZhciByb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHRcdFx0XHRjb25zdCBmb2xkZXJOYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHRcdGxhYmVsOiAnRm9sZGVyIG5hbWU6Jyxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdOZXcgRm9sZGVyJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmb2xkZXJOYW1lJywgZm9sZGVyTmFtZSlcblx0XHRcdFx0XHRcdGlmIChmb2xkZXJOYW1lID09IG51bGwpIHJldHVyblxuXG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgc3J2RmlsZXMubWtkaXIocm9vdERpciArIGZvbGRlck5hbWUpXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0aW5zZXJ0RmlsZShyZXNwKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblRvZ2xlU2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHR0b2dnbGVTZWxlY3Rpb24oKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbmJTZWxlY3Rpb246IGdldE5iU2VsRmlsZXMoKSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkRlbGV0ZUZpbGVzOiBmdW5jdGlvbiAoZXYpIHtcblxuXHRcdFx0XHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBnZXRTZWxGaWxlcygpXG5cblx0XHRcdFx0XHRcdGlmIChzZWxGaWxlcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJyxcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiAnTm8gZmlsZXMgc2VsZWN0ZWQnXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRkZWxldGVGaWxlcyhzZWxGaWxlcylcblxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25DdXRGaWxlczogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DdXRGaWxlcycpXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBnZXRTZWxGaWxlcygpLm1hcCgoaSkgPT4gaS5maWxlTmFtZSksXG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2N1dCdcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uQ29weUZpbGVzOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNvcHlGaWxlcycpXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBnZXRTZWxGaWxlcygpLm1hcCgoaSkgPT4gaS5maWxlTmFtZSksXG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2NvcHknXG5cdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uU2hhcmVGaWxlczogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25TaGFyZUZpbGVzJylcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5zaGFyZUZpbGVzKGdldFNlbEZpbGVzKCkubWFwKChpKSA9PiBpLmZpbGVOYW1lKSlcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZScgfSlcblx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBhc3RlRmlsZXM6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUGFzdGVGaWxlcycpXG5cdFx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIsIHNlbGVjdGVkRmlsZXMsIG9wZXJhdGlvbiB9ID0gY3RybC5tb2RlbFxuXG5cdFx0XHRcdFx0XHRsZXQgcmVzcCA9ICcnXG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRpZiAob3BlcmF0aW9uID09ICdjb3B5Jykge1xuXHRcdFx0XHRcdFx0XHRcdHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5jb3B5RmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcilcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRyZXNwID0gYXdhaXQgc3J2RmlsZXMubW92ZUZpbGVzKHNlbGVjdGVkRmlsZXMsIHJvb3REaXIpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZScgfSlcblx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25JbXBvcnRGaWxlOiBmdW5jdGlvbiAoZXYpIHtcblxuXHRcdFx0XHRcdFx0JCQudXRpbC5vcGVuRmlsZURpYWxvZyhhc3luYyBmdW5jdGlvbiAoZmlsZSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlU2l6ZScsIGZpbGUuc2l6ZSAvIDEwMjQpXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdEb3dubG9hZCBmaWxlOicsIGZpbGUubmFtZSlcblx0XHRcdFx0XHRcdFx0Ly8gaWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZFNpemUpIHtcblx0XHRcdFx0XHRcdFx0Ly8gXHQkJC51aS5zaG93QWxlcnQoeyBjb250ZW50OiAnRmlsZSB0b28gYmlnJywgdGl0bGU6ICdJbXBvcnQgZmlsZScgfSlcblx0XHRcdFx0XHRcdFx0Ly8gXHRyZXR1cm5cblx0XHRcdFx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlTmFtZTogZmlsZS5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0cGVyY2VudGFnZTogMFxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHsgZG93bmxvYWRzLCByb290RGlyIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0XHRcdFx0ZG93bmxvYWRzLnB1c2goZGF0YSlcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGVUcmVlKCdkb3dubG9hZHMnKVxuXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgc3J2RmlsZXMudXBsb2FkRmlsZShmaWxlLCBmaWxlLm5hbWUsIGN0cmwubW9kZWwucm9vdERpciwgZnVuY3Rpb24gKHBlcmNlbnRDb21wbGV0ZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS5wZXJjZW50YWdlID0gcGVyY2VudENvbXBsZXRlXG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGVUcmVlKCdkb3dubG9hZHMnKVxuXHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Rvd25sb2FkIEZpbmlzaGVkOiAnLCBkYXRhLmZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9IGRvd25sb2Fkcy5pbmRleE9mKGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0ZG93bmxvYWRzLnNwbGljZShpZHgsIDEpXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC51cGRhdGVOb2RlVHJlZSgnZG93bmxvYWRzJylcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlSW5mbyA9IGF3YWl0IHNydkZpbGVzLmZpbGVJbmZvKHJvb3REaXIgKyBkYXRhLmZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdGluc2VydEZpbGUoZmlsZUluZm8pXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgY29udGVudDogcmVzcC5yZXNwb25zZVRleHQsIHRpdGxlOiAnRXJyb3InIH0pXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9KVxuXG5cdFx0XHRmdW5jdGlvbiBkZWxldGVGaWxlcyhmaWxlTmFtZXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RlbGV0ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdFx0Y29udGVudDogJ0FyZSB5b3Ugc3VyZSA/Jyxcblx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcydcblx0XHRcdFx0fSwgYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgc3J2RmlsZXMucmVtb3ZlRmlsZXMoZmlsZU5hbWVzLm1hcCgoaSkgPT4gaS5maWxlTmFtZSkpXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQvL2xvYWREYXRhKClcdFxuXHRcdFx0XHRcdFx0ZmlsZU5hbWVzLnJldmVyc2UoKS5mb3JFYWNoKChpKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGN0cmwucmVtb3ZlQXJyYXlJdGVtKCdmaWxlcycsIGkuaWR4LCAnZmlsZXMnKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdH1cblxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyLCByZXNldEZpbHRlcnMpIHtcblx0XHRcdFx0aWYgKHJvb3REaXIgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGxvYWRpbmc6IHRydWUgfSlcblx0XHRcdFx0Y29uc3QgZmlsZXMgPSBhd2FpdCBzcnZGaWxlcy5saXN0KHJvb3REaXIsIHsgZmlsdGVyRXh0ZW5zaW9uLCBpbWFnZU9ubHksIGdldE1QM0luZm8gfSwgZnJpZW5kVXNlcilcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblxuXG5cdFx0XHRcdGlmIChyb290RGlyICE9ICcvJykge1xuXHRcdFx0XHRcdGZpbGVzLnVuc2hpZnQoeyBuYW1lOiAnLi4nLCBmb2xkZXI6IHRydWUgfSlcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNvcnRGaWxlcyhmaWxlcylcblxuXHRcdFx0XHRpZiAocmVzZXRGaWx0ZXJzICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdGN0cmwubW9kZWwubXAzRmlsdGVycyA9IG51bGxcblx0XHRcdFx0fVxuXG5cblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRyb290RGlyLFxuXHRcdFx0XHRcdG5iU2VsZWN0aW9uOiAwLFxuXHRcdFx0XHRcdGlzU2hhcmVTZWxlY3RlZDogZmFsc2Vcblx0XHRcdFx0fSlcblxuXHRcdFx0fVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiB1bnppcEZpbGUoaW5mbywgaWR4KSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IHNydkZpbGVzLnVuemlwRmlsZShjdHJsLm1vZGVsLnJvb3REaXIsIGluZm8ubmFtZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gemlwRm9sZGVyKGluZm8sIGlkeCkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy56aXBGb2xkZXIoY3RybC5tb2RlbC5yb290RGlyLCBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1BZnRlcignZmlsZXMnLCBpZHgsIHJlc3AsICdmaWxlcycpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVzJywgY3RybC5tb2RlbC5maWxlcylcblx0XHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGUoJ2luZm8nKVxuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGFzeW5jIGZ1bmN0aW9uIGNvbnZlcnRUb01QMyhpbmZvLCBpZHgpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgc3J2RmlsZXMuY29udmVydFRvTVAzKGN0cmwubW9kZWwucm9vdERpciwgaW5mby5uYW1lKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGN0cmwuaW5zZXJ0QXJyYXlJdGVtQWZ0ZXIoJ2ZpbGVzJywgaWR4LCByZXNwLCAnZmlsZXMnKVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVzJywgY3RybC5tb2RlbC5maWxlcylcblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiBtYWtlUmVzaXplZENvcHkoaW5mbywgaWR4KSB7XG5cdFx0XHRcdGNvbnN0IHBlcmNlbnRhZ2UgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRsYWJlbDogJ1Jlc2NhbGUgcGVyY2VudGFnZTonLFxuXHRcdFx0XHRcdHRpdGxlOiAnTWFrZSByZXNpemVkIGNvcHknLFxuXHRcdFx0XHRcdGF0dHJzOiB7IG1pbjogMTAsIG1heDogOTAsIHR5cGU6ICdudW1iZXInIH0sXG5cdFx0XHRcdFx0dmFsdWU6IDUwXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0aWYgKHBlcmNlbnRhZ2UgIT0gbnVsbCkge1xuXHRcdFx0XHRcdGNvbnN0IHsgcm9vdERpciB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgc3J2RmlsZXMucmVzaXplSW1hZ2Uocm9vdERpciwgaW5mby5uYW1lLCBwZXJjZW50YWdlICsgJyUnKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUFmdGVyKCdmaWxlcycsIGlkeCwgcmVzcCwgJ2ZpbGVzJylcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGUoJ2luZm8nKVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gcmVuYW1lKGluZm8sIGlkeCkge1xuXHRcdFx0XHRjb25zdCBvbGRGaWxlTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRjb25zdCBuZXdGaWxlTmFtZSA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoeyBsYWJlbDogJ05ldyBuYW1lJywgdGl0bGU6ICdSZW5hbWUnLCB2YWx1ZTogb2xkRmlsZU5hbWUgfSlcblx0XHRcdFx0Y29uc29sZS5sb2coJ25ld0ZpbGVOYW1lJywgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdGlmIChuZXdGaWxlTmFtZSAhPSBudWxsICYmIG5ld0ZpbGVOYW1lICE9IG9sZEZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBzcnZGaWxlcy5yZW5hbWVGaWxlKGN0cmwubW9kZWwucm9vdERpciwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5SXRlbSgnZmlsZXMnLCBpZHgsIHJlc3AsICdmaWxlcycpXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGxvYWREYXRhKClcblxuXHRcdFx0ZnVuY3Rpb24gaW5zZXJ0RmlsZShmaWxlSW5mbykge1xuXHRcdFx0XHRsZXQgaWR4ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbHRlcigoZikgPT4gZi5mb2xkZXIpLmxlbmd0aFxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpZHgnLCBpZHgpXG5cdFx0XHRcdGN0cmwuaW5zZXJ0QXJyYXlJdGVtQWZ0ZXIoJ2ZpbGVzJywgaWR4IC0gMSwgZmlsZUluZm8sICdmaWxlcycpXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZmlsZXMuZmlsdGVyKChmKSA9PiAhZi5mb2xkZXIpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0RmlsdGVyZWRGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZ2V0RmlsZXMoKS5maWx0ZXIoKGYpID0+ICFmLmZvbGRlcilcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlQ3RybF0gdXBkYXRlJylcblx0XHRcdFx0bG9hZERhdGEodW5kZWZpbmVkLCBmYWxzZSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVGaWxlID0gYXN5bmMgZnVuY3Rpb24gKGZpbGVOYW1lLCBvcHRpb25zKSB7XG5cdFx0XHRcdGNvbnN0IHsgZmlsZXMsIHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0bGV0IGlkeCA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKS5maW5kSW5kZXgoKGkpID0+IGkubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGVGaWxlJywgaWR4LCBmaWxlTmFtZSwgb3B0aW9ucylcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IHNydkZpbGVzLmZpbGVJbmZvKHJvb3REaXIgKyBmaWxlTmFtZSwgZnJpZW5kVXNlciwgb3B0aW9ucylcblx0XHRcdFx0Y3RybC51cGRhdGVBcnJheUl0ZW0oJ2ZpbGVzJywgaWR4LCBpbmZvKVxuXHRcdFx0XHRpZHggPSBmaWxlcy5maW5kSW5kZXgoKGkpID0+IGkubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0ZmlsZXNbaWR4XSA9IGluZm9cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRNUDNGaWx0ZXJzID0gZnVuY3Rpb24gKG1wM0ZpbHRlcnMpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbXAzRmlsdGVycyB9KVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLm1wM0ZpbHRlcnNcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0JGlmYWNlOiBgXG5cdFx0XHR1cGRhdGUoKTtcblx0XHRcdHVwZGF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgb3B0aW9ucyk7XG5cdFx0XHRzZXRNUDNGaWx0ZXJzKG1wM0ZpbHRlcik7XG5cdFx0XHRnZXRNUDNGaWx0ZXJzKCk6IE1wM0ZpbHRlcjtcblx0XHRcdGdldEZpbGVzKCk6IFtGaWxlSW5mb107XG5cdFx0XHRnZXRGaWx0ZXJlZEZpbGVzKCk6IFtGaWxlSW5mb11cblx0XHRgLFxuXHRcdCRldmVudHM6ICdmaWxlY2xpY2snXG5cblx0fSk7XG5cbn0pKCk7XG4iLCJcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRwcm9wczoge1xuXHRcdHJvb3RQYWdlOiAnJ1xuXHR9LFxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcInNob3dCYWNrXFxcIiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJsZWZ0XFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQmFja1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkJhY2tcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1sZWZ0XFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCIgY2xhc3M9XFxcInRpdGxlXFxcIj48L3NwYW4+XFxuXHRcXG5cdDwvZGl2Plxcblx0PGRpdiBibi1lYWNoPVxcXCJidXR0b25zXFxcIiBibi1ldmVudD1cXFwiY2xpY2suYWN0aW9uOiBvbkFjdGlvbiwgY29udGV4dG1lbnVjaGFuZ2UubWVudTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdDxidXR0b24gYm4tc2hvdz1cXFwic2hvdzFcXFwiIGNsYXNzPVxcXCJ3My1idXR0b24gYWN0aW9uXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGkubGFiZWxcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93MlxcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBhY3Rpb25cXFwiIGJuLWRhdGE9XFxcIntjbWQ6ICRzY29wZS4kaS5uYW1lfVxcXCJcXG5cdFx0XHRibi1hdHRyPVxcXCJ7dGl0bGU6ICRzY29wZS4kaS50aXRsZX1cXFwiPjxpIGJuLWF0dHI9XFxcIntjbGFzczogJHNjb3BlLiRpLmljb259XFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93M1xcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBtZW51XFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6ICRzY29wZS4kaS5pdGVtcywgdHJpZ2dlcjogXFwnbGVmdFxcJywgY21kOiAkc2NvcGUuJGkubmFtZX1cXFwiXFxuXHRcdFx0Ym4tYXR0cj1cXFwie3RpdGxlOiAkc2NvcGUuJGkudGl0bGV9XFxcIj48aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS4kaS5pY29ufVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8L2Rpdj5cdFx0XHRcXG5cdDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgYm4tYmluZD1cXFwiY29udGVudFxcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiPjwvZGl2PlwiLFxuXG5cdCRpZmFjZTogYFxuXHRcdHBvcFBhZ2UoZGF0YSlcblx0XHRwdXNoUGFnZShjdHJsTmFtZSwgb3B0aW9ucylcblx0XHRzZXRCdXR0b25WaXNpYmxlKGJ1dHRvbnNWaXNpYmxlOiB7W2J1dHRvbk5hbWVdOmJvb2xlYW59KVxuXHRgLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3Qge3Jvb3RQYWdlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2hvd0JhY2s6IGZhbHNlLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGJ1dHRvbnM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaXRlbXMgPT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmljb24gPT0gdW5kZWZpbmVkICYmICEoc2NvcGUuJGkudmlzaWJsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pdGVtcyA9PSB1bmRlZmluZWQgJiYgc2NvcGUuJGkuaWNvbiAhPSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zICE9IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQmFjazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkJhY2snKVxuXHRcdFx0XHRcdHJlc3RvcmVQYWdlKHRydWUpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWN0aW9uOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRjb25zdCBwYWdlQ3RybElmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdFx0XHRjb25zdCBmbiA9IGN1ckluZm8uYnV0dG9uc1tjbWRdLm9uQ2xpY2tcblx0XHRcdFx0XHRpZiAodHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdGZuLmNhbGwocGFnZUN0cmxJZmFjZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29udGV4dE1lbnU6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRjb25zdCBwYWdlQ3RybElmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZm4gPSBjdXJJbmZvLmJ1dHRvbnNbY21kXS5vbkNsaWNrXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRmbi5jYWxsKHBhZ2VDdHJsSWZhY2UsIGRhdGEuY21kKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBjb250ZW50ID0gY3RybC5zY29wZS5jb250ZW50XG5cdFx0Y29uc3Qgc3RhY2sgPSBbXVxuXHRcdGxldCBjdXJJbmZvID0gbnVsbFxuXG5cblx0XHRmdW5jdGlvbiByZXN0b3JlUGFnZShpc0JhY2ssIGRhdGEpIHtcblx0XHRcdFxuXHRcdFx0Y29uc3QgaWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygncG9wUGFnZScsIHBhZ2VDdHJsKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNhZmVFbXB0eSgpLnJlbW92ZSgpXG5cdFx0XHRpZiAoaXNCYWNrKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgY3VySW5mby5vbkJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGN1ckluZm8ub25CYWNrKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZW9mIGN1ckluZm8ub25SZXR1cm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRjdXJJbmZvLm9uUmV0dXJuKGRhdGEpXG5cdFx0XHR9XG5cblx0XHRcdGN1ckluZm8gPSBzdGFjay5wb3AoKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNob3coKVxuXHRcdFx0Y29uc3Qge3RpdGxlLCBidXR0b25zfSA9IGN1ckluZm9cblx0XHRcdGN0cmwuc2V0RGF0YSh7c2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKX0pXG5cblx0XHR9XG5cblx0XHR0aGlzLnBvcFBhZ2UgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRyZXR1cm4gcmVzdG9yZVBhZ2UoZmFsc2UsIGRhdGEpXG5cdFx0fVxuXG5cdFx0dGhpcy5wdXNoUGFnZSA9IGZ1bmN0aW9uKGN0cmxOYW1lLCBvcHRpb25zKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbcGFnZXJdIHB1c2hQYWdlJywgY3RybE5hbWUsIG9wdGlvbnMpXG5cblxuXHRcdFx0aWYgKGN1ckluZm8gIT0gbnVsbCkge1xuXHRcdFx0XHRjdXJJbmZvLmN0cmwuaGlkZSgpXG5cdFx0XHRcdHN0YWNrLnB1c2goY3VySW5mbylcblx0XHRcdH1cblxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuXHRcdFx0bGV0IHt0aXRsZSwgcHJvcHMsIG9uUmV0dXJuLCBvbkJhY2ssIGV2ZW50c30gPSBvcHRpb25zXG5cblx0XHRcdGNvbnN0IGNvbnRyb2wgPSBjb250ZW50LmFkZENvbnRyb2woY3RybE5hbWUsICQuZXh0ZW5kKHskcGFnZXI6IHRoaXN9LCBwcm9wcyksIGV2ZW50cylcblxuXHRcdFx0bGV0IGJ1dHRvbnMgPSB7fVxuXG5cdFx0XHRpZiAob3B0aW9ucy5idXR0b25zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRidXR0b25zID0gb3B0aW9ucy5idXR0b25zXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgZ2V0QnV0dG9ucyA9IGNvbnRyb2wuaWZhY2UoKS5nZXRCdXR0b25zXG5cdFx0XHRcdGlmICh0eXBlb2YgZ2V0QnV0dG9ucyA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0YnV0dG9ucyA9IGdldEJ1dHRvbnMoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN1ckluZm8gPSB7dGl0bGUsIGJ1dHRvbnMsIG9uUmV0dXJuLCBvbkJhY2ssIGN0cmw6IGNvbnRyb2x9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7c2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKX0pXG5cdFx0fVx0XG5cblx0XHR0aGlzLnNldEJ1dHRvblZpc2libGUgPSBmdW5jdGlvbihidXR0b25zVmlzaWJsZSkge1xuXG5cdFx0XHRjb25zdCB7YnV0dG9uc30gPSBjdXJJbmZvXG5cblx0XHRcdGZvcihsZXQgYnRuIGluIGJ1dHRvbnNWaXNpYmxlKSB7XG5cdFx0XHRcdGlmIChidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdGJ1dHRvbnNbYnRuXS52aXNpYmxlID0gYnV0dG9uc1Zpc2libGVbYnRuXVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHQgXHRcdFx0XHRcblx0XHRcdGN0cmwuc2V0RGF0YSh7YnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXHRcdH1cblxuXG5cdFx0dGhpcy5wdXNoUGFnZShyb290UGFnZSlcblxuXHR9XG5cbn0pO1xuXG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5mcmllbmRzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0c2hvd1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0c2hvd1NlbmRNZXNzYWdlOiBmYWxzZSxcblx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiB0cnVlXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1lYWNoPVxcXCJmcmllbmRzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLm5vdGlmOiBvblNlbmRNZXNzYWdlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1xcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgbm90aWYgdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTWVzc2FnZVxcXCIgYm4tc2hvdz1cXFwic2hvd1NlbmRNZXNzYWdlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGVcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCIgYm4tY2xhc3M9XFxcImNsYXNzMVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5mcmllbmRVc2VyTmFtZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFxcbjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBmcmllbmRzPC9wPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIGJyb2tlcikge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dTZW5kTWVzc2FnZSwgc2hvd0Nvbm5lY3Rpb25TdGF0ZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdLFxuXHRcdFx0XHRzaG93U2VuZE1lc3NhZ2UsXG5cdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZyaWVuZHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0ICRpID0gc2NvcGUuJGlcblx0XHRcdFx0XHRjb25zdCBzaG93Q29ubmVjdGlvblN0YXRlID0gdGhpcy5zaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdCd3My10ZXh0LWdyZWVuJzogJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LXJlZCc6ICEkaS5pc0Nvbm5lY3RlZCAmJiBzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRcdFx0J3czLXRleHQtYmx1ZSc6ICFzaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgdXNlck5hbWUgPSAgY3RybC5tb2RlbC5mcmllbmRzW2lkeF0uZnJpZW5kVXNlck5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZnJpZW5kY2xpY2snLCB7dXNlck5hbWV9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNlbmRNZXNzYWdlOiBhc3luYyBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZW5kTWVzc2FnZScsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGNvbnN0IHRleHQgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTWVzc2FnZScsIGxhYmVsOiAnTWVzc2FnZTonfSlcblxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VyTmFtZSwge3RleHQsIHJlcGx5OiB0cnVlfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiBvblVwZGF0ZShtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHtpc0Nvbm5lY3RlZCwgdXNlck5hbWV9ID0gbXNnLmRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZyaWVuZHMuZmluZCgoZnJpZW5kKSA9PiB7cmV0dXJuIGZyaWVuZC5mcmllbmRVc2VyTmFtZSA9PSB1c2VyTmFtZX0pXG5cdFx0XHRpbmZvLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWRcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBpZHggPSBlbHQuZmluZCgnbGkudzMtYmx1ZScpLmluZGV4KCk7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzW2lkeF1cblx0XHR9XG5cblx0XHR0aGlzLmdldEZyaWVuZHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHMubWFwKChmcmllbmQpID0+IGZyaWVuZC5mcmllbmRVc2VyTmFtZSlcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dXNlcnMuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tmcmllbmRzXSBkaXNwb3NlJylcblx0XHRcdGJyb2tlci51bnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cdFx0fVxuXG5cblx0XHR0aGlzLnVwZGF0ZSgpXG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTpzdHJpbmc7XG5cdFx0Z2V0RnJpZW5kcygpOltzdHJpbmddXG5cdGAsXG5cblx0JGV2ZW50czogJ2ZyaWVuZGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ob21lJywge1xuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QuYnJva2VyJyxcblx0XHQnYnJlaXpib3QudXNlcnMnLFxuXHRcdCdicmVpemJvdC5ydGMnLFxuXHRcdCdicmVpemJvdC5hcHBzJyxcblx0XHQnYnJlaXpib3Quc2NoZWR1bGVyJ1xuXHRdLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlclxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRnVsbFNjcmVlblxcXCIgYm4tc2hvdz1cXFwiIWZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRXhpdCBGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRXhpdEZ1bGxTY3JlZW5cXFwiIGJuLXNob3c9XFxcImZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jb21wcmVzc1xcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDb25uZWN0aW9uIFN0YXR1c1xcXCI+XFxuXHRcdFx0PGkgYm4tY2xhc3M9XFxcInt3My10ZXh0LWdyZWVuOiBjb25uZWN0ZWQsIHczLXRleHQtcmVkOiAhY29ubmVjdGVkfVxcXCIgY2xhc3M9XFxcImZhIGZhLWNpcmNsZVxcXCI+PC9pPlxcblxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJoYXNJbmNvbWluZ0NhbGxcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25DYWxsUmVzcG9uc2VcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJywgXFxuXHRcdFx0XHR0aXRsZTogY2FsbEluZm8uZnJvbSxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGFjY2VwdDoge25hbWU6IFxcJ0FjY2VwdFxcJ30sXFxuXHRcdFx0XHRcdGRlbnk6IHtuYW1lOiBcXCdEZWNsaW5lXFwnfSxcXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2FsbEluZm8uaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cXG5cdDwhLS0gXHQ8c3Ryb25nIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3N0cm9uZz5cXG4gLS0+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZmljYXRpb24gdzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiTm90aWZpY2F0aW9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtYmVsbFxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1iYWRnZSB3My1yZWQgdzMtdGlueVxcXCIgYm4tdGV4dD1cXFwibmJOb3RpZlxcXCIgYm4tc2hvdz1cXFwiaGFzTm90aWZcXFwiPjwvc3Bhbj5cXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie1xcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0cHdkOiB7bmFtZTogXFwnQ2hhbmdlIHBhc3N3b3JkXFwnLCBpY29uOiBcXCdmYXMgZmEtbG9ja1xcJ30sXFxuXHRcdFx0XHRcdGFwcHM6IHtuYW1lOiBcXCdBcHBsaWNhdGlvbnNcXCcsIGljb246IFxcJ2ZhcyBmYS10aFxcJ30sXFxuXHRcdFx0XHRcdHNlcDogXFwnLS0tLS0tXFwnLFxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiBcXCdMb2dvdXRcXCcsIGljb246IFxcJ2ZhcyBmYS1wb3dlci1vZmZcXCd9XFxuXHRcdFx0XHR9LFxcblx0XHRcdFx0dGl0bGU6IHVzZXJOYW1lLFxcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJ1xcblx0XHRcdH1cXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgZmEtbGdcXFwiPjwvaT5cXG5cdFx0XHQ8IS0tIFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidXNlck5hbWVcXFwiPjwvc3Bhbj5cdFxcbiAtLT4gPGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd24gZmEtbGdcXFwiPjwvaT5cXG5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMudGFic1xcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiIGJuLWlmYWNlPVxcXCJ0YWJzXFxcIlxcblx0Ym4tZXZlbnQ9XFxcInRhYnNyZW1vdmU6IG9uVGFiUmVtb3ZlLCB0YWJzYWN0aXZhdGU6IG9uVGFiQWN0aXZhdGVcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0YXBwczogZ2V0TXlBcHBzLFxcblx0XHRcdGl0ZW1zXFxuXHRcdH1cXFwiIGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGljaywgYXBwY29udGV4dG1lbnU6IG9uVGlsZUNvbnRleHRNZW51XFxcIiB0aXRsZT1cXFwiSG9tZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBicm9rZXIsIHVzZXJzLCBydGMsIHNydkFwcHMsIHNjaGVkdWxlcikge1xuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQXVkaW8oKSB7XG5cdFx0XHRsZXQgYXVkaW8gPSBudWxsXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gcGxheScpXG5cdFx0XHRcdFx0YXVkaW8gPSBuZXcgQXVkaW8oJy9hc3NldHMvc2t5cGUubXAzJylcblx0XHRcdFx0XHRhdWRpby5sb29wID0gdHJ1ZVxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4geyBhdWRpby5wbGF5KCkgfSwgMTAwKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBzdG9wJylcblx0XHRcdFx0XHRpZiAoYXVkaW8gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhdWRpbyA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ0Yy5wcm9jZXNzQ2FsbCgpXG5cblx0XHRydGMub24oJ2NhbGwnLCBmdW5jdGlvbiAoY2FsbEluZm8pIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogdHJ1ZSwgY2FsbEluZm8gfSlcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRydGMub24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogZmFsc2UgfSlcblx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdH0pXG5cblx0XHRjb25zdCB7IHVzZXJOYW1lIH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBhdWRpbyA9IGNyZWF0ZUF1ZGlvKClcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW10sXG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsSW5mbzogbnVsbCxcblx0XHRcdFx0ZnVsbFNjcmVlbjogZmFsc2UsXG5cdFx0XHRcdGNvbm5lY3RlZDogZmFsc2UsXG5cdFx0XHRcdGhhc05vdGlmOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubmJOb3RpZiA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0TXlBcHBzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXBwcy5maWx0ZXIoKGEpID0+IGEuYWN0aXZhdGVkKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpdGVtczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRyZW1vdmU6IHsgbmFtZTogJ1JlbW92ZScgfVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0YXdhaXQgdXNlcnMuYWN0aXZhdGVBcHAoZGF0YS5hcHBOYW1lLCBmYWxzZSlcblx0XHRcdFx0XHRsb2FkQXBwKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BcHBDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0b3BlbkFwcChkYXRhLmFwcE5hbWUpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRsb2dvdXQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2FwcHMnKSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdzdG9yZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAncHdkJykge1xuXHRcdFx0XHRcdFx0Y29uc3QgbmV3UHdkID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IHRpdGxlOiAnQ2hhbmdlIFBhc3N3b3JkJywgbGFiZWw6ICdOZXcgUGFzc3dvcmQ6JyB9KVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ25ld1B3ZCcsIG5ld1B3ZClcblx0XHRcdFx0XHRcdGlmIChuZXdQd2QgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLmNoYW5nZVB3ZChuZXdQd2QpXG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdDaGFuZ2UgUGFzc3dvcmQnLCBjb250ZW50OiAnUGFzc3dvcmQgaGFzIGJlZW4gY2hhbmdlZCcgfSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dCB9KVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyBjb250ZW50OiAnbm8gbm90aWZpY2F0aW9ucycsIHRpdGxlOiAnTm90aWZpY2F0aW9ucycgfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdub3RpZicpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNhbGxSZXNwb25zZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzSW5jb21pbmdDYWxsOiBmYWxzZSB9KVxuXHRcdFx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgZnJvbSwgYXBwTmFtZSB9ID0gY3RybC5tb2RlbC5jYWxsSW5mb1xuXHRcdFx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNhbGxlcjogZnJvbSxcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1xuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkV4aXRGdWxsU2NyZWVuOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkV4aXRGdWxsU2NyZWVuJylcblx0XHRcdFx0XHRkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GdWxsU2NyZWVuOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZ1bGxTY3JlZW4nKVxuXHRcdFx0XHRcdGNvbnN0IGVsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcblx0XHRcdFx0XHRjb25zdCByZXF1ZXN0RnVsbHNjcmVlbiA9IGVsZW0ucmVxdWVzdEZ1bGxzY3JlZW4gfHxcblx0XHRcdFx0XHRcdGVsZW0ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW5cblxuXHRcdFx0XHRcdGlmIChyZXF1ZXN0RnVsbHNjcmVlbikge1xuXHRcdFx0XHRcdFx0cmVxdWVzdEZ1bGxzY3JlZW4uY2FsbChlbGVtKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJSZW1vdmU6IGZ1bmN0aW9uIChldiwgaWR4KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UYWJSZW1vdmUnLCBpZHgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcEV4aXQoKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUudGFicy5yZW1vdmVUYWIoaWR4KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiQWN0aXZhdGU6IGZ1bmN0aW9uIChldiwgdWkpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRhYkFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB7IG5ld1RhYiwgb2xkVGFiIH0gPSB1aVxuXHRcdFx0XHRcdGNvbnN0IG5ld1RhYklkeCA9IG5ld1RhYi5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qgb2xkVGFiSWR4ID0gb2xkVGFiLmluZGV4KClcblx0XHRcdFx0XHRpZiAob2xkVGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKG9sZFRhYklkeClcblx0XHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8obmV3VGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID09IDApIHtcblx0XHRcdFx0XHRcdGxvYWRBcHAoKVxuXHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmtpdGZ1bGxzY3JlZW5jaGFuZ2VcIiwgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZnVsbHNjcmVlbmNoYW5nZScsIGV2KVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgZnVsbFNjcmVlbjogIWN0cmwubW9kZWwuZnVsbFNjcmVlbiB9KVxuXHRcdH0pXG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZnVsbHNjcmVlbmNoYW5nZVwiLCBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdmdWxsc2NyZWVuY2hhbmdlJywgZXYpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBmdWxsU2NyZWVuOiAhY3RybC5tb2RlbC5mdWxsU2NyZWVuIH0pXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZU5vdGlmcyhuYk5vdGlmKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBuYk5vdGlmIH0pXG5cblx0XHR9XG5cblx0XHRicm9rZXIub24oJ2Nvbm5lY3RlZCcsIChzdGF0ZSkgPT4ge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgY29ubmVjdGVkOiBzdGF0ZSB9KVxuXHRcdH0pXG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tob21lXSBtZXNzYWdlJywgZXYuZGF0YSlcblx0XHRcdGNvbnN0IHsgdHlwZSwgZGF0YSB9ID0gZXYuZGF0YVxuXHRcdFx0aWYgKHR5cGUgPT0gJ29wZW5BcHAnKSB7XG5cdFx0XHRcdGNvbnN0IHsgYXBwTmFtZSwgYXBwUGFyYW1zIH0gPSBkYXRhXG5cdFx0XHRcdG9wZW5BcHAoYXBwTmFtZSwgYXBwUGFyYW1zKVxuXHRcdFx0fVxuXG5cdFx0fSwgZmFsc2UpXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMobXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5sb2dvdXQnLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHRsb2NhdGlvbi5ocmVmID0gJy9sb2dvdXQnXG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gb3BlbkFwcChhcHBOYW1lLCBwYXJhbXMpIHtcblx0XHRcdGNvbnN0IGFwcEluZm8gPSBjdHJsLm1vZGVsLmFwcHMuZmluZCgoYSkgPT4gYS5hcHBOYW1lID09IGFwcE5hbWUpXG5cdFx0XHRjb25zdCB0aXRsZSA9IGFwcEluZm8ucHJvcHMudGl0bGVcblx0XHRcdC8vY29uc29sZS5sb2coJ29wZW5BcHAnLCBhcHBOYW1lLCBwYXJhbXMpXG5cdFx0XHRsZXQgaWR4ID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZGV4RnJvbVRpdGxlKHRpdGxlKVxuXHRcdFx0Y29uc3QgYXBwVXJsID0gJCQudXRpbC5nZXRVcmxQYXJhbXMoYC9hcHBzLyR7YXBwTmFtZX1gLCBwYXJhbXMpXG5cdFx0XHRpZiAoaWR4IDwgMCkgeyAvLyBhcHBzIG5vdCBhbHJlYWR5IHJ1blxuXHRcdFx0XHRpZHggPSBjdHJsLnNjb3BlLnRhYnMuYWRkVGFiKHRpdGxlLCB7XG5cdFx0XHRcdFx0cmVtb3ZhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdGNvbnRyb2w6ICdicmVpemJvdC5hcHBUYWInLFxuXHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRhcHBVcmxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0aWYgKHBhcmFtcyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5zZXRBcHBVcmwoYXBwVXJsKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2NvcGUudGFicy5zZXRTZWxlY3RlZFRhYkluZGV4KGlkeClcblxuXHRcdH1cblxuXHRcdHVzZXJzLmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblxuXHRcdGZ1bmN0aW9uIGxvYWRBcHAoKSB7XG5cdFx0XHRzcnZBcHBzLmxpc3RBbGwoKS50aGVuKChhcHBzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGFwcHNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHR9XG5cblx0XHRsb2FkQXBwKClcblxuXHRcdHNldEludGVydmFsKHNlbmRQb3NpdGlvbiwgMzAgKiAxMDAwKSAvLyBldmVyeSAzMCBzZWNcblxuXHRcdGxldCBjb29yZHMgPSBudWxsXG5cblx0XHRmdW5jdGlvbiBnZW9FcnJvcihlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZ2VvbG9jIGVycm9yOicsIGUpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTG9jYXRpb24ocG9zaXRpb24pIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3VwZGF0ZUxvY2F0aW9uJywgcG9zaXRpb24pXG5cdFx0XHRjb29yZHMgPSBwb3NpdGlvbi5jb29yZHNcblx0XHR9XG5cblx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKHVwZGF0ZUxvY2F0aW9uKVxuXG5cdFx0bmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24odXBkYXRlTG9jYXRpb24sIGdlb0Vycm9yLFxuXHRcdFx0e1xuXHRcdFx0XHRlbmFibGVIaWdoQWNjdXJhY3k6IHRydWVcblx0XHRcdH1cblx0XHQpXG5cblxuXHRcdGZ1bmN0aW9uIHNlbmRQb3NpdGlvbigpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbmRQb3NpdGlvbicsIGNvb3Jkcylcblx0XHRcdGlmIChjb29yZHMgIT0gbnVsbCkge1xuXHRcdFx0XHR1c2Vycy5zZW5kUG9zaXRpb24oe1xuXHRcdFx0XHRcdGxhdDogY29vcmRzLmxhdGl0dWRlLFxuXHRcdFx0XHRcdGxuZzogY29vcmRzLmxvbmdpdHVkZVxuXHRcdFx0XHR9KVxuXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVxdWVzdFdha2VMb2NrKCkge1xuXHRcdFx0aWYgKG5hdmlnYXRvci53YWtlTG9jayAmJiBuYXZpZ2F0b3Iud2FrZUxvY2sucmVxdWVzdCkge1xuXHRcdFx0XHRuYXZpZ2F0b3Iud2FrZUxvY2sucmVxdWVzdCgnc2NyZWVuJykudGhlbigobG9jaykgPT4ge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCd0YWtlIHdha2VMb2NrJylcblx0XHRcdFx0XHRsb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbGVhc2UnLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnV2FrZSBMb2NrIHdhcyByZWxlYXNlZCcpXG5cdFx0XHRcdFx0ICB9KVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKCdXYWtlTG9jaycsIGUpXG5cdFx0XHRcdH0pXG5cdFx0XG5cdFx0XHR9XG5cdFx0XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIG9uVmlzaWJpbGl0eUNoYW5nZSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCd2aXNpYmlsaXR5Y2hhbmdlJywgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlKVxuXHRcdFx0aWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG5cdFx0XHRcdHJlcXVlc3RXYWtlTG9jaygpXG5cdFx0XHR9XHRcblx0XHR9XG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgb25WaXNpYmlsaXR5Q2hhbmdlKVxuXG5cdFx0cmVxdWVzdFdha2VMb2NrKClcblxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wZGYnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIndhaXRcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT4gUmVuZGVyaW5nLi4uXFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwiIXdhaXRcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJGaXRcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25GaXRcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcInBhZ2VzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwicHJldmlvdXMgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1sZWZ0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJuZXh0IHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtcmlnaHRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXY+XFxuXHRcdFx0UGFnZXM6IDxzcGFuIGJuLXRleHQ9XFxcImN1cnJlbnRQYWdlXFxcIj48L3NwYW4+IC8gPHNwYW4gYm4tdGV4dD1cXFwibnVtUGFnZXNcXFwiPjwvc3Bhbj5cdFx0XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXHRcXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucGRmXFxcIiBcXG5cdGJuLWRhdGE9XFxcInt3b3JrZXI6IFxcJy9icmFpbmpzL3BkZi93b3JrZXIuanNcXCd9XFxcIlxcblx0Ym4taWZhY2U9XFxcInBkZlxcXCJcXG5cdCBcXG4+PC9kaXY+XHRcdFxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0dXJsOiAnJ1xuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBmaWxlcykge1xuXG5cdFx0Y29uc3QgeyB1cmwgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bnVtUGFnZXM6IDAsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0Y3VycmVudFBhZ2U6IDEsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm51bVBhZ2VzID4gMSAmJiAhdGhpcy53YWl0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25OZXh0UGFnZTogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25OZXh0UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRQYWdlID0gYXdhaXQgY3RybC5zY29wZS5wZGYubmV4dFBhZ2UoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZSB9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUHJldlBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9IGF3YWl0IGN0cmwuc2NvcGUucGRmLnByZXZQYWdlKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50UGFnZSwgd2FpdDogZmFsc2UgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpdDogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y3RybC5zY29wZS5wZGYuZml0KClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIG9wZW5GaWxlKHVybCwgdGl0bGUpIHtcblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXG5cdFx0XHRjb25zdCBudW1QYWdlcyA9IGF3YWl0IGN0cmwuc2NvcGUucGRmLm9wZW5GaWxlKHVybClcblx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIGxvYWRlZCcpXG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0bnVtUGFnZXMsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGlmICh1cmwgIT0gJycpIHtcblx0XHRcdG9wZW5GaWxlKHVybClcblx0XHR9XG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3NldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRvcGVuRmlsZShkYXRhLnVybClcblx0XHRcdH1cblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmx9KVxuXHRgXG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcE5hbWU6ICcnLFxuXHRcdGljb25DbHM6ICcnLFxuXHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJ1xuXHR9LFxuXG5cdC8vdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInN0YXR1c1xcXCI+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbmNlbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cyXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2FwcE5hbWUsIGljb25DbHMsIHRpdGxlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0ICRjaGlsZHJlbiA9IGVsdC5jaGlsZHJlbigpLnJlbW92ZSgpXG5cdFx0ZWx0LmFwcGVuZChcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzdGF0dXNcXFwiPlxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmVcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG48ZGl2IGJuLXNob3c9XFxcInNob3c0XFxcIiBibi1iaW5kPVxcXCJwYW5lbFxcXCIgY2xhc3M9XFxcInBhbmVsXFxcIj48L2Rpdj5cIilcblxuXHRcdHJ0Yy5vbignc3RhdHVzJywgKGRhdGEpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3N0YXR1cycsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoZGF0YSlcblx0XHR9KVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0XHRkaXN0YW50OiAnJyxcblx0XHRcdFx0aGFzQ2hpbGRyZW46ICRjaGlsZHJlbi5sZW5ndGggPiAwLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7IFxuXHRcdFx0XHRcdHJldHVybiBbJ3JlYWR5JywgJ2Rpc2Nvbm5lY3RlZCcsICdyZWZ1c2VkJywgJ2NhbmNlbGVkJ10uaW5jbHVkZXModGhpcy5zdGF0dXMpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2NhbGxpbmcnfSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJ30sXG5cdFx0XHRcdHNob3c0OiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcgJiYgdGhpcy5oYXNDaGlsZHJlbn1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNhbGwnKVxuXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dTZWxlY3Rpb246IHRydWVcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRidXR0b25zOiB7XG5cdFx0XHRcdFx0XHRcdGNhbGw6IHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0NhbGwnLFxuXHRcdFx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB0aGlzLmdldFNlbGVjdGlvbigpXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoc2VsZWN0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGZyaWVuZCd9KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHtmcmllbmRVc2VyTmFtZSwgaXNDb25uZWN0ZWR9ID0gc2VsZWN0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlck5hbWUnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJywgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogYFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odXNlck5hbWUpIHtcblx0XHRcdFx0XHRcdFx0cnRjLmNhbGwodXNlck5hbWUsIGFwcE5hbWUsIGljb25DbHMpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdydGNoYW5ndXAnKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRjdHJsLnNjb3BlLnBhbmVsLmFwcGVuZCgkY2hpbGRyZW4pXHRcdFxuXHR9XG5cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5zZWFyY2hiYXInLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCIgYm4tYmluZD1cXFwiZm9ybVxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwic2VhcmNoXFxcIiBcXG4gICAgICAgIG5hbWU9XFxcInZhbHVlXFxcIiBcXG4gICAgICAgIGJuLWF0dHI9XFxcIntwbGFjZWhvbGRlcn1cXFwiXFxuXHRcdHJlcXVpcmVkPVxcXCJcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0XFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My10ZXh0LWJsdWVcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCIgPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XCIsXG5cbiAgICBwcm9wczoge1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cbiAgICAgICAgY29uc3Qge3BsYWNlaG9sZGVyfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvblNlYXJjaDogYXN5bmMgZnVuY3Rpb24oZXYpIHtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7dmFsdWV9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG4gICAgICAgICAgICAgICAgICAgIGVsdC50cmlnZ2VyKCdzZWFyY2hiYXJzdWJtaXQnLCB7dmFsdWV9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgY3RybC5zY29wZS5mb3JtLnNldEZvcm1EYXRhKHt2YWx1ZX0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgICRpZmFjZTogYFxuICAgICAgICBzZXRWYWx1ZSh2YWx1ZTogc3RyaW5nKVxuICAgIGAsXG4gICAgJGV2ZW50czogJ3NlYXJjaGJhcnN1Ym1pdCdcbn0pOzExXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWRkVXNlcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Vc2VyTmFtZTwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwidXNlcm5hbWVcXFwiIG5hbWU9XFxcInVzZXJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+UHNldWRvPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJwc2V1ZG9cXFwiIG5hbWU9XFxcInBzZXVkb1xcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkxvY2F0aW9uPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJsb2NhdGlvblxcXCIgbmFtZT1cXFwibG9jYXRpb25cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgcGxhY2Vob2xkZXI9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ+XHRcXG5cdDwvZGl2Plxcblx0XFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHQkcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjcmVhdGU6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0NyZWF0ZScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcblx0XHR9XG5cblx0fVxuXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC51c2VycycsIHtcblx0ZGVwczogWydicmVpemJvdC51c2VycyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJVcGRhdGVcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtcmVkb1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIiB0aXRsZT1cXFwiQWRkIFVzZXJcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1wbHVzXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+VXNlciBOYW1lPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlBzZXVkbzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Mb2NhdGlvbjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5FbWFpbDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5DcmVhdGUgRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5MYXN0IExvZ2luIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uczwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiZGF0YVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGUsIGNsaWNrLm5vdGlmOiBvbk5vdGlmXFxcIj5cXG4gIFx0XHRcdDx0cj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudXNlcm5hbWVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBzZXVkb1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubG9jYXRpb25cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkID5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8c3BhbiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDJcXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHRcdFx0YXQgXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDNcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwiZGVsZXRlIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiRGVsZXRlIFVzZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWYgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdDwvdHI+ICAgICAgXHRcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YTogW10sXG5cdFx0XHRcdHRleHQxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5jcmVhdGVEYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkubGFzdExvZ2luRGF0ZSkudG9Mb2NhbGVUaW1lU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5jcmVhdGVEYXRlICE9IHVuZGVmaW5lZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSB1bmRlZmluZWQgJiYgc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRVc2VyOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuYWRkVXNlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHR1c2Vycy5hZGQoZGF0YSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHt1c2VybmFtZX0gPSBjdHJsLm1vZGVsLmRhdGFbaWR4XVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ0RlbGV0ZSBVc2VyJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0dXNlcnMucmVtb3ZlKHVzZXJuYW1lKS50aGVuKGdldFVzZXJzKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWY6IGFzeW5jIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7dXNlcm5hbWV9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE5vdGlmaWNhdGlvbicsIGxhYmVsOiAnTWVzc2FnZSd9KVxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VybmFtZSwge3RleHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25VcGRhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuXHRcdFx0dXNlcnMubGlzdCgpLnRoZW4oKGRhdGEpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2RhdGF9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRnZXRVc2VycygpXG5cblxuXG5cdH1cblxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3Qudmlld2VyJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWlmPVxcXCJpZjFcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcImltYWdlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5pbWFnZVxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcIntzcmM6IHVybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBibi1pZj1cXFwiaWYyXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJwZGZcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmVpemJvdC5wZGZcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7dXJsfVxcXCIgXFxuXHRcdFxcblx0XHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlmM1xcXCIgY2xhc3M9XFxcImF1ZGlvXFxcIj5cXG5cdDxhdWRpbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L2F1ZGlvPlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlmNFxcXCIgY2xhc3M9XFxcInZpZGVvXFxcIj5cXG5cdDx2aWRlbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L3ZpZGVvPlxcbjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0dHlwZTogJycsXG5cdFx0dXJsOiAnIydcblx0fSxcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXMpIHtcblxuXHRcdGxldCB7dHlwZSwgdXJsfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dXJsLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRpZjE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2ltYWdlJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3BkZidcblx0XHRcdFx0fSxcblx0XHRcdFx0aWYzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdhdWRpbydcblx0XHRcdFx0fSxcblx0XHRcdFx0aWY0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICd2aWRlbydcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbVmlld2VyXSBzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCkge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3VybDogZGF0YS51cmx9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmw6IHN0cmluZ30pXG5cdFx0YFxuXG59KTtcblxuXG5cblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcERhdGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdGxldCBfZGF0YSA9IGNvbmZpZ1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldERhdGE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gX2RhdGFcblx0XHRcdH0sXG5cblx0XHRcdHNhdmVEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdF9kYXRhID0gZGF0YVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2FwcERhdGEnLCBkYXRhKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldERhdGEoKTpEYXRhO1xuXHRcdHNhdmVEYXRhKGRhdGEpOlByb21pc2UgXG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3RBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0QWxsKCk6UHJvbWlzZTtcblx0XHRgXG59KTtcbiIsIihmdW5jdGlvbigpIHtcblxuXG5cdGNsYXNzIEJyb2tlckNsaWVudCBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXG5cdFx0Y29uc3RydWN0b3IoKSB7XG5cdFx0XHRzdXBlcigpXG5cblx0XHRcdHRoaXMuc29jayA9IG51bGxcblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSB0cnVlXG5cdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0dGhpcy50b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7d2lsZGNhcmQ6IHRydWV9KVxuXHRcdFx0dGhpcy5waW5nSW50ZXJ2YWwgPSAxMCoxMDAwXG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFxuXG5cdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3MgPSB7fVxuXG5cdFx0XHRsZXQge2hvc3RuYW1lLCBwYXRobmFtZSwgcHJvdG9jb2x9ID0gbG9jYXRpb25cblx0XHRcdHByb3RvY29sPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRcdHRoaXMudXJsID0gYCR7cHJvdG9jb2x9Ly8ke2hvc3RuYW1lfS9obWkke3BhdGhuYW1lfWBcblx0XHR9XG5cblx0XHRjaGVja1BpbmcoKSB7XG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCF0aGlzLmlzUGluZ09rKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3RpbWVvdXQgcGluZycpXG5cdFx0XHRcdFx0dGhpcy5zb2NrLm9ubWVzc2FnZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2suY2xvc2UoKVxuXHRcdFx0XHRcdHRoaXMub25DbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncGluZyd9KVxuXHRcdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGhpcy5waW5nSW50ZXJ2YWwpXHRcdFx0XG5cdFx0fVxuXG5cdFx0b25DbG9zZSgpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQ2xvc2UnKVxuXHRcdFx0aWYgKHRoaXMuaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0dGhpcy5lbWl0KCdjb25uZWN0ZWQnLCBmYWxzZSlcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRoaXMudHJ5UmVjb25uZWN0KSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge3RoaXMuY29ubmVjdCgpfSwgNTAwMClcblx0XHRcdH1cdFx0XHRcblx0XHR9XG5cblx0XHRjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHR0aGlzLnNvY2sgPSBuZXcgV2ViU29ja2V0KHRoaXMudXJsKVxuXHRcblx0XHRcdHRoaXMuc29jay5vbm9wZW4gPSAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIHRydWUpXG5cdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuc29jay5vbm1lc3NhZ2UgPSAgKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSB0aGlzLnNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gbWVzc2FnZSBiYWQgdGFyZ2V0JywgbXNnLnR5cGUpXG5cdFx0XHRcdFx0ZXYuY3VycmVudFRhcmdldC5jbG9zZSgpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gbWVzc2FnZScsIG1zZylcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAncmVhZHknKSB7XG5cdFx0XHRcdFx0Ly8gdGhpcy50b3BpY3MuZXZlbnROYW1lcygpLmZvckVhY2goKHRvcGljKSA9PiB7XG5cdFx0XHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFxuXHRcdFx0XHRcdC8vIH0pXHRcdFxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMucmVnaXN0ZXJlZFRvcGljcykuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0fSlcdFxuXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWFkeScsIHtjbGllbnRJZDogbXNnLmNsaWVudElkfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRoaXMudG9waWNzLmVtaXQobXNnLnRvcGljLCBtc2cpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSBmYWxzZVxuXHRcdFx0XHRcdHRoaXMuc29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gdGhpcy5zb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlIGJhZCB0YXJnZXQnKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlJylcblx0XHRcdFx0aWYgKHRoaXMudGltZW91dElkICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRJZClcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLm9uQ2xvc2UoKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cblx0XHRzZW5kTXNnKG1zZykge1xuXHRcdFx0bXNnLnRpbWUgPSBEYXRlLm5vdygpXG5cdFx0XHR2YXIgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHNlbmRNc2cnLCBtc2cpXG5cdFx0XHRcdHRoaXMuc29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdHZhciBtc2cgPSB7XG5cdFx0XHRcdHR5cGU6ICdub3RpZicsXG5cdFx0XHRcdHRvcGljLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0b25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRyZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAodGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9IDFcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFx0XHRcblx0XHR9XG5cblx0XHR1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0aGlzLnRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0Ly8gY29uc3QgbmJMaXN0ZW5lcnMgPSB0aGlzLnRvcGljcy5saXN0ZW5lcnModG9waWMpLmxlbmd0aFxuXG5cdFx0XHQvLyBpZiAobmJMaXN0ZW5lcnMgPT0gMCkgeyAvLyBubyBtb3JlIGxpc3RlbmVycyBmb3IgdGhpcyB0b3BpY1xuXHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0Ly8gfVx0XG5cdFx0XHRpZiAoLS10aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljfSlcblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cblx0XHRcblx0fVxuXG5cblxuXG5cdCQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCB7XG5cblx0XHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdFx0Y29uc3QgY2xpZW50ID0gbmV3IEJyb2tlckNsaWVudCgpXG5cdFx0XHRjbGllbnQuY29ubmVjdCgpXG5cblx0XHRcdHJldHVybiBjbGllbnRcblx0XHR9LFxuXG5cdFx0JGlmYWNlOiBgXG5cdFx0XHRlbWl0VG9waWModG9waWNOYW1lLCBkYXRhKTtcblx0XHRcdHJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0dW5yZWdpc3Rlcih0b3BpY05hbWUsIGNhbGxiYWNrKTtcblx0XHRcdG9uVG9waWModG9waWNOYW1lLCBjYWxsYmFjaylcblxuXHRcdGBcblx0fSlcblxuXG59KSgpO1xuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuY2l0aWVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9jaXRpZXMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldENvdW50cmllczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2NvdW50cmllcycpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRDaXRpZXM6IGZ1bmN0aW9uKGNvdW50cnksIHNlYXJjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY2l0aWVzJywge2NvdW50cnksIHNlYXJjaH0pXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0Q291bnRyaWVzKCk6UHJvbWlzZTtcblx0XHRnZXRDaXRpZXMoY291bnRyeSwgc2VhcmNoKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvZmlsZXMnKVxuXHRcdFxuXHRcdHJldHVybiB7XG5cdFx0XHRmaWxlSW5mbzogZnVuY3Rpb24oZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gZmlsZUluZm8nLCBmaWxlUGF0aCwgZnJpZW5kVXNlciwgb3B0aW9ucylcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZmlsZUluZm8nLCB7ZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnN9KVxuXHRcdFx0fSxcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uKGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGxpc3QnLCBkZXN0UGF0aClcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvbGlzdCcsIHtkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHtmaWxlTmFtZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVGh1bWJuYWlsVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHtmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGxvYWRGaWxlOiBmdW5jdGlvbihibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgsIG9uVXBsb2FkUHJvZ3Jlc3MpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gdXBsb2FkRmlsZScsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aClcblx0XHRcdFx0aWYgKCEoYmxvYiBpbnN0YW5jZW9mIEJsb2IpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2Jsb2InLCBibG9iKVxuXHRcdFx0XHR2YXIgZmQgPSBuZXcgRm9ybURhdGEoKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0ZmQuYXBwZW5kKCdkZXN0UGF0aCcsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0Rm9ybURhdGEoJy9zYXZlJywgZmQsIG9uVXBsb2FkUHJvZ3Jlc3MpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZGVsZXRlJywgZmlsZU5hbWVzKVxuXHRcdFx0fSxcblxuXHRcdFx0bWtkaXI6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1rZGlyJywgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9ta2RpcicsIHtmaWxlTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbW92ZUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzaGFyZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gc2hhcmVGaWxlcycsIGZpbGVOYW1lcylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aDogJy9zaGFyZSd9KVxuXHRcdFx0fSxcdFx0XHRcblxuXHRcdFx0Y29weUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGNvcHlGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb3B5Jywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fSxcdFxuXHRcdFx0cmVuYW1lRmlsZTogZnVuY3Rpb24oZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW5hbWVGaWxlJywgZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3JlbmFtZScsIHtmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHRyZXNpemVJbWFnZTogZnVuY3Rpb24oZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVzaXplSW1hZ2UnLCBmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3Jlc2l6ZUltYWdlJywge2ZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0fSlcblx0XHRcdH0sXG5cdFx0XHRjb252ZXJ0VG9NUDM6IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBjb252ZXJ0VG9NUDMnLCBmaWxlUGF0aCwgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb252ZXJ0VG9NUDMnLCB7ZmlsZVBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHR6aXBGb2xkZXI6IGZ1bmN0aW9uKGZvbGRlclBhdGgsIGZvbGRlck5hbWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gemlwRm9sZGVyJywgZm9sZGVyUGF0aCwgZm9sZGVyTmFtZSlcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3ppcEZvbGRlcicsIHtmb2xkZXJQYXRoLCBmb2xkZXJOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHR1bnppcEZpbGU6IGZ1bmN0aW9uKGZvbGRlclBhdGgsIGZpbGVOYW1lKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVuemlwRmlsZScsIGZvbGRlclBhdGgsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvdW56aXBGaWxlJywge2ZvbGRlclBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdH1cblxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KHBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXIpOlByb21pc2U8W0ZpbGVJbmZvXT47XG5cdFx0ZmlsZUluZm8oZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMpOlByb21pc2U8RmlsZUluZm8+XG5cdFx0ZmlsZVVybChmaWxlTmFtZSwgZnJpZW5kVXNlcik6c3RyaW5nO1xuXHRcdGZpbGVUaHVtYm5haWxVcmwoZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpOnN0cmluZztcblx0XHR1cGxvYWRGaWxlKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCk6UHJvbWlzZTtcblx0XHRyZW1vdmVGaWxlcyhmaWxlTmFtZXMpOlByb21pc2U7XG5cdFx0bWtkaXIoZmlsZU5hbWUpOlByb21pc2U7XG5cdFx0bW92ZUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0Y29weUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0cmVuYW1lRmlsZShmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKTpQcm9taXNlO1xuXHRcdHJlc2l6ZUltYWdlKGZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0KTpQcm9taXNlO1xuXHRcdGNvbnZlcnRUb01QMyhmaWxlUGF0aCwgZmlsZU5hbWUpOlByb21pc2Vcblx0XHR6aXBGb2xkZXIoZm9sZGVyUGF0aCwgZm9sZGVyTmFtZSk6UHJvbWlzZVxuXHRgXG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lmh0dHAnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIHJlc291cmNlKGAvYXBpL2FwcC8ke3BhcmFtcy4kYXBwTmFtZX1gKVxuXHR9XG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhZ2VyJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0cmV0dXJuICQoJy5icmVpemJvdFBhZ2VyJykuaWZhY2UoKVxuXHR9XG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhcmFtcycsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAodHlwZW9mIGNvbmZpZyA9PSAnc3RyaW5nJykgPyBKU09OLnBhcnNlKGNvbmZpZykgOiB7fVxuXHR9XG59KTtcbiIsIihmdW5jdGlvbigpe1xuXG5jbGFzcyBSVEMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIyIHtcblx0Y29uc3RydWN0b3IoYnJva2VyLCBodHRwLCBwYXJhbXMpIHtcblxuXHRcdHN1cGVyKClcblxuXHRcdHRoaXMuYnJva2VyID0gYnJva2VyXG5cdFx0dGhpcy5odHRwID0gaHR0cFxuXG5cdFx0dGhpcy5zcmRJZCA9IHVuZGVmaW5lZFxuXHRcdHRoaXMuZGVzdElkID0gdW5kZWZpbmVkXG5cdFx0dGhpcy5kaXN0YW50ID0gJydcblx0XHR0aGlzLnN0YXR1cyA9ICdyZWFkeSdcblx0XHR0aGlzLmlzQ2FsbGVlID0gZmFsc2Vcblx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdHRoaXMuZGlzdGFudCA9IHBhcmFtcy5jYWxsZXJcblx0XHRcdHRoaXMuZGVzdElkID0gcGFyYW1zLmNsaWVudElkXG5cdFx0XHR0aGlzLmlzQ2FsbGVlID0gdHJ1ZVxuXHRcdH1cblxuXHRcdGJyb2tlci5vbigncmVhZHknLCAobXNnKSA9PiB7XG5cdFx0XHR0aGlzLnNyY0lkID0gbXNnLmNsaWVudElkXG5cdFx0XHR0aGlzLmVtaXQoJ3JlYWR5Jylcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5hY2NlcHQnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5jYW5jZWwoZmFsc2UpXG5cdFx0XHR0aGlzLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0dGhpcy5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcdFxuXHRcdFx0dGhpcy5lbWl0KCdhY2NlcHQnKVx0XG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmRlbnknLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5zdGF0dXMgPSAncmVmdXNlZCdcblx0XHRcdHRoaXMuY2FuY2VsKGZhbHNlKVxuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRcdHRoaXMuZW1pdCgnZGVueScpXHRcblxuXHRcdH0pXHRcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5ieWUnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5zdGF0dXMgPSAnZGlzY29ubmVjdGVkJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRcdHRoaXMuZW1pdCgnYnllJylcblxuXHRcdH0pXHRcdFx0XHRcblx0fVxuXG5cdGdldFJlbW90ZUNsaWVudElkKCkge1xuXHRcdHJldHVybiB0aGlzLmRlc3RJZFxuXHR9XG5cblx0cHJvY2Vzc0NhbGwoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIHByb2Nlc3NDYWxsJylcblx0XHR0aGlzLmJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmNhbGwnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5kZXN0SWQgPSBtc2cuc3JjSWRcblx0XHRcdHRoaXMuZW1pdCgnY2FsbCcsIG1zZy5kYXRhKVxuXHRcdH0pXG5cblx0XHR0aGlzLmJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmNhbmNlbCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLmVtaXQoJ2NhbmNlbCcpXG5cdFx0fSlcdFx0XG5cdH1cblxuXHRvbkRhdGEobmFtZSwgY2FsbGJhY2spIHtcblx0XHR0aGlzLmJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuJyArIG5hbWUsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKG1zZy5kYXRhLCBtc2cudGltZSlcblx0XHR9KVx0XHRcdFxuXHR9XG5cblx0ZW1pdFN0YXR1cygpIHtcblx0XHR0aGlzLmVtaXQoJ3N0YXR1cycsIHtzdGF0dXM6IHRoaXMuc3RhdHVzLCBkaXN0YW50OiB0aGlzLmRpc3RhbnR9KVxuXHR9XG5cblx0Y2FsbCh0bywgYXBwTmFtZSwgaWNvbkNscykge1xuXHRcdHRoaXMuZGlzdGFudCA9IHRvXG5cdFx0dGhpcy5zdGF0dXMgPSAnY2FsbGluZydcblx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdHJldHVybiB0aGlzLmh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvVXNlcmAsIHtcblx0XHRcdHRvLFxuXHRcdFx0c3JjSWQ6IHRoaXMuc3JjSWQsXG5cdFx0XHR0eXBlOiAnY2FsbCcsXG5cdFx0XHRkYXRhOiB7YXBwTmFtZSwgaWNvbkNsc31cblx0XHR9KVxuXHR9XHRcblxuXHRjYW5jZWwodXBkYXRlU3RhdHVzID0gdHJ1ZSkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBjYW5jZWwnLCB1cGRhdGVTdGF0dXMpXG5cdFx0aWYgKHVwZGF0ZVN0YXR1cykge1xuXHRcdFx0dGhpcy5zdGF0dXMgPSAnY2FuY2VsZWQnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVx0XHRcdFxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5odHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7dG86IHRoaXMuZGlzdGFudCwgc3JjSWQ6IHRoaXMuc3JjSWQsIHR5cGU6ICdjYW5jZWwnfSlcblx0fVx0XG5cblx0YWNjZXB0KCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBhY2NlcHQnKVxuXG5cdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRyZXR1cm4gdGhpcy5zZW5kRGF0YSgnYWNjZXB0Jylcblx0fVxuXG5cdGRlbnkoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGRlbnknKVxuXG5cdFx0cmV0dXJuIHRoaXMuc2VuZERhdGEoJ2RlbnknKVxuXHR9XG5cblx0YnllKCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBieWUnKVxuXG5cdFx0aWYgKHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdyZWFkeSdcblx0XHRcdHRoaXMuZGlzdGFudCA9ICcnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdFx0cmV0dXJuIHRoaXMuc2VuZERhdGEoJ2J5ZScpXHRcdFx0XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdH1cblxuXHRleGl0KCkge1xuXHRcdGlmICh0aGlzLnN0YXR1cyA9PSAnY2FsbGluZycpIHtcblx0XHRcdHJldHVybiB0aGlzLmNhbmNlbCgpXG5cdFx0fVxuXHRcdGlmICh0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xuXHRcdFx0cmV0dXJuIHRoaXMuYnllKClcblx0XHR9XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdH1cblxuXHRzZW5kRGF0YSh0eXBlLCBkYXRhKSB7XG5cdFx0cmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9DbGllbnRgLCB7XG5cdFx0XHRkZXN0SWQ6IHRoaXMuZGVzdElkLCBcblx0XHRcdHNyY0lkOiB0aGlzLnNyY0lkLFxuXHRcdFx0dHlwZSxcblx0XHRcdGRhdGFcblx0XHR9KVxuXHR9XHRcblxufVxuXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJywgJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHAsIGJyb2tlciwgcGFyYW1zKSB7XG5cblx0XHRyZXR1cm4gbmV3IFJUQyhicm9rZXIsIGh0dHAsIHBhcmFtcylcblx0fSxcblx0JGlmYWNlOiBgXG5cdFx0Y2FsbCh0byk6UHJvbWlzZTtcblx0XHRjYW5jZWwodG8pOlByb21pc2U7XG5cdFx0ZGVueSgpOlByb21pc2U7XG5cdFx0YnllKCk6UHJvbWlzZTtcblx0XHRzZW5kRGF0YSh0eXBlLCBkYXRhKTpQcm9taXNlO1xuXHRcdG9uRGF0YShjYWxsYmFjayhkYXRhLCB0aW1lKSlcblx0YFxufSk7XG5cblxufSkoKTsiLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Quc2NoZWR1bGVyJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbkFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYXBwUGFyYW1zKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbc2NoZWR1bGVyXSBvcGVuQXBwJywgYXBwTmFtZSwgYXBwUGFyYW1zKVxuXHRcdFx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0XHR0eXBlOiAnb3BlbkFwcCcsXG5cdFx0XHRcdFx0IGRhdGE6IHthcHBOYW1lLCBhcHBQYXJhbXN9XG5cdFx0XHRcdFx0fSwgbG9jYXRpb24uaHJlZilcblxuXHRcdFx0fSxcblx0XHRcdGxvZ291dDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbc2NoZWR1bGVyXSBsb2dvdXQnKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2xvZ291dCcpXG5cdFx0XHR9XHRcdCBcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0b3BlbkFwcChhcHBOYW1lLCBhcHBQYXJhbXMpO1xuXHRcdGxvZ291dCgpXG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QudXNlcnMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3VzZXJzJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJylcblx0XHRcdH0sXG5cblx0XHRcdG1hdGNoOiBmdW5jdGlvbihtYXRjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nLCB7bWF0Y2h9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy8nLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgLyR7dXNlcn1gKVxuXHRcdFx0fSxcblxuXHRcdFx0dXBkYXRlOiBmdW5jdGlvbih1c2VyLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnB1dChgLyR7dXNlcn1gLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0OiBmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgLyR7dXNlcn1gKVxuXHRcdFx0fSxcblxuXHRcdFx0YWN0aXZhdGVBcHA6IGZ1bmN0aW9uKGFwcE5hbWUsIGFjdGl2YXRlZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWN0aXZhdGVBcHBgLCB7YXBwTmFtZSwgYWN0aXZhdGVkfSlcblx0XHRcdH0sXG5cblx0XHRcdHNlbmROb3RpZjogZnVuY3Rpb24odG8sIG5vdGlmKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZW5kTm90aWZgLCB7dG8sIG5vdGlmfSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZU5vdGlmOiBmdW5jdGlvbihub3RpZklkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZU5vdGlmLyR7bm90aWZJZH1gKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Tm90aWZzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Tm90aWZzYClcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdGdldE5vdGlmQ291bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXROb3RpZkNvdW50YClcblx0XHRcdH0sXG5cblx0XHRcdGdldEZyaWVuZHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRGcmllbmRzYClcblx0XHRcdH0sXG5cblx0XHRcdGFkZEZyaWVuZDogZnVuY3Rpb24oZnJpZW5kVXNlck5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZEZyaWVuZGAsIHtmcmllbmRVc2VyTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjaGFuZ2VQd2Q6IGZ1bmN0aW9uKG5ld1B3ZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvY2hhbmdlUHdkYCwge25ld1B3ZH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRDb250YWN0OiBmdW5jdGlvbihuYW1lLCBlbWFpbCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkQ29udGFjdGAsIHtuYW1lLCBlbWFpbH0pXG5cdFx0XHR9LFxuXHRcdFx0Z2V0Q29udGFjdHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbihjb250YWN0SWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlQ29udGFjdC8ke2NvbnRhY3RJZH1gKVxuXHRcdFx0fSxcblx0XHRcdFxuXHRcdFx0c2VuZFBvc2l0aW9uOiBmdW5jdGlvbihjb29yZHMpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2VuZEZyaWVuZFBvc2l0aW9uJywgY29vcmRzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvcG9zaXRpb24nLCBjb29yZHMpXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KCk6UHJvbWlzZTtcblx0XHRhZGQoZGF0YSk6UHJvbWlzZTtcblx0XHRyZW1vdmUodXNlcik6UHJvbWlzZTtcblx0XHR1cGRhdGUodXNlciwgZGF0YSk6UHJvbWlzZTtcblx0XHRnZXQodXNlcik6UHJvbWlzZTtcblx0XHRhY3RpdmF0ZUFwcChhcHBOYW1lLCBhY3RpdmF0ZWQpOlByb21pc2U7XG5cdFx0c2VuZE5vdGlmKHRvLCBub3RpZik6UHJvbWlzZTtcblx0XHRyZW1vdmVOb3RpZihub3RpZklkKTpQcm9taXNlO1xuXHRcdGdldE5vdGlmcygpOlByb21pc2U7XG5cdFx0Z2V0Tm90aWZDb3VudCgpOlByb21pc2U7XG5cdFx0Z2V0RnJpZW5kcygpOlByb21pc2U7XG5cdFx0YWRkRnJpZW5kKGZyaWVuZFVzZXJOYW1lKTpQcm9taXNlO1xuXHRcdGNoYW5nZVB3ZChuZXdQd2QpOlByb21pc2U7XG5cdFx0YWRkQ29udGFjdChuYW1lLCBlbWFpbCk6UHJvbWlzZTtcblx0XHRnZXRDb250YWN0cygpOlByb21pc2UoY29udGFjdHMpO1xuXHRcdHJlbW92ZUNvbnRhY3QoY29udGFjdElkKTpQcm9taXNlO1xuXHRcdHNlbmRQb3NpdGlvbihjb29yZHMpOlByb21pc2Vcblx0YFxufSk7XG4iXX0=
