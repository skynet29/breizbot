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
					console.log('[appTab] onFrameLoaded')
				}
			}
		})

		this.onAppExit = function()  {
			console.log('[appTab] onAppExit', ctrl.model.appUrl)
			const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
			const rootPage = $iframe.find('.rootPage').iface()
			if (rootPage && typeof rootPage.onAppExit == 'function') {
				return rootPage.onAppExit()
			}
			return Promise.resolve()		
		}	

		this.onAppSuspend = function()  {
			console.log('[appTab] onAppSuspend', ctrl.model.appUrl)
			const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
			const rootPage = $iframe.find('.rootPage').iface()
			if (rootPage && typeof rootPage.onAppSuspend == 'function') {
				rootPage.onAppSuspend()
			}
		}

		this.onAppResume = function()  {
			console.log('[appTab] onAppResume', ctrl.model.appUrl)
			const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)
			const rootPage = $iframe.find('.rootPage').iface()
			if (rootPage && typeof rootPage.onAppResume == 'function') {
				rootPage.onAppResume()
			}
		}

		this.setAppUrl = function(appUrl) {
			console.log('[appTab] setAppUrl', appUrl)
			ctrl.setData({appUrl: appUrl + '&date=' + Date.now()})
		}
	}
});

$$.control.registerControl('breizbot.apps', {

	props: {
		apps: [],
		showActivated: false
	},

	$iface: 'setData(data)',

	template: "<div class=\"scrollPanel\">\n	<div bn-each=\"apps\" bn-iter=\"app\" class=\"main\" bn-event=\"click.tile: onTileClick\">			\n		<div bn-attr=\"class1\">\n			<div class=\"arrow-right\" bn-show=\"show1\"></div>\n			<div bn-show=\"show2\" style=\"margin-bottom: 5px;\">\n				<i bn-attr=\"{class: $scope.app.props.iconCls}\"></i>\n			</div>\n\n			<span bn-text=\"$scope.app.props.title\"></span>\n		</div>\n\n	</div>\n</div>",

	init: function(elt) {

		const {apps, showActivated} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
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
	$events: 'appclick'
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

				onDeleteItem: function(ev) {
					ev.stopPropagation()
					const idx =  $(this).closest('li').index()
					const data = ctrl.model.contacts[idx]
					console.log('onDeleteItem', data)
					users.removeContact(data._id).then(load)

				}
			}
		})	

		function load() {
			users.getContacts().then((contacts) => {
				console.log('contacts', contacts)
				ctrl.setData({contacts})
			})	

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

	}
});





(function(){

function getIconClass(name) {
	if (name.endsWith('.pdf')) {
		return 'fa-file-pdf'
	}
	if (name.endsWith('.doc')) {
		return 'fa-file-word'
	}
	if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
		return 'fa-file-audio'
	}
	if (name.endsWith('.mp4')) {
		return 'fa-file-video'
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
		friendUser: ''
	},

	template: "\n<div class=\"toolbar\" bn-show=\"showToolbar\">\n	<div bn-control=\"brainjs.controlgroup\">\n		<button \n			title=\"New folder\"\n			bn-event=\"click: onCreateFolder\"\n		><i class=\"fas fa-folder-plus\"></i></button>		\n\n		<button \n			title=\"Import file\"\n			bn-event=\"click: onImportFile\"\n		><i class=\"fa fa-upload\"></i></button>		\n\n\n	</div>\n\n	<div bn-control=\"brainjs.controlgroup\">\n		<button \n			title=\"Toggle Selection\"\n			bn-event=\"click: onTogleSelection\"\n		><i class=\"fa fa-check\"></i></button>\n\n\n		<button \n			title=\"Reload\"\n			bn-event=\"click: onReload\"\n		><i class=\"fa fa-sync-alt\"></i></button>	\n	</div>\n\n	<div bn-control=\"brainjs.controlgroup\">\n		<button title=\"Delete\"\n			bn-event=\"click: onDeleteFiles\"\n			bn-prop=\"prop1\"\n		><i class=\"fa fa-trash\"></i></button>\n\n		<button title=\"Cut\"\n			bn-prop=\"prop1\"\n			bn-event=\"click: onCutFiles\"\n		><i class=\"fa fa-cut\"></i></button>	\n\n		<button title=\"Copy\"\n			bn-prop=\"prop1\"\n			bn-event=\"click: onCopyFiles\"\n			><i class=\"fa fa-copy\"></i></button>\n\n		<button title=\"Share\"\n			bn-prop=\"prop2\"\n			bn-event=\"click: onShareFiles\"\n			><i class=\"fa fa-share-alt\"></i></button>\n\n		<button title=\"Paste\"\n			bn-prop=\"prop3\"\n			bn-event=\"click: onPasteFiles\"\n		><i class=\"fa fa-paste\"></i></button>		\n	</div>\n</div>\n\n<div class=\"pathPanel\" bn-event=\"click.pathItem: onPathItem\">\n	<div>Path:</div>\n	<div bn-each=\"getPath\" bn-index=\"idx\">\n		<i class=\"fa fa-chevron-right\" bn-show=\"!isFirst\"></i>\n		<span>\n			<a class=\"pathItem\" bn-text=\"$scope.$i\" href=\"#\" bn-show=\"!isLast\" bn-data=\"{info: getPathInfo}\"></a>	\n			<span bn-text=\"$scope.$i\" bn-show=\"isLast\"></span>	\n			\n		</span>\n	</div>\n\n	\n</div>\n\n\n<div class=\"scrollPanel\">\n\n	<div bn-each=\"files\" \n		bn-iter=\"f\" \n		class=\"container\"\n		bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick, contextmenuchange.thumbnail: onContextMenu\">\n		\n		<div class=\"thumbnail w3-card-2\" bn-control=\"brainjs.contextmenu\" bn-data=\"data1\">	\n\n				<span bn-if=\"if1\">\n					<input type=\"checkbox\" bn-show=\"showToolbar\" class=\"check w3-check\">						\n				</span>\n				<div bn-if=\"$scope.f.folder\" class=\"folder item\">\n					<div class=\"icon\">\n						<i class=\"fa fa-4x fa-folder-open w3-text-blue-grey\"></i>\n					</div>\n					\n					<div class=\"info\">\n						<strong bn-text=\"$scope.f.name\"></strong>		\n						<span bn-text=\"getDate\" bn-if=\"if1\"></span>										\n					</div>\n				</div>\n				<div \n					bn-if=\"if2\"  \n					class=\"file item\"\n					>\n					<div class=\"icon\">\n						<i bn-attr=\"{class: class1}\"></i>\n					</div>\n					\n					<div class=\"info\">\n						<strong bn-text=\"$scope.f.name\"></strong>\n						<span bn-text=\"getDate\"></span>							\n						<span bn-text=\"getSize\"></span>	\n					</div>\n				</div>			\n\n				<div \n					bn-if=\"if3\"  \n					class=\"file item\"\n					>\n					<div class=\"icon\">\n						<img bn-attr=\"{src: $scope.f.thumbnailUrl}\">\n					</div>\n					\n					<div class=\"info\">\n						<strong bn-text=\"$scope.f.name\"></strong>\n						<span bn-text=\"getDate\"></span>\n						<span bn-text=\"getSize\"></span>						\n						<span bn-text=\"getDimension\"></span>					\n					</div>\n				</div>	\n			\n		</div>\n	</div>\n	\n\n</div>\n",

	init: function(elt, srvFiles) {

		const thumbnailSize = '100x?'
		const maxUploadSize = 2*1024*2014 // 2 Mo

		let selected = false

		let {
			showToolbar,
			filterExtension,
			friendUser,
			imageOnly
		} = this.props

		if (friendUser != '') {
			showToolbar = false
		}

		function getSelFiles() {
			const selFiles = []
			elt.find('.check:checked').each(function() {
				const idx = $(this).closest('.thumbnail').index()					
				const info = ctrl.model.files[idx]
				
				selFiles.push(ctrl.model.rootDir + info.name)
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

		const ctrl = $$.viewController(elt, {
			
			data: {
				showToolbar,
				rootDir: '/',
				files: [],
				selectedFiles: [],
				operation: 'none',
				nbSelection: 0,
				isShareSelected: false,
				getPath: function() {
					const tab = ('/home' + this.rootDir).split('/')
					tab.shift()
					tab.pop()
					return tab
				},
				isLast: function(scope) {
					return scope.idx == this.getPath().length-1
				},
				isFirst: function(scope) {
					return scope.idx == 0
				},
				getPathInfo: function(scope) {
					return this.getPath().slice(1, scope.idx+1).join('/')
				},

				data1: function(scope) {
					return {items: scope.f.items || {}}
				},
				if1: function(scope) {
					return scope.f.name != '..'
				},
				if2: function(scope) {
					return !scope.f.folder && !scope.f.isImage
				},
				if3: function(scope) {
					return !scope.f.folder && scope.f.isImage
				},
				class1: function(scope) {
					return `fa fa-4x w3-text-blue-grey ${getIconClass(scope.f.name)}`
				},
				getSize: function(scope) {
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

					size = Math.floor(size*10)/10
					return 'Size: ' + size + ' ' + unit
				},

				getDimension: function(scope) {
					const d = scope.f.dimension
					return `Dimension: ${d.width}x${d.height}`
				},


				getDate: function(scope) {
					const date = new Date(scope.f.mtime).toLocaleDateString()
					return 'Last Modif: ' + date

				},

				prop1: function() {
					return {disabled: this.nbSelection == 0}
				},
				prop2: function() {
					return {disabled: this.nbSelection == 0 || this.rootDir.startsWith('/share/') || this.isShareSelected}
				},
				prop3: function() {
					return {disabled:  this.selectedFiles.length == 0}
				}

			},
			events: {
				onPathItem: function(ev) {
					const pathItem = $(this).data('info')
					console.log('onPathItem', pathItem)
					ev.preventDefault()

					loadData(pathItem == '' ? '/' : '/' + pathItem + '/')
				},
				onReload: function(ev) {
					loadData()
				},

				onContextMenu: function(ev, data) {
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]
					const {cmd} = data

					const {rootDir} = ctrl.model

					if (cmd == 'download') {
						const url = srvFiles.fileUrl(rootDir + info.name)
						$$.util.downloadUrl(url, info.name)
					}

					if (cmd == 'rename') {
						const oldFileName = info.name
						$$.ui.showPrompt({label: 'New name', title: 'Rename', value: oldFileName}, function(newFileName) {
							console.log('newFileName', newFileName)
							if (newFileName != oldFileName) {
								srvFiles.renameFile(rootDir, oldFileName, newFileName)
								.then(function(resp) {
									console.log('resp', resp)
									loadData()
								})
								.catch(function(resp) {
									console.log('resp', resp)
									$$.ui.showAlert({
										content: resp.responseText,
										title: 'Error'
									})
								})								}
						})
					}

					if (cmd == 'makeResizedCopy') {
						$$.ui.showPrompt({
							label: 'Rescale percentage:', 
							title: 'Make resized copy',
							attrs: {min: 10, max: 90, type: 'number'},
							value: 50
						}, function(percentage) {
							srvFiles.resizeImage(rootDir, info.name, percentage+'%')
							.then(function(resp) {
								console.log('resp', resp)
								loadData()
							})
							.catch(function(resp) {
								console.log('resp', resp)
								$$.ui.showAlert({
									content: resp.responseText,
									title: 'Error'
								})
							})								
						})
					}

					if (cmd == 'convertToMP3') {
						srvFiles.convertToMP3(rootDir, info.name)
						.then(function(resp) {
							console.log('resp', resp)
							loadData()
						})
						.catch(function(resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						})								
					}

					if (cmd == 'delete') {
						deleteFiles([rootDir + info.name])
					}

					
				},

				onFileClick: function(ev) {
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]

					ev.stopPropagation()
					const data = {
						fileName: info.name,
						rootDir: ctrl.model.rootDir,                       
						isImage: info.isImage
					}

					elt.trigger('fileclick', data)
				},
				onCheckClick: function(ev) {
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]

					if (info.name == 'share' && ctrl.model.rootDir == '/') {
						ctrl.model.isShareSelected = $(this).getValue()
					}

					ctrl.setData({nbSelection: getNbSelFiles()})
				},
				onFolderClick: function(ev) {

					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]

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
				onCreateFolder: function() {
					var rootDir = ctrl.model.rootDir
					$$.ui.showPrompt({
						content: 'Folder name:', 
						title: 'New Folder'
					}, function(folderName) {
						srvFiles.mkdir(rootDir + folderName)
						.then(function(resp) {
							console.log('resp', resp)
							loadData()
						})
						.catch(function(resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						})	
					})
				},
				onTogleSelection: function()	{
					toggleSelection()
					ctrl.setData({nbSelection: getNbSelFiles()})
				},

				onDeleteFiles: function(ev) {

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
				onCutFiles: function(ev) {
					console.log('onCutFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						operation: 'cut'
					})
				},

				onCopyFiles: function(ev) {
					console.log('onCopyFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						operation: 'copy'
					})
					
				},

				onShareFiles: function(ev) {
					console.log('onShareFiles')
					srvFiles.shareFiles(getSelFiles())
					.then(function(resp) {
						console.log('resp', resp)
						ctrl.setData({selectedFiles: [], operation: 'none'})
						loadData()
					})
					.catch(function(resp) {
						console.log('resp', resp)
						//ctrl.setData({selectedFiles: [], operation: 'none'})
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					})						
				},

				onPasteFiles: function(ev) {
					console.log('onPasteFiles')
					const {rootDir, selectedFiles, operation} = ctrl.model
					const promise = 
						(operation == 'copy') ? srvFiles.copyFiles(selectedFiles, rootDir) : srvFiles.moveFiles(selectedFiles, rootDir)

					promise
					.then(function(resp) {
						console.log('resp', resp)
						ctrl.setData({selectedFiles: [], operation: 'none'})
						loadData()
					})
					.catch(function(resp) {
						console.log('resp', resp)
						//ctrl.setData({selectedFiles: [], operation: 'none'})
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					})						
				},
				onImportFile: function(ev) {

					$$.util.openFileDialog(function(file) {
						//console.log('fileSize', file.size / 1024)
						if (file.size > maxUploadSize) {
							$$.ui.showAlert({content: 'File too big', title: 'Import file'})
							return
						}
						$$.util.readFile(file).then((blob) => {
							srvFiles.uploadFile(blob, file.name, ctrl.model.rootDir).then(function() {
								loadData()
							})
							.catch(function(resp) {
								console.log('resp', resp)
								$$.ui.showAlert({content: resp.responseText, title: 'Error'})							
							})

						})
				
					})
				}
			}

		})

		function deleteFiles(fileNames) {
			$$.ui.showConfirm({
				content: 'Are you sure ?',
				title: 'Delete files'
			}, function() {
				srvFiles.removeFiles(fileNames)
				.then(function(resp) {
					console.log('resp', resp)
					loadData()
				})
				.catch(function(resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				})					
			})				
		}


		function loadData(rootDir) {
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			console.log('loadData', rootDir)
			srvFiles.list(rootDir, {filterExtension, imageOnly}, friendUser).then(function(files) {
				//console.log('files', files)
				files.forEach((f) => {
					if (f.isImage) {
						f.thumbnailUrl = srvFiles.fileThumbnailUrl(rootDir + f.name, thumbnailSize, friendUser)
					}
					if (showToolbar) {
						f.items = {
							delete: {name: 'Delete', icon: 'fas fa-trash'},
							rename: {name: 'Rename'}
						}
						if (f.isImage) {
							f.items.makeResizedCopy = {name: 'Make resized copy', icon: 'fas fa-compress-arrows-alt'}
						}
						if (!f.folder) {
							f.items.download = {name: 'Download', icon: 'fas fa-download'}
						}
						if (f.name.endsWith('.mp4')) {
							f.items.convertToMP3 = {name: 'Convert to MP3'}
						}

					}
				})
			
				if (rootDir != '/') {
					files.unshift({name: '..', folder: true})
				}

				sortFiles(files)

				ctrl.setData({
					files, 
					rootDir, 
					nbSelection: 0,
					isShareSelected: false
				})

			})		
		}

		loadData()

		this.getFiles = function() {
			return ctrl.model.files.filter((f) => !f.folder)
		}

		this.update = function() {
			console.log('[FileCtrl] update')
			loadData()
		}
	},

	$iface: 'update()',
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
				onSendMessage: function(ev) {
					ev.stopPropagation()
					const idx = $(this).closest('li').index()

					const userName =  ctrl.model.friends[idx].friendUserName
					//console.log('onSendMessage', userName)
					$$.ui.showPrompt({title: 'Send Message', label: 'Message:'}, function(text) {
						users.sendNotif(userName, {text, reply: true})
					})
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

	template: "<div class=\"header w3-teal\">\n	<div>\n		<button class=\"w3-button\" title=\"FullScreen\" bn-event=\"click: onFullScreen\" bn-show=\"!fullScreen\">\n			<i class=\"fa fa-expand\"></i></button>\n		<button class=\"w3-button\" title=\"Connection Status\">\n			<i bn-class=\"{w3-text-green: connected, w3-text-red: !connected}\" class=\"fa fa-circle\"></i>\n			\n		</button>			\n		<div bn-show=\"hasIncomingCall\" \n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onCallResponse\"\n			bn-data=\"{\n				trigger: \'left\', \n				title: callInfo.from,\n				items: {\n					accept: {name: \'Accept\'},\n					deny: {name: \'Decline\'},\n				}\n			}\"\n			class=\"w3-button\">\n			<i class=\"fa fa-spinner fa-pulse\"></i>\n			<i bn-attr=\"{class: callInfo.iconCls}\"></i>\n		</div>\n	</div>\n\n\n<!-- 	<strong bn-text=\"title\"></strong>\n -->\n	<div>\n		<button class=\"notification w3-button\" title=\"Notification\" bn-event=\"click: onNotification\">\n			<i class=\"fa fa-lg fa-bell w3-text-white\" ></i>\n			<span class=\"w3-badge w3-red w3-tiny\" bn-text=\"nbNotif\" bn-show=\"hasNotif\"></span>			\n		</button>\n\n\n\n		<div bn-control=\"brainjs.contextmenu\" \n			bn-data=\"{\n				items: {\n					pwd: {name: \'Change password\', icon: \'fas fa-lock\'},\n					apps: {name: \'Applications\', icon: \'fas fa-th\'},\n					sep: \'------\',\n					logout: {name: \'Logout\', icon: \'fas fa-power-off\'}\n				},\n				title: userName,\n				trigger: \'left\'\n			}\" \n			class=\"w3-button\" \n			bn-event=\"contextmenuchange: onContextMenu\">\n				<i class=\"fa fa-user fa-lg\"></i>\n<!-- 				<span bn-text=\"userName\"></span>	\n -->				<i class=\"fa fa-angle-down fa-lg\"></i>\n    	\n		</div>\n		\n	</div>\n\n	\n</div>\n\n<div bn-control=\"brainjs.tabs\" \n	class=\"content\" \n	bn-iface=\"tabs\" \n	bn-event=\"tabsremove: onTabRemove, tabsactivate: onTabActivate\">\n	<div bn-control=\"breizbot.apps\" \n		bn-data=\"{apps: getMyApps}\"\n		bn-event=\"appclick: onAppClick\"\n		title=\"Home\" \n		>		\n	</div>\n	\n</div>\n",

	init: function(elt, broker, users, rtc, srvApps, scheduler) {

		function createAudio() {
			let audio = null
			return {
				play: function() {
					//console.log('audio play')
					audio = new Audio('/assets/skype.mp3')
					audio.loop = true	
					setTimeout(() => {audio.play()}, 100)
				},

				stop: function() {
					//console.log('audio stop')
					if (audio != null) {
						audio.pause()
					}
					audio = null
				}
			}
		}

		rtc.processCall()
		
		rtc.on('call', function(callInfo) {
			ctrl.setData({hasIncomingCall: true, callInfo})
			audio.play()
		})

		rtc.on('cancel', function() {
			ctrl.setData({hasIncomingCall: false})
			audio.stop()
		})		

		const {userName} = this.props

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
				hasNotif: function() {
					return this.nbNotif > 0
				},
				getMyApps: function() {
					return this.apps.filter((a) => a.activated)
				}

			},
			events: {
				onAppClick: function(ev, data) {
					console.log('onAppClick', data)
					openApp(data.appName)

				},				
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						logout()
					}
					if (data.cmd == 'apps') {
						openApp('store')
					}
					if (data.cmd == 'pwd') {
						$$.ui.showPrompt({title: 'Change Password', label: 'New Password:'}, function(newPwd) {
							users.changePwd(newPwd).then(() => {
								$$.ui.showAlert({title: 'Change Password', content: 'Password has been changed'})
							})
							.catch((e) => {
								$$.ui.showAlert({title: 'Error', content: e.responseText})
							})
						})
					}					

				},
				onNotification: function(ev) {
					console.log('onNotification')
					if (ctrl.model.nbNotif == 0) {
						$$.ui.showAlert({content: 'no notifications', title: 'Notifications'})
					}
					else {
						openApp('notif')
					}					
				},
				onCallResponse: function(ev, data) {
					const {cmd} = data
					console.log('onCallResponse', data)
					ctrl.setData({hasIncomingCall: false})
					audio.stop()
					if (cmd == 'accept') {	
						const {from, appName} = ctrl.model.callInfo
						openApp(appName, {
							caller: from,
							clientId: rtc.getRemoteClientId()							
						})				
					}
					if (cmd == 'deny') {						
						rtc.deny()
					}
				},

				onFullScreen: function(ev) {
					console.log('onFullScreen')
					const elem = document.documentElement
					const requestFullscreen = elem.requestFullscreen ||
						elem.webkitRequestFullscreen

					if (requestFullscreen) {
						requestFullscreen.call(elem)						
					}
				},
				onTabRemove: function(ev, idx) {
					console.log('onTabRemove', idx)
					const info = ctrl.scope.tabs.getTabInfo(idx)
					console.log('info', info)
					info.ctrlIface.onAppExit().then(() => {
						ctrl.scope.tabs.removeTab(idx)
					})					
				},
				onTabActivate: function(ev, ui) {	
					console.log('onTabActivate')
					const {newTab, oldTab} = ui
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

		document.addEventListener("webkitfullscreenchange", function(ev) {
		  console.log('fullscreenchange', ev)
		  ctrl.setData({fullScreen: !ctrl.model.fullScreen})
		})

		document.addEventListener("fullscreenchange", function(ev) {
		  console.log('fullscreenchange', ev)
		  ctrl.setData({fullScreen: !ctrl.model.fullScreen})
		})

		function updateNotifs(nbNotif) {
			ctrl.setData({nbNotif})
		
		}

		broker.on('connected', (state) => {
			ctrl.setData({connected: state})
		})

		window.addEventListener('message', (ev) => {
			console.log('[home] message', ev.data)
			const {type, data} = ev.data
			if (type == 'openApp') {
				const {appName, appParams} = data
				openApp(appName, appParams)
			}
			
		}, false)

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.onTopic('breizbot.logout', function(msg) {
			location.href = '/logout'
		})


		function getAppUrl(appName, params) {
			return $$.util.getUrlParams(`/apps/${appName}`, params)
		}

		function openApp(appName, params) {
			const appInfo = ctrl.model.apps.find((a) => a.appName == appName)
			const title = appInfo.props.title
			//console.log('appInfo', appInfo)
			console.log('openApp', appName, params)
			let idx = ctrl.scope.tabs.getTabIndexFromTitle(title)
			const appUrl = getAppUrl(appName, params)
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
		

	}
});


