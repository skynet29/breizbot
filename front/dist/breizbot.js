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

        function mathCompare(operator, val1, val2) {
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
                console.log(`${getVarName(varId)} = ${value}`)

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
                return mathCompare(operator, val1, val2)
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

        function setVarValue(varId, value) {
            variablesValue[varId] = value
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
            if (blocks && blocks.blocks) {
                for (let block of blocks.blocks) {
                    if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                        const procedureName = block.fields.NAME
                        ret.push(procedureName)
                    }
                }
            }

            return ret
        }

        async function callFunction(functionName, ...functionArgs) {
            console.log('callFunction', functionName, functionArgs)
            const block = procedureBlock[functionName]
            if (block == undefined) {
                throw `function '${functionName}' does not exists !`
            }

            const { extraState, inputs } = block
            let nbArgs = 0
            if (extraState != undefined && extraState.params != undefined) {
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

        function setLogFunction(fn) {
            logFunction = fn
        }

        function addBlockType(typeName, fn) {
            blockTypeMap[typeName] = fn
        }

        return {
            startCode,
            setLogFunction,
            evalCode,
            dumpVariables,
            addBlockType,
            getVarValue,
            setVarValue,
            getVarName,
            getFunctionNames,
            callFunction,
            mathCompare
        }
    }
});



//@ts-check
$$.service.registerService('breizbot.blocklyinterpretorLexical', {

    init: function (config) {

        let variablesValue
        let procedureBlock
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

        function mathCompare(operator, val1, val2) {
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
        }

        const blockTypeMap = {
            'math_number': async function (block, localVariables) {
                return block.fields.NUM
            },
            'text': async function (block, localVariables) {
                return block.fields.TEXT
            },
            'text_append': async function (block, localVariables) {
                const varId = block.fields.VAR.id
                const text = await evalCode(block.inputs.TEXT, localVariables)
                variablesValue[varId] += text
            },
            'text_join': async function (block, localVariables) {
                const nbItems = block.extraState.itemCount
                let ret = ''
                if (block.inputs != undefined) {
                    for (let i = 0; i < nbItems; i++) {
                        const itemName = `ADD${i}`
                        if (block.inputs[itemName] != undefined) {
                            const text = await evalCode(block.inputs[itemName], localVariables)
                            ret += text
                        }
                    }
                }
                return ret
            },
            'text_length': async function (block, localVariables) {
                const text = await evalCode(block.inputs.VALUE, localVariables)
                return text.length
            },

            'global_declaration': async function(block) {
                const value = await evalCode(block.inputs.VALUE)
                const varName = block.fields.NAME
                console.log(`${varName} = ${value}`)
                variablesValue[varName] = value
            },
            'lexical_variable_get': async function(block, localVariables) {
                /**@type {string} */
                const varName = block.fields.VAR
                return (varName.startsWith('global ')) ?
                    variablesValue[varName.substring(7)] : localVariables[varName]                
            },

            'variables_get': async function (block, localVariables) {
                const varId = block.fields.VAR.id
                return variablesValue[varId]
            },
            'math_arithmetic': async function (block, localVariables) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A, localVariables)
                const val2 = await evalCode(block.inputs.B, localVariables)
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
            'math_single': async function (block, localVariables) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM, localVariables)
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
            'math_trig': async function (block, localVariables) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM, localVariables)
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
            'math_random_int': async function (block, localVariables) {
                const from = await evalCode(block.inputs.FROM, localVariables)
                const to = await evalCode(block.inputs.TO, localVariables)
                return mathRandomInt(from, to)
            },
            'math_round': async function (block, localVariables) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM, localVariables)
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
            'math_constant': async function (block, localVariables) {
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
            'controls_repeat_ext': async function (block, localVariables) {
                const times = await evalCode(block.inputs.TIMES, localVariables)
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
            'text_print': async function (block, localVariables) {
                if (typeof logFunction == 'function') {
                    logFunction(await evalCode(block.inputs.TEXT, localVariables))
                }
            },
            'text_prompt_ext': async function (block, localVariables) {
                const type = block.fields.TYPE
                const label = await evalCode(block.inputs.TEXT, localVariables)
                console.log({ type, label })
                const ret = await $$.ui.showPrompt({
                    label, title: 'Enter value', attrs: {
                        type: type.toLowerCase()
                    }
                })
                return ret
            },
            'text_changeCase': async function (block, localVariables) {
                const charCase = block.fields.CASE
                console.log({ charCase })
                const value = await evalCode(block.inputs.TEXT, localVariables)
                switch (charCase) {
                    case 'UPPERCASE':
                        return value.toUpperCase()
                    case 'LOWERCASE':
                        return value.toLowerCase()
                    case 'TITLECASE':
                        return textToTitleCase(value)
                }
            },
            'logic_compare': async function (block, localVariables) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A, localVariables)
                const val2 = await evalCode(block.inputs.B, localVariables)
                console.log({ operator, val1, val2 })
                return mathCompare(operator, val1, val2)
            },
            'logic_operation': async function (block, localVariables) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A, localVariables)
                const val2 = await evalCode(block.inputs.B, localVariables)
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
            'logic_boolean': async function (block, localVariables) {
                const test = block.fields.BOOL
                console.log('test', test)
                return (test == 'TRUE')
            },
            'logic_negate': async function (block, localVariables) {
                const test = await evalCode(block.inputs.BOOL, localVariables)
                return !test
            },
            'logic_ternary': async function (block, localVariables) {
                const test = await evalCode(block.inputs.IF, localVariables)
                if (test) {
                    return await evalCode(block.inputs.THEN, localVariables)
                }
                else {
                    return await evalCode(block.inputs.ELSE, localVariables)
                }
            },
            'controls_if': async function (block, localVariables) {

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
                    test = await evalCode(block.inputs[ifName], localVariables)
                    console.log(ifName, test)
                    if (test) {
                        await evalCode(block.inputs[doName], localVariables)
                        break
                    }

                }
                if (hasElse && !test) {
                    await evalCode(block.inputs.ELSE, localVariables)
                }

            },
            'controls_whileUntil': async function (block, localVariables) {
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
            'controls_for': async function (block, localVariables) {
                const varName = block.fields.VAR
                const from = await evalCode(block.inputs.START, localVariables)
                const to = await evalCode(block.inputs.END, localVariables)
                const by = await evalCode(block.inputs.STEP, localVariables)
                console.log({ from, to, by, varName })
                for (let i = from; i <= to; i += by) {
                    localVariables[varName] = i
                    await evalCode(block.inputs.DO, localVariables)
                    if (breakState == 'BREAK') {
                        breakState = ''
                        break
                    }
                    else if (breakState == 'CONTINUE') {
                        breakState = ''
                    }
                }
                delete localVariables[varName]
            },
            'procedures_callnoreturn': async function (block, localVariables) {
                const functionName = block.fields.PROCNAME

                const { inputs, fields } = procedureBlock[functionName]

                
                if (inputs != undefined) {

                    const argNames = getArgNames(block)

                    const newContext = {}
                    for (let i = 0; i < argNames.length; i++) {
                        const argName = `ARG${i}`
                        const value = await evalCode(block.inputs[argName], localVariables)
                        newContext[argNames[i]] = value
                    }

                    console.log({functionName, newContext})
                    
                    if (inputs.STACK != undefined) {
                        await evalCode(inputs.STACK, newContext)
                    }

                    if (inputs.RETURN != undefined) {
                        return await evalCode(inputs.RETURN, newContext)
                    }
                }

            },
            'procedures_callreturn': async function (block, localVariables) {
                return this.procedures_callnoreturn(block, localVariables)
            },
            'controls_flow_statements': async function (block, localVariables) {
                const flow = block.fields.FLOW
                console.log({ flow })
                breakState = flow
            }
        }

        function textToTitleCase(str) {
            return str.replace(/\S+/g,
                function (txt) { return txt[0].toUpperCase() + txt.substring(1).toLowerCase(); })
        }

        function getVarValue(varName) {
            return variablesValue[varName]
        }

        function dumpVariables() {
            console.log('dumpVariables:')
            for (const [name, value] of Object.entries(variablesValue)) {
                console.log(`${name}=${value}`)
            }
        }


        async function evalCode(block, localVariables) {
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
            console.log('evalCode', block.type, localVariables)
            const fn = blockTypeMap[block.type]
            if (typeof fn != 'function') {
                console.log('block', block)
                throw `function '${block.type}' not implemented yet`
            }
            const ret = await fn.call(blockTypeMap, block, localVariables)
            if (ret == undefined && breakState == '') {
                await evalCode(block.next, localVariables)
            }
            return ret
        }

        function getFunctionNames({ blocks }) {
            const ret = []
            if (blocks && blocks.blocks) {
                for (let block of blocks.blocks) {
                    if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                        const procedureName = block.fields.NAME
                        ret.push(procedureName)
                    }
                }
            }

            return ret
        }

        function getArgNames(block) {
            const { fields } = block
            const argNames = []
            for(let i = 0, done = false; !done ; i++) {
                const argName = fields['VAR' + i]
                if (argName != undefined) {
                    argNames.push(argName)
                }
                else {
                    done = true
                }
            }
            return argNames
        }

        async function callFunction(functionName, ...functionArgs) {
            console.log('callFunction', functionName, functionArgs)
            const block = procedureBlock[functionName]
            if (block == undefined) {
                throw `function '${functionName}' does not exists !`
            }

            const { inputs } = block

            if (inputs != undefined) {

                const argNames = getArgNames(block)

                const newContext = {}
                for (let i = 0; i < argNames.length; i++) {
                    newContext[argNames[i]] = functionArgs[i]
                }

                console.log({functionName, newContext})
                
                if (inputs.STACK != undefined) {
                    await evalCode(inputs.STACK, newContext)
                }
            }     
        }

        async function startCode({ blocks } ) {
            console.log('startCode')

            variablesValue = {}
            procedureBlock = {}
            const codeBlocks = blocks.blocks
            breakState = ''
            

            for (const block of codeBlocks) {
                if (block.type == 'global_declaration') {
                    await evalCode(block)
                }
                else if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                    const procedureName = block.fields.NAME
                    procedureBlock[procedureName] = block
                }
            }

            console.log('procedures:')
            for (const procedureName of Object.keys(procedureBlock)) {
                console.log(procedureName)
            }

            for (const  block of codeBlocks) {
                if (block.type != 'procedures_defnoreturn' && 
                    block.type != 'procedures_defreturn' &&
                    block.type != 'global_declaration') {
                    await evalCode(block, {})
                }
            }
            dumpVariables()
        }

        function setLogFunction(fn) {
            logFunction = fn
        }

        function addBlockType(typeName, fn) {
            blockTypeMap[typeName] = fn
        }

        return {
            startCode,
            setLogFunction,
            evalCode,
            dumpVariables,
            addBlockType,
            getVarValue,
            getFunctionNames,
            callFunction,
            mathCompare
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJub3RpZnkubWluLmpzIiwicHJpc20uanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9hZGRDb250YWN0LmpzIiwiY29udGFjdHMvY29udGFjdHMuanMiLCJlZGl0b3IvZWRpdG9yLmpzIiwiZmlsZWNob29zZXIvZmlsdGVyLmpzIiwiZmlsZWNob29zZXIvbWFpbi5qcyIsImZpbGVsaXN0L2ZpbGVsaXN0LmpzIiwiZmlsZXMvZmlsZXMuanMiLCJmb2xkZXJ0cmVlL3RyZWUuanMiLCJmcmllbmRzL2ZyaWVuZHMuanMiLCJob21lL2hvbWUuanMiLCJwYWdlci9wYWdlci5qcyIsInBkZi9tYWluLmpzIiwicnRjL3J0Yy5qcyIsInNlYXJjaGJhci9zZWFyY2hiYXIuanMiLCJ1c2Vycy9hZGRVc2VyLmpzIiwidXNlcnMvdXNlcnMuanMiLCJ2aWV3ZXIvdmlld2VyLmpzIiwiYXBwRGF0YS5qcyIsImFwcHMuanMiLCJiZWF0ZGV0ZWN0b3IuanMiLCJibG9ja2x5aW50ZXJwcmV0b3IuanMiLCJibG9ja2x5aW50ZXJwcmV0b3JMZXhpY2FsLmpzIiwiYnJva2VyLmpzIiwiY2l0aWVzLmpzIiwiY29udGFjdHMuanMiLCJkaXNwbGF5LmpzIiwiZmlsZXMuanMiLCJmcmllbmRzLmpzIiwiZnVsbHNjcmVlbi5qcyIsImdhbWVwYWQuanMiLCJnZW9sb2MuanMiLCJodHRwLmpzIiwibm90aWZzLmpzIiwicGFnZXIuanMiLCJwYXJhbXMuanMiLCJwbGF5bGlzdHMuanMiLCJyYWRhci5qcyIsInJ0Yy5qcyIsInNjaGVkdWxlci5qcyIsInNvbmdzLmpzIiwic3BvdGlmeS5qcyIsInVzZXJzLmpzIiwid2FrZWxvY2suanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeHdCQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoc0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcmhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9oQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJicmVpemJvdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogRXZlbnRFbWl0dGVyMlxuICogaHR0cHM6Ly9naXRodWIuY29tL2hpajFueC9FdmVudEVtaXR0ZXIyXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSA/IEFycmF5LmlzQXJyYXkgOiBmdW5jdGlvbiBfaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgfTtcbiAgdmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGlmICh0aGlzLl9jb25mKSB7XG4gICAgICBjb25maWd1cmUuY2FsbCh0aGlzLCB0aGlzLl9jb25mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmUoY29uZikge1xuICAgIGlmIChjb25mKSB7XG4gICAgICB0aGlzLl9jb25mID0gY29uZjtcblxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCA/IGNvbmYubWF4TGlzdGVuZXJzIDogZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xuICAgICAgY29uZi5uZXdMaXN0ZW5lciAmJiAodGhpcy5uZXdMaXN0ZW5lciA9IGNvbmYubmV3TGlzdGVuZXIpO1xuICAgICAgY29uZi52ZXJib3NlTWVtb3J5TGVhayAmJiAodGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGNvbmYudmVyYm9zZU1lbW9yeUxlYWspO1xuXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhayhjb3VudCwgZXZlbnROYW1lKSB7XG4gICAgdmFyIGVycm9yTXNnID0gJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAnbGVhayBkZXRlY3RlZC4gJyArIGNvdW50ICsgJyBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJztcblxuICAgIGlmKHRoaXMudmVyYm9zZU1lbW9yeUxlYWspe1xuICAgICAgZXJyb3JNc2cgKz0gJyBFdmVudCBuYW1lOiAnICsgZXZlbnROYW1lICsgJy4nO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVtaXRXYXJuaW5nKXtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKGVycm9yTXNnKTtcbiAgICAgIGUubmFtZSA9ICdNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcnO1xuICAgICAgZS5lbWl0dGVyID0gdGhpcztcbiAgICAgIGUuY291bnQgPSBjb3VudDtcbiAgICAgIHByb2Nlc3MuZW1pdFdhcm5pbmcoZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICBpZiAoY29uc29sZS50cmFjZSl7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoY29uZikge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMubmV3TGlzdGVuZXIgPSBmYWxzZTtcbiAgICB0aGlzLnZlcmJvc2VNZW1vcnlMZWFrID0gZmFsc2U7XG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XG4gIH1cbiAgRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7IC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGZvciBleHBvcnRpbmcgRXZlbnRFbWl0dGVyIHByb3BlcnR5XG5cbiAgLy9cbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxuICAvLyBlbGVtZW50cyAobGVhZnMpIGlmIHRoZXJlIGFyZSBtYXRjaGVzXG4gIC8vXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xuICAgIGlmICghdHJlZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgbGlzdGVuZXJzPVtdLCBsZWFmLCBsZW4sIGJyYW5jaCwgeFRyZWUsIHh4VHJlZSwgaXNvbGF0ZWRCcmFuY2gsIGVuZFJlYWNoZWQsXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgLy9cbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xuICAgICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzW2xlYWZdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoY3VycmVudFR5cGUgPT09ICcqJyB8fCBjdXJyZW50VHlwZSA9PT0gJyoqJykgfHwgdHJlZVtjdXJyZW50VHlwZV0pIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XG4gICAgICAvLyBvciB0aGVyZSBpcyBhIGNvbmNyZXRlIG1hdGNoIGF0IHRoaXMgcGF0Y2hcbiAgICAgIC8vXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9IGVsc2UgaWYoY3VycmVudFR5cGUgPT09ICcqKicpIHtcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIG5leHQgZWxlbWVudCBoYXMgYSBfbGlzdGVuZXJzLCBhZGQgaXQgdG8gdGhlIGhhbmRsZXJzLlxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSAnKicgfHwgYnJhbmNoID09PSAnKionKSB7XG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xuICAgIH1cblxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xuICAgIGlmICh4VHJlZSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXG4gICAgICAvL1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcbiAgICB9XG5cbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xuICAgIGlmKHh4VHJlZSkge1xuICAgICAgaWYoaSA8IHR5cGVMZW5ndGgpIHtcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxuICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGFycmF5cyBvZiBtYXRjaGluZyBuZXh0IGJyYW5jaGVzIGFuZCBvdGhlcnMuXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBjdXJyZW50VHlwZSkge1xuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHsgJyoqJzogaXNvbGF0ZWRCcmFuY2ggfSwgaSsxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gIH1cblxuICBmdW5jdGlvbiBncm93TGlzdGVuZXJUcmVlKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG5cbiAgICAvL1xuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxuICAgIC8vXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcblxuICAgIHdoaWxlIChuYW1lICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgaWYgKCF0cmVlW25hbWVdKSB7XG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnNdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICF0cmVlLl9saXN0ZW5lcnMud2FybmVkICYmXG4gICAgICAgICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPiAwICYmXG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gdGhpcy5fbWF4TGlzdGVuZXJzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhay5jYWxsKHRoaXMsIHRyZWUuX2xpc3RlbmVycy5sZW5ndGgsIG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuICAvLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbiAgLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4gIC8vXG4gIC8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuICAvLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmRlbGltaXRlciA9ICcuJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgICBpZiAobiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICAgICAgaWYgKCF0aGlzLl9jb25mKSB0aGlzLl9jb25mID0ge307XG4gICAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XG4gICAgfVxuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnQgPSAnJztcblxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHJldHVybiB0aGlzLl9vbmNlKGV2ZW50LCBmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHJldHVybiB0aGlzLl9vbmNlKGV2ZW50LCBmbiwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbiwgcHJlcGVuZCkge1xuICAgIHRoaXMuX21hbnkoZXZlbnQsIDEsIGZuLCBwcmVwZW5kKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHJldHVybiB0aGlzLl9tYW55KGV2ZW50LCB0dGwsIGZuLCBmYWxzZSk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRNYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgdHJ1ZSk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4sIHByZXBlbmQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgaWYgKC0tdHRsID09PSAwKSB7XG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XG5cbiAgICB0aGlzLl9vbihldmVudCwgbGlzdGVuZXIsIHByZXBlbmQpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGFyZ3MsbCxpLGo7XG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZiAodGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGgpIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9hbGwuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBoYW5kbGVyW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgICAvLyBuZWVkIHRvIG1ha2UgY29weSBvZiBoYW5kbGVycyBiZWNhdXNlIGxpc3QgY2FuIGNoYW5nZSBpbiB0aGUgbWlkZGxlXG4gICAgICAgIC8vIG9mIGVtaXQgY2FsbFxuICAgICAgICBoYW5kbGVyID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIubGVuZ3RoKSB7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuICEhdGhpcy5fYWxsO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFzeW5jID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtmYWxzZV0pOyB9XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2VzPSBbXTtcblxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGFyZ3MsbCxpLGo7XG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZiAodGhpcy5fYWxsKSB7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyICYmIGhhbmRsZXIubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcykpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9hbGwgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChhcmd1bWVudHNbMV0pOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uKHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCBmYWxzZSk7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25BbnkoZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uQW55ID0gZnVuY3Rpb24oZm4sIHByZXBlbmQpe1xuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYWxsKSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZ1bmN0aW9uIHRvIHRoZSBldmVudCBsaXN0ZW5lciBjb2xsZWN0aW9uLlxuICAgIGlmKHByZXBlbmQpe1xuICAgICAgdGhpcy5fYWxsLnVuc2hpZnQoZm4pO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5fYWxsLnB1c2goZm4pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fb24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fb25BbnkodHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbiBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBncm93TGlzdGVuZXJUcmVlLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHNbdHlwZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRvIGFycmF5LlxuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYWRkXG4gICAgICBpZihwcmVwZW5kKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgJiZcbiAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gdGhpcy5fbWF4TGlzdGVuZXJzXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhay5jYWxsKHRoaXMsIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgsIHR5cGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0uX29yaWdpbiAmJiBoYW5kbGVyc1tpXS5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGFuZGxlcnMgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdCkge1xuICAgICAgaWYgKHJvb3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJvb3QpO1xuICAgICAgZm9yICh2YXIgaSBpbiBrZXlzKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgb2JqID0gcm9vdFtrZXldO1xuICAgICAgICBpZiAoKG9iaiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB8fCAodHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIikgfHwgKG9iaiA9PT0gbnVsbCkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3Rba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgZGVsZXRlIHJvb3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHRoaXMubGlzdGVuZXJUcmVlKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XG4gICAgaWYgKGZuICYmIHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoID4gMCkge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihmbiA9PT0gZm5zW2ldKSB7XG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKylcbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm5zW2ldKTtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmY7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcblxuICAgICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHMpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlcnMsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgICByZXR1cm4gaGFuZGxlcnM7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZXZlbnRzKTtcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5saXN0ZW5lcnModHlwZSkubGVuZ3RoO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzQW55ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih0aGlzLl9hbGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbC5cbiAgICB3aW5kb3cuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxufSgpO1xuIiwiKGZ1bmN0aW9uKGUpe3R5cGVvZiBkZWZpbmU9PVwiZnVuY3Rpb25cIiYmZGVmaW5lLmFtZD9kZWZpbmUoW1wianF1ZXJ5XCJdLGUpOnR5cGVvZiBtb2R1bGU9PVwib2JqZWN0XCImJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKHQsbil7cmV0dXJuIG49PT11bmRlZmluZWQmJih0eXBlb2Ygd2luZG93IT1cInVuZGVmaW5lZFwiP249cmVxdWlyZShcImpxdWVyeVwiKTpuPXJlcXVpcmUoXCJqcXVlcnlcIikodCkpLGUobiksbn06ZShqUXVlcnkpfSkoZnVuY3Rpb24oZSl7ZnVuY3Rpb24gQSh0LG4saSl7dHlwZW9mIGk9PVwic3RyaW5nXCImJihpPXtjbGFzc05hbWU6aX0pLHRoaXMub3B0aW9ucz1FKHcsZS5pc1BsYWluT2JqZWN0KGkpP2k6e30pLHRoaXMubG9hZEhUTUwoKSx0aGlzLndyYXBwZXI9ZShoLmh0bWwpLHRoaXMub3B0aW9ucy5jbGlja1RvSGlkZSYmdGhpcy53cmFwcGVyLmFkZENsYXNzKHIrXCItaGlkYWJsZVwiKSx0aGlzLndyYXBwZXIuZGF0YShyLHRoaXMpLHRoaXMuYXJyb3c9dGhpcy53cmFwcGVyLmZpbmQoXCIuXCIrcitcIi1hcnJvd1wiKSx0aGlzLmNvbnRhaW5lcj10aGlzLndyYXBwZXIuZmluZChcIi5cIityK1wiLWNvbnRhaW5lclwiKSx0aGlzLmNvbnRhaW5lci5hcHBlbmQodGhpcy51c2VyQ29udGFpbmVyKSx0JiZ0Lmxlbmd0aCYmKHRoaXMuZWxlbWVudFR5cGU9dC5hdHRyKFwidHlwZVwiKSx0aGlzLm9yaWdpbmFsRWxlbWVudD10LHRoaXMuZWxlbT1OKHQpLHRoaXMuZWxlbS5kYXRhKHIsdGhpcyksdGhpcy5lbGVtLmJlZm9yZSh0aGlzLndyYXBwZXIpKSx0aGlzLmNvbnRhaW5lci5oaWRlKCksdGhpcy5ydW4obil9dmFyIHQ9W10uaW5kZXhPZnx8ZnVuY3Rpb24oZSl7Zm9yKHZhciB0PTAsbj10aGlzLmxlbmd0aDt0PG47dCsrKWlmKHQgaW4gdGhpcyYmdGhpc1t0XT09PWUpcmV0dXJuIHQ7cmV0dXJuLTF9LG49XCJub3RpZnlcIixyPW4rXCJqc1wiLGk9bitcIiFibGFua1wiLHM9e3Q6XCJ0b3BcIixtOlwibWlkZGxlXCIsYjpcImJvdHRvbVwiLGw6XCJsZWZ0XCIsYzpcImNlbnRlclwiLHI6XCJyaWdodFwifSxvPVtcImxcIixcImNcIixcInJcIl0sdT1bXCJ0XCIsXCJtXCIsXCJiXCJdLGE9W1widFwiLFwiYlwiLFwibFwiLFwiclwiXSxmPXt0OlwiYlwiLG06bnVsbCxiOlwidFwiLGw6XCJyXCIsYzpudWxsLHI6XCJsXCJ9LGw9ZnVuY3Rpb24odCl7dmFyIG47cmV0dXJuIG49W10sZS5lYWNoKHQuc3BsaXQoL1xcVysvKSxmdW5jdGlvbihlLHQpe3ZhciByO3I9dC50b0xvd2VyQ2FzZSgpLmNoYXJBdCgwKTtpZihzW3JdKXJldHVybiBuLnB1c2gocil9KSxufSxjPXt9LGg9e25hbWU6XCJjb3JlXCIsaHRtbDonPGRpdiBjbGFzcz1cIicrcisnLXdyYXBwZXJcIj5cXG5cdDxkaXYgY2xhc3M9XCInK3IrJy1hcnJvd1wiPjwvZGl2Plxcblx0PGRpdiBjbGFzcz1cIicrcisnLWNvbnRhaW5lclwiPjwvZGl2PlxcbjwvZGl2PicsY3NzOlwiLlwiK3IrXCItY29ybmVyIHtcXG5cdHBvc2l0aW9uOiBmaXhlZDtcXG5cdG1hcmdpbjogNXB4O1xcblx0ei1pbmRleDogMTA1MDtcXG59XFxuXFxuLlwiK3IrXCItY29ybmVyIC5cIityK1wiLXdyYXBwZXIsXFxuLlwiK3IrXCItY29ybmVyIC5cIityK1wiLWNvbnRhaW5lciB7XFxuXHRwb3NpdGlvbjogcmVsYXRpdmU7XFxuXHRkaXNwbGF5OiBibG9jaztcXG5cdGhlaWdodDogaW5oZXJpdDtcXG5cdHdpZHRoOiBpbmhlcml0O1xcblx0bWFyZ2luOiAzcHg7XFxufVxcblxcbi5cIityK1wiLXdyYXBwZXIge1xcblx0ei1pbmRleDogMTtcXG5cdHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG5cdGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG5cdGhlaWdodDogMDtcXG5cdHdpZHRoOiAwO1xcbn1cXG5cXG4uXCIrcitcIi1jb250YWluZXIge1xcblx0ZGlzcGxheTogbm9uZTtcXG5cdHotaW5kZXg6IDE7XFxuXHRwb3NpdGlvbjogYWJzb2x1dGU7XFxufVxcblxcbi5cIityK1wiLWhpZGFibGUge1xcblx0Y3Vyc29yOiBwb2ludGVyO1xcbn1cXG5cXG5bZGF0YS1ub3RpZnktdGV4dF0sW2RhdGEtbm90aWZ5LWh0bWxdIHtcXG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcXG59XFxuXFxuLlwiK3IrXCItYXJyb3cge1xcblx0cG9zaXRpb246IGFic29sdXRlO1xcblx0ei1pbmRleDogMjtcXG5cdHdpZHRoOiAwO1xcblx0aGVpZ2h0OiAwO1xcbn1cIn0scD17XCJib3JkZXItcmFkaXVzXCI6W1wiLXdlYmtpdC1cIixcIi1tb3otXCJdfSxkPWZ1bmN0aW9uKGUpe3JldHVybiBjW2VdfSx2PWZ1bmN0aW9uKGUpe2lmKCFlKXRocm93XCJNaXNzaW5nIFN0eWxlIG5hbWVcIjtjW2VdJiZkZWxldGUgY1tlXX0sbT1mdW5jdGlvbih0LGkpe2lmKCF0KXRocm93XCJNaXNzaW5nIFN0eWxlIG5hbWVcIjtpZighaSl0aHJvd1wiTWlzc2luZyBTdHlsZSBkZWZpbml0aW9uXCI7aWYoIWkuaHRtbCl0aHJvd1wiTWlzc2luZyBTdHlsZSBIVE1MXCI7dmFyIHM9Y1t0XTtzJiZzLmNzc0VsZW0mJih3aW5kb3cuY29uc29sZSYmY29uc29sZS53YXJuKG4rXCI6IG92ZXJ3cml0aW5nIHN0eWxlICdcIit0K1wiJ1wiKSxjW3RdLmNzc0VsZW0ucmVtb3ZlKCkpLGkubmFtZT10LGNbdF09aTt2YXIgbz1cIlwiO2kuY2xhc3NlcyYmZS5lYWNoKGkuY2xhc3NlcyxmdW5jdGlvbih0LG4pe3JldHVybiBvKz1cIi5cIityK1wiLVwiK2kubmFtZStcIi1cIit0K1wiIHtcXG5cIixlLmVhY2gobixmdW5jdGlvbih0LG4pe3JldHVybiBwW3RdJiZlLmVhY2gocFt0XSxmdW5jdGlvbihlLHIpe3JldHVybiBvKz1cIlx0XCIrcit0K1wiOiBcIituK1wiO1xcblwifSksbys9XCJcdFwiK3QrXCI6IFwiK24rXCI7XFxuXCJ9KSxvKz1cIn1cXG5cIn0pLGkuY3NzJiYobys9XCIvKiBzdHlsZXMgZm9yIFwiK2kubmFtZStcIiAqL1xcblwiK2kuY3NzKSxvJiYoaS5jc3NFbGVtPWcobyksaS5jc3NFbGVtLmF0dHIoXCJpZFwiLFwibm90aWZ5LVwiK2kubmFtZSkpO3ZhciB1PXt9LGE9ZShpLmh0bWwpO3koXCJodG1sXCIsYSx1KSx5KFwidGV4dFwiLGEsdSksaS5maWVsZHM9dX0sZz1mdW5jdGlvbih0KXt2YXIgbixyLGk7cj14KFwic3R5bGVcIiksci5hdHRyKFwidHlwZVwiLFwidGV4dC9jc3NcIiksZShcImhlYWRcIikuYXBwZW5kKHIpO3RyeXtyLmh0bWwodCl9Y2F0Y2gocyl7clswXS5zdHlsZVNoZWV0LmNzc1RleHQ9dH1yZXR1cm4gcn0seT1mdW5jdGlvbih0LG4scil7dmFyIHM7cmV0dXJuIHQhPT1cImh0bWxcIiYmKHQ9XCJ0ZXh0XCIpLHM9XCJkYXRhLW5vdGlmeS1cIit0LGIobixcIltcIitzK1wiXVwiKS5lYWNoKGZ1bmN0aW9uKCl7dmFyIG47bj1lKHRoaXMpLmF0dHIocyksbnx8KG49aSkscltuXT10fSl9LGI9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZS5pcyh0KT9lOmUuZmluZCh0KX0sdz17Y2xpY2tUb0hpZGU6ITAsYXV0b0hpZGU6ITAsYXV0b0hpZGVEZWxheTo1ZTMsYXJyb3dTaG93OiEwLGFycm93U2l6ZTo1LGJyZWFrTmV3TGluZXM6ITAsZWxlbWVudFBvc2l0aW9uOlwiYm90dG9tXCIsZ2xvYmFsUG9zaXRpb246XCJ0b3AgcmlnaHRcIixzdHlsZTpcImJvb3RzdHJhcFwiLGNsYXNzTmFtZTpcImVycm9yXCIsc2hvd0FuaW1hdGlvbjpcInNsaWRlRG93blwiLHNob3dEdXJhdGlvbjo0MDAsaGlkZUFuaW1hdGlvbjpcInNsaWRlVXBcIixoaWRlRHVyYXRpb246MjAwLGdhcDo1fSxFPWZ1bmN0aW9uKHQsbil7dmFyIHI7cmV0dXJuIHI9ZnVuY3Rpb24oKXt9LHIucHJvdG90eXBlPXQsZS5leHRlbmQoITAsbmV3IHIsbil9LFM9ZnVuY3Rpb24odCl7cmV0dXJuIGUuZXh0ZW5kKHcsdCl9LHg9ZnVuY3Rpb24odCl7cmV0dXJuIGUoXCI8XCIrdCtcIj48L1wiK3QrXCI+XCIpfSxUPXt9LE49ZnVuY3Rpb24odCl7dmFyIG47cmV0dXJuIHQuaXMoXCJbdHlwZT1yYWRpb11cIikmJihuPXQucGFyZW50cyhcImZvcm06Zmlyc3RcIikuZmluZChcIlt0eXBlPXJhZGlvXVwiKS5maWx0ZXIoZnVuY3Rpb24obixyKXtyZXR1cm4gZShyKS5hdHRyKFwibmFtZVwiKT09PXQuYXR0cihcIm5hbWVcIil9KSx0PW4uZmlyc3QoKSksdH0sQz1mdW5jdGlvbihlLHQsbil7dmFyIHIsaTtpZih0eXBlb2Ygbj09XCJzdHJpbmdcIiluPXBhcnNlSW50KG4sMTApO2Vsc2UgaWYodHlwZW9mIG4hPVwibnVtYmVyXCIpcmV0dXJuO2lmKGlzTmFOKG4pKXJldHVybjtyZXR1cm4gcj1zW2ZbdC5jaGFyQXQoMCldXSxpPXQsZVtyXSE9PXVuZGVmaW5lZCYmKHQ9c1tyLmNoYXJBdCgwKV0sbj0tbiksZVt0XT09PXVuZGVmaW5lZD9lW3RdPW46ZVt0XSs9bixudWxsfSxrPWZ1bmN0aW9uKGUsdCxuKXtpZihlPT09XCJsXCJ8fGU9PT1cInRcIilyZXR1cm4gMDtpZihlPT09XCJjXCJ8fGU9PT1cIm1cIilyZXR1cm4gbi8yLXQvMjtpZihlPT09XCJyXCJ8fGU9PT1cImJcIilyZXR1cm4gbi10O3Rocm93XCJJbnZhbGlkIGFsaWdubWVudFwifSxMPWZ1bmN0aW9uKGUpe3JldHVybiBMLmU9TC5lfHx4KFwiZGl2XCIpLEwuZS50ZXh0KGUpLmh0bWwoKX07QS5wcm90b3R5cGUubG9hZEhUTUw9ZnVuY3Rpb24oKXt2YXIgdDt0PXRoaXMuZ2V0U3R5bGUoKSx0aGlzLnVzZXJDb250YWluZXI9ZSh0Lmh0bWwpLHRoaXMudXNlckZpZWxkcz10LmZpZWxkc30sQS5wcm90b3R5cGUuc2hvdz1mdW5jdGlvbihlLHQpe3ZhciBuLHIsaSxzLG87cj1mdW5jdGlvbihuKXtyZXR1cm4gZnVuY3Rpb24oKXshZSYmIW4uZWxlbSYmbi5kZXN0cm95KCk7aWYodClyZXR1cm4gdCgpfX0odGhpcyksbz10aGlzLmNvbnRhaW5lci5wYXJlbnQoKS5wYXJlbnRzKFwiOmhpZGRlblwiKS5sZW5ndGg+MCxpPXRoaXMuY29udGFpbmVyLmFkZCh0aGlzLmFycm93KSxuPVtdO2lmKG8mJmUpcz1cInNob3dcIjtlbHNlIGlmKG8mJiFlKXM9XCJoaWRlXCI7ZWxzZSBpZighbyYmZSlzPXRoaXMub3B0aW9ucy5zaG93QW5pbWF0aW9uLG4ucHVzaCh0aGlzLm9wdGlvbnMuc2hvd0R1cmF0aW9uKTtlbHNle2lmKCEhb3x8ISFlKXJldHVybiByKCk7cz10aGlzLm9wdGlvbnMuaGlkZUFuaW1hdGlvbixuLnB1c2godGhpcy5vcHRpb25zLmhpZGVEdXJhdGlvbil9cmV0dXJuIG4ucHVzaChyKSxpW3NdLmFwcGx5KGksbil9LEEucHJvdG90eXBlLnNldEdsb2JhbFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5nZXRQb3NpdGlvbigpLG49dFswXSxpPXRbMV0sbz1zW25dLHU9c1tpXSxhPW4rXCJ8XCIraSxmPVRbYV07aWYoIWZ8fCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKGZbMF0pKXtmPVRbYV09eChcImRpdlwiKTt2YXIgbD17fTtsW29dPTAsdT09PVwibWlkZGxlXCI/bC50b3A9XCI0NSVcIjp1PT09XCJjZW50ZXJcIj9sLmxlZnQ9XCI0NSVcIjpsW3VdPTAsZi5jc3MobCkuYWRkQ2xhc3MocitcIi1jb3JuZXJcIiksZShcImJvZHlcIikuYXBwZW5kKGYpfXJldHVybiBmLnByZXBlbmQodGhpcy53cmFwcGVyKX0sQS5wcm90b3R5cGUuc2V0RWxlbWVudFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIG4scixpLGwsYyxoLHAsZCx2LG0sZyx5LGIsdyxFLFMseCxULE4sTCxBLE8sTSxfLEQsUCxILEIsajtIPXRoaXMuZ2V0UG9zaXRpb24oKSxfPUhbMF0sTz1IWzFdLE09SFsyXSxnPXRoaXMuZWxlbS5wb3NpdGlvbigpLGQ9dGhpcy5lbGVtLm91dGVySGVpZ2h0KCkseT10aGlzLmVsZW0ub3V0ZXJXaWR0aCgpLHY9dGhpcy5lbGVtLmlubmVySGVpZ2h0KCksbT10aGlzLmVsZW0uaW5uZXJXaWR0aCgpLGo9dGhpcy53cmFwcGVyLnBvc2l0aW9uKCksYz10aGlzLmNvbnRhaW5lci5oZWlnaHQoKSxoPXRoaXMuY29udGFpbmVyLndpZHRoKCksVD1zW19dLEw9ZltfXSxBPXNbTF0scD17fSxwW0FdPV89PT1cImJcIj9kOl89PT1cInJcIj95OjAsQyhwLFwidG9wXCIsZy50b3Atai50b3ApLEMocCxcImxlZnRcIixnLmxlZnQtai5sZWZ0KSxCPVtcInRvcFwiLFwibGVmdFwiXTtmb3Iodz0wLFM9Qi5sZW5ndGg7dzxTO3crKylEPUJbd10sTj1wYXJzZUludCh0aGlzLmVsZW0uY3NzKFwibWFyZ2luLVwiK0QpLDEwKSxOJiZDKHAsRCxOKTtiPU1hdGgubWF4KDAsdGhpcy5vcHRpb25zLmdhcC0odGhpcy5vcHRpb25zLmFycm93U2hvdz9pOjApKSxDKHAsQSxiKTtpZighdGhpcy5vcHRpb25zLmFycm93U2hvdyl0aGlzLmFycm93LmhpZGUoKTtlbHNle2k9dGhpcy5vcHRpb25zLmFycm93U2l6ZSxyPWUuZXh0ZW5kKHt9LHApLG49dGhpcy51c2VyQ29udGFpbmVyLmNzcyhcImJvcmRlci1jb2xvclwiKXx8dGhpcy51c2VyQ29udGFpbmVyLmNzcyhcImJvcmRlci10b3AtY29sb3JcIil8fHRoaXMudXNlckNvbnRhaW5lci5jc3MoXCJiYWNrZ3JvdW5kLWNvbG9yXCIpfHxcIndoaXRlXCI7Zm9yKEU9MCx4PWEubGVuZ3RoO0U8eDtFKyspe0Q9YVtFXSxQPXNbRF07aWYoRD09PUwpY29udGludWU7bD1QPT09VD9uOlwidHJhbnNwYXJlbnRcIixyW1wiYm9yZGVyLVwiK1BdPWkrXCJweCBzb2xpZCBcIitsfUMocCxzW0xdLGkpLHQuY2FsbChhLE8pPj0wJiZDKHIsc1tPXSxpKjIpfXQuY2FsbCh1LF8pPj0wPyhDKHAsXCJsZWZ0XCIsayhPLGgseSkpLHImJkMocixcImxlZnRcIixrKE8saSxtKSkpOnQuY2FsbChvLF8pPj0wJiYoQyhwLFwidG9wXCIsayhPLGMsZCkpLHImJkMocixcInRvcFwiLGsoTyxpLHYpKSksdGhpcy5jb250YWluZXIuaXMoXCI6dmlzaWJsZVwiKSYmKHAuZGlzcGxheT1cImJsb2NrXCIpLHRoaXMuY29udGFpbmVyLnJlbW92ZUF0dHIoXCJzdHlsZVwiKS5jc3MocCk7aWYocilyZXR1cm4gdGhpcy5hcnJvdy5yZW1vdmVBdHRyKFwic3R5bGVcIikuY3NzKHIpfSxBLnByb3RvdHlwZS5nZXRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciBlLG4scixpLHMsZixjLGg7aD10aGlzLm9wdGlvbnMucG9zaXRpb258fCh0aGlzLmVsZW0/dGhpcy5vcHRpb25zLmVsZW1lbnRQb3NpdGlvbjp0aGlzLm9wdGlvbnMuZ2xvYmFsUG9zaXRpb24pLGU9bChoKSxlLmxlbmd0aD09PTAmJihlWzBdPVwiYlwiKTtpZihuPWVbMF0sdC5jYWxsKGEsbik8MCl0aHJvd1wiTXVzdCBiZSBvbmUgb2YgW1wiK2ErXCJdXCI7aWYoZS5sZW5ndGg9PT0xfHwocj1lWzBdLHQuY2FsbCh1LHIpPj0wKSYmKGk9ZVsxXSx0LmNhbGwobyxpKTwwKXx8KHM9ZVswXSx0LmNhbGwobyxzKT49MCkmJihmPWVbMV0sdC5jYWxsKHUsZik8MCkpZVsxXT0oYz1lWzBdLHQuY2FsbChvLGMpPj0wKT9cIm1cIjpcImxcIjtyZXR1cm4gZS5sZW5ndGg9PT0yJiYoZVsyXT1lWzFdKSxlfSxBLnByb3RvdHlwZS5nZXRTdHlsZT1mdW5jdGlvbihlKXt2YXIgdDtlfHwoZT10aGlzLm9wdGlvbnMuc3R5bGUpLGV8fChlPVwiZGVmYXVsdFwiKSx0PWNbZV07aWYoIXQpdGhyb3dcIk1pc3Npbmcgc3R5bGU6IFwiK2U7cmV0dXJuIHR9LEEucHJvdG90eXBlLnVwZGF0ZUNsYXNzZXM9ZnVuY3Rpb24oKXt2YXIgdCxuO3JldHVybiB0PVtcImJhc2VcIl0sZS5pc0FycmF5KHRoaXMub3B0aW9ucy5jbGFzc05hbWUpP3Q9dC5jb25jYXQodGhpcy5vcHRpb25zLmNsYXNzTmFtZSk6dGhpcy5vcHRpb25zLmNsYXNzTmFtZSYmdC5wdXNoKHRoaXMub3B0aW9ucy5jbGFzc05hbWUpLG49dGhpcy5nZXRTdHlsZSgpLHQ9ZS5tYXAodCxmdW5jdGlvbihlKXtyZXR1cm4gcitcIi1cIituLm5hbWUrXCItXCIrZX0pLmpvaW4oXCIgXCIpLHRoaXMudXNlckNvbnRhaW5lci5hdHRyKFwiY2xhc3NcIix0KX0sQS5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKHQsbil7dmFyIHIscyxvLHUsYTtlLmlzUGxhaW5PYmplY3Qobik/ZS5leHRlbmQodGhpcy5vcHRpb25zLG4pOmUudHlwZShuKT09PVwic3RyaW5nXCImJih0aGlzLm9wdGlvbnMuY2xhc3NOYW1lPW4pO2lmKHRoaXMuY29udGFpbmVyJiYhdCl7dGhpcy5zaG93KCExKTtyZXR1cm59aWYoIXRoaXMuY29udGFpbmVyJiYhdClyZXR1cm47cz17fSxlLmlzUGxhaW5PYmplY3QodCk/cz10OnNbaV09dDtmb3IobyBpbiBzKXtyPXNbb10sdT10aGlzLnVzZXJGaWVsZHNbb107aWYoIXUpY29udGludWU7dT09PVwidGV4dFwiJiYocj1MKHIpLHRoaXMub3B0aW9ucy5icmVha05ld0xpbmVzJiYocj1yLnJlcGxhY2UoL1xcbi9nLFwiPGJyLz5cIikpKSxhPW89PT1pP1wiXCI6XCI9XCIrbyxiKHRoaXMudXNlckNvbnRhaW5lcixcIltkYXRhLW5vdGlmeS1cIit1K2ErXCJdXCIpLmh0bWwocil9dGhpcy51cGRhdGVDbGFzc2VzKCksdGhpcy5lbGVtP3RoaXMuc2V0RWxlbWVudFBvc2l0aW9uKCk6dGhpcy5zZXRHbG9iYWxQb3NpdGlvbigpLHRoaXMuc2hvdyghMCksdGhpcy5vcHRpb25zLmF1dG9IaWRlJiYoY2xlYXJUaW1lb3V0KHRoaXMuYXV0b2hpZGVUaW1lciksdGhpcy5hdXRvaGlkZVRpbWVyPXNldFRpbWVvdXQodGhpcy5zaG93LmJpbmQodGhpcywhMSksdGhpcy5vcHRpb25zLmF1dG9IaWRlRGVsYXkpKX0sQS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMud3JhcHBlci5kYXRhKHIsbnVsbCksdGhpcy53cmFwcGVyLnJlbW92ZSgpfSxlW25dPWZ1bmN0aW9uKHQscixpKXtyZXR1cm4gdCYmdC5ub2RlTmFtZXx8dC5qcXVlcnk/ZSh0KVtuXShyLGkpOihpPXIscj10LG5ldyBBKG51bGwscixpKSksdH0sZS5mbltuXT1mdW5jdGlvbih0LG4pe3JldHVybiBlKHRoaXMpLmVhY2goZnVuY3Rpb24oKXt2YXIgaT1OKGUodGhpcykpLmRhdGEocik7aSYmaS5kZXN0cm95KCk7dmFyIHM9bmV3IEEoZSh0aGlzKSx0LG4pfSksdGhpc30sZS5leHRlbmQoZVtuXSx7ZGVmYXVsdHM6UyxhZGRTdHlsZTptLHJlbW92ZVN0eWxlOnYscGx1Z2luT3B0aW9uczp3LGdldFN0eWxlOmQsaW5zZXJ0Q1NTOmd9KSxtKFwiYm9vdHN0cmFwXCIse2h0bWw6XCI8ZGl2PlxcbjxzcGFuIGRhdGEtbm90aWZ5LXRleHQ+PC9zcGFuPlxcbjwvZGl2PlwiLGNsYXNzZXM6e2Jhc2U6e1wiZm9udC13ZWlnaHRcIjpcImJvbGRcIixwYWRkaW5nOlwiOHB4IDE1cHggOHB4IDE0cHhcIixcInRleHQtc2hhZG93XCI6XCIwIDFweCAwIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC41KVwiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI2ZjZjhlM1wiLGJvcmRlcjpcIjFweCBzb2xpZCAjZmJlZWQ1XCIsXCJib3JkZXItcmFkaXVzXCI6XCI0cHhcIixcIndoaXRlLXNwYWNlXCI6XCJub3dyYXBcIixcInBhZGRpbmctbGVmdFwiOlwiMjVweFwiLFwiYmFja2dyb3VuZC1yZXBlYXRcIjpcIm5vLXJlcGVhdFwiLFwiYmFja2dyb3VuZC1wb3NpdGlvblwiOlwiM3B4IDdweFwifSxlcnJvcjp7Y29sb3I6XCIjQjk0QTQ4XCIsXCJiYWNrZ3JvdW5kLWNvbG9yXCI6XCIjRjJERURFXCIsXCJib3JkZXItY29sb3JcIjpcIiNFRUQzRDdcIixcImJhY2tncm91bmQtaW1hZ2VcIjpcInVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJRQUFBQVVDQVlBQUFDTmlSME5BQUFBR1hSRldIUlRiMlowZDJGeVpRQkJaRzlpWlNCSmJXRm5aVkpsWVdSNWNjbGxQQUFBQXRSSlJFRlVlTnFrVmMxdTAwQVFIcStkT0QrMHBvSVFma0lqYWxXMFNFR3FSTXVSbkhvczNEandBSDBBcmx5UWVBTk9PU01lQUE1Vmp5QnhLQlFoZ1NwVlVLS1FOR2xvRmR3NGNXdzJqdGZNT25hNkpPVUFyRFRhelhpL2IzZG01NXNvY1BxUWhGa2ErK2FIQnNJOEdzb3BSSkVSTkZsWTg4RkNFazlZaXdmOFJoZ1J5YUhGUXBQSENEbVpHNW9YMnVpMnlpbGtjVFQxQWNEc2JZQzFOTUF5T2k3elRYMkFneDdBOWx1QWw4OEJhdWlpUS9jSmFaUWZJcEFsbmdEY3ZaWk1ybDh2RlBLNStYa3RyV2x4My9laFo1cjkrdDZlK1dWbnAxcHhuTklqZ0JlNC82ZEF5c1FjOGRzbUh3UGNXOUMwaDNmVzFoYW5zMWx0d0poeTBHeEs3WFpiVWxNcDVXdzJleWFuNitmdC9mMkZBcVhHSzRDdlFrNUh1ZUZ6N0Q2R09adElySytzcnVwZHgxR1JCQnFOQnR6YzJBaU1yN25QcGxSZEtoYjFxNnE2empGaHJrbEVGT1V1dG9RNTB4Y1g4NlpscWFacFFyZmJCZHUyUjYvRzE5elg2WFNnaDZSWDV1YnlIQ004bnFTSUQ2SUNyR2laakdZWXhvakVzaXc0UER3TVNMNVZLc0M4WWY0VlJZRnpNek1heHdqbEpTbEN5QVE5bDBDVzQ0UEJBRHpYaGU3eE1kaTlIdFRyZFlqRllrRFFMMGNuNFhkcTIvRUFFK0luQ252QURUZjJlYWg0U3g5dkV4UWprcVhUNmFBRVJJQ01ld2QvVUFwL0llWUFOTTJqb3h0K3E1VkkraWVxMmkwV2czbDZETnpId1RFUlBnbzFrbzdYQlhqM3ZkbHNUMkYrVXVoSWhZa3A3dTdDYXJrY3JGT0N0UjNINUppd2JBSWVJbWpUL1lRS0tCdEdqUkZDVTVJVWdGUmU3ZkY0Y0NOVklQTVlvM1ZLcXh3anlOQVhOZXB1b3B5cW5sZDYwMnFWc2ZScEVra3orR0ZMMXdQajZ5U1hCcEp0V1ZhNXhsaHBjeWhCTndwWkhtdFg4QUdnZklFeG8wWnB6a1dWVEJHaVhDU0VhSGg2Mi9Qb1IwcC92SGFjenhYR25qNGJTbytHNzhsRUxVODBoMXVvZ0J3V0xmNVlsc1BtZ0RFZDRNMjM2eGptKzhubTRJdUUvOXUrL1BIMkpYWmZid3o0encxV2JPK1NRUHBYZndHL0JCZ0FoQ05aaVNiL3BPUUFBQUFBU1VWT1JLNUNZSUk9KVwifSxzdWNjZXNzOntjb2xvcjpcIiM0Njg4NDdcIixcImJhY2tncm91bmQtY29sb3JcIjpcIiNERkYwRDhcIixcImJvcmRlci1jb2xvclwiOlwiI0Q2RTlDNlwiLFwiYmFja2dyb3VuZC1pbWFnZVwiOlwidXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQlFBQUFBVUNBWUFBQUNOaVIwTkFBQUFHWFJGV0hSVGIyWjBkMkZ5WlFCQlpHOWlaU0JKYldGblpWSmxZV1I1Y2NsbFBBQUFBdXRKUkVGVWVOcTBsY3RQRTBFY3gzOHp1L1JGUzFFcnlxdGdKRkEwOFlDaU1aSUFRUTRlUkc4ZURHZFBKaVllVEl3SFRmd1BpQWN2WEl3WEx3b1hQYUR4a1dnUTZpc2xLbEpMU1FXTFVyYVBMVHY3R21lMzJ6b0Y5S1NUZkxPN3Y1M3ZaM2QvTTcvZkl0aCtJTzZJTnQyampvQTdiakhDSm9BbHpDUnc1OVl3SFlqQm5mTVBxQUtXUVlLakdrZkNKcUFGMHh3WmppcFF0QTNNeGVTRzg3VmhPT1llZ1ZyVUN5N1VaTTlTNlRMSWRBYW15U1RjbFpkWWhGaFJIbG9HWWc3bWdadjFaenp0dmd1ZDdWMXRiUTJ0d1lBMzRMSm1GNHA1ZFhGMUtUdWZuRStTeGVKdHVDWk5zTERDUVUwK1J5S1RGMjdVbncxMDFsOGU2aG5zM3UwUEJhbE9SVlZWa2NhRUtCSkRnVjMrY0dNNHRLS21JK29obElHbnlnS1gwMHJTQmZzenovbjJ1WHY4MXdkNitydDFvcnNaQ0hSZHIxSW1rMkYyS29iM2h1dFN4Vzh0aHNkOEFYTmFsbjlEN0NUZkE2TyswVWdrTXV3VnZFRkZVYmJBY3JrY1RBOCtBdE9rOEU2S2lRaURtTUZTRHFaSXRBekVWUXZpUmtkRGRhRmdQcDhIU1pLQUVBTDVRaDdTcTJsSUpCSnd2MnNjVXFrVW5Lb1pnTmhjREtoS2c1YUgrMUlrY291Q0FkRkdBUXN1V1pZaE9qd0ZIUTk2b2FnV2dSb1VvdjFUOWtSQkVPREF3eE0yUXRFVWwrV3ArTG45VlJvNkJjTXc0RXJIUllqSDQvQjI2QWxRb1FRVFJkSFd3Y2Q5QUg1NytVQVhkZHZERDM3RG1yQkJWMzRXZnFpWFBsNjFnK3ZyNnhBOXpzR2VNOWdPZHNOWGtncEV0VHdWdndPa2xYTEttNisvcDVlendrNEIrajZkcm9CczJDc0dhL2dOczZSSXhhemw0VGMyNW1wVGd3L2FwUFIxTFlsTlJGQXpnc094a3lYWUxJTTFWOE5Nd3lBa0pTY3REMWVHVktpcTV3V2pTUGRqbWVUa2lLdlZXNGYyWVBIV2wzR0FWcTZ5bWN5Q1Rnb3ZNM0Z6eVJpRGUyVGFLY0VLc0xwSnZOSGpaZ1BOcUV0eWk2bVpJbTRTUkZ5TE1Vc09OU1Nka1BlRnRZMW4wbWN6b1kzQkhUTGh3UFJ5OS9semN6aUN3OUFDSSt5cWwwVkx6Y0dBWmJZU001Q0NTWmcxLzlvYy9ubjcraThOOXAvOEFuNEpNQUR4aEgreEhmdWlLd0FBQUFCSlJVNUVya0pnZ2c9PSlcIn0saW5mbzp7Y29sb3I6XCIjM0E4N0FEXCIsXCJiYWNrZ3JvdW5kLWNvbG9yXCI6XCIjRDlFREY3XCIsXCJib3JkZXItY29sb3JcIjpcIiNCQ0U4RjFcIixcImJhY2tncm91bmQtaW1hZ2VcIjpcInVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJRQUFBQVVDQVlBQUFDTmlSME5BQUFBQm1KTFIwUUEvd0QvQVArZ3ZhZVRBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBQUIzUkpUVVVIM1FZRkFoa1NzZGVzL1FBQUE4ZEpSRUZVT012VmxHdE1XMlVZeC8vUE9hV0hYZzZsTGFXMHlwQXR3MVVDZ2JuaU5PTGNWT0xtQWpIWm9sT1lseG1UR1hWWmRBblJmWFFtKzdTb1U0bVhhT2FpWnNFcEM5RmtpUXM2WjZiZENuTllydU02S05CdzZZV2V3emw5eitzSEltRVd2K3Z6N1htVDk1Zi8rMy8rN3dQODE0ditlZkRPVjMvU29YM2xIQUErNk9EZVVGZk1mak9XTUFEZ2RrK2VFS3owcEY3YVFkTUFjT0tMTGpyY1ZNVlgzeGRXTjI5L0doWVA3U3ZuUDBjV2ZTOGNhU2tmSFpzUEU5RmdudDAySk51dFEwUVlIQjJkRHo5L3BLWDhRamp1Tzl4VXhkLzY2SGR4VGVDSFozcm9qUU9iR1FCY3VOamZwbGtEM2IxOVkvNk1yaW1TYUtnU01tcEdVNVdldm1FL3N3YTZPeTczdFFIQTBSZHIyTW12LzZBMW45dzlzdVE3MDk3WjlsTTRGbFRnVERyelpUdTRTdFhWZnBpSTQ4clZjVURNNWNtRWtzckZuSHhmcFR0VS8zQkZRekNRRi8yYllWb05iSDd6bUl0YlNvTWo0MEpTem1NeVg1cUR2cmlBN1FkcklJcEErM2Nkc01wdTBuWEk4Y1YwTXRLWENQWmV2K2dDRU0xUzJOSFB2V2ZQL2hMKzdGU3IzKzBwNVJCRXloRU41SkNLWXI4WG5BU01UMHhCTnl6UUdRZUk4ZmpzR0QzOVJNUGs3c2UyYmQ1WnRUeW9GWVhmdEY2eTM3Z3g3TmVVdEpKT1RGbEFIRFpMRHVJTFUzajMrSDVvT3JEM3lXYkl6dHVnYUF6Z25CS0p1QkxwR2ZRclM4d080RlpnVitjMUl4YUxnV1ZVMHRNTEVFVENvczR4TXpFSXY5Y0pYUWN5YWdJd2lnREd3SmdPQXRIQXdBaGlzUVVqeTBPUkdFUmlFTGdHNGlha2t6bzRNWUF4Y001aEFNaTFXV0cxeVlDSkljTVVhQmtWUkxkR2VTVTI5OTVUTFd6Y1VBek9OSjdKNkZCVkJZSWdnTXptRmJ2ZEJWNDRDb3JnOHZqaHpDK0VKRWw4VTFrSnRnWXJoQ3pnYy92dlR3WEtTaWIxcGFSRlZSVk9SREFKQXN3NUZ1VGFKRWhXTTJTSEIzbU9BbGhrTnh3dUx6ZUpzR3dxV3pmNVRGTmRLZ3RZNXFIcDZaRmY2N1kvc0FWYWRDYVZZNVlBQ0REYjNPaTROSWpMbldNdzJRdGhDQklzVmhzVVRVOXR2WHNqZXE5K1gxZDc1L0tFczRMTk9mY2RmLytIdGhNbnZ3eE9EMHdtSGFYcjdaSXRuMnd1SDJTbkJ6YlpBYlBKd3BQeCtWUXV6Y203ZGdSQ0I1N2ExdUJ6VURSTDRiZm5JMFJFMGVhWGQ5Vzg5bXBqcUhablVJNUhoMmwyZGtaWlVoT3FwaTJxU21wT21aNjRUdXU5cWx6L1NFWG82TUVIYTN3T2lwNDZGMW43NjMzZWVrVjhkczhXeGpuMzdXbDYzVlZhK2VqNW9lRVovODJaQkVUSmpwSjFSYmlqMkQzWi8xdHJYVXZMc2JsQ0swWGZPeDBTWDJrTXNuOWRYK2QrN0tmNmg4bzRBSXlrdWZmalQ4TDIwTFUrdzRBWmQ1VnZFUFkrWHBXcUxWMzI3SFI3RHpYdURuRDhyK292a0JlaEo4aSt5OFlBQUFBQVNVVk9SSzVDWUlJPSlcIn0sd2Fybjp7Y29sb3I6XCIjQzA5ODUzXCIsXCJiYWNrZ3JvdW5kLWNvbG9yXCI6XCIjRkNGOEUzXCIsXCJib3JkZXItY29sb3JcIjpcIiNGQkVFRDVcIixcImJhY2tncm91bmQtaW1hZ2VcIjpcInVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJRQUFBQVVDQU1BQUFDNlYrMC9BQUFCSmxCTVZFWHI2ZWIvMm9EL3dpNy94anIvMG1QL3lrZi90UUQvdkJqLzNvNy91US8vdnlML3R3ZWJoZ0QvNHB6WDFLM3o4ZTM0OXZLNnRIQ2lsQ1diaVF5bW4wakd3b3JyNmRYUXphM0h4Y0trbjF2V3ZWLzV1UmZrNGRYWjFiRDE4Ky81MlllYmlBbXlyNVM5bWhDenJXcTV0NnVmalJINTRhTHMwb1MrcUQ3NTFYcVBoQXliaHdYc3VqRzNzbStaazBQVHdHNlNoZytQaGhPYmh3T1BnUUw0elYybmx5cmYyN3VMZmdDUGhSSHU3T21MZ0FhZmt5aVdrRDNsNDlpYmlBZlRzMEMrbGdDbml3RDRzZ0RKeHFPaWx6RFdvd1dGZkFIMDh1ZWJpZzZxcEZIQnZIL2F3MjZGZlFUUXpzdnk4T3lFZnoyMHIzakF2YUtiaGdHOXEwbmMyTGJaeFhhbm9VdS91NVdTZ2dDdHAxYW5wSktkbUZ6L3psWC8xbkdKaVltdXE1RHg3K3NBQUFEb1BVWlNBQUFBQVhSU1RsTUFRT2JZWmdBQUFBRmlTMGRFQUlnRkhVZ0FBQUFKY0VoWmN3QUFDeE1BQUFzVEFRQ2FuQmdBQUFBSGRFbE5SUWZkQmdVQkdoaDRhYWg1QUFBQWxrbEVRVlFZMDJOZ29CSUlFOEVVY3duMUZrSVhNMVRqNWREVVFoUFU1MDJNaTdYWFF4R3o1dVZJakdPSlVVVVc4MUhuWUV5TWkySFZjVU9JQ1Faek1NWW14ckV5TXlsSndnVXQ1QmxqV1JMam1KbTRwSTFoWXA1U1FMR1l4RGdtTG5aT1Z4dW9vQ2xJREtnWEtNYk41Z2dWMUFDTEpjYUJ4Tmdjb2lHQ0JpWndkV3hPRVRCRHJUeUVGZXkwallKNGVIak1HV2dFQUlwUkZSQ1V0MDhxQUFBQUFFbEZUa1N1UW1DQylcIn19fSksZShmdW5jdGlvbigpe2coaC5jc3MpLmF0dHIoXCJpZFwiLFwiY29yZS1ub3RpZnlcIiksZShkb2N1bWVudCkub24oXCJjbGlja1wiLFwiLlwiK3IrXCItaGlkYWJsZVwiLGZ1bmN0aW9uKHQpe2UodGhpcykudHJpZ2dlcihcIm5vdGlmeS1oaWRlXCIpfSksZShkb2N1bWVudCkub24oXCJub3RpZnktaGlkZVwiLFwiLlwiK3IrXCItd3JhcHBlclwiLGZ1bmN0aW9uKHQpe3ZhciBuPWUodGhpcykuZGF0YShyKTtuJiZuLnNob3coITEpfSl9KX0pIiwiLyogUHJpc21KUyAxLjI5LjBcbmh0dHBzOi8vcHJpc21qcy5jb20vZG93bmxvYWQuaHRtbCN0aGVtZXM9cHJpc20mbGFuZ3VhZ2VzPW1hcmt1cCtjc3MrY2xpa2UramF2YXNjcmlwdCAqL1xudmFyIF9zZWxmPVwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/d2luZG93OlwidW5kZWZpbmVkXCIhPXR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSYmc2VsZiBpbnN0YW5jZW9mIFdvcmtlckdsb2JhbFNjb3BlP3NlbGY6e30sUHJpc209ZnVuY3Rpb24oZSl7dmFyIG49Lyg/Ol58XFxzKWxhbmcoPzp1YWdlKT8tKFtcXHctXSspKD89XFxzfCQpL2ksdD0wLHI9e30sYT17bWFudWFsOmUuUHJpc20mJmUuUHJpc20ubWFudWFsLGRpc2FibGVXb3JrZXJNZXNzYWdlSGFuZGxlcjplLlByaXNtJiZlLlByaXNtLmRpc2FibGVXb3JrZXJNZXNzYWdlSGFuZGxlcix1dGlsOntlbmNvZGU6ZnVuY3Rpb24gZShuKXtyZXR1cm4gbiBpbnN0YW5jZW9mIGk/bmV3IGkobi50eXBlLGUobi5jb250ZW50KSxuLmFsaWFzKTpBcnJheS5pc0FycmF5KG4pP24ubWFwKGUpOm4ucmVwbGFjZSgvJi9nLFwiJmFtcDtcIikucmVwbGFjZSgvPC9nLFwiJmx0O1wiKS5yZXBsYWNlKC9cXHUwMGEwL2csXCIgXCIpfSx0eXBlOmZ1bmN0aW9uKGUpe3JldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZSkuc2xpY2UoOCwtMSl9LG9iaklkOmZ1bmN0aW9uKGUpe3JldHVybiBlLl9faWR8fE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLFwiX19pZFwiLHt2YWx1ZTorK3R9KSxlLl9faWR9LGNsb25lOmZ1bmN0aW9uIGUobix0KXt2YXIgcixpO3N3aXRjaCh0PXR8fHt9LGEudXRpbC50eXBlKG4pKXtjYXNlXCJPYmplY3RcIjppZihpPWEudXRpbC5vYmpJZChuKSx0W2ldKXJldHVybiB0W2ldO2Zvcih2YXIgbCBpbiByPXt9LHRbaV09cixuKW4uaGFzT3duUHJvcGVydHkobCkmJihyW2xdPWUobltsXSx0KSk7cmV0dXJuIHI7Y2FzZVwiQXJyYXlcIjpyZXR1cm4gaT1hLnV0aWwub2JqSWQobiksdFtpXT90W2ldOihyPVtdLHRbaV09cixuLmZvckVhY2goKGZ1bmN0aW9uKG4sYSl7clthXT1lKG4sdCl9KSkscik7ZGVmYXVsdDpyZXR1cm4gbn19LGdldExhbmd1YWdlOmZ1bmN0aW9uKGUpe2Zvcig7ZTspe3ZhciB0PW4uZXhlYyhlLmNsYXNzTmFtZSk7aWYodClyZXR1cm4gdFsxXS50b0xvd2VyQ2FzZSgpO2U9ZS5wYXJlbnRFbGVtZW50fXJldHVyblwibm9uZVwifSxzZXRMYW5ndWFnZTpmdW5jdGlvbihlLHQpe2UuY2xhc3NOYW1lPWUuY2xhc3NOYW1lLnJlcGxhY2UoUmVnRXhwKG4sXCJnaVwiKSxcIlwiKSxlLmNsYXNzTGlzdC5hZGQoXCJsYW5ndWFnZS1cIit0KX0sY3VycmVudFNjcmlwdDpmdW5jdGlvbigpe2lmKFwidW5kZWZpbmVkXCI9PXR5cGVvZiBkb2N1bWVudClyZXR1cm4gbnVsbDtpZihcImN1cnJlbnRTY3JpcHRcImluIGRvY3VtZW50KXJldHVybiBkb2N1bWVudC5jdXJyZW50U2NyaXB0O3RyeXt0aHJvdyBuZXcgRXJyb3J9Y2F0Y2gocil7dmFyIGU9KC9hdCBbXihcXHJcXG5dKlxcKCguKik6W146XSs6W146XStcXCkkL2kuZXhlYyhyLnN0YWNrKXx8W10pWzFdO2lmKGUpe3ZhciBuPWRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic2NyaXB0XCIpO2Zvcih2YXIgdCBpbiBuKWlmKG5bdF0uc3JjPT1lKXJldHVybiBuW3RdfXJldHVybiBudWxsfX0saXNBY3RpdmU6ZnVuY3Rpb24oZSxuLHQpe2Zvcih2YXIgcj1cIm5vLVwiK247ZTspe3ZhciBhPWUuY2xhc3NMaXN0O2lmKGEuY29udGFpbnMobikpcmV0dXJuITA7aWYoYS5jb250YWlucyhyKSlyZXR1cm4hMTtlPWUucGFyZW50RWxlbWVudH1yZXR1cm4hIXR9fSxsYW5ndWFnZXM6e3BsYWluOnIscGxhaW50ZXh0OnIsdGV4dDpyLHR4dDpyLGV4dGVuZDpmdW5jdGlvbihlLG4pe3ZhciB0PWEudXRpbC5jbG9uZShhLmxhbmd1YWdlc1tlXSk7Zm9yKHZhciByIGluIG4pdFtyXT1uW3JdO3JldHVybiB0fSxpbnNlcnRCZWZvcmU6ZnVuY3Rpb24oZSxuLHQscil7dmFyIGk9KHI9cnx8YS5sYW5ndWFnZXMpW2VdLGw9e307Zm9yKHZhciBvIGluIGkpaWYoaS5oYXNPd25Qcm9wZXJ0eShvKSl7aWYobz09bilmb3IodmFyIHMgaW4gdCl0Lmhhc093blByb3BlcnR5KHMpJiYobFtzXT10W3NdKTt0Lmhhc093blByb3BlcnR5KG8pfHwobFtvXT1pW29dKX12YXIgdT1yW2VdO3JldHVybiByW2VdPWwsYS5sYW5ndWFnZXMuREZTKGEubGFuZ3VhZ2VzLChmdW5jdGlvbihuLHQpe3Q9PT11JiZuIT1lJiYodGhpc1tuXT1sKX0pKSxsfSxERlM6ZnVuY3Rpb24gZShuLHQscixpKXtpPWl8fHt9O3ZhciBsPWEudXRpbC5vYmpJZDtmb3IodmFyIG8gaW4gbilpZihuLmhhc093blByb3BlcnR5KG8pKXt0LmNhbGwobixvLG5bb10scnx8byk7dmFyIHM9bltvXSx1PWEudXRpbC50eXBlKHMpO1wiT2JqZWN0XCIhPT11fHxpW2wocyldP1wiQXJyYXlcIiE9PXV8fGlbbChzKV18fChpW2wocyldPSEwLGUocyx0LG8saSkpOihpW2wocyldPSEwLGUocyx0LG51bGwsaSkpfX19LHBsdWdpbnM6e30saGlnaGxpZ2h0QWxsOmZ1bmN0aW9uKGUsbil7YS5oaWdobGlnaHRBbGxVbmRlcihkb2N1bWVudCxlLG4pfSxoaWdobGlnaHRBbGxVbmRlcjpmdW5jdGlvbihlLG4sdCl7dmFyIHI9e2NhbGxiYWNrOnQsY29udGFpbmVyOmUsc2VsZWN0b3I6J2NvZGVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdLCBbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdIGNvZGUsIGNvZGVbY2xhc3MqPVwibGFuZy1cIl0sIFtjbGFzcyo9XCJsYW5nLVwiXSBjb2RlJ307YS5ob29rcy5ydW4oXCJiZWZvcmUtaGlnaGxpZ2h0YWxsXCIsciksci5lbGVtZW50cz1BcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoci5jb250YWluZXIucXVlcnlTZWxlY3RvckFsbChyLnNlbGVjdG9yKSksYS5ob29rcy5ydW4oXCJiZWZvcmUtYWxsLWVsZW1lbnRzLWhpZ2hsaWdodFwiLHIpO2Zvcih2YXIgaSxsPTA7aT1yLmVsZW1lbnRzW2wrK107KWEuaGlnaGxpZ2h0RWxlbWVudChpLCEwPT09bixyLmNhbGxiYWNrKX0saGlnaGxpZ2h0RWxlbWVudDpmdW5jdGlvbihuLHQscil7dmFyIGk9YS51dGlsLmdldExhbmd1YWdlKG4pLGw9YS5sYW5ndWFnZXNbaV07YS51dGlsLnNldExhbmd1YWdlKG4saSk7dmFyIG89bi5wYXJlbnRFbGVtZW50O28mJlwicHJlXCI9PT1vLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkmJmEudXRpbC5zZXRMYW5ndWFnZShvLGkpO3ZhciBzPXtlbGVtZW50Om4sbGFuZ3VhZ2U6aSxncmFtbWFyOmwsY29kZTpuLnRleHRDb250ZW50fTtmdW5jdGlvbiB1KGUpe3MuaGlnaGxpZ2h0ZWRDb2RlPWUsYS5ob29rcy5ydW4oXCJiZWZvcmUtaW5zZXJ0XCIscykscy5lbGVtZW50LmlubmVySFRNTD1zLmhpZ2hsaWdodGVkQ29kZSxhLmhvb2tzLnJ1bihcImFmdGVyLWhpZ2hsaWdodFwiLHMpLGEuaG9va3MucnVuKFwiY29tcGxldGVcIixzKSxyJiZyLmNhbGwocy5lbGVtZW50KX1pZihhLmhvb2tzLnJ1bihcImJlZm9yZS1zYW5pdHktY2hlY2tcIixzKSwobz1zLmVsZW1lbnQucGFyZW50RWxlbWVudCkmJlwicHJlXCI9PT1vLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkmJiFvLmhhc0F0dHJpYnV0ZShcInRhYmluZGV4XCIpJiZvLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsXCIwXCIpLCFzLmNvZGUpcmV0dXJuIGEuaG9va3MucnVuKFwiY29tcGxldGVcIixzKSx2b2lkKHImJnIuY2FsbChzLmVsZW1lbnQpKTtpZihhLmhvb2tzLnJ1bihcImJlZm9yZS1oaWdobGlnaHRcIixzKSxzLmdyYW1tYXIpaWYodCYmZS5Xb3JrZXIpe3ZhciBjPW5ldyBXb3JrZXIoYS5maWxlbmFtZSk7Yy5vbm1lc3NhZ2U9ZnVuY3Rpb24oZSl7dShlLmRhdGEpfSxjLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHtsYW5ndWFnZTpzLmxhbmd1YWdlLGNvZGU6cy5jb2RlLGltbWVkaWF0ZUNsb3NlOiEwfSkpfWVsc2UgdShhLmhpZ2hsaWdodChzLmNvZGUscy5ncmFtbWFyLHMubGFuZ3VhZ2UpKTtlbHNlIHUoYS51dGlsLmVuY29kZShzLmNvZGUpKX0saGlnaGxpZ2h0OmZ1bmN0aW9uKGUsbix0KXt2YXIgcj17Y29kZTplLGdyYW1tYXI6bixsYW5ndWFnZTp0fTtpZihhLmhvb2tzLnJ1bihcImJlZm9yZS10b2tlbml6ZVwiLHIpLCFyLmdyYW1tYXIpdGhyb3cgbmV3IEVycm9yKCdUaGUgbGFuZ3VhZ2UgXCInK3IubGFuZ3VhZ2UrJ1wiIGhhcyBubyBncmFtbWFyLicpO3JldHVybiByLnRva2Vucz1hLnRva2VuaXplKHIuY29kZSxyLmdyYW1tYXIpLGEuaG9va3MucnVuKFwiYWZ0ZXItdG9rZW5pemVcIixyKSxpLnN0cmluZ2lmeShhLnV0aWwuZW5jb2RlKHIudG9rZW5zKSxyLmxhbmd1YWdlKX0sdG9rZW5pemU6ZnVuY3Rpb24oZSxuKXt2YXIgdD1uLnJlc3Q7aWYodCl7Zm9yKHZhciByIGluIHQpbltyXT10W3JdO2RlbGV0ZSBuLnJlc3R9dmFyIGE9bmV3IHM7cmV0dXJuIHUoYSxhLmhlYWQsZSksbyhlLGEsbixhLmhlYWQsMCksZnVuY3Rpb24oZSl7Zm9yKHZhciBuPVtdLHQ9ZS5oZWFkLm5leHQ7dCE9PWUudGFpbDspbi5wdXNoKHQudmFsdWUpLHQ9dC5uZXh0O3JldHVybiBufShhKX0saG9va3M6e2FsbDp7fSxhZGQ6ZnVuY3Rpb24oZSxuKXt2YXIgdD1hLmhvb2tzLmFsbDt0W2VdPXRbZV18fFtdLHRbZV0ucHVzaChuKX0scnVuOmZ1bmN0aW9uKGUsbil7dmFyIHQ9YS5ob29rcy5hbGxbZV07aWYodCYmdC5sZW5ndGgpZm9yKHZhciByLGk9MDtyPXRbaSsrXTspcihuKX19LFRva2VuOml9O2Z1bmN0aW9uIGkoZSxuLHQscil7dGhpcy50eXBlPWUsdGhpcy5jb250ZW50PW4sdGhpcy5hbGlhcz10LHRoaXMubGVuZ3RoPTB8KHJ8fFwiXCIpLmxlbmd0aH1mdW5jdGlvbiBsKGUsbix0LHIpe2UubGFzdEluZGV4PW47dmFyIGE9ZS5leGVjKHQpO2lmKGEmJnImJmFbMV0pe3ZhciBpPWFbMV0ubGVuZ3RoO2EuaW5kZXgrPWksYVswXT1hWzBdLnNsaWNlKGkpfXJldHVybiBhfWZ1bmN0aW9uIG8oZSxuLHQscixzLGcpe2Zvcih2YXIgZiBpbiB0KWlmKHQuaGFzT3duUHJvcGVydHkoZikmJnRbZl0pe3ZhciBoPXRbZl07aD1BcnJheS5pc0FycmF5KGgpP2g6W2hdO2Zvcih2YXIgZD0wO2Q8aC5sZW5ndGg7KytkKXtpZihnJiZnLmNhdXNlPT1mK1wiLFwiK2QpcmV0dXJuO3ZhciB2PWhbZF0scD12Lmluc2lkZSxtPSEhdi5sb29rYmVoaW5kLHk9ISF2LmdyZWVkeSxrPXYuYWxpYXM7aWYoeSYmIXYucGF0dGVybi5nbG9iYWwpe3ZhciB4PXYucGF0dGVybi50b1N0cmluZygpLm1hdGNoKC9baW1zdXldKiQvKVswXTt2LnBhdHRlcm49UmVnRXhwKHYucGF0dGVybi5zb3VyY2UseCtcImdcIil9Zm9yKHZhciBiPXYucGF0dGVybnx8dix3PXIubmV4dCxBPXM7dyE9PW4udGFpbCYmIShnJiZBPj1nLnJlYWNoKTtBKz13LnZhbHVlLmxlbmd0aCx3PXcubmV4dCl7dmFyIEU9dy52YWx1ZTtpZihuLmxlbmd0aD5lLmxlbmd0aClyZXR1cm47aWYoIShFIGluc3RhbmNlb2YgaSkpe3ZhciBQLEw9MTtpZih5KXtpZighKFA9bChiLEEsZSxtKSl8fFAuaW5kZXg+PWUubGVuZ3RoKWJyZWFrO3ZhciBTPVAuaW5kZXgsTz1QLmluZGV4K1BbMF0ubGVuZ3RoLGo9QTtmb3Ioais9dy52YWx1ZS5sZW5ndGg7Uz49ajspais9KHc9dy5uZXh0KS52YWx1ZS5sZW5ndGg7aWYoQT1qLT13LnZhbHVlLmxlbmd0aCx3LnZhbHVlIGluc3RhbmNlb2YgaSljb250aW51ZTtmb3IodmFyIEM9dztDIT09bi50YWlsJiYoajxPfHxcInN0cmluZ1wiPT10eXBlb2YgQy52YWx1ZSk7Qz1DLm5leHQpTCsrLGorPUMudmFsdWUubGVuZ3RoO0wtLSxFPWUuc2xpY2UoQSxqKSxQLmluZGV4LT1BfWVsc2UgaWYoIShQPWwoYiwwLEUsbSkpKWNvbnRpbnVlO1M9UC5pbmRleDt2YXIgTj1QWzBdLF89RS5zbGljZSgwLFMpLE09RS5zbGljZShTK04ubGVuZ3RoKSxXPUErRS5sZW5ndGg7ZyYmVz5nLnJlYWNoJiYoZy5yZWFjaD1XKTt2YXIgej13LnByZXY7aWYoXyYmKHo9dShuLHosXyksQSs9Xy5sZW5ndGgpLGMobix6LEwpLHc9dShuLHosbmV3IGkoZixwP2EudG9rZW5pemUoTixwKTpOLGssTikpLE0mJnUobix3LE0pLEw+MSl7dmFyIEk9e2NhdXNlOmYrXCIsXCIrZCxyZWFjaDpXfTtvKGUsbix0LHcucHJldixBLEkpLGcmJkkucmVhY2g+Zy5yZWFjaCYmKGcucmVhY2g9SS5yZWFjaCl9fX19fX1mdW5jdGlvbiBzKCl7dmFyIGU9e3ZhbHVlOm51bGwscHJldjpudWxsLG5leHQ6bnVsbH0sbj17dmFsdWU6bnVsbCxwcmV2OmUsbmV4dDpudWxsfTtlLm5leHQ9bix0aGlzLmhlYWQ9ZSx0aGlzLnRhaWw9bix0aGlzLmxlbmd0aD0wfWZ1bmN0aW9uIHUoZSxuLHQpe3ZhciByPW4ubmV4dCxhPXt2YWx1ZTp0LHByZXY6bixuZXh0OnJ9O3JldHVybiBuLm5leHQ9YSxyLnByZXY9YSxlLmxlbmd0aCsrLGF9ZnVuY3Rpb24gYyhlLG4sdCl7Zm9yKHZhciByPW4ubmV4dCxhPTA7YTx0JiZyIT09ZS50YWlsO2ErKylyPXIubmV4dDtuLm5leHQ9cixyLnByZXY9bixlLmxlbmd0aC09YX1pZihlLlByaXNtPWEsaS5zdHJpbmdpZnk9ZnVuY3Rpb24gZShuLHQpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiBuKXJldHVybiBuO2lmKEFycmF5LmlzQXJyYXkobikpe3ZhciByPVwiXCI7cmV0dXJuIG4uZm9yRWFjaCgoZnVuY3Rpb24obil7cis9ZShuLHQpfSkpLHJ9dmFyIGk9e3R5cGU6bi50eXBlLGNvbnRlbnQ6ZShuLmNvbnRlbnQsdCksdGFnOlwic3BhblwiLGNsYXNzZXM6W1widG9rZW5cIixuLnR5cGVdLGF0dHJpYnV0ZXM6e30sbGFuZ3VhZ2U6dH0sbD1uLmFsaWFzO2wmJihBcnJheS5pc0FycmF5KGwpP0FycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGkuY2xhc3NlcyxsKTppLmNsYXNzZXMucHVzaChsKSksYS5ob29rcy5ydW4oXCJ3cmFwXCIsaSk7dmFyIG89XCJcIjtmb3IodmFyIHMgaW4gaS5hdHRyaWJ1dGVzKW8rPVwiIFwiK3MrJz1cIicrKGkuYXR0cmlidXRlc1tzXXx8XCJcIikucmVwbGFjZSgvXCIvZyxcIiZxdW90O1wiKSsnXCInO3JldHVyblwiPFwiK2kudGFnKycgY2xhc3M9XCInK2kuY2xhc3Nlcy5qb2luKFwiIFwiKSsnXCInK28rXCI+XCIraS5jb250ZW50K1wiPC9cIitpLnRhZytcIj5cIn0sIWUuZG9jdW1lbnQpcmV0dXJuIGUuYWRkRXZlbnRMaXN0ZW5lcj8oYS5kaXNhYmxlV29ya2VyTWVzc2FnZUhhbmRsZXJ8fGUuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwoZnVuY3Rpb24obil7dmFyIHQ9SlNPTi5wYXJzZShuLmRhdGEpLHI9dC5sYW5ndWFnZSxpPXQuY29kZSxsPXQuaW1tZWRpYXRlQ2xvc2U7ZS5wb3N0TWVzc2FnZShhLmhpZ2hsaWdodChpLGEubGFuZ3VhZ2VzW3JdLHIpKSxsJiZlLmNsb3NlKCl9KSwhMSksYSk6YTt2YXIgZz1hLnV0aWwuY3VycmVudFNjcmlwdCgpO2Z1bmN0aW9uIGYoKXthLm1hbnVhbHx8YS5oaWdobGlnaHRBbGwoKX1pZihnJiYoYS5maWxlbmFtZT1nLnNyYyxnLmhhc0F0dHJpYnV0ZShcImRhdGEtbWFudWFsXCIpJiYoYS5tYW51YWw9ITApKSwhYS5tYW51YWwpe3ZhciBoPWRvY3VtZW50LnJlYWR5U3RhdGU7XCJsb2FkaW5nXCI9PT1ofHxcImludGVyYWN0aXZlXCI9PT1oJiZnJiZnLmRlZmVyP2RvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsZik6d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZT93aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGYpOndpbmRvdy5zZXRUaW1lb3V0KGYsMTYpfXJldHVybiBhfShfc2VsZik7XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMmJihtb2R1bGUuZXhwb3J0cz1QcmlzbSksXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbCYmKGdsb2JhbC5QcmlzbT1QcmlzbSk7XG5QcmlzbS5sYW5ndWFnZXMubWFya3VwPXtjb21tZW50OntwYXR0ZXJuOi88IS0tKD86KD8hPCEtLSlbXFxzXFxTXSkqPy0tPi8sZ3JlZWR5OiEwfSxwcm9sb2c6e3BhdHRlcm46LzxcXD9bXFxzXFxTXSs/XFw/Pi8sZ3JlZWR5OiEwfSxkb2N0eXBlOntwYXR0ZXJuOi88IURPQ1RZUEUoPzpbXj5cIidbXFxdXXxcIlteXCJdKlwifCdbXiddKicpKyg/OlxcWyg/OltePFwiJ1xcXV18XCJbXlwiXSpcInwnW14nXSonfDwoPyEhLS0pfDwhLS0oPzpbXi1dfC0oPyEtPikpKi0tPikqXFxdXFxzKik/Pi9pLGdyZWVkeTohMCxpbnNpZGU6e1wiaW50ZXJuYWwtc3Vic2V0XCI6e3BhdHRlcm46LyheW15cXFtdKlxcWylbXFxzXFxTXSsoPz1cXF0+JCkvLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwLGluc2lkZTpudWxsfSxzdHJpbmc6e3BhdHRlcm46L1wiW15cIl0qXCJ8J1teJ10qJy8sZ3JlZWR5OiEwfSxwdW5jdHVhdGlvbjovXjwhfD4kfFtbXFxdXS8sXCJkb2N0eXBlLXRhZ1wiOi9eRE9DVFlQRS9pLG5hbWU6L1teXFxzPD4nXCJdKy99fSxjZGF0YTp7cGF0dGVybjovPCFcXFtDREFUQVxcW1tcXHNcXFNdKj9cXF1cXF0+L2ksZ3JlZWR5OiEwfSx0YWc6e3BhdHRlcm46LzxcXC8/KD8hXFxkKVteXFxzPlxcLz0kPCVdKyg/Olxccyg/OlxccypbXlxccz5cXC89XSsoPzpcXHMqPVxccyooPzpcIlteXCJdKlwifCdbXiddKid8W15cXHMnXCI+PV0rKD89W1xccz5dKSl8KD89W1xccy8+XSkpKSspP1xccypcXC8/Pi8sZ3JlZWR5OiEwLGluc2lkZTp7dGFnOntwYXR0ZXJuOi9ePFxcLz9bXlxccz5cXC9dKy8saW5zaWRlOntwdW5jdHVhdGlvbjovXjxcXC8/LyxuYW1lc3BhY2U6L15bXlxccz5cXC86XSs6L319LFwic3BlY2lhbC1hdHRyXCI6W10sXCJhdHRyLXZhbHVlXCI6e3BhdHRlcm46Lz1cXHMqKD86XCJbXlwiXSpcInwnW14nXSonfFteXFxzJ1wiPj1dKykvLGluc2lkZTp7cHVuY3R1YXRpb246W3twYXR0ZXJuOi9ePS8sYWxpYXM6XCJhdHRyLWVxdWFsc1wifSx7cGF0dGVybjovXihcXHMqKVtcIiddfFtcIiddJC8sbG9va2JlaGluZDohMH1dfX0scHVuY3R1YXRpb246L1xcLz8+LyxcImF0dHItbmFtZVwiOntwYXR0ZXJuOi9bXlxccz5cXC9dKy8saW5zaWRlOntuYW1lc3BhY2U6L15bXlxccz5cXC86XSs6L319fX0sZW50aXR5Olt7cGF0dGVybjovJltcXGRhLXpdezEsOH07L2ksYWxpYXM6XCJuYW1lZC1lbnRpdHlcIn0sLyYjeD9bXFxkYS1mXXsxLDh9Oy9pXX0sUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlW1wiYXR0ci12YWx1ZVwiXS5pbnNpZGUuZW50aXR5PVByaXNtLmxhbmd1YWdlcy5tYXJrdXAuZW50aXR5LFByaXNtLmxhbmd1YWdlcy5tYXJrdXAuZG9jdHlwZS5pbnNpZGVbXCJpbnRlcm5hbC1zdWJzZXRcIl0uaW5zaWRlPVByaXNtLmxhbmd1YWdlcy5tYXJrdXAsUHJpc20uaG9va3MuYWRkKFwid3JhcFwiLChmdW5jdGlvbihhKXtcImVudGl0eVwiPT09YS50eXBlJiYoYS5hdHRyaWJ1dGVzLnRpdGxlPWEuY29udGVudC5yZXBsYWNlKC8mYW1wOy8sXCImXCIpKX0pKSxPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcsXCJhZGRJbmxpbmVkXCIse3ZhbHVlOmZ1bmN0aW9uKGEsZSl7dmFyIHM9e307c1tcImxhbmd1YWdlLVwiK2VdPXtwYXR0ZXJuOi8oXjwhXFxbQ0RBVEFcXFspW1xcc1xcU10rPyg/PVxcXVxcXT4kKS9pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOlByaXNtLmxhbmd1YWdlc1tlXX0scy5jZGF0YT0vXjwhXFxbQ0RBVEFcXFt8XFxdXFxdPiQvaTt2YXIgdD17XCJpbmNsdWRlZC1jZGF0YVwiOntwYXR0ZXJuOi88IVxcW0NEQVRBXFxbW1xcc1xcU10qP1xcXVxcXT4vaSxpbnNpZGU6c319O3RbXCJsYW5ndWFnZS1cIitlXT17cGF0dGVybjovW1xcc1xcU10rLyxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzW2VdfTt2YXIgbj17fTtuW2FdPXtwYXR0ZXJuOlJlZ0V4cChcIig8X19bXj5dKj4pKD86PCFcXFxcW0NEQVRBXFxcXFsoPzpbXlxcXFxdXXxcXFxcXSg/IVxcXFxdPikpKlxcXFxdXFxcXF0+fCg/ITwhXFxcXFtDREFUQVxcXFxbKVteXSkqPyg/PTwvX18+KVwiLnJlcGxhY2UoL19fL2csKGZ1bmN0aW9uKCl7cmV0dXJuIGF9KSksXCJpXCIpLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwLGluc2lkZTp0fSxQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwibWFya3VwXCIsXCJjZGF0YVwiLG4pfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZyxcImFkZEF0dHJpYnV0ZVwiLHt2YWx1ZTpmdW5jdGlvbihhLGUpe1ByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVtcInNwZWNpYWwtYXR0clwiXS5wdXNoKHtwYXR0ZXJuOlJlZ0V4cChcIihefFtcXFwiJ1xcXFxzXSkoPzpcIithK1wiKVxcXFxzKj1cXFxccyooPzpcXFwiW15cXFwiXSpcXFwifCdbXiddKid8W15cXFxccydcXFwiPj1dKyg/PVtcXFxccz5dKSlcIixcImlcIiksbG9va2JlaGluZDohMCxpbnNpZGU6e1wiYXR0ci1uYW1lXCI6L15bXlxccz1dKy8sXCJhdHRyLXZhbHVlXCI6e3BhdHRlcm46Lz1bXFxzXFxTXSsvLGluc2lkZTp7dmFsdWU6e3BhdHRlcm46LyhePVxccyooW1wiJ118KD8hW1wiJ10pKSlcXFNbXFxzXFxTXSooPz1cXDIkKS8sbG9va2JlaGluZDohMCxhbGlhczpbZSxcImxhbmd1YWdlLVwiK2VdLGluc2lkZTpQcmlzbS5sYW5ndWFnZXNbZV19LHB1bmN0dWF0aW9uOlt7cGF0dGVybjovXj0vLGFsaWFzOlwiYXR0ci1lcXVhbHNcIn0sL1wifCcvXX19fX0pfX0pLFByaXNtLmxhbmd1YWdlcy5odG1sPVByaXNtLmxhbmd1YWdlcy5tYXJrdXAsUHJpc20ubGFuZ3VhZ2VzLm1hdGhtbD1QcmlzbS5sYW5ndWFnZXMubWFya3VwLFByaXNtLmxhbmd1YWdlcy5zdmc9UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCxQcmlzbS5sYW5ndWFnZXMueG1sPVByaXNtLmxhbmd1YWdlcy5leHRlbmQoXCJtYXJrdXBcIix7fSksUHJpc20ubGFuZ3VhZ2VzLnNzbWw9UHJpc20ubGFuZ3VhZ2VzLnhtbCxQcmlzbS5sYW5ndWFnZXMuYXRvbT1QcmlzbS5sYW5ndWFnZXMueG1sLFByaXNtLmxhbmd1YWdlcy5yc3M9UHJpc20ubGFuZ3VhZ2VzLnhtbDtcbiFmdW5jdGlvbihzKXt2YXIgZT0vKD86XCIoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXxbXlwiXFxcXFxcclxcbl0pKlwifCcoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXxbXidcXFxcXFxyXFxuXSkqJykvO3MubGFuZ3VhZ2VzLmNzcz17Y29tbWVudDovXFwvXFwqW1xcc1xcU10qP1xcKlxcLy8sYXRydWxlOntwYXR0ZXJuOlJlZ0V4cChcIkBbXFxcXHctXSg/OlteO3tcXFxcc1xcXCInXXxcXFxccysoPyFcXFxccyl8XCIrZS5zb3VyY2UrXCIpKj8oPzo7fCg/PVxcXFxzKlxcXFx7KSlcIiksaW5zaWRlOntydWxlOi9eQFtcXHctXSsvLFwic2VsZWN0b3ItZnVuY3Rpb24tYXJndW1lbnRcIjp7cGF0dGVybjovKFxcYnNlbGVjdG9yXFxzKlxcKFxccyooPyFbXFxzKV0pKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKCg/OlteKCldfFxcKFteKCldKlxcKSkqXFwpKSsoPz1cXHMqXFwpKS8sbG9va2JlaGluZDohMCxhbGlhczpcInNlbGVjdG9yXCJ9LGtleXdvcmQ6e3BhdHRlcm46LyhefFteXFx3LV0pKD86YW5kfG5vdHxvbmx5fG9yKSg/IVtcXHctXSkvLGxvb2tiZWhpbmQ6ITB9fX0sdXJsOntwYXR0ZXJuOlJlZ0V4cChcIlxcXFxidXJsXFxcXCgoPzpcIitlLnNvdXJjZStcInwoPzpbXlxcXFxcXFxcXFxyXFxuKClcXFwiJ118XFxcXFxcXFxbXl0pKilcXFxcKVwiLFwiaVwiKSxncmVlZHk6ITAsaW5zaWRlOntmdW5jdGlvbjovXnVybC9pLHB1bmN0dWF0aW9uOi9eXFwofFxcKSQvLHN0cmluZzp7cGF0dGVybjpSZWdFeHAoXCJeXCIrZS5zb3VyY2UrXCIkXCIpLGFsaWFzOlwidXJsXCJ9fX0sc2VsZWN0b3I6e3BhdHRlcm46UmVnRXhwKFwiKF58W3t9XFxcXHNdKVtee31cXFxcc10oPzpbXnt9O1xcXCInXFxcXHNdfFxcXFxzKyg/IVtcXFxcc3tdKXxcIitlLnNvdXJjZStcIikqKD89XFxcXHMqXFxcXHspXCIpLGxvb2tiZWhpbmQ6ITB9LHN0cmluZzp7cGF0dGVybjplLGdyZWVkeTohMH0scHJvcGVydHk6e3BhdHRlcm46LyhefFteLVxcd1xceEEwLVxcdUZGRkZdKSg/IVxccylbLV9hLXpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbLVxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqOikvaSxsb29rYmVoaW5kOiEwfSxpbXBvcnRhbnQ6LyFpbXBvcnRhbnRcXGIvaSxmdW5jdGlvbjp7cGF0dGVybjovKF58W14tYS16MC05XSlbLWEtejAtOV0rKD89XFwoKS9pLGxvb2tiZWhpbmQ6ITB9LHB1bmN0dWF0aW9uOi9bKCl7fTs6LF0vfSxzLmxhbmd1YWdlcy5jc3MuYXRydWxlLmluc2lkZS5yZXN0PXMubGFuZ3VhZ2VzLmNzczt2YXIgdD1zLmxhbmd1YWdlcy5tYXJrdXA7dCYmKHQudGFnLmFkZElubGluZWQoXCJzdHlsZVwiLFwiY3NzXCIpLHQudGFnLmFkZEF0dHJpYnV0ZShcInN0eWxlXCIsXCJjc3NcIikpfShQcmlzbSk7XG5QcmlzbS5sYW5ndWFnZXMuY2xpa2U9e2NvbW1lbnQ6W3twYXR0ZXJuOi8oXnxbXlxcXFxdKVxcL1xcKltcXHNcXFNdKj8oPzpcXCpcXC98JCkvLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwfSx7cGF0dGVybjovKF58W15cXFxcOl0pXFwvXFwvLiovLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwfV0sc3RyaW5nOntwYXR0ZXJuOi8oW1wiJ10pKD86XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8KD8hXFwxKVteXFxcXFxcclxcbl0pKlxcMS8sZ3JlZWR5OiEwfSxcImNsYXNzLW5hbWVcIjp7cGF0dGVybjovKFxcYig/OmNsYXNzfGV4dGVuZHN8aW1wbGVtZW50c3xpbnN0YW5jZW9mfGludGVyZmFjZXxuZXd8dHJhaXQpXFxzK3xcXGJjYXRjaFxccytcXCgpW1xcdy5cXFxcXSsvaSxsb29rYmVoaW5kOiEwLGluc2lkZTp7cHVuY3R1YXRpb246L1suXFxcXF0vfX0sa2V5d29yZDovXFxiKD86YnJlYWt8Y2F0Y2h8Y29udGludWV8ZG98ZWxzZXxmaW5hbGx5fGZvcnxmdW5jdGlvbnxpZnxpbnxpbnN0YW5jZW9mfG5ld3xudWxsfHJldHVybnx0aHJvd3x0cnl8d2hpbGUpXFxiLyxib29sZWFuOi9cXGIoPzpmYWxzZXx0cnVlKVxcYi8sZnVuY3Rpb246L1xcYlxcdysoPz1cXCgpLyxudW1iZXI6L1xcYjB4W1xcZGEtZl0rXFxifCg/OlxcYlxcZCsoPzpcXC5cXGQqKT98XFxCXFwuXFxkKykoPzplWystXT9cXGQrKT8vaSxvcGVyYXRvcjovWzw+XT0/fFshPV09Pz0/fC0tP3xcXCtcXCs/fCYmP3xcXHxcXHw/fFs/Ki9+XiVdLyxwdW5jdHVhdGlvbjovW3t9W1xcXTsoKSwuOl0vfTtcblByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0PVByaXNtLmxhbmd1YWdlcy5leHRlbmQoXCJjbGlrZVwiLHtcImNsYXNzLW5hbWVcIjpbUHJpc20ubGFuZ3VhZ2VzLmNsaWtlW1wiY2xhc3MtbmFtZVwiXSx7cGF0dGVybjovKF58W14kXFx3XFx4QTAtXFx1RkZGRl0pKD8hXFxzKVtfJEEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxcLig/OmNvbnN0cnVjdG9yfHByb3RvdHlwZSkpLyxsb29rYmVoaW5kOiEwfV0sa2V5d29yZDpbe3BhdHRlcm46LygoPzpefFxcfSlcXHMqKWNhdGNoXFxiLyxsb29rYmVoaW5kOiEwfSx7cGF0dGVybjovKF58W14uXXxcXC5cXC5cXC5cXHMqKVxcYig/OmFzfGFzc2VydCg/PVxccypcXHspfGFzeW5jKD89XFxzKig/OmZ1bmN0aW9uXFxifFxcKHxbJFxcd1xceEEwLVxcdUZGRkZdfCQpKXxhd2FpdHxicmVha3xjYXNlfGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlYnVnZ2VyfGRlZmF1bHR8ZGVsZXRlfGRvfGVsc2V8ZW51bXxleHBvcnR8ZXh0ZW5kc3xmaW5hbGx5KD89XFxzKig/Olxce3wkKSl8Zm9yfGZyb20oPz1cXHMqKD86WydcIl18JCkpfGZ1bmN0aW9ufCg/OmdldHxzZXQpKD89XFxzKig/OlsjXFxbJFxcd1xceEEwLVxcdUZGRkZdfCQpKXxpZnxpbXBsZW1lbnRzfGltcG9ydHxpbnxpbnN0YW5jZW9mfGludGVyZmFjZXxsZXR8bmV3fG51bGx8b2Z8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmV0dXJufHN0YXRpY3xzdXBlcnxzd2l0Y2h8dGhpc3x0aHJvd3x0cnl8dHlwZW9mfHVuZGVmaW5lZHx2YXJ8dm9pZHx3aGlsZXx3aXRofHlpZWxkKVxcYi8sbG9va2JlaGluZDohMH1dLGZ1bmN0aW9uOi8jPyg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqKD86XFwuXFxzKig/OmFwcGx5fGJpbmR8Y2FsbClcXHMqKT9cXCgpLyxudW1iZXI6e3BhdHRlcm46UmVnRXhwKFwiKF58W15cXFxcdyRdKSg/Ok5hTnxJbmZpbml0eXwwW2JCXVswMV0rKD86X1swMV0rKSpuP3wwW29PXVswLTddKyg/Ol9bMC03XSspKm4/fDBbeFhdW1xcXFxkQS1GYS1mXSsoPzpfW1xcXFxkQS1GYS1mXSspKm4/fFxcXFxkKyg/Ol9cXFxcZCspKm58KD86XFxcXGQrKD86X1xcXFxkKykqKD86XFxcXC4oPzpcXFxcZCsoPzpfXFxcXGQrKSopPyk/fFxcXFwuXFxcXGQrKD86X1xcXFxkKykqKSg/OltFZV1bKy1dP1xcXFxkKyg/Ol9cXFxcZCspKik/KSg/IVtcXFxcdyRdKVwiKSxsb29rYmVoaW5kOiEwfSxvcGVyYXRvcjovLS18XFwrXFwrfFxcKlxcKj0/fD0+fCYmPT98XFx8XFx8PT98WyE9XT09fDw8PT98Pj4+Pz0/fFstKyovJSZ8XiE9PD5dPT98XFwuezN9fFxcP1xcPz0/fFxcP1xcLj98W346XS99KSxQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdFtcImNsYXNzLW5hbWVcIl1bMF0ucGF0dGVybj0vKFxcYig/OmNsYXNzfGV4dGVuZHN8aW1wbGVtZW50c3xpbnN0YW5jZW9mfGludGVyZmFjZXxuZXcpXFxzKylbXFx3LlxcXFxdKy8sUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImphdmFzY3JpcHRcIixcImtleXdvcmRcIix7cmVnZXg6e3BhdHRlcm46UmVnRXhwKFwiKCg/Ol58W14kXFxcXHdcXFxceEEwLVxcXFx1RkZGRi5cXFwiJ1xcXFxdKVxcXFxzXXxcXFxcYig/OnJldHVybnx5aWVsZCkpXFxcXHMqKS8oPzooPzpcXFxcWyg/OlteXFxcXF1cXFxcXFxcXFxcclxcbl18XFxcXFxcXFwuKSpcXFxcXXxcXFxcXFxcXC58W14vXFxcXFxcXFxcXFxcW1xcclxcbl0pKy9bZGdpbXl1c117MCw3fXwoPzpcXFxcWyg/OlteW1xcXFxdXFxcXFxcXFxcXHJcXG5dfFxcXFxcXFxcLnxcXFxcWyg/OlteW1xcXFxdXFxcXFxcXFxcXHJcXG5dfFxcXFxcXFxcLnxcXFxcWyg/OlteW1xcXFxdXFxcXFxcXFxcXHJcXG5dfFxcXFxcXFxcLikqXFxcXF0pKlxcXFxdKSpcXFxcXXxcXFxcXFxcXC58W14vXFxcXFxcXFxcXFxcW1xcclxcbl0pKy9bZGdpbXl1c117MCw3fXZbZGdpbXl1c117MCw3fSkoPz0oPzpcXFxcc3wvXFxcXCooPzpbXipdfFxcXFwqKD8hLykpKlxcXFwqLykqKD86JHxbXFxyXFxuLC47On0pXFxcXF1dfC8vKSlcIiksbG9va2JlaGluZDohMCxncmVlZHk6ITAsaW5zaWRlOntcInJlZ2V4LXNvdXJjZVwiOntwYXR0ZXJuOi9eKFxcLylbXFxzXFxTXSsoPz1cXC9bYS16XSokKS8sbG9va2JlaGluZDohMCxhbGlhczpcImxhbmd1YWdlLXJlZ2V4XCIsaW5zaWRlOlByaXNtLmxhbmd1YWdlcy5yZWdleH0sXCJyZWdleC1kZWxpbWl0ZXJcIjovXlxcL3xcXC8kLyxcInJlZ2V4LWZsYWdzXCI6L15bYS16XSskL319LFwiZnVuY3Rpb24tdmFyaWFibGVcIjp7cGF0dGVybjovIz8oPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKls9Ol1cXHMqKD86YXN5bmNcXHMqKT8oPzpcXGJmdW5jdGlvblxcYnwoPzpcXCgoPzpbXigpXXxcXChbXigpXSpcXCkpKlxcKXwoPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKVxccyo9PikpLyxhbGlhczpcImZ1bmN0aW9uXCJ9LHBhcmFtZXRlcjpbe3BhdHRlcm46LyhmdW5jdGlvbig/OlxccysoPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKT9cXHMqXFwoXFxzKikoPyFcXHMpKD86W14oKVxcc118XFxzKyg/IVtcXHMpXSl8XFwoW14oKV0qXFwpKSsoPz1cXHMqXFwpKS8sbG9va2JlaGluZDohMCxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHR9LHtwYXR0ZXJuOi8oXnxbXiRcXHdcXHhBMC1cXHVGRkZGXSkoPyFcXHMpW18kYS16XFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKj0+KS9pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOlByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0fSx7cGF0dGVybjovKFxcKFxccyopKD8hXFxzKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKFteKCldKlxcKSkrKD89XFxzKlxcKVxccyo9PikvLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOlByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0fSx7cGF0dGVybjovKCg/OlxcYnxcXHN8XikoPyEoPzphc3xhc3luY3xhd2FpdHxicmVha3xjYXNlfGNhdGNofGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlYnVnZ2VyfGRlZmF1bHR8ZGVsZXRlfGRvfGVsc2V8ZW51bXxleHBvcnR8ZXh0ZW5kc3xmaW5hbGx5fGZvcnxmcm9tfGZ1bmN0aW9ufGdldHxpZnxpbXBsZW1lbnRzfGltcG9ydHxpbnxpbnN0YW5jZW9mfGludGVyZmFjZXxsZXR8bmV3fG51bGx8b2Z8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmV0dXJufHNldHxzdGF0aWN8c3VwZXJ8c3dpdGNofHRoaXN8dGhyb3d8dHJ5fHR5cGVvZnx1bmRlZmluZWR8dmFyfHZvaWR8d2hpbGV8d2l0aHx5aWVsZCkoPyFbJFxcd1xceEEwLVxcdUZGRkZdKSkoPzooPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqXFxzKilcXChcXHMqfFxcXVxccypcXChcXHMqKSg/IVxccykoPzpbXigpXFxzXXxcXHMrKD8hW1xccyldKXxcXChbXigpXSpcXCkpKyg/PVxccypcXClcXHMqXFx7KS8sbG9va2JlaGluZDohMCxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHR9XSxjb25zdGFudDovXFxiW0EtWl0oPzpbQS1aX118XFxkeD8pKlxcYi99KSxQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiamF2YXNjcmlwdFwiLFwic3RyaW5nXCIse2hhc2hiYW5nOntwYXR0ZXJuOi9eIyEuKi8sZ3JlZWR5OiEwLGFsaWFzOlwiY29tbWVudFwifSxcInRlbXBsYXRlLXN0cmluZ1wiOntwYXR0ZXJuOi9gKD86XFxcXFtcXHNcXFNdfFxcJFxceyg/Oltee31dfFxceyg/Oltee31dfFxce1tefV0qXFx9KSpcXH0pK1xcfXwoPyFcXCRcXHspW15cXFxcYF0pKmAvLGdyZWVkeTohMCxpbnNpZGU6e1widGVtcGxhdGUtcHVuY3R1YXRpb25cIjp7cGF0dGVybjovXmB8YCQvLGFsaWFzOlwic3RyaW5nXCJ9LGludGVycG9sYXRpb246e3BhdHRlcm46LygoPzpefFteXFxcXF0pKD86XFxcXHsyfSkqKVxcJFxceyg/Oltee31dfFxceyg/Oltee31dfFxce1tefV0qXFx9KSpcXH0pK1xcfS8sbG9va2JlaGluZDohMCxpbnNpZGU6e1wiaW50ZXJwb2xhdGlvbi1wdW5jdHVhdGlvblwiOntwYXR0ZXJuOi9eXFwkXFx7fFxcfSQvLGFsaWFzOlwicHVuY3R1YXRpb25cIn0scmVzdDpQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdH19LHN0cmluZzovW1xcc1xcU10rL319LFwic3RyaW5nLXByb3BlcnR5XCI6e3BhdHRlcm46LygoPzpefFsse10pWyBcXHRdKikoW1wiJ10pKD86XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8KD8hXFwyKVteXFxcXFxcclxcbl0pKlxcMig/PVxccyo6KS9tLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwLGFsaWFzOlwicHJvcGVydHlcIn19KSxQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiamF2YXNjcmlwdFwiLFwib3BlcmF0b3JcIix7XCJsaXRlcmFsLXByb3BlcnR5XCI6e3BhdHRlcm46LygoPzpefFsse10pWyBcXHRdKikoPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKjopL20sbG9va2JlaGluZDohMCxhbGlhczpcInByb3BlcnR5XCJ9fSksUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCYmKFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmFkZElubGluZWQoXCJzY3JpcHRcIixcImphdmFzY3JpcHRcIiksUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuYWRkQXR0cmlidXRlKFwib24oPzphYm9ydHxibHVyfGNoYW5nZXxjbGlja3xjb21wb3NpdGlvbig/OmVuZHxzdGFydHx1cGRhdGUpfGRibGNsaWNrfGVycm9yfGZvY3VzKD86aW58b3V0KT98a2V5KD86ZG93bnx1cCl8bG9hZHxtb3VzZSg/OmRvd258ZW50ZXJ8bGVhdmV8bW92ZXxvdXR8b3Zlcnx1cCl8cmVzZXR8cmVzaXplfHNjcm9sbHxzZWxlY3R8c2xvdGNoYW5nZXxzdWJtaXR8dW5sb2FkfHdoZWVsKVwiLFwiamF2YXNjcmlwdFwiKSksUHJpc20ubGFuZ3VhZ2VzLmpzPVByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0O1xuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hbGV4YScsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQoZWx0LCBodHRwKSB7XG5cdFx0Y29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cigxKVxuXG5cdFx0Ly9jb25zb2xlLmxvZygnaGFzaCcsIGhhc2gpXG5cdFx0Y29uc3QgcGFyYW1zID0gJCQudXJsLnBhcnNlVXJsUGFyYW1zKGhhc2gpXG5cdFx0Ly9jb25zb2xlLmxvZygncGFyYW1zJywgcGFyYW1zKVxuXHRcdGh0dHAucG9zdCgnL2FwaS9hbGV4YS9hdXRoJywgcGFyYW1zKS50aGVuKCgpID0+IHtcblx0XHRcdHdpbmRvdy5jbG9zZSgpXG5cdFx0fSlcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYXBwVGFiJywge1xuXG5cdHByb3BzOiB7XG5cdFx0YXBwVXJsOiAnYWJvdXQ6YmxhbmsnXG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGlmcmFtZSBibi1hdHRyPVxcXCJ7c3JjOiBhcHBVcmx9XFxcIiBibi1iaW5kPVxcXCJpZnJhbWVcXFwiIGJuLWV2ZW50PVxcXCJsb2FkOiBvbkZyYW1lTG9hZGVkXFxcIj48L2lmcmFtZT5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblx0XHRjb25zdCB7YXBwVXJsfSA9IHRoaXMucHJvcHM7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcFVybFx0XHRcdFx0XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRnJhbWVMb2FkZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uRnJhbWVMb2FkZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BcHBFeGl0ID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBFeGl0JywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwRXhpdCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJldHVybiByb290UGFnZS5vbkFwcEV4aXQoKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXHRcdFxuXHRcdH1cdFxuXG5cdFx0dGhpcy5vbkFwcFN1c3BlbmQgPSBmdW5jdGlvbigpICB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkFwcFN1c3BlbmQnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBTdXNwZW5kID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cm9vdFBhZ2Uub25BcHBTdXNwZW5kKClcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLm9uQXBwUmVzdW1lID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBSZXN1bWUnLCBjdHJsLm1vZGVsLmFwcFVybClcblx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0Y29uc3Qgcm9vdFBhZ2UgPSAkaWZyYW1lLmZpbmQoJy5yb290UGFnZScpLmlmYWNlKClcblx0XHRcdGlmIChyb290UGFnZSAmJiB0eXBlb2Ygcm9vdFBhZ2Uub25BcHBSZXN1bWUgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyb290UGFnZS5vbkFwcFJlc3VtZSgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRBcHBVcmwgPSBmdW5jdGlvbihhcHBVcmwpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIHNldEFwcFVybCcsIGFwcFVybClcblx0XHRcdGN0cmwuc2V0RGF0YSh7YXBwVXJsOiBhcHBVcmwgKyAnJmRhdGU9JyArIERhdGUubm93KCl9KVxuXHRcdH1cblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYXBwcycsIHtcblxuXHRwcm9wczoge1xuXHRcdGFwcHM6IFtdLFxuXHRcdHNob3dBY3RpdmF0ZWQ6IGZhbHNlLFxuXHRcdGl0ZW1zOiBudWxsXG5cdH0sXG5cblx0JGlmYWNlOiAnc2V0RGF0YShkYXRhKScsXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1lYWNoPVxcXCJhcHBzXFxcIiBcXG5cdFx0Ym4taXRlcj1cXFwiYXBwXFxcIiBcXG5cdFx0Y2xhc3M9XFxcIm1haW5cXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2sudGlsZTogb25UaWxlQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLnRpbGU6IG9uVGlsZUNvbnRleHRNZW51XFxcIlxcblx0XHQ+XHRcdFx0XFxuXHRcdDxkaXYgYm4tYXR0cj1cXFwiY2xhc3MxXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGdldEl0ZW1zfVxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYXJyb3ctcmlnaHRcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cyXFxcIiBzdHlsZT1cXFwibWFyZ2luLWJvdHRvbTogNXB4O1xcXCI+XFxuXHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS5hcHAucHJvcHMuaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJzaG93M1xcXCI+XFxuXHRcdFx0XHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IGdldEljb25Vcmx9XFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuYXBwLnByb3BzLnRpdGxlXFxcIiBibi1zaG93PVxcXCIhc2hvdzNcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0KSB7XG5cblx0XHRjb25zdCB7IGFwcHMsIHNob3dBY3RpdmF0ZWQsIGl0ZW1zIH0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRnZXRJdGVtczogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZ2V0SXRlbXMnLCBzY29wZS5hcHApXG5cdFx0XHRcdFx0cmV0dXJuICh0eXBlb2YgaXRlbXMgPT0gJ2Z1bmN0aW9uJykgPyBpdGVtcyhzY29wZS5hcHApIDogaXRlbXNcblx0XHRcdFx0fSxcblx0XHRcdFx0YXBwcyxcblx0XHRcdFx0c2hvd0FjdGl2YXRlZCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNob3dBY3RpdmF0ZWQgJiYgc2NvcGUuYXBwLmFjdGl2YXRlZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IHt0aXRsZSwgY29sb3JDbHN9ID0gc2NvcGUuYXBwLnByb3BzXG5cdFx0XHRcdFx0Y29uc3QgcmV0ID0ge1xuXHRcdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0XHRjbGFzczogJ3RpbGUgdzMtYnRuJ1xuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjb2xvckNscy5zdGFydHNXaXRoKCcjJykpIHtcblx0XHRcdFx0XHRcdHJldC5zdHlsZSA9IGBiYWNrZ3JvdW5kLWNvbG9yOiAke2NvbG9yQ2xzfWBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXQuY2xhc3MgKz0gJyAnICsgY29sb3JDbHNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHR5cGVvZiBzY29wZS5hcHAucHJvcHMuaWNvbkNscyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHR5cGVvZiBzY29wZS5hcHAucHJvcHMuaWNvblVybCA9PSAnc3RyaW5nJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRJY29uVXJsKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBhcHBOYW1lLCBwcm9wcyB9ID0gc2NvcGUuYXBwXG5cdFx0XHRcdFx0cmV0dXJuIGAvd2ViYXBwcy8ke2FwcE5hbWV9L2Fzc2V0cy8ke3Byb3BzLmljb25Vcmx9YFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDbGljaycsICQodGhpcykuZGF0YSgnaXRlbScpKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdhcHBjbGljaycsIGN0cmwubW9kZWwuYXBwc1tpZHhdKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRpbGVDb250ZXh0TWVudTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHsgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9ICQuZXh0ZW5kKHsgY21kIH0sIGN0cmwubW9kZWwuYXBwc1tpZHhdKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdhcHBjb250ZXh0bWVudScsIGluZm8pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0YXBwczogZGF0YS5hcHBzLmZpbHRlcigoYSkgPT4gYS5wcm9wcy52aXNpYmxlICE9IGZhbHNlICYmIGEuYXBwTmFtZSAhPSAndGVtcGxhdGUnKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBzZXREYXRhKGRhdGEpYCxcblx0JGV2ZW50czogJ2FwcGNsaWNrO2FwcGNvbnRleHRtZW51J1xufSk7XG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWRkQ29udGFjdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiIGJuLWZvcm09XFxcImluZm9cXFwiPlxcblxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmFjY29yZGlvblxcXCIgZGF0YS1oZWlnaHQtc3R5bGU9XFxcImZpbGxcXFwiPlxcblxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJOYW1lICYgRW1haWxcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImdlbmRlclxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+R2VuZGVyOjwvbGFiZWw+XFxuXHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucmFkaW9ncm91cFxcXCIgbmFtZT1cXFwiZ2VuZGVyXFxcIj5cXG5cdFx0XHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcIm1hbGVcXFwiPlxcblx0XHRcdFx0XHRcdDxsYWJlbD5NYWxlPC9sYWJlbD5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJmZW1hbGVcXFwiPlxcblx0XHRcdFx0XHRcdDxsYWJlbD5GZW1hbGU8L2xhYmVsPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPk5hbWU6PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+RW1haWw6PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiB0aXRsZT1cXFwiQmlydGhkYXlcXFwiPlxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5CaXJ0aGRheTwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuZGF0ZXBpY2tlclxcXCIgXFxuXHRcdFx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdFx0XHRjaGFuZ2VZZWFyOiB0cnVlLFxcblx0XHRcdFx0XHRcdHllYXJSYW5nZTogXFwnLTEwMDorMFxcJ1xcblx0XHRcdFx0XHR9XFxcIlxcblx0XHRcdFx0XHRuYW1lPVxcXCJiaXJ0aGRheVxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJiaXJ0aE5vdGlmXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5BY3RpdmF0ZSBiaXJ0aGRheSBOb3RpZmljYXRpb248L2xhYmVsPlxcblx0XHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmZsaXBzd2l0Y2hcXFwiIG5hbWU9XFxcImJpcnRoZGF5Tm90aWZcXFwiPjwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiB0aXRsZT1cXFwiUGhvbmVzXFxcIj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+SG9tZSBQaG9uZTo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCBuYW1lPVxcXCJwaG9uZVxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dHBob25lXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+Q2VsbCBQaG9uZTo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCBuYW1lPVxcXCJtb2JpbGVQaG9uZVxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dHBob25lXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiB0aXRsZT1cXFwiQWRkcmVzc1xcXCI+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkFkZHJlc3M6PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwiYWRkcmVzc1xcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+UG9zdGFsIENvZGU6PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiBuYW1lPVxcXCJwb3N0YWxDb2RlXFxcIiBtYXhsZW5ndGg9XFxcIjVcXFwiIGJuLWV2ZW50PVxcXCJibHVyOiBvblBvc3RhbENvZGVMb3N0Rm9jdXNcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdFx0PGRpdj5cXG5cdFx0XHRcdDxsYWJlbD5DaXR5OjwvbGFiZWw+XFxuXHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogY2l0aWVzfVxcXCIgbmFtZT1cXFwiY2l0eVxcXCIgYm4tdmFsPVxcXCJjaXR5XFxcIj48L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2Plxcblxcblx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCI+XFxuPC9mb3JtPlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuY29udGFjdHMnLCAnYnJlaXpib3QuY2l0aWVzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRkYXRhOiB7fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkNvbnRhY3QuSW50ZXJmYWNlfSBjb250YWN0c1NydiBcblx0IFx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBjb250YWN0c1NydiwgY2l0aWVzU3J2KSB7XG5cblx0XHRjb25zdCBpbmZvID0gdGhpcy5wcm9wcy5pbmZvIHx8IHt9XG5cdFx0Ly9jb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0Y29uc3QgaWQgPSBpbmZvLl9pZFxuXHRcdGNvbnN0IHsgcG9zdGFsQ29kZSwgY2l0eSB9ID0gaW5mb1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRpbmZvLFxuXHRcdFx0XHRjaXRpZXM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoeyBpZCwgZGF0YSB9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUG9zdGFsQ29kZUxvc3RGb2N1czogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUG9zdGFsQ29kZUxvc3RGb2N1cycsIHRoaXMudmFsdWUpXG5cdFx0XHRcdFx0Y29uc3QgY2l0aWVzID0gYXdhaXQgY2l0aWVzU3J2LmdldENpdGVzRnJvbVBvc3RhbENvZGUodGhpcy52YWx1ZSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjaXRpZXMgfSlcblxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZCgpIHtcblx0XHRcdGNvbnN0IGNpdGllcyA9IGF3YWl0IGNpdGllc1Nydi5nZXRDaXRlc0Zyb21Qb3N0YWxDb2RlKHBvc3RhbENvZGUpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBjaXRpZXMgfSlcblx0XHRcdGlmIChjaXR5ICYmIGNpdHkgIT0gJycpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY2l0eSB9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChwb3N0YWxDb2RlICYmIHBvc3RhbENvZGUgIT0gJycpIHtcblx0XHRcdGxvYWQoKVxuXHRcdH1cblxuXG5cdFx0dGhpcy5hZGRDb250YWN0ID0gYXN5bmMgZnVuY3Rpb24gKGluZm8pIHtcblx0XHRcdGF3YWl0IGNvbnRhY3RzU3J2LmFkZENvbnRhY3QoaW5mbylcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZUNvbnRhY3RJbmZvID0gYXN5bmMgZnVuY3Rpb24gKGlkLCBpbmZvKSB7XG5cdFx0XHRhd2FpdCBjb250YWN0c1Nydi51cGRhdGVDb250YWN0SW5mbyhpZCwgaW5mbylcblx0XHR9XG5cblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGFkZDoge1xuXHRcdFx0XHRcdHRpdGxlOiAnQXBwbHknLFxuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmNvbnRhY3RzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRzaG93U2VsZWN0aW9uOiBmYWxzZSxcblx0XHRoYXNTZWFyY2hiYXI6IGZhbHNlLFxuXHRcdGNvbnRleHRNZW51OiB7fVxuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3Quc2VhcmNoYmFyXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJzZWFyY2hiYXJzdWJtaXQ6IG9uU2VhcmNoXFxcIiBcXG5cdGJuLXNob3c9XFxcImhhc1NlYXJjaGJhclxcXCJcXG5cdGJuLWRhdGE9XFxcIntyZXF1aXJlZDogZmFsc2V9XFxcIlxcblx0PjwvZGl2PlxcbjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBjb250YWN0czwvcD5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZS53My1iYXI6IG9uSXRlbUNvbnRleHRNZW51LCBjbGljay53My1iYXI6IG9uSXRlbUNsaWNrLCBjbGljay5pbnB1dDogb25JbnB1dENsaWNrXFxcIlxcblx0XHRibi1lYWNoPVxcXCJnZXRDb250YWN0c1xcXCJcXG5cdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdD5cXG5cdFx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogY29udGV4dE1lbnV9XFxcIj5cXG5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCIgPlxcblx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmFtZVxcXCI+PC9zdHJvbmc+PGJyPlxcblx0XHRcdFx0PGRpdiBibi10ZXh0PVxcXCJnZXRBZGRyZXNzXFxcIj48L2Rpdj5cXG5cdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlIHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZW1haWxcXFwiPjwvc3Bhbj5cdFxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcIiRzY29wZS4kaS5tb2JpbGVQaG9uZVxcXCI+XFxuXHRcdFx0XHRcdDxhIGJuLWF0dHI9XFxcIntocmVmIDogZ2V0Q2VsbFBob25lfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLW1vYmlsZS1hbHQgdzMtdGV4dC1ibHVlXFxcIj48L2k+PC9hPlxcblx0XHRcdFx0XHQ8aW5wdXQgY2xhc3M9XFxcImlucHV0XFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0cGhvbmVcXFwiIGJuLXZhbD1cXFwiJHNjb3BlLiRpLm1vYmlsZVBob25lXFxcIiByZWFkb25seT5cdFxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcIiRzY29wZS4kaS5waG9uZVxcXCI+XFxuXHRcdFx0XHRcdDxhIGJuLWF0dHI9XFxcIntocmVmIDogZ2V0SG9tZVBob25lfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWhvbWUgdzMtdGV4dC1ibHVlXFxcIj48L2k+PC9hPlxcblx0XHRcdFx0XHQ8aW5wdXQgY2xhc3M9XFxcImlucHV0XFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0cGhvbmVcXFwiIGJuLXZhbD1cXFwiJHNjb3BlLiRpLnBob25lXFxcIiByZWFkb25seT5cdFxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvbGk+XFxuXHQ8L3VsPlx0XHRcXG5cXG48L2Rpdj5cXG5cIixcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQ29udGFjdC5JbnRlcmZhY2V9IGNvbnRhY3RzU3J2IFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgY29udGFjdHNTcnYpIHtcblxuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGNvbnN0IHsgc2hvd1NlbGVjdGlvbiwgY29udGV4dE1lbnUsIGhhc1NlYXJjaGJhciB9ID0gdGhpcy5wcm9wc1xuXHRcdC8vY29uc29sZS5sb2coJ3Byb3BzJywgdGhpcy5wcm9wcylcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjb250YWN0czogW10sXG5cdFx0XHRcdHNob3dTZWxlY3Rpb24sXG5cdFx0XHRcdGhhc1NlYXJjaGJhcixcblx0XHRcdFx0ZmlsdGVyOiAnJyxcblx0XHRcdFx0Y29udGV4dE1lbnUsXG5cdFx0XHRcdGdldENvbnRhY3RzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5maWx0ZXIgIT0gJycpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ09LJywgdGhpcy5maWx0ZXIpXG5cdFx0XHRcdFx0XHRjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoYFxcdyoke3RoaXMuZmlsdGVyfVxcdypgLCAnaScpXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5maWx0ZXIoKGMpID0+IHJlZ2V4LnRlc3QoYy5uYW1lKSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoaXMuc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMuZmlsdGVyKChjKSA9PiBjLmVtYWlsICYmIGMuZW1haWwgIT0gJycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldENlbGxQaG9uZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gJ3RlbDonICsgc2NvcGUuJGkubW9iaWxlUGhvbmVcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0SG9tZVBob25lOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAndGVsOicgKyBzY29wZS4kaS5waG9uZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRBZGRyZXNzOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IHthZGRyZXNzLCBjaXR5LCBwb3N0YWxDb2RlfSA9IHNjb3BlLiRpXG5cdFx0XHRcdFx0cmV0dXJuIGAke2FkZHJlc3MgfHwgJyd9ICR7cG9zdGFsQ29kZSB8fCAnJ30gJHtjaXR5IHx8ICcnfWBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblNlYXJjaDogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlYXJjaCcsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtmaWx0ZXI6IGRhdGEudmFsdWV9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5wdXRDbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JbnB1dENsaWNrJylcblx0XHRcdFx0XHQkKHRoaXMpLmNsb3Nlc3QoJ2RpdicpLmZpbmQoJ2EnKS5nZXQoMCkuY2xpY2soKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkl0ZW1Db250ZXh0TWVudTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHsgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0Q29udGFjdHMoKVtpZHhdXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBpbmZvKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdjb250YWN0Y29udGV4dG1lbnUnLCB7IGNtZCwgaW5mbyB9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0Ly8kKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XG5cdFx0XHRjb25zdCBjb250YWN0cyA9IGF3YWl0IGNvbnRhY3RzU3J2LmdldENvbnRhY3RzKClcblx0XHRcdC8vY29uc29sZS5sb2coJ2NvbnRhY3RzJywgY29udGFjdHMpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBjb250YWN0cyB9KVxuXHRcdH1cblxuXG5cdFx0bG9hZCgpXG5cblx0XHR0aGlzLnVwZGF0ZSA9IGxvYWRcblxuXHRcdHRoaXMucmVtb3ZlQ29udGFjdCA9IGFzeW5jIGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRhd2FpdCBjb250YWN0c1Nydi5yZW1vdmVDb250YWN0KGlkKVxuXHRcdFx0YXdhaXQgbG9hZCgpXG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjb25zdCByZXQgPSBbXVxuXHRcdFx0ZWx0LmZpbmQoJ2xpLnczLWJsdWUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdHJldC5wdXNoKGN0cmwubW9kZWwuZ2V0Q29udGFjdHMoKVtpZHhdKVxuXHRcdFx0fSlcblx0XHRcdGNvbnNvbGUubG9nKCdyZXQnLCByZXQpXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdH0sXG5cdCRpZmFjZTogYFxuXHRcdGdldFNlbGVjdGlvbigpOiBbQ29udGFjdEluZm9dXG5cdFx0cmVtb3ZlQ29udGFjdChpZClcblx0YCxcblx0JGV2ZW50czogJ2NvbnRhY3RjbGljaydcbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lmh0bWxlZGl0b3InLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1ldmVudD1cXFwiY2xpY2suY21kOiBvbkNvbW1hbmRcXFwiIGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwiY21kIHczLWJ1dHRvblxcXCIgIFxcblx0XHRcdGJuLWljb249XFxcImZhcyBmYS1taWNyb3Bob25lXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiVG9vZ2xlIE1pY3JvXFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9vZ2xlTWljcm9cXFwiIFxcblx0XHRcdGJuLXNob3c9XFxcInNwZWVjaFJlY29BdmFpbGFibGVcXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJjbWQgdzMtYnV0dG9uXFxcIiAgYm4taWNvbj1cXFwiZmFzIGZhLXJlbW92ZS1mb3JtYXRcXFwiIHRpdGxlPVxcXCJSZW1vdmUgRm9ybWF0XFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUmVtb3ZlRm9ybWF0XFxcIj48L2J1dHRvbj5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9zcGFuPlxcblxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcImNtZCB3My1idXR0b25cXFwiIGRhdGEtY21kPVxcXCJib2xkXFxcIiB0aXRsZT1cXFwiQm9sZFxcXCIgYm4taWNvbj1cXFwiZmEgZmEtYm9sZFxcXCI+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcImNtZCB3My1idXR0b25cXFwiIGRhdGEtY21kPVxcXCJpdGFsaWNcXFwiIHRpdGxlPVxcXCJJdGFsaWNcXFwiIGJuLWljb249XFxcImZhIGZhLWl0YWxpY1xcXCI+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcImNtZCB3My1idXR0b25cXFwiIGRhdGEtY21kPVxcXCJ1bmRlcmxpbmVcXFwiIHRpdGxlPVxcXCJVbmRlcmxpbmVcXFwiIGJuLWljb249XFxcImZhIGZhLXVuZGVybGluZVxcXCI+PC9idXR0b24+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Gb250TmFtZUNoYW5nZVxcXCJcXG5cdFx0XHRibi1pY29uPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCJcXG5cdFx0XHR0aXRsZT1cXFwiRm9udCBOYW1lXFxcIiBcXG5cdFx0XHRibi1odG1sPVxcXCJnZXRGb250TmFtZVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiBmb250TmFtZUl0ZW1zXFxuXHRcdFx0fVxcXCI+XFxuXFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Gb250U2l6ZUNoYW5nZVxcXCJcXG5cdFx0XHRibi1pY29uPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCJcXG5cdFx0XHR0aXRsZT1cXFwiRm9udCBTaXplXFxcIiBibi1odG1sPVxcXCJnZXRGb250U2l6ZVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiBmb250U2l6ZUl0ZW1zXFxuXHRcdFx0fVxcXCI+XFxuXFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db21tYW5kXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiVGl0bGVcXFwiXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiXFxuXHRcdFx0ZGF0YS1jbWQ9XFxcImZvcm1hdEJsb2NrXFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IGhlYWRpbmdJdGVtc1xcblx0XHRcdH1cXFwiPlxcblx0XHRcdMKnJm5ic3A7XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJBbGlnbm1lbnRcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbW1hbmRcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRqdXN0aWZ5TGVmdDoge25hbWU6IFxcJ0xlZnRcXCcsIGljb246IFxcJ2ZhcyBmYS1hbGlnbi1sZWZ0XFwnfSxcXG5cdFx0XHRcdFx0anVzdGlmeUNlbnRlcjoge25hbWU6IFxcJ0NlbnRlclxcJywgaWNvbjogXFwnZmFzIGZhLWFsaWduLWNlbnRlclxcJ30sXFxuXHRcdFx0XHRcdGp1c3RpZnlSaWdodDoge25hbWU6IFxcJ1JpZ2h0XFwnLCBpY29uOiBcXCdmYXMgZmEtYWxpZ24tcmlnaHRcXCd9XFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1hbGlnbi1sZWZ0XFxcIj48L2k+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJUZXh0IGNvbG9yXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHRpdGVtczogY29sb3JJdGVtcyxcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCdcXG5cdFx0XHR9XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29sb3JNZW51Q2hhbmdlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLXBhaW50LWJydXNoXFxcIiBibi1zdHlsZT1cXFwie2NvbG9yfVxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkluZGVudFxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCJcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db21tYW5kXFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdFx0aW5kZW50OiB7bmFtZTogXFwnSW5kZW50XFwnLCBpY29uOiBcXCdmYXMgZmEtaW5kZW50XFwnfSxcXG5cdFx0XHRcdFx0XHRvdXRkZW50OiB7bmFtZTogXFwnT3V0ZGVudFxcJywgaWNvbjogXFwnZmFzIGZhLW91dGRlbnRcXCd9XFxuXHRcdFx0XHRcdH1cXG5cdFx0XHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtaW5kZW50XFxcIj48L2k+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJMaXN0XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29tbWFuZFxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0aW5zZXJ0VW5vcmRlcmVkTGlzdDoge25hbWU6IFxcJ1Vub3JkZXJlZFxcJywgaWNvbjogXFwnZmFzIGZhLWxpc3QtdWxcXCd9LFxcblx0XHRcdFx0XHRpbnNlcnRPcmRlcmVkTGlzdDoge25hbWU6IFxcJ09yZGVyZWRcXCcsIGljb246IFxcJ2ZhcyBmYS1saXN0LW9sXFwnfVxcblx0XHRcdFx0fVxcblx0XHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtbGlzdC1vbFxcXCI+PC9pPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9zcGFuPlxcblxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiBjbWRcXFwiIHRpdGxlPVxcXCJIb3Jpem9udGFsIFJ1bGVcXFwiIGRhdGEtY21kPVxcXCJpbnNlcnRIb3Jpem9udGFsUnVsZVxcXCJibi1pY29uPVxcXCJmYXMgZmEtbWludXNcXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJJbnNlcnQgTGlua1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNyZWF0ZUxpbmtcXFwiIGJuLWljb249XFxcImZhcyBmYS1saW5rXFxcIj48L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkluc2VydCBpbWFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkluc2VydEltYWdlXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBibi1pY29uPVxcXCJmYSBmYS1pbWFnZVxcXCI+PC9idXR0b24+XFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkluc2VydCBUYWJsZSBmcm9tIHNlbGVjdGlvblxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCJcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uSW5zZXJ0VGFibGVcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRjb252ZXJ0VG9UYWJsZToge25hbWU6IFxcJ0NvbnZlcnQgdG8gdGFibGVcXCd9LFxcblx0XHRcdFx0XHRjb252ZXJ0VG9MaXN0OiB7bmFtZTogXFwnQ29udmVydCB0byBsaXN0XFwnfSxcXG5cdFx0XHRcdFx0YWRkUm93OiB7bmFtZTogXFwnQWRkIHJvd1xcJ30sXFxuXHRcdFx0XHRcdGFkZENvbDoge25hbWU6IFxcJ0FkZCBDb2x1bW5cXCd9XFxuXHRcdFx0XHR9XFxuXFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYSBmYS10aFxcXCI+PC9pPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCI+PC9pPlxcblxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcImJvdHRvbVxcXCI+XFxuXHQ8aW1nIGJuLWF0dHI9XFxcIntzcmM6IGdldE1pY1VybH1cXFwiIGNsYXNzPVxcXCJtaWNyb1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk1pY3JvXFxcIiBibi1zaG93PVxcXCJpc01pY3JvVmlzaWJsZVxcXCIgdGl0bGU9XFxcIlNwZWVjaCBSZWNvZ25pdGlvblxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNjcm9sbENsaWNrXFxcIj5cXG5cdFx0PGRpdiBjb250ZW50ZWRpdGFibGU9XFxcInRydWVcXFwiIGJuLWJpbmQ9XFxcImVkaXRvclxcXCIgY2xhc3M9XFxcImVkaXRvclxcXCIgYm4taHRtbD1cXFwiaHRtbFxcXCI+PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0cHJvcHM6IHtcblx0XHR1c2VEYXRhVXJsRm9ySW1nOiBmYWxzZVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHsqfSBlbHQgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IGZpbGVzIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGZpbGVzKSB7XG5cblx0XHQvL0B0cy1pZ25vcmVcblx0XHRjb25zdCB7IHVzZURhdGFVcmxGb3JJbWcgfSA9IHRoaXMucHJvcHNcblx0XHRjb25zb2xlLmxvZygndXNlRGF0YVVybEZvckltZycsIHVzZURhdGFVcmxGb3JJbWcpXG5cblx0XHRjb25zdCBjb2xvck1hcCA9IHtcblx0XHRcdGJsYWNrOiAnIzAwMDAwMCcsXG5cdFx0XHRyZWQ6ICcjZjQ0MzM2Jyxcblx0XHRcdGdyZWVuOiAnIzRDQUY1MCcsXG5cdFx0XHRibHVlOiAnIzIxOTZGMycsXG5cdFx0XHR5ZWxsb3c6ICcjZmZlYjNiJyxcblx0XHRcdGN5YW46ICcjMDBiY2Q0Jyxcblx0XHRcdHBpbms6ICcjZTkxZTYzJ1xuXG5cdFx0fVxuXG5cdFx0Y29uc3QgZm9udFNpemVzID0gJzgsMTAsMTIsMTQsMTgsMjQsMzYnLnNwbGl0KCcsJylcblx0XHRjb25zdCBmb250TmFtZXMgPSBbXCJBcmlhbFwiLCBcIkNvdXJpZXIgTmV3XCIsIFwiVGltZXMgTmV3IFJvbWFuXCJdXG5cblx0XHRmdW5jdGlvbiBnZXRIZWFkaW5nSXRlbXMoKSB7XG5cdFx0XHRjb25zdCByZXQgPSB7XG5cdFx0XHRcdHA6IHsgbmFtZTogJ05vcm1hbCcgfVxuXHRcdFx0fVxuXHRcdFx0Zm9yIChsZXQgaSA9IDE7IGkgPD0gNjsgaSsrKSB7XG5cdFx0XHRcdHJldFsnaCcgKyBpXSA9IHsgbmFtZTogYDxoJHtpfT5IZWFkaW5nICR7aX08L2gke2l9PmAsIGlzSHRtbE5hbWU6IHRydWUgfVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEZvbnRTaXplSXRlbXMoKSB7XG5cdFx0XHRjb25zdCByZXQgPSB7fVxuXHRcdFx0Zm9udFNpemVzLmZvckVhY2goKGksIGlkeCkgPT4ge1xuXHRcdFx0XHRyZXRbaWR4ICsgMV0gPSB7IG5hbWU6IGA8Zm9udCBzaXplPVwiJHtpZHggKyAxfVwiPiR7aX0gcHQ8L2ZvbnQ+YCwgaXNIdG1sTmFtZTogdHJ1ZSB9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEZvbnROYW1lSXRlbXMoKSB7XG5cdFx0XHRjb25zdCByZXQgPSB7fVxuXHRcdFx0Zm9udE5hbWVzLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0cmV0W2ldID0geyBuYW1lOiBgPGZvbnQgZmFjZT1cIiR7aX1cIj4ke2l9PC9mb250PmAsIGlzSHRtbE5hbWU6IHRydWUgfVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRDb2xvckl0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge31cblx0XHRcdE9iamVjdC5rZXlzKGNvbG9yTWFwKS5mb3JFYWNoKChpKSA9PiB7XG5cdFx0XHRcdHJldFtpXSA9IHtcblx0XHRcdFx0XHRuYW1lOiBpLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaS5zbGljZSgxKSxcblx0XHRcdFx0XHRpY29uOiBgZmFzIGZhLXNxdWFyZS1mdWxsIHczLXRleHQtJHtpfWBcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiByZXRcblxuXHRcdH1cblxuXHRcdGNvbnN0IGZvbnRTaXplSXRlbXMgPSBnZXRGb250U2l6ZUl0ZW1zKClcblx0XHRjb25zdCBkZWZhdWx0Rm9udFNpemUgPSAnMydcblx0XHRjb25zdCBmb250TmFtZUl0ZW1zID0gZ2V0Rm9udE5hbWVJdGVtcygpXG5cdFx0Y29uc3QgZGVmYXVsdEZvbnROYW1lID0gJ0FyaWFsJ1xuXHRcdGNvbnN0IGNvbG9ySXRlbXMgPSBnZXRDb2xvckl0ZW1zKClcblx0XHRjb25zdCBkZWZhdWx0Q29sb3IgPSBjb2xvck1hcFsnYmxhY2snXVxuXG5cdFx0Y29uc3Qgc3BlZWNoUmVjb0F2YWlsYWJsZSA9ICgnd2Via2l0U3BlZWNoUmVjb2duaXRpb24nIGluIHdpbmRvdylcblx0XHRjb25zdCBpc01vYmlsRGV2aWNlID0gL0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpXG5cdFx0Y29uc29sZS5sb2coJ2lzTW9iaWxEZXZpY2UnLCBpc01vYmlsRGV2aWNlKVxuXHRcdGxldCBpZ25vcmVPbkVuZCA9IGZhbHNlXG5cdFx0bGV0IHJlY29nbml0aW9uID0gbnVsbFxuXHRcdGxldCBmaW5hbFNwYW4gPSBudWxsXG5cdFx0bGV0IGludGVyaW1TcGFuID0gbnVsbFxuXHRcdGxldCBmaW5hbFRyYW5zY3JpcHQgPSAnJ1xuXHRcdC8qKkB0eXBlIHtSYW5nZX0gKi9cblx0XHRsZXQgcmFuZ2UgPSBudWxsXG5cblx0XHRjb25zdCB0d29fbGluZSA9IC9cXG5cXG4vZ1xuXHRcdGNvbnN0IG9uZV9saW5lID0gL1xcbi9nXG5cdFx0ZnVuY3Rpb24gbGluZWJyZWFrKHMpIHtcblx0XHRcdHJldHVybiBzLnJlcGxhY2UodHdvX2xpbmUsICc8cD48L3A+JykucmVwbGFjZShvbmVfbGluZSwgJzxicj4nKVxuXHRcdH1cblxuXHRcdGNvbnN0IGZpcnN0X2NoYXIgPSAvXFxTL1xuXHRcdGZ1bmN0aW9uIGNhcGl0YWxpemUocykge1xuXHRcdFx0cmV0dXJuIHMucmVwbGFjZShmaXJzdF9jaGFyLCBtID0+IG0udG9VcHBlckNhc2UoKSlcblx0XHR9XG5cblx0XHRpZiAoc3BlZWNoUmVjb0F2YWlsYWJsZSkge1xuXHRcdFx0cmVjb2duaXRpb24gPSBuZXcgd2Via2l0U3BlZWNoUmVjb2duaXRpb24oKTtcblx0XHRcdHJlY29nbml0aW9uLmNvbnRpbnVvdXMgPSB0cnVlXG5cdFx0XHRyZWNvZ25pdGlvbi5pbnRlcmltUmVzdWx0cyA9IHRydWVcblx0XHRcdHJlY29nbml0aW9uLmxhbmcgPSAnZnItRlInXG5cblx0XHRcdHJlY29nbml0aW9uLm9uc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdvblN0YXJ0Jylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcmVjb2duaXppbmc6IHRydWUgfSlcblxuXHRcdFx0fVxuXG5cdFx0XHRyZWNvZ25pdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdvbkVycm9yJywgZXZlbnQuZXJyb3IpXG5cdFx0XHR9XG5cblx0XHRcdHJlY29nbml0aW9uLm9uZW5kID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnb25FbmQnKVxuXHRcdFx0XHRpZiAoaXNNb2JpbERldmljZSAmJiBjdHJsLm1vZGVsLnJlY29nbml6aW5nKSB7XG5cdFx0XHRcdFx0cmFuZ2UuY29sbGFwc2UoKVxuXHRcdFx0XHRcdHN0YXJ0UmVjb2duaXRpb24oKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHJlY29nbml6aW5nOiBmYWxzZSB9KVxuXHRcdFx0XHRcdHJhbmdlLmNvbGxhcHNlKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZWNvZ25pdGlvbi5vbnJlc3VsdCA9IGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJlc3VsdCcsIGV2ZW50LnJlc3VsdHMubGVuZ3RoKVxuXHRcdFx0XHRsZXQgaW50ZXJpbVRyYW5zY3JpcHQgPSAnJ1xuXHRcdFx0XHRmb3IgKGxldCBpID0gZXZlbnQucmVzdWx0SW5kZXg7IGkgPCBldmVudC5yZXN1bHRzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmVzdWx0cycsIGV2ZW50LnJlc3VsdHNbaV0pXG5cdFx0XHRcdFx0aWYgKGV2ZW50LnJlc3VsdHNbaV0uaXNGaW5hbCAmJiBldmVudC5yZXN1bHRzW2ldWzBdLmNvbmZpZGVuY2UgIT0gMCkge1xuXHRcdFx0XHRcdFx0ZmluYWxUcmFuc2NyaXB0ICs9IGV2ZW50LnJlc3VsdHNbaV1bMF0udHJhbnNjcmlwdFxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpbnRlcmltVHJhbnNjcmlwdCArPSBldmVudC5yZXN1bHRzW2ldWzBdLnRyYW5zY3JpcHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW50ZXJpbVRyYW5zY3JpcHQnLCBpbnRlcmltVHJhbnNjcmlwdClcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmluYWxUcmFuc2NyaXB0JywgZmluYWxUcmFuc2NyaXB0KVxuXHRcdFx0XHRmaW5hbFRyYW5zY3JpcHQgPSBjYXBpdGFsaXplKGZpbmFsVHJhbnNjcmlwdClcblx0XHRcdFx0ZmluYWxTcGFuLmlubmVySFRNTCA9IGxpbmVicmVhayhmaW5hbFRyYW5zY3JpcHQpXG5cdFx0XHRcdGludGVyaW1TcGFuLmlubmVySFRNTCA9IGxpbmVicmVhayhpbnRlcmltVHJhbnNjcmlwdClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdGFydFJlY29nbml0aW9uKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsT2JqJywgc2VsT2JqKVxuXG5cdFx0XHRpZiAoIWlzRWRpdGFibGUoKSkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHJhbmdlID0gZ2V0UmFuZ2UoKVxuXHRcdFx0ZmluYWxTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG5cdFx0XHRpbnRlcmltU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuXHRcdFx0aW50ZXJpbVNwYW4uY2xhc3NOYW1lID0gJ2ludGVyaW0nXG5cdFx0XHRyYW5nZS5pbnNlcnROb2RlKGludGVyaW1TcGFuKVxuXHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZShmaW5hbFNwYW4pXG5cdFx0XHRmaW5hbFRyYW5zY3JpcHQgPSAnJ1xuXHRcdFx0cmVjb2duaXRpb24uc3RhcnQoKVxuXHRcdFx0aWdub3JlT25FbmQgPSBmYWxzZVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lXG5cdFx0ICogQHJldHVybnMge0pRdWVyeTxIVE1MRWxlbWVudD59XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGl2KHRleHQsIHRhZ05hbWUpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2RpdicsIHRhZ05hbWUsIHRleHQpXG5cdFx0XHRjb25zdCBlbHQgPSBbJ0knLCAnQicsICdVJywgJ0ZPTlQnXS5pbmNsdWRlcyh0YWdOYW1lKSA/ICdzcGFuJyA6ICdkaXYnXG5cdFx0XHRyZXR1cm4gJChgPCR7ZWx0fT5gKS50ZXh0KHRleHQpXG5cdFx0fVxuXG5cdFx0bGV0IGltZ1VybHMgPSBbXVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gY29udmVydFRvVGFibGUocmFuZ2UpIHtcblx0XHRcdGNvbnN0IHNlbFJhbmdlVGV4dCA9IGdldFRleHROb2Rlc0JldHdlZW4ocmFuZ2UuY29tbW9uQW5jZXN0b3JDb250YWluZXIsIHJhbmdlLnN0YXJ0Q29udGFpbmVyLCByYW5nZS5lbmRDb250YWluZXIpXG5cdFx0XHRpZiAoc2VsUmFuZ2VUZXh0Lmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0cmFuZ2UuZGVsZXRlQ29udGVudHMoKVxuXG5cdFx0XHRjb25zdCB0YWJsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJylcblx0XHRcdGZvciAoY29uc3Qgcm93IG9mIHNlbFJhbmdlVGV4dCkge1xuXHRcdFx0XHRjb25zdCB0ciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJylcblx0XHRcdFx0dGFibGUuYXBwZW5kQ2hpbGQodHIpXG5cdFx0XHRcdGZvciAoY29uc3QgdGV4dCBvZiByb3cuc3BsaXQoJzsnKSkge1xuXHRcdFx0XHRcdGNvbnN0IHRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKVxuXHRcdFx0XHRcdHRyLmFwcGVuZENoaWxkKHRkKVxuXHRcdFx0XHRcdGlmICh0ZXh0LnN0YXJ0c1dpdGgoJ2ltZygnKSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdXJsSWQgPSB0ZXh0LnJlcGxhY2VBbGwoJyknLCAnJykuc3Vic3RyKDQpXG5cdFx0XHRcdFx0XHRjb25zdCBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKVxuXHRcdFx0XHRcdFx0aW1nLnNyYyA9IGltZ1VybHNbdXJsSWRdXG5cdFx0XHRcdFx0XHR0ZC5hcHBlbmRDaGlsZChpbWcpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0dGQudGV4dENvbnRlbnQgPSB0ZXh0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpbWdVcmxzID0gW11cblx0XHRcdHJhbmdlLmluc2VydE5vZGUodGFibGUpXG5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBjb252ZXJ0VG9MaXN0KHJhbmdlKSB7XG5cdFx0XHRjb25zdCBwYXJlbnRFbGVtZW50ID0gJChyYW5nZS5zdGFydENvbnRhaW5lci5wYXJlbnRFbGVtZW50KVxuXG5cdFx0XHRpZiAoWydURCcsICdUSCddLmluY2x1ZGVzKHBhcmVudEVsZW1lbnQuZ2V0KDApLnRhZ05hbWUpKSB7XG5cdFx0XHRcdGNvbnN0IHRhYmxlID0gcGFyZW50RWxlbWVudC5jbG9zZXN0KCd0YWJsZScpXG5cdFx0XHRcdGNvbnN0IHRyID0gdGFibGUuZmluZCgndHInKVxuXHRcdFx0XHRjb25zdCBkYXRhID0gW11cblx0XHRcdFx0dHIuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgdGQgPSAkKHRoaXMpLmZpbmQoJ3RkLHRoJylcblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gW11cblx0XHRcdFx0XHR0ZC5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdCQodGhpcykuZmluZCgnaW1nJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHNyYyA9ICQodGhpcykuYXR0cignc3JjJylcblx0XHRcdFx0XHRcdFx0aW1nVXJscy5wdXNoKHNyYylcblx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZXBsYWNlV2l0aChgaW1nKCR7aW1nVXJscy5sZW5ndGggLSAxfSlgKVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0dGV4dC5wdXNoKCQodGhpcykudGV4dCgpKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0ZGF0YS5wdXNoKHRleHQuam9pbignOycpKVxuXG5cdFx0XHRcdH0pXG5cdFx0XHRcdHRhYmxlLnJlbW92ZSgpXG5cdFx0XHRcdHJhbmdlLmRlbGV0ZUNvbnRlbnRzKClcblx0XHRcdFx0Zm9yIChjb25zdCB0ZXh0IG9mIGRhdGEucmV2ZXJzZSgpKSB7XG5cdFx0XHRcdFx0Y29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHRcdFx0XHRkaXYuaW5uZXJIVE1MID0gdGV4dFxuXHRcdFx0XHRcdHJhbmdlLmluc2VydE5vZGUoZGl2KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgY2VsbCB0YWJsZScgfSlcblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gYWRkUm93KHJhbmdlKSB7XG5cdFx0XHRjb25zdCBwYXJlbnRFbGVtZW50ID0gJChyYW5nZS5zdGFydENvbnRhaW5lci5wYXJlbnRFbGVtZW50KVxuXG5cdFx0XHRpZiAoWydURCcsICdUSCddLmluY2x1ZGVzKHBhcmVudEVsZW1lbnQuZ2V0KDApLnRhZ05hbWUpKSB7XG5cdFx0XHRcdGNvbnN0IHRyID0gcGFyZW50RWxlbWVudC5jbG9zZXN0KCd0cicpXG5cdFx0XHRcdGNvbnN0IG5iQ29scyA9IHRyLmZpbmQoJ3RkLCB0aCcpLmxlbmd0aFxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCduYiBjb2wnLCBuYkNvbHMpXG5cdFx0XHRcdGNvbnN0IG5ld1RyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKVxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG5iQ29sczsgaSsrKSB7XG5cdFx0XHRcdFx0Y29uc3QgbmV3VGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpXG5cdFx0XHRcdFx0bmV3VHIuYXBwZW5kQ2hpbGQobmV3VGQpXG5cdFx0XHRcdH1cblx0XHRcdFx0dHIuYWZ0ZXIobmV3VHIpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgY2VsbCB0YWJsZScgfSlcblxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFxuXHRcdCAqL1xuXHRcdCBmdW5jdGlvbiBhZGRDb2x1bW4ocmFuZ2UpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2FkZENvbHVtbicpXG5cdFx0XHRjb25zdCBwYXJlbnRFbGVtZW50ID0gJChyYW5nZS5zdGFydENvbnRhaW5lci5wYXJlbnRFbGVtZW50KVxuXG5cdFx0XHRpZiAoWydURCcsICdUSCddLmluY2x1ZGVzKHBhcmVudEVsZW1lbnQuZ2V0KDApLnRhZ05hbWUpKSB7XG5cdFx0XHRcdGNvbnN0IHNlbENvbCA9IHBhcmVudEVsZW1lbnQuaW5kZXgoKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxDb2wnLCBzZWxDb2wpXG5cdFx0XHRcdGNvbnN0IHRhYmxlID0gcGFyZW50RWxlbWVudC5jbG9zZXN0KCd0YWJsZScpXG5cdFx0XHRcdHRhYmxlLmZpbmQoJ3RyJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCB0ZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJylcblx0XHRcdFx0XHQkKHRoaXMpLmZpbmQoJ3RkLHRoJykuZXEoc2VsQ29sKS5hZnRlcih0ZClcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSBjZWxsIHRhYmxlJyB9KVxuXG5cdFx0XHR9XG5cdFx0fVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aHRtbDogZWx0LnZhbCgpLFxuXHRcdFx0XHRmb250U2l6ZTogZGVmYXVsdEZvbnRTaXplLFxuXHRcdFx0XHRmb250TmFtZTogZGVmYXVsdEZvbnROYW1lLFxuXHRcdFx0XHRnZXRGb250U2l6ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBgJHtmb250U2l6ZXNbdGhpcy5mb250U2l6ZSAtIDFdfSBwdCZuYnNwOzxpIGNsYXNzPVwiZmFzIGZhLWNhcmV0LWRvd25cIj48L2k+YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRGb250TmFtZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBgJHt0aGlzLmZvbnROYW1lfSZuYnNwOzxpIGNsYXNzPVwiZmFzIGZhLWNhcmV0LWRvd25cIj48L2k+YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRmb250U2l6ZUl0ZW1zLFxuXHRcdFx0XHRmb250TmFtZUl0ZW1zLFxuXHRcdFx0XHRjb2xvckl0ZW1zLFxuXHRcdFx0XHRjb2xvcjogZGVmYXVsdENvbG9yLFxuXHRcdFx0XHRoZWFkaW5nSXRlbXM6IGdldEhlYWRpbmdJdGVtcygpLFxuXHRcdFx0XHRzaG93TWljcm86IGZhbHNlLFxuXHRcdFx0XHRpc01pY3JvVmlzaWJsZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNob3dNaWNybyAmJiB0aGlzLnNwZWVjaFJlY29BdmFpbGFibGVcblx0XHRcdFx0fSxcblx0XHRcdFx0c3BlZWNoUmVjb0F2YWlsYWJsZSxcblx0XHRcdFx0cmVjb2duaXppbmc6IGZhbHNlLFxuXHRcdFx0XHRnZXRNaWNVcmw6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5yZWNvZ25pemluZyA/ICcvYXNzZXRzL21pYy1hbmltYXRlLmdpZicgOiAnL2Fzc2V0cy9taWMuZ2lmJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVG9vZ2xlTWljcm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBzaG93TWljcm86ICFjdHJsLm1vZGVsLnNob3dNaWNybyB9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkluc2VydFRhYmxlOiBmdW5jdGlvbiAoZXYsIGluZm8pIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JbnNlcnRUYWJsZScsIGluZm8pXG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGluZm9cblx0XHRcdFx0XHRpZiAoIWlzRWRpdGFibGUoKSkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblx0XHRcdFx0XHRjb25zdCByYW5nZSA9IHNlbE9iai5nZXRSYW5nZUF0KDApXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnY29udmVydFRvTGlzdCcpIHtcblx0XHRcdFx0XHRcdGNvbnZlcnRUb0xpc3QocmFuZ2UpXG5cdFx0XHRcdFx0XHRzZWxPYmoucmVtb3ZlQWxsUmFuZ2VzKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoY21kID09ICdjb252ZXJ0VG9UYWJsZScpIHtcblx0XHRcdFx0XHRcdGNvbnZlcnRUb1RhYmxlKHJhbmdlKVxuXHRcdFx0XHRcdFx0c2VsT2JqLnJlbW92ZUFsbFJhbmdlcygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGNtZCA9PSAnYWRkUm93Jykge1xuXHRcdFx0XHRcdFx0YWRkUm93KHJhbmdlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChjbWQgPT0gJ2FkZENvbCcpIHtcblx0XHRcdFx0XHRcdGFkZENvbHVtbihyYW5nZSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZW1vdmVGb3JtYXQ6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZW1vdmVGb3JtYXQnKVxuXHRcdFx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXG5cdFx0XHRcdFx0aWYgKCFpc0VkaXRhYmxlKCkpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3Qgbm9kZSA9IHNlbE9iai5hbmNob3JOb2RlXG5cdFx0XHRcdFx0aWYgKG5vZGUubm9kZVR5cGUgIT0gbm9kZS5URVhUX05PREUpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29uc3QgdGV4dCA9IG5vZGUudGV4dENvbnRlbnRcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKHt0ZXh0fSlcblx0XHRcdFx0XHRjb25zdCBwYXJlbnQgPSBub2RlLnBhcmVudEVsZW1lbnRcblx0XHRcdFx0XHRjb25zdCB0YWdOYW1lID0gcGFyZW50LnRhZ05hbWVcblxuXHRcdFx0XHRcdGlmICgkKHBhcmVudCkuaGFzQ2xhc3MoJ2VkaXRvcicpKSB7XG5cdFx0XHRcdFx0XHRpZiAobm9kZS5wcmV2aW91c1NpYmxpbmcgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRkaXYodGV4dCwgdGFnTmFtZSkuaW5zZXJ0QWZ0ZXIobm9kZS5wcmV2aW91c1NpYmxpbmcpXG5cdFx0XHRcdFx0XHRcdHBhcmVudC5yZW1vdmVDaGlsZChub2RlKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChwYXJlbnQucGFyZW50RWxlbWVudC5jaGlsZEVsZW1lbnRDb3VudCA9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdHBhcmVudC5yZW1vdmVDaGlsZChub2RlKVxuXHRcdFx0XHRcdFx0XHRwYXJlbnQucGFyZW50RWxlbWVudC50ZXh0Q29udGVudCA9IHBhcmVudC5wYXJlbnRFbGVtZW50LnRleHRDb250ZW50ICsgdGV4dFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQocGFyZW50KS5yZXBsYWNlV2l0aChkaXYodGV4dCwgdGFnTmFtZSkpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk1pY3JvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwucmVjb2duaXppbmcpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHJlY29nbml6aW5nOiBmYWxzZSB9KVxuXHRcdFx0XHRcdFx0cmVjb2duaXRpb24uc3RvcCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0c3RhcnRSZWNvZ25pdGlvbigpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkluc2VydEltYWdlOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRpbnNlcnRJbWFnZSgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRm9udE5hbWVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRm9udE5hbWVDaGFuZ2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGZvbnROYW1lOiBkYXRhLmNtZCB9KVxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKCdmb250TmFtZScsIGZhbHNlLCBkYXRhLmNtZClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Gb250U2l6ZUNoYW5nZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Gb250U2l6ZUNoYW5nZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgZm9udFNpemU6IGRhdGEuY21kIH0pXG5cdFx0XHRcdFx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2ZvbnRTaXplJywgZmFsc2UsIGRhdGEuY21kKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNyZWF0ZUxpbms6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0XHRcdGFkZExpbmsoYXN5bmMgKCkgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0luc2VydCBMaW5rJyxcblx0XHRcdFx0XHRcdFx0bGFiZWw6ICdMaW5rIFRhcmdldCcsXG5cdFx0XHRcdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICd1cmwnIH1cblx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2Nyb2xsQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5mb2N1cygpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29tbWFuZDogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db21tYW5kJywgZGF0YSlcblxuXHRcdFx0XHRcdGxldCBjbWRcblx0XHRcdFx0XHRsZXQgY21kQXJnXG5cblx0XHRcdFx0XHRpZiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0Y21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdFx0aWYgKGNtZCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0Y21kQXJnID0gZGF0YS5jbWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjbWQgPSBkYXRhLmNtZFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRcdGNtZEFyZyA9ICQodGhpcykuZGF0YSgnY21kQXJnJylcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvbW1hbmQnLCBjbWQsIGNtZEFyZylcblxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKGNtZCwgZmFsc2UsIGNtZEFyZylcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbG9yTWVudUNoYW5nZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29sb3JNZW51Q2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCBjb2xvciA9IGNvbG9yTWFwW2RhdGEuY21kXVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGNvbG9yIH0pXG5cdFx0XHRcdFx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2ZvcmVDb2xvcicsIGZhbHNlLCBjb2xvcilcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbi53My1idXR0b24nKS5hdHRyKCd0eXBlJywgJ2J1dHRvbicpXG5cblx0XHQkKGRvY3VtZW50KS5vbignc2VsZWN0aW9uY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsZWN0aW9uY2hhbmdlJylcblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsT2JqJywgc2VsT2JqKVxuXG5cdFx0XHRpZiAoIWlzRWRpdGFibGUoKSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZm9udFNpemVOb2RlID0gJChzZWxPYmouYW5jaG9yTm9kZSkuY2xvc2VzdCgnZm9udFtzaXplXScpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdmb250Tm9kZScsIGZvbnROb2RlKVxuXHRcdFx0aWYgKGZvbnRTaXplTm9kZS5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRjb25zdCBmb250U2l6ZSA9IGZvbnRTaXplTm9kZS5hdHRyKCdzaXplJykgfHwgZGVmYXVsdEZvbnRTaXplXG5cdFx0XHRcdGNvbnN0IGZvbnROYW1lID0gZm9udFNpemVOb2RlLmF0dHIoJ2ZhY2UnKSB8fCBkZWZhdWx0Rm9udE5hbWVcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZm9udFNpemUnLCBmb250U2l6ZSwgJ2ZvbnROYW1lJywgZm9udE5hbWUsICdjb2xvcicsIGNvbG9yKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBmb250U2l6ZSwgZm9udE5hbWUgfSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGZvbnRTaXplOiBkZWZhdWx0Rm9udFNpemUsXG5cdFx0XHRcdFx0Zm9udE5hbWU6IGRlZmF1bHRGb250TmFtZSxcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGNvbnN0IGZvbnRDb2xvck5vZGUgPSAkKHNlbE9iai5hbmNob3JOb2RlKS5jbG9zZXN0KCdmb250W2NvbG9yXScpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdmb250Tm9kZScsIGZvbnROb2RlKVxuXHRcdFx0aWYgKGZvbnRDb2xvck5vZGUubGVuZ3RoID09IDEpIHtcblx0XHRcdFx0Y29uc3QgY29sb3IgPSBmb250Q29sb3JOb2RlLmF0dHIoJ2NvbG9yJykgfHwgZGVmYXVsdENvbG9yXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbnRTaXplJywgZm9udFNpemUsICdmb250TmFtZScsIGZvbnROYW1lLCAnY29sb3InLCBjb2xvcilcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY29sb3IgfSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGNvbG9yOiBkZWZhdWx0Q29sb3Jcblx0XHRcdFx0fSlcblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge05vZGV9IG5vZGUgXG5cdFx0ICogQHJldHVybnMgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gaGFzVGV4dENoaWxkTm9kZShub2RlKSB7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbShub2RlLmNoaWxkTm9kZXMpLmZpbHRlcihlbnRyeSA9PiBlbnRyeS5ub2RlVHlwZSA9PSBOb2RlLlRFWFRfTk9ERSkubGVuZ3RoICE9IDBcblx0XHR9XG5cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7Tm9kZX0gcm9vdE5vZGUgXG5cdFx0ICogQHBhcmFtIHtOb2RlfSBzdGFydE5vZGUgXG5cdFx0ICogQHBhcmFtIHtOb2RlfSBlbmROb2RlIFxuXHRcdCAqIEByZXR1cm5zIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldFRleHROb2Rlc0JldHdlZW4ocm9vdE5vZGUsIHN0YXJ0Tm9kZSwgZW5kTm9kZSkge1xuXHRcdFx0bGV0IHBhc3RTdGFydE5vZGUgPSBmYWxzZVxuXHRcdFx0bGV0IHJlYWNoZWRFbmROb2RlID0gZmFsc2Vcblx0XHRcdGNvbnN0IHRleHROb2RlcyA9IFtdXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcGFyYW0ge05vZGV9IG5vZGUgXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIGdldFRleHROb2Rlcyhub2RlKSB7XG5cdFx0XHRcdGlmIChub2RlID09IHN0YXJ0Tm9kZSkge1xuXHRcdFx0XHRcdHBhc3RTdGFydE5vZGUgPSB0cnVlXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobm9kZS5ub2RlVHlwZSA9PSBOb2RlLlRFWFRfTk9ERSkge1xuXHRcdFx0XHRcdGlmIChwYXN0U3RhcnROb2RlICYmICFyZWFjaGVkRW5kTm9kZSkge1xuXG5cdFx0XHRcdFx0XHRpZiAobm9kZS5wYXJlbnRFbGVtZW50LnRhZ05hbWUgPT0gJ1NQQU4nICYmIG5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnRhZ05hbWUgPT0gJ0RJVicgJiYgaGFzVGV4dENoaWxkTm9kZShub2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudCkpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgbGVuZ3RoID0gdGV4dE5vZGVzLmxlbmd0aFxuXHRcdFx0XHRcdFx0XHRpZiAobGVuZ3RoID4gMClcblx0XHRcdFx0XHRcdFx0XHR0ZXh0Tm9kZXNbbGVuZ3RoIC0gMV0gKz0gbm9kZS50ZXh0Q29udGVudFxuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGV4dE5vZGVzLnB1c2gobm9kZS50ZXh0Q29udGVudClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDAsIGxlbiA9IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7ICFyZWFjaGVkRW5kTm9kZSAmJiBpIDwgbGVuOyArK2kpIHtcblx0XHRcdFx0XHRcdGdldFRleHROb2Rlcyhub2RlLmNoaWxkTm9kZXNbaV0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG5vZGUgPT0gZW5kTm9kZSkge1xuXHRcdFx0XHRcdHJlYWNoZWRFbmROb2RlID0gdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGdldFRleHROb2Rlcyhyb290Tm9kZSlcblx0XHRcdHJldHVybiB0ZXh0Tm9kZXNcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZWxSYW5nZVRleHQoKSB7XG5cdFx0XHRjb25zdCByYW5nZSA9IGdldFJhbmdlKClcblx0XHRcdHJldHVybiBnZXRUZXh0Tm9kZXNCZXR3ZWVuKHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyLCByYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2UuZW5kQ29udGFpbmVyKVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7KCkgPT4gUHJvbWlzZTxzdHJpbmc+fSBjYmsgXG5cdFx0ICogQHJldHVybnMgXG5cdFx0ICovXG5cdFx0YXN5bmMgZnVuY3Rpb24gYWRkTGluayhjYmspIHtcblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXG5cdFx0XHRpZiAoIWlzRWRpdGFibGUoKSkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCByYW5nZSA9IGdldFJhbmdlKClcblx0XHRcdGlmICh0eXBlb2YgY2JrID09ICdmdW5jdGlvbicgJiYgY2JrLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdBc3luY0Z1bmN0aW9uJykge1xuXHRcdFx0XHRjb25zdCBocmVmID0gYXdhaXQgY2JrKClcblx0XHRcdFx0Y29uc29sZS5sb2coJ2hyZWYnLCBocmVmKVxuXHRcdFx0XHRpZiAoaHJlZiAhPSBudWxsKSB7XG5cdFx0XHRcdFx0c2VsT2JqLnJlbW92ZUFsbFJhbmdlcygpXG5cdFx0XHRcdFx0c2VsT2JqLmFkZFJhbmdlKHJhbmdlKVxuXG5cdFx0XHRcdFx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NyZWF0ZUxpbmsnLCBmYWxzZSwgaHJlZilcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdocmVmJywgaHJlZilcblxuXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UmFuZ2UoKSB7XG5cdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblx0XHRcdHJldHVybiBzZWxPYmouZ2V0UmFuZ2VBdCgwKVxuXHRcdH1cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBpc0VkaXRhYmxlKCkge1xuXG5cdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblx0XHRcdGxldCBub2RlID0gc2VsT2JqLmFuY2hvck5vZGVcblxuXHRcdFx0Y29uc3QgZWRpdGFibGUgPSBjdHJsLnNjb3BlLmVkaXRvci5nZXQoMClcblxuXHRcdFx0d2hpbGUgKG5vZGUgJiYgbm9kZSAhPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpIHtcblx0XHRcdFx0aWYgKG5vZGUgPT0gZWRpdGFibGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHR9XG5cblx0XHR0aGlzLmFkZExpbmsgPSBhZGRMaW5rXG5cblx0XHR0aGlzLmlzRWRpdGFibGUgPSBpc0VkaXRhYmxlXG5cblx0XHR0aGlzLmh0bWwgPSBmdW5jdGlvbiAoaHRtbFN0cmluZykge1xuXHRcdFx0aWYgKGh0bWxTdHJpbmcgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmZpbmQoJ3NwYW4nKS5yZW1vdmUoJy5pbnRlcmltJylcblx0XHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuZmluZCgnc3BhbicpLnJlbW92ZUF0dHIoJ3N0eWxlJylcblx0XHRcdFx0cmV0dXJuIGN0cmwuc2NvcGUuZWRpdG9yLmh0bWwoKVxuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5odG1sKGh0bWxTdHJpbmcpXG5cdFx0fVxuXG5cdFx0dGhpcy5sb2FkID0gZnVuY3Rpb24gKHVybCwgY2JrKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5zY29wZS5lZGl0b3IubG9hZCh1cmwsIGNiaylcblx0XHR9XG5cblx0XHR0aGlzLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIGN0cmwuc2NvcGUuZWRpdG9yLmh0bWwoKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2JyYWluanMuaHRtbGVkaXRvcjpzZXRWYWx1ZScsIHZhbHVlKVxuXHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuaHRtbCh2YWx1ZSlcblx0XHR9XG5cblx0XHR0aGlzLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuZ2V0KDApLmZvY3VzKClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpbnNlcnRJbWFnZSgpIHtcblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsT2JqJywgc2VsT2JqKVxuXG5cdFx0XHRpZiAoIWlzRWRpdGFibGUoKSkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHJhbmdlID0gc2VsT2JqLmdldFJhbmdlQXQoMClcblxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHR0aXRsZTogJ0luc2VydCBJbWFnZScsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uOiAnanBnLGpwZWcscG5nLGdpZidcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0ZmlsZWNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZGF0YSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBmaWxlTmFtZSwgcm9vdERpciB9ID0gZGF0YVxuXHRcdFx0XHRcdGxldCB1cmwgPSBmaWxlcy5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd1cmwnLCB1cmwpXG5cdFx0XHRcdFx0aWYgKHVzZURhdGFVcmxGb3JJbWcpIHtcblx0XHRcdFx0XHRcdHVybCA9IGF3YWl0ICQkLnVybC5pbWFnZVVybFRvRGF0YVVybCh1cmwpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN0IGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpXG5cdFx0XHRcdFx0aW1nLnNyYyA9IHVybFxuXHRcdFx0XHRcdHJhbmdlLmluc2VydE5vZGUoaW1nKVxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblxuXHRcdH1cblxuXHR9XG5cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWx0ZXJEbGcnLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXFxuICAgIDxsYWJlbD5HZW5yZTwvbGFiZWw+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZW5yZXN9XFxcIiBibi12YWw9XFxcInNlbGVjdGVkR2VucmVcXFwiIGJuLWV2ZW50PVxcXCJjb21ib2JveGNoYW5nZTogb25HZW5yZUNoYW5nZVxcXCIgbmFtZT1cXFwiZ2VucmVcXFwiPjwvZGl2PiAgICBcXG5cXG4gICAgPGxhYmVsPkFydGlzdDwvbGFiZWw+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBhcnRpc3RzfVxcXCIgYm4tdmFsPVxcXCJzZWxlY3RlZEFydGlzdFxcXCIgYm4tdXBkYXRlPVxcXCJjb21ib2JveGNoYW5nZVxcXCIgbmFtZT1cXFwiYXJ0aXN0XFxcIj48L2Rpdj4gICAgXFxuXFxuXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuICAgIGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuICAgIHByb3BzOiB7XG4gICAgICAgIGZpbGVzOiBbXSxcbiAgICAgICAgbXAzRmlsdGVyczogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuICAgICAgICAvKipAdHlwZSB7e1xuICAgICAgICAgKiBmaWxlczogQnJlaXpib3QuU2VydmljZXMuRmlsZXMuRmlsZUluZm9bXSwgXG4gICAgICAgICAqIG1wM0ZpbHRlcnM6IEJyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLk1wM0ZpbHRlcn19ICAqL1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGxldCB7IGZpbGVzLCBtcDNGaWx0ZXJzIH0gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgbXAzRmlsdGVycyA9IG1wM0ZpbHRlcnMgfHwge31cblxuXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkR2VucmUgPSBtcDNGaWx0ZXJzLmdlbnJlIHx8ICdBbGwnXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkQXJ0aXN0ID0gbXAzRmlsdGVycy5hcnRpc3QgfHwgJ0FsbCdcblxuICAgICAgICBjb25zb2xlLmxvZygnc2VsZWN0ZWRBcnRpc3QnLCBzZWxlY3RlZEFydGlzdClcbiAgICAgICAgY29uc29sZS5sb2coJ3NlbGVjdGVkR2VucmUnLCBzZWxlY3RlZEdlbnJlKVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEdlbnJlcygpIHtcbiAgICAgICAgICAgIGxldCBnZW5yZXMgPSB7fVxuXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGYubXAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZ2VucmUgfSA9IGYubXAzXG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW5yZSAmJiAhZ2VucmUuc3RhcnRzV2l0aCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2VucmVzW2dlbnJlXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbnJlc1tnZW5yZV0rK1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VucmVzW2dlbnJlXSA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGdlbnJlcyA9IE9iamVjdC5rZXlzKGdlbnJlcykuc29ydCgpLm1hcCgoZ2VucmUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYlRpdGxlID0gZ2VucmVzW2dlbnJlXVxuICAgICAgICAgICAgICAgIHJldHVybiAobmJUaXRsZSA9PSAxKSA/XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGdlbnJlLCBsYWJlbDogZ2VucmUgfSA6XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGdlbnJlLCBsYWJlbDogYCR7Z2VucmV9ICgke25iVGl0bGV9KWAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGdlbnJlcy51bnNoaWZ0KHsgdmFsdWU6ICdBbGwnLCBsYWJlbDogJ0FsbCcsIHN0eWxlOiAnZm9udC13ZWlnaHQ6IGJvbGQ7JyB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZ2VucmVzXG4gICAgICAgIH1cblxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEFydGlzdHMoZ2VucmUpIHtcbiAgICAgICAgICAgIGxldCBhcnRpc3RzID0ge31cblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmLm1wMyAmJiAoZ2VucmUgPT0gJ0FsbCcgfHwgZi5tcDMuZ2VucmUgPT0gZ2VucmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYXJ0aXN0IH0gPSBmLm1wM1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJ0aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJ0aXN0c1thcnRpc3RdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJ0aXN0c1thcnRpc3RdKytcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFydGlzdHNbYXJ0aXN0XSA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcnRpc3RzID0gT2JqZWN0LmtleXMoYXJ0aXN0cykuc29ydCgpLm1hcCgoYXJ0aXN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmJUaXRsZSA9IGFydGlzdHNbYXJ0aXN0XVxuICAgICAgICAgICAgICAgIHJldHVybiAobmJUaXRsZSA9PSAxKSA/XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGFydGlzdCwgbGFiZWw6IGFydGlzdCB9IDpcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogYXJ0aXN0LCBsYWJlbDogYCR7YXJ0aXN0fSAoJHtuYlRpdGxlfSlgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcnRpc3RzLnVuc2hpZnQoeyB2YWx1ZTogJ0FsbCcsIGxhYmVsOiAnQWxsJywgc3R5bGU6ICdmb250LXdlaWdodDogYm9sZDsnIH0pXG4gICAgICAgICAgICByZXR1cm4gYXJ0aXN0c1xuICAgICAgICB9XG5cblxuXG5cblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgYXJ0aXN0czogZ2V0QXJ0aXN0cyhzZWxlY3RlZEdlbnJlKSxcbiAgICAgICAgICAgICAgICBnZW5yZXM6IGdldEdlbnJlcygpLFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkQXJ0aXN0LFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkR2VucmVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvbkdlbnJlQ2hhbmdlOiBmdW5jdGlvbihldikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBnZW5yZSA9ICQodGhpcykuZ2V0VmFsdWUoKVxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdvbkdlbnJlQ2hhbmdlJywgZ2VucmUpXG4gICAgICAgICAgICAgICAgICAgIGN0cmwuc2V0RGF0YSh7YXJ0aXN0czogZ2V0QXJ0aXN0cyhnZW5yZSl9KVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYXBwbHk6IHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBcHBseScsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS1jaGVjaycsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxufSkiLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVjaG9vc2VyJywge1xuXG5cblx0dGVtcGxhdGU6IFwiPHA+U2VsZWN0IGEgZmlsZSBzeXN0ZW08L3A+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ib21lXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPllvdXIgaG9tZSBmaWxlczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0IGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPkZpbGVzIHNoYXJlZCBieSB5b3VyIGZyaWVuZHM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZmlsdGVyRXh0ZW5zaW9uOiAnJyxcblx0XHRnZXRNUDNJbmZvOiBmYWxzZSxcblx0XHRzaG93TXAzRmlsdGVyOiBmYWxzZVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gZmlsZXNTcnZcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBmaWxlc1Nydikge1xuXG5cdFx0Y29uc3QgeyBmaWx0ZXJFeHRlbnNpb24sIGdldE1QM0luZm8sIHNob3dNcDNGaWx0ZXIgfSA9IHRoaXMucHJvcHNcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuSW50ZXJmYWNlfSBpZmFjZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBvcGVuRmlsdGVyUGFnZShpZmFjZSkge1xuXHRcdFx0Y29uc3QgbXAzRmlsdGVycyA9IGlmYWNlLmdldE1QM0ZpbHRlcnMoKVxuXHRcdFx0Y29uc3QgZmlsZXMgPSBpZmFjZS5nZXRGaWxlcygpXG5cblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWx0ZXJEbGcnLCB7XG5cdFx0XHRcdHRpdGxlOiAnRmlsdGVyJyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRtcDNGaWx0ZXJzXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAoZmlsdGVycykge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlcnMnLCBmaWx0ZXJzKVxuXHRcdFx0XHRcdGlmYWNlLnNldE1QM0ZpbHRlcnMoZmlsdGVycylcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGZyaWVuZFVzZXIgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbGVQYWdlKHRpdGxlLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLlByb3BzfSAqL1xuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0XHRmcmllbmRVc2VyLFxuXHRcdFx0XHRcdGdldE1QM0luZm9cblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogXG5cdFx0XHRcdFx0ICogQHBhcmFtIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5FdmVudERhdGEuRmlsZUNsaWNrfSBpbmZvIFxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24gKGV2LCBpbmZvKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlY2xpY2snLCBpbmZvKVxuXHRcdFx0XHRcdFx0Y29uc3QgeyByb290RGlyLCBmaWxlTmFtZSwgbXAzIH0gPSBpbmZvXG5cdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBmaWxlc1Nydi5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2Uoe3VybCwgbXAzLCBmaWxlTmFtZX0pXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAodXJsKSB7XG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZSh1cmwpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChzaG93TXAzRmlsdGVyKSB7XG5cdFx0XHRcdG9wdGlvbnMuYnV0dG9ucyA9IHtcblx0XHRcdFx0XHRzZWFyY2g6IHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnRmlsdGVyJyxcblx0XHRcdFx0XHRcdGljb246ICdmYXMgZmEtZmlsdGVyJyxcblx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0b3BlbkZpbHRlclBhZ2UoZmlsZUN0cmwpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGNvbnN0IGZpbGVDdHJsID0gcGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywgb3B0aW9ucylcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0b3BlbkZpbGVQYWdlKCdIb21lIGZpbGVzJywgJycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2hhcmU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2hhcmVkIGZpbGVzJyxcblx0XHRcdFx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GcmllbmRzLlByb3BzfSAqL1xuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogZmFsc2Vcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0XHRcdCAqIFxuXHRcdFx0XHRcdFx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LkNvbnRyb2xzLkZyaWVuZHMuRXZlbnREYXRhLkZyaWVuZENsaWNrfSBkYXRhIFxuXHRcdFx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHRcdFx0ZnJpZW5kY2xpY2s6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VsZWN0RnJpZW5kJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB7IHVzZXJOYW1lIH0gPSBkYXRhXG5cdFx0XHRcdFx0XHRcdFx0b3BlbkZpbGVQYWdlKHVzZXJOYW1lLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGRhdGEpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4oZnVuY3Rpb24gKCkge1xuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHt7bmFtZTogc3RyaW5nLCBmb2xkZXI6IGJvb2xlYW59fSBmXG5cdCAqIEByZXR1cm5zIFxuXHQgKi9cblx0ZnVuY3Rpb24gZ2V0SWNvbkNsYXNzKGYpIHtcblx0XHRsZXQgeyBuYW1lLCBmb2xkZXIgfSA9IGZcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0aWYgKGZvbGRlcikge1xuXHRcdFx0cmV0dXJuICdmYS1mb2xkZXItb3BlbiB3My10ZXh0LWRlZXAtb3JhbmdlJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnBkZicpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtcGRmIHczLXRleHQtcmVkJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLmhkb2MnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLXdvcmQgdzMtdGV4dC1ibHVlJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLm9nZycpIHx8IG5hbWUuZW5kc1dpdGgoJy5tcDMnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLWF1ZGlvIHczLXRleHQtcHVycGxlJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLm1wNCcpIHx8IG5hbWUuZW5kc1dpdGgoJy53ZWJtJykgfHwgbmFtZS5lbmRzV2l0aCgnLjNncCcpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtdmlkZW8gdzMtdGV4dC1vcmFuZ2UnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1hcmNoaXZlIHczLXRleHQtYW1iZXInXG5cdFx0fVxuXG5cdFx0cmV0dXJuICdmYS1maWxlIHczLXRleHQtYmx1ZS1ncmV5J1xuXHR9XG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkZpbGVJbmZvW119IGZpbGVzIFxuXHQgKi9cblx0ZnVuY3Rpb24gc29ydEZpbGVzKGZpbGVzKSB7XG5cdFx0ZmlsZXMuc29ydCgoYSwgYikgPT4ge1xuXHRcdFx0aWYgKGEuZm9sZGVyICYmICFiLmZvbGRlcikge1xuXHRcdFx0XHRyZXR1cm4gLTFcblx0XHRcdH1cblx0XHRcdGlmICghYS5mb2xkZXIgJiYgYi5mb2xkZXIpIHtcblx0XHRcdFx0cmV0dXJuIDFcblx0XHRcdH1cblx0XHRcdHJldHVybiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpXG5cdFx0fSlcblx0fVxuXG5cdCQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWxlbGlzdCcsIHtcblx0XHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cdFx0cHJvcHM6IHtcblx0XHRcdHNlbGVjdGlvbkVuYWJsZWQ6IGZhbHNlLFxuXHRcdFx0ZmlsdGVyRXh0ZW5zaW9uOiB1bmRlZmluZWQsXG5cdFx0XHRnZXRNUDNJbmZvOiBmYWxzZSxcblx0XHRcdGZyaWVuZFVzZXI6ICcnLFxuXHRcdFx0bXAzRmlsdGVyczogbnVsbCxcblx0XHR9LFxuXG5cdFx0dGVtcGxhdGU6IFwiPGRpdiBibi1zaG93PVxcXCJsb2FkaW5nXFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0bG9hZGluZyAuLi5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJwYXRoUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5wYXRoSXRlbTogb25QYXRoSXRlbVxcXCIgYm4tc2hvdz1cXFwiIWxvYWRpbmdcXFwiPlxcblx0PGRpdiBibi1lYWNoPVxcXCJnZXRQYXRoXFxcIiBibi1pbmRleD1cXFwiaWR4XFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLWNoZXZyb24tcmlnaHRcXFwiIGJuLXNob3c9XFxcIiFpc0ZpcnN0XFxcIj48L2k+XFxuXHRcdDxzcGFuPlxcblx0XHRcdDxhIGNsYXNzPVxcXCJwYXRoSXRlbVxcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBocmVmPVxcXCIjXFxcIiBibi1zaG93PVxcXCIhaXNMYXN0XFxcIiBibi1kYXRhPVxcXCJ7aW5mbzogZ2V0UGF0aEluZm99XFxcIj48L2E+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBibi1zaG93PVxcXCJpc0xhc3RcXFwiIGNsYXNzPVxcXCJsYXN0SXRlbVxcXCI+PC9zcGFuPlxcblxcblx0XHQ8L3NwYW4+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1ob3ZlcmFibGUgdzMtc21hbGxcXFwiPlxcblx0XHQ8dGhlYWQ+XFxuXHRcdFx0PHRyIGJuLWh0bWw9XFxcImdldEhlYWRlclxcXCI+PC90cj5cXG5cdFx0PC90aGVhZD5cXG5cdFx0PHRib2R5IGJuLWVhY2g9XFxcImdldEZpbGVzXFxcIiBibi1pdGVyPVxcXCJmXFxcIiBibi1sYXp6eT1cXFwiMTBcXFwiIGJuLWJpbmQ9XFxcImZpbGVzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb25JdGVtQ2xpY2tcXFwiPlxcblx0XHRcdDx0ciBjbGFzcz1cXFwiaXRlbVxcXCIgYm4taHRtbD1cXFwiZ2V0SXRlbVxcXCI+PC90cj5cXG5cdFx0PC90Ym9keT5cXG5cdDwvdGFibGU+XFxuXFxuPC9kaXY+XFxuXFxuXCIsXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0geyp9IGVsdCBcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gc3J2RmlsZXMgXG5cdFx0ICovXG5cdFx0aW5pdDogZnVuY3Rpb24gKGVsdCwgc3J2RmlsZXMpIHtcblxuXG5cdFx0XHQvKipAdHlwZSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuUHJvcHN9ICovXG5cdFx0XHRsZXQge1xuXHRcdFx0XHRzZWxlY3Rpb25FbmFibGVkLFxuXHRcdFx0XHRmaWx0ZXJFeHRlbnNpb24sXG5cdFx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRcdGdldE1QM0luZm8sXG5cdFx0XHRcdG1wM0ZpbHRlcnMsXG5cdFx0XHR9ID0gdGhpcy5wcm9wc1xuXG5cdFx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdHNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdFx0XHRtcDNGaWx0ZXJzLFxuXG5cdFx0XHRcdFx0Z2V0SGVhZGVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gW11cblx0XHRcdFx0XHRcdGRhdGEucHVzaCgnJylcblx0XHRcdFx0XHRcdGlmIChnZXRNUDNJbmZvKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnVGl0bGUnKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ0FydGlzdCcpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnRHVyYXRpb24nKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ0JQTScpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdOYW1lJylcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdTaXplJylcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdMYXN0IE1vZGlmJylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBkYXRhLm1hcCgoZSkgPT4gYDx0aD4ke2V9PC90aD5gKS5qb2luKCcnKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0SXRlbTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gW11cblx0XHRcdFx0XHRcdGRhdGEucHVzaChgPGkgY2xhc3M9XCJmYSBmYS0yeCAke2dldEljb25DbGFzcyhzY29wZS5mKX1cIj48L2k+YClcblx0XHRcdFx0XHRcdGlmIChnZXRNUDNJbmZvKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCh0aGlzLmdldFRpdGxlKHNjb3BlKSlcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHRoaXMuZ2V0QXJ0aXN0KHNjb3BlKSlcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHRoaXMuZ2V0RHVyYXRpb24oc2NvcGUpKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2godGhpcy5nZXRCUE0oc2NvcGUpKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaChzY29wZS5mLm5hbWUpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCh0aGlzLmdldFNpemUoc2NvcGUpKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2godGhpcy5nZXREYXRlKHNjb3BlKSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBkYXRhLm1hcCgoZSkgPT4gYDx0ZD4ke2V9PC90ZD5gKS5qb2luKCcnKVxuXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRJY29uQ2xhc3M6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHsgY2xhc3M6ICdmYSBmYS1sZyAnICsgZ2V0SWNvbkNsYXNzKHNjb3BlLmYpIH1cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RHVyYXRpb246IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7IG1wMyB9ID0gc2NvcGUuZlxuXHRcdFx0XHRcdFx0aWYgKG1wMyAhPSB1bmRlZmluZWQgJiYgbXAzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJCQubWVkaWEuZ2V0Rm9ybWF0ZWRUaW1lKG1wMy5sZW5ndGgpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJydcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0QlBNOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgeyBtcDMgfSA9IHNjb3BlLmZcblx0XHRcdFx0XHRcdGlmIChtcDMgIT0gdW5kZWZpbmVkICYmIG1wMy5icG0pIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG1wMy5icG1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJ1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0sXHRcdFx0XHRcdFxuXG5cdFx0XHRcdFx0Z2V0QXJ0aXN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbXAzIH0gPSBzY29wZS5mXG5cdFx0XHRcdFx0XHRpZiAobXAzICE9IHVuZGVmaW5lZCAmJiBtcDMuYXJ0aXN0KSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBtcDMuYXJ0aXN0XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0VGl0bGU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgeyBtcDMsIGZvbGRlciwgbmFtZSB9ID0gc2NvcGUuZlxuXHRcdFx0XHRcdFx0aWYgKGZvbGRlcikge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbmFtZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG1wMyAhPSB1bmRlZmluZWQgJiYgbXAzLnRpdGxlKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBtcDMudGl0bGVcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRpc0luRmlsdGVyOiBmdW5jdGlvbiAobXAzSW5mbykge1xuXHRcdFx0XHRcdFx0dmFyIHJldCA9IHRydWVcblx0XHRcdFx0XHRcdGZvciAobGV0IGYgaW4gdGhpcy5tcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlcicsIGYpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gbXAzSW5mb1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd2YWx1ZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWx0ZXJWYWx1ZSA9IHRoaXMubXAzRmlsdGVyc1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXJWYWx1ZScsIGZpbHRlclZhbHVlKVxuXHRcdFx0XHRcdFx0XHRpZiAoZmlsdGVyVmFsdWUgIT0gJ0FsbCcpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQgJj0gKGZpbHRlclZhbHVlID09PSB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRGaWxlczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMubXAzRmlsdGVycyA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlc1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXMuZmlsdGVyKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmLmZvbGRlciB8fCAoZi5tcDMgJiYgZi5tcDMgJiYgdGhpcy5pc0luRmlsdGVyKGYubXAzKSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB0YWIgPSAoJy9ob21lJyArIHRoaXMucm9vdERpcikuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdFx0dGFiLnNoaWZ0KClcblx0XHRcdFx0XHRcdHRhYi5wb3AoKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRhYlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNMYXN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gdGhpcy5nZXRQYXRoKCkubGVuZ3RoIC0gMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNGaXJzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFBhdGhJbmZvOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmdldFBhdGgoKS5zbGljZSgxLCBzY29wZS5pZHggKyAxKS5qb2luKCcvJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuZi5mb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLmYuc2l6ZVxuXHRcdFx0XHRcdFx0bGV0IHVuaXQgPSAnb2N0ZXRzJ1xuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNpemUgPSBNYXRoLmZsb29yKHNpemUgKiAxMCkgLyAxMFxuXHRcdFx0XHRcdFx0cmV0dXJuIHNpemUgKyAnICcgKyB1bml0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldERhdGU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLmYubXRpbWUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdG9uUGF0aEl0ZW06IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGF0aEl0ZW0gPSAkKHRoaXMpLmRhdGEoJ2luZm8nKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QYXRoSXRlbScsIHBhdGhJdGVtKVxuXHRcdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdFx0Y29uc3QgbmV3RGlyID0gcGF0aEl0ZW0gPT0gJycgPyAnLycgOiAnLycgKyBwYXRoSXRlbSArICcvJ1xuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2RpcmNoYW5nZScsIHsgbmV3RGlyIH0pXG5cblxuXHRcdFx0XHRcdFx0bG9hZERhdGEobmV3RGlyKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdFx0XHRpZiAoaW5mby5mb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgZGlyTmFtZSA9IGluZm8ubmFtZVxuXHRcdFx0XHRcdFx0XHRjb25zdCBuZXdEaXIgPSBjdHJsLm1vZGVsLnJvb3REaXIgKyBkaXJOYW1lICsgJy8nXG5cdFx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdkaXJjaGFuZ2UnLCB7IG5ld0RpciB9KVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YShuZXdEaXIpXG5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpZiAoc2VsZWN0aW9uRW5hYmxlZCkge1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykuY2xvc2VzdCgndGJvZHknKS5maW5kKCcuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZU5hbWU6IGluZm8ubmFtZSxcblx0XHRcdFx0XHRcdFx0XHRyb290RGlyOiBjdHJsLm1vZGVsLnJvb3REaXIsXG5cdFx0XHRcdFx0XHRcdFx0aXNJbWFnZTogaW5mby5pc0ltYWdlLFxuXHRcdFx0XHRcdFx0XHRcdG1wMzogaW5mby5tcDNcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmaWxlY2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHQvKipAdHlwZSB7SlF1ZXJ5fSAqL1xuXHRcdFx0Y29uc3QgZmlsZXMgPSBjdHJsLnNjb3BlLmZpbGVzXG5cblx0XHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWREYXRhKHJvb3REaXIsIHJlc2V0RmlsdGVycykge1xuXHRcdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRyb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbG9hZERhdGEnLCByb290RGlyKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBsb2FkaW5nOiB0cnVlIH0pXG5cdFx0XHRcdGxldCBmaWxlcyA9IGF3YWl0IHNydkZpbGVzLmxpc3Qocm9vdERpciwgeyBmaWx0ZXJFeHRlbnNpb24sIGdldE1QM0luZm8gfSwgZnJpZW5kVXNlcilcblx0XHRcdFx0aWYgKGdldE1QM0luZm8pIHtcblx0XHRcdFx0XHRmaWxlcyA9IGZpbGVzLmZpbHRlcigoZikgPT4gZi5mb2xkZXIgfHwgKGYubXAzICE9IHVuZGVmaW5lZCAmJiBmLm1wMy50aXRsZSkpXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblxuXHRcdFx0XHRzb3J0RmlsZXMoZmlsZXMpXG5cblx0XHRcdFx0aWYgKHJlc2V0RmlsdGVycyAhPT0gZmFsc2UpIHtcblx0XHRcdFx0XHRjdHJsLm1vZGVsLm1wM0ZpbHRlcnMgPSBudWxsXG5cdFx0XHRcdH1cblxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0ZmlsZXMsXG5cdFx0XHRcdFx0cm9vdERpclxuXHRcdFx0XHR9KVxuXG5cdFx0XHRcdGlmIChzZWxlY3Rpb25FbmFibGVkKSB7XG5cdFx0XHRcdFx0Y3RybC5zY29wZS5maWxlcy5maW5kKCcuaXRlbScpLmVxKDApLmFkZENsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0bG9hZERhdGEoKVxuXG5cblx0XHRcdHRoaXMuZ2V0Um9vdERpciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmVudGVyU2VsRm9sZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IHNlbEVsdCA9IGZpbGVzLmZpbmQoJy5hY3RpdmUnKVxuXHRcdFx0XHRjb25zdCBpZHggPSBzZWxFbHQuaW5kZXgoKVxuXHRcdFx0XHRjb25zb2xlLmxvZygnZW50ZXJTZWxGb2xkZXInLCBpZHgpXG5cdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXHRcdFx0XHRjb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdGlmIChpbmZvLmZvbGRlcikge1xuXHRcdFx0XHRcdGNvbnN0IGRpck5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHRjb25zdCBuZXdEaXIgPSBjdHJsLm1vZGVsLnJvb3REaXIgKyBkaXJOYW1lICsgJy8nXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2RpcmNoYW5nZScsIHsgbmV3RGlyIH0pXG5cdFx0XHRcdFx0bG9hZERhdGEobmV3RGlyKVxuXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNlbFVwID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBzZWxFbHQgPSBmaWxlcy5maW5kKCcuYWN0aXZlJylcblx0XHRcdFx0Y29uc3QgaWR4ID0gc2VsRWx0LmluZGV4KClcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsVXAnLCBpZHgpXG5cdFx0XHRcdGlmIChpZHggPiAwKSB7XG5cdFx0XHRcdFx0c2VsRWx0LnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHRcdGNvbnN0IGl0ZW1zID0gZmlsZXMuZmluZCgnLml0ZW0nKVxuXHRcdFx0XHRcdGl0ZW1zLmVxKGlkeCAtIDEpLmFkZENsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHRcdGlmIChpZHggLTEgPiAwKSB7XG5cdFx0XHRcdFx0XHRpdGVtcy5lcShpZHggLSAyKS5nZXQoMCkuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0aXRlbXMuZXEoaWR4IC0gMSkuZ2V0KDApLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL3NlbEVsdC5nZXQoMCkuc2Nyb2xsSW50b1ZpZXcoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VsRG93biA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsRWx0ID0gZmlsZXMuZmluZCgnLmFjdGl2ZScpXG5cdFx0XHRcdGNvbnN0IGlkeCA9IHNlbEVsdC5pbmRleCgpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbERvd24nLCBpZHgpXG5cdFx0XHRcdGlmIChpZHggPCBjdHJsLm1vZGVsLmZpbGVzLmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0XHRzZWxFbHQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdFx0ZmlsZXMuZmluZCgnLml0ZW0nKS5lcShpZHggKyAxKS5hZGRDbGFzcygnYWN0aXZlJykuZ2V0KDApLnNjcm9sbEludG9WaWV3KGZhbHNlKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0U2VsRmlsZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3QgaWR4ID0gY3RybC5zY29wZS5maWxlcy5maW5kKCcuYWN0aXZlJykuaW5kZXgoKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpZHgnLCBpZHgpXG5cdFx0XHRcdGlmIChpZHggPCAwKSByZXR1cm4gbnVsbFxuXHRcdFx0XHRjb25zdCB7IG1wMywgbmFtZSB9ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblx0XHRcdFx0Y29uc3QgdXJsID0gc3J2RmlsZXMuZmlsZVVybChjdHJsLm1vZGVsLnJvb3REaXIgKyBuYW1lLCBmcmllbmRVc2VyKVxuXHRcdFx0XHRyZXR1cm4geyBuYW1lLCBtcDMsIHVybCB9XG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRNUDNGaWx0ZXJzID0gZnVuY3Rpb24gKG1wM0ZpbHRlcnMpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbXAzRmlsdGVycyB9KVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLm1wM0ZpbHRlcnNcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG59KSgpO1xuIiwiLy9AdHMtY2hlY2tcbihmdW5jdGlvbiAoKSB7XG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcblx0ICogQHJldHVybnMgXG5cdCAqL1xuXHRmdW5jdGlvbiBnZXRJY29uQ2xhc3MobmFtZSkge1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKClcblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnBkZicpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhIGZhLWZpbGUtcGRmIHczLXRleHQtcmVkJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLmhkb2MnKSkge1xuXHRcdFx0cmV0dXJuICdmYSBmYS1maWxlLXdvcmQgdzMtdGV4dC1ibHVlJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLm9nZycpIHx8IG5hbWUuZW5kc1dpdGgoJy5tcDMnKSkge1xuXHRcdFx0cmV0dXJuICdmYSBmYS1maWxlLWF1ZGlvIHczLXRleHQtcHVycGxlJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLm1wNCcpIHx8IG5hbWUuZW5kc1dpdGgoJy53ZWJtJykgfHwgbmFtZS5lbmRzV2l0aCgnLjNncCcpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhIGZhLWZpbGUtdmlkZW8gdzMtdGV4dC1vcmFuZ2UnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcblx0XHRcdHJldHVybiAnZmEgZmEtZmlsZS1hcmNoaXZlIHczLXRleHQtYW1iZXInXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuanMnKSkge1xuXHRcdFx0cmV0dXJuICdmYWIgZmEtanMgdzMtdGV4dC15ZWxsb3cnXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuaHRtbCcpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhYiBmYS1odG1sNSB3My10ZXh0LWJsdWUnXG5cdFx0fVx0XG5cdFx0cmV0dXJuICdmYSBmYS1maWxlIHczLXRleHQtYmx1ZS1ncmV5J1xuXHR9XG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkZpbGVJbmZvW119IGZpbGVzIFxuXHQgKi9cblx0ZnVuY3Rpb24gc29ydEZpbGVzKGZpbGVzKSB7XG5cdFx0ZmlsZXMuc29ydCgoYSwgYikgPT4ge1xuXHRcdFx0aWYgKGEuZm9sZGVyICYmICFiLmZvbGRlcikge1xuXHRcdFx0XHRyZXR1cm4gLTFcblx0XHRcdH1cblx0XHRcdGlmICghYS5mb2xkZXIgJiYgYi5mb2xkZXIpIHtcblx0XHRcdFx0cmV0dXJuIDFcblx0XHRcdH1cblx0XHRcdHJldHVybiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpXG5cdFx0fSlcblx0fVxuXG5cdCQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cdFx0cHJvcHM6IHtcblx0XHRcdHNlbGVjdGlvbkVuYWJsZWQ6IGZhbHNlLFxuXHRcdFx0Zm9sZGVyU2VsZWN0aW9uRW5hYmxlZDogdHJ1ZSxcblx0XHRcdGltYWdlT25seTogZmFsc2UsXG5cdFx0XHRmaWx0ZXJFeHRlbnNpb246IHVuZGVmaW5lZCxcblx0XHRcdGdldE1QM0luZm86IGZhbHNlLFxuXHRcdFx0ZnJpZW5kVXNlcjogJycsXG5cdFx0XHRtcDNGaWx0ZXJzOiBudWxsLFxuXHRcdFx0bWVudUl0ZW1zOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4ge31cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0dGVtcGxhdGU6IFwiXFxuPGRpdiBibi10ZXh0PVxcXCJpbmZvXFxcIiBibi1iaW5kPVxcXCJpbmZvXFxcIiBjbGFzcz1cXFwiaW5mb1xcXCI+PC9kaXY+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJsb2FkaW5nXFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0bG9hZGluZyAuLi5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJwYXRoUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5wYXRoSXRlbTogb25QYXRoSXRlbVxcXCIgYm4tc2hvdz1cXFwiIWxvYWRpbmdcXFwiPlxcblx0PGRpdiBibi1lYWNoPVxcXCJnZXRQYXRoXFxcIiBibi1pbmRleD1cXFwiaWR4XFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLWNoZXZyb24tcmlnaHRcXFwiIGJuLXNob3c9XFxcIiFpc0ZpcnN0XFxcIj48L2k+XFxuXHRcdDxzcGFuPlxcblx0XHRcdDxhIGNsYXNzPVxcXCJwYXRoSXRlbVxcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBocmVmPVxcXCIjXFxcIiBibi1zaG93PVxcXCIhaXNMYXN0XFxcIiBibi1kYXRhPVxcXCJ7aW5mbzogZ2V0UGF0aEluZm99XFxcIj48L2E+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBibi1zaG93PVxcXCJpc0xhc3RcXFwiIGNsYXNzPVxcXCJsYXN0SXRlbVxcXCI+PC9zcGFuPlxcblxcblx0XHQ8L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXFxuXHQ8ZGl2IFxcblx0XHRibi1lYWNoPVxcXCJnZXRGaWxlc1xcXCIgXFxuXHRcdGJuLWl0ZXI9XFxcImZcXFwiIFxcblx0XHRibi1sYXp6eT1cXFwiMTBcXFwiIFxcblx0XHRibi1iaW5kPVxcXCJmaWxlc1xcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay5mb2xkZXI6IG9uRm9sZGVyQ2xpY2ssIGNsaWNrLmNoZWNrOiBvbkNoZWNrQ2xpY2ssIGNsaWNrLmZpbGU6IG9uRmlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aHVtYm5haWw6IG9uQ29udGV4dE1lbnVcXFwiXFxuXHRcdGNsYXNzPVxcXCJjb250YWluZXJcXFwiXFxuXHQ+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbCB3My1jYXJkLTJcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogZ2V0SXRlbXN9XFxcIj5cXG5cXG5cdFx0XHQ8c3BhbiBibi1pZj1cXFwiaWYxXFxcIj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tc2hvdz1cXFwic2hvd0NoZWNrU2VsZWN0aW9uXFxcIiBjbGFzcz1cXFwiY2hlY2sgdzMtY2hlY2tcXFwiXFxuXHRcdFx0XHRcdGJuLXByb3A9XFxcIntjaGVja2VkOiAkc2NvcGUuZi5jaGVja2VkfVxcXCI+XFxuXHRcdFx0PC9zcGFuPlxcblx0XHRcdDxkaXYgYm4taWY9XFxcIiRzY29wZS5mLmZvbGRlclxcXCIgY2xhc3M9XFxcImZvbGRlciBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtNHggZmEtZm9sZGVyLW9wZW4gdzMtdGV4dC1kZWVwLW9yYW5nZVxcXCI+PC9pPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCIgYm4taWY9XFxcImlmMVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1pZj1cXFwiaWYyXFxcIiBjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNsYXNzMX1cXFwiPjwvaT5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PGRpdiBibi1pZj1cXFwiaXNNUDNcXFwiIGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2xhc3MxfVxcXCI+PC9pPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PGRpdj5UaXRsZTombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm1wMy50aXRsZVxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXFxuXHRcdFx0XHRcdDxkaXY+QXJ0aXN0OiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubXAzLmFydGlzdFxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXHRcdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzR2VucmVcXFwiPkdlbnJlOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubXAzLmdlbnJlXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCJnZXREdXJhdGlvblxcXCI+RHVyYXRpb246Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCJnZXREdXJhdGlvblxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXHRcdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzWWVhclxcXCI+IFllYXI6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCJnZXRZZWFyXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHRcdDxkaXYgYm4taWY9XFxcImlmM1xcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiBnZXRUaHVtYm5haWxVcmx9XFxcIj5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREaW1lbnNpb25cXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcblxcblxcbjwvZGl2PlwiLFxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHsqfSBlbHQgXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IHNydkZpbGVzIFxuXHRcdCAqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRcdGNvbnN0IHRodW1ibmFpbFNpemUgPSAnMTAweD8nXG5cblx0XHRcdGxldCBzZWxlY3RlZCA9IGZhbHNlXG5cblx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5Qcm9wc30gKi9cblx0XHRcdGxldCB7XG5cdFx0XHRcdHNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdGZvbGRlclNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0aW1hZ2VPbmx5LFxuXHRcdFx0XHRnZXRNUDNJbmZvLFxuXHRcdFx0XHRtcDNGaWx0ZXJzLFx0XHRcdFx0XG5cdFx0XHRcdG1lbnVJdGVtc1xuXHRcdFx0fSA9IHRoaXMucHJvcHMgXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0Z2V0SXRlbXM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1lbnVJdGVtcyhzY29wZS5mKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0c2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0XHRmb2xkZXJTZWxlY3Rpb25FbmFibGVkLFxuXHRcdFx0XHRcdHJvb3REaXI6ICcvJyxcblx0XHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdFx0bXAzRmlsdGVycyxcblx0XHRcdFx0XHRpbmZvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRsZXQgbmJGaWxlcyA9IDBcblx0XHRcdFx0XHRcdGxldCBuYkZvbGRlcnMgPSAwXG5cdFx0XHRcdFx0XHR0aGlzLmdldEZpbGVzKCkuZm9yRWFjaCgoaSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRpZiAoaS5mb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoaS5uYW1lICE9ICcuLicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdG5iRm9sZGVycysrXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdG5iRmlsZXMrK1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHRsZXQgcmV0ID0gW11cblx0XHRcdFx0XHRcdGlmIChuYkZvbGRlcnMgPT0gMSkge1xuXHRcdFx0XHRcdFx0XHRyZXQucHVzaChgJHtuYkZvbGRlcnN9IGZvbGRlcmApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobmJGb2xkZXJzID4gMSkge1xuXHRcdFx0XHRcdFx0XHRyZXQucHVzaChgJHtuYkZvbGRlcnN9IGZvbGRlcnNgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG5iRmlsZXMgPT0gMSkge1xuXHRcdFx0XHRcdFx0XHRyZXQucHVzaChgJHtuYkZpbGVzfSBmaWxlYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChuYkZpbGVzID4gMSkge1xuXHRcdFx0XHRcdFx0XHRyZXQucHVzaChgJHtuYkZpbGVzfSBmaWxlc2ApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0LmpvaW4oJyAvICcpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGlzSW5GaWx0ZXI6IGZ1bmN0aW9uIChtcDNJbmZvKSB7XG5cdFx0XHRcdFx0XHR2YXIgcmV0ID0gdHJ1ZVxuXHRcdFx0XHRcdFx0Zm9yIChsZXQgZiBpbiB0aGlzLm1wM0ZpbHRlcnMpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVyJywgZilcblx0XHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSBtcDNJbmZvW2ZdXG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3ZhbHVlJywgdmFsdWUpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGZpbHRlclZhbHVlID0gdGhpcy5tcDNGaWx0ZXJzW2ZdXG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlclZhbHVlJywgZmlsdGVyVmFsdWUpXG5cdFx0XHRcdFx0XHRcdGlmIChmaWx0ZXJWYWx1ZSAhPSAnQWxsJykge1xuXHRcdFx0XHRcdFx0XHRcdHJldCAmPSAoZmlsdGVyVmFsdWUgPT09IHZhbHVlKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXQnLCByZXQpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldEZpbGVzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5tcDNGaWx0ZXJzID09PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGVzXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlcy5maWx0ZXIoKGYpID0+IHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGYuZm9sZGVyIHx8IChmLm1wMyAmJiBmLm1wMyAmJiB0aGlzLmlzSW5GaWx0ZXIoZi5tcDMpKVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzTVAzOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBnZXRNUDNJbmZvICYmIHNjb3BlLmYubXAzICE9IHVuZGVmaW5lZCAmJiBzY29wZS5mLm1wMy50aXRsZSAhPSB1bmRlZmluZWQgJiZcblx0XHRcdFx0XHRcdFx0c2NvcGUuZi5tcDMudGl0bGUgIT0gJydcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFBhdGg6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHRhYiA9ICgnL2hvbWUnICsgdGhpcy5yb290RGlyKS5zcGxpdCgnLycpXG5cdFx0XHRcdFx0XHR0YWIuc2hpZnQoKVxuXHRcdFx0XHRcdFx0dGFiLnBvcCgpXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGFiXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc0xhc3Q6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSB0aGlzLmdldFBhdGgoKS5sZW5ndGggLSAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc0ZpcnN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0UGF0aEluZm86IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0UGF0aCgpLnNsaWNlKDEsIHNjb3BlLmlkeCArIDEpLmpvaW4oJy8nKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRoYXNHZW5yZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQgeyBnZW5yZSB9ID0gc2NvcGUuZi5tcDNcblx0XHRcdFx0XHRcdHJldHVybiBnZW5yZSAhPSB1bmRlZmluZWQgJiYgZ2VucmUgIT0gJycgJiYgIWdlbnJlLnN0YXJ0c1dpdGgoJygnKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRoYXNZZWFyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGxldCB7IHllYXIgfSA9IHNjb3BlLmYubXAzXG5cdFx0XHRcdFx0XHRyZXR1cm4geWVhciAhPSB1bmRlZmluZWQgJiYgeWVhciAhPSAnJ1xuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRZZWFyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwYXJzZUludChzY29wZS5mLm1wMy55ZWFyKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRUaHVtYm5haWxVcmw6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNydkZpbGVzLmZpbGVUaHVtYm5haWxVcmwodGhpcy5yb290RGlyICsgc2NvcGUuZi5uYW1lLCB0aHVtYm5haWxTaXplLCBmcmllbmRVc2VyKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aWYxOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5mLm5hbWUgIT0gJy4uJ1xuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRzaG93Q2hlY2tTZWxlY3Rpb246IGZ1bmN0aW9uKHNjb3BlKVx0e1xuXHRcdFx0XHRcdFx0bGV0IHJldCA9IHRoaXMuc2VsZWN0aW9uRW5hYmxlZFxuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLmYuZm9sZGVyKSAgeyByZXQgJj0gdGhpcy5mb2xkZXJTZWxlY3Rpb25FbmFibGVkfVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRpZjI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiAhc2NvcGUuZi5pc0ltYWdlICYmICF0aGlzLmlzTVAzKHNjb3BlKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aWYzOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAhc2NvcGUuZi5mb2xkZXIgJiYgc2NvcGUuZi5pc0ltYWdlXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRjbGFzczE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGBmYS00eCAke2dldEljb25DbGFzcyhzY29wZS5mLm5hbWUpfWBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0bGV0IHNpemUgPSBzY29wZS5mLnNpemVcblx0XHRcdFx0XHRcdGxldCB1bml0ID0gJ29jdGV0cydcblx0XHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0XHR1bml0ID0gJ0tvJ1xuXHRcdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnTW8nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzaXplID0gTWF0aC5mbG9vcihzaXplICogMTApIC8gMTBcblx0XHRcdFx0XHRcdHJldHVybiAnU2l6ZTogJyArIHNpemUgKyAnICcgKyB1bml0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldERpbWVuc2lvbjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkID0gc2NvcGUuZi5kaW1lbnNpb25cblx0XHRcdFx0XHRcdHJldHVybiBgRGltZW5zaW9uOiAke2Qud2lkdGh9eCR7ZC5oZWlnaHR9YFxuXHRcdFx0XHRcdH0sXG5cblxuXHRcdFx0XHRcdGdldERhdGU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKHNjb3BlLmYubXRpbWUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXG5cdFx0XHRcdFx0XHRyZXR1cm4gJ0xhc3QgTW9kaWY6ICcgKyBkYXRlXG5cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RHVyYXRpb246IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuZi5tcDMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAkJC5tZWRpYS5nZXRGb3JtYXRlZFRpbWUoc2NvcGUuZi5tcDMubGVuZ3RoKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHRcdFx0fVxuXG5cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRvblBhdGhJdGVtOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBhdGhJdGVtID0gJCh0aGlzKS5kYXRhKCdpbmZvJylcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUGF0aEl0ZW0nLCBwYXRoSXRlbSlcblx0XHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRcdGNvbnN0IG5ld0RpciA9IHBhdGhJdGVtID09ICcnID8gJy8nIDogJy8nICsgcGF0aEl0ZW0gKyAnLydcblxuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdkaXJjaGFuZ2UnLCB7IG5ld0RpciB9KVxuXG5cblx0XHRcdFx0XHRcdGxvYWREYXRhKG5ld0Rpcilcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7IGNtZCB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgeyBuYW1lIH0gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXG5cdFx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignY29udGV4dG1lbnVJdGVtJywgeyBjbWQsIGlkeCwgbmFtZSwgcm9vdERpciB9KVxuXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRcdFx0XHRmaWxlTmFtZTogaW5mby5uYW1lLFxuXHRcdFx0XHRcdFx0XHRyb290RGlyOiBjdHJsLm1vZGVsLnJvb3REaXIsXG5cdFx0XHRcdFx0XHRcdGlzSW1hZ2U6IGluZm8uaXNJbWFnZSxcblx0XHRcdFx0XHRcdFx0bXAzOiBpbmZvLm1wM1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZmlsZWNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uQ2hlY2tDbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblx0XHRcdFx0XHRcdGluZm8uY2hlY2tlZCA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ3NlbGNoYW5nZScsIHsgaXNTaGFyZVNlbGVjdGVkOiBpc1NoYXJlU2VsZWN0ZWQoKSB9KVxuXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkZvbGRlckNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cblx0XHRcdFx0XHRcdGNvbnN0IGRpck5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHRcdGNvbnN0IG5ld0RpciA9IGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLydcblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZGlyY2hhbmdlJywgeyBuZXdEaXIgfSlcblx0XHRcdFx0XHRcdGxvYWREYXRhKG5ld0Rpcilcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gbG9hZERhdGEocm9vdERpciwgcmVzZXRGaWx0ZXJzKSB7XG5cdFx0XHRcdGlmIChyb290RGlyID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGxvYWRpbmc6IHRydWUgfSlcblx0XHRcdFx0Y29uc3QgZmlsZXMgPSBhd2FpdCBzcnZGaWxlcy5saXN0KHJvb3REaXIsIHsgZmlsdGVyRXh0ZW5zaW9uLCBpbWFnZU9ubHksIGdldE1QM0luZm8gfSwgZnJpZW5kVXNlcilcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblxuXHRcdFx0XHRzb3J0RmlsZXMoZmlsZXMpXG5cblx0XHRcdFx0aWYgKHJlc2V0RmlsdGVycyAhPT0gZmFsc2UpIHtcblx0XHRcdFx0XHRjdHJsLm1vZGVsLm1wM0ZpbHRlcnMgPSBudWxsXG5cdFx0XHRcdH1cblxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0ZmlsZXMsXG5cdFx0XHRcdFx0cm9vdERpcixcblx0XHRcdFx0XHRuYlNlbGVjdGlvbjogMFxuXHRcdFx0XHR9KVxuXG5cdFx0XHR9XG5cblx0XHRcdGxvYWREYXRhKClcblxuXHRcdFx0ZnVuY3Rpb24gaXNTaGFyZVNlbGVjdGVkKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5yb290RGlyID09ICcvJyAmJlxuXHRcdFx0XHRcdChjdHJsLm1vZGVsLmZpbGVzLmZpbmRJbmRleCgoZikgPT4gZi5uYW1lID09ICdzaGFyZScgJiYgZi5mb2xkZXIgJiYgZi5jaGVja2VkKSAhPSAtMSlcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldFNlbEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBzZWxGaWxlcyA9IFtdXG5cdFx0XHRcdGN0cmwubW9kZWwuZmlsZXMuZm9yRWFjaCgoZiwgaWR4KSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgeyBuYW1lLCBjaGVja2VkIH0gPSBmXG5cdFx0XHRcdFx0aWYgKGNoZWNrZWQgPT09IHRydWUgJiYgbmFtZSAhPSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRzZWxGaWxlcy5wdXNoKHsgZmlsZU5hbWU6IGN0cmwubW9kZWwucm9vdERpciArIG5hbWUsIGlkeCB9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsRmlsZXMnLCBzZWxGaWxlcylcdFxuXHRcdFx0XHRyZXR1cm4gc2VsRmlsZXNcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRTZWxGaWxlTmFtZXMgPSAoKSA9PiB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFNlbEZpbGVzKCkubWFwKChmKSA9PiBmLmZpbGVOYW1lKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldE5iU2VsRmlsZXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBlbHQuZmluZCgnLmNoZWNrOmNoZWNrZWQnKS5sZW5ndGhcblx0XHRcdH1cblxuXHRcdFx0dGhpcy50b2dnbGVTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHNlbGVjdGVkID0gIXNlbGVjdGVkXG5cdFx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgc2VsZWN0ZWQpXG5cdFx0XHRcdGN0cmwubW9kZWwuZmlsZXMuZm9yRWFjaCgoZikgPT4geyBmLmNoZWNrZWQgPSBzZWxlY3RlZCB9KVxuXHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5VmFsdWUoJ2ZpbGVzJywgJ2ZpbGVzJylcblx0XHRcdFx0ZWx0LnRyaWdnZXIoJ3NlbGNoYW5nZScsIHsgaXNTaGFyZVNlbGVjdGVkOiBpc1NoYXJlU2VsZWN0ZWQoKSB9KVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldFJvb3REaXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pbnNlcnRGaWxlID0gZnVuY3Rpb24gKGZpbGVJbmZvLCBpZHgpIHtcblx0XHRcdFx0aWYgKGlkeCkge1xuXHRcdFx0XHRcdGN0cmwuaW5zZXJ0QXJyYXlJdGVtQWZ0ZXIoJ2ZpbGVzJywgaWR4LCBmaWxlSW5mbywgJ2ZpbGVzJylcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpZHggPSBjdHJsLm1vZGVsLmdldEZpbGVzKCkuZmlsdGVyKChmKSA9PiBmLmZvbGRlcikubGVuZ3RoXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaWR4JywgaWR4KVxuXHRcdFx0XHRcdGlmIChpZHggPT0gMCkgeyAvLyBubyBmb2xkZXIsIGluc2VydCBhdCB0aGUgYmVnaW5pbmdcblx0XHRcdFx0XHRcdGN0cmwuaW5zZXJ0QXJyYXlJdGVtQmVmb3JlKCdmaWxlcycsIDAsIGZpbGVJbmZvLCAnZmlsZXMnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHsgLy8gaW5zZXJ0IGFmdGVyIGxhc3QgZm9sZGVyXG5cdFx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUFmdGVyKCdmaWxlcycsIGlkeCAtIDEsIGZpbGVJbmZvLCAnZmlsZXMnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5yZW1vdmVGaWxlcyA9IGZ1bmN0aW9uIChpbmRleGVzKSB7XG5cdFx0XHRcdGN0cmwucmVtb3ZlQXJyYXlJdGVtKCdmaWxlcycsIGluZGV4ZXMsICdmaWxlcycpXG5cdFx0XHRcdGN0cmwudXBkYXRlTm9kZSgnaW5mbycpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgY3RybC5tb2RlbC5maWxlcylcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZUZpbGUgPSBmdW5jdGlvbiAoaWR4LCBpbmZvKSB7XG5cdFx0XHRcdGN0cmwudXBkYXRlQXJyYXlJdGVtKCdmaWxlcycsIGlkeCwgaW5mbywgJ2ZpbGVzJylcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVGaWxlSW5mbyA9IGFzeW5jIGZ1bmN0aW9uIChmaWxlTmFtZSwgb3B0aW9ucykge1xuXHRcdFx0XHRjb25zdCB7IGZpbGVzLCByb290RGlyIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdGxldCBpZHggPSBjdHJsLm1vZGVsLmdldEZpbGVzKCkuZmluZEluZGV4KChpKSA9PiBpLm5hbWUgPT0gZmlsZU5hbWUpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlQ3RybF0gdXBkYXRlRmlsZScsIGlkeCwgZmlsZU5hbWUsIG9wdGlvbnMpXG5cdFx0XHRcdGNvbnN0IGluZm8gPSBhd2FpdCBzcnZGaWxlcy5maWxlSW5mbyhyb290RGlyICsgZmlsZU5hbWUsIGZyaWVuZFVzZXIsIG9wdGlvbnMpXG5cdFx0XHRcdGN0cmwudXBkYXRlQXJyYXlJdGVtKCdmaWxlcycsIGlkeCwgaW5mbylcblx0XHRcdFx0aWR4ID0gZmlsZXMuZmluZEluZGV4KChpKSA9PiBpLm5hbWUgPT0gZmlsZU5hbWUpXG5cdFx0XHRcdGZpbGVzW2lkeF0gPSBpbmZvXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0RmlsZXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZpbGVzLmZpbHRlcigoZikgPT4gIWYuZm9sZGVyKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEZpbHRlcmVkRmlsZXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmdldEZpbGVzKCkuZmlsdGVyKChmKSA9PiAhZi5mb2xkZXIpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMucmVsb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZScpXG5cdFx0XHRcdGxvYWREYXRhKHVuZGVmaW5lZCwgZmFsc2UpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2V0TVAzRmlsdGVycyA9IGZ1bmN0aW9uIChtcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IG1wM0ZpbHRlcnMgfSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRNUDNGaWx0ZXJzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5tcDNGaWx0ZXJzXG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxufSkoKTtcbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZm9sZGVydHJlZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IFxcbiAgICBibi1jb250cm9sPVxcXCJicmFpbmpzLnRyZWVcXFwiIFxcbiAgICBibi1kYXRhPVxcXCJ7c291cmNlOiB0cmVlSW5mbywgb3B0aW9uczogdHJlZU9wdGlvbnN9XFxcIlxcbiAgICBibi1pZmFjZT1cXFwidHJlZVxcXCJcXG4+PC9kaXY+ICAgICAgICBcXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0cHJvcHM6IHtcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBzcnZGaWxlc1xuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IHRyZWVJbmZvID0gW1xuXHRcdFx0eyB0aXRsZTogJ0hvbWUgRmlsZXMnLCBpY29uOiAnZmEgZmEtaG9tZSB3My10ZXh0LWJsdWUnLCBsYXp5OiB0cnVlLCBkYXRhOiB7IHBhdGg6ICcvJyB9IH0sXG5cdFx0XVxuXG5cdFx0ZnVuY3Rpb24gY29uY2F0UGF0aChwYXRoLCBmaWxlTmFtZSkge1xuXHRcdFx0bGV0IHJldCA9IHBhdGhcblx0XHRcdGlmICghcGF0aC5lbmRzV2l0aCgnLycpKSB7XG5cdFx0XHRcdHJldCArPSAnLydcblx0XHRcdH1cblx0XHRcdHJldCArPSBmaWxlTmFtZVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHRcdGNvbnN0IHRyZWVPcHRpb25zID0ge1xuXHRcdFx0bGF6eUxvYWQ6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRjb25zdCBub2RlID0gZGF0YS5ub2RlXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdsYXp5bG9hZCcsIG5vZGUuZGF0YSlcblx0XHRcdFx0ZGF0YS5yZXN1bHQgPSBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHsgcGF0aCB9ID0gbm9kZS5kYXRhXG5cdFx0XHRcdFx0Y29uc3QgZm9sZGVycyA9IGF3YWl0IHNydkZpbGVzLmxpc3QocGF0aCwgeyBmb2xkZXJPbmx5OiB0cnVlIH0pXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZm9sZGVycycsIGZvbGRlcnMpXG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0cyA9IGZvbGRlcnMubWFwKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogZi5uYW1lLFxuXHRcdFx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRcdFx0cGF0aDogY29uY2F0UGF0aChwYXRoLCBmLm5hbWUpXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRsYXp5OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRmb2xkZXI6IHRydWVcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdHJlc29sdmUocmVzdWx0cylcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHRyZWVJbmZvLFxuXHRcdFx0XHR0cmVlT3B0aW9ucyxcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0LyoqQHR5cGUge0JyYWluanMuQ29udHJvbHMuVHJlZS5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgdHJlZSA9IGN0cmwuc2NvcGUudHJlZVxuXG5cblx0XHR0aGlzLmdldFNlbFBhdGggPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnN0IG5vZGUgPSB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0cmV0dXJuIG5vZGUuZGF0YS5wYXRoXG5cdFx0fVxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5mcmllbmRzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0c2hvd1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0c2hvd1NlbmRNZXNzYWdlOiBmYWxzZSxcblx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiB0cnVlXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC5mcmllbmRzJywgJ2JyZWl6Ym90Lm5vdGlmcycsICdicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgYm4tZWFjaD1cXFwiZnJpZW5kc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRibi1ldmVudD1cXFwiY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGljaywgY2xpY2subm90aWY6IG9uU2VuZE1lc3NhZ2VcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIHN0eWxlPVxcXCJjdXJzb3I6IHBvaW50ZXI7XFxcIj5cXG5cdFx0XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgbm90aWYgdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTWVzc2FnZVxcXCIgYm4tc2hvdz1cXFwic2hvd1NlbmRNZXNzYWdlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGVcXFwiPjwvaT5cXG5cdFx0PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXJcXFwiIGJuLWNsYXNzPVxcXCJjbGFzczFcXFwiPjwvaT5cXG5cdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZnJpZW5kVXNlck5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XFxuPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGZyaWVuZHM8L3A+XCIsXG5cblx0LyoqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5JbnRlcmZhY2V9IGJyb2tlciBcblx0ICogKi9cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmcmllbmRzU3J2LCBub3RpZnNTcnYsIGJyb2tlcikge1xuXG5cdFx0Y29uc3Qge3Nob3dTZWxlY3Rpb24sIHNob3dTZW5kTWVzc2FnZSwgc2hvd0Nvbm5lY3Rpb25TdGF0ZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdLFxuXHRcdFx0XHRzaG93U2VuZE1lc3NhZ2UsXG5cdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZyaWVuZHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0ICRpID0gc2NvcGUuJGlcblx0XHRcdFx0XHRjb25zdCBzaG93Q29ubmVjdGlvblN0YXRlID0gdGhpcy5zaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdCd3My10ZXh0LWdyZWVuJzogJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LXJlZCc6ICEkaS5pc0Nvbm5lY3RlZCAmJiBzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRcdFx0J3czLXRleHQtYmx1ZSc6ICFzaG93Q29ubmVjdGlvblN0YXRlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgdXNlck5hbWUgPSAgY3RybC5tb2RlbC5mcmllbmRzW2lkeF0uZnJpZW5kVXNlck5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnNpYmxpbmdzKCcudzMtYmx1ZScpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ3czLWJsdWUnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHQudHJpZ2dlcignZnJpZW5kY2xpY2snLCB7dXNlck5hbWV9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNlbmRNZXNzYWdlOiBhc3luYyBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZW5kTWVzc2FnZScsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdGNvbnN0IHRleHQgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NlbmQgTWVzc2FnZScsIGxhYmVsOiAnTWVzc2FnZTonfSlcblxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdG5vdGlmc1Nydi5zZW5kTm90aWYodXNlck5hbWUsIHt0ZXh0LCByZXBseTogdHJ1ZX0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuTXNnfSBtc2cgXG5cdFx0ICogQHJldHVybnMgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gb25VcGRhdGUobXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCB7aXNDb25uZWN0ZWQsIHVzZXJOYW1lfSA9IG1zZy5kYXRhXG5cdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5mcmllbmRzLmZpbmQoKGZyaWVuZCkgPT4ge3JldHVybiBmcmllbmQuZnJpZW5kVXNlck5hbWUgPT0gdXNlck5hbWV9KVxuXHRcdFx0aW5mby5pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHR9XG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cblx0XHR0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc3QgaWR4ID0gZWx0LmZpbmQoJ2xpLnczLWJsdWUnKS5pbmRleCgpO1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdXG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRGcmllbmRzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5mcmllbmRzLm1hcCgoZnJpZW5kKSA9PiBmcmllbmQuZnJpZW5kVXNlck5hbWUpXG5cdFx0fVxuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGZyaWVuZHNTcnYuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZnJpZW5kcycsIGZyaWVuZHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZnJpZW5kc30pXG5cdFx0XHR9KVx0XHRcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW2ZyaWVuZHNdIGRpc3Bvc2UnKVxuXHRcdFx0YnJva2VyLnVucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCBvblVwZGF0ZSlcblx0XHR9XG5cblxuXHRcdHRoaXMudXBkYXRlKClcblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldFNlbGVjdGlvbigpOnN0cmluZztcblx0XHRnZXRGcmllbmRzKCk6W3N0cmluZ11cblx0YCxcblxuXHQkZXZlbnRzOiAnZnJpZW5kY2xpY2snXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ob21lJywge1xuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QuYnJva2VyJyxcblx0XHQnYnJlaXpib3QudXNlcnMnLFxuXHRcdCdicmVpemJvdC5ub3RpZnMnLFxuXHRcdCdicmVpemJvdC5nZW9sb2MnLFxuXHRcdCdicmVpemJvdC5ydGMnLFxuXHRcdCdicmVpemJvdC5hcHBzJyxcblx0XHQnYnJlaXpib3Quc2NoZWR1bGVyJyxcblx0XHQnYnJlaXpib3Qud2FrZWxvY2snLFxuXHRcdCdicmVpemJvdC5mdWxsc2NyZWVuJ1xuXHRdLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlck5hbWU6ICdVbmtub3duJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlclxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRnVsbFNjcmVlblxcXCIgYm4tc2hvdz1cXFwiIWZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRXhpdCBGdWxsU2NyZWVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRXhpdEZ1bGxTY3JlZW5cXFwiIGJuLXNob3c9XFxcImZ1bGxTY3JlZW5cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jb21wcmVzc1xcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDb25uZWN0aW9uIFN0YXR1c1xcXCI+XFxuXHRcdFx0PGkgYm4tY2xhc3M9XFxcInt3My10ZXh0LWdyZWVuOiBjb25uZWN0ZWQsIHczLXRleHQtcmVkOiAhY29ubmVjdGVkfVxcXCIgY2xhc3M9XFxcImZhIGZhLWNpcmNsZVxcXCI+PC9pPlxcblxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJoYXNJbmNvbWluZ0NhbGxcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25DYWxsUmVzcG9uc2VcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJywgXFxuXHRcdFx0XHR0aXRsZTogY2FsbEluZm8uZnJvbSxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGFjY2VwdDoge25hbWU6IFxcJ0FjY2VwdFxcJ30sXFxuXHRcdFx0XHRcdGRlbnk6IHtuYW1lOiBcXCdEZWNsaW5lXFwnfSxcXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2FsbEluZm8uaWNvbkNsc31cXFwiPjwvaT5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cXG5cdDwhLS0gXHQ8c3Ryb25nIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3N0cm9uZz5cXG4gLS0+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZmljYXRpb24gdzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiTm90aWZpY2F0aW9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbGcgZmEtYmVsbFxcXCI+PC9pPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1iYWRnZSB3My1yZWQgdzMtdGlueVxcXCIgYm4tdGV4dD1cXFwibmJOb3RpZlxcXCIgYm4tc2hvdz1cXFwiaGFzTm90aWZcXFwiPjwvc3Bhbj5cXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie1xcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0c2V0dGluZ3M6IHtuYW1lOiBcXCdTZXR0aW5nc1xcJywgaWNvbjogXFwnZmFzIGZhLWNvZ1xcJ30sXFxuXHRcdFx0XHRcdGFwcHM6IHtuYW1lOiBcXCdBcHBsaWNhdGlvbnNcXCcsIGljb246IFxcJ2ZhcyBmYS10aFxcJ30sXFxuXHRcdFx0XHRcdHNlcDogXFwnLS0tLS0tXFwnLFxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiBcXCdMb2dvdXRcXCcsIGljb246IFxcJ2ZhcyBmYS1wb3dlci1vZmZcXCd9XFxuXHRcdFx0XHR9LFxcblx0XHRcdFx0dGl0bGU6IHVzZXJOYW1lLFxcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJ1xcblx0XHRcdH1cXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db250ZXh0TWVudVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS11c2VyLWNpcmNsZSBmYS1sZ1xcXCI+PC9pPlxcblxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcblxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy50YWJzXFxcIiBjbGFzcz1cXFwiY29udGVudFxcXCIgYm4taWZhY2U9XFxcInRhYnNcXFwiXFxuXHRibi1ldmVudD1cXFwidGFic3JlbW92ZTogb25UYWJSZW1vdmUsIHRhYnNhY3RpdmF0ZTogb25UYWJBY3RpdmF0ZVxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmFwcHNcXFwiIGJuLWRhdGE9XFxcIntcXG5cdFx0XHRhcHBzOiBnZXRNeUFwcHMsXFxuXHRcdFx0aXRlbXNcXG5cdFx0fVxcXCIgYm4tZXZlbnQ9XFxcImFwcGNsaWNrOiBvbkFwcENsaWNrLCBhcHBjb250ZXh0bWVudTogb25UaWxlQ29udGV4dE1lbnVcXFwiIHRpdGxlPVxcXCJIb21lXFxcIj5cXG5cdDwvZGl2PlxcblxcbjwvZGl2PlwiLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuSW50ZXJmYWNlfSBicm9rZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuVXNlci5JbnRlcmZhY2V9IHVzZXJzIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLk5vdGlmLkludGVyZmFjZX0gbm90aWZzU3J2IFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkdlb2xvYy5JbnRlcmZhY2V9IGdlb2xvYyBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5SVEMuSW50ZXJmYWNlfSBydGMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQXBwcy5JbnRlcmZhY2V9IHNydkFwcHMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuU2NoZWR1bGVyLkludGVyZmFjZX0gc2NoZWR1bGVyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLldha2VMb2NrLkludGVyZmFjZX0gd2FrZWxvY2sgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRnVsbFNjcmVlbi5JbnRlcmZhY2V9IGZ1bGxzY3JlZW4gXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBicm9rZXIsIHVzZXJzLCBub3RpZnNTcnYsIGdlb2xvYywgcnRjLCBzcnZBcHBzLCBzY2hlZHVsZXIsIHdha2Vsb2NrLCBmdWxsc2NyZWVuKSB7XG5cblx0XHRmdW5jdGlvbiBjcmVhdGVBdWRpbygpIHtcblx0XHRcdGxldCBhdWRpbyA9IG51bGxcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHBsYXk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBwbGF5Jylcblx0XHRcdFx0XHRhdWRpbyA9IG5ldyBBdWRpbygnL2Fzc2V0cy9za3lwZS5tcDMnKVxuXHRcdFx0XHRcdGF1ZGlvLmxvb3AgPSB0cnVlXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7IGF1ZGlvLnBsYXkoKSB9LCAxMDApXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0c3RvcDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2F1ZGlvIHN0b3AnKVxuXHRcdFx0XHRcdGlmIChhdWRpbyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRhdWRpby5wYXVzZSgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGF1ZGlvID0gbnVsbFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cnRjLnByb2Nlc3NDYWxsKClcblxuXHRcdHJ0Yy5vbignY2FsbCcsIGZ1bmN0aW9uIChjYWxsSW5mbykge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzSW5jb21pbmdDYWxsOiB0cnVlLCBjYWxsSW5mbyB9KVxuXHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0fSlcblxuXHRcdHJ0Yy5vbignY2FuY2VsJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzSW5jb21pbmdDYWxsOiBmYWxzZSB9KVxuXHRcdFx0YXVkaW8uc3RvcCgpXG5cdFx0fSlcblxuXHRcdGNvbnN0IHsgdXNlck5hbWUgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGF1ZGlvID0gY3JlYXRlQXVkaW8oKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiBbXSxcblx0XHRcdFx0dXNlck5hbWUsXG5cdFx0XHRcdG5iTm90aWY6IDAsXG5cdFx0XHRcdGhhc0luY29taW5nQ2FsbDogZmFsc2UsXG5cdFx0XHRcdGNhbGxJbmZvOiBudWxsLFxuXHRcdFx0XHRmdWxsU2NyZWVuOiBmYWxzZSxcblx0XHRcdFx0Y29ubmVjdGVkOiBmYWxzZSxcblx0XHRcdFx0aGFzTm90aWY6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5uYk5vdGlmID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRNeUFwcHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5hcHBzLmZpbHRlcigoYSkgPT4gYS5hY3RpdmF0ZWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGl0ZW1zOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlbW92ZTogeyBuYW1lOiAnUmVtb3ZlJyB9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ29udGV4dE1lbnU6IGFzeW5jIGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGlsZUNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRhd2FpdCB1c2Vycy5hY3RpdmF0ZUFwcChkYXRhLmFwcE5hbWUsIGZhbHNlKVxuXHRcdFx0XHRcdGxvYWRBcHAoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFwcENsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkFwcENsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRvcGVuQXBwKGRhdGEuYXBwTmFtZSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2xvZ291dCcpIHtcblx0XHRcdFx0XHRcdHNjaGVkdWxlci5sb2dvdXQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2FwcHMnKSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdzdG9yZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnc2V0dGluZ3MnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBzZXR0aW5ncyA9IGF3YWl0IHVzZXJzLmdldFVzZXJTZXR0aW5ncygpXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2V0dGluZycsIHNldHRpbmdzKVxuXHRcdFx0XHRcdFx0b3BlbkFwcCgnc2V0dGluZ3MnLCBzZXR0aW5ncylcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ob3RpZmljYXRpb246IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTm90aWZpY2F0aW9uJylcblx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC5uYk5vdGlmID09IDApIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IGNvbnRlbnQ6ICdubyBub3RpZmljYXRpb25zJywgdGl0bGU6ICdOb3RpZmljYXRpb25zJyB9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdG9wZW5BcHAoJ25vdGlmJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FsbFJlc3BvbnNlOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCB7IGNtZCB9ID0gZGF0YVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ2FsbFJlc3BvbnNlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBoYXNJbmNvbWluZ0NhbGw6IGZhbHNlIH0pXG5cdFx0XHRcdFx0YXVkaW8uc3RvcCgpXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAnYWNjZXB0Jykge1xuXHRcdFx0XHRcdFx0Y29uc3QgeyBmcm9tLCBhcHBOYW1lIH0gPSBjdHJsLm1vZGVsLmNhbGxJbmZvXG5cdFx0XHRcdFx0XHRvcGVuQXBwKGFwcE5hbWUsIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGVyOiBmcm9tLFxuXHRcdFx0XHRcdFx0XHRjbGllbnRJZDogcnRjLmdldFJlbW90ZUNsaWVudElkKClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbnknKSB7XG5cdFx0XHRcdFx0XHRydGMuZGVueSgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRXhpdEZ1bGxTY3JlZW46IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkV4aXRGdWxsU2NyZWVuJylcblx0XHRcdFx0XHRmdWxsc2NyZWVuLmV4aXQoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRnVsbFNjcmVlbjogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25GdWxsU2NyZWVuJylcblx0XHRcdFx0XHRmdWxsc2NyZWVuLmVudGVyKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJSZW1vdmU6IGZ1bmN0aW9uIChldiwgaWR4KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UYWJSZW1vdmUnLCBpZHgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhpZHgpXG5cdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uub25BcHBFeGl0KCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHR0YWJzLnJlbW92ZVRhYihpZHgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWJBY3RpdmF0ZTogZnVuY3Rpb24gKGV2LCB1aSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGFiQWN0aXZhdGUnKVxuXHRcdFx0XHRcdGNvbnN0IHsgbmV3VGFiLCBvbGRUYWIgfSA9IHVpXG5cdFx0XHRcdFx0Y29uc3QgbmV3VGFiSWR4ID0gbmV3VGFiLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBvbGRUYWJJZHggPSBvbGRUYWIuaW5kZXgoKVxuXHRcdFx0XHRcdGlmIChvbGRUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gdGFicy5nZXRUYWJJbmZvKG9sZFRhYklkeClcblx0XHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPiAwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gdGFicy5nZXRUYWJJbmZvKG5ld1RhYklkeClcblx0XHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwUmVzdW1lKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG5ld1RhYklkeCA9PSAwKSB7XG5cdFx0XHRcdFx0XHRsb2FkQXBwKClcblx0XHRcdFx0XHR9XG5cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8qKkB0eXBlIHtCcmFpbmpzLkNvbnRyb2xzLlRhYnMuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IHRhYnMgPSBjdHJsLnNjb3BlLnRhYnNcblxuXHRcdGZ1bGxzY3JlZW4uaW5pdCgoZnVsbFNjcmVlbikgPT4ge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgZnVsbFNjcmVlbiB9KVxuXHRcdH0pXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gbmJOb3RpZiBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1cGRhdGVOb3RpZnMobmJOb3RpZikge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgbmJOb3RpZiB9KVxuXG5cdFx0fVxuXG5cdFx0YnJva2VyLm9uKCdjb25uZWN0ZWQnLCAoc3RhdGUpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGNvbm5lY3RlZDogc3RhdGUgfSlcblx0XHR9KVxuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXYpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tob21lXSBtZXNzYWdlJywgZXYuZGF0YSlcblx0XHRcdGNvbnN0IHsgdHlwZSwgZGF0YSB9ID0gZXYuZGF0YVxuXHRcdFx0aWYgKHR5cGUgPT0gJ29wZW5BcHAnKSB7XG5cdFx0XHRcdGNvbnN0IHsgYXBwTmFtZSwgYXBwUGFyYW1zLCBuZXdUYWJUaXRsZSB9ID0gZGF0YVxuXHRcdFx0XHRvcGVuQXBwKGFwcE5hbWUsIGFwcFBhcmFtcywgbmV3VGFiVGl0bGUpXG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PSAncmVsb2FkJykge1xuXHRcdFx0XHRsb2NhdGlvbi5yZWxvYWQoKVxuXHRcdFx0fVxuXG5cdFx0fSwgZmFsc2UpXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZHMnLCAobXNnKSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdicmVpemJvdC5mcmllbmRzJywgbXNnKVxuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0LyoqQHR5cGUgQnJlaXpib3QuU2VydmljZXMuQnJva2VyLkV2ZW50cy5GcmllbmRzICovXG5cdFx0XHRjb25zdCB7IGlzQ29ubmVjdGVkLCB1c2VyTmFtZSB9ID0gbXNnLmRhdGFcblx0XHRcdGlmIChpc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHQkLm5vdGlmeShgJyR7dXNlck5hbWV9JyBpcyBjb25uZWN0ZWRgLCAnc3VjY2VzcycpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0JC5ub3RpZnkoYCcke3VzZXJOYW1lfScgaXMgZGlzY29ubmVjdGVkYCwgJ2Vycm9yJylcblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMobXNnLmRhdGEpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5sb2dvdXQnLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHRsb2NhdGlvbi5ocmVmID0gJy9sb2dvdXQnXG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gb3BlbkFwcChhcHBOYW1lLCBwYXJhbXMsIG5ld1RhYlRpdGxlKSB7XG5cdFx0XHRjb25zdCBhcHBJbmZvID0gY3RybC5tb2RlbC5hcHBzLmZpbmQoKGEpID0+IGEuYXBwTmFtZSA9PSBhcHBOYW1lKVxuXHRcdFx0bGV0IHRpdGxlID0gYXBwSW5mby5wcm9wcy50aXRsZVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnb3BlbkFwcCcsIGFwcE5hbWUsIHBhcmFtcywgbmV3VGFiVGl0bGUpXG5cdFx0XHRsZXQgaWR4ID0gdGFicy5nZXRUYWJJbmRleEZyb21UaXRsZSh0aXRsZSlcblx0XHRcdGNvbnN0IGFwcFVybCA9ICQkLnVybC5nZXRVcmxQYXJhbXMoYC9hcHBzLyR7YXBwTmFtZX1gLCBwYXJhbXMpXG5cdFx0XHRjb25zdCBhZGROZXdUYWIgPSB0eXBlb2YgbmV3VGFiVGl0bGUgPT0gJ3N0cmluZydcblx0XHRcdGlmIChhZGROZXdUYWIgfHwgaWR4IDwgMCkgeyAvLyBhcHBzIG5vdCBhbHJlYWR5IHJ1blxuXHRcdFx0XHRpZHggPSB0YWJzLmFkZFRhYihcblx0XHRcdFx0XHQoIWFkZE5ld1RhYikgPyB0aXRsZSA6IGAke3RpdGxlfVske25ld1RhYlRpdGxlfV1gLFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJlbW92YWJsZTogdHJ1ZSxcblx0XHRcdFx0XHRcdGNvbnRyb2w6ICdicmVpemJvdC5hcHBUYWInLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0YXBwVXJsXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zdCBpbmZvID0gdGFicy5nZXRUYWJJbmZvKGlkeClcblx0XHRcdFx0aWYgKHBhcmFtcyAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5zZXRBcHBVcmwoYXBwVXJsKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRhYnMuc2V0U2VsZWN0ZWRUYWJJbmRleChpZHgpXG5cblx0XHR9XG5cblx0XHRub3RpZnNTcnYuZ2V0Tm90aWZDb3VudCgpLnRoZW4odXBkYXRlTm90aWZzKVxuXG5cdFx0ZnVuY3Rpb24gbG9hZEFwcCgpIHtcblx0XHRcdHNydkFwcHMubGlzdEFsbCgpLnRoZW4oKGFwcHMpID0+IHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXBwcycsIGFwcHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0YXBwc1xuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHR9XG5cblxuXHRcdGxvYWRBcHAoKVxuXG5cdFx0Z2VvbG9jLnN0YXJ0V2F0Y2goKVxuXG5cdFx0d2FrZWxvY2sucmVxdWVzdFdha2VMb2NrKClcblxuXHR9XG59KTtcbiIsIlxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnBhZ2VyJywge1xuXG5cdHByb3BzOiB7XG5cdFx0cm9vdFBhZ2U6ICcnXG5cdH0sXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwic2hvd0JhY2tcXFwiIGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImxlZnRcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJCYWNrXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQmFja1xcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFycm93LWxlZnRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdDxzcGFuIGJuLXRleHQ9XFxcInRpdGxlXFxcIiBjbGFzcz1cXFwidGl0bGVcXFwiPjwvc3Bhbj5cXG5cdFxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWVhY2g9XFxcImJ1dHRvbnNcXFwiIGNsYXNzPVxcXCJyaWdodFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmFjdGlvbjogb25BY3Rpb24sIGNvbnRleHRtZW51Y2hhbmdlLm1lbnU6IG9uQ29udGV4dE1lbnVcXFwiPlxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInNob3cxXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmxhYmVsXFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntjbWQ6ICRzY29wZS4kaS5uYW1lfVxcXCIgYm4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaXNFbmFibGVkfVxcXCI+PC9idXR0b24+XFxuXHRcdDxidXR0b24gYm4tc2hvdz1cXFwic2hvdzJcXFwiIGNsYXNzPVxcXCJ3My1idXR0b24gYWN0aW9uXFxcIiBibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiXFxuXHRcdFx0Ym4tYXR0cj1cXFwie3RpdGxlOiAkc2NvcGUuJGkudGl0bGV9XFxcIiBibi1wcm9wPVxcXCJ7ZGlzYWJsZWQ6ICFpc0VuYWJsZWR9XFxcIj48aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS4kaS5pY29ufVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gYm4tc2hvdz1cXFwic2hvdzNcXFwiIGNsYXNzPVxcXCJ3My1idXR0b24gbWVudVxcXCIgXFxuXHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaXNFbmFibGVkfVxcXCJcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6ICRzY29wZS4kaS5pdGVtcywgdHJpZ2dlcjogXFwnbGVmdFxcJywgY21kOiAkc2NvcGUuJGkubmFtZX1cXFwiXFxuXHRcdFx0Ym4tYXR0cj1cXFwie3RpdGxlOiAkc2NvcGUuJGkudGl0bGV9XFxcIj48aSBibi1hdHRyPVxcXCJ7Y2xhc3M6ICRzY29wZS4kaS5pY29ufVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8L2Rpdj5cdFx0XHRcXG5cdDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgYm4tYmluZD1cXFwiY29udGVudFxcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiPjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQpIHtcblxuXHRcdGNvbnN0IHsgcm9vdFBhZ2UgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2hvd0JhY2s6IGZhbHNlLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGJ1dHRvbnM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zID09IHVuZGVmaW5lZCAmJiBzY29wZS4kaS5pY29uID09IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zID09IHVuZGVmaW5lZCAmJiBzY29wZS4kaS5pY29uICE9IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zICE9IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0VuYWJsZWQoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuZW5hYmxlZCA9PSB1bmRlZmluZWQgfHwgc2NvcGUuJGkuZW5hYmxlZCA9PT0gdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQmFjazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25CYWNrJylcblx0XHRcdFx0XHRyZXN0b3JlUGFnZSh0cnVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdGNvbnN0IHBhZ2VDdHJsSWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0XHRcdGNvbnN0IGZuID0gY3VySW5mby5idXR0b25zW2NtZF0ub25DbGlja1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0Zm4uY2FsbChwYWdlQ3RybElmYWNlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRjb25zdCBwYWdlQ3RybElmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZm4gPSBjdXJJbmZvLmJ1dHRvbnNbY21kXS5vbkNsaWNrXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRmbi5jYWxsKHBhZ2VDdHJsSWZhY2UsIGRhdGEuY21kKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBjb250ZW50ID0gY3RybC5zY29wZS5jb250ZW50XG5cdFx0Y29uc3Qgc3RhY2sgPSBbXVxuXHRcdGxldCBjdXJJbmZvID0gbnVsbFxuXG5cblxuXHRcdGZ1bmN0aW9uIHJlc3RvcmVQYWdlKGlzQmFjaywgZGF0YSkge1xuXG5cdFx0XHRjb25zdCBpZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHRsZXQgYmFja1ZhbHVlXG5cblx0XHRcdGlmICh0eXBlb2YgaWZhY2Uub25CYWNrID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0YmFja1ZhbHVlID0gaWZhY2Uub25CYWNrKClcblx0XHRcdH1cblx0XHRcdC8vY29uc29sZS5sb2coJ3BvcFBhZ2UnLCBwYWdlQ3RybClcblx0XHRcdGN1ckluZm8uY3RybC5zYWZlRW1wdHkoKS5yZW1vdmUoKVxuXG5cdFx0XHRjb25zdCB7IG9uQmFjaywgb25SZXR1cm4gfSA9IGN1ckluZm9cblxuXHRcdFx0Y3VySW5mbyA9IHN0YWNrLnBvcCgpXG5cdFx0XHRjdXJJbmZvLmN0cmwuc2hvdygpXG5cdFx0XHRjb25zdCB7IHRpdGxlLCBidXR0b25zIH0gPSBjdXJJbmZvXG5cdFx0XHRjdHJsLnNldERhdGEoeyBzaG93QmFjazogc3RhY2subGVuZ3RoID4gMCwgdGl0bGUsIGJ1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpIH0pXG5cblx0XHRcdGlmIChpc0JhY2spIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBiYWNrJywgaWZhY2UubmFtZSlcblx0XHRcdFx0aWYgKHR5cGVvZiBvbkJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbcGFnZXJdIG9uQmFjaycsIGlmYWNlLm5hbWUpXG5cdFx0XHRcdFx0b25CYWNrLmNhbGwoaWZhY2UsIGJhY2tWYWx1ZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZW9mIG9uUmV0dXJuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBvblJldHVybicsIGlmYWNlLm5hbWUsIGRhdGEpXG5cdFx0XHRcdG9uUmV0dXJuLmNhbGwoaWZhY2UsIGRhdGEpXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHR0aGlzLnBvcFBhZ2UgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0cmV0dXJuIHJlc3RvcmVQYWdlKGZhbHNlLCBkYXRhKVxuXHRcdH1cblxuXHRcdHRoaXMucHVzaFBhZ2UgPSBmdW5jdGlvbiAoY3RybE5hbWUsIG9wdGlvbnMpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1twYWdlcl0gcHVzaFBhZ2UnLCBjdHJsTmFtZSlcblxuXG5cdFx0XHRpZiAoY3VySW5mbyAhPSBudWxsKSB7XG5cdFx0XHRcdGN1ckluZm8uY3RybC5oaWRlKClcblx0XHRcdFx0c3RhY2sucHVzaChjdXJJbmZvKVxuXHRcdFx0fVxuXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG5cdFx0XHRsZXQgeyB0aXRsZSwgcHJvcHMsIG9uUmV0dXJuLCBvbkJhY2ssIGV2ZW50cyB9ID0gb3B0aW9uc1xuXG5cdFx0XHRjb25zdCBjb250cm9sID0gY29udGVudC5hZGRDb250cm9sKGN0cmxOYW1lLCBwcm9wcywgZXZlbnRzKVxuXG5cdFx0XHRsZXQgYnV0dG9ucyA9IHt9XG5cblx0XHRcdGlmIChvcHRpb25zLmJ1dHRvbnMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGJ1dHRvbnMgPSBvcHRpb25zLmJ1dHRvbnNcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zdCBnZXRCdXR0b25zID0gY29udHJvbC5pZmFjZSgpLmdldEJ1dHRvbnNcblx0XHRcdFx0aWYgKHR5cGVvZiBnZXRCdXR0b25zID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRidXR0b25zID0gZ2V0QnV0dG9ucygpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y3VySW5mbyA9IHsgdGl0bGUsIGJ1dHRvbnMsIG9uUmV0dXJuLCBvbkJhY2ssIGN0cmw6IGNvbnRyb2wgfVxuXG5cdFx0XHRjdHJsLnNldERhdGEoeyBzaG93QmFjazogc3RhY2subGVuZ3RoID4gMCwgdGl0bGUsIGJ1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpIH0pXG5cdFx0XHRyZXR1cm4gY29udHJvbC5pZmFjZSgpXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRCdXR0b25WaXNpYmxlID0gZnVuY3Rpb24gKGJ1dHRvbnNWaXNpYmxlKSB7XG5cblx0XHRcdGNvbnN0IHsgYnV0dG9ucyB9ID0gY3VySW5mb1xuXG5cdFx0XHRmb3IgKGxldCBidG4gaW4gYnV0dG9uc1Zpc2libGUpIHtcblx0XHRcdFx0aWYgKGJ0biBpbiBidXR0b25zKSB7XG5cdFx0XHRcdFx0YnV0dG9uc1tidG5dLnZpc2libGUgPSBidXR0b25zVmlzaWJsZVtidG5dXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJykgfSlcblx0XHR9XG5cblx0XHR0aGlzLnNldEJ1dHRvbkVuYWJsZWQgPSBmdW5jdGlvbiAoYnV0dG9uc0VuYWJsZWQpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NldEJ1dHRvbkVuYWJsZWQnLCBidXR0b25zRW5hYmxlZClcblxuXHRcdFx0Y29uc3QgeyBidXR0b25zIH0gPSBjdXJJbmZvXG5cblx0XHRcdGlmICh0eXBlb2YgYnV0dG9uc0VuYWJsZWQgPT09ICdib29sZWFuJykge1xuXHRcdFx0XHRmb3IgKGxldCBidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdGJ1dHRvbnNbYnRuXS5lbmFibGVkID0gYnV0dG9uc0VuYWJsZWRcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Zm9yIChsZXQgYnRuIGluIGJ1dHRvbnNFbmFibGVkKSB7XG5cdFx0XHRcdFx0aWYgKGJ0biBpbiBidXR0b25zKSB7XG5cdFx0XHRcdFx0XHRidXR0b25zW2J0bl0uZW5hYmxlZCA9IGJ1dHRvbnNFbmFibGVkW2J0bl1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNldERhdGEoeyBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKSB9KVxuXHRcdH1cblxuXHRcdHRoaXMucHVzaFBhZ2Uocm9vdFBhZ2UpXG5cblx0fVxuXG59KTtcblxuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnBkZicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwid2FpdFxcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPiBSZW5kZXJpbmcuLi5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1zaG93PVxcXCIhd2FpdFxcXCI+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlJlZnJlc2hcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLXN5bmMtYWx0XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25SZWZyZXNoXFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJGaXRcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLWV4cGFuZFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRml0XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJab29tIEluXFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1zZWFyY2gtcGx1c1xcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uWm9vbUluXFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJab29tIE91dFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtc2VhcmNoLW1pbnVzIFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uWm9vbU91dFxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiUm90YXRlIExlZnRcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhcyBmYS11bmRvLWFsdFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUm90YXRlTGVmdFxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiUm90YXRlIFJpZ2h0XFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYXMgZmEtcmVkby1hbHRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblJvdGF0ZVJpZ2h0XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJQcmludFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtcHJpbnRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblByaW50XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJHbyB0byBQYWdlXFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1yZXBseSBmYS1mbGlwLWhvcml6b250YWxcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkdvdG9QYWdlXFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0PC9kaXY+XFxuXHQ8ZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJwYWdlc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcInByZXZpb3VzIHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2UGFnZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+XFxuXHRcdFx0PC9idXR0b24+XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJuZXh0IHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0UGFnZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtYW5nbGUtcmlnaHRcXFwiPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdj5cXG5cdFx0XHRQYWdlczogPHNwYW4gYm4tdGV4dD1cXFwiY3VycmVudFBhZ2VcXFwiPjwvc3Bhbj4gLyA8c3BhbiBibi10ZXh0PVxcXCJudW1QYWdlc1xcXCI+PC9zcGFuPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cdFxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5wZGZcXFwiIFxcblx0Ym4tZGF0YT1cXFwie3dvcmtlcjogXFwnL2JyYWluanMvcGRmL3dvcmtlci5qc1xcJ31cXFwiXFxuXHRibi1pZmFjZT1cXFwicGRmXFxcIlxcblx0IFxcbj48L2Rpdj5cdFx0XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHR1cmw6ICcnXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Y29uc3QgeyB1cmwgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IHByb2dyZXNzRGxnID0gJCQudWkucHJvZ3Jlc3NEaWFsb2coJ1Byb2Nlc3NpbmcuLi4nKVxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG51bVBhZ2VzOiAwLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGN1cnJlbnRQYWdlOiAxLFxuXHRcdFx0XHR3YWl0OiBmYWxzZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5udW1QYWdlcyA+IDEgJiYgIXRoaXMud2FpdFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uUmVmcmVzaDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YXdhaXQgcGRmLnJlZnJlc2goKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJvdGF0ZVJpZ2h0OiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJvdGF0ZVJpZ2h0Jylcblx0XHRcdFx0XHRhd2FpdCBwZGYucm90YXRlUmlnaHQoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJvdGF0ZUxlZnQ6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUm90YXRlTGVmdCcpXG5cdFx0XHRcdFx0YXdhaXQgcGRmLnJvdGF0ZUxlZnQoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblpvb21JbjogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25ab29tSW4nKVxuXHRcdFx0XHRcdGF3YWl0IHBkZi56b29tSW4oKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblpvb21PdXQ6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uWm9vbU91dCcpXG5cdFx0XHRcdFx0YXdhaXQgcGRmLnpvb21PdXQoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkdvdG9QYWdlOiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBwYWdlTm8gPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnR28gdG8gUGFnZScsXG5cdFx0XHRcdFx0XHRsYWJlbDogJ1BhZ2UgTnVtYmVyJyxcblx0XHRcdFx0XHRcdGF0dHJzOiB7XG5cdFx0XHRcdFx0XHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdFx0XHRcdFx0XHRtaW46IDEsXG5cdFx0XHRcdFx0XHRcdG1heDogY3RybC5tb2RlbC5udW1QYWdlcyxcblx0XHRcdFx0XHRcdFx0c3RlcDogMVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRQYWdlID0gIGF3YWl0IHBkZi5zZXRQYWdlKHBhZ2VObylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50UGFnZSwgd2FpdDogZmFsc2UgfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25QcmludDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZSgwKVxuXHRcdFx0XHRcdHByb2dyZXNzRGxnLnNob3coKVxuXHRcdFx0XHRcdGF3YWl0IHBkZi5wcmludCh7XG5cdFx0XHRcdFx0XHRvblByb2dyZXNzOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdHByb2dyZXNzRGxnLnNldFBlcmNlbnRhZ2UoZGF0YS5wYWdlIC8gY3RybC5tb2RlbC5udW1QYWdlcylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdHByb2dyZXNzRGxnLmhpZGUoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5leHRQYWdlOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5leHRQYWdlJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyB3YWl0OiB0cnVlIH0pXG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudFBhZ2UgPSBhd2FpdCBwZGYubmV4dFBhZ2UoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZSB9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUHJldlBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9IGF3YWl0IHBkZi5wcmV2UGFnZSgpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlIH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25GaXQ6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdHBkZi5maXQoKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0LyoqQHR5cGUge0JyYWluanMuQ29udHJvbHMuUGRmLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCBwZGYgPSBjdHJsLnNjb3BlLnBkZlxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gb3BlbkZpbGUodXJsLCB0aXRsZSkge1xuXG5cdFx0XHRjdHJsLnNldERhdGEoeyB3YWl0OiB0cnVlIH0pXG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnN0IG51bVBhZ2VzID0gYXdhaXQgcGRmLm9wZW5GaWxlKHVybClcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGUgbG9hZGVkJylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRudW1QYWdlcyxcblx0XHRcdFx0XHR3YWl0OiBmYWxzZVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0Y2F0Y2goZSkge1xuXHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGlmICh1cmwgIT0gJycpIHtcblx0XHRcdG9wZW5GaWxlKHVybClcblx0XHR9XG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3NldERhdGEnLCBkYXRhKVxuXHRcdFx0aWYgKGRhdGEudXJsICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRvcGVuRmlsZShkYXRhLnVybClcblx0XHRcdH1cblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRzZXREYXRhKHt1cmx9KVxuXHRgXG5cblxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QucnRjJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhcHBOYW1lOiAnJyxcblx0XHRpY29uQ2xzOiAnJyxcblx0XHR0aXRsZTogJ1NlbGVjdCBhIGZyaWVuZCdcblx0fSxcblxuXHQvL3RlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzdGF0dXNcXFwiPlxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmVcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG48ZGl2IGJuLXNob3c9XFxcInNob3c0XFxcIiBibi1iaW5kPVxcXCJwYW5lbFxcXCIgY2xhc3M9XFxcInBhbmVsXFxcIj48L2Rpdj5cIixcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUlRDLkludGVyZmFjZX0gcnRjIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbihlbHQsIHJ0YywgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHthcHBOYW1lLCBpY29uQ2xzLCB0aXRsZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCAkY2hpbGRyZW4gPSBlbHQuY2hpbGRyZW4oKS5yZW1vdmUoKVxuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGVsdC5hcHBlbmQoXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwic3RhdHVzXFxcIj5cXG5cdFx0XHQ8cD5TdGF0dXM6IDxzcGFuIGJuLXRleHQ9XFxcInN0YXR1c1xcXCI+PC9zcGFuPjwvcD5cXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiQ2FsbCBhIGZyaWVuZFxcXCIgXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FsbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHR0aXRsZT1cXFwiQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmUtc2xhc2hcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkhhbmd1cFxcXCIgXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSGFuZ3VwXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzNcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmUtc2xhc2hcXFwiPjwvaT48L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBibi1zaG93PVxcXCJzaG93NFxcXCIgYm4tYmluZD1cXFwicGFuZWxcXFwiIGNsYXNzPVxcXCJwYW5lbFxcXCI+PC9kaXY+XCIpXG5cblx0XHRydGMub24oJ3N0YXR1cycsIChkYXRhKSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzdGF0dXMnLCBkYXRhKVxuXHRcdFx0Y3RybC5zZXREYXRhKGRhdGEpXG5cdFx0fSlcdFx0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdFx0ZGlzdGFudDogJycsXG5cdFx0XHRcdGhhc0NoaWxkcmVuOiAkY2hpbGRyZW4ubGVuZ3RoID4gMCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkgeyBcblx0XHRcdFx0XHRyZXR1cm4gWydyZWFkeScsICdkaXNjb25uZWN0ZWQnLCAncmVmdXNlZCcsICdjYW5jZWxlZCddLmluY2x1ZGVzKHRoaXMuc3RhdHVzKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjYWxsaW5nJ30sXG5cdFx0XHRcdHNob3czOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCd9LFxuXHRcdFx0XHRzaG93NDogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnICYmIHRoaXMuaGFzQ2hpbGRyZW59XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FsbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsJylcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5mcmllbmRzJywge1xuXHRcdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93U2VsZWN0aW9uOiB0cnVlXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0YnV0dG9uczoge1xuXHRcdFx0XHRcdFx0XHRjYWxsOiB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdDYWxsJyxcblx0XHRcdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtY2hlY2snLFxuXHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uID0gdGhpcy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHNlbGVjdGlvbiA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSBmcmllbmQnfSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCB7ZnJpZW5kVXNlck5hbWUsIGlzQ29ubmVjdGVkfSA9IHNlbGVjdGlvblxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXJOYW1lJywgZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIWlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IGBVc2VyIDxzdHJvbmc+JHtmcmllbmRVc2VyTmFtZX08L3N0cm9uZz4gaXMgbm90IGNvbm5lY3RlZGBcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKHVzZXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lLCBhcHBOYW1lLCBpY29uQ2xzKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FuY2VsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5jYW5jZWwoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkhhbmd1cDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuYnllKClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcigncnRjaGFuZ3VwJylcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0Y3RybC5zY29wZS5wYW5lbC5hcHBlbmQoJGNoaWxkcmVuKVx0XHRcblx0fVxuXG59KTsiLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3Quc2VhcmNoYmFyJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TZWFyY2hcXFwiIGJuLWJpbmQ9XFxcImZvcm1cXFwiPlxcblx0PGlucHV0IHR5cGU9XFxcInNlYXJjaFxcXCIgXFxuICAgICAgICBuYW1lPVxcXCJ2YWx1ZVxcXCIgXFxuICAgICAgICBibi1hdHRyPVxcXCJ7cGxhY2Vob2xkZXIsIG1pbmxlbmd0aCwgcmVxdWlyZWR9XFxcIlxcblx0XHRhdXRvY29tcGxldGU9XFxcIm9mZlxcXCJcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dFxcXCI+XFxuXHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtdGV4dC1ibHVlXFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiID48aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+PC9idXR0b24+XFxuPC9mb3JtPlwiLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICBtaW5sZW5ndGg6IDAsXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChlbHQpIHtcblxuICAgICAgICBjb25zdCB7IHBsYWNlaG9sZGVyLCBtaW5sZW5ndGgsIHJlcXVpcmVkIH0gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyLFxuICAgICAgICAgICAgICAgIG1pbmxlbmd0aCxcbiAgICAgICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIG9uU2VhcmNoOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHZhbHVlIH0gPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcbiAgICAgICAgICAgICAgICAgICAgZWx0LnRyaWdnZXIoJ3NlYXJjaGJhcnN1Ym1pdCcsIHsgdmFsdWUgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBjdHJsLnNjb3BlLmZvcm0uc2V0Rm9ybURhdGEoeyB2YWx1ZSB9KVxuICAgICAgICB9XG4gICAgfSxcbiAgICAkaWZhY2U6IGBcbiAgICAgICAgc2V0VmFsdWUodmFsdWU6IHN0cmluZylcbiAgICBgLFxuICAgICRldmVudHM6ICdzZWFyY2hiYXJzdWJtaXQnXG59KTsgMTFcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWRkVXNlcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Vc2VyTmFtZTwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwidXNlcm5hbWVcXFwiIG5hbWU9XFxcInVzZXJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+UHNldWRvPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJwc2V1ZG9cXFwiIG5hbWU9XFxcInBzZXVkb1xcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkxvY2F0aW9uPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJsb2NhdGlvblxcXCIgbmFtZT1cXFwibG9jYXRpb25cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgcGxhY2Vob2xkZXI9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ+XHRcXG5cdDwvZGl2Plxcblx0XFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBwYWdlcikge1xuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKCQodGhpcykuZ2V0Rm9ybURhdGEoKSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNyZWF0ZToge1xuXHRcdFx0XHRcdHRpdGxlOiAnQ3JlYXRlJyxcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtY2hlY2snLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFxuXHRcdH1cblxuXHR9XG5cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC51c2VycycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90Lm5vdGlmcycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJVcGRhdGVcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtcmVkb1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIiB0aXRsZT1cXFwiQWRkIFVzZXJcXFwiPlxcblx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1wbHVzXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+VXNlciBOYW1lPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlBzZXVkbzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Mb2NhdGlvbjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5FbWFpbDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5DcmVhdGUgRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5MYXN0IExvZ2luIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uczwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiZGF0YVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGUsIGNsaWNrLm5vdGlmOiBvbk5vdGlmXFxcIj5cXG4gIFx0XHRcdDx0cj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudXNlcm5hbWVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBzZXVkb1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubG9jYXRpb25cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkID5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8c3BhbiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDJcXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHRcdFx0YXQgXFxuXHRcdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidGV4dDNcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PC9zcGFuPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHRcdDx0ZD5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwiZGVsZXRlIHczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiRGVsZXRlIFVzZXJcXFwiPlxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWYgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdDwvdHI+ICAgICAgXHRcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlVzZXIuQWRtaW5JbnRlcmZhY2V9IHVzZXJzIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLk5vdGlmLkludGVyZmFjZX0gbm90aWZzU3J2IFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCB1c2Vycywgbm90aWZzU3J2LCBwYWdlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkYXRhOiBbXSxcblx0XHRcdFx0dGV4dDE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5jcmVhdGVEYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5sYXN0TG9naW5EYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5sYXN0TG9naW5EYXRlKS50b0xvY2FsZVRpbWVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5jcmVhdGVEYXRlICE9IHVuZGVmaW5lZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkVXNlcjogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBVc2VyJyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLmFkZChkYXRhKVxuXHRcdFx0XHRcdFx0XHRnZXRVc2VycygpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyB1c2VybmFtZSB9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7IHRpdGxlOiAnRGVsZXRlIFVzZXInLCBjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nIH0sIGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLnJlbW92ZSh1c2VybmFtZSlcblx0XHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5vdGlmOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IGN0cmwubW9kZWwuZGF0YVtpZHhdXG5cdFx0XHRcdFx0Y29uc3QgdGV4dCA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoeyB0aXRsZTogJ1NlbmQgTm90aWZpY2F0aW9uJywgbGFiZWw6ICdNZXNzYWdlJyB9KVxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdG5vdGlmc1Nydi5zZW5kTm90aWYodXNlcm5hbWUsIHsgdGV4dCB9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25VcGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRnZXRVc2VycygpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBnZXRVc2VycygpIHtcblx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB1c2Vycy5saXN0KClcblx0XHRcdGNvbnNvbGUubG9nKCdnZXRVc2VycycsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBkYXRhIH0pXG5cblx0XHR9XG5cblx0XHRnZXRVc2VycygpXG5cblxuXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnZpZXdlcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWlmPVxcXCJpc0ltYWdlXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJpbWFnZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW1hZ2VcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7c3JjOiB1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgYm4taWY9XFxcImlzUGRmXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJwZGZcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmVpemJvdC5wZGZcXFwiIFxcblx0XHRibi1kYXRhPVxcXCJ7dXJsfVxcXCIgXFxuXHRcdFxcblx0XHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlzQXVkaW9cXFwiIGNsYXNzPVxcXCJhdWRpb1xcXCI+XFxuXHQ8YXVkaW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC9hdWRpbz5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpc1ZpZGVvXFxcIiBjbGFzcz1cXFwidmlkZW9cXFwiPlxcblx0PHZpZGVvIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiIGNvbnRyb2xzPVxcXCJcXFwiIGNvbnRyb2xzTGlzdD1ub2Rvd25sb2FkPjwvdmlkZW8+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaXNEb2NcXFwiIGNsYXNzPVxcXCJkb2NcXFwiIGJuLWJpbmQ9XFxcImRvY1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnRvcDogb25Ub3BcXFwiPlxcblx0PGJ1dHRvbiBibi1pY29uPVxcXCJmYXMgZmEtYW5nbGUtdXBcXFwiIGNsYXNzPVxcXCJ0b3BcXFwiIHRpdGxlPVxcXCJUb3BcXFwiID48L2J1dHRvbj5cXG5cdDxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiaHRtbFxcXCI+PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpc0NvZGVcXFwiIGJuLWJpbmQ9XFxcImNvZGVcXFwiIGNsYXNzPVxcXCJjb2RlXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdFx0PHByZT5cXG5cdFx0XHQ8Y29kZSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGxhbmd1YWdlfVxcXCI+PC9jb2RlPlxcblx0XHQ8L3ByZT5cXG5cdDwvZGl2PlxcblxcbjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0dHlwZTogJycsXG5cdFx0dXJsOiAnIydcblx0fSxcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0bGV0IHt0eXBlLCB1cmx9ID0gdGhpcy5wcm9wc1xuXHRcdC8vY29uc29sZS5sb2coJ3Byb3BzJywgdGhpcy5wcm9wcylcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dXJsLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRsYW5ndWFnZTogYGxhbmd1YWdlLSR7dHlwZX1gLFxuXHRcdFx0XHRpc0ltYWdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdpbWFnZSdcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNQZGY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3BkZidcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNBdWRpbzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnYXVkaW8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzVmlkZW86IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3ZpZGVvJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0RvYzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnaGRvYydcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNDb2RlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gWydqYXZhc2NyaXB0JywgJ2h0bWwnXS5pbmNsdWRlcyh0aGlzLnR5cGUpXG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRvcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9wJylcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmRvYy5maW5kKCcuc2Nyb2xsUGFuZWwnKS5nZXQoMCkuc2Nyb2xsKDAsIDApXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRhc3luYyBmdW5jdGlvbiByZWFkVGV4dCgpIHtcblx0XHRcdGNvbnN0IHJldCA9IGF3YWl0IGZldGNoKHVybClcdFx0XHRcblx0XHRcdHJldHVybiBhd2FpdCByZXQudGV4dCgpXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gcmVhZEh0bWwoKSB7XG5cdFx0XHRjb25zdCBodG1sRG9jID0gYXdhaXQgcmVhZFRleHQoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnaHRtbERvYycsIGh0bWxEb2MpXG5cdFx0XHRjb25zdCBodG1sRWx0ID0gY3RybC5zY29wZS5kb2MuZmluZCgnLmh0bWwnKVxuXHRcdFx0aHRtbEVsdC5odG1sKGh0bWxEb2MpXG5cdFx0XHRodG1sRWx0LmZpbmQoJ2FbaHJlZl49aHR0cF0nKS5hdHRyKCd0YXJnZXQnLCAnX2JsYW5rJykgLy8gb3BlbiBleHRlcm5hbCBsaW5rIGluIG5ldyBuYXZpZ2F0b3IgdGFiXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gcmVhZENvZGUoKSB7XG5cdFx0XHRjb25zdCBjb2RlID0gYXdhaXQgcmVhZFRleHQoKVxuXHRcdFx0Y29uc3QgY29kZUVsdCA9IGN0cmwuc2NvcGUuY29kZVxuXHRcdFx0Y29kZUVsdC5maW5kKCdjb2RlJykudGV4dChjb2RlKVxuXHRcdFx0UHJpc20uaGlnaGxpZ2h0QWxsVW5kZXIoY29kZUVsdC5nZXQoMCkpXG5cdFx0fVxuXG5cdFx0aWYgKHR5cGUgPT0gJ2hkb2MnKSB7XG5cdFx0XHRyZWFkSHRtbCgpXG5cdFx0fVxuXG5cdFx0aWYgKGN0cmwubW9kZWwuaXNDb2RlKCkpIHtcblx0XHRcdHJlYWRDb2RlKClcblx0XHR9XG5cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbVmlld2VyXSBzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCkge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3VybDogZGF0YS51cmx9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9XG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcERhdGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHQvKipcblx0ICogXG5cdCAqIEByZXR1cm5zIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRsZXQgX2RhdGEgPSBjb25maWdcblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXREYXRhOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIF9kYXRhXG5cdFx0XHR9LFxuXG5cdFx0XHRzYXZlRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRfZGF0YSA9IGRhdGFcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9hcHBEYXRhJywgZGF0YSlcblx0XHRcdH1cblx0XHRcdFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0QWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvYXBpL2FwcHMvYWxsJylcblx0XHRcdH1cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5iZWF0ZGV0ZWN0b3InLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcud29ya2VyUGF0aCAhPSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgJ2JlYXRkZXRlY3RvciB3b3JrZXIgcGF0aCBpcyBub3QgZGVmaW5lZCdcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihjb25maWcud29ya2VyUGF0aCkgICAgICAgIFxuXG4gICAgICAgIGZ1bmN0aW9uIGNvbXB1dGVCZWF0RGV0ZWN0aW9uKGF1ZGlvQnVmZmVyKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2FtcGxlUmF0ZSA9IGF1ZGlvQnVmZmVyLnNhbXBsZVJhdGVcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZsaW5lQ29udGV4dCA9IG5ldyBPZmZsaW5lQXVkaW9Db250ZXh0KDEsIGF1ZGlvQnVmZmVyLmxlbmd0aCwgc2FtcGxlUmF0ZSlcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBidWZmZXIgc291cmNlXG4gICAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0gb2ZmbGluZUNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKClcbiAgICAgICAgICAgICAgICBzb3VyY2UuYnVmZmVyID0gYXVkaW9CdWZmZXJcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBmaWx0ZXJcbiAgICAgICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSBvZmZsaW5lQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKVxuICAgICAgICAgICAgICAgIGZpbHRlci50eXBlID0gXCJsb3dwYXNzXCJcbiAgICAgICAgICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gMjQwXG5cbiAgICAgICAgICAgICAgICAvLyBQaXBlIHRoZSBzb25nIGludG8gdGhlIGZpbHRlciwgYW5kIHRoZSBmaWx0ZXIgaW50byB0aGUgb2ZmbGluZSBjb250ZXh0XG4gICAgICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoZmlsdGVyKVxuICAgICAgICAgICAgICAgIGZpbHRlci5jb25uZWN0KG9mZmxpbmVDb250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgICAgICAgICAgICAgLy8gU2NoZWR1bGUgdGhlIHNvbmcgdG8gc3RhcnQgcGxheWluZyBhdCB0aW1lOjBcbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3RhcnQoMCk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHNvbmdcbiAgICAgICAgICAgICAgICBvZmZsaW5lQ29udGV4dC5zdGFydFJlbmRlcmluZygpXG5cbiAgICAgICAgICAgICAgICAvLyBBY3Qgb24gdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgIG9mZmxpbmVDb250ZXh0Lm9uY29tcGxldGUgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXJlZCBidWZmZXIhXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5uZWxEYXRhID0gZS5yZW5kZXJlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVxuICAgICAgICAgICAgICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBjaGFubmVsRGF0YSwgc2FtcGxlUmF0ZSB9KVxuICAgICAgICAgICAgICAgICAgICB3b3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9ICAgICAgICBcblxuXHRcdHJldHVybiAge1xuICAgICAgICAgICAgY29tcHV0ZUJlYXREZXRlY3Rpb25cblx0XHR9XG5cblx0fSxcblxuXHQkaWZhY2U6IGBmdW5jdGlvbihwcmVmaXgpOkh0dHBJbnRlcmZhY2VgXG5cbn0pO1xuXG5cblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5ibG9ja2x5aW50ZXJwcmV0b3InLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cbiAgICAgICAgbGV0IHZhcmlhYmxlc1ZhbHVlXG4gICAgICAgIGxldCBwcm9jZWR1cmVCbG9ja1xuICAgICAgICBsZXQgdmFyaWFibGVzRGVmXG4gICAgICAgIGxldCBicmVha1N0YXRlID0gJydcbiAgICAgICAgbGV0IGxvZ0Z1bmN0aW9uXG5cbiAgICAgICAgZnVuY3Rpb24gbWF0aFJhbmRvbUludChhLCBiKSB7XG4gICAgICAgICAgICBpZiAoYSA+IGIpIHtcbiAgICAgICAgICAgICAgICAvLyBTd2FwIGEgYW5kIGIgdG8gZW5zdXJlIGEgaXMgc21hbGxlci5cbiAgICAgICAgICAgICAgICB2YXIgYyA9IGE7XG4gICAgICAgICAgICAgICAgYSA9IGI7XG4gICAgICAgICAgICAgICAgYiA9IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGIgLSBhICsgMSkgKyBhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG1hdGhDb21wYXJlKG9wZXJhdG9yLCB2YWwxLCB2YWwyKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnRVEnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA9PT0gdmFsMlxuICAgICAgICAgICAgICAgIGNhc2UgJ05FUSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICE9PSB2YWwyXG4gICAgICAgICAgICAgICAgY2FzZSAnTFQnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA8IHZhbDJcbiAgICAgICAgICAgICAgICBjYXNlICdMVEUnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA8PSB2YWwyXG4gICAgICAgICAgICAgICAgY2FzZSAnR1QnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA+IHZhbDJcbiAgICAgICAgICAgICAgICBjYXNlICdHVEUnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSA+PSB2YWwyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBibG9ja1R5cGVNYXAgPSB7XG4gICAgICAgICAgICAnbWF0aF9udW1iZXInOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2suZmllbGRzLk5VTVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrLmZpZWxkcy5URVhUXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfYXBwZW5kJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFySWQgPSBibG9jay5maWVsZHMuVkFSLmlkXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5URVhUKVxuICAgICAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlW3ZhcklkXSArPSB0ZXh0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfam9pbic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5iSXRlbXMgPSBibG9jay5leHRyYVN0YXRlLml0ZW1Db3VudFxuICAgICAgICAgICAgICAgIGxldCByZXQgPSAnJ1xuICAgICAgICAgICAgICAgIGlmIChibG9jay5pbnB1dHMgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmJJdGVtczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtTmFtZSA9IGBBREQke2l9YFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrLmlucHV0c1tpdGVtTmFtZV0gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1tpdGVtTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ICs9IHRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfbGVuZ3RoJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQUxVRSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGV4dC5sZW5ndGhcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICd2YXJpYWJsZXNfc2V0JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFySWQgPSBibG9jay5maWVsZHMuVkFSLmlkXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVkFMVUUpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7Z2V0VmFyTmFtZSh2YXJJZCl9ID0gJHt2YWx1ZX1gKVxuXG4gICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdID0gdmFsdWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndmFyaWFibGVzX2dldCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuICAgICAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNWYWx1ZVt2YXJJZF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9hcml0aG1ldGljJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwxID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkEpXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMiA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbDEsIHZhbDIgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FERCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSArIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTUlOVVMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLSB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ01VTFRJUExZJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICogdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdESVZJREUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLyB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BPV0VSJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdyh2YWwxLCB2YWwyKVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9zaW5nbGUnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5OVU0pXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBvcGVyYXRvciwgdmFsIH0pXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdST09UJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodmFsKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdBQlMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguYWJzKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTkVHJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtdmFsXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0xOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmxvZyh2YWwpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0xPRzEwJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmxvZzEwKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnRVhQJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmV4cCh2YWwpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BPVzEwJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdygxMCwgdmFsKVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF90cmlnJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbCB9KVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU0lOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnNpbih2YWwgLyAxODAgKiBNYXRoLlBJKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdDT1MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguY29zKHZhbCAvIDE4MCAqIE1hdGguUEkpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1RBTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC50YW4odmFsIC8gMTgwICogTWF0aC5QSSlcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQVNJTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5hc2luKHZhbCkgLyBNYXRoLlBJICogMTgwXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FDT1MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguYWNvcyh2YWwpIC8gTWF0aC5QSSAqIDE4MFxuICAgICAgICAgICAgICAgICAgICBjYXNlICdBVEFOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmF0YW4odmFsKSAvIE1hdGguUEkgKiAxODBcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfcmFuZG9tX2ludCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyb20gPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRlJPTSlcbiAgICAgICAgICAgICAgICBjb25zdCB0byA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5UTylcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0aFJhbmRvbUludChmcm9tLCB0bylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9yb3VuZCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLk5VTSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JPVU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRVUCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRET1dOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKHZhbClcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfY29uc3RhbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjID0gYmxvY2suZmllbGRzLkNPTlNUQU5UXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BJJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLlBJXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguRVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdHT0xERU5fUkFUSU8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgxICsgTWF0aC5zcXJ0KDUpKSAvIDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU1FSVDInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguU1FSVDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU1FSVDFfMic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5TUVJUMV8yXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0lORklOSVRZJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJbmZpbml0eVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIGNvbnN0YW50ZSAnJHtjfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfcmVwZWF0X2V4dCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRJTUVTKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUSU1FUycsIHRpbWVzKVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGltZXM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRE8pXG4gICAgICAgICAgICAgICAgICAgIGlmIChicmVha1N0YXRlID09ICdCUkVBSycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChicmVha1N0YXRlID09ICdDT05USU5VRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X3ByaW50JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBsb2dGdW5jdGlvbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ0Z1bmN0aW9uKGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5URVhUKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfcHJvbXB0X2V4dCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBibG9jay5maWVsZHMuVFlQRVxuICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyB0eXBlLCBsYWJlbCB9KVxuICAgICAgICAgICAgICAgIGNvbnN0IHJldCA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuICAgICAgICAgICAgICAgICAgICBsYWJlbCwgdGl0bGU6ICdFbnRlciB2YWx1ZScsIGF0dHJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2NoYW5nZUNhc2UnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGFyQ2FzZSA9IGJsb2NrLmZpZWxkcy5DQVNFXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBjaGFyQ2FzZSB9KVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQpXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ2FzZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdVUFBFUkNBU0UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE9XRVJDQVNFJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1RJVExFQ0FTRSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGV4dFRvVGl0bGVDYXNlKHZhbHVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbG9naWNfY29tcGFyZSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5BKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDIgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQilcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwxLCB2YWwyIH0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGhDb21wYXJlKG9wZXJhdG9yLCB2YWwxLCB2YWwyKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19vcGVyYXRpb24nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDEgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQSlcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwyID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBvcGVyYXRvciwgdmFsMSwgdmFsMiB9KVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICYmIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnT1InOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgfHwgdmFsMlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19ib29sZWFuJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdCA9IGJsb2NrLmZpZWxkcy5CT09MXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rlc3QnLCB0ZXN0KVxuICAgICAgICAgICAgICAgIHJldHVybiAodGVzdCA9PSAnVFJVRScpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xvZ2ljX25lZ2F0ZSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQk9PTClcbiAgICAgICAgICAgICAgICByZXR1cm4gIXRlc3RcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbG9naWNfdGVybmFyeSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuSUYpXG4gICAgICAgICAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5USEVOKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTFNFKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfaWYnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcblxuICAgICAgICAgICAgICAgIGxldCBoYXNFbHNlID0gZmFsc2VcbiAgICAgICAgICAgICAgICBsZXQgbmJJZiA9IDFcblxuICAgICAgICAgICAgICAgIGNvbnN0IHsgZXh0cmFTdGF0ZSB9ID0gYmxvY2tcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmFTdGF0ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dHJhU3RhdGUuaGFzRWxzZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0Vsc2UgPSBleHRyYVN0YXRlLmhhc0Vsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0cmFTdGF0ZS5lbHNlSWZDb3VudCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iSWYgKz0gZXh0cmFTdGF0ZS5lbHNlSWZDb3VudFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgaGFzRWxzZSwgbmJJZiB9KVxuICAgICAgICAgICAgICAgIGxldCB0ZXN0ID0gZmFsc2VcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5iSWY7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZk5hbWUgPSBgSUYke2l9YFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkb05hbWUgPSBgRE8ke2l9YFxuICAgICAgICAgICAgICAgICAgICB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzW2lmTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGlmTmFtZSwgdGVzdClcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1tkb05hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChoYXNFbHNlICYmICF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTFNFKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc193aGlsZVVudGlsJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IGJsb2NrLmZpZWxkcy5NT0RFXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBtb2RlIH0pXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT0gJ1dISUxFJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG1vZGUgPT0gJ1VOVElMJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoIXRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQk9PTClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgYFVua25vd24gbW9kZSAnJHttb2RlfSdgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc19mb3InOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJJZCA9IGJsb2NrLmZpZWxkcy5WQVIuaWRcbiAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkZST00pXG4gICAgICAgICAgICAgICAgY29uc3QgdG8gPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVE8pXG4gICAgICAgICAgICAgICAgY29uc3QgYnkgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQlkpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmcm9tLCB0bywgYnkgfSlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gZnJvbTsgaSA8PSB0bzsgaSArPSBieSkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXNWYWx1ZVt2YXJJZF0gPSBpXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJyZWFrU3RhdGUgPT0gJ0JSRUFLJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJyZWFrU3RhdGUgPT0gJ0NPTlRJTlVFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3Byb2NlZHVyZXNfY2FsbG5vcmV0dXJuJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBleHRyYVN0YXRlIH0gPSBibG9ja1xuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IGV4dHJhU3RhdGUubmFtZVxuICAgICAgICAgICAgICAgIGxldCBuYkFyZ3MgPSAwXG4gICAgICAgICAgICAgICAgaWYgKGV4dHJhU3RhdGUucGFyYW1zICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBuYkFyZ3MgPSBleHRyYVN0YXRlLnBhcmFtcy5sZW5ndGhcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgYXJncyA9IFtdXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYkFyZ3M7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmdOYW1lID0gYEFSRyR7aX1gXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1thcmdOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFySWQgPSBnZXRWYXJJZChleHRyYVN0YXRlLnBhcmFtc1tpXSlcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdID0gdmFsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgZnVuY3Rpb25OYW1lLCBhcmdzIH0pXG5cbiAgICAgICAgICAgICAgICBjb25zdCB7IGlucHV0cyB9ID0gcHJvY2VkdXJlQmxvY2tbZnVuY3Rpb25OYW1lXVxuXG4gICAgICAgICAgICAgICAgaWYgKGlucHV0cyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0cy5TVEFDSyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5TVEFDSylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dHMuUkVUVVJOICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5SRVRVUk4pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdwcm9jZWR1cmVzX2NhbGxyZXR1cm4nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZWR1cmVzX2NhbGxub3JldHVybihibG9jaylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfZmxvd19zdGF0ZW1lbnRzJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmxvdyA9IGJsb2NrLmZpZWxkcy5GTE9XXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmbG93IH0pXG4gICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9IGZsb3dcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRleHRUb1RpdGxlQ2FzZShzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxTKy9nLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh0eHQpIHsgcmV0dXJuIHR4dFswXS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpOyB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmFyVmFsdWUodmFySWQpIHtcbiAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNWYWx1ZVt2YXJJZF1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldFZhclZhbHVlKHZhcklkLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdID0gdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZhcklkKG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNEZWYuZmluZCgoZSkgPT4gZS5uYW1lID09IG5hbWUpLmlkXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWYXJOYW1lKHZhcklkKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFyaWFibGVzRGVmLmZpbmQoKGUpID0+IGUuaWQgPT0gdmFySWQpLm5hbWVcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGR1bXBWYXJpYWJsZXMoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZHVtcFZhcmlhYmxlczonKVxuICAgICAgICAgICAgaWYgKHZhcmlhYmxlc0RlZiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHsgaWQsIG5hbWUgfSBvZiB2YXJpYWJsZXNEZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB2YXJpYWJsZXNWYWx1ZVtpZF1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7bmFtZX09JHt2YWx1ZX1gKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gZXZhbENvZGUoYmxvY2spIHtcbiAgICAgICAgICAgIGlmIChibG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChibG9jay50eXBlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChibG9jay5ibG9jayAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2sgPSBibG9jay5ibG9ja1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChibG9jay5zaGFkb3cgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrID0gYmxvY2suc2hhZG93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBgTWlzc2lnIHBhcmFtZXRlciBibG9jayBvciBzaGFkb3dgXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXZhbENvZGUnLCBibG9jay50eXBlKVxuICAgICAgICAgICAgY29uc3QgZm4gPSBibG9ja1R5cGVNYXBbYmxvY2sudHlwZV1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdibG9jaycsIGJsb2NrKVxuICAgICAgICAgICAgICAgIHRocm93IGBmdW5jdGlvbiAnJHtibG9jay50eXBlfScgbm90IGltcGxlbWVudGVkIHlldGBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJldCA9IGF3YWl0IGZuLmNhbGwoYmxvY2tUeXBlTWFwLCBibG9jaylcbiAgICAgICAgICAgIGlmIChyZXQgPT0gdW5kZWZpbmVkICYmIGJyZWFrU3RhdGUgPT0gJycpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5uZXh0KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RnVuY3Rpb25OYW1lcyh7IGJsb2NrcyB9KSB7XG4gICAgICAgICAgICBjb25zdCByZXQgPSBbXVxuICAgICAgICAgICAgaWYgKGJsb2NrcyAmJiBibG9ja3MuYmxvY2tzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYmxvY2sgb2YgYmxvY2tzLmJsb2Nrcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmxvY2sudHlwZSA9PSAncHJvY2VkdXJlc19kZWZub3JldHVybicgfHwgYmxvY2sudHlwZSA9PSAncHJvY2VkdXJlc19kZWZyZXR1cm4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZWR1cmVOYW1lID0gYmxvY2suZmllbGRzLk5BTUVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKHByb2NlZHVyZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGNhbGxGdW5jdGlvbihmdW5jdGlvbk5hbWUsIC4uLmZ1bmN0aW9uQXJncykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbGxGdW5jdGlvbicsIGZ1bmN0aW9uTmFtZSwgZnVuY3Rpb25BcmdzKVxuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSBwcm9jZWR1cmVCbG9ja1tmdW5jdGlvbk5hbWVdXG4gICAgICAgICAgICBpZiAoYmxvY2sgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgYGZ1bmN0aW9uICcke2Z1bmN0aW9uTmFtZX0nIGRvZXMgbm90IGV4aXN0cyAhYFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGV4dHJhU3RhdGUsIGlucHV0cyB9ID0gYmxvY2tcbiAgICAgICAgICAgIGxldCBuYkFyZ3MgPSAwXG4gICAgICAgICAgICBpZiAoZXh0cmFTdGF0ZSAhPSB1bmRlZmluZWQgJiYgZXh0cmFTdGF0ZS5wYXJhbXMgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbmJBcmdzID0gZXh0cmFTdGF0ZS5wYXJhbXMubGVuZ3RoXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5iQXJnczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFySWQgPSBleHRyYVN0YXRlLnBhcmFtc1tpXS5pZFxuICAgICAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlW3ZhcklkXSA9IGZ1bmN0aW9uQXJnc1tpXVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaW5wdXRzICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dHMuU1RBQ0sgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5TVEFDSylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHN0YXJ0Q29kZSh7IGJsb2NrcywgdmFyaWFibGVzfSApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGFydENvZGUnKVxuXG4gICAgICAgICAgICB2YXJpYWJsZXNWYWx1ZSA9IHt9XG4gICAgICAgICAgICBwcm9jZWR1cmVCbG9jayA9IHt9XG4gICAgICAgICAgICB2YXJpYWJsZXNEZWYgPSB2YXJpYWJsZXNcbiAgICAgICAgICAgIGNvbnN0IGNvZGVCbG9ja3MgPSBibG9ja3MuYmxvY2tzXG4gICAgICAgICAgICBicmVha1N0YXRlID0gJydcbiAgICAgICAgICAgIGZvciAobGV0IGJsb2NrIG9mIGNvZGVCbG9ja3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2sudHlwZSA9PSAncHJvY2VkdXJlc19kZWZub3JldHVybicgfHwgYmxvY2sudHlwZSA9PSAncHJvY2VkdXJlc19kZWZyZXR1cm4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2NlZHVyZU5hbWUgPSBibG9jay5maWVsZHMuTkFNRVxuICAgICAgICAgICAgICAgICAgICBwcm9jZWR1cmVCbG9ja1twcm9jZWR1cmVOYW1lXSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2NlZHVyZXM6JylcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvY2VkdXJlTmFtZSBvZiBPYmplY3Qua2V5cyhwcm9jZWR1cmVCbG9jaykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwcm9jZWR1cmVOYW1lKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCBibG9jayBvZiBjb2RlQmxvY2tzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLnR5cGUgIT0gJ3Byb2NlZHVyZXNfZGVmbm9yZXR1cm4nICYmIGJsb2NrLnR5cGUgIT0gJ3Byb2NlZHVyZXNfZGVmcmV0dXJuJykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jaylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkdW1wVmFyaWFibGVzKClcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldExvZ0Z1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICBsb2dGdW5jdGlvbiA9IGZuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRCbG9ja1R5cGUodHlwZU5hbWUsIGZuKSB7XG4gICAgICAgICAgICBibG9ja1R5cGVNYXBbdHlwZU5hbWVdID0gZm5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydENvZGUsXG4gICAgICAgICAgICBzZXRMb2dGdW5jdGlvbixcbiAgICAgICAgICAgIGV2YWxDb2RlLFxuICAgICAgICAgICAgZHVtcFZhcmlhYmxlcyxcbiAgICAgICAgICAgIGFkZEJsb2NrVHlwZSxcbiAgICAgICAgICAgIGdldFZhclZhbHVlLFxuICAgICAgICAgICAgc2V0VmFyVmFsdWUsXG4gICAgICAgICAgICBnZXRWYXJOYW1lLFxuICAgICAgICAgICAgZ2V0RnVuY3Rpb25OYW1lcyxcbiAgICAgICAgICAgIGNhbGxGdW5jdGlvbixcbiAgICAgICAgICAgIG1hdGhDb21wYXJlXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmJsb2NrbHlpbnRlcnByZXRvckxleGljYWwnLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cbiAgICAgICAgbGV0IHZhcmlhYmxlc1ZhbHVlXG4gICAgICAgIGxldCBwcm9jZWR1cmVCbG9ja1xuICAgICAgICBsZXQgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgIGxldCBsb2dGdW5jdGlvblxuXG4gICAgICAgIGZ1bmN0aW9uIG1hdGhSYW5kb21JbnQoYSwgYikge1xuICAgICAgICAgICAgaWYgKGEgPiBiKSB7XG4gICAgICAgICAgICAgICAgLy8gU3dhcCBhIGFuZCBiIHRvIGVuc3VyZSBhIGlzIHNtYWxsZXIuXG4gICAgICAgICAgICAgICAgdmFyIGMgPSBhO1xuICAgICAgICAgICAgICAgIGEgPSBiO1xuICAgICAgICAgICAgICAgIGIgPSBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChiIC0gYSArIDEpICsgYSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYXRoQ29tcGFyZShvcGVyYXRvciwgdmFsMSwgdmFsMikge1xuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgJ0VRJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPT09IHZhbDJcbiAgICAgICAgICAgICAgICBjYXNlICdORVEnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSAhPT0gdmFsMlxuICAgICAgICAgICAgICAgIGNhc2UgJ0xUJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPCB2YWwyXG4gICAgICAgICAgICAgICAgY2FzZSAnTFRFJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPD0gdmFsMlxuICAgICAgICAgICAgICAgIGNhc2UgJ0dUJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPiB2YWwyXG4gICAgICAgICAgICAgICAgY2FzZSAnR1RFJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgPj0gdmFsMlxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmxvY2tUeXBlTWFwID0ge1xuICAgICAgICAgICAgJ21hdGhfbnVtYmVyJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9jay5maWVsZHMuTlVNXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrLmZpZWxkcy5URVhUXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfYXBwZW5kJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEVYVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFySWRdICs9IHRleHRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dF9qb2luJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5iSXRlbXMgPSBibG9jay5leHRyYVN0YXRlLml0ZW1Db3VudFxuICAgICAgICAgICAgICAgIGxldCByZXQgPSAnJ1xuICAgICAgICAgICAgICAgIGlmIChibG9jay5pbnB1dHMgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmJJdGVtczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtTmFtZSA9IGBBREQke2l9YFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrLmlucHV0c1tpdGVtTmFtZV0gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1tpdGVtTmFtZV0sIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCArPSB0ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2xlbmd0aCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlZBTFVFLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICByZXR1cm4gdGV4dC5sZW5ndGhcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICdnbG9iYWxfZGVjbGFyYXRpb24nOiBhc3luYyBmdW5jdGlvbihibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlZBTFVFKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhck5hbWUgPSBibG9jay5maWVsZHMuTkFNRVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3Zhck5hbWV9ID0gJHt2YWx1ZX1gKVxuICAgICAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlW3Zhck5hbWVdID0gdmFsdWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGV4aWNhbF92YXJpYWJsZV9nZXQnOiBhc3luYyBmdW5jdGlvbihibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAvKipAdHlwZSB7c3RyaW5nfSAqL1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhck5hbWUgPSBibG9jay5maWVsZHMuVkFSXG4gICAgICAgICAgICAgICAgcmV0dXJuICh2YXJOYW1lLnN0YXJ0c1dpdGgoJ2dsb2JhbCAnKSkgP1xuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXNWYWx1ZVt2YXJOYW1lLnN1YnN0cmluZyg3KV0gOiBsb2NhbFZhcmlhYmxlc1t2YXJOYW1lXSAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICd2YXJpYWJsZXNfZ2V0JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuICAgICAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNWYWx1ZVt2YXJJZF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9hcml0aG1ldGljJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5BLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwyID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkIsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbDEsIHZhbDIgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FERCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSArIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTUlOVVMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLSB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ01VTFRJUExZJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICogdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdESVZJREUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLyB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BPV0VSJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdyh2YWwxLCB2YWwyKVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9zaW5nbGUnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JPT1QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh2YWwpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FCUyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5hYnModmFsKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdORUcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC12YWxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgubG9nKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE9HMTAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgubG9nMTAodmFsKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdFWFAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZXhwKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUE9XMTAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucG93KDEwLCB2YWwpXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAoYFVua25vd24gb3BlcmF0b3IgJyR7b3BlcmF0b3J9J2ApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdtYXRoX3RyaWcnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NJTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5zaW4odmFsIC8gMTgwICogTWF0aC5QSSlcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQ09TJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmNvcyh2YWwgLyAxODAgKiBNYXRoLlBJKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdUQU4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgudGFuKHZhbCAvIDE4MCAqIE1hdGguUEkpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FTSU4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguYXNpbih2YWwpIC8gTWF0aC5QSSAqIDE4MFxuICAgICAgICAgICAgICAgICAgICBjYXNlICdBQ09TJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmFjb3ModmFsKSAvIE1hdGguUEkgKiAxODBcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQVRBTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5hdGFuKHZhbCkgLyBNYXRoLlBJICogMTgwXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAoYFVua25vd24gb3BlcmF0b3IgJyR7b3BlcmF0b3J9J2ApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdtYXRoX3JhbmRvbV9pbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5GUk9NLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zdCB0byA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5UTywgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGhSYW5kb21JbnQoZnJvbSwgdG8pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfcm91bmQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JPVU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRVUCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRET1dOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKHZhbClcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfY29uc3RhbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYyA9IGJsb2NrLmZpZWxkcy5DT05TVEFOVFxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdQSSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5QSVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLkVcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnR09MREVOX1JBVElPJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoMSArIE1hdGguc3FydCg1KSkgLyAyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NRUlQyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLlNRUlQyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NRUlQxXzInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguU1FSVDFfMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdJTkZJTklUWSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSW5maW5pdHlcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBjb25zdGFudGUgJyR7Y30nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2NvbnRyb2xzX3JlcGVhdF9leHQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXMgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVElNRVMsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUSU1FUycsIHRpbWVzKVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGltZXM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRE8pXG4gICAgICAgICAgICAgICAgICAgIGlmIChicmVha1N0YXRlID09ICdCUkVBSycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChicmVha1N0YXRlID09ICdDT05USU5VRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X3ByaW50JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbG9nRnVuY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBsb2dGdW5jdGlvbihhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEVYVCwgbG9jYWxWYXJpYWJsZXMpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dF9wcm9tcHRfZXh0JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBibG9jay5maWVsZHMuVFlQRVxuICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgdHlwZSwgbGFiZWwgfSlcbiAgICAgICAgICAgICAgICBjb25zdCByZXQgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHtcbiAgICAgICAgICAgICAgICAgICAgbGFiZWwsIHRpdGxlOiAnRW50ZXIgdmFsdWUnLCBhdHRyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dF9jaGFuZ2VDYXNlJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoYXJDYXNlID0gYmxvY2suZmllbGRzLkNBU0VcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGNoYXJDYXNlIH0pXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEVYVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ2FzZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdVUFBFUkNBU0UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE9XRVJDQVNFJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1RJVExFQ0FTRSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGV4dFRvVGl0bGVDYXNlKHZhbHVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbG9naWNfY29tcGFyZSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDEgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMiA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwxLCB2YWwyIH0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGhDb21wYXJlKG9wZXJhdG9yLCB2YWwxLCB2YWwyKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19vcGVyYXRpb24nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwxID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkEsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDIgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQiwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBvcGVyYXRvciwgdmFsMSwgdmFsMiB9KVxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICYmIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnT1InOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgfHwgdmFsMlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19ib29sZWFuJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3QgPSBibG9jay5maWVsZHMuQk9PTFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0ZXN0JywgdGVzdClcbiAgICAgICAgICAgICAgICByZXR1cm4gKHRlc3QgPT0gJ1RSVUUnKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19uZWdhdGUnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICByZXR1cm4gIXRlc3RcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbG9naWNfdGVybmFyeSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLklGLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBpZiAodGVzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRIRU4sIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTFNFLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2NvbnRyb2xzX2lmJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuXG4gICAgICAgICAgICAgICAgbGV0IGhhc0Vsc2UgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGxldCBuYklmID0gMVxuXG4gICAgICAgICAgICAgICAgY29uc3QgeyBleHRyYVN0YXRlIH0gPSBibG9ja1xuICAgICAgICAgICAgICAgIGlmIChleHRyYVN0YXRlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0cmFTdGF0ZS5oYXNFbHNlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRWxzZSA9IGV4dHJhU3RhdGUuaGFzRWxzZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRyYVN0YXRlLmVsc2VJZkNvdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmJJZiArPSBleHRyYVN0YXRlLmVsc2VJZkNvdW50XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBoYXNFbHNlLCBuYklmIH0pXG4gICAgICAgICAgICAgICAgbGV0IHRlc3QgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmJJZjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlmTmFtZSA9IGBJRiR7aX1gXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRvTmFtZSA9IGBETyR7aX1gXG4gICAgICAgICAgICAgICAgICAgIHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHNbaWZOYW1lXSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGlmTmFtZSwgdGVzdClcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1tkb05hbWVdLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaGFzRWxzZSAmJiAhdGVzdCkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRUxTRSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2NvbnRyb2xzX3doaWxlVW50aWwnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IGJsb2NrLmZpZWxkcy5NT0RFXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBtb2RlIH0pXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT0gJ1dISUxFJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG1vZGUgPT0gJ1VOVElMJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoIXRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQk9PTClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgYFVua25vd24gbW9kZSAnJHttb2RlfSdgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc19mb3InOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFyTmFtZSA9IGJsb2NrLmZpZWxkcy5WQVJcbiAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlNUQVJULCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zdCB0byA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTkQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGJ5ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlNURVAsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgZnJvbSwgdG8sIGJ5LCB2YXJOYW1lIH0pXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGZyb207IGkgPD0gdG87IGkgKz0gYnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxWYXJpYWJsZXNbdmFyTmFtZV0gPSBpXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETywgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgICAgIGlmIChicmVha1N0YXRlID09ICdCUkVBSycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChicmVha1N0YXRlID09ICdDT05USU5VRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFZhcmlhYmxlc1t2YXJOYW1lXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdwcm9jZWR1cmVzX2NhbGxub3JldHVybic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSBibG9jay5maWVsZHMuUFJPQ05BTUVcblxuICAgICAgICAgICAgICAgIGNvbnN0IHsgaW5wdXRzLCBmaWVsZHMgfSA9IHByb2NlZHVyZUJsb2NrW2Z1bmN0aW9uTmFtZV1cblxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChpbnB1dHMgIT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJnTmFtZXMgPSBnZXRBcmdOYW1lcyhibG9jaylcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZXh0ID0ge31cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJnTmFtZSA9IGBBUkcke2l9YFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHNbYXJnTmFtZV0sIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGV4dFthcmdOYW1lc1tpXV0gPSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coe2Z1bmN0aW9uTmFtZSwgbmV3Q29udGV4dH0pXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRzLlNUQUNLICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoaW5wdXRzLlNUQUNLLCBuZXdDb250ZXh0KVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0cy5SRVRVUk4gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZXZhbENvZGUoaW5wdXRzLlJFVFVSTiwgbmV3Q29udGV4dClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdwcm9jZWR1cmVzX2NhbGxyZXR1cm4nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2VkdXJlc19jYWxsbm9yZXR1cm4oYmxvY2ssIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc19mbG93X3N0YXRlbWVudHMnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmxvdyA9IGJsb2NrLmZpZWxkcy5GTE9XXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmbG93IH0pXG4gICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9IGZsb3dcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRleHRUb1RpdGxlQ2FzZShzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxTKy9nLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh0eHQpIHsgcmV0dXJuIHR4dFswXS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpOyB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmFyVmFsdWUodmFyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhcmlhYmxlc1ZhbHVlW3Zhck5hbWVdXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkdW1wVmFyaWFibGVzKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2R1bXBWYXJpYWJsZXM6JylcbiAgICAgICAgICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh2YXJpYWJsZXNWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtuYW1lfT0ke3ZhbHVlfWApXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGV2YWxDb2RlKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgaWYgKGJsb2NrID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJsb2NrLnR5cGUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLmJsb2NrICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBibG9jayA9IGJsb2NrLmJsb2NrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJsb2NrLnNoYWRvdyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2sgPSBibG9jay5zaGFkb3dcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGBNaXNzaWcgcGFyYW1ldGVyIGJsb2NrIG9yIHNoYWRvd2BcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdldmFsQ29kZScsIGJsb2NrLnR5cGUsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgY29uc3QgZm4gPSBibG9ja1R5cGVNYXBbYmxvY2sudHlwZV1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdibG9jaycsIGJsb2NrKVxuICAgICAgICAgICAgICAgIHRocm93IGBmdW5jdGlvbiAnJHtibG9jay50eXBlfScgbm90IGltcGxlbWVudGVkIHlldGBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJldCA9IGF3YWl0IGZuLmNhbGwoYmxvY2tUeXBlTWFwLCBibG9jaywgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICBpZiAocmV0ID09IHVuZGVmaW5lZCAmJiBicmVha1N0YXRlID09ICcnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2submV4dCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRGdW5jdGlvbk5hbWVzKHsgYmxvY2tzIH0pIHtcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IFtdXG4gICAgICAgICAgICBpZiAoYmxvY2tzICYmIGJsb2Nrcy5ibG9ja3MpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBibG9jayBvZiBibG9ja3MuYmxvY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9jay50eXBlID09ICdwcm9jZWR1cmVzX2RlZm5vcmV0dXJuJyB8fCBibG9jay50eXBlID09ICdwcm9jZWR1cmVzX2RlZnJldHVybicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2NlZHVyZU5hbWUgPSBibG9jay5maWVsZHMuTkFNRVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gocHJvY2VkdXJlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0QXJnTmFtZXMoYmxvY2spIHtcbiAgICAgICAgICAgIGNvbnN0IHsgZmllbGRzIH0gPSBibG9ja1xuICAgICAgICAgICAgY29uc3QgYXJnTmFtZXMgPSBbXVxuICAgICAgICAgICAgZm9yKGxldCBpID0gMCwgZG9uZSA9IGZhbHNlOyAhZG9uZSA7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFyZ05hbWUgPSBmaWVsZHNbJ1ZBUicgKyBpXVxuICAgICAgICAgICAgICAgIGlmIChhcmdOYW1lICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBhcmdOYW1lcy5wdXNoKGFyZ05hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmdOYW1lc1xuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gY2FsbEZ1bmN0aW9uKGZ1bmN0aW9uTmFtZSwgLi4uZnVuY3Rpb25BcmdzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY2FsbEZ1bmN0aW9uJywgZnVuY3Rpb25OYW1lLCBmdW5jdGlvbkFyZ3MpXG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHByb2NlZHVyZUJsb2NrW2Z1bmN0aW9uTmFtZV1cbiAgICAgICAgICAgIGlmIChibG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBgZnVuY3Rpb24gJyR7ZnVuY3Rpb25OYW1lfScgZG9lcyBub3QgZXhpc3RzICFgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgaW5wdXRzIH0gPSBibG9ja1xuXG4gICAgICAgICAgICBpZiAoaW5wdXRzICE9IHVuZGVmaW5lZCkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYXJnTmFtZXMgPSBnZXRBcmdOYW1lcyhibG9jaylcblxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRleHQgPSB7fVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Q29udGV4dFthcmdOYW1lc1tpXV0gPSBmdW5jdGlvbkFyZ3NbaV1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7ZnVuY3Rpb25OYW1lLCBuZXdDb250ZXh0fSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXRzLlNUQUNLICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShpbnB1dHMuU1RBQ0ssIG5ld0NvbnRleHQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSAgICAgXG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBzdGFydENvZGUoeyBibG9ja3MgfSApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGFydENvZGUnKVxuXG4gICAgICAgICAgICB2YXJpYWJsZXNWYWx1ZSA9IHt9XG4gICAgICAgICAgICBwcm9jZWR1cmVCbG9jayA9IHt9XG4gICAgICAgICAgICBjb25zdCBjb2RlQmxvY2tzID0gYmxvY2tzLmJsb2Nrc1xuICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICBcblxuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiBjb2RlQmxvY2tzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLnR5cGUgPT0gJ2dsb2JhbF9kZWNsYXJhdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2spXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJsb2NrLnR5cGUgPT0gJ3Byb2NlZHVyZXNfZGVmbm9yZXR1cm4nIHx8IGJsb2NrLnR5cGUgPT0gJ3Byb2NlZHVyZXNfZGVmcmV0dXJuJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZWR1cmVOYW1lID0gYmxvY2suZmllbGRzLk5BTUVcbiAgICAgICAgICAgICAgICAgICAgcHJvY2VkdXJlQmxvY2tbcHJvY2VkdXJlTmFtZV0gPSBibG9ja1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2NlZHVyZXM6JylcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvY2VkdXJlTmFtZSBvZiBPYmplY3Qua2V5cyhwcm9jZWR1cmVCbG9jaykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwcm9jZWR1cmVOYW1lKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0ICBibG9jayBvZiBjb2RlQmxvY2tzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLnR5cGUgIT0gJ3Byb2NlZHVyZXNfZGVmbm9yZXR1cm4nICYmIFxuICAgICAgICAgICAgICAgICAgICBibG9jay50eXBlICE9ICdwcm9jZWR1cmVzX2RlZnJldHVybicgJiZcbiAgICAgICAgICAgICAgICAgICAgYmxvY2sudHlwZSAhPSAnZ2xvYmFsX2RlY2xhcmF0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jaywge30pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHVtcFZhcmlhYmxlcygpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRMb2dGdW5jdGlvbihmbikge1xuICAgICAgICAgICAgbG9nRnVuY3Rpb24gPSBmblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkQmxvY2tUeXBlKHR5cGVOYW1lLCBmbikge1xuICAgICAgICAgICAgYmxvY2tUeXBlTWFwW3R5cGVOYW1lXSA9IGZuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnRDb2RlLFxuICAgICAgICAgICAgc2V0TG9nRnVuY3Rpb24sXG4gICAgICAgICAgICBldmFsQ29kZSxcbiAgICAgICAgICAgIGR1bXBWYXJpYWJsZXMsXG4gICAgICAgICAgICBhZGRCbG9ja1R5cGUsXG4gICAgICAgICAgICBnZXRWYXJWYWx1ZSxcbiAgICAgICAgICAgIGdldEZ1bmN0aW9uTmFtZXMsXG4gICAgICAgICAgICBjYWxsRnVuY3Rpb24sXG4gICAgICAgICAgICBtYXRoQ29tcGFyZVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5icm9rZXInLCB7XG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXG5cdFx0Y29uc3QgZXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjIoKVxuXG5cdFx0bGV0IHNvY2sgPSBudWxsXG5cdFx0bGV0IGlzQ29ubmVjdGVkID0gZmFsc2Vcblx0XHRsZXQgdHJ5UmVjb25uZWN0ID0gdHJ1ZVxuXHRcdGxldCBpc1BpbmdPayA9IHRydWVcblx0XHRjb25zdCB0b3BpY3MgPSBuZXcgRXZlbnRFbWl0dGVyMih7IHdpbGRjYXJkOiB0cnVlIH0pXG5cdFx0Y29uc3QgcGluZ0ludGVydmFsID0gMTAgKiAxMDAwXG5cdFx0bGV0IHRpbWVvdXRJZCA9IG51bGxcblx0XHRjb25zdCByZWdpc3RlcmVkVG9waWNzID0ge31cblxuXHRcdGxldCB7IGhvc3QsIHBhdGhuYW1lLCBwcm90b2NvbCB9ID0gbG9jYXRpb25cblx0XHRwcm90b2NvbCA9IChwcm90b2NvbCA9PSAnaHR0cDonKSA/ICd3czonIDogJ3dzczonXG5cblxuXHRcdGNvbnN0IHVybCA9IGAke3Byb3RvY29sfS8vJHtob3N0fS9obWkke3BhdGhuYW1lfWBcblxuXHRcdGZ1bmN0aW9uIG9uQ2xvc2UoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNsb3NlJylcblx0XHRcdGlmIChpc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gRGlzY29ubmVjdGVkICEnKVxuXHRcdFx0XHRldmVudHMuZW1pdCgnY29ubmVjdGVkJywgZmFsc2UpXG5cdFx0XHR9XG5cdFx0XHRpc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0XHRpZiAodHJ5UmVjb25uZWN0KSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4geyBjb25uZWN0KCkgfSwgNTAwMClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjaGVja1BpbmcoKSB7XG5cdFx0XHR0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblxuXHRcdFx0XHRpZiAoIWlzUGluZ09rKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3RpbWVvdXQgcGluZycpXG5cdFx0XHRcdFx0c29jay5vbm1lc3NhZ2UgPSBudWxsXG5cdFx0XHRcdFx0c29jay5vbmNsb3NlID0gbnVsbFxuXHRcdFx0XHRcdHNvY2suY2xvc2UoKVxuXHRcdFx0XHRcdG9uQ2xvc2UoKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGlzUGluZ09rID0gZmFsc2Vcblx0XHRcdFx0XHRzZW5kTXNnKHsgdHlwZTogJ3BpbmcnIH0pXG5cdFx0XHRcdFx0Y2hlY2tQaW5nKClcblx0XHRcdFx0fVxuXHRcdFx0fSwgcGluZ0ludGVydmFsKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNvbm5lY3QoKSB7XG5cblx0XHRcdGNvbnNvbGUubG9nKCd0cnkgdG8gY29ubmVjdC4uLicpXG5cblx0XHRcdHNvY2sgPSBuZXcgV2ViU29ja2V0KHVybClcblxuXHRcdFx0c29jay5vbm9wZW4gPSAoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIGJyb2tlclwiKVxuXHRcdFx0XHRpc0Nvbm5lY3RlZCA9IHRydWVcblx0XHRcdFx0aXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdGV2ZW50cy5lbWl0KCdjb25uZWN0ZWQnLCB0cnVlKVxuXHRcdFx0XHRjaGVja1BpbmcoKVxuXG5cdFx0XHR9XG5cblxuXHRcdFx0c29jay5vbm1lc3NhZ2UgPSAoZXYpID0+IHtcblx0XHRcdFx0Y29uc3QgbXNnID0gSlNPTi5wYXJzZShldi5kYXRhKVxuXG5cdFx0XHRcdGlmIChldi5jdXJyZW50VGFyZ2V0ICE9IHNvY2spIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gbWVzc2FnZSBiYWQgdGFyZ2V0JywgbXNnLnR5cGUpXG5cdFx0XHRcdFx0ZXYuY3VycmVudFRhcmdldC5jbG9zZSgpXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gbWVzc2FnZScsIG1zZylcblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ3JlYWR5Jykge1xuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHJlZ2lzdGVyZWRUb3BpY3MpLmZvckVhY2goKHRvcGljKSA9PiB7XG5cdFx0XHRcdFx0XHRzZW5kTXNnKHsgdHlwZTogJ3JlZ2lzdGVyJywgdG9waWMgfSlcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0ZXZlbnRzLmVtaXQoJ3JlYWR5JywgeyBjbGllbnRJZDogbXNnLmNsaWVudElkIH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ3BvbmcnKSB7XG5cdFx0XHRcdFx0aXNQaW5nT2sgPSB0cnVlXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobXNnLnR5cGUgPT0gJ25vdGlmJykge1xuXHRcdFx0XHRcdHRvcGljcy5lbWl0KG1zZy50b3BpYywgbXNnKVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW0Jyb2tlcl0gbG9nJywgbXNnLnRleHQpXG5cdFx0XHRcdFx0dHJ5UmVjb25uZWN0ID0gZmFsc2Vcblx0XHRcdFx0XHRzb2NrLmNsb3NlKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdHNvY2sub25jbG9zZSA9IChldikgPT4ge1xuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSBzb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIGNsb3NlIGJhZCB0YXJnZXQnKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbYnJva2VyXSBjbG9zZScpXG5cdFx0XHRcdGlmICh0aW1lb3V0SWQgIT0gbnVsbCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0SWQpXG5cdFx0XHRcdFx0dGltZW91dElkID0gbnVsbFxuXHRcdFx0XHR9XG5cdFx0XHRcdG9uQ2xvc2UoKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VuZE1zZyhtc2cpIHtcblx0XHRcdG1zZy50aW1lID0gRGF0ZS5ub3coKVxuXHRcdFx0Y29uc3QgdGV4dCA9IEpTT04uc3RyaW5naWZ5KG1zZylcblx0XHRcdGlmIChpc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBzZW5kTXNnJywgbXNnKVxuXHRcdFx0XHRzb2NrLnNlbmQodGV4dClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBlbWl0VG9waWModG9waWMsIGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIGVtaXRUb3BpYycsIHRvcGljLCBkYXRhKVxuXHRcdFx0Y29uc3QgbXNnID0ge1xuXHRcdFx0XHR0eXBlOiAnbm90aWYnLFxuXHRcdFx0XHR0b3BpYyxcblx0XHRcdFx0ZGF0YVxuXHRcdFx0fVxuXG5cdFx0XHRzZW5kTXNnKG1zZylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvblRvcGljKHRvcGljLCBjYWxsYmFjaykge1xuXHRcdFx0dG9waWNzLm9uKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvZmZUb3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRvcGljcy5vZmYodG9waWMsIGNhbGxiYWNrKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gcmVnaXN0ZXInLCB0b3BpYylcblx0XHRcdGlmIChyZWdpc3RlcmVkVG9waWNzW3RvcGljXSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPSAxXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cmVnaXN0ZXJlZFRvcGljc1t0b3BpY10rKztcblx0XHRcdH1cblx0XHRcdHRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0XHRzZW5kTXNnKHsgdHlwZTogJ3JlZ2lzdGVyJywgdG9waWMgfSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1bnJlZ2lzdGVyKHRvcGljLCBjYWxsYmFjaykge1xuXG5cdFx0XHR0b3BpY3Mub2ZmKHRvcGljLCBjYWxsYmFjaylcblxuXHRcdFx0aWYgKC0tcmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPT0gMCkge1xuXHRcdFx0XHRkZWxldGUgcmVnaXN0ZXJlZFRvcGljc1t0b3BpY11cblx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICd1bnJlZ2lzdGVyJywgdG9waWMgfSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25uZWN0KClcblxuXHRcdHJldHVybiB7XG5cdFx0XHRlbWl0VG9waWMsXG5cdFx0XHRvblRvcGljLFxuXHRcdFx0b2ZmVG9waWMsXG5cdFx0XHRyZWdpc3Rlcixcblx0XHRcdHVucmVnaXN0ZXIsXG5cdFx0XHRvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKVxuXG5cdFx0fVxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuY2l0aWVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZScsICdicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlLCBodHRwU3J2KSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvY2l0aWVzJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRDb3VudHJpZXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9jb3VudHJpZXMnKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Q2l0aWVzOiBmdW5jdGlvbihjb3VudHJ5LCBzZWFyY2gpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2NpdGllcycsIHtjb3VudHJ5LCBzZWFyY2h9KVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Q2l0ZXNGcm9tUG9zdGFsQ29kZTogYXN5bmMgZnVuY3Rpb24ocG9zdGFsQ29kZSkge1xuXHRcdFx0XHRjb25zdCB1cmwgPSAnaHR0cHM6Ly9hcGljYXJ0by5pZ24uZnIvYXBpL2NvZGVzLXBvc3RhdXgvY29tbXVuZXMvJyArIHBvc3RhbENvZGVcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgaHR0cFNydi5nZXQodXJsKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdHJldHVybiBpbmZvLm1hcCgoaSkgPT4gaS5saWJlbGxlQWNoZW1pbmVtZW50KVx0XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2goZSkge1xuXHRcdFx0XHRcdHJldHVybiBbXVxuXHRcdFx0XHR9XG5cdFxuXHRcdFx0fVxuXG5cblx0XHRcdFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmNvbnRhY3RzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvY29udGFjdHMnKVxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0YWRkQ29udGFjdDogZnVuY3Rpb24gKGluZm8pIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZENvbnRhY3RgLCBpbmZvKVxuXHRcdFx0fSxcblx0XHRcdGdldENvbnRhY3RzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldENvbnRhY3RzYClcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZUNvbnRhY3Q6IGZ1bmN0aW9uIChjb250YWN0SWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlQ29udGFjdC8ke2NvbnRhY3RJZH1gKVxuXHRcdFx0fSxcblxuXHRcdFx0dXBkYXRlQ29udGFjdEluZm86IGZ1bmN0aW9uIChjb250YWN0SWQsIGluZm8pIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL3VwZGF0ZUNvbnRhY3RJbmZvLyR7Y29udGFjdElkfWAsIGluZm8pXG5cdFx0XHR9XG5cdFx0XHRcblxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmRpc3BsYXknLCB7XG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcGFyYW1zKSB7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ3BhcmFtcycsIHBhcmFtcylcbiAgICAgICAgY29uc3QgZXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjIoKVxuXG4gICAgICAgIGNvbnN0IHByZXNlbnRhdGlvblJlcXVlc3QgPSBuZXcgUHJlc2VudGF0aW9uUmVxdWVzdCgkJC51cmwuZ2V0VXJsUGFyYW1zKCcvYXBwcy9jYXN0JywgeyBpZDogcGFyYW1zLiRpZCB9KSlcbiAgICAgICAgbGV0IHByZXNlbnRhdGlvbkNvbm5lY3Rpb24gPSBudWxsXG5cbiAgICAgICAgcHJlc2VudGF0aW9uUmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdjb25uZWN0aW9uYXZhaWxhYmxlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGlvbmF2YWlsYWJsZScsIGV2ZW50KVxuICAgICAgICAgICAgcHJlc2VudGF0aW9uQ29ubmVjdGlvbiA9IGV2ZW50LmNvbm5lY3Rpb25cblxuICAgICAgICAgICAgcHJlc2VudGF0aW9uQ29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnbWVzc2FnZScsIGV2ZW50LmRhdGEpXG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gSlNPTi5wYXJzZShldmVudC5kYXRhKVxuICAgICAgICAgICAgICAgIHN3aXRjaChtc2cudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWFkeSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgncmVhZHknKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXZlbnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQobXNnLm5hbWUsIG1zZy52YWx1ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ3Rlcm1pbmF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdjbG9zZScpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBldmVudHMuZW1pdCgnY29ubmVjdGlvbmF2YWlsYWJsZScpXG4gICAgICAgIH0pXG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gZ2V0QXZhaWxhYmlsaXR5KCkge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmlsaXR5ID0gYXdhaXQgcHJlc2VudGF0aW9uUmVxdWVzdC5nZXRBdmFpbGFiaWxpdHkoKVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQXZhaWxhYmxlIHByZXNlbnRhdGlvbiBkaXNwbGF5czogJyArIGF2YWlsYWJpbGl0eS52YWx1ZSlcblxuICAgICAgICAgICAgYXZhaWxhYmlsaXR5LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnPiBBdmFpbGFibGUgcHJlc2VudGF0aW9uIGRpc3BsYXlzOiAnICsgYXZhaWxhYmlsaXR5LnZhbHVlKVxuICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdhdmFpbGFiaWxpdHknLCBhdmFpbGFiaWxpdHkudmFsdWUpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gYXdhaXQgcHJlc2VudGF0aW9uUmVxdWVzdC5zdGFydCgpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24udGVybWluYXRlKClcbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24gPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZW5kTXNnKG1zZykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2VuZE1zZycsIG1zZylcbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24uc2VuZChKU09OLnN0cmluZ2lmeShtc2cpKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0VXJsKHVybCkge1xuICAgICAgICAgICAgc2VuZE1zZyh7IHR5cGU6ICd1cmwnLCB1cmwgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldFZvbHVtZSh2b2x1bWUpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAndm9sdW1lJywgdm9sdW1lIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRDdXJyZW50VGltZShjdXJyZW50VGltZSkge1xuICAgICAgICAgICAgc2VuZE1zZyh7IHR5cGU6ICdjdXJyZW50VGltZScsIGN1cnJlbnRUaW1lIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwbGF5KCkge1xuICAgICAgICAgICAgc2VuZE1zZyh7dHlwZTogJ3BsYXknfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHBhdXNlKCkge1xuICAgICAgICAgICAgc2VuZE1zZyh7dHlwZTogJ3BhdXNlJ30pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc1N0YXJ0ZWQoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHByZXNlbnRhdGlvbkNvbm5lY3Rpb24gIT0gbnVsbClcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVuYWJsZUthcmFva2UoZW5hYmxlZCkge1xuICAgICAgICAgICAgc2VuZE1zZyh7dHlwZTogJ2VuYWJsZUthcmFva2UnLCBlbmFibGVkfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGdldEF2YWlsYWJpbGl0eSgpXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9uOiBldmVudHMub24uYmluZChldmVudHMpLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBjbG9zZSxcbiAgICAgICAgICAgIGlzU3RhcnRlZCxcbiAgICAgICAgICAgIHNldFVybCxcbiAgICAgICAgICAgIHNldFZvbHVtZSxcbiAgICAgICAgICAgIHNldEN1cnJlbnRUaW1lLFxuICAgICAgICAgICAgcGxheSxcbiAgICAgICAgICAgIHBhdXNlLFxuICAgICAgICAgICAgZW5hYmxlS2FyYW9rZVxuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZScsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSwgcGFyYW1zKSB7XG5cdFx0LyoqQHR5cGUge0JyYWluanMuU2VydmljZXMuSHR0cC5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2ZpbGVzJylcblxuXHRcdGNvbnN0IHNhdmluZ0RsZyA9ICQkLnVpLnByb2dyZXNzRGlhbG9nKClcblxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGZpbGVJbmZvOiBmdW5jdGlvbiAoZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBmaWxlSW5mbycsIGZpbGVQYXRoLCBmcmllbmRVc2VyLCBvcHRpb25zKVxuXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9maWxlSW5mbycsIHsgZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMgfSlcblx0XHRcdH0sXG5cdFx0XHRsaXN0OiBmdW5jdGlvbiAoZGVzdFBhdGgsIG9wdGlvbnMsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgZGVzdFBhdGgpXG5cblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2xpc3QnLCB7IGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRtb3ZlOiBmdW5jdGlvbihmaWxlTmFtZSwgZGVzdFBhdGgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7IGRlc3RQYXRoLCBmaWxlTmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbiAoZmlsZU5hbWUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHsgZmlsZU5hbWUsIGZyaWVuZFVzZXIgfSlcblx0XHRcdH0sXG5cblx0XHRcdGZpbGVBcHBVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdGZpbGVOYW1lID0gYC9hcHBzLyR7cGFyYW1zLiRhcHBOYW1lfS8ke2ZpbGVOYW1lfWBcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHsgZmlsZU5hbWUgfSlcblx0XHRcdH0sXG5cblx0XHRcdGZpbGVUaHVtYm5haWxVcmw6IGZ1bmN0aW9uIChmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXJsLmdldFVybFBhcmFtcygnL2FwaS9maWxlcy9sb2FkVGh1bWJuYWlsJywgeyBmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlciB9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZUFwcFRodW1ibmFpbFVybDogZnVuY3Rpb24gKGZpbGVOYW1lLCBzaXplKSB7XG5cdFx0XHRcdGZpbGVOYW1lID0gYC9hcHBzLyR7cGFyYW1zLiRhcHBOYW1lfS8ke2ZpbGVOYW1lfWBcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHsgZmlsZU5hbWUsIHNpemUgfSlcblx0XHRcdH0sXG5cblx0XHRcdGFzc2V0c1VybDogZnVuY3Rpb24oZmlsZU5hbWUpICB7XG5cdFx0XHRcdHJldHVybiAgYC93ZWJhcHBzLyR7cGFyYW1zLiRhcHBOYW1lfS9hc3NldHMvJHtmaWxlTmFtZX1gXG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFxuXHRcdFx0ICogQHBhcmFtIHtCbG9ifSBibG9iIFxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHNhdmVBc2ZpbGVOYW1lIFxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IGRlc3RQYXRoIFxuXHRcdFx0ICogQHBhcmFtIHtib29sZWFufSBjaGVja0V4aXN0c1xuXHRcdFx0ICogQHBhcmFtIHsqfSBvblVwbG9hZFByb2dyZXNzIFxuXHRcdFx0ICogQHJldHVybnMgXG5cdFx0XHQgKi9cblx0XHRcdHVwbG9hZEZpbGU6IGFzeW5jIGZ1bmN0aW9uIChibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgsIGNoZWNrRXhpc3RzLCBvblVwbG9hZFByb2dyZXNzKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gdXBsb2FkRmlsZScsIGNoZWNrRXhpc3RzLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgpXG5cdFx0XHRcdGlmICghKGJsb2IgaW5zdGFuY2VvZiBCbG9iKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUud2FybignRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY2hlY2tFeGlzdHMpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5maWxlSW5mbyhkZXN0UGF0aCArICcvJyArIHNhdmVBc2ZpbGVOYW1lKVxuXHRcdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdGaWxlIGFscmVhZHkgZXhpc3RzJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2goZSkge1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBmZCA9IG5ldyBGb3JtRGF0YSgpXG5cdFx0XHRcdGZkLmFwcGVuZCgnZmlsZScsIGJsb2IsIHNhdmVBc2ZpbGVOYW1lKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2Rlc3RQYXRoJywgZGVzdFBhdGgpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3RGb3JtRGF0YSgnL3NhdmUnLCBmZCwgb25VcGxvYWRQcm9ncmVzcylcblxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdibG9iJywgYmxvYilcblxuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZUZpbGU6IGFzeW5jIGZ1bmN0aW9uIChibG9iLCBzYXZlQXNmaWxlTmFtZSwgb3B0aW9ucykge1xuXHRcdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXHRcdFx0XHRjb25zdCBkZXN0UGF0aCAgPSBvcHRpb25zLmRlc3RQYXRoIHx8IGAvYXBwcy8ke3BhcmFtcy4kYXBwTmFtZX1gXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0c2F2aW5nRGxnLnNldFBlcmNlbnRhZ2UoMClcblx0XHRcdFx0XHRzYXZpbmdEbGcuc2hvdygpXG5cdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IHRoaXMudXBsb2FkRmlsZShibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgsIG9wdGlvbnMuY2hlY2tFeGlzdHMsICh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdFx0c2F2aW5nRGxnLnNldFBlcmNlbnRhZ2UodmFsdWUpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRhd2FpdCAkJC51dGlsLndhaXQoMTAwMClcblx0XHRcdFx0XHRzYXZpbmdEbGcuaGlkZSgpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWVcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvcicsIGUpXG5cdFx0XHRcdFx0c2F2aW5nRGxnLmhpZGUoKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0IHx8IGVcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH1cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2ZyaWVuZHMnKVxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0Z2V0RnJpZW5kczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRGcmllbmRzYClcblx0XHRcdH0sXG5cblx0XHRcdGdldEZyaWVuZEluZm86IGZ1bmN0aW9uIChmcmllbmQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2dldEZyaWVuZEluZm8nLCB7IGZyaWVuZCB9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2V0RnJpZW5kSW5mbzogZnVuY3Rpb24gKGZyaWVuZCwgZ3JvdXBzLCBwb3NpdGlvbkF1dGgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3NldEZyaWVuZEluZm8nLCB7IGZyaWVuZCwgZ3JvdXBzLCBwb3NpdGlvbkF1dGggfSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZEZyaWVuZDogZnVuY3Rpb24gKGZyaWVuZFVzZXJOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRGcmllbmRgLCB7IGZyaWVuZFVzZXJOYW1lIH0pXG5cdFx0XHR9XG5cblxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZ1bGxzY3JlZW4nLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cblxuICAgICAgICBmdW5jdGlvbiBpbml0KGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLCBlID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlJykgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgIT0gbnVsbClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJmdWxsc2NyZWVuY2hhbmdlXCIsIGUgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2Z1bGxzY3JlZW5jaGFuZ2UnKVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICE9IG51bGwpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdrZXlkb3duJywgZS5rZXkpXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5ID09IFwiRjExXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbnRlcigpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3RGdWxsc2NyZWVuID0gZWxlbS5yZXF1ZXN0RnVsbHNjcmVlbiB8fFxuICAgICAgICAgICAgICAgIGVsZW0ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW5cblxuICAgICAgICAgICAgaWYgKHJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdEZ1bGxzY3JlZW4uY2FsbChlbGVtKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBleGl0KCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKVxuICAgICAgICB9XG5cblxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbml0LFxuICAgICAgICAgICAgZW50ZXIsXG4gICAgICAgICAgICBleGl0XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgY2xhc3MgTXlHYW1lcGFkIGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgICAgICB0aGlzLmJ1dHRvbnMgPSBbXVxuICAgICAgICAgICAgdGhpcy5heGVzID0gW11cblxuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2dhbWVwYWRjb25uZWN0ZWQnLCAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdnYW1lcGFkY29ubmVjdGVkJywgZXYpXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB7IHByZXNzZWQgfSBvZiBldi5nYW1lcGFkLmJ1dHRvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idXR0b25zLnB1c2gocHJlc3NlZClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiBldi5nYW1lcGFkLmF4ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5heGVzLnB1c2godmFsKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdidXR0b25zJywgYnV0dG9ucylcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcsIGV2LmdhbWVwYWQpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZ2FtZXBhZGRpc2Nvbm5lY3RlZCcsIChldikgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2dhbWVwYWRkaXNjb25uZWN0ZWQnLCBldilcbiAgICAgICAgICAgICAgICB0aGlzLmJ1dHRvbnMgPSBbXVxuICAgICAgICAgICAgICAgIHRoaXMuYXhlcyA9IFtdXG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcsIGV2LmdhbWVwYWQpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgY2hlY2tHYW1lUGFkU3RhdHVzKCkge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpWzBdXG4gICAgICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcHJlc3NlZCB9ID0gaW5mby5idXR0b25zW2ldXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmVzc2VkICE9IHRoaXMuYnV0dG9uc1tpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KHByZXNzZWQgPyAnYnV0dG9uRG93bicgOiAnYnV0dG9uVXAnLCB7IGlkOiBpIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1dHRvbnNbaV0gPSBwcmVzc2VkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmF4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBpbmZvLmF4ZXNbaV1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9IHRoaXMuYXhlc1tpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdheGUnLCB7IGlkOiBpLCB2YWx1ZSB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5heGVzW2ldID0gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRoaXMuY2hlY2tHYW1lUGFkU3RhdHVzLmJpbmQodGhpcyksIDUwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZ2V0QnV0dG9uU3RhdGUoYnV0dG9uSWQpIHtcbiAgICAgICAgICAgIHJldHVybiBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVswXS5idXR0b25zW2J1dHRvbklkXS5wcmVzc2VkXG4gICAgICAgIH1cblxuICAgICAgICBnZXRBeGVWYWx1ZShheGVJZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5nZXRHYW1lcGFkcygpWzBdLmF4ZXNbYXhlSWRdXG4gICAgICAgIH1cblxuICAgICAgICBnZXRHYW1lcGFkcygpIHtcbiAgICAgICAgICAgIHJldHVybiBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZ2FtZXBhZCcsIHtcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgTXlHYW1lcGFkKClcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KSgpO1xuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZ2VvbG9jJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvcG9zaXRpb24nKVxuXG5cblx0XHRsZXQgY29vcmRzID0gbnVsbFxuXG5cdFx0ZnVuY3Rpb24gZ2VvRXJyb3IoZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2dlb2xvYyBlcnJvcjonLCBlKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZUxvY2F0aW9uKHBvc2l0aW9uKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCd1cGRhdGVMb2NhdGlvbicsIHBvc2l0aW9uKVxuXHRcdFx0Y29vcmRzID0gcG9zaXRpb24uY29vcmRzXG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBzdGFydFdhdGNoKCkge1xuXG5cdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKHVwZGF0ZUxvY2F0aW9uKVxuXG5cdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24ud2F0Y2hQb3NpdGlvbih1cGRhdGVMb2NhdGlvbiwgZ2VvRXJyb3IsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRlbmFibGVIaWdoQWNjdXJhY3k6IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0KVx0XG5cblx0XHRcdHNldEludGVydmFsKHNlbmRQb3NpdGlvbiwgMzAgKiAxMDAwKSAvLyBldmVyeSAzMCBzZWNcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIHNlbmRQb3NpdGlvbigpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbmRQb3NpdGlvbicsIGNvb3Jkcylcblx0XHRcdGlmIChjb29yZHMgIT0gbnVsbCkge1xuXHRcdFx0XHRodHRwLnBvc3QoJy9wb3NpdGlvbicsIHtcblx0XHRcdFx0XHRsYXQ6IGNvb3Jkcy5sYXRpdHVkZSxcblx0XHRcdFx0XHRsbmc6IGNvb3Jkcy5sb25naXR1ZGVcblx0XHRcdFx0fSlcblxuXHRcdFx0fVxuXHRcdH1cdFx0XG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHRzdGFydFdhdGNoXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuaHR0cCcsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgcGFyYW1zKSB7XG5cblx0XHRyZXR1cm4gcmVzb3VyY2UoYC9hcGkvYXBwLyR7cGFyYW1zLiRhcHBOYW1lfWApXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lm5vdGlmcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL25vdGlmcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VuZE5vdGlmOiBmdW5jdGlvbiAodG8sIG5vdGlmKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZW5kTm90aWZgLCB7IHRvLCBub3RpZiB9KVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlTm90aWY6IGZ1bmN0aW9uIChub3RpZklkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZU5vdGlmLyR7bm90aWZJZH1gKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Tm90aWZzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXROb3RpZkNvdW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmQ291bnRgKVxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFnZXInLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gJCgnLmJyZWl6Ym90UGFnZXInKS5pZmFjZSgpXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhcmFtcycsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAodHlwZW9mIGNvbmZpZyA9PSAnc3RyaW5nJykgPyBKU09OLnBhcnNlKGNvbmZpZykgOiB7fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wbGF5bGlzdHMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9wbGF5bGlzdHMnKVxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0Z2V0UGxheWxpc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2dldFBsYXlsaXN0YClcblx0XHRcdH0sXG5cblx0XHRcdGdldFBsYXlsaXN0U29uZ3M6IGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9nZXRQbGF5bGlzdFNvbmdzYCwge25hbWV9KVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucmFkYXInLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJywgJ2JyYWluanMuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9yYWRhcicpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0UmFkYXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nKVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIGh0dHAsIGJyb2tlciwgcGFyYW1zKSB7XG5cblx0XHRjb25zdCBldmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyMigpXG5cblx0XHRjb25zdCBwcml2YXRlID0ge1xuXHRcdFx0c3JjSWQ6IG51bGwsXG5cdFx0XHRkZXN0SWQ6IG51bGwsXG5cdFx0XHRkaXN0YW50OiAnJyxcblx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdGlzQ2FsbGVlOiBmYWxzZVxuXHRcdH1cblxuXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHRwcml2YXRlLmRpc3RhbnQgPSBwYXJhbXMuY2FsbGVyXG5cdFx0XHRwcml2YXRlLmRlc3RJZCA9IHBhcmFtcy5jbGllbnRJZFxuXHRcdFx0cHJpdmF0ZS5pc0NhbGxlZSA9IHRydWVcblx0XHR9XG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKG1zZykgPT4ge1xuXHRcdFx0cHJpdmF0ZS5zcmNJZCA9IG1zZy5jbGllbnRJZFxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc3JjSWQnLCBtc2cuY2xpZW50SWQpXG5cdFx0XHRldmVudHMuZW1pdCgncmVhZHknKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFjY2VwdCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjYW5jZWwoZmFsc2UpXG5cdFx0XHRwcml2YXRlLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRldmVudHMuZW1pdCgnYWNjZXB0Jylcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ3JlZnVzZWQnXG5cdFx0XHRjYW5jZWwoZmFsc2UpXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdGV2ZW50cy5lbWl0KCdkZW55JylcblxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmJ5ZScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdkaXNjb25uZWN0ZWQnXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdGV2ZW50cy5lbWl0KCdieWUnKVxuXG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gZ2V0UmVtb3RlQ2xpZW50SWQoKSB7XG5cdFx0XHRyZXR1cm4gcHJpdmF0ZS5kZXN0SWRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwcm9jZXNzQ2FsbCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBwcm9jZXNzQ2FsbCcpXG5cdFx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYWxsJywgKG1zZykgPT4ge1xuXHRcdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0XHRwcml2YXRlLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0XHRldmVudHMuZW1pdCgnY2FsbCcsIG1zZy5kYXRhKVxuXHRcdFx0fSlcblxuXHRcdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FuY2VsJywgKG1zZykgPT4ge1xuXHRcdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0XHRldmVudHMuZW1pdCgnY2FuY2VsJylcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb25EYXRhKG5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLicgKyBuYW1lLCAobXNnKSA9PiB7XG5cdFx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKG1zZy5kYXRhLCBtc2cudGltZSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW1pdFN0YXR1cygpIHtcblx0XHRcdGV2ZW50cy5lbWl0KCdzdGF0dXMnLCB7IHN0YXR1czogcHJpdmF0ZS5zdGF0dXMsIGRpc3RhbnQ6IHByaXZhdGUuZGlzdGFudCB9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNhbGwodG8sIGFwcE5hbWUsIGljb25DbHMpIHtcblx0XHRcdHByaXZhdGUuZGlzdGFudCA9IHRvXG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdjYWxsaW5nJ1xuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwge1xuXHRcdFx0XHR0byxcblx0XHRcdFx0c3JjSWQ6IHByaXZhdGUuc3JjSWQsXG5cdFx0XHRcdHR5cGU6ICdjYWxsJyxcblx0XHRcdFx0ZGF0YTogeyBhcHBOYW1lLCBpY29uQ2xzIH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuY2VsKHVwZGF0ZVN0YXR1cyA9IHRydWUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBjYW5jZWwnLCB1cGRhdGVTdGF0dXMpXG5cdFx0XHRpZiAodXBkYXRlU3RhdHVzKSB7XG5cdFx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ2NhbmNlbGVkJ1xuXHRcdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdH1cblx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7IHRvOiBwcml2YXRlLmRpc3RhbnQsIHNyY0lkOiBwcml2YXRlLnNyY0lkLCB0eXBlOiAnY2FuY2VsJyB9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGFjY2VwdCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBhY2NlcHQnKVxuXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdHJldHVybiBzZW5kRGF0YSgnYWNjZXB0Jylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBkZW55KCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tSVENdIGRlbnknKVxuXG5cdFx0XHRyZXR1cm4gc2VuZERhdGEoJ2RlbnknKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGJ5ZSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBieWUnKVxuXG5cdFx0XHRpZiAocHJpdmF0ZS5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcblx0XHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAncmVhZHknXG5cdFx0XHRcdHByaXZhdGUuZGlzdGFudCA9ICcnXG5cdFx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0XHRyZXR1cm4gc2VuZERhdGEoJ2J5ZScpXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGV4aXQoKSB7XG5cdFx0XHRpZiAocHJpdmF0ZS5zdGF0dXMgPT0gJ2NhbGxpbmcnKSB7XG5cdFx0XHRcdHJldHVybiBjYW5jZWwoKVxuXHRcdFx0fVxuXHRcdFx0aWYgKHByaXZhdGUuc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XG5cdFx0XHRcdHJldHVybiBieWUoKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VuZERhdGEodHlwZSwgZGF0YSkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50YCwge1xuXHRcdFx0XHRkZXN0SWQ6IHByaXZhdGUuZGVzdElkLFxuXHRcdFx0XHRzcmNJZDogcHJpdmF0ZS5zcmNJZCxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0ZGF0YVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc0NhbGxlZSgpIHtcblx0XHRcdHJldHVybiBwcml2YXRlLmlzQ2FsbGVlXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGNhbGwsXG5cdFx0XHRjYW5jZWwsXG5cdFx0XHRkZW55LFxuXHRcdFx0YnllLFxuXHRcdFx0c2VuZERhdGEsXG5cdFx0XHRvbkRhdGEsXG5cdFx0XHRvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcblx0XHRcdHByb2Nlc3NDYWxsLFxuXHRcdFx0Z2V0UmVtb3RlQ2xpZW50SWQsXG5cdFx0XHRleGl0LFxuXHRcdFx0YWNjZXB0LFxuXHRcdFx0aXNDYWxsZWVcblxuXHRcdH1cblx0fVxufSk7XG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Quc2NoZWR1bGVyJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbkFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYXBwUGFyYW1zLCBuZXdUYWJUaXRsZSkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbc2NoZWR1bGVyXSBvcGVuQXBwJywgYXBwTmFtZSwgYXBwUGFyYW1zLCBuZXdUYWIpXG5cdFx0XHRcdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHR5cGU6ICdvcGVuQXBwJyxcblx0XHRcdFx0XHQgZGF0YToge2FwcE5hbWUsIGFwcFBhcmFtcywgbmV3VGFiVGl0bGV9XG5cdFx0XHRcdFx0fSwgbG9jYXRpb24uaHJlZilcblxuXHRcdFx0fSxcblx0XHRcdGxvZ291dDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbc2NoZWR1bGVyXSBsb2dvdXQnKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2xvZ291dCcpXG5cdFx0XHR9XHRcdCBcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5zb25ncycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3NvbmdzJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZW5lcmF0ZURiOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9nZW5lcmF0ZURiJylcblx0XHRcdH0sXG5cblx0XHRcdHF1ZXJ5U29uZ3M6IGZ1bmN0aW9uIChxdWVyeSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvcXVlcnlTb25ncycsIHsgcXVlcnkgfSlcblx0XHRcdH1cblxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNwb3RpZnknLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cbiAgICAgICAgY29uc3QgYmFzZVVyaSA9ICdodHRwczovL2FwaS5zcG90aWZ5LmNvbS92MSdcbiAgICAgICAgY29uc3QgYmFzZVRva2VuVXJpID0gJ2h0dHBzOi8vc3BvdGlmeS13ZWItYXBpLXRva2VuLmhlcm9rdWFwcC5jb20nXG4gICAgICAgIGxldCB0b2tlbiA9IG51bGxcblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBwZXJmb3JtUmVxdWVzdCh1cmwsIHBhcmFtcykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygncGVyZm9ybVJlcXVlc3QnLCB1cmwsIHBhcmFtcylcbiAgICAgICAgICAgIGxldCByZXQgPSBudWxsXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b2tlbiA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVwID0gYXdhaXQgZmV0Y2goYmFzZVRva2VuVXJpICsgJy90b2tlbicpXG4gICAgICAgICAgICAgICAgaWYgKCFyZXAub2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgJ3Nwb3RpZnkgZmV0Y2ggdG9rZW4gZXJyb3InXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcC5qc29uKClcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdqc29uJywganNvbilcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGpzb24udG9rZW5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG9rZW4nLCB0b2tlbilcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICAgICAgICAgIGhlYWRlcnMuYXBwZW5kKCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgdG9rZW4pXG4gICAgICAgICAgICByZXF1ZXN0LmhlYWRlcnMgPSBoZWFkZXJzXG5cbiAgICAgICAgICAgIGNvbnN0IHJlcCA9IGF3YWl0IGZldGNoKCQkLnVybC5nZXRVcmxQYXJhbXModXJsLCBwYXJhbXMpLCByZXF1ZXN0KVxuICAgICAgICAgICAgaWYgKHJlcC5vaykge1xuICAgICAgICAgICAgICAgIHJldCA9IGF3YWl0IHJlcC5qc29uKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gc2VhcmNoVHJhY2tzKHF1ZXJ5KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2VhcmNoVHJhY2tzJywgcXVlcnkpXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgcTogcXVlcnksXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RyYWNrJyxcbiAgICAgICAgICAgICAgICBsaW1pdDogMVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHBlcmZvcm1SZXF1ZXN0KGJhc2VVcmkgKyAnL3NlYXJjaC8nLCBwYXJhbXMpXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmVzdWx0cycsIHJlc3VsdHMpXG4gICAgICAgICAgICBjb25zdCB0cmFjayA9IHJlc3VsdHMudHJhY2tzLml0ZW1zWzBdXG4gICAgICAgICAgICByZXR1cm4gdHJhY2tcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEF1ZGlvRmVhdHVyZXNGb3JUcmFjayh0cmFja0lkKSB7XG4gICAgICAgICAgICByZXR1cm4gcGVyZm9ybVJlcXVlc3QoYmFzZVVyaSArICcvYXVkaW8tZmVhdHVyZXMvJyArIHRyYWNrSWQpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VhcmNoVHJhY2tzLFxuICAgICAgICAgICAgZ2V0QXVkaW9GZWF0dXJlc0ZvclRyYWNrXG4gICAgICAgIH1cbiAgICB9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QudXNlcnMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS91c2VycycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nKVxuXHRcdFx0fSxcblxuXHRcdFx0bWF0Y2g6IGZ1bmN0aW9uIChtYXRjaCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy8nLCB7IG1hdGNoIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGQ6IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy8nLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbiAodXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5kZWxldGUoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZTogZnVuY3Rpb24gKHVzZXIsIGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucHV0KGAvJHt1c2VyfWAsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uICh1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgLyR7dXNlcn1gKVxuXHRcdFx0fSxcblxuXHRcdFx0YWN0aXZhdGVBcHA6IGZ1bmN0aW9uIChhcHBOYW1lLCBhY3RpdmF0ZWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FjdGl2YXRlQXBwYCwgeyBhcHBOYW1lLCBhY3RpdmF0ZWQgfSlcblx0XHRcdH0sXG5cblx0XHRcdGNoYW5nZVB3ZDogZnVuY3Rpb24gKG5ld1B3ZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvY2hhbmdlUHdkYCwgeyBuZXdQd2QgfSlcblx0XHRcdH0sXG5cblx0XHRcdGdldFVzZXJTZXR0aW5nczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZ2V0VXNlclNldHRpbmdzYClcblx0XHRcdH0sXG5cblx0XHRcdHNldFVzZXJTZXR0aW5nczogZnVuY3Rpb24gKHNldHRpbmdzKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZXRVc2VyU2V0dGluZ3NgLCBzZXR0aW5ncylcblx0XHRcdH1cblxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lndha2Vsb2NrJywge1xuXG4gICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RXYWtlTG9jaygpIHtcbiAgICAgICAgICAgIGlmIChuYXZpZ2F0b3Iud2FrZUxvY2spIHtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2sgPSBhd2FpdCBuYXZpZ2F0b3Iud2FrZUxvY2sucmVxdWVzdCgnc2NyZWVuJylcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygndGFrZSB3YWtlTG9jaycpXG4gICAgICAgICAgICAgICAgICAgIGxvY2suYWRkRXZlbnRMaXN0ZW5lcigncmVsZWFzZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1dha2UgTG9jayB3YXMgcmVsZWFzZWQnKVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dha2VMb2NrJywgZSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uVmlzaWJpbGl0eUNoYW5nZSgpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3Zpc2liaWxpdHljaGFuZ2UnLCBkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUpXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0V2FrZUxvY2soKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIG9uVmlzaWJpbGl0eUNoYW5nZSlcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVxdWVzdFdha2VMb2NrXG4gICAgICAgIH1cbiAgICB9XG59KTtcbiJdfQ==
