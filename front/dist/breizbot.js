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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9jb250YWN0cy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwiZnJpZW5kcy9mcmllbmRzLmpzIiwiZnJpZW5kcy9mcmllbmRzUGFnZS5qcyIsImhvbWUvaG9tZS5qcyIsInBhZ2VyL3BhZ2VyLmpzIiwicGRmL21haW4uanMiLCJydGMvcnRjLmpzIiwidXNlcnMvYWRkVXNlci5qcyIsInVzZXJzL3VzZXJzLmpzIiwidmlld2VyL3ZpZXdlci5qcyIsImFwcERhdGEuanMiLCJhcHBzLmpzIiwiYnJva2VyLmpzIiwiY2l0aWVzLmpzIiwiZmlsZXMuanMiLCJodHRwLmpzIiwicGFnZXIuanMiLCJwYXJhbXMuanMiLCJydGMuanMiLCJzY2hlZHVsZXIuanMiLCJ1c2Vycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnJlaXpib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQgPyBjb25mLm1heExpc3RlbmVycyA6IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcbiAgICAgIGNvbmYudmVyYm9zZU1lbW9yeUxlYWsgJiYgKHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBjb25mLnZlcmJvc2VNZW1vcnlMZWFrKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBsb2dQb3NzaWJsZU1lbW9yeUxlYWsoY291bnQsIGV2ZW50TmFtZSkge1xuICAgIHZhciBlcnJvck1zZyA9ICcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICcgKyBjb3VudCArICcgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0Lic7XG5cbiAgICBpZih0aGlzLnZlcmJvc2VNZW1vcnlMZWFrKXtcbiAgICAgIGVycm9yTXNnICs9ICcgRXZlbnQgbmFtZTogJyArIGV2ZW50TmFtZSArICcuJztcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbWl0V2FybmluZyl7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICBlLm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgIGUuZW1pdHRlciA9IHRoaXM7XG4gICAgICBlLmNvdW50ID0gY291bnQ7XG4gICAgICBwcm9jZXNzLmVtaXRXYXJuaW5nKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yTXNnKTtcblxuICAgICAgaWYgKGNvbnNvbGUudHJhY2Upe1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgdGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG4gIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmb3IgZXhwb3J0aW5nIEV2ZW50RW1pdHRlciBwcm9wZXJ0eVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdHJlZS5fbGlzdGVuZXJzLndhcm5lZCAmJlxuICAgICAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoLCBuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKG4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIH1cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uY2UgPSBmdW5jdGlvbihldmVudCwgZm4sIHByZXBlbmQpIHtcbiAgICB0aGlzLl9tYW55KGV2ZW50LCAxLCBmbiwgcHJlcGVuZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgZmFsc2UpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIHRydWUpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuLCBwcmVwZW5kKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5fb24oZXZlbnQsIGxpc3RlbmVyLCBwcmVwZW5kKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fYWxsLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBvZiBlbWl0IGNhbGxcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXRBc3luYyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbZmFsc2VdKTsgfVxuICAgIH1cblxuICAgIHZhciBwcm9taXNlcz0gW107XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYXJndW1lbnRzWzFdKTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZEFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbkFueSA9IGZ1bmN0aW9uKGZuLCBwcmVwZW5kKXtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICBpZihwcmVwZW5kKXtcbiAgICAgIHRoaXMuX2FsbC51bnNoaWZ0KGZuKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX29uQW55KHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIENoYW5nZSB0byBhcnJheS5cbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFkZFxuICAgICAgaWYocHJlcGVuZCl7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkICYmXG4gICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3QpIHtcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb290KTtcbiAgICAgIGZvciAodmFyIGkgaW4ga2V5cykge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIG9iaiA9IHJvb3Rba2V5XTtcbiAgICAgICAgaWYgKChvYmogaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpIHx8IChvYmogPT09IG51bGwpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290W2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSByb290W2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdCh0aGlzLmxpc3RlbmVyVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm4pO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuc1tpXSk7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hbGV4YScsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQoZWx0LCBodHRwKSB7XG5cdFx0Y29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cigxKVxuXG5cdFx0Ly9jb25zb2xlLmxvZygnaGFzaCcsIGhhc2gpXG5cdFx0Y29uc3QgcGFyYW1zID0gJCQudXRpbC5wYXJzZVVybFBhcmFtcyhoYXNoKVxuXHRcdC8vY29uc29sZS5sb2coJ3BhcmFtcycsIHBhcmFtcylcblx0XHRodHRwLnBvc3QoJy9hcGkvYWxleGEvYXV0aCcsIHBhcmFtcykudGhlbigoKSA9PiB7XG5cdFx0XHR3aW5kb3cuY2xvc2UoKVxuXHRcdH0pXG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcFRhYicsIHtcblxuXHRwcm9wczoge1xuXHRcdGFwcFVybDogJ2Fib3V0OmJsYW5rJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxpZnJhbWUgYm4tYXR0cj1cXFwie3NyYzogYXBwVXJsfVxcXCIgYm4tYmluZD1cXFwiaWZyYW1lXFxcIiBibi1ldmVudD1cXFwibG9hZDogb25GcmFtZUxvYWRlZFxcXCI+PC9pZnJhbWU+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cdFx0Y29uc3Qge2FwcFVybH0gPSB0aGlzLnByb3BzO1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBVcmxcdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZyYW1lTG9hZGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2FwcFRhYl0gb25GcmFtZUxvYWRlZCcpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFwcEV4aXQgPSBmdW5jdGlvbigpICB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBFeGl0JywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwRXhpdCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJldHVybiByb290UGFnZS5vbkFwcEV4aXQoKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXHRcdFxuXHRcdH1cdFxuXG5cdFx0dGhpcy5vbkFwcFN1c3BlbmQgPSBmdW5jdGlvbigpICB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBTdXNwZW5kJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwU3VzcGVuZCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFwcFJlc3VtZSA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcFJlc3VtZScsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFJlc3VtZSA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwUmVzdW1lKClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnNldEFwcFVybCA9IGZ1bmN0aW9uKGFwcFVybCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIHNldEFwcFVybCcsIGFwcFVybClcblx0XHRcdGN0cmwuc2V0RGF0YSh7YXBwVXJsOiBhcHBVcmwgKyAnJmRhdGU9JyArIERhdGUubm93KCl9KVxuXHRcdH1cblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRwcm9wczoge1xuXHRcdGFwcHM6IFtdLFxuXHRcdHNob3dBY3RpdmF0ZWQ6IGZhbHNlXG5cdH0sXG5cblx0JGlmYWNlOiAnc2V0RGF0YShkYXRhKScsXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1lYWNoPVxcXCJhcHBzXFxcIiBibi1pdGVyPVxcXCJhcHBcXFwiIGNsYXNzPVxcXCJtYWluXFxcIiBibi1ldmVudD1cXFwiY2xpY2sudGlsZTogb25UaWxlQ2xpY2tcXFwiPlx0XHRcdFxcblx0XHQ8ZGl2IGJuLWF0dHI9XFxcImNsYXNzMVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYXJyb3ctcmlnaHRcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cyXFxcIiBzdHlsZT1cXFwibWFyZ2luLWJvdHRvbTogNXB4O1xcXCI+XFxuXHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS5hcHAucHJvcHMuaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuYXBwLnByb3BzLnRpdGxlXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblxcblx0PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7YXBwcywgc2hvd0FjdGl2YXRlZH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcHMsXG5cdFx0XHRcdHNob3dBY3RpdmF0ZWQsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNob3dBY3RpdmF0ZWQgJiYgc2NvcGUuYXBwLmFjdGl2YXRlZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtjbGFzczogYHRpbGUgdzMtYnRuICR7c2NvcGUuYXBwLnByb3BzLmNvbG9yQ2xzfWB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0eXBlb2Ygc2NvcGUuYXBwLnByb3BzLmljb25DbHMgPT0gJ3N0cmluZydcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRpbGVDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDbGljaycsICQodGhpcykuZGF0YSgnaXRlbScpKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdhcHBjbGljaycsIGN0cmwubW9kZWwuYXBwc1tpZHhdKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRhcHBzOiBkYXRhLmFwcHMuZmlsdGVyKChhKSA9PiBhLnByb3BzLnZpc2libGUgIT0gZmFsc2UgJiYgYS5hcHBOYW1lICE9ICd0ZW1wbGF0ZScpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYHNldERhdGEoZGF0YSlgLFxuXHQkZXZlbnRzOiAnYXBwY2xpY2snXG59KTtcblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmNvbnRhY3RzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdHNob3dEZWxldGVCdXR0b246IGZhbHNlXG5cdH0sXHRcblxuXHR0ZW1wbGF0ZTogXCI8cCBibi1zaG93PVxcXCJzaG93MlxcXCI+WW91IGhhdmUgbm8gY29udGFjdHM8L3A+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLmRlbGV0ZTogb25EZWxldGVJdGVtXFxcIlxcblx0Ym4tZWFjaD1cXFwiY29udGFjdHNcXFwiXFxuXHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdD5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIj5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiIGJuLXNob3c9XFxcInNob3dEZWxldGVCdXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPjwvc3Bhbj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyIHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmNvbnRhY3ROYW1lXFxcIj48L3N0cm9uZz48YnI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlIHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5jb250YWN0RW1haWxcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcdFxcblwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMpIHtcblxuXHRcdGNvbnN0IHtzaG93U2VsZWN0aW9uLCBzaG93RGVsZXRlQnV0dG9ufSA9IHRoaXMucHJvcHNcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjb250YWN0czogW10sXG5cdFx0XHRcdHNob3dEZWxldGVCdXR0b24sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5sZW5ndGggPT0gMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAgJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IGN0cmwubW9kZWwuY29udGFjdHNbaWR4XVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKHNob3dTZWxlY3Rpb24pIHtcblx0XHRcdFx0XHRcdC8vJCh0aGlzKS5zaWJsaW5ncygnLnczLWJsdWUnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0XHQkKHRoaXMpLnRvZ2dsZUNsYXNzKCd3My1ibHVlJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2NvbnRhY3RjbGljaycsIGRhdGEpXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRGVsZXRlSXRlbTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBjdHJsLm1vZGVsLmNvbnRhY3RzW2lkeF1cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25EZWxldGVJdGVtJywgZGF0YSlcblx0XHRcdFx0XHR1c2Vycy5yZW1vdmVDb250YWN0KGRhdGEuX2lkKS50aGVuKGxvYWQpXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdGZ1bmN0aW9uIGxvYWQoKSB7XG5cdFx0XHR1c2Vycy5nZXRDb250YWN0cygpLnRoZW4oKGNvbnRhY3RzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdjb250YWN0cycsIGNvbnRhY3RzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2NvbnRhY3RzfSlcblx0XHRcdH0pXHRcblxuXHRcdH1cblxuXHRcdGxvYWQoKVxuXG5cdFx0dGhpcy51cGRhdGUgPSBsb2FkXG5cblx0XHR0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0gW11cblx0XHRcdGVsdC5maW5kKCdsaS53My1ibHVlJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc3QgaWR4ID0gICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRyZXQucHVzaChjdHJsLm1vZGVsLmNvbnRhY3RzW2lkeF0pXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3JldCcsIHJldClcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0fVxufSk7XG5cblxuXG5cbiIsIihmdW5jdGlvbigpe1xuXG5mdW5jdGlvbiBnZXRJY29uQ2xhc3MobmFtZSkge1xuXHRpZiAobmFtZS5lbmRzV2l0aCgnLnBkZicpKSB7XG5cdFx0cmV0dXJuICdmYS1maWxlLXBkZidcblx0fVxuXHRpZiAobmFtZS5lbmRzV2l0aCgnLmRvYycpKSB7XG5cdFx0cmV0dXJuICdmYS1maWxlLXdvcmQnXG5cdH1cblx0aWYgKG5hbWUuZW5kc1dpdGgoJy5vZ2cnKSB8fCBuYW1lLmVuZHNXaXRoKCcubXAzJykpIHtcblx0XHRyZXR1cm4gJ2ZhLWZpbGUtYXVkaW8nXG5cdH1cblx0aWYgKG5hbWUuZW5kc1dpdGgoJy5tcDQnKSkge1xuXHRcdHJldHVybiAnZmEtZmlsZS12aWRlbydcblx0fVxuXHRyZXR1cm4gJ2ZhLWZpbGUnXG59XG5cbmZ1bmN0aW9uIHNvcnRGaWxlcyhmaWxlcykge1xuXHRmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG5cdCAgaWYgKGEuZm9sZGVyICYmICFiLmZvbGRlcikge1xuXHQgICAgcmV0dXJuIC0xXG5cdCAgfVxuXHQgIGlmICghYS5mb2xkZXIgJiYgYi5mb2xkZXIpIHtcblx0ICAgIHJldHVybiAxXG5cdCAgfVxuXHQgIHJldHVybiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpXG5cdH0pXHRcdFx0XG59XG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWxlcycsIHtcblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLCBcblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGwsXG5cdFx0c2hvd1Rvb2xiYXI6IGZhbHNlLFxuXHRcdGltYWdlT25seTogZmFsc2UsXG5cdFx0ZmlsdGVyRXh0ZW5zaW9uOiB1bmRlZmluZWQsXG5cdFx0ZnJpZW5kVXNlcjogJydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCJcXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIiBibi1zaG93PVxcXCJzaG93VG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHR0aXRsZT1cXFwiTmV3IGZvbGRlclxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ3JlYXRlRm9sZGVyXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhcyBmYS1mb2xkZXItcGx1c1xcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHR0aXRsZT1cXFwiSW1wb3J0IGZpbGVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkltcG9ydEZpbGVcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtdXBsb2FkXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblxcblxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHR0aXRsZT1cXFwiVG9nZ2xlIFNlbGVjdGlvblxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9nbGVTZWxlY3Rpb25cXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY2hlY2tcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHR0aXRsZT1cXFwiUmVsb2FkXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25SZWxvYWRcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtc3luYy1hbHRcXFwiPjwvaT48L2J1dHRvbj5cdFxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiRGVsZXRlXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25EZWxldGVGaWxlc1xcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMVxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJDdXRcXFwiXFxuXHRcdFx0Ym4tcHJvcD1cXFwicHJvcDFcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkN1dEZpbGVzXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLWN1dFxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkNvcHlcXFwiXFxuXHRcdFx0Ym4tcHJvcD1cXFwicHJvcDFcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvcHlGaWxlc1xcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLWNvcHlcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiU2hhcmVcXFwiXFxuXHRcdFx0Ym4tcHJvcD1cXFwicHJvcDJcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblNoYXJlRmlsZXNcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1hbHRcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiUGFzdGVcXFwiXFxuXHRcdFx0Ym4tcHJvcD1cXFwicHJvcDNcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblBhc3RlRmlsZXNcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtcGFzdGVcXFwiPjwvaT48L2J1dHRvbj5cdFx0XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJwYXRoUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5wYXRoSXRlbTogb25QYXRoSXRlbVxcXCI+XFxuXHQ8ZGl2PlBhdGg6PC9kaXY+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImdldFBhdGhcXFwiIGJuLWluZGV4PVxcXCJpZHhcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1yaWdodFxcXCIgYm4tc2hvdz1cXFwiIWlzRmlyc3RcXFwiPjwvaT5cXG5cdFx0PHNwYW4+XFxuXHRcdFx0PGEgY2xhc3M9XFxcInBhdGhJdGVtXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGhyZWY9XFxcIiNcXFwiIGJuLXNob3c9XFxcIiFpc0xhc3RcXFwiIGJuLWRhdGE9XFxcIntpbmZvOiBnZXRQYXRoSW5mb31cXFwiPjwvYT5cdFxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgYm4tc2hvdz1cXFwiaXNMYXN0XFxcIj48L3NwYW4+XHRcXG5cdFx0XHRcXG5cdFx0PC9zcGFuPlxcblx0PC9kaXY+XFxuXFxuXHRcXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImZpbGVzXFxcIiBcXG5cdFx0Ym4taXRlcj1cXFwiZlxcXCIgXFxuXHRcdGNsYXNzPVxcXCJjb250YWluZXJcXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay5mb2xkZXI6IG9uRm9sZGVyQ2xpY2ssIGNsaWNrLmNoZWNrOiBvbkNoZWNrQ2xpY2ssIGNsaWNrLmZpbGU6IG9uRmlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aHVtYm5haWw6IG9uQ29udGV4dE1lbnVcXFwiPlxcblx0XHRcXG5cdFx0PGRpdiBjbGFzcz1cXFwidGh1bWJuYWlsIHczLWNhcmQtMlxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwiZGF0YTFcXFwiPlx0XFxuXFxuXHRcdFx0XHQ8c3BhbiBibi1pZj1cXFwiaWYxXFxcIj5cXG5cdFx0XHRcdFx0PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1zaG93PVxcXCJzaG93VG9vbGJhclxcXCIgY2xhc3M9XFxcImNoZWNrIHczLWNoZWNrXFxcIj5cdFx0XHRcdFx0XHRcXG5cdFx0XHRcdDwvc3Bhbj5cXG5cdFx0XHRcdDxkaXYgYm4taWY9XFxcIiRzY29wZS5mLmZvbGRlclxcXCIgY2xhc3M9XFxcImZvbGRlciBpdGVtXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLTR4IGZhLWZvbGRlci1vcGVuIHczLXRleHQtYmx1ZS1ncmV5XFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cdFx0XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCIgYm4taWY9XFxcImlmMVxcXCI+PC9zcGFuPlx0XHRcdFx0XHRcdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IFxcblx0XHRcdFx0XHRibi1pZj1cXFwiaWYyXFxcIiAgXFxuXHRcdFx0XHRcdGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiXFxuXHRcdFx0XHRcdD5cXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjbGFzczF9XFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XHRcdFx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XHRcXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cdFx0XHRcXG5cXG5cdFx0XHRcdDxkaXYgXFxuXHRcdFx0XHRcdGJuLWlmPVxcXCJpZjNcXFwiICBcXG5cdFx0XHRcdFx0Y2xhc3M9XFxcImZpbGUgaXRlbVxcXCJcXG5cdFx0XHRcdFx0Plxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6ICRzY29wZS5mLnRodW1ibmFpbFVybH1cXFwiPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cdFx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREaW1lbnNpb25cXFwiPjwvc3Bhbj5cdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PC9kaXY+XHRcXG5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cdFxcblxcbjwvZGl2PlxcblwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IHRodW1ibmFpbFNpemUgPSAnMTAweD8nXG5cdFx0Y29uc3QgbWF4VXBsb2FkU2l6ZSA9IDIqMTAyNCoyMDE0IC8vIDIgTW9cblxuXHRcdGxldCBzZWxlY3RlZCA9IGZhbHNlXG5cblx0XHRsZXQge1xuXHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHRmaWx0ZXJFeHRlbnNpb24sXG5cdFx0XHRmcmllbmRVc2VyLFxuXHRcdFx0aW1hZ2VPbmx5XG5cdFx0fSA9IHRoaXMucHJvcHNcblxuXHRcdGlmIChmcmllbmRVc2VyICE9ICcnKSB7XG5cdFx0XHRzaG93VG9vbGJhciA9IGZhbHNlXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U2VsRmlsZXMoKSB7XG5cdFx0XHRjb25zdCBzZWxGaWxlcyA9IFtdXG5cdFx0XHRlbHQuZmluZCgnLmNoZWNrOmNoZWNrZWQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxGaWxlcy5wdXNoKGN0cmwubW9kZWwucm9vdERpciArIGluZm8ubmFtZSlcblx0XHRcdH0pXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxGaWxlcycsIHNlbEZpbGVzKVx0XG5cdFx0XHRyZXR1cm4gc2VsRmlsZXNcdFx0XG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBnZXROYlNlbEZpbGVzKCkge1xuXHRcdFx0cmV0dXJuIGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmxlbmd0aFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRvZ2dsZVNlbGVjdGlvbigpIHtcblx0XHRcdHNlbGVjdGVkID0gIXNlbGVjdGVkXG5cdFx0XHRlbHQuZmluZCgnLmNoZWNrJykucHJvcCgnY2hlY2tlZCcsIHNlbGVjdGVkKVxuXHRcdH1cdFx0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHRcdHJvb3REaXI6ICcvJyxcblx0XHRcdFx0ZmlsZXM6IFtdLFxuXHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBbXSxcblx0XHRcdFx0b3BlcmF0aW9uOiAnbm9uZScsXG5cdFx0XHRcdG5iU2VsZWN0aW9uOiAwLFxuXHRcdFx0XHRpc1NoYXJlU2VsZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRnZXRQYXRoOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCB0YWIgPSAoJy9ob21lJyArIHRoaXMucm9vdERpcikuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdHRhYi5zaGlmdCgpXG5cdFx0XHRcdFx0dGFiLnBvcCgpXG5cdFx0XHRcdFx0cmV0dXJuIHRhYlxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0xhc3Q6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSB0aGlzLmdldFBhdGgoKS5sZW5ndGgtMVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0ZpcnN0OiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRQYXRoSW5mbzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRQYXRoKCkuc2xpY2UoMSwgc2NvcGUuaWR4KzEpLmpvaW4oJy8nKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGRhdGExOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB7aXRlbXM6IHNjb3BlLmYuaXRlbXMgfHwge319XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuZi5uYW1lICE9ICcuLidcblx0XHRcdFx0fSxcblx0XHRcdFx0aWYyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAhc2NvcGUuZi5mb2xkZXIgJiYgIXNjb3BlLmYuaXNJbWFnZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjM6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiBzY29wZS5mLmlzSW1hZ2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBgZmEgZmEtNHggdzMtdGV4dC1ibHVlLWdyZXkgJHtnZXRJY29uQ2xhc3Moc2NvcGUuZi5uYW1lKX1gXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0bGV0IHNpemUgPSBzY29wZS5mLnNpemVcblx0XHRcdFx0XHRsZXQgdW5pdCA9ICdvY3RldHMnXG5cdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHR1bml0ID0gJ0tvJ1xuXHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHR1bml0ID0gJ01vJ1xuXHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2l6ZSA9IE1hdGguZmxvb3Ioc2l6ZSoxMCkvMTBcblx0XHRcdFx0XHRyZXR1cm4gJ1NpemU6ICcgKyBzaXplICsgJyAnICsgdW5pdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGdldERpbWVuc2lvbjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCBkID0gc2NvcGUuZi5kaW1lbnNpb25cblx0XHRcdFx0XHRyZXR1cm4gYERpbWVuc2lvbjogJHtkLndpZHRofXgke2QuaGVpZ2h0fWBcblx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdGdldERhdGU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKHNjb3BlLmYubXRpbWUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXG5cdFx0XHRcdFx0cmV0dXJuICdMYXN0IE1vZGlmOiAnICsgZGF0ZVxuXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0cHJvcDE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB7ZGlzYWJsZWQ6IHRoaXMubmJTZWxlY3Rpb24gPT0gMH1cblx0XHRcdFx0fSxcblx0XHRcdFx0cHJvcDI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB7ZGlzYWJsZWQ6IHRoaXMubmJTZWxlY3Rpb24gPT0gMCB8fCB0aGlzLnJvb3REaXIuc3RhcnRzV2l0aCgnL3NoYXJlLycpIHx8IHRoaXMuaXNTaGFyZVNlbGVjdGVkfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwcm9wMzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogIHRoaXMuc2VsZWN0ZWRGaWxlcy5sZW5ndGggPT0gMH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uUGF0aEl0ZW06IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgcGF0aEl0ZW0gPSAkKHRoaXMpLmRhdGEoJ2luZm8nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblBhdGhJdGVtJywgcGF0aEl0ZW0pXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXG5cdFx0XHRcdFx0bG9hZERhdGEocGF0aEl0ZW0gPT0gJycgPyAnLycgOiAnLycgKyBwYXRoSXRlbSArICcvJylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZWxvYWQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uQ29udGV4dE1lbnU6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cdFx0XHRcdFx0Y29uc3Qge2NtZH0gPSBkYXRhXG5cblx0XHRcdFx0XHRjb25zdCB7cm9vdERpcn0gPSBjdHJsLm1vZGVsXG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdkb3dubG9hZCcpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IHNydkZpbGVzLmZpbGVVcmwocm9vdERpciArIGluZm8ubmFtZSlcblx0XHRcdFx0XHRcdCQkLnV0aWwuZG93bmxvYWRVcmwodXJsLCBpbmZvLm5hbWUpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAncmVuYW1lJykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgb2xkRmlsZU5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe2xhYmVsOiAnTmV3IG5hbWUnLCB0aXRsZTogJ1JlbmFtZScsIHZhbHVlOiBvbGRGaWxlTmFtZX0sIGZ1bmN0aW9uKG5ld0ZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCduZXdGaWxlTmFtZScsIG5ld0ZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0XHRpZiAobmV3RmlsZU5hbWUgIT0gb2xkRmlsZU5hbWUpIHtcblx0XHRcdFx0XHRcdFx0XHRzcnZGaWxlcy5yZW5hbWVGaWxlKHJvb3REaXIsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnbWFrZVJlc2l6ZWRDb3B5Jykge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHRcdGxhYmVsOiAnUmVzY2FsZSBwZXJjZW50YWdlOicsIFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ01ha2UgcmVzaXplZCBjb3B5Jyxcblx0XHRcdFx0XHRcdFx0YXR0cnM6IHttaW46IDEwLCBtYXg6IDkwLCB0eXBlOiAnbnVtYmVyJ30sXG5cdFx0XHRcdFx0XHRcdHZhbHVlOiA1MFxuXHRcdFx0XHRcdFx0fSwgZnVuY3Rpb24ocGVyY2VudGFnZSkge1xuXHRcdFx0XHRcdFx0XHRzcnZGaWxlcy5yZXNpemVJbWFnZShyb290RGlyLCBpbmZvLm5hbWUsIHBlcmNlbnRhZ2UrJyUnKVxuXHRcdFx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnY29udmVydFRvTVAzJykge1xuXHRcdFx0XHRcdFx0c3J2RmlsZXMuY29udmVydFRvTVAzKHJvb3REaXIsIGluZm8ubmFtZSlcblx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZWxldGUnKSB7XG5cdFx0XHRcdFx0XHRkZWxldGVGaWxlcyhbcm9vdERpciArIGluZm8ubmFtZV0pXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdFx0XHRmaWxlTmFtZTogaW5mby5uYW1lLFxuXHRcdFx0XHRcdFx0cm9vdERpcjogY3RybC5tb2RlbC5yb290RGlyLCAgICAgICAgICAgICAgICAgICAgICAgXG5cdFx0XHRcdFx0XHRpc0ltYWdlOiBpbmZvLmlzSW1hZ2Vcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZmlsZWNsaWNrJywgZGF0YSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DaGVja0NsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXG5cdFx0XHRcdFx0aWYgKGluZm8ubmFtZSA9PSAnc2hhcmUnICYmIGN0cmwubW9kZWwucm9vdERpciA9PSAnLycpIHtcblx0XHRcdFx0XHRcdGN0cmwubW9kZWwuaXNTaGFyZVNlbGVjdGVkID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtuYlNlbGVjdGlvbjogZ2V0TmJTZWxGaWxlcygpfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Gb2xkZXJDbGljazogZnVuY3Rpb24oZXYpIHtcblxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXG5cdFx0XHRcdFx0Y29uc3QgZGlyTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRm9sZGVyQ2xpY2snLCBkaXJOYW1lKVxuXHRcdFx0XHRcdGlmIChkaXJOYW1lID09ICcuLicpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHNwbGl0ID0gY3RybC5tb2RlbC5yb290RGlyLnNwbGl0KCcvJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXG5cdFx0XHRcdFx0XHRzcGxpdC5wb3AoKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0bG9hZERhdGEoc3BsaXQuam9pbignLycpICsgJy8nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGxvYWREYXRhKGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNyZWF0ZUZvbGRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdGb2xkZXIgbmFtZTonLCBcblx0XHRcdFx0XHRcdHRpdGxlOiAnTmV3IEZvbGRlcidcblx0XHRcdFx0XHR9LCBmdW5jdGlvbihmb2xkZXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5ta2Rpcihyb290RGlyICsgZm9sZGVyTmFtZSlcblx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ub2dsZVNlbGVjdGlvbjogZnVuY3Rpb24oKVx0e1xuXHRcdFx0XHRcdHRvZ2dsZVNlbGVjdGlvbigpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtuYlNlbGVjdGlvbjogZ2V0TmJTZWxGaWxlcygpfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkRlbGV0ZUZpbGVzOiBmdW5jdGlvbihldikge1xuXG5cdFx0XHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBnZXRTZWxGaWxlcygpXG5cblx0XHRcdFx0XHRpZiAoc2VsRmlsZXMubGVuZ3RoID09IDApIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJyxcblx0XHRcdFx0XHRcdFx0Y29udGVudDogJ05vIGZpbGVzIHNlbGVjdGVkJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGRlbGV0ZUZpbGVzKHNlbEZpbGVzKVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ3V0RmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ3V0RmlsZXMnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBnZXRTZWxGaWxlcygpLFxuXHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY3V0J1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Db3B5RmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29weUZpbGVzJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlczogZ2V0U2VsRmlsZXMoKSxcblx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2NvcHknXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblNoYXJlRmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2hhcmVGaWxlcycpXG5cdFx0XHRcdFx0c3J2RmlsZXMuc2hhcmVGaWxlcyhnZXRTZWxGaWxlcygpKVxuXHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUGFzdGVGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25QYXN0ZUZpbGVzJylcblx0XHRcdFx0XHRjb25zdCB7cm9vdERpciwgc2VsZWN0ZWRGaWxlcywgb3BlcmF0aW9ufSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRjb25zdCBwcm9taXNlID0gXG5cdFx0XHRcdFx0XHQob3BlcmF0aW9uID09ICdjb3B5JykgPyBzcnZGaWxlcy5jb3B5RmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcikgOiBzcnZGaWxlcy5tb3ZlRmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcilcblxuXHRcdFx0XHRcdHByb21pc2Vcblx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3NlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJ30pXG5cdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Ly9jdHJsLnNldERhdGEoe3NlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJ30pXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbXBvcnRGaWxlOiBmdW5jdGlvbihldikge1xuXG5cdFx0XHRcdFx0JCQudXRpbC5vcGVuRmlsZURpYWxvZyhmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlU2l6ZScsIGZpbGUuc2l6ZSAvIDEwMjQpXG5cdFx0XHRcdFx0XHRpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkU2l6ZSkge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6ICdGaWxlIHRvbyBiaWcnLCB0aXRsZTogJ0ltcG9ydCBmaWxlJ30pXG5cdFx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCQudXRpbC5yZWFkRmlsZShmaWxlKS50aGVuKChibG9iKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHNydkZpbGVzLnVwbG9hZEZpbGUoYmxvYiwgZmlsZS5uYW1lLCBjdHJsLm1vZGVsLnJvb3REaXIpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LCB0aXRsZTogJ0Vycm9yJ30pXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGRlbGV0ZUZpbGVzKGZpbGVOYW1lcykge1xuXHRcdFx0JCQudWkuc2hvd0NvbmZpcm0oe1xuXHRcdFx0XHRjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nLFxuXHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcydcblx0XHRcdH0sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzcnZGaWxlcy5yZW1vdmVGaWxlcyhmaWxlTmFtZXMpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXG5cdFx0ZnVuY3Rpb24gbG9hZERhdGEocm9vdERpcikge1xuXHRcdFx0aWYgKHJvb3REaXIgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRzcnZGaWxlcy5saXN0KHJvb3REaXIsIHtmaWx0ZXJFeHRlbnNpb24sIGltYWdlT25seX0sIGZyaWVuZFVzZXIpLnRoZW4oZnVuY3Rpb24oZmlsZXMpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdFx0ZmlsZXMuZm9yRWFjaCgoZikgPT4ge1xuXHRcdFx0XHRcdGlmIChmLmlzSW1hZ2UpIHtcblx0XHRcdFx0XHRcdGYudGh1bWJuYWlsVXJsID0gc3J2RmlsZXMuZmlsZVRodW1ibmFpbFVybChyb290RGlyICsgZi5uYW1lLCB0aHVtYm5haWxTaXplLCBmcmllbmRVc2VyKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoc2hvd1Rvb2xiYXIpIHtcblx0XHRcdFx0XHRcdGYuaXRlbXMgPSB7XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZToge25hbWU6ICdEZWxldGUnLCBpY29uOiAnZmFzIGZhLXRyYXNoJ30sXG5cdFx0XHRcdFx0XHRcdHJlbmFtZToge25hbWU6ICdSZW5hbWUnfVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKGYuaXNJbWFnZSkge1xuXHRcdFx0XHRcdFx0XHRmLml0ZW1zLm1ha2VSZXNpemVkQ29weSA9IHtuYW1lOiAnTWFrZSByZXNpemVkIGNvcHknLCBpY29uOiAnZmFzIGZhLWNvbXByZXNzLWFycm93cy1hbHQnfVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCFmLmZvbGRlcikge1xuXHRcdFx0XHRcdFx0XHRmLml0ZW1zLmRvd25sb2FkID0ge25hbWU6ICdEb3dubG9hZCcsIGljb246ICdmYXMgZmEtZG93bmxvYWQnfVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKGYubmFtZS5lbmRzV2l0aCgnLm1wNCcpKSB7XG5cdFx0XHRcdFx0XHRcdGYuaXRlbXMuY29udmVydFRvTVAzID0ge25hbWU6ICdDb252ZXJ0IHRvIE1QMyd9XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcblx0XHRcdFx0aWYgKHJvb3REaXIgIT0gJy8nKSB7XG5cdFx0XHRcdFx0ZmlsZXMudW5zaGlmdCh7bmFtZTogJy4uJywgZm9sZGVyOiB0cnVlfSlcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNvcnRGaWxlcyhmaWxlcylcblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGZpbGVzLCBcblx0XHRcdFx0XHRyb290RGlyLCBcblx0XHRcdFx0XHRuYlNlbGVjdGlvbjogMCxcblx0XHRcdFx0XHRpc1NoYXJlU2VsZWN0ZWQ6IGZhbHNlXG5cdFx0XHRcdH0pXG5cblx0XHRcdH0pXHRcdFxuXHRcdH1cblxuXHRcdGxvYWREYXRhKClcblxuXHRcdHRoaXMuZ2V0RmlsZXMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZpbGVzLmZpbHRlcigoZikgPT4gIWYuZm9sZGVyKVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGUnKVxuXHRcdFx0bG9hZERhdGEoKVxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6ICd1cGRhdGUoKScsXG5cdCRldmVudHM6ICdmaWxlY2xpY2snXG5cbn0pO1xuXG59KSgpO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRzaG93U2VsZWN0aW9uOiBmYWxzZSxcblx0XHRzaG93U2VuZE1lc3NhZ2U6IGZhbHNlLFxuXHRcdHNob3dDb25uZWN0aW9uU3RhdGU6IHRydWVcblx0fSxcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdGJuLWVhY2g9XFxcImZyaWVuZHNcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIiBibi1ldmVudD1cXFwiY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGljaywgY2xpY2subm90aWY6IG9uU2VuZE1lc3NhZ2VcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIHN0eWxlPVxcXCJjdXJzb3I6IHBvaW50ZXI7XFxcIj5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBub3RpZiB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VuZCBNZXNzYWdlXFxcIiBibi1zaG93PVxcXCJzaG93U2VuZE1lc3NhZ2VcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1lbnZlbG9wZVxcXCI+PC9pPjwvc3Bhbj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIiBibi1jbGFzcz1cXFwiY2xhc3MxXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmZyaWVuZFVzZXJOYW1lXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XFxuPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGZyaWVuZHM8L3A+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgYnJva2VyKSB7XG5cblx0XHRjb25zdCB7c2hvd1NlbGVjdGlvbiwgc2hvd1NlbmRNZXNzYWdlLCBzaG93Q29ubmVjdGlvblN0YXRlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJpZW5kczogW10sXG5cdFx0XHRcdHNob3dTZW5kTWVzc2FnZSxcblx0XHRcdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZyaWVuZHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZnJpZW5kcy5sZW5ndGggPT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3QgJGkgPSBzY29wZS4kaVxuXHRcdFx0XHRcdGNvbnN0IHNob3dDb25uZWN0aW9uU3RhdGUgPSB0aGlzLnNob3dDb25uZWN0aW9uU3RhdGVcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0J3czLXRleHQtZ3JlZW4nOiAkaS5pc0Nvbm5lY3RlZCAmJiBzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRcdFx0J3czLXRleHQtcmVkJzogISRpLmlzQ29ubmVjdGVkICYmIHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdFx0XHQndzMtdGV4dC1ibHVlJzogIXNob3dDb25uZWN0aW9uU3RhdGVcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cblx0XHRcdFx0XHRjb25zdCB1c2VyTmFtZSA9ICBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XS5mcmllbmRVc2VyTmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgdXNlck5hbWUpXG5cdFx0XHRcdFx0aWYgKHNob3dTZWxlY3Rpb24pIHtcblx0XHRcdFx0XHRcdCQodGhpcykuc2libGluZ3MoJy53My1ibHVlJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcygndzMtYmx1ZScpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmcmllbmRjbGljaycsIHt1c2VyTmFtZX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2VuZE1lc3NhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgdXNlck5hbWUgPSAgY3RybC5tb2RlbC5mcmllbmRzW2lkeF0uZnJpZW5kVXNlck5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbmRNZXNzYWdlJywgdXNlck5hbWUpXG5cdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE1lc3NhZ2UnLCBsYWJlbDogJ01lc3NhZ2U6J30sIGZ1bmN0aW9uKHRleHQpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VyTmFtZSwge3RleHQsIHJlcGx5OiB0cnVlfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gb25VcGRhdGUobXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCB7aXNDb25uZWN0ZWQsIHVzZXJOYW1lfSA9IG1zZy5kYXRhXG5cdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5mcmllbmRzLmZpbmQoKGZyaWVuZCkgPT4ge3JldHVybiBmcmllbmQuZnJpZW5kVXNlck5hbWUgPT0gdXNlck5hbWV9KVxuXHRcdFx0aW5mby5pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHR9XG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cblx0XHR0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc3QgaWR4ID0gZWx0LmZpbmQoJ2xpLnczLWJsdWUnKS5pbmRleCgpO1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdXG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRGcmllbmRzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzLm1hcCgoZnJpZW5kKSA9PiBmcmllbmQuZnJpZW5kVXNlck5hbWUpXG5cdFx0fVxuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHVzZXJzLmdldEZyaWVuZHMoKS50aGVuKChmcmllbmRzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdmcmllbmRzJywgZnJpZW5kcylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtmcmllbmRzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbZnJpZW5kc10gZGlzcG9zZScpXG5cdFx0XHRicm9rZXIudW5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIG9uVXBkYXRlKVxuXHRcdH1cblxuXG5cdFx0dGhpcy51cGRhdGUoKVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0U2VsZWN0aW9uKCk6c3RyaW5nO1xuXHRcdGdldEZyaWVuZHMoKTpbc3RyaW5nXVxuXHRgLFxuXG5cdCRldmVudHM6ICdmcmllbmRjbGljaydcbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZnJpZW5kc1BhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5mcmllbmRzXFxcIiBcXG5cdGRhdGEtc2hvdy1zZWxlY3Rpb249XFxcInRydWVcXFwiXFxuXHRibi1pZmFjZT1cXFwiZnJpZW5kc1xcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bmFtZTogJ2NhbGwnLCBpY29uOiAnZmEgZmEtY2hlY2snfVxuXHRdLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGNtZCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0Y29uc3Qgc2VsZWN0aW9uID0gY3RybC5zY29wZS5mcmllbmRzLmdldFNlbGVjdGlvbigpXG5cdFx0XHRpZiAoc2VsZWN0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGZyaWVuZCd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHtmcmllbmRVc2VyTmFtZSwgaXNDb25uZWN0ZWR9ID0gc2VsZWN0aW9uXG5cdFx0XHRjb25zb2xlLmxvZygndXNlck5hbWUnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdGlmICghaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJywgXG5cdFx0XHRcdFx0Y29udGVudDogYFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdCRwYWdlci5wb3BQYWdlKGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG59KSIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ob21lJywge1xuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QuYnJva2VyJyxcblx0XHQnYnJlaXpib3QudXNlcnMnLFxuXHRcdCdicmVpemJvdC5ydGMnLFxuXHRcdCdicmVpemJvdC5hcHBzJyxcblx0XHQnYnJlaXpib3Quc2NoZWR1bGVyJ1xuXHRdLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlciB3My10ZWFsXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkZ1bGxTY3JlZW5cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25GdWxsU2NyZWVuXFxcIiBibi1zaG93PVxcXCIhZnVsbFNjcmVlblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDb25uZWN0aW9uIFN0YXR1c1xcXCI+XFxuXHRcdFx0PGkgYm4tY2xhc3M9XFxcInt3My10ZXh0LWdyZWVuOiBjb25uZWN0ZWQsIHczLXRleHQtcmVkOiAhY29ubmVjdGVkfVxcXCIgY2xhc3M9XFxcImZhIGZhLWNpcmNsZVxcXCI+PC9pPlxcblx0XHRcdFxcblx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PGRpdiBibi1zaG93PVxcXCJoYXNJbmNvbWluZ0NhbGxcXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNhbGxSZXNwb25zZVxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLCBcXG5cdFx0XHRcdHRpdGxlOiBjYWxsSW5mby5mcm9tLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0YWNjZXB0OiB7bmFtZTogXFwnQWNjZXB0XFwnfSxcXG5cdFx0XHRcdFx0ZGVueToge25hbWU6IFxcJ0RlY2xpbmVcXCd9LFxcblx0XHRcdFx0fVxcblx0XHRcdH1cXFwiXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNhbGxJbmZvLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuPCEtLSBcdDxzdHJvbmcgYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvc3Ryb25nPlxcbiAtLT5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmaWNhdGlvbiB3My1idXR0b25cXFwiIHRpdGxlPVxcXCJOb3RpZmljYXRpb25cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ob3RpZmljYXRpb25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1iZWxsIHczLXRleHQtd2hpdGVcXFwiID48L2k+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJhZGdlIHczLXJlZCB3My10aW55XFxcIiBibi10ZXh0PVxcXCJuYk5vdGlmXFxcIiBibi1zaG93PVxcXCJoYXNOb3RpZlxcXCI+PC9zcGFuPlx0XHRcdFxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRwd2Q6IHtuYW1lOiBcXCdDaGFuZ2UgcGFzc3dvcmRcXCcsIGljb246IFxcJ2ZhcyBmYS1sb2NrXFwnfSxcXG5cdFx0XHRcdFx0YXBwczoge25hbWU6IFxcJ0FwcGxpY2F0aW9uc1xcJywgaWNvbjogXFwnZmFzIGZhLXRoXFwnfSxcXG5cdFx0XHRcdFx0c2VwOiBcXCctLS0tLS1cXCcsXFxuXHRcdFx0XHRcdGxvZ291dDoge25hbWU6IFxcJ0xvZ291dFxcJywgaWNvbjogXFwnZmFzIGZhLXBvd2VyLW9mZlxcJ31cXG5cdFx0XHRcdH0sXFxuXHRcdFx0XHR0aXRsZTogdXNlck5hbWUsXFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnXFxuXHRcdFx0fVxcXCIgXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbnRleHRNZW51XFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyIGZhLWxnXFxcIj48L2k+XFxuPCEtLSBcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInVzZXJOYW1lXFxcIj48L3NwYW4+XHRcXG4gLS0+XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtZG93biBmYS1sZ1xcXCI+PC9pPlxcbiAgICBcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cXG5cdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy50YWJzXFxcIiBcXG5cdGNsYXNzPVxcXCJjb250ZW50XFxcIiBcXG5cdGJuLWlmYWNlPVxcXCJ0YWJzXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJ0YWJzcmVtb3ZlOiBvblRhYlJlbW92ZSwgdGFic2FjdGl2YXRlOiBvblRhYkFjdGl2YXRlXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuYXBwc1xcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInthcHBzOiBnZXRNeUFwcHN9XFxcIlxcblx0XHRibi1ldmVudD1cXFwiYXBwY2xpY2s6IG9uQXBwQ2xpY2tcXFwiXFxuXHRcdHRpdGxlPVxcXCJIb21lXFxcIiBcXG5cdFx0Plx0XHRcXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBicm9rZXIsIHVzZXJzLCBydGMsIHNydkFwcHMsIHNjaGVkdWxlcikge1xuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQXVkaW8oKSB7XG5cdFx0XHRsZXQgYXVkaW8gPSBudWxsXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwbGF5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBwbGF5Jylcblx0XHRcdFx0XHRhdWRpbyA9IG5ldyBBdWRpbygnL2Fzc2V0cy9za3lwZS5tcDMnKVxuXHRcdFx0XHRcdGF1ZGlvLmxvb3AgPSB0cnVlXHRcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHthdWRpby5wbGF5KCl9LCAxMDApXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0c3RvcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gc3RvcCcpXG5cdFx0XHRcdFx0aWYgKGF1ZGlvICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnBhdXNlKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXVkaW8gPSBudWxsXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRydGMucHJvY2Vzc0NhbGwoKVxuXHRcdFxuXHRcdHJ0Yy5vbignY2FsbCcsIGZ1bmN0aW9uKGNhbGxJbmZvKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogdHJ1ZSwgY2FsbEluZm99KVxuXHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0fSlcblxuXHRcdHJ0Yy5vbignY2FuY2VsJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogZmFsc2V9KVxuXHRcdFx0YXVkaW8uc3RvcCgpXG5cdFx0fSlcdFx0XG5cblx0XHRjb25zdCB7dXNlck5hbWV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgYXVkaW8gPSBjcmVhdGVBdWRpbygpXG5cdFxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW10sXG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsSW5mbzogbnVsbCxcblx0XHRcdFx0ZnVsbFNjcmVlbjogZmFsc2UsXG5cdFx0XHRcdGNvbm5lY3RlZDogZmFsc2UsXG5cdFx0XHRcdGhhc05vdGlmOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5uYk5vdGlmID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRNeUFwcHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmFwcHMuZmlsdGVyKChhKSA9PiBhLmFjdGl2YXRlZClcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQXBwQ2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQXBwQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdG9wZW5BcHAoZGF0YS5hcHBOYW1lKVxuXG5cdFx0XHRcdH0sXHRcdFx0XHRcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRsb2dvdXQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2FwcHMnKSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdzdG9yZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAncHdkJykge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdDaGFuZ2UgUGFzc3dvcmQnLCBsYWJlbDogJ05ldyBQYXNzd29yZDonfSwgZnVuY3Rpb24obmV3UHdkKSB7XG5cdFx0XHRcdFx0XHRcdHVzZXJzLmNoYW5nZVB3ZChuZXdQd2QpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdDaGFuZ2UgUGFzc3dvcmQnLCBjb250ZW50OiAnUGFzc3dvcmQgaGFzIGJlZW4gY2hhbmdlZCd9KVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ob3RpZmljYXRpb246IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTm90aWZpY2F0aW9uJylcblx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC5uYk5vdGlmID09IDApIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogJ25vIG5vdGlmaWNhdGlvbnMnLCB0aXRsZTogJ05vdGlmaWNhdGlvbnMnfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdub3RpZicpXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYWxsUmVzcG9uc2U6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3Qge2NtZH0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsbFJlc3BvbnNlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogZmFsc2V9KVxuXHRcdFx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcdFxuXHRcdFx0XHRcdFx0Y29uc3Qge2Zyb20sIGFwcE5hbWV9ID0gY3RybC5tb2RlbC5jYWxsSW5mb1xuXHRcdFx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNhbGxlcjogZnJvbSxcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnZGVueScpIHtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJ0Yy5kZW55KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GdWxsU2NyZWVuOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkZ1bGxTY3JlZW4nKVxuXHRcdFx0XHRcdGNvbnN0IGVsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcblx0XHRcdFx0XHRjb25zdCByZXF1ZXN0RnVsbHNjcmVlbiA9IGVsZW0ucmVxdWVzdEZ1bGxzY3JlZW4gfHxcblx0XHRcdFx0XHRcdGVsZW0ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW5cblxuXHRcdFx0XHRcdGlmIChyZXF1ZXN0RnVsbHNjcmVlbikge1xuXHRcdFx0XHRcdFx0cmVxdWVzdEZ1bGxzY3JlZW4uY2FsbChlbGVtKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJSZW1vdmU6IGZ1bmN0aW9uKGV2LCBpZHgpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25UYWJSZW1vdmUnLCBpZHgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBFeGl0KCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnRhYnMucmVtb3ZlVGFiKGlkeClcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJBY3RpdmF0ZTogZnVuY3Rpb24oZXYsIHVpKSB7XHRcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25UYWJBY3RpdmF0ZScpXG5cdFx0XHRcdFx0Y29uc3Qge25ld1RhYiwgb2xkVGFifSA9IHVpXG5cdFx0XHRcdFx0Y29uc3QgbmV3VGFiSWR4ID0gbmV3VGFiLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBvbGRUYWJJZHggPSBvbGRUYWIuaW5kZXgoKVxuXHRcdFx0XHRcdGlmIChvbGRUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8ob2xkVGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBTdXNwZW5kKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG5ld1RhYklkeCA+IDApIHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLnNjb3BlLnRhYnMuZ2V0VGFiSW5mbyhuZXdUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFJlc3VtZSgpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPT0gMCkge1xuXHRcdFx0XHRcdFx0bG9hZEFwcCgpXG5cdFx0XHRcdFx0fVxuXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLCBmdW5jdGlvbihldikge1xuXHRcdCAgY29uc29sZS5sb2coJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBldilcblx0XHQgIGN0cmwuc2V0RGF0YSh7ZnVsbFNjcmVlbjogIWN0cmwubW9kZWwuZnVsbFNjcmVlbn0pXG5cdFx0fSlcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJmdWxsc2NyZWVuY2hhbmdlXCIsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0ICBjb25zb2xlLmxvZygnZnVsbHNjcmVlbmNoYW5nZScsIGV2KVxuXHRcdCAgY3RybC5zZXREYXRhKHtmdWxsU2NyZWVuOiAhY3RybC5tb2RlbC5mdWxsU2NyZWVufSlcblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKG5iTm90aWYpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7bmJOb3RpZn0pXG5cdFx0XG5cdFx0fVxuXG5cdFx0YnJva2VyLm9uKCdjb25uZWN0ZWQnLCAoc3RhdGUpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7Y29ubmVjdGVkOiBzdGF0ZX0pXG5cdFx0fSlcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKGV2KSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2hvbWVdIG1lc3NhZ2UnLCBldi5kYXRhKVxuXHRcdFx0Y29uc3Qge3R5cGUsIGRhdGF9ID0gZXYuZGF0YVxuXHRcdFx0aWYgKHR5cGUgPT0gJ29wZW5BcHAnKSB7XG5cdFx0XHRcdGNvbnN0IHthcHBOYW1lLCBhcHBQYXJhbXN9ID0gZGF0YVxuXHRcdFx0XHRvcGVuQXBwKGFwcE5hbWUsIGFwcFBhcmFtcylcblx0XHRcdH1cblx0XHRcdFxuXHRcdH0sIGZhbHNlKVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ub3RpZkNvdW50JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMobXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5sb2dvdXQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGxvY2F0aW9uLmhyZWYgPSAnL2xvZ291dCdcblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBnZXRBcHBVcmwoYXBwTmFtZSwgcGFyYW1zKSB7XG5cdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoYC9hcHBzLyR7YXBwTmFtZX1gLCBwYXJhbXMpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb3BlbkFwcChhcHBOYW1lLCBwYXJhbXMpIHtcblx0XHRcdGNvbnN0IGFwcEluZm8gPSBjdHJsLm1vZGVsLmFwcHMuZmluZCgoYSkgPT4gYS5hcHBOYW1lID09IGFwcE5hbWUpXG5cdFx0XHRjb25zdCB0aXRsZSA9IGFwcEluZm8ucHJvcHMudGl0bGVcblx0XHRcdC8vY29uc29sZS5sb2coJ2FwcEluZm8nLCBhcHBJbmZvKVxuXHRcdFx0Y29uc29sZS5sb2coJ29wZW5BcHAnLCBhcHBOYW1lLCBwYXJhbXMpXG5cdFx0XHRsZXQgaWR4ID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZGV4RnJvbVRpdGxlKHRpdGxlKVxuXHRcdFx0Y29uc3QgYXBwVXJsID0gZ2V0QXBwVXJsKGFwcE5hbWUsIHBhcmFtcylcblx0XHRcdGlmIChpZHggPCAwKSB7IC8vIGFwcHMgbm90IGFscmVhZHkgcnVuXG5cdFx0XHRcdGlkeCA9IGN0cmwuc2NvcGUudGFicy5hZGRUYWIodGl0bGUsIHtcblx0XHRcdFx0XHRyZW1vdmFibGU6IHRydWUsXG5cdFx0XHRcdFx0Y29udHJvbDogJ2JyZWl6Ym90LmFwcFRhYicsXG5cdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdGFwcFVybFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8oaWR4KVxuXHRcdFx0XHRpZiAocGFyYW1zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGluZm8uY3RybElmYWNlLnNldEFwcFVybChhcHBVcmwpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zY29wZS50YWJzLnNldFNlbGVjdGVkVGFiSW5kZXgoaWR4KVxuXG5cdFx0fVxuXG5cdFx0dXNlcnMuZ2V0Tm90aWZDb3VudCgpLnRoZW4odXBkYXRlTm90aWZzKVxuXG5cdFx0ZnVuY3Rpb24gbG9hZEFwcCgpIHtcblx0XHRcdHNydkFwcHMubGlzdEFsbCgpLnRoZW4oKGFwcHMpID0+IHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXBwcycsIGFwcHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0YXBwc1xuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGxvZ291dCgpIHtcdFx0XHRcblx0XHRcdHNjaGVkdWxlci5sb2dvdXQoKVxuXHRcdH1cblxuXHRcdGxvYWRBcHAoKVx0XG5cdFx0XG5cblx0fVxufSk7XG4iLCJcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRwcm9wczoge1xuXHRcdHJvb3RQYWdlOiAnJ1xuXHR9LFxuXHR0ZW1wbGF0ZTogXCI8ZGl2IHN0eWxlPVxcXCJkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBoZWlnaHQ6IDEwMCU7IG92ZXJmbG93OiBoaWRkZW47XFxcIj5cXG5cdFxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93QmFja1xcXCIgY2xhc3M9XFxcInczLWdyZWVuXFxcIiBzdHlsZT1cXFwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBhbGlnbi1pdGVtczogY2VudGVyO1xcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkJhY2tcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25CYWNrXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYXJyb3ctbGVmdFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0PGRpdiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9kaXY+XFxuXHRcdDxkaXYgYm4tZWFjaD1cXFwiYnV0dG9uc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmFjdGlvbjogb25BY3Rpb25cXFwiPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCIgXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgXFxuXHRcdFx0XHRibi10ZXh0PVxcXCIkc2NvcGUuJGkubGFiZWxcXFwiIFxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdFx0PjwvYnV0dG9uPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCIgXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgXFxuXHRcdFx0XHRibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiXFxuXHRcdFx0XHRibi1hdHRyPVxcXCJ7dGl0bGU6ICRzY29wZS4kaS50aXRsZX1cXFwiXFxuXHRcdFx0XHQ+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tYmluZD1cXFwiY29udGVudFxcXCIgc3R5bGU9XFxcImZsZXg6IDE7IG92ZXJmbG93OiBoaWRkZW47XFxcIj48L2Rpdj5cXG5cXG48L2Rpdj5cXG5cIixcblxuXHQkaWZhY2U6IGBwb3BQYWdlKGRhdGEpO3B1c2hQYWdlKGN0cmxOYW1lLCBvcHRpb25zKWAsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7cm9vdFBhZ2V9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93QmFjazogZmFsc2UsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0YnV0dG9uczogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pY29uID09IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaWNvbiAhPSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkJhY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25CYWNrJylcblx0XHRcdFx0XHRyZXN0b3JlUGFnZSh0cnVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBjbWQgPSAkKHRoaXMpLmRhdGEoJ2NtZCcpXG5cdFx0XHRcdFx0Y29uc3QgcGFnZUN0cmxJZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZm4gPSBjdXJJbmZvLmJ1dHRvbnNbY21kXS5vbkNsaWNrXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRmbi5jYWxsKHBhZ2VDdHJsSWZhY2UpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjdHJsLnNjb3BlLmNvbnRlbnRcblx0XHRjb25zdCBzdGFjayA9IFtdXG5cdFx0bGV0IGN1ckluZm8gPSBudWxsXG5cblxuXHRcdGZ1bmN0aW9uIHJlc3RvcmVQYWdlKGlzQmFjaywgZGF0YSkge1xuXHRcdFx0XG5cdFx0XHRjb25zdCBpZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdwb3BQYWdlJywgcGFnZUN0cmwpXG5cdFx0XHRpZiAodHlwZW9mIGlmYWNlLmRpc3Bvc2UgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRpZmFjZS5kaXNwb3NlKClcblx0XHRcdH1cblx0XHRcdGN1ckluZm8uY3RybC5zYWZlRW1wdHkoKS5yZW1vdmUoKVxuXHRcdFx0aWYgKGlzQmFjaykge1xuXHRcdFx0XHRpZiAodHlwZW9mIGN1ckluZm8ub25CYWNrID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjdXJJbmZvLm9uQmFjaygpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBjdXJJbmZvLm9uUmV0dXJuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Y3VySW5mby5vblJldHVybihkYXRhKVxuXHRcdFx0fVxuXG5cdFx0XHRjdXJJbmZvID0gc3RhY2sucG9wKClcdFx0XHRcblx0XHRcdGN1ckluZm8uY3RybC5zaG93KClcblx0XHRcdGNvbnN0IHt0aXRsZSwgYnV0dG9uc30gPSBjdXJJbmZvXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXG5cdFx0fVxuXG5cdFx0dGhpcy5wb3BQYWdlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0cmV0dXJuIHJlc3RvcmVQYWdlKGZhbHNlLCBkYXRhKVxuXHRcdH1cblxuXHRcdHRoaXMucHVzaFBhZ2UgPSBmdW5jdGlvbihjdHJsTmFtZSwgb3B0aW9ucykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBwdXNoUGFnZScsIGN0cmxOYW1lLCBvcHRpb25zKVxuXG5cblx0XHRcdGlmIChjdXJJbmZvICE9IG51bGwpIHtcblx0XHRcdFx0Y3VySW5mby5jdHJsLmhpZGUoKVxuXHRcdFx0XHRzdGFjay5wdXNoKGN1ckluZm8pXG5cdFx0XHR9XG5cblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cblx0XHRcdGxldCB7dGl0bGUsIHByb3BzLCBvblJldHVybiwgb25CYWNrLCBldmVudHN9ID0gb3B0aW9uc1xuXG5cdFx0XHRjb25zdCBjb250cm9sID0gY29udGVudC5hZGRDb250cm9sKGN0cmxOYW1lLCAkLmV4dGVuZCh7JHBhZ2VyOiB0aGlzfSwgcHJvcHMpLCBldmVudHMpXG5cblx0XHRcdGxldCBidXR0b25zID0ge31cblxuXHRcdFx0aWYgKG9wdGlvbnMuYnV0dG9ucyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0YnV0dG9ucyA9IG9wdGlvbnMuYnV0dG9uc1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGdldEJ1dHRvbnMgPSBjb250cm9sLmlmYWNlKCkuZ2V0QnV0dG9uc1xuXHRcdFx0XHRpZiAodHlwZW9mIGdldEJ1dHRvbnMgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGJ1dHRvbnMgPSBnZXRCdXR0b25zKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjdXJJbmZvID0ge3RpdGxlLCBidXR0b25zLCBvblJldHVybiwgb25CYWNrLCBjdHJsOiBjb250cm9sfVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXHRcdH1cdFxuXG5cdFx0dGhpcy5zZXRCdXR0b25WaXNpYmxlID0gZnVuY3Rpb24oYnV0dG9uc1Zpc2libGUpIHtcblxuXHRcdFx0Y29uc3Qge2J1dHRvbnN9ID0gY3VySW5mb1xuXG5cdFx0XHRmb3IobGV0IGJ0biBpbiBidXR0b25zVmlzaWJsZSkge1xuXHRcdFx0XHRpZiAoYnRuIGluIGJ1dHRvbnMpIHtcblx0XHRcdFx0XHRidXR0b25zW2J0bl0udmlzaWJsZSA9IGJ1dHRvbnNWaXNpYmxlW2J0bl1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0IFx0XHRcdFx0XG5cdFx0XHRjdHJsLnNldERhdGEoe2J1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpfSlcblx0XHR9XG5cblxuXHRcdHRoaXMucHVzaFBhZ2Uocm9vdFBhZ2UpXG5cblx0fVxuXG59KTtcblxuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucGRmJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBibi1zaG93PVxcXCJ3YWl0XFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+IFJlbmRlcmluZy4uLlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIiF3YWl0XFxcIj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiRml0XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRml0XFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0PC9kaXY+XFxuXHQ8ZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJwYWdlc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcInByZXZpb3VzIHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XFxuXFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwibmV4dCBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLXJpZ2h0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2Plxcblx0XHRcdFBhZ2VzOiA8c3BhbiBibi10ZXh0PVxcXCJjdXJyZW50UGFnZVxcXCI+PC9zcGFuPiAvIDxzcGFuIGJuLXRleHQ9XFxcIm51bVBhZ2VzXFxcIj48L3NwYW4+XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2Plxcblx0XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnBkZlxcXCIgXFxuXHRibi1kYXRhPVxcXCJ7d29ya2VyOiBcXCcvYnJhaW5qcy9wZGYvd29ya2VyLmpzXFwnfVxcXCJcXG5cdGJuLWlmYWNlPVxcXCJwZGZcXFwiXFxuXHQgXFxuPjwvZGl2Plx0XHRcXG5cIixcblxuXHRwcm9wczoge1xuXHRcdHVybDogJydcblx0fSxcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRjb25zdCB7dXJsfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bnVtUGFnZXM6IDAsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0Y3VycmVudFBhZ2U6IDEsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubnVtUGFnZXMgPiAxICYmICF0aGlzLndhaXRcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbk5leHRQYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTmV4dFBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7d2FpdDogdHJ1ZX0pXG5cdFx0XHRcdFx0Y3RybC5zY29wZS5wZGYubmV4dFBhZ2UoKS50aGVuKChjdXJyZW50UGFnZSkgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtjdXJyZW50UGFnZSwgd2FpdDogZmFsc2V9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QcmV2UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblByZXZQYWdlJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3dhaXQ6IHRydWV9KVxuXHRcdFx0XHRcdGN0cmwuc2NvcGUucGRmLnByZXZQYWdlKCkudGhlbigoY3VycmVudFBhZ2UpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRml0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGN0cmwuc2NvcGUucGRmLmZpdCgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBvcGVuRmlsZSh1cmwsIHRpdGxlKSB7XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7d2FpdDogdHJ1ZX0pXG5cblx0XHRcdGN0cmwuc2NvcGUucGRmLm9wZW5GaWxlKHVybCkudGhlbigobnVtUGFnZXMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGUgbG9hZGVkJylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRudW1QYWdlcyxcblx0XHRcdFx0XHR3YWl0OiBmYWxzZVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRpZiAodXJsICE9ICcnKSB7XG5cdFx0XHRvcGVuRmlsZSh1cmwpXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3NldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRvcGVuRmlsZShkYXRhLnVybClcblx0XHRcdH1cblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmx9KVxuXHRgXG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcE5hbWU6ICcnLFxuXHRcdGljb25DbHM6ICcnLFxuXHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJ1xuXHR9LFxuXG5cdC8vdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdFx0PHA+RGlzdGFudDogPHN0cm9uZyBibi10ZXh0PVxcXCJkaXN0YW50XFxcIj48L3N0cm9uZz48L3A+XHRcdFx0XHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW5cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1yZWRcXFwiPlN0b3A8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBibi1zaG93PVxcXCJzaG93NFxcXCIgYm4tYmluZD1cXFwicGFuZWxcXFwiIGNsYXNzPVxcXCJwYW5lbFxcXCI+PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBydGMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7YXBwTmFtZSwgaWNvbkNscywgdGl0bGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgJGNoaWxkcmVuID0gZWx0LmNoaWxkcmVuKCkucmVtb3ZlKClcblx0XHRlbHQuYXBwZW5kKFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdFx0PHA+RGlzdGFudDogPHN0cm9uZyBibi10ZXh0PVxcXCJkaXN0YW50XFxcIj48L3N0cm9uZz48L3A+XHRcdFx0XHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW5cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1yZWRcXFwiPlN0b3A8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBibi1zaG93PVxcXCJzaG93NFxcXCIgYm4tYmluZD1cXFwicGFuZWxcXFwiIGNsYXNzPVxcXCJwYW5lbFxcXCI+PC9kaXY+XCIpXG5cblx0XHRydGMub24oJ3N0YXR1cycsIChkYXRhKSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzdGF0dXMnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKGRhdGEpXG5cdFx0fSlcdFx0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdFx0ZGlzdGFudDogJycsXG5cdFx0XHRcdGhhc0NoaWxkcmVuOiAkY2hpbGRyZW4ubGVuZ3RoID4gMCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkgeyBcblx0XHRcdFx0XHRyZXR1cm4gWydyZWFkeScsICdkaXNjb25uZWN0ZWQnLCAncmVmdXNlZCcsICdjYW5jZWxlZCddLmluY2x1ZGVzKHRoaXMuc3RhdHVzKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjYWxsaW5nJ30sXG5cdFx0XHRcdHNob3czOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCd9LFxuXHRcdFx0XHRzaG93NDogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnICYmIHRoaXMuaGFzQ2hpbGRyZW59XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FsbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsJylcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5mcmllbmRzUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKHVzZXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lLCBhcHBOYW1lLCBpY29uQ2xzKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FuY2VsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5jYW5jZWwoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkhhbmd1cDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuYnllKClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcigncnRjaGFuZ3VwJylcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGN0cmwuc2NvcGUucGFuZWwuYXBwZW5kKCRjaGlsZHJlbilcdFx0XG5cdH1cblxufSk7IiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+VXNlck5hbWU8L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInVzZXJuYW1lXFxcIiBuYW1lPVxcXCJ1c2VybmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlBzZXVkbzwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwicHNldWRvXFxcIiBuYW1lPVxcXCJwc2V1ZG9cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Mb2NhdGlvbjwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwibG9jYXRpb25cXFwiIG5hbWU9XFxcImxvY2F0aW9uXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+RW1haWw8L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIHBsYWNlaG9sZGVyPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHJlcXVpcmVkPlx0XFxuXHQ8L2Rpdj5cXG5cdFxcblx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0YnV0dG9uczogW1xuXHRcdHtsYWJlbDogJ0NyZWF0ZScsIG5hbWU6ICdjcmVhdGUnfVxuXHRdLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHQkcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGNtZCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0b25BY3Rpb24oY21kKVxuXHRgXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC51c2VycycsIHtcblx0ZGVwczogWydicmVpemJvdC51c2VycyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJVcGRhdGVcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtcmVkb1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIiB0aXRsZT1cXFwiQWRkIFVzZXJcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1wbHVzXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+VXNlciBOYW1lPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlBzZXVkbzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Mb2NhdGlvbjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5FbWFpbDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5DcmVhdGUgRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5MYXN0IExvZ2luIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uczwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiZGF0YVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGUsIGNsaWNrLm5vdGlmOiBvbk5vdGlmXFxcIj5cXG4gIFx0XHRcdDx0cj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudXNlcm5hbWVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBzZXVkb1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubG9jYXRpb25cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkID5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8c3BhbiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDJcXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHRcdFx0YXQgXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDNcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwiZGVsZXRlIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiRGVsZXRlIFVzZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWYgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdDwvdHI+ICAgICAgXHRcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YTogW10sXG5cdFx0XHRcdHRleHQxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5jcmVhdGVEYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkubGFzdExvZ2luRGF0ZSkudG9Mb2NhbGVUaW1lU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5jcmVhdGVEYXRlICE9IHVuZGVmaW5lZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSB1bmRlZmluZWQgJiYgc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRVc2VyOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuYWRkVXNlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHR1c2Vycy5hZGQoZGF0YSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHt1c2VybmFtZX0gPSBjdHJsLm1vZGVsLmRhdGFbaWR4XVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ0RlbGV0ZSBVc2VyJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0dXNlcnMucmVtb3ZlKHVzZXJuYW1lKS50aGVuKGdldFVzZXJzKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWY6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7dXNlcm5hbWV9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTm90aWZpY2F0aW9uJywgbGFiZWw6ICdNZXNzYWdlJ30sIGZ1bmN0aW9uKHRleHQpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZih1c2VybmFtZSwge3RleHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRnZXRVc2VycygpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZXRVc2VycygpIHtcblx0XHRcdHVzZXJzLmxpc3QoKS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtkYXRhfSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0Z2V0VXNlcnMoKVxuXG5cblxuXHR9XG5cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnZpZXdlcicsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1pZj1cXFwiaWYxXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJpbWFnZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW1hZ2VcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7c3JjOiB1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgYm4taWY9XFxcImlmMlxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwicGRmXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJlaXpib3QucGRmXFxcIiBcXG5cdFx0Ym4tZGF0YT1cXFwie3VybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpZjNcXFwiIGNsYXNzPVxcXCJhdWRpb1xcXCI+XFxuXHQ8YXVkaW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC9hdWRpbz5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpZjRcXFwiIGNsYXNzPVxcXCJ2aWRlb1xcXCI+XFxuXHQ8dmlkZW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC92aWRlbz5cXG48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdHR5cGU6ICcnLFxuXHRcdHVybDogJyMnXG5cdH0sXG5cdFxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRsZXQge3R5cGUsIHVybH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybCxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0aWYxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdpbWFnZSdcblx0XHRcdFx0fSxcblx0XHRcdFx0aWYyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdwZGYnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnYXVkaW8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmNDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAndmlkZW8nXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiByZW1vdmUoZnVsbE5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1ZpZXdlcl0gcmVtb3ZlJywge2Z1bGxOYW1lfSlcblxuXHRcdFx0JCQudWkuc2hvd0NvbmZpcm0oe3RpdGxlOiAnUmVtb3ZlIGZpbGUnLCBjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nfSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGZpbGVzLnJlbW92ZUZpbGVzKFtmdWxsTmFtZV0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0Y2FsbGJhY2soKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNhdmUoZGVzdFBhdGgsIGZpbGVOYW1lLCBjYWxsYmFjaykge1x0XHRcdFxuXHRcdFx0Y29uc29sZS5sb2coJ1tWaWV3ZXJdIHNhdmUnLCB7ZGVzdFBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdGlmIChjdHJsLm1vZGVsLnVybCA9PSAnJykge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnRmlsZSBub3QgbG9hZGVkLCBwbGVhc2Ugd2FpdCd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IGJsb2IgPSAkJC51dGlsLmRhdGFVUkx0b0Jsb2IoY3RybC5tb2RlbC51cmwpXG5cdFx0XHRmaWxlcy51cGxvYWRGaWxlKGJsb2IsIGZpbGVOYW1lLCBkZXN0UGF0aCkudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0Y2FsbGJhY2soKVxuXHRcdFx0fSlcdFxuXHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cdFx0XG5cblx0XHR0aGlzLnJlbW92ZSA9IHJlbW92ZVxuXHRcdHRoaXMuc2F2ZSA9IHNhdmVcblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tWaWV3ZXJdIHNldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7dXJsOiBkYXRhLnVybH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdHJlbW92ZShmdWxsTmFtZSwgY2FsbGJhY2spO1xuXHRcdHNhdmUoZGVzdFBhdGgsIGZpbGVOYW1lLCBjYWxsYmFjaylcblx0XHRgXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwRGF0YScsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0bGV0IF9kYXRhID0gY29uZmlnXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0RGF0YTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBfZGF0YVxuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZURhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0X2RhdGEgPSBkYXRhXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvYXBwRGF0YScsIGRhdGEpXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0RGF0YSgpOkRhdGE7XG5cdFx0c2F2ZURhdGEoZGF0YSk6UHJvbWlzZSBcblx0XHRgXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5hcHBzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdEFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2FwaS9hcHBzL2FsbCcpXG5cdFx0XHR9XHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGxpc3RBbGwoKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG5cblx0Y2xhc3MgQnJva2VyQ2xpZW50IGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG5cblx0XHRjb25zdHJ1Y3RvcigpIHtcblx0XHRcdHN1cGVyKClcblxuXHRcdFx0dGhpcy5zb2NrID0gbnVsbFxuXHRcdFx0dGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHR0aGlzLnRyeVJlY29ubmVjdCA9IHRydWVcblx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHR0aGlzLnRvcGljcyA9IG5ldyBFdmVudEVtaXR0ZXIyKHt3aWxkY2FyZDogdHJ1ZX0pXG5cdFx0XHR0aGlzLnBpbmdJbnRlcnZhbCA9IDEwKjEwMDBcblx0XHRcdHRoaXMudGltZW91dElkID0gdW5kZWZpbmVkXG5cblx0XHRcdHRoaXMucmVnaXN0ZXJlZFRvcGljcyA9IHt9XG5cblx0XHRcdGxldCB7aG9zdG5hbWUsIHBhdGhuYW1lLCBwcm90b2NvbH0gPSBsb2NhdGlvblxuXHRcdFx0Y29uc3QgcG9ydCA9IDgwOTBcblx0XHRcdHByb3RvY29sPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRcdHRoaXMudXJsID0gYCR7cHJvdG9jb2x9Ly8ke2hvc3RuYW1lfToke3BvcnR9L2htaSR7cGF0aG5hbWV9YFxuXHRcdH1cblxuXHRcdGNoZWNrUGluZygpIHtcblx0XHRcdHRoaXMudGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXRoaXMuaXNQaW5nT2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygndGltZW91dCBwaW5nJylcblx0XHRcdFx0XHR0aGlzLnNvY2sub25tZXNzYWdlID0gbnVsbFxuXHRcdFx0XHRcdHRoaXMuc29jay5vbmNsb3NlID0gbnVsbFxuXHRcdFx0XHRcdHRoaXMuc29jay5jbG9zZSgpXG5cdFx0XHRcdFx0dGhpcy5vbkNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHR0aGlzLmlzUGluZ09rID0gZmFsc2Vcblx0XHRcdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdwaW5nJ30pXG5cdFx0XHRcdFx0dGhpcy5jaGVja1BpbmcoKVxuXHRcdFx0XHR9XG5cdFx0XHR9LCB0aGlzLnBpbmdJbnRlcnZhbClcdFx0XHRcblx0XHR9XG5cblx0XHRvbkNsb3NlKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25DbG9zZScpXG5cdFx0XHRpZiAodGhpcy5pc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gRGlzY29ubmVjdGVkICEnKVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIGZhbHNlKVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHRpZiAodGhpcy50cnlSZWNvbm5lY3QpIHtcblx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7dGhpcy5jb25uZWN0KCl9LCA1MDAwKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblxuXHRcdGNvbm5lY3QoKSB7XG5cblx0XHRcdGNvbnNvbGUubG9nKCd0cnkgdG8gY29ubmVjdC4uLicpXG5cblx0XHRcdHRoaXMuc29jayA9IG5ldyBXZWJTb2NrZXQodGhpcy51cmwpXG5cdFxuXHRcdFx0dGhpcy5zb2NrLm9ub3BlbiA9ICgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDb25uZWN0ZWQgdG8gYnJva2VyXCIpXG5cdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlXG5cdFx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdHRoaXMuZW1pdCgnY29ubmVjdGVkJywgdHJ1ZSlcblx0XHRcdFx0dGhpcy5jaGVja1BpbmcoKVxuXG5cdFx0XHR9XG5cblxuXHRcdFx0dGhpcy5zb2NrLm9ubWVzc2FnZSA9ICAoZXYpID0+IHtcblx0XHRcdFx0Y29uc3QgbXNnID0gSlNPTi5wYXJzZShldi5kYXRhKVxuXG5cdFx0XHRcdGlmIChldi5jdXJyZW50VGFyZ2V0ICE9IHRoaXMuc29jaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbYnJva2VyXSBtZXNzYWdlIGJhZCB0YXJnZXQnLCBtc2cudHlwZSlcblx0XHRcdFx0XHRldi5jdXJyZW50VGFyZ2V0LmNsb3NlKClcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBtZXNzYWdlJywgbXNnKVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHQvLyB0aGlzLnRvcGljcy5ldmVudE5hbWVzKCkuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHQvLyBcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0Ly8gfSlcdFx0XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGhpcy5yZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncmVnaXN0ZXInLCB0b3BpY30pXHRcblx0XHRcdFx0XHR9KVx0XG5cblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3JlYWR5Jywge2NsaWVudElkOiBtc2cuY2xpZW50SWR9KVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ3BvbmcnKSB7XG5cdFx0XHRcdFx0dGhpcy5pc1BpbmdPayA9IHRydWVcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAnbm90aWYnKSB7XG5cdFx0XHRcdFx0dGhpcy50b3BpY3MuZW1pdChtc2cudG9waWMsIG1zZylcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbQnJva2VyXSBsb2cnLCBtc2cudGV4dClcblx0XHRcdFx0XHR0aGlzLnRyeVJlY29ubmVjdCA9IGZhbHNlXG5cdFx0XHRcdFx0dGhpcy5zb2NrLmNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNvY2sub25jbG9zZSA9IChldikgPT4ge1xuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSB0aGlzLnNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UgYmFkIHRhcmdldCcpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UnKVxuXHRcdFx0XHRpZiAodGhpcy50aW1lb3V0SWQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dElkKVxuXHRcdFx0XHRcdHRoaXMudGltZW91dElkID0gdW5kZWZpbmVkXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMub25DbG9zZSgpXG5cdFx0XHR9XG5cblx0XHR9XG5cblxuXHRcdHNlbmRNc2cobXNnKSB7XG5cdFx0XHRtc2cudGltZSA9IERhdGUubm93KClcblx0XHRcdHZhciB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkobXNnKVxuXHRcdFx0aWYgKHRoaXMuaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gc2VuZE1zZycsIG1zZylcblx0XHRcdFx0dGhpcy5zb2NrLnNlbmQodGV4dClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRlbWl0VG9waWModG9waWMsIGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIGVtaXRUb3BpYycsIHRvcGljLCBkYXRhKVxuXHRcdFx0dmFyIG1zZyA9IHtcblx0XHRcdFx0dHlwZTogJ25vdGlmJyxcblx0XHRcdFx0dG9waWMsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZW5kTXNnKG1zZylcblx0XHR9XG5cblx0XHRvblRvcGljKHRvcGljLCBjYWxsYmFjaykge1xuXHRcdFx0dGhpcy50b3BpY3Mub24odG9waWMsIGNhbGxiYWNrKVxuXHRcdH1cblxuXHRcdHJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gcmVnaXN0ZXInLCB0b3BpYylcblx0XHRcdGlmICh0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID0gMVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY10rKztcblx0XHRcdH1cblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHRcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XHRcdFxuXHRcdH1cblxuXHRcdHVucmVnaXN0ZXIodG9waWMsIGNhbGxiYWNrKSB7XG5cblx0XHRcdHRoaXMudG9waWNzLm9mZih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHQvLyBjb25zdCBuYkxpc3RlbmVycyA9IHRoaXMudG9waWNzLmxpc3RlbmVycyh0b3BpYykubGVuZ3RoXG5cblx0XHRcdC8vIGlmIChuYkxpc3RlbmVycyA9PSAwKSB7IC8vIG5vIG1vcmUgbGlzdGVuZXJzIGZvciB0aGlzIHRvcGljXG5cdFx0XHQvLyBcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3VucmVnaXN0ZXInLCB0b3BpY30pXG5cdFx0XHQvLyB9XHRcblx0XHRcdGlmICgtLXRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXVxuXHRcdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0fVxuXHRcdH1cdFx0XG5cblxuXHRcdFxuXHR9XG5cblxuXG5cblx0JCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmJyb2tlcicsIHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0XHRjb25zdCBjbGllbnQgPSBuZXcgQnJva2VyQ2xpZW50KClcblx0XHRcdGNsaWVudC5jb25uZWN0KClcblxuXHRcdFx0cmV0dXJuIGNsaWVudFxuXHRcdH0sXG5cblx0XHQkaWZhY2U6IGBcblx0XHRcdGVtaXRUb3BpYyh0b3BpY05hbWUsIGRhdGEpO1xuXHRcdFx0cmVnaXN0ZXIodG9waWNOYW1lLCBjYWxsYmFjayk7XG5cdFx0XHR1bnJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0b25Ub3BpYyh0b3BpY05hbWUsIGNhbGxiYWNrKVxuXG5cdFx0YFxuXHR9KVxuXG5cbn0pKCk7XG5cbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5jaXRpZXMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NpdGllcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0Q291bnRyaWVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvY291bnRyaWVzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGllczogZnVuY3Rpb24oY291bnRyeSwgc2VhcmNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jaXRpZXMnLCB7Y291bnRyeSwgc2VhcmNofSlcblx0XHRcdH1cblx0XHRcdFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRDb3VudHJpZXMoKTpQcm9taXNlO1xuXHRcdGdldENpdGllcyhjb3VudHJ5LCBzZWFyY2gpOlByb21pc2U7XG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9maWxlcycpXG5cdFx0XG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uKGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGxpc3QnLCBkZXN0UGF0aClcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvbGlzdCcsIHtkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHtmaWxlTmFtZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVGh1bWJuYWlsVXJsOiBmdW5jdGlvbihmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXRpbC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHtmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcn0pXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGxvYWRGaWxlOiBmdW5jdGlvbihibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gdXBsb2FkRmlsZScsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aClcblx0XHRcdFx0aWYgKCEoYmxvYiBpbnN0YW5jZW9mIEJsb2IpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2Jsb2InLCBibG9iKVxuXHRcdFx0XHR2YXIgZmQgPSBuZXcgRm9ybURhdGEoKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0ZmQuYXBwZW5kKCdkZXN0UGF0aCcsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0Rm9ybURhdGEoJy9zYXZlJywgZmQpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZGVsZXRlJywgZmlsZU5hbWVzKVxuXHRcdFx0fSxcblxuXHRcdFx0bWtkaXI6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1rZGlyJywgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9ta2RpcicsIHtmaWxlTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbW92ZUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzaGFyZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gc2hhcmVGaWxlcycsIGZpbGVOYW1lcylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aDogJy9zaGFyZSd9KVxuXHRcdFx0fSxcdFx0XHRcblxuXHRcdFx0Y29weUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGNvcHlGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb3B5Jywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fSxcdFxuXHRcdFx0cmVuYW1lRmlsZTogZnVuY3Rpb24oZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW5hbWVGaWxlJywgZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3JlbmFtZScsIHtmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lfSlcblx0XHRcdH0sXG5cdFx0XHRyZXNpemVJbWFnZTogZnVuY3Rpb24oZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVzaXplSW1hZ2UnLCBmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3Jlc2l6ZUltYWdlJywge2ZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0fSlcblx0XHRcdH0sXG5cdFx0XHRjb252ZXJ0VG9NUDM6IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBjb252ZXJ0VG9NUDMnLCBmaWxlUGF0aCwgZmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jb252ZXJ0VG9NUDMnLCB7ZmlsZVBhdGgsIGZpbGVOYW1lfSlcblx0XHRcdH1cblxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KHBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXIpOlByb21pc2U7XG5cdFx0ZmlsZVVybChmaWxlTmFtZSwgZnJpZW5kVXNlcik6c3RyaW5nO1xuXHRcdGZpbGVUaHVtYm5haWxVcmwoZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpOnN0cmluZztcblx0XHR1cGxvYWRGaWxlKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCk6UHJvbWlzZTtcblx0XHRyZW1vdmVGaWxlcyhmaWxlTmFtZXMpOlByb21pc2U7XG5cdFx0bWtkaXIoZmlsZU5hbWUpOlByb21pc2U7XG5cdFx0bW92ZUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0Y29weUZpbGVzKGZpbGVOYW1lcywgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0cmVuYW1lRmlsZShmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKTpQcm9taXNlO1xuXHRcdHJlc2l6ZUltYWdlKGZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0KTpQcm9taXNlO1xuXHRcdGNvbnZlcnRUb01QMyhmaWxlUGF0aCwgZmlsZU5hbWUpOlByb21pc2Vcblx0YFxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5odHRwJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZScsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiByZXNvdXJjZShgL2FwaS9hcHAvJHtwYXJhbXMuJGFwcE5hbWV9YClcblx0fVxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAkKCcuYnJlaXpib3RQYWdlcicpLmlmYWNlKClcblx0fVxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYXJhbXMnLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcgPT0gJ3N0cmluZycpID8gSlNPTi5wYXJzZShjb25maWcpIDoge31cblx0fVxufSk7XG4iLCIoZnVuY3Rpb24oKXtcblxuY2xhc3MgUlRDIGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG5cdGNvbnN0cnVjdG9yKGJyb2tlciwgaHR0cCwgcGFyYW1zKSB7XG5cblx0XHRzdXBlcigpXG5cblx0XHR0aGlzLmJyb2tlciA9IGJyb2tlclxuXHRcdHRoaXMuaHR0cCA9IGh0dHBcblxuXHRcdHRoaXMuc3JkSWQgPSB1bmRlZmluZWRcblx0XHR0aGlzLmRlc3RJZCA9IHVuZGVmaW5lZFxuXHRcdHRoaXMuZGlzdGFudCA9ICcnXG5cdFx0dGhpcy5zdGF0dXMgPSAncmVhZHknXG5cdFx0dGhpcy5pc0NhbGxlZSA9IGZhbHNlXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHR0aGlzLmRpc3RhbnQgPSBwYXJhbXMuY2FsbGVyXG5cdFx0XHR0aGlzLmRlc3RJZCA9IHBhcmFtcy5jbGllbnRJZFxuXHRcdFx0dGhpcy5pc0NhbGxlZSA9IHRydWVcblx0XHR9XG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKG1zZykgPT4ge1xuXHRcdFx0dGhpcy5zcmNJZCA9IG1zZy5jbGllbnRJZFxuXHRcdFx0dGhpcy5lbWl0KCdyZWFkeScpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYWNjZXB0JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuY2FuY2VsKGZhbHNlKVxuXHRcdFx0dGhpcy5kZXN0SWQgPSBtc2cuc3JjSWRcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXHRcblx0XHRcdHRoaXMuZW1pdCgnYWNjZXB0JylcdFxuXHRcdH0pXHRcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuc3RhdHVzID0gJ3JlZnVzZWQnXG5cdFx0XHR0aGlzLmNhbmNlbChmYWxzZSlcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0XHR0aGlzLmVtaXQoJ2RlbnknKVx0XG5cblx0XHR9KVx0XHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYnllJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2Rpc2Nvbm5lY3RlZCdcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0XHR0aGlzLmVtaXQoJ2J5ZScpXG5cblx0XHR9KVx0XHRcdFx0XG5cdH1cblxuXHRnZXRSZW1vdGVDbGllbnRJZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5kZXN0SWRcblx0fVxuXG5cdHByb2Nlc3NDYWxsKCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBwcm9jZXNzQ2FsbCcpXG5cdFx0dGhpcy5icm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYWxsJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuZGVzdElkID0gbXNnLnNyY0lkXG5cdFx0XHR0aGlzLmVtaXQoJ2NhbGwnLCBtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0dGhpcy5icm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYW5jZWwnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dGhpcy5lbWl0KCdjYW5jZWwnKVxuXHRcdH0pXHRcdFxuXHR9XG5cblx0b25EYXRhKG5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5icm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLicgKyBuYW1lLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayhtc2cuZGF0YSwgbXNnLnRpbWUpXG5cdFx0fSlcdFx0XHRcblx0fVxuXG5cdGVtaXRTdGF0dXMoKSB7XG5cdFx0dGhpcy5lbWl0KCdzdGF0dXMnLCB7c3RhdHVzOiB0aGlzLnN0YXR1cywgZGlzdGFudDogdGhpcy5kaXN0YW50fSlcblx0fVxuXG5cdGNhbGwodG8sIGFwcE5hbWUsIGljb25DbHMpIHtcblx0XHR0aGlzLmRpc3RhbnQgPSB0b1xuXHRcdHRoaXMuc3RhdHVzID0gJ2NhbGxpbmcnXG5cdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRyZXR1cm4gdGhpcy5odHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7XG5cdFx0XHR0byxcblx0XHRcdHNyY0lkOiB0aGlzLnNyY0lkLFxuXHRcdFx0dHlwZTogJ2NhbGwnLFxuXHRcdFx0ZGF0YToge2FwcE5hbWUsIGljb25DbHN9XG5cdFx0fSlcblx0fVx0XG5cblx0Y2FuY2VsKHVwZGF0ZVN0YXR1cyA9IHRydWUpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gY2FuY2VsJywgdXBkYXRlU3RhdHVzKVxuXHRcdGlmICh1cGRhdGVTdGF0dXMpIHtcblx0XHRcdHRoaXMuc3RhdHVzID0gJ2NhbmNlbGVkJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcdFx0XHRcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwge3RvOiB0aGlzLmRpc3RhbnQsIHNyY0lkOiB0aGlzLnNyY0lkLCB0eXBlOiAnY2FuY2VsJ30pXG5cdH1cdFxuXG5cdGFjY2VwdCgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gYWNjZXB0JylcblxuXHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0cmV0dXJuIHRoaXMuc2VuZERhdGEoJ2FjY2VwdCcpXG5cdH1cblxuXHRkZW55KCkge1xuXHRcdGNvbnNvbGUubG9nKCdbUlRDXSBkZW55JylcblxuXHRcdHJldHVybiB0aGlzLnNlbmREYXRhKCdkZW55Jylcblx0fVxuXG5cdGJ5ZSgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gYnllJylcblxuXHRcdGlmICh0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xuXHRcdFx0dGhpcy5zdGF0dXMgPSAncmVhZHknXG5cdFx0XHR0aGlzLmRpc3RhbnQgPSAnJ1xuXHRcdFx0dGhpcy5lbWl0U3RhdHVzKClcblx0XHRcdHJldHVybiB0aGlzLnNlbmREYXRhKCdieWUnKVx0XHRcdFxuXHRcdH1cblxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuXHR9XG5cblx0c2VuZERhdGEodHlwZSwgZGF0YSkge1xuXHRcdHJldHVybiB0aGlzLmh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50YCwge1xuXHRcdFx0ZGVzdElkOiB0aGlzLmRlc3RJZCwgXG5cdFx0XHRzcmNJZDogdGhpcy5zcmNJZCxcblx0XHRcdHR5cGUsXG5cdFx0XHRkYXRhXG5cdFx0fSlcblx0fVx0XG5cbn1cblxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnJ0YycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCcsICdicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwLCBicm9rZXIsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIG5ldyBSVEMoYnJva2VyLCBodHRwLCBwYXJhbXMpXG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdGNhbGwodG8pOlByb21pc2U7XG5cdFx0Y2FuY2VsKHRvKTpQcm9taXNlO1xuXHRcdGRlbnkoKTpQcm9taXNlO1xuXHRcdGJ5ZSgpOlByb21pc2U7XG5cdFx0c2VuZERhdGEodHlwZSwgZGF0YSk6UHJvbWlzZTtcblx0XHRvbkRhdGEoY2FsbGJhY2soZGF0YSwgdGltZSkpXG5cdGBcbn0pO1xuXG5cbn0pKCk7IiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNjaGVkdWxlcicsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCcsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHAsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW5BcHA6IGZ1bmN0aW9uKGFwcE5hbWUsIGFwcFBhcmFtcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW3NjaGVkdWxlcl0gb3BlbkFwcCcsIGFwcE5hbWUsIGFwcFBhcmFtcylcblx0XHRcdFx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdFx0dHlwZTogJ29wZW5BcHAnLFxuXHRcdFx0XHRcdCBkYXRhOiB7YXBwTmFtZSwgYXBwUGFyYW1zfVxuXHRcdFx0XHRcdH0sIGxvY2F0aW9uLmhyZWYpXG5cblx0XHRcdH0sXG5cdFx0XHRsb2dvdXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW3NjaGVkdWxlcl0gbG9nb3V0Jylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9sb2dvdXQnKVxuXHRcdFx0fVx0XHQgXG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdG9wZW5BcHAoYXBwTmFtZSwgYXBwUGFyYW1zKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnVzZXJzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS91c2VycycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycpXG5cdFx0XHR9LFxuXG5cdFx0XHRtYXRjaDogZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJywge21hdGNofSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZDogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvJywgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZTogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZTogZnVuY3Rpb24odXNlciwgZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wdXQoYC8ke3VzZXJ9YCwgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdGdldDogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdGFjdGl2YXRlQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBhY3RpdmF0ZWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FjdGl2YXRlQXBwYCwge2FwcE5hbWUsIGFjdGl2YXRlZH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzZW5kTm90aWY6IGZ1bmN0aW9uKHRvLCBub3RpZikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2VuZE5vdGlmYCwge3RvLCBub3RpZn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVOb3RpZjogZnVuY3Rpb24obm90aWZJZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC9yZW1vdmVOb3RpZi8ke25vdGlmSWR9YClcblx0XHRcdH0sXG5cblx0XHRcdGdldE5vdGlmczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmc2ApXG5cdFx0XHR9LFxuXHRcdFx0XG5cdFx0XHRnZXROb3RpZkNvdW50OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Tm90aWZDb3VudGApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRGcmllbmRzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0RnJpZW5kc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRGcmllbmQ6IGZ1bmN0aW9uKGZyaWVuZFVzZXJOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRGcmllbmRgLCB7ZnJpZW5kVXNlck5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0Y2hhbmdlUHdkOiBmdW5jdGlvbihuZXdQd2QpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2NoYW5nZVB3ZGAsIHtuZXdQd2R9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkQ29udGFjdDogZnVuY3Rpb24obmFtZSwgZW1haWwpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZENvbnRhY3RgLCB7bmFtZSwgZW1haWx9KVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Q29udGFjdHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbihjb250YWN0SWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlQ29udGFjdC8ke2NvbnRhY3RJZH1gKVxuXHRcdFx0fVx0XHRcdFx0XHRcdFxuXHRcdH1cblx0fSxcblx0JGlmYWNlOiBgXG5cdFx0bGlzdCgpOlByb21pc2U7XG5cdFx0YWRkKGRhdGEpOlByb21pc2U7XG5cdFx0cmVtb3ZlKHVzZXIpOlByb21pc2U7XG5cdFx0dXBkYXRlKHVzZXIsIGRhdGEpOlByb21pc2U7XG5cdFx0Z2V0KHVzZXIpOlByb21pc2U7XG5cdFx0YWN0aXZhdGVBcHAoYXBwTmFtZSwgYWN0aXZhdGVkKTpQcm9taXNlO1xuXHRcdHNlbmROb3RpZih0bywgbm90aWYpOlByb21pc2U7XG5cdFx0cmVtb3ZlTm90aWYobm90aWZJZCk6UHJvbWlzZTtcblx0XHRnZXROb3RpZnMoKTpQcm9taXNlO1xuXHRcdGdldE5vdGlmQ291bnQoKTpQcm9taXNlO1xuXHRcdGdldEZyaWVuZHMoKTpQcm9taXNlO1xuXHRcdGFkZEZyaWVuZChmcmllbmRVc2VyTmFtZSk6UHJvbWlzZTtcblx0XHRjaGFuZ2VQd2QobmV3UHdkKTpQcm9taXNlO1xuXHRcdGFkZENvbnRhY3QobmFtZSwgZW1haWwpOlByb21pc2U7XG5cdFx0Z2V0Q29udGFjdHMoKTpQcm9taXNlKGNvbnRhY3RzKTtcblx0XHRyZW1vdmVDb250YWN0KGNvbnRhY3RJZCk6UHJvbWlzZVxuXHRgXG59KTtcbiJdfQ==