$$.control.registerControl('breizbot.pager', {

	props: {
		rootPage: ''
	},
	template: "<div style=\"display: flex; flex-direction: column; height: 100%; overflow: hidden;\">\n	\n	<div bn-show=\"showBack\" class=\"w3-green\" style=\"display: flex; justify-content: space-between; align-items: center;\">\n		<button class=\"w3-button\" title=\"Back\" bn-event=\"click: onBack\">\n			<i class=\"fa fa-arrow-left\"></i>\n		</button>\n		<div bn-text=\"title\"></div>\n		<div bn-each=\"buttons\" bn-event=\"click.action: onAction\">\n			<button \n				bn-show=\"show1\" \n				class=\"w3-button action\" \n				bn-text=\"$scope.$i.label\" \n				bn-data=\"{cmd: $scope.$i.name}\"\n				></button>\n			<button \n				bn-show=\"show2\" \n				class=\"w3-button action\" \n				bn-data=\"{cmd: $scope.$i.name}\"\n				bn-attr=\"{title: $scope.$i.title}\"\n				><i bn-attr=\"{class: $scope.$i.icon}\"></i></button>\n		</div>\n	</div>\n	<div bn-bind=\"content\" style=\"flex: 1; overflow: hidden;\"></div>\n\n</div>\n",

	$iface: `popPage(data);pushPage(ctrlName, options)`,

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
			if (typeof iface.dispose == 'function') {
				iface.dispose()
			}
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

	init: function(elt, files) {

		const {url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1,
				wait: false,
				show1: function() {
					return this.numPages > 1 && !this.wait
				}
			},
			events: {
				onNextPage: function(ev) {
					//console.log('onNextPage')
					ctrl.setData({wait: true})
					ctrl.scope.pdf.nextPage().then((currentPage) => {
						ctrl.setData({currentPage, wait: false})
					})
					
				},

				onPrevPage: function(ev) {
					//console.log('onPrevPage')
					ctrl.setData({wait: true})
					ctrl.scope.pdf.prevPage().then((currentPage) => {
						ctrl.setData({currentPage, wait: false})
					})
				},

				onFit: function(ev) {
					ctrl.scope.pdf.fit()
				}

			}
		})

		function openFile(url, title) {

			ctrl.setData({wait: true})

			ctrl.scope.pdf.openFile(url).then((numPages) => {
				console.log('file loaded')
				ctrl.setData({
					title,
					numPages,
					wait: false
				})
			})			
		}

		if (url != '') {
			openFile(url)
		}

		this.setData = function(data) {
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

	//template: "<div class=\"toolbar\">\n\n		<div>\n			<p>Status: <span bn-text=\"status\"></span></p>\n			<p>Distant: <strong bn-text=\"distant\"></strong></p>						\n		</div>		\n\n		<div>\n			<button \n				title=\"Call a friend\" \n				bn-event=\"click: onCall\"\n				bn-show=\"show1\"\n				class=\"w3-btn w3-green\"><i class=\"fa fa-user\"></i></button>\n\n			<button \n				bn-event=\"click: onCancel\"\n				bn-show=\"show2\"\n				class=\"w3-btn w3-blue\">Cancel</button>\n\n			<button \n				title=\"Hangup\" \n				bn-event=\"click: onHangup\"\n				bn-show=\"show3\"\n				class=\"w3-btn w3-red\">Stop</button>			\n		</div>\n\n\n</div>\n<div bn-show=\"show4\" bn-bind=\"panel\" class=\"panel\"></div>",

	init: function(elt, rtc, pager) {

		const {appName, iconCls, title} = this.props

		const $children = elt.children().remove()
		elt.append("<div class=\"toolbar\">\n\n		<div>\n			<p>Status: <span bn-text=\"status\"></span></p>\n			<p>Distant: <strong bn-text=\"distant\"></strong></p>						\n		</div>		\n\n		<div>\n			<button \n				title=\"Call a friend\" \n				bn-event=\"click: onCall\"\n				bn-show=\"show1\"\n				class=\"w3-btn w3-green\"><i class=\"fa fa-user\"></i></button>\n\n			<button \n				bn-event=\"click: onCancel\"\n				bn-show=\"show2\"\n				class=\"w3-btn w3-blue\">Cancel</button>\n\n			<button \n				title=\"Hangup\" \n				bn-event=\"click: onHangup\"\n				bn-show=\"show3\"\n				class=\"w3-btn w3-red\">Stop</button>			\n		</div>\n\n\n</div>\n<div bn-show=\"show4\" bn-bind=\"panel\" class=\"panel\"></div>")

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
$$.control.registerControl('breizbot.addUser', {

	template: "<form bn-event=\"submit: onSubmit\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>UserName</label>\n		<input type=\"text\" placeholder=\"username\" name=\"username\" required=\"\">\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Pseudo</label>\n		<input type=\"text\" placeholder=\"pseudo\" name=\"pseudo\" required>\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Location</label>\n		<input type=\"text\" placeholder=\"location\" name=\"location\" required>\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email</label>\n		<input type=\"email\" placeholder=\"email\" name=\"email\" required>	\n	</div>\n	\n	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	props: {
		$pager: null
	},

	buttons: [
		{label: 'Create', name: 'create'}
	],

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

		this.onAction = function(cmd) {
			//console.log('onAction', cmd)
			ctrl.scope.submit.click()
		}

	},

	$iface: `
		onAction(cmd)
	`
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
				onNotif: function(ev) {
					const idx = $(this).closest('tr').index()
					const {username} = ctrl.model.data[idx]
					$$.ui.showPrompt({title: 'Send Notification', label: 'Message'}, function(text) {
						users.sendNotif(username, {text})
					})
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

		function remove(fullName, callback) {
			console.log('[Viewer] remove', {fullName})

			$$.ui.showConfirm({title: 'Remove file', content: 'Are you sure ?'}, function() {
				files.removeFiles([fullName])
				.then(function(resp) {
					console.log('resp', resp)
					callback()
				})
				.catch(function(resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				})
			})			
		}

		function save(destPath, fileName, callback) {			
			console.log('[Viewer] save', {destPath, fileName})
			if (ctrl.model.url == '') {
				$$.ui.showAlert({title: 'Error', content: 'File not loaded, please wait'})
				return
			}
			const blob = $$.util.dataURLtoBlob(ctrl.model.url)
			files.uploadFile(blob, fileName, destPath).then(function(resp) {
				console.log('resp', resp)
				callback()
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})				
		}		

		this.remove = remove
		this.save = save

		this.setData = function(data) {
			//console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({url: data.url})
			}
		}

	},
	$iface: `
		remove(fullName, callback);
		save(destPath, fileName, callback)
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
			const port = 8090
			protocol= (protocol == 'http:') ? 'ws:' : 'wss:'


			this.url = `${protocol}//${hostname}:${port}/hmi${pathname}`
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

			uploadFile: function(blob, saveAsfileName, destPath) {
				console.log('[FileService] uploadFile', saveAsfileName, destPath)
				if (!(blob instanceof Blob)) {
					console.warn('File format not supported')
					return Promise.reject('File format not supported')
				}
				//console.log('blob', blob)
				var fd = new FormData()
				fd.append('file', blob, saveAsfileName)
				fd.append('destPath', destPath)
				return http.postFormData('/save', fd)
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
			}

		}
	},

	$iface: `
		list(path, options, friendUser):Promise;
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

	deps: ['brainjs.http', 'breizbot.params'],

	init: function(config, http, params) {

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
		openApp(appName, appParams):Promise;
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
		removeContact(contactId):Promise
	`
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9jb250YWN0cy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwiZnJpZW5kcy9mcmllbmRzLmpzIiwiaG9tZS9ob21lLmpzIiwicGFnZXIvcGFnZXIuanMiLCJwZGYvbWFpbi5qcyIsInJ0Yy9ydGMuanMiLCJ1c2Vycy9hZGRVc2VyLmpzIiwidXNlcnMvdXNlcnMuanMiLCJ2aWV3ZXIvdmlld2VyLmpzIiwiYXBwRGF0YS5qcyIsImFwcHMuanMiLCJicm9rZXIuanMiLCJjaXRpZXMuanMiLCJmaWxlcy5qcyIsImh0dHAuanMiLCJwYWdlci5qcyIsInBhcmFtcy5qcyIsInJ0Yy5qcyIsInNjaGVkdWxlci5qcyIsInVzZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3h3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaGZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJyZWl6Ym90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xuXG4gICAgICBjb25mLmRlbGltaXRlciAmJiAodGhpcy5kZWxpbWl0ZXIgPSBjb25mLmRlbGltaXRlcik7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyAhPT0gdW5kZWZpbmVkID8gY29uZi5tYXhMaXN0ZW5lcnMgOiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG4gICAgICBjb25mLnZlcmJvc2VNZW1vcnlMZWFrICYmICh0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gY29uZi52ZXJib3NlTWVtb3J5TGVhayk7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbG9nUG9zc2libGVNZW1vcnlMZWFrKGNvdW50LCBldmVudE5hbWUpIHtcbiAgICB2YXIgZXJyb3JNc2cgPSAnKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICdsZWFrIGRldGVjdGVkLiAnICsgY291bnQgKyAnIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nO1xuXG4gICAgaWYodGhpcy52ZXJib3NlTWVtb3J5TGVhayl7XG4gICAgICBlcnJvck1zZyArPSAnIEV2ZW50IG5hbWU6ICcgKyBldmVudE5hbWUgKyAnLic7XG4gICAgfVxuXG4gICAgaWYodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW1pdFdhcm5pbmcpe1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgICAgZS5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICBlLmVtaXR0ZXIgPSB0aGlzO1xuICAgICAgZS5jb3VudCA9IGNvdW50O1xuICAgICAgcHJvY2Vzcy5lbWl0V2FybmluZyhlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvck1zZyk7XG5cbiAgICAgIGlmIChjb25zb2xlLnRyYWNlKXtcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBmYWxzZTtcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcbiAgfVxuICBFdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjsgLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgZm9yIGV4cG9ydGluZyBFdmVudEVtaXR0ZXIgcHJvcGVydHlcblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcbiAgICAgICAgdHJlZVtuYW1lXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtuYW1lXTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVyc107XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIXRyZWUuX2xpc3RlbmVycy53YXJuZWQgJiZcbiAgICAgICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCwgbmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gICAgICBpZiAoIXRoaXMuX2NvbmYpIHRoaXMuX2NvbmYgPSB7fTtcbiAgICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgICB9XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuLCBwcmVwZW5kKSB7XG4gICAgdGhpcy5fbWFueShldmVudCwgMSwgZm4sIHByZXBlbmQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIGZhbHNlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCB0cnVlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbiwgcHJlcGVuZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMuX29uKGV2ZW50LCBsaXN0ZW5lciwgcHJlcGVuZCk7XG5cbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2FsbC5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG5cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIC8vIG5lZWQgdG8gbWFrZSBjb3B5IG9mIGhhbmRsZXJzIGJlY2F1c2UgbGlzdCBjYW4gY2hhbmdlIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gb2YgZW1pdCBjYWxsXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0QXN5bmMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoW2ZhbHNlXSk7IH1cbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZXM9IFtdO1xuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGFyZ3VtZW50c1sxXSk7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25BbnkgPSBmdW5jdGlvbihmbiwgcHJlcGVuZCl7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgaWYocHJlcGVuZCl7XG4gICAgICB0aGlzLl9hbGwudW5zaGlmdChmbik7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9vbkFueSh0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGdyb3dMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBDaGFuZ2UgdG8gYXJyYXkuXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhZGRcbiAgICAgIGlmKHByZXBlbmQpe1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0udW5zaGlmdChsaXN0ZW5lcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCAmJlxuICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICkge1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCwgdHlwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyxsZWFmcz1bXTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgIGhhbmRsZXJzID0gbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgKGhhbmRsZXJzLmxpc3RlbmVyICYmIGhhbmRsZXJzLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290KSB7XG4gICAgICBpZiAocm9vdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocm9vdCk7XG4gICAgICBmb3IgKHZhciBpIGluIGtleXMpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBvYmogPSByb290W2tleV07XG4gICAgICAgIGlmICgob2JqIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKSB8fCAob2JqID09PSBudWxsKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgcm9vdFtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3QodGhpcy5saXN0ZW5lclRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKVxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbnNbaV0pO1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgIXRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9ldmVudHMpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiB0aGlzLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuX2FsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWxleGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0KGVsdCwgaHR0cCkge1xuXHRcdGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSlcblxuXHRcdC8vY29uc29sZS5sb2coJ2hhc2gnLCBoYXNoKVxuXHRcdGNvbnN0IHBhcmFtcyA9ICQkLnV0aWwucGFyc2VVcmxQYXJhbXMoaGFzaClcblx0XHQvL2NvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG5cdFx0aHR0cC5wb3N0KCcvYXBpL2FsZXhhL2F1dGgnLCBwYXJhbXMpLnRoZW4oKCkgPT4ge1xuXHRcdFx0d2luZG93LmNsb3NlKClcblx0XHR9KVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBUYWInLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBVcmw6ICdhYm91dDpibGFuaydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmM6IGFwcFVybH1cXFwiIGJuLWJpbmQ9XFxcImlmcmFtZVxcXCIgYm4tZXZlbnQ9XFxcImxvYWQ6IG9uRnJhbWVMb2FkZWRcXFwiPjwvaWZyYW1lPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXHRcdGNvbnN0IHthcHBVcmx9ID0gdGhpcy5wcm9wcztcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwVXJsXHRcdFx0XHRcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GcmFtZUxvYWRlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uRnJhbWVMb2FkZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BcHBFeGl0ID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwRXhpdCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcEV4aXQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gcm9vdFBhZ2Uub25BcHBFeGl0KClcblx0XHRcdH1cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVx0XHRcblx0XHR9XHRcblxuXHRcdHRoaXMub25BcHBTdXNwZW5kID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwU3VzcGVuZCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFN1c3BlbmQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMub25BcHBSZXN1bWUgPSBmdW5jdGlvbigpICB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBSZXN1bWUnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBSZXN1bWUgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFJlc3VtZSgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRBcHBVcmwgPSBmdW5jdGlvbihhcHBVcmwpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbYXBwVGFiXSBzZXRBcHBVcmwnLCBhcHBVcmwpXG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcFVybDogYXBwVXJsICsgJyZkYXRlPScgKyBEYXRlLm5vdygpfSlcblx0XHR9XG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBzOiBbXSxcblx0XHRzaG93QWN0aXZhdGVkOiBmYWxzZVxuXHR9LFxuXG5cdCRpZmFjZTogJ3NldERhdGEoZGF0YSknLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYXBwc1xcXCIgYm4taXRlcj1cXFwiYXBwXFxcIiBjbGFzcz1cXFwibWFpblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrXFxcIj5cdFx0XHRcXG5cdFx0PGRpdiBibi1hdHRyPVxcXCJjbGFzczFcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImFycm93LXJpZ2h0XFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuYXBwLnByb3BzLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLmFwcC5wcm9wcy50aXRsZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3Qge2FwcHMsIHNob3dBY3RpdmF0ZWR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzLFxuXHRcdFx0XHRzaG93QWN0aXZhdGVkLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zaG93QWN0aXZhdGVkICYmIHNjb3BlLmFwcC5hY3RpdmF0ZWRcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB7Y2xhc3M6IGB0aWxlIHczLWJ0biAke3Njb3BlLmFwcC5wcm9wcy5jb2xvckNsc31gfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIHNjb3BlLmFwcC5wcm9wcy5pY29uQ2xzID09ICdzdHJpbmcnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY2xpY2snLCBjdHJsLm1vZGVsLmFwcHNbaWR4XSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0YXBwczogZGF0YS5hcHBzLmZpbHRlcigoYSkgPT4gYS5wcm9wcy52aXNpYmxlICE9IGZhbHNlICYmIGEuYXBwTmFtZSAhPSAndGVtcGxhdGUnKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBzZXREYXRhKGRhdGEpYCxcblx0JGV2ZW50czogJ2FwcGNsaWNrJ1xufSk7XG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRzaG93U2VsZWN0aW9uOiBmYWxzZSxcblx0XHRzaG93RGVsZXRlQnV0dG9uOiBmYWxzZVxuXHR9LFx0XG5cblx0dGVtcGxhdGU6IFwiPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGNvbnRhY3RzPC9wPlxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLmRlbGV0ZTogb25EZWxldGVJdGVtXFxcIlxcblx0XHRibi1lYWNoPVxcXCJjb250YWN0c1xcXCJcXG5cdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdD5cXG5cdFx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIiBibi1zaG93PVxcXCJzaG93RGVsZXRlQnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5jb250YWN0TmFtZVxcXCI+PC9zdHJvbmc+PGJyPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlIHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmNvbnRhY3RFbWFpbFxcXCI+PC9zcGFuPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2xpPlxcblx0PC91bD5cdFx0XFxuXFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2Vycykge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dEZWxldGVCdXR0b259ID0gdGhpcy5wcm9wc1xuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdFx0c2hvd0RlbGV0ZUJ1dHRvbixcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gY3RybC5tb2RlbC5jb250YWN0c1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0Ly8kKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignY29udGFjdGNsaWNrJywgZGF0YSlcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25EZWxldGVJdGVtOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IGN0cmwubW9kZWwuY29udGFjdHNbaWR4XVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZUl0ZW0nLCBkYXRhKVxuXHRcdFx0XHRcdHVzZXJzLnJlbW92ZUNvbnRhY3QoZGF0YS5faWQpLnRoZW4obG9hZClcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gbG9hZCgpIHtcblx0XHRcdHVzZXJzLmdldENvbnRhY3RzKCkudGhlbigoY29udGFjdHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3RzJywgY29udGFjdHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y29udGFjdHN9KVxuXHRcdFx0fSlcdFxuXG5cdFx0fVxuXG5cdFx0bG9hZCgpXG5cblx0XHR0aGlzLnVwZGF0ZSA9IGxvYWRcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCByZXQgPSBbXVxuXHRcdFx0ZWx0LmZpbmQoJ2xpLnczLWJsdWUnKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAgJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdHJldC5wdXNoKGN0cmwubW9kZWwuY29udGFjdHNbaWR4XSlcblx0XHRcdH0pXG5cdFx0XHRjb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHR9XG59KTtcblxuXG5cblxuIiwiKGZ1bmN0aW9uKCl7XG5cbmZ1bmN0aW9uIGdldEljb25DbGFzcyhuYW1lKSB7XG5cdGlmIChuYW1lLmVuZHNXaXRoKCcucGRmJykpIHtcblx0XHRyZXR1cm4gJ2ZhLWZpbGUtcGRmJ1xuXHR9XG5cdGlmIChuYW1lLmVuZHNXaXRoKCcuZG9jJykpIHtcblx0XHRyZXR1cm4gJ2ZhLWZpbGUtd29yZCdcblx0fVxuXHRpZiAobmFtZS5lbmRzV2l0aCgnLm9nZycpIHx8IG5hbWUuZW5kc1dpdGgoJy5tcDMnKSkge1xuXHRcdHJldHVybiAnZmEtZmlsZS1hdWRpbydcblx0fVxuXHRpZiAobmFtZS5lbmRzV2l0aCgnLm1wNCcpKSB7XG5cdFx0cmV0dXJuICdmYS1maWxlLXZpZGVvJ1xuXHR9XG5cdHJldHVybiAnZmEtZmlsZSdcbn1cblxuZnVuY3Rpb24gc29ydEZpbGVzKGZpbGVzKSB7XG5cdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0ICBpZiAoYS5mb2xkZXIgJiYgIWIuZm9sZGVyKSB7XG5cdCAgICByZXR1cm4gLTFcblx0ICB9XG5cdCAgaWYgKCFhLmZvbGRlciAmJiBiLmZvbGRlcikge1xuXHQgICAgcmV0dXJuIDFcblx0ICB9XG5cdCAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSlcblx0fSlcdFx0XHRcbn1cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sIFxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRzaG93VG9vbGJhcjogZmFsc2UsXG5cdFx0aW1hZ2VPbmx5OiBmYWxzZSxcblx0XHRmaWx0ZXJFeHRlbnNpb246IHVuZGVmaW5lZCxcblx0XHRmcmllbmRVc2VyOiAnJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIlxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiIGJuLXNob3c9XFxcInNob3dUb29sYmFyXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJOZXcgZm9sZGVyXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVGb2xkZXJcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmFzIGZhLWZvbGRlci1wbHVzXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJJbXBvcnQgZmlsZVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0RmlsZVxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS11cGxvYWRcXFwiPjwvaT48L2J1dHRvbj5cdFx0XFxuXFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJUb2dnbGUgU2VsZWN0aW9uXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dsZVNlbGVjdGlvblxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jaGVja1xcXCI+PC9pPjwvYnV0dG9uPlxcblxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJSZWxvYWRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblJlbG9hZFxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1zeW5jLWFsdFxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJEZWxldGVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkRlbGV0ZUZpbGVzXFxcIlxcblx0XHRcdGJuLXByb3A9XFxcInByb3AxXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkN1dFxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ3V0RmlsZXNcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY3V0XFxcIj48L2k+PC9idXR0b24+XHRcXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQ29weVxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29weUZpbGVzXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY29weVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJTaGFyZVxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMlxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uU2hhcmVGaWxlc1xcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXNoYXJlLWFsdFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJQYXN0ZVxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wM1xcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUGFzdGVGaWxlc1xcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1wYXN0ZVxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInBhdGhQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnBhdGhJdGVtOiBvblBhdGhJdGVtXFxcIj5cXG5cdDxkaXY+UGF0aDo8L2Rpdj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZ2V0UGF0aFxcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jaGV2cm9uLXJpZ2h0XFxcIiBibi1zaG93PVxcXCIhaXNGaXJzdFxcXCI+PC9pPlxcblx0XHQ8c3Bhbj5cXG5cdFx0XHQ8YSBjbGFzcz1cXFwicGF0aEl0ZW1cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgaHJlZj1cXFwiI1xcXCIgYm4tc2hvdz1cXFwiIWlzTGFzdFxcXCIgYm4tZGF0YT1cXFwie2luZm86IGdldFBhdGhJbmZvfVxcXCI+PC9hPlx0XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBibi1zaG93PVxcXCJpc0xhc3RcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFxcblx0XHQ8L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG5cdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZmlsZXNcXFwiIFxcblx0XHRibi1pdGVyPVxcXCJmXFxcIiBcXG5cdFx0Y2xhc3M9XFxcImNvbnRhaW5lclxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLmZvbGRlcjogb25Gb2xkZXJDbGljaywgY2xpY2suY2hlY2s6IG9uQ2hlY2tDbGljaywgY2xpY2suZmlsZTogb25GaWxlQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLnRodW1ibmFpbDogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ0aHVtYm5haWwgdzMtY2FyZC0yXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJkYXRhMVxcXCI+XHRcXG5cXG5cdFx0XHRcdDxzcGFuIGJuLWlmPVxcXCJpZjFcXFwiPlxcblx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLXNob3c9XFxcInNob3dUb29sYmFyXFxcIiBjbGFzcz1cXFwiY2hlY2sgdzMtY2hlY2tcXFwiPlx0XHRcdFx0XHRcdFxcblx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PGRpdiBibi1pZj1cXFwiJHNjb3BlLmYuZm9sZGVyXFxcIiBjbGFzcz1cXFwiZm9sZGVyIGl0ZW1cXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtNHggZmEtZm9sZGVyLW9wZW4gdzMtdGV4dC1ibHVlLWdyZXlcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlx0XHRcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIiBibi1pZj1cXFwiaWYxXFxcIj48L3NwYW4+XHRcdFx0XHRcdFx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgXFxuXHRcdFx0XHRcdGJuLWlmPVxcXCJpZjJcXFwiICBcXG5cdFx0XHRcdFx0Y2xhc3M9XFxcImZpbGUgaXRlbVxcXCJcXG5cdFx0XHRcdFx0Plxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNsYXNzMX1cXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvc3Bhbj5cdFx0XHRcdFx0XHRcdFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plx0XHRcdFxcblxcblx0XHRcdFx0PGRpdiBcXG5cdFx0XHRcdFx0Ym4taWY9XFxcImlmM1xcXCIgIFxcblx0XHRcdFx0XHRjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIlxcblx0XHRcdFx0XHQ+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogJHNjb3BlLmYudGh1bWJuYWlsVXJsfVxcXCI+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlx0XHRcdFx0XHRcdFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERpbWVuc2lvblxcXCI+PC9zcGFuPlx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cdFxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0XFxuXFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0Y29uc3QgdGh1bWJuYWlsU2l6ZSA9ICcxMDB4Pydcblx0XHRjb25zdCBtYXhVcGxvYWRTaXplID0gMioxMDI0KjIwMTQgLy8gMiBNb1xuXG5cdFx0bGV0IHNlbGVjdGVkID0gZmFsc2VcblxuXHRcdGxldCB7XG5cdFx0XHRzaG93VG9vbGJhcixcblx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRpbWFnZU9ubHlcblx0XHR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0aWYgKGZyaWVuZFVzZXIgIT0gJycpIHtcblx0XHRcdHNob3dUb29sYmFyID0gZmFsc2Vcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZWxGaWxlcygpIHtcblx0XHRcdGNvbnN0IHNlbEZpbGVzID0gW11cblx0XHRcdGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcdFx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblx0XHRcdFx0XG5cdFx0XHRcdHNlbEZpbGVzLnB1c2goY3RybC5tb2RlbC5yb290RGlyICsgaW5mby5uYW1lKVxuXHRcdFx0fSlcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdHJldHVybiBzZWxGaWxlc1x0XHRcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGdldE5iU2VsRmlsZXMoKSB7XG5cdFx0XHRyZXR1cm4gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJykubGVuZ3RoXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG9nZ2xlU2VsZWN0aW9uKCkge1xuXHRcdFx0c2VsZWN0ZWQgPSAhc2VsZWN0ZWRcblx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgc2VsZWN0ZWQpXG5cdFx0fVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93VG9vbGJhcixcblx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdHNlbGVjdGVkRmlsZXM6IFtdLFxuXHRcdFx0XHRvcGVyYXRpb246ICdub25lJyxcblx0XHRcdFx0bmJTZWxlY3Rpb246IDAsXG5cdFx0XHRcdGlzU2hhcmVTZWxlY3RlZDogZmFsc2UsXG5cdFx0XHRcdGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHRhYiA9ICgnL2hvbWUnICsgdGhpcy5yb290RGlyKS5zcGxpdCgnLycpXG5cdFx0XHRcdFx0dGFiLnNoaWZ0KClcblx0XHRcdFx0XHR0YWIucG9wKClcblx0XHRcdFx0XHRyZXR1cm4gdGFiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzTGFzdDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IHRoaXMuZ2V0UGF0aCgpLmxlbmd0aC0xXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzRmlyc3Q6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFBhdGhJbmZvOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmdldFBhdGgoKS5zbGljZSgxLCBzY29wZS5pZHgrMSkuam9pbignLycpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0ZGF0YTE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtpdGVtczogc2NvcGUuZi5pdGVtcyB8fCB7fX1cblx0XHRcdFx0fSxcblx0XHRcdFx0aWYxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS5mLm5hbWUgIT0gJy4uJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiAhc2NvcGUuZi5pc0ltYWdlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmIHNjb3BlLmYuaXNJbWFnZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGBmYSBmYS00eCB3My10ZXh0LWJsdWUtZ3JleSAke2dldEljb25DbGFzcyhzY29wZS5mLm5hbWUpfWBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLmYuc2l6ZVxuXHRcdFx0XHRcdGxldCB1bml0ID0gJ29jdGV0cydcblx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdHVuaXQgPSAnTW8nXG5cdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzaXplID0gTWF0aC5mbG9vcihzaXplKjEwKS8xMFxuXHRcdFx0XHRcdHJldHVybiAnU2l6ZTogJyArIHNpemUgKyAnICcgKyB1bml0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Z2V0RGltZW5zaW9uOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IGQgPSBzY29wZS5mLmRpbWVuc2lvblxuXHRcdFx0XHRcdHJldHVybiBgRGltZW5zaW9uOiAke2Qud2lkdGh9eCR7ZC5oZWlnaHR9YFxuXHRcdFx0XHR9LFxuXG5cblx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoc2NvcGUuZi5tdGltZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcblx0XHRcdFx0XHRyZXR1cm4gJ0xhc3QgTW9kaWY6ICcgKyBkYXRlXG5cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRwcm9wMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogdGhpcy5uYlNlbGVjdGlvbiA9PSAwfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwcm9wMjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogdGhpcy5uYlNlbGVjdGlvbiA9PSAwIHx8IHRoaXMucm9vdERpci5zdGFydHNXaXRoKCcvc2hhcmUvJykgfHwgdGhpcy5pc1NoYXJlU2VsZWN0ZWR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHByb3AzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2Rpc2FibGVkOiAgdGhpcy5zZWxlY3RlZEZpbGVzLmxlbmd0aCA9PSAwfVxuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25QYXRoSXRlbTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBwYXRoSXRlbSA9ICQodGhpcykuZGF0YSgnaW5mbycpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUGF0aEl0ZW0nLCBwYXRoSXRlbSlcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRcdFx0XHRsb2FkRGF0YShwYXRoSXRlbSA9PSAnJyA/ICcvJyA6ICcvJyArIHBhdGhJdGVtICsgJy8nKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJlbG9hZDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblx0XHRcdFx0XHRjb25zdCB7Y21kfSA9IGRhdGFcblxuXHRcdFx0XHRcdGNvbnN0IHtyb290RGlyfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2Rvd25sb2FkJykge1xuXHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gc3J2RmlsZXMuZmlsZVVybChyb290RGlyICsgaW5mby5uYW1lKVxuXHRcdFx0XHRcdFx0JCQudXRpbC5kb3dubG9hZFVybCh1cmwsIGluZm8ubmFtZSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdyZW5hbWUnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBvbGRGaWxlTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7bGFiZWw6ICdOZXcgbmFtZScsIHRpdGxlOiAnUmVuYW1lJywgdmFsdWU6IG9sZEZpbGVOYW1lfSwgZnVuY3Rpb24obmV3RmlsZU5hbWUpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ25ld0ZpbGVOYW1lJywgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdGlmIChuZXdGaWxlTmFtZSAhPSBvbGRGaWxlTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRcdHNydkZpbGVzLnJlbmFtZUZpbGUocm9vdERpciwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdtYWtlUmVzaXplZENvcHknKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdFx0bGFiZWw6ICdSZXNjYWxlIHBlcmNlbnRhZ2U6JywgXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnTWFrZSByZXNpemVkIGNvcHknLFxuXHRcdFx0XHRcdFx0XHRhdHRyczoge21pbjogMTAsIG1heDogOTAsIHR5cGU6ICdudW1iZXInfSxcblx0XHRcdFx0XHRcdFx0dmFsdWU6IDUwXG5cdFx0XHRcdFx0XHR9LCBmdW5jdGlvbihwZXJjZW50YWdlKSB7XG5cdFx0XHRcdFx0XHRcdHNydkZpbGVzLnJlc2l6ZUltYWdlKHJvb3REaXIsIGluZm8ubmFtZSwgcGVyY2VudGFnZSsnJScpXG5cdFx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdjb252ZXJ0VG9NUDMnKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5jb252ZXJ0VG9NUDMocm9vdERpciwgaW5mby5uYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbGV0ZScpIHtcblx0XHRcdFx0XHRcdGRlbGV0ZUZpbGVzKFtyb290RGlyICsgaW5mby5uYW1lXSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblxuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRyb290RGlyOiBjdHJsLm1vZGVsLnJvb3REaXIsICAgICAgICAgICAgICAgICAgICAgICBcblx0XHRcdFx0XHRcdGlzSW1hZ2U6IGluZm8uaXNJbWFnZVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmaWxlY2xpY2snLCBkYXRhKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNoZWNrQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRpZiAoaW5mby5uYW1lID09ICdzaGFyZScgJiYgY3RybC5tb2RlbC5yb290RGlyID09ICcvJykge1xuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5pc1NoYXJlU2VsZWN0ZWQgPSAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe25iU2VsZWN0aW9uOiBnZXROYlNlbEZpbGVzKCl9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZvbGRlckNsaWNrOiBmdW5jdGlvbihldikge1xuXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Gb2xkZXJDbGljaycsIGRpck5hbWUpXG5cdFx0XHRcdFx0aWYgKGRpck5hbWUgPT0gJy4uJykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc3BsaXQgPSBjdHJsLm1vZGVsLnJvb3REaXIuc3BsaXQoJy8nKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0c3BsaXQucG9wKClcblx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRsb2FkRGF0YShzcGxpdC5qb2luKCcvJykgKyAnLycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0bG9hZERhdGEoY3RybC5tb2RlbC5yb290RGlyICsgZGlyTmFtZSArICcvJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ3JlYXRlRm9sZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgcm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogJ0ZvbGRlciBuYW1lOicsIFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdOZXcgRm9sZGVyJ1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKGZvbGRlck5hbWUpIHtcblx0XHRcdFx0XHRcdHNydkZpbGVzLm1rZGlyKHJvb3REaXIgKyBmb2xkZXJOYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRvZ2xlU2VsZWN0aW9uOiBmdW5jdGlvbigpXHR7XG5cdFx0XHRcdFx0dG9nZ2xlU2VsZWN0aW9uKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe25iU2VsZWN0aW9uOiBnZXROYlNlbEZpbGVzKCl9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRGVsZXRlRmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cblx0XHRcdFx0XHRjb25zdCBzZWxGaWxlcyA9IGdldFNlbEZpbGVzKClcblxuXHRcdFx0XHRcdGlmIChzZWxGaWxlcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdEZWxldGUgZmlsZXMnLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50OiAnTm8gZmlsZXMgc2VsZWN0ZWQnXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZGVsZXRlRmlsZXMoc2VsRmlsZXMpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DdXRGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DdXRGaWxlcycpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCksXG5cdFx0XHRcdFx0XHRvcGVyYXRpb246ICdjdXQnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkNvcHlGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db3B5RmlsZXMnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBnZXRTZWxGaWxlcygpLFxuXHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY29weSdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uU2hhcmVGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25TaGFyZUZpbGVzJylcblx0XHRcdFx0XHRzcnZGaWxlcy5zaGFyZUZpbGVzKGdldFNlbEZpbGVzKCkpXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QYXN0ZUZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblBhc3RlRmlsZXMnKVxuXHRcdFx0XHRcdGNvbnN0IHtyb290RGlyLCBzZWxlY3RlZEZpbGVzLCBvcGVyYXRpb259ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdGNvbnN0IHByb21pc2UgPSBcblx0XHRcdFx0XHRcdChvcGVyYXRpb24gPT0gJ2NvcHknKSA/IHNydkZpbGVzLmNvcHlGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKSA6IHNydkZpbGVzLm1vdmVGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKVxuXG5cdFx0XHRcdFx0cHJvbWlzZVxuXHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkltcG9ydEZpbGU6IGZ1bmN0aW9uKGV2KSB7XG5cblx0XHRcdFx0XHQkJC51dGlsLm9wZW5GaWxlRGlhbG9nKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVTaXplJywgZmlsZS5zaXplIC8gMTAyNClcblx0XHRcdFx0XHRcdGlmIChmaWxlLnNpemUgPiBtYXhVcGxvYWRTaXplKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogJ0ZpbGUgdG9vIGJpZycsIHRpdGxlOiAnSW1wb3J0IGZpbGUnfSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkJC51dGlsLnJlYWRGaWxlKGZpbGUpLnRoZW4oKGJsb2IpID0+IHtcblx0XHRcdFx0XHRcdFx0c3J2RmlsZXMudXBsb2FkRmlsZShibG9iLCBmaWxlLm5hbWUsIGN0cmwubW9kZWwucm9vdERpcikudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsIHRpdGxlOiAnRXJyb3InfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZGVsZXRlRmlsZXMoZmlsZU5hbWVzKSB7XG5cdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPycsXG5cdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJ1xuXHRcdFx0fSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNydkZpbGVzLnJlbW92ZUZpbGVzKGZpbGVOYW1lcylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cdFx0XHR9KVx0XHRcdFx0XG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyKSB7XG5cdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWREYXRhJywgcm9vdERpcilcblx0XHRcdHNydkZpbGVzLmxpc3Qocm9vdERpciwge2ZpbHRlckV4dGVuc2lvbiwgaW1hZ2VPbmx5fSwgZnJpZW5kVXNlcikudGhlbihmdW5jdGlvbihmaWxlcykge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRmaWxlcy5mb3JFYWNoKChmKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGYuaXNJbWFnZSkge1xuXHRcdFx0XHRcdFx0Zi50aHVtYm5haWxVcmwgPSBzcnZGaWxlcy5maWxlVGh1bWJuYWlsVXJsKHJvb3REaXIgKyBmLm5hbWUsIHRodW1ibmFpbFNpemUsIGZyaWVuZFVzZXIpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChzaG93VG9vbGJhcikge1xuXHRcdFx0XHRcdFx0Zi5pdGVtcyA9IHtcblx0XHRcdFx0XHRcdFx0ZGVsZXRlOiB7bmFtZTogJ0RlbGV0ZScsIGljb246ICdmYXMgZmEtdHJhc2gnfSxcblx0XHRcdFx0XHRcdFx0cmVuYW1lOiB7bmFtZTogJ1JlbmFtZSd9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoZi5pc0ltYWdlKSB7XG5cdFx0XHRcdFx0XHRcdGYuaXRlbXMubWFrZVJlc2l6ZWRDb3B5ID0ge25hbWU6ICdNYWtlIHJlc2l6ZWQgY29weScsIGljb246ICdmYXMgZmEtY29tcHJlc3MtYXJyb3dzLWFsdCd9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIWYuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdGYuaXRlbXMuZG93bmxvYWQgPSB7bmFtZTogJ0Rvd25sb2FkJywgaWNvbjogJ2ZhcyBmYS1kb3dubG9hZCd9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoZi5uYW1lLmVuZHNXaXRoKCcubXA0JykpIHtcblx0XHRcdFx0XHRcdFx0Zi5pdGVtcy5jb252ZXJ0VG9NUDMgPSB7bmFtZTogJ0NvbnZlcnQgdG8gTVAzJ31cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdFxuXHRcdFx0XHRpZiAocm9vdERpciAhPSAnLycpIHtcblx0XHRcdFx0XHRmaWxlcy51bnNoaWZ0KHtuYW1lOiAnLi4nLCBmb2xkZXI6IHRydWV9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0ZmlsZXMsIFxuXHRcdFx0XHRcdHJvb3REaXIsIFxuXHRcdFx0XHRcdG5iU2VsZWN0aW9uOiAwLFxuXHRcdFx0XHRcdGlzU2hhcmVTZWxlY3RlZDogZmFsc2Vcblx0XHRcdFx0fSlcblxuXHRcdFx0fSlcdFx0XG5cdFx0fVxuXG5cdFx0bG9hZERhdGEoKVxuXG5cdFx0dGhpcy5nZXRGaWxlcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZmlsZXMuZmlsdGVyKChmKSA9PiAhZi5mb2xkZXIpXG5cdFx0fVxuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZScpXG5cdFx0XHRsb2FkRGF0YSgpXG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogJ3VwZGF0ZSgpJyxcblx0JGV2ZW50czogJ2ZpbGVjbGljaydcblxufSk7XG5cbn0pKCk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdHNob3dTZW5kTWVzc2FnZTogZmFsc2UsXG5cdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogdHJ1ZVxuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZWFjaD1cXFwiZnJpZW5kc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiIGJuLWV2ZW50PVxcXCJjbGljay53My1iYXI6IG9uSXRlbUNsaWNrLCBjbGljay5ub3RpZjogb25TZW5kTWVzc2FnZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgc3R5bGU9XFxcImN1cnNvcjogcG9pbnRlcjtcXFwiPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IG5vdGlmIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE1lc3NhZ2VcXFwiIGJuLXNob3c9XFxcInNob3dTZW5kTWVzc2FnZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXJcXFwiIGJuLWNsYXNzPVxcXCJjbGFzczFcXFwiPjwvaT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZnJpZW5kVXNlck5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcXG48cCBibi1zaG93PVxcXCJzaG93MlxcXCI+WW91IGhhdmUgbm8gZnJpZW5kczwvcD5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IHtzaG93U2VsZWN0aW9uLCBzaG93U2VuZE1lc3NhZ2UsIHNob3dDb25uZWN0aW9uU3RhdGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcmllbmRzOiBbXSxcblx0XHRcdFx0c2hvd1NlbmRNZXNzYWdlLFxuXHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZnJpZW5kcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCAkaSA9IHNjb3BlLiRpXG5cdFx0XHRcdFx0Y29uc3Qgc2hvd0Nvbm5lY3Rpb25TdGF0ZSA9IHRoaXMuc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHQndzMtdGV4dC1ncmVlbic6ICRpLmlzQ29ubmVjdGVkICYmIHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdFx0XHQndzMtdGV4dC1yZWQnOiAhJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LWJsdWUnOiAhc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5zaWJsaW5ncygnLnczLWJsdWUnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCd3My1ibHVlJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZyaWVuZGNsaWNrJywge3VzZXJOYW1lfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TZW5kTWVzc2FnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cblx0XHRcdFx0XHRjb25zdCB1c2VyTmFtZSA9ICBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XS5mcmllbmRVc2VyTmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VuZE1lc3NhZ2UnLCB1c2VyTmFtZSlcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTWVzc2FnZScsIGxhYmVsOiAnTWVzc2FnZTonfSwgZnVuY3Rpb24odGV4dCkge1xuXHRcdFx0XHRcdFx0dXNlcnMuc2VuZE5vdGlmKHVzZXJOYW1lLCB7dGV4dCwgcmVwbHk6IHRydWV9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiBvblVwZGF0ZShtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHtpc0Nvbm5lY3RlZCwgdXNlck5hbWV9ID0gbXNnLmRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZyaWVuZHMuZmluZCgoZnJpZW5kKSA9PiB7cmV0dXJuIGZyaWVuZC5mcmllbmRVc2VyTmFtZSA9PSB1c2VyTmFtZX0pXG5cdFx0XHRpbmZvLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWRcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBpZHggPSBlbHQuZmluZCgnbGkudzMtYmx1ZScpLmluZGV4KCk7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzW2lkeF1cblx0XHR9XG5cblx0XHR0aGlzLmdldEZyaWVuZHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHMubWFwKChmcmllbmQpID0+IGZyaWVuZC5mcmllbmRVc2VyTmFtZSlcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dXNlcnMuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tmcmllbmRzXSBkaXNwb3NlJylcblx0XHRcdGJyb2tlci51bnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cdFx0fVxuXG5cblx0XHR0aGlzLnVwZGF0ZSgpXG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTpzdHJpbmc7XG5cdFx0Z2V0RnJpZW5kcygpOltzdHJpbmddXG5cdGAsXG5cblx0JGV2ZW50czogJ2ZyaWVuZGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ob21lJywge1xuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QuYnJva2VyJyxcblx0XHQnYnJlaXpib3QudXNlcnMnLFxuXHRcdCdicmVpemJvdC5ydGMnLFxuXHRcdCdicmVpemJvdC5hcHBzJyxcblx0XHQnYnJlaXpib3Quc2NoZWR1bGVyJ1xuXHRdLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlciB3My10ZWFsXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkZ1bGxTY3JlZW5cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25GdWxsU2NyZWVuXFxcIiBibi1zaG93PVxcXCIhZnVsbFNjcmVlblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDb25uZWN0aW9uIFN0YXR1c1xcXCI+XFxuXHRcdFx0PGkgYm4tY2xhc3M9XFxcInt3My10ZXh0LWdyZWVuOiBjb25uZWN0ZWQsIHczLXRleHQtcmVkOiAhY29ubmVjdGVkfVxcXCIgY2xhc3M9XFxcImZhIGZhLWNpcmNsZVxcXCI+PC9pPlxcblx0XHRcdFxcblx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PGRpdiBibi1zaG93PVxcXCJoYXNJbmNvbWluZ0NhbGxcXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNhbGxSZXNwb25zZVxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLCBcXG5cdFx0XHRcdHRpdGxlOiBjYWxsSW5mby5mcm9tLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0YWNjZXB0OiB7bmFtZTogXFwnQWNjZXB0XFwnfSxcXG5cdFx0XHRcdFx0ZGVueToge25hbWU6IFxcJ0RlY2xpbmVcXCd9LFxcblx0XHRcdFx0fVxcblx0XHRcdH1cXFwiXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNhbGxJbmZvLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuPCEtLSBcdDxzdHJvbmcgYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvc3Ryb25nPlxcbiAtLT5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmaWNhdGlvbiB3My1idXR0b25cXFwiIHRpdGxlPVxcXCJOb3RpZmljYXRpb25cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ob3RpZmljYXRpb25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1iZWxsIHczLXRleHQtd2hpdGVcXFwiID48L2k+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJhZGdlIHczLXJlZCB3My10aW55XFxcIiBibi10ZXh0PVxcXCJuYk5vdGlmXFxcIiBibi1zaG93PVxcXCJoYXNOb3RpZlxcXCI+PC9zcGFuPlx0XHRcdFxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRwd2Q6IHtuYW1lOiBcXCdDaGFuZ2UgcGFzc3dvcmRcXCcsIGljb246IFxcJ2ZhcyBmYS1sb2NrXFwnfSxcXG5cdFx0XHRcdFx0YXBwczoge25hbWU6IFxcJ0FwcGxpY2F0aW9uc1xcJywgaWNvbjogXFwnZmFzIGZhLXRoXFwnfSxcXG5cdFx0XHRcdFx0c2VwOiBcXCctLS0tLS1cXCcsXFxuXHRcdFx0XHRcdGxvZ291dDoge25hbWU6IFxcJ0xvZ291dFxcJywgaWNvbjogXFwnZmFzIGZhLXBvd2VyLW9mZlxcJ31cXG5cdFx0XHRcdH0sXFxuXHRcdFx0XHR0aXRsZTogdXNlck5hbWUsXFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnXFxuXHRcdFx0fVxcXCIgXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbnRleHRNZW51XFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyIGZhLWxnXFxcIj48L2k+XFxuPCEtLSBcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInVzZXJOYW1lXFxcIj48L3NwYW4+XHRcXG4gLS0+XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtZG93biBmYS1sZ1xcXCI+PC9pPlxcbiAgICBcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cXG5cdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy50YWJzXFxcIiBcXG5cdGNsYXNzPVxcXCJjb250ZW50XFxcIiBcXG5cdGJuLWlmYWNlPVxcXCJ0YWJzXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJ0YWJzcmVtb3ZlOiBvblRhYlJlbW92ZSwgdGFic2FjdGl2YXRlOiBvblRhYkFjdGl2YXRlXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuYXBwc1xcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInthcHBzOiBnZXRNeUFwcHN9XFxcIlxcblx0XHRibi1ldmVudD1cXFwiYXBwY2xpY2s6IG9uQXBwQ2xpY2tcXFwiXFxuXHRcdHRpdGxlPVxcXCJIb21lXFxcIiBcXG5cdFx0Plx0XHRcXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBicm9rZXIsIHVzZXJzLCBydGMsIHNydkFwcHMsIHNjaGVkdWxlcikge1xuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQXVkaW8oKSB7XG5cdFx0XHRsZXQgYXVkaW8gPSBudWxsXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwbGF5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBwbGF5Jylcblx0XHRcdFx0XHRhdWRpbyA9IG5ldyBBdWRpbygnL2Fzc2V0cy9za3lwZS5tcDMnKVxuXHRcdFx0XHRcdGF1ZGlvLmxvb3AgPSB0cnVlXHRcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHthdWRpby5wbGF5KCl9LCAxMDApXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0c3RvcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gc3RvcCcpXG5cdFx0XHRcdFx0aWYgKGF1ZGlvICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnBhdXNlKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXVkaW8gPSBudWxsXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRydGMucHJvY2Vzc0NhbGwoKVxuXHRcdFxuXHRcdHJ0Yy5vbignY2FsbCcsIGZ1bmN0aW9uKGNhbGxJbmZvKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogdHJ1ZSwgY2FsbEluZm99KVxuXHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0fSlcblxuXHRcdHJ0Yy5vbignY2FuY2VsJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogZmFsc2V9KVxuXHRcdFx0YXVkaW8uc3RvcCgpXG5cdFx0fSlcdFx0XG5cblx0XHRjb25zdCB7dXNlck5hbWV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgYXVkaW8gPSBjcmVhdGVBdWRpbygpXG5cdFxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW10sXG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsSW5mbzogbnVsbCxcblx0XHRcdFx0ZnVsbFNjcmVlbjogZmFsc2UsXG5cdFx0XHRcdGNvbm5lY3RlZDogZmFsc2UsXG5cdFx0XHRcdGhhc05vdGlmOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5uYk5vdGlmID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRNeUFwcHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmFwcHMuZmlsdGVyKChhKSA9PiBhLmFjdGl2YXRlZClcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQXBwQ2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQXBwQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdG9wZW5BcHAoZGF0YS5hcHBOYW1lKVxuXG5cdFx0XHRcdH0sXHRcdFx0XHRcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRsb2dvdXQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2FwcHMnKSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdzdG9yZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAncHdkJykge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdDaGFuZ2UgUGFzc3dvcmQnLCBsYWJlbDogJ05ldyBQYXNzd29yZDonfSwgZnVuY3Rpb24obmV3UHdkKSB7XG5cdFx0XHRcdFx0XHRcdHVzZXJzLmNoYW5nZVB3ZChuZXdQd2QpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdDaGFuZ2UgUGFzc3dvcmQnLCBjb250ZW50OiAnUGFzc3dvcmQgaGFzIGJlZW4gY2hhbmdlZCd9KVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ob3RpZmljYXRpb246IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTm90aWZpY2F0aW9uJylcblx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC5uYk5vdGlmID09IDApIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogJ25vIG5vdGlmaWNhdGlvbnMnLCB0aXRsZTogJ05vdGlmaWNhdGlvbnMnfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdub3RpZicpXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYWxsUmVzcG9uc2U6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3Qge2NtZH0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsbFJlc3BvbnNlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogZmFsc2V9KVxuXHRcdFx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcdFxuXHRcdFx0XHRcdFx0Y29uc3Qge2Zyb20sIGFwcE5hbWV9ID0gY3RybC5tb2RlbC5jYWxsSW5mb1xuXHRcdFx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNhbGxlcjogZnJvbSxcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnZGVueScpIHtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJ0Yy5kZW55KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GdWxsU2NyZWVuOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkZ1bGxTY3JlZW4nKVxuXHRcdFx0XHRcdGNvbnN0IGVsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcblx0XHRcdFx0XHRjb25zdCByZXF1ZXN0RnVsbHNjcmVlbiA9IGVsZW0ucmVxdWVzdEZ1bGxzY3JlZW4gfHxcblx0XHRcdFx0XHRcdGVsZW0ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW5cblxuXHRcdFx0XHRcdGlmIChyZXF1ZXN0RnVsbHNjcmVlbikge1xuXHRcdFx0XHRcdFx0cmVxdWVzdEZ1bGxzY3JlZW4uY2FsbChlbGVtKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJSZW1vdmU6IGZ1bmN0aW9uKGV2LCBpZHgpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25UYWJSZW1vdmUnLCBpZHgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBFeGl0KCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnRhYnMucmVtb3ZlVGFiKGlkeClcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJBY3RpdmF0ZTogZnVuY3Rpb24oZXYsIHVpKSB7XHRcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25UYWJBY3RpdmF0ZScpXG5cdFx0XHRcdFx0Y29uc3Qge25ld1RhYiwgb2xkVGFifSA9IHVpXG5cdFx0XHRcdFx0Y29uc3QgbmV3VGFiSWR4ID0gbmV3VGFiLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBvbGRUYWJJZHggPSBvbGRUYWIuaW5kZXgoKVxuXHRcdFx0XHRcdGlmIChvbGRUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8ob2xkVGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBTdXNwZW5kKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG5ld1RhYklkeCA+IDApIHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLnNjb3BlLnRhYnMuZ2V0VGFiSW5mbyhuZXdUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFJlc3VtZSgpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPT0gMCkge1xuXHRcdFx0XHRcdFx0bG9hZEFwcCgpXG5cdFx0XHRcdFx0fVxuXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLCBmdW5jdGlvbihldikge1xuXHRcdCAgY29uc29sZS5sb2coJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBldilcblx0XHQgIGN0cmwuc2V0RGF0YSh7ZnVsbFNjcmVlbjogIWN0cmwubW9kZWwuZnVsbFNjcmVlbn0pXG5cdFx0fSlcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJmdWxsc2NyZWVuY2hhbmdlXCIsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0ICBjb25zb2xlLmxvZygnZnVsbHNjcmVlbmNoYW5nZScsIGV2KVxuXHRcdCAgY3RybC5zZXREYXRhKHtmdWxsU2NyZWVuOiAhY3RybC5tb2RlbC5mdWxsU2NyZWVufSlcblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKG5iTm90aWYpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7bmJOb3RpZn0pXG5cdFx0XG5cdFx0fVxuXG5cdFx0YnJva2VyLm9uKCdjb25uZWN0ZWQnLCAoc3RhdGUpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7Y29ubmVjdGVkOiBzdGF0ZX0pXG5cdFx0fSlcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKGV2KSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2hvbWVdIG1lc3NhZ2UnLCBldi5kYXRhKVxuXHRcdFx0Y29uc3Qge3R5cGUsIGRhdGF9ID0gZXYuZGF0YVxuXHRcdFx0aWYgKHR5cGUgPT0gJ29wZW5BcHAnKSB7XG5cdFx0XHRcdGNvbnN0IHthcHBOYW1lLCBhcHBQYXJhbXN9ID0gZGF0YVxuXHRcdFx0XHRvcGVuQXBwKGFwcE5hbWUsIGFwcFBhcmFtcylcblx0XHRcdH1cblx0XHRcdFxuXHRcdH0sIGZhbHNlKVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ub3RpZkNvdW50JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMobXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5sb2dvdXQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGxvY2F0aW9uLmhyZWYgPSAnL2xvZ291dCdcblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBnZXRBcHBVcmwoYXBwTmFtZSwgcGFyYW1zKSB7XG5cdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoYC9hcHBzLyR7YXBwTmFtZX1gLCBwYXJhbXMpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb3BlbkFwcChhcHBOYW1lLCBwYXJhbXMpIHtcblx0XHRcdGNvbnN0IGFwcEluZm8gPSBjdHJsLm1vZGVsLmFwcHMuZmluZCgoYSkgPT4gYS5hcHBOYW1lID09IGFwcE5hbWUpXG5cdFx0XHRjb25zdCB0aXRsZSA9IGFwcEluZm8ucHJvcHMudGl0bGVcblx0XHRcdC8vY29uc29sZS5sb2coJ2FwcEluZm8nLCBhcHBJbmZvKVxuXHRcdFx0Y29uc29sZS5sb2coJ29wZW5BcHAnLCBhcHBOYW1lLCBwYXJhbXMpXG5cdFx0XHRsZXQgaWR4ID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZGV4RnJvbVRpdGxlKHRpdGxlKVxuXHRcdFx0Y29uc3QgYXBwVXJsID0gZ2V0QXBwVXJsKGFwcE5hbWUsIHBhcmFtcylcblx0XHRcdGlmIChpZHggPCAwKSB7IC8vIGFwcHMgbm90IGFscmVhZHkgcnVuXG5cdFx0XHRcdGlkeCA9IGN0cmwuc2NvcGUudGFicy5hZGRUYWIodGl0bGUsIHtcblx0XHRcdFx0XHRyZW1vdmFibGU6IHRydWUsXG5cdFx0XHRcdFx0Y29udHJvbDogJ2JyZWl6Ym90LmFwcFRhYicsXG5cdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdGFwcFVybFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8oaWR4KVxuXHRcdFx0XHRpZiAocGFyYW1zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGluZm8uY3RybElmYWNlLnNldEFwcFVybChhcHBVcmwpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zY29wZS50YWJzLnNldFNlbGVjdGVkVGFiSW5kZXgoaWR4KVxuXG5cdFx0fVxuXG5cdFx0dXNlcnMuZ2V0Tm90aWZDb3VudCgpLnRoZW4odXBkYXRlTm90aWZzKVxuXG5cdFx0ZnVuY3Rpb24gbG9hZEFwcCgpIHtcblx0XHRcdHNydkFwcHMubGlzdEFsbCgpLnRoZW4oKGFwcHMpID0+IHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXBwcycsIGFwcHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0YXBwc1xuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGxvZ291dCgpIHtcdFx0XHRcblx0XHRcdHNjaGVkdWxlci5sb2dvdXQoKVxuXHRcdH1cblxuXHRcdGxvYWRBcHAoKVx0XG5cdFx0XG5cblx0fVxufSk7XG4iLCJcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRwcm9wczoge1xuXHRcdHJvb3RQYWdlOiAnJ1xuXHR9LFxuXHR0ZW1wbGF0ZTogXCI8ZGl2IHN0eWxlPVxcXCJkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBoZWlnaHQ6IDEwMCU7IG92ZXJmbG93OiBoaWRkZW47XFxcIj5cXG5cdFxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93QmFja1xcXCIgY2xhc3M9XFxcInczLWdyZWVuXFxcIiBzdHlsZT1cXFwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBhbGlnbi1pdGVtczogY2VudGVyO1xcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkJhY2tcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25CYWNrXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYXJyb3ctbGVmdFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0PGRpdiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9kaXY+XFxuXHRcdDxkaXYgYm4tZWFjaD1cXFwiYnV0dG9uc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmFjdGlvbjogb25BY3Rpb25cXFwiPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCIgXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgXFxuXHRcdFx0XHRibi10ZXh0PVxcXCIkc2NvcGUuJGkubGFiZWxcXFwiIFxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdFx0PjwvYnV0dG9uPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCIgXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgXFxuXHRcdFx0XHRibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiXFxuXHRcdFx0XHRibi1hdHRyPVxcXCJ7dGl0bGU6ICRzY29wZS4kaS50aXRsZX1cXFwiXFxuXHRcdFx0XHQ+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tYmluZD1cXFwiY29udGVudFxcXCIgc3R5bGU9XFxcImZsZXg6IDE7IG92ZXJmbG93OiBoaWRkZW47XFxcIj48L2Rpdj5cXG5cXG48L2Rpdj5cXG5cIixcblxuXHQkaWZhY2U6IGBwb3BQYWdlKGRhdGEpO3B1c2hQYWdlKGN0cmxOYW1lLCBvcHRpb25zKWAsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7cm9vdFBhZ2V9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93QmFjazogZmFsc2UsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0YnV0dG9uczogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pY29uID09IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaWNvbiAhPSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkJhY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25CYWNrJylcblx0XHRcdFx0XHRyZXN0b3JlUGFnZSh0cnVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBjbWQgPSAkKHRoaXMpLmRhdGEoJ2NtZCcpXG5cdFx0XHRcdFx0Y29uc3QgcGFnZUN0cmxJZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZm4gPSBjdXJJbmZvLmJ1dHRvbnNbY21kXS5vbkNsaWNrXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRmbi5jYWxsKHBhZ2VDdHJsSWZhY2UpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjdHJsLnNjb3BlLmNvbnRlbnRcblx0XHRjb25zdCBzdGFjayA9IFtdXG5cdFx0bGV0IGN1ckluZm8gPSBudWxsXG5cblxuXHRcdGZ1bmN0aW9uIHJlc3RvcmVQYWdlKGlzQmFjaywgZGF0YSkge1xuXHRcdFx0XG5cdFx0XHRjb25zdCBpZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdwb3BQYWdlJywgcGFnZUN0cmwpXG5cdFx0XHRpZiAodHlwZW9mIGlmYWNlLmRpc3Bvc2UgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRpZmFjZS5kaXNwb3NlKClcblx0XHRcdH1cblx0XHRcdGN1ckluZm8uY3RybC5zYWZlRW1wdHkoKS5yZW1vdmUoKVxuXHRcdFx0aWYgKGlzQmFjaykge1xuXHRcdFx0XHRpZiAodHlwZW9mIGN1ckluZm8ub25CYWNrID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjdXJJbmZvLm9uQmFjaygpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBjdXJJbmZvLm9uUmV0dXJuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Y3VySW5mby5vblJldHVybihkYXRhKVxuXHRcdFx0fVxuXG5cdFx0XHRjdXJJbmZvID0gc3RhY2sucG9wKClcdFx0XHRcblx0XHRcdGN1ckluZm8uY3RybC5zaG93KClcblx0XHRcdGNvbnN0IHt0aXRsZSwgYnV0dG9uc30gPSBjdXJJbmZvXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXG5cdFx0fVxuXG5cdFx0dGhpcy5wb3BQYWdlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0cmV0dXJuIHJlc3RvcmVQYWdlKGZhbHNlLCBkYXRhKVxuXHRcdH1cblxuXHRcdHRoaXMucHVzaFBhZ2UgPSBmdW5jdGlvbihjdHJsTmFtZSwgb3B0aW9ucykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBwdXNoUGFnZScsIGN0cmxOYW1lLCBvcHRpb25zKVxuXG5cblx0XHRcdGlmIChjdXJJbmZvICE9IG51bGwpIHtcblx0XHRcdFx0Y3VySW5mby5jdHJsLmhpZGUoKVxuXHRcdFx0XHRzdGFjay5wdXNoKGN1ckluZm8pXG5cdFx0XHR9XG5cblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cblx0XHRcdGxldCB7dGl0bGUsIHByb3BzLCBvblJldHVybiwgb25CYWNrLCBldmVudHN9ID0gb3B0aW9uc1xuXG5cdFx0XHRjb25zdCBjb250cm9sID0gY29udGVudC5hZGRDb250cm9sKGN0cmxOYW1lLCAkLmV4dGVuZCh7JHBhZ2VyOiB0aGlzfSwgcHJvcHMpLCBldmVudHMpXG5cblx0XHRcdGxldCBidXR0b25zID0ge31cblxuXHRcdFx0aWYgKG9wdGlvbnMuYnV0dG9ucyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0YnV0dG9ucyA9IG9wdGlvbnMuYnV0dG9uc1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGdldEJ1dHRvbnMgPSBjb250cm9sLmlmYWNlKCkuZ2V0QnV0dG9uc1xuXHRcdFx0XHRpZiAodHlwZW9mIGdldEJ1dHRvbnMgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGJ1dHRvbnMgPSBnZXRCdXR0b25zKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjdXJJbmZvID0ge3RpdGxlLCBidXR0b25zLCBvblJldHVybiwgb25CYWNrLCBjdHJsOiBjb250cm9sfVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXHRcdH1cdFxuXG5cdFx0dGhpcy5zZXRCdXR0b25WaXNpYmxlID0gZnVuY3Rpb24oYnV0dG9uc1Zpc2libGUpIHtcblxuXHRcdFx0Y29uc3Qge2J1dHRvbnN9ID0gY3VySW5mb1xuXG5cdFx0XHRmb3IobGV0IGJ0biBpbiBidXR0b25zVmlzaWJsZSkge1xuXHRcdFx0XHRpZiAoYnRuIGluIGJ1dHRvbnMpIHtcblx0XHRcdFx0XHRidXR0b25zW2J0bl0udmlzaWJsZSA9IGJ1dHRvbnNWaXNpYmxlW2J0bl1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0IFx0XHRcdFx0XG5cdFx0XHRjdHJsLnNldERhdGEoe2J1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpfSlcblx0XHR9XG5cblxuXHRcdHRoaXMucHVzaFBhZ2Uocm9vdFBhZ2UpXG5cblx0fVxuXG59KTtcblxuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucGRmJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBibi1zaG93PVxcXCJ3YWl0XFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+IFJlbmRlcmluZy4uLlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIiF3YWl0XFxcIj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiRml0XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRml0XFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0PC9kaXY+XFxuXHQ8ZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJwYWdlc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcInByZXZpb3VzIHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XFxuXFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwibmV4dCBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLXJpZ2h0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2Plxcblx0XHRcdFBhZ2VzOiA8c3BhbiBibi10ZXh0PVxcXCJjdXJyZW50UGFnZVxcXCI+PC9zcGFuPiAvIDxzcGFuIGJuLXRleHQ9XFxcIm51bVBhZ2VzXFxcIj48L3NwYW4+XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2Plxcblx0XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnBkZlxcXCIgXFxuXHRibi1kYXRhPVxcXCJ7d29ya2VyOiBcXCcvYnJhaW5qcy9wZGYvd29ya2VyLmpzXFwnfVxcXCJcXG5cdGJuLWlmYWNlPVxcXCJwZGZcXFwiXFxuXHQgXFxuPjwvZGl2Plx0XHRcXG5cIixcblxuXHRwcm9wczoge1xuXHRcdHVybDogJydcblx0fSxcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRjb25zdCB7dXJsfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bnVtUGFnZXM6IDAsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0Y3VycmVudFBhZ2U6IDEsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubnVtUGFnZXMgPiAxICYmICF0aGlzLndhaXRcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbk5leHRQYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTmV4dFBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7d2FpdDogdHJ1ZX0pXG5cdFx0XHRcdFx0Y3RybC5zY29wZS5wZGYubmV4dFBhZ2UoKS50aGVuKChjdXJyZW50UGFnZSkgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtjdXJyZW50UGFnZSwgd2FpdDogZmFsc2V9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QcmV2UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblByZXZQYWdlJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3dhaXQ6IHRydWV9KVxuXHRcdFx0XHRcdGN0cmwuc2NvcGUucGRmLnByZXZQYWdlKCkudGhlbigoY3VycmVudFBhZ2UpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRml0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGN0cmwuc2NvcGUucGRmLmZpdCgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBvcGVuRmlsZSh1cmwsIHRpdGxlKSB7XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7d2FpdDogdHJ1ZX0pXG5cblx0XHRcdGN0cmwuc2NvcGUucGRmLm9wZW5GaWxlKHVybCkudGhlbigobnVtUGFnZXMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGUgbG9hZGVkJylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRudW1QYWdlcyxcblx0XHRcdFx0XHR3YWl0OiBmYWxzZVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRpZiAodXJsICE9ICcnKSB7XG5cdFx0XHRvcGVuRmlsZSh1cmwpXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3NldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRvcGVuRmlsZShkYXRhLnVybClcblx0XHRcdH1cblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmx9KVxuXHRgXG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcE5hbWU6ICcnLFxuXHRcdGljb25DbHM6ICcnLFxuXHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJ1xuXHR9LFxuXG5cdC8vdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdFx0PHA+RGlzdGFudDogPHN0cm9uZyBibi10ZXh0PVxcXCJkaXN0YW50XFxcIj48L3N0cm9uZz48L3A+XHRcdFx0XHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW5cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1yZWRcXFwiPlN0b3A8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBibi1zaG93PVxcXCJzaG93NFxcXCIgYm4tYmluZD1cXFwicGFuZWxcXFwiIGNsYXNzPVxcXCJwYW5lbFxcXCI+PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBydGMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7YXBwTmFtZSwgaWNvbkNscywgdGl0bGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgJGNoaWxkcmVuID0gZWx0LmNoaWxkcmVuKCkucmVtb3ZlKClcblx0XHRlbHQuYXBwZW5kKFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdFx0PHA+RGlzdGFudDogPHN0cm9uZyBibi10ZXh0PVxcXCJkaXN0YW50XFxcIj48L3N0cm9uZz48L3A+XHRcdFx0XHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW5cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1yZWRcXFwiPlN0b3A8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBibi1zaG93PVxcXCJzaG93NFxcXCIgYm4tYmluZD1cXFwicGFuZWxcXFwiIGNsYXNzPVxcXCJwYW5lbFxcXCI+PC9kaXY+XCIpXG5cblx0XHRydGMub24oJ3N0YXR1cycsIChkYXRhKSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzdGF0dXMnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKGRhdGEpXG5cdFx0fSlcdFx0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdFx0ZGlzdGFudDogJycsXG5cdFx0XHRcdGhhc0NoaWxkcmVuOiAkY2hpbGRyZW4ubGVuZ3RoID4gMCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkgeyBcblx0XHRcdFx0XHRyZXR1cm4gWydyZWFkeScsICdkaXNjb25uZWN0ZWQnLCAncmVmdXNlZCcsICdjYW5jZWxlZCddLmluY2x1ZGVzKHRoaXMuc3RhdHVzKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjYWxsaW5nJ30sXG5cdFx0XHRcdHNob3czOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCd9LFxuXHRcdFx0XHRzaG93NDogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnICYmIHRoaXMuaGFzQ2hpbGRyZW59XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FsbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsJylcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5mcmllbmRzJywge1xuXHRcdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93U2VsZWN0aW9uOiB0cnVlXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0YnV0dG9uczoge1xuXHRcdFx0XHRcdFx0XHRjYWxsOiB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdDYWxsJyxcblx0XHRcdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtY2hlY2snLFxuXHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uID0gdGhpcy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHNlbGVjdGlvbiA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSBmcmllbmQnfSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCB7ZnJpZW5kVXNlck5hbWUsIGlzQ29ubmVjdGVkfSA9IHNlbGVjdGlvblxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXJOYW1lJywgZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIWlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IGBVc2VyIDxzdHJvbmc+JHtmcmllbmRVc2VyTmFtZX08L3N0cm9uZz4gaXMgbm90IGNvbm5lY3RlZGBcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKHVzZXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lLCBhcHBOYW1lLCBpY29uQ2xzKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FuY2VsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5jYW5jZWwoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkhhbmd1cDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuYnllKClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcigncnRjaGFuZ3VwJylcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGN0cmwuc2NvcGUucGFuZWwuYXBwZW5kKCRjaGlsZHJlbilcdFx0XG5cdH1cblxufSk7IiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+VXNlck5hbWU8L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInVzZXJuYW1lXFxcIiBuYW1lPVxcXCJ1c2VybmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlBzZXVkbzwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwicHNldWRvXFxcIiBuYW1lPVxcXCJwc2V1ZG9cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Mb2NhdGlvbjwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwibG9jYXRpb25cXFwiIG5hbWU9XFxcImxvY2F0aW9uXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+RW1haWw8L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIHBsYWNlaG9sZGVyPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHJlcXVpcmVkPlx0XFxuXHQ8L2Rpdj5cXG5cdFxcblx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0YnV0dG9uczogW1xuXHRcdHtsYWJlbDogJ0NyZWF0ZScsIG5hbWU6ICdjcmVhdGUnfVxuXHRdLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHQkcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGNtZCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0b25BY3Rpb24oY21kKVxuXHRgXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC51c2VycycsIHtcblx0ZGVwczogWydicmVpemJvdC51c2VycyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJVcGRhdGVcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtcmVkb1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIiB0aXRsZT1cXFwiQWRkIFVzZXJcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1wbHVzXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+VXNlciBOYW1lPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlBzZXVkbzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Mb2NhdGlvbjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5FbWFpbDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5DcmVhdGUgRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5MYXN0IExvZ2luIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uczwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiZGF0YVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGUsIGNsaWNrLm5vdGlmOiBvbk5vdGlmXFxcIj5cXG4gIFx0XHRcdDx0cj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudXNlcm5hbWVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBzZXVkb1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubG9jYXRpb25cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkID5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8c3BhbiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDJcXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHRcdFx0YXQgXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDNcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwiZGVsZXRlIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiRGVsZXRlIFVzZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWYgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdDwvdHI+ICAgICAgXHRcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YTogW10sXG5cdFx0XHRcdHRleHQxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5jcmVhdGVEYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkubGFzdExvZ2luRGF0ZSkudG9Mb2NhbGVUaW1lU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5jcmVhdGVEYXRlICE9IHVuZGVmaW5lZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSB1bmRlZmluZWQgJiYgc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRVc2VyOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuYWRkVXNlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHR1c2Vycy5hZGQoZGF0YSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHt1c2VybmFtZX0gPSBjdHJsLm1vZGVsLmRhdGFbaWR4XVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ0RlbGV0ZSBVc2VyJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0dXNlcnMucmVtb3ZlKHVzZXJuYW1lKS50aGVuKGdldFVzZXJzKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWY6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7dXNlcm5hbWV9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTm90aWZpY2F0aW9uJywgbGFiZWw6ICdNZXNzYWdlJ30sIGZ1bmN0aW9uKHRleHQpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VybmFtZSwge3RleHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRnZXRVc2VycygpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZXRVc2VycygpIHtcblx0XHRcdHVzZXJzLmxpc3QoKS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtkYXRhfSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0Z2V0VXNlcnMoKVxuXG5cblxuXHR9XG5cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnZpZXdlcicsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1pZj1cXFwiaWYxXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJpbWFnZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW1hZ2VcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7c3JjOiB1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgYm4taWY9XFxcImlmMlxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwicGRmXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJlaXpib3QucGRmXFxcIiBcXG5cdFx0Ym4tZGF0YT1cXFwie3VybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpZjNcXFwiIGNsYXNzPVxcXCJhdWRpb1xcXCI+XFxuXHQ8YXVkaW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC9hdWRpbz5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpZjRcXFwiIGNsYXNzPVxcXCJ2aWRlb1xcXCI+XFxuXHQ8dmlkZW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC92aWRlbz5cXG48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdHR5cGU6ICcnLFxuXHRcdHVybDogJyMnXG5cdH0sXG5cdFxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRsZXQge3R5cGUsIHVybH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybCxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0aWYxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdpbWFnZSdcblx0XHRcdFx0fSxcblx0XHRcdFx0aWYyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdwZGYnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnYXVkaW8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmNDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAndmlkZW8nXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiByZW1vdmUoZnVsbE5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1ZpZXdlcl0gcmVtb3ZlJywge2Z1bGxOYW1lfSlcblxuXHRcdFx0JCQudWkuc2hvd0NvbmZpcm0oe3RpdGxlOiAnUmVtb3ZlIGZpbGUnLCBjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nfSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGZpbGVzLnJlbW92ZUZpbGVzKFtmdWxsTmFtZV0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0Y2FsbGJhY2soKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNhdmUoZGVzdFBhdGgsIGZpbGVOYW1lLCBjYWxsYmFjaykge1x0XHRcdFxuXHRcdFx0Y29uc29sZS5sb2coJ1tWaWV3ZXJdIHNhdmUnLCB7ZGVzdFBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdGlmIChjdHJsLm1vZGVsLnVybCA9PSAnJykge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnRmlsZSBub3QgbG9hZGVkLCBwbGVhc2Ugd2FpdCd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IGJsb2IgPSAkJC51dGlsLmRhdGFVUkx0b0Jsb2IoY3RybC5tb2RlbC51cmwpXG5cdFx0XHRmaWxlcy51cGxvYWRGaWxlKGJsb2IsIGZpbGVOYW1lLCBkZXN0UGF0aCkudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0Y2FsbGJhY2soKVxuXHRcdFx0fSlcdFxuXHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cdFx0XG5cblx0XHR0aGlzLnJlbW92ZSA9IHJlbW92ZVxuXHRcdHRoaXMuc2F2ZSA9IHNhdmVcblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tWaWV3ZXJdIHNldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7dXJsOiBkYXRhLnVybH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdHJlbW92ZShmdWxsTmFtZSwgY2FsbGJhY2spO1xuXHRcdHNhdmUoZGVzdFBhdGgsIGZpbGVOYW1lLCBjYWxsYmFjaylcblx0XHRgXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwRGF0YScsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0bGV0IF9kYXRhID0gY29uZmlnXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0RGF0YTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBfZGF0YVxuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZURhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0X2RhdGEgPSBkYXRhXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvYXBwRGF0YScsIGRhdGEpXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0RGF0YSgpOkRhdGE7XG5cdFx0c2F2ZURhdGEoZGF0YSk6UHJvbWlzZSBcblx0XHRgXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5hcHBzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdEFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2FwaS9hcHBzL2FsbCcpXG5cdFx0XHR9XHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGxpc3RBbGwoKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG5cblx0Y2xhc3MgQnJva2VyQ2xpZW50IGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG5cblx0XHRjb25zdHJ1Y3RvcigpIHtcblx0XHRcdHN1cGVyKClcblxuXHRcdFx0dGhpcy5zb2NrID0gbnVsbFxuXHRcdFx0dGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHR0aGlzLnRyeVJlY29ubmVjdCA9IHRydWVcblx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHR0aGlzLnRvcGljcyA9IG5ldyBFdmVudEVtaXR0ZXIyKHt3aWxkY2FyZDogdHJ1ZX0pXG5cdFx0XHR0aGlzLnBpbmdJbnRlcnZhbCA9IDEwKjEwMDBcblx0XHRcdHRoaXMudGltZW91dElkID0gdW5kZWZpbmVkXG5cblx0XHRcdHRoaXMucmVnaXN0ZXJlZFRvcGljcyA9IHt9XG5cblx0XHRcdGxldCB7aG9zdG5hbWUsIHBhdGhuYW1lLCBwcm90b2NvbH0gPSBsb2NhdGlvblxuXHRcdFx0Y29uc3QgcG9ydCA9IDgwOTBcblx0XHRcdHByb3RvY29sPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRcdHRoaXMudXJsID0gYCR7cHJvdG9jb2x9Ly8ke2hvc3RuYW1lfToke3BvcnR9L2htaSR7cGF0aG5hbWV9YFxuXHRcdH1cblxuXHRcdGNoZWNrUGluZygpIHtcblx0XHRcdHRoaXMudGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXRoaXMuaXNQaW5nT2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygndGltZW91dCBwaW5nJylcblx0XHRcdFx0XHR0aGlzLnNvY2sub25tZXNzYWdlID0gbnVsbFxuXHRcdFx0XHRcdHRoaXMuc29jay5vbmNsb3NlID0gbnVsbFxuXHRcdFx0XHRcdHRoaXMuc29jay5jbG9zZSgpXG5cdFx0XHRcdFx0dGhpcy5vbkNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHR0aGlzLmlzUGluZ09rID0gZmFsc2Vcblx0XHRcdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdwaW5nJ30pXG5cdFx0XHRcdFx0dGhpcy5jaGVja1BpbmcoKVxuXHRcdFx0XHR9XG5cdFx0XHR9LCB0aGlzLnBpbmdJbnRlcnZhbClcdFx0XHRcblx0XHR9XG5cblx0XHRvbkNsb3NlKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25DbG9zZScpXG5cdFx0XHRpZiAodGhpcy5pc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gRGlzY29ubmVjdGVkICEnKVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIGZhbHNlKVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHRpZiAodGhpcy50cnlSZWNvbm5lY3QpIHtcblx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7dGhpcy5jb25uZWN0KCl9LCA1MDAwKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblxuXHRcdGNvbm5lY3QoKSB7XG5cblx0XHRcdGNvbnNvbGUubG9nKCd0cnkgdG8gY29ubmVjdC4uLicpXG5cblx0XHRcdHRoaXMuc29jayA9IG5ldyBXZWJTb2NrZXQodGhpcy51cmwpXG5cdFxuXHRcdFx0dGhpcy5zb2NrLm9ub3BlbiA9ICgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDb25uZWN0ZWQgdG8gYnJva2VyXCIpXG5cdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlXG5cdFx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdHRoaXMuZW1pdCgnY29ubmVjdGVkJywgdHJ1ZSlcblx0XHRcdFx0dGhpcy5jaGVja1BpbmcoKVxuXG5cdFx0XHR9XG5cblxuXHRcdFx0dGhpcy5zb2NrLm9ubWVzc2FnZSA9ICAoZXYpID0+IHtcblx0XHRcdFx0Y29uc3QgbXNnID0gSlNPTi5wYXJzZShldi5kYXRhKVxuXG5cdFx0XHRcdGlmIChldi5jdXJyZW50VGFyZ2V0ICE9IHRoaXMuc29jaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbYnJva2VyXSBtZXNzYWdlIGJhZCB0YXJnZXQnLCBtc2cudHlwZSlcblx0XHRcdFx0XHRldi5jdXJyZW50VGFyZ2V0LmNsb3NlKClcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBtZXNzYWdlJywgbXNnKVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHQvLyB0aGlzLnRvcGljcy5ldmVudE5hbWVzKCkuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHQvLyBcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0Ly8gfSlcdFx0XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGhpcy5yZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncmVnaXN0ZXInLCB0b3BpY30pXHRcblx0XHRcdFx0XHR9KVx0XG5cblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3JlYWR5Jywge2NsaWVudElkOiBtc2cuY2xpZW50SWR9KVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ3BvbmcnKSB7XG5cdFx0XHRcdFx0dGhpcy5pc1BpbmdPayA9IHRydWVcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAnbm90aWYnKSB7XG5cdFx0XHRcdFx0dGhpcy50b3BpY3MuZW1pdChtc2cudG9waWMsIG1zZylcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbQnJva2VyXSBsb2cnLCBtc2cudGV4dClcblx0XHRcdFx0XHR0aGlzLnRyeVJlY29ubmVjdCA9IGZhbHNlXG5cdFx0XHRcdFx0dGhpcy5zb2NrLmNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNvY2sub25jbG9zZSA9IChldikgPT4ge1xuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSB0aGlzLnNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UgYmFkIHRhcmdldCcpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UnKVxuXHRcdFx0XHRpZiAodGhpcy50aW1lb3V0SWQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dElkKVxuXHRcdFx0XHRcdHRoaXMudGltZW91dElkID0gdW5kZWZpbmVkXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMub25DbG9zZSgpXG5cdFx0XHR9XG5cblx0XHR9XG5cblxuXHRcdHNlbmRNc2cobXNnKSB7XG5cdFx0XHRtc2cudGltZSA9IERhdGUubm93KClcblx0XHRcdHZhciB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkobXNnKVxuXHRcdFx0aWYgKHRoaXMuaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gc2VuZE1zZycsIG1zZylcblx0XHRcdFx0dGhpcy5zb2NrLnNlbmQodGV4dClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRlbWl0VG9waWModG9waWMsIGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIGVtaXRUb3BpYycsIHRvcGljLCBkYXRhKVxuXHRcdFx0dmFyIG1zZyA9IHtcblx0XHRcdFx0dHlwZTogJ25vdGlmJyxcblx0XHRcdFx0dG9waWMsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZW5kTXNnKG1zZylcblx0XHR9XG5cblx0XHRvblRvcGljKHRvcGljLCBjYWxsYmFjaykge1xuXHRcdFx0dGhpcy50b3BpY3Mub24odG9waWMsIGNhbGxiYWNrKVxuXHRcdH1cblxuXHRcdHJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gcmVnaXN0ZXInLCB0b3BpYylcblx0XHRcdGlmICh0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID0gMVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY10rKztcblx0XHRcdH1cblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHRcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XHRcdFxuXHRcdH1cblxuXHRcdHVucmVnaXN0ZXIodG9waWMsIGNhbGxiYWNrKSB7XG5cblx0XHRcdHRoaXMudG9waWNzLm9mZih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHQvLyBjb25zdCBuYkxpc3RlbmVycyA9IHRoaXMudG9waWNzLmxpc3RlbmVycyh0b3BpYykubGVuZ3RoXG5cblx0XHRcdC8vIGlmIChuYkxpc3RlbmVycyA9PSAwKSB7IC8vIG5vIG1vcmUgbGlzdGVuZXJzIGZvciB0aGlzIHRvcGljXG5cdFx0XHQvLyBcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3VucmVnaXN0ZXInLCB0b3BpY30pXG5cdFx0XHQvLyB9XHRcblx0XHRcdGlmICgtLXRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXVxuXHRcdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0fVxuXHRcdH1cdFx0XG5cblxuXHRcdFxuXHR9XG5cblxuXG5cblx0JCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmJyb2tlcicsIHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0XHRjb25zdCBjbGllbnQgPSBuZXcgQnJva2VyQ2xpZW50KClcblx0XHRcdGNsaWVudC5jb25uZWN0KClcblxuXHRcdFx0cmV0dXJuIGNsaWVudFxuXHRcdH0sXG5cblx0XHQkaWZhY2U6IGBcblx0XHRcdGVtaXRUb3BpYyh0b3BpY05hbWUsIGRhdGEpO1xuXHRcdFx0cmVnaXN0ZXIodG9waWNOYW1lLCBjYWxsYmFjayk7XG5cdFx0XHR1bnJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0b25Ub3BpYyh0b3BpY05hbWUsIGNhbGxiYWNrKVxuXG5cdFx0YFxuXHR9KVxuXG5cbn0pKCk7XG5cbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5jaXRpZXMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NpdGllcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0Q291bnRyaWVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvY291bnRyaWVzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGllczogZnVuY3Rpb24oY291bnRyeSwgc2VhcmNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jaXRpZXMnLCB7Y291bnRyeSwgc2VhcmNofSlcblx0XHRcdH1cblx0XHRcdFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRDb3VudHJpZXMoKTpQcm9taXNlO1xuXHRcdGdldENpdGllcyhjb3VudHJ5LCBzZWFyY2gpOlByb21pc2U7XG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9maWxlcycpXG5cdFx0XG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uKGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGxpc3QnLCBkZXN0UGF0aClcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvbGlzdCcsIHtkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHtmaWxlTmFtZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVGh1bWJuYWlsVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHtmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGxvYWRGaWxlOiBmdW5jdGlvbihibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gdXBsb2FkRmlsZScsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aClcblx0XHRcdFx0aWYgKCEoYmxvYiBpbnN0YW5jZW9mIEJsb2IpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2Jsb2InLCBibG9iKVxuXHRcdFx0XHR2YXIgZmQgPSBuZXcgRm9ybURhdGEoKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0ZmQuYXBwZW5kKCdkZXN0UGF0aCcsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0Rm9ybURhdGEoJy9zYXZlJywgZmQpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZGVsZXRlJywgZmlsZU5hbWVzKVxuXHRcdFx0fSxcblxuXHRcdFx0bWtkaXI6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1rZGlyJywgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9ta2RpcicsIHtmaWxlTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbW92ZUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzaGFyZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gc2hhcmVGaWxlcycsIGZpbGVOYW1lcylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aDogJy9zaGFyZSd9KVxuXHRcdFx0fSxcdFx0XHRcblxuXHRcdFx0Y29weUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGNvcHlGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb3B5Jywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fSxcdFxuXHRcdFx0cmVuYW1lRmlsZTogZnVuY3Rpb24oZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW5hbWVGaWxlJywgZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3JlbmFtZScsIHtmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHRyZXNpemVJbWFnZTogZnVuY3Rpb24oZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVzaXplSW1hZ2UnLCBmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3Jlc2l6ZUltYWdlJywge2ZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0fSlcblx0XHRcdH0sXG5cdFx0XHRjb252ZXJ0VG9NUDM6IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBjb252ZXJ0VG9NUDMnLCBmaWxlUGF0aCwgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb252ZXJ0VG9NUDMnLCB7ZmlsZVBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdH1cblxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KHBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXIpOlByb21pc2U7XG5cdFx0ZmlsZVVybChmaWxlTmFtZSwgZnJpZW5kVXNlcik6c3RyaW5nO1xuXHRcdGZpbGVUaHVtYm5haWxVcmwoZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpOnN0cmluZztcblx0XHR1cGxvYWRGaWxlKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCk6UHJvbWlzZTtcblx0XHRyZW1vdmVGaWxlcyhmaWxlTmFtZXMpOlByb21pc2U7XG5cdFx0bWtkaXIoZmlsZU5hbWUpOlByb21pc2U7XG5cdFx0bW92ZUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0Y29weUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0cmVuYW1lRmlsZShmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKTpQcm9taXNlO1xuXHRcdHJlc2l6ZUltYWdlKGZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0KTpQcm9taXNlO1xuXHRcdGNvbnZlcnRUb01QMyhmaWxlUGF0aCwgZmlsZU5hbWUpOlByb21pc2Vcblx0YFxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5odHRwJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZScsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiByZXNvdXJjZShgL2FwaS9hcHAvJHtwYXJhbXMuJGFwcE5hbWV9YClcblx0fVxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAkKCcuYnJlaXpib3RQYWdlcicpLmlmYWNlKClcblx0fVxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYXJhbXMnLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcgPT0gJ3N0cmluZycpID8gSlNPTi5wYXJzZShjb25maWcpIDoge31cblx0fVxufSk7XG4iLCIoZnVuY3Rpb24oKXtcblxuY2xhc3MgUlRDIGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG5cdGNvbnN0cnVjdG9yKGJyb2tlciwgaHR0cCwgcGFyYW1zKSB7XG5cblx0XHRzdXBlcigpXG5cblx0XHR0aGlzLmJyb2tlciA9IGJyb2tlclxuXHRcdHRoaXMuaHR0cCA9IGh0dHBcblxuXHRcdHRoaXMuc3JkSWQgPSB1bmRlZmluZWRcblx0XHR0aGlzLmRlc3RJZCA9IHVuZGVmaW5lZFxuXHRcdHRoaXMuZGlzdGFudCA9ICcnXG5cdFx0dGhpcy5zdGF0dXMgPSAncmVhZHknXG5cdFx0dGhpcy5pc0NhbGxlZSA9IGZhbHNlXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHR0aGlzLmRpc3RhbnQgPSBwYXJhbXMuY2FsbGVyXG5cdFx0XHR0aGlzLmRlc3RJZCA9IHBhcmFtcy5jbGllbnRJZFxuXHRcdFx0dGhpcy5pc0NhbGxlZSA9IHRydWVcblx0XHR9XG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKG1zZykgPT4ge1xuXHRcdFx0dGhpcy5zcmNJZCA9IG1zZy5jbGllbnRJZFxuXHRcdFx0dGhpcy5lbWl0KCdyZWFkeScpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYWNjZXB0JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuY2FuY2VsKGZhbHNlKVxuXHRcdFx0dGhpcy5kZXN0SWQgPSBtc2cuc3JjSWRcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXHRcblx0XHRcdHRoaXMuZW1pdCgnYWNjZXB0JylcdFxuXHRcdH0pXHRcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuc3RhdHVzID0gJ3JlZnVzZWQnXG5cdFx0XHR0aGlzLmNhbmNlbChmYWxzZSlcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0XHR0aGlzLmVtaXQoJ2RlbnknKVx0XG5cblx0XHR9KVx0XHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYnllJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2Rpc2Nvbm5lY3RlZCdcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0XHR0aGlzLmVtaXQoJ2J5ZScpXG5cblx0XHR9KVx0XHRcdFx0XG5cdH1cblxuXHRnZXRSZW1vdGVDbGllbnRJZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5kZXN0SWRcblx0fVxuXG5cdHByb2Nlc3NDYWxsKCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBwcm9jZXNzQ2FsbCcpXG5cdFx0dGhpcy5icm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYWxsJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuZGVzdElkID0gbXNnLnNyY0lkXG5cdFx0XHR0aGlzLmVtaXQoJ2NhbGwnLCBtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0dGhpcy5icm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYW5jZWwnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5lbWl0KCdjYW5jZWwnKVxuXHRcdH0pXHRcdFxuXHR9XG5cblx0b25EYXRhKG5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5icm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLicgKyBuYW1lLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayhtc2cuZGF0YSwgbXNnLnRpbWUpXG5cdFx0fSlcdFx0XHRcblx0fVxuXG5cdGVtaXRTdGF0dXMoKSB7XG5cdFx0dGhpcy5lbWl0KCdzdGF0dXMnLCB7c3RhdHVzOiB0aGlzLnN0YXR1cywgZGlzdGFudDogdGhpcy5kaXN0YW50fSlcblx0fVxuXG5cdGNhbGwodG8sIGFwcE5hbWUsIGljb25DbHMpIHtcblx0XHR0aGlzLmRpc3RhbnQgPSB0b1xuXHRcdHRoaXMuc3RhdHVzID0gJ2NhbGxpbmcnXG5cdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRyZXR1cm4gdGhpcy5odHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7XG5cdFx0XHR0byxcblx0XHRcdHNyY0lkOiB0aGlzLnNyY0lkLFxuXHRcdFx0dHlwZTogJ2NhbGwnLFxuXHRcdFx0ZGF0YToge2FwcE5hbWUsIGljb25DbHN9XG5cdFx0fSlcblx0fVx0XG5cblx0Y2FuY2VsKHVwZGF0ZVN0YXR1cyA9IHRydWUpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gY2FuY2VsJywgdXBkYXRlU3RhdHVzKVxuXHRcdGlmICh1cGRhdGVTdGF0dXMpIHtcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2NhbmNlbGVkJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcdFx0XHRcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwge3RvOiB0aGlzLmRpc3RhbnQsIHNyY0lkOiB0aGlzLnNyY0lkLCB0eXBlOiAnY2FuY2VsJ30pXG5cdH1cdFxuXG5cdGFjY2VwdCgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gYWNjZXB0JylcblxuXHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0cmV0dXJuIHRoaXMuc2VuZERhdGEoJ2FjY2VwdCcpXG5cdH1cblxuXHRkZW55KCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBkZW55JylcblxuXHRcdHJldHVybiB0aGlzLnNlbmREYXRhKCdkZW55Jylcblx0fVxuXG5cdGJ5ZSgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gYnllJylcblxuXHRcdGlmICh0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xuXHRcdFx0dGhpcy5zdGF0dXMgPSAncmVhZHknXG5cdFx0XHR0aGlzLmRpc3RhbnQgPSAnJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRcdHJldHVybiB0aGlzLnNlbmREYXRhKCdieWUnKVx0XHRcdFxuXHRcdH1cblxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuXHR9XG5cblx0c2VuZERhdGEodHlwZSwgZGF0YSkge1xuXHRcdHJldHVybiB0aGlzLmh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50YCwge1xuXHRcdFx0ZGVzdElkOiB0aGlzLmRlc3RJZCwgXG5cdFx0XHRzcmNJZDogdGhpcy5zcmNJZCxcblx0XHRcdHR5cGUsXG5cdFx0XHRkYXRhXG5cdFx0fSlcblx0fVx0XG5cbn1cblxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnJ0YycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCcsICdicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwLCBicm9rZXIsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIG5ldyBSVEMoYnJva2VyLCBodHRwLCBwYXJhbXMpXG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdGNhbGwodG8pOlByb21pc2U7XG5cdFx0Y2FuY2VsKHRvKTpQcm9taXNlO1xuXHRcdGRlbnkoKTpQcm9taXNlO1xuXHRcdGJ5ZSgpOlByb21pc2U7XG5cdFx0c2VuZERhdGEodHlwZSwgZGF0YSk6UHJvbWlzZTtcblx0XHRvbkRhdGEoY2FsbGJhY2soZGF0YSwgdGltZSkpXG5cdGBcbn0pO1xuXG5cbn0pKCk7IiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNjaGVkdWxlcicsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCcsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHAsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW5BcHA6IGZ1bmN0aW9uKGFwcE5hbWUsIGFwcFBhcmFtcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW3NjaGVkdWxlcl0gb3BlbkFwcCcsIGFwcE5hbWUsIGFwcFBhcmFtcylcblx0XHRcdFx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdFx0dHlwZTogJ29wZW5BcHAnLFxuXHRcdFx0XHRcdCBkYXRhOiB7YXBwTmFtZSwgYXBwUGFyYW1zfVxuXHRcdFx0XHRcdH0sIGxvY2F0aW9uLmhyZWYpXG5cblx0XHRcdH0sXG5cdFx0XHRsb2dvdXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW3NjaGVkdWxlcl0gbG9nb3V0Jylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9sb2dvdXQnKVxuXHRcdFx0fVx0XHQgXG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdG9wZW5BcHAoYXBwTmFtZSwgYXBwUGFyYW1zKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnVzZXJzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS91c2VycycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycpXG5cdFx0XHR9LFxuXG5cdFx0XHRtYXRjaDogZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJywge21hdGNofSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZDogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvJywgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZTogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZTogZnVuY3Rpb24odXNlciwgZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wdXQoYC8ke3VzZXJ9YCwgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdGdldDogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdGFjdGl2YXRlQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBhY3RpdmF0ZWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FjdGl2YXRlQXBwYCwge2FwcE5hbWUsIGFjdGl2YXRlZH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzZW5kTm90aWY6IGZ1bmN0aW9uKHRvLCBub3RpZikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2VuZE5vdGlmYCwge3RvLCBub3RpZn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVOb3RpZjogZnVuY3Rpb24obm90aWZJZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC9yZW1vdmVOb3RpZi8ke25vdGlmSWR9YClcblx0XHRcdH0sXG5cblx0XHRcdGdldE5vdGlmczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmc2ApXG5cdFx0XHR9LFxuXHRcdFx0XG5cdFx0XHRnZXROb3RpZkNvdW50OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Tm90aWZDb3VudGApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRGcmllbmRzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0RnJpZW5kc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRGcmllbmQ6IGZ1bmN0aW9uKGZyaWVuZFVzZXJOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRGcmllbmRgLCB7ZnJpZW5kVXNlck5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0Y2hhbmdlUHdkOiBmdW5jdGlvbihuZXdQd2QpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2NoYW5nZVB3ZGAsIHtuZXdQd2R9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkQ29udGFjdDogZnVuY3Rpb24obmFtZSwgZW1haWwpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZENvbnRhY3RgLCB7bmFtZSwgZW1haWx9KVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Q29udGFjdHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbihjb250YWN0SWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlQ29udGFjdC8ke2NvbnRhY3RJZH1gKVxuXHRcdFx0fVx0XHRcdFx0XHRcdFxuXHRcdH1cblx0fSxcblx0JGlmYWNlOiBgXG5cdFx0bGlzdCgpOlByb21pc2U7XG5cdFx0YWRkKGRhdGEpOlByb21pc2U7XG5cdFx0cmVtb3ZlKHVzZXIpOlByb21pc2U7XG5cdFx0dXBkYXRlKHVzZXIsIGRhdGEpOlByb21pc2U7XG5cdFx0Z2V0KHVzZXIpOlByb21pc2U7XG5cdFx0YWN0aXZhdGVBcHAoYXBwTmFtZSwgYWN0aXZhdGVkKTpQcm9taXNlO1xuXHRcdHNlbmROb3RpZih0bywgbm90aWYpOlByb21pc2U7XG5cdFx0cmVtb3ZlTm90aWYobm90aWZJZCk6UHJvbWlzZTtcblx0XHRnZXROb3RpZnMoKTpQcm9taXNlO1xuXHRcdGdldE5vdGlmQ291bnQoKTpQcm9taXNlO1xuXHRcdGdldEZyaWVuZHMoKTpQcm9taXNlO1xuXHRcdGFkZEZyaWVuZChmcmllbmRVc2VyTmFtZSk6UHJvbWlzZTtcblx0XHRjaGFuZ2VQd2QobmV3UHdkKTpQcm9taXNlO1xuXHRcdGFkZENvbnRhY3QobmFtZSwgZW1haWwpOlByb21pc2U7XG5cdFx0Z2V0Q29udGFjdHMoKTpQcm9taXNlKGNvbnRhY3RzKTtcblx0XHRyZW1vdmVDb250YWN0KGNvbnRhY3RJZCk6UHJvbWlzZVxuXHRgXG59KTtcbiJdfQ==
