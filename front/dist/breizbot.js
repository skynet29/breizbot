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

(function(e){typeof define=="function"&&define.amd?define(["jquery"],e):typeof module=="object"&&module.exports?module.exports=function(t,n){return n===undefined&&(typeof window!="undefined"?n=require("jquery"):n=require("jquery")(t)),e(n),n}:e(jQuery)})(function(e){function A(t,n,i){typeof i=="string"&&(i={className:i}),this.options=E(w,e.isPlainObject(i)?i:{}),this.loadHTML(),this.wrapper=e(h.html),this.options.clickToHide&&this.wrapper.addClass(r+"-hidable"),this.wrapper.data(r,this),this.arrow=this.wrapper.find("."+r+"-arrow"),this.container=this.wrapper.find("."+r+"-container"),this.container.append(this.userContainer),t&&t.length&&(this.elementType=t.attr("type"),this.originalElement=t,this.elem=N(t),this.elem.data(r,this),this.elem.before(this.wrapper)),this.container.hide(),this.run(n)}var t=[].indexOf||function(e){for(var t=0,n=this.length;t<n;t++)if(t in this&&this[t]===e)return t;return-1},n="notify",r=n+"js",i=n+"!blank",s={t:"top",m:"middle",b:"bottom",l:"left",c:"center",r:"right"},o=["l","c","r"],u=["t","m","b"],a=["t","b","l","r"],f={t:"b",m:null,b:"t",l:"r",c:null,r:"l"},l=function(t){var n;return n=[],e.each(t.split(/\W+/),function(e,t){var r;r=t.toLowerCase().charAt(0);if(s[r])return n.push(r)}),n},c={},h={name:"core",html:'<div class="'+r+'-wrapper">\n	<div class="'+r+'-arrow"></div>\n	<div class="'+r+'-container"></div>\n</div>',css:"."+r+"-corner {\n	position: fixed;\n	margin: 5px;\n	z-index: 1050;\n}\n\n."+r+"-corner ."+r+"-wrapper,\n."+r+"-corner ."+r+"-container {\n	position: relative;\n	display: block;\n	height: inherit;\n	width: inherit;\n	margin: 3px;\n}\n\n."+r+"-wrapper {\n	z-index: 1;\n	position: absolute;\n	display: inline-block;\n	height: 0;\n	width: 0;\n}\n\n."+r+"-container {\n	display: none;\n	z-index: 1;\n	position: absolute;\n}\n\n."+r+"-hidable {\n	cursor: pointer;\n}\n\n[data-notify-text],[data-notify-html] {\n	position: relative;\n}\n\n."+r+"-arrow {\n	position: absolute;\n	z-index: 2;\n	width: 0;\n	height: 0;\n}"},p={"border-radius":["-webkit-","-moz-"]},d=function(e){return c[e]},v=function(e){if(!e)throw"Missing Style name";c[e]&&delete c[e]},m=function(t,i){if(!t)throw"Missing Style name";if(!i)throw"Missing Style definition";if(!i.html)throw"Missing Style HTML";var s=c[t];s&&s.cssElem&&(window.console&&console.warn(n+": overwriting style '"+t+"'"),c[t].cssElem.remove()),i.name=t,c[t]=i;var o="";i.classes&&e.each(i.classes,function(t,n){return o+="."+r+"-"+i.name+"-"+t+" {\n",e.each(n,function(t,n){return p[t]&&e.each(p[t],function(e,r){return o+="	"+r+t+": "+n+";\n"}),o+="	"+t+": "+n+";\n"}),o+="}\n"}),i.css&&(o+="/* styles for "+i.name+" */\n"+i.css),o&&(i.cssElem=g(o),i.cssElem.attr("id","notify-"+i.name));var u={},a=e(i.html);y("html",a,u),y("text",a,u),i.fields=u},g=function(t){var n,r,i;r=x("style"),r.attr("type","text/css"),e("head").append(r);try{r.html(t)}catch(s){r[0].styleSheet.cssText=t}return r},y=function(t,n,r){var s;return t!=="html"&&(t="text"),s="data-notify-"+t,b(n,"["+s+"]").each(function(){var n;n=e(this).attr(s),n||(n=i),r[n]=t})},b=function(e,t){return e.is(t)?e:e.find(t)},w={clickToHide:!0,autoHide:!0,autoHideDelay:5e3,arrowShow:!0,arrowSize:5,breakNewLines:!0,elementPosition:"bottom",globalPosition:"top right",style:"bootstrap",className:"error",showAnimation:"slideDown",showDuration:400,hideAnimation:"slideUp",hideDuration:200,gap:5},E=function(t,n){var r;return r=function(){},r.prototype=t,e.extend(!0,new r,n)},S=function(t){return e.extend(w,t)},x=function(t){return e("<"+t+"></"+t+">")},T={},N=function(t){var n;return t.is("[type=radio]")&&(n=t.parents("form:first").find("[type=radio]").filter(function(n,r){return e(r).attr("name")===t.attr("name")}),t=n.first()),t},C=function(e,t,n){var r,i;if(typeof n=="string")n=parseInt(n,10);else if(typeof n!="number")return;if(isNaN(n))return;return r=s[f[t.charAt(0)]],i=t,e[r]!==undefined&&(t=s[r.charAt(0)],n=-n),e[t]===undefined?e[t]=n:e[t]+=n,null},k=function(e,t,n){if(e==="l"||e==="t")return 0;if(e==="c"||e==="m")return n/2-t/2;if(e==="r"||e==="b")return n-t;throw"Invalid alignment"},L=function(e){return L.e=L.e||x("div"),L.e.text(e).html()};A.prototype.loadHTML=function(){var t;t=this.getStyle(),this.userContainer=e(t.html),this.userFields=t.fields},A.prototype.show=function(e,t){var n,r,i,s,o;r=function(n){return function(){!e&&!n.elem&&n.destroy();if(t)return t()}}(this),o=this.container.parent().parents(":hidden").length>0,i=this.container.add(this.arrow),n=[];if(o&&e)s="show";else if(o&&!e)s="hide";else if(!o&&e)s=this.options.showAnimation,n.push(this.options.showDuration);else{if(!!o||!!e)return r();s=this.options.hideAnimation,n.push(this.options.hideDuration)}return n.push(r),i[s].apply(i,n)},A.prototype.setGlobalPosition=function(){var t=this.getPosition(),n=t[0],i=t[1],o=s[n],u=s[i],a=n+"|"+i,f=T[a];if(!f||!document.body.contains(f[0])){f=T[a]=x("div");var l={};l[o]=0,u==="middle"?l.top="45%":u==="center"?l.left="45%":l[u]=0,f.css(l).addClass(r+"-corner"),e("body").append(f)}return f.prepend(this.wrapper)},A.prototype.setElementPosition=function(){var n,r,i,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T,N,L,A,O,M,_,D,P,H,B,j;H=this.getPosition(),_=H[0],O=H[1],M=H[2],g=this.elem.position(),d=this.elem.outerHeight(),y=this.elem.outerWidth(),v=this.elem.innerHeight(),m=this.elem.innerWidth(),j=this.wrapper.position(),c=this.container.height(),h=this.container.width(),T=s[_],L=f[_],A=s[L],p={},p[A]=_==="b"?d:_==="r"?y:0,C(p,"top",g.top-j.top),C(p,"left",g.left-j.left),B=["top","left"];for(w=0,S=B.length;w<S;w++)D=B[w],N=parseInt(this.elem.css("margin-"+D),10),N&&C(p,D,N);b=Math.max(0,this.options.gap-(this.options.arrowShow?i:0)),C(p,A,b);if(!this.options.arrowShow)this.arrow.hide();else{i=this.options.arrowSize,r=e.extend({},p),n=this.userContainer.css("border-color")||this.userContainer.css("border-top-color")||this.userContainer.css("background-color")||"white";for(E=0,x=a.length;E<x;E++){D=a[E],P=s[D];if(D===L)continue;l=P===T?n:"transparent",r["border-"+P]=i+"px solid "+l}C(p,s[L],i),t.call(a,O)>=0&&C(r,s[O],i*2)}t.call(u,_)>=0?(C(p,"left",k(O,h,y)),r&&C(r,"left",k(O,i,m))):t.call(o,_)>=0&&(C(p,"top",k(O,c,d)),r&&C(r,"top",k(O,i,v))),this.container.is(":visible")&&(p.display="block"),this.container.removeAttr("style").css(p);if(r)return this.arrow.removeAttr("style").css(r)},A.prototype.getPosition=function(){var e,n,r,i,s,f,c,h;h=this.options.position||(this.elem?this.options.elementPosition:this.options.globalPosition),e=l(h),e.length===0&&(e[0]="b");if(n=e[0],t.call(a,n)<0)throw"Must be one of ["+a+"]";if(e.length===1||(r=e[0],t.call(u,r)>=0)&&(i=e[1],t.call(o,i)<0)||(s=e[0],t.call(o,s)>=0)&&(f=e[1],t.call(u,f)<0))e[1]=(c=e[0],t.call(o,c)>=0)?"m":"l";return e.length===2&&(e[2]=e[1]),e},A.prototype.getStyle=function(e){var t;e||(e=this.options.style),e||(e="default"),t=c[e];if(!t)throw"Missing style: "+e;return t},A.prototype.updateClasses=function(){var t,n;return t=["base"],e.isArray(this.options.className)?t=t.concat(this.options.className):this.options.className&&t.push(this.options.className),n=this.getStyle(),t=e.map(t,function(e){return r+"-"+n.name+"-"+e}).join(" "),this.userContainer.attr("class",t)},A.prototype.run=function(t,n){var r,s,o,u,a;e.isPlainObject(n)?e.extend(this.options,n):e.type(n)==="string"&&(this.options.className=n);if(this.container&&!t){this.show(!1);return}if(!this.container&&!t)return;s={},e.isPlainObject(t)?s=t:s[i]=t;for(o in s){r=s[o],u=this.userFields[o];if(!u)continue;u==="text"&&(r=L(r),this.options.breakNewLines&&(r=r.replace(/\n/g,"<br/>"))),a=o===i?"":"="+o,b(this.userContainer,"[data-notify-"+u+a+"]").html(r)}this.updateClasses(),this.elem?this.setElementPosition():this.setGlobalPosition(),this.show(!0),this.options.autoHide&&(clearTimeout(this.autohideTimer),this.autohideTimer=setTimeout(this.show.bind(this,!1),this.options.autoHideDelay))},A.prototype.destroy=function(){this.wrapper.data(r,null),this.wrapper.remove()},e[n]=function(t,r,i){return t&&t.nodeName||t.jquery?e(t)[n](r,i):(i=r,r=t,new A(null,r,i)),t},e.fn[n]=function(t,n){return e(this).each(function(){var i=N(e(this)).data(r);i&&i.destroy();var s=new A(e(this),t,n)}),this},e.extend(e[n],{defaults:S,addStyle:m,removeStyle:v,pluginOptions:w,getStyle:d,insertCSS:g}),m("bootstrap",{html:"<div>\n<span data-notify-text></span>\n</div>",classes:{base:{"font-weight":"bold",padding:"8px 15px 8px 14px","text-shadow":"0 1px 0 rgba(255, 255, 255, 0.5)","background-color":"#fcf8e3",border:"1px solid #fbeed5","border-radius":"4px","white-space":"nowrap","padding-left":"25px","background-repeat":"no-repeat","background-position":"3px 7px"},error:{color:"#B94A48","background-color":"#F2DEDE","border-color":"#EED3D7","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAtRJREFUeNqkVc1u00AQHq+dOD+0poIQfkIjalW0SEGqRMuRnHos3DjwAH0ArlyQeANOOSMeAA5VjyBxKBQhgSpVUKKQNGloFdw4cWw2jtfMOna6JOUArDTazXi/b3dm55socPqQhFka++aHBsI8GsopRJERNFlY88FCEk9Yiwf8RhgRyaHFQpPHCDmZG5oX2ui2yilkcTT1AcDsbYC1NMAyOi7zTX2Agx7A9luAl88BauiiQ/cJaZQfIpAlngDcvZZMrl8vFPK5+XktrWlx3/ehZ5r9+t6e+WVnp1pxnNIjgBe4/6dAysQc8dsmHwPcW9C0h3fW1hans1ltwJhy0GxK7XZbUlMp5Ww2eyan6+ft/f2FAqXGK4CvQk5HueFz7D6GOZtIrK+srupdx1GRBBqNBtzc2AiMr7nPplRdKhb1q6q6zjFhrklEFOUutoQ50xcX86ZlqaZpQrfbBdu2R6/G19zX6XSgh6RX5ubyHCM8nqSID6ICrGiZjGYYxojEsiw4PDwMSL5VKsC8Yf4VRYFzMzMaxwjlJSlCyAQ9l0CW44PBADzXhe7xMdi9HtTrdYjFYkDQL0cn4Xdq2/EAE+InCnvADTf2eah4Sx9vExQjkqXT6aAERICMewd/UAp/IeYANM2joxt+q5VI+ieq2i0Wg3l6DNzHwTERPgo1ko7XBXj3vdlsT2F+UuhIhYkp7u7CarkcrFOCtR3H5JiwbAIeImjT/YQKKBtGjRFCU5IUgFRe7fF4cCNVIPMYo3VKqxwjyNAXNepuopyqnld602qVsfRpEkkz+GFL1wPj6ySXBpJtWVa5xlhpcyhBNwpZHmtX8AGgfIExo0ZpzkWVTBGiXCSEaHh62/PoR0p/vHaczxXGnj4bSo+G78lELU80h1uogBwWLf5YlsPmgDEd4M236xjm+8nm4IuE/9u+/PH2JXZfbwz4zw1WbO+SQPpXfwG/BBgAhCNZiSb/pOQAAAAASUVORK5CYII=)"},success:{color:"#468847","background-color":"#DFF0D8","border-color":"#D6E9C6","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAutJREFUeNq0lctPE0Ecx38zu/RFS1EryqtgJFA08YCiMZIAQQ4eRG8eDGdPJiYeTIwHTfwPiAcvXIwXLwoXPaDxkWgQ6islKlJLSQWLUraPLTv7Gme32zoF9KSTfLO7v53vZ3d/M7/fIth+IO6INt2jjoA7bjHCJoAlzCRw59YwHYjBnfMPqAKWQYKjGkfCJqAF0xwZjipQtA3MxeSG87VhOOYegVrUCy7UZM9S6TLIdAamySTclZdYhFhRHloGYg7mgZv1Zzztvgud7V1tbQ2twYA34LJmF4p5dXF1KTufnE+SxeJtuCZNsLDCQU0+RyKTF27Unw101l8e6hns3u0PBalORVVVkcaEKBJDgV3+cGM4tKKmI+ohlIGnygKX00rSBfszz/n2uXv81wd6+rt1orsZCHRdr1Imk2F2Kob3hutSxW8thsd8AXNaln9D7CTfA6O+0UgkMuwVvEFFUbbAcrkcTA8+AtOk8E6KiQiDmMFSDqZItAzEVQviRkdDdaFgPp8HSZKAEAL5Qh7Sq2lIJBJwv2scUqkUnKoZgNhcDKhKg5aH+1IkcouCAdFGAQsuWZYhOjwFHQ96oagWgRoUov1T9kRBEODAwxM2QtEUl+Wp+Ln9VRo6BcMw4ErHRYjH4/B26AlQoQQTRdHWwcd9AH57+UAXddvDD37DmrBBV34WfqiXPl61g+vr6xA9zsGeM9gOdsNXkgpEtTwVvwOklXLKm6+/p5ezwk4B+j6droBs2CsGa/gNs6RIxazl4Tc25mpTgw/apPR1LYlNRFAzgsOxkyXYLIM1V8NMwyAkJSctD1eGVKiq5wWjSPdjmeTkiKvVW4f2YPHWl3GAVq6ymcyCTgovM3FzyRiDe2TaKcEKsLpJvNHjZgPNqEtyi6mZIm4SRFyLMUsONSSdkPeFtY1n0mczoY3BHTLhwPRy9/lzcziCw9ACI+yql0VLzcGAZbYSM5CCSZg1/9oc/nn7+i8N9p/8An4JMADxhH+xHfuiKwAAAABJRU5ErkJggg==)"},info:{color:"#3A87AD","background-color":"#D9EDF7","border-color":"#BCE8F1","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QYFAhkSsdes/QAAA8dJREFUOMvVlGtMW2UYx//POaWHXg6lLaW0ypAtw1UCgbniNOLcVOLmAjHZolOYlxmTGXVZdAnRfXQm+7SoU4mXaOaiZsEpC9FkiQs6Z6bdCnNYruM6KNBw6YWewzl9z+sHImEWv+vz7XmT95f/+3/+7wP814v+efDOV3/SoX3lHAA+6ODeUFfMfjOWMADgdk+eEKz0pF7aQdMAcOKLLjrcVMVX3xdWN29/GhYP7SvnP0cWfS8caSkfHZsPE9Fgnt02JNutQ0QYHB2dDz9/pKX8QjjuO9xUxd/66HdxTeCHZ3rojQObGQBcuNjfplkD3b19Y/6MrimSaKgSMmpGU5WevmE/swa6Oy73tQHA0Rdr2Mmv/6A1n9w9suQ7097Z9lM4FlTgTDrzZTu4StXVfpiI48rVcUDM5cmEksrFnHxfpTtU/3BFQzCQF/2bYVoNbH7zmItbSoMj40JSzmMyX5qDvriA7QdrIIpA+3cdsMpu0nXI8cV0MtKXCPZev+gCEM1S2NHPvWfP/hL+7FSr3+0p5RBEyhEN5JCKYr8XnASMT0xBNyzQGQeI8fjsGD39RMPk7se2bd5ZtTyoFYXftF6y37gx7NeUtJJOTFlAHDZLDuILU3j3+H5oOrD3yWbIztugaAzgnBKJuBLpGfQrS8wO4FZgV+c1IxaLgWVU0tMLEETCos4xMzEIv9cJXQcyagIwigDGwJgOAtHAwAhisQUjy0ORGERiELgG4iakkzo4MYAxcM5hAMi1WWG1yYCJIcMUaBkVRLdGeSU2995TLWzcUAzONJ7J6FBVBYIggMzmFbvdBV44Corg8vjhzC+EJEl8U1kJtgYrhCzgc/vvTwXKSib1paRFVRVORDAJAsw5FuTaJEhWM2SHB3mOAlhkNxwuLzeJsGwqWzf5TFNdKgtY5qHp6ZFf67Y/sAVadCaVY5YACDDb3Oi4NIjLnWMw2QthCBIsVhsUTU9tvXsjeq9+X1d75/KEs4LNOfcdf/+HthMnvwxOD0wmHaXr7ZItn2wuH2SnBzbZAbPJwpPx+VQuzcm7dgRCB57a1uBzUDRL4bfnI0RE0eaXd9W89mpjqHZnUI5Hh2l2dkZZUhOqpi2qSmpOmZ64Tuu9qlz/SEXo6MEHa3wOip46F1n7633eekV8ds8Wxjn37Wl63VVa+ej5oeEZ/82ZBETJjpJ1Rbij2D3Z/1trXUvLsblCK0XfOx0SX2kMsn9dX+d+7Kf6h8o4AIykuffjT8L20LU+w4AZd5VvEPY+XpWqLV327HR7DzXuDnD8r+ovkBehJ8i+y8YAAAAASUVORK5CYII=)"},warn:{color:"#C09853","background-color":"#FCF8E3","border-color":"#FBEED5","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAABJlBMVEXr6eb/2oD/wi7/xjr/0mP/ykf/tQD/vBj/3o7/uQ//vyL/twebhgD/4pzX1K3z8e349vK6tHCilCWbiQymn0jGworr6dXQza3HxcKkn1vWvV/5uRfk4dXZ1bD18+/52YebiAmyr5S9mhCzrWq5t6ufjRH54aLs0oS+qD751XqPhAybhwXsujG3sm+Zk0PTwG6Shg+PhhObhwOPgQL4zV2nlyrf27uLfgCPhRHu7OmLgAafkyiWkD3l49ibiAfTs0C+lgCniwD4sgDJxqOilzDWowWFfAH08uebig6qpFHBvH/aw26FfQTQzsvy8OyEfz20r3jAvaKbhgG9q0nc2LbZxXanoUu/u5WSggCtp1anpJKdmFz/zlX/1nGJiYmuq5Dx7+sAAADoPUZSAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBgUBGhh4aah5AAAAlklEQVQY02NgoBIIE8EUcwn1FkIXM1Tj5dDUQhPU502Mi7XXQxGz5uVIjGOJUUUW81HnYEyMi2HVcUOICQZzMMYmxrEyMylJwgUt5BljWRLjmJm4pI1hYp5SQLGYxDgmLnZOVxuooClIDKgXKMbN5ggV1ACLJcaBxNgcoiGCBiZwdWxOETBDrTyEFey0jYJ4eHjMGWgEAIpRFRCUt08qAAAAAElFTkSuQmCC)"}}}),e(function(){g(h.css).attr("id","core-notify"),e(document).on("click","."+r+"-hidable",function(t){e(this).trigger("notify-hide")}),e(document).on("notify-hide","."+r+"-wrapper",function(t){var n=e(this).data(r);n&&n.show(!1)})})})
/* PrismJS 1.29.0
https://prismjs.com/download.html#themes=prism&languages=markup+css+clike+javascript */
var _self="undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{},Prism=function(e){var n=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,t=0,r={},a={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(n){return n instanceof i?new i(n.type,e(n.content),n.alias):Array.isArray(n)?n.map(e):n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++t}),e.__id},clone:function e(n,t){var r,i;switch(t=t||{},a.util.type(n)){case"Object":if(i=a.util.objId(n),t[i])return t[i];for(var l in r={},t[i]=r,n)n.hasOwnProperty(l)&&(r[l]=e(n[l],t));return r;case"Array":return i=a.util.objId(n),t[i]?t[i]:(r=[],t[i]=r,n.forEach((function(n,a){r[a]=e(n,t)})),r);default:return n}},getLanguage:function(e){for(;e;){var t=n.exec(e.className);if(t)return t[1].toLowerCase();e=e.parentElement}return"none"},setLanguage:function(e,t){e.className=e.className.replace(RegExp(n,"gi"),""),e.classList.add("language-"+t)},currentScript:function(){if("undefined"==typeof document)return null;if("currentScript"in document)return document.currentScript;try{throw new Error}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var n=document.getElementsByTagName("script");for(var t in n)if(n[t].src==e)return n[t]}return null}},isActive:function(e,n,t){for(var r="no-"+n;e;){var a=e.classList;if(a.contains(n))return!0;if(a.contains(r))return!1;e=e.parentElement}return!!t}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,n){var t=a.util.clone(a.languages[e]);for(var r in n)t[r]=n[r];return t},insertBefore:function(e,n,t,r){var i=(r=r||a.languages)[e],l={};for(var o in i)if(i.hasOwnProperty(o)){if(o==n)for(var s in t)t.hasOwnProperty(s)&&(l[s]=t[s]);t.hasOwnProperty(o)||(l[o]=i[o])}var u=r[e];return r[e]=l,a.languages.DFS(a.languages,(function(n,t){t===u&&n!=e&&(this[n]=l)})),l},DFS:function e(n,t,r,i){i=i||{};var l=a.util.objId;for(var o in n)if(n.hasOwnProperty(o)){t.call(n,o,n[o],r||o);var s=n[o],u=a.util.type(s);"Object"!==u||i[l(s)]?"Array"!==u||i[l(s)]||(i[l(s)]=!0,e(s,t,o,i)):(i[l(s)]=!0,e(s,t,null,i))}}},plugins:{},highlightAll:function(e,n){a.highlightAllUnder(document,e,n)},highlightAllUnder:function(e,n,t){var r={callback:t,container:e,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};a.hooks.run("before-highlightall",r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),a.hooks.run("before-all-elements-highlight",r);for(var i,l=0;i=r.elements[l++];)a.highlightElement(i,!0===n,r.callback)},highlightElement:function(n,t,r){var i=a.util.getLanguage(n),l=a.languages[i];a.util.setLanguage(n,i);var o=n.parentElement;o&&"pre"===o.nodeName.toLowerCase()&&a.util.setLanguage(o,i);var s={element:n,language:i,grammar:l,code:n.textContent};function u(e){s.highlightedCode=e,a.hooks.run("before-insert",s),s.element.innerHTML=s.highlightedCode,a.hooks.run("after-highlight",s),a.hooks.run("complete",s),r&&r.call(s.element)}if(a.hooks.run("before-sanity-check",s),(o=s.element.parentElement)&&"pre"===o.nodeName.toLowerCase()&&!o.hasAttribute("tabindex")&&o.setAttribute("tabindex","0"),!s.code)return a.hooks.run("complete",s),void(r&&r.call(s.element));if(a.hooks.run("before-highlight",s),s.grammar)if(t&&e.Worker){var c=new Worker(a.filename);c.onmessage=function(e){u(e.data)},c.postMessage(JSON.stringify({language:s.language,code:s.code,immediateClose:!0}))}else u(a.highlight(s.code,s.grammar,s.language));else u(a.util.encode(s.code))},highlight:function(e,n,t){var r={code:e,grammar:n,language:t};if(a.hooks.run("before-tokenize",r),!r.grammar)throw new Error('The language "'+r.language+'" has no grammar.');return r.tokens=a.tokenize(r.code,r.grammar),a.hooks.run("after-tokenize",r),i.stringify(a.util.encode(r.tokens),r.language)},tokenize:function(e,n){var t=n.rest;if(t){for(var r in t)n[r]=t[r];delete n.rest}var a=new s;return u(a,a.head,e),o(e,a,n,a.head,0),function(e){for(var n=[],t=e.head.next;t!==e.tail;)n.push(t.value),t=t.next;return n}(a)},hooks:{all:{},add:function(e,n){var t=a.hooks.all;t[e]=t[e]||[],t[e].push(n)},run:function(e,n){var t=a.hooks.all[e];if(t&&t.length)for(var r,i=0;r=t[i++];)r(n)}},Token:i};function i(e,n,t,r){this.type=e,this.content=n,this.alias=t,this.length=0|(r||"").length}function l(e,n,t,r){e.lastIndex=n;var a=e.exec(t);if(a&&r&&a[1]){var i=a[1].length;a.index+=i,a[0]=a[0].slice(i)}return a}function o(e,n,t,r,s,g){for(var f in t)if(t.hasOwnProperty(f)&&t[f]){var h=t[f];h=Array.isArray(h)?h:[h];for(var d=0;d<h.length;++d){if(g&&g.cause==f+","+d)return;var v=h[d],p=v.inside,m=!!v.lookbehind,y=!!v.greedy,k=v.alias;if(y&&!v.pattern.global){var x=v.pattern.toString().match(/[imsuy]*$/)[0];v.pattern=RegExp(v.pattern.source,x+"g")}for(var b=v.pattern||v,w=r.next,A=s;w!==n.tail&&!(g&&A>=g.reach);A+=w.value.length,w=w.next){var E=w.value;if(n.length>e.length)return;if(!(E instanceof i)){var P,L=1;if(y){if(!(P=l(b,A,e,m))||P.index>=e.length)break;var S=P.index,O=P.index+P[0].length,j=A;for(j+=w.value.length;S>=j;)j+=(w=w.next).value.length;if(A=j-=w.value.length,w.value instanceof i)continue;for(var C=w;C!==n.tail&&(j<O||"string"==typeof C.value);C=C.next)L++,j+=C.value.length;L--,E=e.slice(A,j),P.index-=A}else if(!(P=l(b,0,E,m)))continue;S=P.index;var N=P[0],_=E.slice(0,S),M=E.slice(S+N.length),W=A+E.length;g&&W>g.reach&&(g.reach=W);var z=w.prev;if(_&&(z=u(n,z,_),A+=_.length),c(n,z,L),w=u(n,z,new i(f,p?a.tokenize(N,p):N,k,N)),M&&u(n,w,M),L>1){var I={cause:f+","+d,reach:W};o(e,n,t,w.prev,A,I),g&&I.reach>g.reach&&(g.reach=I.reach)}}}}}}function s(){var e={value:null,prev:null,next:null},n={value:null,prev:e,next:null};e.next=n,this.head=e,this.tail=n,this.length=0}function u(e,n,t){var r=n.next,a={value:t,prev:n,next:r};return n.next=a,r.prev=a,e.length++,a}function c(e,n,t){for(var r=n.next,a=0;a<t&&r!==e.tail;a++)r=r.next;n.next=r,r.prev=n,e.length-=a}if(e.Prism=a,i.stringify=function e(n,t){if("string"==typeof n)return n;if(Array.isArray(n)){var r="";return n.forEach((function(n){r+=e(n,t)})),r}var i={type:n.type,content:e(n.content,t),tag:"span",classes:["token",n.type],attributes:{},language:t},l=n.alias;l&&(Array.isArray(l)?Array.prototype.push.apply(i.classes,l):i.classes.push(l)),a.hooks.run("wrap",i);var o="";for(var s in i.attributes)o+=" "+s+'="'+(i.attributes[s]||"").replace(/"/g,"&quot;")+'"';return"<"+i.tag+' class="'+i.classes.join(" ")+'"'+o+">"+i.content+"</"+i.tag+">"},!e.document)return e.addEventListener?(a.disableWorkerMessageHandler||e.addEventListener("message",(function(n){var t=JSON.parse(n.data),r=t.language,i=t.code,l=t.immediateClose;e.postMessage(a.highlight(i,a.languages[r],r)),l&&e.close()}),!1),a):a;var g=a.util.currentScript();function f(){a.manual||a.highlightAll()}if(g&&(a.filename=g.src,g.hasAttribute("data-manual")&&(a.manual=!0)),!a.manual){var h=document.readyState;"loading"===h||"interactive"===h&&g&&g.defer?document.addEventListener("DOMContentLoaded",f):window.requestAnimationFrame?window.requestAnimationFrame(f):window.setTimeout(f,16)}return a}(_self);"undefined"!=typeof module&&module.exports&&(module.exports=Prism),"undefined"!=typeof global&&(global.Prism=Prism);
Prism.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]},Prism.languages.markup.tag.inside["attr-value"].inside.entity=Prism.languages.markup.entity,Prism.languages.markup.doctype.inside["internal-subset"].inside=Prism.languages.markup,Prism.hooks.add("wrap",(function(a){"entity"===a.type&&(a.attributes.title=a.content.replace(/&amp;/,"&"))})),Object.defineProperty(Prism.languages.markup.tag,"addInlined",{value:function(a,e){var s={};s["language-"+e]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:Prism.languages[e]},s.cdata=/^<!\[CDATA\[|\]\]>$/i;var t={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:s}};t["language-"+e]={pattern:/[\s\S]+/,inside:Prism.languages[e]};var n={};n[a]={pattern:RegExp("(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[^])*?(?=</__>)".replace(/__/g,(function(){return a})),"i"),lookbehind:!0,greedy:!0,inside:t},Prism.languages.insertBefore("markup","cdata",n)}}),Object.defineProperty(Prism.languages.markup.tag,"addAttribute",{value:function(a,e){Prism.languages.markup.tag.inside["special-attr"].push({pattern:RegExp("(^|[\"'\\s])(?:"+a+")\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s'\">=]+(?=[\\s>]))","i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[e,"language-"+e],inside:Prism.languages[e]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}})}}),Prism.languages.html=Prism.languages.markup,Prism.languages.mathml=Prism.languages.markup,Prism.languages.svg=Prism.languages.markup,Prism.languages.xml=Prism.languages.extend("markup",{}),Prism.languages.ssml=Prism.languages.xml,Prism.languages.atom=Prism.languages.xml,Prism.languages.rss=Prism.languages.xml;
!function(s){var e=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;s.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp("@[\\w-](?:[^;{\\s\"']|\\s+(?!\\s)|"+e.source+")*?(?:;|(?=\\s*\\{))"),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\burl\\((?:"+e.source+"|(?:[^\\\\\r\n()\"']|\\\\[^])*)\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp("^"+e.source+"$"),alias:"url"}}},selector:{pattern:RegExp("(^|[{}\\s])[^{}\\s](?:[^{};\"'\\s]|\\s+(?![\\s{])|"+e.source+")*(?=\\s*\\{)"),lookbehind:!0},string:{pattern:e,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},s.languages.css.atrule.inside.rest=s.languages.css;var t=s.languages.markup;t&&(t.tag.addInlined("style","css"),t.tag.addAttribute("style","css"))}(Prism);
Prism.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/};
Prism.languages.javascript=Prism.languages.extend("clike",{"class-name":[Prism.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp("(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])"),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),Prism.languages.javascript["class-name"][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,Prism.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp("((?:^|[^$\\w\\xA0-\\uFFFF.\"'\\])\\s]|\\b(?:return|yield))\\s*)/(?:(?:\\[(?:[^\\]\\\\\r\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\r\n])+/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\r\n]|\\\\.|\\[(?:[^[\\]\\\\\r\n]|\\\\.|\\[(?:[^[\\]\\\\\r\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\r\n])+/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|/\\*(?:[^*]|\\*(?!/))*\\*/)*(?:$|[\r\n,.;:})\\]]|//))"),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:Prism.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:Prism.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),Prism.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:Prism.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}}),Prism.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:"property"}}),Prism.languages.markup&&(Prism.languages.markup.tag.addInlined("script","javascript"),Prism.languages.markup.tag.addAttribute("on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)","javascript")),Prism.languages.js=Prism.languages.javascript;

//@ts-check
$$.control.registerControl('breizbot.alexa', {

	deps: ['brainjs.http'],

	init(elt, http) {
		const hash = window.location.hash.substr(1)

		//console.log('hash', hash)
		const params = $$.url.parseUrlParams(hash)
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

	props: {
		apps: [],
		showActivated: false,
		items: null
	},

	$iface: 'setData(data)',

	template: "<div class=\"scrollPanel\">\n	<div bn-each=\"apps\" \n		bn-iter=\"app\" \n		class=\"main\" \n		bn-event=\"click.tile: onTileClick, contextmenuchange.tile: onTileContextMenu\"\n		>			\n		<div bn-attr=\"class1\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n			<div class=\"arrow-right\" bn-show=\"show1\"></div>\n			<div bn-show=\"show2\" style=\"margin-bottom: 5px;\">\n				<i bn-attr=\"{class: $scope.app.props.iconCls}\"></i>\n			</div>\n			<div bn-if=\"show3\">\n				<img bn-attr=\"{src: getIconUrl}\">\n			</div>\n			<span bn-text=\"$scope.app.props.title\" bn-show=\"!show3\"></span>\n		</div>\n\n	</div>\n</div>",

	init: function (elt) {

		const { apps, showActivated, items } = this.props
		console.log('apps', apps)

		const ctrl = $$.viewController(elt, {
			data: {
				getItems: function (scope) {
					//console.log('getItems', scope.app)
					return (typeof items == 'function') ? items(scope.app) : items
				},
				apps,
				showActivated,
				show1: function (scope) {
					return this.showActivated && scope.app.activated
				},
				class1: function (scope) {
					const {title, colorCls} = scope.app.props
					const ret = {
						title,
						class: 'tile w3-btn'

					}
					if (colorCls.startsWith('#')) {
						ret.style = `background-color: ${colorCls}`
					}
					else {
						ret.class += ' ' + colorCls
					}
					return ret
				},
				show2: function (scope) {
					return typeof scope.app.props.iconCls == 'string'
				},
				show3: function (scope) {
					return typeof scope.app.props.iconUrl == 'string'
				},
				getIconUrl(scope) {
					const { appName, props } = scope.app
					return `/webapps/${appName}/assets/${props.iconUrl}`
				}
			},
			events: {
				onTileClick: function (ev) {
					//console.log('onTileClick', $(this).data('item'))
					const idx = $(this).index()
					elt.trigger('appclick', ctrl.model.apps[idx])
				},
				onTileContextMenu: function (ev, data) {
					const idx = $(this).index()
					//console.log('onTileContextMenu', data)
					const { cmd } = data
					const info = $.extend({ cmd }, ctrl.model.apps[idx])
					elt.trigger('appcontextmenu', info)
				}
			}
		})


		this.setData = function (data) {
			console.log('data', data)
			ctrl.setData({
				apps: data.apps.filter((a) => a.props.visible != false && a.appName != 'template')
			})
		}

	},

	$iface: `setData(data)`,
	$events: 'appclick;appcontextmenu'
});


//@ts-check
$$.control.registerControl('breizbot.addContactPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-form=\"info\">\n\n	<div bn-control=\"brainjs.accordion\" data-height-style=\"fill\">\n\n\n		<div title=\"Name & Email\">\n			<div class=\"gender\">\n				<label>Gender:</label>\n				<div bn-control=\"brainjs.radiogroup\" name=\"gender\">\n					<div bn-control=\"brainjs.inputgroup\">\n						<input type=\"radio\" value=\"male\">\n						<label>Male</label>\n					</div>\n					<div bn-control=\"brainjs.inputgroup\">\n						<input type=\"radio\" value=\"female\">\n						<label>Female</label>\n					</div>\n				</div>\n			</div>\n	\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Name:</label><br>\n				<input type=\"text\" name=\"name\" required=\"\">\n			</div>\n	\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Email:</label><br>\n				<input type=\"email\" name=\"email\">\n			</div>\n	\n		</div>\n\n		<div title=\"Birthday\">\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Birthday</label><br>\n				<input type=\"text\" bn-control=\"brainjs.datepicker\" \n					bn-data=\"{\n						changeYear: true,\n						yearRange: \'-100:+0\'\n					}\"\n					name=\"birthday\">\n			</div>\n	\n			<div class=\"birthNotif\">\n				<label>Activate birthday Notification</label>\n				<div bn-control=\"brainjs.flipswitch\" name=\"birthdayNotif\"></div>\n			</div>\n\n		</div>\n\n		<div title=\"Phones\">\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Home Phone:</label><br>\n				<input name=\"phone\" bn-control=\"brainjs.inputphone\">\n			</div>\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Cell Phone:</label><br>\n				<input name=\"mobilePhone\" bn-control=\"brainjs.inputphone\">\n			</div>\n	\n		</div>\n\n		<div title=\"Address\">\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Address:</label><br>\n				<input type=\"text\" name=\"address\">\n			</div>\n	\n			<div bn-control=\"brainjs.inputgroup\">\n				<label>Postal Code:</label><br>\n				<input type=\"number\" name=\"postalCode\" maxlength=\"5\" bn-event=\"blur: onPostalCodeLostFocus\">\n			</div>\n	\n			<div>\n				<label>City:</label>\n				<div bn-control=\"brainjs.combobox\" bn-data=\"{items: cities}\" name=\"city\" bn-val=\"city\"></div>\n			</div>\n	\n		</div>\n\n	</div>\n\n	<input type=\"submit\" bn-bind=\"submit\" hidden=\"\">\n</form>",

	deps: ['breizbot.pager', 'breizbot.contacts', 'breizbot.cities'],

	props: {
		data: {}
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Contact.Interface} contactsSrv 
	 	 */
	init: function (elt, pager, contactsSrv, citiesSrv) {

		const info = this.props.info || {}
		//console.log('info', info)
		const id = info._id
		const { postalCode, city } = info

		const ctrl = $$.viewController(elt, {
			data: {
				info,
				cities: []
			},
			events: {
				onSubmit: async function (ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					pager.popPage({ id, data })
				},

				onPostalCodeLostFocus: async function () {
					//console.log('onPostalCodeLostFocus', this.value)
					const cities = await citiesSrv.getCitesFromPostalCode(this.value)
					ctrl.setData({ cities })

				}

			}
		})

		async function load() {
			const cities = await citiesSrv.getCitesFromPostalCode(postalCode)
			ctrl.setData({ cities })
			if (city && city != '') {
				ctrl.setData({ city })
			}
		}

		if (postalCode && postalCode != '') {
			load()
		}


		this.addContact = async function (info) {
			await contactsSrv.addContact(info)
		}

		this.updateContactInfo = async function (id, info) {
			await contactsSrv.updateContactInfo(id, info)
		}


		this.getButtons = function () {
			return {
				add: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function () {
						ctrl.scope.submit.click()
					}
				}
			}
		}
	}

});





//@ts-check
$$.control.registerControl('breizbot.contacts', {

	deps: ['breizbot.contacts'],

	props: {
		showSelection: false,
		hasSearchbar: false,
		contextMenu: {}
	},

	template: "<div bn-control=\"breizbot.searchbar\" \n	bn-event=\"searchbarsubmit: onSearch\" \n	bn-show=\"hasSearchbar\"\n	bn-data=\"{required: false}\"\n	></div>\n<p bn-show=\"show2\">You have no contacts</p>\n<div class=\"scrollPanel\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-event=\"contextmenuchange.w3-bar: onItemContextMenu, click.w3-bar: onItemClick, click.input: onInputClick\"\n		bn-each=\"getContacts\"\n		bn-show=\"show1\"\n		>\n		<li class=\"w3-bar\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: contextMenu}\">\n\n			<div class=\"w3-bar-item\" >\n				<strong bn-text=\"$scope.$i.name\"></strong><br>\n				<div bn-text=\"getAddress\"></div>\n				<div bn-show=\"$scope.$i.email\">\n					<i class=\"fa fa-envelope w3-text-blue\"></i>\n					<span bn-text=\"$scope.$i.email\"></span>	\n				</div>\n				<div bn-show=\"$scope.$i.mobilePhone\">\n					<a bn-attr=\"{href : getCellPhone}\"><i class=\"fa fa-mobile-alt w3-text-blue\"></i></a>\n					<input class=\"input\" bn-control=\"brainjs.inputphone\" bn-val=\"$scope.$i.mobilePhone\" readonly>	\n				</div>\n				<div bn-show=\"$scope.$i.phone\">\n					<a bn-attr=\"{href : getHomePhone}\"><i class=\"fa fa-home w3-text-blue\"></i></a>\n					<input class=\"input\" bn-control=\"brainjs.inputphone\" bn-val=\"$scope.$i.phone\" readonly>	\n				</div>\n			</div>\n		</li>\n	</ul>		\n\n</div>\n",

	/**
	 * 
	 * @param {Breizbot.Services.Contact.Interface} contactsSrv 
	 */
	init: function (elt, contactsSrv) {

		//@ts-ignore
		const { showSelection, contextMenu, hasSearchbar } = this.props
		//console.log('props', this.props)


		const ctrl = $$.viewController(elt, {
			data: {
				contacts: [],
				showSelection,
				hasSearchbar,
				filter: '',
				contextMenu,
				getContacts: function() {
					if (this.filter != '') {
						//console.log('OK', this.filter)
						const regex = new RegExp(`\w*${this.filter}\w*`, 'i')
						return this.contacts.filter((c) => regex.test(c.name))
					}
					if (this.showSelection) {
						return this.contacts.filter((c) => c.email && c.email != '')
					}
					return this.contacts
				},
				show1: function () {
					return this.contacts.length > 0
				},
				show2: function () {
					return this.contacts.length == 0
				},
				getCellPhone: function(scope) {
					return 'tel:' + scope.$i.mobilePhone
				},
				getHomePhone: function(scope) {
					return 'tel:' + scope.$i.phone
				},
				getAddress: function(scope) {
					const {address, city, postalCode} = scope.$i
					return `${address || ''} ${postalCode || ''} ${city || ''}`
				}
			},
			events: {
				onSearch: function(ev, data) {
					//console.log('onSearch', data)
					ctrl.setData({filter: data.value})

				},
				onInputClick: function() {
					//console.log('onInputClick')
					$(this).closest('div').find('a').get(0).click()
				},
				onItemContextMenu: function (ev, data) {
					//console.log('onItemContextMenu', data)
					const { cmd } = data
					const idx = $(this).index()
					const info = ctrl.model.getContacts()[idx]
					//console.log('onItemClick', info)
					elt.trigger('contactcontextmenu', { cmd, info })
				},
				onItemClick: function () {
					//console.log('onItemClick', data)
					if (showSelection) {
						//$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).toggleClass('w3-blue')
					}
				}

			}
		})

		async function load() {
			const contacts = await contactsSrv.getContacts()
			//console.log('contacts', contacts)
			ctrl.setData({ contacts })
		}


		load()

		this.update = load

		this.removeContact = async function(id) {
			await contactsSrv.removeContact(id)
			await load()
		}

		this.getSelection = function () {
			const ret = []
			elt.find('li.w3-blue').each(function () {
				const idx = $(this).index()
				ret.push(ctrl.model.getContacts()[idx])
			})
			console.log('ret', ret)
			return ret
		}

	},
	$iface: `
		getSelection(): [ContactInfo]
		removeContact(id)
	`,
	$events: 'contactclick'
});





//@ts-check
$$.control.registerControl('breizbot.htmleditor', {

	template: "<div bn-event=\"click.cmd: onCommand\" class=\"toolbar\">\n\n	<div class=\"group\">\n		<button class=\"cmd w3-button\"  \n			bn-icon=\"fas fa-microphone\" \n			title=\"Toogle Micro\" \n			bn-event=\"click: onToogleMicro\" \n			bn-show=\"speechRecoAvailable\"></button>\n		<button class=\"cmd w3-button\"  bn-icon=\"fas fa-remove-format\" title=\"Remove Format\" bn-event=\"click: onRemoveFormat\"></button>\n		<span class=\"separator\"></span>\n\n	</div>\n\n	<div class=\"group\">\n		<button class=\"cmd w3-button\" data-cmd=\"bold\" title=\"Bold\" bn-icon=\"fa fa-bold\"></button>\n		<button class=\"cmd w3-button\" data-cmd=\"italic\" title=\"Italic\" bn-icon=\"fa fa-italic\"></button>\n		<button class=\"cmd w3-button\" data-cmd=\"underline\" title=\"Underline\" bn-icon=\"fa fa-underline\"></button>\n		<span class=\"separator\"></span>\n\n	</div>\n\n	<div class=\"group\">\n		<button class=\"w3-button\" \n			bn-control=\"brainjs.contextmenu\" \n			bn-event=\"contextmenuchange: onFontNameChange\"\n			bn-icon=\"fas fa-caret-down\"\n			title=\"Font Name\" \n			bn-html=\"getFontName\" \n			bn-data=\"{\n				trigger: \'left\',\n				items: fontNameItems\n			}\">\n\n		</button>\n\n		<button class=\"w3-button\" \n			bn-control=\"brainjs.contextmenu\" \n			bn-event=\"contextmenuchange: onFontSizeChange\"\n			bn-icon=\"fas fa-caret-down\"\n			title=\"Font Size\" bn-html=\"getFontSize\" \n			bn-data=\"{\n				trigger: \'left\',\n				items: fontSizeItems\n			}\">\n\n		</button>\n\n\n		<button class=\"w3-button\" \n			bn-control=\"brainjs.contextmenu\" \n			bn-event=\"contextmenuchange: onCommand\" \n			title=\"Title\"\n			bn-icon=\"fas fa-caret-down\"\n			data-cmd=\"formatBlock\" \n			bn-data=\"{\n				trigger: \'left\',\n				items: headingItems\n			}\">\n			§&nbsp;\n		</button>\n\n		<button title=\"Alignment\" class=\"w3-button\" \n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onCommand\" \n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n					justifyLeft: {name: \'Left\', icon: \'fas fa-align-left\'},\n					justifyCenter: {name: \'Center\', icon: \'fas fa-align-center\'},\n					justifyRight: {name: \'Right\', icon: \'fas fa-align-right\'}\n				}\n			}\">\n			<i class=\"fas fa-align-left\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n		<button class=\"w3-button\" title=\"Text color\" \n			bn-control=\"brainjs.contextmenu\" \n			bn-data=\"{\n				items: colorItems,\n				trigger: \'left\'\n			}\" \n			bn-event=\"contextmenuchange: onColorMenuChange\">\n			<i class=\"fas fa-paint-brush\" bn-style=\"{color}\"></i>\n		</button>\n\n		<span class=\"separator\"></span>\n	</div>\n\n	<div class=\"group\">\n		<button title=\"Indent\" class=\"w3-button\"\n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onCommand\" \n			bn-data=\"{\n					trigger: \'left\',\n					items: {\n						indent: {name: \'Indent\', icon: \'fas fa-indent\'},\n						outdent: {name: \'Outdent\', icon: \'fas fa-outdent\'}\n					}\n				}\">\n			<i class=\"fas fa-indent\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n\n		<button title=\"List\" class=\"w3-button\" \n			bn-control=\"brainjs.contextmenu\" \n			bn-event=\"contextmenuchange: onCommand\"\n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n					insertUnorderedList: {name: \'Unordered\', icon: \'fas fa-list-ul\'},\n					insertOrderedList: {name: \'Ordered\', icon: \'fas fa-list-ol\'}\n				}\n			}\">\n			<i class=\"fas fa-list-ol\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n		<span class=\"separator\"></span>\n\n	</div>\n\n	<div class=\"group\">\n		<button class=\"w3-button cmd\" title=\"Horizontal Rule\" data-cmd=\"insertHorizontalRule\"bn-icon=\"fas fa-minus\"></button>\n		<button class=\"w3-button\" title=\"Insert Link\" bn-event=\"click: onCreateLink\" bn-icon=\"fas fa-link\"></button>		\n		<button title=\"Insert image\" bn-event=\"click: onInsertImage\" class=\"w3-button\" bn-icon=\"fa fa-image\"></button>\n		<button title=\"Insert Table from selection\" class=\"w3-button\"\n			bn-control=\"brainjs.contextmenu\" \n			bn-event=\"contextmenuchange: onInsertTable\" \n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n					convertToTable: {name: \'Convert to table\'},\n					convertToList: {name: \'Convert to list\'},\n					addRow: {name: \'Add row\'},\n					addCol: {name: \'Add Column\'}\n				}\n\n			}\">\n			<i class=\"fas fa fa-th\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n\n		</button>\n\n	</div>\n\n\n</div>\n\n\n<div class=\"bottom\">\n	<img bn-attr=\"{src: getMicUrl}\" class=\"micro\" bn-event=\"click: onMicro\" bn-show=\"isMicroVisible\" title=\"Speech Recognition\">\n	<div class=\"scrollPanel\" bn-event=\"click: onScrollClick\">\n		<div contenteditable=\"true\" bn-bind=\"editor\" class=\"editor\" bn-html=\"html\"></div>\n	</div>\n</div>\n",

	deps: ['breizbot.pager', 'breizbot.files'],

	props: {
		useDataUrlForImg: false
	},

	/**
	 * 
	 * @param {*} elt 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} files 
	 */
	init: function (elt, pager, files) {

		//@ts-ignore
		const { useDataUrlForImg } = this.props
		console.log('useDataUrlForImg', useDataUrlForImg)

		const colorMap = {
			black: '#000000',
			red: '#f44336',
			green: '#4CAF50',
			blue: '#2196F3',
			yellow: '#ffeb3b',
			cyan: '#00bcd4',
			pink: '#e91e63'

		}

		const fontSizes = '8,10,12,14,18,24,36'.split(',')
		const fontNames = ["Arial", "Courier New", "Times New Roman"]

		function getHeadingItems() {
			const ret = {
				p: { name: 'Normal' }
			}
			for (let i = 1; i <= 6; i++) {
				ret['h' + i] = { name: `<h${i}>Heading ${i}</h${i}>`, isHtmlName: true }
			}
			return ret
		}

		function getFontSizeItems() {
			const ret = {}
			fontSizes.forEach((i, idx) => {
				ret[idx + 1] = { name: `<font size="${idx + 1}">${i} pt</font>`, isHtmlName: true }
			})
			return ret
		}

		function getFontNameItems() {
			const ret = {}
			fontNames.forEach((i) => {
				ret[i] = { name: `<font face="${i}">${i}</font>`, isHtmlName: true }
			})
			return ret
		}

		function getColorItems() {
			const ret = {}
			Object.keys(colorMap).forEach((i) => {
				ret[i] = {
					name: i.charAt(0).toUpperCase() + i.slice(1),
					icon: `fas fa-square-full w3-text-${i}`
				}
			})
			return ret

		}

		const fontSizeItems = getFontSizeItems()
		const defaultFontSize = '3'
		const fontNameItems = getFontNameItems()
		const defaultFontName = 'Arial'
		const colorItems = getColorItems()
		const defaultColor = colorMap['black']

		const speechRecoAvailable = ('webkitSpeechRecognition' in window)
		const isMobilDevice = /Android/i.test(navigator.userAgent)
		console.log('isMobilDevice', isMobilDevice)
		let ignoreOnEnd = false
		let recognition = null
		let finalSpan = null
		let interimSpan = null
		let finalTranscript = ''
		/**@type {Range} */
		let range = null

		const two_line = /\n\n/g
		const one_line = /\n/g
		function linebreak(s) {
			return s.replace(two_line, '<p></p>').replace(one_line, '<br>')
		}

		const first_char = /\S/
		function capitalize(s) {
			return s.replace(first_char, m => m.toUpperCase())
		}

		if (speechRecoAvailable) {
			recognition = new webkitSpeechRecognition();
			recognition.continuous = true
			recognition.interimResults = true
			recognition.lang = 'fr-FR'

			recognition.onstart = function () {
				console.log('onStart')
				ctrl.setData({ recognizing: true })

			}

			recognition.onerror = function (event) {
				console.log('onError', event.error)
			}

			recognition.onend = function () {
				console.log('onEnd')
				if (isMobilDevice && ctrl.model.recognizing) {
					range.collapse()
					startRecognition()
				}
				else {
					ctrl.setData({ recognizing: false })
					range.collapse()
				}
			}

			recognition.onresult = function (event) {
				//console.log('onResult', event.results.length)
				let interimTranscript = ''
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					//console.log('results', event.results[i])
					if (event.results[i].isFinal && event.results[i][0].confidence != 0) {
						finalTranscript += event.results[i][0].transcript
					} else {
						interimTranscript += event.results[i][0].transcript
					}
				}
				//console.log('interimTranscript', interimTranscript)
				//console.log('finalTranscript', finalTranscript)
				finalTranscript = capitalize(finalTranscript)
				finalSpan.innerHTML = linebreak(finalTranscript)
				interimSpan.innerHTML = linebreak(interimTranscript)
			}
		}

		function startRecognition() {
			//console.log('selObj', selObj)

			if (!isEditable()) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			range = getRange()
			finalSpan = document.createElement('span')
			interimSpan = document.createElement('span')
			interimSpan.className = 'interim'
			range.insertNode(interimSpan)
			range.insertNode(finalSpan)
			finalTranscript = ''
			recognition.start()
			ignoreOnEnd = false
		}

		/**
		 * 
		 * @param {string} text 
		 * @param {string} tagName
		 * @returns {JQuery<HTMLElement>}
		 */
		function div(text, tagName) {
			//console.log('div', tagName, text)
			const elt = ['I', 'B', 'U', 'FONT'].includes(tagName) ? 'span' : 'div'
			return $(`<${elt}>`).text(text)
		}

		let imgUrls = []

		/**
		 * 
		 * @param {Range} range 
		 */
		function convertToTable(range) {
			const selRangeText = getTextNodesBetween(range.commonAncestorContainer, range.startContainer, range.endContainer)
			if (selRangeText.length == 0) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			range.deleteContents()

			const table = document.createElement('table')
			for (const row of selRangeText) {
				const tr = document.createElement('tr')
				table.appendChild(tr)
				for (const text of row.split(';')) {
					const td = document.createElement('td')
					tr.appendChild(td)
					if (text.startsWith('img(')) {
						const urlId = text.replaceAll(')', '').substr(4)
						const img = document.createElement('img')
						img.src = imgUrls[urlId]
						td.appendChild(img)
					}
					else {
						td.textContent = text
					}
				}
			}
			imgUrls = []
			range.insertNode(table)

		}

		/**
		 * 
		 * @param {Range} range 
		 */
		function convertToList(range) {
			const parentElement = $(range.startContainer.parentElement)

			if (['TD', 'TH'].includes(parentElement.get(0).tagName)) {
				const table = parentElement.closest('table')
				const tr = table.find('tr')
				const data = []
				tr.each(function () {
					const td = $(this).find('td,th')
					const text = []
					td.each(function () {
						$(this).find('img').each(function () {
							const src = $(this).attr('src')
							imgUrls.push(src)
							$(this).replaceWith(`img(${imgUrls.length - 1})`)
						})

						text.push($(this).text())
					})
					data.push(text.join(';'))

				})
				table.remove()
				range.deleteContents()
				for (const text of data.reverse()) {
					const div = document.createElement('div')
					div.innerHTML = text
					range.insertNode(div)
				}
			}
			else {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a cell table' })

			}

		}

		/**
		 * 
		 * @param {Range} range 
		 */
		function addRow(range) {
			const parentElement = $(range.startContainer.parentElement)

			if (['TD', 'TH'].includes(parentElement.get(0).tagName)) {
				const tr = parentElement.closest('tr')
				const nbCols = tr.find('td, th').length
				//console.log('nb col', nbCols)
				const newTr = document.createElement('tr')
				for (let i = 0; i < nbCols; i++) {
					const newTd = document.createElement('td')
					newTr.appendChild(newTd)
				}
				tr.after(newTr)
			}
			else {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a cell table' })

			}
		}

		/**
		 * 
		 * @param {Range} range 
		 */
		 function addColumn(range) {
			//console.log('addColumn')
			const parentElement = $(range.startContainer.parentElement)

			if (['TD', 'TH'].includes(parentElement.get(0).tagName)) {
				const selCol = parentElement.index()
				//console.log('selCol', selCol)
				const table = parentElement.closest('table')
				table.find('tr').each(function() {
					const td = document.createElement('td')
					$(this).find('td,th').eq(selCol).after(td)
				})
			}
			else {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a cell table' })

			}
		}		

		const ctrl = $$.viewController(elt, {
			data: {
				html: elt.val(),
				fontSize: defaultFontSize,
				fontName: defaultFontName,
				getFontSize: function () {
					return `${fontSizes[this.fontSize - 1]} pt&nbsp;<i class="fas fa-caret-down"></i>`
				},
				getFontName: function () {
					return `${this.fontName}&nbsp;<i class="fas fa-caret-down"></i>`
				},
				fontSizeItems,
				fontNameItems,
				colorItems,
				color: defaultColor,
				headingItems: getHeadingItems(),
				showMicro: false,
				isMicroVisible: function () {
					return this.showMicro && this.speechRecoAvailable
				},
				speechRecoAvailable,
				recognizing: false,
				getMicUrl: function () {
					return this.recognizing ? '/assets/mic-animate.gif' : '/assets/mic.gif'
				}
			},
			events: {
				onToogleMicro: function () {
					ctrl.setData({ showMicro: !ctrl.model.showMicro })
				},
				onInsertTable: function (ev, info) {
					console.log('onInsertTable', info)
					const { cmd } = info
					if (!isEditable()) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}

					const selObj = window.getSelection()
					const range = selObj.getRangeAt(0)
					if (cmd == 'convertToList') {
						convertToList(range)
						selObj.removeAllRanges()
					}
					else if (cmd == 'convertToTable') {
						convertToTable(range)
						selObj.removeAllRanges()
					}
					else if (cmd == 'addRow') {
						addRow(range)
					}
					else if (cmd == 'addCol') {
						addColumn(range)
					}

				},
				onRemoveFormat: function (ev) {
					ev.stopPropagation()
					//console.log('onRemoveFormat')
					const selObj = window.getSelection()

					if (!isEditable()) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}

					const node = selObj.anchorNode
					if (node.nodeType != node.TEXT_NODE) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return

					}
					const text = node.textContent
					//console.log({text})
					const parent = node.parentElement
					const tagName = parent.tagName

					if ($(parent).hasClass('editor')) {
						if (node.previousSibling != null) {
							div(text, tagName).insertAfter(node.previousSibling)
							parent.removeChild(node)
						}
					}
					else {
						if (parent.parentElement.childElementCount == 1) {
							parent.removeChild(node)
							parent.parentElement.textContent = parent.parentElement.textContent + text
						}
						else {
							$(parent).replaceWith(div(text, tagName))
						}
					}
				},
				onMicro: function () {
					if (ctrl.model.recognizing) {
						ctrl.setData({ recognizing: false })
						recognition.stop()
					}
					else {
						startRecognition()
					}
				},
				onInsertImage: function (ev) {
					insertImage()
				},
				onFontNameChange: function (ev, data) {
					//console.log('onFontNameChange', data)
					ctrl.setData({ fontName: data.cmd })
					document.execCommand('fontName', false, data.cmd)
				},
				onFontSizeChange: function (ev, data) {
					//console.log('onFontSizeChange', data)
					ctrl.setData({ fontSize: data.cmd })
					document.execCommand('fontSize', false, data.cmd)
				},
				onCreateLink: async function () {

					addLink(async () => {
						return await $$.ui.showPrompt({
							title: 'Insert Link',
							label: 'Link Target',
							attrs: { type: 'url' }
						})

					})

				},
				onScrollClick: function () {
					ctrl.scope.editor.focus()
				},
				onCommand: function (ev, data) {
					//console.log('onCommand', data)

					let cmd
					let cmdArg

					if (data) {
						cmd = $(this).data('cmd')
						if (cmd != undefined) {
							cmdArg = data.cmd
						}
						else {
							cmd = data.cmd
						}
					}
					else {
						cmd = $(this).data('cmd')
						cmdArg = $(this).data('cmdArg')

					}
					//console.log('onCommand', cmd, cmdArg)

					document.execCommand(cmd, false, cmdArg)

				},
				onColorMenuChange: function (ev, data) {
					console.log('onColorMenuChange', data)
					const color = colorMap[data.cmd]
					ctrl.setData({ color })
					document.execCommand('foreColor', false, color)
				}

			}

		})

		elt.find('button.w3-button').attr('type', 'button')

		$(document).on('selectionchange', () => {
			//console.log('selectionchange')
			const selObj = window.getSelection()
			//console.log('selObj', selObj)

			if (!isEditable()) {
				return
			}

			const fontSizeNode = $(selObj.anchorNode).closest('font[size]')
			//console.log('fontNode', fontNode)
			if (fontSizeNode.length == 1) {
				const fontSize = fontSizeNode.attr('size') || defaultFontSize
				const fontName = fontSizeNode.attr('face') || defaultFontName
				//console.log('fontSize', fontSize, 'fontName', fontName, 'color', color)
				ctrl.setData({ fontSize, fontName })
			}
			else {
				ctrl.setData({
					fontSize: defaultFontSize,
					fontName: defaultFontName,
				})
			}
			const fontColorNode = $(selObj.anchorNode).closest('font[color]')
			//console.log('fontNode', fontNode)
			if (fontColorNode.length == 1) {
				const color = fontColorNode.attr('color') || defaultColor
				//console.log('fontSize', fontSize, 'fontName', fontName, 'color', color)
				ctrl.setData({ color })
			}
			else {
				ctrl.setData({
					color: defaultColor
				})
			}

		})

		/**
		 * 
		 * @param {Node} node 
		 * @returns 
		 */
		function hasTextChildNode(node) {
			return Array.from(node.childNodes).filter(entry => entry.nodeType == Node.TEXT_NODE).length != 0
		}


		/**
		 * 
		 * @param {Node} rootNode 
		 * @param {Node} startNode 
		 * @param {Node} endNode 
		 * @returns 
		 */
		function getTextNodesBetween(rootNode, startNode, endNode) {
			let pastStartNode = false
			let reachedEndNode = false
			const textNodes = []

			/**
			 * 
			 * @param {Node} node 
			 */
			function getTextNodes(node) {
				if (node == startNode) {
					pastStartNode = true
				}

				if (node.nodeType == Node.TEXT_NODE) {
					if (pastStartNode && !reachedEndNode) {

						if (node.parentElement.tagName == 'SPAN' && node.parentElement.parentElement.tagName == 'DIV' && hasTextChildNode(node.parentElement.parentElement)) {
							const length = textNodes.length
							if (length > 0)
								textNodes[length - 1] += node.textContent

						}
						else {
							textNodes.push(node.textContent)
						}
					}
				} else {
					for (let i = 0, len = node.childNodes.length; !reachedEndNode && i < len; ++i) {
						getTextNodes(node.childNodes[i])
					}
				}

				if (node == endNode) {
					reachedEndNode = true
				}
			}

			getTextNodes(rootNode)
			return textNodes
		}

		function getSelRangeText() {
			const range = getRange()
			return getTextNodesBetween(range.commonAncestorContainer, range.startContainer, range.endContainer)
		}

		/**
		 * 
		 * @param {() => Promise<string>} cbk 
		 * @returns 
		 */
		async function addLink(cbk) {
			const selObj = window.getSelection()

			if (!isEditable()) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}
			const range = getRange()
			if (typeof cbk == 'function' && cbk.constructor.name === 'AsyncFunction') {
				const href = await cbk()
				console.log('href', href)
				if (href != null) {
					selObj.removeAllRanges()
					selObj.addRange(range)

					document.execCommand('createLink', false, href)
				}
			}

			//console.log('href', href)


		}

		function getRange() {
			const selObj = window.getSelection()
			return selObj.getRangeAt(0)
		}
		/**
		 * 
		 * @returns {boolean}
		 */
		function isEditable() {

			const selObj = window.getSelection()
			let node = selObj.anchorNode

			const editable = ctrl.scope.editor.get(0)

			while (node && node != document.documentElement) {
				if (node == editable) {
					return true
				}
				node = node.parentNode;
			}
			return false
		}

		this.addLink = addLink

		this.isEditable = isEditable

		this.html = function (htmlString) {
			if (htmlString == undefined) {
				ctrl.scope.editor.find('span').remove('.interim')
				ctrl.scope.editor.find('span').removeAttr('style')
				return ctrl.scope.editor.html()
			}

			ctrl.scope.editor.html(htmlString)
		}

		this.load = function (url, cbk) {
			return ctrl.scope.editor.load(url, cbk)
		}

		this.getValue = function () {
			return ctrl.scope.editor.html()
		}

		this.setValue = function (value) {
			//console.log('brainjs.htmleditor:setValue', value)
			ctrl.scope.editor.html(value)
		}

		this.focus = function () {
			ctrl.scope.editor.get(0).focus()
		}

		function insertImage() {
			const selObj = window.getSelection()
			//console.log('selObj', selObj)

			if (!isEditable()) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			const range = selObj.getRangeAt(0)

			pager.pushPage('breizbot.files', {
				title: 'Insert Image',
				props: {
					filterExtension: 'jpg,jpeg,png,gif'
				},
				events: {
					fileclick: function (ev, data) {
						pager.popPage(data)
					}
				},
				onReturn: async function (data) {
					console.log('onReturn', data)
					const { fileName, rootDir } = data
					let url = files.fileUrl(rootDir + fileName)
					//console.log('url', url)
					if (useDataUrlForImg) {
						url = await $$.url.imageUrlToDataUrl(url)
					}
					const img = document.createElement('img')
					img.src = url
					range.insertNode(img)

				}
			})


		}

	}

});

//@ts-check
$$.control.registerControl('breizbot.filterDlg', {

    template: "<form bn-event=\"submit: onSubmit\">\n\n    <label>Genre</label>\n    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: genres}\" bn-val=\"selectedGenre\" bn-event=\"comboboxchange: onGenreChange\" name=\"genre\"></div>    \n\n    <label>Artist</label>\n    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: artists}\" bn-val=\"selectedArtist\" bn-update=\"comboboxchange\" name=\"artist\"></div>    \n\n\n    <input type=\"submit\" hidden bn-bind=\"submit\">\n</form>\n",

    deps: ['breizbot.pager'],

    props: {
        files: [],
        mp3Filters: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        /**@type {{
         * files: Breizbot.Services.Files.FileInfo[], 
         * mp3Filters: Breizbot.Controls.Files.Mp3Filter}}  */
        // @ts-ignore
        let { files, mp3Filters } = this.props

        mp3Filters = mp3Filters || {}


        const selectedGenre = mp3Filters.genre || 'All'
        const selectedArtist = mp3Filters.artist || 'All'

        console.log('selectedArtist', selectedArtist)
        console.log('selectedGenre', selectedGenre)

        function getGenres() {
            let genres = {}

            files.forEach((f) => {
                if (f.mp3) {
                    const { genre } = f.mp3
                    if (genre && !genre.startsWith('(')) {
                        if (genres[genre]) {
                            genres[genre]++
                        }
                        else {
                            genres[genre] = 1
                        }
                    }
                }
            })

            genres = Object.keys(genres).sort().map((genre) => {
                const nbTitle = genres[genre]
                return (nbTitle == 1) ?
                    { value: genre, label: genre } :
                    { value: genre, label: `${genre} (${nbTitle})` }
            })
            genres.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            return genres
        }


        function getArtists(genre) {
            let artists = {}

            files.forEach((f) => {
                if (f.mp3 && (genre == 'All' || f.mp3.genre == genre)) {
                    const { artist } = f.mp3
                    if (artist) {
                        if (artists[artist]) {
                            artists[artist]++
                        }
                        else {
                            artists[artist] = 1
                        }
                    }
                }
            })
            artists = Object.keys(artists).sort().map((artist) => {
                const nbTitle = artists[artist]
                return (nbTitle == 1) ?
                    { value: artist, label: artist } :
                    { value: artist, label: `${artist} (${nbTitle})` }
            })
            artists.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })
            return artists
        }





        const ctrl = $$.viewController(elt, {
            data: {
                artists: getArtists(selectedGenre),
                genres: getGenres(),
                selectedArtist,
                selectedGenre
            },
            events: {
                onGenreChange: function(ev) {
                    const genre = $(this).getValue()
                    //console.log('onGenreChange', genre)
                    ctrl.setData({artists: getArtists(genre)})
                },
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }

    }
})
//@ts-check
$$.control.registerControl('breizbot.filechooser', {


	template: "<p>Select a file system</p>\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

	deps: ['breizbot.pager', 'breizbot.files'],

	props: {
		filterExtension: '',
		getMP3Info: false,
		showMp3Filter: false
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} filesSrv
	 */
	init: function (elt, pager, filesSrv) {

		const { filterExtension, getMP3Info, showMp3Filter } = this.props

		/**
		 * 
		 * @param {Breizbot.Controls.Files.Interface} iface 
		 */
		function openFilterPage(iface) {
			const mp3Filters = iface.getMP3Filters()
			const files = iface.getFiles()

			pager.pushPage('breizbot.filterDlg', {
				title: 'Filter',
				props: {
					files,
					mp3Filters
				},
				onReturn: function (filters) {
					//console.log('filters', filters)
					iface.setMP3Filters(filters)
				}
			})
		}

		/**
		 * 
		 * @param {string} title 
		 * @param {string} friendUser 
		 */
		function openFilePage(title, friendUser) {
			const options = {
				title,
				/**@type {Breizbot.Controls.Files.Props} */
				props: {
					filterExtension,
					friendUser,
					getMP3Info
				},
				events: {
					/**
					 * 
					 * @param {Breizbot.Controls.Files.EventData.FileClick} info 
					 */
					fileclick: function (ev, info) {
						//console.log('fileclick', info)
						const { rootDir, fileName, mp3 } = info
						const url = filesSrv.fileUrl(rootDir + fileName, friendUser)
						pager.popPage({url, mp3, fileName})

					}
				},
				onReturn: function (url) {
					pager.popPage(url)
				}
			}
			if (showMp3Filter) {
				options.buttons = {
					search: {
						title: 'Filter',
						icon: 'fas fa-filter',
						onClick: function () {
							openFilterPage(fileCtrl)
						}
					}

				}
			}
			const fileCtrl = pager.pushPage('breizbot.files', options)

		}

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onHome: function () {
					openFilePage('Home files', '')
				},
				onShare: function () {
					pager.pushPage('breizbot.friends', {
						title: 'Shared files',
						/**@type {Breizbot.Controls.Friends.Props} */
						props: {
							showConnectionState: false
						},
						events: {
							/**
							 * 
							 * @param {Breizbot.Controls.Friends.EventData.FriendClick} data 
							 */
							friendclick: function (ev, data) {
								//console.log('onSelectFriend', data)
								const { userName } = data
								openFilePage(userName, userName)
							}
						},
						onReturn: function (data) {
							pager.popPage(data)
						}
					})
				}

			}
		})

	}


});





//@ts-check
(function () {

	/**
	 * 
	 * @param {{name: string, folder: boolean}} f
	 * @returns 
	 */
	function getIconClass(f) {
		let { name, folder } = f
		name = name.toLowerCase()
		if (folder) {
			return 'fa-folder-open w3-text-deep-orange'
		}
		if (name.endsWith('.pdf')) {
			return 'fa-file-pdf w3-text-red'
		}
		if (name.endsWith('.hdoc')) {
			return 'fa-file-word w3-text-blue'
		}
		if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
			return 'fa-file-audio w3-text-purple'
		}
		if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.3gp')) {
			return 'fa-file-video w3-text-orange'
		}
		if (name.endsWith('.zip')) {
			return 'fa-file-archive w3-text-amber'
		}

		return 'fa-file w3-text-blue-grey'
	}

	/**
	 * 
	 * @param {Breizbot.Services.Files.FileInfo[]} files 
	 */
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

	$$.control.registerControl('breizbot.filelist', {
		deps: ['breizbot.files'],
		props: {
			selectionEnabled: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null,
		},

		template: "<div bn-show=\"loading\" class=\"loading\">\n	<i class=\"fa fa-spinner fa-pulse\"></i>\n	loading ...\n</div>\n\n<div class=\"pathPanel\" bn-event=\"click.pathItem: onPathItem\" bn-show=\"!loading\">\n	<div bn-each=\"getPath\" bn-index=\"idx\">\n		<i class=\"fa fa-chevron-right\" bn-show=\"!isFirst\"></i>\n		<span>\n			<a class=\"pathItem\" bn-text=\"$scope.$i\" href=\"#\" bn-show=\"!isLast\" bn-data=\"{info: getPathInfo}\"></a>\n			<span bn-text=\"$scope.$i\" bn-show=\"isLast\" class=\"lastItem\"></span>\n\n		</span>\n	</div>\n</div>\n\n<div class=\"scrollPanel\">\n	<table class=\"w3-table-all w3-hoverable w3-small\">\n		<thead>\n			<tr bn-html=\"getHeader\"></tr>\n		</thead>\n		<tbody bn-each=\"getFiles\" bn-iter=\"f\" bn-lazzy=\"10\" bn-bind=\"files\" bn-event=\"click.item: onItemClick\">\n			<tr class=\"item\" bn-html=\"getItem\"></tr>\n		</tbody>\n	</table>\n\n</div>\n\n",

		/**
		 * 
		 * @param {*} elt 
		 * @param {Breizbot.Services.Files.Interface} srvFiles 
		 */
		init: function (elt, srvFiles) {


			/**@type {Breizbot.Controls.Files.Props} */
			let {
				selectionEnabled,
				filterExtension,
				friendUser,
				getMP3Info,
				mp3Filters,
			} = this.props

			const ctrl = $$.viewController(elt, {

				data: {
					loading: false,
					selectionEnabled,
					rootDir: '/',
					files: [],
					mp3Filters,

					getHeader: function () {
						const data = []
						data.push('')
						if (getMP3Info) {
							data.push('Title')
							data.push('Artist')
							data.push('Duration')
							data.push('BPM')
						}
						else {
							data.push('Name')
							data.push('Size')
							data.push('Last Modif')
						}
						return data.map((e) => `<th>${e}</th>`).join('')
					},
					getItem: function (scope) {
						const data = []
						data.push(`<i class="fa fa-2x ${getIconClass(scope.f)}"></i>`)
						if (getMP3Info) {
							data.push(this.getTitle(scope))
							data.push(this.getArtist(scope))
							data.push(this.getDuration(scope))
							data.push(this.getBPM(scope))
						}
						else {
							data.push(scope.f.name)
							data.push(this.getSize(scope))
							data.push(this.getDate(scope))
						}
						return data.map((e) => `<td>${e}</td>`).join('')

					},
					getIconClass: function (scope) {
						return { class: 'fa fa-lg ' + getIconClass(scope.f) }
					},

					getDuration: function(scope) {
						const { mp3 } = scope.f
						if (mp3 != undefined && mp3.length) {
							return $$.media.getFormatedTime(mp3.length)
						}
						return ''						
					},

					getBPM: function(scope) {
						const { mp3 } = scope.f
						if (mp3 != undefined && mp3.bpm) {
							return mp3.bpm
						}
						return ''						
					},					

					getArtist: function (scope) {
						const { mp3 } = scope.f
						if (mp3 != undefined && mp3.artist) {
							return mp3.artist
						}
						return ''
					},

					getTitle: function (scope) {
						const { mp3, folder, name } = scope.f
						if (folder) {
							return name
						}
						if (mp3 != undefined && mp3.title) {
							return mp3.title
						}
						return ''
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

					getSize: function (scope) {
						if (scope.f.folder) {
							return ''
						}
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
						return size + ' ' + unit
					},

					getDate: function (scope) {
						return new Date(scope.f.mtime).toLocaleDateString()

					}
				},
				events: {
					onPathItem: function (ev) {
						const pathItem = $(this).data('info')
						//console.log('onPathItem', pathItem)
						ev.preventDefault()
						const newDir = pathItem == '' ? '/' : '/' + pathItem + '/'

						ev.stopPropagation()
						elt.trigger('dirchange', { newDir })


						loadData(newDir)
					},

					onItemClick: function (ev) {
						ev.stopPropagation()

						const idx = $(this).index()
						//console.log('idx', idx)
						const info = ctrl.model.getFiles()[idx]
						//console.log('info', info)
						if (info.folder) {
							const dirName = info.name
							const newDir = ctrl.model.rootDir + dirName + '/'
							elt.trigger('dirchange', { newDir })
							loadData(newDir)

						}
						else {
							if (selectionEnabled) {
								$(this).closest('tbody').find('.active').removeClass('active')
								$(this).addClass('active')
							}

							const data = {
								fileName: info.name,
								rootDir: ctrl.model.rootDir,
								isImage: info.isImage,
								mp3: info.mp3
							}

							elt.trigger('fileclick', data)
						}

					}
				}
			})

			/**@type {JQuery} */
			const files = ctrl.scope.files

			async function loadData(rootDir, resetFilters) {
				if (rootDir == undefined) {
					rootDir = ctrl.model.rootDir
				}
				//console.log('loadData', rootDir)
				ctrl.setData({ loading: true })
				let files = await srvFiles.list(rootDir, { filterExtension, getMP3Info }, friendUser)
				if (getMP3Info) {
					files = files.filter((f) => f.folder || (f.mp3 != undefined && f.mp3.title))
				}
				//console.log('files', files)

				sortFiles(files)

				if (resetFilters !== false) {
					ctrl.model.mp3Filters = null
				}


				ctrl.setData({
					loading: false,
					files,
					rootDir
				})

				if (selectionEnabled) {
					ctrl.scope.files.find('.item').eq(0).addClass('active')
				}

			}

			loadData()


			this.getRootDir = function () {
				return ctrl.model.rootDir
			}

			this.enterSelFolder = function() {
				const selElt = files.find('.active')
				const idx = selElt.index()
				console.log('enterSelFolder', idx)
				const info = ctrl.model.getFiles()[idx]
				console.log('info', info)
				if (info.folder) {
					const dirName = info.name
					const newDir = ctrl.model.rootDir + dirName + '/'
					elt.trigger('dirchange', { newDir })
					loadData(newDir)

				}

			}

			this.selUp = function () {
				const selElt = files.find('.active')
				const idx = selElt.index()
				//console.log('selUp', idx)
				if (idx > 0) {
					selElt.removeClass('active')
					const items = files.find('.item')
					items.eq(idx - 1).addClass('active')
					if (idx -1 > 0) {
						items.eq(idx - 2).get(0).scrollIntoViewIfNeeded()
					}
					else {
						items.eq(idx - 1).get(0).scrollIntoViewIfNeeded()
					}
					//selElt.get(0).scrollIntoView()
				}
			}

			this.selDown = function () {
				const selElt = files.find('.active')
				const idx = selElt.index()
				//console.log('selDown', idx)
				if (idx < ctrl.model.files.length - 1) {
					selElt.removeClass('active')
					files.find('.item').eq(idx + 1).addClass('active').get(0).scrollIntoView(false)
				}
			}

			this.getSelFile = function () {
				const idx = ctrl.scope.files.find('.active').index()
				//console.log('idx', idx)
				if (idx < 0) return null
				const { mp3, name } = ctrl.model.getFiles()[idx]
				const url = srvFiles.fileUrl(ctrl.model.rootDir + name, friendUser)
				return { name, mp3, url }

			}

			this.setMP3Filters = function (mp3Filters) {
				ctrl.setData({ mp3Filters })
			}

			this.getMP3Filters = function () {
				return ctrl.model.mp3Filters
			}
		}
	});

})();

//@ts-check
(function () {

	/**
	 * 
	 * @param {string} name 
	 * @returns 
	 */
	function getIconClass(name) {
		name = name.toLowerCase()
		if (name.endsWith('.pdf')) {
			return 'fa fa-file-pdf w3-text-red'
		}
		if (name.endsWith('.hdoc')) {
			return 'fa fa-file-word w3-text-blue'
		}
		if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
			return 'fa fa-file-audio w3-text-purple'
		}
		if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.3gp')) {
			return 'fa fa-file-video w3-text-orange'
		}
		if (name.endsWith('.zip')) {
			return 'fa fa-file-archive w3-text-amber'
		}
		if (name.endsWith('.js')) {
			return 'fab fa-js w3-text-yellow'
		}
		if (name.endsWith('.html')) {
			return 'fab fa-html5 w3-text-blue'
		}	
		return 'fa fa-file w3-text-blue-grey'
	}

	/**
	 * 
	 * @param {Breizbot.Services.Files.FileInfo[]} files 
	 */
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
			selectionEnabled: false,
			folderSelectionEnabled: true,
			imageOnly: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null,
			menuItems: function (data) {
				return {}
			}
		},

		template: "\n<div bn-text=\"info\" bn-bind=\"info\" class=\"info\"></div>\n\n<div bn-show=\"loading\" class=\"loading\">\n	<i class=\"fa fa-spinner fa-pulse\"></i>\n	loading ...\n</div>\n\n<div class=\"pathPanel\" bn-event=\"click.pathItem: onPathItem\" bn-show=\"!loading\">\n	<div bn-each=\"getPath\" bn-index=\"idx\">\n		<i class=\"fa fa-chevron-right\" bn-show=\"!isFirst\"></i>\n		<span>\n			<a class=\"pathItem\" bn-text=\"$scope.$i\" href=\"#\" bn-show=\"!isLast\" bn-data=\"{info: getPathInfo}\"></a>\n			<span bn-text=\"$scope.$i\" bn-show=\"isLast\" class=\"lastItem\"></span>\n\n		</span>\n	</div>\n\n\n</div>\n\n\n<div class=\"scrollPanel\">\n\n	<div \n		bn-each=\"getFiles\" \n		bn-iter=\"f\" \n		bn-lazzy=\"10\" \n		bn-bind=\"files\" \n		bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick, contextmenuchange.thumbnail: onContextMenu\"\n		class=\"container\"\n	>\n\n		<div class=\"thumbnail w3-card-2\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n\n			<span bn-if=\"if1\">\n				<input type=\"checkbox\" bn-show=\"showCheckSelection\" class=\"check w3-check\"\n					bn-prop=\"{checked: $scope.f.checked}\">\n			</span>\n			<div bn-if=\"$scope.f.folder\" class=\"folder item\">\n				<div class=\"icon\">\n					<i class=\"fa fa-4x fa-folder-open w3-text-deep-orange\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\" bn-if=\"if1\"></span>\n				</div>\n			</div>\n			<div bn-if=\"if2\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"isMP3\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<div>Title:&nbsp;<strong bn-text=\"$scope.f.mp3.title\"></strong></div>\n\n					<div>Artist:&nbsp;<strong bn-text=\"$scope.f.mp3.artist\"></strong></div>\n					<div bn-show=\"hasGenre\">Genre:&nbsp;<strong bn-text=\"$scope.f.mp3.genre\"></strong></div>\n					<div bn-show=\"getDuration\">Duration:&nbsp;<strong bn-text=\"getDuration\"></strong></div>\n					<div bn-show=\"hasYear\"> Year:&nbsp;<strong bn-text=\"getYear\"></strong></div>\n				</div>\n			</div>\n\n			<div bn-if=\"if3\" class=\"file item\">\n				<div class=\"icon\">\n					<img bn-attr=\"{src: getThumbnailUrl}\">\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n					<span bn-text=\"getDimension\"></span>\n				</div>\n			</div>\n\n		</div>\n	</div>\n\n\n</div>",

		/**
		 * 
		 * @param {*} elt 
		 * @param {Breizbot.Services.Files.Interface} srvFiles 
		 */
		init: function (elt, srvFiles) {

			const thumbnailSize = '100x?'

			let selected = false

			/**@type {Breizbot.Controls.Files.Props} */
			let {
				selectionEnabled,
				folderSelectionEnabled,
				filterExtension,
				friendUser,
				imageOnly,
				getMP3Info,
				mp3Filters,				
				menuItems
			} = this.props 

			const ctrl = $$.viewController(elt, {

				data: {
					getItems: function (scope) {
						return menuItems(scope.f)
					},
					loading: false,
					selectionEnabled,
					folderSelectionEnabled,
					rootDir: '/',
					files: [],
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

					hasGenre: function (scope) {
						let { genre } = scope.f.mp3
						return genre != undefined && genre != '' && !genre.startsWith('(')
					},

					hasYear: function (scope) {
						let { year } = scope.f.mp3
						return year != undefined && year != ''
					},

					getYear: function (scope) {
						return parseInt(scope.f.mp3.year)
					},

					getThumbnailUrl: function (scope) {
						return srvFiles.fileThumbnailUrl(this.rootDir + scope.f.name, thumbnailSize, friendUser)
					},
					if1: function (scope) {
						return scope.f.name != '..'
					},

					showCheckSelection: function(scope)	{
						let ret = this.selectionEnabled
						if (scope.f.folder)  { ret &= this.folderSelectionEnabled}
						return ret
					},

					if2: function (scope) {
						return !scope.f.folder && !scope.f.isImage && !this.isMP3(scope)
					},
					if3: function (scope) {
						return !scope.f.folder && scope.f.isImage
					},
					class1: function (scope) {
						return `fa-4x ${getIconClass(scope.f.name)}`
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

					getDuration: function(scope) {
						if (scope.f.mp3.length) {
							return $$.media.getFormatedTime(scope.f.mp3.length)
						}
						return ''
					}



				},
				events: {
					onPathItem: function (ev) {
						const pathItem = $(this).data('info')
						//console.log('onPathItem', pathItem)
						ev.preventDefault()
						const newDir = pathItem == '' ? '/' : '/' + pathItem + '/'

						ev.stopPropagation()
						elt.trigger('dirchange', { newDir })


						loadData(newDir)
					},

					onContextMenu: async function (ev, data) {
						const { cmd } = data
						const idx = $(this).closest('.thumbnail').index()
						const { name } = ctrl.model.getFiles()[idx]

						const { rootDir } = ctrl.model
						ev.stopPropagation()
						elt.trigger('contextmenuItem', { cmd, idx, name, rootDir })

					},

					onFileClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]
						//console.log('info', info)

						ev.stopPropagation()
						const data = {
							fileName: info.name,
							rootDir: ctrl.model.rootDir,
							isImage: info.isImage,
							mp3: info.mp3
						}

						elt.trigger('fileclick', data)
					},
					onCheckClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]
						info.checked = $(this).getValue()

						ev.stopPropagation()
						elt.trigger('selchange', { isShareSelected: isShareSelected() })

					},
					onFolderClick: function (ev) {

						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						const dirName = info.name
						const newDir = ctrl.model.rootDir + dirName + '/'
						ev.stopPropagation()
						elt.trigger('dirchange', { newDir })
						loadData(newDir)
					}

				}
			})

			async function loadData(rootDir, resetFilters) {
				if (rootDir == undefined) {
					rootDir = ctrl.model.rootDir
				}
				//console.log('loadData', rootDir)
				ctrl.setData({ loading: true })
				const files = await srvFiles.list(rootDir, { filterExtension, imageOnly, getMP3Info }, friendUser)
				//console.log('files', files)

				sortFiles(files)

				if (resetFilters !== false) {
					ctrl.model.mp3Filters = null
				}


				ctrl.setData({
					loading: false,
					files,
					rootDir,
					nbSelection: 0
				})

			}

			loadData()

			function isShareSelected() {
				return ctrl.model.rootDir == '/' &&
					(ctrl.model.files.findIndex((f) => f.name == 'share' && f.folder && f.checked) != -1)

			}

			this.getSelFiles = function () {
				const selFiles = []
				ctrl.model.files.forEach((f, idx) => {
					const { name, checked } = f
					if (checked === true && name != '..') {
						selFiles.push({ fileName: ctrl.model.rootDir + name, idx })
					}
				})
				//console.log('selFiles', selFiles)	
				return selFiles
			}

			this.getSelFileNames = () => {
				return this.getSelFiles().map((f) => f.fileName)
			}

			this.getNbSelFiles = function () {
				return elt.find('.check:checked').length
			}

			this.toggleSelection = function () {
				selected = !selected
				elt.find('.check').prop('checked', selected)
				ctrl.model.files.forEach((f) => { f.checked = selected })
				ctrl.updateArrayValue('files', 'files')
				elt.trigger('selchange', { isShareSelected: isShareSelected() })
			}

			this.getRootDir = function () {
				return ctrl.model.rootDir
			}

			this.insertFile = function (fileInfo, idx) {
				if (idx) {
					ctrl.insertArrayItemAfter('files', idx, fileInfo, 'files')
				}
				else {
					idx = ctrl.model.getFiles().filter((f) => f.folder).length
					//console.log('idx', idx)
					if (idx == 0) { // no folder, insert at the begining
						ctrl.insertArrayItemBefore('files', 0, fileInfo, 'files')
					}
					else { // insert after last folder
						ctrl.insertArrayItemAfter('files', idx - 1, fileInfo, 'files')
					}
				}
				//console.log('files', ctrl.model.files)
				ctrl.updateNode('info')

			}

			this.removeFiles = function (indexes) {
				ctrl.removeArrayItem('files', indexes, 'files')
				ctrl.updateNode('info')
				//console.log('files', ctrl.model.files)

			}

			this.updateFile = function (idx, info) {
				ctrl.updateArrayItem('files', idx, info, 'files')
			}

			this.updateFileInfo = async function (fileName, options) {
				const { files, rootDir } = ctrl.model
				let idx = ctrl.model.getFiles().findIndex((i) => i.name == fileName)
				//console.log('[FileCtrl] updateFile', idx, fileName, options)
				const info = await srvFiles.fileInfo(rootDir + fileName, friendUser, options)
				ctrl.updateArrayItem('files', idx, info)
				idx = files.findIndex((i) => i.name == fileName)
				files[idx] = info
				//console.log('files', files)
			}

			this.getFiles = function () {
				return ctrl.model.files.filter((f) => !f.folder)
			}

			this.getFilteredFiles = function () {
				return ctrl.model.getFiles().filter((f) => !f.folder)
			}

			this.reload = function () {
				//console.log('[FileCtrl] update')
				loadData(undefined, false)
			}

			this.setMP3Filters = function (mp3Filters) {
				ctrl.setData({ mp3Filters })
			}

			this.getMP3Filters = function () {
				return ctrl.model.mp3Filters
			}
		}
	});

})();

// @ts-check

$$.control.registerControl('breizbot.foldertree', {

	template: "<div \n    bn-control=\"brainjs.tree\" \n    bn-data=\"{source: treeInfo, options: treeOptions}\"\n    bn-iface=\"tree\"\n></div>        \n",

	deps: ['breizbot.files'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} srvFiles
	 */
	init: function (elt, srvFiles) {

		const treeInfo = [
			{ title: 'Home Files', icon: 'fa fa-home w3-text-blue', lazy: true, data: { path: '/' } },
		]

		function concatPath(path, fileName) {
			let ret = path
			if (!path.endsWith('/')) {
				ret += '/'
			}
			ret += fileName
			return ret
		}

		const treeOptions = {
			lazyLoad: function (ev, data) {
				const node = data.node
				console.log('lazyload', node.data)
				data.result = new Promise(async (resolve) => {
					const { path } = node.data
					const folders = await srvFiles.list(path, { folderOnly: true })
					//console.log('folders', folders)
					const results = folders.map((f) => {
						return {
							title: f.name,
							data: {
								path: concatPath(path, f.name)								
							},
							lazy: true,
							folder: true
						}
					})
					resolve(results)
				})
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				treeInfo,
				treeOptions,
			},
			events: {
			}
		})

		/**@type {Brainjs.Controls.Tree.Interface} */
		const tree = ctrl.scope.tree


		this.getSelPath = function() {
			const node = tree.getActiveNode()
			return node.data.path
		}
	}


});





$$.control.registerControl('breizbot.friends', {

	props: {
		showSelection: false,
		showSendMessage: false,
		showConnectionState: true
	},

	deps: ['breizbot.friends', 'breizbot.notifs', 'breizbot.broker'],

	template: "<ul class=\"w3-ul w3-border w3-white\" bn-each=\"friends\" bn-show=\"show1\"\n	bn-event=\"click.w3-bar: onItemClick, click.notif: onSendMessage\">\n	<li class=\"w3-bar\" style=\"cursor: pointer;\">\n		\n		<span class=\"w3-button w3-right notif w3-blue\" title=\"Send Message\" bn-show=\"showSendMessage\">\n			<i class=\"fa fa-envelope\"></i>\n		</span>\n\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-user\" bn-class=\"class1\"></i>\n			<span bn-text=\"$scope.$i.friendUserName\"></span>\n		</div>\n	</li>\n</ul>\n<p bn-show=\"show2\">You have no friends</p>",

	/** 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * */
	init: function(elt, friendsSrv, notifsSrv, broker) {

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
						notifsSrv.sendNotif(userName, {text, reply: true})
					}
				}
			}
		})	

		/**
		 * 
		 * @param {Breizbot.Services.Broker.Msg} msg 
		 * @returns 
		 */
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
			friendsSrv.getFriends().then((friends) => {
				//console.log('friends', friends)
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





//@ts-check
$$.control.registerControl('breizbot.home', {

	deps: [
		'breizbot.broker',
		'breizbot.users',
		'breizbot.notifs',
		'breizbot.geoloc',
		'breizbot.rtc',
		'breizbot.apps',
		'breizbot.scheduler',
		'breizbot.wakelock',
		'breizbot.fullscreen'
	],

	props: {
		userName: 'Unknown'
	},

	template: "<div class=\"header\">\n	<div>\n		<button class=\"w3-button\" title=\"FullScreen\" bn-event=\"click: onFullScreen\" bn-show=\"!fullScreen\">\n			<i class=\"fa fa-expand\"></i></button>\n		<button class=\"w3-button\" title=\"Exit FullScreen\" bn-event=\"click: onExitFullScreen\" bn-show=\"fullScreen\">\n			<i class=\"fa fa-compress\"></i></button>\n		<button class=\"w3-button\" title=\"Connection Status\">\n			<i bn-class=\"{w3-text-green: connected, w3-text-red: !connected}\" class=\"fa fa-circle\"></i>\n\n		</button>\n		<div bn-show=\"hasIncomingCall\" bn-control=\"brainjs.contextmenu\" bn-event=\"contextmenuchange: onCallResponse\"\n			bn-data=\"{\n				trigger: \'left\', \n				title: callInfo.from,\n				items: {\n					accept: {name: \'Accept\'},\n					deny: {name: \'Decline\'},\n				}\n			}\" class=\"w3-button\">\n			<i class=\"fa fa-spinner fa-pulse\"></i>\n			<i bn-attr=\"{class: callInfo.iconCls}\"></i>\n		</div>\n	</div>\n\n\n	<!-- 	<strong bn-text=\"title\"></strong>\n -->\n	<div>\n		<button class=\"notification w3-button\" title=\"Notification\" bn-event=\"click: onNotification\">\n			<i class=\"fa fa-lg fa-bell\"></i>\n			<span class=\"w3-badge w3-red w3-tiny\" bn-text=\"nbNotif\" bn-show=\"hasNotif\"></span>\n		</button>\n\n\n\n		<div bn-control=\"brainjs.contextmenu\" bn-data=\"{\n				items: {\n					settings: {name: \'Settings\', icon: \'fas fa-cog\'},\n					apps: {name: \'Applications\', icon: \'fas fa-th\'},\n					sep: \'------\',\n					logout: {name: \'Logout\', icon: \'fas fa-power-off\'}\n				},\n				title: userName,\n				trigger: \'left\'\n			}\" class=\"w3-button\" bn-event=\"contextmenuchange: onContextMenu\">\n			<i class=\"fas fa-user-circle fa-lg\"></i>\n\n		</div>\n\n	</div>\n\n\n</div>\n\n<div bn-control=\"brainjs.tabs\" class=\"content\" bn-iface=\"tabs\"\n	bn-event=\"tabsremove: onTabRemove, tabsactivate: onTabActivate\">\n	<div bn-control=\"breizbot.apps\" bn-data=\"{\n			apps: getMyApps,\n			items\n		}\" bn-event=\"appclick: onAppClick, appcontextmenu: onTileContextMenu\" title=\"Home\">\n	</div>\n\n</div>",

	/**
	 * 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @param {Breizbot.Services.User.Interface} users 
	 * @param {Breizbot.Services.Notif.Interface} notifsSrv 
	 * @param {Breizbot.Services.Geoloc.Interface} geoloc 
	 * @param {Breizbot.Services.RTC.Interface} rtc 
	 * @param {Breizbot.Services.Apps.Interface} srvApps 
	 * @param {Breizbot.Services.Scheduler.Interface} scheduler 
	 * @param {Breizbot.Services.WakeLock.Interface} wakelock 
	 * @param {Breizbot.Services.FullScreen.Interface} fullscreen 
	 */
	init: function (elt, broker, users, notifsSrv, geoloc, rtc, srvApps, scheduler, wakelock, fullscreen) {

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
						scheduler.logout()
					}
					if (data.cmd == 'apps') {
						openApp('store')
					}
					if (data.cmd == 'settings') {
						const settings = await users.getUserSettings()
						console.log('setting', settings)
						openApp('settings', settings)
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

				onExitFullScreen: function () {
					//console.log('onExitFullScreen')
					fullscreen.exit()
				},

				onFullScreen: function (ev) {
					//console.log('onFullScreen')
					fullscreen.enter()
				},
				onTabRemove: function (ev, idx) {
					//console.log('onTabRemove', idx)
					const info = tabs.getTabInfo(idx)
					info.ctrlIface.onAppExit().then(() => {
						tabs.removeTab(idx)
					})
				},
				onTabActivate: function (ev, ui) {
					//console.log('onTabActivate')
					const { newTab, oldTab } = ui
					const newTabIdx = newTab.index()
					const oldTabIdx = oldTab.index()
					if (oldTabIdx > 0) {
						const info = tabs.getTabInfo(oldTabIdx)
						info.ctrlIface.onAppSuspend()
					}
					if (newTabIdx > 0) {
						const info = tabs.getTabInfo(newTabIdx)
						info.ctrlIface.onAppResume()
					}
					if (newTabIdx == 0) {
						loadApp()
					}


				}
			}
		})

		/**@type {Brainjs.Controls.Tabs.Interface} */
		const tabs = ctrl.scope.tabs

		fullscreen.init((fullScreen) => {
			ctrl.setData({ fullScreen })
		})

		/**
		 * 
		 * @param {number} nbNotif 
		 */
		function updateNotifs(nbNotif) {
			ctrl.setData({ nbNotif })

		}

		broker.on('connected', (state) => {
			ctrl.setData({ connected: state })
		})

		window.addEventListener('message', (ev) => {
			//console.log('[home] message', ev.data)
			const { type, data } = ev.data
			if (type == 'openApp') {
				const { appName, appParams, newTabTitle } = data
				openApp(appName, appParams, newTabTitle)
			}
			if (type == 'reload') {
				location.reload()
			}

		}, false)

		broker.register('breizbot.friends', (msg) => {
			//console.log('breizbot.friends', msg)
			if (msg.hist === true) {
				return
			}
			/**@type Breizbot.Services.Broker.Events.Friends */
			const { isConnected, userName } = msg.data
			if (isConnected) {
				$.notify(`'${userName}' is connected`, 'success')
			}
			else {
				$.notify(`'${userName}' is disconnected`, 'error')

			}
		})

		broker.register('breizbot.notifCount', function (msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.onTopic('breizbot.logout', function (msg) {
			location.href = '/logout'
		})


		function openApp(appName, params, newTabTitle) {
			const appInfo = ctrl.model.apps.find((a) => a.appName == appName)
			let title = appInfo.props.title
			//console.log('openApp', appName, params, newTabTitle)
			let idx = tabs.getTabIndexFromTitle(title)
			const appUrl = $$.url.getUrlParams(`/apps/${appName}`, params)
			const addNewTab = typeof newTabTitle == 'string'
			if (addNewTab || idx < 0) { // apps not already run
				idx = tabs.addTab(
					(!addNewTab) ? title : `${title}[${newTabTitle}]`,
					{
						removable: true,
						control: 'breizbot.appTab',
						props: {
							appUrl
						}
					})
			}
			else {
				const info = tabs.getTabInfo(idx)
				if (params != undefined) {
					info.ctrlIface.setAppUrl(appUrl)
				}
			}

			tabs.setSelectedTabIndex(idx)

		}

		notifsSrv.getNotifCount().then(updateNotifs)

		function loadApp() {
			srvApps.listAll().then((apps) => {
				//console.log('apps', apps)
				ctrl.setData({
					apps
				})
			})
		}


		loadApp()

		geoloc.startWatch()

		wakelock.requestWakeLock()

	}
});


$$.control.registerControl('breizbot.pager', {

	props: {
		rootPage: ''
	},
	template: "<div bn-show=\"showBack\" class=\"toolbar\">\n	<div class=\"left\">\n		<button class=\"w3-button\" title=\"Back\" bn-event=\"click: onBack\">\n			<i class=\"fa fa-arrow-left\"></i>\n		</button>\n		<span bn-text=\"title\" class=\"title\"></span>\n	\n	</div>\n	<div bn-each=\"buttons\" class=\"right\" bn-event=\"click.action: onAction, contextmenuchange.menu: onContextMenu\">\n		<button bn-show=\"show1\" class=\"w3-button action\" bn-text=\"$scope.$i.label\"\n			bn-data=\"{cmd: $scope.$i.name}\" bn-prop=\"{disabled: !isEnabled}\"></button>\n		<button bn-show=\"show2\" class=\"w3-button action\" bn-data=\"{cmd: $scope.$i.name}\"\n			bn-attr=\"{title: $scope.$i.title}\" bn-prop=\"{disabled: !isEnabled}\"><i bn-attr=\"{class: $scope.$i.icon}\"></i></button>\n\n			<button bn-show=\"show3\" class=\"w3-button menu\" \n			bn-prop=\"{disabled: !isEnabled}\"\n			bn-control=\"brainjs.contextmenu\" bn-data=\"{items: $scope.$i.items, trigger: \'left\', cmd: $scope.$i.name}\"\n			bn-attr=\"{title: $scope.$i.title}\"><i bn-attr=\"{class: $scope.$i.icon}\"></i></button>\n		</div>			\n	</div>\n</div>\n<div bn-bind=\"content\" class=\"content\"></div>",

	init: function (elt) {

		const { rootPage } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				showBack: false,
				title: '',
				buttons: [],
				show1: function (scope) {
					return scope.$i.items == undefined && scope.$i.icon == undefined && !(scope.$i.visible === false)
				},
				show2: function (scope) {
					return scope.$i.items == undefined && scope.$i.icon != undefined && !(scope.$i.visible === false)
				},
				show3: function (scope) {
					return scope.$i.items != undefined && !(scope.$i.visible === false)
				},
				isEnabled(scope) {
					return scope.$i.enabled == undefined || scope.$i.enabled === true
				}
			},
			events: {
				onBack: function (ev) {
					//console.log('onBack')
					restorePage(true)
				},
				onAction: function (ev) {
					const cmd = $(this).data('cmd')
					const pageCtrlIface = curInfo.ctrl.iface()
					//console.log('onAction', cmd)
					const fn = curInfo.buttons[cmd].onClick
					if (typeof fn == 'function') {
						fn.call(pageCtrlIface)
					}
				},
				onContextMenu: function (ev, data) {
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
			let backValue

			if (typeof iface.onBack == 'function') {
				backValue = iface.onBack()
			}
			//console.log('popPage', pageCtrl)
			curInfo.ctrl.safeEmpty().remove()

			const { onBack, onReturn } = curInfo

			curInfo = stack.pop()
			curInfo.ctrl.show()
			const { title, buttons } = curInfo
			ctrl.setData({ showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name') })

			if (isBack) {
				//console.log('[pager] back', iface.name)
				if (typeof onBack == 'function') {
					console.log('[pager] onBack', iface.name)
					onBack.call(iface, backValue)
				}
			}
			else if (typeof onReturn == 'function') {
				//console.log('[pager] onReturn', iface.name, data)
				onReturn.call(iface, data)
			}

		}

		this.popPage = function (data) {
			return restorePage(false, data)
		}

		this.pushPage = function (ctrlName, options) {
			//console.log('[pager] pushPage', ctrlName)


			if (curInfo != null) {
				curInfo.ctrl.hide()
				stack.push(curInfo)
			}

			options = options || {}

			let { title, props, onReturn, onBack, events } = options

			const control = content.addControl(ctrlName, props, events)

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

			curInfo = { title, buttons, onReturn, onBack, ctrl: control }

			ctrl.setData({ showBack: stack.length > 0, title, buttons: $$.util.objToArray(buttons, 'name') })
			return control.iface()
		}

		this.setButtonVisible = function (buttonsVisible) {

			const { buttons } = curInfo

			for (let btn in buttonsVisible) {
				if (btn in buttons) {
					buttons[btn].visible = buttonsVisible[btn]
				}
			}

			ctrl.setData({ buttons: $$.util.objToArray(buttons, 'name') })
		}

		this.setButtonEnabled = function (buttonsEnabled) {
			//console.log('setButtonEnabled', buttonsEnabled)

			const { buttons } = curInfo

			if (typeof buttonsEnabled === 'boolean') {
				for (let btn in buttons) {
					buttons[btn].enabled = buttonsEnabled
				}

			}
			else {
				for (let btn in buttonsEnabled) {
					if (btn in buttons) {
						buttons[btn].enabled = buttonsEnabled[btn]
					}
				}

			}

			ctrl.setData({ buttons: $$.util.objToArray(buttons, 'name') })
		}

		this.pushPage(rootPage)

	}

});






//@ts-check
$$.control.registerControl('breizbot.pdf', {

	template: "<div class=\"toolbar\">\n	<div bn-show=\"wait\" class=\"loading\">\n		<i class=\"fa fa-spinner fa-pulse\"></i> Rendering...\n	</div>\n	<div bn-show=\"!wait\">\n		<button \n			class=\"w3-button\" \n			title=\"Refresh\" \n			bn-icon=\"fa fa-sync-alt\"\n			bn-event=\"click: onRefresh\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Fit\" \n			bn-icon=\"fa fa-expand\"\n			bn-event=\"click: onFit\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Zoom In\" \n			bn-icon=\"fa fa-search-plus\"\n			bn-event=\"click: onZoomIn\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Zoom Out\" \n			bn-icon=\"fa fa-search-minus \"\n			bn-event=\"click: onZoomOut\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Rotate Left\" \n			bn-icon=\"fas fa-undo-alt\"\n			bn-event=\"click: onRotateLeft\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Rotate Right\" \n			bn-icon=\"fas fa-redo-alt\"\n			bn-event=\"click: onRotateRight\">\n		</button>		\n\n		<button \n			class=\"w3-button\" \n			title=\"Print\" \n			bn-icon=\"fa fa-print\"\n			bn-event=\"click: onPrint\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Go to Page\" \n			bn-icon=\"fa fa-reply fa-flip-horizontal\"\n			bn-event=\"click: onGotoPage\">\n		</button>		\n	</div>\n	<div>\n	</div>\n	<div class=\"pages\" bn-show=\"show1\">\n		<div>\n			<button class=\"w3-button\" title=\"previous page\" bn-event=\"click: onPrevPage\" bn-icon=\"fa fa-angle-left\">\n			</button>	\n\n			<button class=\"w3-button\" title=\"next page\" bn-event=\"click: onNextPage\" bn-icon=\"fa fa-angle-right\">\n			</button>			\n		</div>\n		<div>\n			Pages: <span bn-text=\"currentPage\"></span> / <span bn-text=\"numPages\"></span>		\n		</div>\n	</div>\n</div>\n	\n<div bn-control=\"brainjs.pdf\" \n	bn-data=\"{worker: \'/brainjs/pdf/worker.js\'}\"\n	bn-iface=\"pdf\"\n	 \n></div>		\n",

	props: {
		url: ''
	},

	init: function (elt) {

		//@ts-ignore
		const { url } = this.props

		const progressDlg = $$.ui.progressDialog('Processing...')


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
				onRefresh: async function() {
					await pdf.refresh()
				},
				onRotateRight: async function() {
					//console.log('onRotateRight')
					await pdf.rotateRight()
				},
				onRotateLeft: async function() {
					//console.log('onRotateLeft')
					await pdf.rotateLeft()
				},
				onZoomIn: async function() {
					//console.log('onZoomIn')
					await pdf.zoomIn()
				},
				onZoomOut: async function() {
					//console.log('onZoomOut')
					await pdf.zoomOut()
				},
				onGotoPage: async function() {
					const pageNo = await $$.ui.showPrompt({
						title: 'Go to Page',
						label: 'Page Number',
						attrs: {
							type: 'number',
							min: 1,
							max: ctrl.model.numPages,
							step: 1
						}
					})
					ctrl.setData({ wait: true })
					const currentPage =  await pdf.setPage(pageNo)
					ctrl.setData({ currentPage, wait: false })
				},
				onPrint: async function() {
					progressDlg.setPercentage(0)
					progressDlg.show()
					await pdf.print({
						onProgress: function(data) {
							progressDlg.setPercentage(data.page / ctrl.model.numPages)						
						}
					})
					progressDlg.hide()
				},
				onNextPage: async function (ev) {
					//console.log('onNextPage')
					ctrl.setData({ wait: true })
					const currentPage = await pdf.nextPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onPrevPage: async function (ev) {
					//console.log('onPrevPage')
					ctrl.setData({ wait: true })
					const currentPage = await pdf.prevPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onFit: function (ev) {
					pdf.fit()
				}

			}
		})

		/**@type {Brainjs.Controls.Pdf.Interface} */
		const pdf = ctrl.scope.pdf

		async function openFile(url, title) {

			ctrl.setData({ wait: true })

			try {
				const numPages = await pdf.openFile(url)
				console.log('file loaded')
				ctrl.setData({
					title,
					numPages,
					wait: false
				})
			}
			catch(e) {
				
			}

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





//@ts-check
$$.control.registerControl('breizbot.rtc', {

	deps: ['breizbot.rtc', 'breizbot.pager'],

	props: {
		appName: '',
		iconCls: '',
		title: 'Select a friend'
	},

	//template: "<div class=\"toolbar\">\n\n		<div class=\"status\">\n			<p>Status: <span bn-text=\"status\"></span></p>\n		</div>		\n\n		<div>\n			<button \n				title=\"Call a friend\" \n				bn-event=\"click: onCall\"\n				bn-show=\"show1\"\n				class=\"w3-button\"><i class=\"fa fa-phone\"></i></button>\n\n			<button \n				bn-event=\"click: onCancel\"\n				title=\"Cancel\"\n				bn-show=\"show2\"\n				class=\"w3-button\"><i class=\"fa fa-phone-slash\"></i></button>\n\n			<button \n				title=\"Hangup\" \n				bn-event=\"click: onHangup\"\n				bn-show=\"show3\"\n				class=\"w3-button\"><i class=\"fa fa-phone-slash\"></i></button>			\n		</div>\n\n\n</div>\n<div bn-show=\"show4\" bn-bind=\"panel\" class=\"panel\"></div>",

	/**
	 * 
	 * @param {Breizbot.Services.RTC.Interface} rtc 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function(elt, rtc, pager) {

		const {appName, iconCls, title} = this.props

		const $children = elt.children().remove()
		//@ts-ignore
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

    template: "<form bn-event=\"submit: onSearch\" bn-bind=\"form\">\n	<input type=\"search\" \n        name=\"value\" \n        bn-attr=\"{placeholder, minlength, required}\"\n		autocomplete=\"off\"\n		bn-control=\"brainjs.input\">\n	<button class=\"w3-button w3-text-blue\" type=\"submit\" ><i class=\"fa fa-search\"></i></button>\n</form>",

    props: {
        placeholder: '',
        minlength: 0,
        required: true
    },

    init: function (elt) {

        const { placeholder, minlength, required } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                placeholder,
                minlength,
                required
            },
            events: {
                onSearch: async function (ev) {
                    ev.preventDefault()
                    const { value } = $(this).getFormData()
                    elt.trigger('searchbarsubmit', { value })
                }

            }
        })

        this.setValue = function (value) {
            ctrl.scope.form.setFormData({ value })
        }
    },
    $iface: `
        setValue(value: string)
    `,
    $events: 'searchbarsubmit'
}); 11

//@ts-check
$$.control.registerControl('breizbot.addUser', {

	template: "<form bn-event=\"submit: onSubmit\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>UserName</label>\n		<input type=\"text\" placeholder=\"username\" name=\"username\" required=\"\">\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Pseudo</label>\n		<input type=\"text\" placeholder=\"pseudo\" name=\"pseudo\" required>\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Location</label>\n		<input type=\"text\" placeholder=\"location\" name=\"location\" required>\n	</div>\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email</label>\n		<input type=\"email\" placeholder=\"email\" name=\"email\" required>	\n	</div>\n	\n	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	deps: ['breizbot.pager'],

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function(elt, pager) {


		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					pager.popPage($(this).getFormData())
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

//@ts-check
$$.control.registerControl('breizbot.users', {

	deps: ['breizbot.users', 'breizbot.notifs', 'breizbot.pager'],

	template: "<div class=\"toolbar\">\n	<button bn-event=\"click: onUpdate\" class=\"w3-btn w3-blue\" title=\"Update\">\n		<i class=\"fa fa-redo\"></i>\n	</button>	\n	<button bn-event=\"click: onAddUser\" class=\"w3-btn w3-blue btnAddUser\" title=\"Add User\">\n		<i class=\"fa fa-user-plus\"></i>\n	</button>	\n</div>\n\n<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-small\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>User Name</th>\n                <th>Pseudo</th>\n                <th>Location</th>\n                <th>Email</th>\n                <th>Create Date</th>\n                <th>Last Login Date</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"data\" bn-event=\"click.delete: onDelete, click.notif: onNotif\">\n  			<tr>\n				<td bn-text=\"$scope.$i.username\"></td>\n				<td bn-text=\"$scope.$i.pseudo\"></td>\n				<td bn-text=\"$scope.$i.location\"></td>\n				<td bn-text=\"$scope.$i.email\"></td>\n				<td >\n					<span bn-text=\"text1\" bn-show=\"show1\"></span>\n				</td>\n				<td>\n					<span bn-show=\"show2\">\n\n						<span bn-text=\"text2\"></span><br>\n						at \n						<span bn-text=\"text3\"></span>\n					</span>\n				</td>\n				<td>\n					<button class=\"delete w3-btn w3-blue\" title=\"Delete User\">\n						<i class=\"fa fa-trash\"></i>\n					</button>\n					<button class=\"notif w3-btn w3-blue\" title=\"Send Notification\">\n						<i class=\"fa fa-bell\"></i>\n					</button>\n				</td>\n			</tr>      	\n\n        </tbody>\n    </table>\n</div>",

	/**
	 * 
	 * @param {Breizbot.Services.User.AdminInterface} users 
	 * @param {Breizbot.Services.Notif.Interface} notifsSrv 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, users, notifsSrv, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				data: [],
				text1: function (scope) {
					return new Date(scope.$i.createDate).toLocaleDateString('fr-FR')
				},
				text2: function (scope) {
					return new Date(scope.$i.lastLoginDate).toLocaleDateString('fr-FR')
				},
				text3: function (scope) {
					return new Date(scope.$i.lastLoginDate).toLocaleTimeString('fr-FR')
				},
				show1: function (scope) {
					return scope.$i.createDate != undefined
				},
				show2: function (scope) {
					return scope.$i.lastLoginDate != undefined && scope.$i.lastLoginDate != 0
				}
			},
			events: {
				onAddUser: function (ev) {
					pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						onReturn: async function (data) {
							//console.log('onReturn', data)
							await users.add(data)
							getUsers()
						}
					})
				},
				onDelete: function (ev) {
					const idx = $(this).closest('tr').index()
					const { username } = ctrl.model.data[idx]
					$$.ui.showConfirm({ title: 'Delete User', content: 'Are you sure ?' }, async function () {
						await users.remove(username)
						getUsers()
					})
				},
				onNotif: async function (ev) {
					const idx = $(this).closest('tr').index()
					const { username } = ctrl.model.data[idx]
					const text = await $$.ui.showPrompt({ title: 'Send Notification', label: 'Message' })
					if (text != null) {
						notifsSrv.sendNotif(username, { text })
					}
				},
				onUpdate: function () {
					getUsers()
				}

			}
		})

		async function getUsers() {
			const data = await users.list()
			console.log('getUsers', data)
			ctrl.setData({ data })

		}

		getUsers()



	}

});

//@ts-check
$$.control.registerControl('breizbot.viewer', {

	template: "<div bn-if=\"isImage\">\n	<div \n		class=\"image\" \n		bn-control=\"brainjs.image\" \n		bn-data=\"{src: url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>\n	\n</div>\n\n\n<div bn-if=\"isPdf\">\n	<div \n		class=\"pdf\" \n		bn-control=\"breizbot.pdf\" \n		bn-data=\"{url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>		\n</div>\n\n<div bn-if=\"isAudio\" class=\"audio\">\n	<audio bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></audio>\n</div>\n\n<div bn-if=\"isVideo\" class=\"video\">\n	<video bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></video>\n</div>\n\n<div bn-if=\"isDoc\" class=\"doc\" bn-bind=\"doc\" bn-event=\"click.top: onTop\">\n	<button bn-icon=\"fas fa-angle-up\" class=\"top\" title=\"Top\" ></button>\n	<div class=\"scrollPanel\">\n		<div class=\"html\"></div>\n	</div>\n</div>\n\n<div bn-if=\"isCode\" bn-bind=\"code\" class=\"code\">\n	<div class=\"scrollPanel\">\n		<pre>\n			<code bn-attr=\"{class: language}\"></code>\n		</pre>\n	</div>\n\n</div>",

	props: {
		type: '',
		url: '#'
	},
	
	init: function(elt) {

		//@ts-ignore
		let {type, url} = this.props
		//console.log('props', this.props)

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
				language: `language-${type}`,
				isImage: function() {
					return this.type == 'image'
				},
				isPdf: function() {
					return this.type == 'pdf'
				},
				isAudio: function() {
					return this.type == 'audio'
				},
				isVideo: function() {
					return this.type == 'video'
				},
				isDoc: function() {
					return this.type == 'hdoc'
				},
				isCode: function() {
					return ['javascript', 'html'].includes(this.type)
				}

			},
			events: {
				onTop: function() {
					console.log('onTop')
					ctrl.scope.doc.find('.scrollPanel').get(0).scroll(0, 0)
				}
			}
		})


		async function readText() {
			const ret = await fetch(url)			
			return await ret.text()
		}

		async function readHtml() {
			const htmlDoc = await readText()
			//console.log('htmlDoc', htmlDoc)
			const htmlElt = ctrl.scope.doc.find('.html')
			htmlElt.html(htmlDoc)
			htmlElt.find('a[href^=http]').attr('target', '_blank') // open external link in new navigator tab
		}

		async function readCode() {
			const code = await readText()
			const codeElt = ctrl.scope.code
			codeElt.find('code').text(code)
			Prism.highlightAllUnder(codeElt.get(0))
		}

		if (type == 'hdoc') {
			readHtml()
		}

		if (ctrl.model.isCode()) {
			readCode()
		}


		this.setData = function(data) {
			console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({url: data.url})
			}
		}

	}

});





//@ts-check
$$.service.registerService('breizbot.appData', {

	deps: ['brainjs.http'],

	/**
	 * 
	 * @returns 
	 */
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
	}
});

//@ts-check
$$.service.registerService('breizbot.apps', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			listAll: function() {
				return http.get('/api/apps/all')
			}			
		}
	}
});

//@ts-check
$$.service.registerService('breizbot.beatdetector', {

	init: function(config) {

        if (typeof config.workerPath != 'string') {
            throw 'beatdetector worker path is not defined'
        }
        
        const worker = new Worker(config.workerPath)        

        function computeBeatDetection(audioBuffer) {

            return new Promise(async (resolve) => {

                const sampleRate = audioBuffer.sampleRate
                const offlineContext = new OfflineAudioContext(1, audioBuffer.length, sampleRate)

                // Create buffer source
                const source = offlineContext.createBufferSource()
                source.buffer = audioBuffer

                // Create filter
                const filter = offlineContext.createBiquadFilter()
                filter.type = "lowpass"
                filter.frequency.value = 240

                // Pipe the song into the filter, and the filter into the offline context
                source.connect(filter)
                filter.connect(offlineContext.destination)

                // Schedule the song to start playing at time:0
                source.start(0);

                // Render the song
                offlineContext.startRendering()

                // Act on the result
                offlineContext.oncomplete = function (e) {
                    // Filtered buffer!
                    const channelData = e.renderedBuffer.getChannelData(0)
                    worker.postMessage({ channelData, sampleRate })
                    worker.onmessage = function (ev) {
                        resolve(ev.data)
                    }
                }
            })
        }        

		return  {
            computeBeatDetection
		}

	},

	$iface: `function(prefix):HttpInterface`

});







//@ts-check
$$.service.registerService('breizbot.blocklyinterpretor', {

    init: function (config) {

        let variablesValue
        let procedureBlock
        let variablesDef
        let breakState = ''
        let logFunction

        function mathRandomInt(a, b) {
            if (a > b) {
                // Swap a and b to ensure a is smaller.
                var c = a;
                a = b;
                b = c;
            }
            return Math.floor(Math.random() * (b - a + 1) + a);
        }

        const blockTypeMap = {
            'math_number': async function (block) {
                return block.fields.NUM
            },
            'text': async function (block) {
                return block.fields.TEXT
            },
            'text_append': async function (block) {
                const varId = block.fields.VAR.id
                const text = await evalCode(block.inputs.TEXT)
                variablesValue[varId] += text
            },
            'text_join': async function (block) {
                const nbItems = block.extraState.itemCount
                let ret = ''
                if (block.inputs != undefined) {
                    for (let i = 0; i < nbItems; i++) {
                        const itemName = `ADD${i}`
                        if (block.inputs[itemName] != undefined) {
                            const text = await evalCode(block.inputs[itemName])
                            ret += text
                        }
                    }
                }
                return ret
            },
            'text_length': async function (block) {
                const text = await evalCode(block.inputs.VALUE)
                return text.length
            },

            'variables_set': async function (block) {
                const varId = block.fields.VAR.id
                const value = await evalCode(block.inputs.VALUE)
                console.log({ varId, value })
                variablesValue[varId] = value
            },
            'variables_get': async function (block) {
                const varId = block.fields.VAR.id
                return variablesValue[varId]
            },
            'math_arithmetic': async function (block) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A)
                const val2 = await evalCode(block.inputs.B)
                console.log({ operator, val1, val2 })
                switch (operator) {
                    case 'ADD':
                        return val1 + val2
                    case 'MINUS':
                        return val1 - val2
                    case 'MULTIPLY':
                        return val1 * val2
                    case 'DIVIDE':
                        return val1 / val2
                    case 'POWER':
                        return Math.pow(val1, val2)
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_single': async function (block) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM)
                console.log({ operator, val })
                switch (operator) {
                    case 'ROOT':
                        return Math.sqrt(val)
                    case 'ABS':
                        return Math.abs(val)
                    case 'NEG':
                        return -val
                    case 'LN':
                        return Math.log(val)
                    case 'LOG10':
                        return Math.log10(val)
                    case 'EXP':
                        return Math.exp(val)
                    case 'POW10':
                        return Math.pow(10, val)
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_trig': async function (block) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM)
                console.log({ operator, val })
                switch (operator) {
                    case 'SIN':
                        return Math.sin(val / 180 * Math.PI)
                    case 'COS':
                        return Math.cos(val / 180 * Math.PI)
                    case 'TAN':
                        return Math.tan(val / 180 * Math.PI)
                    case 'ASIN':
                        return Math.asin(val) / Math.PI * 180
                    case 'ACOS':
                        return Math.acos(val) / Math.PI * 180
                    case 'ATAN':
                        return Math.atan(val) / Math.PI * 180
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_random_int': async function (block) {
                const from = await evalCode(block.inputs.FROM)
                const to = await evalCode(block.inputs.TO)
                return mathRandomInt(from, to)
            },
            'math_round': async function (block) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM)
                console.log({ operator, val })
                switch (operator) {
                    case 'ROUND':
                        return Math.round(val)
                    case 'ROUNDUP':
                        return Math.ceil(val)
                    case 'ROUNDDOWN':
                        return Math.floor(val)
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_constant': async function (block) {
                const c = block.fields.CONSTANT
                switch (c) {
                    case 'PI':
                        return Math.PI
                    case 'E':
                        return Math.E
                    case 'GOLDEN_RATIO':
                        return (1 + Math.sqrt(5)) / 2
                    case 'SQRT2':
                        return Math.SQRT2
                    case 'SQRT1_2':
                        return Math.SQRT1_2
                    case 'INFINITY':
                        return Infinity
                    default:
                        throw (`Unknown constante '${c}'`)
                }
            },
            'controls_repeat_ext': async function (block) {
                const times = await evalCode(block.inputs.TIMES)
                console.log('TIMES', times)
                for (let i = 0; i < times; i++) {
                    await evalCode(block.inputs.DO)
                    if (breakState == 'BREAK') {
                        breakState = ''
                        break
                    }
                    else if (breakState == 'CONTINUE') {
                        breakState = ''
                    }
                }
            },
            'text_print': async function (block) {
                if (typeof logFunction == 'function') {
                    logFunction(await evalCode(block.inputs.TEXT))
                }
            },
            'text_prompt_ext': async function (block) {
                const type = block.fields.TYPE
                const label = await evalCode(block.inputs.TEXT)
                console.log({ type, label })
                const ret = await $$.ui.showPrompt({
                    label, title: 'Enter value', attrs: {
                        type: type.toLowerCase()
                    }
                })
                return ret
            },
            'text_changeCase': async function (block) {
                const charCase = block.fields.CASE
                console.log({ charCase })
                const value = await evalCode(block.inputs.TEXT)
                switch (charCase) {
                    case 'UPPERCASE':
                        return value.toUpperCase()
                    case 'LOWERCASE':
                        return value.toLowerCase()
                    case 'TITLECASE':
                        return textToTitleCase(value)
                }
            },
            'logic_compare': async function (block) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A)
                const val2 = await evalCode(block.inputs.B)
                console.log({ operator, val1, val2 })
                switch (operator) {
                    case 'EQ':
                        return val1 === val2
                    case 'NEQ':
                        return val1 !== val2
                    case 'LT':
                        return val1 < val2
                    case 'LTE':
                        return val1 <= val2
                    case 'GT':
                        return val1 > val2
                    case 'GTE':
                        return val1 >= val2
                    default:
                        throw (`Unknown operator '${operator}'`)

                }
            },
            'logic_operation': async function (block) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A)
                const val2 = await evalCode(block.inputs.B)
                console.log({ operator, val1, val2 })
                switch (operator) {
                    case 'AND':
                        return val1 && val2
                    case 'OR':
                        return val1 || val2
                    default:
                        throw (`Unknown operator '${operator}'`)
                }

            },
            'logic_boolean': async function (block) {
                const test = block.fields.BOOL
                console.log('test', test)
                return (test == 'TRUE')
            },
            'logic_negate': async function (block) {
                const test = await evalCode(block.inputs.BOOL)
                return !test
            },
            'logic_ternary': async function (block) {
                const test = await evalCode(block.inputs.IF)
                if (test) {
                    return await evalCode(block.inputs.THEN)
                }
                else {
                    return await evalCode(block.inputs.ELSE)
                }
            },
            'controls_if': async function (block) {

                let hasElse = false
                let nbIf = 1

                const { extraState } = block
                if (extraState != undefined) {
                    if (extraState.hasElse != undefined) {
                        hasElse = extraState.hasElse
                    }
                    if (extraState.elseIfCount != undefined) {
                        nbIf += extraState.elseIfCount
                    }
                }
                console.log({ hasElse, nbIf })
                let test = false
                for (let i = 0; i < nbIf; i++) {
                    const ifName = `IF${i}`
                    const doName = `DO${i}`
                    test = await evalCode(block.inputs[ifName])
                    console.log(ifName, test)
                    if (test) {
                        await evalCode(block.inputs[doName])
                        break
                    }

                }
                if (hasElse && !test) {
                    await evalCode(block.inputs.ELSE)
                }

            },
            'controls_whileUntil': async function (block) {
                const mode = block.fields.MODE
                console.log({ mode })
                if (mode == 'WHILE') {
                    let test = await evalCode(block.inputs.BOOL)
                    while (test) {
                        await evalCode(block.inputs.DO)
                        test = await evalCode(block.inputs.BOOL)
                    }
                }
                else if (mode == 'UNTIL') {
                    let test = await evalCode(block.inputs.BOOL)
                    while (!test) {
                        await evalCode(block.inputs.DO)
                        test = await evalCode(block.inputs.BOOL)
                    }
                }
                else {
                    throw `Unknown mode '${mode}'`
                }
            },
            'controls_for': async function (block) {
                const varId = block.fields.VAR.id
                const from = await evalCode(block.inputs.FROM)
                const to = await evalCode(block.inputs.TO)
                const by = await evalCode(block.inputs.BY)
                console.log({ from, to, by })
                for (let i = from; i <= to; i += by) {
                    variablesValue[varId] = i
                    await evalCode(block.inputs.DO)
                    if (breakState == 'BREAK') {
                        breakState = ''
                        break
                    }
                    else if (breakState == 'CONTINUE') {
                        breakState = ''
                    }
                }
            },
            'procedures_callnoreturn': async function (block) {
                const { extraState } = block
                const functionName = extraState.name
                let nbArgs = 0
                if (extraState.params != undefined) {
                    nbArgs = extraState.params.length
                }
                const args = []
                for (let i = 0; i < nbArgs; i++) {
                    const argName = `ARG${i}`
                    const val = await evalCode(block.inputs[argName])
                    args.push(val)
                    const varId = getVarId(extraState.params[i])
                    variablesValue[varId] = val
                }
                console.log({ functionName, args })

                const { inputs } = procedureBlock[functionName]

                if (inputs != undefined) {
                    if (inputs.STACK != undefined) {
                        await evalCode(inputs.STACK)
                    }

                    if (inputs.RETURN != undefined) {
                        return await evalCode(inputs.RETURN)
                    }
                }


            },
            'procedures_callreturn': async function (block) {
                return this.procedures_callnoreturn(block)
            },
            'controls_flow_statements': async function (block) {
                const flow = block.fields.FLOW
                console.log({ flow })
                breakState = flow
            }
        }

        function textToTitleCase(str) {
            return str.replace(/\S+/g,
                function (txt) { return txt[0].toUpperCase() + txt.substring(1).toLowerCase(); })
        }

        function getVarValue(varId) {
            return variablesValue[varId]
        }

        function getVarId(name) {
            return variablesDef.find((e) => e.name == name).id
        }

        function getVarName(varId) {
            return variablesDef.find((e) => e.id == varId).name
        }

        function dumpVariables() {
            console.log('dumpVariables:')
            if (variablesDef != undefined) {
                for (const { id, name } of variablesDef) {
                    const value = variablesValue[id]
                    console.log(`${name}=${value}`)
                }
            }
        }


        async function evalCode(block) {
            if (block == undefined) {
                return
            }
            if (block.type == undefined) {
                if (block.block != undefined) {
                    block = block.block
                }
                else if (block.shadow != undefined) {
                    block = block.shadow
                }
                else {
                    throw `Missig parameter block or shadow`
                }

            }
            console.log('evalCode', block.type)
            const fn = blockTypeMap[block.type]
            if (typeof fn != 'function') {
                console.log('block', block)
                throw `function '${block.type}' not implemented yet`
            }
            const ret = await fn.call(blockTypeMap, block)
            if (ret == undefined && breakState == '') {
                await evalCode(block.next)
            }
            return ret
        }

        function getFunctionNames({ blocks }) {
            const ret = []
            for (let block of blocks.blocks) {
                if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                    const procedureName = block.fields.NAME
                    ret.push(procedureName)
                }
            }
            return ret
        }

        async function callFunction(functionName, ...functionArgs) {
            console.log('caal')
            const block = procedureBlock[functionName]
            if (block == undefined) {
                throw `function '${functionName}' does not exists !`
            }

            const { extraState, inputs } = block
            let nbArgs = 0
            if (extraState.params != undefined) {
                nbArgs = extraState.params.length
            }
            for (let i = 0; i < nbArgs; i++) {
                const varId = extraState.params[i].id
                variablesValue[varId] = functionArgs[i]
            }

            if (inputs != undefined) {
                if (inputs.STACK != undefined) {
                    await evalCode(inputs.STACK)
                }

            }
        }

        async function startCode({ blocks, variables} ) {
            console.log('startCode')

            variablesValue = {}
            procedureBlock = {}
            variablesDef = variables
            const codeBlocks = blocks.blocks
            breakState = ''
            for (let block of codeBlocks) {
                if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                    const procedureName = block.fields.NAME
                    procedureBlock[procedureName] = block
                }
            }
            console.log('procedures:')
            for (const procedureName of Object.keys(procedureBlock)) {
                console.log(procedureName)
            }

            for (let block of codeBlocks) {
                if (block.type != 'procedures_defnoreturn' && block.type != 'procedures_defreturn') {
                    await evalCode(block)
                }
            }
            dumpVariables()
        }

        function setLlogFunction(fn) {
            logFunction = fn
        }

        function addBlockType(typeName, fn) {
            blockTypeMap[typeName] = fn
        }

        return {
            startCode,
            setLlogFunction,
            evalCode,
            dumpVariables,
            addBlockType,
            getVarValue,
            getVarName
        }
    }
});



//@ts-check
$$.service.registerService('breizbot.broker', {

	init: function (config) {

		const events = new EventEmitter2()

		let sock = null
		let isConnected = false
		let tryReconnect = true
		let isPingOk = true
		const topics = new EventEmitter2({ wildcard: true })
		const pingInterval = 10 * 1000
		let timeoutId = null
		const registeredTopics = {}

		let { host, pathname, protocol } = location
		protocol = (protocol == 'http:') ? 'ws:' : 'wss:'


		const url = `${protocol}//${host}/hmi${pathname}`

		function onClose() {
			//console.log('onClose')
			if (isConnected) {
				console.log('[Broker] Disconnected !')
				events.emit('connected', false)
			}
			isConnected = false
			if (tryReconnect) {
				setTimeout(() => { connect() }, 5000)
			}
		}

		function checkPing() {
			timeoutId = setTimeout(() => {

				if (!isPingOk) {
					console.log('timeout ping')
					sock.onmessage = null
					sock.onclose = null
					sock.close()
					onClose()
				}
				else {
					isPingOk = false
					sendMsg({ type: 'ping' })
					checkPing()
				}
			}, pingInterval)
		}

		function connect() {

			console.log('try to connect...')

			sock = new WebSocket(url)

			sock.onopen = () => {
				console.log("Connected to broker")
				isConnected = true
				isPingOk = true
				events.emit('connected', true)
				checkPing()

			}


			sock.onmessage = (ev) => {
				const msg = JSON.parse(ev.data)

				if (ev.currentTarget != sock) {
					console.log('[broker] message bad target', msg.type)
					ev.currentTarget.close()
					return
				}
				//console.log('[Broker] message', msg)

				if (msg.type == 'ready') {
					Object.keys(registeredTopics).forEach((topic) => {
						sendMsg({ type: 'register', topic })
					})

					events.emit('ready', { clientId: msg.clientId })
				}

				if (msg.type == 'pong') {
					isPingOk = true
				}

				if (msg.type == 'notif') {
					topics.emit(msg.topic, msg)
				}

				if (msg.type == 'error') {
					console.log('[Broker] log', msg.text)
					tryReconnect = false
					sock.close()
				}

			}

			sock.onclose = (ev) => {
				if (ev.currentTarget != sock) {
					console.log('[broker] close bad target')
					return
				}
				console.log('[broker] close')
				if (timeoutId != null) {
					clearTimeout(timeoutId)
					timeoutId = null
				}
				onClose()
			}

		}

		function sendMsg(msg) {
			msg.time = Date.now()
			const text = JSON.stringify(msg)
			if (isConnected) {
				//console.log('[Broker] sendMsg', msg)
				sock.send(text)
			}
		}

		function emitTopic(topic, data) {
			//console.log('[Broker] emitTopic', topic, data)
			const msg = {
				type: 'notif',
				topic,
				data
			}

			sendMsg(msg)
		}

		function onTopic(topic, callback) {
			topics.on(topic, callback)
		}

		function offTopic(topic, callback) {
			topics.off(topic, callback)
		}

		function register(topic, callback) {
			//console.log('[Broker] register', topic)
			if (registeredTopics[topic] == undefined) {
				registeredTopics[topic] = 1
			}
			else {
				registeredTopics[topic]++;
			}
			topics.on(topic, callback)
			sendMsg({ type: 'register', topic })
		}

		function unregister(topic, callback) {

			topics.off(topic, callback)

			if (--registeredTopics[topic] == 0) {
				delete registeredTopics[topic]
				sendMsg({ type: 'unregister', topic })
			}
		}

		connect()

		return {
			emitTopic,
			onTopic,
			offTopic,
			register,
			unregister,
			on: events.on.bind(events)

		}
	}


});





//@ts-check
$$.service.registerService('breizbot.cities', {

	deps: ['brainjs.resource', 'brainjs.http'],

	init: function(config, resource, httpSrv) {

		const http = resource('/api/cities')

		return {
			getCountries: function() {
				return http.get('/countries')
			},

			getCities: function(country, search) {
				return http.post('/cities', {country, search})
			},

			getCitesFromPostalCode: async function(postalCode) {
				const url = 'https://apicarto.ign.fr/api/codes-postaux/communes/' + postalCode
				try {
					const info = await httpSrv.get(url)
					//console.log('info', info)
					return info.map((i) => i.libelleAcheminement)	
				}
				catch(e) {
					return []
				}
	
			}


			
		}
	}
});

//@ts-check
$$.service.registerService('breizbot.contacts', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/contacts')

		return {

			addContact: function (info) {
				return http.post(`/addContact`, info)
			},
			getContacts: function () {
				return http.get(`/getContacts`)
			},

			removeContact: function (contactId) {
				return http.delete(`/removeContact/${contactId}`)
			},

			updateContactInfo: function (contactId, info) {
				return http.post(`/updateContactInfo/${contactId}`, info)
			}
			

		}
	}
});

//@ts-check
$$.service.registerService('breizbot.display', {

    deps: ['breizbot.params'],

    init: function (config, params) {

        console.log('params', params)
        const events = new EventEmitter2()

        const presentationRequest = new PresentationRequest($$.url.getUrlParams('/apps/cast', { id: params.$id }))
        let presentationConnection = null

        presentationRequest.addEventListener('connectionavailable', function (event) {
            console.log('connectionavailable', event)
            presentationConnection = event.connection

            presentationConnection.addEventListener('message', function (event) {
                //console.log('message', event.data)
                const msg = JSON.parse(event.data)
                switch(msg.type) {
                    case 'ready':
                        events.emit('ready')
                        break
                    case 'event':
                        events.emit(msg.name, msg.value)
                }
            })

            presentationConnection.addEventListener('terminate', function() {
                events.emit('close')
            })

            events.emit('connectionavailable')
        })

        async function getAvailability() {
            const availability = await presentationRequest.getAvailability()

            console.log('Available presentation displays: ' + availability.value)

            availability.addEventListener('change', function () {
                console.log('> Available presentation displays: ' + availability.value)
                events.emit('availability', availability.value)
            })
        }

        async function start() {
            const connection = await presentationRequest.start()
        }

        function close() {
            presentationConnection.terminate()
            presentationConnection = null
        }

        function sendMsg(msg) {
            //console.log('sendMsg', msg)
            presentationConnection.send(JSON.stringify(msg))
        }

        function setUrl(url) {
            sendMsg({ type: 'url', url })
        }

        function setVolume(volume) {
            sendMsg({ type: 'volume', volume })
        }

        function setCurrentTime(currentTime) {
            sendMsg({ type: 'currentTime', currentTime })
        }

        function play() {
            sendMsg({type: 'play'})
        }

        function pause() {
            sendMsg({type: 'pause'})
        }

        function isStarted() {
            return (presentationConnection != null)
        }

        function enableKaraoke(enabled) {
            sendMsg({type: 'enableKaraoke', enabled})
        }

        getAvailability()

        return {
            on: events.on.bind(events),
            start,
            close,
            isStarted,
            setUrl,
            setVolume,
            setCurrentTime,
            play,
            pause,
            enableKaraoke
        }
    }
});

//@ts-check
$$.service.registerService('breizbot.files', {

	deps: ['brainjs.resource', 'breizbot.params'],

	init: function (config, resource, params) {
		/**@type {Brainjs.Services.Http.Interface} */
		const http = resource('/api/files')

		const savingDlg = $$.ui.progressDialog()


		return {
			fileInfo: function (filePath, friendUser, options) {
				//console.log('[FileService] fileInfo', filePath, friendUser, options)

				return http.post('/fileInfo', { filePath, friendUser, options })
			},
			list: function (destPath, options, friendUser) {
				//console.log('[FileService] list', destPath)

				return http.post('/list', { destPath, options, friendUser })
			},

			move: function(fileName, destPath) {
				return http.post('/move', { destPath, fileName})
			},

			fileUrl: function (fileName, friendUser) {
				return $$.url.getUrlParams('/api/files/load', { fileName, friendUser })
			},

			fileAppUrl: function(fileName) {
				fileName = `/apps/${params.$appName}/${fileName}`
				return $$.url.getUrlParams('/api/files/load', { fileName })
			},

			fileThumbnailUrl: function (fileName, size, friendUser) {
				return $$.url.getUrlParams('/api/files/loadThumbnail', { fileName, size, friendUser })
			},

			fileAppThumbnailUrl: function (fileName, size) {
				fileName = `/apps/${params.$appName}/${fileName}`
				return $$.url.getUrlParams('/api/files/loadThumbnail', { fileName, size })
			},

			assetsUrl: function(fileName)  {
				return  `/webapps/${params.$appName}/assets/${fileName}`
			},

			/**
			 * 
			 * @param {Blob} blob 
			 * @param {string} saveAsfileName 
			 * @param {string} destPath 
			 * @param {boolean} checkExists
			 * @param {*} onUploadProgress 
			 * @returns 
			 */
			uploadFile: async function (blob, saveAsfileName, destPath, checkExists, onUploadProgress) {
				//console.log('[FileService] uploadFile', checkExists, saveAsfileName, destPath)
				if (!(blob instanceof Blob)) {
					console.warn('File format not supported')
					return Promise.reject('File format not supported')
				}
				if (checkExists) {
					try {
						await this.fileInfo(destPath + '/' + saveAsfileName)
						return Promise.reject('File already exists')
					}
					catch(e) {
					}
				}
				const fd = new FormData()
				fd.append('file', blob, saveAsfileName)
				fd.append('destPath', destPath)
				return http.postFormData('/save', fd, onUploadProgress)

				//console.log('blob', blob)

			},

			saveFile: async function (blob, saveAsfileName, options) {
				options = options || {}
				const destPath  = options.destPath || `/apps/${params.$appName}`
				try {
					savingDlg.setPercentage(0)
					savingDlg.show()
					const resp = await this.uploadFile(blob, saveAsfileName, destPath, options.checkExists, (value) => {
						savingDlg.setPercentage(value)
					})
					await $$.util.wait(1000)
					savingDlg.hide()
					return true
				}
				catch (e) {
					console.log('error', e)
					savingDlg.hide()
					$$.ui.showAlert({
						title: 'Error',
						content: e.responseText || e
					})
					return false
				}

			}

		}
	}

});

//@ts-check
$$.service.registerService('breizbot.friends', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/friends')

		return {

			getFriends: function () {
				return http.get(`/getFriends`)
			},

			getFriendInfo: function (friend) {
				return http.post('/getFriendInfo', { friend })
			},

			setFriendInfo: function (friend, groups, positionAuth) {
				return http.post('/setFriendInfo', { friend, groups, positionAuth })
			},

			addFriend: function (friendUserName) {
				return http.post(`/addFriend`, { friendUserName })
			}


		}
	}
});

//@ts-check
$$.service.registerService('breizbot.fullscreen', {

    init: function (config) {


        function init(callback) {
            document.addEventListener("webkitfullscreenchange", e => {
                //console.log('webkitfullscreenchange')                
                callback(document.fullscreenElement != null)
            })

            document.addEventListener("fullscreenchange", e => {
                //console.log('fullscreenchange')
                callback(document.fullscreenElement != null)
            })

            document.addEventListener("keydown", e => {
                //console.log('keydown', e.key)
                if (e.key == "F11") {
                    e.preventDefault()
                } 
            })
        }

        function enter() {
            const elem = document.documentElement
            const requestFullscreen = elem.requestFullscreen ||
                elem.webkitRequestFullscreen

            if (requestFullscreen) {
                requestFullscreen.call(elem)
            }

        }

        function exit() {
            document.exitFullscreen()
        }



        return {
            init,
            enter,
            exit
        }
    }
});

//@ts-check
(function () {

    class MyGamepad extends EventEmitter2 {
        constructor() {
            super()

            this.buttons = []
            this.axes = []

            window.addEventListener('gamepadconnected', (ev) => {
                //console.log('gamepadconnected', ev)
                for (const { pressed } of ev.gamepad.buttons) {
                    this.buttons.push(pressed)
                }

                for (const val of ev.gamepad.axes) {
                    this.axes.push(val)
                }
                //console.log('buttons', buttons)
                this.emit('connected', ev.gamepad)
            })

            window.addEventListener('gamepaddisconnected', (ev) => {
                //console.log('gamepaddisconnected', ev)
                this.buttons = []
                this.axes = []

                this.emit('disconnected', ev.gamepad)
            })
        }

        checkGamePadStatus() {
            const info = navigator.getGamepads()[0]
            if (info) {
                for (let i = 0; i < this.buttons.length; i++) {
                    const { pressed } = info.buttons[i]
                    if (pressed != this.buttons[i]) {
                        this.emit(pressed ? 'buttonDown' : 'buttonUp', { id: i })
                        this.buttons[i] = pressed
                    }
                }
                for (let i = 0; i < this.axes.length; i++) {
                    const value = info.axes[i]
                    if (value != this.axes[i]) {
                        this.emit('axe', { id: i, value })
                        this.axes[i] = value
                    }
                }
                setTimeout(this.checkGamePadStatus.bind(this), 50)
            }
        }

        getButtonState(buttonId) {
            return navigator.getGamepads()[0].buttons[buttonId].pressed
        }

        getAxeValue(axeId) {
            return navigator.getGamepads()[0].axes[axeId]
        }

        getGamepads() {
            return navigator.getGamepads()
        }
    }


    $$.service.registerService('breizbot.gamepad', {

        init: function (config) {

            return new MyGamepad()
        }
    });

})();



//@ts-check
$$.service.registerService('breizbot.geoloc', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/position')


		let coords = null

		function geoError(e) {
			console.log('geoloc error:', e)
		}

		function updateLocation(position) {
			//console.log('updateLocation', position)
			coords = position.coords
		}


		function startWatch() {

			navigator.geolocation.getCurrentPosition(updateLocation)

			navigator.geolocation.watchPosition(updateLocation, geoError,
				{
					enableHighAccuracy: true
				}
			)	

			setInterval(sendPosition, 30 * 1000) // every 30 sec
		}


		function sendPosition() {
			//console.log('sendPosition', coords)
			if (coords != null) {
				http.post('/position', {
					lat: coords.latitude,
					lng: coords.longitude
				})

			}
		}		

		return {

			startWatch
		}
	}
});

//@ts-check
$$.service.registerService('breizbot.http', {

	deps: ['brainjs.resource', 'breizbot.params'],

	init: function(config, resource, params) {

		return resource(`/api/app/${params.$appName}`)
	}

});

//@ts-check
$$.service.registerService('breizbot.notifs', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/notifs')

		return {
			sendNotif: function (to, notif) {
				return http.post(`/sendNotif`, { to, notif })
			},

			removeNotif: function (notifId) {
				return http.delete(`/removeNotif/${notifId}`)
			},

			getNotifs: function () {
				return http.get(`/getNotifs`)
			},

			getNotifCount: function () {
				return http.get(`/getNotifCount`)
			}

		}
	}
});

//@ts-check
$$.service.registerService('breizbot.pager', {

	init: function(config) {

		return $('.breizbotPager').iface()
	}

});

//@ts-check
$$.service.registerService('breizbot.params', {

	init: function(config) {

		return (typeof config == 'string') ? JSON.parse(config) : {}
	}
});

//@ts-check

$$.service.registerService('breizbot.playlists', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/playlists')

		return {

			getPlaylist: function () {
				return http.post(`/getPlaylist`)
			},

			getPlaylistSongs: function (name) {
				return http.post(`/getPlaylistSongs`, {name})
			}
			
		}
	}
});

//@ts-check
$$.service.registerService('breizbot.radar', {

	deps: ['brainjs.resource', 'brainjs.http'],

	init: function(config, resource) {

		const http = resource('/api/radar')

		return {
			getRadar: function() {
				return http.get('/')
			}
			
		}
	}
});

//@ts-check

$$.service.registerService('breizbot.rtc', {

	deps: ['brainjs.http', 'breizbot.broker', 'breizbot.params'],

	init: function (config, http, broker, params) {

		const events = new EventEmitter2()

		const private = {
			srcId: null,
			destId: null,
			distant: '',
			status: 'ready',
			isCallee: false
		}


		if (params.caller != undefined) {
			private.status = 'connected'
			private.distant = params.caller
			private.destId = params.clientId
			private.isCallee = true
		}

		broker.on('ready', (msg) => {
			private.srcId = msg.clientId
			//console.log('srcId', msg.clientId)
			events.emit('ready')
		})

		broker.onTopic('breizbot.rtc.accept', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			cancel(false)
			private.destId = msg.srcId
			private.status = 'connected'
			emitStatus()
			events.emit('accept')
		})

		broker.onTopic('breizbot.rtc.deny', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			private.status = 'refused'
			cancel(false)
			emitStatus()
			events.emit('deny')

		})

		broker.onTopic('breizbot.rtc.bye', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			private.status = 'disconnected'
			emitStatus()
			events.emit('bye')

		})


		function getRemoteClientId() {
			return private.destId
		}

		function processCall() {
			console.log('[RTC] processCall')
			broker.register('breizbot.rtc.call', (msg) => {
				if (msg.hist === true) {
					return
				}
				console.log('msg', msg)
				private.destId = msg.srcId
				events.emit('call', msg.data)
			})

			broker.register('breizbot.rtc.cancel', (msg) => {
				if (msg.hist === true) {
					return
				}
				console.log('msg', msg)
				events.emit('cancel')
			})
		}

		function onData(name, callback) {
			broker.onTopic('breizbot.rtc.' + name, (msg) => {
				if (msg.hist === true) {
					return
				}
				callback(msg.data, msg.time)
			})
		}

		function emitStatus() {
			events.emit('status', { status: private.status, distant: private.distant })
		}

		function call(to, appName, iconCls) {
			private.distant = to
			private.status = 'calling'
			emitStatus()
			return http.post(`/api/rtc/sendToUser`, {
				to,
				srcId: private.srcId,
				type: 'call',
				data: { appName, iconCls }
			})
		}

		function cancel(updateStatus = true) {
			console.log('[RTC] cancel', updateStatus)
			if (updateStatus) {
				private.status = 'canceled'
				emitStatus()
			}
			return http.post(`/api/rtc/sendToUser`, { to: private.distant, srcId: private.srcId, type: 'cancel' })
		}

		function accept() {
			console.log('[RTC] accept')

			emitStatus()
			return sendData('accept')
		}

		function deny() {
			console.log('[RTC] deny')

			return sendData('deny')
		}

		function bye() {
			console.log('[RTC] bye')

			if (private.status == 'connected') {
				private.status = 'ready'
				private.distant = ''
				emitStatus()
				return sendData('bye')
			}

			return Promise.resolve()
		}

		function exit() {
			if (private.status == 'calling') {
				return cancel()
			}
			if (private.status == 'connected') {
				return bye()
			}
			return Promise.resolve()
		}

		function sendData(type, data) {
			return http.post(`/api/rtc/sendToClient`, {
				destId: private.destId,
				srcId: private.srcId,
				type,
				data
			})
		}

		function isCallee() {
			return private.isCallee
		}

		return {
			call,
			cancel,
			deny,
			bye,
			sendData,
			onData,
			on: events.on.bind(events),
			processCall,
			getRemoteClientId,
			exit,
			accept,
			isCallee

		}
	}
});


//@ts-check
$$.service.registerService('breizbot.scheduler', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			openApp: function(appName, appParams, newTabTitle) {
				//console.log('[scheduler] openApp', appName, appParams, newTab)
				window.parent.postMessage({
					type: 'openApp',
					 data: {appName, appParams, newTabTitle}
					}, location.href)

			},
			logout: function() {
				console.log('[scheduler] logout')
				return http.post('/api/logout')
			}		 
		}
	}
});

//@ts-check
$$.service.registerService('breizbot.songs', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/songs')

		return {
			generateDb: function () {
				return http.post('/generateDb')
			},

			querySongs: function (query) {
				return http.post('/querySongs', { query })
			}

		}
	}
});

//@ts-check
$$.service.registerService('breizbot.spotify', {

    init: function (config) {

        const baseUri = 'https://api.spotify.com/v1'
        const baseTokenUri = 'https://spotify-web-api-token.herokuapp.com'
        let token = null

        async function performRequest(url, params) {
            //console.log('performRequest', url, params)
            let ret = null
            const request = {
                method: 'GET'
            }
            if (token == null) {
                const rep = await fetch(baseTokenUri + '/token')
                if (!rep.ok) {
                    throw 'spotify fetch token error'
                }

                const json = await rep.json()
                //console.log('json', json)
                token = json.token
                console.log('token', token)

            }
            const headers = new Headers()
            headers.append('Authorization', 'Bearer ' + token)
            request.headers = headers

            const rep = await fetch($$.url.getUrlParams(url, params), request)
            if (rep.ok) {
                ret = await rep.json()
            }
            return ret
        }


        async function searchTracks(query) {
            console.log('searchTracks', query)
            const params = {
                q: query,
                type: 'track',
                limit: 1
            }
            const results = await performRequest(baseUri + '/search/', params)
            console.log('results', results)
            const track = results.tracks.items[0]
            return track
        }

        function getAudioFeaturesForTrack(trackId) {
            return performRequest(baseUri + '/audio-features/' + trackId)
        }

        return {
            searchTracks,
            getAudioFeaturesForTrack
        }
    }
});

//@ts-check
$$.service.registerService('breizbot.users', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/users')

		return {
			list: function () {
				return http.get('/')
			},

			match: function (match) {
				return http.get('/', { match })
			},

			add: function (data) {
				return http.post('/', data)
			},

			remove: function (user) {
				return http.delete(`/${user}`)
			},

			update: function (user, data) {
				return http.put(`/${user}`, data)
			},

			get: function (user) {
				return http.get(`/${user}`)
			},

			activateApp: function (appName, activated) {
				return http.post(`/activateApp`, { appName, activated })
			},

			changePwd: function (newPwd) {
				return http.post(`/changePwd`, { newPwd })
			},

			getUserSettings: function () {
				return http.post(`/getUserSettings`)
			},

			setUserSettings: function (settings) {
				return http.post(`/setUserSettings`, settings)
			}

		}
	}
});

//@ts-check
$$.service.registerService('breizbot.wakelock', {

    init: function (config) {

        async function requestWakeLock() {
            if (navigator.wakeLock) {

                try {
                    const lock = await navigator.wakeLock.request('screen')
                    //console.log('take wakeLock')
                    lock.addEventListener('release', () => {
                        //console.log('Wake Lock was released')
                    })

                }
                catch (e) {
                    console.error('WakeLock', e)
                }

            }
        }

        function onVisibilityChange() {
            //console.log('visibilitychange', document.visibilityState)
            if (document.visibilityState === 'visible') {
                requestWakeLock()
            }
        }

        document.addEventListener('visibilitychange', onVisibilityChange)

        return {
            requestWakeLock
        }
    }
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJub3RpZnkubWluLmpzIiwicHJpc20uanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9hZGRDb250YWN0LmpzIiwiY29udGFjdHMvY29udGFjdHMuanMiLCJlZGl0b3IvZWRpdG9yLmpzIiwiZmlsZWNob29zZXIvZmlsdGVyLmpzIiwiZmlsZWNob29zZXIvbWFpbi5qcyIsImZpbGVsaXN0L2ZpbGVsaXN0LmpzIiwiZmlsZXMvZmlsZXMuanMiLCJmb2xkZXJ0cmVlL3RyZWUuanMiLCJmcmllbmRzL2ZyaWVuZHMuanMiLCJob21lL2hvbWUuanMiLCJwYWdlci9wYWdlci5qcyIsInBkZi9tYWluLmpzIiwicnRjL3J0Yy5qcyIsInNlYXJjaGJhci9zZWFyY2hiYXIuanMiLCJ1c2Vycy9hZGRVc2VyLmpzIiwidXNlcnMvdXNlcnMuanMiLCJ2aWV3ZXIvdmlld2VyLmpzIiwiYXBwRGF0YS5qcyIsImFwcHMuanMiLCJiZWF0ZGV0ZWN0b3IuanMiLCJibG9ja2x5aW50ZXJwcmV0b3IuanMiLCJicm9rZXIuanMiLCJjaXRpZXMuanMiLCJjb250YWN0cy5qcyIsImRpc3BsYXkuanMiLCJmaWxlcy5qcyIsImZyaWVuZHMuanMiLCJmdWxsc2NyZWVuLmpzIiwiZ2FtZXBhZC5qcyIsImdlb2xvYy5qcyIsImh0dHAuanMiLCJub3RpZnMuanMiLCJwYWdlci5qcyIsInBhcmFtcy5qcyIsInBsYXlsaXN0cy5qcyIsInJhZGFyLmpzIiwicnRjLmpzIiwic2NoZWR1bGVyLmpzIiwic29uZ3MuanMiLCJzcG90aWZ5LmpzIiwidXNlcnMuanMiLCJ3YWtlbG9jay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcmdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJyZWl6Ym90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xuXG4gICAgICBjb25mLmRlbGltaXRlciAmJiAodGhpcy5kZWxpbWl0ZXIgPSBjb25mLmRlbGltaXRlcik7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyAhPT0gdW5kZWZpbmVkID8gY29uZi5tYXhMaXN0ZW5lcnMgOiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG4gICAgICBjb25mLnZlcmJvc2VNZW1vcnlMZWFrICYmICh0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gY29uZi52ZXJib3NlTWVtb3J5TGVhayk7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbG9nUG9zc2libGVNZW1vcnlMZWFrKGNvdW50LCBldmVudE5hbWUpIHtcbiAgICB2YXIgZXJyb3JNc2cgPSAnKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICdsZWFrIGRldGVjdGVkLiAnICsgY291bnQgKyAnIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nO1xuXG4gICAgaWYodGhpcy52ZXJib3NlTWVtb3J5TGVhayl7XG4gICAgICBlcnJvck1zZyArPSAnIEV2ZW50IG5hbWU6ICcgKyBldmVudE5hbWUgKyAnLic7XG4gICAgfVxuXG4gICAgaWYodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW1pdFdhcm5pbmcpe1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgICAgZS5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICBlLmVtaXR0ZXIgPSB0aGlzO1xuICAgICAgZS5jb3VudCA9IGNvdW50O1xuICAgICAgcHJvY2Vzcy5lbWl0V2FybmluZyhlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvck1zZyk7XG5cbiAgICAgIGlmIChjb25zb2xlLnRyYWNlKXtcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBmYWxzZTtcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcbiAgfVxuICBFdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjsgLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgZm9yIGV4cG9ydGluZyBFdmVudEVtaXR0ZXIgcHJvcGVydHlcblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcbiAgICAgICAgdHJlZVtuYW1lXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtuYW1lXTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVyc107XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIXRyZWUuX2xpc3RlbmVycy53YXJuZWQgJiZcbiAgICAgICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCwgbmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gICAgICBpZiAoIXRoaXMuX2NvbmYpIHRoaXMuX2NvbmYgPSB7fTtcbiAgICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgICB9XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uY2UoZXZlbnQsIGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuLCBwcmVwZW5kKSB7XG4gICAgdGhpcy5fbWFueShldmVudCwgMSwgZm4sIHByZXBlbmQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIGZhbHNlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCB0cnVlKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbiwgcHJlcGVuZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMuX29uKGV2ZW50LCBsaXN0ZW5lciwgcHJlcGVuZCk7XG5cbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2FsbC5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG5cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIC8vIG5lZWQgdG8gbWFrZSBjb3B5IG9mIGhhbmRsZXJzIGJlY2F1c2UgbGlzdCBjYW4gY2hhbmdlIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gb2YgZW1pdCBjYWxsXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0QXN5bmMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoW2ZhbHNlXSk7IH1cbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZXM9IFtdO1xuXG4gICAgdmFyIGFsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyxsLGksajtcbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmICh0aGlzLl9hbGwpIHtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGFyZ3VtZW50c1sxXSk7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25BbnkgPSBmdW5jdGlvbihmbiwgcHJlcGVuZCl7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgaWYocHJlcGVuZCl7XG4gICAgICB0aGlzLl9hbGwudW5zaGlmdChmbik7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9vbkFueSh0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGdyb3dMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBDaGFuZ2UgdG8gYXJyYXkuXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhZGRcbiAgICAgIGlmKHByZXBlbmQpe1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0udW5zaGlmdChsaXN0ZW5lcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCAmJlxuICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiB0aGlzLl9tYXhMaXN0ZW5lcnNcbiAgICAgICkge1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCwgdHlwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyxsZWFmcz1bXTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgIGhhbmRsZXJzID0gbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgKGhhbmRsZXJzLmxpc3RlbmVyICYmIGhhbmRsZXJzLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290KSB7XG4gICAgICBpZiAocm9vdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocm9vdCk7XG4gICAgICBmb3IgKHZhciBpIGluIGtleXMpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBvYmogPSByb290W2tleV07XG4gICAgICAgIGlmICgob2JqIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKSB8fCAob2JqID09PSBudWxsKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgcm9vdFtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3QodGhpcy5saXN0ZW5lclRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKVxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbnNbaV0pO1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgIXRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9ldmVudHMpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiB0aGlzLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuX2FsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCIoZnVuY3Rpb24oZSl7dHlwZW9mIGRlZmluZT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kP2RlZmluZShbXCJqcXVlcnlcIl0sZSk6dHlwZW9mIG1vZHVsZT09XCJvYmplY3RcIiYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24odCxuKXtyZXR1cm4gbj09PXVuZGVmaW5lZCYmKHR5cGVvZiB3aW5kb3chPVwidW5kZWZpbmVkXCI/bj1yZXF1aXJlKFwianF1ZXJ5XCIpOm49cmVxdWlyZShcImpxdWVyeVwiKSh0KSksZShuKSxufTplKGpRdWVyeSl9KShmdW5jdGlvbihlKXtmdW5jdGlvbiBBKHQsbixpKXt0eXBlb2YgaT09XCJzdHJpbmdcIiYmKGk9e2NsYXNzTmFtZTppfSksdGhpcy5vcHRpb25zPUUodyxlLmlzUGxhaW5PYmplY3QoaSk/aTp7fSksdGhpcy5sb2FkSFRNTCgpLHRoaXMud3JhcHBlcj1lKGguaHRtbCksdGhpcy5vcHRpb25zLmNsaWNrVG9IaWRlJiZ0aGlzLndyYXBwZXIuYWRkQ2xhc3MocitcIi1oaWRhYmxlXCIpLHRoaXMud3JhcHBlci5kYXRhKHIsdGhpcyksdGhpcy5hcnJvdz10aGlzLndyYXBwZXIuZmluZChcIi5cIityK1wiLWFycm93XCIpLHRoaXMuY29udGFpbmVyPXRoaXMud3JhcHBlci5maW5kKFwiLlwiK3IrXCItY29udGFpbmVyXCIpLHRoaXMuY29udGFpbmVyLmFwcGVuZCh0aGlzLnVzZXJDb250YWluZXIpLHQmJnQubGVuZ3RoJiYodGhpcy5lbGVtZW50VHlwZT10LmF0dHIoXCJ0eXBlXCIpLHRoaXMub3JpZ2luYWxFbGVtZW50PXQsdGhpcy5lbGVtPU4odCksdGhpcy5lbGVtLmRhdGEocix0aGlzKSx0aGlzLmVsZW0uYmVmb3JlKHRoaXMud3JhcHBlcikpLHRoaXMuY29udGFpbmVyLmhpZGUoKSx0aGlzLnJ1bihuKX12YXIgdD1bXS5pbmRleE9mfHxmdW5jdGlvbihlKXtmb3IodmFyIHQ9MCxuPXRoaXMubGVuZ3RoO3Q8bjt0KyspaWYodCBpbiB0aGlzJiZ0aGlzW3RdPT09ZSlyZXR1cm4gdDtyZXR1cm4tMX0sbj1cIm5vdGlmeVwiLHI9bitcImpzXCIsaT1uK1wiIWJsYW5rXCIscz17dDpcInRvcFwiLG06XCJtaWRkbGVcIixiOlwiYm90dG9tXCIsbDpcImxlZnRcIixjOlwiY2VudGVyXCIscjpcInJpZ2h0XCJ9LG89W1wibFwiLFwiY1wiLFwiclwiXSx1PVtcInRcIixcIm1cIixcImJcIl0sYT1bXCJ0XCIsXCJiXCIsXCJsXCIsXCJyXCJdLGY9e3Q6XCJiXCIsbTpudWxsLGI6XCJ0XCIsbDpcInJcIixjOm51bGwscjpcImxcIn0sbD1mdW5jdGlvbih0KXt2YXIgbjtyZXR1cm4gbj1bXSxlLmVhY2godC5zcGxpdCgvXFxXKy8pLGZ1bmN0aW9uKGUsdCl7dmFyIHI7cj10LnRvTG93ZXJDYXNlKCkuY2hhckF0KDApO2lmKHNbcl0pcmV0dXJuIG4ucHVzaChyKX0pLG59LGM9e30saD17bmFtZTpcImNvcmVcIixodG1sOic8ZGl2IGNsYXNzPVwiJytyKyctd3JhcHBlclwiPlxcblx0PGRpdiBjbGFzcz1cIicrcisnLWFycm93XCI+PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVwiJytyKyctY29udGFpbmVyXCI+PC9kaXY+XFxuPC9kaXY+Jyxjc3M6XCIuXCIrcitcIi1jb3JuZXIge1xcblx0cG9zaXRpb246IGZpeGVkO1xcblx0bWFyZ2luOiA1cHg7XFxuXHR6LWluZGV4OiAxMDUwO1xcbn1cXG5cXG4uXCIrcitcIi1jb3JuZXIgLlwiK3IrXCItd3JhcHBlcixcXG4uXCIrcitcIi1jb3JuZXIgLlwiK3IrXCItY29udGFpbmVyIHtcXG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcXG5cdGRpc3BsYXk6IGJsb2NrO1xcblx0aGVpZ2h0OiBpbmhlcml0O1xcblx0d2lkdGg6IGluaGVyaXQ7XFxuXHRtYXJnaW46IDNweDtcXG59XFxuXFxuLlwiK3IrXCItd3JhcHBlciB7XFxuXHR6LWluZGV4OiAxO1xcblx0cG9zaXRpb246IGFic29sdXRlO1xcblx0ZGlzcGxheTogaW5saW5lLWJsb2NrO1xcblx0aGVpZ2h0OiAwO1xcblx0d2lkdGg6IDA7XFxufVxcblxcbi5cIityK1wiLWNvbnRhaW5lciB7XFxuXHRkaXNwbGF5OiBub25lO1xcblx0ei1pbmRleDogMTtcXG5cdHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG59XFxuXFxuLlwiK3IrXCItaGlkYWJsZSB7XFxuXHRjdXJzb3I6IHBvaW50ZXI7XFxufVxcblxcbltkYXRhLW5vdGlmeS10ZXh0XSxbZGF0YS1ub3RpZnktaHRtbF0ge1xcblx0cG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG5cXG4uXCIrcitcIi1hcnJvdyB7XFxuXHRwb3NpdGlvbjogYWJzb2x1dGU7XFxuXHR6LWluZGV4OiAyO1xcblx0d2lkdGg6IDA7XFxuXHRoZWlnaHQ6IDA7XFxufVwifSxwPXtcImJvcmRlci1yYWRpdXNcIjpbXCItd2Via2l0LVwiLFwiLW1vei1cIl19LGQ9ZnVuY3Rpb24oZSl7cmV0dXJuIGNbZV19LHY9ZnVuY3Rpb24oZSl7aWYoIWUpdGhyb3dcIk1pc3NpbmcgU3R5bGUgbmFtZVwiO2NbZV0mJmRlbGV0ZSBjW2VdfSxtPWZ1bmN0aW9uKHQsaSl7aWYoIXQpdGhyb3dcIk1pc3NpbmcgU3R5bGUgbmFtZVwiO2lmKCFpKXRocm93XCJNaXNzaW5nIFN0eWxlIGRlZmluaXRpb25cIjtpZighaS5odG1sKXRocm93XCJNaXNzaW5nIFN0eWxlIEhUTUxcIjt2YXIgcz1jW3RdO3MmJnMuY3NzRWxlbSYmKHdpbmRvdy5jb25zb2xlJiZjb25zb2xlLndhcm4obitcIjogb3ZlcndyaXRpbmcgc3R5bGUgJ1wiK3QrXCInXCIpLGNbdF0uY3NzRWxlbS5yZW1vdmUoKSksaS5uYW1lPXQsY1t0XT1pO3ZhciBvPVwiXCI7aS5jbGFzc2VzJiZlLmVhY2goaS5jbGFzc2VzLGZ1bmN0aW9uKHQsbil7cmV0dXJuIG8rPVwiLlwiK3IrXCItXCIraS5uYW1lK1wiLVwiK3QrXCIge1xcblwiLGUuZWFjaChuLGZ1bmN0aW9uKHQsbil7cmV0dXJuIHBbdF0mJmUuZWFjaChwW3RdLGZ1bmN0aW9uKGUscil7cmV0dXJuIG8rPVwiXHRcIityK3QrXCI6IFwiK24rXCI7XFxuXCJ9KSxvKz1cIlx0XCIrdCtcIjogXCIrbitcIjtcXG5cIn0pLG8rPVwifVxcblwifSksaS5jc3MmJihvKz1cIi8qIHN0eWxlcyBmb3IgXCIraS5uYW1lK1wiICovXFxuXCIraS5jc3MpLG8mJihpLmNzc0VsZW09ZyhvKSxpLmNzc0VsZW0uYXR0cihcImlkXCIsXCJub3RpZnktXCIraS5uYW1lKSk7dmFyIHU9e30sYT1lKGkuaHRtbCk7eShcImh0bWxcIixhLHUpLHkoXCJ0ZXh0XCIsYSx1KSxpLmZpZWxkcz11fSxnPWZ1bmN0aW9uKHQpe3ZhciBuLHIsaTtyPXgoXCJzdHlsZVwiKSxyLmF0dHIoXCJ0eXBlXCIsXCJ0ZXh0L2Nzc1wiKSxlKFwiaGVhZFwiKS5hcHBlbmQocik7dHJ5e3IuaHRtbCh0KX1jYXRjaChzKXtyWzBdLnN0eWxlU2hlZXQuY3NzVGV4dD10fXJldHVybiByfSx5PWZ1bmN0aW9uKHQsbixyKXt2YXIgcztyZXR1cm4gdCE9PVwiaHRtbFwiJiYodD1cInRleHRcIikscz1cImRhdGEtbm90aWZ5LVwiK3QsYihuLFwiW1wiK3MrXCJdXCIpLmVhY2goZnVuY3Rpb24oKXt2YXIgbjtuPWUodGhpcykuYXR0cihzKSxufHwobj1pKSxyW25dPXR9KX0sYj1mdW5jdGlvbihlLHQpe3JldHVybiBlLmlzKHQpP2U6ZS5maW5kKHQpfSx3PXtjbGlja1RvSGlkZTohMCxhdXRvSGlkZTohMCxhdXRvSGlkZURlbGF5OjVlMyxhcnJvd1Nob3c6ITAsYXJyb3dTaXplOjUsYnJlYWtOZXdMaW5lczohMCxlbGVtZW50UG9zaXRpb246XCJib3R0b21cIixnbG9iYWxQb3NpdGlvbjpcInRvcCByaWdodFwiLHN0eWxlOlwiYm9vdHN0cmFwXCIsY2xhc3NOYW1lOlwiZXJyb3JcIixzaG93QW5pbWF0aW9uOlwic2xpZGVEb3duXCIsc2hvd0R1cmF0aW9uOjQwMCxoaWRlQW5pbWF0aW9uOlwic2xpZGVVcFwiLGhpZGVEdXJhdGlvbjoyMDAsZ2FwOjV9LEU9ZnVuY3Rpb24odCxuKXt2YXIgcjtyZXR1cm4gcj1mdW5jdGlvbigpe30sci5wcm90b3R5cGU9dCxlLmV4dGVuZCghMCxuZXcgcixuKX0sUz1mdW5jdGlvbih0KXtyZXR1cm4gZS5leHRlbmQodyx0KX0seD1mdW5jdGlvbih0KXtyZXR1cm4gZShcIjxcIit0K1wiPjwvXCIrdCtcIj5cIil9LFQ9e30sTj1mdW5jdGlvbih0KXt2YXIgbjtyZXR1cm4gdC5pcyhcIlt0eXBlPXJhZGlvXVwiKSYmKG49dC5wYXJlbnRzKFwiZm9ybTpmaXJzdFwiKS5maW5kKFwiW3R5cGU9cmFkaW9dXCIpLmZpbHRlcihmdW5jdGlvbihuLHIpe3JldHVybiBlKHIpLmF0dHIoXCJuYW1lXCIpPT09dC5hdHRyKFwibmFtZVwiKX0pLHQ9bi5maXJzdCgpKSx0fSxDPWZ1bmN0aW9uKGUsdCxuKXt2YXIgcixpO2lmKHR5cGVvZiBuPT1cInN0cmluZ1wiKW49cGFyc2VJbnQobiwxMCk7ZWxzZSBpZih0eXBlb2YgbiE9XCJudW1iZXJcIilyZXR1cm47aWYoaXNOYU4obikpcmV0dXJuO3JldHVybiByPXNbZlt0LmNoYXJBdCgwKV1dLGk9dCxlW3JdIT09dW5kZWZpbmVkJiYodD1zW3IuY2hhckF0KDApXSxuPS1uKSxlW3RdPT09dW5kZWZpbmVkP2VbdF09bjplW3RdKz1uLG51bGx9LGs9ZnVuY3Rpb24oZSx0LG4pe2lmKGU9PT1cImxcInx8ZT09PVwidFwiKXJldHVybiAwO2lmKGU9PT1cImNcInx8ZT09PVwibVwiKXJldHVybiBuLzItdC8yO2lmKGU9PT1cInJcInx8ZT09PVwiYlwiKXJldHVybiBuLXQ7dGhyb3dcIkludmFsaWQgYWxpZ25tZW50XCJ9LEw9ZnVuY3Rpb24oZSl7cmV0dXJuIEwuZT1MLmV8fHgoXCJkaXZcIiksTC5lLnRleHQoZSkuaHRtbCgpfTtBLnByb3RvdHlwZS5sb2FkSFRNTD1mdW5jdGlvbigpe3ZhciB0O3Q9dGhpcy5nZXRTdHlsZSgpLHRoaXMudXNlckNvbnRhaW5lcj1lKHQuaHRtbCksdGhpcy51c2VyRmllbGRzPXQuZmllbGRzfSxBLnByb3RvdHlwZS5zaG93PWZ1bmN0aW9uKGUsdCl7dmFyIG4scixpLHMsbztyPWZ1bmN0aW9uKG4pe3JldHVybiBmdW5jdGlvbigpeyFlJiYhbi5lbGVtJiZuLmRlc3Ryb3koKTtpZih0KXJldHVybiB0KCl9fSh0aGlzKSxvPXRoaXMuY29udGFpbmVyLnBhcmVudCgpLnBhcmVudHMoXCI6aGlkZGVuXCIpLmxlbmd0aD4wLGk9dGhpcy5jb250YWluZXIuYWRkKHRoaXMuYXJyb3cpLG49W107aWYobyYmZSlzPVwic2hvd1wiO2Vsc2UgaWYobyYmIWUpcz1cImhpZGVcIjtlbHNlIGlmKCFvJiZlKXM9dGhpcy5vcHRpb25zLnNob3dBbmltYXRpb24sbi5wdXNoKHRoaXMub3B0aW9ucy5zaG93RHVyYXRpb24pO2Vsc2V7aWYoISFvfHwhIWUpcmV0dXJuIHIoKTtzPXRoaXMub3B0aW9ucy5oaWRlQW5pbWF0aW9uLG4ucHVzaCh0aGlzLm9wdGlvbnMuaGlkZUR1cmF0aW9uKX1yZXR1cm4gbi5wdXNoKHIpLGlbc10uYXBwbHkoaSxuKX0sQS5wcm90b3R5cGUuc2V0R2xvYmFsUG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmdldFBvc2l0aW9uKCksbj10WzBdLGk9dFsxXSxvPXNbbl0sdT1zW2ldLGE9bitcInxcIitpLGY9VFthXTtpZighZnx8IWRvY3VtZW50LmJvZHkuY29udGFpbnMoZlswXSkpe2Y9VFthXT14KFwiZGl2XCIpO3ZhciBsPXt9O2xbb109MCx1PT09XCJtaWRkbGVcIj9sLnRvcD1cIjQ1JVwiOnU9PT1cImNlbnRlclwiP2wubGVmdD1cIjQ1JVwiOmxbdV09MCxmLmNzcyhsKS5hZGRDbGFzcyhyK1wiLWNvcm5lclwiKSxlKFwiYm9keVwiKS5hcHBlbmQoZil9cmV0dXJuIGYucHJlcGVuZCh0aGlzLndyYXBwZXIpfSxBLnByb3RvdHlwZS5zZXRFbGVtZW50UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgbixyLGksbCxjLGgscCxkLHYsbSxnLHksYix3LEUsUyx4LFQsTixMLEEsTyxNLF8sRCxQLEgsQixqO0g9dGhpcy5nZXRQb3NpdGlvbigpLF89SFswXSxPPUhbMV0sTT1IWzJdLGc9dGhpcy5lbGVtLnBvc2l0aW9uKCksZD10aGlzLmVsZW0ub3V0ZXJIZWlnaHQoKSx5PXRoaXMuZWxlbS5vdXRlcldpZHRoKCksdj10aGlzLmVsZW0uaW5uZXJIZWlnaHQoKSxtPXRoaXMuZWxlbS5pbm5lcldpZHRoKCksaj10aGlzLndyYXBwZXIucG9zaXRpb24oKSxjPXRoaXMuY29udGFpbmVyLmhlaWdodCgpLGg9dGhpcy5jb250YWluZXIud2lkdGgoKSxUPXNbX10sTD1mW19dLEE9c1tMXSxwPXt9LHBbQV09Xz09PVwiYlwiP2Q6Xz09PVwiclwiP3k6MCxDKHAsXCJ0b3BcIixnLnRvcC1qLnRvcCksQyhwLFwibGVmdFwiLGcubGVmdC1qLmxlZnQpLEI9W1widG9wXCIsXCJsZWZ0XCJdO2Zvcih3PTAsUz1CLmxlbmd0aDt3PFM7dysrKUQ9Qlt3XSxOPXBhcnNlSW50KHRoaXMuZWxlbS5jc3MoXCJtYXJnaW4tXCIrRCksMTApLE4mJkMocCxELE4pO2I9TWF0aC5tYXgoMCx0aGlzLm9wdGlvbnMuZ2FwLSh0aGlzLm9wdGlvbnMuYXJyb3dTaG93P2k6MCkpLEMocCxBLGIpO2lmKCF0aGlzLm9wdGlvbnMuYXJyb3dTaG93KXRoaXMuYXJyb3cuaGlkZSgpO2Vsc2V7aT10aGlzLm9wdGlvbnMuYXJyb3dTaXplLHI9ZS5leHRlbmQoe30scCksbj10aGlzLnVzZXJDb250YWluZXIuY3NzKFwiYm9yZGVyLWNvbG9yXCIpfHx0aGlzLnVzZXJDb250YWluZXIuY3NzKFwiYm9yZGVyLXRvcC1jb2xvclwiKXx8dGhpcy51c2VyQ29udGFpbmVyLmNzcyhcImJhY2tncm91bmQtY29sb3JcIil8fFwid2hpdGVcIjtmb3IoRT0wLHg9YS5sZW5ndGg7RTx4O0UrKyl7RD1hW0VdLFA9c1tEXTtpZihEPT09TCljb250aW51ZTtsPVA9PT1UP246XCJ0cmFuc3BhcmVudFwiLHJbXCJib3JkZXItXCIrUF09aStcInB4IHNvbGlkIFwiK2x9QyhwLHNbTF0saSksdC5jYWxsKGEsTyk+PTAmJkMocixzW09dLGkqMil9dC5jYWxsKHUsXyk+PTA/KEMocCxcImxlZnRcIixrKE8saCx5KSksciYmQyhyLFwibGVmdFwiLGsoTyxpLG0pKSk6dC5jYWxsKG8sXyk+PTAmJihDKHAsXCJ0b3BcIixrKE8sYyxkKSksciYmQyhyLFwidG9wXCIsayhPLGksdikpKSx0aGlzLmNvbnRhaW5lci5pcyhcIjp2aXNpYmxlXCIpJiYocC5kaXNwbGF5PVwiYmxvY2tcIiksdGhpcy5jb250YWluZXIucmVtb3ZlQXR0cihcInN0eWxlXCIpLmNzcyhwKTtpZihyKXJldHVybiB0aGlzLmFycm93LnJlbW92ZUF0dHIoXCJzdHlsZVwiKS5jc3Mocil9LEEucHJvdG90eXBlLmdldFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIGUsbixyLGkscyxmLGMsaDtoPXRoaXMub3B0aW9ucy5wb3NpdGlvbnx8KHRoaXMuZWxlbT90aGlzLm9wdGlvbnMuZWxlbWVudFBvc2l0aW9uOnRoaXMub3B0aW9ucy5nbG9iYWxQb3NpdGlvbiksZT1sKGgpLGUubGVuZ3RoPT09MCYmKGVbMF09XCJiXCIpO2lmKG49ZVswXSx0LmNhbGwoYSxuKTwwKXRocm93XCJNdXN0IGJlIG9uZSBvZiBbXCIrYStcIl1cIjtpZihlLmxlbmd0aD09PTF8fChyPWVbMF0sdC5jYWxsKHUscik+PTApJiYoaT1lWzFdLHQuY2FsbChvLGkpPDApfHwocz1lWzBdLHQuY2FsbChvLHMpPj0wKSYmKGY9ZVsxXSx0LmNhbGwodSxmKTwwKSllWzFdPShjPWVbMF0sdC5jYWxsKG8sYyk+PTApP1wibVwiOlwibFwiO3JldHVybiBlLmxlbmd0aD09PTImJihlWzJdPWVbMV0pLGV9LEEucHJvdG90eXBlLmdldFN0eWxlPWZ1bmN0aW9uKGUpe3ZhciB0O2V8fChlPXRoaXMub3B0aW9ucy5zdHlsZSksZXx8KGU9XCJkZWZhdWx0XCIpLHQ9Y1tlXTtpZighdCl0aHJvd1wiTWlzc2luZyBzdHlsZTogXCIrZTtyZXR1cm4gdH0sQS5wcm90b3R5cGUudXBkYXRlQ2xhc3Nlcz1mdW5jdGlvbigpe3ZhciB0LG47cmV0dXJuIHQ9W1wiYmFzZVwiXSxlLmlzQXJyYXkodGhpcy5vcHRpb25zLmNsYXNzTmFtZSk/dD10LmNvbmNhdCh0aGlzLm9wdGlvbnMuY2xhc3NOYW1lKTp0aGlzLm9wdGlvbnMuY2xhc3NOYW1lJiZ0LnB1c2godGhpcy5vcHRpb25zLmNsYXNzTmFtZSksbj10aGlzLmdldFN0eWxlKCksdD1lLm1hcCh0LGZ1bmN0aW9uKGUpe3JldHVybiByK1wiLVwiK24ubmFtZStcIi1cIitlfSkuam9pbihcIiBcIiksdGhpcy51c2VyQ29udGFpbmVyLmF0dHIoXCJjbGFzc1wiLHQpfSxBLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24odCxuKXt2YXIgcixzLG8sdSxhO2UuaXNQbGFpbk9iamVjdChuKT9lLmV4dGVuZCh0aGlzLm9wdGlvbnMsbik6ZS50eXBlKG4pPT09XCJzdHJpbmdcIiYmKHRoaXMub3B0aW9ucy5jbGFzc05hbWU9bik7aWYodGhpcy5jb250YWluZXImJiF0KXt0aGlzLnNob3coITEpO3JldHVybn1pZighdGhpcy5jb250YWluZXImJiF0KXJldHVybjtzPXt9LGUuaXNQbGFpbk9iamVjdCh0KT9zPXQ6c1tpXT10O2ZvcihvIGluIHMpe3I9c1tvXSx1PXRoaXMudXNlckZpZWxkc1tvXTtpZighdSljb250aW51ZTt1PT09XCJ0ZXh0XCImJihyPUwociksdGhpcy5vcHRpb25zLmJyZWFrTmV3TGluZXMmJihyPXIucmVwbGFjZSgvXFxuL2csXCI8YnIvPlwiKSkpLGE9bz09PWk/XCJcIjpcIj1cIitvLGIodGhpcy51c2VyQ29udGFpbmVyLFwiW2RhdGEtbm90aWZ5LVwiK3UrYStcIl1cIikuaHRtbChyKX10aGlzLnVwZGF0ZUNsYXNzZXMoKSx0aGlzLmVsZW0/dGhpcy5zZXRFbGVtZW50UG9zaXRpb24oKTp0aGlzLnNldEdsb2JhbFBvc2l0aW9uKCksdGhpcy5zaG93KCEwKSx0aGlzLm9wdGlvbnMuYXV0b0hpZGUmJihjbGVhclRpbWVvdXQodGhpcy5hdXRvaGlkZVRpbWVyKSx0aGlzLmF1dG9oaWRlVGltZXI9c2V0VGltZW91dCh0aGlzLnNob3cuYmluZCh0aGlzLCExKSx0aGlzLm9wdGlvbnMuYXV0b0hpZGVEZWxheSkpfSxBLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy53cmFwcGVyLmRhdGEocixudWxsKSx0aGlzLndyYXBwZXIucmVtb3ZlKCl9LGVbbl09ZnVuY3Rpb24odCxyLGkpe3JldHVybiB0JiZ0Lm5vZGVOYW1lfHx0LmpxdWVyeT9lKHQpW25dKHIsaSk6KGk9cixyPXQsbmV3IEEobnVsbCxyLGkpKSx0fSxlLmZuW25dPWZ1bmN0aW9uKHQsbil7cmV0dXJuIGUodGhpcykuZWFjaChmdW5jdGlvbigpe3ZhciBpPU4oZSh0aGlzKSkuZGF0YShyKTtpJiZpLmRlc3Ryb3koKTt2YXIgcz1uZXcgQShlKHRoaXMpLHQsbil9KSx0aGlzfSxlLmV4dGVuZChlW25dLHtkZWZhdWx0czpTLGFkZFN0eWxlOm0scmVtb3ZlU3R5bGU6dixwbHVnaW5PcHRpb25zOncsZ2V0U3R5bGU6ZCxpbnNlcnRDU1M6Z30pLG0oXCJib290c3RyYXBcIix7aHRtbDpcIjxkaXY+XFxuPHNwYW4gZGF0YS1ub3RpZnktdGV4dD48L3NwYW4+XFxuPC9kaXY+XCIsY2xhc3Nlczp7YmFzZTp7XCJmb250LXdlaWdodFwiOlwiYm9sZFwiLHBhZGRpbmc6XCI4cHggMTVweCA4cHggMTRweFwiLFwidGV4dC1zaGFkb3dcIjpcIjAgMXB4IDAgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjUpXCIsXCJiYWNrZ3JvdW5kLWNvbG9yXCI6XCIjZmNmOGUzXCIsYm9yZGVyOlwiMXB4IHNvbGlkICNmYmVlZDVcIixcImJvcmRlci1yYWRpdXNcIjpcIjRweFwiLFwid2hpdGUtc3BhY2VcIjpcIm5vd3JhcFwiLFwicGFkZGluZy1sZWZ0XCI6XCIyNXB4XCIsXCJiYWNrZ3JvdW5kLXJlcGVhdFwiOlwibm8tcmVwZWF0XCIsXCJiYWNrZ3JvdW5kLXBvc2l0aW9uXCI6XCIzcHggN3B4XCJ9LGVycm9yOntjb2xvcjpcIiNCOTRBNDhcIixcImJhY2tncm91bmQtY29sb3JcIjpcIiNGMkRFREVcIixcImJvcmRlci1jb2xvclwiOlwiI0VFRDNEN1wiLFwiYmFja2dyb3VuZC1pbWFnZVwiOlwidXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQlFBQUFBVUNBWUFBQUNOaVIwTkFBQUFHWFJGV0hSVGIyWjBkMkZ5WlFCQlpHOWlaU0JKYldGblpWSmxZV1I1Y2NsbFBBQUFBdFJKUkVGVWVOcWtWYzF1MDBBUUhxK2RPRCswcG9JUWZrSWphbFcwU0VHcVJNdVJuSG9zM0Rqd0FIMEFybHlRZUFOT09TTWVBQTVWanlCeEtCUWhnU3BWVUtLUU5HbG9GZHc0Y1d3Mmp0Zk1PbmE2Sk9VQXJEVGF6WGkvYjNkbTU1c29jUHFRaEZrYSsrYUhCc0k4R3NvcFJKRVJORmxZODhGQ0VrOVlpd2Y4UmhnUnlhSEZRcFBIQ0RtWkc1b1gydWkyeWlsa2NUVDFBY0RzYllDMU5NQXlPaTd6VFgyQWd4N0E5bHVBbDg4QmF1aWlRL2NKYVpRZklwQWxuZ0RjdlpaTXJsOHZGUEs1K1hrdHJXbHgzL2VoWjVyOSt0NmUrV1ZucDFweG5OSWpnQmU0LzZkQXlzUWM4ZHNtSHdQY1c5QzBoM2ZXMWhhbnMxbHR3Smh5MEd4SzdYWmJVbE1wNVd3MmV5YW42K2Z0L2YyRkFxWEdLNEN2UWs1SHVlRno3RDZHT1p0SXJLK3NydXBkeDFHUkJCcU5CdHpjMkFpTXI3blBwbFJkS2hiMXE2cTZ6akZocmtsRUZPVXV0b1E1MHhjWDg2WmxxYVpwUXJmYkJkdTJSNi9HMTl6WDZYU2doNlJYNXVieUhDTThucVNJRDZJQ3JHaVpqR1lZeG9qRXNpdzRQRHdNU0w1VktzQzhZZjRWUllGek16TWF4d2psSlNsQ3lBUTlsMENXNDRQQkFEelhoZTd4TWRpOUh0VHJkWWpGWWtEUUwwY240WGRxMi9FQUUrSW5DbnZBRFRmMmVhaDRTeDl2RXhRamtxWFQ2YUFFUklDTWV3ZC9VQXAvSWVZQU5NMmpveHQrcTVWSStpZXEyaTBXZzNsNkROekh3VEVSUGdvMWtvN1hCWGozdmRsc1QyRitVdWhJaFlrcDd1N0NhcmtjckZPQ3RSM0g1Sml3YkFJZUltalQvWVFLS0J0R2pSRkNVNUlVZ0ZSZTdmRjRjQ05WSVBNWW8zVktxeHdqeU5BWE5lcHVvcHlxbmxkNjAycVZzZlJwRWtreitHRkwxd1BqNnlTWEJwSnRXVmE1eGxocGN5aEJOd3BaSG10WDhBR2dmSUV4bzBacHprV1ZUQkdpWENTRWFIaDYyL1BvUjBwL3ZIYWN6eFhHbmo0YlNvK0c3OGxFTFU4MGgxdW9nQndXTGY1WWxzUG1nREVkNE0yMzZ4am0rOG5tNEl1RS85dSsvUEgySlhaZmJ3ejR6dzFXYk8rU1FQcFhmd0cvQkJnQWhDTlppU2IvcE9RQUFBQUFTVVZPUks1Q1lJST0pXCJ9LHN1Y2Nlc3M6e2NvbG9yOlwiIzQ2ODg0N1wiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0RGRjBEOFwiLFwiYm9yZGVyLWNvbG9yXCI6XCIjRDZFOUM2XCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FZQUFBQ05pUjBOQUFBQUdYUkZXSFJUYjJaMGQyRnlaUUJCWkc5aVpTQkpiV0ZuWlZKbFlXUjVjY2xsUEFBQUF1dEpSRUZVZU5xMGxjdFBFMEVjeDM4enUvUkZTMUVyeXF0Z0pGQTA4WUNpTVpJQVFRNGVSRzhlREdkUEppWWVUSXdIVGZ3UGlBY3ZYSXdYTHdvWFBhRHhrV2dRNmlzbEtsSkxTUVdMVXJhUExUdjdHbWUzMnpvRjlLU1RmTE83djUzdlozZC9NNy9mSXRoK0lPNklOdDJqam9BN2JqSENKb0FsekNSdzU5WXdIWWpCbmZNUHFBS1dRWUtqR2tmQ0pxQUYweHdaamlwUXRBM014ZVNHODdWaE9PWWVnVnJVQ3k3VVpNOVM2VExJZEFhbXlTVGNsWmRZaEZoUkhsb0dZZzdtZ1p2MVp6enR2Z3VkN1YxdGJRMnR3WUEzNExKbUY0cDVkWEYxS1R1Zm5FK1N4ZUp0dUNaTnNMRENRVTArUnlLVEYyN1VudzEwMWw4ZTZobnMzdTBQQmFsT1JWVlZrY2FFS0JKRGdWMytjR000dEtLbUkrb2hsSUdueWdLWDAwclNCZnN6ei9uMnVYdjgxd2Q2K3J0MW9yc1pDSFJkcjFJbWsyRjJLb2IzaHV0U3hXOHRoc2Q4QVhOYWxuOUQ3Q1RmQTZPKzBVZ2tNdXdWdkVGRlViYkFjcmtjVEE4K0F0T2s4RTZLaVFpRG1NRlNEcVpJdEF6RVZRdmlSa2REZGFGZ1BwOEhTWktBRUFMNVFoN1NxMmxJSkJKd3Yyc2NVcWtVbktvWmdOaGNES2hLZzVhSCsxSWtjb3VDQWRGR0FRc3VXWlloT2p3RkhROTZvYWdXZ1JvVW92MVQ5a1JCRU9EQXd4TTJRdEVVbCtXcCtMbjlWUm82QmNNdzRFckhSWWpINC9CMjZBbFFvUVFUUmRIV3djZDlBSDU3K1VBWGRkdkREMzdEbXJCQlYzNFdmcWlYUGw2MWcrdnI2eEE5enNHZU05Z09kc05Ya2dwRXRUd1Z2d09rbFhMS202Ky9wNWV6d2s0QitqNmRyb0JzMkNzR2EvZ05zNlJJeGF6bDRUYzI1bXBUZ3cvYXBQUjFMWWxOUkZBemdzT3hreVhZTElNMVY4Tk13eUFrSlNjdEQxZUdWS2lxNXdXalNQZGptZVRraUt2Vlc0ZjJZUEhXbDNHQVZxNnltY3lDVGdvdk0zRnp5UmlEZTJUYUtjRUtzTHBKdk5IalpnUE5xRXR5aTZtWkltNFNSRnlMTVVzT05TU2RrUGVGdFkxbjBtY3pvWTNCSFRMaHdQUnk5L2x6Y3ppQ3c5QUNJK3lxbDBWTHpjR0FaYllTTTVDQ1NaZzEvOW9jL25uNytpOE45cC84QW40Sk1BRHhoSCt4SGZ1aUt3QUFBQUJKUlU1RXJrSmdnZz09KVwifSxpbmZvOntjb2xvcjpcIiMzQTg3QURcIixcImJhY2tncm91bmQtY29sb3JcIjpcIiNEOUVERjdcIixcImJvcmRlci1jb2xvclwiOlwiI0JDRThGMVwiLFwiYmFja2dyb3VuZC1pbWFnZVwiOlwidXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQlFBQUFBVUNBWUFBQUNOaVIwTkFBQUFCbUpMUjBRQS93RC9BUCtndmFlVEFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFBQjNSSlRVVUgzUVlGQWhrU3NkZXMvUUFBQThkSlJFRlVPTXZWbEd0TVcyVVl4Ly9QT2FXSFhnNmxMYVcweXBBdHcxVUNnYm5pTk9MY1ZPTG1Bakhab2xPWWx4bVRHWFZaZEFuUmZYUW0rN1NvVTRtWGFPYWlac0VwQzlGa2lRczZaNmJkQ25OWXJ1TTZLTkJ3NllXZXd6bDl6K3NISW1FV3Yrdno3WG1UOTVmLyszLys3d1A4MTR2K2VmRE9WMy9Tb1gzbEhBQSs2T0RlVUZmTWZqT1dNQURnZGsrZUVLejBwRjdhUWRNQWNPS0xManJjVk1WWDN4ZFdOMjkvR2hZUDdTdm5QMGNXZlM4Y2FTa2ZIWnNQRTlGZ250MDJKTnV0UTBRWUhCMmREejkvcEtYOFFqanVPOXhVeGQvNjZIZHhUZUNIWjNyb2pRT2JHUUJjdU5qZnBsa0QzYjE5WS82TXJpbVNhS2dTTW1wR1U1V2V2bUUvc3dhNk95NzN0UUhBMFJkcjJNbXYvNkExbjl3OXN1UTcwOTdaOWxNNEZsVGdURHJ6WlR1NFN0WFZmcGlJNDhyVmNVRE01Y21Fa3NyRm5IeGZwVHRVLzNCRlF6Q1FGLzJiWVZvTmJIN3ptSXRiU29NajQwSlN6bU15WDVxRHZyaUE3UWRySUlwQSszY2RzTXB1MG5YSThjVjBNdEtYQ1BaZXYrZ0NFTTFTMk5IUHZXZlAvaEwrN0ZTcjMrMHA1UkJFeWhFTjVKQ0tZcjhYbkFTTVQweEJOeXpRR1FlSThmanNHRDM5Uk1QazdzZTJiZDVadFR5b0ZZWGZ0RjZ5MzdneDdOZVV0SkpPVEZsQUhEWkxEdUlMVTNqMytINW9PckQzeVdiSXp0dWdhQXpnbkJLSnVCTHBHZlFyUzh3TzRGWmdWK2MxSXhhTGdXVlUwdE1MRUVUQ29zNHhNekVJdjljSlhRY3lhZ0l3aWdER3dKZ09BdEhBd0FoaXNRVWp5ME9SR0VSaUVMZ0c0aWFra3pvNE1ZQXhjTTVoQU1pMVdXRzF5WUNKSWNNVWFCa1ZSTGRHZVNVMjk5NVRMV3pjVUF6T05KN0o2RkJWQllJZ2dNem1GYnZkQlY0NENvcmc4dmpoekMrRUpFbDhVMWtKdGdZcmhDemdjL3Z2VHdYS1NpYjFwYVJGVlJWT1JEQUpBc3c1RnVUYUpFaFdNMlNIQjNtT0FsaGtOeHd1THplSnNHd3FXemY1VEZOZEtndFk1cUhwNlpGZjY3WS9zQVZhZENhVlk1WUFDRERiM09pNE5JakxuV013MlF0aENCSXNWaHNVVFU5dHZYc2plcTkrWDFkNzUvS0VzNExOT2ZjZGYvK0h0aE1udnd4T0Qwd21IYVhyN1pJdG4yd3VIMlNuQnpiWkFiUEp3cFB4K1ZRdXpjbTdkZ1JDQjU3YTF1QnpVRFJMNGJmbkkwUkUwZWFYZDlXODltcGpxSFpuVUk1SGgybDJka1paVWhPcXBpMnFTbXBPbVo2NFR1dTlxbHovU0VYbzZNRUhhM3dPaXA0NkYxbjc2MzNlZWtWOGRzOFd4am4zN1dsNjNWVmErZWo1b2VFWi84MlpCRVRKanBKMVJiaWoyRDNaLzF0clhVdkxzYmxDSzBYZk94MFNYMmtNc245ZFgrZCs3S2Y2aDhvNEFJeWt1ZmZqVDhMMjBMVSt3NEFaZDVWdkVQWStYcFdxTFYzMjdIUjdEelh1RG5EOHIrb3ZrQmVoSjhpK3k4WUFBQUFBU1VWT1JLNUNZSUk9KVwifSx3YXJuOntjb2xvcjpcIiNDMDk4NTNcIixcImJhY2tncm91bmQtY29sb3JcIjpcIiNGQ0Y4RTNcIixcImJvcmRlci1jb2xvclwiOlwiI0ZCRUVENVwiLFwiYmFja2dyb3VuZC1pbWFnZVwiOlwidXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQlFBQUFBVUNBTUFBQUM2ViswL0FBQUJKbEJNVkVYcjZlYi8yb0Qvd2k3L3hqci8wbVAveWtmL3RRRC92QmovM283L3VRLy92eUwvdHdlYmhnRC80cHpYMUszejhlMzQ5dks2dEhDaWxDV2JpUXltbjBqR3dvcnI2ZFhRemEzSHhjS2tuMXZXdlYvNXVSZms0ZFhaMWJEMTgrLzUyWWViaUFteXI1UzltaEN6cldxNXQ2dWZqUkg1NGFMczBvUytxRDc1MVhxUGhBeWJod1hzdWpHM3NtK1prMFBUd0c2U2hnK1BoaE9iaHdPUGdRTDR6VjJubHlyZjI3dUxmZ0NQaFJIdTdPbUxnQWFma3lpV2tEM2w0OWliaUFmVHMwQytsZ0NuaXdENHNnREp4cU9pbHpEV293V0ZmQUgwOHVlYmlnNnFwRkhCdkgvYXcyNkZmUVRRenN2eThPeUVmejIwcjNqQXZhS2JoZ0c5cTBuYzJMYlp4WGFub1V1L3U1V1NnZ0N0cDFhbnBKS2RtRnovemxYLzFuR0ppWW11cTVEeDcrc0FBQURvUFVaU0FBQUFBWFJTVGxNQVFPYllaZ0FBQUFGaVMwZEVBSWdGSFVnQUFBQUpjRWhaY3dBQUN4TUFBQXNUQVFDYW5CZ0FBQUFIZEVsTlJRZmRCZ1VCR2hoNGFhaDVBQUFBbGtsRVFWUVkwMk5nb0JJSUU4RVVjd24xRmtJWE0xVGo1ZERVUWhQVTUwMk1pN1hYUXhHejV1VklqR09KVVVVVzgxSG5ZRXlNaTJIVmNVT0lDUVp6TU1ZbXhyRXlNeWxKd2dVdDVCbGpXUkxqbUptNHBJMWhZcDVTUUxHWXhEZ21MblpPVnh1b29DbElES2dYS01iTjVnZ1YxQUNMSmNhQnhOZ2NvaUdDQmlad2RXeE9FVEJEclR5RUZleTBqWUo0ZUhqTUdXZ0VBSXBSRlJDVXQwOHFBQUFBQUVsRlRrU3VRbUNDKVwifX19KSxlKGZ1bmN0aW9uKCl7ZyhoLmNzcykuYXR0cihcImlkXCIsXCJjb3JlLW5vdGlmeVwiKSxlKGRvY3VtZW50KS5vbihcImNsaWNrXCIsXCIuXCIrcitcIi1oaWRhYmxlXCIsZnVuY3Rpb24odCl7ZSh0aGlzKS50cmlnZ2VyKFwibm90aWZ5LWhpZGVcIil9KSxlKGRvY3VtZW50KS5vbihcIm5vdGlmeS1oaWRlXCIsXCIuXCIrcitcIi13cmFwcGVyXCIsZnVuY3Rpb24odCl7dmFyIG49ZSh0aGlzKS5kYXRhKHIpO24mJm4uc2hvdyghMSl9KX0pfSkiLCIvKiBQcmlzbUpTIDEuMjkuMFxuaHR0cHM6Ly9wcmlzbWpzLmNvbS9kb3dubG9hZC5odG1sI3RoZW1lcz1wcmlzbSZsYW5ndWFnZXM9bWFya3VwK2NzcytjbGlrZStqYXZhc2NyaXB0ICovXG52YXIgX3NlbGY9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz93aW5kb3c6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIFdvcmtlckdsb2JhbFNjb3BlJiZzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGU/c2VsZjp7fSxQcmlzbT1mdW5jdGlvbihlKXt2YXIgbj0vKD86XnxcXHMpbGFuZyg/OnVhZ2UpPy0oW1xcdy1dKykoPz1cXHN8JCkvaSx0PTAscj17fSxhPXttYW51YWw6ZS5QcmlzbSYmZS5QcmlzbS5tYW51YWwsZGlzYWJsZVdvcmtlck1lc3NhZ2VIYW5kbGVyOmUuUHJpc20mJmUuUHJpc20uZGlzYWJsZVdvcmtlck1lc3NhZ2VIYW5kbGVyLHV0aWw6e2VuY29kZTpmdW5jdGlvbiBlKG4pe3JldHVybiBuIGluc3RhbmNlb2YgaT9uZXcgaShuLnR5cGUsZShuLmNvbnRlbnQpLG4uYWxpYXMpOkFycmF5LmlzQXJyYXkobik/bi5tYXAoZSk6bi5yZXBsYWNlKC8mL2csXCImYW1wO1wiKS5yZXBsYWNlKC88L2csXCImbHQ7XCIpLnJlcGxhY2UoL1xcdTAwYTAvZyxcIiBcIil9LHR5cGU6ZnVuY3Rpb24oZSl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlKS5zbGljZSg4LC0xKX0sb2JqSWQ6ZnVuY3Rpb24oZSl7cmV0dXJuIGUuX19pZHx8T2JqZWN0LmRlZmluZVByb3BlcnR5KGUsXCJfX2lkXCIse3ZhbHVlOisrdH0pLGUuX19pZH0sY2xvbmU6ZnVuY3Rpb24gZShuLHQpe3ZhciByLGk7c3dpdGNoKHQ9dHx8e30sYS51dGlsLnR5cGUobikpe2Nhc2VcIk9iamVjdFwiOmlmKGk9YS51dGlsLm9iaklkKG4pLHRbaV0pcmV0dXJuIHRbaV07Zm9yKHZhciBsIGluIHI9e30sdFtpXT1yLG4pbi5oYXNPd25Qcm9wZXJ0eShsKSYmKHJbbF09ZShuW2xdLHQpKTtyZXR1cm4gcjtjYXNlXCJBcnJheVwiOnJldHVybiBpPWEudXRpbC5vYmpJZChuKSx0W2ldP3RbaV06KHI9W10sdFtpXT1yLG4uZm9yRWFjaCgoZnVuY3Rpb24obixhKXtyW2FdPWUobix0KX0pKSxyKTtkZWZhdWx0OnJldHVybiBufX0sZ2V0TGFuZ3VhZ2U6ZnVuY3Rpb24oZSl7Zm9yKDtlOyl7dmFyIHQ9bi5leGVjKGUuY2xhc3NOYW1lKTtpZih0KXJldHVybiB0WzFdLnRvTG93ZXJDYXNlKCk7ZT1lLnBhcmVudEVsZW1lbnR9cmV0dXJuXCJub25lXCJ9LHNldExhbmd1YWdlOmZ1bmN0aW9uKGUsdCl7ZS5jbGFzc05hbWU9ZS5jbGFzc05hbWUucmVwbGFjZShSZWdFeHAobixcImdpXCIpLFwiXCIpLGUuY2xhc3NMaXN0LmFkZChcImxhbmd1YWdlLVwiK3QpfSxjdXJyZW50U2NyaXB0OmZ1bmN0aW9uKCl7aWYoXCJ1bmRlZmluZWRcIj09dHlwZW9mIGRvY3VtZW50KXJldHVybiBudWxsO2lmKFwiY3VycmVudFNjcmlwdFwiaW4gZG9jdW1lbnQpcmV0dXJuIGRvY3VtZW50LmN1cnJlbnRTY3JpcHQ7dHJ5e3Rocm93IG5ldyBFcnJvcn1jYXRjaChyKXt2YXIgZT0oL2F0IFteKFxcclxcbl0qXFwoKC4qKTpbXjpdKzpbXjpdK1xcKSQvaS5leGVjKHIuc3RhY2spfHxbXSlbMV07aWYoZSl7dmFyIG49ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIik7Zm9yKHZhciB0IGluIG4paWYoblt0XS5zcmM9PWUpcmV0dXJuIG5bdF19cmV0dXJuIG51bGx9fSxpc0FjdGl2ZTpmdW5jdGlvbihlLG4sdCl7Zm9yKHZhciByPVwibm8tXCIrbjtlOyl7dmFyIGE9ZS5jbGFzc0xpc3Q7aWYoYS5jb250YWlucyhuKSlyZXR1cm4hMDtpZihhLmNvbnRhaW5zKHIpKXJldHVybiExO2U9ZS5wYXJlbnRFbGVtZW50fXJldHVybiEhdH19LGxhbmd1YWdlczp7cGxhaW46cixwbGFpbnRleHQ6cix0ZXh0OnIsdHh0OnIsZXh0ZW5kOmZ1bmN0aW9uKGUsbil7dmFyIHQ9YS51dGlsLmNsb25lKGEubGFuZ3VhZ2VzW2VdKTtmb3IodmFyIHIgaW4gbil0W3JdPW5bcl07cmV0dXJuIHR9LGluc2VydEJlZm9yZTpmdW5jdGlvbihlLG4sdCxyKXt2YXIgaT0ocj1yfHxhLmxhbmd1YWdlcylbZV0sbD17fTtmb3IodmFyIG8gaW4gaSlpZihpLmhhc093blByb3BlcnR5KG8pKXtpZihvPT1uKWZvcih2YXIgcyBpbiB0KXQuaGFzT3duUHJvcGVydHkocykmJihsW3NdPXRbc10pO3QuaGFzT3duUHJvcGVydHkobyl8fChsW29dPWlbb10pfXZhciB1PXJbZV07cmV0dXJuIHJbZV09bCxhLmxhbmd1YWdlcy5ERlMoYS5sYW5ndWFnZXMsKGZ1bmN0aW9uKG4sdCl7dD09PXUmJm4hPWUmJih0aGlzW25dPWwpfSkpLGx9LERGUzpmdW5jdGlvbiBlKG4sdCxyLGkpe2k9aXx8e307dmFyIGw9YS51dGlsLm9iaklkO2Zvcih2YXIgbyBpbiBuKWlmKG4uaGFzT3duUHJvcGVydHkobykpe3QuY2FsbChuLG8sbltvXSxyfHxvKTt2YXIgcz1uW29dLHU9YS51dGlsLnR5cGUocyk7XCJPYmplY3RcIiE9PXV8fGlbbChzKV0/XCJBcnJheVwiIT09dXx8aVtsKHMpXXx8KGlbbChzKV09ITAsZShzLHQsbyxpKSk6KGlbbChzKV09ITAsZShzLHQsbnVsbCxpKSl9fX0scGx1Z2luczp7fSxoaWdobGlnaHRBbGw6ZnVuY3Rpb24oZSxuKXthLmhpZ2hsaWdodEFsbFVuZGVyKGRvY3VtZW50LGUsbil9LGhpZ2hsaWdodEFsbFVuZGVyOmZ1bmN0aW9uKGUsbix0KXt2YXIgcj17Y2FsbGJhY2s6dCxjb250YWluZXI6ZSxzZWxlY3RvcjonY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0sIFtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gY29kZSwgY29kZVtjbGFzcyo9XCJsYW5nLVwiXSwgW2NsYXNzKj1cImxhbmctXCJdIGNvZGUnfTthLmhvb2tzLnJ1bihcImJlZm9yZS1oaWdobGlnaHRhbGxcIixyKSxyLmVsZW1lbnRzPUFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShyLmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKHIuc2VsZWN0b3IpKSxhLmhvb2tzLnJ1bihcImJlZm9yZS1hbGwtZWxlbWVudHMtaGlnaGxpZ2h0XCIscik7Zm9yKHZhciBpLGw9MDtpPXIuZWxlbWVudHNbbCsrXTspYS5oaWdobGlnaHRFbGVtZW50KGksITA9PT1uLHIuY2FsbGJhY2spfSxoaWdobGlnaHRFbGVtZW50OmZ1bmN0aW9uKG4sdCxyKXt2YXIgaT1hLnV0aWwuZ2V0TGFuZ3VhZ2UobiksbD1hLmxhbmd1YWdlc1tpXTthLnV0aWwuc2V0TGFuZ3VhZ2UobixpKTt2YXIgbz1uLnBhcmVudEVsZW1lbnQ7byYmXCJwcmVcIj09PW8ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSYmYS51dGlsLnNldExhbmd1YWdlKG8saSk7dmFyIHM9e2VsZW1lbnQ6bixsYW5ndWFnZTppLGdyYW1tYXI6bCxjb2RlOm4udGV4dENvbnRlbnR9O2Z1bmN0aW9uIHUoZSl7cy5oaWdobGlnaHRlZENvZGU9ZSxhLmhvb2tzLnJ1bihcImJlZm9yZS1pbnNlcnRcIixzKSxzLmVsZW1lbnQuaW5uZXJIVE1MPXMuaGlnaGxpZ2h0ZWRDb2RlLGEuaG9va3MucnVuKFwiYWZ0ZXItaGlnaGxpZ2h0XCIscyksYS5ob29rcy5ydW4oXCJjb21wbGV0ZVwiLHMpLHImJnIuY2FsbChzLmVsZW1lbnQpfWlmKGEuaG9va3MucnVuKFwiYmVmb3JlLXNhbml0eS1jaGVja1wiLHMpLChvPXMuZWxlbWVudC5wYXJlbnRFbGVtZW50KSYmXCJwcmVcIj09PW8ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSYmIW8uaGFzQXR0cmlidXRlKFwidGFiaW5kZXhcIikmJm8uc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIixcIjBcIiksIXMuY29kZSlyZXR1cm4gYS5ob29rcy5ydW4oXCJjb21wbGV0ZVwiLHMpLHZvaWQociYmci5jYWxsKHMuZWxlbWVudCkpO2lmKGEuaG9va3MucnVuKFwiYmVmb3JlLWhpZ2hsaWdodFwiLHMpLHMuZ3JhbW1hcilpZih0JiZlLldvcmtlcil7dmFyIGM9bmV3IFdvcmtlcihhLmZpbGVuYW1lKTtjLm9ubWVzc2FnZT1mdW5jdGlvbihlKXt1KGUuZGF0YSl9LGMucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe2xhbmd1YWdlOnMubGFuZ3VhZ2UsY29kZTpzLmNvZGUsaW1tZWRpYXRlQ2xvc2U6ITB9KSl9ZWxzZSB1KGEuaGlnaGxpZ2h0KHMuY29kZSxzLmdyYW1tYXIscy5sYW5ndWFnZSkpO2Vsc2UgdShhLnV0aWwuZW5jb2RlKHMuY29kZSkpfSxoaWdobGlnaHQ6ZnVuY3Rpb24oZSxuLHQpe3ZhciByPXtjb2RlOmUsZ3JhbW1hcjpuLGxhbmd1YWdlOnR9O2lmKGEuaG9va3MucnVuKFwiYmVmb3JlLXRva2VuaXplXCIsciksIXIuZ3JhbW1hcil0aHJvdyBuZXcgRXJyb3IoJ1RoZSBsYW5ndWFnZSBcIicrci5sYW5ndWFnZSsnXCIgaGFzIG5vIGdyYW1tYXIuJyk7cmV0dXJuIHIudG9rZW5zPWEudG9rZW5pemUoci5jb2RlLHIuZ3JhbW1hciksYS5ob29rcy5ydW4oXCJhZnRlci10b2tlbml6ZVwiLHIpLGkuc3RyaW5naWZ5KGEudXRpbC5lbmNvZGUoci50b2tlbnMpLHIubGFuZ3VhZ2UpfSx0b2tlbml6ZTpmdW5jdGlvbihlLG4pe3ZhciB0PW4ucmVzdDtpZih0KXtmb3IodmFyIHIgaW4gdCluW3JdPXRbcl07ZGVsZXRlIG4ucmVzdH12YXIgYT1uZXcgcztyZXR1cm4gdShhLGEuaGVhZCxlKSxvKGUsYSxuLGEuaGVhZCwwKSxmdW5jdGlvbihlKXtmb3IodmFyIG49W10sdD1lLmhlYWQubmV4dDt0IT09ZS50YWlsOyluLnB1c2godC52YWx1ZSksdD10Lm5leHQ7cmV0dXJuIG59KGEpfSxob29rczp7YWxsOnt9LGFkZDpmdW5jdGlvbihlLG4pe3ZhciB0PWEuaG9va3MuYWxsO3RbZV09dFtlXXx8W10sdFtlXS5wdXNoKG4pfSxydW46ZnVuY3Rpb24oZSxuKXt2YXIgdD1hLmhvb2tzLmFsbFtlXTtpZih0JiZ0Lmxlbmd0aClmb3IodmFyIHIsaT0wO3I9dFtpKytdOylyKG4pfX0sVG9rZW46aX07ZnVuY3Rpb24gaShlLG4sdCxyKXt0aGlzLnR5cGU9ZSx0aGlzLmNvbnRlbnQ9bix0aGlzLmFsaWFzPXQsdGhpcy5sZW5ndGg9MHwocnx8XCJcIikubGVuZ3RofWZ1bmN0aW9uIGwoZSxuLHQscil7ZS5sYXN0SW5kZXg9bjt2YXIgYT1lLmV4ZWModCk7aWYoYSYmciYmYVsxXSl7dmFyIGk9YVsxXS5sZW5ndGg7YS5pbmRleCs9aSxhWzBdPWFbMF0uc2xpY2UoaSl9cmV0dXJuIGF9ZnVuY3Rpb24gbyhlLG4sdCxyLHMsZyl7Zm9yKHZhciBmIGluIHQpaWYodC5oYXNPd25Qcm9wZXJ0eShmKSYmdFtmXSl7dmFyIGg9dFtmXTtoPUFycmF5LmlzQXJyYXkoaCk/aDpbaF07Zm9yKHZhciBkPTA7ZDxoLmxlbmd0aDsrK2Qpe2lmKGcmJmcuY2F1c2U9PWYrXCIsXCIrZClyZXR1cm47dmFyIHY9aFtkXSxwPXYuaW5zaWRlLG09ISF2Lmxvb2tiZWhpbmQseT0hIXYuZ3JlZWR5LGs9di5hbGlhcztpZih5JiYhdi5wYXR0ZXJuLmdsb2JhbCl7dmFyIHg9di5wYXR0ZXJuLnRvU3RyaW5nKCkubWF0Y2goL1tpbXN1eV0qJC8pWzBdO3YucGF0dGVybj1SZWdFeHAodi5wYXR0ZXJuLnNvdXJjZSx4K1wiZ1wiKX1mb3IodmFyIGI9di5wYXR0ZXJufHx2LHc9ci5uZXh0LEE9czt3IT09bi50YWlsJiYhKGcmJkE+PWcucmVhY2gpO0ErPXcudmFsdWUubGVuZ3RoLHc9dy5uZXh0KXt2YXIgRT13LnZhbHVlO2lmKG4ubGVuZ3RoPmUubGVuZ3RoKXJldHVybjtpZighKEUgaW5zdGFuY2VvZiBpKSl7dmFyIFAsTD0xO2lmKHkpe2lmKCEoUD1sKGIsQSxlLG0pKXx8UC5pbmRleD49ZS5sZW5ndGgpYnJlYWs7dmFyIFM9UC5pbmRleCxPPVAuaW5kZXgrUFswXS5sZW5ndGgsaj1BO2ZvcihqKz13LnZhbHVlLmxlbmd0aDtTPj1qOylqKz0odz13Lm5leHQpLnZhbHVlLmxlbmd0aDtpZihBPWotPXcudmFsdWUubGVuZ3RoLHcudmFsdWUgaW5zdGFuY2VvZiBpKWNvbnRpbnVlO2Zvcih2YXIgQz13O0MhPT1uLnRhaWwmJihqPE98fFwic3RyaW5nXCI9PXR5cGVvZiBDLnZhbHVlKTtDPUMubmV4dClMKyssais9Qy52YWx1ZS5sZW5ndGg7TC0tLEU9ZS5zbGljZShBLGopLFAuaW5kZXgtPUF9ZWxzZSBpZighKFA9bChiLDAsRSxtKSkpY29udGludWU7Uz1QLmluZGV4O3ZhciBOPVBbMF0sXz1FLnNsaWNlKDAsUyksTT1FLnNsaWNlKFMrTi5sZW5ndGgpLFc9QStFLmxlbmd0aDtnJiZXPmcucmVhY2gmJihnLnJlYWNoPVcpO3ZhciB6PXcucHJldjtpZihfJiYoej11KG4seixfKSxBKz1fLmxlbmd0aCksYyhuLHosTCksdz11KG4seixuZXcgaShmLHA/YS50b2tlbml6ZShOLHApOk4sayxOKSksTSYmdShuLHcsTSksTD4xKXt2YXIgST17Y2F1c2U6ZitcIixcIitkLHJlYWNoOld9O28oZSxuLHQsdy5wcmV2LEEsSSksZyYmSS5yZWFjaD5nLnJlYWNoJiYoZy5yZWFjaD1JLnJlYWNoKX19fX19fWZ1bmN0aW9uIHMoKXt2YXIgZT17dmFsdWU6bnVsbCxwcmV2Om51bGwsbmV4dDpudWxsfSxuPXt2YWx1ZTpudWxsLHByZXY6ZSxuZXh0Om51bGx9O2UubmV4dD1uLHRoaXMuaGVhZD1lLHRoaXMudGFpbD1uLHRoaXMubGVuZ3RoPTB9ZnVuY3Rpb24gdShlLG4sdCl7dmFyIHI9bi5uZXh0LGE9e3ZhbHVlOnQscHJldjpuLG5leHQ6cn07cmV0dXJuIG4ubmV4dD1hLHIucHJldj1hLGUubGVuZ3RoKyssYX1mdW5jdGlvbiBjKGUsbix0KXtmb3IodmFyIHI9bi5uZXh0LGE9MDthPHQmJnIhPT1lLnRhaWw7YSsrKXI9ci5uZXh0O24ubmV4dD1yLHIucHJldj1uLGUubGVuZ3RoLT1hfWlmKGUuUHJpc209YSxpLnN0cmluZ2lmeT1mdW5jdGlvbiBlKG4sdCl7aWYoXCJzdHJpbmdcIj09dHlwZW9mIG4pcmV0dXJuIG47aWYoQXJyYXkuaXNBcnJheShuKSl7dmFyIHI9XCJcIjtyZXR1cm4gbi5mb3JFYWNoKChmdW5jdGlvbihuKXtyKz1lKG4sdCl9KSkscn12YXIgaT17dHlwZTpuLnR5cGUsY29udGVudDplKG4uY29udGVudCx0KSx0YWc6XCJzcGFuXCIsY2xhc3NlczpbXCJ0b2tlblwiLG4udHlwZV0sYXR0cmlidXRlczp7fSxsYW5ndWFnZTp0fSxsPW4uYWxpYXM7bCYmKEFycmF5LmlzQXJyYXkobCk/QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaS5jbGFzc2VzLGwpOmkuY2xhc3Nlcy5wdXNoKGwpKSxhLmhvb2tzLnJ1bihcIndyYXBcIixpKTt2YXIgbz1cIlwiO2Zvcih2YXIgcyBpbiBpLmF0dHJpYnV0ZXMpbys9XCIgXCIrcysnPVwiJysoaS5hdHRyaWJ1dGVzW3NdfHxcIlwiKS5yZXBsYWNlKC9cIi9nLFwiJnF1b3Q7XCIpKydcIic7cmV0dXJuXCI8XCIraS50YWcrJyBjbGFzcz1cIicraS5jbGFzc2VzLmpvaW4oXCIgXCIpKydcIicrbytcIj5cIitpLmNvbnRlbnQrXCI8L1wiK2kudGFnK1wiPlwifSwhZS5kb2N1bWVudClyZXR1cm4gZS5hZGRFdmVudExpc3RlbmVyPyhhLmRpc2FibGVXb3JrZXJNZXNzYWdlSGFuZGxlcnx8ZS5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLChmdW5jdGlvbihuKXt2YXIgdD1KU09OLnBhcnNlKG4uZGF0YSkscj10Lmxhbmd1YWdlLGk9dC5jb2RlLGw9dC5pbW1lZGlhdGVDbG9zZTtlLnBvc3RNZXNzYWdlKGEuaGlnaGxpZ2h0KGksYS5sYW5ndWFnZXNbcl0scikpLGwmJmUuY2xvc2UoKX0pLCExKSxhKTphO3ZhciBnPWEudXRpbC5jdXJyZW50U2NyaXB0KCk7ZnVuY3Rpb24gZigpe2EubWFudWFsfHxhLmhpZ2hsaWdodEFsbCgpfWlmKGcmJihhLmZpbGVuYW1lPWcuc3JjLGcuaGFzQXR0cmlidXRlKFwiZGF0YS1tYW51YWxcIikmJihhLm1hbnVhbD0hMCkpLCFhLm1hbnVhbCl7dmFyIGg9ZG9jdW1lbnQucmVhZHlTdGF0ZTtcImxvYWRpbmdcIj09PWh8fFwiaW50ZXJhY3RpdmVcIj09PWgmJmcmJmcuZGVmZXI/ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIixmKTp3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lP3dpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZik6d2luZG93LnNldFRpbWVvdXQoZiwxNil9cmV0dXJuIGF9KF9zZWxmKTtcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cyYmKG1vZHVsZS5leHBvcnRzPVByaXNtKSxcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsJiYoZ2xvYmFsLlByaXNtPVByaXNtKTtcblByaXNtLmxhbmd1YWdlcy5tYXJrdXA9e2NvbW1lbnQ6e3BhdHRlcm46LzwhLS0oPzooPyE8IS0tKVtcXHNcXFNdKSo/LS0+LyxncmVlZHk6ITB9LHByb2xvZzp7cGF0dGVybjovPFxcP1tcXHNcXFNdKz9cXD8+LyxncmVlZHk6ITB9LGRvY3R5cGU6e3BhdHRlcm46LzwhRE9DVFlQRSg/OltePlwiJ1tcXF1dfFwiW15cIl0qXCJ8J1teJ10qJykrKD86XFxbKD86W148XCInXFxdXXxcIlteXCJdKlwifCdbXiddKid8PCg/ISEtLSl8PCEtLSg/OlteLV18LSg/IS0+KSkqLS0+KSpcXF1cXHMqKT8+L2ksZ3JlZWR5OiEwLGluc2lkZTp7XCJpbnRlcm5hbC1zdWJzZXRcIjp7cGF0dGVybjovKF5bXlxcW10qXFxbKVtcXHNcXFNdKyg/PVxcXT4kKS8sbG9va2JlaGluZDohMCxncmVlZHk6ITAsaW5zaWRlOm51bGx9LHN0cmluZzp7cGF0dGVybjovXCJbXlwiXSpcInwnW14nXSonLyxncmVlZHk6ITB9LHB1bmN0dWF0aW9uOi9ePCF8PiR8W1tcXF1dLyxcImRvY3R5cGUtdGFnXCI6L15ET0NUWVBFL2ksbmFtZTovW15cXHM8PidcIl0rL319LGNkYXRhOntwYXR0ZXJuOi88IVxcW0NEQVRBXFxbW1xcc1xcU10qP1xcXVxcXT4vaSxncmVlZHk6ITB9LHRhZzp7cGF0dGVybjovPFxcLz8oPyFcXGQpW15cXHM+XFwvPSQ8JV0rKD86XFxzKD86XFxzKlteXFxzPlxcLz1dKyg/Olxccyo9XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIj49XSsoPz1bXFxzPl0pKXwoPz1bXFxzLz5dKSkpKyk/XFxzKlxcLz8+LyxncmVlZHk6ITAsaW5zaWRlOnt0YWc6e3BhdHRlcm46L148XFwvP1teXFxzPlxcL10rLyxpbnNpZGU6e3B1bmN0dWF0aW9uOi9ePFxcLz8vLG5hbWVzcGFjZTovXlteXFxzPlxcLzpdKzovfX0sXCJzcGVjaWFsLWF0dHJcIjpbXSxcImF0dHItdmFsdWVcIjp7cGF0dGVybjovPVxccyooPzpcIlteXCJdKlwifCdbXiddKid8W15cXHMnXCI+PV0rKS8saW5zaWRlOntwdW5jdHVhdGlvbjpbe3BhdHRlcm46L149LyxhbGlhczpcImF0dHItZXF1YWxzXCJ9LHtwYXR0ZXJuOi9eKFxccyopW1wiJ118W1wiJ10kLyxsb29rYmVoaW5kOiEwfV19fSxwdW5jdHVhdGlvbjovXFwvPz4vLFwiYXR0ci1uYW1lXCI6e3BhdHRlcm46L1teXFxzPlxcL10rLyxpbnNpZGU6e25hbWVzcGFjZTovXlteXFxzPlxcLzpdKzovfX19fSxlbnRpdHk6W3twYXR0ZXJuOi8mW1xcZGEtel17MSw4fTsvaSxhbGlhczpcIm5hbWVkLWVudGl0eVwifSwvJiN4P1tcXGRhLWZdezEsOH07L2ldfSxQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVbXCJhdHRyLXZhbHVlXCJdLmluc2lkZS5lbnRpdHk9UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC5lbnRpdHksUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC5kb2N0eXBlLmluc2lkZVtcImludGVybmFsLXN1YnNldFwiXS5pbnNpZGU9UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCxQcmlzbS5ob29rcy5hZGQoXCJ3cmFwXCIsKGZ1bmN0aW9uKGEpe1wiZW50aXR5XCI9PT1hLnR5cGUmJihhLmF0dHJpYnV0ZXMudGl0bGU9YS5jb250ZW50LnJlcGxhY2UoLyZhbXA7LyxcIiZcIikpfSkpLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZyxcImFkZElubGluZWRcIix7dmFsdWU6ZnVuY3Rpb24oYSxlKXt2YXIgcz17fTtzW1wibGFuZ3VhZ2UtXCIrZV09e3BhdHRlcm46LyhePCFcXFtDREFUQVxcWylbXFxzXFxTXSs/KD89XFxdXFxdPiQpL2ksbG9va2JlaGluZDohMCxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzW2VdfSxzLmNkYXRhPS9ePCFcXFtDREFUQVxcW3xcXF1cXF0+JC9pO3ZhciB0PXtcImluY2x1ZGVkLWNkYXRhXCI6e3BhdHRlcm46LzwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdPi9pLGluc2lkZTpzfX07dFtcImxhbmd1YWdlLVwiK2VdPXtwYXR0ZXJuOi9bXFxzXFxTXSsvLGluc2lkZTpQcmlzbS5sYW5ndWFnZXNbZV19O3ZhciBuPXt9O25bYV09e3BhdHRlcm46UmVnRXhwKFwiKDxfX1tePl0qPikoPzo8IVxcXFxbQ0RBVEFcXFxcWyg/OlteXFxcXF1dfFxcXFxdKD8hXFxcXF0+KSkqXFxcXF1cXFxcXT58KD8hPCFcXFxcW0NEQVRBXFxcXFspW15dKSo/KD89PC9fXz4pXCIucmVwbGFjZSgvX18vZywoZnVuY3Rpb24oKXtyZXR1cm4gYX0pKSxcImlcIiksbG9va2JlaGluZDohMCxncmVlZHk6ITAsaW5zaWRlOnR9LFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJtYXJrdXBcIixcImNkYXRhXCIsbil9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLFwiYWRkQXR0cmlidXRlXCIse3ZhbHVlOmZ1bmN0aW9uKGEsZSl7UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlW1wic3BlY2lhbC1hdHRyXCJdLnB1c2goe3BhdHRlcm46UmVnRXhwKFwiKF58W1xcXCInXFxcXHNdKSg/OlwiK2ErXCIpXFxcXHMqPVxcXFxzKig/OlxcXCJbXlxcXCJdKlxcXCJ8J1teJ10qJ3xbXlxcXFxzJ1xcXCI+PV0rKD89W1xcXFxzPl0pKVwiLFwiaVwiKSxsb29rYmVoaW5kOiEwLGluc2lkZTp7XCJhdHRyLW5hbWVcIjovXlteXFxzPV0rLyxcImF0dHItdmFsdWVcIjp7cGF0dGVybjovPVtcXHNcXFNdKy8saW5zaWRlOnt2YWx1ZTp7cGF0dGVybjovKF49XFxzKihbXCInXXwoPyFbXCInXSkpKVxcU1tcXHNcXFNdKig/PVxcMiQpLyxsb29rYmVoaW5kOiEwLGFsaWFzOltlLFwibGFuZ3VhZ2UtXCIrZV0saW5zaWRlOlByaXNtLmxhbmd1YWdlc1tlXX0scHVuY3R1YXRpb246W3twYXR0ZXJuOi9ePS8sYWxpYXM6XCJhdHRyLWVxdWFsc1wifSwvXCJ8Jy9dfX19fSl9fSksUHJpc20ubGFuZ3VhZ2VzLmh0bWw9UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCxQcmlzbS5sYW5ndWFnZXMubWF0aG1sPVByaXNtLmxhbmd1YWdlcy5tYXJrdXAsUHJpc20ubGFuZ3VhZ2VzLnN2Zz1QcmlzbS5sYW5ndWFnZXMubWFya3VwLFByaXNtLmxhbmd1YWdlcy54bWw9UHJpc20ubGFuZ3VhZ2VzLmV4dGVuZChcIm1hcmt1cFwiLHt9KSxQcmlzbS5sYW5ndWFnZXMuc3NtbD1QcmlzbS5sYW5ndWFnZXMueG1sLFByaXNtLmxhbmd1YWdlcy5hdG9tPVByaXNtLmxhbmd1YWdlcy54bWwsUHJpc20ubGFuZ3VhZ2VzLnJzcz1QcmlzbS5sYW5ndWFnZXMueG1sO1xuIWZ1bmN0aW9uKHMpe3ZhciBlPS8oPzpcIig/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfFteXCJcXFxcXFxyXFxuXSkqXCJ8Jyg/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfFteJ1xcXFxcXHJcXG5dKSonKS87cy5sYW5ndWFnZXMuY3NzPXtjb21tZW50Oi9cXC9cXCpbXFxzXFxTXSo/XFwqXFwvLyxhdHJ1bGU6e3BhdHRlcm46UmVnRXhwKFwiQFtcXFxcdy1dKD86W147e1xcXFxzXFxcIiddfFxcXFxzKyg/IVxcXFxzKXxcIitlLnNvdXJjZStcIikqPyg/Ojt8KD89XFxcXHMqXFxcXHspKVwiKSxpbnNpZGU6e3J1bGU6L15AW1xcdy1dKy8sXCJzZWxlY3Rvci1mdW5jdGlvbi1hcmd1bWVudFwiOntwYXR0ZXJuOi8oXFxic2VsZWN0b3JcXHMqXFwoXFxzKig/IVtcXHMpXSkpKD86W14oKVxcc118XFxzKyg/IVtcXHMpXSl8XFwoKD86W14oKV18XFwoW14oKV0qXFwpKSpcXCkpKyg/PVxccypcXCkpLyxsb29rYmVoaW5kOiEwLGFsaWFzOlwic2VsZWN0b3JcIn0sa2V5d29yZDp7cGF0dGVybjovKF58W15cXHctXSkoPzphbmR8bm90fG9ubHl8b3IpKD8hW1xcdy1dKS8sbG9va2JlaGluZDohMH19fSx1cmw6e3BhdHRlcm46UmVnRXhwKFwiXFxcXGJ1cmxcXFxcKCg/OlwiK2Uuc291cmNlK1wifCg/OlteXFxcXFxcXFxcXHJcXG4oKVxcXCInXXxcXFxcXFxcXFteXSkqKVxcXFwpXCIsXCJpXCIpLGdyZWVkeTohMCxpbnNpZGU6e2Z1bmN0aW9uOi9edXJsL2kscHVuY3R1YXRpb246L15cXCh8XFwpJC8sc3RyaW5nOntwYXR0ZXJuOlJlZ0V4cChcIl5cIitlLnNvdXJjZStcIiRcIiksYWxpYXM6XCJ1cmxcIn19fSxzZWxlY3Rvcjp7cGF0dGVybjpSZWdFeHAoXCIoXnxbe31cXFxcc10pW157fVxcXFxzXSg/Oltee307XFxcIidcXFxcc118XFxcXHMrKD8hW1xcXFxze10pfFwiK2Uuc291cmNlK1wiKSooPz1cXFxccypcXFxceylcIiksbG9va2JlaGluZDohMH0sc3RyaW5nOntwYXR0ZXJuOmUsZ3JlZWR5OiEwfSxwcm9wZXJ0eTp7cGF0dGVybjovKF58W14tXFx3XFx4QTAtXFx1RkZGRl0pKD8hXFxzKVstX2EtelxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVstXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccyo6KS9pLGxvb2tiZWhpbmQ6ITB9LGltcG9ydGFudDovIWltcG9ydGFudFxcYi9pLGZ1bmN0aW9uOntwYXR0ZXJuOi8oXnxbXi1hLXowLTldKVstYS16MC05XSsoPz1cXCgpL2ksbG9va2JlaGluZDohMH0scHVuY3R1YXRpb246L1soKXt9OzosXS99LHMubGFuZ3VhZ2VzLmNzcy5hdHJ1bGUuaW5zaWRlLnJlc3Q9cy5sYW5ndWFnZXMuY3NzO3ZhciB0PXMubGFuZ3VhZ2VzLm1hcmt1cDt0JiYodC50YWcuYWRkSW5saW5lZChcInN0eWxlXCIsXCJjc3NcIiksdC50YWcuYWRkQXR0cmlidXRlKFwic3R5bGVcIixcImNzc1wiKSl9KFByaXNtKTtcblByaXNtLmxhbmd1YWdlcy5jbGlrZT17Y29tbWVudDpbe3BhdHRlcm46LyhefFteXFxcXF0pXFwvXFwqW1xcc1xcU10qPyg/OlxcKlxcL3wkKS8sbG9va2JlaGluZDohMCxncmVlZHk6ITB9LHtwYXR0ZXJuOi8oXnxbXlxcXFw6XSlcXC9cXC8uKi8sbG9va2JlaGluZDohMCxncmVlZHk6ITB9XSxzdHJpbmc6e3BhdHRlcm46LyhbXCInXSkoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXwoPyFcXDEpW15cXFxcXFxyXFxuXSkqXFwxLyxncmVlZHk6ITB9LFwiY2xhc3MtbmFtZVwiOntwYXR0ZXJuOi8oXFxiKD86Y2xhc3N8ZXh0ZW5kc3xpbXBsZW1lbnRzfGluc3RhbmNlb2Z8aW50ZXJmYWNlfG5ld3x0cmFpdClcXHMrfFxcYmNhdGNoXFxzK1xcKClbXFx3LlxcXFxdKy9pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOntwdW5jdHVhdGlvbjovWy5cXFxcXS99fSxrZXl3b3JkOi9cXGIoPzpicmVha3xjYXRjaHxjb250aW51ZXxkb3xlbHNlfGZpbmFsbHl8Zm9yfGZ1bmN0aW9ufGlmfGlufGluc3RhbmNlb2Z8bmV3fG51bGx8cmV0dXJufHRocm93fHRyeXx3aGlsZSlcXGIvLGJvb2xlYW46L1xcYig/OmZhbHNlfHRydWUpXFxiLyxmdW5jdGlvbjovXFxiXFx3Kyg/PVxcKCkvLG51bWJlcjovXFxiMHhbXFxkYS1mXStcXGJ8KD86XFxiXFxkKyg/OlxcLlxcZCopP3xcXEJcXC5cXGQrKSg/OmVbKy1dP1xcZCspPy9pLG9wZXJhdG9yOi9bPD5dPT98WyE9XT0/PT98LS0/fFxcK1xcKz98JiY/fFxcfFxcfD98Wz8qL35eJV0vLHB1bmN0dWF0aW9uOi9be31bXFxdOygpLC46XS99O1xuUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQ9UHJpc20ubGFuZ3VhZ2VzLmV4dGVuZChcImNsaWtlXCIse1wiY2xhc3MtbmFtZVwiOltQcmlzbS5sYW5ndWFnZXMuY2xpa2VbXCJjbGFzcy1uYW1lXCJdLHtwYXR0ZXJuOi8oXnxbXiRcXHdcXHhBMC1cXHVGRkZGXSkoPyFcXHMpW18kQS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFwuKD86Y29uc3RydWN0b3J8cHJvdG90eXBlKSkvLGxvb2tiZWhpbmQ6ITB9XSxrZXl3b3JkOlt7cGF0dGVybjovKCg/Ol58XFx9KVxccyopY2F0Y2hcXGIvLGxvb2tiZWhpbmQ6ITB9LHtwYXR0ZXJuOi8oXnxbXi5dfFxcLlxcLlxcLlxccyopXFxiKD86YXN8YXNzZXJ0KD89XFxzKlxceyl8YXN5bmMoPz1cXHMqKD86ZnVuY3Rpb25cXGJ8XFwofFskXFx3XFx4QTAtXFx1RkZGRl18JCkpfGF3YWl0fGJyZWFrfGNhc2V8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVidWdnZXJ8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZpbmFsbHkoPz1cXHMqKD86XFx7fCQpKXxmb3J8ZnJvbSg/PVxccyooPzpbJ1wiXXwkKSl8ZnVuY3Rpb258KD86Z2V0fHNldCkoPz1cXHMqKD86WyNcXFskXFx3XFx4QTAtXFx1RkZGRl18JCkpfGlmfGltcGxlbWVudHN8aW1wb3J0fGlufGluc3RhbmNlb2Z8aW50ZXJmYWNlfGxldHxuZXd8bnVsbHxvZnxwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c3RhdGljfHN1cGVyfHN3aXRjaHx0aGlzfHRocm93fHRyeXx0eXBlb2Z8dW5kZWZpbmVkfHZhcnx2b2lkfHdoaWxlfHdpdGh8eWllbGQpXFxiLyxsb29rYmVoaW5kOiEwfV0sZnVuY3Rpb246LyM/KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccyooPzpcXC5cXHMqKD86YXBwbHl8YmluZHxjYWxsKVxccyopP1xcKCkvLG51bWJlcjp7cGF0dGVybjpSZWdFeHAoXCIoXnxbXlxcXFx3JF0pKD86TmFOfEluZmluaXR5fDBbYkJdWzAxXSsoPzpfWzAxXSspKm4/fDBbb09dWzAtN10rKD86X1swLTddKykqbj98MFt4WF1bXFxcXGRBLUZhLWZdKyg/Ol9bXFxcXGRBLUZhLWZdKykqbj98XFxcXGQrKD86X1xcXFxkKykqbnwoPzpcXFxcZCsoPzpfXFxcXGQrKSooPzpcXFxcLig/OlxcXFxkKyg/Ol9cXFxcZCspKik/KT98XFxcXC5cXFxcZCsoPzpfXFxcXGQrKSopKD86W0VlXVsrLV0/XFxcXGQrKD86X1xcXFxkKykqKT8pKD8hW1xcXFx3JF0pXCIpLGxvb2tiZWhpbmQ6ITB9LG9wZXJhdG9yOi8tLXxcXCtcXCt8XFwqXFwqPT98PT58JiY9P3xcXHxcXHw9P3xbIT1dPT18PDw9P3w+Pj4/PT98Wy0rKi8lJnxeIT08Pl09P3xcXC57M318XFw/XFw/PT98XFw/XFwuP3xbfjpdL30pLFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0W1wiY2xhc3MtbmFtZVwiXVswXS5wYXR0ZXJuPS8oXFxiKD86Y2xhc3N8ZXh0ZW5kc3xpbXBsZW1lbnRzfGluc3RhbmNlb2Z8aW50ZXJmYWNlfG5ldylcXHMrKVtcXHcuXFxcXF0rLyxQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiamF2YXNjcmlwdFwiLFwia2V5d29yZFwiLHtyZWdleDp7cGF0dGVybjpSZWdFeHAoXCIoKD86XnxbXiRcXFxcd1xcXFx4QTAtXFxcXHVGRkZGLlxcXCInXFxcXF0pXFxcXHNdfFxcXFxiKD86cmV0dXJufHlpZWxkKSlcXFxccyopLyg/Oig/OlxcXFxbKD86W15cXFxcXVxcXFxcXFxcXFxyXFxuXXxcXFxcXFxcXC4pKlxcXFxdfFxcXFxcXFxcLnxbXi9cXFxcXFxcXFxcXFxbXFxyXFxuXSkrL1tkZ2lteXVzXXswLDd9fCg/OlxcXFxbKD86W15bXFxcXF1cXFxcXFxcXFxcclxcbl18XFxcXFxcXFwufFxcXFxbKD86W15bXFxcXF1cXFxcXFxcXFxcclxcbl18XFxcXFxcXFwufFxcXFxbKD86W15bXFxcXF1cXFxcXFxcXFxcclxcbl18XFxcXFxcXFwuKSpcXFxcXSkqXFxcXF0pKlxcXFxdfFxcXFxcXFxcLnxbXi9cXFxcXFxcXFxcXFxbXFxyXFxuXSkrL1tkZ2lteXVzXXswLDd9dltkZ2lteXVzXXswLDd9KSg/PSg/OlxcXFxzfC9cXFxcKig/OlteKl18XFxcXCooPyEvKSkqXFxcXCovKSooPzokfFtcXHJcXG4sLjs6fSlcXFxcXV18Ly8pKVwiKSxsb29rYmVoaW5kOiEwLGdyZWVkeTohMCxpbnNpZGU6e1wicmVnZXgtc291cmNlXCI6e3BhdHRlcm46L14oXFwvKVtcXHNcXFNdKyg/PVxcL1thLXpdKiQpLyxsb29rYmVoaW5kOiEwLGFsaWFzOlwibGFuZ3VhZ2UtcmVnZXhcIixpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzLnJlZ2V4fSxcInJlZ2V4LWRlbGltaXRlclwiOi9eXFwvfFxcLyQvLFwicmVnZXgtZmxhZ3NcIjovXlthLXpdKyQvfX0sXCJmdW5jdGlvbi12YXJpYWJsZVwiOntwYXR0ZXJuOi8jPyg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqWz06XVxccyooPzphc3luY1xccyopPyg/OlxcYmZ1bmN0aW9uXFxifCg/OlxcKCg/OlteKCldfFxcKFteKCldKlxcKSkqXFwpfCg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSopXFxzKj0+KSkvLGFsaWFzOlwiZnVuY3Rpb25cIn0scGFyYW1ldGVyOlt7cGF0dGVybjovKGZ1bmN0aW9uKD86XFxzKyg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSopP1xccypcXChcXHMqKSg/IVxccykoPzpbXigpXFxzXXxcXHMrKD8hW1xccyldKXxcXChbXigpXSpcXCkpKyg/PVxccypcXCkpLyxsb29rYmVoaW5kOiEwLGluc2lkZTpQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdH0se3BhdHRlcm46LyhefFteJFxcd1xceEEwLVxcdUZGRkZdKSg/IVxccylbXyRhLXpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqPT4pL2ksbG9va2JlaGluZDohMCxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHR9LHtwYXR0ZXJuOi8oXFwoXFxzKikoPyFcXHMpKD86W14oKVxcc118XFxzKyg/IVtcXHMpXSl8XFwoW14oKV0qXFwpKSsoPz1cXHMqXFwpXFxzKj0+KS8sbG9va2JlaGluZDohMCxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHR9LHtwYXR0ZXJuOi8oKD86XFxifFxcc3xeKSg/ISg/OmFzfGFzeW5jfGF3YWl0fGJyZWFrfGNhc2V8Y2F0Y2h8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVidWdnZXJ8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZpbmFsbHl8Zm9yfGZyb218ZnVuY3Rpb258Z2V0fGlmfGltcGxlbWVudHN8aW1wb3J0fGlufGluc3RhbmNlb2Z8aW50ZXJmYWNlfGxldHxuZXd8bnVsbHxvZnxwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c2V0fHN0YXRpY3xzdXBlcnxzd2l0Y2h8dGhpc3x0aHJvd3x0cnl8dHlwZW9mfHVuZGVmaW5lZHx2YXJ8dm9pZHx3aGlsZXx3aXRofHlpZWxkKSg/IVskXFx3XFx4QTAtXFx1RkZGRl0pKSg/Oig/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSpcXHMqKVxcKFxccyp8XFxdXFxzKlxcKFxccyopKD8hXFxzKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKFteKCldKlxcKSkrKD89XFxzKlxcKVxccypcXHspLyxsb29rYmVoaW5kOiEwLGluc2lkZTpQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdH1dLGNvbnN0YW50Oi9cXGJbQS1aXSg/OltBLVpfXXxcXGR4PykqXFxiL30pLFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJqYXZhc2NyaXB0XCIsXCJzdHJpbmdcIix7aGFzaGJhbmc6e3BhdHRlcm46L14jIS4qLyxncmVlZHk6ITAsYWxpYXM6XCJjb21tZW50XCJ9LFwidGVtcGxhdGUtc3RyaW5nXCI6e3BhdHRlcm46L2AoPzpcXFxcW1xcc1xcU118XFwkXFx7KD86W157fV18XFx7KD86W157fV18XFx7W159XSpcXH0pKlxcfSkrXFx9fCg/IVxcJFxceylbXlxcXFxgXSkqYC8sZ3JlZWR5OiEwLGluc2lkZTp7XCJ0ZW1wbGF0ZS1wdW5jdHVhdGlvblwiOntwYXR0ZXJuOi9eYHxgJC8sYWxpYXM6XCJzdHJpbmdcIn0saW50ZXJwb2xhdGlvbjp7cGF0dGVybjovKCg/Ol58W15cXFxcXSkoPzpcXFxcezJ9KSopXFwkXFx7KD86W157fV18XFx7KD86W157fV18XFx7W159XSpcXH0pKlxcfSkrXFx9Lyxsb29rYmVoaW5kOiEwLGluc2lkZTp7XCJpbnRlcnBvbGF0aW9uLXB1bmN0dWF0aW9uXCI6e3BhdHRlcm46L15cXCRcXHt8XFx9JC8sYWxpYXM6XCJwdW5jdHVhdGlvblwifSxyZXN0OlByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0fX0sc3RyaW5nOi9bXFxzXFxTXSsvfX0sXCJzdHJpbmctcHJvcGVydHlcIjp7cGF0dGVybjovKCg/Ol58Wyx7XSlbIFxcdF0qKShbXCInXSkoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXwoPyFcXDIpW15cXFxcXFxyXFxuXSkqXFwyKD89XFxzKjopL20sbG9va2JlaGluZDohMCxncmVlZHk6ITAsYWxpYXM6XCJwcm9wZXJ0eVwifX0pLFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJqYXZhc2NyaXB0XCIsXCJvcGVyYXRvclwiLHtcImxpdGVyYWwtcHJvcGVydHlcIjp7cGF0dGVybjovKCg/Ol58Wyx7XSlbIFxcdF0qKSg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqOikvbSxsb29rYmVoaW5kOiEwLGFsaWFzOlwicHJvcGVydHlcIn19KSxQcmlzbS5sYW5ndWFnZXMubWFya3VwJiYoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuYWRkSW5saW5lZChcInNjcmlwdFwiLFwiamF2YXNjcmlwdFwiKSxQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5hZGRBdHRyaWJ1dGUoXCJvbig/OmFib3J0fGJsdXJ8Y2hhbmdlfGNsaWNrfGNvbXBvc2l0aW9uKD86ZW5kfHN0YXJ0fHVwZGF0ZSl8ZGJsY2xpY2t8ZXJyb3J8Zm9jdXMoPzppbnxvdXQpP3xrZXkoPzpkb3dufHVwKXxsb2FkfG1vdXNlKD86ZG93bnxlbnRlcnxsZWF2ZXxtb3ZlfG91dHxvdmVyfHVwKXxyZXNldHxyZXNpemV8c2Nyb2xsfHNlbGVjdHxzbG90Y2hhbmdlfHN1Ym1pdHx1bmxvYWR8d2hlZWwpXCIsXCJqYXZhc2NyaXB0XCIpKSxQcmlzbS5sYW5ndWFnZXMuanM9UHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQ7XG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFsZXhhJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdChlbHQsIGh0dHApIHtcblx0XHRjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpXG5cblx0XHQvL2NvbnNvbGUubG9nKCdoYXNoJywgaGFzaClcblx0XHRjb25zdCBwYXJhbXMgPSAkJC51cmwucGFyc2VVcmxQYXJhbXMoaGFzaClcblx0XHQvL2NvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG5cdFx0aHR0cC5wb3N0KCcvYXBpL2FsZXhhL2F1dGgnLCBwYXJhbXMpLnRoZW4oKCkgPT4ge1xuXHRcdFx0d2luZG93LmNsb3NlKClcblx0XHR9KVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBUYWInLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBVcmw6ICdhYm91dDpibGFuaydcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmM6IGFwcFVybH1cXFwiIGJuLWJpbmQ9XFxcImlmcmFtZVxcXCIgYm4tZXZlbnQ9XFxcImxvYWQ6IG9uRnJhbWVMb2FkZWRcXFwiPjwvaWZyYW1lPlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXHRcdGNvbnN0IHthcHBVcmx9ID0gdGhpcy5wcm9wcztcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwVXJsXHRcdFx0XHRcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GcmFtZUxvYWRlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25GcmFtZUxvYWRlZCcpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFwcEV4aXQgPSBmdW5jdGlvbigpICB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcEV4aXQnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBFeGl0ID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cmV0dXJuIHJvb3RQYWdlLm9uQXBwRXhpdCgpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcdFx0XG5cdFx0fVx0XG5cblx0XHR0aGlzLm9uQXBwU3VzcGVuZCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwU3VzcGVuZCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFN1c3BlbmQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMub25BcHBSZXN1bWUgPSBmdW5jdGlvbigpICB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcFJlc3VtZScsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcFJlc3VtZSA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwUmVzdW1lKClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnNldEFwcFVybCA9IGZ1bmN0aW9uKGFwcFVybCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gc2V0QXBwVXJsJywgYXBwVXJsKVxuXHRcdFx0Y3RybC5zZXREYXRhKHthcHBVcmw6IGFwcFVybCArICcmZGF0ZT0nICsgRGF0ZS5ub3coKX0pXG5cdFx0fVxuXHR9XG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0YXBwczogW10sXG5cdFx0c2hvd0FjdGl2YXRlZDogZmFsc2UsXG5cdFx0aXRlbXM6IG51bGxcblx0fSxcblxuXHQkaWZhY2U6ICdzZXREYXRhKGRhdGEpJyxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImFwcHNcXFwiIFxcblx0XHRibi1pdGVyPVxcXCJhcHBcXFwiIFxcblx0XHRjbGFzcz1cXFwibWFpblxcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay50aWxlOiBvblRpbGVDbGljaywgY29udGV4dG1lbnVjaGFuZ2UudGlsZTogb25UaWxlQ29udGV4dE1lbnVcXFwiXFxuXHRcdD5cdFx0XHRcXG5cdFx0PGRpdiBibi1hdHRyPVxcXCJjbGFzczFcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogZ2V0SXRlbXN9XFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJhcnJvdy1yaWdodFxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPjwvZGl2Plxcblx0XHRcdDxkaXYgYm4tc2hvdz1cXFwic2hvdzJcXFwiIHN0eWxlPVxcXCJtYXJnaW4tYm90dG9tOiA1cHg7XFxcIj5cXG5cdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogJHNjb3BlLmFwcC5wcm9wcy5pY29uQ2xzfVxcXCI+PC9pPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgYm4taWY9XFxcInNob3czXFxcIj5cXG5cdFx0XHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogZ2V0SWNvblVybH1cXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS5hcHAucHJvcHMudGl0bGVcXFwiIGJuLXNob3c9XFxcIiFzaG93M1xcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQpIHtcblxuXHRcdGNvbnN0IHsgYXBwcywgc2hvd0FjdGl2YXRlZCwgaXRlbXMgfSA9IHRoaXMucHJvcHNcblx0XHRjb25zb2xlLmxvZygnYXBwcycsIGFwcHMpXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGdldEl0ZW1zOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXRJdGVtcycsIHNjb3BlLmFwcClcblx0XHRcdFx0XHRyZXR1cm4gKHR5cGVvZiBpdGVtcyA9PSAnZnVuY3Rpb24nKSA/IGl0ZW1zKHNjb3BlLmFwcCkgOiBpdGVtc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhcHBzLFxuXHRcdFx0XHRzaG93QWN0aXZhdGVkLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2hvd0FjdGl2YXRlZCAmJiBzY29wZS5hcHAuYWN0aXZhdGVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3Qge3RpdGxlLCBjb2xvckNsc30gPSBzY29wZS5hcHAucHJvcHNcblx0XHRcdFx0XHRjb25zdCByZXQgPSB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdGNsYXNzOiAndGlsZSB3My1idG4nXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNvbG9yQ2xzLnN0YXJ0c1dpdGgoJyMnKSkge1xuXHRcdFx0XHRcdFx0cmV0LnN0eWxlID0gYGJhY2tncm91bmQtY29sb3I6ICR7Y29sb3JDbHN9YFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHJldC5jbGFzcyArPSAnICcgKyBjb2xvckNsc1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gcmV0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIHNjb3BlLmFwcC5wcm9wcy5pY29uQ2xzID09ICdzdHJpbmcnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3czOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIHNjb3BlLmFwcC5wcm9wcy5pY29uVXJsID09ICdzdHJpbmcnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEljb25Vcmwoc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCB7IGFwcE5hbWUsIHByb3BzIH0gPSBzY29wZS5hcHBcblx0XHRcdFx0XHRyZXR1cm4gYC93ZWJhcHBzLyR7YXBwTmFtZX0vYXNzZXRzLyR7cHJvcHMuaWNvblVybH1gXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGlsZUNsaWNrJywgJCh0aGlzKS5kYXRhKCdpdGVtJykpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2FwcGNsaWNrJywgY3RybC5tb2RlbC5hcHBzW2lkeF0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGlsZUNvbnRleHRNZW51OiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gJC5leHRlbmQoeyBjbWQgfSwgY3RybC5tb2RlbC5hcHBzW2lkeF0pXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2FwcGNvbnRleHRtZW51JywgaW5mbylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRhcHBzOiBkYXRhLmFwcHMuZmlsdGVyKChhKSA9PiBhLnByb3BzLnZpc2libGUgIT0gZmFsc2UgJiYgYS5hcHBOYW1lICE9ICd0ZW1wbGF0ZScpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYHNldERhdGEoZGF0YSlgLFxuXHQkZXZlbnRzOiAnYXBwY2xpY2s7YXBwY29udGV4dG1lbnUnXG59KTtcblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hZGRDb250YWN0UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCIgYm4tZm9ybT1cXFwiaW5mb1xcXCI+XFxuXFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuYWNjb3JkaW9uXFxcIiBkYXRhLWhlaWdodC1zdHlsZT1cXFwiZmlsbFxcXCI+XFxuXFxuXFxuXHRcdDxkaXYgdGl0bGU9XFxcIk5hbWUgJiBFbWFpbFxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZ2VuZGVyXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5HZW5kZXI6PC9sYWJlbD5cXG5cdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5yYWRpb2dyb3VwXFxcIiBuYW1lPVxcXCJnZW5kZXJcXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHRcdFx0PGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiB2YWx1ZT1cXFwibWFsZVxcXCI+XFxuXHRcdFx0XHRcdFx0PGxhYmVsPk1hbGU8L2xhYmVsPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcImZlbWFsZVxcXCI+XFxuXHRcdFx0XHRcdFx0PGxhYmVsPkZlbWFsZTwvbGFiZWw+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+TmFtZTo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5FbWFpbDo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJCaXJ0aGRheVxcXCI+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkJpcnRoZGF5PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5kYXRlcGlja2VyXFxcIiBcXG5cdFx0XHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0XHRcdGNoYW5nZVllYXI6IHRydWUsXFxuXHRcdFx0XHRcdFx0eWVhclJhbmdlOiBcXCctMTAwOiswXFwnXFxuXHRcdFx0XHRcdH1cXFwiXFxuXHRcdFx0XHRcdG5hbWU9XFxcImJpcnRoZGF5XFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImJpcnRoTm90aWZcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkFjdGl2YXRlIGJpcnRoZGF5IE5vdGlmaWNhdGlvbjwvbGFiZWw+XFxuXHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuZmxpcHN3aXRjaFxcXCIgbmFtZT1cXFwiYmlydGhkYXlOb3RpZlxcXCI+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJQaG9uZXNcXFwiPlxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5Ib21lIFBob25lOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IG5hbWU9XFxcInBob25lXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0cGhvbmVcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5DZWxsIFBob25lOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IG5hbWU9XFxcIm1vYmlsZVBob25lXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0cGhvbmVcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJBZGRyZXNzXFxcIj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+QWRkcmVzczo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJhZGRyZXNzXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5Qb3N0YWwgQ29kZTo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIG5hbWU9XFxcInBvc3RhbENvZGVcXFwiIG1heGxlbmd0aD1cXFwiNVxcXCIgYm4tZXZlbnQ9XFxcImJsdXI6IG9uUG9zdGFsQ29kZUxvc3RGb2N1c1xcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2Plxcblx0XHRcdFx0PGxhYmVsPkNpdHk6PC9sYWJlbD5cXG5cdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBjaXRpZXN9XFxcIiBuYW1lPVxcXCJjaXR5XFxcIiBibi12YWw9XFxcImNpdHlcXFwiPjwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdDwvZGl2Plxcblxcblx0PC9kaXY+XFxuXFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIj5cXG48L2Zvcm0+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5jb250YWN0cycsICdicmVpemJvdC5jaXRpZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdGRhdGE6IHt9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQ29udGFjdC5JbnRlcmZhY2V9IGNvbnRhY3RzU3J2IFxuXHQgXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGNvbnRhY3RzU3J2LCBjaXRpZXNTcnYpIHtcblxuXHRcdGNvbnN0IGluZm8gPSB0aGlzLnByb3BzLmluZm8gfHwge31cblx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRjb25zdCBpZCA9IGluZm8uX2lkXG5cdFx0Y29uc3QgeyBwb3N0YWxDb2RlLCBjaXR5IH0gPSBpbmZvXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGluZm8sXG5cdFx0XHRcdGNpdGllczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZSh7IGlkLCBkYXRhIH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Qb3N0YWxDb2RlTG9zdEZvY3VzOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Qb3N0YWxDb2RlTG9zdEZvY3VzJywgdGhpcy52YWx1ZSlcblx0XHRcdFx0XHRjb25zdCBjaXRpZXMgPSBhd2FpdCBjaXRpZXNTcnYuZ2V0Q2l0ZXNGcm9tUG9zdGFsQ29kZSh0aGlzLnZhbHVlKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGNpdGllcyB9KVxuXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBsb2FkKCkge1xuXHRcdFx0Y29uc3QgY2l0aWVzID0gYXdhaXQgY2l0aWVzU3J2LmdldENpdGVzRnJvbVBvc3RhbENvZGUocG9zdGFsQ29kZSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGNpdGllcyB9KVxuXHRcdFx0aWYgKGNpdHkgJiYgY2l0eSAhPSAnJykge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBjaXR5IH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHBvc3RhbENvZGUgJiYgcG9zdGFsQ29kZSAhPSAnJykge1xuXHRcdFx0bG9hZCgpXG5cdFx0fVxuXG5cblx0XHR0aGlzLmFkZENvbnRhY3QgPSBhc3luYyBmdW5jdGlvbiAoaW5mbykge1xuXHRcdFx0YXdhaXQgY29udGFjdHNTcnYuYWRkQ29udGFjdChpbmZvKVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlQ29udGFjdEluZm8gPSBhc3luYyBmdW5jdGlvbiAoaWQsIGluZm8pIHtcblx0XHRcdGF3YWl0IGNvbnRhY3RzU3J2LnVwZGF0ZUNvbnRhY3RJbmZvKGlkLCBpbmZvKVxuXHRcdH1cblxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YWRkOiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdBcHBseScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmNvbnRhY3RzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuY29udGFjdHMnXSxcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdGhhc1NlYXJjaGJhcjogZmFsc2UsXG5cdFx0Y29udGV4dE1lbnU6IHt9XG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5zZWFyY2hiYXJcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcInNlYXJjaGJhcnN1Ym1pdDogb25TZWFyY2hcXFwiIFxcblx0Ym4tc2hvdz1cXFwiaGFzU2VhcmNoYmFyXFxcIlxcblx0Ym4tZGF0YT1cXFwie3JlcXVpcmVkOiBmYWxzZX1cXFwiXFxuXHQ+PC9kaXY+XFxuPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGNvbnRhY3RzPC9wPlxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlLnczLWJhcjogb25JdGVtQ29udGV4dE1lbnUsIGNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLmlucHV0OiBvbklucHV0Q2xpY2tcXFwiXFxuXHRcdGJuLWVhY2g9XFxcImdldENvbnRhY3RzXFxcIlxcblx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBjb250ZXh0TWVudX1cXFwiPlxcblxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiA+XFxuXHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIj48L3N0cm9uZz48YnI+XFxuXHRcdFx0XHQ8ZGl2IGJuLXRleHQ9XFxcImdldEFkZHJlc3NcXFwiPjwvZGl2Plxcblx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCIkc2NvcGUuJGkuZW1haWxcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGUgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5lbWFpbFxcXCI+PC9zcGFuPlx0XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiJHNjb3BlLiRpLm1vYmlsZVBob25lXFxcIj5cXG5cdFx0XHRcdFx0PGEgYm4tYXR0cj1cXFwie2hyZWYgOiBnZXRDZWxsUGhvbmV9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbW9iaWxlLWFsdCB3My10ZXh0LWJsdWVcXFwiPjwvaT48L2E+XFxuXHRcdFx0XHRcdDxpbnB1dCBjbGFzcz1cXFwiaW5wdXRcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRwaG9uZVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkubW9iaWxlUGhvbmVcXFwiIHJlYWRvbmx5Plx0XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiJHNjb3BlLiRpLnBob25lXFxcIj5cXG5cdFx0XHRcdFx0PGEgYm4tYXR0cj1cXFwie2hyZWYgOiBnZXRIb21lUGhvbmV9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtaG9tZSB3My10ZXh0LWJsdWVcXFwiPjwvaT48L2E+XFxuXHRcdFx0XHRcdDxpbnB1dCBjbGFzcz1cXFwiaW5wdXRcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRwaG9uZVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkucGhvbmVcXFwiIHJlYWRvbmx5Plx0XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cXG5cdDwvdWw+XHRcdFxcblxcbjwvZGl2PlxcblwiLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Db250YWN0LkludGVyZmFjZX0gY29udGFjdHNTcnYgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBjb250YWN0c1Nydikge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Y29uc3QgeyBzaG93U2VsZWN0aW9uLCBjb250ZXh0TWVudSwgaGFzU2VhcmNoYmFyIH0gPSB0aGlzLnByb3BzXG5cdFx0Ly9jb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdFx0c2hvd1NlbGVjdGlvbixcblx0XHRcdFx0aGFzU2VhcmNoYmFyLFxuXHRcdFx0XHRmaWx0ZXI6ICcnLFxuXHRcdFx0XHRjb250ZXh0TWVudSxcblx0XHRcdFx0Z2V0Q29udGFjdHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0aGlzLmZpbHRlciAhPSAnJykge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnT0snLCB0aGlzLmZpbHRlcilcblx0XHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXFx3KiR7dGhpcy5maWx0ZXJ9XFx3KmAsICdpJylcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmZpbHRlcigoYykgPT4gcmVnZXgudGVzdChjLm5hbWUpKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhpcy5zaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5maWx0ZXIoKGMpID0+IGMuZW1haWwgJiYgYy5lbWFpbCAhPSAnJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHNcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0Q2VsbFBob25lOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAndGVsOicgKyBzY29wZS4kaS5tb2JpbGVQaG9uZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRIb21lUGhvbmU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuICd0ZWw6JyArIHNjb3BlLiRpLnBob25lXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEFkZHJlc3M6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3Qge2FkZHJlc3MsIGNpdHksIHBvc3RhbENvZGV9ID0gc2NvcGUuJGlcblx0XHRcdFx0XHRyZXR1cm4gYCR7YWRkcmVzcyB8fCAnJ30gJHtwb3N0YWxDb2RlIHx8ICcnfSAke2NpdHkgfHwgJyd9YFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VhcmNoOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VhcmNoJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2ZpbHRlcjogZGF0YS52YWx1ZX0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnB1dENsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbklucHV0Q2xpY2snKVxuXHRcdFx0XHRcdCQodGhpcykuY2xvc2VzdCgnZGl2JykuZmluZCgnYScpLmdldCgwKS5jbGljaygpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUNvbnRleHRNZW51OiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRDb250YWN0cygpW2lkeF1cblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIGluZm8pXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2NvbnRhY3Rjb250ZXh0bWVudScsIHsgY21kLCBpbmZvIH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQvLyQodGhpcykuc2libGluZ3MoJy53My1ibHVlJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS50b2dnbGVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZCgpIHtcblx0XHRcdGNvbnN0IGNvbnRhY3RzID0gYXdhaXQgY29udGFjdHNTcnYuZ2V0Q29udGFjdHMoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnY29udGFjdHMnLCBjb250YWN0cylcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGNvbnRhY3RzIH0pXG5cdFx0fVxuXG5cblx0XHRsb2FkKClcblxuXHRcdHRoaXMudXBkYXRlID0gbG9hZFxuXG5cdFx0dGhpcy5yZW1vdmVDb250YWN0ID0gYXN5bmMgZnVuY3Rpb24oaWQpIHtcblx0XHRcdGF3YWl0IGNvbnRhY3RzU3J2LnJlbW92ZUNvbnRhY3QoaWQpXG5cdFx0XHRhd2FpdCBsb2FkKClcblx0XHR9XG5cblx0XHR0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnN0IHJldCA9IFtdXG5cdFx0XHRlbHQuZmluZCgnbGkudzMtYmx1ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0cmV0LnB1c2goY3RybC5tb2RlbC5nZXRDb250YWN0cygpW2lkeF0pXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3JldCcsIHJldClcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0fSxcblx0JGlmYWNlOiBgXG5cdFx0Z2V0U2VsZWN0aW9uKCk6IFtDb250YWN0SW5mb11cblx0XHRyZW1vdmVDb250YWN0KGlkKVxuXHRgLFxuXHQkZXZlbnRzOiAnY29udGFjdGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaHRtbGVkaXRvcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWV2ZW50PVxcXCJjbGljay5jbWQ6IG9uQ29tbWFuZFxcXCIgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJjbWQgdzMtYnV0dG9uXFxcIiAgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmFzIGZhLW1pY3JvcGhvbmVcXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJUb29nbGUgTWljcm9cXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Ub29nbGVNaWNyb1xcXCIgXFxuXHRcdFx0Ym4tc2hvdz1cXFwic3BlZWNoUmVjb0F2YWlsYWJsZVxcXCI+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcImNtZCB3My1idXR0b25cXFwiICBibi1pY29uPVxcXCJmYXMgZmEtcmVtb3ZlLWZvcm1hdFxcXCIgdGl0bGU9XFxcIlJlbW92ZSBGb3JtYXRcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25SZW1vdmVGb3JtYXRcXFwiPjwvYnV0dG9uPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwiY21kIHczLWJ1dHRvblxcXCIgZGF0YS1jbWQ9XFxcImJvbGRcXFwiIHRpdGxlPVxcXCJCb2xkXFxcIiBibi1pY29uPVxcXCJmYSBmYS1ib2xkXFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwiY21kIHczLWJ1dHRvblxcXCIgZGF0YS1jbWQ9XFxcIml0YWxpY1xcXCIgdGl0bGU9XFxcIkl0YWxpY1xcXCIgYm4taWNvbj1cXFwiZmEgZmEtaXRhbGljXFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwiY21kIHczLWJ1dHRvblxcXCIgZGF0YS1jbWQ9XFxcInVuZGVybGluZVxcXCIgdGl0bGU9XFxcIlVuZGVybGluZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtdW5kZXJsaW5lXFxcIj48L2J1dHRvbj5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9zcGFuPlxcblxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkZvbnROYW1lQ2hhbmdlXFxcIlxcblx0XHRcdGJuLWljb249XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIlxcblx0XHRcdHRpdGxlPVxcXCJGb250IE5hbWVcXFwiIFxcblx0XHRcdGJuLWh0bWw9XFxcImdldEZvbnROYW1lXFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IGZvbnROYW1lSXRlbXNcXG5cdFx0XHR9XFxcIj5cXG5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkZvbnRTaXplQ2hhbmdlXFxcIlxcblx0XHRcdGJuLWljb249XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIlxcblx0XHRcdHRpdGxlPVxcXCJGb250IFNpemVcXFwiIGJuLWh0bWw9XFxcImdldEZvbnRTaXplXFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IGZvbnRTaXplSXRlbXNcXG5cdFx0XHR9XFxcIj5cXG5cXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbW1hbmRcXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJUaXRsZVxcXCJcXG5cdFx0XHRibi1pY29uPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCJcXG5cdFx0XHRkYXRhLWNtZD1cXFwiZm9ybWF0QmxvY2tcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczogaGVhZGluZ0l0ZW1zXFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0wqcmbmJzcDtcXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkFsaWdubWVudFxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29tbWFuZFxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGp1c3RpZnlMZWZ0OiB7bmFtZTogXFwnTGVmdFxcJywgaWNvbjogXFwnZmFzIGZhLWFsaWduLWxlZnRcXCd9LFxcblx0XHRcdFx0XHRqdXN0aWZ5Q2VudGVyOiB7bmFtZTogXFwnQ2VudGVyXFwnLCBpY29uOiBcXCdmYXMgZmEtYWxpZ24tY2VudGVyXFwnfSxcXG5cdFx0XHRcdFx0anVzdGlmeVJpZ2h0OiB7bmFtZTogXFwnUmlnaHRcXCcsIGljb246IFxcJ2ZhcyBmYS1hbGlnbi1yaWdodFxcJ31cXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWFsaWduLWxlZnRcXFwiPjwvaT5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIlRleHQgY29sb3JcXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdGl0ZW1zOiBjb2xvckl0ZW1zLFxcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJ1xcblx0XHRcdH1cXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db2xvck1lbnVDaGFuZ2VcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtcGFpbnQtYnJ1c2hcXFwiIGJuLXN0eWxlPVxcXCJ7Y29sb3J9XFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiSW5kZW50XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIlxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbW1hbmRcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0XHRpbmRlbnQ6IHtuYW1lOiBcXCdJbmRlbnRcXCcsIGljb246IFxcJ2ZhcyBmYS1pbmRlbnRcXCd9LFxcblx0XHRcdFx0XHRcdG91dGRlbnQ6IHtuYW1lOiBcXCdPdXRkZW50XFwnLCBpY29uOiBcXCdmYXMgZmEtb3V0ZGVudFxcJ31cXG5cdFx0XHRcdFx0fVxcblx0XHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1pbmRlbnRcXFwiPjwvaT5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkxpc3RcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db21tYW5kXFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRpbnNlcnRVbm9yZGVyZWRMaXN0OiB7bmFtZTogXFwnVW5vcmRlcmVkXFwnLCBpY29uOiBcXCdmYXMgZmEtbGlzdC11bFxcJ30sXFxuXHRcdFx0XHRcdGluc2VydE9yZGVyZWRMaXN0OiB7bmFtZTogXFwnT3JkZXJlZFxcJywgaWNvbjogXFwnZmFzIGZhLWxpc3Qtb2xcXCd9XFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1saXN0LW9sXFxcIj48L2k+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIGNtZFxcXCIgdGl0bGU9XFxcIkhvcml6b250YWwgUnVsZVxcXCIgZGF0YS1jbWQ9XFxcImluc2VydEhvcml6b250YWxSdWxlXFxcImJuLWljb249XFxcImZhcyBmYS1taW51c1xcXCI+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkluc2VydCBMaW5rXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ3JlYXRlTGlua1xcXCIgYm4taWNvbj1cXFwiZmFzIGZhLWxpbmtcXFwiPjwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiSW5zZXJ0IGltYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW5zZXJ0SW1hZ2VcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWljb249XFxcImZhIGZhLWltYWdlXFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiSW5zZXJ0IFRhYmxlIGZyb20gc2VsZWN0aW9uXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIlxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25JbnNlcnRUYWJsZVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGNvbnZlcnRUb1RhYmxlOiB7bmFtZTogXFwnQ29udmVydCB0byB0YWJsZVxcJ30sXFxuXHRcdFx0XHRcdGNvbnZlcnRUb0xpc3Q6IHtuYW1lOiBcXCdDb252ZXJ0IHRvIGxpc3RcXCd9LFxcblx0XHRcdFx0XHRhZGRSb3c6IHtuYW1lOiBcXCdBZGQgcm93XFwnfSxcXG5cdFx0XHRcdFx0YWRkQ29sOiB7bmFtZTogXFwnQWRkIENvbHVtblxcJ31cXG5cdFx0XHRcdH1cXG5cXG5cdFx0XHR9XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhIGZhLXRoXFxcIj48L2k+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIj48L2k+XFxuXFxuXHRcdDwvYnV0dG9uPlxcblxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiYm90dG9tXFxcIj5cXG5cdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogZ2V0TWljVXJsfVxcXCIgY2xhc3M9XFxcIm1pY3JvXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTWljcm9cXFwiIGJuLXNob3c9XFxcImlzTWljcm9WaXNpYmxlXFxcIiB0aXRsZT1cXFwiU3BlZWNoIFJlY29nbml0aW9uXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU2Nyb2xsQ2xpY2tcXFwiPlxcblx0XHQ8ZGl2IGNvbnRlbnRlZGl0YWJsZT1cXFwidHJ1ZVxcXCIgYm4tYmluZD1cXFwiZWRpdG9yXFxcIiBjbGFzcz1cXFwiZWRpdG9yXFxcIiBibi1odG1sPVxcXCJodG1sXFxcIj48L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdHVzZURhdGFVcmxGb3JJbWc6IGZhbHNlXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0geyp9IGVsdCBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gZmlsZXMgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlciwgZmlsZXMpIHtcblxuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGNvbnN0IHsgdXNlRGF0YVVybEZvckltZyB9ID0gdGhpcy5wcm9wc1xuXHRcdGNvbnNvbGUubG9nKCd1c2VEYXRhVXJsRm9ySW1nJywgdXNlRGF0YVVybEZvckltZylcblxuXHRcdGNvbnN0IGNvbG9yTWFwID0ge1xuXHRcdFx0YmxhY2s6ICcjMDAwMDAwJyxcblx0XHRcdHJlZDogJyNmNDQzMzYnLFxuXHRcdFx0Z3JlZW46ICcjNENBRjUwJyxcblx0XHRcdGJsdWU6ICcjMjE5NkYzJyxcblx0XHRcdHllbGxvdzogJyNmZmViM2InLFxuXHRcdFx0Y3lhbjogJyMwMGJjZDQnLFxuXHRcdFx0cGluazogJyNlOTFlNjMnXG5cblx0XHR9XG5cblx0XHRjb25zdCBmb250U2l6ZXMgPSAnOCwxMCwxMiwxNCwxOCwyNCwzNicuc3BsaXQoJywnKVxuXHRcdGNvbnN0IGZvbnROYW1lcyA9IFtcIkFyaWFsXCIsIFwiQ291cmllciBOZXdcIiwgXCJUaW1lcyBOZXcgUm9tYW5cIl1cblxuXHRcdGZ1bmN0aW9uIGdldEhlYWRpbmdJdGVtcygpIHtcblx0XHRcdGNvbnN0IHJldCA9IHtcblx0XHRcdFx0cDogeyBuYW1lOiAnTm9ybWFsJyB9XG5cdFx0XHR9XG5cdFx0XHRmb3IgKGxldCBpID0gMTsgaSA8PSA2OyBpKyspIHtcblx0XHRcdFx0cmV0WydoJyArIGldID0geyBuYW1lOiBgPGgke2l9PkhlYWRpbmcgJHtpfTwvaCR7aX0+YCwgaXNIdG1sTmFtZTogdHJ1ZSB9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Rm9udFNpemVJdGVtcygpIHtcblx0XHRcdGNvbnN0IHJldCA9IHt9XG5cdFx0XHRmb250U2l6ZXMuZm9yRWFjaCgoaSwgaWR4KSA9PiB7XG5cdFx0XHRcdHJldFtpZHggKyAxXSA9IHsgbmFtZTogYDxmb250IHNpemU9XCIke2lkeCArIDF9XCI+JHtpfSBwdDwvZm9udD5gLCBpc0h0bWxOYW1lOiB0cnVlIH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Rm9udE5hbWVJdGVtcygpIHtcblx0XHRcdGNvbnN0IHJldCA9IHt9XG5cdFx0XHRmb250TmFtZXMuZm9yRWFjaCgoaSkgPT4ge1xuXHRcdFx0XHRyZXRbaV0gPSB7IG5hbWU6IGA8Zm9udCBmYWNlPVwiJHtpfVwiPiR7aX08L2ZvbnQ+YCwgaXNIdG1sTmFtZTogdHJ1ZSB9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldENvbG9ySXRlbXMoKSB7XG5cdFx0XHRjb25zdCByZXQgPSB7fVxuXHRcdFx0T2JqZWN0LmtleXMoY29sb3JNYXApLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0cmV0W2ldID0ge1xuXHRcdFx0XHRcdG5hbWU6IGkuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpLnNsaWNlKDEpLFxuXHRcdFx0XHRcdGljb246IGBmYXMgZmEtc3F1YXJlLWZ1bGwgdzMtdGV4dC0ke2l9YFxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHJldFxuXG5cdFx0fVxuXG5cdFx0Y29uc3QgZm9udFNpemVJdGVtcyA9IGdldEZvbnRTaXplSXRlbXMoKVxuXHRcdGNvbnN0IGRlZmF1bHRGb250U2l6ZSA9ICczJ1xuXHRcdGNvbnN0IGZvbnROYW1lSXRlbXMgPSBnZXRGb250TmFtZUl0ZW1zKClcblx0XHRjb25zdCBkZWZhdWx0Rm9udE5hbWUgPSAnQXJpYWwnXG5cdFx0Y29uc3QgY29sb3JJdGVtcyA9IGdldENvbG9ySXRlbXMoKVxuXHRcdGNvbnN0IGRlZmF1bHRDb2xvciA9IGNvbG9yTWFwWydibGFjayddXG5cblx0XHRjb25zdCBzcGVlY2hSZWNvQXZhaWxhYmxlID0gKCd3ZWJraXRTcGVlY2hSZWNvZ25pdGlvbicgaW4gd2luZG93KVxuXHRcdGNvbnN0IGlzTW9iaWxEZXZpY2UgPSAvQW5kcm9pZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblx0XHRjb25zb2xlLmxvZygnaXNNb2JpbERldmljZScsIGlzTW9iaWxEZXZpY2UpXG5cdFx0bGV0IGlnbm9yZU9uRW5kID0gZmFsc2Vcblx0XHRsZXQgcmVjb2duaXRpb24gPSBudWxsXG5cdFx0bGV0IGZpbmFsU3BhbiA9IG51bGxcblx0XHRsZXQgaW50ZXJpbVNwYW4gPSBudWxsXG5cdFx0bGV0IGZpbmFsVHJhbnNjcmlwdCA9ICcnXG5cdFx0LyoqQHR5cGUge1JhbmdlfSAqL1xuXHRcdGxldCByYW5nZSA9IG51bGxcblxuXHRcdGNvbnN0IHR3b19saW5lID0gL1xcblxcbi9nXG5cdFx0Y29uc3Qgb25lX2xpbmUgPSAvXFxuL2dcblx0XHRmdW5jdGlvbiBsaW5lYnJlYWsocykge1xuXHRcdFx0cmV0dXJuIHMucmVwbGFjZSh0d29fbGluZSwgJzxwPjwvcD4nKS5yZXBsYWNlKG9uZV9saW5lLCAnPGJyPicpXG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlyc3RfY2hhciA9IC9cXFMvXG5cdFx0ZnVuY3Rpb24gY2FwaXRhbGl6ZShzKSB7XG5cdFx0XHRyZXR1cm4gcy5yZXBsYWNlKGZpcnN0X2NoYXIsIG0gPT4gbS50b1VwcGVyQ2FzZSgpKVxuXHRcdH1cblxuXHRcdGlmIChzcGVlY2hSZWNvQXZhaWxhYmxlKSB7XG5cdFx0XHRyZWNvZ25pdGlvbiA9IG5ldyB3ZWJraXRTcGVlY2hSZWNvZ25pdGlvbigpO1xuXHRcdFx0cmVjb2duaXRpb24uY29udGludW91cyA9IHRydWVcblx0XHRcdHJlY29nbml0aW9uLmludGVyaW1SZXN1bHRzID0gdHJ1ZVxuXHRcdFx0cmVjb2duaXRpb24ubGFuZyA9ICdmci1GUidcblxuXHRcdFx0cmVjb2duaXRpb24ub25zdGFydCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uU3RhcnQnKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyByZWNvZ25pemluZzogdHJ1ZSB9KVxuXG5cdFx0XHR9XG5cblx0XHRcdHJlY29nbml0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uRXJyb3InLCBldmVudC5lcnJvcilcblx0XHRcdH1cblxuXHRcdFx0cmVjb2duaXRpb24ub25lbmQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdvbkVuZCcpXG5cdFx0XHRcdGlmIChpc01vYmlsRGV2aWNlICYmIGN0cmwubW9kZWwucmVjb2duaXppbmcpIHtcblx0XHRcdFx0XHRyYW5nZS5jb2xsYXBzZSgpXG5cdFx0XHRcdFx0c3RhcnRSZWNvZ25pdGlvbigpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcmVjb2duaXppbmc6IGZhbHNlIH0pXG5cdFx0XHRcdFx0cmFuZ2UuY29sbGFwc2UoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJlY29nbml0aW9uLm9ucmVzdWx0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmVzdWx0JywgZXZlbnQucmVzdWx0cy5sZW5ndGgpXG5cdFx0XHRcdGxldCBpbnRlcmltVHJhbnNjcmlwdCA9ICcnXG5cdFx0XHRcdGZvciAobGV0IGkgPSBldmVudC5yZXN1bHRJbmRleDsgaSA8IGV2ZW50LnJlc3VsdHMubGVuZ3RoOyArK2kpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXN1bHRzJywgZXZlbnQucmVzdWx0c1tpXSlcblx0XHRcdFx0XHRpZiAoZXZlbnQucmVzdWx0c1tpXS5pc0ZpbmFsICYmIGV2ZW50LnJlc3VsdHNbaV1bMF0uY29uZmlkZW5jZSAhPSAwKSB7XG5cdFx0XHRcdFx0XHRmaW5hbFRyYW5zY3JpcHQgKz0gZXZlbnQucmVzdWx0c1tpXVswXS50cmFuc2NyaXB0XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGludGVyaW1UcmFuc2NyaXB0ICs9IGV2ZW50LnJlc3VsdHNbaV1bMF0udHJhbnNjcmlwdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbnRlcmltVHJhbnNjcmlwdCcsIGludGVyaW1UcmFuc2NyaXB0KVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaW5hbFRyYW5zY3JpcHQnLCBmaW5hbFRyYW5zY3JpcHQpXG5cdFx0XHRcdGZpbmFsVHJhbnNjcmlwdCA9IGNhcGl0YWxpemUoZmluYWxUcmFuc2NyaXB0KVxuXHRcdFx0XHRmaW5hbFNwYW4uaW5uZXJIVE1MID0gbGluZWJyZWFrKGZpbmFsVHJhbnNjcmlwdClcblx0XHRcdFx0aW50ZXJpbVNwYW4uaW5uZXJIVE1MID0gbGluZWJyZWFrKGludGVyaW1UcmFuc2NyaXB0KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0YXJ0UmVjb2duaXRpb24oKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxPYmonLCBzZWxPYmopXG5cblx0XHRcdGlmICghaXNFZGl0YWJsZSgpKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0cmFuZ2UgPSBnZXRSYW5nZSgpXG5cdFx0XHRmaW5hbFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcblx0XHRcdGludGVyaW1TcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG5cdFx0XHRpbnRlcmltU3Bhbi5jbGFzc05hbWUgPSAnaW50ZXJpbSdcblx0XHRcdHJhbmdlLmluc2VydE5vZGUoaW50ZXJpbVNwYW4pXG5cdFx0XHRyYW5nZS5pbnNlcnROb2RlKGZpbmFsU3Bhbilcblx0XHRcdGZpbmFsVHJhbnNjcmlwdCA9ICcnXG5cdFx0XHRyZWNvZ25pdGlvbi5zdGFydCgpXG5cdFx0XHRpZ25vcmVPbkVuZCA9IGZhbHNlXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQgXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWVcblx0XHQgKiBAcmV0dXJucyB7SlF1ZXJ5PEhUTUxFbGVtZW50Pn1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkaXYodGV4dCwgdGFnTmFtZSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnZGl2JywgdGFnTmFtZSwgdGV4dClcblx0XHRcdGNvbnN0IGVsdCA9IFsnSScsICdCJywgJ1UnLCAnRk9OVCddLmluY2x1ZGVzKHRhZ05hbWUpID8gJ3NwYW4nIDogJ2Rpdidcblx0XHRcdHJldHVybiAkKGA8JHtlbHR9PmApLnRleHQodGV4dClcblx0XHR9XG5cblx0XHRsZXQgaW1nVXJscyA9IFtdXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBjb252ZXJ0VG9UYWJsZShyYW5nZSkge1xuXHRcdFx0Y29uc3Qgc2VsUmFuZ2VUZXh0ID0gZ2V0VGV4dE5vZGVzQmV0d2VlbihyYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lciwgcmFuZ2Uuc3RhcnRDb250YWluZXIsIHJhbmdlLmVuZENvbnRhaW5lcilcblx0XHRcdGlmIChzZWxSYW5nZVRleHQubGVuZ3RoID09IDApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRyYW5nZS5kZWxldGVDb250ZW50cygpXG5cblx0XHRcdGNvbnN0IHRhYmxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGFibGUnKVxuXHRcdFx0Zm9yIChjb25zdCByb3cgb2Ygc2VsUmFuZ2VUZXh0KSB7XG5cdFx0XHRcdGNvbnN0IHRyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKVxuXHRcdFx0XHR0YWJsZS5hcHBlbmRDaGlsZCh0cilcblx0XHRcdFx0Zm9yIChjb25zdCB0ZXh0IG9mIHJvdy5zcGxpdCgnOycpKSB7XG5cdFx0XHRcdFx0Y29uc3QgdGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpXG5cdFx0XHRcdFx0dHIuYXBwZW5kQ2hpbGQodGQpXG5cdFx0XHRcdFx0aWYgKHRleHQuc3RhcnRzV2l0aCgnaW1nKCcpKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1cmxJZCA9IHRleHQucmVwbGFjZUFsbCgnKScsICcnKS5zdWJzdHIoNClcblx0XHRcdFx0XHRcdGNvbnN0IGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpXG5cdFx0XHRcdFx0XHRpbWcuc3JjID0gaW1nVXJsc1t1cmxJZF1cblx0XHRcdFx0XHRcdHRkLmFwcGVuZENoaWxkKGltZylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHR0ZC50ZXh0Q29udGVudCA9IHRleHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGltZ1VybHMgPSBbXVxuXHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZSh0YWJsZSlcblxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGNvbnZlcnRUb0xpc3QocmFuZ2UpIHtcblx0XHRcdGNvbnN0IHBhcmVudEVsZW1lbnQgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyLnBhcmVudEVsZW1lbnQpXG5cblx0XHRcdGlmIChbJ1REJywgJ1RIJ10uaW5jbHVkZXMocGFyZW50RWxlbWVudC5nZXQoMCkudGFnTmFtZSkpIHtcblx0XHRcdFx0Y29uc3QgdGFibGUgPSBwYXJlbnRFbGVtZW50LmNsb3Nlc3QoJ3RhYmxlJylcblx0XHRcdFx0Y29uc3QgdHIgPSB0YWJsZS5maW5kKCd0cicpXG5cdFx0XHRcdGNvbnN0IGRhdGEgPSBbXVxuXHRcdFx0XHR0ci5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCB0ZCA9ICQodGhpcykuZmluZCgndGQsdGgnKVxuXHRcdFx0XHRcdGNvbnN0IHRleHQgPSBbXVxuXHRcdFx0XHRcdHRkLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5maW5kKCdpbWcnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc3JjID0gJCh0aGlzKS5hdHRyKCdzcmMnKVxuXHRcdFx0XHRcdFx0XHRpbWdVcmxzLnB1c2goc3JjKVxuXHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlcGxhY2VXaXRoKGBpbWcoJHtpbWdVcmxzLmxlbmd0aCAtIDF9KWApXG5cdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHR0ZXh0LnB1c2goJCh0aGlzKS50ZXh0KCkpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRkYXRhLnB1c2godGV4dC5qb2luKCc7JykpXG5cblx0XHRcdFx0fSlcblx0XHRcdFx0dGFibGUucmVtb3ZlKClcblx0XHRcdFx0cmFuZ2UuZGVsZXRlQ29udGVudHMoKVxuXHRcdFx0XHRmb3IgKGNvbnN0IHRleHQgb2YgZGF0YS5yZXZlcnNlKCkpIHtcblx0XHRcdFx0XHRjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXHRcdFx0XHRcdGRpdi5pbm5lckhUTUwgPSB0ZXh0XG5cdFx0XHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZShkaXYpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSBjZWxsIHRhYmxlJyB9KVxuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBhZGRSb3cocmFuZ2UpIHtcblx0XHRcdGNvbnN0IHBhcmVudEVsZW1lbnQgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyLnBhcmVudEVsZW1lbnQpXG5cblx0XHRcdGlmIChbJ1REJywgJ1RIJ10uaW5jbHVkZXMocGFyZW50RWxlbWVudC5nZXQoMCkudGFnTmFtZSkpIHtcblx0XHRcdFx0Y29uc3QgdHIgPSBwYXJlbnRFbGVtZW50LmNsb3Nlc3QoJ3RyJylcblx0XHRcdFx0Y29uc3QgbmJDb2xzID0gdHIuZmluZCgndGQsIHRoJykubGVuZ3RoXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ25iIGNvbCcsIG5iQ29scylcblx0XHRcdFx0Y29uc3QgbmV3VHIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbmJDb2xzOyBpKyspIHtcblx0XHRcdFx0XHRjb25zdCBuZXdUZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJylcblx0XHRcdFx0XHRuZXdUci5hcHBlbmRDaGlsZChuZXdUZClcblx0XHRcdFx0fVxuXHRcdFx0XHR0ci5hZnRlcihuZXdUcilcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSBjZWxsIHRhYmxlJyB9KVxuXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgXG5cdFx0ICovXG5cdFx0IGZ1bmN0aW9uIGFkZENvbHVtbihyYW5nZSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYWRkQ29sdW1uJylcblx0XHRcdGNvbnN0IHBhcmVudEVsZW1lbnQgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyLnBhcmVudEVsZW1lbnQpXG5cblx0XHRcdGlmIChbJ1REJywgJ1RIJ10uaW5jbHVkZXMocGFyZW50RWxlbWVudC5nZXQoMCkudGFnTmFtZSkpIHtcblx0XHRcdFx0Y29uc3Qgc2VsQ29sID0gcGFyZW50RWxlbWVudC5pbmRleCgpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbENvbCcsIHNlbENvbClcblx0XHRcdFx0Y29uc3QgdGFibGUgPSBwYXJlbnRFbGVtZW50LmNsb3Nlc3QoJ3RhYmxlJylcblx0XHRcdFx0dGFibGUuZmluZCgndHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKVxuXHRcdFx0XHRcdCQodGhpcykuZmluZCgndGQsdGgnKS5lcShzZWxDb2wpLmFmdGVyKHRkKVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGNlbGwgdGFibGUnIH0pXG5cblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRodG1sOiBlbHQudmFsKCksXG5cdFx0XHRcdGZvbnRTaXplOiBkZWZhdWx0Rm9udFNpemUsXG5cdFx0XHRcdGZvbnROYW1lOiBkZWZhdWx0Rm9udE5hbWUsXG5cdFx0XHRcdGdldEZvbnRTaXplOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGAke2ZvbnRTaXplc1t0aGlzLmZvbnRTaXplIC0gMV19IHB0Jm5ic3A7PGkgY2xhc3M9XCJmYXMgZmEtY2FyZXQtZG93blwiPjwvaT5gXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEZvbnROYW1lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGAke3RoaXMuZm9udE5hbWV9Jm5ic3A7PGkgY2xhc3M9XCJmYXMgZmEtY2FyZXQtZG93blwiPjwvaT5gXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZvbnRTaXplSXRlbXMsXG5cdFx0XHRcdGZvbnROYW1lSXRlbXMsXG5cdFx0XHRcdGNvbG9ySXRlbXMsXG5cdFx0XHRcdGNvbG9yOiBkZWZhdWx0Q29sb3IsXG5cdFx0XHRcdGhlYWRpbmdJdGVtczogZ2V0SGVhZGluZ0l0ZW1zKCksXG5cdFx0XHRcdHNob3dNaWNybzogZmFsc2UsXG5cdFx0XHRcdGlzTWljcm9WaXNpYmxlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2hvd01pY3JvICYmIHRoaXMuc3BlZWNoUmVjb0F2YWlsYWJsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzcGVlY2hSZWNvQXZhaWxhYmxlLFxuXHRcdFx0XHRyZWNvZ25pemluZzogZmFsc2UsXG5cdFx0XHRcdGdldE1pY1VybDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnJlY29nbml6aW5nID8gJy9hc3NldHMvbWljLWFuaW1hdGUuZ2lmJyA6ICcvYXNzZXRzL21pYy5naWYnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ub29nbGVNaWNybzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHNob3dNaWNybzogIWN0cmwubW9kZWwuc2hvd01pY3JvIH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5zZXJ0VGFibGU6IGZ1bmN0aW9uIChldiwgaW5mbykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkluc2VydFRhYmxlJywgaW5mbylcblx0XHRcdFx0XHRjb25zdCB7IGNtZCB9ID0gaW5mb1xuXHRcdFx0XHRcdGlmICghaXNFZGl0YWJsZSgpKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0XHRcdGNvbnN0IHJhbmdlID0gc2VsT2JqLmdldFJhbmdlQXQoMClcblx0XHRcdFx0XHRpZiAoY21kID09ICdjb252ZXJ0VG9MaXN0Jykge1xuXHRcdFx0XHRcdFx0Y29udmVydFRvTGlzdChyYW5nZSlcblx0XHRcdFx0XHRcdHNlbE9iai5yZW1vdmVBbGxSYW5nZXMoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChjbWQgPT0gJ2NvbnZlcnRUb1RhYmxlJykge1xuXHRcdFx0XHRcdFx0Y29udmVydFRvVGFibGUocmFuZ2UpXG5cdFx0XHRcdFx0XHRzZWxPYmoucmVtb3ZlQWxsUmFuZ2VzKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoY21kID09ICdhZGRSb3cnKSB7XG5cdFx0XHRcdFx0XHRhZGRSb3cocmFuZ2UpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGNtZCA9PSAnYWRkQ29sJykge1xuXHRcdFx0XHRcdFx0YWRkQ29sdW1uKHJhbmdlKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJlbW92ZUZvcm1hdDogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJlbW92ZUZvcm1hdCcpXG5cdFx0XHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cblx0XHRcdFx0XHRpZiAoIWlzRWRpdGFibGUoKSkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCBub2RlID0gc2VsT2JqLmFuY2hvck5vZGVcblx0XHRcdFx0XHRpZiAobm9kZS5ub2RlVHlwZSAhPSBub2RlLlRFWFRfTk9ERSkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gbm9kZS50ZXh0Q29udGVudFxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coe3RleHR9KVxuXHRcdFx0XHRcdGNvbnN0IHBhcmVudCA9IG5vZGUucGFyZW50RWxlbWVudFxuXHRcdFx0XHRcdGNvbnN0IHRhZ05hbWUgPSBwYXJlbnQudGFnTmFtZVxuXG5cdFx0XHRcdFx0aWYgKCQocGFyZW50KS5oYXNDbGFzcygnZWRpdG9yJykpIHtcblx0XHRcdFx0XHRcdGlmIChub2RlLnByZXZpb3VzU2libGluZyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdGRpdih0ZXh0LCB0YWdOYW1lKS5pbnNlcnRBZnRlcihub2RlLnByZXZpb3VzU2libGluZylcblx0XHRcdFx0XHRcdFx0cGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKHBhcmVudC5wYXJlbnRFbGVtZW50LmNoaWxkRWxlbWVudENvdW50ID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpXG5cdFx0XHRcdFx0XHRcdHBhcmVudC5wYXJlbnRFbGVtZW50LnRleHRDb250ZW50ID0gcGFyZW50LnBhcmVudEVsZW1lbnQudGV4dENvbnRlbnQgKyB0ZXh0XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0JChwYXJlbnQpLnJlcGxhY2VXaXRoKGRpdih0ZXh0LCB0YWdOYW1lKSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTWljcm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC5yZWNvZ25pemluZykge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcmVjb2duaXppbmc6IGZhbHNlIH0pXG5cdFx0XHRcdFx0XHRyZWNvZ25pdGlvbi5zdG9wKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRzdGFydFJlY29nbml0aW9uKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5zZXJ0SW1hZ2U6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGluc2VydEltYWdlKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Gb250TmFtZUNoYW5nZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Gb250TmFtZUNoYW5nZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgZm9udE5hbWU6IGRhdGEuY21kIH0pXG5cdFx0XHRcdFx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2ZvbnROYW1lJywgZmFsc2UsIGRhdGEuY21kKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZvbnRTaXplQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZvbnRTaXplQ2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBmb250U2l6ZTogZGF0YS5jbWQgfSlcblx0XHRcdFx0XHRkb2N1bWVudC5leGVjQ29tbWFuZCgnZm9udFNpemUnLCBmYWxzZSwgZGF0YS5jbWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ3JlYXRlTGluazogYXN5bmMgZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRcdFx0YWRkTGluayhhc3luYyAoKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnSW5zZXJ0IExpbmsnLFxuXHRcdFx0XHRcdFx0XHRsYWJlbDogJ0xpbmsgVGFyZ2V0Jyxcblx0XHRcdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ3VybCcgfVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25TY3JvbGxDbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmZvY3VzKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db21tYW5kOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvbW1hbmQnLCBkYXRhKVxuXG5cdFx0XHRcdFx0bGV0IGNtZFxuXHRcdFx0XHRcdGxldCBjbWRBcmdcblxuXHRcdFx0XHRcdGlmIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRjbWQgPSAkKHRoaXMpLmRhdGEoJ2NtZCcpXG5cdFx0XHRcdFx0XHRpZiAoY21kICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRjbWRBcmcgPSBkYXRhLmNtZFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGNtZCA9IGRhdGEuY21kXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0Y21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdFx0Y21kQXJnID0gJCh0aGlzKS5kYXRhKCdjbWRBcmcnKVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ29tbWFuZCcsIGNtZCwgY21kQXJnKVxuXG5cdFx0XHRcdFx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoY21kLCBmYWxzZSwgY21kQXJnKVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29sb3JNZW51Q2hhbmdlOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db2xvck1lbnVDaGFuZ2UnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IGNvbG9yID0gY29sb3JNYXBbZGF0YS5jbWRdXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY29sb3IgfSlcblx0XHRcdFx0XHRkb2N1bWVudC5leGVjQ29tbWFuZCgnZm9yZUNvbG9yJywgZmFsc2UsIGNvbG9yKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRlbHQuZmluZCgnYnV0dG9uLnczLWJ1dHRvbicpLmF0dHIoJ3R5cGUnLCAnYnV0dG9uJylcblxuXHRcdCQoZG9jdW1lbnQpLm9uKCdzZWxlY3Rpb25jaGFuZ2UnLCAoKSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxlY3Rpb25jaGFuZ2UnKVxuXHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxPYmonLCBzZWxPYmopXG5cblx0XHRcdGlmICghaXNFZGl0YWJsZSgpKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmb250U2l6ZU5vZGUgPSAkKHNlbE9iai5hbmNob3JOb2RlKS5jbG9zZXN0KCdmb250W3NpemVdJylcblx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbnROb2RlJywgZm9udE5vZGUpXG5cdFx0XHRpZiAoZm9udFNpemVOb2RlLmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdGNvbnN0IGZvbnRTaXplID0gZm9udFNpemVOb2RlLmF0dHIoJ3NpemUnKSB8fCBkZWZhdWx0Rm9udFNpemVcblx0XHRcdFx0Y29uc3QgZm9udE5hbWUgPSBmb250U2l6ZU5vZGUuYXR0cignZmFjZScpIHx8IGRlZmF1bHRGb250TmFtZVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmb250U2l6ZScsIGZvbnRTaXplLCAnZm9udE5hbWUnLCBmb250TmFtZSwgJ2NvbG9yJywgY29sb3IpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGZvbnRTaXplLCBmb250TmFtZSB9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0Zm9udFNpemU6IGRlZmF1bHRGb250U2l6ZSxcblx0XHRcdFx0XHRmb250TmFtZTogZGVmYXVsdEZvbnROYW1lLFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm9udENvbG9yTm9kZSA9ICQoc2VsT2JqLmFuY2hvck5vZGUpLmNsb3Nlc3QoJ2ZvbnRbY29sb3JdJylcblx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbnROb2RlJywgZm9udE5vZGUpXG5cdFx0XHRpZiAoZm9udENvbG9yTm9kZS5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRjb25zdCBjb2xvciA9IGZvbnRDb2xvck5vZGUuYXR0cignY29sb3InKSB8fCBkZWZhdWx0Q29sb3Jcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZm9udFNpemUnLCBmb250U2l6ZSwgJ2ZvbnROYW1lJywgZm9udE5hbWUsICdjb2xvcicsIGNvbG9yKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBjb2xvciB9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0Y29sb3I6IGRlZmF1bHRDb2xvclxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBcblx0XHQgKiBAcmV0dXJucyBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBoYXNUZXh0Q2hpbGROb2RlKG5vZGUpIHtcblx0XHRcdHJldHVybiBBcnJheS5mcm9tKG5vZGUuY2hpbGROb2RlcykuZmlsdGVyKGVudHJ5ID0+IGVudHJ5Lm5vZGVUeXBlID09IE5vZGUuVEVYVF9OT0RFKS5sZW5ndGggIT0gMFxuXHRcdH1cblxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtOb2RlfSByb290Tm9kZSBcblx0XHQgKiBAcGFyYW0ge05vZGV9IHN0YXJ0Tm9kZSBcblx0XHQgKiBAcGFyYW0ge05vZGV9IGVuZE5vZGUgXG5cdFx0ICogQHJldHVybnMgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0VGV4dE5vZGVzQmV0d2Vlbihyb290Tm9kZSwgc3RhcnROb2RlLCBlbmROb2RlKSB7XG5cdFx0XHRsZXQgcGFzdFN0YXJ0Tm9kZSA9IGZhbHNlXG5cdFx0XHRsZXQgcmVhY2hlZEVuZE5vZGUgPSBmYWxzZVxuXHRcdFx0Y29uc3QgdGV4dE5vZGVzID0gW11cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKG5vZGUpIHtcblx0XHRcdFx0aWYgKG5vZGUgPT0gc3RhcnROb2RlKSB7XG5cdFx0XHRcdFx0cGFzdFN0YXJ0Tm9kZSA9IHRydWVcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChub2RlLm5vZGVUeXBlID09IE5vZGUuVEVYVF9OT0RFKSB7XG5cdFx0XHRcdFx0aWYgKHBhc3RTdGFydE5vZGUgJiYgIXJlYWNoZWRFbmROb2RlKSB7XG5cblx0XHRcdFx0XHRcdGlmIChub2RlLnBhcmVudEVsZW1lbnQudGFnTmFtZSA9PSAnU1BBTicgJiYgbm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQudGFnTmFtZSA9PSAnRElWJyAmJiBoYXNUZXh0Q2hpbGROb2RlKG5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50KSkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBsZW5ndGggPSB0ZXh0Tm9kZXMubGVuZ3RoXG5cdFx0XHRcdFx0XHRcdGlmIChsZW5ndGggPiAwKVxuXHRcdFx0XHRcdFx0XHRcdHRleHROb2Rlc1tsZW5ndGggLSAxXSArPSBub2RlLnRleHRDb250ZW50XG5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0ZXh0Tm9kZXMucHVzaChub2RlLnRleHRDb250ZW50KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gbm9kZS5jaGlsZE5vZGVzLmxlbmd0aDsgIXJlYWNoZWRFbmROb2RlICYmIGkgPCBsZW47ICsraSkge1xuXHRcdFx0XHRcdFx0Z2V0VGV4dE5vZGVzKG5vZGUuY2hpbGROb2Rlc1tpXSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobm9kZSA9PSBlbmROb2RlKSB7XG5cdFx0XHRcdFx0cmVhY2hlZEVuZE5vZGUgPSB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Z2V0VGV4dE5vZGVzKHJvb3ROb2RlKVxuXHRcdFx0cmV0dXJuIHRleHROb2Rlc1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlbFJhbmdlVGV4dCgpIHtcblx0XHRcdGNvbnN0IHJhbmdlID0gZ2V0UmFuZ2UoKVxuXHRcdFx0cmV0dXJuIGdldFRleHROb2Rlc0JldHdlZW4ocmFuZ2UuY29tbW9uQW5jZXN0b3JDb250YWluZXIsIHJhbmdlLnN0YXJ0Q29udGFpbmVyLCByYW5nZS5lbmRDb250YWluZXIpXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHsoKSA9PiBQcm9taXNlPHN0cmluZz59IGNiayBcblx0XHQgKiBAcmV0dXJucyBcblx0XHQgKi9cblx0XHRhc3luYyBmdW5jdGlvbiBhZGRMaW5rKGNiaykge1xuXHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cblx0XHRcdGlmICghaXNFZGl0YWJsZSgpKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHJhbmdlID0gZ2V0UmFuZ2UoKVxuXHRcdFx0aWYgKHR5cGVvZiBjYmsgPT0gJ2Z1bmN0aW9uJyAmJiBjYmsuY29uc3RydWN0b3IubmFtZSA9PT0gJ0FzeW5jRnVuY3Rpb24nKSB7XG5cdFx0XHRcdGNvbnN0IGhyZWYgPSBhd2FpdCBjYmsoKVxuXHRcdFx0XHRjb25zb2xlLmxvZygnaHJlZicsIGhyZWYpXG5cdFx0XHRcdGlmIChocmVmICE9IG51bGwpIHtcblx0XHRcdFx0XHRzZWxPYmoucmVtb3ZlQWxsUmFuZ2VzKClcblx0XHRcdFx0XHRzZWxPYmouYWRkUmFuZ2UocmFuZ2UpXG5cblx0XHRcdFx0XHRkb2N1bWVudC5leGVjQ29tbWFuZCgnY3JlYXRlTGluaycsIGZhbHNlLCBocmVmKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vY29uc29sZS5sb2coJ2hyZWYnLCBocmVmKVxuXG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRSYW5nZSgpIHtcblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0cmV0dXJuIHNlbE9iai5nZXRSYW5nZUF0KDApXG5cdFx0fVxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGlzRWRpdGFibGUoKSB7XG5cblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0bGV0IG5vZGUgPSBzZWxPYmouYW5jaG9yTm9kZVxuXG5cdFx0XHRjb25zdCBlZGl0YWJsZSA9IGN0cmwuc2NvcGUuZWRpdG9yLmdldCgwKVxuXG5cdFx0XHR3aGlsZSAobm9kZSAmJiBub2RlICE9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuXHRcdFx0XHRpZiAobm9kZSA9PSBlZGl0YWJsZSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdFx0bm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdH1cblxuXHRcdHRoaXMuYWRkTGluayA9IGFkZExpbmtcblxuXHRcdHRoaXMuaXNFZGl0YWJsZSA9IGlzRWRpdGFibGVcblxuXHRcdHRoaXMuaHRtbCA9IGZ1bmN0aW9uIChodG1sU3RyaW5nKSB7XG5cdFx0XHRpZiAoaHRtbFN0cmluZyA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuZmluZCgnc3BhbicpLnJlbW92ZSgnLmludGVyaW0nKVxuXHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5maW5kKCdzcGFuJykucmVtb3ZlQXR0cignc3R5bGUnKVxuXHRcdFx0XHRyZXR1cm4gY3RybC5zY29wZS5lZGl0b3IuaHRtbCgpXG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmh0bWwoaHRtbFN0cmluZylcblx0XHR9XG5cblx0XHR0aGlzLmxvYWQgPSBmdW5jdGlvbiAodXJsLCBjYmspIHtcblx0XHRcdHJldHVybiBjdHJsLnNjb3BlLmVkaXRvci5sb2FkKHVybCwgY2JrKVxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5zY29wZS5lZGl0b3IuaHRtbCgpXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYnJhaW5qcy5odG1sZWRpdG9yOnNldFZhbHVlJywgdmFsdWUpXG5cdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5odG1sKHZhbHVlKVxuXHRcdH1cblxuXHRcdHRoaXMuZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5nZXQoMCkuZm9jdXMoKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGluc2VydEltYWdlKCkge1xuXHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxPYmonLCBzZWxPYmopXG5cblx0XHRcdGlmICghaXNFZGl0YWJsZSgpKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgcmFuZ2UgPSBzZWxPYmouZ2V0UmFuZ2VBdCgwKVxuXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0XHRcdHRpdGxlOiAnSW5zZXJ0IEltYWdlJyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb246ICdqcGcsanBlZyxwbmcsZ2lmJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShkYXRhKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGFzeW5jIGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7IGZpbGVOYW1lLCByb290RGlyIH0gPSBkYXRhXG5cdFx0XHRcdFx0bGV0IHVybCA9IGZpbGVzLmZpbGVVcmwocm9vdERpciArIGZpbGVOYW1lKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3VybCcsIHVybClcblx0XHRcdFx0XHRpZiAodXNlRGF0YVVybEZvckltZykge1xuXHRcdFx0XHRcdFx0dXJsID0gYXdhaXQgJCQudXJsLmltYWdlVXJsVG9EYXRhVXJsKHVybClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJylcblx0XHRcdFx0XHRpbWcuc3JjID0gdXJsXG5cdFx0XHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZShpbWcpXG5cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXG5cdFx0fVxuXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbHRlckRsZycsIHtcblxuICAgIHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cXG4gICAgPGxhYmVsPkdlbnJlPC9sYWJlbD5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGdlbnJlc31cXFwiIGJuLXZhbD1cXFwic2VsZWN0ZWRHZW5yZVxcXCIgYm4tZXZlbnQ9XFxcImNvbWJvYm94Y2hhbmdlOiBvbkdlbnJlQ2hhbmdlXFxcIiBuYW1lPVxcXCJnZW5yZVxcXCI+PC9kaXY+ICAgIFxcblxcbiAgICA8bGFiZWw+QXJ0aXN0PC9sYWJlbD5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGFydGlzdHN9XFxcIiBibi12YWw9XFxcInNlbGVjdGVkQXJ0aXN0XFxcIiBibi11cGRhdGU9XFxcImNvbWJvYm94Y2hhbmdlXFxcIiBuYW1lPVxcXCJhcnRpc3RcXFwiPjwvZGl2PiAgICBcXG5cXG5cXG4gICAgPGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG4gICAgZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgZmlsZXM6IFtdLFxuICAgICAgICBtcDNGaWx0ZXJzOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlcikge1xuXG4gICAgICAgIC8qKkB0eXBlIHt7XG4gICAgICAgICAqIGZpbGVzOiBCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5GaWxlSW5mb1tdLCBcbiAgICAgICAgICogbXAzRmlsdGVyczogQnJlaXpib3QuQ29udHJvbHMuRmlsZXMuTXAzRmlsdGVyfX0gICovXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgbGV0IHsgZmlsZXMsIG1wM0ZpbHRlcnMgfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBtcDNGaWx0ZXJzID0gbXAzRmlsdGVycyB8fCB7fVxuXG5cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRHZW5yZSA9IG1wM0ZpbHRlcnMuZ2VucmUgfHwgJ0FsbCdcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRBcnRpc3QgPSBtcDNGaWx0ZXJzLmFydGlzdCB8fCAnQWxsJ1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdzZWxlY3RlZEFydGlzdCcsIHNlbGVjdGVkQXJ0aXN0KVxuICAgICAgICBjb25zb2xlLmxvZygnc2VsZWN0ZWRHZW5yZScsIHNlbGVjdGVkR2VucmUpXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0R2VucmVzKCkge1xuICAgICAgICAgICAgbGV0IGdlbnJlcyA9IHt9XG5cbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGYpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZi5tcDMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBnZW5yZSB9ID0gZi5tcDNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdlbnJlICYmICFnZW5yZS5zdGFydHNXaXRoKCcoJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnZW5yZXNbZ2VucmVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VucmVzW2dlbnJlXSsrXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5yZXNbZ2VucmVdID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZ2VucmVzID0gT2JqZWN0LmtleXMoZ2VucmVzKS5zb3J0KCkubWFwKChnZW5yZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5iVGl0bGUgPSBnZW5yZXNbZ2VucmVdXG4gICAgICAgICAgICAgICAgcmV0dXJuIChuYlRpdGxlID09IDEpID9cbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogZ2VucmUsIGxhYmVsOiBnZW5yZSB9IDpcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogZ2VucmUsIGxhYmVsOiBgJHtnZW5yZX0gKCR7bmJUaXRsZX0pYCB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgZ2VucmVzLnVuc2hpZnQoeyB2YWx1ZTogJ0FsbCcsIGxhYmVsOiAnQWxsJywgc3R5bGU6ICdmb250LXdlaWdodDogYm9sZDsnIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBnZW5yZXNcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0QXJ0aXN0cyhnZW5yZSkge1xuICAgICAgICAgICAgbGV0IGFydGlzdHMgPSB7fVxuXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGYubXAzICYmIChnZW5yZSA9PSAnQWxsJyB8fCBmLm1wMy5nZW5yZSA9PSBnZW5yZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhcnRpc3QgfSA9IGYubXAzXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcnRpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnRpc3RzW2FydGlzdF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnRpc3RzW2FydGlzdF0rK1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJ0aXN0c1thcnRpc3RdID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFydGlzdHMgPSBPYmplY3Qua2V5cyhhcnRpc3RzKS5zb3J0KCkubWFwKChhcnRpc3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYlRpdGxlID0gYXJ0aXN0c1thcnRpc3RdXG4gICAgICAgICAgICAgICAgcmV0dXJuIChuYlRpdGxlID09IDEpID9cbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogYXJ0aXN0LCBsYWJlbDogYXJ0aXN0IH0gOlxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBhcnRpc3QsIGxhYmVsOiBgJHthcnRpc3R9ICgke25iVGl0bGV9KWAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFydGlzdHMudW5zaGlmdCh7IHZhbHVlOiAnQWxsJywgbGFiZWw6ICdBbGwnLCBzdHlsZTogJ2ZvbnQtd2VpZ2h0OiBib2xkOycgfSlcbiAgICAgICAgICAgIHJldHVybiBhcnRpc3RzXG4gICAgICAgIH1cblxuXG5cblxuXG4gICAgICAgIGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBhcnRpc3RzOiBnZXRBcnRpc3RzKHNlbGVjdGVkR2VucmUpLFxuICAgICAgICAgICAgICAgIGdlbnJlczogZ2V0R2VucmVzKCksXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRBcnRpc3QsXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRHZW5yZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIG9uR2VucmVDaGFuZ2U6IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdlbnJlID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ29uR2VucmVDaGFuZ2UnLCBnZW5yZSlcbiAgICAgICAgICAgICAgICAgICAgY3RybC5zZXREYXRhKHthcnRpc3RzOiBnZXRBcnRpc3RzKGdlbnJlKX0pXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICAgICAgcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBhcHBseToge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FwcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWNoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG59KSIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZWNob29zZXInLCB7XG5cblxuXHR0ZW1wbGF0ZTogXCI8cD5TZWxlY3QgYSBmaWxlIHN5c3RlbTwvcD5cXG48dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkhvbWVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWhvbWUgZmEtMnggZmEtZncgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4+WW91ciBob21lIGZpbGVzPC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuXFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNoYXJlXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1hbHQgZmEtMnggZmEtZncgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4+RmlsZXMgc2hhcmVkIGJ5IHlvdXIgZnJpZW5kczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRmaWx0ZXJFeHRlbnNpb246ICcnLFxuXHRcdGdldE1QM0luZm86IGZhbHNlLFxuXHRcdHNob3dNcDNGaWx0ZXI6IGZhbHNlXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlc1NydlxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGZpbGVzU3J2KSB7XG5cblx0XHRjb25zdCB7IGZpbHRlckV4dGVuc2lvbiwgZ2V0TVAzSW5mbywgc2hvd01wM0ZpbHRlciB9ID0gdGhpcy5wcm9wc1xuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5JbnRlcmZhY2V9IGlmYWNlIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG9wZW5GaWx0ZXJQYWdlKGlmYWNlKSB7XG5cdFx0XHRjb25zdCBtcDNGaWx0ZXJzID0gaWZhY2UuZ2V0TVAzRmlsdGVycygpXG5cdFx0XHRjb25zdCBmaWxlcyA9IGlmYWNlLmdldEZpbGVzKClcblxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbHRlckRsZycsIHtcblx0XHRcdFx0dGl0bGU6ICdGaWx0ZXInLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnNcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uIChmaWx0ZXJzKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVycycsIGZpbHRlcnMpXG5cdFx0XHRcdFx0aWZhY2Uuc2V0TVAzRmlsdGVycyhmaWx0ZXJzKVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0aXRsZSBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gZnJpZW5kVXNlciBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBvcGVuRmlsZVBhZ2UodGl0bGUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHQvKipAdHlwZSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuUHJvcHN9ICovXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uLFxuXHRcdFx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRcdFx0Z2V0TVAzSW5mb1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHQgKiBcblx0XHRcdFx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLkV2ZW50RGF0YS5GaWxlQ2xpY2t9IGluZm8gXG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0ZmlsZWNsaWNrOiBmdW5jdGlvbiAoZXYsIGluZm8pIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVjbGljaycsIGluZm8pXG5cdFx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIsIGZpbGVOYW1lLCBtcDMgfSA9IGluZm9cblx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGZpbGVzU3J2LmZpbGVVcmwocm9vdERpciArIGZpbGVOYW1lLCBmcmllbmRVc2VyKVxuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSh7dXJsLCBtcDMsIGZpbGVOYW1lfSlcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uICh1cmwpIHtcblx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKHVybClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHNob3dNcDNGaWx0ZXIpIHtcblx0XHRcdFx0b3B0aW9ucy5idXR0b25zID0ge1xuXHRcdFx0XHRcdHNlYXJjaDoge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdGaWx0ZXInLFxuXHRcdFx0XHRcdFx0aWNvbjogJ2ZhcyBmYS1maWx0ZXInLFxuXHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRvcGVuRmlsdGVyUGFnZShmaWxlQ3RybClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZmlsZUN0cmwgPSBwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsZXMnLCBvcHRpb25zKVxuXG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkhvbWU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UoJ0hvbWUgZmlsZXMnLCAnJylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaGFyZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5mcmllbmRzJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdTaGFyZWQgZmlsZXMnLFxuXHRcdFx0XHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LkNvbnRyb2xzLkZyaWVuZHMuUHJvcHN9ICovXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHRcdFx0ICogXG5cdFx0XHRcdFx0XHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuQ29udHJvbHMuRnJpZW5kcy5FdmVudERhdGEuRnJpZW5kQ2xpY2t9IGRhdGEgXG5cdFx0XHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdFx0XHRmcmllbmRjbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZWxlY3RGcmllbmQnLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHsgdXNlck5hbWUgfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UodXNlck5hbWUsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZGF0YSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbihmdW5jdGlvbiAoKSB7XG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge3tuYW1lOiBzdHJpbmcsIGZvbGRlcjogYm9vbGVhbn19IGZcblx0ICogQHJldHVybnMgXG5cdCAqL1xuXHRmdW5jdGlvbiBnZXRJY29uQ2xhc3MoZikge1xuXHRcdGxldCB7IG5hbWUsIGZvbGRlciB9ID0gZlxuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKClcblx0XHRpZiAoZm9sZGVyKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZvbGRlci1vcGVuIHczLXRleHQtZGVlcC1vcmFuZ2UnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcucGRmJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1wZGYgdzMtdGV4dC1yZWQnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuaGRvYycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtd29yZCB3My10ZXh0LWJsdWUnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcub2dnJykgfHwgbmFtZS5lbmRzV2l0aCgnLm1wMycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtYXVkaW8gdzMtdGV4dC1wdXJwbGUnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcubXA0JykgfHwgbmFtZS5lbmRzV2l0aCgnLndlYm0nKSB8fCBuYW1lLmVuZHNXaXRoKCcuM2dwJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS12aWRlbyB3My10ZXh0LW9yYW5nZSdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy56aXAnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLWFyY2hpdmUgdzMtdGV4dC1hbWJlcidcblx0XHR9XG5cblx0XHRyZXR1cm4gJ2ZhLWZpbGUgdzMtdGV4dC1ibHVlLWdyZXknXG5cdH1cblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuRmlsZUluZm9bXX0gZmlsZXMgXG5cdCAqL1xuXHRmdW5jdGlvbiBzb3J0RmlsZXMoZmlsZXMpIHtcblx0XHRmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG5cdFx0XHRpZiAoYS5mb2xkZXIgJiYgIWIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAtMVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFhLmZvbGRlciAmJiBiLmZvbGRlcikge1xuXHRcdFx0XHRyZXR1cm4gMVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSlcblx0XHR9KVxuXHR9XG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVsaXN0Jywge1xuXHRcdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblx0XHRwcm9wczoge1xuXHRcdFx0c2VsZWN0aW9uRW5hYmxlZDogZmFsc2UsXG5cdFx0XHRmaWx0ZXJFeHRlbnNpb246IHVuZGVmaW5lZCxcblx0XHRcdGdldE1QM0luZm86IGZhbHNlLFxuXHRcdFx0ZnJpZW5kVXNlcjogJycsXG5cdFx0XHRtcDNGaWx0ZXJzOiBudWxsLFxuXHRcdH0sXG5cblx0XHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcImxvYWRpbmdcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRsb2FkaW5nIC4uLlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInBhdGhQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnBhdGhJdGVtOiBvblBhdGhJdGVtXFxcIiBibi1zaG93PVxcXCIhbG9hZGluZ1xcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImdldFBhdGhcXFwiIGJuLWluZGV4PVxcXCJpZHhcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1yaWdodFxcXCIgYm4tc2hvdz1cXFwiIWlzRmlyc3RcXFwiPjwvaT5cXG5cdFx0PHNwYW4+XFxuXHRcdFx0PGEgY2xhc3M9XFxcInBhdGhJdGVtXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGhyZWY9XFxcIiNcXFwiIGJuLXNob3c9XFxcIiFpc0xhc3RcXFwiIGJuLWRhdGE9XFxcIntpbmZvOiBnZXRQYXRoSW5mb31cXFwiPjwvYT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGJuLXNob3c9XFxcImlzTGFzdFxcXCIgY2xhc3M9XFxcImxhc3RJdGVtXFxcIj48L3NwYW4+XFxuXFxuXHRcdDwvc3Bhbj5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLWhvdmVyYWJsZSB3My1zbWFsbFxcXCI+XFxuXHRcdDx0aGVhZD5cXG5cdFx0XHQ8dHIgYm4taHRtbD1cXFwiZ2V0SGVhZGVyXFxcIj48L3RyPlxcblx0XHQ8L3RoZWFkPlxcblx0XHQ8dGJvZHkgYm4tZWFjaD1cXFwiZ2V0RmlsZXNcXFwiIGJuLWl0ZXI9XFxcImZcXFwiIGJuLWxhenp5PVxcXCIxMFxcXCIgYm4tYmluZD1cXFwiZmlsZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvbkl0ZW1DbGlja1xcXCI+XFxuXHRcdFx0PHRyIGNsYXNzPVxcXCJpdGVtXFxcIiBibi1odG1sPVxcXCJnZXRJdGVtXFxcIj48L3RyPlxcblx0XHQ8L3Rib2R5Plxcblx0PC90YWJsZT5cXG5cXG48L2Rpdj5cXG5cXG5cIixcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7Kn0gZWx0IFxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBzcnZGaWxlcyBcblx0XHQgKi9cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBzcnZGaWxlcykge1xuXG5cblx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5Qcm9wc30gKi9cblx0XHRcdGxldCB7XG5cdFx0XHRcdHNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0Z2V0TVAzSW5mbyxcblx0XHRcdFx0bXAzRmlsdGVycyxcblx0XHRcdH0gPSB0aGlzLnByb3BzXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0c2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0XHRyb290RGlyOiAnLycsXG5cdFx0XHRcdFx0ZmlsZXM6IFtdLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnMsXG5cblx0XHRcdFx0XHRnZXRIZWFkZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBbXVxuXHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCcnKVxuXHRcdFx0XHRcdFx0aWYgKGdldE1QM0luZm8pIHtcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdUaXRsZScpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnQXJ0aXN0Jylcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdEdXJhdGlvbicpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnQlBNJylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ05hbWUnKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ1NpemUnKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ0xhc3QgTW9kaWYnKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGRhdGEubWFwKChlKSA9PiBgPHRoPiR7ZX08L3RoPmApLmpvaW4oJycpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRJdGVtOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBbXVxuXHRcdFx0XHRcdFx0ZGF0YS5wdXNoKGA8aSBjbGFzcz1cImZhIGZhLTJ4ICR7Z2V0SWNvbkNsYXNzKHNjb3BlLmYpfVwiPjwvaT5gKVxuXHRcdFx0XHRcdFx0aWYgKGdldE1QM0luZm8pIHtcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHRoaXMuZ2V0VGl0bGUoc2NvcGUpKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2godGhpcy5nZXRBcnRpc3Qoc2NvcGUpKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2godGhpcy5nZXREdXJhdGlvbihzY29wZSkpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCh0aGlzLmdldEJQTShzY29wZSkpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHNjb3BlLmYubmFtZSlcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHRoaXMuZ2V0U2l6ZShzY29wZSkpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCh0aGlzLmdldERhdGUoc2NvcGUpKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGRhdGEubWFwKChlKSA9PiBgPHRkPiR7ZX08L3RkPmApLmpvaW4oJycpXG5cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldEljb25DbGFzczogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4geyBjbGFzczogJ2ZhIGZhLWxnICcgKyBnZXRJY29uQ2xhc3Moc2NvcGUuZikgfVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXREdXJhdGlvbjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbXAzIH0gPSBzY29wZS5mXG5cdFx0XHRcdFx0XHRpZiAobXAzICE9IHVuZGVmaW5lZCAmJiBtcDMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAkJC5tZWRpYS5nZXRGb3JtYXRlZFRpbWUobXAzLmxlbmd0aClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJ1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRCUE06IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7IG1wMyB9ID0gc2NvcGUuZlxuXHRcdFx0XHRcdFx0aWYgKG1wMyAhPSB1bmRlZmluZWQgJiYgbXAzLmJwbSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbXAzLmJwbVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICcnXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSxcdFx0XHRcdFx0XG5cblx0XHRcdFx0XHRnZXRBcnRpc3Q6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgeyBtcDMgfSA9IHNjb3BlLmZcblx0XHRcdFx0XHRcdGlmIChtcDMgIT0gdW5kZWZpbmVkICYmIG1wMy5hcnRpc3QpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG1wMy5hcnRpc3Rcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRUaXRsZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7IG1wMywgZm9sZGVyLCBuYW1lIH0gPSBzY29wZS5mXG5cdFx0XHRcdFx0XHRpZiAoZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBuYW1lXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobXAzICE9IHVuZGVmaW5lZCAmJiBtcDMudGl0bGUpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG1wMy50aXRsZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGlzSW5GaWx0ZXI6IGZ1bmN0aW9uIChtcDNJbmZvKSB7XG5cdFx0XHRcdFx0XHR2YXIgcmV0ID0gdHJ1ZVxuXHRcdFx0XHRcdFx0Zm9yIChsZXQgZiBpbiB0aGlzLm1wM0ZpbHRlcnMpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVyJywgZilcblx0XHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSBtcDNJbmZvW2ZdXG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3ZhbHVlJywgdmFsdWUpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGZpbHRlclZhbHVlID0gdGhpcy5tcDNGaWx0ZXJzW2ZdXG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlclZhbHVlJywgZmlsdGVyVmFsdWUpXG5cdFx0XHRcdFx0XHRcdGlmIChmaWx0ZXJWYWx1ZSAhPSAnQWxsJykge1xuXHRcdFx0XHRcdFx0XHRcdHJldCAmPSAoZmlsdGVyVmFsdWUgPT09IHZhbHVlKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXQnLCByZXQpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldEZpbGVzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5tcDNGaWx0ZXJzID09PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGVzXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlcy5maWx0ZXIoKGYpID0+IHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGYuZm9sZGVyIHx8IChmLm1wMyAmJiBmLm1wMyAmJiB0aGlzLmlzSW5GaWx0ZXIoZi5tcDMpKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFBhdGg6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHRhYiA9ICgnL2hvbWUnICsgdGhpcy5yb290RGlyKS5zcGxpdCgnLycpXG5cdFx0XHRcdFx0XHR0YWIuc2hpZnQoKVxuXHRcdFx0XHRcdFx0dGFiLnBvcCgpXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGFiXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc0xhc3Q6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSB0aGlzLmdldFBhdGgoKS5sZW5ndGggLSAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc0ZpcnN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0UGF0aEluZm86IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0UGF0aCgpLnNsaWNlKDEsIHNjb3BlLmlkeCArIDEpLmpvaW4oJy8nKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGlmIChzY29wZS5mLmZvbGRlcikge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGxldCBzaXplID0gc2NvcGUuZi5zaXplXG5cdFx0XHRcdFx0XHRsZXQgdW5pdCA9ICdvY3RldHMnXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdFx0dW5pdCA9ICdLbydcblx0XHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0XHR1bml0ID0gJ01vJ1xuXHRcdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c2l6ZSA9IE1hdGguZmxvb3Ioc2l6ZSAqIDEwKSAvIDEwXG5cdFx0XHRcdFx0XHRyZXR1cm4gc2l6ZSArICcgJyArIHVuaXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoc2NvcGUuZi5tdGltZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0b25QYXRoSXRlbTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwYXRoSXRlbSA9ICQodGhpcykuZGF0YSgnaW5mbycpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBhdGhJdGVtJywgcGF0aEl0ZW0pXG5cdFx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0XHRjb25zdCBuZXdEaXIgPSBwYXRoSXRlbSA9PSAnJyA/ICcvJyA6ICcvJyArIHBhdGhJdGVtICsgJy8nXG5cblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZGlyY2hhbmdlJywgeyBuZXdEaXIgfSlcblxuXG5cdFx0XHRcdFx0XHRsb2FkRGF0YShuZXdEaXIpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaWR4JywgaWR4KVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0XHRcdGlmIChpbmZvLmZvbGRlcikge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG5ld0RpciA9IGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLydcblx0XHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2RpcmNoYW5nZScsIHsgbmV3RGlyIH0pXG5cdFx0XHRcdFx0XHRcdGxvYWREYXRhKG5ld0RpcilcblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGlmIChzZWxlY3Rpb25FbmFibGVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5jbG9zZXN0KCd0Ym9keScpLmZpbmQoJy5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHRcdFx0XHRmaWxlTmFtZTogaW5mby5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdHJvb3REaXI6IGN0cmwubW9kZWwucm9vdERpcixcblx0XHRcdFx0XHRcdFx0XHRpc0ltYWdlOiBpbmZvLmlzSW1hZ2UsXG5cdFx0XHRcdFx0XHRcdFx0bXAzOiBpbmZvLm1wM1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdC8qKkB0eXBlIHtKUXVlcnl9ICovXG5cdFx0XHRjb25zdCBmaWxlcyA9IGN0cmwuc2NvcGUuZmlsZXNcblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gbG9hZERhdGEocm9vdERpciwgcmVzZXRGaWx0ZXJzKSB7XG5cdFx0XHRcdGlmIChyb290RGlyID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGxvYWRpbmc6IHRydWUgfSlcblx0XHRcdFx0bGV0IGZpbGVzID0gYXdhaXQgc3J2RmlsZXMubGlzdChyb290RGlyLCB7IGZpbHRlckV4dGVuc2lvbiwgZ2V0TVAzSW5mbyB9LCBmcmllbmRVc2VyKVxuXHRcdFx0XHRpZiAoZ2V0TVAzSW5mbykge1xuXHRcdFx0XHRcdGZpbGVzID0gZmlsZXMuZmlsdGVyKChmKSA9PiBmLmZvbGRlciB8fCAoZi5tcDMgIT0gdW5kZWZpbmVkICYmIGYubXAzLnRpdGxlKSlcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXG5cdFx0XHRcdHNvcnRGaWxlcyhmaWxlcylcblxuXHRcdFx0XHRpZiAocmVzZXRGaWx0ZXJzICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdGN0cmwubW9kZWwubXAzRmlsdGVycyA9IG51bGxcblx0XHRcdFx0fVxuXG5cblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRyb290RGlyXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0aWYgKHNlbGVjdGlvbkVuYWJsZWQpIHtcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmZpbGVzLmZpbmQoJy5pdGVtJykuZXEoMCkuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRsb2FkRGF0YSgpXG5cblxuXHRcdFx0dGhpcy5nZXRSb290RGlyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZW50ZXJTZWxGb2xkZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc3Qgc2VsRWx0ID0gZmlsZXMuZmluZCgnLmFjdGl2ZScpXG5cdFx0XHRcdGNvbnN0IGlkeCA9IHNlbEVsdC5pbmRleCgpXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdlbnRlclNlbEZvbGRlcicsIGlkeClcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0aWYgKGluZm8uZm9sZGVyKSB7XG5cdFx0XHRcdFx0Y29uc3QgZGlyTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdGNvbnN0IG5ld0RpciA9IGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLydcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZGlyY2hhbmdlJywgeyBuZXdEaXIgfSlcblx0XHRcdFx0XHRsb2FkRGF0YShuZXdEaXIpXG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VsVXAgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IHNlbEVsdCA9IGZpbGVzLmZpbmQoJy5hY3RpdmUnKVxuXHRcdFx0XHRjb25zdCBpZHggPSBzZWxFbHQuaW5kZXgoKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxVcCcsIGlkeClcblx0XHRcdFx0aWYgKGlkeCA+IDApIHtcblx0XHRcdFx0XHRzZWxFbHQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdFx0Y29uc3QgaXRlbXMgPSBmaWxlcy5maW5kKCcuaXRlbScpXG5cdFx0XHRcdFx0aXRlbXMuZXEoaWR4IC0gMSkuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdFx0aWYgKGlkeCAtMSA+IDApIHtcblx0XHRcdFx0XHRcdGl0ZW1zLmVxKGlkeCAtIDIpLmdldCgwKS5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRpdGVtcy5lcShpZHggLSAxKS5nZXQoMCkuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vc2VsRWx0LmdldCgwKS5zY3JvbGxJbnRvVmlldygpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZWxEb3duID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBzZWxFbHQgPSBmaWxlcy5maW5kKCcuYWN0aXZlJylcblx0XHRcdFx0Y29uc3QgaWR4ID0gc2VsRWx0LmluZGV4KClcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsRG93bicsIGlkeClcblx0XHRcdFx0aWYgKGlkeCA8IGN0cmwubW9kZWwuZmlsZXMubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRcdHNlbEVsdC5yZW1vdmVDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRmaWxlcy5maW5kKCcuaXRlbScpLmVxKGlkeCArIDEpLmFkZENsYXNzKCdhY3RpdmUnKS5nZXQoMCkuc2Nyb2xsSW50b1ZpZXcoZmFsc2UpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRTZWxGaWxlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSBjdHJsLnNjb3BlLmZpbGVzLmZpbmQoJy5hY3RpdmUnKS5pbmRleCgpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0aWYgKGlkeCA8IDApIHJldHVybiBudWxsXG5cdFx0XHRcdGNvbnN0IHsgbXAzLCBuYW1lIH0gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXHRcdFx0XHRjb25zdCB1cmwgPSBzcnZGaWxlcy5maWxlVXJsKGN0cmwubW9kZWwucm9vdERpciArIG5hbWUsIGZyaWVuZFVzZXIpXG5cdFx0XHRcdHJldHVybiB7IG5hbWUsIG1wMywgdXJsIH1cblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAobXAzRmlsdGVycykge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBtcDNGaWx0ZXJzIH0pXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0TVAzRmlsdGVycyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwubXAzRmlsdGVyc1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cbn0pKCk7XG4iLCIvL0B0cy1jaGVja1xuKGZ1bmN0aW9uICgpIHtcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuXHQgKiBAcmV0dXJucyBcblx0ICovXG5cdGZ1bmN0aW9uIGdldEljb25DbGFzcyhuYW1lKSB7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcucGRmJykpIHtcblx0XHRcdHJldHVybiAnZmEgZmEtZmlsZS1wZGYgdzMtdGV4dC1yZWQnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuaGRvYycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhIGZhLWZpbGUtd29yZCB3My10ZXh0LWJsdWUnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcub2dnJykgfHwgbmFtZS5lbmRzV2l0aCgnLm1wMycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhIGZhLWZpbGUtYXVkaW8gdzMtdGV4dC1wdXJwbGUnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcubXA0JykgfHwgbmFtZS5lbmRzV2l0aCgnLndlYm0nKSB8fCBuYW1lLmVuZHNXaXRoKCcuM2dwJykpIHtcblx0XHRcdHJldHVybiAnZmEgZmEtZmlsZS12aWRlbyB3My10ZXh0LW9yYW5nZSdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy56aXAnKSkge1xuXHRcdFx0cmV0dXJuICdmYSBmYS1maWxlLWFyY2hpdmUgdzMtdGV4dC1hbWJlcidcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhYiBmYS1qcyB3My10ZXh0LXllbGxvdydcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5odG1sJykpIHtcblx0XHRcdHJldHVybiAnZmFiIGZhLWh0bWw1IHczLXRleHQtYmx1ZSdcblx0XHR9XHRcblx0XHRyZXR1cm4gJ2ZhIGZhLWZpbGUgdzMtdGV4dC1ibHVlLWdyZXknXG5cdH1cblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuRmlsZUluZm9bXX0gZmlsZXMgXG5cdCAqL1xuXHRmdW5jdGlvbiBzb3J0RmlsZXMoZmlsZXMpIHtcblx0XHRmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG5cdFx0XHRpZiAoYS5mb2xkZXIgJiYgIWIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAtMVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFhLmZvbGRlciAmJiBiLmZvbGRlcikge1xuXHRcdFx0XHRyZXR1cm4gMVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSlcblx0XHR9KVxuXHR9XG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblx0XHRwcm9wczoge1xuXHRcdFx0c2VsZWN0aW9uRW5hYmxlZDogZmFsc2UsXG5cdFx0XHRmb2xkZXJTZWxlY3Rpb25FbmFibGVkOiB0cnVlLFxuXHRcdFx0aW1hZ2VPbmx5OiBmYWxzZSxcblx0XHRcdGZpbHRlckV4dGVuc2lvbjogdW5kZWZpbmVkLFxuXHRcdFx0Z2V0TVAzSW5mbzogZmFsc2UsXG5cdFx0XHRmcmllbmRVc2VyOiAnJyxcblx0XHRcdG1wM0ZpbHRlcnM6IG51bGwsXG5cdFx0XHRtZW51SXRlbXM6IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdHJldHVybiB7fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0ZW1wbGF0ZTogXCJcXG48ZGl2IGJuLXRleHQ9XFxcImluZm9cXFwiIGJuLWJpbmQ9XFxcImluZm9cXFwiIGNsYXNzPVxcXCJpbmZvXFxcIj48L2Rpdj5cXG5cXG48ZGl2IGJuLXNob3c9XFxcImxvYWRpbmdcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRsb2FkaW5nIC4uLlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInBhdGhQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnBhdGhJdGVtOiBvblBhdGhJdGVtXFxcIiBibi1zaG93PVxcXCIhbG9hZGluZ1xcXCI+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImdldFBhdGhcXFwiIGJuLWluZGV4PVxcXCJpZHhcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1yaWdodFxcXCIgYm4tc2hvdz1cXFwiIWlzRmlyc3RcXFwiPjwvaT5cXG5cdFx0PHNwYW4+XFxuXHRcdFx0PGEgY2xhc3M9XFxcInBhdGhJdGVtXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGhyZWY9XFxcIiNcXFwiIGJuLXNob3c9XFxcIiFpc0xhc3RcXFwiIGJuLWRhdGE9XFxcIntpbmZvOiBnZXRQYXRoSW5mb31cXFwiPjwvYT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGlcXFwiIGJuLXNob3c9XFxcImlzTGFzdFxcXCIgY2xhc3M9XFxcImxhc3RJdGVtXFxcIj48L3NwYW4+XFxuXFxuXHRcdDwvc3Bhbj5cXG5cdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cXG5cdDxkaXYgXFxuXHRcdGJuLWVhY2g9XFxcImdldEZpbGVzXFxcIiBcXG5cdFx0Ym4taXRlcj1cXFwiZlxcXCIgXFxuXHRcdGJuLWxhenp5PVxcXCIxMFxcXCIgXFxuXHRcdGJuLWJpbmQ9XFxcImZpbGVzXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLmZvbGRlcjogb25Gb2xkZXJDbGljaywgY2xpY2suY2hlY2s6IG9uQ2hlY2tDbGljaywgY2xpY2suZmlsZTogb25GaWxlQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLnRodW1ibmFpbDogb25Db250ZXh0TWVudVxcXCJcXG5cdFx0Y2xhc3M9XFxcImNvbnRhaW5lclxcXCJcXG5cdD5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidGh1bWJuYWlsIHczLWNhcmQtMlxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZXRJdGVtc31cXFwiPlxcblxcblx0XHRcdDxzcGFuIGJuLWlmPVxcXCJpZjFcXFwiPlxcblx0XHRcdFx0PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1zaG93PVxcXCJzaG93Q2hlY2tTZWxlY3Rpb25cXFwiIGNsYXNzPVxcXCJjaGVjayB3My1jaGVja1xcXCJcXG5cdFx0XHRcdFx0Ym4tcHJvcD1cXFwie2NoZWNrZWQ6ICRzY29wZS5mLmNoZWNrZWR9XFxcIj5cXG5cdFx0XHQ8L3NwYW4+XFxuXHRcdFx0PGRpdiBibi1pZj1cXFwiJHNjb3BlLmYuZm9sZGVyXFxcIiBjbGFzcz1cXFwiZm9sZGVyIGl0ZW1cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS00eCBmYS1mb2xkZXItb3BlbiB3My10ZXh0LWRlZXAtb3JhbmdlXFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIiBibi1pZj1cXFwiaWYxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpZjJcXFwiIGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2xhc3MxfVxcXCI+PC9pPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpc01QM1xcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjbGFzczF9XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8ZGl2PlRpdGxlOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubXAzLnRpdGxlXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cXG5cdFx0XHRcdFx0PGRpdj5BcnRpc3Q6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMuYXJ0aXN0XFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCJoYXNHZW5yZVxcXCI+R2VucmU6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMuZ2VucmVcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcImdldER1cmF0aW9uXFxcIj5EdXJhdGlvbjombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcImdldER1cmF0aW9uXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCJoYXNZZWFyXFxcIj4gWWVhcjombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcImdldFllYXJcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PGRpdiBibi1pZj1cXFwiaWYzXFxcIiBjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IGdldFRodW1ibmFpbFVybH1cXFwiPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERpbWVuc2lvblxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XCIsXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0geyp9IGVsdCBcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gc3J2RmlsZXMgXG5cdFx0ICovXG5cdFx0aW5pdDogZnVuY3Rpb24gKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdFx0Y29uc3QgdGh1bWJuYWlsU2l6ZSA9ICcxMDB4PydcblxuXHRcdFx0bGV0IHNlbGVjdGVkID0gZmFsc2VcblxuXHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLlByb3BzfSAqL1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0c2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0Zm9sZGVyU2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uLFxuXHRcdFx0XHRmcmllbmRVc2VyLFxuXHRcdFx0XHRpbWFnZU9ubHksXG5cdFx0XHRcdGdldE1QM0luZm8sXG5cdFx0XHRcdG1wM0ZpbHRlcnMsXHRcdFx0XHRcblx0XHRcdFx0bWVudUl0ZW1zXG5cdFx0XHR9ID0gdGhpcy5wcm9wcyBcblxuXHRcdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRnZXRJdGVtczogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbWVudUl0ZW1zKHNjb3BlLmYpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRzZWxlY3Rpb25FbmFibGVkLFxuXHRcdFx0XHRcdGZvbGRlclNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdFx0XHRtcDNGaWx0ZXJzLFxuXHRcdFx0XHRcdGluZm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGxldCBuYkZpbGVzID0gMFxuXHRcdFx0XHRcdFx0bGV0IG5iRm9sZGVycyA9IDBcblx0XHRcdFx0XHRcdHRoaXMuZ2V0RmlsZXMoKS5mb3JFYWNoKChpKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGlmIChpLmZvbGRlcikge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChpLm5hbWUgIT0gJy4uJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0bmJGb2xkZXJzKytcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bmJGaWxlcysrXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRcdGxldCByZXQgPSBbXVxuXHRcdFx0XHRcdFx0aWYgKG5iRm9sZGVycyA9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdHJldC5wdXNoKGAke25iRm9sZGVyc30gZm9sZGVyYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChuYkZvbGRlcnMgPiAxKSB7XG5cdFx0XHRcdFx0XHRcdHJldC5wdXNoKGAke25iRm9sZGVyc30gZm9sZGVyc2ApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobmJGaWxlcyA9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdHJldC5wdXNoKGAke25iRmlsZXN9IGZpbGVgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG5iRmlsZXMgPiAxKSB7XG5cdFx0XHRcdFx0XHRcdHJldC5wdXNoKGAke25iRmlsZXN9IGZpbGVzYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiByZXQuam9pbignIC8gJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aXNJbkZpbHRlcjogZnVuY3Rpb24gKG1wM0luZm8pIHtcblx0XHRcdFx0XHRcdHZhciByZXQgPSB0cnVlXG5cdFx0XHRcdFx0XHRmb3IgKGxldCBmIGluIHRoaXMubXAzRmlsdGVycykge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXInLCBmKVxuXHRcdFx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IG1wM0luZm9bZl1cblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndmFsdWUnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsdGVyVmFsdWUgPSB0aGlzLm1wM0ZpbHRlcnNbZl1cblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVyVmFsdWUnLCBmaWx0ZXJWYWx1ZSlcblx0XHRcdFx0XHRcdFx0aWYgKGZpbHRlclZhbHVlICE9ICdBbGwnKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0ICY9IChmaWx0ZXJWYWx1ZSA9PT0gdmFsdWUpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3JldCcsIHJldClcblx0XHRcdFx0XHRcdHJldHVybiByZXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RmlsZXM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLm1wM0ZpbHRlcnMgPT09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXNcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGVzLmZpbHRlcigoZikgPT4ge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZi5mb2xkZXIgfHwgKGYubXAzICYmIGYubXAzICYmIHRoaXMuaXNJbkZpbHRlcihmLm1wMykpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNNUDM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGdldE1QM0luZm8gJiYgc2NvcGUuZi5tcDMgIT0gdW5kZWZpbmVkICYmIHNjb3BlLmYubXAzLnRpdGxlICE9IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdFx0XHRzY29wZS5mLm1wMy50aXRsZSAhPSAnJ1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0UGF0aDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdGFiID0gKCcvaG9tZScgKyB0aGlzLnJvb3REaXIpLnNwbGl0KCcvJylcblx0XHRcdFx0XHRcdHRhYi5zaGlmdCgpXG5cdFx0XHRcdFx0XHR0YWIucG9wKClcblx0XHRcdFx0XHRcdHJldHVybiB0YWJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzTGFzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IHRoaXMuZ2V0UGF0aCgpLmxlbmd0aCAtIDFcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzRmlyc3Q6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoSW5mbzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRQYXRoKCkuc2xpY2UoMSwgc2NvcGUuaWR4ICsgMSkuam9pbignLycpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGhhc0dlbnJlOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGxldCB7IGdlbnJlIH0gPSBzY29wZS5mLm1wM1xuXHRcdFx0XHRcdFx0cmV0dXJuIGdlbnJlICE9IHVuZGVmaW5lZCAmJiBnZW5yZSAhPSAnJyAmJiAhZ2VucmUuc3RhcnRzV2l0aCgnKCcpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGhhc1llYXI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0bGV0IHsgeWVhciB9ID0gc2NvcGUuZi5tcDNcblx0XHRcdFx0XHRcdHJldHVybiB5ZWFyICE9IHVuZGVmaW5lZCAmJiB5ZWFyICE9ICcnXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldFllYXI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHBhcnNlSW50KHNjb3BlLmYubXAzLnllYXIpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldFRodW1ibmFpbFVybDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc3J2RmlsZXMuZmlsZVRodW1ibmFpbFVybCh0aGlzLnJvb3REaXIgKyBzY29wZS5mLm5hbWUsIHRodW1ibmFpbFNpemUsIGZyaWVuZFVzZXIpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpZjE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmYubmFtZSAhPSAnLi4nXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdHNob3dDaGVja1NlbGVjdGlvbjogZnVuY3Rpb24oc2NvcGUpXHR7XG5cdFx0XHRcdFx0XHRsZXQgcmV0ID0gdGhpcy5zZWxlY3Rpb25FbmFibGVkXG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuZi5mb2xkZXIpICB7IHJldCAmPSB0aGlzLmZvbGRlclNlbGVjdGlvbkVuYWJsZWR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGlmMjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmICFzY29wZS5mLmlzSW1hZ2UgJiYgIXRoaXMuaXNNUDMoc2NvcGUpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpZjM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiBzY29wZS5mLmlzSW1hZ2Vcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYGZhLTR4ICR7Z2V0SWNvbkNsYXNzKHNjb3BlLmYubmFtZSl9YFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLmYuc2l6ZVxuXHRcdFx0XHRcdFx0bGV0IHVuaXQgPSAnb2N0ZXRzJ1xuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNpemUgPSBNYXRoLmZsb29yKHNpemUgKiAxMCkgLyAxMFxuXHRcdFx0XHRcdFx0cmV0dXJuICdTaXplOiAnICsgc2l6ZSArICcgJyArIHVuaXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RGltZW5zaW9uOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGQgPSBzY29wZS5mLmRpbWVuc2lvblxuXHRcdFx0XHRcdFx0cmV0dXJuIGBEaW1lbnNpb246ICR7ZC53aWR0aH14JHtkLmhlaWdodH1gXG5cdFx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoc2NvcGUuZi5tdGltZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcblx0XHRcdFx0XHRcdHJldHVybiAnTGFzdCBNb2RpZjogJyArIGRhdGVcblxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXREdXJhdGlvbjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRcdGlmIChzY29wZS5mLm1wMy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICQkLm1lZGlhLmdldEZvcm1hdGVkVGltZShzY29wZS5mLm1wMy5sZW5ndGgpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdFx0XHR9XG5cblxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdG9uUGF0aEl0ZW06IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGF0aEl0ZW0gPSAkKHRoaXMpLmRhdGEoJ2luZm8nKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QYXRoSXRlbScsIHBhdGhJdGVtKVxuXHRcdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdFx0Y29uc3QgbmV3RGlyID0gcGF0aEl0ZW0gPT0gJycgPyAnLycgOiAnLycgKyBwYXRoSXRlbSArICcvJ1xuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2RpcmNoYW5nZScsIHsgbmV3RGlyIH0pXG5cblxuXHRcdFx0XHRcdFx0bG9hZERhdGEobmV3RGlyKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCB7IG5hbWUgfSA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cblx0XHRcdFx0XHRcdGNvbnN0IHsgcm9vdERpciB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdjb250ZXh0bWVudUl0ZW0nLCB7IGNtZCwgaWR4LCBuYW1lLCByb290RGlyIH0pXG5cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25GaWxlQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblxuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdHJvb3REaXI6IGN0cmwubW9kZWwucm9vdERpcixcblx0XHRcdFx0XHRcdFx0aXNJbWFnZTogaW5mby5pc0ltYWdlLFxuXHRcdFx0XHRcdFx0XHRtcDM6IGluZm8ubXAzXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmaWxlY2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25DaGVja0NsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXHRcdFx0XHRcdFx0aW5mby5jaGVja2VkID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignc2VsY2hhbmdlJywgeyBpc1NoYXJlU2VsZWN0ZWQ6IGlzU2hhcmVTZWxlY3RlZCgpIH0pXG5cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uRm9sZGVyQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblxuXHRcdFx0XHRcdFx0Y29uc3QgZGlyTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdFx0Y29uc3QgbmV3RGlyID0gY3RybC5tb2RlbC5yb290RGlyICsgZGlyTmFtZSArICcvJ1xuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdkaXJjaGFuZ2UnLCB7IG5ld0RpciB9KVxuXHRcdFx0XHRcdFx0bG9hZERhdGEobmV3RGlyKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyLCByZXNldEZpbHRlcnMpIHtcblx0XHRcdFx0aWYgKHJvb3REaXIgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2xvYWREYXRhJywgcm9vdERpcilcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbG9hZGluZzogdHJ1ZSB9KVxuXHRcdFx0XHRjb25zdCBmaWxlcyA9IGF3YWl0IHNydkZpbGVzLmxpc3Qocm9vdERpciwgeyBmaWx0ZXJFeHRlbnNpb24sIGltYWdlT25seSwgZ2V0TVAzSW5mbyB9LCBmcmllbmRVc2VyKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXG5cdFx0XHRcdHNvcnRGaWxlcyhmaWxlcylcblxuXHRcdFx0XHRpZiAocmVzZXRGaWx0ZXJzICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdGN0cmwubW9kZWwubXAzRmlsdGVycyA9IG51bGxcblx0XHRcdFx0fVxuXG5cblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRyb290RGlyLFxuXHRcdFx0XHRcdG5iU2VsZWN0aW9uOiAwXG5cdFx0XHRcdH0pXG5cblx0XHRcdH1cblxuXHRcdFx0bG9hZERhdGEoKVxuXG5cdFx0XHRmdW5jdGlvbiBpc1NoYXJlU2VsZWN0ZWQoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLnJvb3REaXIgPT0gJy8nICYmXG5cdFx0XHRcdFx0KGN0cmwubW9kZWwuZmlsZXMuZmluZEluZGV4KChmKSA9PiBmLm5hbWUgPT0gJ3NoYXJlJyAmJiBmLmZvbGRlciAmJiBmLmNoZWNrZWQpICE9IC0xKVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0U2VsRmlsZXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IHNlbEZpbGVzID0gW11cblx0XHRcdFx0Y3RybC5tb2RlbC5maWxlcy5mb3JFYWNoKChmLCBpZHgpID0+IHtcblx0XHRcdFx0XHRjb25zdCB7IG5hbWUsIGNoZWNrZWQgfSA9IGZcblx0XHRcdFx0XHRpZiAoY2hlY2tlZCA9PT0gdHJ1ZSAmJiBuYW1lICE9ICcuLicpIHtcblx0XHRcdFx0XHRcdHNlbEZpbGVzLnB1c2goeyBmaWxlTmFtZTogY3RybC5tb2RlbC5yb290RGlyICsgbmFtZSwgaWR4IH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxGaWxlcycsIHNlbEZpbGVzKVx0XG5cdFx0XHRcdHJldHVybiBzZWxGaWxlc1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldFNlbEZpbGVOYW1lcyA9ICgpID0+IHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0U2VsRmlsZXMoKS5tYXAoKGYpID0+IGYuZmlsZU5hbWUpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0TmJTZWxGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmxlbmd0aFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnRvZ2dsZVNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0c2VsZWN0ZWQgPSAhc2VsZWN0ZWRcblx0XHRcdFx0ZWx0LmZpbmQoJy5jaGVjaycpLnByb3AoJ2NoZWNrZWQnLCBzZWxlY3RlZClcblx0XHRcdFx0Y3RybC5tb2RlbC5maWxlcy5mb3JFYWNoKChmKSA9PiB7IGYuY2hlY2tlZCA9IHNlbGVjdGVkIH0pXG5cdFx0XHRcdGN0cmwudXBkYXRlQXJyYXlWYWx1ZSgnZmlsZXMnLCAnZmlsZXMnKVxuXHRcdFx0XHRlbHQudHJpZ2dlcignc2VsY2hhbmdlJywgeyBpc1NoYXJlU2VsZWN0ZWQ6IGlzU2hhcmVTZWxlY3RlZCgpIH0pXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0Um9vdERpciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmluc2VydEZpbGUgPSBmdW5jdGlvbiAoZmlsZUluZm8sIGlkeCkge1xuXHRcdFx0XHRpZiAoaWR4KSB7XG5cdFx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1BZnRlcignZmlsZXMnLCBpZHgsIGZpbGVJbmZvLCAnZmlsZXMnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGlkeCA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKS5maWx0ZXIoKGYpID0+IGYuZm9sZGVyKS5sZW5ndGhcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpZHgnLCBpZHgpXG5cdFx0XHRcdFx0aWYgKGlkeCA9PSAwKSB7IC8vIG5vIGZvbGRlciwgaW5zZXJ0IGF0IHRoZSBiZWdpbmluZ1xuXHRcdFx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1CZWZvcmUoJ2ZpbGVzJywgMCwgZmlsZUluZm8sICdmaWxlcycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgeyAvLyBpbnNlcnQgYWZ0ZXIgbGFzdCBmb2xkZXJcblx0XHRcdFx0XHRcdGN0cmwuaW5zZXJ0QXJyYXlJdGVtQWZ0ZXIoJ2ZpbGVzJywgaWR4IC0gMSwgZmlsZUluZm8sICdmaWxlcycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgY3RybC5tb2RlbC5maWxlcylcblx0XHRcdFx0Y3RybC51cGRhdGVOb2RlKCdpbmZvJylcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJlbW92ZUZpbGVzID0gZnVuY3Rpb24gKGluZGV4ZXMpIHtcblx0XHRcdFx0Y3RybC5yZW1vdmVBcnJheUl0ZW0oJ2ZpbGVzJywgaW5kZXhlcywgJ2ZpbGVzJylcblx0XHRcdFx0Y3RybC51cGRhdGVOb2RlKCdpbmZvJylcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXBkYXRlRmlsZSA9IGZ1bmN0aW9uIChpZHgsIGluZm8pIHtcblx0XHRcdFx0Y3RybC51cGRhdGVBcnJheUl0ZW0oJ2ZpbGVzJywgaWR4LCBpbmZvLCAnZmlsZXMnKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZUZpbGVJbmZvID0gYXN5bmMgZnVuY3Rpb24gKGZpbGVOYW1lLCBvcHRpb25zKSB7XG5cdFx0XHRcdGNvbnN0IHsgZmlsZXMsIHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0bGV0IGlkeCA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKS5maW5kSW5kZXgoKGkpID0+IGkubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGVGaWxlJywgaWR4LCBmaWxlTmFtZSwgb3B0aW9ucylcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IHNydkZpbGVzLmZpbGVJbmZvKHJvb3REaXIgKyBmaWxlTmFtZSwgZnJpZW5kVXNlciwgb3B0aW9ucylcblx0XHRcdFx0Y3RybC51cGRhdGVBcnJheUl0ZW0oJ2ZpbGVzJywgaWR4LCBpbmZvKVxuXHRcdFx0XHRpZHggPSBmaWxlcy5maW5kSW5kZXgoKGkpID0+IGkubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0ZmlsZXNbaWR4XSA9IGluZm9cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZmlsZXMuZmlsdGVyKChmKSA9PiAhZi5mb2xkZXIpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0RmlsdGVyZWRGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZ2V0RmlsZXMoKS5maWx0ZXIoKGYpID0+ICFmLmZvbGRlcilcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5yZWxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlQ3RybF0gdXBkYXRlJylcblx0XHRcdFx0bG9hZERhdGEodW5kZWZpbmVkLCBmYWxzZSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRNUDNGaWx0ZXJzID0gZnVuY3Rpb24gKG1wM0ZpbHRlcnMpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbXAzRmlsdGVycyB9KVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLm1wM0ZpbHRlcnNcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG59KSgpO1xuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5mb2xkZXJ0cmVlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgXFxuICAgIGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCIgXFxuICAgIGJuLWRhdGE9XFxcIntzb3VyY2U6IHRyZWVJbmZvLCBvcHRpb25zOiB0cmVlT3B0aW9uc31cXFwiXFxuICAgIGJuLWlmYWNlPVxcXCJ0cmVlXFxcIlxcbj48L2Rpdj4gICAgICAgIFxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IHNydkZpbGVzXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0Y29uc3QgdHJlZUluZm8gPSBbXG5cdFx0XHR7IHRpdGxlOiAnSG9tZSBGaWxlcycsIGljb246ICdmYSBmYS1ob21lIHczLXRleHQtYmx1ZScsIGxhenk6IHRydWUsIGRhdGE6IHsgcGF0aDogJy8nIH0gfSxcblx0XHRdXG5cblx0XHRmdW5jdGlvbiBjb25jYXRQYXRoKHBhdGgsIGZpbGVOYW1lKSB7XG5cdFx0XHRsZXQgcmV0ID0gcGF0aFxuXHRcdFx0aWYgKCFwYXRoLmVuZHNXaXRoKCcvJykpIHtcblx0XHRcdFx0cmV0ICs9ICcvJ1xuXHRcdFx0fVxuXHRcdFx0cmV0ICs9IGZpbGVOYW1lXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdFx0Y29uc3QgdHJlZU9wdGlvbnMgPSB7XG5cdFx0XHRsYXp5TG9hZDogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdGNvbnN0IG5vZGUgPSBkYXRhLm5vZGVcblx0XHRcdFx0Y29uc29sZS5sb2coJ2xhenlsb2FkJywgbm9kZS5kYXRhKVxuXHRcdFx0XHRkYXRhLnJlc3VsdCA9IG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgeyBwYXRoIH0gPSBub2RlLmRhdGFcblx0XHRcdFx0XHRjb25zdCBmb2xkZXJzID0gYXdhaXQgc3J2RmlsZXMubGlzdChwYXRoLCB7IGZvbGRlck9ubHk6IHRydWUgfSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmb2xkZXJzJywgZm9sZGVycylcblx0XHRcdFx0XHRjb25zdCByZXN1bHRzID0gZm9sZGVycy5tYXAoKGYpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBmLm5hbWUsXG5cdFx0XHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdFx0XHRwYXRoOiBjb25jYXRQYXRoKHBhdGgsIGYubmFtZSlcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGxhenk6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGZvbGRlcjogdHJ1ZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0cmVzb2x2ZShyZXN1bHRzKVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dHJlZUluZm8sXG5cdFx0XHRcdHRyZWVPcHRpb25zLFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7QnJhaW5qcy5Db250cm9scy5UcmVlLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCB0cmVlID0gY3RybC5zY29wZS50cmVlXG5cblxuXHRcdHRoaXMuZ2V0U2VsUGF0aCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc3Qgbm9kZSA9IHRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cdFx0XHRyZXR1cm4gbm9kZS5kYXRhLnBhdGhcblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRzaG93U2VsZWN0aW9uOiBmYWxzZSxcblx0XHRzaG93U2VuZE1lc3NhZ2U6IGZhbHNlLFxuXHRcdHNob3dDb25uZWN0aW9uU3RhdGU6IHRydWVcblx0fSxcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZyaWVuZHMnLCAnYnJlaXpib3Qubm90aWZzJywgJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBibi1lYWNoPVxcXCJmcmllbmRzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJjbGljay53My1iYXI6IG9uSXRlbUNsaWNrLCBjbGljay5ub3RpZjogb25TZW5kTWVzc2FnZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgc3R5bGU9XFxcImN1cnNvcjogcG9pbnRlcjtcXFwiPlxcblx0XHRcXG5cdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBub3RpZiB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VuZCBNZXNzYWdlXFxcIiBibi1zaG93PVxcXCJzaG93U2VuZE1lc3NhZ2VcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1lbnZlbG9wZVxcXCI+PC9pPlxcblx0XHQ8L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlclxcXCIgYm4tY2xhc3M9XFxcImNsYXNzMVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5mcmllbmRVc2VyTmFtZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cXG48cCBibi1zaG93PVxcXCJzaG93MlxcXCI+WW91IGhhdmUgbm8gZnJpZW5kczwvcD5cIixcblxuXHQvKiogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQnJva2VyLkludGVyZmFjZX0gYnJva2VyIFxuXHQgKiAqL1xuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZyaWVuZHNTcnYsIG5vdGlmc1NydiwgYnJva2VyKSB7XG5cblx0XHRjb25zdCB7c2hvd1NlbGVjdGlvbiwgc2hvd1NlbmRNZXNzYWdlLCBzaG93Q29ubmVjdGlvblN0YXRlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJpZW5kczogW10sXG5cdFx0XHRcdHNob3dTZW5kTWVzc2FnZSxcblx0XHRcdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZyaWVuZHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZnJpZW5kcy5sZW5ndGggPT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3QgJGkgPSBzY29wZS4kaVxuXHRcdFx0XHRcdGNvbnN0IHNob3dDb25uZWN0aW9uU3RhdGUgPSB0aGlzLnNob3dDb25uZWN0aW9uU3RhdGVcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0J3czLXRleHQtZ3JlZW4nOiAkaS5pc0Nvbm5lY3RlZCAmJiBzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRcdFx0J3czLXRleHQtcmVkJzogISRpLmlzQ29ubmVjdGVkICYmIHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdFx0XHQndzMtdGV4dC1ibHVlJzogIXNob3dDb25uZWN0aW9uU3RhdGVcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cblx0XHRcdFx0XHRjb25zdCB1c2VyTmFtZSA9ICBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XS5mcmllbmRVc2VyTmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgdXNlck5hbWUpXG5cdFx0XHRcdFx0aWYgKHNob3dTZWxlY3Rpb24pIHtcblx0XHRcdFx0XHRcdCQodGhpcykuc2libGluZ3MoJy53My1ibHVlJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcygndzMtYmx1ZScpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmcmllbmRjbGljaycsIHt1c2VyTmFtZX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2VuZE1lc3NhZ2U6IGFzeW5jIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgdXNlck5hbWUgPSAgY3RybC5tb2RlbC5mcmllbmRzW2lkeF0uZnJpZW5kVXNlck5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbmRNZXNzYWdlJywgdXNlck5hbWUpXG5cdFx0XHRcdFx0Y29uc3QgdGV4dCA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnU2VuZCBNZXNzYWdlJywgbGFiZWw6ICdNZXNzYWdlOid9KVxuXG5cdFx0XHRcdFx0aWYgKHRleHQgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0bm90aWZzU3J2LnNlbmROb3RpZih1c2VyTmFtZSwge3RleHQsIHJlcGx5OiB0cnVlfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5Nc2d9IG1zZyBcblx0XHQgKiBAcmV0dXJucyBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBvblVwZGF0ZShtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHtpc0Nvbm5lY3RlZCwgdXNlck5hbWV9ID0gbXNnLmRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZyaWVuZHMuZmluZCgoZnJpZW5kKSA9PiB7cmV0dXJuIGZyaWVuZC5mcmllbmRVc2VyTmFtZSA9PSB1c2VyTmFtZX0pXG5cdFx0XHRpbmZvLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWRcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBpZHggPSBlbHQuZmluZCgnbGkudzMtYmx1ZScpLmluZGV4KCk7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzW2lkeF1cblx0XHR9XG5cblx0XHR0aGlzLmdldEZyaWVuZHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHMubWFwKChmcmllbmQpID0+IGZyaWVuZC5mcmllbmRVc2VyTmFtZSlcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZnJpZW5kc1Nydi5nZXRGcmllbmRzKCkudGhlbigoZnJpZW5kcykgPT4ge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmcmllbmRzJywgZnJpZW5kcylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtmcmllbmRzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbZnJpZW5kc10gZGlzcG9zZScpXG5cdFx0XHRicm9rZXIudW5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIG9uVXBkYXRlKVxuXHRcdH1cblxuXG5cdFx0dGhpcy51cGRhdGUoKVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0U2VsZWN0aW9uKCk6c3RyaW5nO1xuXHRcdGdldEZyaWVuZHMoKTpbc3RyaW5nXVxuXHRgLFxuXG5cdCRldmVudHM6ICdmcmllbmRjbGljaydcbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmhvbWUnLCB7XG5cblx0ZGVwczogW1xuXHRcdCdicmVpemJvdC5icm9rZXInLFxuXHRcdCdicmVpemJvdC51c2VycycsXG5cdFx0J2JyZWl6Ym90Lm5vdGlmcycsXG5cdFx0J2JyZWl6Ym90Lmdlb2xvYycsXG5cdFx0J2JyZWl6Ym90LnJ0YycsXG5cdFx0J2JyZWl6Ym90LmFwcHMnLFxuXHRcdCdicmVpemJvdC5zY2hlZHVsZXInLFxuXHRcdCdicmVpemJvdC53YWtlbG9jaycsXG5cdFx0J2JyZWl6Ym90LmZ1bGxzY3JlZW4nXG5cdF0sXG5cblx0cHJvcHM6IHtcblx0XHR1c2VyTmFtZTogJ1Vua25vd24nXG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiaGVhZGVyXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkZ1bGxTY3JlZW5cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25GdWxsU2NyZWVuXFxcIiBibi1zaG93PVxcXCIhZnVsbFNjcmVlblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJFeGl0IEZ1bGxTY3JlZW5cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25FeGl0RnVsbFNjcmVlblxcXCIgYm4tc2hvdz1cXFwiZnVsbFNjcmVlblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWNvbXByZXNzXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkNvbm5lY3Rpb24gU3RhdHVzXFxcIj5cXG5cdFx0XHQ8aSBibi1jbGFzcz1cXFwie3czLXRleHQtZ3JlZW46IGNvbm5lY3RlZCwgdzMtdGV4dC1yZWQ6ICFjb25uZWN0ZWR9XFxcIiBjbGFzcz1cXFwiZmEgZmEtY2lyY2xlXFxcIj48L2k+XFxuXFxuXHRcdDwvYnV0dG9uPlxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcImhhc0luY29taW5nQ2FsbFxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNhbGxSZXNwb25zZVxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLCBcXG5cdFx0XHRcdHRpdGxlOiBjYWxsSW5mby5mcm9tLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0YWNjZXB0OiB7bmFtZTogXFwnQWNjZXB0XFwnfSxcXG5cdFx0XHRcdFx0ZGVueToge25hbWU6IFxcJ0RlY2xpbmVcXCd9LFxcblx0XHRcdFx0fVxcblx0XHRcdH1cXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjYWxsSW5mby5pY29uQ2xzfVxcXCI+PC9pPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblxcblxcblx0PCEtLSBcdDxzdHJvbmcgYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvc3Ryb25nPlxcbiAtLT5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcIm5vdGlmaWNhdGlvbiB3My1idXR0b25cXFwiIHRpdGxlPVxcXCJOb3RpZmljYXRpb25cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ob3RpZmljYXRpb25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1iZWxsXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJhZGdlIHczLXJlZCB3My10aW55XFxcIiBibi10ZXh0PVxcXCJuYk5vdGlmXFxcIiBibi1zaG93PVxcXCJoYXNOb3RpZlxcXCI+PC9zcGFuPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRzZXR0aW5nczoge25hbWU6IFxcJ1NldHRpbmdzXFwnLCBpY29uOiBcXCdmYXMgZmEtY29nXFwnfSxcXG5cdFx0XHRcdFx0YXBwczoge25hbWU6IFxcJ0FwcGxpY2F0aW9uc1xcJywgaWNvbjogXFwnZmFzIGZhLXRoXFwnfSxcXG5cdFx0XHRcdFx0c2VwOiBcXCctLS0tLS1cXCcsXFxuXHRcdFx0XHRcdGxvZ291dDoge25hbWU6IFxcJ0xvZ291dFxcJywgaWNvbjogXFwnZmFzIGZhLXBvd2VyLW9mZlxcJ31cXG5cdFx0XHRcdH0sXFxuXHRcdFx0XHR0aXRsZTogdXNlck5hbWUsXFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnXFxuXHRcdFx0fVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgYm4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbnRleHRNZW51XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLXVzZXItY2lyY2xlIGZhLWxnXFxcIj48L2k+XFxuXFxuXHRcdDwvZGl2Plxcblxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuXFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnRhYnNcXFwiIGNsYXNzPVxcXCJjb250ZW50XFxcIiBibi1pZmFjZT1cXFwidGFic1xcXCJcXG5cdGJuLWV2ZW50PVxcXCJ0YWJzcmVtb3ZlOiBvblRhYlJlbW92ZSwgdGFic2FjdGl2YXRlOiBvblRhYkFjdGl2YXRlXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuYXBwc1xcXCIgYm4tZGF0YT1cXFwie1xcblx0XHRcdGFwcHM6IGdldE15QXBwcyxcXG5cdFx0XHRpdGVtc1xcblx0XHR9XFxcIiBibi1ldmVudD1cXFwiYXBwY2xpY2s6IG9uQXBwQ2xpY2ssIGFwcGNvbnRleHRtZW51OiBvblRpbGVDb250ZXh0TWVudVxcXCIgdGl0bGU9XFxcIkhvbWVcXFwiPlxcblx0PC9kaXY+XFxuXFxuPC9kaXY+XCIsXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5JbnRlcmZhY2V9IGJyb2tlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Vc2VyLkludGVyZmFjZX0gdXNlcnMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuTm90aWYuSW50ZXJmYWNlfSBub3RpZnNTcnYgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuR2VvbG9jLkludGVyZmFjZX0gZ2VvbG9jIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlJUQy5JbnRlcmZhY2V9IHJ0YyBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5BcHBzLkludGVyZmFjZX0gc3J2QXBwcyBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5TY2hlZHVsZXIuSW50ZXJmYWNlfSBzY2hlZHVsZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuV2FrZUxvY2suSW50ZXJmYWNlfSB3YWtlbG9jayBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GdWxsU2NyZWVuLkludGVyZmFjZX0gZnVsbHNjcmVlbiBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIGJyb2tlciwgdXNlcnMsIG5vdGlmc1NydiwgZ2VvbG9jLCBydGMsIHNydkFwcHMsIHNjaGVkdWxlciwgd2FrZWxvY2ssIGZ1bGxzY3JlZW4pIHtcblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZUF1ZGlvKCkge1xuXHRcdFx0bGV0IGF1ZGlvID0gbnVsbFxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0cGxheTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2F1ZGlvIHBsYXknKVxuXHRcdFx0XHRcdGF1ZGlvID0gbmV3IEF1ZGlvKCcvYXNzZXRzL3NreXBlLm1wMycpXG5cdFx0XHRcdFx0YXVkaW8ubG9vcCA9IHRydWVcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHsgYXVkaW8ucGxheSgpIH0sIDEwMClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRzdG9wOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gc3RvcCcpXG5cdFx0XHRcdFx0aWYgKGF1ZGlvICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnBhdXNlKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXVkaW8gPSBudWxsXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRydGMucHJvY2Vzc0NhbGwoKVxuXG5cdFx0cnRjLm9uKCdjYWxsJywgZnVuY3Rpb24gKGNhbGxJbmZvKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBoYXNJbmNvbWluZ0NhbGw6IHRydWUsIGNhbGxJbmZvIH0pXG5cdFx0XHRhdWRpby5wbGF5KClcblx0XHR9KVxuXG5cdFx0cnRjLm9uKCdjYW5jZWwnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBoYXNJbmNvbWluZ0NhbGw6IGZhbHNlIH0pXG5cdFx0XHRhdWRpby5zdG9wKClcblx0XHR9KVxuXG5cdFx0Y29uc3QgeyB1c2VyTmFtZSB9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgYXVkaW8gPSBjcmVhdGVBdWRpbygpXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcHM6IFtdLFxuXHRcdFx0XHR1c2VyTmFtZSxcblx0XHRcdFx0bmJOb3RpZjogMCxcblx0XHRcdFx0aGFzSW5jb21pbmdDYWxsOiBmYWxzZSxcblx0XHRcdFx0Y2FsbEluZm86IG51bGwsXG5cdFx0XHRcdGZ1bGxTY3JlZW46IGZhbHNlLFxuXHRcdFx0XHRjb25uZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRoYXNOb3RpZjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm5iTm90aWYgPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldE15QXBwczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmFwcHMuZmlsdGVyKChhKSA9PiBhLmFjdGl2YXRlZClcblx0XHRcdFx0fSxcblx0XHRcdFx0aXRlbXM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVtb3ZlOiB7IG5hbWU6ICdSZW1vdmUnIH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRpbGVDb250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGF3YWl0IHVzZXJzLmFjdGl2YXRlQXBwKGRhdGEuYXBwTmFtZSwgZmFsc2UpXG5cdFx0XHRcdFx0bG9hZEFwcCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQXBwQ2xpY2s6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQXBwQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdG9wZW5BcHAoZGF0YS5hcHBOYW1lKVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29udGV4dE1lbnU6IGFzeW5jIGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnbG9nb3V0Jykge1xuXHRcdFx0XHRcdFx0c2NoZWR1bGVyLmxvZ291dCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnYXBwcycpIHtcblx0XHRcdFx0XHRcdG9wZW5BcHAoJ3N0b3JlJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdzZXR0aW5ncycpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHNldHRpbmdzID0gYXdhaXQgdXNlcnMuZ2V0VXNlclNldHRpbmdzKClcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXR0aW5nJywgc2V0dGluZ3MpXG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdzZXR0aW5ncycsIHNldHRpbmdzKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5vdGlmaWNhdGlvbjogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Ob3RpZmljYXRpb24nKVxuXHRcdFx0XHRcdGlmIChjdHJsLm1vZGVsLm5iTm90aWYgPT0gMCkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgY29udGVudDogJ25vIG5vdGlmaWNhdGlvbnMnLCB0aXRsZTogJ05vdGlmaWNhdGlvbnMnIH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0b3BlbkFwcCgnbm90aWYnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYWxsUmVzcG9uc2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IHsgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25DYWxsUmVzcG9uc2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogZmFsc2UgfSlcblx0XHRcdFx0XHRhdWRpby5zdG9wKClcblx0XHRcdFx0XHRpZiAoY21kID09ICdhY2NlcHQnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7IGZyb20sIGFwcE5hbWUgfSA9IGN0cmwubW9kZWwuY2FsbEluZm9cblx0XHRcdFx0XHRcdG9wZW5BcHAoYXBwTmFtZSwge1xuXHRcdFx0XHRcdFx0XHRjYWxsZXI6IGZyb20sXG5cdFx0XHRcdFx0XHRcdGNsaWVudElkOiBydGMuZ2V0UmVtb3RlQ2xpZW50SWQoKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnZGVueScpIHtcblx0XHRcdFx0XHRcdHJ0Yy5kZW55KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25FeGl0RnVsbFNjcmVlbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRXhpdEZ1bGxTY3JlZW4nKVxuXHRcdFx0XHRcdGZ1bGxzY3JlZW4uZXhpdCgpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GdWxsU2NyZWVuOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZ1bGxTY3JlZW4nKVxuXHRcdFx0XHRcdGZ1bGxzY3JlZW4uZW50ZXIoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRhYlJlbW92ZTogZnVuY3Rpb24gKGV2LCBpZHgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRhYlJlbW92ZScsIGlkeClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gdGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcEV4aXQoKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHRhYnMucmVtb3ZlVGFiKGlkeClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRhYkFjdGl2YXRlOiBmdW5jdGlvbiAoZXYsIHVpKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UYWJBY3RpdmF0ZScpXG5cdFx0XHRcdFx0Y29uc3QgeyBuZXdUYWIsIG9sZFRhYiB9ID0gdWlcblx0XHRcdFx0XHRjb25zdCBuZXdUYWJJZHggPSBuZXdUYWIuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IG9sZFRhYklkeCA9IG9sZFRhYi5pbmRleCgpXG5cdFx0XHRcdFx0aWYgKG9sZFRhYklkeCA+IDApIHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSB0YWJzLmdldFRhYkluZm8ob2xkVGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBTdXNwZW5kKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG5ld1RhYklkeCA+IDApIHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSB0YWJzLmdldFRhYkluZm8obmV3VGFiSWR4KVxuXHRcdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID09IDApIHtcblx0XHRcdFx0XHRcdGxvYWRBcHAoKVxuXHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0LyoqQHR5cGUge0JyYWluanMuQ29udHJvbHMuVGFicy5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgdGFicyA9IGN0cmwuc2NvcGUudGFic1xuXG5cdFx0ZnVsbHNjcmVlbi5pbml0KChmdWxsU2NyZWVuKSA9PiB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBmdWxsU2NyZWVuIH0pXG5cdFx0fSlcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBuYk5vdGlmIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHVwZGF0ZU5vdGlmcyhuYk5vdGlmKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBuYk5vdGlmIH0pXG5cblx0XHR9XG5cblx0XHRicm9rZXIub24oJ2Nvbm5lY3RlZCcsIChzdGF0ZSkgPT4ge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgY29ubmVjdGVkOiBzdGF0ZSB9KVxuXHRcdH0pXG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldikgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2hvbWVdIG1lc3NhZ2UnLCBldi5kYXRhKVxuXHRcdFx0Y29uc3QgeyB0eXBlLCBkYXRhIH0gPSBldi5kYXRhXG5cdFx0XHRpZiAodHlwZSA9PSAnb3BlbkFwcCcpIHtcblx0XHRcdFx0Y29uc3QgeyBhcHBOYW1lLCBhcHBQYXJhbXMsIG5ld1RhYlRpdGxlIH0gPSBkYXRhXG5cdFx0XHRcdG9wZW5BcHAoYXBwTmFtZSwgYXBwUGFyYW1zLCBuZXdUYWJUaXRsZSlcblx0XHRcdH1cblx0XHRcdGlmICh0eXBlID09ICdyZWxvYWQnKSB7XG5cdFx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpXG5cdFx0XHR9XG5cblx0XHR9LCBmYWxzZSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIChtc2cpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2JyZWl6Ym90LmZyaWVuZHMnLCBtc2cpXG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHQvKipAdHlwZSBCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuRXZlbnRzLkZyaWVuZHMgKi9cblx0XHRcdGNvbnN0IHsgaXNDb25uZWN0ZWQsIHVzZXJOYW1lIH0gPSBtc2cuZGF0YVxuXHRcdFx0aWYgKGlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdCQubm90aWZ5KGAnJHt1c2VyTmFtZX0nIGlzIGNvbm5lY3RlZGAsICdzdWNjZXNzJylcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQkLm5vdGlmeShgJyR7dXNlck5hbWV9JyBpcyBkaXNjb25uZWN0ZWRgLCAnZXJyb3InKVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3Qubm90aWZDb3VudCcsIGZ1bmN0aW9uIChtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcyhtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LmxvZ291dCcsIGZ1bmN0aW9uIChtc2cpIHtcblx0XHRcdGxvY2F0aW9uLmhyZWYgPSAnL2xvZ291dCdcblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBvcGVuQXBwKGFwcE5hbWUsIHBhcmFtcywgbmV3VGFiVGl0bGUpIHtcblx0XHRcdGNvbnN0IGFwcEluZm8gPSBjdHJsLm1vZGVsLmFwcHMuZmluZCgoYSkgPT4gYS5hcHBOYW1lID09IGFwcE5hbWUpXG5cdFx0XHRsZXQgdGl0bGUgPSBhcHBJbmZvLnByb3BzLnRpdGxlXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvcGVuQXBwJywgYXBwTmFtZSwgcGFyYW1zLCBuZXdUYWJUaXRsZSlcblx0XHRcdGxldCBpZHggPSB0YWJzLmdldFRhYkluZGV4RnJvbVRpdGxlKHRpdGxlKVxuXHRcdFx0Y29uc3QgYXBwVXJsID0gJCQudXJsLmdldFVybFBhcmFtcyhgL2FwcHMvJHthcHBOYW1lfWAsIHBhcmFtcylcblx0XHRcdGNvbnN0IGFkZE5ld1RhYiA9IHR5cGVvZiBuZXdUYWJUaXRsZSA9PSAnc3RyaW5nJ1xuXHRcdFx0aWYgKGFkZE5ld1RhYiB8fCBpZHggPCAwKSB7IC8vIGFwcHMgbm90IGFscmVhZHkgcnVuXG5cdFx0XHRcdGlkeCA9IHRhYnMuYWRkVGFiKFxuXHRcdFx0XHRcdCghYWRkTmV3VGFiKSA/IHRpdGxlIDogYCR7dGl0bGV9WyR7bmV3VGFiVGl0bGV9XWAsXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmVtb3ZhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdFx0Y29udHJvbDogJ2JyZWl6Ym90LmFwcFRhYicsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRhcHBVcmxcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGluZm8gPSB0YWJzLmdldFRhYkluZm8oaWR4KVxuXHRcdFx0XHRpZiAocGFyYW1zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGluZm8uY3RybElmYWNlLnNldEFwcFVybChhcHBVcmwpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGFicy5zZXRTZWxlY3RlZFRhYkluZGV4KGlkeClcblxuXHRcdH1cblxuXHRcdG5vdGlmc1Nydi5nZXROb3RpZkNvdW50KCkudGhlbih1cGRhdGVOb3RpZnMpXG5cblx0XHRmdW5jdGlvbiBsb2FkQXBwKCkge1xuXHRcdFx0c3J2QXBwcy5saXN0QWxsKCkudGhlbigoYXBwcykgPT4ge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRhcHBzXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXG5cdFx0bG9hZEFwcCgpXG5cblx0XHRnZW9sb2Muc3RhcnRXYXRjaCgpXG5cblx0XHR3YWtlbG9jay5yZXF1ZXN0V2FrZUxvY2soKVxuXG5cdH1cbn0pO1xuIiwiXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucGFnZXInLCB7XG5cblx0cHJvcHM6IHtcblx0XHRyb290UGFnZTogJydcblx0fSxcblx0dGVtcGxhdGU6IFwiPGRpdiBibi1zaG93PVxcXCJzaG93QmFja1xcXCIgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkJhY2tcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25CYWNrXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYXJyb3ctbGVmdFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0PHNwYW4gYm4tdGV4dD1cXFwidGl0bGVcXFwiIGNsYXNzPVxcXCJ0aXRsZVxcXCI+PC9zcGFuPlxcblx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYnV0dG9uc1xcXCIgY2xhc3M9XFxcInJpZ2h0XFxcIiBibi1ldmVudD1cXFwiY2xpY2suYWN0aW9uOiBvbkFjdGlvbiwgY29udGV4dG1lbnVjaGFuZ2UubWVudTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdDxidXR0b24gYm4tc2hvdz1cXFwic2hvdzFcXFwiIGNsYXNzPVxcXCJ3My1idXR0b24gYWN0aW9uXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGkubGFiZWxcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIiBibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFpc0VuYWJsZWR9XFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93MlxcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBhY3Rpb25cXFwiIGJuLWRhdGE9XFxcIntjbWQ6ICRzY29wZS4kaS5uYW1lfVxcXCJcXG5cdFx0XHRibi1hdHRyPVxcXCJ7dGl0bGU6ICRzY29wZS4kaS50aXRsZX1cXFwiIGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWlzRW5hYmxlZH1cXFwiPjxpIGJuLWF0dHI9XFxcIntjbGFzczogJHNjb3BlLiRpLmljb259XFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93M1xcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBtZW51XFxcIiBcXG5cdFx0XHRibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFpc0VuYWJsZWR9XFxcIlxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogJHNjb3BlLiRpLml0ZW1zLCB0cmlnZ2VyOiBcXCdsZWZ0XFwnLCBjbWQ6ICRzY29wZS4kaS5uYW1lfVxcXCJcXG5cdFx0XHRibi1hdHRyPVxcXCJ7dGl0bGU6ICRzY29wZS4kaS50aXRsZX1cXFwiPjxpIGJuLWF0dHI9XFxcIntjbGFzczogJHNjb3BlLiRpLmljb259XFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDwvZGl2Plx0XHRcdFxcblx0PC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBibi1iaW5kPVxcXCJjb250ZW50XFxcIiBjbGFzcz1cXFwiY29udGVudFxcXCI+PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG5cdFx0Y29uc3QgeyByb290UGFnZSB9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzaG93QmFjazogZmFsc2UsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0YnV0dG9uczogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaXRlbXMgPT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmljb24gPT0gdW5kZWZpbmVkICYmICEoc2NvcGUuJGkudmlzaWJsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaXRlbXMgPT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmljb24gIT0gdW5kZWZpbmVkICYmICEoc2NvcGUuJGkudmlzaWJsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3czOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuaXRlbXMgIT0gdW5kZWZpbmVkICYmICEoc2NvcGUuJGkudmlzaWJsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzRW5hYmxlZChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5lbmFibGVkID09IHVuZGVmaW5lZCB8fCBzY29wZS4kaS5lbmFibGVkID09PSB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25CYWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkJhY2snKVxuXHRcdFx0XHRcdHJlc3RvcmVQYWdlKHRydWUpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWN0aW9uOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCBjbWQgPSAkKHRoaXMpLmRhdGEoJ2NtZCcpXG5cdFx0XHRcdFx0Y29uc3QgcGFnZUN0cmxJZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZm4gPSBjdXJJbmZvLmJ1dHRvbnNbY21kXS5vbkNsaWNrXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRmbi5jYWxsKHBhZ2VDdHJsSWZhY2UpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbnRleHRNZW51OiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdGNvbnN0IHBhZ2VDdHJsSWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdFx0XHRjb25zdCBmbiA9IGN1ckluZm8uYnV0dG9uc1tjbWRdLm9uQ2xpY2tcblx0XHRcdFx0XHRpZiAodHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdGZuLmNhbGwocGFnZUN0cmxJZmFjZSwgZGF0YS5jbWQpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjdHJsLnNjb3BlLmNvbnRlbnRcblx0XHRjb25zdCBzdGFjayA9IFtdXG5cdFx0bGV0IGN1ckluZm8gPSBudWxsXG5cblxuXG5cdFx0ZnVuY3Rpb24gcmVzdG9yZVBhZ2UoaXNCYWNrLCBkYXRhKSB7XG5cblx0XHRcdGNvbnN0IGlmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdGxldCBiYWNrVmFsdWVcblxuXHRcdFx0aWYgKHR5cGVvZiBpZmFjZS5vbkJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRiYWNrVmFsdWUgPSBpZmFjZS5vbkJhY2soKVxuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZygncG9wUGFnZScsIHBhZ2VDdHJsKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNhZmVFbXB0eSgpLnJlbW92ZSgpXG5cblx0XHRcdGNvbnN0IHsgb25CYWNrLCBvblJldHVybiB9ID0gY3VySW5mb1xuXG5cdFx0XHRjdXJJbmZvID0gc3RhY2sucG9wKClcblx0XHRcdGN1ckluZm8uY3RybC5zaG93KClcblx0XHRcdGNvbnN0IHsgdGl0bGUsIGJ1dHRvbnMgfSA9IGN1ckluZm9cblx0XHRcdGN0cmwuc2V0RGF0YSh7IHNob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJykgfSlcblxuXHRcdFx0aWYgKGlzQmFjaykge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbcGFnZXJdIGJhY2snLCBpZmFjZS5uYW1lKVxuXHRcdFx0XHRpZiAodHlwZW9mIG9uQmFjayA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1twYWdlcl0gb25CYWNrJywgaWZhY2UubmFtZSlcblx0XHRcdFx0XHRvbkJhY2suY2FsbChpZmFjZSwgYmFja1ZhbHVlKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0eXBlb2Ygb25SZXR1cm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbcGFnZXJdIG9uUmV0dXJuJywgaWZhY2UubmFtZSwgZGF0YSlcblx0XHRcdFx0b25SZXR1cm4uY2FsbChpZmFjZSwgZGF0YSlcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHRoaXMucG9wUGFnZSA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRyZXR1cm4gcmVzdG9yZVBhZ2UoZmFsc2UsIGRhdGEpXG5cdFx0fVxuXG5cdFx0dGhpcy5wdXNoUGFnZSA9IGZ1bmN0aW9uIChjdHJsTmFtZSwgb3B0aW9ucykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBwdXNoUGFnZScsIGN0cmxOYW1lKVxuXG5cblx0XHRcdGlmIChjdXJJbmZvICE9IG51bGwpIHtcblx0XHRcdFx0Y3VySW5mby5jdHJsLmhpZGUoKVxuXHRcdFx0XHRzdGFjay5wdXNoKGN1ckluZm8pXG5cdFx0XHR9XG5cblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cblx0XHRcdGxldCB7IHRpdGxlLCBwcm9wcywgb25SZXR1cm4sIG9uQmFjaywgZXZlbnRzIH0gPSBvcHRpb25zXG5cblx0XHRcdGNvbnN0IGNvbnRyb2wgPSBjb250ZW50LmFkZENvbnRyb2woY3RybE5hbWUsIHByb3BzLCBldmVudHMpXG5cblx0XHRcdGxldCBidXR0b25zID0ge31cblxuXHRcdFx0aWYgKG9wdGlvbnMuYnV0dG9ucyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0YnV0dG9ucyA9IG9wdGlvbnMuYnV0dG9uc1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGdldEJ1dHRvbnMgPSBjb250cm9sLmlmYWNlKCkuZ2V0QnV0dG9uc1xuXHRcdFx0XHRpZiAodHlwZW9mIGdldEJ1dHRvbnMgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGJ1dHRvbnMgPSBnZXRCdXR0b25zKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjdXJJbmZvID0geyB0aXRsZSwgYnV0dG9ucywgb25SZXR1cm4sIG9uQmFjaywgY3RybDogY29udHJvbCB9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IHNob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJykgfSlcblx0XHRcdHJldHVybiBjb250cm9sLmlmYWNlKClcblx0XHR9XG5cblx0XHR0aGlzLnNldEJ1dHRvblZpc2libGUgPSBmdW5jdGlvbiAoYnV0dG9uc1Zpc2libGUpIHtcblxuXHRcdFx0Y29uc3QgeyBidXR0b25zIH0gPSBjdXJJbmZvXG5cblx0XHRcdGZvciAobGV0IGJ0biBpbiBidXR0b25zVmlzaWJsZSkge1xuXHRcdFx0XHRpZiAoYnRuIGluIGJ1dHRvbnMpIHtcblx0XHRcdFx0XHRidXR0b25zW2J0bl0udmlzaWJsZSA9IGJ1dHRvbnNWaXNpYmxlW2J0bl1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNldERhdGEoeyBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKSB9KVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QnV0dG9uRW5hYmxlZCA9IGZ1bmN0aW9uIChidXR0b25zRW5hYmxlZCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2V0QnV0dG9uRW5hYmxlZCcsIGJ1dHRvbnNFbmFibGVkKVxuXG5cdFx0XHRjb25zdCB7IGJ1dHRvbnMgfSA9IGN1ckluZm9cblxuXHRcdFx0aWYgKHR5cGVvZiBidXR0b25zRW5hYmxlZCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0XHRcdGZvciAobGV0IGJ0biBpbiBidXR0b25zKSB7XG5cdFx0XHRcdFx0YnV0dG9uc1tidG5dLmVuYWJsZWQgPSBidXR0b25zRW5hYmxlZFxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRmb3IgKGxldCBidG4gaW4gYnV0dG9uc0VuYWJsZWQpIHtcblx0XHRcdFx0XHRpZiAoYnRuIGluIGJ1dHRvbnMpIHtcblx0XHRcdFx0XHRcdGJ1dHRvbnNbYnRuXS5lbmFibGVkID0gYnV0dG9uc0VuYWJsZWRbYnRuXVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IGJ1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpIH0pXG5cdFx0fVxuXG5cdFx0dGhpcy5wdXNoUGFnZShyb290UGFnZSlcblxuXHR9XG5cbn0pO1xuXG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucGRmJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBibi1zaG93PVxcXCJ3YWl0XFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+IFJlbmRlcmluZy4uLlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIiF3YWl0XFxcIj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiUmVmcmVzaFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtc3luYy1hbHRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblJlZnJlc2hcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIkZpdFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtZXhwYW5kXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25GaXRcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlpvb20gSW5cXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLXNlYXJjaC1wbHVzXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25ab29tSW5cXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlpvb20gT3V0XFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1zZWFyY2gtbWludXMgXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25ab29tT3V0XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJSb3RhdGUgTGVmdFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmFzIGZhLXVuZG8tYWx0XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Sb3RhdGVMZWZ0XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJSb3RhdGUgUmlnaHRcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhcyBmYS1yZWRvLWFsdFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUm90YXRlUmlnaHRcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlByaW50XFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1wcmludFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJpbnRcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIkdvIHRvIFBhZ2VcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLXJlcGx5IGZhLWZsaXAtaG9yaXpvbnRhbFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uR290b1BhZ2VcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcInBhZ2VzXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwicHJldmlvdXMgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZQYWdlXFxcIiBibi1pY29uPVxcXCJmYSBmYS1hbmdsZS1sZWZ0XFxcIj5cXG5cdFx0XHQ8L2J1dHRvbj5cdFxcblxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIm5leHQgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5leHRQYWdlXFxcIiBibi1pY29uPVxcXCJmYSBmYS1hbmdsZS1yaWdodFxcXCI+XFxuXHRcdFx0PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2Plxcblx0XHRcdFBhZ2VzOiA8c3BhbiBibi10ZXh0PVxcXCJjdXJyZW50UGFnZVxcXCI+PC9zcGFuPiAvIDxzcGFuIGJuLXRleHQ9XFxcIm51bVBhZ2VzXFxcIj48L3NwYW4+XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2Plxcblx0XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnBkZlxcXCIgXFxuXHRibi1kYXRhPVxcXCJ7d29ya2VyOiBcXCcvYnJhaW5qcy9wZGYvd29ya2VyLmpzXFwnfVxcXCJcXG5cdGJuLWlmYWNlPVxcXCJwZGZcXFwiXFxuXHQgXFxuPjwvZGl2Plx0XHRcXG5cIixcblxuXHRwcm9wczoge1xuXHRcdHVybDogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0KSB7XG5cblx0XHQvL0B0cy1pZ25vcmVcblx0XHRjb25zdCB7IHVybCB9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgcHJvZ3Jlc3NEbGcgPSAkJC51aS5wcm9ncmVzc0RpYWxvZygnUHJvY2Vzc2luZy4uLicpXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bnVtUGFnZXM6IDAsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0Y3VycmVudFBhZ2U6IDEsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm51bVBhZ2VzID4gMSAmJiAhdGhpcy53YWl0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25SZWZyZXNoOiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRhd2FpdCBwZGYucmVmcmVzaCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUm90YXRlUmlnaHQ6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUm90YXRlUmlnaHQnKVxuXHRcdFx0XHRcdGF3YWl0IHBkZi5yb3RhdGVSaWdodCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUm90YXRlTGVmdDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Sb3RhdGVMZWZ0Jylcblx0XHRcdFx0XHRhd2FpdCBwZGYucm90YXRlTGVmdCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uWm9vbUluOiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblpvb21JbicpXG5cdFx0XHRcdFx0YXdhaXQgcGRmLnpvb21JbigpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uWm9vbU91dDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25ab29tT3V0Jylcblx0XHRcdFx0XHRhd2FpdCBwZGYuem9vbU91dCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uR290b1BhZ2U6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHBhZ2VObyA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdHbyB0byBQYWdlJyxcblx0XHRcdFx0XHRcdGxhYmVsOiAnUGFnZSBOdW1iZXInLFxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcblx0XHRcdFx0XHRcdFx0dHlwZTogJ251bWJlcicsXG5cdFx0XHRcdFx0XHRcdG1pbjogMSxcblx0XHRcdFx0XHRcdFx0bWF4OiBjdHJsLm1vZGVsLm51bVBhZ2VzLFxuXHRcdFx0XHRcdFx0XHRzdGVwOiAxXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyB3YWl0OiB0cnVlIH0pXG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudFBhZ2UgPSAgYXdhaXQgcGRmLnNldFBhZ2UocGFnZU5vKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZSB9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblByaW50OiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKDApXG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2hvdygpXG5cdFx0XHRcdFx0YXdhaXQgcGRmLnByaW50KHtcblx0XHRcdFx0XHRcdG9uUHJvZ3Jlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZShkYXRhLnBhZ2UgLyBjdHJsLm1vZGVsLm51bVBhZ2VzKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuaGlkZSgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTmV4dFBhZ2U6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTmV4dFBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9IGF3YWl0IHBkZi5uZXh0UGFnZSgpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlIH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QcmV2UGFnZTogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QcmV2UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRQYWdlID0gYXdhaXQgcGRmLnByZXZQYWdlKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50UGFnZSwgd2FpdDogZmFsc2UgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpdDogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0cGRmLmZpdCgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7QnJhaW5qcy5Db250cm9scy5QZGYuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IHBkZiA9IGN0cmwuc2NvcGUucGRmXG5cblx0XHRhc3luYyBmdW5jdGlvbiBvcGVuRmlsZSh1cmwsIHRpdGxlKSB7XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgbnVtUGFnZXMgPSBhd2FpdCBwZGYub3BlbkZpbGUodXJsKVxuXHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZSBsb2FkZWQnKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRcdG51bVBhZ2VzLFxuXHRcdFx0XHRcdHdhaXQ6IGZhbHNlXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKSB7XG5cdFx0XHRcdFxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0aWYgKHVybCAhPSAnJykge1xuXHRcdFx0b3BlbkZpbGUodXJsKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnc2V0RGF0YScsIGRhdGEpXG5cdFx0XHRpZiAoZGF0YS51cmwgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdG9wZW5GaWxlKGRhdGEudXJsKVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdHNldERhdGEoe3VybH0pXG5cdGBcblxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcE5hbWU6ICcnLFxuXHRcdGljb25DbHM6ICcnLFxuXHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJ1xuXHR9LFxuXG5cdC8vdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInN0YXR1c1xcXCI+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbmNlbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cyXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5SVEMuSW50ZXJmYWNlfSBydGMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2FwcE5hbWUsIGljb25DbHMsIHRpdGxlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0ICRjaGlsZHJlbiA9IGVsdC5jaGlsZHJlbigpLnJlbW92ZSgpXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0ZWx0LmFwcGVuZChcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzdGF0dXNcXFwiPlxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmVcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG48ZGl2IGJuLXNob3c9XFxcInNob3c0XFxcIiBibi1iaW5kPVxcXCJwYW5lbFxcXCIgY2xhc3M9XFxcInBhbmVsXFxcIj48L2Rpdj5cIilcblxuXHRcdHJ0Yy5vbignc3RhdHVzJywgKGRhdGEpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3N0YXR1cycsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoZGF0YSlcblx0XHR9KVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0XHRkaXN0YW50OiAnJyxcblx0XHRcdFx0aGFzQ2hpbGRyZW46ICRjaGlsZHJlbi5sZW5ndGggPiAwLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7IFxuXHRcdFx0XHRcdHJldHVybiBbJ3JlYWR5JywgJ2Rpc2Nvbm5lY3RlZCcsICdyZWZ1c2VkJywgJ2NhbmNlbGVkJ10uaW5jbHVkZXModGhpcy5zdGF0dXMpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2NhbGxpbmcnfSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJ30sXG5cdFx0XHRcdHNob3c0OiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcgJiYgdGhpcy5oYXNDaGlsZHJlbn1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNhbGwnKVxuXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dTZWxlY3Rpb246IHRydWVcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRidXR0b25zOiB7XG5cdFx0XHRcdFx0XHRcdGNhbGw6IHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0NhbGwnLFxuXHRcdFx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB0aGlzLmdldFNlbGVjdGlvbigpXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoc2VsZWN0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGZyaWVuZCd9KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHtmcmllbmRVc2VyTmFtZSwgaXNDb25uZWN0ZWR9ID0gc2VsZWN0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlck5hbWUnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJywgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogYFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odXNlck5hbWUpIHtcblx0XHRcdFx0XHRcdFx0cnRjLmNhbGwodXNlck5hbWUsIGFwcE5hbWUsIGljb25DbHMpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdydGNoYW5ndXAnKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRjdHJsLnNjb3BlLnBhbmVsLmFwcGVuZCgkY2hpbGRyZW4pXHRcdFxuXHR9XG5cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5zZWFyY2hiYXInLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCIgYm4tYmluZD1cXFwiZm9ybVxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwic2VhcmNoXFxcIiBcXG4gICAgICAgIG5hbWU9XFxcInZhbHVlXFxcIiBcXG4gICAgICAgIGJuLWF0dHI9XFxcIntwbGFjZWhvbGRlciwgbWlubGVuZ3RoLCByZXF1aXJlZH1cXFwiXFxuXHRcdGF1dG9jb21wbGV0ZT1cXFwib2ZmXFxcIlxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0XFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My10ZXh0LWJsdWVcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCIgPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XCIsXG5cbiAgICBwcm9wczoge1xuICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgIG1pbmxlbmd0aDogMCxcbiAgICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG4gICAgICAgIGNvbnN0IHsgcGxhY2Vob2xkZXIsIG1pbmxlbmd0aCwgcmVxdWlyZWQgfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXIsXG4gICAgICAgICAgICAgICAgbWlubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25TZWFyY2g6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdmFsdWUgfSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuICAgICAgICAgICAgICAgICAgICBlbHQudHJpZ2dlcignc2VhcmNoYmFyc3VibWl0JywgeyB2YWx1ZSB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGN0cmwuc2NvcGUuZm9ybS5zZXRGb3JtRGF0YSh7IHZhbHVlIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgICRpZmFjZTogYFxuICAgICAgICBzZXRWYWx1ZSh2YWx1ZTogc3RyaW5nKVxuICAgIGAsXG4gICAgJGV2ZW50czogJ3NlYXJjaGJhcnN1Ym1pdCdcbn0pOyAxMVxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hZGRVc2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlVzZXJOYW1lPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJ1c2VybmFtZVxcXCIgbmFtZT1cXFwidXNlcm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Qc2V1ZG88L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInBzZXVkb1xcXCIgbmFtZT1cXFwicHNldWRvXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+TG9jYXRpb248L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcImxvY2F0aW9uXFxcIiBuYW1lPVxcXCJsb2NhdGlvblxcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBwbGFjZWhvbGRlcj1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiByZXF1aXJlZD5cdFxcblx0PC9kaXY+XFxuXHRcXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y3JlYXRlOiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdDcmVhdGUnLFxuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XG5cdFx0fVxuXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnVzZXJzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3Qubm90aWZzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25VcGRhdGVcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlVwZGF0ZVxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1yZWRvXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkVXNlclxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIGJ0bkFkZFVzZXJcXFwiIHRpdGxlPVxcXCJBZGQgVXNlclxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyLXBsdXNcXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1zbWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyIGNsYXNzPVxcXCJ3My1ncmVlblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0aD5Vc2VyIE5hbWU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+UHNldWRvPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkxvY2F0aW9uPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkVtYWlsPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkNyZWF0ZSBEYXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkxhc3QgTG9naW4gRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb25zPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJkYXRhXFxcIiBibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvbkRlbGV0ZSwgY2xpY2subm90aWY6IG9uTm90aWZcXFwiPlxcbiAgXHRcdFx0PHRyPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS51c2VybmFtZVxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkucHNldWRvXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sb2NhdGlvblxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZW1haWxcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MVxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0XHQ8dGQ+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXNob3c9XFxcInNob3cyXFxcIj5cXG5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MlxcXCI+PC9zcGFuPjxicj5cXG5cdFx0XHRcdFx0XHRhdCBcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0M1xcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJkZWxldGUgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJEZWxldGUgVXNlclxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZiB3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYmVsbFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0PC90cj4gICAgICBcdFxcblxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuVXNlci5BZG1pbkludGVyZmFjZX0gdXNlcnMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuTm90aWYuSW50ZXJmYWNlfSBub3RpZnNTcnYgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHVzZXJzLCBub3RpZnNTcnYsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmNyZWF0ZURhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlVGltZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmNyZWF0ZURhdGUgIT0gdW5kZWZpbmVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSB1bmRlZmluZWQgJiYgc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRVc2VyOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuYWRkVXNlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGFzeW5jIGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0YXdhaXQgdXNlcnMuYWRkKGRhdGEpXG5cdFx0XHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7IHVzZXJuYW1lIH0gPSBjdHJsLm1vZGVsLmRhdGFbaWR4XVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHsgdGl0bGU6ICdEZWxldGUgVXNlcicsIGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPycgfSwgYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0YXdhaXQgdXNlcnMucmVtb3ZlKHVzZXJuYW1lKVxuXHRcdFx0XHRcdFx0Z2V0VXNlcnMoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWY6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyB1c2VybmFtZSB9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IHRpdGxlOiAnU2VuZCBOb3RpZmljYXRpb24nLCBsYWJlbDogJ01lc3NhZ2UnIH0pXG5cdFx0XHRcdFx0aWYgKHRleHQgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0bm90aWZzU3J2LnNlbmROb3RpZih1c2VybmFtZSwgeyB0ZXh0IH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuXHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHVzZXJzLmxpc3QoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2dldFVzZXJzJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGRhdGEgfSlcblxuXHRcdH1cblxuXHRcdGdldFVzZXJzKClcblxuXG5cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3Qudmlld2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4taWY9XFxcImlzSW1hZ2VcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcImltYWdlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5pbWFnZVxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcIntzcmM6IHVybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBibi1pZj1cXFwiaXNQZGZcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcInBkZlxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnBkZlxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInt1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaXNBdWRpb1xcXCIgY2xhc3M9XFxcImF1ZGlvXFxcIj5cXG5cdDxhdWRpbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L2F1ZGlvPlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlzVmlkZW9cXFwiIGNsYXNzPVxcXCJ2aWRlb1xcXCI+XFxuXHQ8dmlkZW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC92aWRlbz5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpc0RvY1xcXCIgY2xhc3M9XFxcImRvY1xcXCIgYm4tYmluZD1cXFwiZG9jXFxcIiBibi1ldmVudD1cXFwiY2xpY2sudG9wOiBvblRvcFxcXCI+XFxuXHQ8YnV0dG9uIGJuLWljb249XFxcImZhcyBmYS1hbmdsZS11cFxcXCIgY2xhc3M9XFxcInRvcFxcXCIgdGl0bGU9XFxcIlRvcFxcXCIgPjwvYnV0dG9uPlxcblx0PGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJodG1sXFxcIj48L2Rpdj5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlzQ29kZVxcXCIgYm4tYmluZD1cXFwiY29kZVxcXCIgY2xhc3M9XFxcImNvZGVcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0XHQ8cHJlPlxcblx0XHRcdDxjb2RlIGJuLWF0dHI9XFxcIntjbGFzczogbGFuZ3VhZ2V9XFxcIj48L2NvZGU+XFxuXHRcdDwvcHJlPlxcblx0PC9kaXY+XFxuXFxuPC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHR0eXBlOiAnJyxcblx0XHR1cmw6ICcjJ1xuXHR9LFxuXHRcblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHQvL0B0cy1pZ25vcmVcblx0XHRsZXQge3R5cGUsIHVybH0gPSB0aGlzLnByb3BzXG5cdFx0Ly9jb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1cmwsXG5cdFx0XHRcdHR5cGUsXG5cdFx0XHRcdGxhbmd1YWdlOiBgbGFuZ3VhZ2UtJHt0eXBlfWAsXG5cdFx0XHRcdGlzSW1hZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2ltYWdlJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc1BkZjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAncGRmJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0F1ZGlvOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdhdWRpbydcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNWaWRlbzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAndmlkZW8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzRG9jOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdoZG9jJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0NvZGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBbJ2phdmFzY3JpcHQnLCAnaHRtbCddLmluY2x1ZGVzKHRoaXMudHlwZSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVG9wOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Ub3AnKVxuXHRcdFx0XHRcdGN0cmwuc2NvcGUuZG9jLmZpbmQoJy5zY3JvbGxQYW5lbCcpLmdldCgwKS5zY3JvbGwoMCwgMClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIHJlYWRUZXh0KCkge1xuXHRcdFx0Y29uc3QgcmV0ID0gYXdhaXQgZmV0Y2godXJsKVx0XHRcdFxuXHRcdFx0cmV0dXJuIGF3YWl0IHJldC50ZXh0KClcblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiByZWFkSHRtbCgpIHtcblx0XHRcdGNvbnN0IGh0bWxEb2MgPSBhd2FpdCByZWFkVGV4dCgpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdodG1sRG9jJywgaHRtbERvYylcblx0XHRcdGNvbnN0IGh0bWxFbHQgPSBjdHJsLnNjb3BlLmRvYy5maW5kKCcuaHRtbCcpXG5cdFx0XHRodG1sRWx0Lmh0bWwoaHRtbERvYylcblx0XHRcdGh0bWxFbHQuZmluZCgnYVtocmVmXj1odHRwXScpLmF0dHIoJ3RhcmdldCcsICdfYmxhbmsnKSAvLyBvcGVuIGV4dGVybmFsIGxpbmsgaW4gbmV3IG5hdmlnYXRvciB0YWJcblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiByZWFkQ29kZSgpIHtcblx0XHRcdGNvbnN0IGNvZGUgPSBhd2FpdCByZWFkVGV4dCgpXG5cdFx0XHRjb25zdCBjb2RlRWx0ID0gY3RybC5zY29wZS5jb2RlXG5cdFx0XHRjb2RlRWx0LmZpbmQoJ2NvZGUnKS50ZXh0KGNvZGUpXG5cdFx0XHRQcmlzbS5oaWdobGlnaHRBbGxVbmRlcihjb2RlRWx0LmdldCgwKSlcblx0XHR9XG5cblx0XHRpZiAodHlwZSA9PSAnaGRvYycpIHtcblx0XHRcdHJlYWRIdG1sKClcblx0XHR9XG5cblx0XHRpZiAoY3RybC5tb2RlbC5pc0NvZGUoKSkge1xuXHRcdFx0cmVhZENvZGUoKVxuXHRcdH1cblxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tWaWV3ZXJdIHNldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7dXJsOiBkYXRhLnVybH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH1cblxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwRGF0YScsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHJldHVybnMgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdGxldCBfZGF0YSA9IGNvbmZpZ1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldERhdGE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gX2RhdGFcblx0XHRcdH0sXG5cblx0XHRcdHNhdmVEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdF9kYXRhID0gZGF0YVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2FwcERhdGEnLCBkYXRhKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3RBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9hbGwnKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmJlYXRkZXRlY3RvcicsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy53b3JrZXJQYXRoICE9ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyAnYmVhdGRldGVjdG9yIHdvcmtlciBwYXRoIGlzIG5vdCBkZWZpbmVkJ1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKGNvbmZpZy53b3JrZXJQYXRoKSAgICAgICAgXG5cbiAgICAgICAgZnVuY3Rpb24gY29tcHV0ZUJlYXREZXRlY3Rpb24oYXVkaW9CdWZmZXIpIHtcblxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzYW1wbGVSYXRlID0gYXVkaW9CdWZmZXIuc2FtcGxlUmF0ZVxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZmxpbmVDb250ZXh0ID0gbmV3IE9mZmxpbmVBdWRpb0NvbnRleHQoMSwgYXVkaW9CdWZmZXIubGVuZ3RoLCBzYW1wbGVSYXRlKVxuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJ1ZmZlciBzb3VyY2VcbiAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2UgPSBvZmZsaW5lQ29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKVxuICAgICAgICAgICAgICAgIHNvdXJjZS5idWZmZXIgPSBhdWRpb0J1ZmZlclxuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGZpbHRlclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IG9mZmxpbmVDb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpXG4gICAgICAgICAgICAgICAgZmlsdGVyLnR5cGUgPSBcImxvd3Bhc3NcIlxuICAgICAgICAgICAgICAgIGZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAyNDBcblxuICAgICAgICAgICAgICAgIC8vIFBpcGUgdGhlIHNvbmcgaW50byB0aGUgZmlsdGVyLCBhbmQgdGhlIGZpbHRlciBpbnRvIHRoZSBvZmZsaW5lIGNvbnRleHRcbiAgICAgICAgICAgICAgICBzb3VyY2UuY29ubmVjdChmaWx0ZXIpXG4gICAgICAgICAgICAgICAgZmlsdGVyLmNvbm5lY3Qob2ZmbGluZUNvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgICAgICAgICAgICAgICAvLyBTY2hlZHVsZSB0aGUgc29uZyB0byBzdGFydCBwbGF5aW5nIGF0IHRpbWU6MFxuICAgICAgICAgICAgICAgIHNvdXJjZS5zdGFydCgwKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgc29uZ1xuICAgICAgICAgICAgICAgIG9mZmxpbmVDb250ZXh0LnN0YXJ0UmVuZGVyaW5nKClcblxuICAgICAgICAgICAgICAgIC8vIEFjdCBvbiB0aGUgcmVzdWx0XG4gICAgICAgICAgICAgICAgb2ZmbGluZUNvbnRleHQub25jb21wbGV0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbHRlcmVkIGJ1ZmZlciFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hhbm5lbERhdGEgPSBlLnJlbmRlcmVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApXG4gICAgICAgICAgICAgICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7IGNoYW5uZWxEYXRhLCBzYW1wbGVSYXRlIH0pXG4gICAgICAgICAgICAgICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gICAgICAgIFxuXG5cdFx0cmV0dXJuICB7XG4gICAgICAgICAgICBjb21wdXRlQmVhdERldGVjdGlvblxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYGZ1bmN0aW9uKHByZWZpeCk6SHR0cEludGVyZmFjZWBcblxufSk7XG5cblxuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmJsb2NrbHlpbnRlcnByZXRvcicsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICBsZXQgdmFyaWFibGVzVmFsdWVcbiAgICAgICAgbGV0IHByb2NlZHVyZUJsb2NrXG4gICAgICAgIGxldCB2YXJpYWJsZXNEZWZcbiAgICAgICAgbGV0IGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICBsZXQgbG9nRnVuY3Rpb25cblxuICAgICAgICBmdW5jdGlvbiBtYXRoUmFuZG9tSW50KGEsIGIpIHtcbiAgICAgICAgICAgIGlmIChhID4gYikge1xuICAgICAgICAgICAgICAgIC8vIFN3YXAgYSBhbmQgYiB0byBlbnN1cmUgYSBpcyBzbWFsbGVyLlxuICAgICAgICAgICAgICAgIHZhciBjID0gYTtcbiAgICAgICAgICAgICAgICBhID0gYjtcbiAgICAgICAgICAgICAgICBiID0gYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoYiAtIGEgKyAxKSArIGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmxvY2tUeXBlTWFwID0ge1xuICAgICAgICAgICAgJ21hdGhfbnVtYmVyJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrLmZpZWxkcy5OVU1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9jay5maWVsZHMuVEVYVFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2FwcGVuZCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEVYVClcbiAgICAgICAgICAgICAgICB2YXJpYWJsZXNWYWx1ZVt2YXJJZF0gKz0gdGV4dFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2pvaW4nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYkl0ZW1zID0gYmxvY2suZXh0cmFTdGF0ZS5pdGVtQ291bnRcbiAgICAgICAgICAgICAgICBsZXQgcmV0ID0gJydcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2suaW5wdXRzICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5iSXRlbXM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWUgPSBgQUREJHtpfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9jay5pbnB1dHNbaXRlbU5hbWVdICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHNbaXRlbU5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCArPSB0ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2xlbmd0aCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVkFMVUUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRleHQubGVuZ3RoXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAndmFyaWFibGVzX3NldCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlZBTFVFKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgdmFySWQsIHZhbHVlIH0pXG4gICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdID0gdmFsdWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndmFyaWFibGVzX2dldCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuICAgICAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNWYWx1ZVt2YXJJZF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9hcml0aG1ldGljJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwxID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkEpXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMiA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbDEsIHZhbDIgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FERCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSArIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTUlOVVMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLSB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ01VTFRJUExZJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICogdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdESVZJREUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLyB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BPV0VSJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdyh2YWwxLCB2YWwyKVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9zaW5nbGUnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5OVU0pXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBvcGVyYXRvciwgdmFsIH0pXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdST09UJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodmFsKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdBQlMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguYWJzKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTkVHJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtdmFsXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0xOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmxvZyh2YWwpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0xPRzEwJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmxvZzEwKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnRVhQJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmV4cCh2YWwpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BPVzEwJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdygxMCwgdmFsKVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF90cmlnJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbCB9KVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU0lOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnNpbih2YWwgLyAxODAgKiBNYXRoLlBJKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdDT1MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguY29zKHZhbCAvIDE4MCAqIE1hdGguUEkpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1RBTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC50YW4odmFsIC8gMTgwICogTWF0aC5QSSlcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQVNJTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5hc2luKHZhbCkgLyBNYXRoLlBJICogMTgwXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FDT1MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguYWNvcyh2YWwpIC8gTWF0aC5QSSAqIDE4MFxuICAgICAgICAgICAgICAgICAgICBjYXNlICdBVEFOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmF0YW4odmFsKSAvIE1hdGguUEkgKiAxODBcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfcmFuZG9tX2ludCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyb20gPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRlJPTSlcbiAgICAgICAgICAgICAgICBjb25zdCB0byA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5UTylcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0aFJhbmRvbUludChmcm9tLCB0bylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9yb3VuZCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLk5VTSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JPVU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRVUCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRET1dOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKHZhbClcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfY29uc3RhbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjID0gYmxvY2suZmllbGRzLkNPTlNUQU5UXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BJJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLlBJXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguRVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdHT0xERU5fUkFUSU8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgxICsgTWF0aC5zcXJ0KDUpKSAvIDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU1FSVDInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguU1FSVDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU1FSVDFfMic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5TUVJUMV8yXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0lORklOSVRZJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJbmZpbml0eVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIGNvbnN0YW50ZSAnJHtjfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfcmVwZWF0X2V4dCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRJTUVTKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUSU1FUycsIHRpbWVzKVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGltZXM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRE8pXG4gICAgICAgICAgICAgICAgICAgIGlmIChicmVha1N0YXRlID09ICdCUkVBSycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChicmVha1N0YXRlID09ICdDT05USU5VRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X3ByaW50JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBsb2dGdW5jdGlvbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ0Z1bmN0aW9uKGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5URVhUKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfcHJvbXB0X2V4dCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBibG9jay5maWVsZHMuVFlQRVxuICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyB0eXBlLCBsYWJlbCB9KVxuICAgICAgICAgICAgICAgIGNvbnN0IHJldCA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuICAgICAgICAgICAgICAgICAgICBsYWJlbCwgdGl0bGU6ICdFbnRlciB2YWx1ZScsIGF0dHJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2NoYW5nZUNhc2UnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGFyQ2FzZSA9IGJsb2NrLmZpZWxkcy5DQVNFXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBjaGFyQ2FzZSB9KVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQpXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ2FzZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdVUFBFUkNBU0UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE9XRVJDQVNFJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1RJVExFQ0FTRSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGV4dFRvVGl0bGVDYXNlKHZhbHVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbG9naWNfY29tcGFyZSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5BKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDIgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQilcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwxLCB2YWwyIH0pXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdFUSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA9PT0gdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdORVEnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgIT09IHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTFQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPCB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0xURSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA8PSB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0dUJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxID4gdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdHVEUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPj0gdmFsMlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19vcGVyYXRpb24nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDEgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQSlcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwyID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBvcGVyYXRvciwgdmFsMSwgdmFsMiB9KVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICYmIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnT1InOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgfHwgdmFsMlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19ib29sZWFuJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdCA9IGJsb2NrLmZpZWxkcy5CT09MXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rlc3QnLCB0ZXN0KVxuICAgICAgICAgICAgICAgIHJldHVybiAodGVzdCA9PSAnVFJVRScpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xvZ2ljX25lZ2F0ZSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQk9PTClcbiAgICAgICAgICAgICAgICByZXR1cm4gIXRlc3RcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbG9naWNfdGVybmFyeSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuSUYpXG4gICAgICAgICAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5USEVOKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTFNFKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfaWYnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcblxuICAgICAgICAgICAgICAgIGxldCBoYXNFbHNlID0gZmFsc2VcbiAgICAgICAgICAgICAgICBsZXQgbmJJZiA9IDFcblxuICAgICAgICAgICAgICAgIGNvbnN0IHsgZXh0cmFTdGF0ZSB9ID0gYmxvY2tcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmFTdGF0ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dHJhU3RhdGUuaGFzRWxzZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0Vsc2UgPSBleHRyYVN0YXRlLmhhc0Vsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0cmFTdGF0ZS5lbHNlSWZDb3VudCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iSWYgKz0gZXh0cmFTdGF0ZS5lbHNlSWZDb3VudFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgaGFzRWxzZSwgbmJJZiB9KVxuICAgICAgICAgICAgICAgIGxldCB0ZXN0ID0gZmFsc2VcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5iSWY7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZk5hbWUgPSBgSUYke2l9YFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkb05hbWUgPSBgRE8ke2l9YFxuICAgICAgICAgICAgICAgICAgICB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzW2lmTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGlmTmFtZSwgdGVzdClcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1tkb05hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChoYXNFbHNlICYmICF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTFNFKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc193aGlsZVVudGlsJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IGJsb2NrLmZpZWxkcy5NT0RFXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBtb2RlIH0pXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT0gJ1dISUxFJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG1vZGUgPT0gJ1VOVElMJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoIXRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQk9PTClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgYFVua25vd24gbW9kZSAnJHttb2RlfSdgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc19mb3InOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJJZCA9IGJsb2NrLmZpZWxkcy5WQVIuaWRcbiAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkZST00pXG4gICAgICAgICAgICAgICAgY29uc3QgdG8gPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVE8pXG4gICAgICAgICAgICAgICAgY29uc3QgYnkgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQlkpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmcm9tLCB0bywgYnkgfSlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gZnJvbTsgaSA8PSB0bzsgaSArPSBieSkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXNWYWx1ZVt2YXJJZF0gPSBpXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJyZWFrU3RhdGUgPT0gJ0JSRUFLJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJyZWFrU3RhdGUgPT0gJ0NPTlRJTlVFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3Byb2NlZHVyZXNfY2FsbG5vcmV0dXJuJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBleHRyYVN0YXRlIH0gPSBibG9ja1xuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IGV4dHJhU3RhdGUubmFtZVxuICAgICAgICAgICAgICAgIGxldCBuYkFyZ3MgPSAwXG4gICAgICAgICAgICAgICAgaWYgKGV4dHJhU3RhdGUucGFyYW1zICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBuYkFyZ3MgPSBleHRyYVN0YXRlLnBhcmFtcy5sZW5ndGhcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgYXJncyA9IFtdXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYkFyZ3M7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmdOYW1lID0gYEFSRyR7aX1gXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1thcmdOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFySWQgPSBnZXRWYXJJZChleHRyYVN0YXRlLnBhcmFtc1tpXSlcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdID0gdmFsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgZnVuY3Rpb25OYW1lLCBhcmdzIH0pXG5cbiAgICAgICAgICAgICAgICBjb25zdCB7IGlucHV0cyB9ID0gcHJvY2VkdXJlQmxvY2tbZnVuY3Rpb25OYW1lXVxuXG4gICAgICAgICAgICAgICAgaWYgKGlucHV0cyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0cy5TVEFDSyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5TVEFDSylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dHMuUkVUVVJOICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5SRVRVUk4pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdwcm9jZWR1cmVzX2NhbGxyZXR1cm4nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZWR1cmVzX2NhbGxub3JldHVybihibG9jaylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfZmxvd19zdGF0ZW1lbnRzJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmxvdyA9IGJsb2NrLmZpZWxkcy5GTE9XXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmbG93IH0pXG4gICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9IGZsb3dcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRleHRUb1RpdGxlQ2FzZShzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxTKy9nLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh0eHQpIHsgcmV0dXJuIHR4dFswXS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpOyB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmFyVmFsdWUodmFySWQpIHtcbiAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNWYWx1ZVt2YXJJZF1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZhcklkKG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNEZWYuZmluZCgoZSkgPT4gZS5uYW1lID09IG5hbWUpLmlkXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWYXJOYW1lKHZhcklkKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFyaWFibGVzRGVmLmZpbmQoKGUpID0+IGUuaWQgPT0gdmFySWQpLm5hbWVcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGR1bXBWYXJpYWJsZXMoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZHVtcFZhcmlhYmxlczonKVxuICAgICAgICAgICAgaWYgKHZhcmlhYmxlc0RlZiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHsgaWQsIG5hbWUgfSBvZiB2YXJpYWJsZXNEZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB2YXJpYWJsZXNWYWx1ZVtpZF1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7bmFtZX09JHt2YWx1ZX1gKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gZXZhbENvZGUoYmxvY2spIHtcbiAgICAgICAgICAgIGlmIChibG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChibG9jay50eXBlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChibG9jay5ibG9jayAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2sgPSBibG9jay5ibG9ja1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChibG9jay5zaGFkb3cgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrID0gYmxvY2suc2hhZG93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBgTWlzc2lnIHBhcmFtZXRlciBibG9jayBvciBzaGFkb3dgXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXZhbENvZGUnLCBibG9jay50eXBlKVxuICAgICAgICAgICAgY29uc3QgZm4gPSBibG9ja1R5cGVNYXBbYmxvY2sudHlwZV1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdibG9jaycsIGJsb2NrKVxuICAgICAgICAgICAgICAgIHRocm93IGBmdW5jdGlvbiAnJHtibG9jay50eXBlfScgbm90IGltcGxlbWVudGVkIHlldGBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJldCA9IGF3YWl0IGZuLmNhbGwoYmxvY2tUeXBlTWFwLCBibG9jaylcbiAgICAgICAgICAgIGlmIChyZXQgPT0gdW5kZWZpbmVkICYmIGJyZWFrU3RhdGUgPT0gJycpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5uZXh0KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RnVuY3Rpb25OYW1lcyh7IGJsb2NrcyB9KSB7XG4gICAgICAgICAgICBjb25zdCByZXQgPSBbXVxuICAgICAgICAgICAgZm9yIChsZXQgYmxvY2sgb2YgYmxvY2tzLmJsb2Nrcykge1xuICAgICAgICAgICAgICAgIGlmIChibG9jay50eXBlID09ICdwcm9jZWR1cmVzX2RlZm5vcmV0dXJuJyB8fCBibG9jay50eXBlID09ICdwcm9jZWR1cmVzX2RlZnJldHVybicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2VkdXJlTmFtZSA9IGJsb2NrLmZpZWxkcy5OQU1FXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKHByb2NlZHVyZU5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gY2FsbEZ1bmN0aW9uKGZ1bmN0aW9uTmFtZSwgLi4uZnVuY3Rpb25BcmdzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY2FhbCcpXG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHByb2NlZHVyZUJsb2NrW2Z1bmN0aW9uTmFtZV1cbiAgICAgICAgICAgIGlmIChibG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBgZnVuY3Rpb24gJyR7ZnVuY3Rpb25OYW1lfScgZG9lcyBub3QgZXhpc3RzICFgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgZXh0cmFTdGF0ZSwgaW5wdXRzIH0gPSBibG9ja1xuICAgICAgICAgICAgbGV0IG5iQXJncyA9IDBcbiAgICAgICAgICAgIGlmIChleHRyYVN0YXRlLnBhcmFtcyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBuYkFyZ3MgPSBleHRyYVN0YXRlLnBhcmFtcy5sZW5ndGhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmJBcmdzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJJZCA9IGV4dHJhU3RhdGUucGFyYW1zW2ldLmlkXG4gICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdID0gZnVuY3Rpb25BcmdzW2ldXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpbnB1dHMgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0cy5TVEFDSyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoaW5wdXRzLlNUQUNLKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gc3RhcnRDb2RlKHsgYmxvY2tzLCB2YXJpYWJsZXN9ICkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0Q29kZScpXG5cbiAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlID0ge31cbiAgICAgICAgICAgIHByb2NlZHVyZUJsb2NrID0ge31cbiAgICAgICAgICAgIHZhcmlhYmxlc0RlZiA9IHZhcmlhYmxlc1xuICAgICAgICAgICAgY29uc3QgY29kZUJsb2NrcyA9IGJsb2Nrcy5ibG9ja3NcbiAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgZm9yIChsZXQgYmxvY2sgb2YgY29kZUJsb2Nrcykge1xuICAgICAgICAgICAgICAgIGlmIChibG9jay50eXBlID09ICdwcm9jZWR1cmVzX2RlZm5vcmV0dXJuJyB8fCBibG9jay50eXBlID09ICdwcm9jZWR1cmVzX2RlZnJldHVybicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2VkdXJlTmFtZSA9IGJsb2NrLmZpZWxkcy5OQU1FXG4gICAgICAgICAgICAgICAgICAgIHByb2NlZHVyZUJsb2NrW3Byb2NlZHVyZU5hbWVdID0gYmxvY2tcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncHJvY2VkdXJlczonKVxuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9jZWR1cmVOYW1lIG9mIE9iamVjdC5rZXlzKHByb2NlZHVyZUJsb2NrKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHByb2NlZHVyZU5hbWUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IGJsb2NrIG9mIGNvZGVCbG9ja3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2sudHlwZSAhPSAncHJvY2VkdXJlc19kZWZub3JldHVybicgJiYgYmxvY2sudHlwZSAhPSAncHJvY2VkdXJlc19kZWZyZXR1cm4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGR1bXBWYXJpYWJsZXMoKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0TGxvZ0Z1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICBsb2dGdW5jdGlvbiA9IGZuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRCbG9ja1R5cGUodHlwZU5hbWUsIGZuKSB7XG4gICAgICAgICAgICBibG9ja1R5cGVNYXBbdHlwZU5hbWVdID0gZm5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydENvZGUsXG4gICAgICAgICAgICBzZXRMbG9nRnVuY3Rpb24sXG4gICAgICAgICAgICBldmFsQ29kZSxcbiAgICAgICAgICAgIGR1bXBWYXJpYWJsZXMsXG4gICAgICAgICAgICBhZGRCbG9ja1R5cGUsXG4gICAgICAgICAgICBnZXRWYXJWYWx1ZSxcbiAgICAgICAgICAgIGdldFZhck5hbWVcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYnJva2VyJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuXHRcdGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuXHRcdGxldCBzb2NrID0gbnVsbFxuXHRcdGxldCBpc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0bGV0IHRyeVJlY29ubmVjdCA9IHRydWVcblx0XHRsZXQgaXNQaW5nT2sgPSB0cnVlXG5cdFx0Y29uc3QgdG9waWNzID0gbmV3IEV2ZW50RW1pdHRlcjIoeyB3aWxkY2FyZDogdHJ1ZSB9KVxuXHRcdGNvbnN0IHBpbmdJbnRlcnZhbCA9IDEwICogMTAwMFxuXHRcdGxldCB0aW1lb3V0SWQgPSBudWxsXG5cdFx0Y29uc3QgcmVnaXN0ZXJlZFRvcGljcyA9IHt9XG5cblx0XHRsZXQgeyBob3N0LCBwYXRobmFtZSwgcHJvdG9jb2wgfSA9IGxvY2F0aW9uXG5cdFx0cHJvdG9jb2wgPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRjb25zdCB1cmwgPSBgJHtwcm90b2NvbH0vLyR7aG9zdH0vaG1pJHtwYXRobmFtZX1gXG5cblx0XHRmdW5jdGlvbiBvbkNsb3NlKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25DbG9zZScpXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0ZXZlbnRzLmVtaXQoJ2Nvbm5lY3RlZCcsIGZhbHNlKVxuXHRcdFx0fVxuXHRcdFx0aXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRyeVJlY29ubmVjdCkge1xuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHsgY29ubmVjdCgpIH0sIDUwMDApXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2hlY2tQaW5nKCkge1xuXHRcdFx0dGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cblx0XHRcdFx0aWYgKCFpc1BpbmdPaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCd0aW1lb3V0IHBpbmcnKVxuXHRcdFx0XHRcdHNvY2sub25tZXNzYWdlID0gbnVsbFxuXHRcdFx0XHRcdHNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHRzb2NrLmNsb3NlKClcblx0XHRcdFx0XHRvbkNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdwaW5nJyB9KVxuXHRcdFx0XHRcdGNoZWNrUGluZygpXG5cdFx0XHRcdH1cblx0XHRcdH0sIHBpbmdJbnRlcnZhbClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHRzb2NrID0gbmV3IFdlYlNvY2tldCh1cmwpXG5cblx0XHRcdHNvY2sub25vcGVuID0gKCkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkNvbm5lY3RlZCB0byBicm9rZXJcIilcblx0XHRcdFx0aXNDb25uZWN0ZWQgPSB0cnVlXG5cdFx0XHRcdGlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHRldmVudHMuZW1pdCgnY29ubmVjdGVkJywgdHJ1ZSlcblx0XHRcdFx0Y2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHNvY2sub25tZXNzYWdlID0gKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSBzb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIG1lc3NhZ2UgYmFkIHRhcmdldCcsIG1zZy50eXBlKVxuXHRcdFx0XHRcdGV2LmN1cnJlbnRUYXJnZXQuY2xvc2UoKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIG1lc3NhZ2UnLCBtc2cpXG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyhyZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdyZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGV2ZW50cy5lbWl0KCdyZWFkeScsIHsgY2xpZW50SWQ6IG1zZy5jbGllbnRJZCB9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdGlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdub3RpZicpIHtcblx0XHRcdFx0XHR0b3BpY3MuZW1pdChtc2cudG9waWMsIG1zZylcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAnZXJyb3InKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIGxvZycsIG1zZy50ZXh0KVxuXHRcdFx0XHRcdHRyeVJlY29ubmVjdCA9IGZhbHNlXG5cdFx0XHRcdFx0c29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRzb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gc29jaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbYnJva2VyXSBjbG9zZSBiYWQgdGFyZ2V0Jylcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UnKVxuXHRcdFx0XHRpZiAodGltZW91dElkICE9IG51bGwpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZW91dElkKVxuXHRcdFx0XHRcdHRpbWVvdXRJZCA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0XHRvbkNsb3NlKClcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNlbmRNc2cobXNnKSB7XG5cdFx0XHRtc2cudGltZSA9IERhdGUubm93KClcblx0XHRcdGNvbnN0IHRleHQgPSBKU09OLnN0cmluZ2lmeShtc2cpXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gc2VuZE1zZycsIG1zZylcblx0XHRcdFx0c29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdGNvbnN0IG1zZyA9IHtcblx0XHRcdFx0dHlwZTogJ25vdGlmJyxcblx0XHRcdFx0dG9waWMsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH1cblxuXHRcdFx0c2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb2ZmVG9waWModG9waWMsIGNhbGxiYWNrKSB7XG5cdFx0XHR0b3BpY3Mub2ZmKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAocmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID0gMVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0b3BpY3Mub24odG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdyZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdW5yZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblxuXHRcdFx0dG9waWNzLm9mZih0b3BpYywgY2FsbGJhY2spXG5cblx0XHRcdGlmICgtLXJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdXG5cdFx0XHRcdHNlbmRNc2coeyB0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29ubmVjdCgpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0ZW1pdFRvcGljLFxuXHRcdFx0b25Ub3BpYyxcblx0XHRcdG9mZlRvcGljLFxuXHRcdFx0cmVnaXN0ZXIsXG5cdFx0XHR1bnJlZ2lzdGVyLFxuXHRcdFx0b246IGV2ZW50cy5vbi5iaW5kKGV2ZW50cylcblxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmNpdGllcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgaHR0cFNydikge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NpdGllcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0Q291bnRyaWVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvY291bnRyaWVzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGllczogZnVuY3Rpb24oY291bnRyeSwgc2VhcmNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jaXRpZXMnLCB7Y291bnRyeSwgc2VhcmNofSlcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGVzRnJvbVBvc3RhbENvZGU6IGFzeW5jIGZ1bmN0aW9uKHBvc3RhbENvZGUpIHtcblx0XHRcdFx0Y29uc3QgdXJsID0gJ2h0dHBzOi8vYXBpY2FydG8uaWduLmZyL2FwaS9jb2Rlcy1wb3N0YXV4L2NvbW11bmVzLycgKyBwb3N0YWxDb2RlXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IGh0dHBTcnYuZ2V0KHVybClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0XHRyZXR1cm4gaW5mby5tYXAoKGkpID0+IGkubGliZWxsZUFjaGVtaW5lbWVudClcdFxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gW11cblx0XHRcdFx0fVxuXHRcblx0XHRcdH1cblxuXG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NvbnRhY3RzJylcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdGFkZENvbnRhY3Q6IGZ1bmN0aW9uIChpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRDb250YWN0YCwgaW5mbylcblx0XHRcdH0sXG5cdFx0XHRnZXRDb250YWN0czogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbiAoY29udGFjdElkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZUNvbnRhY3QvJHtjb250YWN0SWR9YClcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZUNvbnRhY3RJbmZvOiBmdW5jdGlvbiAoY29udGFjdElkLCBpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC91cGRhdGVDb250YWN0SW5mby8ke2NvbnRhY3RJZH1gLCBpbmZvKVxuXHRcdFx0fVxuXHRcdFx0XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5kaXNwbGF5Jywge1xuXG4gICAgZGVwczogWydicmVpemJvdC5wYXJhbXMnXSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHBhcmFtcykge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuICAgICAgICBjb25zdCBwcmVzZW50YXRpb25SZXF1ZXN0ID0gbmV3IFByZXNlbnRhdGlvblJlcXVlc3QoJCQudXJsLmdldFVybFBhcmFtcygnL2FwcHMvY2FzdCcsIHsgaWQ6IHBhcmFtcy4kaWQgfSkpXG4gICAgICAgIGxldCBwcmVzZW50YXRpb25Db25uZWN0aW9uID0gbnVsbFxuXG4gICAgICAgIHByZXNlbnRhdGlvblJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGlvbmF2YWlsYWJsZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb25hdmFpbGFibGUnLCBldmVudClcbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24gPSBldmVudC5jb25uZWN0aW9uXG5cbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ21lc3NhZ2UnLCBldmVudC5kYXRhKVxuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSlcbiAgICAgICAgICAgICAgICBzd2l0Y2gobXNnLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVhZHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3JlYWR5JylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2V2ZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KG1zZy5uYW1lLCBtc2cudmFsdWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcHJlc2VudGF0aW9uQ29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCd0ZXJtaW5hdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnY2xvc2UnKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ2Nvbm5lY3Rpb25hdmFpbGFibGUnKVxuICAgICAgICB9KVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGdldEF2YWlsYWJpbGl0eSgpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IHByZXNlbnRhdGlvblJlcXVlc3QuZ2V0QXZhaWxhYmlsaXR5KClcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0F2YWlsYWJsZSBwcmVzZW50YXRpb24gZGlzcGxheXM6ICcgKyBhdmFpbGFiaWxpdHkudmFsdWUpXG5cbiAgICAgICAgICAgIGF2YWlsYWJpbGl0eS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJz4gQXZhaWxhYmxlIHByZXNlbnRhdGlvbiBkaXNwbGF5czogJyArIGF2YWlsYWJpbGl0eS52YWx1ZSlcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnYXZhaWxhYmlsaXR5JywgYXZhaWxhYmlsaXR5LnZhbHVlKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IGF3YWl0IHByZXNlbnRhdGlvblJlcXVlc3Quc3RhcnQoKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLnRlcm1pbmF0ZSgpXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VuZE1zZyhtc2cpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NlbmRNc2cnLCBtc2cpXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLnNlbmQoSlNPTi5zdHJpbmdpZnkobXNnKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldFVybCh1cmwpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAndXJsJywgdXJsIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRWb2x1bWUodm9sdW1lKSB7XG4gICAgICAgICAgICBzZW5kTXNnKHsgdHlwZTogJ3ZvbHVtZScsIHZvbHVtZSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0Q3VycmVudFRpbWUoY3VycmVudFRpbWUpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAnY3VycmVudFRpbWUnLCBjdXJyZW50VGltZSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcGxheSgpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdwbGF5J30pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwYXVzZSgpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdwYXVzZSd9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNTdGFydGVkKCkge1xuICAgICAgICAgICAgcmV0dXJuIChwcmVzZW50YXRpb25Db25uZWN0aW9uICE9IG51bGwpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmFibGVLYXJhb2tlKGVuYWJsZWQpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdlbmFibGVLYXJhb2tlJywgZW5hYmxlZH0pXG4gICAgICAgIH1cblxuICAgICAgICBnZXRBdmFpbGFiaWxpdHkoKVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgY2xvc2UsXG4gICAgICAgICAgICBpc1N0YXJ0ZWQsXG4gICAgICAgICAgICBzZXRVcmwsXG4gICAgICAgICAgICBzZXRWb2x1bWUsXG4gICAgICAgICAgICBzZXRDdXJyZW50VGltZSxcbiAgICAgICAgICAgIHBsYXksXG4gICAgICAgICAgICBwYXVzZSxcbiAgICAgICAgICAgIGVuYWJsZUthcmFva2VcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5maWxlcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UsIHBhcmFtcykge1xuXHRcdC8qKkB0eXBlIHtCcmFpbmpzLlNlcnZpY2VzLkh0dHAuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9maWxlcycpXG5cblx0XHRjb25zdCBzYXZpbmdEbGcgPSAkJC51aS5wcm9ncmVzc0RpYWxvZygpXG5cblxuXHRcdHJldHVybiB7XG5cdFx0XHRmaWxlSW5mbzogZnVuY3Rpb24gKGZpbGVQYXRoLCBmcmllbmRVc2VyLCBvcHRpb25zKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gZmlsZUluZm8nLCBmaWxlUGF0aCwgZnJpZW5kVXNlciwgb3B0aW9ucylcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZmlsZUluZm8nLCB7IGZpbGVQYXRoLCBmcmllbmRVc2VyLCBvcHRpb25zIH0pXG5cdFx0XHR9LFxuXHRcdFx0bGlzdDogZnVuY3Rpb24gKGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbGlzdCcsIGRlc3RQYXRoKVxuXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9saXN0JywgeyBkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlciB9KVxuXHRcdFx0fSxcblxuXHRcdFx0bW92ZTogZnVuY3Rpb24oZmlsZU5hbWUsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9tb3ZlJywgeyBkZXN0UGF0aCwgZmlsZU5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVVybDogZnVuY3Rpb24gKGZpbGVOYW1lLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdHJldHVybiAkJC51cmwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWQnLCB7IGZpbGVOYW1lLCBmcmllbmRVc2VyIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlQXBwVXJsOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0XHRmaWxlTmFtZSA9IGAvYXBwcy8ke3BhcmFtcy4kYXBwTmFtZX0vJHtmaWxlTmFtZX1gXG5cdFx0XHRcdHJldHVybiAkJC51cmwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWQnLCB7IGZpbGVOYW1lIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVGh1bWJuYWlsVXJsOiBmdW5jdGlvbiAoZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHsgZmlsZU5hbWUsIHNpemUsIGZyaWVuZFVzZXIgfSlcblx0XHRcdH0sXG5cblx0XHRcdGZpbGVBcHBUaHVtYm5haWxVcmw6IGZ1bmN0aW9uIChmaWxlTmFtZSwgc2l6ZSkge1xuXHRcdFx0XHRmaWxlTmFtZSA9IGAvYXBwcy8ke3BhcmFtcy4kYXBwTmFtZX0vJHtmaWxlTmFtZX1gXG5cdFx0XHRcdHJldHVybiAkJC51cmwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWRUaHVtYm5haWwnLCB7IGZpbGVOYW1lLCBzaXplIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhc3NldHNVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lKSAge1xuXHRcdFx0XHRyZXR1cm4gIGAvd2ViYXBwcy8ke3BhcmFtcy4kYXBwTmFtZX0vYXNzZXRzLyR7ZmlsZU5hbWV9YFxuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwYXJhbSB7QmxvYn0gYmxvYiBcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBzYXZlQXNmaWxlTmFtZSBcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBkZXN0UGF0aCBcblx0XHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gY2hlY2tFeGlzdHNcblx0XHRcdCAqIEBwYXJhbSB7Kn0gb25VcGxvYWRQcm9ncmVzcyBcblx0XHRcdCAqIEByZXR1cm5zIFxuXHRcdFx0ICovXG5cdFx0XHR1cGxvYWRGaWxlOiBhc3luYyBmdW5jdGlvbiAoYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoLCBjaGVja0V4aXN0cywgb25VcGxvYWRQcm9ncmVzcykge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVwbG9hZEZpbGUnLCBjaGVja0V4aXN0cywgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoKVxuXHRcdFx0XHRpZiAoIShibG9iIGluc3RhbmNlb2YgQmxvYikpIHtcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGNoZWNrRXhpc3RzKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuZmlsZUluZm8oZGVzdFBhdGggKyAnLycgKyBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBhbHJlYWR5IGV4aXN0cycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgZmQgPSBuZXcgRm9ybURhdGEoKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0ZmQuYXBwZW5kKCdkZXN0UGF0aCcsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0Rm9ybURhdGEoJy9zYXZlJywgZmQsIG9uVXBsb2FkUHJvZ3Jlc3MpXG5cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYmxvYicsIGJsb2IpXG5cblx0XHRcdH0sXG5cblx0XHRcdHNhdmVGaWxlOiBhc3luYyBmdW5jdGlvbiAoYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIG9wdGlvbnMpIHtcblx0XHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblx0XHRcdFx0Y29uc3QgZGVzdFBhdGggID0gb3B0aW9ucy5kZXN0UGF0aCB8fCBgL2FwcHMvJHtwYXJhbXMuJGFwcE5hbWV9YFxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHNhdmluZ0RsZy5zZXRQZXJjZW50YWdlKDApXG5cdFx0XHRcdFx0c2F2aW5nRGxnLnNob3coKVxuXHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnVwbG9hZEZpbGUoYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoLCBvcHRpb25zLmNoZWNrRXhpc3RzLCAodmFsdWUpID0+IHtcblx0XHRcdFx0XHRcdHNhdmluZ0RsZy5zZXRQZXJjZW50YWdlKHZhbHVlKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0YXdhaXQgJCQudXRpbC53YWl0KDEwMDApXG5cdFx0XHRcdFx0c2F2aW5nRGxnLmhpZGUoKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3InLCBlKVxuXHRcdFx0XHRcdHNhdmluZ0RsZy5oaWRlKClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0XHRjb250ZW50OiBlLnJlc3BvbnNlVGV4dCB8fCBlXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9mcmllbmRzJylcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdGdldEZyaWVuZHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0RnJpZW5kc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRGcmllbmRJbmZvOiBmdW5jdGlvbiAoZnJpZW5kKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9nZXRGcmllbmRJbmZvJywgeyBmcmllbmQgfSlcblx0XHRcdH0sXG5cblx0XHRcdHNldEZyaWVuZEluZm86IGZ1bmN0aW9uIChmcmllbmQsIGdyb3VwcywgcG9zaXRpb25BdXRoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9zZXRGcmllbmRJbmZvJywgeyBmcmllbmQsIGdyb3VwcywgcG9zaXRpb25BdXRoIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRGcmllbmQ6IGZ1bmN0aW9uIChmcmllbmRVc2VyTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkRnJpZW5kYCwgeyBmcmllbmRVc2VyTmFtZSB9KVxuXHRcdFx0fVxuXG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5mdWxsc2NyZWVuJywge1xuXG4gICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXG5cbiAgICAgICAgZnVuY3Rpb24gaW5pdChjYWxsYmFjaykge1xuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmtpdGZ1bGxzY3JlZW5jaGFuZ2VcIiwgZSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnd2Via2l0ZnVsbHNjcmVlbmNoYW5nZScpICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICE9IG51bGwpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZnVsbHNjcmVlbmNoYW5nZVwiLCBlID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdmdWxsc2NyZWVuY2hhbmdlJylcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAhPSBudWxsKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygna2V5ZG93bicsIGUua2V5KVxuICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PSBcIkYxMVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZW50ZXIoKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0RnVsbHNjcmVlbiA9IGVsZW0ucmVxdWVzdEZ1bGxzY3JlZW4gfHxcbiAgICAgICAgICAgICAgICBlbGVtLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuXG5cbiAgICAgICAgICAgIGlmIChyZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICAgICAgICAgIHJlcXVlc3RGdWxsc2NyZWVuLmNhbGwoZWxlbSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZXhpdCgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKClcbiAgICAgICAgfVxuXG5cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5pdCxcbiAgICAgICAgICAgIGVudGVyLFxuICAgICAgICAgICAgZXhpdFxuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCIvL0B0cy1jaGVja1xuKGZ1bmN0aW9uICgpIHtcblxuICAgIGNsYXNzIE15R2FtZXBhZCBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHN1cGVyKClcblxuICAgICAgICAgICAgdGhpcy5idXR0b25zID0gW11cbiAgICAgICAgICAgIHRoaXMuYXhlcyA9IFtdXG5cbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdnYW1lcGFkY29ubmVjdGVkJywgKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZ2FtZXBhZGNvbm5lY3RlZCcsIGV2KVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgeyBwcmVzc2VkIH0gb2YgZXYuZ2FtZXBhZC5idXR0b25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnV0dG9ucy5wdXNoKHByZXNzZWQpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgZXYuZ2FtZXBhZC5heGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXhlcy5wdXNoKHZhbClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnYnV0dG9ucycsIGJ1dHRvbnMpXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0ZWQnLCBldi5nYW1lcGFkKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2dhbWVwYWRkaXNjb25uZWN0ZWQnLCAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdnYW1lcGFkZGlzY29ubmVjdGVkJywgZXYpXG4gICAgICAgICAgICAgICAgdGhpcy5idXR0b25zID0gW11cbiAgICAgICAgICAgICAgICB0aGlzLmF4ZXMgPSBbXVxuXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdkaXNjb25uZWN0ZWQnLCBldi5nYW1lcGFkKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGNoZWNrR2FtZVBhZFN0YXR1cygpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVswXVxuICAgICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHByZXNzZWQgfSA9IGluZm8uYnV0dG9uc1tpXVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJlc3NlZCAhPSB0aGlzLmJ1dHRvbnNbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdChwcmVzc2VkID8gJ2J1dHRvbkRvd24nIDogJ2J1dHRvblVwJywgeyBpZDogaSB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idXR0b25zW2ldID0gcHJlc3NlZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5heGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gaW5mby5heGVzW2ldXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPSB0aGlzLmF4ZXNbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnYXhlJywgeyBpZDogaSwgdmFsdWUgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXhlc1tpXSA9IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0aGlzLmNoZWNrR2FtZVBhZFN0YXR1cy5iaW5kKHRoaXMpLCA1MClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGdldEJ1dHRvblN0YXRlKGJ1dHRvbklkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbMF0uYnV0dG9uc1tidXR0b25JZF0ucHJlc3NlZFxuICAgICAgICB9XG5cbiAgICAgICAgZ2V0QXhlVmFsdWUoYXhlSWQpIHtcbiAgICAgICAgICAgIHJldHVybiBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVswXS5heGVzW2F4ZUlkXVxuICAgICAgICB9XG5cbiAgICAgICAgZ2V0R2FtZXBhZHMoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmdhbWVwYWQnLCB7XG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IE15R2FtZXBhZCgpXG4gICAgICAgIH1cbiAgICB9KTtcblxufSkoKTtcblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lmdlb2xvYycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3Bvc2l0aW9uJylcblxuXG5cdFx0bGV0IGNvb3JkcyA9IG51bGxcblxuXHRcdGZ1bmN0aW9uIGdlb0Vycm9yKGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdnZW9sb2MgZXJyb3I6JywgZSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGVMb2NhdGlvbihwb3NpdGlvbikge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygndXBkYXRlTG9jYXRpb24nLCBwb3NpdGlvbilcblx0XHRcdGNvb3JkcyA9IHBvc2l0aW9uLmNvb3Jkc1xuXHRcdH1cblxuXG5cdFx0ZnVuY3Rpb24gc3RhcnRXYXRjaCgpIHtcblxuXHRcdFx0bmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbih1cGRhdGVMb2NhdGlvbilcblxuXHRcdFx0bmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24odXBkYXRlTG9jYXRpb24sIGdlb0Vycm9yLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZW5hYmxlSGlnaEFjY3VyYWN5OiB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdClcdFxuXG5cdFx0XHRzZXRJbnRlcnZhbChzZW5kUG9zaXRpb24sIDMwICogMTAwMCkgLy8gZXZlcnkgMzAgc2VjXG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBzZW5kUG9zaXRpb24oKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZW5kUG9zaXRpb24nLCBjb29yZHMpXG5cdFx0XHRpZiAoY29vcmRzICE9IG51bGwpIHtcblx0XHRcdFx0aHR0cC5wb3N0KCcvcG9zaXRpb24nLCB7XG5cdFx0XHRcdFx0bGF0OiBjb29yZHMubGF0aXR1ZGUsXG5cdFx0XHRcdFx0bG5nOiBjb29yZHMubG9uZ2l0dWRlXG5cdFx0XHRcdH0pXG5cblx0XHRcdH1cblx0XHR9XHRcdFxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0c3RhcnRXYXRjaFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lmh0dHAnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UsIHBhcmFtcykge1xuXG5cdFx0cmV0dXJuIHJlc291cmNlKGAvYXBpL2FwcC8ke3BhcmFtcy4kYXBwTmFtZX1gKVxuXHR9XG5cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5ub3RpZnMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9ub3RpZnMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlbmROb3RpZjogZnVuY3Rpb24gKHRvLCBub3RpZikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2VuZE5vdGlmYCwgeyB0bywgbm90aWYgfSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZU5vdGlmOiBmdW5jdGlvbiAobm90aWZJZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC9yZW1vdmVOb3RpZi8ke25vdGlmSWR9YClcblx0XHRcdH0sXG5cblx0XHRcdGdldE5vdGlmczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXROb3RpZnNgKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Tm90aWZDb3VudDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXROb3RpZkNvdW50YClcblx0XHRcdH1cblxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhZ2VyJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0cmV0dXJuICQoJy5icmVpemJvdFBhZ2VyJykuaWZhY2UoKVxuXHR9XG5cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYXJhbXMnLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcgPT0gJ3N0cmluZycpID8gSlNPTi5wYXJzZShjb25maWcpIDoge31cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGxheWxpc3RzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvcGxheWxpc3RzJylcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdGdldFBsYXlsaXN0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9nZXRQbGF5bGlzdGApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRQbGF5bGlzdFNvbmdzOiBmdW5jdGlvbiAobmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZ2V0UGxheWxpc3RTb25nc2AsIHtuYW1lfSlcblx0XHRcdH1cblx0XHRcdFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnJhZGFyJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZScsICdicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvcmFkYXInKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldFJhZGFyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJylcblx0XHRcdH1cblx0XHRcdFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJywgJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCBodHRwLCBicm9rZXIsIHBhcmFtcykge1xuXG5cdFx0Y29uc3QgZXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjIoKVxuXG5cdFx0Y29uc3QgcHJpdmF0ZSA9IHtcblx0XHRcdHNyY0lkOiBudWxsLFxuXHRcdFx0ZGVzdElkOiBudWxsLFxuXHRcdFx0ZGlzdGFudDogJycsXG5cdFx0XHRzdGF0dXM6ICdyZWFkeScsXG5cdFx0XHRpc0NhbGxlZTogZmFsc2Vcblx0XHR9XG5cblxuXHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0cHJpdmF0ZS5kaXN0YW50ID0gcGFyYW1zLmNhbGxlclxuXHRcdFx0cHJpdmF0ZS5kZXN0SWQgPSBwYXJhbXMuY2xpZW50SWRcblx0XHRcdHByaXZhdGUuaXNDYWxsZWUgPSB0cnVlXG5cdFx0fVxuXG5cdFx0YnJva2VyLm9uKCdyZWFkeScsIChtc2cpID0+IHtcblx0XHRcdHByaXZhdGUuc3JjSWQgPSBtc2cuY2xpZW50SWRcblx0XHRcdC8vY29uc29sZS5sb2coJ3NyY0lkJywgbXNnLmNsaWVudElkKVxuXHRcdFx0ZXZlbnRzLmVtaXQoJ3JlYWR5Jylcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5hY2NlcHQnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y2FuY2VsKGZhbHNlKVxuXHRcdFx0cHJpdmF0ZS5kZXN0SWQgPSBtc2cuc3JjSWRcblx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0ZXZlbnRzLmVtaXQoJ2FjY2VwdCcpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuZGVueScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdyZWZ1c2VkJ1xuXHRcdFx0Y2FuY2VsKGZhbHNlKVxuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRldmVudHMuZW1pdCgnZGVueScpXG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5ieWUnLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAnZGlzY29ubmVjdGVkJ1xuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRldmVudHMuZW1pdCgnYnllJylcblxuXHRcdH0pXG5cblxuXHRcdGZ1bmN0aW9uIGdldFJlbW90ZUNsaWVudElkKCkge1xuXHRcdFx0cmV0dXJuIHByaXZhdGUuZGVzdElkXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcHJvY2Vzc0NhbGwoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1JUQ10gcHJvY2Vzc0NhbGwnKVxuXHRcdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FsbCcsIChtc2cpID0+IHtcblx0XHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdFx0cHJpdmF0ZS5kZXN0SWQgPSBtc2cuc3JjSWRcblx0XHRcdFx0ZXZlbnRzLmVtaXQoJ2NhbGwnLCBtc2cuZGF0YSlcblx0XHRcdH0pXG5cblx0XHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmNhbmNlbCcsIChtc2cpID0+IHtcblx0XHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdFx0ZXZlbnRzLmVtaXQoJ2NhbmNlbCcpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG9uRGF0YShuYW1lLCBjYWxsYmFjaykge1xuXHRcdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy4nICsgbmFtZSwgKG1zZykgPT4ge1xuXHRcdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjayhtc2cuZGF0YSwgbXNnLnRpbWUpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGVtaXRTdGF0dXMoKSB7XG5cdFx0XHRldmVudHMuZW1pdCgnc3RhdHVzJywgeyBzdGF0dXM6IHByaXZhdGUuc3RhdHVzLCBkaXN0YW50OiBwcml2YXRlLmRpc3RhbnQgfSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjYWxsKHRvLCBhcHBOYW1lLCBpY29uQ2xzKSB7XG5cdFx0XHRwcml2YXRlLmRpc3RhbnQgPSB0b1xuXHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAnY2FsbGluZydcblx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvVXNlcmAsIHtcblx0XHRcdFx0dG8sXG5cdFx0XHRcdHNyY0lkOiBwcml2YXRlLnNyY0lkLFxuXHRcdFx0XHR0eXBlOiAnY2FsbCcsXG5cdFx0XHRcdGRhdGE6IHsgYXBwTmFtZSwgaWNvbkNscyB9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNhbmNlbCh1cGRhdGVTdGF0dXMgPSB0cnVlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1JUQ10gY2FuY2VsJywgdXBkYXRlU3RhdHVzKVxuXHRcdFx0aWYgKHVwZGF0ZVN0YXR1cykge1xuXHRcdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdjYW5jZWxlZCdcblx0XHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwgeyB0bzogcHJpdmF0ZS5kaXN0YW50LCBzcmNJZDogcHJpdmF0ZS5zcmNJZCwgdHlwZTogJ2NhbmNlbCcgfSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhY2NlcHQoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1JUQ10gYWNjZXB0JylcblxuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRyZXR1cm4gc2VuZERhdGEoJ2FjY2VwdCcpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZGVueSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBkZW55JylcblxuXHRcdFx0cmV0dXJuIHNlbmREYXRhKCdkZW55Jylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBieWUoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1JUQ10gYnllJylcblxuXHRcdFx0aWYgKHByaXZhdGUuc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XG5cdFx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ3JlYWR5J1xuXHRcdFx0XHRwcml2YXRlLmRpc3RhbnQgPSAnJ1xuXHRcdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdFx0cmV0dXJuIHNlbmREYXRhKCdieWUnKVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBleGl0KCkge1xuXHRcdFx0aWYgKHByaXZhdGUuc3RhdHVzID09ICdjYWxsaW5nJykge1xuXHRcdFx0XHRyZXR1cm4gY2FuY2VsKClcblx0XHRcdH1cblx0XHRcdGlmIChwcml2YXRlLnN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xuXHRcdFx0XHRyZXR1cm4gYnllKClcblx0XHRcdH1cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNlbmREYXRhKHR5cGUsIGRhdGEpIHtcblx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb0NsaWVudGAsIHtcblx0XHRcdFx0ZGVzdElkOiBwcml2YXRlLmRlc3RJZCxcblx0XHRcdFx0c3JjSWQ6IHByaXZhdGUuc3JjSWQsXG5cdFx0XHRcdHR5cGUsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNDYWxsZWUoKSB7XG5cdFx0XHRyZXR1cm4gcHJpdmF0ZS5pc0NhbGxlZVxuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRjYWxsLFxuXHRcdFx0Y2FuY2VsLFxuXHRcdFx0ZGVueSxcblx0XHRcdGJ5ZSxcblx0XHRcdHNlbmREYXRhLFxuXHRcdFx0b25EYXRhLFxuXHRcdFx0b246IGV2ZW50cy5vbi5iaW5kKGV2ZW50cyksXG5cdFx0XHRwcm9jZXNzQ2FsbCxcblx0XHRcdGdldFJlbW90ZUNsaWVudElkLFxuXHRcdFx0ZXhpdCxcblx0XHRcdGFjY2VwdCxcblx0XHRcdGlzQ2FsbGVlXG5cblx0XHR9XG5cdH1cbn0pO1xuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNjaGVkdWxlcicsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wZW5BcHA6IGZ1bmN0aW9uKGFwcE5hbWUsIGFwcFBhcmFtcywgbmV3VGFiVGl0bGUpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW3NjaGVkdWxlcl0gb3BlbkFwcCcsIGFwcE5hbWUsIGFwcFBhcmFtcywgbmV3VGFiKVxuXHRcdFx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0XHR0eXBlOiAnb3BlbkFwcCcsXG5cdFx0XHRcdFx0IGRhdGE6IHthcHBOYW1lLCBhcHBQYXJhbXMsIG5ld1RhYlRpdGxlfVxuXHRcdFx0XHRcdH0sIGxvY2F0aW9uLmhyZWYpXG5cblx0XHRcdH0sXG5cdFx0XHRsb2dvdXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW3NjaGVkdWxlcl0gbG9nb3V0Jylcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9sb2dvdXQnKVxuXHRcdFx0fVx0XHQgXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Quc29uZ3MnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9zb25ncycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2VuZXJhdGVEYjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZ2VuZXJhdGVEYicpXG5cdFx0XHR9LFxuXG5cdFx0XHRxdWVyeVNvbmdzOiBmdW5jdGlvbiAocXVlcnkpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3F1ZXJ5U29uZ3MnLCB7IHF1ZXJ5IH0pXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5zcG90aWZ5Jywge1xuXG4gICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXG4gICAgICAgIGNvbnN0IGJhc2VVcmkgPSAnaHR0cHM6Ly9hcGkuc3BvdGlmeS5jb20vdjEnXG4gICAgICAgIGNvbnN0IGJhc2VUb2tlblVyaSA9ICdodHRwczovL3Nwb3RpZnktd2ViLWFwaS10b2tlbi5oZXJva3VhcHAuY29tJ1xuICAgICAgICBsZXQgdG9rZW4gPSBudWxsXG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gcGVyZm9ybVJlcXVlc3QodXJsLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3BlcmZvcm1SZXF1ZXN0JywgdXJsLCBwYXJhbXMpXG4gICAgICAgICAgICBsZXQgcmV0ID0gbnVsbFxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9rZW4gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlcCA9IGF3YWl0IGZldGNoKGJhc2VUb2tlblVyaSArICcvdG9rZW4nKVxuICAgICAgICAgICAgICAgIGlmICghcmVwLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdzcG90aWZ5IGZldGNoIHRva2VuIGVycm9yJ1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXAuanNvbigpXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnanNvbicsIGpzb24pXG4gICAgICAgICAgICAgICAgdG9rZW4gPSBqc29uLnRva2VuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rva2VuJywgdG9rZW4pXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgICAgICAgICBoZWFkZXJzLmFwcGVuZCgnQXV0aG9yaXphdGlvbicsICdCZWFyZXIgJyArIHRva2VuKVxuICAgICAgICAgICAgcmVxdWVzdC5oZWFkZXJzID0gaGVhZGVyc1xuXG4gICAgICAgICAgICBjb25zdCByZXAgPSBhd2FpdCBmZXRjaCgkJC51cmwuZ2V0VXJsUGFyYW1zKHVybCwgcGFyYW1zKSwgcmVxdWVzdClcbiAgICAgICAgICAgIGlmIChyZXAub2spIHtcbiAgICAgICAgICAgICAgICByZXQgPSBhd2FpdCByZXAuanNvbigpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgIH1cblxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHNlYXJjaFRyYWNrcyhxdWVyeSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaFRyYWNrcycsIHF1ZXJ5KVxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIHE6IHF1ZXJ5LFxuICAgICAgICAgICAgICAgIHR5cGU6ICd0cmFjaycsXG4gICAgICAgICAgICAgICAgbGltaXQ6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBwZXJmb3JtUmVxdWVzdChiYXNlVXJpICsgJy9zZWFyY2gvJywgcGFyYW1zKVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3VsdHMnLCByZXN1bHRzKVxuICAgICAgICAgICAgY29uc3QgdHJhY2sgPSByZXN1bHRzLnRyYWNrcy5pdGVtc1swXVxuICAgICAgICAgICAgcmV0dXJuIHRyYWNrXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRBdWRpb0ZlYXR1cmVzRm9yVHJhY2sodHJhY2tJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHBlcmZvcm1SZXF1ZXN0KGJhc2VVcmkgKyAnL2F1ZGlvLWZlYXR1cmVzLycgKyB0cmFja0lkKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlYXJjaFRyYWNrcyxcbiAgICAgICAgICAgIGdldEF1ZGlvRmVhdHVyZXNGb3JUcmFja1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnVzZXJzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvdXNlcnMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJylcblx0XHRcdH0sXG5cblx0XHRcdG1hdGNoOiBmdW5jdGlvbiAobWF0Y2gpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJywgeyBtYXRjaCB9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvJywgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZTogZnVuY3Rpb24gKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGU6IGZ1bmN0aW9uICh1c2VyLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnB1dChgLyR7dXNlcn1gLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAodXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdGFjdGl2YXRlQXBwOiBmdW5jdGlvbiAoYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hY3RpdmF0ZUFwcGAsIHsgYXBwTmFtZSwgYWN0aXZhdGVkIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjaGFuZ2VQd2Q6IGZ1bmN0aW9uIChuZXdQd2QpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2NoYW5nZVB3ZGAsIHsgbmV3UHdkIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2dldFVzZXJTZXR0aW5nc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRzZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uIChzZXR0aW5ncykge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2V0VXNlclNldHRpbmdzYCwgc2V0dGluZ3MpXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC53YWtlbG9jaycsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICBhc3luYyBmdW5jdGlvbiByZXF1ZXN0V2FrZUxvY2soKSB7XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yLndha2VMb2NrKSB7XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NrID0gYXdhaXQgbmF2aWdhdG9yLndha2VMb2NrLnJlcXVlc3QoJ3NjcmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3Rha2Ugd2FrZUxvY2snKVxuICAgICAgICAgICAgICAgICAgICBsb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbGVhc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdXYWtlIExvY2sgd2FzIHJlbGVhc2VkJylcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXYWtlTG9jaycsIGUpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd2aXNpYmlsaXR5Y2hhbmdlJywgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlKVxuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdFdha2VMb2NrKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCBvblZpc2liaWxpdHlDaGFuZ2UpXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlcXVlc3RXYWtlTG9ja1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iXX0=
