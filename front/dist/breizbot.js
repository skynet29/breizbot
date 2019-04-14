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

$$.control.registerControl('breizbot.apps', {

	props: {
		apps: []
	},

	$iface: 'setData(data)',

	template: "<div class=\"scrollPanel\">\n	<div bn-each=\"apps\" bn-iter=\"app\" class=\"main\" bn-event=\"click.tile: onTileClick\">			\n		<div class=\"tile w3-btn\" bn-attr=\"{class: `tile w3-btn ${app.props.colorCls}`}\" bn-data=\"{item: app}\">\n			<div bn-show=\"typeof app.props.iconCls == \'string\'\" style=\"margin-bottom: 5px;\">\n				<i bn-attr=\"{class: app.props.iconCls}\"></i>\n			</div>\n\n			<span bn-text=\"app.props.title\"></span>\n		</div>\n\n	</div>\n</div>",

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: this.props.apps

			},
			events: {
				onTileClick: function(ev) {
					//console.log('onTileClick', $(this).data('item'))
					elt.trigger('appclick', $(this).data('item'))
				}
			}
		})

		this.setData = function(data) {
			ctrl.setData(data)
		}
	}
});


$$.control.registerControl('breizbot.files', {
	deps: ['breizbot.files'], 
	props: {
		showToolbar: true,
		imageOnly: false,
		filterExtension: undefined,
		showThumbnail: false,
		thumbnailSize: '?x100',
		maxUploadSize: 2*1024*2014 // 2 Mo		
	},

	template: "<div class=\"contentPanel\">\n\n	<div class=\"toolbar\" bn-show=\"showToolbar\">\n		<div bn-control=\"brainjs.controlgroup\">\n			<button \n				title=\"New folder\"\n				bn-event=\"click: onCreateFolder\"\n			><i class=\"fa fa-folder-open\"></i></button>		\n\n			<button \n				title=\"Import file\"\n				bn-event=\"click: onImportFile\"\n			><i class=\"fa fa-upload\"></i></button>		\n\n			<button \n				title=\"Toggle Select Mode\"\n				bn-event=\"click: onToggleSelMode\"\n			><i class=\"fa fa-check\"></i></button>	\n		</div>\n\n		<div bn-control=\"brainjs.controlgroup\">\n			<button title=\"Delete\"\n				bn-event=\"click: onDeleteFiles\"\n				bn-prop=\"{disabled: !hasSelection}\"\n			><i class=\"fa fa-trash\"></i></button>\n\n			<button title=\"Cut\"\n				bn-prop=\"{disabled: !hasSelection}\"\n				bn-event=\"click: onCutFiles\"\n			><i class=\"fa fa-cut\"></i></button>	\n\n			<button title=\"Copy\"\n				bn-prop=\"{disabled: !hasSelection}\"\n				bn-event=\"click: onCopyFiles\"\n				><i class=\"fa fa-copy\"></i></button>\n\n			<button title=\"Paste\"\n				bn-prop=\"{disabled: !hasSelectedFiles()}\"\n				bn-event=\"click: onPasteFiles\"\n			><i class=\"fa fa-paste\"></i></button>		\n		</div>\n	</div>\n\n	<div class=\"pathPanel\">\n		Path:&nbsp;<span bn-text=\"rootDir\"></span>\n	</div>\n\n	<div class=\"scrollPanel\">\n\n		<div bn-each=\"files\" \n			bn-iter=\"f\" \n			class=\"container\"\n			bn-bind=\"files\" \n			bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick\">\n			\n			<div class=\"thumbnail w3-btn\" bn-data=\"{info: f}\">	\n					<input type=\"checkbox\" bn-show=\"selectMode && f.name != \'..\'\" class=\"check w3-check\">		\n					<div bn-if=\"f.folder\" class=\"folder\">\n						<div>\n							<i class=\"fa fa-4x fa-folder-open w3-text-blue-grey\"></i>\n						</div>\n						\n						<span bn-text=\"f.name\"></span>\n					</div>\n					<div bn-if=\"!f.folder && (!f.isImage || !showThumbnail)\" bn-attr=\"{title: getSize(f.size)}\" class=\"file\">\n						<div>\n							<i class=\"fa fa-4x fa-file w3-text-blue-grey\"></i>\n						</div>\n						\n						<span bn-text=\"f.name\"></span>\n					</div>			\n\n					<div bn-if=\"!f.folder && f.isImage && showThumbnail\" bn-attr=\"{title: getSize(f.size)}\" class=\"file\">\n						<div>\n							<img bn-attr=\"{src: getThumbnailUrl(f.name)}\">\n						</div>\n						\n						<span bn-text=\"f.name\"></span>\n					</div>			\n\n				\n			</div>\n		</div>\n	</div>\n</div>",

	init: function(elt, srvFiles) {

		const {
			showToolbar,
			 maxUploadSize,
			 filterExtension,
			 imageOnly,
			 thumbnailSize,
			 showThumbnail
			} = this.props

		const ctrl = $$.viewController(elt, {
			
			data: {
				showThumbnail,
				thumbnailSize,
				showToolbar,
				rootDir: '/',
				selectMode: false,
				files: [],
				selectedFiles: [],
				operation: 'none',
				hasSelection: false,
				srvFiles,
				getSize: function(size) {
					return 'Size : ' + Math.floor(size/1024) + ' Ko'
				},

				hasSelectedFiles: function() {
					return selectedFiles.length > 0
				},
				getThumbnailUrl: function(fileName) {
					return srvFiles.fileThumbnailUrl(rootDir + fileName, thumbnailSize)
				}
			},
			events: {
				onFileClick: function(ev) {
					const info = $(this).closest('.thumbnail').data('info')
					//console.log('onFileClick', info)
					elt.trigger('fileclick', {
						fileName: info.name, 
						rootDir: ctrl.model.rootDir,
						isImage: info.isImage
					})
				},
				onCheckClick: function(ev) {
					console.log('onCheckClick')

					ctrl.setData({hasSelection: (elt.find('.check:checked').length > 0)})
				},
				onFolderClick: function(ev) {
					const info = $(this).closest('.thumbnail').data('info')

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
				onToggleSelMode: function()	{
					console.log('onToggleSelMode')

					setSelMode(!ctrl.model.selectMode)
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

					$$.ui.showConfirm({
						content: 'Are you sure ?',
						title: 'Delete files'
					}, function() {
						srvFiles.removeFiles(selFiles)
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
				onCutFiles: function(ev) {
					console.log('onCutFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						operation: 'cut'
					})
					setSelMode(false)
				},

				onCopyFiles: function(ev) {
					console.log('onCopyFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						operation: 'copy'
					})
					
					setSelMode(false)
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
						$$.util.readFileAsDataURL(file, function(dataURL) {
							console.log('dataURL', dataURL)
							const blob = $$.util.dataURLtoBlob(dataURL)
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

		function setSelMode(selMode) {
			if (selMode == false) {
				ctrl.model.hasSelection = false
			}
			ctrl.model.selectMode = selMode
			ctrl.forceUpdate('files')
		}

		function getSelFiles() {
			const selFiles = []
			elt.find('.check:checked').each(function() {
				const fileName = $(this).closest('.thumbnail').data('name')
				selFiles.push(ctrl.model.rootDir + fileName)
			})
			console.log('selFiles', selFiles)	
			return selFiles		
		}

		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvFiles.list(rootDir, {filterExtension, imageOnly}).then(function(files) {
				//console.log('files', files)
				if (rootDir != '/') {
					files.unshift({name: '..', folder: true})
				}

				ctrl.setData({files, rootDir, selectMode: false, hasSelection: false})

			})		
		}

		loadData()

		this.update = function() {
			console.log('[FileCtrl] update')
			loadData()
		}
	},

	$iface: 'update()'

});

$$.control.registerControl('breizbot.friends', {

	deps: ['breizbot.users'],

	template: "<ul class=\"w3-ul w3-border w3-white w3-hoverable\" \n	bn-each=\"friends\" bn-show=\"friends.length > 0\">\n	<li class=\"w3-bar\">\n<!-- 		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n -->\n		<div class=\"w3-bar-item\" bn-text=\"$i\" ></div>\n	</li>\n</ul>	\n<p bn-show=\"friends.length == 0\">You have no friends</p>",

	init: function(elt, users) {


		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
			}
		})	

		function updateFriends() {
			users.getFriends().then((friends) => {
				console.log('friends', friends)
				ctrl.setData({friends})
			})				
		}


		updateFriends()

	}
});





$$.control.registerControl('breizbot.header', {

	deps: ['breizbot.broker', 'breizbot.users', 'breizbot.rtc', 'breizbot.scheduler'],

	props: {
		userName: 'Unknown',
		showHome: true,
		title: ''
	},

	template: "<div class=\"header w3-teal\">\n	<div>\n		<a bn-show=\"showHome\" class=\"w3-button\" href=\"/\" title=\"Go Home\">\n			<i class=\"fa fa-home fa-lg\"></i>\n		</a>		\n		<div bn-show=\"hasIncomingCall\" \n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onCallResponse\"\n			bn-data=\"{\n				trigger: \'left\', \n				items: {\n				accept: {name: \'Accept\'},\n				deny: {name: \'Deny\'},\n				}\n			}\"\n			class=\"w3-button\">\n			<i class=\"fa fa-phone fa-pulse\"></i>\n			<span bn-text=\"caller\"></span>\n			<i class=\"fa fa-angle-down fa-lg\"></i>\n		</div>\n	</div>\n\n\n	<strong bn-text=\"title\"></strong>\n\n	<div>\n		<button class=\"notification w3-button\" title=\"Notification\" bn-event=\"click: onNotification\">\n			<i class=\"fa fa-lg fa-bell w3-text-white\" ></i>\n			<span class=\"w3-badge w3-red w3-tiny\" bn-text=\"nbNotif\" bn-show=\"nbNotif > 0\"></span>			\n		</button>\n\n		<div bn-control=\"brainjs.contextmenu\" \n			bn-data=\"{items}\" \n			data-trigger=\"left\" \n			class=\"w3-button\" \n			bn-event=\"contextmenuchange: onContextMenu\">\n				<i class=\"fa fa-user fa-lg\"></i>\n				<span bn-text=\"userName\"></span>	\n				<i class=\"fa fa-angle-down fa-lg\"></i>\n    	\n		</div>\n		\n	</div>\n\n	\n</div>",

	init: function(elt, broker, users, rtc, scheduler) {

		const audio = new Audio('/assets/skype.mp3')
		audio.loop = true
	
		const ctrl = $$.viewController(elt, {
			data: {
				items: {
					pwd: {name: 'Change password', icon: 'fas fa-lock'},
					apps: {name: 'Applications', icon: 'fas fa-th'},
					sep: '------',
					logout: {name: 'Logout', icon: 'fas fa-power-off'}
				},
				userName: this.props.userName,
				showHome: this.props.showHome,
				title: this.props.title,
				nbNotif: 0,
				hasIncomingCall: false,
				caller: ''

			},
			events: {
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						scheduler.logout()
					}
					if (data.cmd == 'apps') {
						scheduler.openApp('store')
					}
				},
				onNotification: function(ev) {
					console.log('onNotification')
					if (ctrl.model.nbNotif == 0) {
						$$.ui.showAlert({content: 'no notifications', title: 'Notifications'})
					}
					else {
						scheduler.openApp('notif')
					}					
				},
				onCallResponse: function(ev, data) {
					const {cmd} = data
					console.log('onCallResponse', data)
					ctrl.setData({hasIncomingCall: false})
					audio.pause()
					if (cmd == 'accept') {						
						scheduler.openApp('video', {
							caller: ctrl.model.caller,
							clientId: rtc.getRemoteClientId()
						})
					}
					if (cmd == 'deny') {						
						rtc.deny()
					}
				}
			}
		})

		function updateNotifs(nbNotif) {
			ctrl.setData({nbNotif})
		
		}

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.register('breizbot.rtc.call', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({hasIncomingCall: true, caller: msg.data.from})
			rtc.setRemoteClientId(msg.srcId)
			audio.play()
		})

		broker.register('breizbot.rtc.cancel', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({hasIncomingCall: false})
			audio.pause()
		})


		users.getNotifCount().then(updateNotifs)
	}
});

