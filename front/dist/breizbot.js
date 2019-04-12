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

$$.control.registerControl('breizbot.users', {
	deps: ['breizbot.users'],

	template: "<div class=\"main\">\n	<button bn-event=\"click: onAddUser\" class=\"w3-btn w3-blue btnAddUser\">Add User</button>\n	<div bn-control=\"brainjs.table\"\n		bn-event=\"tablecmd: onTableCmd\"\n		bn-data=\"{columns, data}\"></div>	\n</div>\n",

	init: function(elt, users) {



		const dlgAddUser = $$.formDialogController({
			title: 'Add User',
			template: "<div class=\"breizbot-users dlgAddUser\">\n	<input type=\"text\" placeholder=\"username\" name=\"username\" required>\n	<input type=\"text\" placeholder=\"pseudo\" name=\"pseudo\" required>\n	<input type=\"text\" placeholder=\"location\" name=\"location\" required>\n	<input type=\"email\" placeholder=\"email\" name=\"email\" required>	\n</div>\n"
		})

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
					dlgAddUser.show(function(data) {
						users.add(data).then(getUsers)
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

	}
});

$$.service.registerService('breizbot.apps', ['brainjs.http'], function(config, http) {


	return {
		listAll: function() {
			return http.get('/api/apps/all')
		},

		listMyApp: function() {
			return http.get('/api/apps/myapp')
		}
		
	}
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




	$$.service.registerService('breizbot.broker', function(config) {

		const client = new BrokerClient()
		client.connect()

		return client;
	})


})();


$$.service.registerService('breizbot.files', ['brainjs.http'], function(config, http) {

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

});

$$.service.registerService('breizbot.params', function(config) {


	return JSON.parse(config)
});

$$.service.registerService('breizbot.rtc', ['brainjs.http', 'breizbot.broker'], function(config, http, broker) {

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
});

$$.service.registerService('breizbot.scheduler', function(config) {


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
});

$$.service.registerService('breizbot.users', ['brainjs.http'], function(config, http) {


	return {
		list: function() {
			return http.get('/api/users')
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
	}
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJhcHBzL2FwcHMuanMiLCJmaWxlcy9maWxlcy5qcyIsImhlYWRlci9oZWFkZXIuanMiLCJob21lL2hvbWUuanMiLCJ1c2Vycy91c2Vycy5qcyIsImFwcHMuanMiLCJicm9rZXIuanMiLCJmaWxlcy5qcyIsInBhcmFtcy5qcyIsInJ0Yy5qcyIsInNjaGVkdWxlci5qcyIsInVzZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3h3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJicmVpemJvdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogRXZlbnRFbWl0dGVyMlxuICogaHR0cHM6Ly9naXRodWIuY29tL2hpajFueC9FdmVudEVtaXR0ZXIyXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSA/IEFycmF5LmlzQXJyYXkgOiBmdW5jdGlvbiBfaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgfTtcbiAgdmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGlmICh0aGlzLl9jb25mKSB7XG4gICAgICBjb25maWd1cmUuY2FsbCh0aGlzLCB0aGlzLl9jb25mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmUoY29uZikge1xuICAgIGlmIChjb25mKSB7XG4gICAgICB0aGlzLl9jb25mID0gY29uZjtcblxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCA/IGNvbmYubWF4TGlzdGVuZXJzIDogZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xuICAgICAgY29uZi5uZXdMaXN0ZW5lciAmJiAodGhpcy5uZXdMaXN0ZW5lciA9IGNvbmYubmV3TGlzdGVuZXIpO1xuICAgICAgY29uZi52ZXJib3NlTWVtb3J5TGVhayAmJiAodGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGNvbmYudmVyYm9zZU1lbW9yeUxlYWspO1xuXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhayhjb3VudCwgZXZlbnROYW1lKSB7XG4gICAgdmFyIGVycm9yTXNnID0gJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAnbGVhayBkZXRlY3RlZC4gJyArIGNvdW50ICsgJyBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJztcblxuICAgIGlmKHRoaXMudmVyYm9zZU1lbW9yeUxlYWspe1xuICAgICAgZXJyb3JNc2cgKz0gJyBFdmVudCBuYW1lOiAnICsgZXZlbnROYW1lICsgJy4nO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVtaXRXYXJuaW5nKXtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKGVycm9yTXNnKTtcbiAgICAgIGUubmFtZSA9ICdNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcnO1xuICAgICAgZS5lbWl0dGVyID0gdGhpcztcbiAgICAgIGUuY291bnQgPSBjb3VudDtcbiAgICAgIHByb2Nlc3MuZW1pdFdhcm5pbmcoZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICBpZiAoY29uc29sZS50cmFjZSl7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoY29uZikge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMubmV3TGlzdGVuZXIgPSBmYWxzZTtcbiAgICB0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gZmFsc2U7XG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XG4gIH1cbiAgRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7IC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGZvciBleHBvcnRpbmcgRXZlbnRFbWl0dGVyIHByb3BlcnR5XG5cbiAgLy9cbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxuICAvLyBlbGVtZW50cyAobGVhZnMpIGlmIHRoZXJlIGFyZSBtYXRjaGVzXG4gIC8vXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xuICAgIGlmICghdHJlZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgbGlzdGVuZXJzPVtdLCBsZWFmLCBsZW4sIGJyYW5jaCwgeFRyZWUsIHh4VHJlZSwgaXNvbGF0ZWRCcmFuY2gsIGVuZFJlYWNoZWQsXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgLy9cbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xuICAgICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzW2xlYWZdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoY3VycmVudFR5cGUgPT09ICcqJyB8fCBjdXJyZW50VHlwZSA9PT0gJyoqJykgfHwgdHJlZVtjdXJyZW50VHlwZV0pIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XG4gICAgICAvLyBvciB0aGVyZSBpcyBhIGNvbmNyZXRlIG1hdGNoIGF0IHRoaXMgcGF0Y2hcbiAgICAgIC8vXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9IGVsc2UgaWYoY3VycmVudFR5cGUgPT09ICcqKicpIHtcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIG5leHQgZWxlbWVudCBoYXMgYSBfbGlzdGVuZXJzLCBhZGQgaXQgdG8gdGhlIGhhbmRsZXJzLlxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSAnKicgfHwgYnJhbmNoID09PSAnKionKSB7XG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xuICAgIH1cblxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xuICAgIGlmICh4VHJlZSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXG4gICAgICAvL1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcbiAgICB9XG5cbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xuICAgIGlmKHh4VHJlZSkge1xuICAgICAgaWYoaSA8IHR5cGVMZW5ndGgpIHtcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxuICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGFycmF5cyBvZiBtYXRjaGluZyBuZXh0IGJyYW5jaGVzIGFuZCBvdGhlcnMuXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBjdXJyZW50VHlwZSkge1xuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHsgJyoqJzogaXNvbGF0ZWRCcmFuY2ggfSwgaSsxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gIH1cblxuICBmdW5jdGlvbiBncm93TGlzdGVuZXJUcmVlKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG5cbiAgICAvL1xuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxuICAgIC8vXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcblxuICAgIHdoaWxlIChuYW1lICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgaWYgKCF0cmVlW25hbWVdKSB7XG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnNdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICF0cmVlLl9saXN0ZW5lcnMud2FybmVkICYmXG4gICAgICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gdGhpcy5fbWF4TGlzdGVuZXJzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhay5jYWxsKHRoaXMsIHRyZWUuX2xpc3RlbmVycy5sZW5ndGgsIG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuICAvLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbiAgLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4gIC8vXG4gIC8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuICAvLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmRlbGltaXRlciA9ICcuJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgICBpZiAobiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICAgICAgaWYgKCF0aGlzLl9jb25mKSB0aGlzLl9jb25mID0ge307XG4gICAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XG4gICAgfVxuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnQgPSAnJztcblxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHJldHVybiB0aGlzLl9vbmNlKGV2ZW50LCBmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHJldHVybiB0aGlzLl9vbmNlKGV2ZW50LCBmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbiwgcHJlcGVuZCkge1xuICAgIHRoaXMuX21hbnkoZXZlbnQsIDEsIGZuLCBwcmVwZW5kKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCBmYWxzZSk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRNYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgdHJ1ZSk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4sIHByZXBlbmQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgaWYgKC0tdHRsID09PSAwKSB7XG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XG5cbiAgICB0aGlzLl9vbihldmVudCwgbGlzdGVuZXIsIHByZXBlbmQpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGFyZ3MsbCxpLGo7XG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZiAodGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9hbGwuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgICAvLyBuZWVkIHRvIG1ha2UgY29weSBvZiBoYW5kbGVycyBiZWNhdXNlIGxpc3QgY2FuIGNoYW5nZSBpbiB0aGUgbWlkZGxlXG4gICAgICAgIC8vIG9mIGVtaXQgY2FsbFxuICAgICAgICBoYW5kbGVyID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIubGVuZ3RoKSB7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuICEhdGhpcy5fYWxsO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFzeW5jID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtmYWxzZV0pOyB9XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2VzPSBbXTtcblxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGFyZ3MsbCxpLGo7XG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZiAodGhpcy5fYWxsKSB7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyICYmIGhhbmRsZXIubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcykpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChhcmd1bWVudHNbMV0pOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uQW55ID0gZnVuY3Rpb24oZm4sIHByZXBlbmQpe1xuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYWxsKSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZ1bmN0aW9uIHRvIHRoZSBldmVudCBsaXN0ZW5lciBjb2xsZWN0aW9uLlxuICAgIGlmKHByZXBlbmQpe1xuICAgICAgdGhpcy5fYWxsLnVuc2hpZnQoZm4pO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5fYWxsLnB1c2goZm4pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fb25BbnkodHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbiBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBncm93TGlzdGVuZXJUcmVlLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHNbdHlwZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRvIGFycmF5LlxuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYWRkXG4gICAgICBpZihwcmVwZW5kKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgJiZcbiAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gdGhpcy5fbWF4TGlzdGVuZXJzXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhay5jYWxsKHRoaXMsIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgsIHR5cGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0uX29yaWdpbiAmJiBoYW5kbGVyc1tpXS5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGFuZGxlcnMgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdCkge1xuICAgICAgaWYgKHJvb3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJvb3QpO1xuICAgICAgZm9yICh2YXIgaSBpbiBrZXlzKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgb2JqID0gcm9vdFtrZXldO1xuICAgICAgICBpZiAoKG9iaiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB8fCAodHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIikgfHwgKG9iaiA9PT0gbnVsbCkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3Rba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgZGVsZXRlIHJvb3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHRoaXMubGlzdGVuZXJUcmVlKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XG4gICAgaWYgKGZuICYmIHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoID4gMCkge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihmbiA9PT0gZm5zW2ldKSB7XG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKylcbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm5zW2ldKTtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmY7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcblxuICAgICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHMpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlcnMsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgICByZXR1cm4gaGFuZGxlcnM7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZXZlbnRzKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5saXN0ZW5lcnModHlwZSkubGVuZ3RoO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzQW55ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih0aGlzLl9hbGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbC5cbiAgICB3aW5kb3cuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxufSgpO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBzOiBbXVxuXHR9LFxuXG5cdCRpZmFjZTogJ3NldERhdGEoZGF0YSknLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYXBwc1xcXCIgYm4taXRlcj1cXFwiYXBwXFxcIiBjbGFzcz1cXFwibWFpblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrXFxcIj5cdFx0XHRcXG5cdFx0PGRpdiBjbGFzcz1cXFwidGlsZSB3My1idG5cXFwiIGJuLWF0dHI9XFxcIntjbGFzczogYHRpbGUgdzMtYnRuICR7YXBwLnByb3BzLmNvbG9yQ2xzfWB9XFxcIiBibi1kYXRhPVxcXCJ7aXRlbTogYXBwfVxcXCI+XFxuXHRcdFx0PGRpdiBibi1zaG93PVxcXCJ0eXBlb2YgYXBwLnByb3BzLmljb25DbHMgPT0gXFwnc3RyaW5nXFwnXFxcIiBzdHlsZT1cXFwibWFyZ2luLWJvdHRvbTogNXB4O1xcXCI+XFxuXHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGFwcC5wcm9wcy5pY29uQ2xzfVxcXCI+PC9pPlxcblx0XHRcdDwvZGl2Plxcblxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImFwcC5wcm9wcy50aXRsZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiB0aGlzLnByb3BzLmFwcHNcblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRpbGVDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDbGljaycsICQodGhpcykuZGF0YSgnaXRlbScpKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdhcHBjbGljaycsICQodGhpcykuZGF0YSgnaXRlbScpKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGN0cmwuc2V0RGF0YShkYXRhKVxuXHRcdH1cblx0fVxufSk7XG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWxlcycsIHtcblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLCBcblx0cHJvcHM6IHtcblx0XHRzaG93VG9vbGJhcjogdHJ1ZSxcblx0XHRpbWFnZU9ubHk6IGZhbHNlLFxuXHRcdGZpbHRlckV4dGVuc2lvbjogdW5kZWZpbmVkLFxuXHRcdHNob3dUaHVtYm5haWw6IGZhbHNlLFxuXHRcdHRodW1ibmFpbFNpemU6ICc/eDEwMCcsXG5cdFx0bWF4VXBsb2FkU2l6ZTogMioxMDI0KjIwMTQgLy8gMiBNb1x0XHRcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50UGFuZWxcXFwiPlxcblxcblx0PGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCIgYm4tc2hvdz1cXFwic2hvd1Rvb2xiYXJcXFwiPlxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIk5ldyBmb2xkZXJcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ3JlYXRlRm9sZGVyXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtZm9sZGVyLW9wZW5cXFwiPjwvaT48L2J1dHRvbj5cdFx0XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJJbXBvcnQgZmlsZVxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25JbXBvcnRGaWxlXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtdXBsb2FkXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiVG9nZ2xlIFNlbGVjdCBNb2RlXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2dsZVNlbE1vZGVcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jaGVja1xcXCI+PC9pPjwvYnV0dG9uPlx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udHJvbGdyb3VwXFxcIj5cXG5cdFx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJEZWxldGVcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRGVsZXRlRmlsZXNcXFwiXFxuXHRcdFx0XHRibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFoYXNTZWxlY3Rpb259XFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJDdXRcXFwiXFxuXHRcdFx0XHRibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFoYXNTZWxlY3Rpb259XFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkN1dEZpbGVzXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY3V0XFxcIj48L2k+PC9idXR0b24+XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJDb3B5XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaGFzU2VsZWN0aW9ufVxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Db3B5RmlsZXNcXFwiXFxuXHRcdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLWNvcHlcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJQYXN0ZVxcXCJcXG5cdFx0XHRcdGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWhhc1NlbGVjdGVkRmlsZXMoKX1cXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUGFzdGVGaWxlc1xcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXBhc3RlXFxcIj48L2k+PC9idXR0b24+XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwicGF0aFBhbmVsXFxcIj5cXG5cdFx0UGF0aDombmJzcDs8c3BhbiBibi10ZXh0PVxcXCJyb290RGlyXFxcIj48L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cXG5cdFx0PGRpdiBibi1lYWNoPVxcXCJmaWxlc1xcXCIgXFxuXHRcdFx0Ym4taXRlcj1cXFwiZlxcXCIgXFxuXHRcdFx0Y2xhc3M9XFxcImNvbnRhaW5lclxcXCJcXG5cdFx0XHRibi1iaW5kPVxcXCJmaWxlc1xcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLmZvbGRlcjogb25Gb2xkZXJDbGljaywgY2xpY2suY2hlY2s6IG9uQ2hlY2tDbGljaywgY2xpY2suZmlsZTogb25GaWxlQ2xpY2tcXFwiPlxcblx0XHRcdFxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbCB3My1idG5cXFwiIGJuLWRhdGE9XFxcIntpbmZvOiBmfVxcXCI+XHRcXG5cdFx0XHRcdFx0PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1zaG93PVxcXCJzZWxlY3RNb2RlICYmIGYubmFtZSAhPSBcXCcuLlxcJ1xcXCIgY2xhc3M9XFxcImNoZWNrIHczLWNoZWNrXFxcIj5cdFx0XFxuXHRcdFx0XHRcdDxkaXYgYm4taWY9XFxcImYuZm9sZGVyXFxcIiBjbGFzcz1cXFwiZm9sZGVyXFxcIj5cXG5cdFx0XHRcdFx0XHQ8ZGl2Plxcblx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLTR4IGZhLWZvbGRlci1vcGVuIHczLXRleHQtYmx1ZS1ncmV5XFxcIj48L2k+XFxuXHRcdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdFx0XFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZi5uYW1lXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLWlmPVxcXCIhZi5mb2xkZXIgJiYgKCFmLmlzSW1hZ2UgfHwgIXNob3dUaHVtYm5haWwpXFxcIiBibi1hdHRyPVxcXCJ7dGl0bGU6IGdldFNpemUoZi5zaXplKX1cXFwiIGNsYXNzPVxcXCJmaWxlXFxcIj5cXG5cdFx0XHRcdFx0XHQ8ZGl2Plxcblx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLTR4IGZhLWZpbGUgdzMtdGV4dC1ibHVlLWdyZXlcXFwiPjwvaT5cXG5cdFx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJmLm5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9kaXY+XHRcdFx0XFxuXFxuXHRcdFx0XHRcdDxkaXYgYm4taWY9XFxcIiFmLmZvbGRlciAmJiBmLmlzSW1hZ2UgJiYgc2hvd1RodW1ibmFpbFxcXCIgYm4tYXR0cj1cXFwie3RpdGxlOiBnZXRTaXplKGYuc2l6ZSl9XFxcIiBjbGFzcz1cXFwiZmlsZVxcXCI+XFxuXHRcdFx0XHRcdFx0PGRpdj5cXG5cdFx0XHRcdFx0XHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogZ2V0VGh1bWJuYWlsVXJsKGYubmFtZSl9XFxcIj5cXG5cdFx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XHRcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJmLm5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9kaXY+XHRcdFx0XFxuXFxuXHRcdFx0XHRcXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCB7XG5cdFx0XHRzaG93VG9vbGJhcixcblx0XHRcdCBtYXhVcGxvYWRTaXplLFxuXHRcdFx0IGZpbHRlckV4dGVuc2lvbixcblx0XHRcdCBpbWFnZU9ubHksXG5cdFx0XHQgdGh1bWJuYWlsU2l6ZSxcblx0XHRcdCBzaG93VGh1bWJuYWlsXG5cdFx0XHR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHNob3dUaHVtYm5haWwsXG5cdFx0XHRcdHRodW1ibmFpbFNpemUsXG5cdFx0XHRcdHNob3dUb29sYmFyLFxuXHRcdFx0XHRyb290RGlyOiAnLycsXG5cdFx0XHRcdHNlbGVjdE1vZGU6IGZhbHNlLFxuXHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdHNlbGVjdGVkRmlsZXM6IFtdLFxuXHRcdFx0XHRvcGVyYXRpb246ICdub25lJyxcblx0XHRcdFx0aGFzU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdFx0c3J2RmlsZXMsXG5cdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uKHNpemUpIHtcblx0XHRcdFx0XHRyZXR1cm4gJ1NpemUgOiAnICsgTWF0aC5mbG9vcihzaXplLzEwMjQpICsgJyBLbydcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRoYXNTZWxlY3RlZEZpbGVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRGaWxlcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFRodW1ibmFpbFVybDogZnVuY3Rpb24oZmlsZU5hbWUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc3J2RmlsZXMuZmlsZVRodW1ibmFpbFVybChyb290RGlyICsgZmlsZU5hbWUsIHRodW1ibmFpbFNpemUpXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmRhdGEoJ2luZm8nKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRmlsZUNsaWNrJywgaW5mbylcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZmlsZWNsaWNrJywge1xuXHRcdFx0XHRcdFx0ZmlsZU5hbWU6IGluZm8ubmFtZSwgXG5cdFx0XHRcdFx0XHRyb290RGlyOiBjdHJsLm1vZGVsLnJvb3REaXIsXG5cdFx0XHRcdFx0XHRpc0ltYWdlOiBpbmZvLmlzSW1hZ2Vcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNoZWNrQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2hlY2tDbGljaycpXG5cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2hhc1NlbGVjdGlvbjogKGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmxlbmd0aCA+IDApfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Gb2xkZXJDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuZGF0YSgnaW5mbycpXG5cblx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Gb2xkZXJDbGljaycsIGRpck5hbWUpXG5cdFx0XHRcdFx0aWYgKGRpck5hbWUgPT0gJy4uJykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc3BsaXQgPSBjdHJsLm1vZGVsLnJvb3REaXIuc3BsaXQoJy8nKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0c3BsaXQucG9wKClcblx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRsb2FkRGF0YShzcGxpdC5qb2luKCcvJykgKyAnLycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0bG9hZERhdGEoY3RybC5tb2RlbC5yb290RGlyICsgZGlyTmFtZSArICcvJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ3JlYXRlRm9sZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgcm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogJ0ZvbGRlciBuYW1lOicsIFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdOZXcgRm9sZGVyJ1xuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uKGZvbGRlck5hbWUpIHtcblx0XHRcdFx0XHRcdHNydkZpbGVzLm1rZGlyKHJvb3REaXIgKyBmb2xkZXJOYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRvZ2dsZVNlbE1vZGU6IGZ1bmN0aW9uKClcdHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Ub2dnbGVTZWxNb2RlJylcblxuXHRcdFx0XHRcdHNldFNlbE1vZGUoIWN0cmwubW9kZWwuc2VsZWN0TW9kZSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkRlbGV0ZUZpbGVzOiBmdW5jdGlvbihldikge1xuXG5cdFx0XHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBnZXRTZWxGaWxlcygpXG5cblx0XHRcdFx0XHRpZiAoc2VsRmlsZXMubGVuZ3RoID09IDApIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJyxcblx0XHRcdFx0XHRcdFx0Y29udGVudDogJ05vIGZpbGVzIHNlbGVjdGVkJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPycsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcydcblx0XHRcdFx0XHR9LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHNydkZpbGVzLnJlbW92ZUZpbGVzKHNlbEZpbGVzKVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkN1dEZpbGVzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkN1dEZpbGVzJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlczogZ2V0U2VsRmlsZXMoKSxcblx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2N1dCdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdHNldFNlbE1vZGUoZmFsc2UpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Db3B5RmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29weUZpbGVzJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlczogZ2V0U2VsRmlsZXMoKSxcblx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2NvcHknXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZXRTZWxNb2RlKGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblBhc3RlRmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUGFzdGVGaWxlcycpXG5cdFx0XHRcdFx0Y29uc3Qge3Jvb3REaXIsIHNlbGVjdGVkRmlsZXMsIG9wZXJhdGlvbn0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y29uc3QgcHJvbWlzZSA9IFxuXHRcdFx0XHRcdFx0KG9wZXJhdGlvbiA9PSAnY29weScpID8gc3J2RmlsZXMuY29weUZpbGVzKHNlbGVjdGVkRmlsZXMsIHJvb3REaXIpIDogc3J2RmlsZXMubW92ZUZpbGVzKHNlbGVjdGVkRmlsZXMsIHJvb3REaXIpXG5cblx0XHRcdFx0XHRwcm9taXNlXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0bG9hZERhdGEoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW1wb3J0RmlsZTogZnVuY3Rpb24oZXYpIHtcblxuXHRcdFx0XHRcdCQkLnV0aWwub3BlbkZpbGVEaWFsb2coZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZVNpemUnLCBmaWxlLnNpemUgLyAxMDI0KVxuXHRcdFx0XHRcdFx0aWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZFNpemUpIHtcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtjb250ZW50OiAnRmlsZSB0b28gYmlnJywgdGl0bGU6ICdJbXBvcnQgZmlsZSd9KVxuXHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQkLnV0aWwucmVhZEZpbGVBc0RhdGFVUkwoZmlsZSwgZnVuY3Rpb24oZGF0YVVSTCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YVVSTCcsIGRhdGFVUkwpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGJsb2IgPSAkJC51dGlsLmRhdGFVUkx0b0Jsb2IoZGF0YVVSTClcblx0XHRcdFx0XHRcdFx0c3J2RmlsZXMudXBsb2FkRmlsZShibG9iLCBmaWxlLm5hbWUsIGN0cmwubW9kZWwucm9vdERpcikudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsIHRpdGxlOiAnRXJyb3InfSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHNldFNlbE1vZGUoc2VsTW9kZSkge1xuXHRcdFx0aWYgKHNlbE1vZGUgPT0gZmFsc2UpIHtcblx0XHRcdFx0Y3RybC5tb2RlbC5oYXNTZWxlY3Rpb24gPSBmYWxzZVxuXHRcdFx0fVxuXHRcdFx0Y3RybC5tb2RlbC5zZWxlY3RNb2RlID0gc2VsTW9kZVxuXHRcdFx0Y3RybC5mb3JjZVVwZGF0ZSgnZmlsZXMnKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlbEZpbGVzKCkge1xuXHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBbXVxuXHRcdFx0ZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc3QgZmlsZU5hbWUgPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5kYXRhKCduYW1lJylcblx0XHRcdFx0c2VsRmlsZXMucHVzaChjdHJsLm1vZGVsLnJvb3REaXIgKyBmaWxlTmFtZSlcblx0XHRcdH0pXG5cdFx0XHRjb25zb2xlLmxvZygnc2VsRmlsZXMnLCBzZWxGaWxlcylcdFxuXHRcdFx0cmV0dXJuIHNlbEZpbGVzXHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWREYXRhKHJvb3REaXIpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2xvYWREYXRhJywgcm9vdERpcilcblx0XHRcdGlmIChyb290RGlyID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHR9XG5cdFx0XHRzcnZGaWxlcy5saXN0KHJvb3REaXIsIHtmaWx0ZXJFeHRlbnNpb24sIGltYWdlT25seX0pLnRoZW4oZnVuY3Rpb24oZmlsZXMpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdFx0aWYgKHJvb3REaXIgIT0gJy8nKSB7XG5cdFx0XHRcdFx0ZmlsZXMudW5zaGlmdCh7bmFtZTogJy4uJywgZm9sZGVyOiB0cnVlfSlcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZmlsZXMsIHJvb3REaXIsIHNlbGVjdE1vZGU6IGZhbHNlLCBoYXNTZWxlY3Rpb246IGZhbHNlfSlcblxuXHRcdFx0fSlcdFx0XG5cdFx0fVxuXG5cdFx0bG9hZERhdGEoKVxuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZScpXG5cdFx0XHRsb2FkRGF0YSgpXG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogJ3VwZGF0ZSgpJ1xuXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5oZWFkZXInLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LnNjaGVkdWxlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJyxcblx0XHRzaG93SG9tZTogdHJ1ZSxcblx0XHR0aXRsZTogJydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJoZWFkZXIgdzMtdGVhbFxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8YSBibi1zaG93PVxcXCJzaG93SG9tZVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgaHJlZj1cXFwiL1xcXCIgdGl0bGU9XFxcIkdvIEhvbWVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLWxnXFxcIj48L2k+XFxuXHRcdDwvYT5cdFx0XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzSW5jb21pbmdDYWxsXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25DYWxsUmVzcG9uc2VcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJywgXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0YWNjZXB0OiB7bmFtZTogXFwnQWNjZXB0XFwnfSxcXG5cdFx0XHRcdGRlbnk6IHtuYW1lOiBcXCdEZW55XFwnfSxcXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZSBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImNhbGxlclxcXCI+PC9zcGFuPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1kb3duIGZhLWxnXFxcIj48L2k+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuXHQ8c3Ryb25nIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3N0cm9uZz5cXG5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmaWNhdGlvbiB3My1idXR0b25cXFwiIHRpdGxlPVxcXCJOb3RpZmljYXRpb25cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ob3RpZmljYXRpb25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1iZWxsIHczLXRleHQtd2hpdGVcXFwiID48L2k+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJhZGdlIHczLXJlZCB3My10aW55XFxcIiBibi10ZXh0PVxcXCJuYk5vdGlmXFxcIiBibi1zaG93PVxcXCJuYk5vdGlmID4gMFxcXCI+PC9zcGFuPlx0XHRcdFxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7aXRlbXN9XFxcIiBcXG5cdFx0XHRkYXRhLXRyaWdnZXI9XFxcImxlZnRcXFwiIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlciBmYS1sZ1xcXCI+PC9pPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidXNlck5hbWVcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd24gZmEtbGdcXFwiPjwvaT5cXG4gICAgXHRcXG5cdFx0PC9kaXY+XFxuXHRcdFxcblx0PC9kaXY+XFxuXFxuXHRcXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlciwgdXNlcnMsIHJ0Yywgc2NoZWR1bGVyKSB7XG5cblx0XHRjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygnL2Fzc2V0cy9za3lwZS5tcDMnKVxuXHRcdGF1ZGlvLmxvb3AgPSB0cnVlXG5cdFxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aXRlbXM6IHtcblx0XHRcdFx0XHRwd2Q6IHtuYW1lOiAnQ2hhbmdlIHBhc3N3b3JkJywgaWNvbjogJ2ZhcyBmYS1sb2NrJ30sXG5cdFx0XHRcdFx0YXBwczoge25hbWU6ICdBcHBsaWNhdGlvbnMnLCBpY29uOiAnZmFzIGZhLXRoJ30sXG5cdFx0XHRcdFx0c2VwOiAnLS0tLS0tJyxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiAnTG9nb3V0JywgaWNvbjogJ2ZhcyBmYS1wb3dlci1vZmYnfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR1c2VyTmFtZTogdGhpcy5wcm9wcy51c2VyTmFtZSxcblx0XHRcdFx0c2hvd0hvbWU6IHRoaXMucHJvcHMuc2hvd0hvbWUsXG5cdFx0XHRcdHRpdGxlOiB0aGlzLnByb3BzLnRpdGxlLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsZXI6ICcnXG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhcHBzJykge1xuXHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ3N0b3JlJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6ICdubyBub3RpZmljYXRpb25zJywgdGl0bGU6ICdOb3RpZmljYXRpb25zJ30pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ25vdGlmJylcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCB7Y21kfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsUmVzcG9uc2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiBmYWxzZX0pXG5cdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHNjaGVkdWxlci5vcGVuQXBwKCd2aWRlbycsIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGVyOiBjdHJsLm1vZGVsLmNhbGxlcixcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiB1cGRhdGVOb3RpZnMobmJOb3RpZikge1xuXHRcdFx0Y3RybC5zZXREYXRhKHtuYk5vdGlmfSlcblx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcyhtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FsbCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7aGFzSW5jb21pbmdDYWxsOiB0cnVlLCBjYWxsZXI6IG1zZy5kYXRhLmZyb219KVxuXHRcdFx0cnRjLnNldFJlbW90ZUNsaWVudElkKG1zZy5zcmNJZClcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYW5jZWwnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjdHJsLnNldERhdGEoe2hhc0luY29taW5nQ2FsbDogZmFsc2V9KVxuXHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdH0pXG5cblxuXHRcdHVzZXJzLmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaG9tZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmFwcHMnLCAnYnJlaXpib3Quc2NoZWR1bGVyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBcXG5cdGJuLWRhdGE9XFxcInthcHBzfVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGlja1xcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkFwcHMsIHNjaGVkdWxlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFwcENsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdHNjaGVkdWxlci5vcGVuQXBwKGRhdGEuYXBwTmFtZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRzcnZBcHBzLmxpc3RNeUFwcCgpLnRoZW4oKGFwcHMpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7YXBwc30pXG5cdFx0fSlcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QudXNlcnMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIj5BZGQgVXNlcjwvYnV0dG9uPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnRhYmxlXFxcIlxcblx0XHRibi1ldmVudD1cXFwidGFibGVjbWQ6IG9uVGFibGVDbWRcXFwiXFxuXHRcdGJuLWRhdGE9XFxcIntjb2x1bW5zLCBkYXRhfVxcXCI+PC9kaXY+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblxuXG5cdFx0Y29uc3QgZGxnQWRkVXNlciA9ICQkLmZvcm1EaWFsb2dDb250cm9sbGVyKHtcblx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiYnJlaXpib3QtdXNlcnMgZGxnQWRkVXNlclxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInVzZXJuYW1lXFxcIiBuYW1lPVxcXCJ1c2VybmFtZVxcXCIgcmVxdWlyZWQ+XFxuXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInBzZXVkb1xcXCIgbmFtZT1cXFwicHNldWRvXFxcIiByZXF1aXJlZD5cXG5cdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwibG9jYXRpb25cXFwiIG5hbWU9XFxcImxvY2F0aW9uXFxcIiByZXF1aXJlZD5cXG5cdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgcGxhY2Vob2xkZXI9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ+XHRcXG48L2Rpdj5cXG5cIlxuXHRcdH0pXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0XHR7bmFtZTogJ3VzZXJuYW1lJywgbGFiZWw6ICdVc2VyIE5hbWUnfSxcblx0XHRcdFx0XHR7bmFtZTogJ3BzZXVkbycsIGxhYmVsOiAnUHNldWRvJ30sXG5cdFx0XHRcdFx0e25hbWU6ICdsb2NhdGlvbicsIGxhYmVsOiAnTG9jYXRpb24nfSxcblx0XHRcdFx0XHR7bmFtZTogJ2VtYWlsJywgbGFiZWw6ICdFbWFpbCd9LFxuXHRcdFx0XHRcdHtsYWJlbDogJ0FjdGlvbnMnLCBidXR0b25zOiBbXG5cdFx0XHRcdFx0XHR7Y21kOiAnZGVsZXRlJywgdGl0bGU6ICdEZWxldGUnLCBpY29uOiAnZmEgZmEtdHJhc2gnfSxcblx0XHRcdFx0XHRcdHtjbWQ6ICdub3RpZicsIHRpdGxlOiAnU2VuZCBOb3RpZmljYXRpb24nLCBpY29uOiAnZmEgZmEtYmVsbCd9LFxuXHRcdFx0XHRcdF19XG5cdFx0XHRcdF0sXG5cdFx0XHRcdGRhdGE6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkVXNlcjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRkbGdBZGRVc2VyLnNob3coZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdFx0dXNlcnMuYWRkKGRhdGEpLnRoZW4oZ2V0VXNlcnMpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJsZUNtZDogZnVuY3Rpb24oZXYsIGV2ZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IHtkYXRhLCBjbWR9ID0gZXZkYXRhXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnZGVsZXRlJykge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0NvbmZpcm0oe3RpdGxlOiAnRGVsZXRlIFVzZXInLCBjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nfSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHVzZXJzLnJlbW92ZShkYXRhLnVzZXJuYW1lKS50aGVuKGdldFVzZXJzKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnbm90aWYnKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTm90aWZpY2F0aW9uJywgbGFiZWw6ICdNZXNzYWdlJ30sIGZ1bmN0aW9uKHRleHQpIHtcblx0XHRcdFx0XHRcdFx0dXNlcnMuc2VuZE5vdGlmKGRhdGEudXNlcm5hbWUsIHRleHQpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZXRVc2VycygpIHtcblx0XHRcdHVzZXJzLmxpc3QoKS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtkYXRhfSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0Z2V0VXNlcnMoKVxuXG5cdH1cbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcHMnLCBbJ2JyYWluanMuaHR0cCddLCBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXG5cdHJldHVybiB7XG5cdFx0bGlzdEFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdH0sXG5cblx0XHRsaXN0TXlBcHA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvYXBpL2FwcHMvbXlhcHAnKVxuXHRcdH1cblx0XHRcblx0fVxufSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cblxuXHRjbGFzcyBCcm9rZXJDbGllbnQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIyIHtcblxuXHRcdGNvbnN0cnVjdG9yKCkge1xuXHRcdFx0c3VwZXIoKVxuXG5cdFx0XHR0aGlzLnNvY2sgPSBudWxsXG5cdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2Vcblx0XHRcdHRoaXMudHJ5UmVjb25uZWN0ID0gdHJ1ZVxuXHRcdFx0dGhpcy50b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7d2lsZGNhcmQ6IHRydWV9KVxuXG5cdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3MgPSB7fVxuXG5cdFx0XHRjb25zdCB7aG9zdCwgcGF0aG5hbWV9ID0gbG9jYXRpb25cblx0XHRcdGNvbnN0IHBvcnQgPSA4MDkwXG5cblx0XHRcdHRoaXMudXJsID0gYHdzczovLyR7aG9zdH06JHtwb3J0fS9obWkke3BhdGhuYW1lfWBcblx0XHR9XG5cblxuXHRcdGNvbm5lY3QoKSB7XG5cblx0XHRcdGNvbnNvbGUubG9nKCd0cnkgdG8gY29ubmVjdC4uLicpXG5cblx0XHRcdHRoaXMuc29jayA9IG5ldyBXZWJTb2NrZXQodGhpcy51cmwpXG5cdFxuXHRcdFx0dGhpcy5zb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxuXG5cdFx0XHR9KSBcblxuXHRcdFx0dGhpcy5zb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXYpID0+IHtcblx0XHRcdFx0Y29uc3QgbXNnID0gSlNPTi5wYXJzZShldi5kYXRhKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBtZXNzYWdlJywgbXNnKVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHQvLyB0aGlzLnRvcGljcy5ldmVudE5hbWVzKCkuZm9yRWFjaCgodG9waWMpID0+IHtcblx0XHRcdFx0XHQvLyBcdHRoaXMuc2VuZE1zZyh7dHlwZTogJ3JlZ2lzdGVyJywgdG9waWN9KVx0XG5cdFx0XHRcdFx0Ly8gfSlcdFx0XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGhpcy5yZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAncmVnaXN0ZXInLCB0b3BpY30pXHRcblx0XHRcdFx0XHR9KVx0XG5cblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3JlYWR5Jywge2NsaWVudElkOiBtc2cuY2xpZW50SWR9KVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRoaXMudG9waWNzLmVtaXQobXNnLnRvcGljLCBtc2cpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dGhpcy50cnlSZWNvbm5lY3QgPSBmYWxzZVxuXHRcdFx0XHRcdHNvY2suY2xvc2UoKVxuXHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHR9KVxuXG5cdFx0XHR0aGlzLnNvY2suYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAoY29kZSwgcmVhc29uKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1dTIGNsb3NlJywgY29kZSwgcmVhc29uKVxuXHRcdFx0XHRpZiAodGhpcy5pc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbQnJva2VyXSBEaXNjb25uZWN0ZWQgIScpXG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHRcdGlmICh0aGlzLnRyeVJlY29ubmVjdCkge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge3RoaXMuY29ubmVjdCgpfSwgNTAwMClcblx0XHRcdFx0fVxuXG5cdFx0XHR9KVxuXG5cdFx0fVxuXG5cblx0XHRzZW5kTXNnKG1zZykge1xuXHRcdFx0bXNnLnRpbWUgPSBEYXRlLm5vdygpXG5cdFx0XHR2YXIgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHNlbmRNc2cnLCBtc2cpXG5cdFx0XHRcdHRoaXMuc29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdHZhciBtc2cgPSB7XG5cdFx0XHRcdHR5cGU6ICdub3RpZicsXG5cdFx0XHRcdHRvcGljLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0b25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRoaXMudG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRyZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAodGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5yZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9IDFcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHR0aGlzLnNlbmRNc2coe3R5cGU6ICdyZWdpc3RlcicsIHRvcGljfSlcdFx0XHRcblx0XHR9XG5cblx0XHR1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0aGlzLnRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0Ly8gY29uc3QgbmJMaXN0ZW5lcnMgPSB0aGlzLnRvcGljcy5saXN0ZW5lcnModG9waWMpLmxlbmd0aFxuXG5cdFx0XHQvLyBpZiAobmJMaXN0ZW5lcnMgPT0gMCkgeyAvLyBubyBtb3JlIGxpc3RlbmVycyBmb3IgdGhpcyB0b3BpY1xuXHRcdFx0Ly8gXHR0aGlzLnNlbmRNc2coe3R5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWN9KVxuXHRcdFx0Ly8gfVx0XG5cdFx0XHRpZiAoLS10aGlzLnJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0dGhpcy5zZW5kTXNnKHt0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljfSlcblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cblx0XHRcblx0fVxuXG5cblxuXG5cdCQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdGNvbnN0IGNsaWVudCA9IG5ldyBCcm9rZXJDbGllbnQoKVxuXHRcdGNsaWVudC5jb25uZWN0KClcblxuXHRcdHJldHVybiBjbGllbnQ7XG5cdH0pXG5cblxufSkoKTtcblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZpbGVzJywgWydicmFpbmpzLmh0dHAnXSwgZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0cmV0dXJuIHtcblx0XHRsaXN0OiBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgcGF0aClcblxuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9maWxlcy9saXN0Jywge3BhdGgsIG9wdGlvbnN9KVxuXHRcdH0sXG5cblx0XHRmaWxlVXJsOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0cmV0dXJuICcvYXBpL2ZpbGVzL2xvYWQ/ZmlsZU5hbWU9JyArIGZpbGVOYW1lXG5cdFx0fSxcblxuXHRcdGZpbGVUaHVtYm5haWxVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lLCBzaXplKSB7XG5cdFx0XHRyZXR1cm4gYC9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbD9maWxlTmFtZT0ke2ZpbGVOYW1lfSZzaXplPSR7c2l6ZX1gXG5cdFx0fSxcblxuXHRcdHVwbG9hZEZpbGU6IGZ1bmN0aW9uKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gdXBsb2FkRmlsZScsIHNhdmVBc2ZpbGVOYW1lKVxuXHRcdFx0aWYgKCEoYmxvYiBpbnN0YW5jZW9mIEJsb2IpKSB7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdibG9iJywgYmxvYilcblx0XHRcdHZhciBmZCA9IG5ldyBGb3JtRGF0YSgpXG5cdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdGZkLmFwcGVuZCgnZGVzdFBhdGgnLCBkZXN0UGF0aClcblx0XHRcdHJldHVybiBodHRwLnBvc3RGb3JtRGF0YSgnL2FwaS9maWxlcy9zYXZlJywgZmQpXG5cdFx0fSxcblxuXHRcdHJlbW92ZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9maWxlcy9kZWxldGUnLCBmaWxlTmFtZXMpXG5cdFx0fSxcblxuXHRcdG1rZGlyOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbWtkaXInLCBmaWxlTmFtZSlcblx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvZmlsZXMvbWtkaXInLCB7ZmlsZU5hbWV9KVxuXHRcdH0sXG5cblx0XHRtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1vdmVGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2ZpbGVzL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0fSxcblxuXHRcdGNvcHlGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gY29weUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvZmlsZXMvY29weScsIHtmaWxlTmFtZXMsIGRlc3RQYXRofSlcblx0XHR9XHRcblx0fVxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYXJhbXMnLCBmdW5jdGlvbihjb25maWcpIHtcblxuXG5cdHJldHVybiBKU09OLnBhcnNlKGNvbmZpZylcbn0pO1xuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnJ0YycsIFsnYnJhaW5qcy5odHRwJywgJ2JyZWl6Ym90LmJyb2tlciddLCBmdW5jdGlvbihjb25maWcsIGh0dHAsIGJyb2tlcikge1xuXG5cdGxldCBzcmNJZFxuXHRsZXQgZGVzdElkXG5cblx0YnJva2VyLm9uKCdyZWFkeScsIChtc2cpID0+IHsgc3JjSWQgPSBtc2cuY2xpZW50SWR9KVxuXG5cdHJldHVybiB7XG5cdFx0Z2V0UmVtb3RlQ2xpZW50SWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGRlc3RJZFxuXHRcdH0sXG5cblx0XHRzZXRSZW1vdGVDbGllbnRJZDogZnVuY3Rpb24oY2xpZW50SWQpIHtcblx0XHRcdGRlc3RJZCA9IGNsaWVudElkXG5cdFx0fSxcblxuXHRcdGNhbGw6IGZ1bmN0aW9uKHRvKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyLyR7c3JjSWR9YCwge3RvLCB0eXBlOiAnY2FsbCd9KVxuXHRcdH0sXG5cblx0XHRjYW5jZWw6IGZ1bmN0aW9uKHRvKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyLyR7c3JjSWR9YCwge3RvLCB0eXBlOiAnY2FuY2VsJ30pXG5cdFx0fSxcblxuXHRcdGFjY2VwdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9DbGllbnQvJHtzcmNJZH1gLCB7ZGVzdElkLCB0eXBlOiAnYWNjZXB0J30pXG5cdFx0fSxcblxuXHRcdGRlbnk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50LyR7c3JjSWR9YCwge2Rlc3RJZCwgdHlwZTogJ2RlbnknfSlcblx0XHR9LFxuXG5cdFx0YnllOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb0NsaWVudC8ke3NyY0lkfWAsIHtkZXN0SWQsIHR5cGU6ICdieWUnfSlcblx0XHR9LFxuXG5cdFx0Y2FuZGlkYXRlOiBmdW5jdGlvbihpbmZvKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9DbGllbnQvJHtzcmNJZH1gLCB7XG5cdFx0XHRcdGRlc3RJZCwgXG5cdFx0XHRcdHR5cGU6ICdjYW5kaWRhdGUnLCBcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGxhYmVsOiBpbmZvLnNkcE1MaW5lSW5kZXgsXG5cdFx0XHRcdFx0aWQ6IGluZm8uc2RwTWlkLFxuXHRcdFx0XHRcdGNhbmRpZGF0ZTogaW5mby5jYW5kaWRhdGVcdFxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH0sXG5cblx0XHRvZmZlcjogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50LyR7c3JjSWR9YCwge2Rlc3RJZCwgdHlwZTogJ29mZmVyJywgZGF0YX0pXG5cdFx0fSxcblxuXHRcdGFuc3dlcjogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50LyR7c3JjSWR9YCwge2Rlc3RJZCwgdHlwZTogJ2Fuc3dlcicsIGRhdGF9KVxuXHRcdH1cblxuXHR9XG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5zY2hlZHVsZXInLCBmdW5jdGlvbihjb25maWcpIHtcblxuXG5cdHJldHVybiB7XG5cdFx0b3BlbkFwcDogZnVuY3Rpb24oYXBwTmFtZSwgcGFyYW1zKSB7XG5cdFx0XHRpZiAodHlwZW9mIHBhcmFtcyA9PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRjb25zdCBrZXlzID0gW11cblx0XHRcdFx0Zm9yKGxldCBpIGluIHBhcmFtcykge1xuXHRcdFx0XHRcdGtleXMucHVzaChpICsgJz0nICsgcGFyYW1zW2ldKVxuXHRcdFx0XHR9XG5cdFxuXHRcdFx0XHRsb2NhdGlvbi5ocmVmID0gYC9hcHBzLyR7YXBwTmFtZX0/YCArIGtleXMuam9pbignJicpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bG9jYXRpb24uaHJlZiA9IGAvYXBwcy8ke2FwcE5hbWV9YFxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRsb2dvdXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0bG9jYXRpb24uaHJlZiA9ICcvbG9nb3V0J1xuXHRcdH1cblx0XHRcblx0fVxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QudXNlcnMnLCBbJ2JyYWluanMuaHR0cCddLCBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXG5cdHJldHVybiB7XG5cdFx0bGlzdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdH0sXG5cblx0XHRhZGQ6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvdXNlcnMnLCBkYXRhKVxuXHRcdH0sXG5cblx0XHRyZW1vdmU6IGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL2FwaS91c2Vycy8ke3VzZXJ9YClcblx0XHR9LFxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbih1c2VyLCBkYXRhKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wdXQoYC9hcGkvdXNlcnMvJHt1c2VyfWAsIGRhdGEpXG5cdFx0fSxcblxuXHRcdGdldDogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvYXBpL3VzZXJzLyR7dXNlcn1gKVxuXHRcdH0sXG5cblx0XHRhY3RpdmF0ZUFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3VzZXJzL2FjdGl2YXRlQXBwYCwge2FwcE5hbWUsIGFjdGl2YXRlZH0pXG5cdFx0fSxcblxuXHRcdHNlbmROb3RpZjogZnVuY3Rpb24odG8sIG5vdGlmKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3VzZXJzL3NlbmROb3RpZmAsIHt0bywgbm90aWZ9KVxuXHRcdH0sXG5cblx0XHRyZW1vdmVOb3RpZjogZnVuY3Rpb24obm90aWZJZCkge1xuXHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvYXBpL3VzZXJzL3JlbW92ZU5vdGlmLyR7bm90aWZJZH1gKVxuXHRcdH0sXG5cblx0XHRnZXROb3RpZnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvYXBpL3VzZXJzL2dldE5vdGlmc2ApXG5cdFx0fSxcblx0XHRcblx0XHRnZXROb3RpZkNvdW50OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBodHRwLmdldChgL2FwaS91c2Vycy9nZXROb3RpZkNvdW50YClcblx0XHR9LFxuXHR9XG59KTtcbiJdfQ==
