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
					else if (typeof pageCtrlIface.onAction == 'function') {
						pageCtrlIface.onAction(cmd)
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

			let buttons = {}

			if (options.buttons != undefined) {
				buttons = options.buttons
			}
			else {
				const desc = $$.control.getControlInfo(ctrlName)
				if (desc.options.buttons != undefined) {
					buttons = desc.options.buttons
				}
	
			}

			let {title, props, onReturn, onBack, events} = options

			curInfo = {title, buttons, onReturn, onBack}

			curInfo.ctrl = content.addControl(ctrlName, $.extend({$pager: this}, props), events)

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9jb250YWN0cy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwiZnJpZW5kcy9mcmllbmRzLmpzIiwiZnJpZW5kcy9mcmllbmRzUGFnZS5qcyIsImhvbWUvaG9tZS5qcyIsInBhZ2VyL3BhZ2VyLmpzIiwicGRmL21haW4uanMiLCJydGMvcnRjLmpzIiwidXNlcnMvYWRkVXNlci5qcyIsInVzZXJzL3VzZXJzLmpzIiwidmlld2VyL3ZpZXdlci5qcyIsImFwcERhdGEuanMiLCJhcHBzLmpzIiwiYnJva2VyLmpzIiwiY2l0aWVzLmpzIiwiZmlsZXMuanMiLCJodHRwLmpzIiwicGFnZXIuanMiLCJwYXJhbXMuanMiLCJydGMuanMiLCJzY2hlZHVsZXIuanMiLCJ1c2Vycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJicmVpemJvdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogRXZlbnRFbWl0dGVyMlxuICogaHR0cHM6Ly9naXRodWIuY29tL2hpajFueC9FdmVudEVtaXR0ZXIyXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSA/IEFycmF5LmlzQXJyYXkgOiBmdW5jdGlvbiBfaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgfTtcbiAgdmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGlmICh0aGlzLl9jb25mKSB7XG4gICAgICBjb25maWd1cmUuY2FsbCh0aGlzLCB0aGlzLl9jb25mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmUoY29uZikge1xuICAgIGlmIChjb25mKSB7XG4gICAgICB0aGlzLl9jb25mID0gY29uZjtcblxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCA/IGNvbmYubWF4TGlzdGVuZXJzIDogZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xuICAgICAgY29uZi5uZXdMaXN0ZW5lciAmJiAodGhpcy5uZXdMaXN0ZW5lciA9IGNvbmYubmV3TGlzdGVuZXIpO1xuICAgICAgY29uZi52ZXJib3NlTWVtb3J5TGVhayAmJiAodGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGNvbmYudmVyYm9zZU1lbW9yeUxlYWspO1xuXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhayhjb3VudCwgZXZlbnROYW1lKSB7XG4gICAgdmFyIGVycm9yTXNnID0gJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAnbGVhayBkZXRlY3RlZC4gJyArIGNvdW50ICsgJyBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJztcblxuICAgIGlmKHRoaXMudmVyYm9zZU1lbW9yeUxlYWspe1xuICAgICAgZXJyb3JNc2cgKz0gJyBFdmVudCBuYW1lOiAnICsgZXZlbnROYW1lICsgJy4nO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVtaXRXYXJuaW5nKXtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKGVycm9yTXNnKTtcbiAgICAgIGUubmFtZSA9ICdNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcnO1xuICAgICAgZS5lbWl0dGVyID0gdGhpcztcbiAgICAgIGUuY291bnQgPSBjb3VudDtcbiAgICAgIHByb2Nlc3MuZW1pdFdhcm5pbmcoZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICBpZiAoY29uc29sZS50cmFjZSl7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoY29uZikge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMubmV3TGlzdGVuZXIgPSBmYWxzZTtcbiAgICB0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gZmFsc2U7XG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XG4gIH1cbiAgRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7IC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGZvciBleHBvcnRpbmcgRXZlbnRFbWl0dGVyIHByb3BlcnR5XG5cbiAgLy9cbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxuICAvLyBlbGVtZW50cyAobGVhZnMpIGlmIHRoZXJlIGFyZSBtYXRjaGVzXG4gIC8vXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xuICAgIGlmICghdHJlZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgbGlzdGVuZXJzPVtdLCBsZWFmLCBsZW4sIGJyYW5jaCwgeFRyZWUsIHh4VHJlZSwgaXNvbGF0ZWRCcmFuY2gsIGVuZFJlYWNoZWQsXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgLy9cbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xuICAgICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzW2xlYWZdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoY3VycmVudFR5cGUgPT09ICcqJyB8fCBjdXJyZW50VHlwZSA9PT0gJyoqJykgfHwgdHJlZVtjdXJyZW50VHlwZV0pIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XG4gICAgICAvLyBvciB0aGVyZSBpcyBhIGNvbmNyZXRlIG1hdGNoIGF0IHRoaXMgcGF0Y2hcbiAgICAgIC8vXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9IGVsc2UgaWYoY3VycmVudFR5cGUgPT09ICcqKicpIHtcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIG5leHQgZWxlbWVudCBoYXMgYSBfbGlzdGVuZXJzLCBhZGQgaXQgdG8gdGhlIGhhbmRsZXJzLlxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSAnKicgfHwgYnJhbmNoID09PSAnKionKSB7XG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xuICAgIH1cblxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xuICAgIGlmICh4VHJlZSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXG4gICAgICAvL1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcbiAgICB9XG5cbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xuICAgIGlmKHh4VHJlZSkge1xuICAgICAgaWYoaSA8IHR5cGVMZW5ndGgpIHtcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxuICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGFycmF5cyBvZiBtYXRjaGluZyBuZXh0IGJyYW5jaGVzIGFuZCBvdGhlcnMuXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBjdXJyZW50VHlwZSkge1xuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHsgJyoqJzogaXNvbGF0ZWRCcmFuY2ggfSwgaSsxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gIH1cblxuICBmdW5jdGlvbiBncm93TGlzdGVuZXJUcmVlKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG5cbiAgICAvL1xuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxuICAgIC8vXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcblxuICAgIHdoaWxlIChuYW1lICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgaWYgKCF0cmVlW25hbWVdKSB7XG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnNdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICF0cmVlLl9saXN0ZW5lcnMud2FybmVkICYmXG4gICAgICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gdGhpcy5fbWF4TGlzdGVuZXJzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhay5jYWxsKHRoaXMsIHRyZWUuX2xpc3RlbmVycy5sZW5ndGgsIG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuICAvLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbiAgLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4gIC8vXG4gIC8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuICAvLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmRlbGltaXRlciA9ICcuJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgICBpZiAobiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICAgICAgaWYgKCF0aGlzLl9jb25mKSB0aGlzLl9jb25mID0ge307XG4gICAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XG4gICAgfVxuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnQgPSAnJztcblxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHJldHVybiB0aGlzLl9vbmNlKGV2ZW50LCBmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHJldHVybiB0aGlzLl9vbmNlKGV2ZW50LCBmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbiwgcHJlcGVuZCkge1xuICAgIHRoaXMuX21hbnkoZXZlbnQsIDEsIGZuLCBwcmVwZW5kKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCBmYWxzZSk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRNYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgdHJ1ZSk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4sIHByZXBlbmQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgaWYgKC0tdHRsID09PSAwKSB7XG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XG5cbiAgICB0aGlzLl9vbihldmVudCwgbGlzdGVuZXIsIHByZXBlbmQpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGFyZ3MsbCxpLGo7XG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZiAodGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9hbGwuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgICAvLyBuZWVkIHRvIG1ha2UgY29weSBvZiBoYW5kbGVycyBiZWNhdXNlIGxpc3QgY2FuIGNoYW5nZSBpbiB0aGUgbWlkZGxlXG4gICAgICAgIC8vIG9mIGVtaXQgY2FsbFxuICAgICAgICBoYW5kbGVyID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIubGVuZ3RoKSB7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuICEhdGhpcy5fYWxsO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFzeW5jID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtmYWxzZV0pOyB9XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2VzPSBbXTtcblxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGFyZ3MsbCxpLGo7XG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZiAodGhpcy5fYWxsKSB7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyICYmIGhhbmRsZXIubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcykpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChhcmd1bWVudHNbMV0pOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uQW55ID0gZnVuY3Rpb24oZm4sIHByZXBlbmQpe1xuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYWxsKSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZ1bmN0aW9uIHRvIHRoZSBldmVudCBsaXN0ZW5lciBjb2xsZWN0aW9uLlxuICAgIGlmKHByZXBlbmQpe1xuICAgICAgdGhpcy5fYWxsLnVuc2hpZnQoZm4pO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5fYWxsLnB1c2goZm4pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fb25BbnkodHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbiBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBncm93TGlzdGVuZXJUcmVlLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHNbdHlwZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRvIGFycmF5LlxuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYWRkXG4gICAgICBpZihwcmVwZW5kKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgJiZcbiAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gdGhpcy5fbWF4TGlzdGVuZXJzXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhay5jYWxsKHRoaXMsIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgsIHR5cGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0uX29yaWdpbiAmJiBoYW5kbGVyc1tpXS5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGFuZGxlcnMgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdCkge1xuICAgICAgaWYgKHJvb3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJvb3QpO1xuICAgICAgZm9yICh2YXIgaSBpbiBrZXlzKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgb2JqID0gcm9vdFtrZXldO1xuICAgICAgICBpZiAoKG9iaiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB8fCAodHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIikgfHwgKG9iaiA9PT0gbnVsbCkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3Rba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgZGVsZXRlIHJvb3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHRoaXMubGlzdGVuZXJUcmVlKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XG4gICAgaWYgKGZuICYmIHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoID4gMCkge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihmbiA9PT0gZm5zW2ldKSB7XG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKylcbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm5zW2ldKTtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmY7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcblxuICAgICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHMpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlcnMsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgICByZXR1cm4gaGFuZGxlcnM7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZXZlbnRzKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5saXN0ZW5lcnModHlwZSkubGVuZ3RoO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzQW55ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih0aGlzLl9hbGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbC5cbiAgICB3aW5kb3cuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxufSgpO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFsZXhhJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdChlbHQsIGh0dHApIHtcblx0XHRjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpXG5cblx0XHQvL2NvbnNvbGUubG9nKCdoYXNoJywgaGFzaClcblx0XHRjb25zdCBwYXJhbXMgPSAkJC51dGlsLnBhcnNlVXJsUGFyYW1zKGhhc2gpXG5cdFx0Ly9jb25zb2xlLmxvZygncGFyYW1zJywgcGFyYW1zKVxuXHRcdGh0dHAucG9zdCgnL2FwaS9hbGV4YS9hdXRoJywgcGFyYW1zKS50aGVuKCgpID0+IHtcblx0XHRcdHdpbmRvdy5jbG9zZSgpXG5cdFx0fSlcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYXBwVGFiJywge1xuXG5cdHByb3BzOiB7XG5cdFx0YXBwVXJsOiAnYWJvdXQ6YmxhbmsnXG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGlmcmFtZSBibi1hdHRyPVxcXCJ7c3JjOiBhcHBVcmx9XFxcIiBibi1iaW5kPVxcXCJpZnJhbWVcXFwiIGJuLWV2ZW50PVxcXCJsb2FkOiBvbkZyYW1lTG9hZGVkXFxcIj48L2lmcmFtZT5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblx0XHRjb25zdCB7YXBwVXJsfSA9IHRoaXMucHJvcHM7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcFVybFx0XHRcdFx0XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRnJhbWVMb2FkZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkZyYW1lTG9hZGVkJylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQXBwRXhpdCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcEV4aXQnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBFeGl0ID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cmV0dXJuIHJvb3RQYWdlLm9uQXBwRXhpdCgpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcdFx0XG5cdFx0fVx0XG5cblx0XHR0aGlzLm9uQXBwU3VzcGVuZCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcFN1c3BlbmQnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBTdXNwZW5kID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cm9vdFBhZ2Uub25BcHBTdXNwZW5kKClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLm9uQXBwUmVzdW1lID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Y29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwUmVzdW1lJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwUmVzdW1lID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cm9vdFBhZ2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QXBwVXJsID0gZnVuY3Rpb24oYXBwVXJsKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2FwcFRhYl0gc2V0QXBwVXJsJywgYXBwVXJsKVxuXHRcdFx0Y3RybC5zZXREYXRhKHthcHBVcmw6IGFwcFVybCArICcmZGF0ZT0nICsgRGF0ZS5ub3coKX0pXG5cdFx0fVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0YXBwczogW10sXG5cdFx0c2hvd0FjdGl2YXRlZDogZmFsc2Vcblx0fSxcblxuXHQkaWZhY2U6ICdzZXREYXRhKGRhdGEpJyxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImFwcHNcXFwiIGJuLWl0ZXI9XFxcImFwcFxcXCIgY2xhc3M9XFxcIm1haW5cXFwiIGJuLWV2ZW50PVxcXCJjbGljay50aWxlOiBvblRpbGVDbGlja1xcXCI+XHRcdFx0XFxuXHRcdDxkaXYgYm4tYXR0cj1cXFwiY2xhc3MxXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJhcnJvdy1yaWdodFxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPjwvZGl2Plxcblx0XHRcdDxkaXYgYm4tc2hvdz1cXFwic2hvdzJcXFwiIHN0eWxlPVxcXCJtYXJnaW4tYm90dG9tOiA1cHg7XFxcIj5cXG5cdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogJHNjb3BlLmFwcC5wcm9wcy5pY29uQ2xzfVxcXCI+PC9pPlxcblx0XHRcdDwvZGl2Plxcblxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS5hcHAucHJvcHMudGl0bGVcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHthcHBzLCBzaG93QWN0aXZhdGVkfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwcyxcblx0XHRcdFx0c2hvd0FjdGl2YXRlZCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2hvd0FjdGl2YXRlZCAmJiBzY29wZS5hcHAuYWN0aXZhdGVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2NsYXNzOiBgdGlsZSB3My1idG4gJHtzY29wZS5hcHAucHJvcHMuY29sb3JDbHN9YH1cblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHR5cGVvZiBzY29wZS5hcHAucHJvcHMuaWNvbkNscyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGlsZUNsaWNrJywgJCh0aGlzKS5kYXRhKCdpdGVtJykpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2FwcGNsaWNrJywgY3RybC5tb2RlbC5hcHBzW2lkeF0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdGFwcHM6IGRhdGEuYXBwcy5maWx0ZXIoKGEpID0+IGEucHJvcHMudmlzaWJsZSAhPSBmYWxzZSAmJiBhLmFwcE5hbWUgIT0gJ3RlbXBsYXRlJylcblx0XHRcdH0pXG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgc2V0RGF0YShkYXRhKWAsXG5cdCRldmVudHM6ICdhcHBjbGljaydcbn0pO1xuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuY29udGFjdHMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycyddLFxuXG5cdHByb3BzOiB7XG5cdFx0c2hvd1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0c2hvd0RlbGV0ZUJ1dHRvbjogZmFsc2Vcblx0fSxcdFxuXG5cdHRlbXBsYXRlOiBcIjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBjb250YWN0czwvcD5cXG48dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGljaywgY2xpY2suZGVsZXRlOiBvbkRlbGV0ZUl0ZW1cXFwiXFxuXHRibi1lYWNoPVxcXCJjb250YWN0c1xcXCJcXG5cdGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0Plxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IGRlbGV0ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCIgYm4tc2hvdz1cXFwic2hvd0RlbGV0ZUJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuJGkuY29udGFjdE5hbWVcXFwiPjwvc3Ryb25nPjxicj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGUgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmNvbnRhY3RFbWFpbFxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFx0XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2Vycykge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dEZWxldGVCdXR0b259ID0gdGhpcy5wcm9wc1xuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdFx0c2hvd0RlbGV0ZUJ1dHRvbixcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gY3RybC5tb2RlbC5jb250YWN0c1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0Ly8kKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignY29udGFjdGNsaWNrJywgZGF0YSlcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25EZWxldGVJdGVtOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IGN0cmwubW9kZWwuY29udGFjdHNbaWR4XVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZUl0ZW0nLCBkYXRhKVxuXHRcdFx0XHRcdHVzZXJzLnJlbW92ZUNvbnRhY3QoZGF0YS5faWQpLnRoZW4obG9hZClcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gbG9hZCgpIHtcblx0XHRcdHVzZXJzLmdldENvbnRhY3RzKCkudGhlbigoY29udGFjdHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3RzJywgY29udGFjdHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y29udGFjdHN9KVxuXHRcdFx0fSlcdFxuXG5cdFx0fVxuXG5cdFx0bG9hZCgpXG5cblx0XHR0aGlzLnVwZGF0ZSA9IGxvYWRcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCByZXQgPSBbXVxuXHRcdFx0ZWx0LmZpbmQoJ2xpLnczLWJsdWUnKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAgJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdHJldC5wdXNoKGN0cmwubW9kZWwuY29udGFjdHNbaWR4XSlcblx0XHRcdH0pXG5cdFx0XHRjb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHR9XG59KTtcblxuXG5cblxuIiwiKGZ1bmN0aW9uKCl7XG5cbmZ1bmN0aW9uIGdldEljb25DbGFzcyhuYW1lKSB7XG5cdGlmIChuYW1lLmVuZHNXaXRoKCcucGRmJykpIHtcblx0XHRyZXR1cm4gJ2ZhLWZpbGUtcGRmJ1xuXHR9XG5cdGlmIChuYW1lLmVuZHNXaXRoKCcuZG9jJykpIHtcblx0XHRyZXR1cm4gJ2ZhLWZpbGUtd29yZCdcblx0fVxuXHRpZiAobmFtZS5lbmRzV2l0aCgnLm9nZycpIHx8IG5hbWUuZW5kc1dpdGgoJy5tcDMnKSkge1xuXHRcdHJldHVybiAnZmEtZmlsZS1hdWRpbydcblx0fVxuXHRpZiAobmFtZS5lbmRzV2l0aCgnLm1wNCcpKSB7XG5cdFx0cmV0dXJuICdmYS1maWxlLXZpZGVvJ1xuXHR9XG5cdHJldHVybiAnZmEtZmlsZSdcbn1cblxuZnVuY3Rpb24gc29ydEZpbGVzKGZpbGVzKSB7XG5cdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0ICBpZiAoYS5mb2xkZXIgJiYgIWIuZm9sZGVyKSB7XG5cdCAgICByZXR1cm4gLTFcblx0ICB9XG5cdCAgaWYgKCFhLmZvbGRlciAmJiBiLmZvbGRlcikge1xuXHQgICAgcmV0dXJuIDFcblx0ICB9XG5cdCAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSlcblx0fSlcdFx0XHRcbn1cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sIFxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRzaG93VG9vbGJhcjogZmFsc2UsXG5cdFx0aW1hZ2VPbmx5OiBmYWxzZSxcblx0XHRmaWx0ZXJFeHRlbnNpb246IHVuZGVmaW5lZCxcblx0XHRmcmllbmRVc2VyOiAnJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIlxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiIGJuLXNob3c9XFxcInNob3dUb29sYmFyXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJOZXcgZm9sZGVyXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVGb2xkZXJcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmFzIGZhLWZvbGRlci1wbHVzXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJJbXBvcnQgZmlsZVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0RmlsZVxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS11cGxvYWRcXFwiPjwvaT48L2J1dHRvbj5cdFx0XFxuXFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJUb2dnbGUgU2VsZWN0aW9uXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dsZVNlbGVjdGlvblxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jaGVja1xcXCI+PC9pPjwvYnV0dG9uPlxcblxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdHRpdGxlPVxcXCJSZWxvYWRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblJlbG9hZFxcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1zeW5jLWFsdFxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJEZWxldGVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkRlbGV0ZUZpbGVzXFxcIlxcblx0XHRcdGJuLXByb3A9XFxcInByb3AxXFxcIlxcblx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkN1dFxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ3V0RmlsZXNcXFwiXFxuXHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY3V0XFxcIj48L2k+PC9idXR0b24+XHRcXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQ29weVxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29weUZpbGVzXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY29weVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJTaGFyZVxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wMlxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uU2hhcmVGaWxlc1xcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXNoYXJlLWFsdFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJQYXN0ZVxcXCJcXG5cdFx0XHRibi1wcm9wPVxcXCJwcm9wM1xcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUGFzdGVGaWxlc1xcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1wYXN0ZVxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInBhdGhQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnBhdGhJdGVtOiBvblBhdGhJdGVtXFxcIj5cXG5cdDxkaXY+UGF0aDo8L2Rpdj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZ2V0UGF0aFxcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jaGV2cm9uLXJpZ2h0XFxcIiBibi1zaG93PVxcXCIhaXNGaXJzdFxcXCI+PC9pPlxcblx0XHQ8c3Bhbj5cXG5cdFx0XHQ8YSBjbGFzcz1cXFwicGF0aEl0ZW1cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgaHJlZj1cXFwiI1xcXCIgYm4tc2hvdz1cXFwiIWlzTGFzdFxcXCIgYm4tZGF0YT1cXFwie2luZm86IGdldFBhdGhJbmZvfVxcXCI+PC9hPlx0XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBibi1zaG93PVxcXCJpc0xhc3RcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFxcblx0XHQ8L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG5cdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZmlsZXNcXFwiIFxcblx0XHRibi1pdGVyPVxcXCJmXFxcIiBcXG5cdFx0Y2xhc3M9XFxcImNvbnRhaW5lclxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLmZvbGRlcjogb25Gb2xkZXJDbGljaywgY2xpY2suY2hlY2s6IG9uQ2hlY2tDbGljaywgY2xpY2suZmlsZTogb25GaWxlQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLnRodW1ibmFpbDogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ0aHVtYm5haWwgdzMtY2FyZC0yXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJkYXRhMVxcXCI+XHRcXG5cXG5cdFx0XHRcdDxzcGFuIGJuLWlmPVxcXCJpZjFcXFwiPlxcblx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLXNob3c9XFxcInNob3dUb29sYmFyXFxcIiBjbGFzcz1cXFwiY2hlY2sgdzMtY2hlY2tcXFwiPlx0XHRcdFx0XHRcdFxcblx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PGRpdiBibi1pZj1cXFwiJHNjb3BlLmYuZm9sZGVyXFxcIiBjbGFzcz1cXFwiZm9sZGVyIGl0ZW1cXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtNHggZmEtZm9sZGVyLW9wZW4gdzMtdGV4dC1ibHVlLWdyZXlcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlx0XHRcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIiBibi1pZj1cXFwiaWYxXFxcIj48L3NwYW4+XHRcdFx0XHRcdFx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgXFxuXHRcdFx0XHRcdGJuLWlmPVxcXCJpZjJcXFwiICBcXG5cdFx0XHRcdFx0Y2xhc3M9XFxcImZpbGUgaXRlbVxcXCJcXG5cdFx0XHRcdFx0Plxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNsYXNzMX1cXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFxcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvc3Bhbj5cdFx0XHRcdFx0XHRcdFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plx0XHRcdFxcblxcblx0XHRcdFx0PGRpdiBcXG5cdFx0XHRcdFx0Ym4taWY9XFxcImlmM1xcXCIgIFxcblx0XHRcdFx0XHRjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIlxcblx0XHRcdFx0XHQ+XFxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogJHNjb3BlLmYudGh1bWJuYWlsVXJsfVxcXCI+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlx0XHRcdFx0XHRcdFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERpbWVuc2lvblxcXCI+PC9zcGFuPlx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cdFxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0XFxuXFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0Y29uc3QgdGh1bWJuYWlsU2l6ZSA9ICcxMDB4Pydcblx0XHRjb25zdCBtYXhVcGxvYWRTaXplID0gMioxMDI0KjIwMTQgLy8gMiBNb1xuXG5cdFx0bGV0IHNlbGVjdGVkID0gZmFsc2VcblxuXHRcdGxldCB7XG5cdFx0XHRzaG93VG9vbGJhcixcblx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRpbWFnZU9ubHlcblx0XHR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0aWYgKGZyaWVuZFVzZXIgIT0gJycpIHtcblx0XHRcdHNob3dUb29sYmFyID0gZmFsc2Vcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZWxGaWxlcygpIHtcblx0XHRcdGNvbnN0IHNlbEZpbGVzID0gW11cblx0XHRcdGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcdFx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblx0XHRcdFx0XG5cdFx0XHRcdHNlbEZpbGVzLnB1c2goY3RybC5tb2RlbC5yb290RGlyICsgaW5mby5uYW1lKVxuXHRcdFx0fSlcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdHJldHVybiBzZWxGaWxlc1x0XHRcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGdldE5iU2VsRmlsZXMoKSB7XG5cdFx0XHRyZXR1cm4gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJykubGVuZ3RoXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG9nZ2xlU2VsZWN0aW9uKCkge1xuXHRcdFx0c2VsZWN0ZWQgPSAhc2VsZWN0ZWRcblx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgc2VsZWN0ZWQpXG5cdFx0fVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93VG9vbGJhcixcblx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdHNlbGVjdGVkRmlsZXM6IFtdLFxuXHRcdFx0XHRvcGVyYXRpb246ICdub25lJyxcblx0XHRcdFx0bmJTZWxlY3Rpb246IDAsXG5cdFx0XHRcdGlzU2hhcmVTZWxlY3RlZDogZmFsc2UsXG5cdFx0XHRcdGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHRhYiA9ICgnL2hvbWUnICsgdGhpcy5yb290RGlyKS5zcGxpdCgnLycpXG5cdFx0XHRcdFx0dGFiLnNoaWZ0KClcblx0XHRcdFx0XHR0YWIucG9wKClcblx0XHRcdFx0XHRyZXR1cm4gdGFiXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzTGFzdDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IHRoaXMuZ2V0UGF0aCgpLmxlbmd0aC0xXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzRmlyc3Q6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFBhdGhJbmZvOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmdldFBhdGgoKS5zbGljZSgxLCBzY29wZS5pZHgrMSkuam9pbignLycpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0ZGF0YTE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtpdGVtczogc2NvcGUuZi5pdGVtcyB8fCB7fX1cblx0XHRcdFx0fSxcblx0XHRcdFx0aWYxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS5mLm5hbWUgIT0gJy4uJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiAhc2NvcGUuZi5pc0ltYWdlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMzogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmIHNjb3BlLmYuaXNJbWFnZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGBmYSBmYS00eCB3My10ZXh0LWJsdWUtZ3JleSAke2dldEljb25DbGFzcyhzY29wZS5mLm5hbWUpfWBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLmYuc2l6ZVxuXHRcdFx0XHRcdGxldCB1bml0ID0gJ29jdGV0cydcblx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdHVuaXQgPSAnTW8nXG5cdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzaXplID0gTWF0aC5mbG9vcihzaXplKjEwKS8xMFxuXHRcdFx0XHRcdHJldHVybiAnU2l6ZTogJyArIHNpemUgKyAnICcgKyB1bml0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Z2V0RGltZW5zaW9uOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IGQgPSBzY29wZS5mLmRpbWVuc2lvblxuXHRcdFx0XHRcdHJldHVybiBgRGltZW5zaW9uOiAke2Qud2lkdGh9eCR7ZC5oZWlnaHR9YFxuXHRcdFx0XHR9LFxuXG5cblx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoc2NvcGUuZi5tdGltZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcblx0XHRcdFx0XHRyZXR1cm4gJ0xhc3QgTW9kaWY6ICcgKyBkYXRlXG5cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRwcm9wMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogdGhpcy5uYlNlbGVjdGlvbiA9PSAwfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwcm9wMjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtkaXNhYmxlZDogdGhpcy5uYlNlbGVjdGlvbiA9PSAwIHx8IHRoaXMucm9vdERpci5zdGFydHNXaXRoKCcvc2hhcmUvJykgfHwgdGhpcy5pc1NoYXJlU2VsZWN0ZWR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHByb3AzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2Rpc2FibGVkOiAgdGhpcy5zZWxlY3RlZEZpbGVzLmxlbmd0aCA9PSAwfVxuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25QYXRoSXRlbTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBwYXRoSXRlbSA9ICQodGhpcykuZGF0YSgnaW5mbycpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUGF0aEl0ZW0nLCBwYXRoSXRlbSlcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRcdFx0XHRsb2FkRGF0YShwYXRoSXRlbSA9PSAnJyA/ICcvJyA6ICcvJyArIHBhdGhJdGVtICsgJy8nKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJlbG9hZDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblx0XHRcdFx0XHRjb25zdCB7Y21kfSA9IGRhdGFcblxuXHRcdFx0XHRcdGNvbnN0IHtyb290RGlyfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2Rvd25sb2FkJykge1xuXHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gc3J2RmlsZXMuZmlsZVVybChyb290RGlyICsgaW5mby5uYW1lKVxuXHRcdFx0XHRcdFx0JCQudXRpbC5kb3dubG9hZFVybCh1cmwsIGluZm8ubmFtZSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdyZW5hbWUnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBvbGRGaWxlTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7bGFiZWw6ICdOZXcgbmFtZScsIHRpdGxlOiAnUmVuYW1lJywgdmFsdWU6IG9sZEZpbGVOYW1lfSwgZnVuY3Rpb24obmV3RmlsZU5hbWUpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ25ld0ZpbGVOYW1lJywgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdGlmIChuZXdGaWxlTmFtZSAhPSBvbGRGaWxlTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRcdHNydkZpbGVzLnJlbmFtZUZpbGUocm9vdERpciwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdtYWtlUmVzaXplZENvcHknKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdFx0bGFiZWw6ICdSZXNjYWxlIHBlcmNlbnRhZ2U6JywgXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnTWFrZSByZXNpemVkIGNvcHknLFxuXHRcdFx0XHRcdFx0XHRhdHRyczoge21pbjogMTAsIG1heDogOTAsIHR5cGU6ICdudW1iZXInfSxcblx0XHRcdFx0XHRcdFx0dmFsdWU6IDUwXG5cdFx0XHRcdFx0XHR9LCBmdW5jdGlvbihwZXJjZW50YWdlKSB7XG5cdFx0XHRcdFx0XHRcdHNydkZpbGVzLnJlc2l6ZUltYWdlKHJvb3REaXIsIGluZm8ubmFtZSwgcGVyY2VudGFnZSsnJScpXG5cdFx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY21kID09ICdjb252ZXJ0VG9NUDMnKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5jb252ZXJ0VG9NUDMocm9vdERpciwgaW5mby5uYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbGV0ZScpIHtcblx0XHRcdFx0XHRcdGRlbGV0ZUZpbGVzKFtyb290RGlyICsgaW5mby5uYW1lXSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblxuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRyb290RGlyOiBjdHJsLm1vZGVsLnJvb3REaXIsICAgICAgICAgICAgICAgICAgICAgICBcblx0XHRcdFx0XHRcdGlzSW1hZ2U6IGluZm8uaXNJbWFnZVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmaWxlY2xpY2snLCBkYXRhKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNoZWNrQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRpZiAoaW5mby5uYW1lID09ICdzaGFyZScgJiYgY3RybC5tb2RlbC5yb290RGlyID09ICcvJykge1xuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5pc1NoYXJlU2VsZWN0ZWQgPSAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe25iU2VsZWN0aW9uOiBnZXROYlNlbEZpbGVzKCl9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZvbGRlckNsaWNrOiBmdW5jdGlvbihldikge1xuXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5maWxlc1tpZHhdXG5cblx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Gb2xkZXJDbGljaycsIGRpck5hbWUpXG5cdFx0XHRcdFx0aWYgKGRpck5hbWUgPT0gJy4uJykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc3BsaXQgPSBjdHJsLm1vZGVsLnJvb3REaXIuc3BsaXQoJy8nKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0c3BsaXQucG9wKClcblx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRsb2FkRGF0YShzcGxpdC5qb2luKCcvJykgKyAnLycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0bG9hZERhdGEoY3RybC5tb2RlbC5yb290RGlyICsgZGlyTmFtZSArICcvJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ3JlYXRlRm9sZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgcm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogJ0ZvbGRlciBuYW1lOicsIFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdOZXcgRm9sZGVyJ1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKGZvbGRlck5hbWUpIHtcblx0XHRcdFx0XHRcdHNydkZpbGVzLm1rZGlyKHJvb3REaXIgKyBmb2xkZXJOYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRvZ2xlU2VsZWN0aW9uOiBmdW5jdGlvbigpXHR7XG5cdFx0XHRcdFx0dG9nZ2xlU2VsZWN0aW9uKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe25iU2VsZWN0aW9uOiBnZXROYlNlbEZpbGVzKCl9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRGVsZXRlRmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cblx0XHRcdFx0XHRjb25zdCBzZWxGaWxlcyA9IGdldFNlbEZpbGVzKClcblxuXHRcdFx0XHRcdGlmIChzZWxGaWxlcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdEZWxldGUgZmlsZXMnLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50OiAnTm8gZmlsZXMgc2VsZWN0ZWQnXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZGVsZXRlRmlsZXMoc2VsRmlsZXMpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DdXRGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DdXRGaWxlcycpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCksXG5cdFx0XHRcdFx0XHRvcGVyYXRpb246ICdjdXQnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkNvcHlGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db3B5RmlsZXMnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBnZXRTZWxGaWxlcygpLFxuXHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY29weSdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uU2hhcmVGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25TaGFyZUZpbGVzJylcblx0XHRcdFx0XHRzcnZGaWxlcy5zaGFyZUZpbGVzKGdldFNlbEZpbGVzKCkpXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QYXN0ZUZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblBhc3RlRmlsZXMnKVxuXHRcdFx0XHRcdGNvbnN0IHtyb290RGlyLCBzZWxlY3RlZEZpbGVzLCBvcGVyYXRpb259ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdGNvbnN0IHByb21pc2UgPSBcblx0XHRcdFx0XHRcdChvcGVyYXRpb24gPT0gJ2NvcHknKSA/IHNydkZpbGVzLmNvcHlGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKSA6IHNydkZpbGVzLm1vdmVGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKVxuXG5cdFx0XHRcdFx0cHJvbWlzZVxuXHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkltcG9ydEZpbGU6IGZ1bmN0aW9uKGV2KSB7XG5cblx0XHRcdFx0XHQkJC51dGlsLm9wZW5GaWxlRGlhbG9nKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVTaXplJywgZmlsZS5zaXplIC8gMTAyNClcblx0XHRcdFx0XHRcdGlmIChmaWxlLnNpemUgPiBtYXhVcGxvYWRTaXplKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogJ0ZpbGUgdG9vIGJpZycsIHRpdGxlOiAnSW1wb3J0IGZpbGUnfSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkJC51dGlsLnJlYWRGaWxlKGZpbGUpLnRoZW4oKGJsb2IpID0+IHtcblx0XHRcdFx0XHRcdFx0c3J2RmlsZXMudXBsb2FkRmlsZShibG9iLCBmaWxlLm5hbWUsIGN0cmwubW9kZWwucm9vdERpcikudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsIHRpdGxlOiAnRXJyb3InfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZGVsZXRlRmlsZXMoZmlsZU5hbWVzKSB7XG5cdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPycsXG5cdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJ1xuXHRcdFx0fSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNydkZpbGVzLnJlbW92ZUZpbGVzKGZpbGVOYW1lcylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cdFx0XHR9KVx0XHRcdFx0XG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyKSB7XG5cdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWREYXRhJywgcm9vdERpcilcblx0XHRcdHNydkZpbGVzLmxpc3Qocm9vdERpciwge2ZpbHRlckV4dGVuc2lvbiwgaW1hZ2VPbmx5fSwgZnJpZW5kVXNlcikudGhlbihmdW5jdGlvbihmaWxlcykge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRmaWxlcy5mb3JFYWNoKChmKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGYuaXNJbWFnZSkge1xuXHRcdFx0XHRcdFx0Zi50aHVtYm5haWxVcmwgPSBzcnZGaWxlcy5maWxlVGh1bWJuYWlsVXJsKHJvb3REaXIgKyBmLm5hbWUsIHRodW1ibmFpbFNpemUsIGZyaWVuZFVzZXIpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChzaG93VG9vbGJhcikge1xuXHRcdFx0XHRcdFx0Zi5pdGVtcyA9IHtcblx0XHRcdFx0XHRcdFx0ZGVsZXRlOiB7bmFtZTogJ0RlbGV0ZScsIGljb246ICdmYXMgZmEtdHJhc2gnfSxcblx0XHRcdFx0XHRcdFx0cmVuYW1lOiB7bmFtZTogJ1JlbmFtZSd9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoZi5pc0ltYWdlKSB7XG5cdFx0XHRcdFx0XHRcdGYuaXRlbXMubWFrZVJlc2l6ZWRDb3B5ID0ge25hbWU6ICdNYWtlIHJlc2l6ZWQgY29weScsIGljb246ICdmYXMgZmEtY29tcHJlc3MtYXJyb3dzLWFsdCd9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIWYuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdGYuaXRlbXMuZG93bmxvYWQgPSB7bmFtZTogJ0Rvd25sb2FkJywgaWNvbjogJ2ZhcyBmYS1kb3dubG9hZCd9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoZi5uYW1lLmVuZHNXaXRoKCcubXA0JykpIHtcblx0XHRcdFx0XHRcdFx0Zi5pdGVtcy5jb252ZXJ0VG9NUDMgPSB7bmFtZTogJ0NvbnZlcnQgdG8gTVAzJ31cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdFxuXHRcdFx0XHRpZiAocm9vdERpciAhPSAnLycpIHtcblx0XHRcdFx0XHRmaWxlcy51bnNoaWZ0KHtuYW1lOiAnLi4nLCBmb2xkZXI6IHRydWV9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0ZmlsZXMsIFxuXHRcdFx0XHRcdHJvb3REaXIsIFxuXHRcdFx0XHRcdG5iU2VsZWN0aW9uOiAwLFxuXHRcdFx0XHRcdGlzU2hhcmVTZWxlY3RlZDogZmFsc2Vcblx0XHRcdFx0fSlcblxuXHRcdFx0fSlcdFx0XG5cdFx0fVxuXG5cdFx0bG9hZERhdGEoKVxuXG5cdFx0dGhpcy5nZXRGaWxlcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZmlsZXMuZmlsdGVyKChmKSA9PiAhZi5mb2xkZXIpXG5cdFx0fVxuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZScpXG5cdFx0XHRsb2FkRGF0YSgpXG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogJ3VwZGF0ZSgpJyxcblx0JGV2ZW50czogJ2ZpbGVjbGljaydcblxufSk7XG5cbn0pKCk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdHNob3dTZW5kTWVzc2FnZTogZmFsc2UsXG5cdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogdHJ1ZVxuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZWFjaD1cXFwiZnJpZW5kc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiIGJuLWV2ZW50PVxcXCJjbGljay53My1iYXI6IG9uSXRlbUNsaWNrLCBjbGljay5ub3RpZjogb25TZW5kTWVzc2FnZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgc3R5bGU9XFxcImN1cnNvcjogcG9pbnRlcjtcXFwiPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IG5vdGlmIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE1lc3NhZ2VcXFwiIGJuLXNob3c9XFxcInNob3dTZW5kTWVzc2FnZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXJcXFwiIGJuLWNsYXNzPVxcXCJjbGFzczFcXFwiPjwvaT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZnJpZW5kVXNlck5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcXG48cCBibi1zaG93PVxcXCJzaG93MlxcXCI+WW91IGhhdmUgbm8gZnJpZW5kczwvcD5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IHtzaG93U2VsZWN0aW9uLCBzaG93U2VuZE1lc3NhZ2UsIHNob3dDb25uZWN0aW9uU3RhdGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcmllbmRzOiBbXSxcblx0XHRcdFx0c2hvd1NlbmRNZXNzYWdlLFxuXHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZnJpZW5kcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCAkaSA9IHNjb3BlLiRpXG5cdFx0XHRcdFx0Y29uc3Qgc2hvd0Nvbm5lY3Rpb25TdGF0ZSA9IHRoaXMuc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHQndzMtdGV4dC1ncmVlbic6ICRpLmlzQ29ubmVjdGVkICYmIHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdFx0XHQndzMtdGV4dC1yZWQnOiAhJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LWJsdWUnOiAhc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5zaWJsaW5ncygnLnczLWJsdWUnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCd3My1ibHVlJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZyaWVuZGNsaWNrJywge3VzZXJOYW1lfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TZW5kTWVzc2FnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cblx0XHRcdFx0XHRjb25zdCB1c2VyTmFtZSA9ICBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XS5mcmllbmRVc2VyTmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VuZE1lc3NhZ2UnLCB1c2VyTmFtZSlcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTWVzc2FnZScsIGxhYmVsOiAnTWVzc2FnZTonfSwgZnVuY3Rpb24odGV4dCkge1xuXHRcdFx0XHRcdFx0dXNlcnMuc2VuZE5vdGlmKHVzZXJOYW1lLCB7dGV4dCwgcmVwbHk6IHRydWV9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiBvblVwZGF0ZShtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHtpc0Nvbm5lY3RlZCwgdXNlck5hbWV9ID0gbXNnLmRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZyaWVuZHMuZmluZCgoZnJpZW5kKSA9PiB7cmV0dXJuIGZyaWVuZC5mcmllbmRVc2VyTmFtZSA9PSB1c2VyTmFtZX0pXG5cdFx0XHRpbmZvLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWRcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBpZHggPSBlbHQuZmluZCgnbGkudzMtYmx1ZScpLmluZGV4KCk7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzW2lkeF1cblx0XHR9XG5cblx0XHR0aGlzLmdldEZyaWVuZHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHMubWFwKChmcmllbmQpID0+IGZyaWVuZC5mcmllbmRVc2VyTmFtZSlcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dXNlcnMuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tmcmllbmRzXSBkaXNwb3NlJylcblx0XHRcdGJyb2tlci51bnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cdFx0fVxuXG5cblx0XHR0aGlzLnVwZGF0ZSgpXG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTpzdHJpbmc7XG5cdFx0Z2V0RnJpZW5kcygpOltzdHJpbmddXG5cdGAsXG5cblx0JGV2ZW50czogJ2ZyaWVuZGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5mcmllbmRzUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZyaWVuZHNcXFwiIFxcblx0ZGF0YS1zaG93LXNlbGVjdGlvbj1cXFwidHJ1ZVxcXCJcXG5cdGJuLWlmYWNlPVxcXCJmcmllbmRzXFxcIlxcblx0PjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0YnV0dG9uczogW1xuXHRcdHtuYW1lOiAnY2FsbCcsIGljb246ICdmYSBmYS1jaGVjayd9XG5cdF0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQpXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oY21kKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRjb25zdCBzZWxlY3Rpb24gPSBjdHJsLnNjb3BlLmZyaWVuZHMuZ2V0U2VsZWN0aW9uKClcblx0XHRcdGlmIChzZWxlY3Rpb24gPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgZnJpZW5kJ30pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3Qge2ZyaWVuZFVzZXJOYW1lLCBpc0Nvbm5lY3RlZH0gPSBzZWxlY3Rpb25cblx0XHRcdGNvbnNvbGUubG9nKCd1c2VyTmFtZScsIGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0aWYgKCFpc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLCBcblx0XHRcdFx0XHRjb250ZW50OiBgVXNlciA8c3Ryb25nPiR7ZnJpZW5kVXNlck5hbWV9PC9zdHJvbmc+IGlzIG5vdCBjb25uZWN0ZWRgXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoZnJpZW5kVXNlck5hbWUpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cbn0pIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmhvbWUnLCB7XG5cblx0ZGVwczogW1xuXHRcdCdicmVpemJvdC5icm9rZXInLFxuXHRcdCdicmVpemJvdC51c2VycycsXG5cdFx0J2JyZWl6Ym90LnJ0YycsXG5cdFx0J2JyZWl6Ym90LmFwcHMnLFxuXHRcdCdicmVpemJvdC5zY2hlZHVsZXInXG5cdF0sXG5cblx0cHJvcHM6IHtcblx0XHR1c2VyTmFtZTogJ1Vua25vd24nXG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiaGVhZGVyIHczLXRlYWxcXFwiPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRnVsbFNjcmVlblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkZ1bGxTY3JlZW5cXFwiIGJuLXNob3c9XFxcIiFmdWxsU2NyZWVuXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkNvbm5lY3Rpb24gU3RhdHVzXFxcIj5cXG5cdFx0XHQ8aSBibi1jbGFzcz1cXFwie3czLXRleHQtZ3JlZW46IGNvbm5lY3RlZCwgdzMtdGV4dC1yZWQ6ICFjb25uZWN0ZWR9XFxcIiBjbGFzcz1cXFwiZmEgZmEtY2lyY2xlXFxcIj48L2k+XFxuXHRcdFx0XFxuXHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcImhhc0luY29taW5nQ2FsbFxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ2FsbFJlc3BvbnNlXFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsIFxcblx0XHRcdFx0dGl0bGU6IGNhbGxJbmZvLmZyb20sXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRhY2NlcHQ6IHtuYW1lOiBcXCdBY2NlcHRcXCd9LFxcblx0XHRcdFx0XHRkZW55OiB7bmFtZTogXFwnRGVjbGluZVxcJ30sXFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCJcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2FsbEluZm8uaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cXG48IS0tIFx0PHN0cm9uZyBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zdHJvbmc+XFxuIC0tPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWZpY2F0aW9uIHczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIk5vdGlmaWNhdGlvblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLWJlbGwgdzMtdGV4dC13aGl0ZVxcXCIgPjwvaT5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYmFkZ2UgdzMtcmVkIHczLXRpbnlcXFwiIGJuLXRleHQ9XFxcIm5iTm90aWZcXFwiIGJuLXNob3c9XFxcImhhc05vdGlmXFxcIj48L3NwYW4+XHRcdFx0XFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdHB3ZDoge25hbWU6IFxcJ0NoYW5nZSBwYXNzd29yZFxcJywgaWNvbjogXFwnZmFzIGZhLWxvY2tcXCd9LFxcblx0XHRcdFx0XHRhcHBzOiB7bmFtZTogXFwnQXBwbGljYXRpb25zXFwnLCBpY29uOiBcXCdmYXMgZmEtdGhcXCd9LFxcblx0XHRcdFx0XHRzZXA6IFxcJy0tLS0tLVxcJyxcXG5cdFx0XHRcdFx0bG9nb3V0OiB7bmFtZTogXFwnTG9nb3V0XFwnLCBpY29uOiBcXCdmYXMgZmEtcG93ZXItb2ZmXFwnfVxcblx0XHRcdFx0fSxcXG5cdFx0XHRcdHRpdGxlOiB1c2VyTmFtZSxcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCdcXG5cdFx0XHR9XFxcIiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29udGV4dE1lbnVcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgZmEtbGdcXFwiPjwvaT5cXG48IS0tIFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidXNlck5hbWVcXFwiPjwvc3Bhbj5cdFxcbiAtLT5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1kb3duIGZhLWxnXFxcIj48L2k+XFxuICAgIFx0XFxuXHRcdDwvZGl2Plxcblx0XHRcXG5cdDwvZGl2Plxcblxcblx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnRhYnNcXFwiIFxcblx0Y2xhc3M9XFxcImNvbnRlbnRcXFwiIFxcblx0Ym4taWZhY2U9XFxcInRhYnNcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcInRhYnNyZW1vdmU6IG9uVGFiUmVtb3ZlLCB0YWJzYWN0aXZhdGU6IG9uVGFiQWN0aXZhdGVcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBcXG5cdFx0Ym4tZGF0YT1cXFwie2FwcHM6IGdldE15QXBwc31cXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGlja1xcXCJcXG5cdFx0dGl0bGU9XFxcIkhvbWVcXFwiIFxcblx0XHQ+XHRcdFxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlciwgdXNlcnMsIHJ0Yywgc3J2QXBwcywgc2NoZWR1bGVyKSB7XG5cblx0XHRmdW5jdGlvbiBjcmVhdGVBdWRpbygpIHtcblx0XHRcdGxldCBhdWRpbyA9IG51bGxcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHBsYXk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2F1ZGlvIHBsYXknKVxuXHRcdFx0XHRcdGF1ZGlvID0gbmV3IEF1ZGlvKCcvYXNzZXRzL3NreXBlLm1wMycpXG5cdFx0XHRcdFx0YXVkaW8ubG9vcCA9IHRydWVcdFxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge2F1ZGlvLnBsYXkoKX0sIDEwMClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRzdG9wOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBzdG9wJylcblx0XHRcdFx0XHRpZiAoYXVkaW8gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhdWRpbyA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ0Yy5wcm9jZXNzQ2FsbCgpXG5cdFx0XG5cdFx0cnRjLm9uKCdjYWxsJywgZnVuY3Rpb24oY2FsbEluZm8pIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiB0cnVlLCBjYWxsSW5mb30pXG5cdFx0XHRhdWRpby5wbGF5KClcblx0XHR9KVxuXG5cdFx0cnRjLm9uKCdjYW5jZWwnLCBmdW5jdGlvbigpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiBmYWxzZX0pXG5cdFx0XHRhdWRpby5zdG9wKClcblx0XHR9KVx0XHRcblxuXHRcdGNvbnN0IHt1c2VyTmFtZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBhdWRpbyA9IGNyZWF0ZUF1ZGlvKClcblx0XG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiBbXSxcblx0XHRcdFx0dXNlck5hbWUsXG5cdFx0XHRcdG5iTm90aWY6IDAsXG5cdFx0XHRcdGhhc0luY29taW5nQ2FsbDogZmFsc2UsXG5cdFx0XHRcdGNhbGxJbmZvOiBudWxsLFxuXHRcdFx0XHRmdWxsU2NyZWVuOiBmYWxzZSxcblx0XHRcdFx0Y29ubmVjdGVkOiBmYWxzZSxcblx0XHRcdFx0aGFzTm90aWY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm5iTm90aWYgPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldE15QXBwczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXBwcy5maWx0ZXIoKGEpID0+IGEuYWN0aXZhdGVkKVxuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BcHBDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0b3BlbkFwcChkYXRhLmFwcE5hbWUpXG5cblx0XHRcdFx0fSxcdFx0XHRcdFxuXHRcdFx0XHRvbkNvbnRleHRNZW51OiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2xvZ291dCcpIHtcblx0XHRcdFx0XHRcdGxvZ291dCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnYXBwcycpIHtcblx0XHRcdFx0XHRcdG9wZW5BcHAoJ3N0b3JlJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdwd2QnKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ0NoYW5nZSBQYXNzd29yZCcsIGxhYmVsOiAnTmV3IFBhc3N3b3JkOid9LCBmdW5jdGlvbihuZXdQd2QpIHtcblx0XHRcdFx0XHRcdFx0dXNlcnMuY2hhbmdlUHdkKG5ld1B3ZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0NoYW5nZSBQYXNzd29yZCcsIGNvbnRlbnQ6ICdQYXNzd29yZCBoYXMgYmVlbiBjaGFuZ2VkJ30pXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5vdGlmaWNhdGlvbjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Ob3RpZmljYXRpb24nKVxuXHRcdFx0XHRcdGlmIChjdHJsLm1vZGVsLm5iTm90aWYgPT0gMCkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtjb250ZW50OiAnbm8gbm90aWZpY2F0aW9ucycsIHRpdGxlOiAnTm90aWZpY2F0aW9ucyd9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdG9wZW5BcHAoJ25vdGlmJylcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCB7Y21kfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsUmVzcG9uc2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiBmYWxzZX0pXG5cdFx0XHRcdFx0YXVkaW8uc3RvcCgpXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnYWNjZXB0Jykge1x0XG5cdFx0XHRcdFx0XHRjb25zdCB7ZnJvbSwgYXBwTmFtZX0gPSBjdHJsLm1vZGVsLmNhbGxJbmZvXG5cdFx0XHRcdFx0XHRvcGVuQXBwKGFwcE5hbWUsIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGVyOiBmcm9tLFxuXHRcdFx0XHRcdFx0XHRjbGllbnRJZDogcnRjLmdldFJlbW90ZUNsaWVudElkKClcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZ1bGxTY3JlZW46IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRnVsbFNjcmVlbicpXG5cdFx0XHRcdFx0Y29uc3QgZWxlbSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuXHRcdFx0XHRcdGNvbnN0IHJlcXVlc3RGdWxsc2NyZWVuID0gZWxlbS5yZXF1ZXN0RnVsbHNjcmVlbiB8fFxuXHRcdFx0XHRcdFx0ZWxlbS53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlblxuXG5cdFx0XHRcdFx0aWYgKHJlcXVlc3RGdWxsc2NyZWVuKSB7XG5cdFx0XHRcdFx0XHRyZXF1ZXN0RnVsbHNjcmVlbi5jYWxsKGVsZW0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRhYlJlbW92ZTogZnVuY3Rpb24oZXYsIGlkeCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblRhYlJlbW92ZScsIGlkeClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5zY29wZS50YWJzLmdldFRhYkluZm8oaWR4KVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcEV4aXQoKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUudGFicy5yZW1vdmVUYWIoaWR4KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRhYkFjdGl2YXRlOiBmdW5jdGlvbihldiwgdWkpIHtcdFxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblRhYkFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB7bmV3VGFiLCBvbGRUYWJ9ID0gdWlcblx0XHRcdFx0XHRjb25zdCBuZXdUYWJJZHggPSBuZXdUYWIuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IG9sZFRhYklkeCA9IG9sZFRhYi5pbmRleCgpXG5cdFx0XHRcdFx0aWYgKG9sZFRhYklkeCA+IDApIHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLnNjb3BlLnRhYnMuZ2V0VGFiSW5mbyhvbGRUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwuc2NvcGUudGFicy5nZXRUYWJJbmZvKG5ld1RhYklkeClcblx0XHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwUmVzdW1lKClcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG5ld1RhYklkeCA9PSAwKSB7XG5cdFx0XHRcdFx0XHRsb2FkQXBwKClcblx0XHRcdFx0XHR9XG5cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ3ZWJraXRmdWxsc2NyZWVuY2hhbmdlXCIsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0ICBjb25zb2xlLmxvZygnZnVsbHNjcmVlbmNoYW5nZScsIGV2KVxuXHRcdCAgY3RybC5zZXREYXRhKHtmdWxsU2NyZWVuOiAhY3RybC5tb2RlbC5mdWxsU2NyZWVufSlcblx0XHR9KVxuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImZ1bGxzY3JlZW5jaGFuZ2VcIiwgZnVuY3Rpb24oZXYpIHtcblx0XHQgIGNvbnNvbGUubG9nKCdmdWxsc2NyZWVuY2hhbmdlJywgZXYpXG5cdFx0ICBjdHJsLnNldERhdGEoe2Z1bGxTY3JlZW46ICFjdHJsLm1vZGVsLmZ1bGxTY3JlZW59KVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiB1cGRhdGVOb3RpZnMobmJOb3RpZikge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtuYk5vdGlmfSlcblx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIub24oJ2Nvbm5lY3RlZCcsIChzdGF0ZSkgPT4ge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtjb25uZWN0ZWQ6IHN0YXRlfSlcblx0XHR9KVxuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXYpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdbaG9tZV0gbWVzc2FnZScsIGV2LmRhdGEpXG5cdFx0XHRjb25zdCB7dHlwZSwgZGF0YX0gPSBldi5kYXRhXG5cdFx0XHRpZiAodHlwZSA9PSAnb3BlbkFwcCcpIHtcblx0XHRcdFx0Y29uc3Qge2FwcE5hbWUsIGFwcFBhcmFtc30gPSBkYXRhXG5cdFx0XHRcdG9wZW5BcHAoYXBwTmFtZSwgYXBwUGFyYW1zKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fSwgZmFsc2UpXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcyhtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LmxvZ291dCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0bG9jYXRpb24uaHJlZiA9ICcvbG9nb3V0J1xuXHRcdH0pXG5cblxuXHRcdGZ1bmN0aW9uIGdldEFwcFVybChhcHBOYW1lLCBwYXJhbXMpIHtcblx0XHRcdHJldHVybiAkJC51dGlsLmdldFVybFBhcmFtcyhgL2FwcHMvJHthcHBOYW1lfWAsIHBhcmFtcylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvcGVuQXBwKGFwcE5hbWUsIHBhcmFtcykge1xuXHRcdFx0Y29uc3QgYXBwSW5mbyA9IGN0cmwubW9kZWwuYXBwcy5maW5kKChhKSA9PiBhLmFwcE5hbWUgPT0gYXBwTmFtZSlcblx0XHRcdGNvbnN0IHRpdGxlID0gYXBwSW5mby5wcm9wcy50aXRsZVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnYXBwSW5mbycsIGFwcEluZm8pXG5cdFx0XHRjb25zb2xlLmxvZygnb3BlbkFwcCcsIGFwcE5hbWUsIHBhcmFtcylcblx0XHRcdGxldCBpZHggPSBjdHJsLnNjb3BlLnRhYnMuZ2V0VGFiSW5kZXhGcm9tVGl0bGUodGl0bGUpXG5cdFx0XHRjb25zdCBhcHBVcmwgPSBnZXRBcHBVcmwoYXBwTmFtZSwgcGFyYW1zKVxuXHRcdFx0aWYgKGlkeCA8IDApIHsgLy8gYXBwcyBub3QgYWxyZWFkeSBydW5cblx0XHRcdFx0aWR4ID0gY3RybC5zY29wZS50YWJzLmFkZFRhYih0aXRsZSwge1xuXHRcdFx0XHRcdHJlbW92YWJsZTogdHJ1ZSxcblx0XHRcdFx0XHRjb250cm9sOiAnYnJlaXpib3QuYXBwVGFiJyxcblx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0YXBwVXJsXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLnNjb3BlLnRhYnMuZ2V0VGFiSW5mbyhpZHgpXG5cdFx0XHRcdGlmIChwYXJhbXMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uuc2V0QXBwVXJsKGFwcFVybClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNjb3BlLnRhYnMuc2V0U2VsZWN0ZWRUYWJJbmRleChpZHgpXG5cblx0XHR9XG5cblx0XHR1c2Vycy5nZXROb3RpZkNvdW50KCkudGhlbih1cGRhdGVOb3RpZnMpXG5cblx0XHRmdW5jdGlvbiBsb2FkQXBwKCkge1xuXHRcdFx0c3J2QXBwcy5saXN0QWxsKCkudGhlbigoYXBwcykgPT4ge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRhcHBzXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXG5cdFx0ZnVuY3Rpb24gbG9nb3V0KCkge1x0XHRcdFxuXHRcdFx0c2NoZWR1bGVyLmxvZ291dCgpXG5cdFx0fVxuXG5cdFx0bG9hZEFwcCgpXHRcblx0XHRcblxuXHR9XG59KTtcbiIsIlxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnBhZ2VyJywge1xuXG5cdHByb3BzOiB7XG5cdFx0cm9vdFBhZ2U6ICcnXG5cdH0sXG5cdHRlbXBsYXRlOiBcIjxkaXYgc3R5bGU9XFxcImRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGhlaWdodDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjtcXFwiPlxcblx0XFxuXHQ8ZGl2IGJuLXNob3c9XFxcInNob3dCYWNrXFxcIiBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiIHN0eWxlPVxcXCJkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQmFja1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkJhY2tcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1sZWZ0XFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHQ8ZGl2IGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L2Rpdj5cXG5cdFx0PGRpdiBibi1lYWNoPVxcXCJidXR0b25zXFxcIiBibi1ldmVudD1cXFwiY2xpY2suYWN0aW9uOiBvbkFjdGlvblxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cxXFxcIiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b24gYWN0aW9uXFxcIiBcXG5cdFx0XHRcdGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sYWJlbFxcXCIgXFxuXHRcdFx0XHRibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiXFxuXHRcdFx0XHQ+PC9idXR0b24+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cyXFxcIiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b24gYWN0aW9uXFxcIiBcXG5cdFx0XHRcdGJuLWRhdGE9XFxcIntjbWQ6ICRzY29wZS4kaS5uYW1lfVxcXCJcXG5cdFx0XHRcdGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLnRpdGxlfVxcXCJcXG5cdFx0XHRcdD48aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS4kaS5pY29ufVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1iaW5kPVxcXCJjb250ZW50XFxcIiBzdHlsZT1cXFwiZmxleDogMTsgb3ZlcmZsb3c6IGhpZGRlbjtcXFwiPjwvZGl2PlxcblxcbjwvZGl2PlxcblwiLFxuXG5cdCRpZmFjZTogYHBvcFBhZ2UoZGF0YSk7cHVzaFBhZ2UoY3RybE5hbWUsIG9wdGlvbnMpYCxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHtyb290UGFnZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHNob3dCYWNrOiBmYWxzZSxcblx0XHRcdFx0dGl0bGU6ICcnLFxuXHRcdFx0XHRidXR0b25zOiBbXSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmljb24gPT0gdW5kZWZpbmVkICYmICEoc2NvcGUuJGkudmlzaWJsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pY29uICE9IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQmFjazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkJhY2snKVxuXHRcdFx0XHRcdHJlc3RvcmVQYWdlKHRydWUpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWN0aW9uOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRjb25zdCBwYWdlQ3RybElmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdFx0XHRjb25zdCBmbiA9IGN1ckluZm8uYnV0dG9uc1tjbWRdLm9uQ2xpY2tcblx0XHRcdFx0XHRpZiAodHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdGZuLmNhbGwocGFnZUN0cmxJZmFjZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIHBhZ2VDdHJsSWZhY2Uub25BY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0cGFnZUN0cmxJZmFjZS5vbkFjdGlvbihjbWQpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjdHJsLnNjb3BlLmNvbnRlbnRcblx0XHRjb25zdCBzdGFjayA9IFtdXG5cdFx0bGV0IGN1ckluZm8gPSBudWxsXG5cblxuXHRcdGZ1bmN0aW9uIHJlc3RvcmVQYWdlKGlzQmFjaywgZGF0YSkge1xuXHRcdFx0XG5cdFx0XHRjb25zdCBpZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdwb3BQYWdlJywgcGFnZUN0cmwpXG5cdFx0XHRpZiAodHlwZW9mIGlmYWNlLmRpc3Bvc2UgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRpZmFjZS5kaXNwb3NlKClcblx0XHRcdH1cblx0XHRcdGN1ckluZm8uY3RybC5zYWZlRW1wdHkoKS5yZW1vdmUoKVxuXHRcdFx0aWYgKGlzQmFjaykge1xuXHRcdFx0XHRpZiAodHlwZW9mIGN1ckluZm8ub25CYWNrID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjdXJJbmZvLm9uQmFjaygpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBjdXJJbmZvLm9uUmV0dXJuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Y3VySW5mby5vblJldHVybihkYXRhKVxuXHRcdFx0fVxuXG5cdFx0XHRjdXJJbmZvID0gc3RhY2sucG9wKClcdFx0XHRcblx0XHRcdGN1ckluZm8uY3RybC5zaG93KClcblx0XHRcdGNvbnN0IHt0aXRsZSwgYnV0dG9uc30gPSBjdXJJbmZvXG5cdFx0XHRjdHJsLnNldERhdGEoe3Nob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJyl9KVxuXG5cdFx0fVxuXG5cdFx0dGhpcy5wb3BQYWdlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0cmV0dXJuIHJlc3RvcmVQYWdlKGZhbHNlLCBkYXRhKVxuXHRcdH1cblxuXHRcdHRoaXMucHVzaFBhZ2UgPSBmdW5jdGlvbihjdHJsTmFtZSwgb3B0aW9ucykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBwdXNoUGFnZScsIGN0cmxOYW1lLCBvcHRpb25zKVxuXG5cblx0XHRcdGlmIChjdXJJbmZvICE9IG51bGwpIHtcblx0XHRcdFx0Y3VySW5mby5jdHJsLmhpZGUoKVxuXHRcdFx0XHRzdGFjay5wdXNoKGN1ckluZm8pXG5cdFx0XHR9XG5cblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cblx0XHRcdGxldCBidXR0b25zID0ge31cblxuXHRcdFx0aWYgKG9wdGlvbnMuYnV0dG9ucyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0YnV0dG9ucyA9IG9wdGlvbnMuYnV0dG9uc1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGRlc2MgPSAkJC5jb250cm9sLmdldENvbnRyb2xJbmZvKGN0cmxOYW1lKVxuXHRcdFx0XHRpZiAoZGVzYy5vcHRpb25zLmJ1dHRvbnMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0YnV0dG9ucyA9IGRlc2Mub3B0aW9ucy5idXR0b25zXG5cdFx0XHRcdH1cblx0XG5cdFx0XHR9XG5cblx0XHRcdGxldCB7dGl0bGUsIHByb3BzLCBvblJldHVybiwgb25CYWNrLCBldmVudHN9ID0gb3B0aW9uc1xuXG5cdFx0XHRjdXJJbmZvID0ge3RpdGxlLCBidXR0b25zLCBvblJldHVybiwgb25CYWNrfVxuXG5cdFx0XHRjdXJJbmZvLmN0cmwgPSBjb250ZW50LmFkZENvbnRyb2woY3RybE5hbWUsICQuZXh0ZW5kKHskcGFnZXI6IHRoaXN9LCBwcm9wcyksIGV2ZW50cylcblxuXHRcdFx0Y3RybC5zZXREYXRhKHtzaG93QmFjazogc3RhY2subGVuZ3RoID4gMCwgdGl0bGUsIGJ1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpfSlcblx0XHR9XHRcblxuXHRcdHRoaXMuc2V0QnV0dG9uVmlzaWJsZSA9IGZ1bmN0aW9uKGJ1dHRvbnNWaXNpYmxlKSB7XG5cblx0XHRcdGNvbnN0IHtidXR0b25zfSA9IGN1ckluZm9cblxuXHRcdFx0Zm9yKGxldCBidG4gaW4gYnV0dG9uc1Zpc2libGUpIHtcblx0XHRcdFx0aWYgKGJ0biBpbiBidXR0b25zKSB7XG5cdFx0XHRcdFx0YnV0dG9uc1tidG5dLnZpc2libGUgPSBidXR0b25zVmlzaWJsZVtidG5dXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdCBcdFx0XHRcdFxuXHRcdFx0Y3RybC5zZXREYXRhKHtidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKX0pXG5cdFx0fVxuXG5cblx0XHR0aGlzLnB1c2hQYWdlKHJvb3RQYWdlKVxuXG5cdH1cblxufSk7XG5cblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnBkZicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwid2FpdFxcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPiBSZW5kZXJpbmcuLi5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1zaG93PVxcXCIhd2FpdFxcXCI+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIkZpdFxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkZpdFxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdDwvZGl2Plxcblx0PGRpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwicGFnZXNcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJwcmV2aW91cyBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJldlBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFxcblxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIm5leHQgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5leHRQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1yaWdodFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdj5cXG5cdFx0XHRQYWdlczogPHNwYW4gYm4tdGV4dD1cXFwiY3VycmVudFBhZ2VcXFwiPjwvc3Bhbj4gLyA8c3BhbiBibi10ZXh0PVxcXCJudW1QYWdlc1xcXCI+PC9zcGFuPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cdFxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5wZGZcXFwiIFxcblx0Ym4tZGF0YT1cXFwie3dvcmtlcjogXFwnL2JyYWluanMvcGRmL3dvcmtlci5qc1xcJ31cXFwiXFxuXHRibi1pZmFjZT1cXFwicGRmXFxcIlxcblx0IFxcbj48L2Rpdj5cdFx0XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHR1cmw6ICcnXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFx0XG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0Y29uc3Qge3VybH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG51bVBhZ2VzOiAwLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGN1cnJlbnRQYWdlOiAxLFxuXHRcdFx0XHR3YWl0OiBmYWxzZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm51bVBhZ2VzID4gMSAmJiAhdGhpcy53YWl0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25OZXh0UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5leHRQYWdlJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3dhaXQ6IHRydWV9KVxuXHRcdFx0XHRcdGN0cmwuc2NvcGUucGRmLm5leHRQYWdlKCkudGhlbigoY3VycmVudFBhZ2UpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QcmV2UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHt3YWl0OiB0cnVlfSlcblx0XHRcdFx0XHRjdHJsLnNjb3BlLnBkZi5wcmV2UGFnZSgpLnRoZW4oKGN1cnJlbnRQYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2N1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZX0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjdHJsLnNjb3BlLnBkZi5maXQoKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbGUodXJsLCB0aXRsZSkge1xuXG5cdFx0XHRjdHJsLnNldERhdGEoe3dhaXQ6IHRydWV9KVxuXG5cdFx0XHRjdHJsLnNjb3BlLnBkZi5vcGVuRmlsZSh1cmwpLnRoZW4oKG51bVBhZ2VzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIGxvYWRlZCcpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0bnVtUGFnZXMsXG5cdFx0XHRcdFx0d2FpdDogZmFsc2Vcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0aWYgKHVybCAhPSAnJykge1xuXHRcdFx0b3BlbkZpbGUodXJsKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0b3BlbkZpbGUoZGF0YS51cmwpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0c2V0RGF0YSh7dXJsfSlcblx0YFxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhcHBOYW1lOiAnJyxcblx0XHRpY29uQ2xzOiAnJyxcblx0XHR0aXRsZTogJ1NlbGVjdCBhIGZyaWVuZCdcblx0fSxcblxuXHQvL3RlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHRcdDxwPkRpc3RhbnQ6IDxzdHJvbmcgYm4tdGV4dD1cXFwiZGlzdGFudFxcXCI+PC9zdHJvbmc+PC9wPlx0XHRcdFx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtcmVkXFxcIj5TdG9wPC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2FwcE5hbWUsIGljb25DbHMsIHRpdGxlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0ICRjaGlsZHJlbiA9IGVsdC5jaGlsZHJlbigpLnJlbW92ZSgpXG5cdFx0ZWx0LmFwcGVuZChcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHRcdDxwPkRpc3RhbnQ6IDxzdHJvbmcgYm4tdGV4dD1cXFwiZGlzdGFudFxcXCI+PC9zdHJvbmc+PC9wPlx0XHRcdFx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtcmVkXFxcIj5TdG9wPC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiKVxuXG5cdFx0cnRjLm9uKCdzdGF0dXMnLCAoZGF0YSkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc3RhdHVzJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YShkYXRhKVxuXHRcdH0pXHRcdFxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzdGF0dXM6ICdyZWFkeScsXG5cdFx0XHRcdGRpc3RhbnQ6ICcnLFxuXHRcdFx0XHRoYXNDaGlsZHJlbjogJGNoaWxkcmVuLmxlbmd0aCA+IDAsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHsgXG5cdFx0XHRcdFx0cmV0dXJuIFsncmVhZHknLCAnZGlzY29ubmVjdGVkJywgJ3JlZnVzZWQnLCAnY2FuY2VsZWQnXS5pbmNsdWRlcyh0aGlzLnN0YXR1cylcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY2FsbGluZyd9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnfSxcblx0XHRcdFx0c2hvdzQ6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJyAmJiB0aGlzLmhhc0NoaWxkcmVufVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNhbGw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsbCcpXG5cblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kc1BhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbih1c2VyTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRydGMuY2FsbCh1c2VyTmFtZSwgYXBwTmFtZSwgaWNvbkNscylcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbmNlbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuY2FuY2VsKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25IYW5ndXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmJ5ZSgpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ3J0Y2hhbmd1cCcpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjdHJsLnNjb3BlLnBhbmVsLmFwcGVuZCgkY2hpbGRyZW4pXHRcdFxuXHR9XG5cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hZGRVc2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlVzZXJOYW1lPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJ1c2VybmFtZVxcXCIgbmFtZT1cXFwidXNlcm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Qc2V1ZG88L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInBzZXVkb1xcXCIgbmFtZT1cXFwicHNldWRvXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+TG9jYXRpb248L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcImxvY2F0aW9uXFxcIiBuYW1lPVxcXCJsb2NhdGlvblxcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBwbGFjZWhvbGRlcj1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiByZXF1aXJlZD5cdFxcblx0PC9kaXY+XFxuXHRcXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bGFiZWw6ICdDcmVhdGUnLCBuYW1lOiAnY3JlYXRlJ31cblx0XSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdG9uQWN0aW9uKGNtZClcblx0YFxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QudXNlcnMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvblVwZGF0ZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiVXBkYXRlXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXJlZG9cXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlx0XFxuXHQ8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRVc2VyXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWUgYnRuQWRkVXNlclxcXCIgdGl0bGU9XFxcIkFkZCBVc2VyXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLXNtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHIgY2xhc3M9XFxcInczLWdyZWVuXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRoPlVzZXIgTmFtZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Qc2V1ZG88L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TG9jYXRpb248L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RW1haWw8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+Q3JlYXRlIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TGFzdCBMb2dpbiBEYXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImRhdGFcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5kZWxldGU6IG9uRGVsZXRlLCBjbGljay5ub3RpZjogb25Ob3RpZlxcXCI+XFxuICBcdFx0XHQ8dHI+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnVzZXJuYW1lXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5wc2V1ZG9cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmxvY2F0aW9uXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5lbWFpbFxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCA+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInRleHQxXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tc2hvdz1cXFwic2hvdzJcXFwiPlxcblxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInRleHQyXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0XHRcdGF0IFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcInRleHQzXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDwvc3Bhbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0XHQ8dGQ+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcImRlbGV0ZSB3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZSBVc2VyXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VuZCBOb3RpZmljYXRpb25cXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1iZWxsXFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHQ8L3RyPiAgICAgIFx0XFxuXFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2Vycykge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuJGkuY3JlYXRlRGF0ZSkudG9Mb2NhbGVEYXRlU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRleHQyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5sYXN0TG9naW5EYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDM6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlVGltZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuY3JlYXRlRGF0ZSAhPSB1bmRlZmluZWRcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkVXNlcjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBVc2VyJyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0dXNlcnMuYWRkKGRhdGEpLnRoZW4oZ2V0VXNlcnMpXG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7dXNlcm5hbWV9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7dGl0bGU6ICdEZWxldGUgVXNlcicsIGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPyd9LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnJlbW92ZSh1c2VybmFtZSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5vdGlmOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qge3VzZXJuYW1lfSA9IGN0cmwubW9kZWwuZGF0YVtpZHhdXG5cdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE5vdGlmaWNhdGlvbicsIGxhYmVsOiAnTWVzc2FnZSd9LCBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHRcdFx0XHR1c2Vycy5zZW5kTm90aWYodXNlcm5hbWUsIHt0ZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVwZGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Z2V0VXNlcnMoKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZ2V0VXNlcnMoKSB7XG5cdFx0XHR1c2Vycy5saXN0KCkudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZGF0YX0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGdldFVzZXJzKClcblxuXG5cblx0fVxuXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC52aWV3ZXInLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4taWY9XFxcImlmMVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwiaW1hZ2VcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmltYWdlXFxcIiBcXG5cdFx0Ym4tZGF0YT1cXFwie3NyYzogdXJsfVxcXCIgXFxuXHRcdFxcblx0XHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpZjJcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcInBkZlxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnBkZlxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInt1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaWYzXFxcIiBjbGFzcz1cXFwiYXVkaW9cXFwiPlxcblx0PGF1ZGlvIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiIGNvbnRyb2xzPVxcXCJcXFwiIGNvbnRyb2xzTGlzdD1ub2Rvd25sb2FkPjwvYXVkaW8+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaWY0XFxcIiBjbGFzcz1cXFwidmlkZW9cXFwiPlxcblx0PHZpZGVvIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiIGNvbnRyb2xzPVxcXCJcXFwiIGNvbnRyb2xzTGlzdD1ub2Rvd25sb2FkPjwvdmlkZW8+XFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHR0eXBlOiAnJyxcblx0XHR1cmw6ICcjJ1xuXHR9LFxuXHRcblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0bGV0IHt0eXBlLCB1cmx9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1cmwsXG5cdFx0XHRcdHR5cGUsXG5cdFx0XHRcdGlmMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnaW1hZ2UnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlmMjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAncGRmJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2F1ZGlvJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpZjQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3ZpZGVvJ1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gcmVtb3ZlKGZ1bGxOYW1lLCBjYWxsYmFjaykge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tWaWV3ZXJdIHJlbW92ZScsIHtmdWxsTmFtZX0pXG5cblx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ1JlbW92ZSBmaWxlJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmaWxlcy5yZW1vdmVGaWxlcyhbZnVsbE5hbWVdKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGNhbGxiYWNrKClcblx0XHRcdFx0fSlcblx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzYXZlKGRlc3RQYXRoLCBmaWxlTmFtZSwgY2FsbGJhY2spIHtcdFx0XHRcblx0XHRcdGNvbnNvbGUubG9nKCdbVmlld2VyXSBzYXZlJywge2Rlc3RQYXRoLCBmaWxlTmFtZX0pXG5cdFx0XHRpZiAoY3RybC5tb2RlbC51cmwgPT0gJycpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ0ZpbGUgbm90IGxvYWRlZCwgcGxlYXNlIHdhaXQnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCBibG9iID0gJCQudXRpbC5kYXRhVVJMdG9CbG9iKGN0cmwubW9kZWwudXJsKVxuXHRcdFx0ZmlsZXMudXBsb2FkRmlsZShibG9iLCBmaWxlTmFtZSwgZGVzdFBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdGNhbGxiYWNrKClcblx0XHRcdH0pXHRcblx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHRcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XHRcdFxuXG5cdFx0dGhpcy5yZW1vdmUgPSByZW1vdmVcblx0XHR0aGlzLnNhdmUgPSBzYXZlXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbVmlld2VyXSBzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCkge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3VybDogZGF0YS51cmx9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRyZW1vdmUoZnVsbE5hbWUsIGNhbGxiYWNrKTtcblx0XHRzYXZlKGRlc3RQYXRoLCBmaWxlTmFtZSwgY2FsbGJhY2spXG5cdFx0YFxuXG59KTtcblxuXG5cblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcERhdGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdGxldCBfZGF0YSA9IGNvbmZpZ1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldERhdGE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gX2RhdGFcblx0XHRcdH0sXG5cblx0XHRcdHNhdmVEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdF9kYXRhID0gZGF0YVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2FwcERhdGEnLCBkYXRhKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldERhdGEoKTpEYXRhO1xuXHRcdHNhdmVEYXRhKGRhdGEpOlByb21pc2UgXG5cdFx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3RBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRsaXN0QWxsKCk6UHJvbWlzZTtcblx0XHRgXG59KTtcbiIsIihmdW5jdGlvbigpIHtcblxuXG5cdGNsYXNzIEJyb2tlckNsaWVudCBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXG5cdFx0Y29uc3RydWN0b3IoKSB7XG5cdFx0XHRzdXBlcigpXG5cblx0XHRcdHRoaXMuc29jayA9IG51bGxcblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSB0cnVlXG5cdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0dGhpcy50b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7d2lsZGNhcmQ6IHRydWV9KVxuXHRcdFx0dGhpcy5waW5nSW50ZXJ2YWwgPSAxMCoxMDAwXG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFxuXG5cdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3MgPSB7fVxuXG5cdFx0XHRsZXQge2hvc3RuYW1lLCBwYXRobmFtZSwgcHJvdG9jb2x9ID0gbG9jYXRpb25cblx0XHRcdGNvbnN0IHBvcnQgPSA4MDkwXG5cdFx0XHRwcm90b2NvbD0gKHByb3RvY29sID09ICdodHRwOicpID8gJ3dzOicgOiAnd3NzOidcblxuXG5cdFx0XHR0aGlzLnVybCA9IGAke3Byb3RvY29sfS8vJHtob3N0bmFtZX06JHtwb3J0fS9obWkke3BhdGhuYW1lfWBcblx0XHR9XG5cblx0XHRjaGVja1BpbmcoKSB7XG5cdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCF0aGlzLmlzUGluZ09rKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3RpbWVvdXQgcGluZycpXG5cdFx0XHRcdFx0dGhpcy5zb2NrLm9ubWVzc2FnZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHR0aGlzLnNvY2suY2xvc2UoKVxuXHRcdFx0XHRcdHRoaXMub25DbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5pc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncGluZyd9KVxuXHRcdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGhpcy5waW5nSW50ZXJ2YWwpXHRcdFx0XG5cdFx0fVxuXG5cdFx0b25DbG9zZSgpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQ2xvc2UnKVxuXHRcdFx0aWYgKHRoaXMuaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0dGhpcy5lbWl0KCdjb25uZWN0ZWQnLCBmYWxzZSlcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRoaXMudHJ5UmVjb25uZWN0KSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge3RoaXMuY29ubmVjdCgpfSwgNTAwMClcblx0XHRcdH1cdFx0XHRcblx0XHR9XG5cblx0XHRjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHR0aGlzLnNvY2sgPSBuZXcgV2ViU29ja2V0KHRoaXMudXJsKVxuXHRcblx0XHRcdHRoaXMuc29jay5vbm9wZW4gPSAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIHRydWUpXG5cdFx0XHRcdHRoaXMuY2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuc29jay5vbm1lc3NhZ2UgPSAgKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSB0aGlzLnNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gbWVzc2FnZSBiYWQgdGFyZ2V0JywgbXNnLnR5cGUpXG5cdFx0XHRcdFx0ZXYuY3VycmVudFRhcmdldC5jbG9zZSgpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gbWVzc2FnZScsIG1zZylcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAncmVhZHknKSB7XG5cdFx0XHRcdFx0Ly8gdGhpcy50b3BpY3MuZXZlbnROYW1lcygpLmZvckVhY2goKHRvcGljKSA9PiB7XG5cdFx0XHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFxuXHRcdFx0XHRcdC8vIH0pXHRcdFxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMucmVnaXN0ZXJlZFRvcGljcykuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0fSlcdFxuXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWFkeScsIHtjbGllbnRJZDogbXNnLmNsaWVudElkfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdHRoaXMuaXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRoaXMudG9waWNzLmVtaXQobXNnLnRvcGljLCBtc2cpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSBmYWxzZVxuXHRcdFx0XHRcdHRoaXMuc29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gdGhpcy5zb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlIGJhZCB0YXJnZXQnKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlJylcblx0XHRcdFx0aWYgKHRoaXMudGltZW91dElkICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRJZClcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRJZCA9IHVuZGVmaW5lZFx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLm9uQ2xvc2UoKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cblx0XHRzZW5kTXNnKG1zZykge1xuXHRcdFx0bXNnLnRpbWUgPSBEYXRlLm5vdygpXG5cdFx0XHR2YXIgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHNlbmRNc2cnLCBtc2cpXG5cdFx0XHRcdHRoaXMuc29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdHZhciBtc2cgPSB7XG5cdFx0XHRcdHR5cGU6ICdub3RpZicsXG5cdFx0XHRcdHRvcGljLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0b25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRyZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAodGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9IDFcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFx0XHRcblx0XHR9XG5cblx0XHR1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0aGlzLnRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0Ly8gY29uc3QgbmJMaXN0ZW5lcnMgPSB0aGlzLnRvcGljcy5saXN0ZW5lcnModG9waWMpLmxlbmd0aFxuXG5cdFx0XHQvLyBpZiAobmJMaXN0ZW5lcnMgPT0gMCkgeyAvLyBubyBtb3JlIGxpc3RlbmVycyBmb3IgdGhpcyB0b3BpY1xuXHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0Ly8gfVx0XG5cdFx0XHRpZiAoLS10aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljfSlcblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cblx0XHRcblx0fVxuXG5cblxuXG5cdCQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCB7XG5cblx0XHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdFx0Y29uc3QgY2xpZW50ID0gbmV3IEJyb2tlckNsaWVudCgpXG5cdFx0XHRjbGllbnQuY29ubmVjdCgpXG5cblx0XHRcdHJldHVybiBjbGllbnRcblx0XHR9LFxuXG5cdFx0JGlmYWNlOiBgXG5cdFx0XHRlbWl0VG9waWModG9waWNOYW1lLCBkYXRhKTtcblx0XHRcdHJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0dW5yZWdpc3Rlcih0b3BpY05hbWUsIGNhbGxiYWNrKTtcblx0XHRcdG9uVG9waWModG9waWNOYW1lLCBjYWxsYmFjaylcblxuXHRcdGBcblx0fSlcblxuXG59KSgpO1xuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuY2l0aWVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9jaXRpZXMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldENvdW50cmllczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2NvdW50cmllcycpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRDaXRpZXM6IGZ1bmN0aW9uKGNvdW50cnksIHNlYXJjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY2l0aWVzJywge2NvdW50cnksIHNlYXJjaH0pXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0Q291bnRyaWVzKCk6UHJvbWlzZTtcblx0XHRnZXRDaXRpZXMoY291bnRyeSwgc2VhcmNoKTpQcm9taXNlO1xuXHRcdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvZmlsZXMnKVxuXHRcdFxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0OiBmdW5jdGlvbihkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgZGVzdFBhdGgpXG5cblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2xpc3QnLCB7ZGVzdFBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXJ9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVVybDogZnVuY3Rpb24oZmlsZU5hbWUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnV0aWwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWQnLCB7ZmlsZU5hbWUsIGZyaWVuZFVzZXJ9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVRodW1ibmFpbFVybDogZnVuY3Rpb24oZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnV0aWwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWRUaHVtYm5haWwnLCB7ZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXJ9KVxuXHRcdFx0fSxcblxuXHRcdFx0dXBsb2FkRmlsZTogZnVuY3Rpb24oYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVwbG9hZEZpbGUnLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpXG5cdFx0XHRcdGlmICghKGJsb2IgaW5zdGFuY2VvZiBCbG9iKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUud2FybignRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdibG9iJywgYmxvYilcblx0XHRcdFx0dmFyIGZkID0gbmV3IEZvcm1EYXRhKClcblx0XHRcdFx0ZmQuYXBwZW5kKCdmaWxlJywgYmxvYiwgc2F2ZUFzZmlsZU5hbWUpXG5cdFx0XHRcdGZkLmFwcGVuZCgnZGVzdFBhdGgnLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdEZvcm1EYXRhKCcvc2F2ZScsIGZkKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW1vdmVGaWxlcycsIGZpbGVOYW1lcylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2RlbGV0ZScsIGZpbGVOYW1lcylcblx0XHRcdH0sXG5cblx0XHRcdG1rZGlyOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBta2RpcicsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvbWtkaXInLCB7ZmlsZU5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0bW92ZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1vdmVGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9tb3ZlJywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2hhcmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHNoYXJlRmlsZXMnLCBmaWxlTmFtZXMpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9tb3ZlJywge2ZpbGVOYW1lcywgZGVzdFBhdGg6ICcvc2hhcmUnfSlcblx0XHRcdH0sXHRcdFx0XG5cblx0XHRcdGNvcHlGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBjb3B5RmlsZXMnLCBmaWxlTmFtZXMsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY29weScsIHtmaWxlTmFtZXMsIGRlc3RQYXRofSlcblx0XHRcdH0sXHRcblx0XHRcdHJlbmFtZUZpbGU6IGZ1bmN0aW9uKGZpbGVQYXRoLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVuYW1lRmlsZScsIGZpbGVQYXRoLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9yZW5hbWUnLCB7ZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZX0pXG5cdFx0XHR9LFxuXHRcdFx0cmVzaXplSW1hZ2U6IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlTmFtZSwgcmVzaXplRm9ybWF0KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlc2l6ZUltYWdlJywgZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9yZXNpemVJbWFnZScsIHtmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdH0pXG5cdFx0XHR9LFxuXHRcdFx0Y29udmVydFRvTVAzOiBmdW5jdGlvbihmaWxlUGF0aCwgZmlsZU5hbWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gY29udmVydFRvTVAzJywgZmlsZVBhdGgsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY29udmVydFRvTVAzJywge2ZpbGVQYXRoLCBmaWxlTmFtZX0pXG5cdFx0XHR9XG5cblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0bGlzdChwYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKTpQcm9taXNlO1xuXHRcdGZpbGVVcmwoZmlsZU5hbWUsIGZyaWVuZFVzZXIpOnN0cmluZztcblx0XHRmaWxlVGh1bWJuYWlsVXJsKGZpbGVOYW1lLCBzaXplLCBmcmllbmRVc2VyKTpzdHJpbmc7XG5cdFx0dXBsb2FkRmlsZShibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpOlByb21pc2U7XG5cdFx0cmVtb3ZlRmlsZXMoZmlsZU5hbWVzKTpQcm9taXNlO1xuXHRcdG1rZGlyKGZpbGVOYW1lKTpQcm9taXNlO1xuXHRcdG1vdmVGaWxlcyhmaWxlTmFtZXMsIGRlc3RQYXRoKTpQcm9taXNlO1xuXHRcdGNvcHlGaWxlcyhmaWxlTmFtZXMsIGRlc3RQYXRoKTpQcm9taXNlO1xuXHRcdHJlbmFtZUZpbGUoZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSk6UHJvbWlzZTtcblx0XHRyZXNpemVJbWFnZShmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdCk6UHJvbWlzZTtcblx0XHRjb252ZXJ0VG9NUDMoZmlsZVBhdGgsIGZpbGVOYW1lKTpQcm9taXNlXG5cdGBcblxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuaHR0cCcsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgcGFyYW1zKSB7XG5cblx0XHRyZXR1cm4gcmVzb3VyY2UoYC9hcGkvYXBwLyR7cGFyYW1zLiRhcHBOYW1lfWApXG5cdH1cblxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFnZXInLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gJCgnLmJyZWl6Ym90UGFnZXInKS5pZmFjZSgpXG5cdH1cblxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFyYW1zJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnID09ICdzdHJpbmcnKSA/IEpTT04ucGFyc2UoY29uZmlnKSA6IHt9XG5cdH1cbn0pO1xuIiwiKGZ1bmN0aW9uKCl7XG5cbmNsYXNzIFJUQyBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXHRjb25zdHJ1Y3Rvcihicm9rZXIsIGh0dHAsIHBhcmFtcykge1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0dGhpcy5icm9rZXIgPSBicm9rZXJcblx0XHR0aGlzLmh0dHAgPSBodHRwXG5cblx0XHR0aGlzLnNyZElkID0gdW5kZWZpbmVkXG5cdFx0dGhpcy5kZXN0SWQgPSB1bmRlZmluZWRcblx0XHR0aGlzLmRpc3RhbnQgPSAnJ1xuXHRcdHRoaXMuc3RhdHVzID0gJ3JlYWR5J1xuXHRcdHRoaXMuaXNDYWxsZWUgPSBmYWxzZVxuXHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0dGhpcy5kaXN0YW50ID0gcGFyYW1zLmNhbGxlclxuXHRcdFx0dGhpcy5kZXN0SWQgPSBwYXJhbXMuY2xpZW50SWRcblx0XHRcdHRoaXMuaXNDYWxsZWUgPSB0cnVlXG5cdFx0fVxuXG5cdFx0YnJva2VyLm9uKCdyZWFkeScsIChtc2cpID0+IHtcblx0XHRcdHRoaXMuc3JjSWQgPSBtc2cuY2xpZW50SWRcblx0XHRcdHRoaXMuZW1pdCgncmVhZHknKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFjY2VwdCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLmNhbmNlbChmYWxzZSlcblx0XHRcdHRoaXMuZGVzdElkID0gbXNnLnNyY0lkXG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVx0XG5cdFx0XHR0aGlzLmVtaXQoJ2FjY2VwdCcpXHRcblx0XHR9KVx0XHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuZGVueScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdyZWZ1c2VkJ1xuXHRcdFx0dGhpcy5jYW5jZWwoZmFsc2UpXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdFx0dGhpcy5lbWl0KCdkZW55JylcdFxuXG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmJ5ZScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdkaXNjb25uZWN0ZWQnXG5cdFx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdFx0dGhpcy5lbWl0KCdieWUnKVxuXG5cdFx0fSlcdFx0XHRcdFxuXHR9XG5cblx0Z2V0UmVtb3RlQ2xpZW50SWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZGVzdElkXG5cdH1cblxuXHRwcm9jZXNzQ2FsbCgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gcHJvY2Vzc0NhbGwnKVxuXHRcdHRoaXMuYnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FsbCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR0aGlzLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0dGhpcy5lbWl0KCdjYWxsJywgbXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdHRoaXMuYnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FuY2VsJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHRoaXMuZW1pdCgnY2FuY2VsJylcblx0XHR9KVx0XHRcblx0fVxuXG5cdG9uRGF0YShuYW1lLCBjYWxsYmFjaykge1xuXHRcdHRoaXMuYnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy4nICsgbmFtZSwgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2sobXNnLmRhdGEsIG1zZy50aW1lKVxuXHRcdH0pXHRcdFx0XG5cdH1cblxuXHRlbWl0U3RhdHVzKCkge1xuXHRcdHRoaXMuZW1pdCgnc3RhdHVzJywge3N0YXR1czogdGhpcy5zdGF0dXMsIGRpc3RhbnQ6IHRoaXMuZGlzdGFudH0pXG5cdH1cblxuXHRjYWxsKHRvLCBhcHBOYW1lLCBpY29uQ2xzKSB7XG5cdFx0dGhpcy5kaXN0YW50ID0gdG9cblx0XHR0aGlzLnN0YXR1cyA9ICdjYWxsaW5nJ1xuXHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0cmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwge1xuXHRcdFx0dG8sXG5cdFx0XHRzcmNJZDogdGhpcy5zcmNJZCxcblx0XHRcdHR5cGU6ICdjYWxsJyxcblx0XHRcdGRhdGE6IHthcHBOYW1lLCBpY29uQ2xzfVxuXHRcdH0pXG5cdH1cdFxuXG5cdGNhbmNlbCh1cGRhdGVTdGF0dXMgPSB0cnVlKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGNhbmNlbCcsIHVwZGF0ZVN0YXR1cylcblx0XHRpZiAodXBkYXRlU3RhdHVzKSB7XG5cdFx0XHR0aGlzLnN0YXR1cyA9ICdjYW5jZWxlZCdcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXHRcdFx0XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvVXNlcmAsIHt0bzogdGhpcy5kaXN0YW50LCBzcmNJZDogdGhpcy5zcmNJZCwgdHlwZTogJ2NhbmNlbCd9KVxuXHR9XHRcblxuXHRhY2NlcHQoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGFjY2VwdCcpXG5cblx0XHR0aGlzLmVtaXRTdGF0dXMoKVxuXHRcdHJldHVybiB0aGlzLnNlbmREYXRhKCdhY2NlcHQnKVxuXHR9XG5cblx0ZGVueSgpIHtcblx0XHRjb25zb2xlLmxvZygnW1JUQ10gZGVueScpXG5cblx0XHRyZXR1cm4gdGhpcy5zZW5kRGF0YSgnZGVueScpXG5cdH1cblxuXHRieWUoKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tSVENdIGJ5ZScpXG5cblx0XHRpZiAodGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcblx0XHRcdHRoaXMuc3RhdHVzID0gJ3JlYWR5J1xuXHRcdFx0dGhpcy5kaXN0YW50ID0gJydcblx0XHRcdHRoaXMuZW1pdFN0YXR1cygpXG5cdFx0XHRyZXR1cm4gdGhpcy5zZW5kRGF0YSgnYnllJylcdFx0XHRcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcblx0fVxuXG5cdHNlbmREYXRhKHR5cGUsIGRhdGEpIHtcblx0XHRyZXR1cm4gdGhpcy5odHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb0NsaWVudGAsIHtcblx0XHRcdGRlc3RJZDogdGhpcy5kZXN0SWQsIFxuXHRcdFx0c3JjSWQ6IHRoaXMuc3JjSWQsXG5cdFx0XHR0eXBlLFxuXHRcdFx0ZGF0YVxuXHRcdH0pXG5cdH1cdFxuXG59XG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCwgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiBuZXcgUlRDKGJyb2tlciwgaHR0cCwgcGFyYW1zKVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRjYWxsKHRvKTpQcm9taXNlO1xuXHRcdGNhbmNlbCh0byk6UHJvbWlzZTtcblx0XHRkZW55KCk6UHJvbWlzZTtcblx0XHRieWUoKTpQcm9taXNlO1xuXHRcdHNlbmREYXRhKHR5cGUsIGRhdGEpOlByb21pc2U7XG5cdFx0b25EYXRhKGNhbGxiYWNrKGRhdGEsIHRpbWUpKVxuXHRgXG59KTtcblxuXG59KSgpOyIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5zY2hlZHVsZXInLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBhcHBQYXJhbXMpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIG9wZW5BcHAnLCBhcHBOYW1lLCBhcHBQYXJhbXMpXG5cdFx0XHRcdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHR5cGU6ICdvcGVuQXBwJyxcblx0XHRcdFx0XHQgZGF0YToge2FwcE5hbWUsIGFwcFBhcmFtc31cblx0XHRcdFx0XHR9LCBsb2NhdGlvbi5ocmVmKVxuXG5cdFx0XHR9LFxuXHRcdFx0bG9nb3V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIGxvZ291dCcpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvbG9nb3V0Jylcblx0XHRcdH1cdFx0IFxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRvcGVuQXBwKGFwcE5hbWUsIGFwcFBhcmFtcyk6UHJvbWlzZTtcblx0XHRgXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC51c2VycycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvdXNlcnMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nKVxuXHRcdFx0fSxcblxuXHRcdFx0bWF0Y2g6IGZ1bmN0aW9uKG1hdGNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycsIHttYXRjaH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnLycsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGU6IGZ1bmN0aW9uKHVzZXIsIGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucHV0KGAvJHt1c2VyfWAsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRhY3RpdmF0ZUFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hY3RpdmF0ZUFwcGAsIHthcHBOYW1lLCBhY3RpdmF0ZWR9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2VuZE5vdGlmOiBmdW5jdGlvbih0bywgbm90aWYpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL3NlbmROb3RpZmAsIHt0bywgbm90aWZ9KVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlTm90aWY6IGZ1bmN0aW9uKG5vdGlmSWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlTm90aWYvJHtub3RpZklkfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXROb3RpZnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXROb3RpZnNgKVxuXHRcdFx0fSxcblx0XHRcdFxuXHRcdFx0Z2V0Tm90aWZDb3VudDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmQ291bnRgKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0RnJpZW5kczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldEZyaWVuZHNgKVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkRnJpZW5kOiBmdW5jdGlvbihmcmllbmRVc2VyTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkRnJpZW5kYCwge2ZyaWVuZFVzZXJOYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdGNoYW5nZVB3ZDogZnVuY3Rpb24obmV3UHdkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9jaGFuZ2VQd2RgLCB7bmV3UHdkfSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZENvbnRhY3Q6IGZ1bmN0aW9uKG5hbWUsIGVtYWlsKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRDb250YWN0YCwge25hbWUsIGVtYWlsfSlcblx0XHRcdH0sXG5cblx0XHRcdGdldENvbnRhY3RzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Q29udGFjdHNgKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlQ29udGFjdDogZnVuY3Rpb24oY29udGFjdElkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZUNvbnRhY3QvJHtjb250YWN0SWR9YClcblx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHR9XG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdGxpc3QoKTpQcm9taXNlO1xuXHRcdGFkZChkYXRhKTpQcm9taXNlO1xuXHRcdHJlbW92ZSh1c2VyKTpQcm9taXNlO1xuXHRcdHVwZGF0ZSh1c2VyLCBkYXRhKTpQcm9taXNlO1xuXHRcdGdldCh1c2VyKTpQcm9taXNlO1xuXHRcdGFjdGl2YXRlQXBwKGFwcE5hbWUsIGFjdGl2YXRlZCk6UHJvbWlzZTtcblx0XHRzZW5kTm90aWYodG8sIG5vdGlmKTpQcm9taXNlO1xuXHRcdHJlbW92ZU5vdGlmKG5vdGlmSWQpOlByb21pc2U7XG5cdFx0Z2V0Tm90aWZzKCk6UHJvbWlzZTtcblx0XHRnZXROb3RpZkNvdW50KCk6UHJvbWlzZTtcblx0XHRnZXRGcmllbmRzKCk6UHJvbWlzZTtcblx0XHRhZGRGcmllbmQoZnJpZW5kVXNlck5hbWUpOlByb21pc2U7XG5cdFx0Y2hhbmdlUHdkKG5ld1B3ZCk6UHJvbWlzZTtcblx0XHRhZGRDb250YWN0KG5hbWUsIGVtYWlsKTpQcm9taXNlO1xuXHRcdGdldENvbnRhY3RzKCk6UHJvbWlzZShjb250YWN0cyk7XG5cdFx0cmVtb3ZlQ29udGFjdChjb250YWN0SWQpOlByb21pc2Vcblx0YFxufSk7XG4iXX0=