$$.control.registerControl('breizbot.home', {

	deps: ['breizbot.apps', 'breizbot.scheduler'],

	template: "<div bn-control=\"breizbot.apps\" \n	bn-data=\"{apps}\"\n	bn-event=\"appclick: onAppClick\" \n	style=\"height: 100%\">\n		\n	</div>\n",

	init: function(elt, srvApps, scheduler) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					scheduler.openApp(data.appName)
				}
			}
		})

		srvApps.listMyApp().then((apps) => {
			console.log('apps', apps)
			ctrl.setData({apps})
		})
	}
});

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

	template: "<div class=\"main\">\n	<button bn-event=\"click: onAddUser\" class=\"w3-btn w3-blue btnAddUser\">Add User</button>\n	<div bn-control=\"brainjs.table\"\n		bn-event=\"tablecmd: onTableCmd\"\n		bn-data=\"{columns, data}\"></div>	\n</div>\n",

	props: {
		$pager: null
	},

	init: function(elt, users) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				columns: [
					{name: 'username', label: 'User Name'},
					{name: 'pseudo', label: 'Pseudo'},
					{name: 'location', label: 'Location'},
					{name: 'email', label: 'Email'},
					{label: 'Actions', buttons: [
						{cmd: 'delete', title: 'Delete', icon: 'fa fa-trash'},
						{cmd: 'notif', title: 'Send Notification', icon: 'fa fa-bell'},
					]}
				],
				data: []
			},
			events: {
				onAddUser: function(ev) {
					$pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						buttons: [{label: 'Create', name: 'create'}]
					})
				},
				onTableCmd: function(ev, evdata) {
					const {data, cmd} = evdata
					if (cmd == 'delete') {
						$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
							users.remove(data.username).then(getUsers)
						})
					}
					if (cmd == 'notif') {
						$$.ui.showPrompt({title: 'Send Notification', label: 'Message'}, function(text) {
							users.sendNotif(data.username, text)
						})
					}
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

		this.onReturn = function(data) {
			//console.log('onReturn', data)
			users.add(data).then(getUsers)
		}

	},

	$iface: `
		onReturn(formData)
	`
});

$$.service.registerService('breizbot.apps', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			listAll: function() {
				return http.get('/api/apps/all')
			},

			listMyApp: function() {
				return http.get('/api/apps/myapp')
			}
			
		}
	},

	$iface: `
		listAll():Promise;
		listMyApp():Promise 
		`
});

