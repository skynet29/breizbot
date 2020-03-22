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

	template: "<p bn-show=\"show2\">You have no contacts</p>\n<ul class=\"w3-ul w3-border w3-white\" \n	bn-event=\"click.w3-bar: onItemClick, click.delete: onDeleteItem\"\n	bn-each=\"contacts\"\n	bn-show=\"show1\"\n	>\n	<li class=\"w3-bar\">\n		<span class=\"w3-button w3-right delete\" title=\"Delete\" bn-show=\"showDeleteButton\"><i class=\"fa fa-trash\"></i></span>\n\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-user w3-text-blue\"></i>\n			<strong bn-text=\"$scope.$i.contactName\"></strong><br>\n			<i class=\"fa fa-envelope w3-text-blue\"></i>\n			<span bn-text=\"$scope.$i.contactEmail\"></span>\n		</div>\n	</li>\n</ul>		\n",

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





$$.control.registerControl('breizbot.friendsPage', {

	template: "<div bn-control=\"breizbot.friends\" \n	data-show-selection=\"true\"\n	bn-iface=\"friends\"\n	></div>",

	props: {
		$pager: null
	},

	buttons: [
		{name: 'call', icon: 'fa fa-check'}
	],

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt)

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			const selection = ctrl.scope.friends.getSelection()
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
				$pager.popPage(friendUserName)
			}
		}
	}

})
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

					pager.pushPage('breizbot.friendsPage', {
						title,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9jb250YWN0cy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwiZnJpZW5kcy9mcmllbmRzLmpzIiwiZnJpZW5kcy9mcmllbmRzUGFnZS5qcyIsImhvbWUvaG9tZS5qcyIsInBkZi9tYWluLmpzIiwicnRjL3J0Yy5qcyIsInVzZXJzL2FkZFVzZXIuanMiLCJ1c2Vycy91c2Vycy5qcyIsInZpZXdlci92aWV3ZXIuanMiLCJhcHBEYXRhLmpzIiwiYXBwcy5qcyIsImJyb2tlci5qcyIsImNpdGllcy5qcyIsImZpbGVzLmpzIiwiaHR0cC5qcyIsInBhZ2VyLmpzIiwicGFyYW1zLmpzIiwicnRjLmpzIiwic2NoZWR1bGVyLmpzIiwidXNlcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeHdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJyZWl6Ym90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xuXG4gICAgICBjb25mLmRlbGltaXRlciAmJiAodGhpcy5kZWxpbWl0ZXIgPSBjb25mLmRlbGltaXRlcik7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyAhPT0gdW5kZWZpbmVkID8gY29uZi5tYXhMaXN0ZW5lcnMgOiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG4gICAgICBjb25mLnZlcmJvc2VNZW1vcnlMZWFrICYmICh0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gY29uZi52ZXJib3NlTWVtb3J5TGVhayk7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbG9nUG9zc2libGVNZW1vcnlMZWFrKGNvdW50LCBldmVudE5hbWUpIHtcbiAgICB2YXIgZXJyb3JNc2cgPSAnKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICdsZWFrIGRldGVjdGVkLiAnICsgY291bnQgKyAnIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nO1xuXG4gICAgaWYodGhpcy52ZXJib3NlTWVtb3J5TGVhayl7XG4gICAgICBlcnJvck1zZyArPSAnIEV2ZW50IG5hbWU6ICcgKyBldmVudE5hbWUgKyAnLic7XG4gICAgfVxuXG4gICAgaWYodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW1pdFdhcm5pbmcpe1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgICAgZS5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICBlLmVtaXR0ZXIgPSB0aGlzO1xuICAgICAgZS5jb3VudCA9IGNvdW50O1xuICAgICAgcHJvY2Vzcy5lbWl0V2FybmluZyhlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvck1zZyk7XG5cbiAgICAgIGlmIChjb25zb2xlLnRyYWNlKXtcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBmYWxzZTtcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcbiAgfVxuICBFdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjsgLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgZm9yIGV4cG9ydGluZyBFdmVudEVtaXR0ZXIgcHJvcGVydHlcblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcbiAgICAgICAgdHJlZVtuYW1lXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtuYW1lXTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVyc107XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIXRyZWUuX2xpc3RlbmVycy53YXJuZWQgJiZcbiAgICAgICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCwgbmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gICAgICBpZiAoIXRoaXMuX2NvbmYpIHRoaXMuX2NvbmYgPSB7fTtcbiAgICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgICB9XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuLCBwcmVwZW5kKSB7XG4gICAgdGhpcy5fbWFueShldmVudCwgMSwgZm4sIHByZXBlbmQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIGZhbHNlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCB0cnVlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbiwgcHJlcGVuZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMuX29uKGV2ZW50LCBsaXN0ZW5lciwgcHJlcGVuZCk7XG5cbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2FsbC5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG5cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIC8vIG5lZWQgdG8gbWFrZSBjb3B5IG9mIGhhbmRsZXJzIGJlY2F1c2UgbGlzdCBjYW4gY2hhbmdlIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gb2YgZW1pdCBjYWxsXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0QXN5bmMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoW2ZhbHNlXSk7IH1cbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZXM9IFtdO1xuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGFyZ3VtZW50c1sxXSk7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25BbnkgPSBmdW5jdGlvbihmbiwgcHJlcGVuZCl7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgaWYocHJlcGVuZCl7XG4gICAgICB0aGlzLl9hbGwudW5zaGlmdChmbik7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9vbkFueSh0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGdyb3dMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBDaGFuZ2UgdG8gYXJyYXkuXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhZGRcbiAgICAgIGlmKHByZXBlbmQpe1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0udW5zaGlmdChsaXN0ZW5lcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCAmJlxuICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICkge1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCwgdHlwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyxsZWFmcz1bXTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgIGhhbmRsZXJzID0gbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgKGhhbmRsZXJzLmxpc3RlbmVyICYmIGhhbmRsZXJzLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290KSB7XG4gICAgICBpZiAocm9vdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocm9vdCk7XG4gICAgICBmb3IgKHZhciBpIGluIGtleXMpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBvYmogPSByb290W2tleV07XG4gICAgICAgIGlmICgob2JqIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKSB8fCAob2JqID09PSBudWxsKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgcm9vdFtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3QodGhpcy5saXN0ZW5lclRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKVxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbnNbaV0pO1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgIXRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9ldmVudHMpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiB0aGlzLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuX2FsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWxleGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0KGVsdCwgaHR0cCkge1xuXHRcdGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSlcblxuXHRcdC8vY29uc29sZS5sb2coJ2hhc2gnLCBoYXNoKVxuXHRcdGNvbnN0IHBhcmFtcyA9ICQkLnV0aWwucGFyc2VVcmxQYXJhbXMoaGFzaClcblx0XHQvL2NvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG5cdFx0aHR0cC5wb3N0KCcvYXBpL2FsZXhhL2F1dGgnLCBwYXJhbXMpLnRoZW4oKCkgPT4ge1xuXHRcdFx0d2luZG93LmNsb3NlKClcblx0XHR9KVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBUYWInLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBVcmw6ICdhYm91dDpibGFuaydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmM6IGFwcFVybH1cXFwiIGJuLWJpbmQ9XFxcImlmcmFtZVxcXCIgYm4tZXZlbnQ9XFxcImxvYWQ6IG9uRnJhbWVMb2FkZWRcXFwiPjwvaWZyYW1lPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXHRcdGNvbnN0IHthcHBVcmx9ID0gdGhpcy5wcm9wcztcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwVXJsXHRcdFx0XHRcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GcmFtZUxvYWRlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uRnJhbWVMb2FkZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BcHBFeGl0ID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwRXhpdCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcEV4aXQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gcm9vdFBhZ2Uub25BcHBFeGl0KClcblx0XHRcdH1cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVx0XHRcblx0XHR9XHRcblxuXHRcdHRoaXMub25BcHBTdXNwZW5kID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwU3VzcGVuZCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFN1c3BlbmQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMub25BcHBSZXN1bWUgPSBmdW5jdGlvbigpICB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBSZXN1bWUnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBSZXN1bWUgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFJlc3VtZSgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRBcHBVcmwgPSBmdW5jdGlvbihhcHBVcmwpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbYXBwVGFiXSBzZXRBcHBVcmwnLCBhcHBVcmwpXG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcFVybDogYXBwVXJsICsgJyZkYXRlPScgKyBEYXRlLm5vdygpfSlcblx0XHR9XG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBzOiBbXSxcblx0XHRzaG93QWN0aXZhdGVkOiBmYWxzZVxuXHR9LFxuXG5cdCRpZmFjZTogJ3NldERhdGEoZGF0YSknLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYXBwc1xcXCIgYm4taXRlcj1cXFwiYXBwXFxcIiBjbGFzcz1cXFwibWFpblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrXFxcIj5cdFx0XHRcXG5cdFx0PGRpdiBibi1hdHRyPVxcXCJjbGFzczFcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImFycm93LXJpZ2h0XFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuYXBwLnByb3BzLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLmFwcC5wcm9wcy50aXRsZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3Qge2FwcHMsIHNob3dBY3RpdmF0ZWR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzLFxuXHRcdFx0XHRzaG93QWN0aXZhdGVkLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zaG93QWN0aXZhdGVkICYmIHNjb3BlLmFwcC5hY3RpdmF0ZWRcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB7Y2xhc3M6IGB0aWxlIHczLWJ0biAke3Njb3BlLmFwcC5wcm9wcy5jb2xvckNsc31gfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIHNjb3BlLmFwcC5wcm9wcy5pY29uQ2xzID09ICdzdHJpbmcnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY2xpY2snLCBjdHJsLm1vZGVsLmFwcHNbaWR4XSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0YXBwczogZGF0YS5hcHBzLmZpbHRlcigoYSkgPT4gYS5wcm9wcy52aXNpYmxlICE9IGZhbHNlICYmIGEuYXBwTmFtZSAhPSAndGVtcGxhdGUnKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBzZXREYXRhKGRhdGEpYCxcblx0JGV2ZW50czogJ2FwcGNsaWNrJ1xufSk7XG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRzaG93U2VsZWN0aW9uOiBmYWxzZSxcblx0XHRzaG93RGVsZXRlQnV0dG9uOiBmYWxzZVxuXHR9LFx0XG5cblx0dGVtcGxhdGU6IFwiPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGNvbnRhY3RzPC9wPlxcbjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJjbGljay53My1iYXI6IG9uSXRlbUNsaWNrLCBjbGljay5kZWxldGU6IG9uRGVsZXRlSXRlbVxcXCJcXG5cdGJuLWVhY2g9XFxcImNvbnRhY3RzXFxcIlxcblx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHQ+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIiBibi1zaG93PVxcXCJzaG93RGVsZXRlQnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlciB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5jb250YWN0TmFtZVxcXCI+PC9zdHJvbmc+PGJyPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1lbnZlbG9wZSB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuY29udGFjdEVtYWlsXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XHRcXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7c2hvd1NlbGVjdGlvbiwgc2hvd0RlbGV0ZUJ1dHRvbn0gPSB0aGlzLnByb3BzXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y29udGFjdHM6IFtdLFxuXHRcdFx0XHRzaG93RGVsZXRlQnV0dG9uLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID09IDBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBjdHJsLm1vZGVsLmNvbnRhY3RzW2lkeF1cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQvLyQodGhpcykuc2libGluZ3MoJy53My1ibHVlJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS50b2dnbGVDbGFzcygndzMtYmx1ZScpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdjb250YWN0Y2xpY2snLCBkYXRhKVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkRlbGV0ZUl0ZW06IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRjb25zdCBpZHggPSAgJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gY3RybC5tb2RlbC5jb250YWN0c1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVsZXRlSXRlbScsIGRhdGEpXG5cdFx0XHRcdFx0dXNlcnMucmVtb3ZlQ29udGFjdChkYXRhLl9pZCkudGhlbihsb2FkKVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiBsb2FkKCkge1xuXHRcdFx0dXNlcnMuZ2V0Q29udGFjdHMoKS50aGVuKChjb250YWN0cykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnY29udGFjdHMnLCBjb250YWN0cylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtjb250YWN0c30pXG5cdFx0XHR9KVx0XG5cblx0XHR9XG5cblx0XHRsb2FkKClcblxuXHRcdHRoaXMudXBkYXRlID0gbG9hZFxuXG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnN0IHJldCA9IFtdXG5cdFx0XHRlbHQuZmluZCgnbGkudzMtYmx1ZScpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9ICAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0cmV0LnB1c2goY3RybC5tb2RlbC5jb250YWN0c1tpZHhdKVxuXHRcdFx0fSlcblx0XHRcdGNvbnNvbGUubG9nKCdyZXQnLCByZXQpXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdH1cbn0pO1xuXG5cblxuXG4iLCIoZnVuY3Rpb24oKXtcblxuZnVuY3Rpb24gZ2V0SWNvbkNsYXNzKG5hbWUpIHtcblx0aWYgKG5hbWUuZW5kc1dpdGgoJy5wZGYnKSkge1xuXHRcdHJldHVybiAnZmEtZmlsZS1wZGYnXG5cdH1cblx0aWYgKG5hbWUuZW5kc1dpdGgoJy5kb2MnKSkge1xuXHRcdHJldHVybiAnZmEtZmlsZS13b3JkJ1xuXHR9XG5cdGlmIChuYW1lLmVuZHNXaXRoKCcub2dnJykgfHwgbmFtZS5lbmRzV2l0aCgnLm1wMycpKSB7XG5cdFx0cmV0dXJuICdmYS1maWxlLWF1ZGlvJ1xuXHR9XG5cdGlmIChuYW1lLmVuZHNXaXRoKCcubXA0JykpIHtcblx0XHRyZXR1cm4gJ2ZhLWZpbGUtdmlkZW8nXG5cdH1cblx0cmV0dXJuICdmYS1maWxlJ1xufVxuXG5mdW5jdGlvbiBzb3J0RmlsZXMoZmlsZXMpIHtcblx0ZmlsZXMuc29ydCgoYSwgYikgPT4ge1xuXHQgIGlmIChhLmZvbGRlciAmJiAhYi5mb2xkZXIpIHtcblx0ICAgIHJldHVybiAtMVxuXHQgIH1cblx0ICBpZiAoIWEuZm9sZGVyICYmIGIuZm9sZGVyKSB7XG5cdCAgICByZXR1cm4gMVxuXHQgIH1cblx0ICByZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKVxuXHR9KVx0XHRcdFxufVxuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSwgXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsLFxuXHRcdHNob3dUb29sYmFyOiBmYWxzZSxcblx0XHRpbWFnZU9ubHk6IGZhbHNlLFxuXHRcdGZpbHRlckV4dGVuc2lvbjogdW5kZWZpbmVkLFxuXHRcdGZyaWVuZFVzZXI6ICcnXG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiXFxuPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCIgYm4tc2hvdz1cXFwic2hvd1Rvb2xiYXJcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRyb2xncm91cFxcXCI+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0dGl0bGU9XFxcIk5ldyBmb2xkZXJcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNyZWF0ZUZvbGRlclxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYXMgZmEtZm9sZGVyLXBsdXNcXFwiPjwvaT48L2J1dHRvbj5cdFx0XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0dGl0bGU9XFxcIkltcG9ydCBmaWxlXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25JbXBvcnRGaWxlXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXVwbG9hZFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cXG5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRyb2xncm91cFxcXCI+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0dGl0bGU9XFxcIlRvZ2dsZSBTZWxlY3Rpb25cXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2xlU2VsZWN0aW9uXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLWNoZWNrXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0dGl0bGU9XFxcIlJlbG9hZFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUmVsb2FkXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXN5bmMtYWx0XFxcIj48L2k+PC9idXR0b24+XHRcXG5cdDwvZGl2Plxcblxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRyb2xncm91cFxcXCI+XFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkRlbGV0ZVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRGVsZXRlRmlsZXNcXFwiXFxuXHRcdFx0Ym4tcHJvcD1cXFwicHJvcDFcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQ3V0XFxcIlxcblx0XHRcdGJuLXByb3A9XFxcInByb3AxXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DdXRGaWxlc1xcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jdXRcXFwiPjwvaT48L2J1dHRvbj5cdFxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJDb3B5XFxcIlxcblx0XHRcdGJuLXByb3A9XFxcInByb3AxXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Db3B5RmlsZXNcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jb3B5XFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIlNoYXJlXFxcIlxcblx0XHRcdGJuLXByb3A9XFxcInByb3AyXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZUZpbGVzXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0XFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIlBhc3RlXFxcIlxcblx0XHRcdGJuLXByb3A9XFxcInByb3AzXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25QYXN0ZUZpbGVzXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXBhc3RlXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwicGF0aFBhbmVsXFxcIiBibi1ldmVudD1cXFwiY2xpY2sucGF0aEl0ZW06IG9uUGF0aEl0ZW1cXFwiPlxcblx0PGRpdj5QYXRoOjwvZGl2Plxcblx0PGRpdiBibi1lYWNoPVxcXCJnZXRQYXRoXFxcIiBibi1pbmRleD1cXFwiaWR4XFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLWNoZXZyb24tcmlnaHRcXFwiIGJuLXNob3c9XFxcIiFpc0ZpcnN0XFxcIj48L2k+XFxuXHRcdDxzcGFuPlxcblx0XHRcdDxhIGNsYXNzPVxcXCJwYXRoSXRlbVxcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBocmVmPVxcXCIjXFxcIiBibi1zaG93PVxcXCIhaXNMYXN0XFxcIiBibi1kYXRhPVxcXCJ7aW5mbzogZ2V0UGF0aEluZm99XFxcIj48L2E+XHRcXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGJuLXNob3c9XFxcImlzTGFzdFxcXCI+PC9zcGFuPlx0XFxuXHRcdFx0XFxuXHRcdDwvc3Bhbj5cXG5cdDwvZGl2Plxcblxcblx0XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblxcblx0PGRpdiBibi1lYWNoPVxcXCJmaWxlc1xcXCIgXFxuXHRcdGJuLWl0ZXI9XFxcImZcXFwiIFxcblx0XHRjbGFzcz1cXFwiY29udGFpbmVyXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2suZm9sZGVyOiBvbkZvbGRlckNsaWNrLCBjbGljay5jaGVjazogb25DaGVja0NsaWNrLCBjbGljay5maWxlOiBvbkZpbGVDbGljaywgY29udGV4dG1lbnVjaGFuZ2UudGh1bWJuYWlsOiBvbkNvbnRleHRNZW51XFxcIj5cXG5cdFx0XFxuXHRcdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbCB3My1jYXJkLTJcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcImRhdGExXFxcIj5cdFxcblxcblx0XHRcdFx0PHNwYW4gYm4taWY9XFxcImlmMVxcXCI+XFxuXHRcdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tc2hvdz1cXFwic2hvd1Rvb2xiYXJcXFwiIGNsYXNzPVxcXCJjaGVjayB3My1jaGVja1xcXCI+XHRcdFx0XHRcdFx0XFxuXHRcdFx0XHQ8L3NwYW4+XFxuXHRcdFx0XHQ8ZGl2IGJuLWlmPVxcXCIkc2NvcGUuZi5mb2xkZXJcXFwiIGNsYXNzPVxcXCJmb2xkZXIgaXRlbVxcXCI+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS00eCBmYS1mb2xkZXItb3BlbiB3My10ZXh0LWJsdWUtZ3JleVxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XHRcdFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiIGJuLWlmPVxcXCJpZjFcXFwiPjwvc3Bhbj5cdFx0XHRcdFx0XHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PGRpdiBcXG5cdFx0XHRcdFx0Ym4taWY9XFxcImlmMlxcXCIgIFxcblx0XHRcdFx0XHRjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIlxcblx0XHRcdFx0XHQ+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2xhc3MxfVxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlx0XHRcdFx0XHRcdFx0XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlx0XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PC9kaXY+XHRcdFx0XFxuXFxuXHRcdFx0XHQ8ZGl2IFxcblx0XHRcdFx0XHRibi1pZj1cXFwiaWYzXFxcIiAgXFxuXHRcdFx0XHRcdGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiXFxuXHRcdFx0XHRcdD5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiAkc2NvcGUuZi50aHVtYm5haWxVcmx9XFxcIj5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XHRcdFx0XHRcdFx0XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGltZW5zaW9uXFxcIj48L3NwYW4+XHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plx0XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXHRcXG5cXG48L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCB0aHVtYm5haWxTaXplID0gJzEwMHg/J1xuXHRcdGNvbnN0IG1heFVwbG9hZFNpemUgPSAyKjEwMjQqMjAxNCAvLyAyIE1vXG5cblx0XHRsZXQgc2VsZWN0ZWQgPSBmYWxzZVxuXG5cdFx0bGV0IHtcblx0XHRcdHNob3dUb29sYmFyLFxuXHRcdFx0ZmlsdGVyRXh0ZW5zaW9uLFxuXHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdGltYWdlT25seVxuXHRcdH0gPSB0aGlzLnByb3BzXG5cblx0XHRpZiAoZnJpZW5kVXNlciAhPSAnJykge1xuXHRcdFx0c2hvd1Rvb2xiYXIgPSBmYWxzZVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlbEZpbGVzKCkge1xuXHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBbXVxuXHRcdFx0ZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXHRcdFx0XHRcblx0XHRcdFx0c2VsRmlsZXMucHVzaChjdHJsLm1vZGVsLnJvb3REaXIgKyBpbmZvLm5hbWUpXG5cdFx0XHR9KVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsRmlsZXMnLCBzZWxGaWxlcylcdFxuXHRcdFx0cmV0dXJuIHNlbEZpbGVzXHRcdFxuXHRcdH1cblxuXG5cdFx0ZnVuY3Rpb24gZ2V0TmJTZWxGaWxlcygpIHtcblx0XHRcdHJldHVybiBlbHQuZmluZCgnLmNoZWNrOmNoZWNrZWQnKS5sZW5ndGhcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0b2dnbGVTZWxlY3Rpb24oKSB7XG5cdFx0XHRzZWxlY3RlZCA9ICFzZWxlY3RlZFxuXHRcdFx0ZWx0LmZpbmQoJy5jaGVjaycpLnByb3AoJ2NoZWNrZWQnLCBzZWxlY3RlZClcblx0XHR9XHRcdFxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHNob3dUb29sYmFyLFxuXHRcdFx0XHRyb290RGlyOiAnLycsXG5cdFx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdFx0c2VsZWN0ZWRGaWxlczogW10sXG5cdFx0XHRcdG9wZXJhdGlvbjogJ25vbmUnLFxuXHRcdFx0XHRuYlNlbGVjdGlvbjogMCxcblx0XHRcdFx0aXNTaGFyZVNlbGVjdGVkOiBmYWxzZSxcblx0XHRcdFx0Z2V0UGF0aDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgdGFiID0gKCcvaG9tZScgKyB0aGlzLnJvb3REaXIpLnNwbGl0KCcvJylcblx0XHRcdFx0XHR0YWIuc2hpZnQoKVxuXHRcdFx0XHRcdHRhYi5wb3AoKVxuXHRcdFx0XHRcdHJldHVybiB0YWJcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNMYXN0OiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gdGhpcy5nZXRQYXRoKCkubGVuZ3RoLTFcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNGaXJzdDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0UGF0aEluZm86IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0UGF0aCgpLnNsaWNlKDEsIHNjb3BlLmlkeCsxKS5qb2luKCcvJylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRkYXRhMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2l0ZW1zOiBzY29wZS5mLml0ZW1zIHx8IHt9fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmYubmFtZSAhPSAnLi4nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmICFzY29wZS5mLmlzSW1hZ2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0aWYzOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAhc2NvcGUuZi5mb2xkZXIgJiYgc2NvcGUuZi5pc0ltYWdlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gYGZhIGZhLTR4IHczLXRleHQtYmx1ZS1ncmV5ICR7Z2V0SWNvbkNsYXNzKHNjb3BlLmYubmFtZSl9YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGxldCBzaXplID0gc2NvcGUuZi5zaXplXG5cdFx0XHRcdFx0bGV0IHVuaXQgPSAnb2N0ZXRzJ1xuXHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0dW5pdCA9ICdLbydcblx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNpemUgPSBNYXRoLmZsb29yKHNpemUqMTApLzEwXG5cdFx0XHRcdFx0cmV0dXJuICdTaXplOiAnICsgc2l6ZSArICcgJyArIHVuaXRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRnZXREaW1lbnNpb246IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3QgZCA9IHNjb3BlLmYuZGltZW5zaW9uXG5cdFx0XHRcdFx0cmV0dXJuIGBEaW1lbnNpb246ICR7ZC53aWR0aH14JHtkLmhlaWdodH1gXG5cdFx0XHRcdH0sXG5cblxuXHRcdFx0XHRnZXREYXRlOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShzY29wZS5mLm10aW1lKS50b0xvY2FsZURhdGVTdHJpbmcoKVxuXHRcdFx0XHRcdHJldHVybiAnTGFzdCBNb2RpZjogJyArIGRhdGVcblxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHByb3AxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2Rpc2FibGVkOiB0aGlzLm5iU2VsZWN0aW9uID09IDB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHByb3AyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2Rpc2FibGVkOiB0aGlzLm5iU2VsZWN0aW9uID09IDAgfHwgdGhpcy5yb290RGlyLnN0YXJ0c1dpdGgoJy9zaGFyZS8nKSB8fCB0aGlzLmlzU2hhcmVTZWxlY3RlZH1cblx0XHRcdFx0fSxcblx0XHRcdFx0cHJvcDM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB7ZGlzYWJsZWQ6ICB0aGlzLnNlbGVjdGVkRmlsZXMubGVuZ3RoID09IDB9XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblBhdGhJdGVtOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IHBhdGhJdGVtID0gJCh0aGlzKS5kYXRhKCdpbmZvJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25QYXRoSXRlbScsIHBhdGhJdGVtKVxuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblxuXHRcdFx0XHRcdGxvYWREYXRhKHBhdGhJdGVtID09ICcnID8gJy8nIDogJy8nICsgcGF0aEl0ZW0gKyAnLycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVsb2FkOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkNvbnRleHRNZW51OiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXHRcdFx0XHRcdGNvbnN0IHtjbWR9ID0gZGF0YVxuXG5cdFx0XHRcdFx0Y29uc3Qge3Jvb3REaXJ9ID0gY3RybC5tb2RlbFxuXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnZG93bmxvYWQnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBzcnZGaWxlcy5maWxlVXJsKHJvb3REaXIgKyBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0XHQkJC51dGlsLmRvd25sb2FkVXJsKHVybCwgaW5mby5uYW1lKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ3JlbmFtZScpIHtcblx0XHRcdFx0XHRcdGNvbnN0IG9sZEZpbGVOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHtsYWJlbDogJ05ldyBuYW1lJywgdGl0bGU6ICdSZW5hbWUnLCB2YWx1ZTogb2xkRmlsZU5hbWV9LCBmdW5jdGlvbihuZXdGaWxlTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnbmV3RmlsZU5hbWUnLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0XHRcdFx0aWYgKG5ld0ZpbGVOYW1lICE9IG9sZEZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0c3J2RmlsZXMucmVuYW1lRmlsZShyb290RGlyLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ21ha2VSZXNpemVkQ29weScpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0XHRsYWJlbDogJ1Jlc2NhbGUgcGVyY2VudGFnZTonLCBcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdNYWtlIHJlc2l6ZWQgY29weScsXG5cdFx0XHRcdFx0XHRcdGF0dHJzOiB7bWluOiAxMCwgbWF4OiA5MCwgdHlwZTogJ251bWJlcid9LFxuXHRcdFx0XHRcdFx0XHR2YWx1ZTogNTBcblx0XHRcdFx0XHRcdH0sIGZ1bmN0aW9uKHBlcmNlbnRhZ2UpIHtcblx0XHRcdFx0XHRcdFx0c3J2RmlsZXMucmVzaXplSW1hZ2Uocm9vdERpciwgaW5mby5uYW1lLCBwZXJjZW50YWdlKyclJylcblx0XHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2NvbnZlcnRUb01QMycpIHtcblx0XHRcdFx0XHRcdHNydkZpbGVzLmNvbnZlcnRUb01QMyhyb290RGlyLCBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnZGVsZXRlJykge1xuXHRcdFx0XHRcdFx0ZGVsZXRlRmlsZXMoW3Jvb3REaXIgKyBpbmZvLm5hbWVdKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRcdFx0ZmlsZU5hbWU6IGluZm8ubmFtZSxcblx0XHRcdFx0XHRcdHJvb3REaXI6IGN0cmwubW9kZWwucm9vdERpciwgICAgICAgICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRcdFx0aXNJbWFnZTogaW5mby5pc0ltYWdlXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjbGljaycsIGRhdGEpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2hlY2tDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblxuXHRcdFx0XHRcdGlmIChpbmZvLm5hbWUgPT0gJ3NoYXJlJyAmJiBjdHJsLm1vZGVsLnJvb3REaXIgPT0gJy8nKSB7XG5cdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmlzU2hhcmVTZWxlY3RlZCA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7bmJTZWxlY3Rpb246IGdldE5iU2VsRmlsZXMoKX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRm9sZGVyQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblxuXHRcdFx0XHRcdGNvbnN0IGRpck5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZvbGRlckNsaWNrJywgZGlyTmFtZSlcblx0XHRcdFx0XHRpZiAoZGlyTmFtZSA9PSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBzcGxpdCA9IGN0cmwubW9kZWwucm9vdERpci5zcGxpdCgnLycpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRzcGxpdC5wb3AoKVxuXHRcdFx0XHRcdFx0c3BsaXQucG9wKClcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGxvYWREYXRhKHNwbGl0LmpvaW4oJy8nKSArICcvJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRsb2FkRGF0YShjdHJsLm1vZGVsLnJvb3REaXIgKyBkaXJOYW1lICsgJy8nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DcmVhdGVGb2xkZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciByb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHRjb250ZW50OiAnRm9sZGVyIG5hbWU6JywgXG5cdFx0XHRcdFx0XHR0aXRsZTogJ05ldyBGb2xkZXInXG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oZm9sZGVyTmFtZSkge1xuXHRcdFx0XHRcdFx0c3J2RmlsZXMubWtkaXIocm9vdERpciArIGZvbGRlck5hbWUpXG5cdFx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVG9nbGVTZWxlY3Rpb246IGZ1bmN0aW9uKClcdHtcblx0XHRcdFx0XHR0b2dnbGVTZWxlY3Rpb24oKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7bmJTZWxlY3Rpb246IGdldE5iU2VsRmlsZXMoKX0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25EZWxldGVGaWxlczogZnVuY3Rpb24oZXYpIHtcblxuXHRcdFx0XHRcdGNvbnN0IHNlbEZpbGVzID0gZ2V0U2VsRmlsZXMoKVxuXG5cdFx0XHRcdFx0aWYgKHNlbEZpbGVzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcycsXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBmaWxlcyBzZWxlY3RlZCdcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkZWxldGVGaWxlcyhzZWxGaWxlcylcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkN1dEZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkN1dEZpbGVzJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlczogZ2V0U2VsRmlsZXMoKSxcblx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2N1dCdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uQ29weUZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNvcHlGaWxlcycpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCksXG5cdFx0XHRcdFx0XHRvcGVyYXRpb246ICdjb3B5J1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25TaGFyZUZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNoYXJlRmlsZXMnKVxuXHRcdFx0XHRcdHNydkZpbGVzLnNoYXJlRmlsZXMoZ2V0U2VsRmlsZXMoKSlcblx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3NlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJ30pXG5cdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Ly9jdHJsLnNldERhdGEoe3NlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJ30pXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblBhc3RlRmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUGFzdGVGaWxlcycpXG5cdFx0XHRcdFx0Y29uc3Qge3Jvb3REaXIsIHNlbGVjdGVkRmlsZXMsIG9wZXJhdGlvbn0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y29uc3QgcHJvbWlzZSA9IFxuXHRcdFx0XHRcdFx0KG9wZXJhdGlvbiA9PSAnY29weScpID8gc3J2RmlsZXMuY29weUZpbGVzKHNlbGVjdGVkRmlsZXMsIHJvb3REaXIpIDogc3J2RmlsZXMubW92ZUZpbGVzKHNlbGVjdGVkRmlsZXMsIHJvb3REaXIpXG5cblx0XHRcdFx0XHRwcm9taXNlXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW1wb3J0RmlsZTogZnVuY3Rpb24oZXYpIHtcblxuXHRcdFx0XHRcdCQkLnV0aWwub3BlbkZpbGVEaWFsb2coZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZVNpemUnLCBmaWxlLnNpemUgLyAxMDI0KVxuXHRcdFx0XHRcdFx0aWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZFNpemUpIHtcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtjb250ZW50OiAnRmlsZSB0b28gYmlnJywgdGl0bGU6ICdJbXBvcnQgZmlsZSd9KVxuXHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQkLnV0aWwucmVhZEZpbGUoZmlsZSkudGhlbigoYmxvYikgPT4ge1xuXHRcdFx0XHRcdFx0XHRzcnZGaWxlcy51cGxvYWRGaWxlKGJsb2IsIGZpbGUubmFtZSwgY3RybC5tb2RlbC5yb290RGlyKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCwgdGl0bGU6ICdFcnJvcid9KVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBkZWxldGVGaWxlcyhmaWxlTmFtZXMpIHtcblx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0Y29udGVudDogJ0FyZSB5b3Ugc3VyZSA/Jyxcblx0XHRcdFx0dGl0bGU6ICdEZWxldGUgZmlsZXMnXG5cdFx0XHR9LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c3J2RmlsZXMucmVtb3ZlRmlsZXMoZmlsZU5hbWVzKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0fSlcblx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGxvYWREYXRhKHJvb3REaXIpIHtcblx0XHRcdGlmIChyb290RGlyID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZERhdGEnLCByb290RGlyKVxuXHRcdFx0c3J2RmlsZXMubGlzdChyb290RGlyLCB7ZmlsdGVyRXh0ZW5zaW9uLCBpbWFnZU9ubHl9LCBmcmllbmRVc2VyKS50aGVuKGZ1bmN0aW9uKGZpbGVzKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHRcdGZpbGVzLmZvckVhY2goKGYpID0+IHtcblx0XHRcdFx0XHRpZiAoZi5pc0ltYWdlKSB7XG5cdFx0XHRcdFx0XHRmLnRodW1ibmFpbFVybCA9IHNydkZpbGVzLmZpbGVUaHVtYm5haWxVcmwocm9vdERpciArIGYubmFtZSwgdGh1bWJuYWlsU2l6ZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHNob3dUb29sYmFyKSB7XG5cdFx0XHRcdFx0XHRmLml0ZW1zID0ge1xuXHRcdFx0XHRcdFx0XHRkZWxldGU6IHtuYW1lOiAnRGVsZXRlJywgaWNvbjogJ2ZhcyBmYS10cmFzaCd9LFxuXHRcdFx0XHRcdFx0XHRyZW5hbWU6IHtuYW1lOiAnUmVuYW1lJ31cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChmLmlzSW1hZ2UpIHtcblx0XHRcdFx0XHRcdFx0Zi5pdGVtcy5tYWtlUmVzaXplZENvcHkgPSB7bmFtZTogJ01ha2UgcmVzaXplZCBjb3B5JywgaWNvbjogJ2ZhcyBmYS1jb21wcmVzcy1hcnJvd3MtYWx0J31cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICghZi5mb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0Zi5pdGVtcy5kb3dubG9hZCA9IHtuYW1lOiAnRG93bmxvYWQnLCBpY29uOiAnZmFzIGZhLWRvd25sb2FkJ31cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChmLm5hbWUuZW5kc1dpdGgoJy5tcDQnKSkge1xuXHRcdFx0XHRcdFx0XHRmLml0ZW1zLmNvbnZlcnRUb01QMyA9IHtuYW1lOiAnQ29udmVydCB0byBNUDMnfVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0XG5cdFx0XHRcdGlmIChyb290RGlyICE9ICcvJykge1xuXHRcdFx0XHRcdGZpbGVzLnVuc2hpZnQoe25hbWU6ICcuLicsIGZvbGRlcjogdHJ1ZX0pXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzb3J0RmlsZXMoZmlsZXMpXG5cblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRmaWxlcywgXG5cdFx0XHRcdFx0cm9vdERpciwgXG5cdFx0XHRcdFx0bmJTZWxlY3Rpb246IDAsXG5cdFx0XHRcdFx0aXNTaGFyZVNlbGVjdGVkOiBmYWxzZVxuXHRcdFx0XHR9KVxuXG5cdFx0XHR9KVx0XHRcblx0XHR9XG5cblx0XHRsb2FkRGF0YSgpXG5cblx0XHR0aGlzLmdldEZpbGVzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5maWxlcy5maWx0ZXIoKGYpID0+ICFmLmZvbGRlcilcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlQ3RybF0gdXBkYXRlJylcblx0XHRcdGxvYWREYXRhKClcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiAndXBkYXRlKCknLFxuXHQkZXZlbnRzOiAnZmlsZWNsaWNrJ1xuXG59KTtcblxufSkoKTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5mcmllbmRzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0c2hvd1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0c2hvd1NlbmRNZXNzYWdlOiBmYWxzZSxcblx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiB0cnVlXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1lYWNoPVxcXCJmcmllbmRzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLm5vdGlmOiBvblNlbmRNZXNzYWdlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1xcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgbm90aWYgdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTWVzc2FnZVxcXCIgYm4tc2hvdz1cXFwic2hvd1NlbmRNZXNzYWdlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGVcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCIgYm4tY2xhc3M9XFxcImNsYXNzMVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5mcmllbmRVc2VyTmFtZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFxcbjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBmcmllbmRzPC9wPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIGJyb2tlcikge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dTZW5kTWVzc2FnZSwgc2hvd0Nvbm5lY3Rpb25TdGF0ZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdLFxuXHRcdFx0XHRzaG93U2VuZE1lc3NhZ2UsXG5cdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZyaWVuZHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0ICRpID0gc2NvcGUuJGlcblx0XHRcdFx0XHRjb25zdCBzaG93Q29ubmVjdGlvblN0YXRlID0gdGhpcy5zaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdCd3My10ZXh0LWdyZWVuJzogJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LXJlZCc6ICEkaS5pc0Nvbm5lY3RlZCAmJiBzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRcdFx0J3czLXRleHQtYmx1ZSc6ICFzaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgdXNlck5hbWUgPSAgY3RybC5tb2RlbC5mcmllbmRzW2lkeF0uZnJpZW5kVXNlck5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZnJpZW5kY2xpY2snLCB7dXNlck5hbWV9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNlbmRNZXNzYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZW5kTWVzc2FnZScsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnU2VuZCBNZXNzYWdlJywgbGFiZWw6ICdNZXNzYWdlOid9LCBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHRcdFx0XHR1c2Vycy5zZW5kTm90aWYodXNlck5hbWUsIHt0ZXh0LCByZXBseTogdHJ1ZX0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdGZ1bmN0aW9uIG9uVXBkYXRlKG1zZykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3Qge2lzQ29ubmVjdGVkLCB1c2VyTmFtZX0gPSBtc2cuZGF0YVxuXHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZnJpZW5kcy5maW5kKChmcmllbmQpID0+IHtyZXR1cm4gZnJpZW5kLmZyaWVuZFVzZXJOYW1lID09IHVzZXJOYW1lfSlcblx0XHRcdGluZm8uaXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZFxuXHRcdFx0Y3RybC51cGRhdGUoKVxuXG5cdFx0fVxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIG9uVXBkYXRlKVxuXG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnN0IGlkeCA9IGVsdC5maW5kKCdsaS53My1ibHVlJykuaW5kZXgoKTtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XVxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0RnJpZW5kcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZnJpZW5kcy5tYXAoKGZyaWVuZCkgPT4gZnJpZW5kLmZyaWVuZFVzZXJOYW1lKVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR1c2Vycy5nZXRGcmllbmRzKCkudGhlbigoZnJpZW5kcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZnJpZW5kcycsIGZyaWVuZHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZnJpZW5kc30pXG5cdFx0XHR9KVx0XHRcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2ZyaWVuZHNdIGRpc3Bvc2UnKVxuXHRcdFx0YnJva2VyLnVucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblx0XHR9XG5cblxuXHRcdHRoaXMudXBkYXRlKClcblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldFNlbGVjdGlvbigpOnN0cmluZztcblx0XHRnZXRGcmllbmRzKCk6W3N0cmluZ11cblx0YCxcblxuXHQkZXZlbnRzOiAnZnJpZW5kY2xpY2snXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZyaWVuZHNQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuZnJpZW5kc1xcXCIgXFxuXHRkYXRhLXNob3ctc2VsZWN0aW9uPVxcXCJ0cnVlXFxcIlxcblx0Ym4taWZhY2U9XFxcImZyaWVuZHNcXFwiXFxuXHQ+PC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRidXR0b25zOiBbXG5cdFx0e25hbWU6ICdjYWxsJywgaWNvbjogJ2ZhIGZhLWNoZWNrJ31cblx0XSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdClcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdGNvbnN0IHNlbGVjdGlvbiA9IGN0cmwuc2NvcGUuZnJpZW5kcy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0aWYgKHNlbGVjdGlvbiA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSBmcmllbmQnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCB7ZnJpZW5kVXNlck5hbWUsIGlzQ29ubmVjdGVkfSA9IHNlbGVjdGlvblxuXHRcdFx0Y29uc29sZS5sb2coJ3VzZXJOYW1lJywgZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRpZiAoIWlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsIFxuXHRcdFx0XHRcdGNvbnRlbnQ6IGBVc2VyIDxzdHJvbmc+JHtmcmllbmRVc2VyTmFtZX08L3N0cm9uZz4gaXMgbm90IGNvbm5lY3RlZGBcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQkcGFnZXIucG9wUGFnZShmcmllbmRVc2VyTmFtZSlcblx0XHRcdH1cblx0XHR9XG5cdH1cblxufSkiLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaG9tZScsIHtcblxuXHRkZXBzOiBbXG5cdFx0J2JyZWl6Ym90LmJyb2tlcicsXG5cdFx0J2JyZWl6Ym90LnVzZXJzJyxcblx0XHQnYnJlaXpib3QucnRjJyxcblx0XHQnYnJlaXpib3QuYXBwcycsXG5cdFx0J2JyZWl6Ym90LnNjaGVkdWxlcidcblx0XSxcblxuXHRwcm9wczoge1xuXHRcdHVzZXJOYW1lOiAnVW5rbm93bidcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJoZWFkZXIgdzMtdGVhbFxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRnVsbFNjcmVlblxcXCIgYm4tc2hvdz1cXFwiIWZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQ29ubmVjdGlvbiBTdGF0dXNcXFwiPlxcblx0XHRcdDxpIGJuLWNsYXNzPVxcXCJ7dzMtdGV4dC1ncmVlbjogY29ubmVjdGVkLCB3My10ZXh0LXJlZDogIWNvbm5lY3RlZH1cXFwiIGNsYXNzPVxcXCJmYSBmYS1jaXJjbGVcXFwiPjwvaT5cXG5cdFx0XHRcXG5cdFx0PC9idXR0b24+XHRcdFx0XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzSW5jb21pbmdDYWxsXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25DYWxsUmVzcG9uc2VcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJywgXFxuXHRcdFx0XHR0aXRsZTogY2FsbEluZm8uZnJvbSxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGFjY2VwdDoge25hbWU6IFxcJ0FjY2VwdFxcJ30sXFxuXHRcdFx0XHRcdGRlbnk6IHtuYW1lOiBcXCdEZWNsaW5lXFwnfSxcXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjYWxsSW5mby5pY29uQ2xzfVxcXCI+PC9pPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcblxcblxcbjwhLS0gXHQ8c3Ryb25nIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3N0cm9uZz5cXG4gLS0+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZmljYXRpb24gdzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiTm90aWZpY2F0aW9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtYmVsbCB3My10ZXh0LXdoaXRlXFxcIiA+PC9pPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1iYWRnZSB3My1yZWQgdzMtdGlueVxcXCIgYm4tdGV4dD1cXFwibmJOb3RpZlxcXCIgYm4tc2hvdz1cXFwiaGFzTm90aWZcXFwiPjwvc3Bhbj5cdFx0XHRcXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0cHdkOiB7bmFtZTogXFwnQ2hhbmdlIHBhc3N3b3JkXFwnLCBpY29uOiBcXCdmYXMgZmEtbG9ja1xcJ30sXFxuXHRcdFx0XHRcdGFwcHM6IHtuYW1lOiBcXCdBcHBsaWNhdGlvbnNcXCcsIGljb246IFxcJ2ZhcyBmYS10aFxcJ30sXFxuXHRcdFx0XHRcdHNlcDogXFwnLS0tLS0tXFwnLFxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiBcXCdMb2dvdXRcXCcsIGljb246IFxcJ2ZhcyBmYS1wb3dlci1vZmZcXCd9XFxuXHRcdFx0XHR9LFxcblx0XHRcdFx0dGl0bGU6IHVzZXJOYW1lLFxcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJ1xcblx0XHRcdH1cXFwiIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlciBmYS1sZ1xcXCI+PC9pPlxcbjwhLS0gXHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ1c2VyTmFtZVxcXCI+PC9zcGFuPlx0XFxuIC0tPlx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd24gZmEtbGdcXFwiPjwvaT5cXG4gICAgXHRcXG5cdFx0PC9kaXY+XFxuXHRcdFxcblx0PC9kaXY+XFxuXFxuXHRcXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMudGFic1xcXCIgXFxuXHRjbGFzcz1cXFwiY29udGVudFxcXCIgXFxuXHRibi1pZmFjZT1cXFwidGFic1xcXCIgXFxuXHRibi1ldmVudD1cXFwidGFic3JlbW92ZTogb25UYWJSZW1vdmUsIHRhYnNhY3RpdmF0ZTogb25UYWJBY3RpdmF0ZVxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmFwcHNcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7YXBwczogZ2V0TXlBcHBzfVxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImFwcGNsaWNrOiBvbkFwcENsaWNrXFxcIlxcblx0XHR0aXRsZT1cXFwiSG9tZVxcXCIgXFxuXHRcdD5cdFx0XFxuXHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgYnJva2VyLCB1c2VycywgcnRjLCBzcnZBcHBzLCBzY2hlZHVsZXIpIHtcblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZUF1ZGlvKCkge1xuXHRcdFx0bGV0IGF1ZGlvID0gbnVsbFxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0cGxheTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gcGxheScpXG5cdFx0XHRcdFx0YXVkaW8gPSBuZXcgQXVkaW8oJy9hc3NldHMvc2t5cGUubXAzJylcblx0XHRcdFx0XHRhdWRpby5sb29wID0gdHJ1ZVx0XG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7YXVkaW8ucGxheSgpfSwgMTAwKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHN0b3A6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2F1ZGlvIHN0b3AnKVxuXHRcdFx0XHRcdGlmIChhdWRpbyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRhdWRpby5wYXVzZSgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGF1ZGlvID0gbnVsbFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cnRjLnByb2Nlc3NDYWxsKClcblx0XHRcblx0XHRydGMub24oJ2NhbGwnLCBmdW5jdGlvbihjYWxsSW5mbykge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtoYXNJbmNvbWluZ0NhbGw6IHRydWUsIGNhbGxJbmZvfSlcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRydGMub24oJ2NhbmNlbCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtoYXNJbmNvbWluZ0NhbGw6IGZhbHNlfSlcblx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdH0pXHRcdFxuXG5cdFx0Y29uc3Qge3VzZXJOYW1lfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGF1ZGlvID0gY3JlYXRlQXVkaW8oKVxuXHRcblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcHM6IFtdLFxuXHRcdFx0XHR1c2VyTmFtZSxcblx0XHRcdFx0bmJOb3RpZjogMCxcblx0XHRcdFx0aGFzSW5jb21pbmdDYWxsOiBmYWxzZSxcblx0XHRcdFx0Y2FsbEluZm86IG51bGwsXG5cdFx0XHRcdGZ1bGxTY3JlZW46IGZhbHNlLFxuXHRcdFx0XHRjb25uZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRoYXNOb3RpZjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubmJOb3RpZiA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0TXlBcHBzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5hcHBzLmZpbHRlcigoYSkgPT4gYS5hY3RpdmF0ZWQpXG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFwcENsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFwcENsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRvcGVuQXBwKGRhdGEuYXBwTmFtZSlcblxuXHRcdFx0XHR9LFx0XHRcdFx0XG5cdFx0XHRcdG9uQ29udGV4dE1lbnU6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnbG9nb3V0Jykge1xuXHRcdFx0XHRcdFx0bG9nb3V0KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhcHBzJykge1xuXHRcdFx0XHRcdFx0b3BlbkFwcCgnc3RvcmUnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ3B3ZCcpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnQ2hhbmdlIFBhc3N3b3JkJywgbGFiZWw6ICdOZXcgUGFzc3dvcmQ6J30sIGZ1bmN0aW9uKG5ld1B3ZCkge1xuXHRcdFx0XHRcdFx0XHR1c2Vycy5jaGFuZ2VQd2QobmV3UHdkKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnQ2hhbmdlIFBhc3N3b3JkJywgY29udGVudDogJ1Bhc3N3b3JkIGhhcyBiZWVuIGNoYW5nZWQnfSlcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6ICdubyBub3RpZmljYXRpb25zJywgdGl0bGU6ICdOb3RpZmljYXRpb25zJ30pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0b3BlbkFwcCgnbm90aWYnKVxuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FsbFJlc3BvbnNlOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IHtjbWR9ID0gZGF0YVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNhbGxSZXNwb25zZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtoYXNJbmNvbWluZ0NhbGw6IGZhbHNlfSlcblx0XHRcdFx0XHRhdWRpby5zdG9wKClcblx0XHRcdFx0XHRpZiAoY21kID09ICdhY2NlcHQnKSB7XHRcblx0XHRcdFx0XHRcdGNvbnN0IHtmcm9tLCBhcHBOYW1lfSA9IGN0cmwubW9kZWwuY2FsbEluZm9cblx0XHRcdFx0XHRcdG9wZW5BcHAoYXBwTmFtZSwge1xuXHRcdFx0XHRcdFx0XHRjYWxsZXI6IGZyb20sXG5cdFx0XHRcdFx0XHRcdGNsaWVudElkOiBydGMuZ2V0UmVtb3RlQ2xpZW50SWQoKVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbnknKSB7XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRydGMuZGVueSgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRnVsbFNjcmVlbjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25GdWxsU2NyZWVuJylcblx0XHRcdFx0XHRjb25zdCBlbGVtID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG5cdFx0XHRcdFx0Y29uc3QgcmVxdWVzdEZ1bGxzY3JlZW4gPSBlbGVtLnJlcXVlc3RGdWxsc2NyZWVuIHx8XG5cdFx0XHRcdFx0XHRlbGVtLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuXG5cblx0XHRcdFx0XHRpZiAocmVxdWVzdEZ1bGxzY3JlZW4pIHtcblx0XHRcdFx0XHRcdHJlcXVlc3RGdWxsc2NyZWVuLmNhbGwoZWxlbSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiUmVtb3ZlOiBmdW5jdGlvbihldiwgaWR4KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVGFiUmVtb3ZlJywgaWR4KVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLnNjb3BlLnRhYnMuZ2V0VGFiSW5mbyhpZHgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwRXhpdCgpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS50YWJzLnJlbW92ZVRhYihpZHgpXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiQWN0aXZhdGU6IGZ1bmN0aW9uKGV2LCB1aSkge1x0XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVGFiQWN0aXZhdGUnKVxuXHRcdFx0XHRcdGNvbnN0IHtuZXdUYWIsIG9sZFRhYn0gPSB1aVxuXHRcdFx0XHRcdGNvbnN0IG5ld1RhYklkeCA9IG5ld1RhYi5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qgb2xkVGFiSWR4ID0gb2xkVGFiLmluZGV4KClcblx0XHRcdFx0XHRpZiAob2xkVGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKG9sZFRhYklkeClcblx0XHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8obmV3VGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBSZXN1bWUoKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID09IDApIHtcblx0XHRcdFx0XHRcdGxvYWRBcHAoKVxuXHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmtpdGZ1bGxzY3JlZW5jaGFuZ2VcIiwgZnVuY3Rpb24oZXYpIHtcblx0XHQgIGNvbnNvbGUubG9nKCdmdWxsc2NyZWVuY2hhbmdlJywgZXYpXG5cdFx0ICBjdHJsLnNldERhdGEoe2Z1bGxTY3JlZW46ICFjdHJsLm1vZGVsLmZ1bGxTY3JlZW59KVxuXHRcdH0pXG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZnVsbHNjcmVlbmNoYW5nZVwiLCBmdW5jdGlvbihldikge1xuXHRcdCAgY29uc29sZS5sb2coJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBldilcblx0XHQgIGN0cmwuc2V0RGF0YSh7ZnVsbFNjcmVlbjogIWN0cmwubW9kZWwuZnVsbFNjcmVlbn0pXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZU5vdGlmcyhuYk5vdGlmKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe25iTm90aWZ9KVxuXHRcdFxuXHRcdH1cblxuXHRcdGJyb2tlci5vbignY29ubmVjdGVkJywgKHN0YXRlKSA9PiB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2Nvbm5lY3RlZDogc3RhdGV9KVxuXHRcdH0pXG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tob21lXSBtZXNzYWdlJywgZXYuZGF0YSlcblx0XHRcdGNvbnN0IHt0eXBlLCBkYXRhfSA9IGV2LmRhdGFcblx0XHRcdGlmICh0eXBlID09ICdvcGVuQXBwJykge1xuXHRcdFx0XHRjb25zdCB7YXBwTmFtZSwgYXBwUGFyYW1zfSA9IGRhdGFcblx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCBhcHBQYXJhbXMpXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9LCBmYWxzZSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3Qubm90aWZDb3VudCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dXBkYXRlTm90aWZzKG1zZy5kYXRhKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QubG9nb3V0JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRsb2NhdGlvbi5ocmVmID0gJy9sb2dvdXQnXG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gZ2V0QXBwVXJsKGFwcE5hbWUsIHBhcmFtcykge1xuXHRcdFx0cmV0dXJuICQkLnV0aWwuZ2V0VXJsUGFyYW1zKGAvYXBwcy8ke2FwcE5hbWV9YCwgcGFyYW1zKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG9wZW5BcHAoYXBwTmFtZSwgcGFyYW1zKSB7XG5cdFx0XHRjb25zdCBhcHBJbmZvID0gY3RybC5tb2RlbC5hcHBzLmZpbmQoKGEpID0+IGEuYXBwTmFtZSA9PSBhcHBOYW1lKVxuXHRcdFx0Y29uc3QgdGl0bGUgPSBhcHBJbmZvLnByb3BzLnRpdGxlXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdhcHBJbmZvJywgYXBwSW5mbylcblx0XHRcdGNvbnNvbGUubG9nKCdvcGVuQXBwJywgYXBwTmFtZSwgcGFyYW1zKVxuXHRcdFx0bGV0IGlkeCA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmRleEZyb21UaXRsZSh0aXRsZSlcblx0XHRcdGNvbnN0IGFwcFVybCA9IGdldEFwcFVybChhcHBOYW1lLCBwYXJhbXMpXG5cdFx0XHRpZiAoaWR4IDwgMCkgeyAvLyBhcHBzIG5vdCBhbHJlYWR5IHJ1blxuXHRcdFx0XHRpZHggPSBjdHJsLnNjb3BlLnRhYnMuYWRkVGFiKHRpdGxlLCB7XG5cdFx0XHRcdFx0cmVtb3ZhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdGNvbnRyb2w6ICdicmVpemJvdC5hcHBUYWInLFxuXHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRhcHBVcmxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0aWYgKHBhcmFtcyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5zZXRBcHBVcmwoYXBwVXJsKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2NvcGUudGFicy5zZXRTZWxlY3RlZFRhYkluZGV4KGlkeClcblxuXHRcdH1cblxuXHRcdHVzZXJzLmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblxuXHRcdGZ1bmN0aW9uIGxvYWRBcHAoKSB7XG5cdFx0XHRzcnZBcHBzLmxpc3RBbGwoKS50aGVuKChhcHBzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGFwcHNcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XHRcdFx0XG5cdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHR9XG5cblx0XHRsb2FkQXBwKClcdFxuXHRcdFxuXG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnBkZicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwid2FpdFxcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPiBSZW5kZXJpbmcuLi5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1zaG93PVxcXCIhd2FpdFxcXCI+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIkZpdFxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkZpdFxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdDwvZGl2Plxcblx0PGRpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwicGFnZXNcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJwcmV2aW91cyBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJldlBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFxcblxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIm5leHQgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5leHRQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1yaWdodFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdj5cXG5cdFx0XHRQYWdlczogPHNwYW4gYm4tdGV4dD1cXFwiY3VycmVudFBhZ2VcXFwiPjwvc3Bhbj4gLyA8c3BhbiBibi10ZXh0PVxcXCJudW1QYWdlc1xcXCI+PC9zcGFuPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cdFxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5wZGZcXFwiIFxcblx0Ym4tZGF0YT1cXFwie3dvcmtlcjogXFwnL2JyYWluanMvcGRmL3dvcmtlci5qc1xcJ31cXFwiXFxuXHRibi1pZmFjZT1cXFwicGRmXFxcIlxcblx0IFxcbj48L2Rpdj5cdFx0XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHR1cmw6ICcnXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFx0XG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0Y29uc3Qge3VybH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG51bVBhZ2VzOiAwLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGN1cnJlbnRQYWdlOiAxLFxuXHRcdFx0XHR3YWl0OiBmYWxzZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm51bVBhZ2VzID4gMSAmJiAhdGhpcy53YWl0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25OZXh0UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5leHRQYWdlJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3dhaXQ6IHRydWV9KVxuXHRcdFx0XHRcdGN0cmwuc2NvcGUucGRmLm5leHRQYWdlKCkudGhlbigoY3VycmVudFBhZ2UpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QcmV2UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHt3YWl0OiB0cnVlfSlcblx0XHRcdFx0XHRjdHJsLnNjb3BlLnBkZi5wcmV2UGFnZSgpLnRoZW4oKGN1cnJlbnRQYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2N1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZX0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjdHJsLnNjb3BlLnBkZi5maXQoKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbGUodXJsLCB0aXRsZSkge1xuXG5cdFx0XHRjdHJsLnNldERhdGEoe3dhaXQ6IHRydWV9KVxuXG5cdFx0XHRjdHJsLnNjb3BlLnBkZi5vcGVuRmlsZSh1cmwpLnRoZW4oKG51bVBhZ2VzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIGxvYWRlZCcpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0bnVtUGFnZXMsXG5cdFx0XHRcdFx0d2FpdDogZmFsc2Vcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0aWYgKHVybCAhPSAnJykge1xuXHRcdFx0b3BlbkZpbGUodXJsKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0b3BlbkZpbGUoZGF0YS51cmwpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0c2V0RGF0YSh7dXJsfSlcblx0YFxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhcHBOYW1lOiAnJyxcblx0XHRpY29uQ2xzOiAnJyxcblx0XHR0aXRsZTogJ1NlbGVjdCBhIGZyaWVuZCdcblx0fSxcblxuXHQvL3RlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHRcdDxwPkRpc3RhbnQ6IDxzdHJvbmcgYm4tdGV4dD1cXFwiZGlzdGFudFxcXCI+PC9zdHJvbmc+PC9wPlx0XHRcdFx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtcmVkXFxcIj5TdG9wPC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2FwcE5hbWUsIGljb25DbHMsIHRpdGxlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0ICRjaGlsZHJlbiA9IGVsdC5jaGlsZHJlbigpLnJlbW92ZSgpXG5cdFx0ZWx0LmFwcGVuZChcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHRcdDxwPkRpc3RhbnQ6IDxzdHJvbmcgYm4tdGV4dD1cXFwiZGlzdGFudFxcXCI+PC9zdHJvbmc+PC9wPlx0XHRcdFx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtcmVkXFxcIj5TdG9wPC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiKVxuXG5cdFx0cnRjLm9uKCdzdGF0dXMnLCAoZGF0YSkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc3RhdHVzJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YShkYXRhKVxuXHRcdH0pXHRcdFxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzdGF0dXM6ICdyZWFkeScsXG5cdFx0XHRcdGRpc3RhbnQ6ICcnLFxuXHRcdFx0XHRoYXNDaGlsZHJlbjogJGNoaWxkcmVuLmxlbmd0aCA+IDAsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHsgXG5cdFx0XHRcdFx0cmV0dXJuIFsncmVhZHknLCAnZGlzY29ubmVjdGVkJywgJ3JlZnVzZWQnLCAnY2FuY2VsZWQnXS5pbmNsdWRlcyh0aGlzLnN0YXR1cylcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY2FsbGluZyd9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnfSxcblx0XHRcdFx0c2hvdzQ6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJyAmJiB0aGlzLmhhc0NoaWxkcmVufVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNhbGw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsbCcpXG5cblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kc1BhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbih1c2VyTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRydGMuY2FsbCh1c2VyTmFtZSwgYXBwTmFtZSwgaWNvbkNscylcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbmNlbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuY2FuY2VsKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25IYW5ndXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmJ5ZSgpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ3J0Y2hhbmd1cCcpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjdHJsLnNjb3BlLnBhbmVsLmFwcGVuZCgkY2hpbGRyZW4pXHRcdFxuXHR9XG5cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hZGRVc2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlVzZXJOYW1lPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJ1c2VybmFtZVxcXCIgbmFtZT1cXFwidXNlcm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Qc2V1ZG88L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInBzZXVkb1xcXCIgbmFtZT1cXFwicHNldWRvXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+TG9jYXRpb248L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcImxvY2F0aW9uXFxcIiBuYW1lPVxcXCJsb2NhdGlvblxcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBwbGFjZWhvbGRlcj1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiByZXF1aXJlZD5cdFxcblx0PC9kaXY+XFxuXHRcXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bGFiZWw6ICdDcmVhdGUnLCBuYW1lOiAnY3JlYXRlJ31cblx0XSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdG9uQWN0aW9uKGNtZClcblx0YFxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QudXNlcnMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvblVwZGF0ZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiVXBkYXRlXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXJlZG9cXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlx0XFxuXHQ8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRVc2VyXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWUgYnRuQWRkVXNlclxcXCIgdGl0bGU9XFxcIkFkZCBVc2VyXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLXNtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHIgY2xhc3M9XFxcInczLWdyZWVuXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRoPlVzZXIgTmFtZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Qc2V1ZG88L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TG9jYXRpb248L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RW1haWw8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+Q3JlYXRlIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TGFzdCBMb2dpbiBEYXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImRhdGFcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5kZWxldGU6IG9uRGVsZXRlLCBjbGljay5ub3RpZjogb25Ob3RpZlxcXCI+XFxuICBcdFx0XHQ8dHI+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnVzZXJuYW1lXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5wc2V1ZG9cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmxvY2F0aW9uXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5lbWFpbFxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCA+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInRleHQxXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tc2hvdz1cXFwic2hvdzJcXFwiPlxcblxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInRleHQyXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0XHRcdGF0IFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInRleHQzXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDwvc3Bhbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0XHQ8dGQ+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcImRlbGV0ZSB3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZSBVc2VyXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VuZCBOb3RpZmljYXRpb25cXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1iZWxsXFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHQ8L3RyPiAgICAgIFx0XFxuXFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2Vycykge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkuY3JlYXRlRGF0ZSkudG9Mb2NhbGVEYXRlU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRleHQyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5sYXN0TG9naW5EYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDM6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlVGltZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuY3JlYXRlRGF0ZSAhPSB1bmRlZmluZWRcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkVXNlcjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBVc2VyJyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0dXNlcnMuYWRkKGRhdGEpLnRoZW4oZ2V0VXNlcnMpXG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7dXNlcm5hbWV9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7dGl0bGU6ICdEZWxldGUgVXNlcicsIGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPyd9LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnJlbW92ZSh1c2VybmFtZSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5vdGlmOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qge3VzZXJuYW1lfSA9IGN0cmwubW9kZWwuZGF0YVtpZHhdXG5cdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE5vdGlmaWNhdGlvbicsIGxhYmVsOiAnTWVzc2FnZSd9LCBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHRcdFx0XHR1c2Vycy5zZW5kTm90aWYodXNlcm5hbWUsIHt0ZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVwZGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Z2V0VXNlcnMoKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZ2V0VXNlcnMoKSB7XG5cdFx0XHR1c2Vycy5saXN0KCkudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZGF0YX0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGdldFVzZXJzKClcblxuXG5cblx0fVxuXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC52aWV3ZXInLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4taWY9XFxcImlmMVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwiaW1hZ2VcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmltYWdlXFxcIiBcXG5cdFx0Ym4tZGF0YT1cXFwie3NyYzogdXJsfVxcXCIgXFxuXHRcdFxcblx0XHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpZjJcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcInBkZlxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnBkZlxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInt1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaWYzXFxcIiBjbGFzcz1cXFwiYXVkaW9cXFwiPlxcblx0PGF1ZGlvIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiIGNvbnRyb2xzPVxcXCJcXFwiIGNvbnRyb2xzTGlzdD1ub2Rvd25sb2FkPjwvYXVkaW8+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaWY0XFxcIiBjbGFzcz1cXFwidmlkZW9cXFwiPlxcblx0PHZpZGVvIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiIGNvbnRyb2xzPVxcXCJcXFwiIGNvbnRyb2xzTGlzdD1ub2Rvd25sb2FkPjwvdmlkZW8+XFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHR0eXBlOiAnJyxcblx0XHR1cmw6ICcjJ1xuXHR9LFxuXHRcblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0bGV0IHt0eXBlLCB1cmx9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1cmwsXG5cdFx0XHRcdHR5cGUsXG5cdFx0XHRcdGlmMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnaW1hZ2UnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAncGRmJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2F1ZGlvJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3ZpZGVvJ1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gcmVtb3ZlKGZ1bGxOYW1lLCBjYWxsYmFjaykge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tWaWV3ZXJdIHJlbW92ZScsIHtmdWxsTmFtZX0pXG5cblx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ1JlbW92ZSBmaWxlJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmaWxlcy5yZW1vdmVGaWxlcyhbZnVsbE5hbWVdKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGNhbGxiYWNrKClcblx0XHRcdFx0fSlcblx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzYXZlKGRlc3RQYXRoLCBmaWxlTmFtZSwgY2FsbGJhY2spIHtcdFx0XHRcblx0XHRcdGNvbnNvbGUubG9nKCdbVmlld2VyXSBzYXZlJywge2Rlc3RQYXRoLCBmaWxlTmFtZX0pXG5cdFx0XHRpZiAoY3RybC5tb2RlbC51cmwgPT0gJycpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ0ZpbGUgbm90IGxvYWRlZCwgcGxlYXNlIHdhaXQnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCBibG9iID0gJCQudXRpbC5kYXRhVVJMdG9CbG9iKGN0cmwubW9kZWwudXJsKVxuXHRcdFx0ZmlsZXMudXBsb2FkRmlsZShibG9iLCBmaWxlTmFtZSwgZGVzdFBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdGNhbGxiYWNrKClcblx0XHRcdH0pXHRcblx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHRcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XHRcdFxuXG5cdFx0dGhpcy5yZW1vdmUgPSByZW1vdmVcblx0XHR0aGlzLnNhdmUgPSBzYXZlXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbVmlld2VyXSBzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCkge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3VybDogZGF0YS51cmx9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRyZW1vdmUoZnVsbE5hbWUsIGNhbGxiYWNrKTtcblx0XHRzYXZlKGRlc3RQYXRoLCBmaWxlTmFtZSwgY2FsbGJhY2spXG5cdFx0YFxuXG59KTtcblxuXG5cblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcERhdGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdGxldCBfZGF0YSA9IGNvbmZpZ1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldERhdGE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gX2RhdGFcblx0XHRcdH0sXG5cblx0XHRcdHNhdmVEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdF9kYXRhID0gZGF0YVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2FwcERhdGEnLCBkYXRhKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldERhdGEoKTpEYXRhO1xuXHRcdHNhdmVEYXRhKGRhdGEpOlByb21pc2UgXG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3RBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0QWxsKCk6UHJvbWlzZTtcblx0XHRgXG59KTtcbiIsIihmdW5jdGlvbigpIHtcblxuXG5cdGNsYXNzIEJyb2tlckNsaWVudCBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXG5cdFx0Y29uc3RydWN0b3IoKSB7XG5cdFx0XHRzdXBlcigpXG5cblx0XHRcdHRoaXMuc29jayA9IG51bGxcblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSB0cnVlXG5cdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0dGhpcy50b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7d2lsZGNhcmQ6IHRydWV9KVxuXHRcdFx0dGhpcy5waW5nSW50ZXJ2YWwgPSAxMCoxMDAwXG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFxuXG5cdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3MgPSB7fVxuXG5cdFx0XHRsZXQge2hvc3RuYW1lLCBwYXRobmFtZSwgcHJvdG9jb2x9ID0gbG9jYXRpb25cblx0XHRcdGNvbnN0IHBvcnQgPSA4MDkwXG5cdFx0XHRwcm90b2NvbD0gKHByb3RvY29sID09ICdodHRwOicpID8gJ3dzOicgOiAnd3NzOidcblxuXG5cdFx0XHR0aGlzLnVybCA9IGAke3Byb3RvY29sfS8vJHtob3N0bmFtZX06JHtwb3J0fS9obWkke3BhdGhuYW1lfWBcblx0XHR9XG5cblx0XHRjaGVja1BpbmcoKSB7XG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCF0aGlzLmlzUGluZ09rKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3RpbWVvdXQgcGluZycpXG5cdFx0XHRcdFx0dGhpcy5zb2NrLm9ubWVzc2FnZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2suY2xvc2UoKVxuXHRcdFx0XHRcdHRoaXMub25DbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncGluZyd9KVxuXHRcdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGhpcy5waW5nSW50ZXJ2YWwpXHRcdFx0XG5cdFx0fVxuXG5cdFx0b25DbG9zZSgpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQ2xvc2UnKVxuXHRcdFx0aWYgKHRoaXMuaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0dGhpcy5lbWl0KCdjb25uZWN0ZWQnLCBmYWxzZSlcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRoaXMudHJ5UmVjb25uZWN0KSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge3RoaXMuY29ubmVjdCgpfSwgNTAwMClcblx0XHRcdH1cdFx0XHRcblx0XHR9XG5cblx0XHRjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHR0aGlzLnNvY2sgPSBuZXcgV2ViU29ja2V0KHRoaXMudXJsKVxuXHRcblx0XHRcdHRoaXMuc29jay5vbm9wZW4gPSAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIHRydWUpXG5cdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuc29jay5vbm1lc3NhZ2UgPSAgKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSB0aGlzLnNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gbWVzc2FnZSBiYWQgdGFyZ2V0JywgbXNnLnR5cGUpXG5cdFx0XHRcdFx0ZXYuY3VycmVudFRhcmdldC5jbG9zZSgpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gbWVzc2FnZScsIG1zZylcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAncmVhZHknKSB7XG5cdFx0XHRcdFx0Ly8gdGhpcy50b3BpY3MuZXZlbnROYW1lcygpLmZvckVhY2goKHRvcGljKSA9PiB7XG5cdFx0XHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFxuXHRcdFx0XHRcdC8vIH0pXHRcdFxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMucmVnaXN0ZXJlZFRvcGljcykuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0fSlcdFxuXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWFkeScsIHtjbGllbnRJZDogbXNnLmNsaWVudElkfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRoaXMudG9waWNzLmVtaXQobXNnLnRvcGljLCBtc2cpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSBmYWxzZVxuXHRcdFx0XHRcdHRoaXMuc29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gdGhpcy5zb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlIGJhZCB0YXJnZXQnKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlJylcblx0XHRcdFx0aWYgKHRoaXMudGltZW91dElkICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRJZClcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLm9uQ2xvc2UoKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cblx0XHRzZW5kTXNnKG1zZykge1xuXHRcdFx0bXNnLnRpbWUgPSBEYXRlLm5vdygpXG5cdFx0XHR2YXIgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHNlbmRNc2cnLCBtc2cpXG5cdFx0XHRcdHRoaXMuc29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdHZhciBtc2cgPSB7XG5cdFx0XHRcdHR5cGU6ICdub3RpZicsXG5cdFx0XHRcdHRvcGljLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0b25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRyZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAodGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9IDFcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFx0XHRcblx0XHR9XG5cblx0XHR1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0aGlzLnRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0Ly8gY29uc3QgbmJMaXN0ZW5lcnMgPSB0aGlzLnRvcGljcy5saXN0ZW5lcnModG9waWMpLmxlbmd0aFxuXG5cdFx0XHQvLyBpZiAobmJMaXN0ZW5lcnMgPT0gMCkgeyAvLyBubyBtb3JlIGxpc3RlbmVycyBmb3IgdGhpcyB0b3BpY1xuXHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0Ly8gfVx0XG5cdFx0XHRpZiAoLS10aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljfSlcblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cblx0XHRcblx0fVxuXG5cblxuXG5cdCQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCB7XG5cblx0XHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdFx0Y29uc3QgY2xpZW50ID0gbmV3IEJyb2tlckNsaWVudCgpXG5cdFx0XHRjbGllbnQuY29ubmVjdCgpXG5cblx0XHRcdHJldHVybiBjbGllbnRcblx0XHR9LFxuXG5cdFx0JGlmYWNlOiBgXG5cdFx0XHRlbWl0VG9waWModG9waWNOYW1lLCBkYXRhKTtcblx0XHRcdHJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0dW5yZWdpc3Rlcih0b3BpY05hbWUsIGNhbGxiYWNrKTtcblx0XHRcdG9uVG9waWModG9waWNOYW1lLCBjYWxsYmFjaylcblxuXHRcdGBcblx0fSlcblxuXG59KSgpO1xuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuY2l0aWVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9jaXRpZXMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldENvdW50cmllczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2NvdW50cmllcycpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRDaXRpZXM6IGZ1bmN0aW9uKGNvdW50cnksIHNlYXJjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY2l0aWVzJywge2NvdW50cnksIHNlYXJjaH0pXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0Q291bnRyaWVzKCk6UHJvbWlzZTtcblx0XHRnZXRDaXRpZXMoY291bnRyeSwgc2VhcmNoKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvZmlsZXMnKVxuXHRcdFxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0OiBmdW5jdGlvbihkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgZGVzdFBhdGgpXG5cblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2xpc3QnLCB7ZGVzdFBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXJ9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVVybDogZnVuY3Rpb24oZmlsZU5hbWUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnV0aWwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWQnLCB7ZmlsZU5hbWUsIGZyaWVuZFVzZXJ9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVRodW1ibmFpbFVybDogZnVuY3Rpb24oZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnV0aWwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWRUaHVtYm5haWwnLCB7ZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXJ9KVxuXHRcdFx0fSxcblxuXHRcdFx0dXBsb2FkRmlsZTogZnVuY3Rpb24oYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVwbG9hZEZpbGUnLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpXG5cdFx0XHRcdGlmICghKGJsb2IgaW5zdGFuY2VvZiBCbG9iKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUud2FybignRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdibG9iJywgYmxvYilcblx0XHRcdFx0dmFyIGZkID0gbmV3IEZvcm1EYXRhKClcblx0XHRcdFx0ZmQuYXBwZW5kKCdmaWxlJywgYmxvYiwgc2F2ZUFzZmlsZU5hbWUpXG5cdFx0XHRcdGZkLmFwcGVuZCgnZGVzdFBhdGgnLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdEZvcm1EYXRhKCcvc2F2ZScsIGZkKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW1vdmVGaWxlcycsIGZpbGVOYW1lcylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2RlbGV0ZScsIGZpbGVOYW1lcylcblx0XHRcdH0sXG5cblx0XHRcdG1rZGlyOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBta2RpcicsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvbWtkaXInLCB7ZmlsZU5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0bW92ZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1vdmVGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9tb3ZlJywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2hhcmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHNoYXJlRmlsZXMnLCBmaWxlTmFtZXMpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9tb3ZlJywge2ZpbGVOYW1lcywgZGVzdFBhdGg6ICcvc2hhcmUnfSlcblx0XHRcdH0sXHRcdFx0XG5cblx0XHRcdGNvcHlGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBjb3B5RmlsZXMnLCBmaWxlTmFtZXMsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY29weScsIHtmaWxlTmFtZXMsIGRlc3RQYXRofSlcblx0XHRcdH0sXHRcblx0XHRcdHJlbmFtZUZpbGU6IGZ1bmN0aW9uKGZpbGVQYXRoLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVuYW1lRmlsZScsIGZpbGVQYXRoLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9yZW5hbWUnLCB7ZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZX0pXG5cdFx0XHR9LFxuXHRcdFx0cmVzaXplSW1hZ2U6IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlc2l6ZUltYWdlJywgZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9yZXNpemVJbWFnZScsIHtmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdH0pXG5cdFx0XHR9LFxuXHRcdFx0Y29udmVydFRvTVAzOiBmdW5jdGlvbihmaWxlUGF0aCwgZmlsZU5hbWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gY29udmVydFRvTVAzJywgZmlsZVBhdGgsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY29udmVydFRvTVAzJywge2ZpbGVQYXRoLCBmaWxlTmFtZX0pXG5cdFx0XHR9XG5cblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0bGlzdChwYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKTpQcm9taXNlO1xuXHRcdGZpbGVVcmwoZmlsZU5hbWUsIGZyaWVuZFVzZXIpOnN0cmluZztcblx0XHRmaWxlVGh1bWJuYWlsVXJsKGZpbGVOYW1lLCBzaXplLCBmcmllbmRVc2VyKTpzdHJpbmc7XG5cdFx0dXBsb2FkRmlsZShibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0cmVtb3ZlRmlsZXMoZmlsZU5hbWVzKTpQcm9taXNlO1xuXHRcdG1rZGlyKGZpbGVOYW1lKTpQcm9taXNlO1xuXHRcdG1vdmVGaWxlcyhmaWxlTmFtZXMsIGRlc3RQYXRoKTpQcm9taXNlO1xuXHRcdGNvcHlGaWxlcyhmaWxlTmFtZXMsIGRlc3RQYXRoKTpQcm9taXNlO1xuXHRcdHJlbmFtZUZpbGUoZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSk6UHJvbWlzZTtcblx0XHRyZXNpemVJbWFnZShmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdCk6UHJvbWlzZTtcblx0XHRjb252ZXJ0VG9NUDMoZmlsZVBhdGgsIGZpbGVOYW1lKTpQcm9taXNlXG5cdGBcblxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuaHR0cCcsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgcGFyYW1zKSB7XG5cblx0XHRyZXR1cm4gcmVzb3VyY2UoYC9hcGkvYXBwLyR7cGFyYW1zLiRhcHBOYW1lfWApXG5cdH1cblxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFnZXInLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gJCgnLmJyZWl6Ym90UGFnZXInKS5pZmFjZSgpXG5cdH1cblxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFyYW1zJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnID09ICdzdHJpbmcnKSA/IEpTT04ucGFyc2UoY29uZmlnKSA6IHt9XG5cdH1cbn0pO1xuIiwiKGZ1bmN0aW9uKCl7XG5cbmNsYXNzIFJUQyBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXHRjb25zdHJ1Y3Rvcihicm9rZXIsIGh0dHAsIHBhcmFtcykge1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0dGhpcy5icm9rZXIgPSBicm9rZXJcblx0XHR0aGlzLmh0dHAgPSBodHRwXG5cblx0XHR0aGlzLnNyZElkID0gdW5kZWZpbmVkXG5cdFx0dGhpcy5kZXN0SWQgPSB1bmRlZmluZWRcblx0XHR0aGlzLmRpc3RhbnQgPSAnJ1xuXHRcdHRoaXMuc3RhdHVzID0gJ3JlYWR5J1xuXHRcdHRoaXMuaXNDYWxsZWUgPSBmYWxzZVxuXHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0dGhpcy5kaXN0YW50ID0gcGFyYW1zLmNhbGxlclxuXHRcdFx0dGhpcy5kZXN0SWQgPSBwYXJhbXMuY2xpZW50SWRcblx0XHRcdHRoaXMuaXNDYWxsZWUgPSB0cnVlXG5cdFx0fVxuXG5cdFx0YnJva2VyLm9uKCdyZWFkeScsIChtc2cpID0+IHtcblx0XHRcdHRoaXMuc3JjSWQgPSBtc2cuY2xpZW50SWRcblx0XHRcdHRoaXMuZW1pdCgncmVhZHknKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFjY2VwdCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLmNhbmNlbChmYWxzZSlcblx0XHRcdHRoaXMuZGVzdElkID0gbXNnLnNyY0lkXG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVx0XG5cdFx0XHR0aGlzLmVtaXQoJ2FjY2VwdCcpXHRcblx0XHR9KVx0XHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuZGVueScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdyZWZ1c2VkJ1xuXHRcdFx0dGhpcy5jYW5jZWwoZmFsc2UpXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdFx0dGhpcy5lbWl0KCdkZW55JylcdFxuXG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmJ5ZScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdkaXNjb25uZWN0ZWQnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdFx0dGhpcy5lbWl0KCdieWUnKVxuXG5cdFx0fSlcdFx0XHRcdFxuXHR9XG5cblx0Z2V0UmVtb3RlQ2xpZW50SWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZGVzdElkXG5cdH1cblxuXHRwcm9jZXNzQ2FsbCgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gcHJvY2Vzc0NhbGwnKVxuXHRcdHRoaXMuYnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FsbCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0dGhpcy5lbWl0KCdjYWxsJywgbXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdHRoaXMuYnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FuY2VsJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuZW1pdCgnY2FuY2VsJylcblx0XHR9KVx0XHRcblx0fVxuXG5cdG9uRGF0YShuYW1lLCBjYWxsYmFjaykge1xuXHRcdHRoaXMuYnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy4nICsgbmFtZSwgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2sobXNnLmRhdGEsIG1zZy50aW1lKVxuXHRcdH0pXHRcdFx0XG5cdH1cblxuXHRlbWl0U3RhdHVzKCkge1xuXHRcdHRoaXMuZW1pdCgnc3RhdHVzJywge3N0YXR1czogdGhpcy5zdGF0dXMsIGRpc3RhbnQ6IHRoaXMuZGlzdGFudH0pXG5cdH1cblxuXHRjYWxsKHRvLCBhcHBOYW1lLCBpY29uQ2xzKSB7XG5cdFx0dGhpcy5kaXN0YW50ID0gdG9cblx0XHR0aGlzLnN0YXR1cyA9ICdjYWxsaW5nJ1xuXHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0cmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwge1xuXHRcdFx0dG8sXG5cdFx0XHRzcmNJZDogdGhpcy5zcmNJZCxcblx0XHRcdHR5cGU6ICdjYWxsJyxcblx0XHRcdGRhdGE6IHthcHBOYW1lLCBpY29uQ2xzfVxuXHRcdH0pXG5cdH1cdFxuXG5cdGNhbmNlbCh1cGRhdGVTdGF0dXMgPSB0cnVlKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGNhbmNlbCcsIHVwZGF0ZVN0YXR1cylcblx0XHRpZiAodXBkYXRlU3RhdHVzKSB7XG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdjYW5jZWxlZCdcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXHRcdFx0XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvVXNlcmAsIHt0bzogdGhpcy5kaXN0YW50LCBzcmNJZDogdGhpcy5zcmNJZCwgdHlwZTogJ2NhbmNlbCd9KVxuXHR9XHRcblxuXHRhY2NlcHQoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGFjY2VwdCcpXG5cblx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdHJldHVybiB0aGlzLnNlbmREYXRhKCdhY2NlcHQnKVxuXHR9XG5cblx0ZGVueSgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gZGVueScpXG5cblx0XHRyZXR1cm4gdGhpcy5zZW5kRGF0YSgnZGVueScpXG5cdH1cblxuXHRieWUoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGJ5ZScpXG5cblx0XHRpZiAodGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcblx0XHRcdHRoaXMuc3RhdHVzID0gJ3JlYWR5J1xuXHRcdFx0dGhpcy5kaXN0YW50ID0gJydcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0XHRyZXR1cm4gdGhpcy5zZW5kRGF0YSgnYnllJylcdFx0XHRcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcblx0fVxuXG5cdHNlbmREYXRhKHR5cGUsIGRhdGEpIHtcblx0XHRyZXR1cm4gdGhpcy5odHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb0NsaWVudGAsIHtcblx0XHRcdGRlc3RJZDogdGhpcy5kZXN0SWQsIFxuXHRcdFx0c3JjSWQ6IHRoaXMuc3JjSWQsXG5cdFx0XHR0eXBlLFxuXHRcdFx0ZGF0YVxuXHRcdH0pXG5cdH1cdFxuXG59XG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCwgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiBuZXcgUlRDKGJyb2tlciwgaHR0cCwgcGFyYW1zKVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRjYWxsKHRvKTpQcm9taXNlO1xuXHRcdGNhbmNlbCh0byk6UHJvbWlzZTtcblx0XHRkZW55KCk6UHJvbWlzZTtcblx0XHRieWUoKTpQcm9taXNlO1xuXHRcdHNlbmREYXRhKHR5cGUsIGRhdGEpOlByb21pc2U7XG5cdFx0b25EYXRhKGNhbGxiYWNrKGRhdGEsIHRpbWUpKVxuXHRgXG59KTtcblxuXG59KSgpOyIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5zY2hlZHVsZXInLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBhcHBQYXJhbXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIG9wZW5BcHAnLCBhcHBOYW1lLCBhcHBQYXJhbXMpXG5cdFx0XHRcdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHR5cGU6ICdvcGVuQXBwJyxcblx0XHRcdFx0XHQgZGF0YToge2FwcE5hbWUsIGFwcFBhcmFtc31cblx0XHRcdFx0XHR9LCBsb2NhdGlvbi5ocmVmKVxuXG5cdFx0XHR9LFxuXHRcdFx0bG9nb3V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIGxvZ291dCcpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvbG9nb3V0Jylcblx0XHRcdH1cdFx0IFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRvcGVuQXBwKGFwcE5hbWUsIGFwcFBhcmFtcyk6UHJvbWlzZTtcblx0XHRgXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC51c2VycycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvdXNlcnMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nKVxuXHRcdFx0fSxcblxuXHRcdFx0bWF0Y2g6IGZ1bmN0aW9uKG1hdGNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycsIHttYXRjaH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnLycsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGU6IGZ1bmN0aW9uKHVzZXIsIGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucHV0KGAvJHt1c2VyfWAsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRhY3RpdmF0ZUFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hY3RpdmF0ZUFwcGAsIHthcHBOYW1lLCBhY3RpdmF0ZWR9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2VuZE5vdGlmOiBmdW5jdGlvbih0bywgbm90aWYpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL3NlbmROb3RpZmAsIHt0bywgbm90aWZ9KVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlTm90aWY6IGZ1bmN0aW9uKG5vdGlmSWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlTm90aWYvJHtub3RpZklkfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXROb3RpZnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXROb3RpZnNgKVxuXHRcdFx0fSxcblx0XHRcdFxuXHRcdFx0Z2V0Tm90aWZDb3VudDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmQ291bnRgKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0RnJpZW5kczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldEZyaWVuZHNgKVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkRnJpZW5kOiBmdW5jdGlvbihmcmllbmRVc2VyTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkRnJpZW5kYCwge2ZyaWVuZFVzZXJOYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdGNoYW5nZVB3ZDogZnVuY3Rpb24obmV3UHdkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9jaGFuZ2VQd2RgLCB7bmV3UHdkfSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZENvbnRhY3Q6IGZ1bmN0aW9uKG5hbWUsIGVtYWlsKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRDb250YWN0YCwge25hbWUsIGVtYWlsfSlcblx0XHRcdH0sXG5cblx0XHRcdGdldENvbnRhY3RzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Q29udGFjdHNgKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlQ29udGFjdDogZnVuY3Rpb24oY29udGFjdElkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZUNvbnRhY3QvJHtjb250YWN0SWR9YClcblx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHR9XG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdGxpc3QoKTpQcm9taXNlO1xuXHRcdGFkZChkYXRhKTpQcm9taXNlO1xuXHRcdHJlbW92ZSh1c2VyKTpQcm9taXNlO1xuXHRcdHVwZGF0ZSh1c2VyLCBkYXRhKTpQcm9taXNlO1xuXHRcdGdldCh1c2VyKTpQcm9taXNlO1xuXHRcdGFjdGl2YXRlQXBwKGFwcE5hbWUsIGFjdGl2YXRlZCk6UHJvbWlzZTtcblx0XHRzZW5kTm90aWYodG8sIG5vdGlmKTpQcm9taXNlO1xuXHRcdHJlbW92ZU5vdGlmKG5vdGlmSWQpOlByb21pc2U7XG5cdFx0Z2V0Tm90aWZzKCk6UHJvbWlzZTtcblx0XHRnZXROb3RpZkNvdW50KCk6UHJvbWlzZTtcblx0XHRnZXRGcmllbmRzKCk6UHJvbWlzZTtcblx0XHRhZGRGcmllbmQoZnJpZW5kVXNlck5hbWUpOlByb21pc2U7XG5cdFx0Y2hhbmdlUHdkKG5ld1B3ZCk6UHJvbWlzZTtcblx0XHRhZGRDb250YWN0KG5hbWUsIGVtYWlsKTpQcm9taXNlO1xuXHRcdGdldENvbnRhY3RzKCk6UHJvbWlzZShjb250YWN0cyk7XG5cdFx0cmVtb3ZlQ29udGFjdChjb250YWN0SWQpOlByb21pc2Vcblx0YFxufSk7XG4iXX0=