(function() {


	class BrokerClient extends EventEmitter2 {

		constructor() {
			super()

			this.sock = null
			this.isConnected = false
			this.tryReconnect = true
			this.topics = new EventEmitter2({wildcard: true})

			this.registeredTopics = {}

			const {host, pathname} = location
			const port = 8090

			this.url = `wss://${host}:${port}/hmi${pathname}`
		}


		connect() {

			console.log('try to connect...')

			this.sock = new WebSocket(this.url)
	
			this.sock.addEventListener('open', () => {
				console.log("Connected to broker")
				this.isConnected = true

			}) 

			this.sock.addEventListener('message', (ev) => {
				const msg = JSON.parse(ev.data)
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

				if (msg.type == 'notif') {
					this.topics.emit(msg.topic, msg)
				}
				if (msg.type == 'error') {
					console.log('[Broker] log', msg.text)
					this.tryReconnect = false
					sock.close()
				}
											
			})

			this.sock.addEventListener('close', (code, reason) => {
				//console.log('WS close', code, reason)
				if (this.isConnected) {
					console.log('[Broker] Disconnected !')
				}
				this.isConnected = false
				if (this.tryReconnect) {
					setTimeout(() => {this.connect()}, 5000)
				}

			})

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


$$.service.registerService('breizbot.files', {

	deps: ['brainjs.http'],

	init: function(config, http) {
		return {
			list: function(path, options) {
				console.log('[FileService] list', path)

				return http.post('/api/files/list', {path, options})
			},

			fileUrl: function(fileName) {
				return '/api/files/load?fileName=' + fileName
			},

			fileThumbnailUrl: function(fileName, size) {
				return `/api/files/loadThumbnail?fileName=${fileName}&size=${size}`
			},

			uploadFile: function(blob, saveAsfileName, destPath) {
				console.log('[FileService] uploadFile', saveAsfileName)
				if (!(blob instanceof Blob)) {
					return Promise.reject('File format not supported')
				}
				//console.log('blob', blob)
				var fd = new FormData()
				fd.append('file', blob, saveAsfileName)
				fd.append('destPath', destPath)
				return http.postFormData('/api/files/save', fd)
			},

			removeFiles: function(fileNames) {
				console.log('[FileService] removeFiles', fileNames)
				return http.post('/api/files/delete', fileNames)
			},

			mkdir: function(fileName) {
				console.log('[FileService] mkdir', fileName)
				return http.post('/api/files/mkdir', {fileName})
			},

			moveFiles: function(fileNames, destPath) {
				console.log('[FileService] moveFiles', fileNames, destPath)
				return http.post('/api/files/move', {fileNames, destPath})
			},

			copyFiles: function(fileNames, destPath) {
				console.log('[FileService] copyFiles', fileNames, destPath)
				return http.post('/api/files/copy', {fileNames, destPath})
			}	
		}
	},

	$iface: `
		list(path, options):Promise;
		fileUrl(fileName):string;
		fileThumbnailUrl(fileName, size):string;
		uploadFile(blob, saveAsfileName, destPath):Promise;
		removeFiles(fileNames):Promise;
		mkdir(fileName):Promise;
		moveFiles(fileNames, destPath):Promise;
		copyFiles(fileNames, destPath):Promise			
	`

});

$$.service.registerService('breizbot.params', {

	init: function(config) {

		return JSON.parse(config)
	}
});

$$.service.registerService('breizbot.rtc', {

	deps: ['brainjs.http', 'breizbot.broker'],

	init: function(config, http, broker) {

		let srcId
		let destId

		broker.on('ready', (msg) => { srcId = msg.clientId})

		return {
			getRemoteClientId: function() {
				return destId
			},

			setRemoteClientId: function(clientId) {
				destId = clientId
			},

			call: function(to) {
				return http.post(`/api/rtc/sendToUser/${srcId}`, {to, type: 'call'})
			},

			cancel: function(to) {
				return http.post(`/api/rtc/sendToUser/${srcId}`, {to, type: 'cancel'})
			},

			accept: function() {
				return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'accept'})
			},

			deny: function() {
				return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'deny'})
			},

			bye: function() {
				return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'bye'})
			},

			candidate: function(info) {
				return http.post(`/api/rtc/sendToClient/${srcId}`, {
					destId, 
					type: 'candidate', 
					data: {
						label: info.sdpMLineIndex,
						id: info.sdpMid,
						candidate: info.candidate	
					}
				})
			},

			offer: function(data) {
				return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'offer', data})
			},

			answer: function(data) {
				return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'answer', data})
			}

		}
	},
	$iface: `
		getRemoteClientId():string;
		setRemoteClientId(clientId);
		call(to):Promise;
		cancel(to):Promise;
		deny():Promise;
		bye():Promise;
		candidate(info):Promise;
		offer(data):Promise;
		answer(data):Promise
	`
});

$$.service.registerService('breizbot.scheduler', {

	init: function(config) {

		return {
			openApp: function(appName, params) {
				if (typeof params == 'object') {
					const keys = []
					for(let i in params) {
						keys.push(i + '=' + params[i])
					}
		
					location.href = `/apps/${appName}?` + keys.join('&')
				}
				else {
					location.href = `/apps/${appName}`
				}
			},

			logout: function() {
				location.href = '/logout'
			}
			
		}
	},
	$iface: `
		openApp(appName, params);
		logout()
	`
});

$$.service.registerService('breizbot.users', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			list: function() {
				return http.get('/api/users')
			},

			match: function(matchUser) {
				return http.get(`/api/users?match=${matchUser}`)
			},

			add: function(data) {
				return http.post('/api/users', data)
			},

			remove: function(user) {
				return http.delete(`/api/users/${user}`)
			},

			update: function(user, data) {
				return http.put(`/api/users/${user}`, data)
			},

			get: function(user) {
				return http.get(`/api/users/${user}`)
			},

			activateApp: function(appName, activated) {
				return http.post(`/api/users/activateApp`, {appName, activated})
			},

			sendNotif: function(to, notif) {
				return http.post(`/api/users/sendNotif`, {to, notif})
			},

			removeNotif: function(notifId) {
				return http.delete(`/api/users/removeNotif/${notifId}`)
			},

			getNotifs: function() {
				return http.get(`/api/users/getNotifs`)
			},
			
			getNotifCount: function() {
				return http.get(`/api/users/getNotifCount`)
			},

			getFriends: function() {
				return http.get(`/api/users/getFriends`)
			},

			addFriend: function(friendUserName) {
				return http.post(`/api/users/addFriend`, {friendUserName})
			},

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
		getFriends():Promise
	`
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhcHBzL2FwcHMuanMiLCJmaWxlcy9maWxlcy5qcyIsImZyaWVuZHMvZnJpZW5kcy5qcyIsImhlYWRlci9oZWFkZXIuanMiLCJob21lL2hvbWUuanMiLCJ1c2Vycy9hZGRVc2VyLmpzIiwidXNlcnMvdXNlcnMuanMiLCJhcHBzLmpzIiwiYnJva2VyLmpzIiwiZmlsZXMuanMiLCJwYXJhbXMuanMiLCJydGMuanMiLCJzY2hlZHVsZXIuanMiLCJ1c2Vycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnJlaXpib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQgPyBjb25mLm1heExpc3RlbmVycyA6IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcbiAgICAgIGNvbmYudmVyYm9zZU1lbW9yeUxlYWsgJiYgKHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBjb25mLnZlcmJvc2VNZW1vcnlMZWFrKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBsb2dQb3NzaWJsZU1lbW9yeUxlYWsoY291bnQsIGV2ZW50TmFtZSkge1xuICAgIHZhciBlcnJvck1zZyA9ICcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICcgKyBjb3VudCArICcgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0Lic7XG5cbiAgICBpZih0aGlzLnZlcmJvc2VNZW1vcnlMZWFrKXtcbiAgICAgIGVycm9yTXNnICs9ICcgRXZlbnQgbmFtZTogJyArIGV2ZW50TmFtZSArICcuJztcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbWl0V2FybmluZyl7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICBlLm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgIGUuZW1pdHRlciA9IHRoaXM7XG4gICAgICBlLmNvdW50ID0gY291bnQ7XG4gICAgICBwcm9jZXNzLmVtaXRXYXJuaW5nKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yTXNnKTtcblxuICAgICAgaWYgKGNvbnNvbGUudHJhY2Upe1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgdGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG4gIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmb3IgZXhwb3J0aW5nIEV2ZW50RW1pdHRlciBwcm9wZXJ0eVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdHJlZS5fbGlzdGVuZXJzLndhcm5lZCAmJlxuICAgICAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoLCBuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKG4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIH1cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uY2UgPSBmdW5jdGlvbihldmVudCwgZm4sIHByZXBlbmQpIHtcbiAgICB0aGlzLl9tYW55KGV2ZW50LCAxLCBmbiwgcHJlcGVuZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgZmFsc2UpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIHRydWUpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuLCBwcmVwZW5kKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5fb24oZXZlbnQsIGxpc3RlbmVyLCBwcmVwZW5kKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fYWxsLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBvZiBlbWl0IGNhbGxcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXRBc3luYyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbZmFsc2VdKTsgfVxuICAgIH1cblxuICAgIHZhciBwcm9taXNlcz0gW107XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYXJndW1lbnRzWzFdKTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZEFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbkFueSA9IGZ1bmN0aW9uKGZuLCBwcmVwZW5kKXtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICBpZihwcmVwZW5kKXtcbiAgICAgIHRoaXMuX2FsbC51bnNoaWZ0KGZuKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX29uQW55KHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIENoYW5nZSB0byBhcnJheS5cbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFkZFxuICAgICAgaWYocHJlcGVuZCl7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkICYmXG4gICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3QpIHtcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb290KTtcbiAgICAgIGZvciAodmFyIGkgaW4ga2V5cykge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIG9iaiA9IHJvb3Rba2V5XTtcbiAgICAgICAgaWYgKChvYmogaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpIHx8IChvYmogPT09IG51bGwpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290W2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSByb290W2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdCh0aGlzLmxpc3RlbmVyVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm4pO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuc1tpXSk7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0YXBwczogW11cblx0fSxcblxuXHQkaWZhY2U6ICdzZXREYXRhKGRhdGEpJyxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImFwcHNcXFwiIGJuLWl0ZXI9XFxcImFwcFxcXCIgY2xhc3M9XFxcIm1haW5cXFwiIGJuLWV2ZW50PVxcXCJjbGljay50aWxlOiBvblRpbGVDbGlja1xcXCI+XHRcdFx0XFxuXHRcdDxkaXYgY2xhc3M9XFxcInRpbGUgdzMtYnRuXFxcIiBibi1hdHRyPVxcXCJ7Y2xhc3M6IGB0aWxlIHczLWJ0biAke2FwcC5wcm9wcy5jb2xvckNsc31gfVxcXCIgYm4tZGF0YT1cXFwie2l0ZW06IGFwcH1cXFwiPlxcblx0XHRcdDxkaXYgYm4tc2hvdz1cXFwidHlwZW9mIGFwcC5wcm9wcy5pY29uQ2xzID09IFxcJ3N0cmluZ1xcJ1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBhcHAucHJvcHMuaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJhcHAucHJvcHMudGl0bGVcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogdGhpcy5wcm9wcy5hcHBzXG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoZGF0YSlcblx0XHR9XG5cdH1cbn0pO1xuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSwgXG5cdHByb3BzOiB7XG5cdFx0c2hvd1Rvb2xiYXI6IHRydWUsXG5cdFx0aW1hZ2VPbmx5OiBmYWxzZSxcblx0XHRmaWx0ZXJFeHRlbnNpb246IHVuZGVmaW5lZCxcblx0XHRzaG93VGh1bWJuYWlsOiBmYWxzZSxcblx0XHR0aHVtYm5haWxTaXplOiAnP3gxMDAnLFxuXHRcdG1heFVwbG9hZFNpemU6IDIqMTAyNCoyMDE0IC8vIDIgTW9cdFx0XG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiY29udGVudFBhbmVsXFxcIj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiIGJuLXNob3c9XFxcInNob3dUb29sYmFyXFxcIj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRyb2xncm91cFxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJOZXcgZm9sZGVyXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNyZWF0ZUZvbGRlclxcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLWZvbGRlci1vcGVuXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSW1wb3J0IGZpbGVcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0RmlsZVxcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXVwbG9hZFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIlRvZ2dsZSBTZWxlY3QgTW9kZVxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dnbGVTZWxNb2RlXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY2hlY2tcXFwiPjwvaT48L2J1dHRvbj5cdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRyb2xncm91cFxcXCI+XFxuXHRcdFx0PGJ1dHRvbiB0aXRsZT1cXFwiRGVsZXRlXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkRlbGV0ZUZpbGVzXFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaGFzU2VsZWN0aW9ufVxcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQ3V0XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaGFzU2VsZWN0aW9ufVxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DdXRGaWxlc1xcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLWN1dFxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuXFxuXHRcdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQ29weVxcXCJcXG5cdFx0XHRcdGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWhhc1NlbGVjdGlvbn1cXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29weUZpbGVzXFxcIlxcblx0XHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jb3B5XFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiB0aXRsZT1cXFwiUGFzdGVcXFwiXFxuXHRcdFx0XHRibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFoYXNTZWxlY3RlZEZpbGVzKCl9XFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblBhc3RlRmlsZXNcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1wYXN0ZVxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcInBhdGhQYW5lbFxcXCI+XFxuXHRcdFBhdGg6Jm5ic3A7PHNwYW4gYm4tdGV4dD1cXFwicm9vdERpclxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXFxuXHRcdDxkaXYgYm4tZWFjaD1cXFwiZmlsZXNcXFwiIFxcblx0XHRcdGJuLWl0ZXI9XFxcImZcXFwiIFxcblx0XHRcdGNsYXNzPVxcXCJjb250YWluZXJcXFwiXFxuXHRcdFx0Ym4tYmluZD1cXFwiZmlsZXNcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljay5mb2xkZXI6IG9uRm9sZGVyQ2xpY2ssIGNsaWNrLmNoZWNrOiBvbkNoZWNrQ2xpY2ssIGNsaWNrLmZpbGU6IG9uRmlsZUNsaWNrXFxcIj5cXG5cdFx0XHRcXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ0aHVtYm5haWwgdzMtYnRuXFxcIiBibi1kYXRhPVxcXCJ7aW5mbzogZn1cXFwiPlx0XFxuXHRcdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tc2hvdz1cXFwic2VsZWN0TW9kZSAmJiBmLm5hbWUgIT0gXFwnLi5cXCdcXFwiIGNsYXNzPVxcXCJjaGVjayB3My1jaGVja1xcXCI+XHRcdFxcblx0XHRcdFx0XHQ8ZGl2IGJuLWlmPVxcXCJmLmZvbGRlclxcXCIgY2xhc3M9XFxcImZvbGRlclxcXCI+XFxuXHRcdFx0XHRcdFx0PGRpdj5cXG5cdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS00eCBmYS1mb2xkZXItb3BlbiB3My10ZXh0LWJsdWUtZ3JleVxcXCI+PC9pPlxcblx0XHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHRcdFxcblx0XHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImYubmFtZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1pZj1cXFwiIWYuZm9sZGVyICYmICghZi5pc0ltYWdlIHx8ICFzaG93VGh1bWJuYWlsKVxcXCIgYm4tYXR0cj1cXFwie3RpdGxlOiBnZXRTaXplKGYuc2l6ZSl9XFxcIiBjbGFzcz1cXFwiZmlsZVxcXCI+XFxuXHRcdFx0XHRcdFx0PGRpdj5cXG5cdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS00eCBmYS1maWxlIHczLXRleHQtYmx1ZS1ncmV5XFxcIj48L2k+XFxuXHRcdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFx0XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZi5uYW1lXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDwvZGl2Plx0XHRcdFxcblxcblx0XHRcdFx0XHQ8ZGl2IGJuLWlmPVxcXCIhZi5mb2xkZXIgJiYgZi5pc0ltYWdlICYmIHNob3dUaHVtYm5haWxcXFwiIGJuLWF0dHI9XFxcInt0aXRsZTogZ2V0U2l6ZShmLnNpemUpfVxcXCIgY2xhc3M9XFxcImZpbGVcXFwiPlxcblx0XHRcdFx0XHRcdDxkaXY+XFxuXHRcdFx0XHRcdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IGdldFRodW1ibmFpbFVybChmLm5hbWUpfVxcXCI+XFxuXHRcdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFx0XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZi5uYW1lXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDwvZGl2Plx0XHRcdFxcblxcblx0XHRcdFx0XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0Y29uc3Qge1xuXHRcdFx0c2hvd1Rvb2xiYXIsXG5cdFx0XHQgbWF4VXBsb2FkU2l6ZSxcblx0XHRcdCBmaWx0ZXJFeHRlbnNpb24sXG5cdFx0XHQgaW1hZ2VPbmx5LFxuXHRcdFx0IHRodW1ibmFpbFNpemUsXG5cdFx0XHQgc2hvd1RodW1ibmFpbFxuXHRcdFx0fSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93VGh1bWJuYWlsLFxuXHRcdFx0XHR0aHVtYm5haWxTaXplLFxuXHRcdFx0XHRzaG93VG9vbGJhcixcblx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRzZWxlY3RNb2RlOiBmYWxzZSxcblx0XHRcdFx0ZmlsZXM6IFtdLFxuXHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBbXSxcblx0XHRcdFx0b3BlcmF0aW9uOiAnbm9uZScsXG5cdFx0XHRcdGhhc1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHRcdHNydkZpbGVzLFxuXHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbihzaXplKSB7XG5cdFx0XHRcdFx0cmV0dXJuICdTaXplIDogJyArIE1hdGguZmxvb3Ioc2l6ZS8xMDI0KSArICcgS28nXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0aGFzU2VsZWN0ZWRGaWxlczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkRmlsZXMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRUaHVtYm5haWxVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNydkZpbGVzLmZpbGVUaHVtYm5haWxVcmwocm9vdERpciArIGZpbGVOYW1lLCB0aHVtYm5haWxTaXplKVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5kYXRhKCdpbmZvJylcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZpbGVDbGljaycsIGluZm8pXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjbGljaycsIHtcblx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsIFxuXHRcdFx0XHRcdFx0cm9vdERpcjogY3RybC5tb2RlbC5yb290RGlyLFxuXHRcdFx0XHRcdFx0aXNJbWFnZTogaW5mby5pc0ltYWdlXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DaGVja0NsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNoZWNrQ2xpY2snKVxuXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtoYXNTZWxlY3Rpb246IChlbHQuZmluZCgnLmNoZWNrOmNoZWNrZWQnKS5sZW5ndGggPiAwKX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRm9sZGVyQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmRhdGEoJ2luZm8nKVxuXG5cdFx0XHRcdFx0Y29uc3QgZGlyTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRm9sZGVyQ2xpY2snLCBkaXJOYW1lKVxuXHRcdFx0XHRcdGlmIChkaXJOYW1lID09ICcuLicpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHNwbGl0ID0gY3RybC5tb2RlbC5yb290RGlyLnNwbGl0KCcvJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXG5cdFx0XHRcdFx0XHRzcGxpdC5wb3AoKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0bG9hZERhdGEoc3BsaXQuam9pbignLycpICsgJy8nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGxvYWREYXRhKGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNyZWF0ZUZvbGRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdGb2xkZXIgbmFtZTonLCBcblx0XHRcdFx0XHRcdHRpdGxlOiAnTmV3IEZvbGRlcidcblx0XHRcdFx0XHR9LCBmdW5jdGlvbihmb2xkZXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5ta2Rpcihyb290RGlyICsgZm9sZGVyTmFtZSlcblx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ub2dnbGVTZWxNb2RlOiBmdW5jdGlvbigpXHR7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9nZ2xlU2VsTW9kZScpXG5cblx0XHRcdFx0XHRzZXRTZWxNb2RlKCFjdHJsLm1vZGVsLnNlbGVjdE1vZGUpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25EZWxldGVGaWxlczogZnVuY3Rpb24oZXYpIHtcblxuXHRcdFx0XHRcdGNvbnN0IHNlbEZpbGVzID0gZ2V0U2VsRmlsZXMoKVxuXG5cdFx0XHRcdFx0aWYgKHNlbEZpbGVzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcycsXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBmaWxlcyBzZWxlY3RlZCdcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdFx0XHRjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nLFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdEZWxldGUgZmlsZXMnXG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5yZW1vdmVGaWxlcyhzZWxGaWxlcylcblx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DdXRGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DdXRGaWxlcycpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCksXG5cdFx0XHRcdFx0XHRvcGVyYXRpb246ICdjdXQnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRzZXRTZWxNb2RlKGZhbHNlKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uQ29weUZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNvcHlGaWxlcycpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCksXG5cdFx0XHRcdFx0XHRvcGVyYXRpb246ICdjb3B5J1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2V0U2VsTW9kZShmYWxzZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25QYXN0ZUZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblBhc3RlRmlsZXMnKVxuXHRcdFx0XHRcdGNvbnN0IHtyb290RGlyLCBzZWxlY3RlZEZpbGVzLCBvcGVyYXRpb259ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdGNvbnN0IHByb21pc2UgPSBcblx0XHRcdFx0XHRcdChvcGVyYXRpb24gPT0gJ2NvcHknKSA/IHNydkZpbGVzLmNvcHlGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKSA6IHNydkZpbGVzLm1vdmVGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKVxuXG5cdFx0XHRcdFx0cHJvbWlzZVxuXHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7c2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnfSlcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkltcG9ydEZpbGU6IGZ1bmN0aW9uKGV2KSB7XG5cblx0XHRcdFx0XHQkJC51dGlsLm9wZW5GaWxlRGlhbG9nKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVTaXplJywgZmlsZS5zaXplIC8gMTAyNClcblx0XHRcdFx0XHRcdGlmIChmaWxlLnNpemUgPiBtYXhVcGxvYWRTaXplKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogJ0ZpbGUgdG9vIGJpZycsIHRpdGxlOiAnSW1wb3J0IGZpbGUnfSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkJC51dGlsLnJlYWRGaWxlQXNEYXRhVVJMKGZpbGUsIGZ1bmN0aW9uKGRhdGFVUkwpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGFVUkwnLCBkYXRhVVJMKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBibG9iID0gJCQudXRpbC5kYXRhVVJMdG9CbG9iKGRhdGFVUkwpXG5cdFx0XHRcdFx0XHRcdHNydkZpbGVzLnVwbG9hZEZpbGUoYmxvYiwgZmlsZS5uYW1lLCBjdHJsLm1vZGVsLnJvb3REaXIpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LCB0aXRsZTogJ0Vycm9yJ30pXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBzZXRTZWxNb2RlKHNlbE1vZGUpIHtcblx0XHRcdGlmIChzZWxNb2RlID09IGZhbHNlKSB7XG5cdFx0XHRcdGN0cmwubW9kZWwuaGFzU2VsZWN0aW9uID0gZmFsc2Vcblx0XHRcdH1cblx0XHRcdGN0cmwubW9kZWwuc2VsZWN0TW9kZSA9IHNlbE1vZGVcblx0XHRcdGN0cmwuZm9yY2VVcGRhdGUoJ2ZpbGVzJylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZWxGaWxlcygpIHtcblx0XHRcdGNvbnN0IHNlbEZpbGVzID0gW11cblx0XHRcdGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGZpbGVOYW1lID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuZGF0YSgnbmFtZScpXG5cdFx0XHRcdHNlbEZpbGVzLnB1c2goY3RybC5tb2RlbC5yb290RGlyICsgZmlsZU5hbWUpXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdHJldHVybiBzZWxGaWxlc1x0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0fVxuXHRcdFx0c3J2RmlsZXMubGlzdChyb290RGlyLCB7ZmlsdGVyRXh0ZW5zaW9uLCBpbWFnZU9ubHl9KS50aGVuKGZ1bmN0aW9uKGZpbGVzKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHRcdGlmIChyb290RGlyICE9ICcvJykge1xuXHRcdFx0XHRcdGZpbGVzLnVuc2hpZnQoe25hbWU6ICcuLicsIGZvbGRlcjogdHJ1ZX0pXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZpbGVzLCByb290RGlyLCBzZWxlY3RNb2RlOiBmYWxzZSwgaGFzU2VsZWN0aW9uOiBmYWxzZX0pXG5cblx0XHRcdH0pXHRcdFxuXHRcdH1cblxuXHRcdGxvYWREYXRhKClcblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGUnKVxuXHRcdFx0bG9hZERhdGEoKVxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6ICd1cGRhdGUoKSdcblxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGUgdzMtaG92ZXJhYmxlXFxcIiBcXG5cdGJuLWVhY2g9XFxcImZyaWVuZHNcXFwiIGJuLXNob3c9XFxcImZyaWVuZHMubGVuZ3RoID4gMFxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuPCEtLSBcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvc3Bhbj5cXG4gLS0+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiBibi10ZXh0PVxcXCIkaVxcXCIgPjwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XFxuPHAgYm4tc2hvdz1cXFwiZnJpZW5kcy5sZW5ndGggPT0gMFxcXCI+WW91IGhhdmUgbm8gZnJpZW5kczwvcD5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJpZW5kczogW11cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiB1cGRhdGVGcmllbmRzKCkge1xuXHRcdFx0dXNlcnMuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXG5cdFx0dXBkYXRlRnJpZW5kcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5oZWFkZXInLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LnNjaGVkdWxlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJyxcblx0XHRzaG93SG9tZTogdHJ1ZSxcblx0XHR0aXRsZTogJydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJoZWFkZXIgdzMtdGVhbFxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8YSBibi1zaG93PVxcXCJzaG93SG9tZVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgaHJlZj1cXFwiL1xcXCIgdGl0bGU9XFxcIkdvIEhvbWVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLWxnXFxcIj48L2k+XFxuXHRcdDwvYT5cdFx0XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzSW5jb21pbmdDYWxsXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25DYWxsUmVzcG9uc2VcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJywgXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0YWNjZXB0OiB7bmFtZTogXFwnQWNjZXB0XFwnfSxcXG5cdFx0XHRcdGRlbnk6IHtuYW1lOiBcXCdEZW55XFwnfSxcXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZSBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImNhbGxlclxcXCI+PC9zcGFuPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1kb3duIGZhLWxnXFxcIj48L2k+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuXHQ8c3Ryb25nIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3N0cm9uZz5cXG5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmaWNhdGlvbiB3My1idXR0b25cXFwiIHRpdGxlPVxcXCJOb3RpZmljYXRpb25cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ob3RpZmljYXRpb25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1iZWxsIHczLXRleHQtd2hpdGVcXFwiID48L2k+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJhZGdlIHczLXJlZCB3My10aW55XFxcIiBibi10ZXh0PVxcXCJuYk5vdGlmXFxcIiBibi1zaG93PVxcXCJuYk5vdGlmID4gMFxcXCI+PC9zcGFuPlx0XHRcdFxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7aXRlbXN9XFxcIiBcXG5cdFx0XHRkYXRhLXRyaWdnZXI9XFxcImxlZnRcXFwiIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlciBmYS1sZ1xcXCI+PC9pPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidXNlck5hbWVcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd24gZmEtbGdcXFwiPjwvaT5cXG4gICAgXHRcXG5cdFx0PC9kaXY+XFxuXHRcdFxcblx0PC9kaXY+XFxuXFxuXHRcXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlciwgdXNlcnMsIHJ0Yywgc2NoZWR1bGVyKSB7XG5cblx0XHRjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygnL2Fzc2V0cy9za3lwZS5tcDMnKVxuXHRcdGF1ZGlvLmxvb3AgPSB0cnVlXG5cdFxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aXRlbXM6IHtcblx0XHRcdFx0XHRwd2Q6IHtuYW1lOiAnQ2hhbmdlIHBhc3N3b3JkJywgaWNvbjogJ2ZhcyBmYS1sb2NrJ30sXG5cdFx0XHRcdFx0YXBwczoge25hbWU6ICdBcHBsaWNhdGlvbnMnLCBpY29uOiAnZmFzIGZhLXRoJ30sXG5cdFx0XHRcdFx0c2VwOiAnLS0tLS0tJyxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiAnTG9nb3V0JywgaWNvbjogJ2ZhcyBmYS1wb3dlci1vZmYnfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR1c2VyTmFtZTogdGhpcy5wcm9wcy51c2VyTmFtZSxcblx0XHRcdFx0c2hvd0hvbWU6IHRoaXMucHJvcHMuc2hvd0hvbWUsXG5cdFx0XHRcdHRpdGxlOiB0aGlzLnByb3BzLnRpdGxlLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsZXI6ICcnXG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhcHBzJykge1xuXHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ3N0b3JlJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6ICdubyBub3RpZmljYXRpb25zJywgdGl0bGU6ICdOb3RpZmljYXRpb25zJ30pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ25vdGlmJylcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCB7Y21kfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsUmVzcG9uc2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiBmYWxzZX0pXG5cdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHNjaGVkdWxlci5vcGVuQXBwKCd2aWRlbycsIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGVyOiBjdHJsLm1vZGVsLmNhbGxlcixcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiB1cGRhdGVOb3RpZnMobmJOb3RpZikge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtuYk5vdGlmfSlcblx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcyhtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FsbCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiB0cnVlLCBjYWxsZXI6IG1zZy5kYXRhLmZyb219KVxuXHRcdFx0cnRjLnNldFJlbW90ZUNsaWVudElkKG1zZy5zcmNJZClcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYW5jZWwnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogZmFsc2V9KVxuXHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdH0pXG5cblxuXHRcdHVzZXJzLmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaG9tZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmFwcHMnLCAnYnJlaXpib3Quc2NoZWR1bGVyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBcXG5cdGJuLWRhdGE9XFxcInthcHBzfVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGlja1xcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkFwcHMsIHNjaGVkdWxlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFwcENsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdHNjaGVkdWxlci5vcGVuQXBwKGRhdGEuYXBwTmFtZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRzcnZBcHBzLmxpc3RNeUFwcCgpLnRoZW4oKGFwcHMpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7YXBwc30pXG5cdFx0fSlcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWRkVXNlcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Vc2VyTmFtZTwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwidXNlcm5hbWVcXFwiIG5hbWU9XFxcInVzZXJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+UHNldWRvPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJwc2V1ZG9cXFwiIG5hbWU9XFxcInBzZXVkb1xcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkxvY2F0aW9uPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJsb2NhdGlvblxcXCIgbmFtZT1cXFwibG9jYXRpb25cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgcGxhY2Vob2xkZXI9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ+XHRcXG5cdDwvZGl2Plxcblx0XFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdG9uQWN0aW9uKGNtZClcblx0YFxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QudXNlcnMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIj5BZGQgVXNlcjwvYnV0dG9uPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnRhYmxlXFxcIlxcblx0XHRibi1ldmVudD1cXFwidGFibGVjbWQ6IG9uVGFibGVDbWRcXFwiXFxuXHRcdGJuLWRhdGE9XFxcIntjb2x1bW5zLCBkYXRhfVxcXCI+PC9kaXY+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdFx0e25hbWU6ICd1c2VybmFtZScsIGxhYmVsOiAnVXNlciBOYW1lJ30sXG5cdFx0XHRcdFx0e25hbWU6ICdwc2V1ZG8nLCBsYWJlbDogJ1BzZXVkbyd9LFxuXHRcdFx0XHRcdHtuYW1lOiAnbG9jYXRpb24nLCBsYWJlbDogJ0xvY2F0aW9uJ30sXG5cdFx0XHRcdFx0e25hbWU6ICdlbWFpbCcsIGxhYmVsOiAnRW1haWwnfSxcblx0XHRcdFx0XHR7bGFiZWw6ICdBY3Rpb25zJywgYnV0dG9uczogW1xuXHRcdFx0XHRcdFx0e2NtZDogJ2RlbGV0ZScsIHRpdGxlOiAnRGVsZXRlJywgaWNvbjogJ2ZhIGZhLXRyYXNoJ30sXG5cdFx0XHRcdFx0XHR7Y21kOiAnbm90aWYnLCB0aXRsZTogJ1NlbmQgTm90aWZpY2F0aW9uJywgaWNvbjogJ2ZhIGZhLWJlbGwnfSxcblx0XHRcdFx0XHRdfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRkYXRhOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFkZFVzZXI6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5hZGRVc2VyJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgVXNlcicsXG5cdFx0XHRcdFx0XHRidXR0b25zOiBbe2xhYmVsOiAnQ3JlYXRlJywgbmFtZTogJ2NyZWF0ZSd9XVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFibGVDbWQ6IGZ1bmN0aW9uKGV2LCBldmRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCB7ZGF0YSwgY21kfSA9IGV2ZGF0YVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbGV0ZScpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ0RlbGV0ZSBVc2VyJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR1c2Vycy5yZW1vdmUoZGF0YS51c2VybmFtZSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE5vdGlmaWNhdGlvbicsIGxhYmVsOiAnTWVzc2FnZSd9LCBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZihkYXRhLnVzZXJuYW1lLCB0ZXh0KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZ2V0VXNlcnMoKSB7XG5cdFx0XHR1c2Vycy5saXN0KCkudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZGF0YX0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGdldFVzZXJzKClcblxuXHRcdHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHR1c2Vycy5hZGQoZGF0YSkudGhlbihnZXRVc2Vycylcblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRvblJldHVybihmb3JtRGF0YSlcblx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3RBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdFx0fSxcblxuXHRcdFx0bGlzdE15QXBwOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvYXBpL2FwcHMvbXlhcHAnKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGxpc3RBbGwoKTpQcm9taXNlO1xuXHRcdGxpc3RNeUFwcCgpOlByb21pc2UgXG5cdFx0YFxufSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cblxuXHRjbGFzcyBCcm9rZXJDbGllbnQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIyIHtcblxuXHRcdGNvbnN0cnVjdG9yKCkge1xuXHRcdFx0c3VwZXIoKVxuXG5cdFx0XHR0aGlzLnNvY2sgPSBudWxsXG5cdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2Vcblx0XHRcdHRoaXMudHJ5UmVjb25uZWN0ID0gdHJ1ZVxuXHRcdFx0dGhpcy50b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7d2lsZGNhcmQ6IHRydWV9KVxuXG5cdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3MgPSB7fVxuXG5cdFx0XHRjb25zdCB7aG9zdCwgcGF0aG5hbWV9ID0gbG9jYXRpb25cblx0XHRcdGNvbnN0IHBvcnQgPSA4MDkwXG5cblx0XHRcdHRoaXMudXJsID0gYHdzczovLyR7aG9zdH06JHtwb3J0fS9obWkke3BhdGhuYW1lfWBcblx0XHR9XG5cblxuXHRcdGNvbm5lY3QoKSB7XG5cblx0XHRcdGNvbnNvbGUubG9nKCd0cnkgdG8gY29ubmVjdC4uLicpXG5cblx0XHRcdHRoaXMuc29jayA9IG5ldyBXZWJTb2NrZXQodGhpcy51cmwpXG5cdFxuXHRcdFx0dGhpcy5zb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxuXG5cdFx0XHR9KSBcblxuXHRcdFx0dGhpcy5zb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXYpID0+IHtcblx0XHRcdFx0Y29uc3QgbXNnID0gSlNPTi5wYXJzZShldi5kYXRhKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBtZXNzYWdlJywgbXNnKVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHQvLyB0aGlzLnRvcGljcy5ldmVudE5hbWVzKCkuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHQvLyBcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0Ly8gfSlcdFx0XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGhpcy5yZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncmVnaXN0ZXInLCB0b3BpY30pXHRcblx0XHRcdFx0XHR9KVx0XG5cblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3JlYWR5Jywge2NsaWVudElkOiBtc2cuY2xpZW50SWR9KVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRoaXMudG9waWNzLmVtaXQobXNnLnRvcGljLCBtc2cpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSBmYWxzZVxuXHRcdFx0XHRcdHNvY2suY2xvc2UoKVxuXHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHR9KVxuXG5cdFx0XHR0aGlzLnNvY2suYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAoY29kZSwgcmVhc29uKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1dTIGNsb3NlJywgY29kZSwgcmVhc29uKVxuXHRcdFx0XHRpZiAodGhpcy5pc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbQnJva2VyXSBEaXNjb25uZWN0ZWQgIScpXG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHRcdGlmICh0aGlzLnRyeVJlY29ubmVjdCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge3RoaXMuY29ubmVjdCgpfSwgNTAwMClcblx0XHRcdFx0fVxuXG5cdFx0XHR9KVxuXG5cdFx0fVxuXG5cblx0XHRzZW5kTXNnKG1zZykge1xuXHRcdFx0bXNnLnRpbWUgPSBEYXRlLm5vdygpXG5cdFx0XHR2YXIgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHNlbmRNc2cnLCBtc2cpXG5cdFx0XHRcdHRoaXMuc29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdHZhciBtc2cgPSB7XG5cdFx0XHRcdHR5cGU6ICdub3RpZicsXG5cdFx0XHRcdHRvcGljLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0b25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRyZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAodGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9IDFcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFx0XHRcblx0XHR9XG5cblx0XHR1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0aGlzLnRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0Ly8gY29uc3QgbmJMaXN0ZW5lcnMgPSB0aGlzLnRvcGljcy5saXN0ZW5lcnModG9waWMpLmxlbmd0aFxuXG5cdFx0XHQvLyBpZiAobmJMaXN0ZW5lcnMgPT0gMCkgeyAvLyBubyBtb3JlIGxpc3RlbmVycyBmb3IgdGhpcyB0b3BpY1xuXHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0Ly8gfVx0XG5cdFx0XHRpZiAoLS10aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljfSlcblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cblx0XHRcblx0fVxuXG5cblxuXG5cdCQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCB7XG5cblx0XHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdFx0Y29uc3QgY2xpZW50ID0gbmV3IEJyb2tlckNsaWVudCgpXG5cdFx0XHRjbGllbnQuY29ubmVjdCgpXG5cblx0XHRcdHJldHVybiBjbGllbnRcblx0XHR9LFxuXG5cdFx0JGlmYWNlOiBgXG5cdFx0XHRlbWl0VG9waWModG9waWNOYW1lLCBkYXRhKTtcblx0XHRcdHJlZ2lzdGVyKHRvcGljTmFtZSwgY2FsbGJhY2spO1xuXHRcdFx0dW5yZWdpc3Rlcih0b3BpY05hbWUsIGNhbGxiYWNrKTtcblx0XHRcdG9uVG9waWModG9waWNOYW1lLCBjYWxsYmFjaylcblxuXHRcdGBcblx0fSlcblxuXG59KSgpO1xuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdDogZnVuY3Rpb24ocGF0aCwgb3B0aW9ucykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgcGF0aClcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2ZpbGVzL2xpc3QnLCB7cGF0aCwgb3B0aW9uc30pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gJy9hcGkvZmlsZXMvbG9hZD9maWxlTmFtZT0nICsgZmlsZU5hbWVcblx0XHRcdH0sXG5cblx0XHRcdGZpbGVUaHVtYm5haWxVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lLCBzaXplKSB7XG5cdFx0XHRcdHJldHVybiBgL2FwaS9maWxlcy9sb2FkVGh1bWJuYWlsP2ZpbGVOYW1lPSR7ZmlsZU5hbWV9JnNpemU9JHtzaXplfWBcblx0XHRcdH0sXG5cblx0XHRcdHVwbG9hZEZpbGU6IGZ1bmN0aW9uKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSB1cGxvYWRGaWxlJywgc2F2ZUFzZmlsZU5hbWUpXG5cdFx0XHRcdGlmICghKGJsb2IgaW5zdGFuY2VvZiBCbG9iKSkge1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYmxvYicsIGJsb2IpXG5cdFx0XHRcdHZhciBmZCA9IG5ldyBGb3JtRGF0YSgpXG5cdFx0XHRcdGZkLmFwcGVuZCgnZmlsZScsIGJsb2IsIHNhdmVBc2ZpbGVOYW1lKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2Rlc3RQYXRoJywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3RGb3JtRGF0YSgnL2FwaS9maWxlcy9zYXZlJywgZmQpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2ZpbGVzL2RlbGV0ZScsIGZpbGVOYW1lcylcblx0XHRcdH0sXG5cblx0XHRcdG1rZGlyOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBta2RpcicsIGZpbGVOYW1lKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2ZpbGVzL21rZGlyJywge2ZpbGVOYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdG1vdmVGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBtb3ZlRmlsZXMnLCBmaWxlTmFtZXMsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2ZpbGVzL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjb3B5RmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gY29weUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9maWxlcy9jb3B5Jywge2ZpbGVOYW1lcywgZGVzdFBhdGh9KVxuXHRcdFx0fVx0XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGxpc3QocGF0aCwgb3B0aW9ucyk6UHJvbWlzZTtcblx0XHRmaWxlVXJsKGZpbGVOYW1lKTpzdHJpbmc7XG5cdFx0ZmlsZVRodW1ibmFpbFVybChmaWxlTmFtZSwgc2l6ZSk6c3RyaW5nO1xuXHRcdHVwbG9hZEZpbGUoYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoKTpQcm9taXNlO1xuXHRcdHJlbW92ZUZpbGVzKGZpbGVOYW1lcyk6UHJvbWlzZTtcblx0XHRta2RpcihmaWxlTmFtZSk6UHJvbWlzZTtcblx0XHRtb3ZlRmlsZXMoZmlsZU5hbWVzLCBkZXN0UGF0aCk6UHJvbWlzZTtcblx0XHRjb3B5RmlsZXMoZmlsZU5hbWVzLCBkZXN0UGF0aCk6UHJvbWlzZVx0XHRcdFxuXHRgXG5cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhcmFtcycsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiBKU09OLnBhcnNlKGNvbmZpZylcblx0fVxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJywgJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCwgYnJva2VyKSB7XG5cblx0XHRsZXQgc3JjSWRcblx0XHRsZXQgZGVzdElkXG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKG1zZykgPT4geyBzcmNJZCA9IG1zZy5jbGllbnRJZH0pXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0UmVtb3RlQ2xpZW50SWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gZGVzdElkXG5cdFx0XHR9LFxuXG5cdFx0XHRzZXRSZW1vdGVDbGllbnRJZDogZnVuY3Rpb24oY2xpZW50SWQpIHtcblx0XHRcdFx0ZGVzdElkID0gY2xpZW50SWRcblx0XHRcdH0sXG5cblx0XHRcdGNhbGw6IGZ1bmN0aW9uKHRvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXIvJHtzcmNJZH1gLCB7dG8sIHR5cGU6ICdjYWxsJ30pXG5cdFx0XHR9LFxuXG5cdFx0XHRjYW5jZWw6IGZ1bmN0aW9uKHRvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXIvJHtzcmNJZH1gLCB7dG8sIHR5cGU6ICdjYW5jZWwnfSlcblx0XHRcdH0sXG5cblx0XHRcdGFjY2VwdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb0NsaWVudC8ke3NyY0lkfWAsIHtkZXN0SWQsIHR5cGU6ICdhY2NlcHQnfSlcblx0XHRcdH0sXG5cblx0XHRcdGRlbnk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9DbGllbnQvJHtzcmNJZH1gLCB7ZGVzdElkLCB0eXBlOiAnZGVueSd9KVxuXHRcdFx0fSxcblxuXHRcdFx0YnllOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50LyR7c3JjSWR9YCwge2Rlc3RJZCwgdHlwZTogJ2J5ZSd9KVxuXHRcdFx0fSxcblxuXHRcdFx0Y2FuZGlkYXRlOiBmdW5jdGlvbihpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb0NsaWVudC8ke3NyY0lkfWAsIHtcblx0XHRcdFx0XHRkZXN0SWQsIFxuXHRcdFx0XHRcdHR5cGU6ICdjYW5kaWRhdGUnLCBcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRsYWJlbDogaW5mby5zZHBNTGluZUluZGV4LFxuXHRcdFx0XHRcdFx0aWQ6IGluZm8uc2RwTWlkLFxuXHRcdFx0XHRcdFx0Y2FuZGlkYXRlOiBpbmZvLmNhbmRpZGF0ZVx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0fSxcblxuXHRcdFx0b2ZmZXI6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50LyR7c3JjSWR9YCwge2Rlc3RJZCwgdHlwZTogJ29mZmVyJywgZGF0YX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhbnN3ZXI6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50LyR7c3JjSWR9YCwge2Rlc3RJZCwgdHlwZTogJ2Fuc3dlcicsIGRhdGF9KVxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRnZXRSZW1vdGVDbGllbnRJZCgpOnN0cmluZztcblx0XHRzZXRSZW1vdGVDbGllbnRJZChjbGllbnRJZCk7XG5cdFx0Y2FsbCh0byk6UHJvbWlzZTtcblx0XHRjYW5jZWwodG8pOlByb21pc2U7XG5cdFx0ZGVueSgpOlByb21pc2U7XG5cdFx0YnllKCk6UHJvbWlzZTtcblx0XHRjYW5kaWRhdGUoaW5mbyk6UHJvbWlzZTtcblx0XHRvZmZlcihkYXRhKTpQcm9taXNlO1xuXHRcdGFuc3dlcihkYXRhKTpQcm9taXNlXG5cdGBcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNjaGVkdWxlcicsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBwYXJhbXMpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBwYXJhbXMgPT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRjb25zdCBrZXlzID0gW11cblx0XHRcdFx0XHRmb3IobGV0IGkgaW4gcGFyYW1zKSB7XG5cdFx0XHRcdFx0XHRrZXlzLnB1c2goaSArICc9JyArIHBhcmFtc1tpXSlcblx0XHRcdFx0XHR9XG5cdFx0XG5cdFx0XHRcdFx0bG9jYXRpb24uaHJlZiA9IGAvYXBwcy8ke2FwcE5hbWV9P2AgKyBrZXlzLmpvaW4oJyYnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGxvY2F0aW9uLmhyZWYgPSBgL2FwcHMvJHthcHBOYW1lfWBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0bG9nb3V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bG9jYXRpb24uaHJlZiA9ICcvbG9nb3V0J1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRvcGVuQXBwKGFwcE5hbWUsIHBhcmFtcyk7XG5cdFx0bG9nb3V0KClcblx0YFxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QudXNlcnMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHRcdH0sXG5cblx0XHRcdG1hdGNoOiBmdW5jdGlvbihtYXRjaFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvYXBpL3VzZXJzP21hdGNoPSR7bWF0Y2hVc2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGQ6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS91c2VycycsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvYXBpL3VzZXJzLyR7dXNlcn1gKVxuXHRcdFx0fSxcblxuXHRcdFx0dXBkYXRlOiBmdW5jdGlvbih1c2VyLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnB1dChgL2FwaS91c2Vycy8ke3VzZXJ9YCwgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdGdldDogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9hcGkvdXNlcnMvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRhY3RpdmF0ZUFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvdXNlcnMvYWN0aXZhdGVBcHBgLCB7YXBwTmFtZSwgYWN0aXZhdGVkfSlcblx0XHRcdH0sXG5cblx0XHRcdHNlbmROb3RpZjogZnVuY3Rpb24odG8sIG5vdGlmKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvdXNlcnMvc2VuZE5vdGlmYCwge3RvLCBub3RpZn0pXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVOb3RpZjogZnVuY3Rpb24obm90aWZJZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC9hcGkvdXNlcnMvcmVtb3ZlTm90aWYvJHtub3RpZklkfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXROb3RpZnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9hcGkvdXNlcnMvZ2V0Tm90aWZzYClcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdGdldE5vdGlmQ291bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9hcGkvdXNlcnMvZ2V0Tm90aWZDb3VudGApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRGcmllbmRzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvYXBpL3VzZXJzL2dldEZyaWVuZHNgKVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkRnJpZW5kOiBmdW5jdGlvbihmcmllbmRVc2VyTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3VzZXJzL2FkZEZyaWVuZGAsIHtmcmllbmRVc2VyTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0fVxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRsaXN0KCk6UHJvbWlzZTtcblx0XHRhZGQoZGF0YSk6UHJvbWlzZTtcblx0XHRyZW1vdmUodXNlcik6UHJvbWlzZTtcblx0XHR1cGRhdGUodXNlciwgZGF0YSk6UHJvbWlzZTtcblx0XHRnZXQodXNlcik6UHJvbWlzZTtcblx0XHRhY3RpdmF0ZUFwcChhcHBOYW1lLCBhY3RpdmF0ZWQpOlByb21pc2U7XG5cdFx0c2VuZE5vdGlmKHRvLCBub3RpZik6UHJvbWlzZTtcblx0XHRyZW1vdmVOb3RpZihub3RpZklkKTpQcm9taXNlO1xuXHRcdGdldE5vdGlmcygpOlByb21pc2U7XG5cdFx0Z2V0Tm90aWZDb3VudCgpOlByb21pc2U7XG5cdFx0Z2V0RnJpZW5kcygpOlByb21pc2Vcblx0YFxufSk7XG4iXX0=
