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
https://prismjs.com/download.html#themes=prism&languages=markup+css+clike+javascript+c+csharp+cpp+java+python+rust */
var _self="undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{},Prism=function(e){var n=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,t=0,r={},a={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(n){return n instanceof i?new i(n.type,e(n.content),n.alias):Array.isArray(n)?n.map(e):n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++t}),e.__id},clone:function e(n,t){var r,i;switch(t=t||{},a.util.type(n)){case"Object":if(i=a.util.objId(n),t[i])return t[i];for(var l in r={},t[i]=r,n)n.hasOwnProperty(l)&&(r[l]=e(n[l],t));return r;case"Array":return i=a.util.objId(n),t[i]?t[i]:(r=[],t[i]=r,n.forEach((function(n,a){r[a]=e(n,t)})),r);default:return n}},getLanguage:function(e){for(;e;){var t=n.exec(e.className);if(t)return t[1].toLowerCase();e=e.parentElement}return"none"},setLanguage:function(e,t){e.className=e.className.replace(RegExp(n,"gi"),""),e.classList.add("language-"+t)},currentScript:function(){if("undefined"==typeof document)return null;if("currentScript"in document)return document.currentScript;try{throw new Error}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var n=document.getElementsByTagName("script");for(var t in n)if(n[t].src==e)return n[t]}return null}},isActive:function(e,n,t){for(var r="no-"+n;e;){var a=e.classList;if(a.contains(n))return!0;if(a.contains(r))return!1;e=e.parentElement}return!!t}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,n){var t=a.util.clone(a.languages[e]);for(var r in n)t[r]=n[r];return t},insertBefore:function(e,n,t,r){var i=(r=r||a.languages)[e],l={};for(var o in i)if(i.hasOwnProperty(o)){if(o==n)for(var s in t)t.hasOwnProperty(s)&&(l[s]=t[s]);t.hasOwnProperty(o)||(l[o]=i[o])}var u=r[e];return r[e]=l,a.languages.DFS(a.languages,(function(n,t){t===u&&n!=e&&(this[n]=l)})),l},DFS:function e(n,t,r,i){i=i||{};var l=a.util.objId;for(var o in n)if(n.hasOwnProperty(o)){t.call(n,o,n[o],r||o);var s=n[o],u=a.util.type(s);"Object"!==u||i[l(s)]?"Array"!==u||i[l(s)]||(i[l(s)]=!0,e(s,t,o,i)):(i[l(s)]=!0,e(s,t,null,i))}}},plugins:{},highlightAll:function(e,n){a.highlightAllUnder(document,e,n)},highlightAllUnder:function(e,n,t){var r={callback:t,container:e,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};a.hooks.run("before-highlightall",r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),a.hooks.run("before-all-elements-highlight",r);for(var i,l=0;i=r.elements[l++];)a.highlightElement(i,!0===n,r.callback)},highlightElement:function(n,t,r){var i=a.util.getLanguage(n),l=a.languages[i];a.util.setLanguage(n,i);var o=n.parentElement;o&&"pre"===o.nodeName.toLowerCase()&&a.util.setLanguage(o,i);var s={element:n,language:i,grammar:l,code:n.textContent};function u(e){s.highlightedCode=e,a.hooks.run("before-insert",s),s.element.innerHTML=s.highlightedCode,a.hooks.run("after-highlight",s),a.hooks.run("complete",s),r&&r.call(s.element)}if(a.hooks.run("before-sanity-check",s),(o=s.element.parentElement)&&"pre"===o.nodeName.toLowerCase()&&!o.hasAttribute("tabindex")&&o.setAttribute("tabindex","0"),!s.code)return a.hooks.run("complete",s),void(r&&r.call(s.element));if(a.hooks.run("before-highlight",s),s.grammar)if(t&&e.Worker){var c=new Worker(a.filename);c.onmessage=function(e){u(e.data)},c.postMessage(JSON.stringify({language:s.language,code:s.code,immediateClose:!0}))}else u(a.highlight(s.code,s.grammar,s.language));else u(a.util.encode(s.code))},highlight:function(e,n,t){var r={code:e,grammar:n,language:t};if(a.hooks.run("before-tokenize",r),!r.grammar)throw new Error('The language "'+r.language+'" has no grammar.');return r.tokens=a.tokenize(r.code,r.grammar),a.hooks.run("after-tokenize",r),i.stringify(a.util.encode(r.tokens),r.language)},tokenize:function(e,n){var t=n.rest;if(t){for(var r in t)n[r]=t[r];delete n.rest}var a=new s;return u(a,a.head,e),o(e,a,n,a.head,0),function(e){for(var n=[],t=e.head.next;t!==e.tail;)n.push(t.value),t=t.next;return n}(a)},hooks:{all:{},add:function(e,n){var t=a.hooks.all;t[e]=t[e]||[],t[e].push(n)},run:function(e,n){var t=a.hooks.all[e];if(t&&t.length)for(var r,i=0;r=t[i++];)r(n)}},Token:i};function i(e,n,t,r){this.type=e,this.content=n,this.alias=t,this.length=0|(r||"").length}function l(e,n,t,r){e.lastIndex=n;var a=e.exec(t);if(a&&r&&a[1]){var i=a[1].length;a.index+=i,a[0]=a[0].slice(i)}return a}function o(e,n,t,r,s,g){for(var f in t)if(t.hasOwnProperty(f)&&t[f]){var h=t[f];h=Array.isArray(h)?h:[h];for(var d=0;d<h.length;++d){if(g&&g.cause==f+","+d)return;var v=h[d],p=v.inside,m=!!v.lookbehind,y=!!v.greedy,k=v.alias;if(y&&!v.pattern.global){var x=v.pattern.toString().match(/[imsuy]*$/)[0];v.pattern=RegExp(v.pattern.source,x+"g")}for(var b=v.pattern||v,w=r.next,A=s;w!==n.tail&&!(g&&A>=g.reach);A+=w.value.length,w=w.next){var E=w.value;if(n.length>e.length)return;if(!(E instanceof i)){var P,L=1;if(y){if(!(P=l(b,A,e,m))||P.index>=e.length)break;var S=P.index,O=P.index+P[0].length,j=A;for(j+=w.value.length;S>=j;)j+=(w=w.next).value.length;if(A=j-=w.value.length,w.value instanceof i)continue;for(var C=w;C!==n.tail&&(j<O||"string"==typeof C.value);C=C.next)L++,j+=C.value.length;L--,E=e.slice(A,j),P.index-=A}else if(!(P=l(b,0,E,m)))continue;S=P.index;var N=P[0],_=E.slice(0,S),M=E.slice(S+N.length),W=A+E.length;g&&W>g.reach&&(g.reach=W);var z=w.prev;if(_&&(z=u(n,z,_),A+=_.length),c(n,z,L),w=u(n,z,new i(f,p?a.tokenize(N,p):N,k,N)),M&&u(n,w,M),L>1){var I={cause:f+","+d,reach:W};o(e,n,t,w.prev,A,I),g&&I.reach>g.reach&&(g.reach=I.reach)}}}}}}function s(){var e={value:null,prev:null,next:null},n={value:null,prev:e,next:null};e.next=n,this.head=e,this.tail=n,this.length=0}function u(e,n,t){var r=n.next,a={value:t,prev:n,next:r};return n.next=a,r.prev=a,e.length++,a}function c(e,n,t){for(var r=n.next,a=0;a<t&&r!==e.tail;a++)r=r.next;n.next=r,r.prev=n,e.length-=a}if(e.Prism=a,i.stringify=function e(n,t){if("string"==typeof n)return n;if(Array.isArray(n)){var r="";return n.forEach((function(n){r+=e(n,t)})),r}var i={type:n.type,content:e(n.content,t),tag:"span",classes:["token",n.type],attributes:{},language:t},l=n.alias;l&&(Array.isArray(l)?Array.prototype.push.apply(i.classes,l):i.classes.push(l)),a.hooks.run("wrap",i);var o="";for(var s in i.attributes)o+=" "+s+'="'+(i.attributes[s]||"").replace(/"/g,"&quot;")+'"';return"<"+i.tag+' class="'+i.classes.join(" ")+'"'+o+">"+i.content+"</"+i.tag+">"},!e.document)return e.addEventListener?(a.disableWorkerMessageHandler||e.addEventListener("message",(function(n){var t=JSON.parse(n.data),r=t.language,i=t.code,l=t.immediateClose;e.postMessage(a.highlight(i,a.languages[r],r)),l&&e.close()}),!1),a):a;var g=a.util.currentScript();function f(){a.manual||a.highlightAll()}if(g&&(a.filename=g.src,g.hasAttribute("data-manual")&&(a.manual=!0)),!a.manual){var h=document.readyState;"loading"===h||"interactive"===h&&g&&g.defer?document.addEventListener("DOMContentLoaded",f):window.requestAnimationFrame?window.requestAnimationFrame(f):window.setTimeout(f,16)}return a}(_self);"undefined"!=typeof module&&module.exports&&(module.exports=Prism),"undefined"!=typeof global&&(global.Prism=Prism);
Prism.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]},Prism.languages.markup.tag.inside["attr-value"].inside.entity=Prism.languages.markup.entity,Prism.languages.markup.doctype.inside["internal-subset"].inside=Prism.languages.markup,Prism.hooks.add("wrap",(function(a){"entity"===a.type&&(a.attributes.title=a.content.replace(/&amp;/,"&"))})),Object.defineProperty(Prism.languages.markup.tag,"addInlined",{value:function(a,e){var s={};s["language-"+e]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:Prism.languages[e]},s.cdata=/^<!\[CDATA\[|\]\]>$/i;var t={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:s}};t["language-"+e]={pattern:/[\s\S]+/,inside:Prism.languages[e]};var n={};n[a]={pattern:RegExp("(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[^])*?(?=</__>)".replace(/__/g,(function(){return a})),"i"),lookbehind:!0,greedy:!0,inside:t},Prism.languages.insertBefore("markup","cdata",n)}}),Object.defineProperty(Prism.languages.markup.tag,"addAttribute",{value:function(a,e){Prism.languages.markup.tag.inside["special-attr"].push({pattern:RegExp("(^|[\"'\\s])(?:"+a+")\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s'\">=]+(?=[\\s>]))","i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[e,"language-"+e],inside:Prism.languages[e]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}})}}),Prism.languages.html=Prism.languages.markup,Prism.languages.mathml=Prism.languages.markup,Prism.languages.svg=Prism.languages.markup,Prism.languages.xml=Prism.languages.extend("markup",{}),Prism.languages.ssml=Prism.languages.xml,Prism.languages.atom=Prism.languages.xml,Prism.languages.rss=Prism.languages.xml;
!function(s){var e=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;s.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp("@[\\w-](?:[^;{\\s\"']|\\s+(?!\\s)|"+e.source+")*?(?:;|(?=\\s*\\{))"),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\burl\\((?:"+e.source+"|(?:[^\\\\\r\n()\"']|\\\\[^])*)\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp("^"+e.source+"$"),alias:"url"}}},selector:{pattern:RegExp("(^|[{}\\s])[^{}\\s](?:[^{};\"'\\s]|\\s+(?![\\s{])|"+e.source+")*(?=\\s*\\{)"),lookbehind:!0},string:{pattern:e,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},s.languages.css.atrule.inside.rest=s.languages.css;var t=s.languages.markup;t&&(t.tag.addInlined("style","css"),t.tag.addAttribute("style","css"))}(Prism);
Prism.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/};
Prism.languages.javascript=Prism.languages.extend("clike",{"class-name":[Prism.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp("(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])"),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),Prism.languages.javascript["class-name"][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,Prism.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp("((?:^|[^$\\w\\xA0-\\uFFFF.\"'\\])\\s]|\\b(?:return|yield))\\s*)/(?:(?:\\[(?:[^\\]\\\\\r\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\r\n])+/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\r\n]|\\\\.|\\[(?:[^[\\]\\\\\r\n]|\\\\.|\\[(?:[^[\\]\\\\\r\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\r\n])+/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|/\\*(?:[^*]|\\*(?!/))*\\*/)*(?:$|[\r\n,.;:})\\]]|//))"),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:Prism.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:Prism.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),Prism.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:Prism.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}}),Prism.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:"property"}}),Prism.languages.markup&&(Prism.languages.markup.tag.addInlined("script","javascript"),Prism.languages.markup.tag.addAttribute("on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)","javascript")),Prism.languages.js=Prism.languages.javascript;
Prism.languages.c=Prism.languages.extend("clike",{comment:{pattern:/\/\/(?:[^\r\n\\]|\\(?:\r\n?|\n|(?![\r\n])))*|\/\*[\s\S]*?(?:\*\/|$)/,greedy:!0},string:{pattern:/"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"/,greedy:!0},"class-name":{pattern:/(\b(?:enum|struct)\s+(?:__attribute__\s*\(\([\s\S]*?\)\)\s*)?)\w+|\b[a-z]\w*_t\b/,lookbehind:!0},keyword:/\b(?:_Alignas|_Alignof|_Atomic|_Bool|_Complex|_Generic|_Imaginary|_Noreturn|_Static_assert|_Thread_local|__attribute__|asm|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|typeof|union|unsigned|void|volatile|while)\b/,function:/\b[a-z_]\w*(?=\s*\()/i,number:/(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,operator:/>>=?|<<=?|->|([-+&|:])\1|[?:~]|[-+*/%&|^!=<>]=?/}),Prism.languages.insertBefore("c","string",{char:{pattern:/'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n]){0,32}'/,greedy:!0}}),Prism.languages.insertBefore("c","string",{macro:{pattern:/(^[\t ]*)#\s*[a-z](?:[^\r\n\\/]|\/(?!\*)|\/\*(?:[^*]|\*(?!\/))*\*\/|\\(?:\r\n|[\s\S]))*/im,lookbehind:!0,greedy:!0,alias:"property",inside:{string:[{pattern:/^(#\s*include\s*)<[^>]+>/,lookbehind:!0},Prism.languages.c.string],char:Prism.languages.c.char,comment:Prism.languages.c.comment,"macro-name":[{pattern:/(^#\s*define\s+)\w+\b(?!\()/i,lookbehind:!0},{pattern:/(^#\s*define\s+)\w+\b(?=\()/i,lookbehind:!0,alias:"function"}],directive:{pattern:/^(#\s*)[a-z]+/,lookbehind:!0,alias:"keyword"},"directive-hash":/^#/,punctuation:/##|\\(?=[\r\n])/,expression:{pattern:/\S[\s\S]*/,inside:Prism.languages.c}}}}),Prism.languages.insertBefore("c","function",{constant:/\b(?:EOF|NULL|SEEK_CUR|SEEK_END|SEEK_SET|__DATE__|__FILE__|__LINE__|__TIMESTAMP__|__TIME__|__func__|stderr|stdin|stdout)\b/}),delete Prism.languages.c.boolean;
!function(e){function n(e,n){return e.replace(/<<(\d+)>>/g,(function(e,s){return"(?:"+n[+s]+")"}))}function s(e,s,a){return RegExp(n(e,s),a||"")}function a(e,n){for(var s=0;s<n;s++)e=e.replace(/<<self>>/g,(function(){return"(?:"+e+")"}));return e.replace(/<<self>>/g,"[^\\s\\S]")}var t="bool byte char decimal double dynamic float int long object sbyte short string uint ulong ushort var void",r="class enum interface record struct",i="add alias and ascending async await by descending from(?=\\s*(?:\\w|$)) get global group into init(?=\\s*;) join let nameof not notnull on or orderby partial remove select set unmanaged value when where with(?=\\s*{)",o="abstract as base break case catch checked const continue default delegate do else event explicit extern finally fixed for foreach goto if implicit in internal is lock namespace new null operator out override params private protected public readonly ref return sealed sizeof stackalloc static switch this throw try typeof unchecked unsafe using virtual volatile while yield";function l(e){return"\\b(?:"+e.trim().replace(/ /g,"|")+")\\b"}var d=l(r),p=RegExp(l(t+" "+r+" "+i+" "+o)),c=l(r+" "+i+" "+o),u=l(t+" "+r+" "+o),g=a("<(?:[^<>;=+\\-*/%&|^]|<<self>>)*>",2),b=a("\\((?:[^()]|<<self>>)*\\)",2),h="@?\\b[A-Za-z_]\\w*\\b",f=n("<<0>>(?:\\s*<<1>>)?",[h,g]),m=n("(?!<<0>>)<<1>>(?:\\s*\\.\\s*<<1>>)*",[c,f]),k="\\[\\s*(?:,\\s*)*\\]",y=n("<<0>>(?:\\s*(?:\\?\\s*)?<<1>>)*(?:\\s*\\?)?",[m,k]),w=n("[^,()<>[\\];=+\\-*/%&|^]|<<0>>|<<1>>|<<2>>",[g,b,k]),v=n("\\(<<0>>+(?:,<<0>>+)+\\)",[w]),x=n("(?:<<0>>|<<1>>)(?:\\s*(?:\\?\\s*)?<<2>>)*(?:\\s*\\?)?",[v,m,k]),$={keyword:p,punctuation:/[<>()?,.:[\]]/},_="'(?:[^\r\n'\\\\]|\\\\.|\\\\[Uux][\\da-fA-F]{1,8})'",B='"(?:\\\\.|[^\\\\"\r\n])*"';e.languages.csharp=e.languages.extend("clike",{string:[{pattern:s("(^|[^$\\\\])<<0>>",['@"(?:""|\\\\[^]|[^\\\\"])*"(?!")']),lookbehind:!0,greedy:!0},{pattern:s("(^|[^@$\\\\])<<0>>",[B]),lookbehind:!0,greedy:!0}],"class-name":[{pattern:s("(\\busing\\s+static\\s+)<<0>>(?=\\s*;)",[m]),lookbehind:!0,inside:$},{pattern:s("(\\busing\\s+<<0>>\\s*=\\s*)<<1>>(?=\\s*;)",[h,x]),lookbehind:!0,inside:$},{pattern:s("(\\busing\\s+)<<0>>(?=\\s*=)",[h]),lookbehind:!0},{pattern:s("(\\b<<0>>\\s+)<<1>>",[d,f]),lookbehind:!0,inside:$},{pattern:s("(\\bcatch\\s*\\(\\s*)<<0>>",[m]),lookbehind:!0,inside:$},{pattern:s("(\\bwhere\\s+)<<0>>",[h]),lookbehind:!0},{pattern:s("(\\b(?:is(?:\\s+not)?|as)\\s+)<<0>>",[y]),lookbehind:!0,inside:$},{pattern:s("\\b<<0>>(?=\\s+(?!<<1>>|with\\s*\\{)<<2>>(?:\\s*[=,;:{)\\]]|\\s+(?:in|when)\\b))",[x,u,h]),inside:$}],keyword:p,number:/(?:\b0(?:x[\da-f_]*[\da-f]|b[01_]*[01])|(?:\B\.\d+(?:_+\d+)*|\b\d+(?:_+\d+)*(?:\.\d+(?:_+\d+)*)?)(?:e[-+]?\d+(?:_+\d+)*)?)(?:[dflmu]|lu|ul)?\b/i,operator:/>>=?|<<=?|[-=]>|([-+&|])\1|~|\?\?=?|[-+*/%&|^!=<>]=?/,punctuation:/\?\.?|::|[{}[\];(),.:]/}),e.languages.insertBefore("csharp","number",{range:{pattern:/\.\./,alias:"operator"}}),e.languages.insertBefore("csharp","punctuation",{"named-parameter":{pattern:s("([(,]\\s*)<<0>>(?=\\s*:)",[h]),lookbehind:!0,alias:"punctuation"}}),e.languages.insertBefore("csharp","class-name",{namespace:{pattern:s("(\\b(?:namespace|using)\\s+)<<0>>(?:\\s*\\.\\s*<<0>>)*(?=\\s*[;{])",[h]),lookbehind:!0,inside:{punctuation:/\./}},"type-expression":{pattern:s("(\\b(?:default|sizeof|typeof)\\s*\\(\\s*(?!\\s))(?:[^()\\s]|\\s(?!\\s)|<<0>>)*(?=\\s*\\))",[b]),lookbehind:!0,alias:"class-name",inside:$},"return-type":{pattern:s("<<0>>(?=\\s+(?:<<1>>\\s*(?:=>|[({]|\\.\\s*this\\s*\\[)|this\\s*\\[))",[x,m]),inside:$,alias:"class-name"},"constructor-invocation":{pattern:s("(\\bnew\\s+)<<0>>(?=\\s*[[({])",[x]),lookbehind:!0,inside:$,alias:"class-name"},"generic-method":{pattern:s("<<0>>\\s*<<1>>(?=\\s*\\()",[h,g]),inside:{function:s("^<<0>>",[h]),generic:{pattern:RegExp(g),alias:"class-name",inside:$}}},"type-list":{pattern:s("\\b((?:<<0>>\\s+<<1>>|record\\s+<<1>>\\s*<<5>>|where\\s+<<2>>)\\s*:\\s*)(?:<<3>>|<<4>>|<<1>>\\s*<<5>>|<<6>>)(?:\\s*,\\s*(?:<<3>>|<<4>>|<<6>>))*(?=\\s*(?:where|[{;]|=>|$))",[d,f,h,x,p.source,b,"\\bnew\\s*\\(\\s*\\)"]),lookbehind:!0,inside:{"record-arguments":{pattern:s("(^(?!new\\s*\\()<<0>>\\s*)<<1>>",[f,b]),lookbehind:!0,greedy:!0,inside:e.languages.csharp},keyword:p,"class-name":{pattern:RegExp(x),greedy:!0,inside:$},punctuation:/[,()]/}},preprocessor:{pattern:/(^[\t ]*)#.*/m,lookbehind:!0,alias:"property",inside:{directive:{pattern:/(#)\b(?:define|elif|else|endif|endregion|error|if|line|nullable|pragma|region|undef|warning)\b/,lookbehind:!0,alias:"keyword"}}}});var E=B+"|"+_,R=n("/(?![*/])|//[^\r\n]*[\r\n]|/\\*(?:[^*]|\\*(?!/))*\\*/|<<0>>",[E]),z=a(n("[^\"'/()]|<<0>>|\\(<<self>>*\\)",[R]),2),S="\\b(?:assembly|event|field|method|module|param|property|return|type)\\b",j=n("<<0>>(?:\\s*\\(<<1>>*\\))?",[m,z]);e.languages.insertBefore("csharp","class-name",{attribute:{pattern:s("((?:^|[^\\s\\w>)?])\\s*\\[\\s*)(?:<<0>>\\s*:\\s*)?<<1>>(?:\\s*,\\s*<<1>>)*(?=\\s*\\])",[S,j]),lookbehind:!0,greedy:!0,inside:{target:{pattern:s("^<<0>>(?=\\s*:)",[S]),alias:"keyword"},"attribute-arguments":{pattern:s("\\(<<0>>*\\)",[z]),inside:e.languages.csharp},"class-name":{pattern:RegExp(m),inside:{punctuation:/\./}},punctuation:/[:,]/}}});var A=":[^}\r\n]+",F=a(n("[^\"'/()]|<<0>>|\\(<<self>>*\\)",[R]),2),P=n("\\{(?!\\{)(?:(?![}:])<<0>>)*<<1>>?\\}",[F,A]),U=a(n("[^\"'/()]|/(?!\\*)|/\\*(?:[^*]|\\*(?!/))*\\*/|<<0>>|\\(<<self>>*\\)",[E]),2),Z=n("\\{(?!\\{)(?:(?![}:])<<0>>)*<<1>>?\\}",[U,A]);function q(n,a){return{interpolation:{pattern:s("((?:^|[^{])(?:\\{\\{)*)<<0>>",[n]),lookbehind:!0,inside:{"format-string":{pattern:s("(^\\{(?:(?![}:])<<0>>)*)<<1>>(?=\\}$)",[a,A]),lookbehind:!0,inside:{punctuation:/^:/}},punctuation:/^\{|\}$/,expression:{pattern:/[\s\S]+/,alias:"language-csharp",inside:e.languages.csharp}}},string:/[\s\S]+/}}e.languages.insertBefore("csharp","string",{"interpolation-string":[{pattern:s('(^|[^\\\\])(?:\\$@|@\\$)"(?:""|\\\\[^]|\\{\\{|<<0>>|[^\\\\{"])*"',[P]),lookbehind:!0,greedy:!0,inside:q(P,F)},{pattern:s('(^|[^@\\\\])\\$"(?:\\\\.|\\{\\{|<<0>>|[^\\\\"{])*"',[Z]),lookbehind:!0,greedy:!0,inside:q(Z,U)}],char:{pattern:RegExp(_),greedy:!0}}),e.languages.dotnet=e.languages.cs=e.languages.csharp}(Prism);
!function(e){var t=/\b(?:alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|char8_t|class|co_await|co_return|co_yield|compl|concept|const|const_cast|consteval|constexpr|constinit|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|final|float|for|friend|goto|if|import|inline|int|int16_t|int32_t|int64_t|int8_t|long|module|mutable|namespace|new|noexcept|nullptr|operator|override|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|uint16_t|uint32_t|uint64_t|uint8_t|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/,n="\\b(?!<keyword>)\\w+(?:\\s*\\.\\s*\\w+)*\\b".replace(/<keyword>/g,(function(){return t.source}));e.languages.cpp=e.languages.extend("c",{"class-name":[{pattern:RegExp("(\\b(?:class|concept|enum|struct|typename)\\s+)(?!<keyword>)\\w+".replace(/<keyword>/g,(function(){return t.source}))),lookbehind:!0},/\b[A-Z]\w*(?=\s*::\s*\w+\s*\()/,/\b[A-Z_]\w*(?=\s*::\s*~\w+\s*\()/i,/\b\w+(?=\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\s*::\s*\w+\s*\()/],keyword:t,number:{pattern:/(?:\b0b[01']+|\b0x(?:[\da-f']+(?:\.[\da-f']*)?|\.[\da-f']+)(?:p[+-]?[\d']+)?|(?:\b[\d']+(?:\.[\d']*)?|\B\.[\d']+)(?:e[+-]?[\d']+)?)[ful]{0,4}/i,greedy:!0},operator:/>>=?|<<=?|->|--|\+\+|&&|\|\||[?:~]|<=>|[-+*/%&|^!=<>]=?|\b(?:and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/,boolean:/\b(?:false|true)\b/}),e.languages.insertBefore("cpp","string",{module:{pattern:RegExp('(\\b(?:import|module)\\s+)(?:"(?:\\\\(?:\r\n|[^])|[^"\\\\\r\n])*"|<[^<>\r\n]*>|'+"<mod-name>(?:\\s*:\\s*<mod-name>)?|:\\s*<mod-name>".replace(/<mod-name>/g,(function(){return n}))+")"),lookbehind:!0,greedy:!0,inside:{string:/^[<"][\s\S]+/,operator:/:/,punctuation:/\./}},"raw-string":{pattern:/R"([^()\\ ]{0,16})\([\s\S]*?\)\1"/,alias:"string",greedy:!0}}),e.languages.insertBefore("cpp","keyword",{"generic-function":{pattern:/\b(?!operator\b)[a-z_]\w*\s*<(?:[^<>]|<[^<>]*>)*>(?=\s*\()/i,inside:{function:/^\w+/,generic:{pattern:/<[\s\S]+/,alias:"class-name",inside:e.languages.cpp}}}}),e.languages.insertBefore("cpp","operator",{"double-colon":{pattern:/::/,alias:"punctuation"}}),e.languages.insertBefore("cpp","class-name",{"base-clause":{pattern:/(\b(?:class|struct)\s+\w+\s*:\s*)[^;{}"'\s]+(?:\s+[^;{}"'\s]+)*(?=\s*[;{])/,lookbehind:!0,greedy:!0,inside:e.languages.extend("cpp",{})}}),e.languages.insertBefore("inside","double-colon",{"class-name":/\b[a-z_]\w*\b(?!\s*::)/i},e.languages.cpp["base-clause"])}(Prism);
!function(e){var n=/\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/,t="(?:[a-z]\\w*\\s*\\.\\s*)*(?:[A-Z]\\w*\\s*\\.\\s*)*",s={pattern:RegExp("(^|[^\\w.])"+t+"[A-Z](?:[\\d_A-Z]*[a-z]\\w*)?\\b"),lookbehind:!0,inside:{namespace:{pattern:/^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,inside:{punctuation:/\./}},punctuation:/\./}};e.languages.java=e.languages.extend("clike",{string:{pattern:/(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,lookbehind:!0,greedy:!0},"class-name":[s,{pattern:RegExp("(^|[^\\w.])"+t+"[A-Z]\\w*(?=\\s+\\w+\\s*[;,=()]|\\s*(?:\\[[\\s,]*\\]\\s*)?::\\s*new\\b)"),lookbehind:!0,inside:s.inside},{pattern:RegExp("(\\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\\s+)"+t+"[A-Z]\\w*\\b"),lookbehind:!0,inside:s.inside}],keyword:n,function:[e.languages.clike.function,{pattern:/(::\s*)[a-z_]\w*/,lookbehind:!0}],number:/\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,operator:{pattern:/(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,lookbehind:!0},constant:/\b[A-Z][A-Z_\d]+\b/}),e.languages.insertBefore("java","string",{"triple-quoted-string":{pattern:/"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,greedy:!0,alias:"string"},char:{pattern:/'(?:\\.|[^'\\\r\n]){1,6}'/,greedy:!0}}),e.languages.insertBefore("java","class-name",{annotation:{pattern:/(^|[^.])@\w+(?:\s*\.\s*\w+)*/,lookbehind:!0,alias:"punctuation"},generics:{pattern:/<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&))*>)*>)*>)*>/,inside:{"class-name":s,keyword:n,punctuation:/[<>(),.:]/,operator:/[?&|]/}},import:[{pattern:RegExp("(\\bimport\\s+)"+t+"(?:[A-Z]\\w*|\\*)(?=\\s*;)"),lookbehind:!0,inside:{namespace:s.inside.namespace,punctuation:/\./,operator:/\*/,"class-name":/\w+/}},{pattern:RegExp("(\\bimport\\s+static\\s+)"+t+"(?:\\w+|\\*)(?=\\s*;)"),lookbehind:!0,alias:"static",inside:{namespace:s.inside.namespace,static:/\b\w+$/,punctuation:/\./,operator:/\*/,"class-name":/\w+/}}],namespace:{pattern:RegExp("(\\b(?:exports|import(?:\\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\\s+)(?!<keyword>)[a-z]\\w*(?:\\.[a-z]\\w*)*\\.?".replace(/<keyword>/g,(function(){return n.source}))),lookbehind:!0,inside:{punctuation:/\./}}})}(Prism);
Prism.languages.python={comment:{pattern:/(^|[^\\])#.*/,lookbehind:!0,greedy:!0},"string-interpolation":{pattern:/(?:f|fr|rf)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,greedy:!0,inside:{interpolation:{pattern:/((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,lookbehind:!0,inside:{"format-spec":{pattern:/(:)[^:(){}]+(?=\}$)/,lookbehind:!0},"conversion-option":{pattern:/![sra](?=[:}]$)/,alias:"punctuation"},rest:null}},string:/[\s\S]+/}},"triple-quoted-string":{pattern:/(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i,greedy:!0,alias:"string"},string:{pattern:/(?:[rub]|br|rb)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,greedy:!0},function:{pattern:/((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,lookbehind:!0},"class-name":{pattern:/(\bclass\s+)\w+/i,lookbehind:!0},decorator:{pattern:/(^[\t ]*)@\w+(?:\.\w+)*/m,lookbehind:!0,alias:["annotation","punctuation"],inside:{punctuation:/\./}},keyword:/\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,builtin:/\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,boolean:/\b(?:False|None|True)\b/,number:/\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i,operator:/[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,punctuation:/[{}[\];(),.:]/},Prism.languages.python["string-interpolation"].inside.interpolation.inside.rest=Prism.languages.python,Prism.languages.py=Prism.languages.python;
!function(e){for(var a="/\\*(?:[^*/]|\\*(?!/)|/(?!\\*)|<self>)*\\*/",t=0;t<2;t++)a=a.replace(/<self>/g,(function(){return a}));a=a.replace(/<self>/g,(function(){return"[^\\s\\S]"})),e.languages.rust={comment:[{pattern:RegExp("(^|[^\\\\])"+a),lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/b?"(?:\\[\s\S]|[^\\"])*"|b?r(#*)"(?:[^"]|"(?!\1))*"\1/,greedy:!0},char:{pattern:/b?'(?:\\(?:x[0-7][\da-fA-F]|u\{(?:[\da-fA-F]_*){1,6}\}|.)|[^\\\r\n\t'])'/,greedy:!0},attribute:{pattern:/#!?\[(?:[^\[\]"]|"(?:\\[\s\S]|[^\\"])*")*\]/,greedy:!0,alias:"attr-name",inside:{string:null}},"closure-params":{pattern:/([=(,:]\s*|\bmove\s*)\|[^|]*\||\|[^|]*\|(?=\s*(?:\{|->))/,lookbehind:!0,greedy:!0,inside:{"closure-punctuation":{pattern:/^\||\|$/,alias:"punctuation"},rest:null}},"lifetime-annotation":{pattern:/'\w+/,alias:"symbol"},"fragment-specifier":{pattern:/(\$\w+:)[a-z]+/,lookbehind:!0,alias:"punctuation"},variable:/\$\w+/,"function-definition":{pattern:/(\bfn\s+)\w+/,lookbehind:!0,alias:"function"},"type-definition":{pattern:/(\b(?:enum|struct|trait|type|union)\s+)\w+/,lookbehind:!0,alias:"class-name"},"module-declaration":[{pattern:/(\b(?:crate|mod)\s+)[a-z][a-z_\d]*/,lookbehind:!0,alias:"namespace"},{pattern:/(\b(?:crate|self|super)\s*)::\s*[a-z][a-z_\d]*\b(?:\s*::(?:\s*[a-z][a-z_\d]*\s*::)*)?/,lookbehind:!0,alias:"namespace",inside:{punctuation:/::/}}],keyword:[/\b(?:Self|abstract|as|async|await|become|box|break|const|continue|crate|do|dyn|else|enum|extern|final|fn|for|if|impl|in|let|loop|macro|match|mod|move|mut|override|priv|pub|ref|return|self|static|struct|super|trait|try|type|typeof|union|unsafe|unsized|use|virtual|where|while|yield)\b/,/\b(?:bool|char|f(?:32|64)|[ui](?:8|16|32|64|128|size)|str)\b/],function:/\b[a-z_]\w*(?=\s*(?:::\s*<|\())/,macro:{pattern:/\b\w+!/,alias:"property"},constant:/\b[A-Z_][A-Z_\d]+\b/,"class-name":/\b[A-Z]\w*\b/,namespace:{pattern:/(?:\b[a-z][a-z_\d]*\s*::\s*)*\b[a-z][a-z_\d]*\s*::(?!\s*<)/,inside:{punctuation:/::/}},number:/\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|(?:(?:\d(?:_?\d)*)?\.)?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)(?:_?(?:f32|f64|[iu](?:8|16|32|64|size)?))?\b/,boolean:/\b(?:false|true)\b/,punctuation:/->|\.\.=|\.{1,3}|::|[{}[\];(),:]/,operator:/[-+*\/%!^]=?|=[=>]?|&[&=]?|\|[|=]?|<<?=?|>>?=?|[@?]/},e.languages.rust["closure-params"].inside.rest=e.languages.rust,e.languages.rust.attribute.inside.string=e.languages.rust.string}(Prism);

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

			files.openFile('Insert Image', 'jpg,jpeg,png,gif,webp', async (data) => {
				console.log('onReturn', data)
				let { url } = data
				//console.log('url', url)
				if (useDataUrlForImg) {
					url = await $$.url.imageUrlToDataUrl(url)
				}
				const img = document.createElement('img')
				img.src = url
				range.insertNode(img)				
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

		if ((/\.(ogg|mp3)$/i).test(name)) {
			return 'fa fa-file-audio w3-text-purple'
		}
		if ((/\.(mp4|webm|3gp)$/i).test(name)) {
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
		if (name.endsWith('.py')) {
			return 'fab fa-python w3-text-blue'
		}	
		if (name.endsWith('.rs')) {
			return 'fa-brands fa-rust w3-text-orange'
		}	
		if (name.endsWith('.svg')) {
			return 'far fa-file-image w3-text-red'
		}	
		if ((/\.(cpp|c|h)$/i).test(name)) {
			return 'fa fa-file-alt w3-text-green'
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
			rootDir: '/',
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
					rootDir: this.props.rootDir,
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

	template: "<div class=\"toolbar\">\n	<button bn-event=\"click: onUpdate\" class=\"w3-btn w3-blue\" title=\"Update\">\n		<i class=\"fa fa-redo\"></i>\n	</button>	\n	<button bn-event=\"click: onAddUser\" class=\"w3-btn w3-blue btnAddUser\" title=\"Add User\">\n		<i class=\"fa fa-user-plus\"></i>\n	</button>	\n</div>\n\n<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-small\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>User Name</th>\n                <th>Pseudo</th>\n                <th>Location</th>\n                <th>Email</th>\n                <th>Create Date</th>\n                <th>Last Login Date</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"data\" bn-event=\"click.delete: onDelete, click.notif: onNotif, click.resetPwd: onResetPwd\">\n  			<tr>\n				<td bn-text=\"$scope.$i.username\"></td>\n				<td bn-text=\"$scope.$i.pseudo\"></td>\n				<td bn-text=\"$scope.$i.location\"></td>\n				<td bn-text=\"$scope.$i.email\"></td>\n				<td >\n					<span bn-text=\"text1\" bn-show=\"show1\"></span>\n				</td>\n				<td>\n					<span bn-show=\"show2\">\n\n						<span bn-text=\"text2\"></span><br>\n						at \n						<span bn-text=\"text3\"></span>\n					</span>\n				</td>\n				<td>\n					<button class=\"delete w3-btn w3-blue\" title=\"Delete User\">\n						<i class=\"fa fa-trash\"></i>\n					</button>\n					<button class=\"notif w3-btn w3-blue\" title=\"Send Notification\">\n						<i class=\"fa fa-bell\"></i>\n					</button>\n					<button class=\"resetPwd w3-btn w3-blue\" title=\"Reset Password\">\n						<i class=\"fa fa-lock\"></i>\n					</button>\n				</td>\n			</tr>      	\n\n        </tbody>\n    </table>\n</div>",

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
				},
				onResetPwd: function() {
					const idx = $(this).closest('tr').index()
					const { username } = ctrl.model.data[idx]
					$$.ui.showConfirm({ title: 'Reset Password', content: 'Are you sure ?' }, async function () {
						await users.resetPwd(username)
					})				
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

	template: "<div bn-if=\"isImage\">\n	<div \n		class=\"image\" \n		bn-control=\"brainjs.image\" \n		bn-data=\"{src: url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>\n	\n</div>\n\n\n<div bn-if=\"isPdf\">\n	<div \n		class=\"pdf\" \n		bn-control=\"breizbot.pdf\" \n		bn-data=\"{url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>		\n</div>\n\n<div bn-if=\"isAudio\" class=\"audio\">\n	<audio bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></audio>\n</div>\n\n<div bn-if=\"isVideo\" class=\"video\" bn-bind=\"video\">\n	<video bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload ></video>\n</div>\n\n<div bn-if=\"isDoc\" class=\"doc\" bn-bind=\"doc\" bn-event=\"click.top: onTop\">\n	<button bn-icon=\"fas fa-angle-up\" class=\"top\" title=\"Top\" ></button>\n	<div class=\"scrollPanel\">\n		<div class=\"html\"></div>\n	</div>\n</div>\n\n<div bn-if=\"isCode\" bn-bind=\"code\" class=\"code\">\n	<div class=\"scrollPanel\">\n		<pre>\n			<code bn-attr=\"{class: language}\"></code>\n		</pre>\n	</div>\n\n</div>",

	deps: ['breizbot.files'],

	props: {
		type: '',
		url: '#'
	},

	init: function (elt, files) {

		//@ts-ignore
		let { type, url } = this.props
		//console.log('props', this.props)


		async function hasSubtitle(fileName) {
			console.log({fileName})
			const { exists } = await files.exists(fileName)
			console.log({exists})
			if (exists) {
				ctrl.scope.video.find('video').append($('<track>', {
					label: 'French',
					kind: 'subtitles',
					srclang: 'fr',
					src: files.fileUrl(fileName)
				}))
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
				language: `language-${type}`,
				isImage: function () {
					return this.type == 'image'
				},
				isPdf: function () {
					return this.type == 'pdf'
				},
				isAudio: function () {
					return this.type == 'audio'
				},
				isVideo: function () {
					return this.type == 'video'
				},
				isDoc: function () {
					return this.type == 'hdoc'
				},
				isCode: function () {
					return ['javascript', 'html', 'python', 'cpp', 'rust'].includes(this.type)
				}

			},
			events: {
				onTop: function () {
					console.log('onTop')
					ctrl.scope.doc.find('.scrollPanel').get(0).scroll(0, 0)
				}
			}
		})


		if (type == 'video') {
			const { fileName } = $$.url.parseUrlParams('https://www.netos.ovh' + url)
			//console.log({fileName})
			const vttFile = fileName.substr(0, fileName.lastIndexOf(".")) + ".vtt";
			hasSubtitle(vttFile)

		}

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


		this.setData = function (data) {
			console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({ url: data.url })

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
        let breakState = ''
        let logFunction

        function mathRandomInt(a, b) {
            if (a > b) {
                // Swap a and b to ensure a is smaller.
                const c = a;
                a = b;
                b = c;
            }
            return Math.floor(Math.random() * (b - a + 1) + a);
        }

        function mathRandomList(list) {
            const x = Math.floor(Math.random() * list.length);
            return list[x];
        }

        function mathMean(myList) {
            return myList.reduce(function (x, y) { return x + y; }, 0) / myList.length;
        }

        function mathMedian(myList) {
            const localList = myList.filter(function (x) { return typeof x === 'number'; });
            if (!localList.length) return null;
            localList.sort(function (a, b) { return b - a; });
            if (localList.length % 2 === 0) {
                return (localList[localList.length / 2 - 1] + localList[localList.length / 2]) / 2;
            } else {
                return localList[(localList.length - 1) / 2];
            }
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
                if (typeof text != 'string') {
                    throw 'in textLength text is not a string !'
                }
                return text.length
            },

            'global_declaration': async function (block) {
                const value = await evalCode(block.inputs.VALUE)
                const varName = block.fields.NAME
                console.log(`${varName} = ${value}`)
                variablesValue[varName] = value
            },
            'lexical_variable_get': async function (block, localVariables) {
                /**@type {string} */
                const varName = block.fields.VAR
                return (varName.startsWith('global ')) ?
                    variablesValue[varName.substring(7)] : localVariables[varName]
            },
            'lexical_variable_set': async function (block, localVariables) {
                const varName = block.fields.VAR
                const value = await evalCode(block.inputs.VALUE, localVariables)
                if (varName.startsWith('global ')) {
                    variablesValue[varName.substring(7)] = value
                }
                else {
                    localVariables[varName] = value
                }
            },
            'local_declaration_statement': async function (block, localVariables) {
                const { fields, inputs } = block
                if (inputs.STACK == undefined)
                    return

                const argsName = getArgNames(fields)
                //console.log({ argsName })
                const values = {}
                for (let i = 0; i < argsName.length; i++) {
                    const valueName = 'DECL' + i
                    if (inputs[valueName] != undefined) {
                        const value = await evalCode(inputs[valueName], localVariables)
                        values[argsName[i]] = value
                    }
                }

                for (const [varName, value] of Object.entries(values)) {
                    localVariables[varName] = value
                }

                await evalCode(inputs.STACK, localVariables)

                for (const varName of Object.keys(values)) {
                    delete localVariables[varName]
                }

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
            'math_on_list': async function (block, localVariables) {
                const operator = block.fields.OP
                const list = await evalCode(block.inputs.LIST, localVariables)
                if (!Array.isArray(list)) {
                    throw 'in mathList list is not an Array !'
                }
                switch (operator) {
                    case 'SUM':
                        return list.reduce(function (x, y) { return x + y; }, 0)
                    case 'MIN':
                        return Math.min.apply(null, list)
                    case 'MAX':
                        return Math.max.apply(null, list)
                    case 'AVERAGE':
                        return mathMean(list)
                    case 'MEDIAN':
                        return mathMedian(list)
                    case 'RANDOM':
                        return mathRandomList(list)
                    default:
                        throw `operator '${operator}' is not implemented`
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
                if (typeof value != 'string') {
                    throw 'in textLength text is not a string !'
                }
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
            'controls_forEach': async function (block, localVariables) {
                const varName = block.fields.VAR
                const list = await evalCode(block.inputs.LIST, localVariables)
                console.log({ varName, list })
                if (!Array.isArray(list)) {
                    throw 'in forEach list is not an Array !'
                }
                for (const item of list) {
                    localVariables[varName] = item
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

                    const argNames = getArgNames(fields)
                    console.log({ argNames })

                    const newContext = {}
                    for (let i = 0; i < argNames.length; i++) {
                        const argName = `ARG${i}`
                        const value = await evalCode(block.inputs[argName], localVariables)
                        newContext[argNames[i]] = value
                    }

                    //console.log({ functionName, newContext })

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
            },
            'lists_create_with': async function (block, localVariables) {
                const { inputs, extraState } = block
                const { itemCount } = extraState
                console.log({ itemCount })
                const ret = []
                for (let i = 0; i < itemCount; i++) {
                    const argName = 'ADD' + i
                    if (inputs != undefined && inputs[argName] != undefined) {
                        ret[i] = await evalCode(inputs[argName], localVariables)
                    }
                    else {
                        ret[i] = undefined
                    }
                }

                console.log({ ret })
                return ret
            },
            'lists_getIndex': async function (block, localVariables) {
                const { fields, inputs } = block
                const mode = fields.MODE
                const where = fields.WHERE
                /**@type {Array<any>} */
                const list = await evalCode(inputs.VALUE, localVariables)
                console.log({ list, mode, where })
                if (!Array.isArray(list)) {
                    throw 'in getIndex list is not an Array !'
                }
                let ret
                if (mode == 'GET') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list[idx - 1]
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list.slice(-idx)[0]
                    }
                    else if (where == 'FIRST') {
                        ret = list[0]
                    }
                    else if (where == 'LAST') {
                        ret = list.slice(-1)[0]
                    }
                }
                else if (mode == 'GET_REMOVE' || mode == 'REMOVE') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list.splice(idx - 1, 1)[0]
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list.splice(-idx, 1)[0]
                    }
                    else if (where == 'FIRST') {
                        ret = list.shift()
                    }
                    else if (where == 'LAST') {
                        ret = list.pop()
                    }
                }

                console.log({ ret })

                return ret
            },
            'lists_setIndex': async function (block, localVariables) {
                const { fields, inputs } = block
                const mode = fields.MODE
                const where = fields.WHERE
                /**@type {Array<any>} */
                const list = await evalCode(inputs.LIST, localVariables)
                const newValue = await evalCode(inputs.TO, localVariables)

                console.log({ list, mode, where })
                if (!Array.isArray(list)) {
                    throw 'in setIndex list is not an Array !'
                }
                let ret
                if (mode == 'SET') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)

                        console.log({ idx })
                        list[idx - 1] = newValue
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)

                        console.log({ idx })
                        list[list.length - idx] = newValue
                    }
                    else if (where == 'FIRST') {
                        list[0] = newValue
                    }
                    else if (where == 'LAST') {
                        list[length - 1] = newValue
                    }
                }
                else if (mode == 'INSERT') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        list.splice(idx - 1, 0, newValue)
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        list.splice(list.length - idx, 0, newValue)
                    }
                    else if (where == 'FIRST') {
                        list.unshift(newValue)
                    }
                    else if (where == 'LAST') {
                        list.push(newValue)
                    }
                }

            },
            'lists_length': async function (block, localVariables) {
                const { inputs } = block
                /**@type {Array<any>} */
                const list = await evalCode(inputs.VALUE, localVariables)
                if (!Array.isArray(list)) {
                    throw 'in getLength list is not an Array !'
                }
                return list.length
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
            if (block.next != undefined && breakState == '') {
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

        function getArgNames(fields) {
            const argNames = []
            for (let i = 0, done = false; !done; i++) {
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

            const { inputs, fields } = block

            if (inputs != undefined) {

                const argNames = getArgNames(fields)

                const newContext = {}
                for (let i = 0; i < argNames.length; i++) {
                    newContext[argNames[i]] = functionArgs[i]
                }

                console.log({ functionName, newContext })

                if (inputs.STACK != undefined) {
                    await evalCode(inputs.STACK, newContext)
                }
            }
        }

        async function startCode({ blocks }) {
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

            // for (const block of codeBlocks) {
            //     if (block.type != 'procedures_defnoreturn' &&
            //         block.type != 'procedures_defreturn' &&
            //         block.type != 'global_declaration') {
            //         await evalCode(block, {})
            //     }
            // }
            dumpVariables()
            callFunction('main')
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

	deps: ['brainjs.resource', 'breizbot.params', 'breizbot.pager'],

	/**
	 * 
	 * @param {*} config 
	 * @param {*} resource 
	 * @param {*} params 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @returns 
	 */
	init: function (config, resource, params, pager) {
		/**@type {Brainjs.Services.Http.Interface} */
		const http = resource('/api/files')

		const savingDlg = $$.ui.progressDialog()

		let rootDir = '/'

		function fileUrl(fileName, friendUser) {
			return $$.url.getUrlParams('/api/files/load', { fileName, friendUser })
		}

		function openFile(title, props, cbk) {
			props.rootDir = rootDir
			if (typeof props == 'string') {
				props = {filterExtension: props}
			}
			pager.pushPage('breizbot.files', {
				title,
				props,
				events: {
					fileclick: function (ev, data) {
						pager.popPage(data)
					}
				},
				onReturn: async function (data) {
					console.log('onReturn', data)
					rootDir = data.rootDir
					data.url = fileUrl(data.rootDir + data.fileName)
					cbk(data)
				}
			})
		}


		return {
			openFile,
			exists: function(filePath) {
				return http.post('/exists', { filePath })
			},

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

			fileUrl,

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

			resetPwd: function(userName) {
				return http.post('/resetPwd', {userName})
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJub3RpZnkubWluLmpzIiwicHJpc20uanMiLCJhbGV4YS9hbGV4YS5qcyIsImFwcFRhYi9hcHBUYWIuanMiLCJhcHBzL2FwcHMuanMiLCJjb250YWN0cy9hZGRDb250YWN0LmpzIiwiY29udGFjdHMvY29udGFjdHMuanMiLCJlZGl0b3IvZWRpdG9yLmpzIiwiZmlsZWNob29zZXIvZmlsdGVyLmpzIiwiZmlsZWNob29zZXIvbWFpbi5qcyIsImZpbGVsaXN0L2ZpbGVsaXN0LmpzIiwiZmlsZXMvZmlsZXMuanMiLCJmb2xkZXJ0cmVlL3RyZWUuanMiLCJmcmllbmRzL2ZyaWVuZHMuanMiLCJob21lL2hvbWUuanMiLCJwYWdlci9wYWdlci5qcyIsInBkZi9tYWluLmpzIiwicnRjL3J0Yy5qcyIsInNlYXJjaGJhci9zZWFyY2hiYXIuanMiLCJ1c2Vycy9hZGRVc2VyLmpzIiwidXNlcnMvdXNlcnMuanMiLCJ2aWV3ZXIvdmlld2VyLmpzIiwiYXBwRGF0YS5qcyIsImFwcHMuanMiLCJiZWF0ZGV0ZWN0b3IuanMiLCJibG9ja2x5aW50ZXJwcmV0b3IuanMiLCJicm9rZXIuanMiLCJjaXRpZXMuanMiLCJjb250YWN0cy5qcyIsImRpc3BsYXkuanMiLCJmaWxlcy5qcyIsImZyaWVuZHMuanMiLCJmdWxsc2NyZWVuLmpzIiwiZ2FtZXBhZC5qcyIsImdlb2xvYy5qcyIsImh0dHAuanMiLCJub3RpZnMuanMiLCJwYWdlci5qcyIsInBhcmFtcy5qcyIsInBsYXlsaXN0cy5qcyIsInJhZGFyLmpzIiwicnRjLmpzIiwic2NoZWR1bGVyLmpzIiwic29uZ3MuanMiLCJzcG90aWZ5LmpzIiwidXNlcnMuanMiLCJ3YWtlbG9jay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4d0JBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcnJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDendCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnJlaXpib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQgPyBjb25mLm1heExpc3RlbmVycyA6IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcbiAgICAgIGNvbmYudmVyYm9zZU1lbW9yeUxlYWsgJiYgKHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBjb25mLnZlcmJvc2VNZW1vcnlMZWFrKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBsb2dQb3NzaWJsZU1lbW9yeUxlYWsoY291bnQsIGV2ZW50TmFtZSkge1xuICAgIHZhciBlcnJvck1zZyA9ICcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICcgKyBjb3VudCArICcgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0Lic7XG5cbiAgICBpZih0aGlzLnZlcmJvc2VNZW1vcnlMZWFrKXtcbiAgICAgIGVycm9yTXNnICs9ICcgRXZlbnQgbmFtZTogJyArIGV2ZW50TmFtZSArICcuJztcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbWl0V2FybmluZyl7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICBlLm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgIGUuZW1pdHRlciA9IHRoaXM7XG4gICAgICBlLmNvdW50ID0gY291bnQ7XG4gICAgICBwcm9jZXNzLmVtaXRXYXJuaW5nKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yTXNnKTtcblxuICAgICAgaWYgKGNvbnNvbGUudHJhY2Upe1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgdGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG4gIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmb3IgZXhwb3J0aW5nIEV2ZW50RW1pdHRlciBwcm9wZXJ0eVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdHJlZS5fbGlzdGVuZXJzLndhcm5lZCAmJlxuICAgICAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoLCBuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKG4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIH1cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uY2UgPSBmdW5jdGlvbihldmVudCwgZm4sIHByZXBlbmQpIHtcbiAgICB0aGlzLl9tYW55KGV2ZW50LCAxLCBmbiwgcHJlcGVuZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgZmFsc2UpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIHRydWUpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuLCBwcmVwZW5kKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5fb24oZXZlbnQsIGxpc3RlbmVyLCBwcmVwZW5kKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fYWxsLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBvZiBlbWl0IGNhbGxcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXRBc3luYyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbZmFsc2VdKTsgfVxuICAgIH1cblxuICAgIHZhciBwcm9taXNlcz0gW107XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYXJndW1lbnRzWzFdKTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZEFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbkFueSA9IGZ1bmN0aW9uKGZuLCBwcmVwZW5kKXtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICBpZihwcmVwZW5kKXtcbiAgICAgIHRoaXMuX2FsbC51bnNoaWZ0KGZuKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX29uQW55KHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIENoYW5nZSB0byBhcnJheS5cbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFkZFxuICAgICAgaWYocHJlcGVuZCl7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkICYmXG4gICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3QpIHtcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb290KTtcbiAgICAgIGZvciAodmFyIGkgaW4ga2V5cykge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIG9iaiA9IHJvb3Rba2V5XTtcbiAgICAgICAgaWYgKChvYmogaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpIHx8IChvYmogPT09IG51bGwpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290W2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSByb290W2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdCh0aGlzLmxpc3RlbmVyVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm4pO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuc1tpXSk7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsIihmdW5jdGlvbihlKXt0eXBlb2YgZGVmaW5lPT1cImZ1bmN0aW9uXCImJmRlZmluZS5hbWQ/ZGVmaW5lKFtcImpxdWVyeVwiXSxlKTp0eXBlb2YgbW9kdWxlPT1cIm9iamVjdFwiJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1mdW5jdGlvbih0LG4pe3JldHVybiBuPT09dW5kZWZpbmVkJiYodHlwZW9mIHdpbmRvdyE9XCJ1bmRlZmluZWRcIj9uPXJlcXVpcmUoXCJqcXVlcnlcIik6bj1yZXF1aXJlKFwianF1ZXJ5XCIpKHQpKSxlKG4pLG59OmUoalF1ZXJ5KX0pKGZ1bmN0aW9uKGUpe2Z1bmN0aW9uIEEodCxuLGkpe3R5cGVvZiBpPT1cInN0cmluZ1wiJiYoaT17Y2xhc3NOYW1lOml9KSx0aGlzLm9wdGlvbnM9RSh3LGUuaXNQbGFpbk9iamVjdChpKT9pOnt9KSx0aGlzLmxvYWRIVE1MKCksdGhpcy53cmFwcGVyPWUoaC5odG1sKSx0aGlzLm9wdGlvbnMuY2xpY2tUb0hpZGUmJnRoaXMud3JhcHBlci5hZGRDbGFzcyhyK1wiLWhpZGFibGVcIiksdGhpcy53cmFwcGVyLmRhdGEocix0aGlzKSx0aGlzLmFycm93PXRoaXMud3JhcHBlci5maW5kKFwiLlwiK3IrXCItYXJyb3dcIiksdGhpcy5jb250YWluZXI9dGhpcy53cmFwcGVyLmZpbmQoXCIuXCIrcitcIi1jb250YWluZXJcIiksdGhpcy5jb250YWluZXIuYXBwZW5kKHRoaXMudXNlckNvbnRhaW5lciksdCYmdC5sZW5ndGgmJih0aGlzLmVsZW1lbnRUeXBlPXQuYXR0cihcInR5cGVcIiksdGhpcy5vcmlnaW5hbEVsZW1lbnQ9dCx0aGlzLmVsZW09Tih0KSx0aGlzLmVsZW0uZGF0YShyLHRoaXMpLHRoaXMuZWxlbS5iZWZvcmUodGhpcy53cmFwcGVyKSksdGhpcy5jb250YWluZXIuaGlkZSgpLHRoaXMucnVuKG4pfXZhciB0PVtdLmluZGV4T2Z8fGZ1bmN0aW9uKGUpe2Zvcih2YXIgdD0wLG49dGhpcy5sZW5ndGg7dDxuO3QrKylpZih0IGluIHRoaXMmJnRoaXNbdF09PT1lKXJldHVybiB0O3JldHVybi0xfSxuPVwibm90aWZ5XCIscj1uK1wianNcIixpPW4rXCIhYmxhbmtcIixzPXt0OlwidG9wXCIsbTpcIm1pZGRsZVwiLGI6XCJib3R0b21cIixsOlwibGVmdFwiLGM6XCJjZW50ZXJcIixyOlwicmlnaHRcIn0sbz1bXCJsXCIsXCJjXCIsXCJyXCJdLHU9W1widFwiLFwibVwiLFwiYlwiXSxhPVtcInRcIixcImJcIixcImxcIixcInJcIl0sZj17dDpcImJcIixtOm51bGwsYjpcInRcIixsOlwiclwiLGM6bnVsbCxyOlwibFwifSxsPWZ1bmN0aW9uKHQpe3ZhciBuO3JldHVybiBuPVtdLGUuZWFjaCh0LnNwbGl0KC9cXFcrLyksZnVuY3Rpb24oZSx0KXt2YXIgcjtyPXQudG9Mb3dlckNhc2UoKS5jaGFyQXQoMCk7aWYoc1tyXSlyZXR1cm4gbi5wdXNoKHIpfSksbn0sYz17fSxoPXtuYW1lOlwiY29yZVwiLGh0bWw6JzxkaXYgY2xhc3M9XCInK3IrJy13cmFwcGVyXCI+XFxuXHQ8ZGl2IGNsYXNzPVwiJytyKyctYXJyb3dcIj48L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XCInK3IrJy1jb250YWluZXJcIj48L2Rpdj5cXG48L2Rpdj4nLGNzczpcIi5cIityK1wiLWNvcm5lciB7XFxuXHRwb3NpdGlvbjogZml4ZWQ7XFxuXHRtYXJnaW46IDVweDtcXG5cdHotaW5kZXg6IDEwNTA7XFxufVxcblxcbi5cIityK1wiLWNvcm5lciAuXCIrcitcIi13cmFwcGVyLFxcbi5cIityK1wiLWNvcm5lciAuXCIrcitcIi1jb250YWluZXIge1xcblx0cG9zaXRpb246IHJlbGF0aXZlO1xcblx0ZGlzcGxheTogYmxvY2s7XFxuXHRoZWlnaHQ6IGluaGVyaXQ7XFxuXHR3aWR0aDogaW5oZXJpdDtcXG5cdG1hcmdpbjogM3B4O1xcbn1cXG5cXG4uXCIrcitcIi13cmFwcGVyIHtcXG5cdHotaW5kZXg6IDE7XFxuXHRwb3NpdGlvbjogYWJzb2x1dGU7XFxuXHRkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuXHRoZWlnaHQ6IDA7XFxuXHR3aWR0aDogMDtcXG59XFxuXFxuLlwiK3IrXCItY29udGFpbmVyIHtcXG5cdGRpc3BsYXk6IG5vbmU7XFxuXHR6LWluZGV4OiAxO1xcblx0cG9zaXRpb246IGFic29sdXRlO1xcbn1cXG5cXG4uXCIrcitcIi1oaWRhYmxlIHtcXG5cdGN1cnNvcjogcG9pbnRlcjtcXG59XFxuXFxuW2RhdGEtbm90aWZ5LXRleHRdLFtkYXRhLW5vdGlmeS1odG1sXSB7XFxuXHRwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcblxcbi5cIityK1wiLWFycm93IHtcXG5cdHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG5cdHotaW5kZXg6IDI7XFxuXHR3aWR0aDogMDtcXG5cdGhlaWdodDogMDtcXG59XCJ9LHA9e1wiYm9yZGVyLXJhZGl1c1wiOltcIi13ZWJraXQtXCIsXCItbW96LVwiXX0sZD1mdW5jdGlvbihlKXtyZXR1cm4gY1tlXX0sdj1mdW5jdGlvbihlKXtpZighZSl0aHJvd1wiTWlzc2luZyBTdHlsZSBuYW1lXCI7Y1tlXSYmZGVsZXRlIGNbZV19LG09ZnVuY3Rpb24odCxpKXtpZighdCl0aHJvd1wiTWlzc2luZyBTdHlsZSBuYW1lXCI7aWYoIWkpdGhyb3dcIk1pc3NpbmcgU3R5bGUgZGVmaW5pdGlvblwiO2lmKCFpLmh0bWwpdGhyb3dcIk1pc3NpbmcgU3R5bGUgSFRNTFwiO3ZhciBzPWNbdF07cyYmcy5jc3NFbGVtJiYod2luZG93LmNvbnNvbGUmJmNvbnNvbGUud2FybihuK1wiOiBvdmVyd3JpdGluZyBzdHlsZSAnXCIrdCtcIidcIiksY1t0XS5jc3NFbGVtLnJlbW92ZSgpKSxpLm5hbWU9dCxjW3RdPWk7dmFyIG89XCJcIjtpLmNsYXNzZXMmJmUuZWFjaChpLmNsYXNzZXMsZnVuY3Rpb24odCxuKXtyZXR1cm4gbys9XCIuXCIrcitcIi1cIitpLm5hbWUrXCItXCIrdCtcIiB7XFxuXCIsZS5lYWNoKG4sZnVuY3Rpb24odCxuKXtyZXR1cm4gcFt0XSYmZS5lYWNoKHBbdF0sZnVuY3Rpb24oZSxyKXtyZXR1cm4gbys9XCJcdFwiK3IrdCtcIjogXCIrbitcIjtcXG5cIn0pLG8rPVwiXHRcIit0K1wiOiBcIituK1wiO1xcblwifSksbys9XCJ9XFxuXCJ9KSxpLmNzcyYmKG8rPVwiLyogc3R5bGVzIGZvciBcIitpLm5hbWUrXCIgKi9cXG5cIitpLmNzcyksbyYmKGkuY3NzRWxlbT1nKG8pLGkuY3NzRWxlbS5hdHRyKFwiaWRcIixcIm5vdGlmeS1cIitpLm5hbWUpKTt2YXIgdT17fSxhPWUoaS5odG1sKTt5KFwiaHRtbFwiLGEsdSkseShcInRleHRcIixhLHUpLGkuZmllbGRzPXV9LGc9ZnVuY3Rpb24odCl7dmFyIG4scixpO3I9eChcInN0eWxlXCIpLHIuYXR0cihcInR5cGVcIixcInRleHQvY3NzXCIpLGUoXCJoZWFkXCIpLmFwcGVuZChyKTt0cnl7ci5odG1sKHQpfWNhdGNoKHMpe3JbMF0uc3R5bGVTaGVldC5jc3NUZXh0PXR9cmV0dXJuIHJ9LHk9ZnVuY3Rpb24odCxuLHIpe3ZhciBzO3JldHVybiB0IT09XCJodG1sXCImJih0PVwidGV4dFwiKSxzPVwiZGF0YS1ub3RpZnktXCIrdCxiKG4sXCJbXCIrcytcIl1cIikuZWFjaChmdW5jdGlvbigpe3ZhciBuO249ZSh0aGlzKS5hdHRyKHMpLG58fChuPWkpLHJbbl09dH0pfSxiPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGUuaXModCk/ZTplLmZpbmQodCl9LHc9e2NsaWNrVG9IaWRlOiEwLGF1dG9IaWRlOiEwLGF1dG9IaWRlRGVsYXk6NWUzLGFycm93U2hvdzohMCxhcnJvd1NpemU6NSxicmVha05ld0xpbmVzOiEwLGVsZW1lbnRQb3NpdGlvbjpcImJvdHRvbVwiLGdsb2JhbFBvc2l0aW9uOlwidG9wIHJpZ2h0XCIsc3R5bGU6XCJib290c3RyYXBcIixjbGFzc05hbWU6XCJlcnJvclwiLHNob3dBbmltYXRpb246XCJzbGlkZURvd25cIixzaG93RHVyYXRpb246NDAwLGhpZGVBbmltYXRpb246XCJzbGlkZVVwXCIsaGlkZUR1cmF0aW9uOjIwMCxnYXA6NX0sRT1mdW5jdGlvbih0LG4pe3ZhciByO3JldHVybiByPWZ1bmN0aW9uKCl7fSxyLnByb3RvdHlwZT10LGUuZXh0ZW5kKCEwLG5ldyByLG4pfSxTPWZ1bmN0aW9uKHQpe3JldHVybiBlLmV4dGVuZCh3LHQpfSx4PWZ1bmN0aW9uKHQpe3JldHVybiBlKFwiPFwiK3QrXCI+PC9cIit0K1wiPlwiKX0sVD17fSxOPWZ1bmN0aW9uKHQpe3ZhciBuO3JldHVybiB0LmlzKFwiW3R5cGU9cmFkaW9dXCIpJiYobj10LnBhcmVudHMoXCJmb3JtOmZpcnN0XCIpLmZpbmQoXCJbdHlwZT1yYWRpb11cIikuZmlsdGVyKGZ1bmN0aW9uKG4scil7cmV0dXJuIGUocikuYXR0cihcIm5hbWVcIik9PT10LmF0dHIoXCJuYW1lXCIpfSksdD1uLmZpcnN0KCkpLHR9LEM9ZnVuY3Rpb24oZSx0LG4pe3ZhciByLGk7aWYodHlwZW9mIG49PVwic3RyaW5nXCIpbj1wYXJzZUludChuLDEwKTtlbHNlIGlmKHR5cGVvZiBuIT1cIm51bWJlclwiKXJldHVybjtpZihpc05hTihuKSlyZXR1cm47cmV0dXJuIHI9c1tmW3QuY2hhckF0KDApXV0saT10LGVbcl0hPT11bmRlZmluZWQmJih0PXNbci5jaGFyQXQoMCldLG49LW4pLGVbdF09PT11bmRlZmluZWQ/ZVt0XT1uOmVbdF0rPW4sbnVsbH0saz1mdW5jdGlvbihlLHQsbil7aWYoZT09PVwibFwifHxlPT09XCJ0XCIpcmV0dXJuIDA7aWYoZT09PVwiY1wifHxlPT09XCJtXCIpcmV0dXJuIG4vMi10LzI7aWYoZT09PVwiclwifHxlPT09XCJiXCIpcmV0dXJuIG4tdDt0aHJvd1wiSW52YWxpZCBhbGlnbm1lbnRcIn0sTD1mdW5jdGlvbihlKXtyZXR1cm4gTC5lPUwuZXx8eChcImRpdlwiKSxMLmUudGV4dChlKS5odG1sKCl9O0EucHJvdG90eXBlLmxvYWRIVE1MPWZ1bmN0aW9uKCl7dmFyIHQ7dD10aGlzLmdldFN0eWxlKCksdGhpcy51c2VyQ29udGFpbmVyPWUodC5odG1sKSx0aGlzLnVzZXJGaWVsZHM9dC5maWVsZHN9LEEucHJvdG90eXBlLnNob3c9ZnVuY3Rpb24oZSx0KXt2YXIgbixyLGkscyxvO3I9ZnVuY3Rpb24obil7cmV0dXJuIGZ1bmN0aW9uKCl7IWUmJiFuLmVsZW0mJm4uZGVzdHJveSgpO2lmKHQpcmV0dXJuIHQoKX19KHRoaXMpLG89dGhpcy5jb250YWluZXIucGFyZW50KCkucGFyZW50cyhcIjpoaWRkZW5cIikubGVuZ3RoPjAsaT10aGlzLmNvbnRhaW5lci5hZGQodGhpcy5hcnJvdyksbj1bXTtpZihvJiZlKXM9XCJzaG93XCI7ZWxzZSBpZihvJiYhZSlzPVwiaGlkZVwiO2Vsc2UgaWYoIW8mJmUpcz10aGlzLm9wdGlvbnMuc2hvd0FuaW1hdGlvbixuLnB1c2godGhpcy5vcHRpb25zLnNob3dEdXJhdGlvbik7ZWxzZXtpZighIW98fCEhZSlyZXR1cm4gcigpO3M9dGhpcy5vcHRpb25zLmhpZGVBbmltYXRpb24sbi5wdXNoKHRoaXMub3B0aW9ucy5oaWRlRHVyYXRpb24pfXJldHVybiBuLnB1c2gociksaVtzXS5hcHBseShpLG4pfSxBLnByb3RvdHlwZS5zZXRHbG9iYWxQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZ2V0UG9zaXRpb24oKSxuPXRbMF0saT10WzFdLG89c1tuXSx1PXNbaV0sYT1uK1wifFwiK2ksZj1UW2FdO2lmKCFmfHwhZG9jdW1lbnQuYm9keS5jb250YWlucyhmWzBdKSl7Zj1UW2FdPXgoXCJkaXZcIik7dmFyIGw9e307bFtvXT0wLHU9PT1cIm1pZGRsZVwiP2wudG9wPVwiNDUlXCI6dT09PVwiY2VudGVyXCI/bC5sZWZ0PVwiNDUlXCI6bFt1XT0wLGYuY3NzKGwpLmFkZENsYXNzKHIrXCItY29ybmVyXCIpLGUoXCJib2R5XCIpLmFwcGVuZChmKX1yZXR1cm4gZi5wcmVwZW5kKHRoaXMud3JhcHBlcil9LEEucHJvdG90eXBlLnNldEVsZW1lbnRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciBuLHIsaSxsLGMsaCxwLGQsdixtLGcseSxiLHcsRSxTLHgsVCxOLEwsQSxPLE0sXyxELFAsSCxCLGo7SD10aGlzLmdldFBvc2l0aW9uKCksXz1IWzBdLE89SFsxXSxNPUhbMl0sZz10aGlzLmVsZW0ucG9zaXRpb24oKSxkPXRoaXMuZWxlbS5vdXRlckhlaWdodCgpLHk9dGhpcy5lbGVtLm91dGVyV2lkdGgoKSx2PXRoaXMuZWxlbS5pbm5lckhlaWdodCgpLG09dGhpcy5lbGVtLmlubmVyV2lkdGgoKSxqPXRoaXMud3JhcHBlci5wb3NpdGlvbigpLGM9dGhpcy5jb250YWluZXIuaGVpZ2h0KCksaD10aGlzLmNvbnRhaW5lci53aWR0aCgpLFQ9c1tfXSxMPWZbX10sQT1zW0xdLHA9e30scFtBXT1fPT09XCJiXCI/ZDpfPT09XCJyXCI/eTowLEMocCxcInRvcFwiLGcudG9wLWoudG9wKSxDKHAsXCJsZWZ0XCIsZy5sZWZ0LWoubGVmdCksQj1bXCJ0b3BcIixcImxlZnRcIl07Zm9yKHc9MCxTPUIubGVuZ3RoO3c8Uzt3KyspRD1CW3ddLE49cGFyc2VJbnQodGhpcy5lbGVtLmNzcyhcIm1hcmdpbi1cIitEKSwxMCksTiYmQyhwLEQsTik7Yj1NYXRoLm1heCgwLHRoaXMub3B0aW9ucy5nYXAtKHRoaXMub3B0aW9ucy5hcnJvd1Nob3c/aTowKSksQyhwLEEsYik7aWYoIXRoaXMub3B0aW9ucy5hcnJvd1Nob3cpdGhpcy5hcnJvdy5oaWRlKCk7ZWxzZXtpPXRoaXMub3B0aW9ucy5hcnJvd1NpemUscj1lLmV4dGVuZCh7fSxwKSxuPXRoaXMudXNlckNvbnRhaW5lci5jc3MoXCJib3JkZXItY29sb3JcIil8fHRoaXMudXNlckNvbnRhaW5lci5jc3MoXCJib3JkZXItdG9wLWNvbG9yXCIpfHx0aGlzLnVzZXJDb250YWluZXIuY3NzKFwiYmFja2dyb3VuZC1jb2xvclwiKXx8XCJ3aGl0ZVwiO2ZvcihFPTAseD1hLmxlbmd0aDtFPHg7RSsrKXtEPWFbRV0sUD1zW0RdO2lmKEQ9PT1MKWNvbnRpbnVlO2w9UD09PVQ/bjpcInRyYW5zcGFyZW50XCIscltcImJvcmRlci1cIitQXT1pK1wicHggc29saWQgXCIrbH1DKHAsc1tMXSxpKSx0LmNhbGwoYSxPKT49MCYmQyhyLHNbT10saSoyKX10LmNhbGwodSxfKT49MD8oQyhwLFwibGVmdFwiLGsoTyxoLHkpKSxyJiZDKHIsXCJsZWZ0XCIsayhPLGksbSkpKTp0LmNhbGwobyxfKT49MCYmKEMocCxcInRvcFwiLGsoTyxjLGQpKSxyJiZDKHIsXCJ0b3BcIixrKE8saSx2KSkpLHRoaXMuY29udGFpbmVyLmlzKFwiOnZpc2libGVcIikmJihwLmRpc3BsYXk9XCJibG9ja1wiKSx0aGlzLmNvbnRhaW5lci5yZW1vdmVBdHRyKFwic3R5bGVcIikuY3NzKHApO2lmKHIpcmV0dXJuIHRoaXMuYXJyb3cucmVtb3ZlQXR0cihcInN0eWxlXCIpLmNzcyhyKX0sQS5wcm90b3R5cGUuZ2V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgZSxuLHIsaSxzLGYsYyxoO2g9dGhpcy5vcHRpb25zLnBvc2l0aW9ufHwodGhpcy5lbGVtP3RoaXMub3B0aW9ucy5lbGVtZW50UG9zaXRpb246dGhpcy5vcHRpb25zLmdsb2JhbFBvc2l0aW9uKSxlPWwoaCksZS5sZW5ndGg9PT0wJiYoZVswXT1cImJcIik7aWYobj1lWzBdLHQuY2FsbChhLG4pPDApdGhyb3dcIk11c3QgYmUgb25lIG9mIFtcIithK1wiXVwiO2lmKGUubGVuZ3RoPT09MXx8KHI9ZVswXSx0LmNhbGwodSxyKT49MCkmJihpPWVbMV0sdC5jYWxsKG8saSk8MCl8fChzPWVbMF0sdC5jYWxsKG8scyk+PTApJiYoZj1lWzFdLHQuY2FsbCh1LGYpPDApKWVbMV09KGM9ZVswXSx0LmNhbGwobyxjKT49MCk/XCJtXCI6XCJsXCI7cmV0dXJuIGUubGVuZ3RoPT09MiYmKGVbMl09ZVsxXSksZX0sQS5wcm90b3R5cGUuZ2V0U3R5bGU9ZnVuY3Rpb24oZSl7dmFyIHQ7ZXx8KGU9dGhpcy5vcHRpb25zLnN0eWxlKSxlfHwoZT1cImRlZmF1bHRcIiksdD1jW2VdO2lmKCF0KXRocm93XCJNaXNzaW5nIHN0eWxlOiBcIitlO3JldHVybiB0fSxBLnByb3RvdHlwZS51cGRhdGVDbGFzc2VzPWZ1bmN0aW9uKCl7dmFyIHQsbjtyZXR1cm4gdD1bXCJiYXNlXCJdLGUuaXNBcnJheSh0aGlzLm9wdGlvbnMuY2xhc3NOYW1lKT90PXQuY29uY2F0KHRoaXMub3B0aW9ucy5jbGFzc05hbWUpOnRoaXMub3B0aW9ucy5jbGFzc05hbWUmJnQucHVzaCh0aGlzLm9wdGlvbnMuY2xhc3NOYW1lKSxuPXRoaXMuZ2V0U3R5bGUoKSx0PWUubWFwKHQsZnVuY3Rpb24oZSl7cmV0dXJuIHIrXCItXCIrbi5uYW1lK1wiLVwiK2V9KS5qb2luKFwiIFwiKSx0aGlzLnVzZXJDb250YWluZXIuYXR0cihcImNsYXNzXCIsdCl9LEEucHJvdG90eXBlLnJ1bj1mdW5jdGlvbih0LG4pe3ZhciByLHMsbyx1LGE7ZS5pc1BsYWluT2JqZWN0KG4pP2UuZXh0ZW5kKHRoaXMub3B0aW9ucyxuKTplLnR5cGUobik9PT1cInN0cmluZ1wiJiYodGhpcy5vcHRpb25zLmNsYXNzTmFtZT1uKTtpZih0aGlzLmNvbnRhaW5lciYmIXQpe3RoaXMuc2hvdyghMSk7cmV0dXJufWlmKCF0aGlzLmNvbnRhaW5lciYmIXQpcmV0dXJuO3M9e30sZS5pc1BsYWluT2JqZWN0KHQpP3M9dDpzW2ldPXQ7Zm9yKG8gaW4gcyl7cj1zW29dLHU9dGhpcy51c2VyRmllbGRzW29dO2lmKCF1KWNvbnRpbnVlO3U9PT1cInRleHRcIiYmKHI9TChyKSx0aGlzLm9wdGlvbnMuYnJlYWtOZXdMaW5lcyYmKHI9ci5yZXBsYWNlKC9cXG4vZyxcIjxici8+XCIpKSksYT1vPT09aT9cIlwiOlwiPVwiK28sYih0aGlzLnVzZXJDb250YWluZXIsXCJbZGF0YS1ub3RpZnktXCIrdSthK1wiXVwiKS5odG1sKHIpfXRoaXMudXBkYXRlQ2xhc3NlcygpLHRoaXMuZWxlbT90aGlzLnNldEVsZW1lbnRQb3NpdGlvbigpOnRoaXMuc2V0R2xvYmFsUG9zaXRpb24oKSx0aGlzLnNob3coITApLHRoaXMub3B0aW9ucy5hdXRvSGlkZSYmKGNsZWFyVGltZW91dCh0aGlzLmF1dG9oaWRlVGltZXIpLHRoaXMuYXV0b2hpZGVUaW1lcj1zZXRUaW1lb3V0KHRoaXMuc2hvdy5iaW5kKHRoaXMsITEpLHRoaXMub3B0aW9ucy5hdXRvSGlkZURlbGF5KSl9LEEucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLndyYXBwZXIuZGF0YShyLG51bGwpLHRoaXMud3JhcHBlci5yZW1vdmUoKX0sZVtuXT1mdW5jdGlvbih0LHIsaSl7cmV0dXJuIHQmJnQubm9kZU5hbWV8fHQuanF1ZXJ5P2UodClbbl0ocixpKTooaT1yLHI9dCxuZXcgQShudWxsLHIsaSkpLHR9LGUuZm5bbl09ZnVuY3Rpb24odCxuKXtyZXR1cm4gZSh0aGlzKS5lYWNoKGZ1bmN0aW9uKCl7dmFyIGk9TihlKHRoaXMpKS5kYXRhKHIpO2kmJmkuZGVzdHJveSgpO3ZhciBzPW5ldyBBKGUodGhpcyksdCxuKX0pLHRoaXN9LGUuZXh0ZW5kKGVbbl0se2RlZmF1bHRzOlMsYWRkU3R5bGU6bSxyZW1vdmVTdHlsZTp2LHBsdWdpbk9wdGlvbnM6dyxnZXRTdHlsZTpkLGluc2VydENTUzpnfSksbShcImJvb3RzdHJhcFwiLHtodG1sOlwiPGRpdj5cXG48c3BhbiBkYXRhLW5vdGlmeS10ZXh0Pjwvc3Bhbj5cXG48L2Rpdj5cIixjbGFzc2VzOntiYXNlOntcImZvbnQtd2VpZ2h0XCI6XCJib2xkXCIscGFkZGluZzpcIjhweCAxNXB4IDhweCAxNHB4XCIsXCJ0ZXh0LXNoYWRvd1wiOlwiMCAxcHggMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSlcIixcImJhY2tncm91bmQtY29sb3JcIjpcIiNmY2Y4ZTNcIixib3JkZXI6XCIxcHggc29saWQgI2ZiZWVkNVwiLFwiYm9yZGVyLXJhZGl1c1wiOlwiNHB4XCIsXCJ3aGl0ZS1zcGFjZVwiOlwibm93cmFwXCIsXCJwYWRkaW5nLWxlZnRcIjpcIjI1cHhcIixcImJhY2tncm91bmQtcmVwZWF0XCI6XCJuby1yZXBlYXRcIixcImJhY2tncm91bmQtcG9zaXRpb25cIjpcIjNweCA3cHhcIn0sZXJyb3I6e2NvbG9yOlwiI0I5NEE0OFwiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0YyREVERVwiLFwiYm9yZGVyLWNvbG9yXCI6XCIjRUVEM0Q3XCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FZQUFBQ05pUjBOQUFBQUdYUkZXSFJUYjJaMGQyRnlaUUJCWkc5aVpTQkpiV0ZuWlZKbFlXUjVjY2xsUEFBQUF0UkpSRUZVZU5xa1ZjMXUwMEFRSHErZE9EKzBwb0lRZmtJamFsVzBTRUdxUk11Um5Ib3MzRGp3QUgwQXJseVFlQU5PT1NNZUFBNVZqeUJ4S0JRaGdTcFZVS0tRTkdsb0ZkdzRjV3cyanRmTU9uYTZKT1VBckRUYXpYaS9iM2RtNTVzb2NQcVFoRmthKythSEJzSThHc29wUkpFUk5GbFk4OEZDRWs5WWl3ZjhSaGdSeWFIRlFwUEhDRG1aRzVvWDJ1aTJ5aWxrY1RUMUFjRHNiWUMxTk1BeU9pN3pUWDJBZ3g3QTlsdUFsODhCYXVpaVEvY0phWlFmSXBBbG5nRGN2WlpNcmw4dkZQSzUrWGt0cldseDMvZWhaNXI5K3Q2ZStXVm5wMXB4bk5JamdCZTQvNmRBeXNRYzhkc21Id1BjVzlDMGgzZlcxaGFuczFsdHdKaHkwR3hLN1haYlVsTXA1V3cyZXlhbjYrZnQvZjJGQXFYR0s0Q3ZRazVIdWVGejdENkdPWnRJcksrc3J1cGR4MUdSQkJxTkJ0emMyQWlNcjduUHBsUmRLaGIxcTZxNnpqRmhya2xFRk9VdXRvUTUweGNYODZabHFhWnBRcmZiQmR1MlI2L0cxOXpYNlhTZ2g2Ulg1dWJ5SENNOG5xU0lENklDckdpWmpHWVl4b2pFc2l3NFBEd01TTDVWS3NDOFlmNFZSWUZ6TXpNYXh3amxKU2xDeUFROWwwQ1c0NFBCQUR6WGhlN3hNZGk5SHRUcmRZakZZa0RRTDBjbjRYZHEyL0VBRStJbkNudkFEVGYyZWFoNFN4OXZFeFFqa3FYVDZhQUVSSUNNZXdkL1VBcC9JZVlBTk0yam94dCtxNVZJK2llcTJpMFdnM2w2RE56SHdURVJQZ28xa283WEJYajN2ZGxzVDJGK1V1aEloWWtwN3U3Q2Fya2NyRk9DdFIzSDVKaXdiQUllSW1qVC9ZUUtLQnRHalJGQ1U1SVVnRlJlN2ZGNGNDTlZJUE1ZbzNWS3F4d2p5TkFYTmVwdW9weXFubGQ2MDJxVnNmUnBFa2t6K0dGTDF3UGo2eVNYQnBKdFdWYTV4bGhwY3loQk53cFpIbXRYOEFHZ2ZJRXhvMFpwemtXVlRCR2lYQ1NFYUhoNjIvUG9SMHAvdkhhY3p4WEduajRiU28rRzc4bEVMVTgwaDF1b2dCd1dMZjVZbHNQbWdERWQ0TTIzNnhqbSs4bm00SXVFLzl1Ky9QSDJKWFpmYnd6NHp3MVdiTytTUVBwWGZ3Ry9CQmdBaENOWmlTYi9wT1FBQUFBQVNVVk9SSzVDWUlJPSlcIn0sc3VjY2Vzczp7Y29sb3I6XCIjNDY4ODQ3XCIsXCJiYWNrZ3JvdW5kLWNvbG9yXCI6XCIjREZGMEQ4XCIsXCJib3JkZXItY29sb3JcIjpcIiNENkU5QzZcIixcImJhY2tncm91bmQtaW1hZ2VcIjpcInVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJRQUFBQVVDQVlBQUFDTmlSME5BQUFBR1hSRldIUlRiMlowZDJGeVpRQkJaRzlpWlNCSmJXRm5aVkpsWVdSNWNjbGxQQUFBQXV0SlJFRlVlTnEwbGN0UEUwRWN4Mzh6dS9SRlMxRXJ5cXRnSkZBMDhZQ2lNWklBUVE0ZVJHOGVER2RQSmlZZVRJd0hUZndQaUFjdlhJd1hMd29YUGFEeGtXZ1E2aXNsS2xKTFNRV0xVcmFQTFR2N0dtZTMyem9GOUtTVGZMTzd2NTN2WjNkL003L2ZJdGgrSU82SU50Mmpqb0E3YmpIQ0pvQWx6Q1J3NTlZd0hZakJuZk1QcUFLV1FZS2pHa2ZDSnFBRjB4d1pqaXBRdEEzTXhlU0c4N1ZoT09ZZWdWclVDeTdVWk05UzZUTElkQWFteVNUY2xaZFloRmhSSGxvR1lnN21nWnYxWnp6dHZndWQ3VjF0YlEydHdZQTM0TEptRjRwNWRYRjFLVHVmbkUrU3hlSnR1Q1pOc0xEQ1FVMCtSeUtURjI3VW53MTAxbDhlNmhuczN1MFBCYWxPUlZWVmtjYUVLQkpEZ1YzK2NHTTR0S0ttSStvaGxJR255Z0tYMDByU0Jmc3p6L24ydVh2ODF3ZDYrcnQxb3JzWkNIUmRyMUltazJGMktvYjNodXRTeFc4dGhzZDhBWE5hbG45RDdDVGZBNk8rMFVna011d1Z2RUZGVWJiQWNya2NUQTgrQXRPazhFNktpUWlEbU1GU0RxWkl0QXpFVlF2aVJrZERkYUZnUHA4SFNaS0FFQUw1UWg3U3EybElKQkp3djJzY1Vxa1VuS29aZ05oY0RLaEtnNWFIKzFJa2NvdUNBZEZHQVFzdVdaWWhPandGSFE5Nm9hZ1dnUm9Vb3YxVDlrUkJFT0RBd3hNMlF0RVVsK1dwK0xuOVZSbzZCY013NEVySFJZakg0L0IyNkFsUW9RUVRSZEhXd2NkOUFINTcrVUFYZGR2REQzN0RtckJCVjM0V2ZxaVhQbDYxZyt2cjZ4QTl6c0dlTTlnT2RzTlhrZ3BFdFR3VnZ3T2tsWExLbTYrL3A1ZXp3azRCK2o2ZHJvQnMyQ3NHYS9nTnM2Ukl4YXpsNFRjMjVtcFRndy9hcFBSMUxZbE5SRkF6Z3NPeGt5WFlMSU0xVjhOTXd5QWtKU2N0RDFlR1ZLaXE1d1dqU1Bkam1lVGtpS3ZWVzRmMllQSFdsM0dBVnE2eW1jeUNUZ292TTNGenlSaURlMlRhS2NFS3NMcEp2TkhqWmdQTnFFdHlpNm1aSW00U1JGeUxNVXNPTlNTZGtQZUZ0WTFuMG1jem9ZM0JIVExod1BSeTkvbHpjemlDdzlBQ0kreXFsMFZMemNHQVpiWVNNNUNDU1pnMS85b2Mvbm43K2k4TjlwLzhBbjRKTUFEeGhIK3hIZnVpS3dBQUFBQkpSVTVFcmtKZ2dnPT0pXCJ9LGluZm86e2NvbG9yOlwiIzNBODdBRFwiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0Q5RURGN1wiLFwiYm9yZGVyLWNvbG9yXCI6XCIjQkNFOEYxXCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FZQUFBQ05pUjBOQUFBQUJtSkxSMFFBL3dEL0FQK2d2YWVUQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUFCM1JKVFVVSDNRWUZBaGtTc2Rlcy9RQUFBOGRKUkVGVU9NdlZsR3RNVzJVWXgvL1BPYVdIWGc2bExhVzB5cEF0dzFVQ2dibmlOT0xjVk9MbUFqSFpvbE9ZbHhtVEdYVlpkQW5SZlhRbSs3U29VNG1YYU9haVpzRXBDOUZraVFzNlo2YmRDbk5ZcnVNNktOQnc2WVdld3psOXorc0hJbUVXdit2ejdYbVQ5NWYvKzMvKzd3UDgxNHYrZWZET1YzL1NvWDNsSEFBKzZPRGVVRmZNZmpPV01BRGdkaytlRUt6MHBGN2FRZE1BY09LTExqcmNWTVZYM3hkV04yOS9HaFlQN1N2blAwY1dmUzhjYVNrZkhac1BFOUZnbnQwMkpOdXRRMFFZSEIyZER6OS9wS1g4UWpqdU85eFV4ZC82NkhkeFRlQ0haM3JvalFPYkdRQmN1TmpmcGxrRDNiMTlZLzZNcmltU2FLZ1NNbXBHVTVXZXZtRS9zd2E2T3k3M3RRSEEwUmRyMk1tdi82QTFuOXc5c3VRNzA5N1o5bE00RmxUZ1REcnpaVHU0U3RYVmZwaUk0OHJWY1VETTVjbUVrc3JGbkh4ZnBUdFUvM0JGUXpDUUYvMmJZVm9OYkg3em1JdGJTb01qNDBKU3ptTXlYNXFEdnJpQTdRZHJJSXBBKzNjZHNNcHUwblhJOGNWME10S1hDUFplditnQ0VNMVMyTkhQdldmUC9oTCs3RlNyMyswcDVSQkV5aEVONUpDS1lyOFhuQVNNVDB4Qk55elFHUWVJOGZqc0dEMzlSTVBrN3NlMmJkNVp0VHlvRllYZnRGNnkzN2d4N05lVXRKSk9URmxBSERaTER1SUxVM2ozK0g1b09yRDN5V2JJenR1Z2FBemduQktKdUJMcEdmUXJTOHdPNEZaZ1YrYzFJeGFMZ1dWVTB0TUxFRVRDb3M0eE16RUl2OWNKWFFjeWFnSXdpZ0RHd0pnT0F0SEF3QWhpc1FVankwT1JHRVJpRUxnRzRpYWtrem80TVlBeGNNNWhBTWkxV1dHMXlZQ0pJY01VYUJrVlJMZEdlU1UyOTk1VExXemNVQXpPTko3SjZGQlZCWUlnZ016bUZidmRCVjQ0Q29yZzh2amh6QytFSkVsOFUxa0p0Z1lyaEN6Z2MvdnZUd1hLU2liMXBhUkZWUlZPUkRBSkFzdzVGdVRhSkVoV00yU0hCM21PQWxoa054d3VMemVKc0d3cVd6ZjVURk5kS2d0WTVxSHA2WkZmNjdZL3NBVmFkQ2FWWTVZQUNERGIzT2k0TklqTG5XTXcyUXRoQ0JJc1Zoc1VUVTl0dlhzamVxOStYMWQ3NS9LRXM0TE5PZmNkZi8rSHRoTW52d3hPRDB3bUhhWHI3Wkl0bjJ3dUgyU25CemJaQWJQSndwUHgrVlF1emNtN2RnUkNCNTdhMXVCelVEUkw0YmZuSTBSRTBlYVhkOVc4OW1wanFIWm5VSTVIaDJsMmRrWlpVaE9xcGkycVNtcE9tWjY0VHV1OXFsei9TRVhvNk1FSGEzd09pcDQ2RjFuNzYzM2Vla1Y4ZHM4V3hqbjM3V2w2M1ZWYStlajVvZUVaLzgyWkJFVEpqcEoxUmJpajJEM1ovMXRyWFV2THNibENLMFhmT3gwU1gya01zbjlkWCtkKzdLZjZoOG80QUl5a3VmZmpUOEwyMExVK3c0QVpkNVZ2RVBZK1hwV3FMVjMyN0hSN0R6WHVEbkQ4citvdmtCZWhKOGkreThZQUFBQUFTVVZPUks1Q1lJST0pXCJ9LHdhcm46e2NvbG9yOlwiI0MwOTg1M1wiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0ZDRjhFM1wiLFwiYm9yZGVyLWNvbG9yXCI6XCIjRkJFRUQ1XCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FNQUFBQzZWKzAvQUFBQkpsQk1WRVhyNmViLzJvRC93aTcveGpyLzBtUC95a2YvdFFEL3ZCai8zbzcvdVEvL3Z5TC90d2ViaGdELzRwelgxSzN6OGUzNDl2SzZ0SENpbENXYmlReW1uMGpHd29ycjZkWFF6YTNIeGNLa24xdld2Vi81dVJmazRkWFoxYkQxOCsvNTJZZWJpQW15cjVTOW1oQ3pyV3E1dDZ1ZmpSSDU0YUxzMG9TK3FENzUxWHFQaEF5Ymh3WHN1akczc20rWmswUFR3RzZTaGcrUGhoT2Jod09QZ1FMNHpWMm5seXJmMjd1TGZnQ1BoUkh1N09tTGdBYWZreWlXa0QzbDQ5aWJpQWZUczBDK2xnQ25pd0Q0c2dESnhxT2lsekRXb3dXRmZBSDA4dWViaWc2cXBGSEJ2SC9hdzI2RmZRVFF6c3Z5OE95RWZ6MjByM2pBdmFLYmhnRzlxMG5jMkxiWnhYYW5vVXUvdTVXU2dnQ3RwMWFucEpLZG1Gei96bFgvMW5HSmlZbXVxNUR4NytzQUFBRG9QVVpTQUFBQUFYUlNUbE1BUU9iWVpnQUFBQUZpUzBkRUFJZ0ZIVWdBQUFBSmNFaFpjd0FBQ3hNQUFBc1RBUUNhbkJnQUFBQUhkRWxOUlFmZEJnVUJHaGg0YWFoNUFBQUFsa2xFUVZRWTAyTmdvQklJRThFVWN3bjFGa0lYTTFUajVkRFVRaFBVNTAyTWk3WFhReEd6NXVWSWpHT0pVVVVXODFIbllFeU1pMkhWY1VPSUNRWnpNTVlteHJFeU15bEp3Z1V0NUJsaldSTGptSm00cEkxaFlwNVNRTEdZeERnbUxuWk9WeHVvb0NsSURLZ1hLTWJONWdnVjFBQ0xKY2FCeE5nY29pR0NCaVp3ZFd4T0VUQkRyVHlFRmV5MGpZSjRlSGpNR1dnRUFJcFJGUkNVdDA4cUFBQUFBRWxGVGtTdVFtQ0MpXCJ9fX0pLGUoZnVuY3Rpb24oKXtnKGguY3NzKS5hdHRyKFwiaWRcIixcImNvcmUtbm90aWZ5XCIpLGUoZG9jdW1lbnQpLm9uKFwiY2xpY2tcIixcIi5cIityK1wiLWhpZGFibGVcIixmdW5jdGlvbih0KXtlKHRoaXMpLnRyaWdnZXIoXCJub3RpZnktaGlkZVwiKX0pLGUoZG9jdW1lbnQpLm9uKFwibm90aWZ5LWhpZGVcIixcIi5cIityK1wiLXdyYXBwZXJcIixmdW5jdGlvbih0KXt2YXIgbj1lKHRoaXMpLmRhdGEocik7biYmbi5zaG93KCExKX0pfSl9KSIsIi8qIFByaXNtSlMgMS4yOS4wXG5odHRwczovL3ByaXNtanMuY29tL2Rvd25sb2FkLmh0bWwjdGhlbWVzPXByaXNtJmxhbmd1YWdlcz1tYXJrdXArY3NzK2NsaWtlK2phdmFzY3JpcHQrYytjc2hhcnArY3BwK2phdmErcHl0aG9uK3J1c3QgKi9cbnZhciBfc2VsZj1cInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P3dpbmRvdzpcInVuZGVmaW5lZFwiIT10eXBlb2YgV29ya2VyR2xvYmFsU2NvcGUmJnNlbGYgaW5zdGFuY2VvZiBXb3JrZXJHbG9iYWxTY29wZT9zZWxmOnt9LFByaXNtPWZ1bmN0aW9uKGUpe3ZhciBuPS8oPzpefFxccylsYW5nKD86dWFnZSk/LShbXFx3LV0rKSg/PVxcc3wkKS9pLHQ9MCxyPXt9LGE9e21hbnVhbDplLlByaXNtJiZlLlByaXNtLm1hbnVhbCxkaXNhYmxlV29ya2VyTWVzc2FnZUhhbmRsZXI6ZS5QcmlzbSYmZS5QcmlzbS5kaXNhYmxlV29ya2VyTWVzc2FnZUhhbmRsZXIsdXRpbDp7ZW5jb2RlOmZ1bmN0aW9uIGUobil7cmV0dXJuIG4gaW5zdGFuY2VvZiBpP25ldyBpKG4udHlwZSxlKG4uY29udGVudCksbi5hbGlhcyk6QXJyYXkuaXNBcnJheShuKT9uLm1hcChlKTpuLnJlcGxhY2UoLyYvZyxcIiZhbXA7XCIpLnJlcGxhY2UoLzwvZyxcIiZsdDtcIikucmVwbGFjZSgvXFx1MDBhMC9nLFwiIFwiKX0sdHlwZTpmdW5jdGlvbihlKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpLnNsaWNlKDgsLTEpfSxvYmpJZDpmdW5jdGlvbihlKXtyZXR1cm4gZS5fX2lkfHxPYmplY3QuZGVmaW5lUHJvcGVydHkoZSxcIl9faWRcIix7dmFsdWU6Kyt0fSksZS5fX2lkfSxjbG9uZTpmdW5jdGlvbiBlKG4sdCl7dmFyIHIsaTtzd2l0Y2godD10fHx7fSxhLnV0aWwudHlwZShuKSl7Y2FzZVwiT2JqZWN0XCI6aWYoaT1hLnV0aWwub2JqSWQobiksdFtpXSlyZXR1cm4gdFtpXTtmb3IodmFyIGwgaW4gcj17fSx0W2ldPXIsbiluLmhhc093blByb3BlcnR5KGwpJiYocltsXT1lKG5bbF0sdCkpO3JldHVybiByO2Nhc2VcIkFycmF5XCI6cmV0dXJuIGk9YS51dGlsLm9iaklkKG4pLHRbaV0/dFtpXToocj1bXSx0W2ldPXIsbi5mb3JFYWNoKChmdW5jdGlvbihuLGEpe3JbYV09ZShuLHQpfSkpLHIpO2RlZmF1bHQ6cmV0dXJuIG59fSxnZXRMYW5ndWFnZTpmdW5jdGlvbihlKXtmb3IoO2U7KXt2YXIgdD1uLmV4ZWMoZS5jbGFzc05hbWUpO2lmKHQpcmV0dXJuIHRbMV0udG9Mb3dlckNhc2UoKTtlPWUucGFyZW50RWxlbWVudH1yZXR1cm5cIm5vbmVcIn0sc2V0TGFuZ3VhZ2U6ZnVuY3Rpb24oZSx0KXtlLmNsYXNzTmFtZT1lLmNsYXNzTmFtZS5yZXBsYWNlKFJlZ0V4cChuLFwiZ2lcIiksXCJcIiksZS5jbGFzc0xpc3QuYWRkKFwibGFuZ3VhZ2UtXCIrdCl9LGN1cnJlbnRTY3JpcHQ6ZnVuY3Rpb24oKXtpZihcInVuZGVmaW5lZFwiPT10eXBlb2YgZG9jdW1lbnQpcmV0dXJuIG51bGw7aWYoXCJjdXJyZW50U2NyaXB0XCJpbiBkb2N1bWVudClyZXR1cm4gZG9jdW1lbnQuY3VycmVudFNjcmlwdDt0cnl7dGhyb3cgbmV3IEVycm9yfWNhdGNoKHIpe3ZhciBlPSgvYXQgW14oXFxyXFxuXSpcXCgoLiopOlteOl0rOlteOl0rXFwpJC9pLmV4ZWMoci5zdGFjayl8fFtdKVsxXTtpZihlKXt2YXIgbj1kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKTtmb3IodmFyIHQgaW4gbilpZihuW3RdLnNyYz09ZSlyZXR1cm4gblt0XX1yZXR1cm4gbnVsbH19LGlzQWN0aXZlOmZ1bmN0aW9uKGUsbix0KXtmb3IodmFyIHI9XCJuby1cIituO2U7KXt2YXIgYT1lLmNsYXNzTGlzdDtpZihhLmNvbnRhaW5zKG4pKXJldHVybiEwO2lmKGEuY29udGFpbnMocikpcmV0dXJuITE7ZT1lLnBhcmVudEVsZW1lbnR9cmV0dXJuISF0fX0sbGFuZ3VhZ2VzOntwbGFpbjpyLHBsYWludGV4dDpyLHRleHQ6cix0eHQ6cixleHRlbmQ6ZnVuY3Rpb24oZSxuKXt2YXIgdD1hLnV0aWwuY2xvbmUoYS5sYW5ndWFnZXNbZV0pO2Zvcih2YXIgciBpbiBuKXRbcl09bltyXTtyZXR1cm4gdH0saW5zZXJ0QmVmb3JlOmZ1bmN0aW9uKGUsbix0LHIpe3ZhciBpPShyPXJ8fGEubGFuZ3VhZ2VzKVtlXSxsPXt9O2Zvcih2YXIgbyBpbiBpKWlmKGkuaGFzT3duUHJvcGVydHkobykpe2lmKG89PW4pZm9yKHZhciBzIGluIHQpdC5oYXNPd25Qcm9wZXJ0eShzKSYmKGxbc109dFtzXSk7dC5oYXNPd25Qcm9wZXJ0eShvKXx8KGxbb109aVtvXSl9dmFyIHU9cltlXTtyZXR1cm4gcltlXT1sLGEubGFuZ3VhZ2VzLkRGUyhhLmxhbmd1YWdlcywoZnVuY3Rpb24obix0KXt0PT09dSYmbiE9ZSYmKHRoaXNbbl09bCl9KSksbH0sREZTOmZ1bmN0aW9uIGUobix0LHIsaSl7aT1pfHx7fTt2YXIgbD1hLnV0aWwub2JqSWQ7Zm9yKHZhciBvIGluIG4paWYobi5oYXNPd25Qcm9wZXJ0eShvKSl7dC5jYWxsKG4sbyxuW29dLHJ8fG8pO3ZhciBzPW5bb10sdT1hLnV0aWwudHlwZShzKTtcIk9iamVjdFwiIT09dXx8aVtsKHMpXT9cIkFycmF5XCIhPT11fHxpW2wocyldfHwoaVtsKHMpXT0hMCxlKHMsdCxvLGkpKTooaVtsKHMpXT0hMCxlKHMsdCxudWxsLGkpKX19fSxwbHVnaW5zOnt9LGhpZ2hsaWdodEFsbDpmdW5jdGlvbihlLG4pe2EuaGlnaGxpZ2h0QWxsVW5kZXIoZG9jdW1lbnQsZSxuKX0saGlnaGxpZ2h0QWxsVW5kZXI6ZnVuY3Rpb24oZSxuLHQpe3ZhciByPXtjYWxsYmFjazp0LGNvbnRhaW5lcjplLHNlbGVjdG9yOidjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSwgW2NsYXNzKj1cImxhbmd1YWdlLVwiXSBjb2RlLCBjb2RlW2NsYXNzKj1cImxhbmctXCJdLCBbY2xhc3MqPVwibGFuZy1cIl0gY29kZSd9O2EuaG9va3MucnVuKFwiYmVmb3JlLWhpZ2hsaWdodGFsbFwiLHIpLHIuZWxlbWVudHM9QXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KHIuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoci5zZWxlY3RvcikpLGEuaG9va3MucnVuKFwiYmVmb3JlLWFsbC1lbGVtZW50cy1oaWdobGlnaHRcIixyKTtmb3IodmFyIGksbD0wO2k9ci5lbGVtZW50c1tsKytdOylhLmhpZ2hsaWdodEVsZW1lbnQoaSwhMD09PW4sci5jYWxsYmFjayl9LGhpZ2hsaWdodEVsZW1lbnQ6ZnVuY3Rpb24obix0LHIpe3ZhciBpPWEudXRpbC5nZXRMYW5ndWFnZShuKSxsPWEubGFuZ3VhZ2VzW2ldO2EudXRpbC5zZXRMYW5ndWFnZShuLGkpO3ZhciBvPW4ucGFyZW50RWxlbWVudDtvJiZcInByZVwiPT09by5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpJiZhLnV0aWwuc2V0TGFuZ3VhZ2UobyxpKTt2YXIgcz17ZWxlbWVudDpuLGxhbmd1YWdlOmksZ3JhbW1hcjpsLGNvZGU6bi50ZXh0Q29udGVudH07ZnVuY3Rpb24gdShlKXtzLmhpZ2hsaWdodGVkQ29kZT1lLGEuaG9va3MucnVuKFwiYmVmb3JlLWluc2VydFwiLHMpLHMuZWxlbWVudC5pbm5lckhUTUw9cy5oaWdobGlnaHRlZENvZGUsYS5ob29rcy5ydW4oXCJhZnRlci1oaWdobGlnaHRcIixzKSxhLmhvb2tzLnJ1bihcImNvbXBsZXRlXCIscyksciYmci5jYWxsKHMuZWxlbWVudCl9aWYoYS5ob29rcy5ydW4oXCJiZWZvcmUtc2FuaXR5LWNoZWNrXCIscyksKG89cy5lbGVtZW50LnBhcmVudEVsZW1lbnQpJiZcInByZVwiPT09by5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpJiYhby5oYXNBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiKSYmby5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLFwiMFwiKSwhcy5jb2RlKXJldHVybiBhLmhvb2tzLnJ1bihcImNvbXBsZXRlXCIscyksdm9pZChyJiZyLmNhbGwocy5lbGVtZW50KSk7aWYoYS5ob29rcy5ydW4oXCJiZWZvcmUtaGlnaGxpZ2h0XCIscykscy5ncmFtbWFyKWlmKHQmJmUuV29ya2VyKXt2YXIgYz1uZXcgV29ya2VyKGEuZmlsZW5hbWUpO2Mub25tZXNzYWdlPWZ1bmN0aW9uKGUpe3UoZS5kYXRhKX0sYy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7bGFuZ3VhZ2U6cy5sYW5ndWFnZSxjb2RlOnMuY29kZSxpbW1lZGlhdGVDbG9zZTohMH0pKX1lbHNlIHUoYS5oaWdobGlnaHQocy5jb2RlLHMuZ3JhbW1hcixzLmxhbmd1YWdlKSk7ZWxzZSB1KGEudXRpbC5lbmNvZGUocy5jb2RlKSl9LGhpZ2hsaWdodDpmdW5jdGlvbihlLG4sdCl7dmFyIHI9e2NvZGU6ZSxncmFtbWFyOm4sbGFuZ3VhZ2U6dH07aWYoYS5ob29rcy5ydW4oXCJiZWZvcmUtdG9rZW5pemVcIixyKSwhci5ncmFtbWFyKXRocm93IG5ldyBFcnJvcignVGhlIGxhbmd1YWdlIFwiJytyLmxhbmd1YWdlKydcIiBoYXMgbm8gZ3JhbW1hci4nKTtyZXR1cm4gci50b2tlbnM9YS50b2tlbml6ZShyLmNvZGUsci5ncmFtbWFyKSxhLmhvb2tzLnJ1bihcImFmdGVyLXRva2VuaXplXCIsciksaS5zdHJpbmdpZnkoYS51dGlsLmVuY29kZShyLnRva2Vucyksci5sYW5ndWFnZSl9LHRva2VuaXplOmZ1bmN0aW9uKGUsbil7dmFyIHQ9bi5yZXN0O2lmKHQpe2Zvcih2YXIgciBpbiB0KW5bcl09dFtyXTtkZWxldGUgbi5yZXN0fXZhciBhPW5ldyBzO3JldHVybiB1KGEsYS5oZWFkLGUpLG8oZSxhLG4sYS5oZWFkLDApLGZ1bmN0aW9uKGUpe2Zvcih2YXIgbj1bXSx0PWUuaGVhZC5uZXh0O3QhPT1lLnRhaWw7KW4ucHVzaCh0LnZhbHVlKSx0PXQubmV4dDtyZXR1cm4gbn0oYSl9LGhvb2tzOnthbGw6e30sYWRkOmZ1bmN0aW9uKGUsbil7dmFyIHQ9YS5ob29rcy5hbGw7dFtlXT10W2VdfHxbXSx0W2VdLnB1c2gobil9LHJ1bjpmdW5jdGlvbihlLG4pe3ZhciB0PWEuaG9va3MuYWxsW2VdO2lmKHQmJnQubGVuZ3RoKWZvcih2YXIgcixpPTA7cj10W2krK107KXIobil9fSxUb2tlbjppfTtmdW5jdGlvbiBpKGUsbix0LHIpe3RoaXMudHlwZT1lLHRoaXMuY29udGVudD1uLHRoaXMuYWxpYXM9dCx0aGlzLmxlbmd0aD0wfChyfHxcIlwiKS5sZW5ndGh9ZnVuY3Rpb24gbChlLG4sdCxyKXtlLmxhc3RJbmRleD1uO3ZhciBhPWUuZXhlYyh0KTtpZihhJiZyJiZhWzFdKXt2YXIgaT1hWzFdLmxlbmd0aDthLmluZGV4Kz1pLGFbMF09YVswXS5zbGljZShpKX1yZXR1cm4gYX1mdW5jdGlvbiBvKGUsbix0LHIscyxnKXtmb3IodmFyIGYgaW4gdClpZih0Lmhhc093blByb3BlcnR5KGYpJiZ0W2ZdKXt2YXIgaD10W2ZdO2g9QXJyYXkuaXNBcnJheShoKT9oOltoXTtmb3IodmFyIGQ9MDtkPGgubGVuZ3RoOysrZCl7aWYoZyYmZy5jYXVzZT09ZitcIixcIitkKXJldHVybjt2YXIgdj1oW2RdLHA9di5pbnNpZGUsbT0hIXYubG9va2JlaGluZCx5PSEhdi5ncmVlZHksaz12LmFsaWFzO2lmKHkmJiF2LnBhdHRlcm4uZ2xvYmFsKXt2YXIgeD12LnBhdHRlcm4udG9TdHJpbmcoKS5tYXRjaCgvW2ltc3V5XSokLylbMF07di5wYXR0ZXJuPVJlZ0V4cCh2LnBhdHRlcm4uc291cmNlLHgrXCJnXCIpfWZvcih2YXIgYj12LnBhdHRlcm58fHYsdz1yLm5leHQsQT1zO3chPT1uLnRhaWwmJiEoZyYmQT49Zy5yZWFjaCk7QSs9dy52YWx1ZS5sZW5ndGgsdz13Lm5leHQpe3ZhciBFPXcudmFsdWU7aWYobi5sZW5ndGg+ZS5sZW5ndGgpcmV0dXJuO2lmKCEoRSBpbnN0YW5jZW9mIGkpKXt2YXIgUCxMPTE7aWYoeSl7aWYoIShQPWwoYixBLGUsbSkpfHxQLmluZGV4Pj1lLmxlbmd0aClicmVhazt2YXIgUz1QLmluZGV4LE89UC5pbmRleCtQWzBdLmxlbmd0aCxqPUE7Zm9yKGorPXcudmFsdWUubGVuZ3RoO1M+PWo7KWorPSh3PXcubmV4dCkudmFsdWUubGVuZ3RoO2lmKEE9ai09dy52YWx1ZS5sZW5ndGgsdy52YWx1ZSBpbnN0YW5jZW9mIGkpY29udGludWU7Zm9yKHZhciBDPXc7QyE9PW4udGFpbCYmKGo8T3x8XCJzdHJpbmdcIj09dHlwZW9mIEMudmFsdWUpO0M9Qy5uZXh0KUwrKyxqKz1DLnZhbHVlLmxlbmd0aDtMLS0sRT1lLnNsaWNlKEEsaiksUC5pbmRleC09QX1lbHNlIGlmKCEoUD1sKGIsMCxFLG0pKSljb250aW51ZTtTPVAuaW5kZXg7dmFyIE49UFswXSxfPUUuc2xpY2UoMCxTKSxNPUUuc2xpY2UoUytOLmxlbmd0aCksVz1BK0UubGVuZ3RoO2cmJlc+Zy5yZWFjaCYmKGcucmVhY2g9Vyk7dmFyIHo9dy5wcmV2O2lmKF8mJih6PXUobix6LF8pLEErPV8ubGVuZ3RoKSxjKG4seixMKSx3PXUobix6LG5ldyBpKGYscD9hLnRva2VuaXplKE4scCk6TixrLE4pKSxNJiZ1KG4sdyxNKSxMPjEpe3ZhciBJPXtjYXVzZTpmK1wiLFwiK2QscmVhY2g6V307byhlLG4sdCx3LnByZXYsQSxJKSxnJiZJLnJlYWNoPmcucmVhY2gmJihnLnJlYWNoPUkucmVhY2gpfX19fX19ZnVuY3Rpb24gcygpe3ZhciBlPXt2YWx1ZTpudWxsLHByZXY6bnVsbCxuZXh0Om51bGx9LG49e3ZhbHVlOm51bGwscHJldjplLG5leHQ6bnVsbH07ZS5uZXh0PW4sdGhpcy5oZWFkPWUsdGhpcy50YWlsPW4sdGhpcy5sZW5ndGg9MH1mdW5jdGlvbiB1KGUsbix0KXt2YXIgcj1uLm5leHQsYT17dmFsdWU6dCxwcmV2Om4sbmV4dDpyfTtyZXR1cm4gbi5uZXh0PWEsci5wcmV2PWEsZS5sZW5ndGgrKyxhfWZ1bmN0aW9uIGMoZSxuLHQpe2Zvcih2YXIgcj1uLm5leHQsYT0wO2E8dCYmciE9PWUudGFpbDthKyspcj1yLm5leHQ7bi5uZXh0PXIsci5wcmV2PW4sZS5sZW5ndGgtPWF9aWYoZS5QcmlzbT1hLGkuc3RyaW5naWZ5PWZ1bmN0aW9uIGUobix0KXtpZihcInN0cmluZ1wiPT10eXBlb2YgbilyZXR1cm4gbjtpZihBcnJheS5pc0FycmF5KG4pKXt2YXIgcj1cIlwiO3JldHVybiBuLmZvckVhY2goKGZ1bmN0aW9uKG4pe3IrPWUobix0KX0pKSxyfXZhciBpPXt0eXBlOm4udHlwZSxjb250ZW50OmUobi5jb250ZW50LHQpLHRhZzpcInNwYW5cIixjbGFzc2VzOltcInRva2VuXCIsbi50eXBlXSxhdHRyaWJ1dGVzOnt9LGxhbmd1YWdlOnR9LGw9bi5hbGlhcztsJiYoQXJyYXkuaXNBcnJheShsKT9BcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpLmNsYXNzZXMsbCk6aS5jbGFzc2VzLnB1c2gobCkpLGEuaG9va3MucnVuKFwid3JhcFwiLGkpO3ZhciBvPVwiXCI7Zm9yKHZhciBzIGluIGkuYXR0cmlidXRlcylvKz1cIiBcIitzKyc9XCInKyhpLmF0dHJpYnV0ZXNbc118fFwiXCIpLnJlcGxhY2UoL1wiL2csXCImcXVvdDtcIikrJ1wiJztyZXR1cm5cIjxcIitpLnRhZysnIGNsYXNzPVwiJytpLmNsYXNzZXMuam9pbihcIiBcIikrJ1wiJytvK1wiPlwiK2kuY29udGVudCtcIjwvXCIraS50YWcrXCI+XCJ9LCFlLmRvY3VtZW50KXJldHVybiBlLmFkZEV2ZW50TGlzdGVuZXI/KGEuZGlzYWJsZVdvcmtlck1lc3NhZ2VIYW5kbGVyfHxlLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsKGZ1bmN0aW9uKG4pe3ZhciB0PUpTT04ucGFyc2Uobi5kYXRhKSxyPXQubGFuZ3VhZ2UsaT10LmNvZGUsbD10LmltbWVkaWF0ZUNsb3NlO2UucG9zdE1lc3NhZ2UoYS5oaWdobGlnaHQoaSxhLmxhbmd1YWdlc1tyXSxyKSksbCYmZS5jbG9zZSgpfSksITEpLGEpOmE7dmFyIGc9YS51dGlsLmN1cnJlbnRTY3JpcHQoKTtmdW5jdGlvbiBmKCl7YS5tYW51YWx8fGEuaGlnaGxpZ2h0QWxsKCl9aWYoZyYmKGEuZmlsZW5hbWU9Zy5zcmMsZy5oYXNBdHRyaWJ1dGUoXCJkYXRhLW1hbnVhbFwiKSYmKGEubWFudWFsPSEwKSksIWEubWFudWFsKXt2YXIgaD1kb2N1bWVudC5yZWFkeVN0YXRlO1wibG9hZGluZ1wiPT09aHx8XCJpbnRlcmFjdGl2ZVwiPT09aCYmZyYmZy5kZWZlcj9kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLGYpOndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU/d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmKTp3aW5kb3cuc2V0VGltZW91dChmLDE2KX1yZXR1cm4gYX0oX3NlbGYpO1widW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzJiYobW9kdWxlLmV4cG9ydHM9UHJpc20pLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWwmJihnbG9iYWwuUHJpc209UHJpc20pO1xuUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cD17Y29tbWVudDp7cGF0dGVybjovPCEtLSg/Oig/ITwhLS0pW1xcc1xcU10pKj8tLT4vLGdyZWVkeTohMH0scHJvbG9nOntwYXR0ZXJuOi88XFw/W1xcc1xcU10rP1xcPz4vLGdyZWVkeTohMH0sZG9jdHlwZTp7cGF0dGVybjovPCFET0NUWVBFKD86W14+XCInW1xcXV18XCJbXlwiXSpcInwnW14nXSonKSsoPzpcXFsoPzpbXjxcIidcXF1dfFwiW15cIl0qXCJ8J1teJ10qJ3w8KD8hIS0tKXw8IS0tKD86W14tXXwtKD8hLT4pKSotLT4pKlxcXVxccyopPz4vaSxncmVlZHk6ITAsaW5zaWRlOntcImludGVybmFsLXN1YnNldFwiOntwYXR0ZXJuOi8oXlteXFxbXSpcXFspW1xcc1xcU10rKD89XFxdPiQpLyxsb29rYmVoaW5kOiEwLGdyZWVkeTohMCxpbnNpZGU6bnVsbH0sc3RyaW5nOntwYXR0ZXJuOi9cIlteXCJdKlwifCdbXiddKicvLGdyZWVkeTohMH0scHVuY3R1YXRpb246L148IXw+JHxbW1xcXV0vLFwiZG9jdHlwZS10YWdcIjovXkRPQ1RZUEUvaSxuYW1lOi9bXlxcczw+J1wiXSsvfX0sY2RhdGE6e3BhdHRlcm46LzwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdPi9pLGdyZWVkeTohMH0sdGFnOntwYXR0ZXJuOi88XFwvPyg/IVxcZClbXlxccz5cXC89JDwlXSsoPzpcXHMoPzpcXHMqW15cXHM+XFwvPV0rKD86XFxzKj1cXHMqKD86XCJbXlwiXSpcInwnW14nXSonfFteXFxzJ1wiPj1dKyg/PVtcXHM+XSkpfCg/PVtcXHMvPl0pKSkrKT9cXHMqXFwvPz4vLGdyZWVkeTohMCxpbnNpZGU6e3RhZzp7cGF0dGVybjovXjxcXC8/W15cXHM+XFwvXSsvLGluc2lkZTp7cHVuY3R1YXRpb246L148XFwvPy8sbmFtZXNwYWNlOi9eW15cXHM+XFwvOl0rOi99fSxcInNwZWNpYWwtYXR0clwiOltdLFwiYXR0ci12YWx1ZVwiOntwYXR0ZXJuOi89XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIj49XSspLyxpbnNpZGU6e3B1bmN0dWF0aW9uOlt7cGF0dGVybjovXj0vLGFsaWFzOlwiYXR0ci1lcXVhbHNcIn0se3BhdHRlcm46L14oXFxzKilbXCInXXxbXCInXSQvLGxvb2tiZWhpbmQ6ITB9XX19LHB1bmN0dWF0aW9uOi9cXC8/Pi8sXCJhdHRyLW5hbWVcIjp7cGF0dGVybjovW15cXHM+XFwvXSsvLGluc2lkZTp7bmFtZXNwYWNlOi9eW15cXHM+XFwvOl0rOi99fX19LGVudGl0eTpbe3BhdHRlcm46LyZbXFxkYS16XXsxLDh9Oy9pLGFsaWFzOlwibmFtZWQtZW50aXR5XCJ9LC8mI3g/W1xcZGEtZl17MSw4fTsvaV19LFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVtcImF0dHItdmFsdWVcIl0uaW5zaWRlLmVudGl0eT1QcmlzbS5sYW5ndWFnZXMubWFya3VwLmVudGl0eSxQcmlzbS5sYW5ndWFnZXMubWFya3VwLmRvY3R5cGUuaW5zaWRlW1wiaW50ZXJuYWwtc3Vic2V0XCJdLmluc2lkZT1QcmlzbS5sYW5ndWFnZXMubWFya3VwLFByaXNtLmhvb2tzLmFkZChcIndyYXBcIiwoZnVuY3Rpb24oYSl7XCJlbnRpdHlcIj09PWEudHlwZSYmKGEuYXR0cmlidXRlcy50aXRsZT1hLmNvbnRlbnQucmVwbGFjZSgvJmFtcDsvLFwiJlwiKSl9KSksT2JqZWN0LmRlZmluZVByb3BlcnR5KFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLFwiYWRkSW5saW5lZFwiLHt2YWx1ZTpmdW5jdGlvbihhLGUpe3ZhciBzPXt9O3NbXCJsYW5ndWFnZS1cIitlXT17cGF0dGVybjovKF48IVxcW0NEQVRBXFxbKVtcXHNcXFNdKz8oPz1cXF1cXF0+JCkvaSxsb29rYmVoaW5kOiEwLGluc2lkZTpQcmlzbS5sYW5ndWFnZXNbZV19LHMuY2RhdGE9L148IVxcW0NEQVRBXFxbfFxcXVxcXT4kL2k7dmFyIHQ9e1wiaW5jbHVkZWQtY2RhdGFcIjp7cGF0dGVybjovPCFcXFtDREFUQVxcW1tcXHNcXFNdKj9cXF1cXF0+L2ksaW5zaWRlOnN9fTt0W1wibGFuZ3VhZ2UtXCIrZV09e3BhdHRlcm46L1tcXHNcXFNdKy8saW5zaWRlOlByaXNtLmxhbmd1YWdlc1tlXX07dmFyIG49e307blthXT17cGF0dGVybjpSZWdFeHAoXCIoPF9fW14+XSo+KSg/OjwhXFxcXFtDREFUQVxcXFxbKD86W15cXFxcXV18XFxcXF0oPyFcXFxcXT4pKSpcXFxcXVxcXFxdPnwoPyE8IVxcXFxbQ0RBVEFcXFxcWylbXl0pKj8oPz08L19fPilcIi5yZXBsYWNlKC9fXy9nLChmdW5jdGlvbigpe3JldHVybiBhfSkpLFwiaVwiKSxsb29rYmVoaW5kOiEwLGdyZWVkeTohMCxpbnNpZGU6dH0sUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcIm1hcmt1cFwiLFwiY2RhdGFcIixuKX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcsXCJhZGRBdHRyaWJ1dGVcIix7dmFsdWU6ZnVuY3Rpb24oYSxlKXtQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVbXCJzcGVjaWFsLWF0dHJcIl0ucHVzaCh7cGF0dGVybjpSZWdFeHAoXCIoXnxbXFxcIidcXFxcc10pKD86XCIrYStcIilcXFxccyo9XFxcXHMqKD86XFxcIlteXFxcIl0qXFxcInwnW14nXSonfFteXFxcXHMnXFxcIj49XSsoPz1bXFxcXHM+XSkpXCIsXCJpXCIpLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOntcImF0dHItbmFtZVwiOi9eW15cXHM9XSsvLFwiYXR0ci12YWx1ZVwiOntwYXR0ZXJuOi89W1xcc1xcU10rLyxpbnNpZGU6e3ZhbHVlOntwYXR0ZXJuOi8oXj1cXHMqKFtcIiddfCg/IVtcIiddKSkpXFxTW1xcc1xcU10qKD89XFwyJCkvLGxvb2tiZWhpbmQ6ITAsYWxpYXM6W2UsXCJsYW5ndWFnZS1cIitlXSxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzW2VdfSxwdW5jdHVhdGlvbjpbe3BhdHRlcm46L149LyxhbGlhczpcImF0dHItZXF1YWxzXCJ9LC9cInwnL119fX19KX19KSxQcmlzbS5sYW5ndWFnZXMuaHRtbD1QcmlzbS5sYW5ndWFnZXMubWFya3VwLFByaXNtLmxhbmd1YWdlcy5tYXRobWw9UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCxQcmlzbS5sYW5ndWFnZXMuc3ZnPVByaXNtLmxhbmd1YWdlcy5tYXJrdXAsUHJpc20ubGFuZ3VhZ2VzLnhtbD1QcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKFwibWFya3VwXCIse30pLFByaXNtLmxhbmd1YWdlcy5zc21sPVByaXNtLmxhbmd1YWdlcy54bWwsUHJpc20ubGFuZ3VhZ2VzLmF0b209UHJpc20ubGFuZ3VhZ2VzLnhtbCxQcmlzbS5sYW5ndWFnZXMucnNzPVByaXNtLmxhbmd1YWdlcy54bWw7XG4hZnVuY3Rpb24ocyl7dmFyIGU9Lyg/OlwiKD86XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8W15cIlxcXFxcXHJcXG5dKSpcInwnKD86XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8W14nXFxcXFxcclxcbl0pKicpLztzLmxhbmd1YWdlcy5jc3M9e2NvbW1lbnQ6L1xcL1xcKltcXHNcXFNdKj9cXCpcXC8vLGF0cnVsZTp7cGF0dGVybjpSZWdFeHAoXCJAW1xcXFx3LV0oPzpbXjt7XFxcXHNcXFwiJ118XFxcXHMrKD8hXFxcXHMpfFwiK2Uuc291cmNlK1wiKSo/KD86O3woPz1cXFxccypcXFxceykpXCIpLGluc2lkZTp7cnVsZTovXkBbXFx3LV0rLyxcInNlbGVjdG9yLWZ1bmN0aW9uLWFyZ3VtZW50XCI6e3BhdHRlcm46LyhcXGJzZWxlY3RvclxccypcXChcXHMqKD8hW1xccyldKSkoPzpbXigpXFxzXXxcXHMrKD8hW1xccyldKXxcXCgoPzpbXigpXXxcXChbXigpXSpcXCkpKlxcKSkrKD89XFxzKlxcKSkvLGxvb2tiZWhpbmQ6ITAsYWxpYXM6XCJzZWxlY3RvclwifSxrZXl3b3JkOntwYXR0ZXJuOi8oXnxbXlxcdy1dKSg/OmFuZHxub3R8b25seXxvcikoPyFbXFx3LV0pLyxsb29rYmVoaW5kOiEwfX19LHVybDp7cGF0dGVybjpSZWdFeHAoXCJcXFxcYnVybFxcXFwoKD86XCIrZS5zb3VyY2UrXCJ8KD86W15cXFxcXFxcXFxcclxcbigpXFxcIiddfFxcXFxcXFxcW15dKSopXFxcXClcIixcImlcIiksZ3JlZWR5OiEwLGluc2lkZTp7ZnVuY3Rpb246L151cmwvaSxwdW5jdHVhdGlvbjovXlxcKHxcXCkkLyxzdHJpbmc6e3BhdHRlcm46UmVnRXhwKFwiXlwiK2Uuc291cmNlK1wiJFwiKSxhbGlhczpcInVybFwifX19LHNlbGVjdG9yOntwYXR0ZXJuOlJlZ0V4cChcIihefFt7fVxcXFxzXSlbXnt9XFxcXHNdKD86W157fTtcXFwiJ1xcXFxzXXxcXFxccysoPyFbXFxcXHN7XSl8XCIrZS5zb3VyY2UrXCIpKig/PVxcXFxzKlxcXFx7KVwiKSxsb29rYmVoaW5kOiEwfSxzdHJpbmc6e3BhdHRlcm46ZSxncmVlZHk6ITB9LHByb3BlcnR5OntwYXR0ZXJuOi8oXnxbXi1cXHdcXHhBMC1cXHVGRkZGXSkoPyFcXHMpWy1fYS16XFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWy1cXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKjopL2ksbG9va2JlaGluZDohMH0saW1wb3J0YW50Oi8haW1wb3J0YW50XFxiL2ksZnVuY3Rpb246e3BhdHRlcm46LyhefFteLWEtejAtOV0pWy1hLXowLTldKyg/PVxcKCkvaSxsb29rYmVoaW5kOiEwfSxwdW5jdHVhdGlvbjovWygpe307OixdL30scy5sYW5ndWFnZXMuY3NzLmF0cnVsZS5pbnNpZGUucmVzdD1zLmxhbmd1YWdlcy5jc3M7dmFyIHQ9cy5sYW5ndWFnZXMubWFya3VwO3QmJih0LnRhZy5hZGRJbmxpbmVkKFwic3R5bGVcIixcImNzc1wiKSx0LnRhZy5hZGRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiY3NzXCIpKX0oUHJpc20pO1xuUHJpc20ubGFuZ3VhZ2VzLmNsaWtlPXtjb21tZW50Olt7cGF0dGVybjovKF58W15cXFxcXSlcXC9cXCpbXFxzXFxTXSo/KD86XFwqXFwvfCQpLyxsb29rYmVoaW5kOiEwLGdyZWVkeTohMH0se3BhdHRlcm46LyhefFteXFxcXDpdKVxcL1xcLy4qLyxsb29rYmVoaW5kOiEwLGdyZWVkeTohMH1dLHN0cmluZzp7cGF0dGVybjovKFtcIiddKSg/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfCg/IVxcMSlbXlxcXFxcXHJcXG5dKSpcXDEvLGdyZWVkeTohMH0sXCJjbGFzcy1uYW1lXCI6e3BhdHRlcm46LyhcXGIoPzpjbGFzc3xleHRlbmRzfGltcGxlbWVudHN8aW5zdGFuY2VvZnxpbnRlcmZhY2V8bmV3fHRyYWl0KVxccyt8XFxiY2F0Y2hcXHMrXFwoKVtcXHcuXFxcXF0rL2ksbG9va2JlaGluZDohMCxpbnNpZGU6e3B1bmN0dWF0aW9uOi9bLlxcXFxdL319LGtleXdvcmQ6L1xcYig/OmJyZWFrfGNhdGNofGNvbnRpbnVlfGRvfGVsc2V8ZmluYWxseXxmb3J8ZnVuY3Rpb258aWZ8aW58aW5zdGFuY2VvZnxuZXd8bnVsbHxyZXR1cm58dGhyb3d8dHJ5fHdoaWxlKVxcYi8sYm9vbGVhbjovXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLGZ1bmN0aW9uOi9cXGJcXHcrKD89XFwoKS8sbnVtYmVyOi9cXGIweFtcXGRhLWZdK1xcYnwoPzpcXGJcXGQrKD86XFwuXFxkKik/fFxcQlxcLlxcZCspKD86ZVsrLV0/XFxkKyk/L2ksb3BlcmF0b3I6L1s8Pl09P3xbIT1dPT89P3wtLT98XFwrXFwrP3wmJj98XFx8XFx8P3xbPyovfl4lXS8scHVuY3R1YXRpb246L1t7fVtcXF07KCksLjpdL307XG5QcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdD1QcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKFwiY2xpa2VcIix7XCJjbGFzcy1uYW1lXCI6W1ByaXNtLmxhbmd1YWdlcy5jbGlrZVtcImNsYXNzLW5hbWVcIl0se3BhdHRlcm46LyhefFteJFxcd1xceEEwLVxcdUZGRkZdKSg/IVxccylbXyRBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXC4oPzpjb25zdHJ1Y3Rvcnxwcm90b3R5cGUpKS8sbG9va2JlaGluZDohMH1dLGtleXdvcmQ6W3twYXR0ZXJuOi8oKD86XnxcXH0pXFxzKiljYXRjaFxcYi8sbG9va2JlaGluZDohMH0se3BhdHRlcm46LyhefFteLl18XFwuXFwuXFwuXFxzKilcXGIoPzphc3xhc3NlcnQoPz1cXHMqXFx7KXxhc3luYyg/PVxccyooPzpmdW5jdGlvblxcYnxcXCh8WyRcXHdcXHhBMC1cXHVGRkZGXXwkKSl8YXdhaXR8YnJlYWt8Y2FzZXxjbGFzc3xjb25zdHxjb250aW51ZXxkZWJ1Z2dlcnxkZWZhdWx0fGRlbGV0ZXxkb3xlbHNlfGVudW18ZXhwb3J0fGV4dGVuZHN8ZmluYWxseSg/PVxccyooPzpcXHt8JCkpfGZvcnxmcm9tKD89XFxzKig/OlsnXCJdfCQpKXxmdW5jdGlvbnwoPzpnZXR8c2V0KSg/PVxccyooPzpbI1xcWyRcXHdcXHhBMC1cXHVGRkZGXXwkKSl8aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW58aW5zdGFuY2VvZnxpbnRlcmZhY2V8bGV0fG5ld3xudWxsfG9mfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzdGF0aWN8c3VwZXJ8c3dpdGNofHRoaXN8dGhyb3d8dHJ5fHR5cGVvZnx1bmRlZmluZWR8dmFyfHZvaWR8d2hpbGV8d2l0aHx5aWVsZClcXGIvLGxvb2tiZWhpbmQ6ITB9XSxmdW5jdGlvbjovIz8oPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKig/OlxcLlxccyooPzphcHBseXxiaW5kfGNhbGwpXFxzKik/XFwoKS8sbnVtYmVyOntwYXR0ZXJuOlJlZ0V4cChcIihefFteXFxcXHckXSkoPzpOYU58SW5maW5pdHl8MFtiQl1bMDFdKyg/Ol9bMDFdKykqbj98MFtvT11bMC03XSsoPzpfWzAtN10rKSpuP3wwW3hYXVtcXFxcZEEtRmEtZl0rKD86X1tcXFxcZEEtRmEtZl0rKSpuP3xcXFxcZCsoPzpfXFxcXGQrKSpufCg/OlxcXFxkKyg/Ol9cXFxcZCspKig/OlxcXFwuKD86XFxcXGQrKD86X1xcXFxkKykqKT8pP3xcXFxcLlxcXFxkKyg/Ol9cXFxcZCspKikoPzpbRWVdWystXT9cXFxcZCsoPzpfXFxcXGQrKSopPykoPyFbXFxcXHckXSlcIiksbG9va2JlaGluZDohMH0sb3BlcmF0b3I6Ly0tfFxcK1xcK3xcXCpcXCo9P3w9PnwmJj0/fFxcfFxcfD0/fFshPV09PXw8PD0/fD4+Pj89P3xbLSsqLyUmfF4hPTw+XT0/fFxcLnszfXxcXD9cXD89P3xcXD9cXC4/fFt+Ol0vfSksUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRbXCJjbGFzcy1uYW1lXCJdWzBdLnBhdHRlcm49LyhcXGIoPzpjbGFzc3xleHRlbmRzfGltcGxlbWVudHN8aW5zdGFuY2VvZnxpbnRlcmZhY2V8bmV3KVxccyspW1xcdy5cXFxcXSsvLFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJqYXZhc2NyaXB0XCIsXCJrZXl3b3JkXCIse3JlZ2V4OntwYXR0ZXJuOlJlZ0V4cChcIigoPzpefFteJFxcXFx3XFxcXHhBMC1cXFxcdUZGRkYuXFxcIidcXFxcXSlcXFxcc118XFxcXGIoPzpyZXR1cm58eWllbGQpKVxcXFxzKikvKD86KD86XFxcXFsoPzpbXlxcXFxdXFxcXFxcXFxcXHJcXG5dfFxcXFxcXFxcLikqXFxcXF18XFxcXFxcXFwufFteL1xcXFxcXFxcXFxcXFtcXHJcXG5dKSsvW2RnaW15dXNdezAsN318KD86XFxcXFsoPzpbXltcXFxcXVxcXFxcXFxcXFxyXFxuXXxcXFxcXFxcXC58XFxcXFsoPzpbXltcXFxcXVxcXFxcXFxcXFxyXFxuXXxcXFxcXFxcXC58XFxcXFsoPzpbXltcXFxcXVxcXFxcXFxcXFxyXFxuXXxcXFxcXFxcXC4pKlxcXFxdKSpcXFxcXSkqXFxcXF18XFxcXFxcXFwufFteL1xcXFxcXFxcXFxcXFtcXHJcXG5dKSsvW2RnaW15dXNdezAsN312W2RnaW15dXNdezAsN30pKD89KD86XFxcXHN8L1xcXFwqKD86W14qXXxcXFxcKig/IS8pKSpcXFxcKi8pKig/OiR8W1xcclxcbiwuOzp9KVxcXFxdXXwvLykpXCIpLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwLGluc2lkZTp7XCJyZWdleC1zb3VyY2VcIjp7cGF0dGVybjovXihcXC8pW1xcc1xcU10rKD89XFwvW2Etel0qJCkvLGxvb2tiZWhpbmQ6ITAsYWxpYXM6XCJsYW5ndWFnZS1yZWdleFwiLGluc2lkZTpQcmlzbS5sYW5ndWFnZXMucmVnZXh9LFwicmVnZXgtZGVsaW1pdGVyXCI6L15cXC98XFwvJC8sXCJyZWdleC1mbGFnc1wiOi9eW2Etel0rJC99fSxcImZ1bmN0aW9uLXZhcmlhYmxlXCI6e3BhdHRlcm46LyM/KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccypbPTpdXFxzKig/OmFzeW5jXFxzKik/KD86XFxiZnVuY3Rpb25cXGJ8KD86XFwoKD86W14oKV18XFwoW14oKV0qXFwpKSpcXCl8KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKilcXHMqPT4pKS8sYWxpYXM6XCJmdW5jdGlvblwifSxwYXJhbWV0ZXI6W3twYXR0ZXJuOi8oZnVuY3Rpb24oPzpcXHMrKD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKik/XFxzKlxcKFxccyopKD8hXFxzKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKFteKCldKlxcKSkrKD89XFxzKlxcKSkvLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOlByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0fSx7cGF0dGVybjovKF58W14kXFx3XFx4QTAtXFx1RkZGRl0pKD8hXFxzKVtfJGEtelxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccyo9PikvaSxsb29rYmVoaW5kOiEwLGluc2lkZTpQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdH0se3BhdHRlcm46LyhcXChcXHMqKSg/IVxccykoPzpbXigpXFxzXXxcXHMrKD8hW1xccyldKXxcXChbXigpXSpcXCkpKyg/PVxccypcXClcXHMqPT4pLyxsb29rYmVoaW5kOiEwLGluc2lkZTpQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdH0se3BhdHRlcm46LygoPzpcXGJ8XFxzfF4pKD8hKD86YXN8YXN5bmN8YXdhaXR8YnJlYWt8Y2FzZXxjYXRjaHxjbGFzc3xjb25zdHxjb250aW51ZXxkZWJ1Z2dlcnxkZWZhdWx0fGRlbGV0ZXxkb3xlbHNlfGVudW18ZXhwb3J0fGV4dGVuZHN8ZmluYWxseXxmb3J8ZnJvbXxmdW5jdGlvbnxnZXR8aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW58aW5zdGFuY2VvZnxpbnRlcmZhY2V8bGV0fG5ld3xudWxsfG9mfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzZXR8c3RhdGljfHN1cGVyfHN3aXRjaHx0aGlzfHRocm93fHRyeXx0eXBlb2Z8dW5kZWZpbmVkfHZhcnx2b2lkfHdoaWxlfHdpdGh8eWllbGQpKD8hWyRcXHdcXHhBMC1cXHVGRkZGXSkpKD86KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKlxccyopXFwoXFxzKnxcXF1cXHMqXFwoXFxzKikoPyFcXHMpKD86W14oKVxcc118XFxzKyg/IVtcXHMpXSl8XFwoW14oKV0qXFwpKSsoPz1cXHMqXFwpXFxzKlxceykvLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOlByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0fV0sY29uc3RhbnQ6L1xcYltBLVpdKD86W0EtWl9dfFxcZHg/KSpcXGIvfSksUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImphdmFzY3JpcHRcIixcInN0cmluZ1wiLHtoYXNoYmFuZzp7cGF0dGVybjovXiMhLiovLGdyZWVkeTohMCxhbGlhczpcImNvbW1lbnRcIn0sXCJ0ZW1wbGF0ZS1zdHJpbmdcIjp7cGF0dGVybjovYCg/OlxcXFxbXFxzXFxTXXxcXCRcXHsoPzpbXnt9XXxcXHsoPzpbXnt9XXxcXHtbXn1dKlxcfSkqXFx9KStcXH18KD8hXFwkXFx7KVteXFxcXGBdKSpgLyxncmVlZHk6ITAsaW5zaWRlOntcInRlbXBsYXRlLXB1bmN0dWF0aW9uXCI6e3BhdHRlcm46L15gfGAkLyxhbGlhczpcInN0cmluZ1wifSxpbnRlcnBvbGF0aW9uOntwYXR0ZXJuOi8oKD86XnxbXlxcXFxdKSg/OlxcXFx7Mn0pKilcXCRcXHsoPzpbXnt9XXxcXHsoPzpbXnt9XXxcXHtbXn1dKlxcfSkqXFx9KStcXH0vLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOntcImludGVycG9sYXRpb24tcHVuY3R1YXRpb25cIjp7cGF0dGVybjovXlxcJFxce3xcXH0kLyxhbGlhczpcInB1bmN0dWF0aW9uXCJ9LHJlc3Q6UHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHR9fSxzdHJpbmc6L1tcXHNcXFNdKy99fSxcInN0cmluZy1wcm9wZXJ0eVwiOntwYXR0ZXJuOi8oKD86XnxbLHtdKVsgXFx0XSopKFtcIiddKSg/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfCg/IVxcMilbXlxcXFxcXHJcXG5dKSpcXDIoPz1cXHMqOikvbSxsb29rYmVoaW5kOiEwLGdyZWVkeTohMCxhbGlhczpcInByb3BlcnR5XCJ9fSksUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImphdmFzY3JpcHRcIixcIm9wZXJhdG9yXCIse1wibGl0ZXJhbC1wcm9wZXJ0eVwiOntwYXR0ZXJuOi8oKD86XnxbLHtdKVsgXFx0XSopKD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccyo6KS9tLGxvb2tiZWhpbmQ6ITAsYWxpYXM6XCJwcm9wZXJ0eVwifX0pLFByaXNtLmxhbmd1YWdlcy5tYXJrdXAmJihQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5hZGRJbmxpbmVkKFwic2NyaXB0XCIsXCJqYXZhc2NyaXB0XCIpLFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmFkZEF0dHJpYnV0ZShcIm9uKD86YWJvcnR8Ymx1cnxjaGFuZ2V8Y2xpY2t8Y29tcG9zaXRpb24oPzplbmR8c3RhcnR8dXBkYXRlKXxkYmxjbGlja3xlcnJvcnxmb2N1cyg/OmlufG91dCk/fGtleSg/OmRvd258dXApfGxvYWR8bW91c2UoPzpkb3dufGVudGVyfGxlYXZlfG1vdmV8b3V0fG92ZXJ8dXApfHJlc2V0fHJlc2l6ZXxzY3JvbGx8c2VsZWN0fHNsb3RjaGFuZ2V8c3VibWl0fHVubG9hZHx3aGVlbClcIixcImphdmFzY3JpcHRcIikpLFByaXNtLmxhbmd1YWdlcy5qcz1QcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdDtcblByaXNtLmxhbmd1YWdlcy5jPVByaXNtLmxhbmd1YWdlcy5leHRlbmQoXCJjbGlrZVwiLHtjb21tZW50OntwYXR0ZXJuOi9cXC9cXC8oPzpbXlxcclxcblxcXFxdfFxcXFwoPzpcXHJcXG4/fFxcbnwoPyFbXFxyXFxuXSkpKSp8XFwvXFwqW1xcc1xcU10qPyg/OlxcKlxcL3wkKS8sZ3JlZWR5OiEwfSxzdHJpbmc6e3BhdHRlcm46L1wiKD86XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8W15cIlxcXFxcXHJcXG5dKSpcIi8sZ3JlZWR5OiEwfSxcImNsYXNzLW5hbWVcIjp7cGF0dGVybjovKFxcYig/OmVudW18c3RydWN0KVxccysoPzpfX2F0dHJpYnV0ZV9fXFxzKlxcKFxcKFtcXHNcXFNdKj9cXClcXClcXHMqKT8pXFx3K3xcXGJbYS16XVxcdypfdFxcYi8sbG9va2JlaGluZDohMH0sa2V5d29yZDovXFxiKD86X0FsaWduYXN8X0FsaWdub2Z8X0F0b21pY3xfQm9vbHxfQ29tcGxleHxfR2VuZXJpY3xfSW1hZ2luYXJ5fF9Ob3JldHVybnxfU3RhdGljX2Fzc2VydHxfVGhyZWFkX2xvY2FsfF9fYXR0cmlidXRlX198YXNtfGF1dG98YnJlYWt8Y2FzZXxjaGFyfGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZG98ZG91YmxlfGVsc2V8ZW51bXxleHRlcm58ZmxvYXR8Zm9yfGdvdG98aWZ8aW5saW5lfGludHxsb25nfHJlZ2lzdGVyfHJldHVybnxzaG9ydHxzaWduZWR8c2l6ZW9mfHN0YXRpY3xzdHJ1Y3R8c3dpdGNofHR5cGVkZWZ8dHlwZW9mfHVuaW9ufHVuc2lnbmVkfHZvaWR8dm9sYXRpbGV8d2hpbGUpXFxiLyxmdW5jdGlvbjovXFxiW2Etel9dXFx3Kig/PVxccypcXCgpL2ksbnVtYmVyOi8oPzpcXGIweCg/OltcXGRhLWZdKyg/OlxcLltcXGRhLWZdKik/fFxcLltcXGRhLWZdKykoPzpwWystXT9cXGQrKT98KD86XFxiXFxkKyg/OlxcLlxcZCopP3xcXEJcXC5cXGQrKSg/OmVbKy1dP1xcZCspPylbZnVsXXswLDR9L2ksb3BlcmF0b3I6Lz4+PT98PDw9P3wtPnwoWy0rJnw6XSlcXDF8Wz86fl18Wy0rKi8lJnxeIT08Pl09Py99KSxQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiY1wiLFwic3RyaW5nXCIse2NoYXI6e3BhdHRlcm46LycoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXxbXidcXFxcXFxyXFxuXSl7MCwzMn0nLyxncmVlZHk6ITB9fSksUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImNcIixcInN0cmluZ1wiLHttYWNybzp7cGF0dGVybjovKF5bXFx0IF0qKSNcXHMqW2Etel0oPzpbXlxcclxcblxcXFwvXXxcXC8oPyFcXCopfFxcL1xcKig/OlteKl18XFwqKD8hXFwvKSkqXFwqXFwvfFxcXFwoPzpcXHJcXG58W1xcc1xcU10pKSovaW0sbG9va2JlaGluZDohMCxncmVlZHk6ITAsYWxpYXM6XCJwcm9wZXJ0eVwiLGluc2lkZTp7c3RyaW5nOlt7cGF0dGVybjovXigjXFxzKmluY2x1ZGVcXHMqKTxbXj5dKz4vLGxvb2tiZWhpbmQ6ITB9LFByaXNtLmxhbmd1YWdlcy5jLnN0cmluZ10sY2hhcjpQcmlzbS5sYW5ndWFnZXMuYy5jaGFyLGNvbW1lbnQ6UHJpc20ubGFuZ3VhZ2VzLmMuY29tbWVudCxcIm1hY3JvLW5hbWVcIjpbe3BhdHRlcm46LyheI1xccypkZWZpbmVcXHMrKVxcdytcXGIoPyFcXCgpL2ksbG9va2JlaGluZDohMH0se3BhdHRlcm46LyheI1xccypkZWZpbmVcXHMrKVxcdytcXGIoPz1cXCgpL2ksbG9va2JlaGluZDohMCxhbGlhczpcImZ1bmN0aW9uXCJ9XSxkaXJlY3RpdmU6e3BhdHRlcm46L14oI1xccyopW2Etel0rLyxsb29rYmVoaW5kOiEwLGFsaWFzOlwia2V5d29yZFwifSxcImRpcmVjdGl2ZS1oYXNoXCI6L14jLyxwdW5jdHVhdGlvbjovIyN8XFxcXCg/PVtcXHJcXG5dKS8sZXhwcmVzc2lvbjp7cGF0dGVybjovXFxTW1xcc1xcU10qLyxpbnNpZGU6UHJpc20ubGFuZ3VhZ2VzLmN9fX19KSxQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiY1wiLFwiZnVuY3Rpb25cIix7Y29uc3RhbnQ6L1xcYig/OkVPRnxOVUxMfFNFRUtfQ1VSfFNFRUtfRU5EfFNFRUtfU0VUfF9fREFURV9ffF9fRklMRV9ffF9fTElORV9ffF9fVElNRVNUQU1QX198X19USU1FX198X19mdW5jX198c3RkZXJyfHN0ZGlufHN0ZG91dClcXGIvfSksZGVsZXRlIFByaXNtLmxhbmd1YWdlcy5jLmJvb2xlYW47XG4hZnVuY3Rpb24oZSl7ZnVuY3Rpb24gbihlLG4pe3JldHVybiBlLnJlcGxhY2UoLzw8KFxcZCspPj4vZywoZnVuY3Rpb24oZSxzKXtyZXR1cm5cIig/OlwiK25bK3NdK1wiKVwifSkpfWZ1bmN0aW9uIHMoZSxzLGEpe3JldHVybiBSZWdFeHAobihlLHMpLGF8fFwiXCIpfWZ1bmN0aW9uIGEoZSxuKXtmb3IodmFyIHM9MDtzPG47cysrKWU9ZS5yZXBsYWNlKC88PHNlbGY+Pi9nLChmdW5jdGlvbigpe3JldHVyblwiKD86XCIrZStcIilcIn0pKTtyZXR1cm4gZS5yZXBsYWNlKC88PHNlbGY+Pi9nLFwiW15cXFxcc1xcXFxTXVwiKX12YXIgdD1cImJvb2wgYnl0ZSBjaGFyIGRlY2ltYWwgZG91YmxlIGR5bmFtaWMgZmxvYXQgaW50IGxvbmcgb2JqZWN0IHNieXRlIHNob3J0IHN0cmluZyB1aW50IHVsb25nIHVzaG9ydCB2YXIgdm9pZFwiLHI9XCJjbGFzcyBlbnVtIGludGVyZmFjZSByZWNvcmQgc3RydWN0XCIsaT1cImFkZCBhbGlhcyBhbmQgYXNjZW5kaW5nIGFzeW5jIGF3YWl0IGJ5IGRlc2NlbmRpbmcgZnJvbSg/PVxcXFxzKig/OlxcXFx3fCQpKSBnZXQgZ2xvYmFsIGdyb3VwIGludG8gaW5pdCg/PVxcXFxzKjspIGpvaW4gbGV0IG5hbWVvZiBub3Qgbm90bnVsbCBvbiBvciBvcmRlcmJ5IHBhcnRpYWwgcmVtb3ZlIHNlbGVjdCBzZXQgdW5tYW5hZ2VkIHZhbHVlIHdoZW4gd2hlcmUgd2l0aCg/PVxcXFxzKnspXCIsbz1cImFic3RyYWN0IGFzIGJhc2UgYnJlYWsgY2FzZSBjYXRjaCBjaGVja2VkIGNvbnN0IGNvbnRpbnVlIGRlZmF1bHQgZGVsZWdhdGUgZG8gZWxzZSBldmVudCBleHBsaWNpdCBleHRlcm4gZmluYWxseSBmaXhlZCBmb3IgZm9yZWFjaCBnb3RvIGlmIGltcGxpY2l0IGluIGludGVybmFsIGlzIGxvY2sgbmFtZXNwYWNlIG5ldyBudWxsIG9wZXJhdG9yIG91dCBvdmVycmlkZSBwYXJhbXMgcHJpdmF0ZSBwcm90ZWN0ZWQgcHVibGljIHJlYWRvbmx5IHJlZiByZXR1cm4gc2VhbGVkIHNpemVvZiBzdGFja2FsbG9jIHN0YXRpYyBzd2l0Y2ggdGhpcyB0aHJvdyB0cnkgdHlwZW9mIHVuY2hlY2tlZCB1bnNhZmUgdXNpbmcgdmlydHVhbCB2b2xhdGlsZSB3aGlsZSB5aWVsZFwiO2Z1bmN0aW9uIGwoZSl7cmV0dXJuXCJcXFxcYig/OlwiK2UudHJpbSgpLnJlcGxhY2UoLyAvZyxcInxcIikrXCIpXFxcXGJcIn12YXIgZD1sKHIpLHA9UmVnRXhwKGwodCtcIiBcIityK1wiIFwiK2krXCIgXCIrbykpLGM9bChyK1wiIFwiK2krXCIgXCIrbyksdT1sKHQrXCIgXCIrcitcIiBcIitvKSxnPWEoXCI8KD86W148Pjs9K1xcXFwtKi8lJnxeXXw8PHNlbGY+PikqPlwiLDIpLGI9YShcIlxcXFwoKD86W14oKV18PDxzZWxmPj4pKlxcXFwpXCIsMiksaD1cIkA/XFxcXGJbQS1aYS16X11cXFxcdypcXFxcYlwiLGY9bihcIjw8MD4+KD86XFxcXHMqPDwxPj4pP1wiLFtoLGddKSxtPW4oXCIoPyE8PDA+Pik8PDE+Pig/OlxcXFxzKlxcXFwuXFxcXHMqPDwxPj4pKlwiLFtjLGZdKSxrPVwiXFxcXFtcXFxccyooPzosXFxcXHMqKSpcXFxcXVwiLHk9bihcIjw8MD4+KD86XFxcXHMqKD86XFxcXD9cXFxccyopPzw8MT4+KSooPzpcXFxccypcXFxcPyk/XCIsW20sa10pLHc9bihcIlteLCgpPD5bXFxcXF07PStcXFxcLSovJSZ8Xl18PDwwPj58PDwxPj58PDwyPj5cIixbZyxiLGtdKSx2PW4oXCJcXFxcKDw8MD4+Kyg/Oiw8PDA+PispK1xcXFwpXCIsW3ddKSx4PW4oXCIoPzo8PDA+Pnw8PDE+PikoPzpcXFxccyooPzpcXFxcP1xcXFxzKik/PDwyPj4pKig/OlxcXFxzKlxcXFw/KT9cIixbdixtLGtdKSwkPXtrZXl3b3JkOnAscHVuY3R1YXRpb246L1s8PigpPywuOltcXF1dL30sXz1cIicoPzpbXlxcclxcbidcXFxcXFxcXF18XFxcXFxcXFwufFxcXFxcXFxcW1V1eF1bXFxcXGRhLWZBLUZdezEsOH0pJ1wiLEI9J1wiKD86XFxcXFxcXFwufFteXFxcXFxcXFxcIlxcclxcbl0pKlwiJztlLmxhbmd1YWdlcy5jc2hhcnA9ZS5sYW5ndWFnZXMuZXh0ZW5kKFwiY2xpa2VcIix7c3RyaW5nOlt7cGF0dGVybjpzKFwiKF58W14kXFxcXFxcXFxdKTw8MD4+XCIsWydAXCIoPzpcIlwifFxcXFxcXFxcW15dfFteXFxcXFxcXFxcIl0pKlwiKD8hXCIpJ10pLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwfSx7cGF0dGVybjpzKFwiKF58W15AJFxcXFxcXFxcXSk8PDA+PlwiLFtCXSksbG9va2JlaGluZDohMCxncmVlZHk6ITB9XSxcImNsYXNzLW5hbWVcIjpbe3BhdHRlcm46cyhcIihcXFxcYnVzaW5nXFxcXHMrc3RhdGljXFxcXHMrKTw8MD4+KD89XFxcXHMqOylcIixbbV0pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOiR9LHtwYXR0ZXJuOnMoXCIoXFxcXGJ1c2luZ1xcXFxzKzw8MD4+XFxcXHMqPVxcXFxzKik8PDE+Pig/PVxcXFxzKjspXCIsW2gseF0pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOiR9LHtwYXR0ZXJuOnMoXCIoXFxcXGJ1c2luZ1xcXFxzKyk8PDA+Pig/PVxcXFxzKj0pXCIsW2hdKSxsb29rYmVoaW5kOiEwfSx7cGF0dGVybjpzKFwiKFxcXFxiPDwwPj5cXFxccyspPDwxPj5cIixbZCxmXSksbG9va2JlaGluZDohMCxpbnNpZGU6JH0se3BhdHRlcm46cyhcIihcXFxcYmNhdGNoXFxcXHMqXFxcXChcXFxccyopPDwwPj5cIixbbV0pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOiR9LHtwYXR0ZXJuOnMoXCIoXFxcXGJ3aGVyZVxcXFxzKyk8PDA+PlwiLFtoXSksbG9va2JlaGluZDohMH0se3BhdHRlcm46cyhcIihcXFxcYig/OmlzKD86XFxcXHMrbm90KT98YXMpXFxcXHMrKTw8MD4+XCIsW3ldKSxsb29rYmVoaW5kOiEwLGluc2lkZTokfSx7cGF0dGVybjpzKFwiXFxcXGI8PDA+Pig/PVxcXFxzKyg/ITw8MT4+fHdpdGhcXFxccypcXFxceyk8PDI+Pig/OlxcXFxzKls9LDs6eylcXFxcXV18XFxcXHMrKD86aW58d2hlbilcXFxcYikpXCIsW3gsdSxoXSksaW5zaWRlOiR9XSxrZXl3b3JkOnAsbnVtYmVyOi8oPzpcXGIwKD86eFtcXGRhLWZfXSpbXFxkYS1mXXxiWzAxX10qWzAxXSl8KD86XFxCXFwuXFxkKyg/Ol8rXFxkKykqfFxcYlxcZCsoPzpfK1xcZCspKig/OlxcLlxcZCsoPzpfK1xcZCspKik/KSg/OmVbLStdP1xcZCsoPzpfK1xcZCspKik/KSg/OltkZmxtdV18bHV8dWwpP1xcYi9pLG9wZXJhdG9yOi8+Pj0/fDw8PT98Wy09XT58KFstKyZ8XSlcXDF8fnxcXD9cXD89P3xbLSsqLyUmfF4hPTw+XT0/LyxwdW5jdHVhdGlvbjovXFw/XFwuP3w6Onxbe31bXFxdOygpLC46XS99KSxlLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJjc2hhcnBcIixcIm51bWJlclwiLHtyYW5nZTp7cGF0dGVybjovXFwuXFwuLyxhbGlhczpcIm9wZXJhdG9yXCJ9fSksZS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiY3NoYXJwXCIsXCJwdW5jdHVhdGlvblwiLHtcIm5hbWVkLXBhcmFtZXRlclwiOntwYXR0ZXJuOnMoXCIoWygsXVxcXFxzKik8PDA+Pig/PVxcXFxzKjopXCIsW2hdKSxsb29rYmVoaW5kOiEwLGFsaWFzOlwicHVuY3R1YXRpb25cIn19KSxlLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJjc2hhcnBcIixcImNsYXNzLW5hbWVcIix7bmFtZXNwYWNlOntwYXR0ZXJuOnMoXCIoXFxcXGIoPzpuYW1lc3BhY2V8dXNpbmcpXFxcXHMrKTw8MD4+KD86XFxcXHMqXFxcXC5cXFxccyo8PDA+PikqKD89XFxcXHMqWzt7XSlcIixbaF0pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOntwdW5jdHVhdGlvbjovXFwuL319LFwidHlwZS1leHByZXNzaW9uXCI6e3BhdHRlcm46cyhcIihcXFxcYig/OmRlZmF1bHR8c2l6ZW9mfHR5cGVvZilcXFxccypcXFxcKFxcXFxzKig/IVxcXFxzKSkoPzpbXigpXFxcXHNdfFxcXFxzKD8hXFxcXHMpfDw8MD4+KSooPz1cXFxccypcXFxcKSlcIixbYl0pLGxvb2tiZWhpbmQ6ITAsYWxpYXM6XCJjbGFzcy1uYW1lXCIsaW5zaWRlOiR9LFwicmV0dXJuLXR5cGVcIjp7cGF0dGVybjpzKFwiPDwwPj4oPz1cXFxccysoPzo8PDE+PlxcXFxzKig/Oj0+fFsoe118XFxcXC5cXFxccyp0aGlzXFxcXHMqXFxcXFspfHRoaXNcXFxccypcXFxcWykpXCIsW3gsbV0pLGluc2lkZTokLGFsaWFzOlwiY2xhc3MtbmFtZVwifSxcImNvbnN0cnVjdG9yLWludm9jYXRpb25cIjp7cGF0dGVybjpzKFwiKFxcXFxibmV3XFxcXHMrKTw8MD4+KD89XFxcXHMqW1soe10pXCIsW3hdKSxsb29rYmVoaW5kOiEwLGluc2lkZTokLGFsaWFzOlwiY2xhc3MtbmFtZVwifSxcImdlbmVyaWMtbWV0aG9kXCI6e3BhdHRlcm46cyhcIjw8MD4+XFxcXHMqPDwxPj4oPz1cXFxccypcXFxcKClcIixbaCxnXSksaW5zaWRlOntmdW5jdGlvbjpzKFwiXjw8MD4+XCIsW2hdKSxnZW5lcmljOntwYXR0ZXJuOlJlZ0V4cChnKSxhbGlhczpcImNsYXNzLW5hbWVcIixpbnNpZGU6JH19fSxcInR5cGUtbGlzdFwiOntwYXR0ZXJuOnMoXCJcXFxcYigoPzo8PDA+PlxcXFxzKzw8MT4+fHJlY29yZFxcXFxzKzw8MT4+XFxcXHMqPDw1Pj58d2hlcmVcXFxccys8PDI+PilcXFxccyo6XFxcXHMqKSg/Ojw8Mz4+fDw8ND4+fDw8MT4+XFxcXHMqPDw1Pj58PDw2Pj4pKD86XFxcXHMqLFxcXFxzKig/Ojw8Mz4+fDw8ND4+fDw8Nj4+KSkqKD89XFxcXHMqKD86d2hlcmV8W3s7XXw9PnwkKSlcIixbZCxmLGgseCxwLnNvdXJjZSxiLFwiXFxcXGJuZXdcXFxccypcXFxcKFxcXFxzKlxcXFwpXCJdKSxsb29rYmVoaW5kOiEwLGluc2lkZTp7XCJyZWNvcmQtYXJndW1lbnRzXCI6e3BhdHRlcm46cyhcIiheKD8hbmV3XFxcXHMqXFxcXCgpPDwwPj5cXFxccyopPDwxPj5cIixbZixiXSksbG9va2JlaGluZDohMCxncmVlZHk6ITAsaW5zaWRlOmUubGFuZ3VhZ2VzLmNzaGFycH0sa2V5d29yZDpwLFwiY2xhc3MtbmFtZVwiOntwYXR0ZXJuOlJlZ0V4cCh4KSxncmVlZHk6ITAsaW5zaWRlOiR9LHB1bmN0dWF0aW9uOi9bLCgpXS99fSxwcmVwcm9jZXNzb3I6e3BhdHRlcm46LyheW1xcdCBdKikjLiovbSxsb29rYmVoaW5kOiEwLGFsaWFzOlwicHJvcGVydHlcIixpbnNpZGU6e2RpcmVjdGl2ZTp7cGF0dGVybjovKCMpXFxiKD86ZGVmaW5lfGVsaWZ8ZWxzZXxlbmRpZnxlbmRyZWdpb258ZXJyb3J8aWZ8bGluZXxudWxsYWJsZXxwcmFnbWF8cmVnaW9ufHVuZGVmfHdhcm5pbmcpXFxiLyxsb29rYmVoaW5kOiEwLGFsaWFzOlwia2V5d29yZFwifX19fSk7dmFyIEU9QitcInxcIitfLFI9bihcIi8oPyFbKi9dKXwvL1teXFxyXFxuXSpbXFxyXFxuXXwvXFxcXCooPzpbXipdfFxcXFwqKD8hLykpKlxcXFwqL3w8PDA+PlwiLFtFXSksej1hKG4oXCJbXlxcXCInLygpXXw8PDA+PnxcXFxcKDw8c2VsZj4+KlxcXFwpXCIsW1JdKSwyKSxTPVwiXFxcXGIoPzphc3NlbWJseXxldmVudHxmaWVsZHxtZXRob2R8bW9kdWxlfHBhcmFtfHByb3BlcnR5fHJldHVybnx0eXBlKVxcXFxiXCIsaj1uKFwiPDwwPj4oPzpcXFxccypcXFxcKDw8MT4+KlxcXFwpKT9cIixbbSx6XSk7ZS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFwiY3NoYXJwXCIsXCJjbGFzcy1uYW1lXCIse2F0dHJpYnV0ZTp7cGF0dGVybjpzKFwiKCg/Ol58W15cXFxcc1xcXFx3Pik/XSlcXFxccypcXFxcW1xcXFxzKikoPzo8PDA+PlxcXFxzKjpcXFxccyopPzw8MT4+KD86XFxcXHMqLFxcXFxzKjw8MT4+KSooPz1cXFxccypcXFxcXSlcIixbUyxqXSksbG9va2JlaGluZDohMCxncmVlZHk6ITAsaW5zaWRlOnt0YXJnZXQ6e3BhdHRlcm46cyhcIl48PDA+Pig/PVxcXFxzKjopXCIsW1NdKSxhbGlhczpcImtleXdvcmRcIn0sXCJhdHRyaWJ1dGUtYXJndW1lbnRzXCI6e3BhdHRlcm46cyhcIlxcXFwoPDwwPj4qXFxcXClcIixbel0pLGluc2lkZTplLmxhbmd1YWdlcy5jc2hhcnB9LFwiY2xhc3MtbmFtZVwiOntwYXR0ZXJuOlJlZ0V4cChtKSxpbnNpZGU6e3B1bmN0dWF0aW9uOi9cXC4vfX0scHVuY3R1YXRpb246L1s6LF0vfX19KTt2YXIgQT1cIjpbXn1cXHJcXG5dK1wiLEY9YShuKFwiW15cXFwiJy8oKV18PDwwPj58XFxcXCg8PHNlbGY+PipcXFxcKVwiLFtSXSksMiksUD1uKFwiXFxcXHsoPyFcXFxceykoPzooPyFbfTpdKTw8MD4+KSo8PDE+Pj9cXFxcfVwiLFtGLEFdKSxVPWEobihcIlteXFxcIicvKCldfC8oPyFcXFxcKil8L1xcXFwqKD86W14qXXxcXFxcKig/IS8pKSpcXFxcKi98PDwwPj58XFxcXCg8PHNlbGY+PipcXFxcKVwiLFtFXSksMiksWj1uKFwiXFxcXHsoPyFcXFxceykoPzooPyFbfTpdKTw8MD4+KSo8PDE+Pj9cXFxcfVwiLFtVLEFdKTtmdW5jdGlvbiBxKG4sYSl7cmV0dXJue2ludGVycG9sYXRpb246e3BhdHRlcm46cyhcIigoPzpefFtee10pKD86XFxcXHtcXFxceykqKTw8MD4+XCIsW25dKSxsb29rYmVoaW5kOiEwLGluc2lkZTp7XCJmb3JtYXQtc3RyaW5nXCI6e3BhdHRlcm46cyhcIiheXFxcXHsoPzooPyFbfTpdKTw8MD4+KSopPDwxPj4oPz1cXFxcfSQpXCIsW2EsQV0pLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOntwdW5jdHVhdGlvbjovXjovfX0scHVuY3R1YXRpb246L15cXHt8XFx9JC8sZXhwcmVzc2lvbjp7cGF0dGVybjovW1xcc1xcU10rLyxhbGlhczpcImxhbmd1YWdlLWNzaGFycFwiLGluc2lkZTplLmxhbmd1YWdlcy5jc2hhcnB9fX0sc3RyaW5nOi9bXFxzXFxTXSsvfX1lLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJjc2hhcnBcIixcInN0cmluZ1wiLHtcImludGVycG9sYXRpb24tc3RyaW5nXCI6W3twYXR0ZXJuOnMoJyhefFteXFxcXFxcXFxdKSg/OlxcXFwkQHxAXFxcXCQpXCIoPzpcIlwifFxcXFxcXFxcW15dfFxcXFx7XFxcXHt8PDwwPj58W15cXFxcXFxcXHtcIl0pKlwiJyxbUF0pLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwLGluc2lkZTpxKFAsRil9LHtwYXR0ZXJuOnMoJyhefFteQFxcXFxcXFxcXSlcXFxcJFwiKD86XFxcXFxcXFwufFxcXFx7XFxcXHt8PDwwPj58W15cXFxcXFxcXFwie10pKlwiJyxbWl0pLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwLGluc2lkZTpxKFosVSl9XSxjaGFyOntwYXR0ZXJuOlJlZ0V4cChfKSxncmVlZHk6ITB9fSksZS5sYW5ndWFnZXMuZG90bmV0PWUubGFuZ3VhZ2VzLmNzPWUubGFuZ3VhZ2VzLmNzaGFycH0oUHJpc20pO1xuIWZ1bmN0aW9uKGUpe3ZhciB0PS9cXGIoPzphbGlnbmFzfGFsaWdub2Z8YXNtfGF1dG98Ym9vbHxicmVha3xjYXNlfGNhdGNofGNoYXJ8Y2hhcjE2X3R8Y2hhcjMyX3R8Y2hhcjhfdHxjbGFzc3xjb19hd2FpdHxjb19yZXR1cm58Y29feWllbGR8Y29tcGx8Y29uY2VwdHxjb25zdHxjb25zdF9jYXN0fGNvbnN0ZXZhbHxjb25zdGV4cHJ8Y29uc3Rpbml0fGNvbnRpbnVlfGRlY2x0eXBlfGRlZmF1bHR8ZGVsZXRlfGRvfGRvdWJsZXxkeW5hbWljX2Nhc3R8ZWxzZXxlbnVtfGV4cGxpY2l0fGV4cG9ydHxleHRlcm58ZmluYWx8ZmxvYXR8Zm9yfGZyaWVuZHxnb3RvfGlmfGltcG9ydHxpbmxpbmV8aW50fGludDE2X3R8aW50MzJfdHxpbnQ2NF90fGludDhfdHxsb25nfG1vZHVsZXxtdXRhYmxlfG5hbWVzcGFjZXxuZXd8bm9leGNlcHR8bnVsbHB0cnxvcGVyYXRvcnxvdmVycmlkZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmVnaXN0ZXJ8cmVpbnRlcnByZXRfY2FzdHxyZXF1aXJlc3xyZXR1cm58c2hvcnR8c2lnbmVkfHNpemVvZnxzdGF0aWN8c3RhdGljX2Fzc2VydHxzdGF0aWNfY2FzdHxzdHJ1Y3R8c3dpdGNofHRlbXBsYXRlfHRoaXN8dGhyZWFkX2xvY2FsfHRocm93fHRyeXx0eXBlZGVmfHR5cGVpZHx0eXBlbmFtZXx1aW50MTZfdHx1aW50MzJfdHx1aW50NjRfdHx1aW50OF90fHVuaW9ufHVuc2lnbmVkfHVzaW5nfHZpcnR1YWx8dm9pZHx2b2xhdGlsZXx3Y2hhcl90fHdoaWxlKVxcYi8sbj1cIlxcXFxiKD8hPGtleXdvcmQ+KVxcXFx3Kyg/OlxcXFxzKlxcXFwuXFxcXHMqXFxcXHcrKSpcXFxcYlwiLnJlcGxhY2UoLzxrZXl3b3JkPi9nLChmdW5jdGlvbigpe3JldHVybiB0LnNvdXJjZX0pKTtlLmxhbmd1YWdlcy5jcHA9ZS5sYW5ndWFnZXMuZXh0ZW5kKFwiY1wiLHtcImNsYXNzLW5hbWVcIjpbe3BhdHRlcm46UmVnRXhwKFwiKFxcXFxiKD86Y2xhc3N8Y29uY2VwdHxlbnVtfHN0cnVjdHx0eXBlbmFtZSlcXFxccyspKD8hPGtleXdvcmQ+KVxcXFx3K1wiLnJlcGxhY2UoLzxrZXl3b3JkPi9nLChmdW5jdGlvbigpe3JldHVybiB0LnNvdXJjZX0pKSksbG9va2JlaGluZDohMH0sL1xcYltBLVpdXFx3Kig/PVxccyo6OlxccypcXHcrXFxzKlxcKCkvLC9cXGJbQS1aX11cXHcqKD89XFxzKjo6XFxzKn5cXHcrXFxzKlxcKCkvaSwvXFxiXFx3Kyg/PVxccyo8KD86W148Pl18PCg/OltePD5dfDxbXjw+XSo+KSo+KSo+XFxzKjo6XFxzKlxcdytcXHMqXFwoKS9dLGtleXdvcmQ6dCxudW1iZXI6e3BhdHRlcm46Lyg/OlxcYjBiWzAxJ10rfFxcYjB4KD86W1xcZGEtZiddKyg/OlxcLltcXGRhLWYnXSopP3xcXC5bXFxkYS1mJ10rKSg/OnBbKy1dP1tcXGQnXSspP3woPzpcXGJbXFxkJ10rKD86XFwuW1xcZCddKik/fFxcQlxcLltcXGQnXSspKD86ZVsrLV0/W1xcZCddKyk/KVtmdWxdezAsNH0vaSxncmVlZHk6ITB9LG9wZXJhdG9yOi8+Pj0/fDw8PT98LT58LS18XFwrXFwrfCYmfFxcfFxcfHxbPzp+XXw8PT58Wy0rKi8lJnxeIT08Pl09P3xcXGIoPzphbmR8YW5kX2VxfGJpdGFuZHxiaXRvcnxub3R8bm90X2VxfG9yfG9yX2VxfHhvcnx4b3JfZXEpXFxiLyxib29sZWFuOi9cXGIoPzpmYWxzZXx0cnVlKVxcYi99KSxlLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJjcHBcIixcInN0cmluZ1wiLHttb2R1bGU6e3BhdHRlcm46UmVnRXhwKCcoXFxcXGIoPzppbXBvcnR8bW9kdWxlKVxcXFxzKykoPzpcIig/OlxcXFxcXFxcKD86XFxyXFxufFteXSl8W15cIlxcXFxcXFxcXFxyXFxuXSkqXCJ8PFtePD5cXHJcXG5dKj58JytcIjxtb2QtbmFtZT4oPzpcXFxccyo6XFxcXHMqPG1vZC1uYW1lPik/fDpcXFxccyo8bW9kLW5hbWU+XCIucmVwbGFjZSgvPG1vZC1uYW1lPi9nLChmdW5jdGlvbigpe3JldHVybiBufSkpK1wiKVwiKSxsb29rYmVoaW5kOiEwLGdyZWVkeTohMCxpbnNpZGU6e3N0cmluZzovXls8XCJdW1xcc1xcU10rLyxvcGVyYXRvcjovOi8scHVuY3R1YXRpb246L1xcLi99fSxcInJhdy1zdHJpbmdcIjp7cGF0dGVybjovUlwiKFteKClcXFxcIF17MCwxNn0pXFwoW1xcc1xcU10qP1xcKVxcMVwiLyxhbGlhczpcInN0cmluZ1wiLGdyZWVkeTohMH19KSxlLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJjcHBcIixcImtleXdvcmRcIix7XCJnZW5lcmljLWZ1bmN0aW9uXCI6e3BhdHRlcm46L1xcYig/IW9wZXJhdG9yXFxiKVthLXpfXVxcdypcXHMqPCg/OltePD5dfDxbXjw+XSo+KSo+KD89XFxzKlxcKCkvaSxpbnNpZGU6e2Z1bmN0aW9uOi9eXFx3Ky8sZ2VuZXJpYzp7cGF0dGVybjovPFtcXHNcXFNdKy8sYWxpYXM6XCJjbGFzcy1uYW1lXCIsaW5zaWRlOmUubGFuZ3VhZ2VzLmNwcH19fX0pLGUubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImNwcFwiLFwib3BlcmF0b3JcIix7XCJkb3VibGUtY29sb25cIjp7cGF0dGVybjovOjovLGFsaWFzOlwicHVuY3R1YXRpb25cIn19KSxlLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJjcHBcIixcImNsYXNzLW5hbWVcIix7XCJiYXNlLWNsYXVzZVwiOntwYXR0ZXJuOi8oXFxiKD86Y2xhc3N8c3RydWN0KVxccytcXHcrXFxzKjpcXHMqKVteO3t9XCInXFxzXSsoPzpcXHMrW147e31cIidcXHNdKykqKD89XFxzKls7e10pLyxsb29rYmVoaW5kOiEwLGdyZWVkeTohMCxpbnNpZGU6ZS5sYW5ndWFnZXMuZXh0ZW5kKFwiY3BwXCIse30pfX0pLGUubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImluc2lkZVwiLFwiZG91YmxlLWNvbG9uXCIse1wiY2xhc3MtbmFtZVwiOi9cXGJbYS16X11cXHcqXFxiKD8hXFxzKjo6KS9pfSxlLmxhbmd1YWdlcy5jcHBbXCJiYXNlLWNsYXVzZVwiXSl9KFByaXNtKTtcbiFmdW5jdGlvbihlKXt2YXIgbj0vXFxiKD86YWJzdHJhY3R8YXNzZXJ0fGJvb2xlYW58YnJlYWt8Ynl0ZXxjYXNlfGNhdGNofGNoYXJ8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkb3xkb3VibGV8ZWxzZXxlbnVtfGV4cG9ydHN8ZXh0ZW5kc3xmaW5hbHxmaW5hbGx5fGZsb2F0fGZvcnxnb3RvfGlmfGltcGxlbWVudHN8aW1wb3J0fGluc3RhbmNlb2Z8aW50fGludGVyZmFjZXxsb25nfG1vZHVsZXxuYXRpdmV8bmV3fG5vbi1zZWFsZWR8bnVsbHxvcGVufG9wZW5zfHBhY2thZ2V8cGVybWl0c3xwcml2YXRlfHByb3RlY3RlZHxwcm92aWRlc3xwdWJsaWN8cmVjb3JkKD8hXFxzKlsoKXt9W1xcXTw+PSV+LjosOz8rXFwtKi8mfF5dKXxyZXF1aXJlc3xyZXR1cm58c2VhbGVkfHNob3J0fHN0YXRpY3xzdHJpY3RmcHxzdXBlcnxzd2l0Y2h8c3luY2hyb25pemVkfHRoaXN8dGhyb3d8dGhyb3dzfHRvfHRyYW5zaWVudHx0cmFuc2l0aXZlfHRyeXx1c2VzfHZhcnx2b2lkfHZvbGF0aWxlfHdoaWxlfHdpdGh8eWllbGQpXFxiLyx0PVwiKD86W2Etel1cXFxcdypcXFxccypcXFxcLlxcXFxzKikqKD86W0EtWl1cXFxcdypcXFxccypcXFxcLlxcXFxzKikqXCIscz17cGF0dGVybjpSZWdFeHAoXCIoXnxbXlxcXFx3Ll0pXCIrdCtcIltBLVpdKD86W1xcXFxkX0EtWl0qW2Etel1cXFxcdyopP1xcXFxiXCIpLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOntuYW1lc3BhY2U6e3BhdHRlcm46L15bYS16XVxcdyooPzpcXHMqXFwuXFxzKlthLXpdXFx3KikqKD86XFxzKlxcLik/LyxpbnNpZGU6e3B1bmN0dWF0aW9uOi9cXC4vfX0scHVuY3R1YXRpb246L1xcLi99fTtlLmxhbmd1YWdlcy5qYXZhPWUubGFuZ3VhZ2VzLmV4dGVuZChcImNsaWtlXCIse3N0cmluZzp7cGF0dGVybjovKF58W15cXFxcXSlcIig/OlxcXFwufFteXCJcXFxcXFxyXFxuXSkqXCIvLGxvb2tiZWhpbmQ6ITAsZ3JlZWR5OiEwfSxcImNsYXNzLW5hbWVcIjpbcyx7cGF0dGVybjpSZWdFeHAoXCIoXnxbXlxcXFx3Ll0pXCIrdCtcIltBLVpdXFxcXHcqKD89XFxcXHMrXFxcXHcrXFxcXHMqWzssPSgpXXxcXFxccyooPzpcXFxcW1tcXFxccyxdKlxcXFxdXFxcXHMqKT86OlxcXFxzKm5ld1xcXFxiKVwiKSxsb29rYmVoaW5kOiEwLGluc2lkZTpzLmluc2lkZX0se3BhdHRlcm46UmVnRXhwKFwiKFxcXFxiKD86Y2xhc3N8ZW51bXxleHRlbmRzfGltcGxlbWVudHN8aW5zdGFuY2VvZnxpbnRlcmZhY2V8bmV3fHJlY29yZHx0aHJvd3MpXFxcXHMrKVwiK3QrXCJbQS1aXVxcXFx3KlxcXFxiXCIpLGxvb2tiZWhpbmQ6ITAsaW5zaWRlOnMuaW5zaWRlfV0sa2V5d29yZDpuLGZ1bmN0aW9uOltlLmxhbmd1YWdlcy5jbGlrZS5mdW5jdGlvbix7cGF0dGVybjovKDo6XFxzKilbYS16X11cXHcqLyxsb29rYmVoaW5kOiEwfV0sbnVtYmVyOi9cXGIwYlswMV1bMDFfXSpMP1xcYnxcXGIweCg/OlxcLltcXGRhLWZfcCstXSt8W1xcZGEtZl9dKyg/OlxcLltcXGRhLWZfcCstXSspPylcXGJ8KD86XFxiXFxkW1xcZF9dKig/OlxcLltcXGRfXSopP3xcXEJcXC5cXGRbXFxkX10qKSg/OmVbKy1dP1xcZFtcXGRfXSopP1tkZmxdPy9pLG9wZXJhdG9yOntwYXR0ZXJuOi8oXnxbXi5dKSg/Ojw8PT98Pj4+Pz0/fC0+fC0tfFxcK1xcK3wmJnxcXHxcXHx8Ojp8Wz86fl18Wy0rKi8lJnxeIT08Pl09PykvbSxsb29rYmVoaW5kOiEwfSxjb25zdGFudDovXFxiW0EtWl1bQS1aX1xcZF0rXFxiL30pLGUubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcImphdmFcIixcInN0cmluZ1wiLHtcInRyaXBsZS1xdW90ZWQtc3RyaW5nXCI6e3BhdHRlcm46L1wiXCJcIlsgXFx0XSpbXFxyXFxuXSg/Oig/OlwifFwiXCIpPyg/OlxcXFwufFteXCJcXFxcXSkpKlwiXCJcIi8sZ3JlZWR5OiEwLGFsaWFzOlwic3RyaW5nXCJ9LGNoYXI6e3BhdHRlcm46LycoPzpcXFxcLnxbXidcXFxcXFxyXFxuXSl7MSw2fScvLGdyZWVkeTohMH19KSxlLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoXCJqYXZhXCIsXCJjbGFzcy1uYW1lXCIse2Fubm90YXRpb246e3BhdHRlcm46LyhefFteLl0pQFxcdysoPzpcXHMqXFwuXFxzKlxcdyspKi8sbG9va2JlaGluZDohMCxhbGlhczpcInB1bmN0dWF0aW9uXCJ9LGdlbmVyaWNzOntwYXR0ZXJuOi88KD86W1xcd1xccywuP118Jig/ISYpfDwoPzpbXFx3XFxzLC4/XXwmKD8hJil8PCg/OltcXHdcXHMsLj9dfCYoPyEmKXw8KD86W1xcd1xccywuP118Jig/ISYpKSo+KSo+KSo+KSo+LyxpbnNpZGU6e1wiY2xhc3MtbmFtZVwiOnMsa2V5d29yZDpuLHB1bmN0dWF0aW9uOi9bPD4oKSwuOl0vLG9wZXJhdG9yOi9bPyZ8XS99fSxpbXBvcnQ6W3twYXR0ZXJuOlJlZ0V4cChcIihcXFxcYmltcG9ydFxcXFxzKylcIit0K1wiKD86W0EtWl1cXFxcdyp8XFxcXCopKD89XFxcXHMqOylcIiksbG9va2JlaGluZDohMCxpbnNpZGU6e25hbWVzcGFjZTpzLmluc2lkZS5uYW1lc3BhY2UscHVuY3R1YXRpb246L1xcLi8sb3BlcmF0b3I6L1xcKi8sXCJjbGFzcy1uYW1lXCI6L1xcdysvfX0se3BhdHRlcm46UmVnRXhwKFwiKFxcXFxiaW1wb3J0XFxcXHMrc3RhdGljXFxcXHMrKVwiK3QrXCIoPzpcXFxcdyt8XFxcXCopKD89XFxcXHMqOylcIiksbG9va2JlaGluZDohMCxhbGlhczpcInN0YXRpY1wiLGluc2lkZTp7bmFtZXNwYWNlOnMuaW5zaWRlLm5hbWVzcGFjZSxzdGF0aWM6L1xcYlxcdyskLyxwdW5jdHVhdGlvbjovXFwuLyxvcGVyYXRvcjovXFwqLyxcImNsYXNzLW5hbWVcIjovXFx3Ky99fV0sbmFtZXNwYWNlOntwYXR0ZXJuOlJlZ0V4cChcIihcXFxcYig/OmV4cG9ydHN8aW1wb3J0KD86XFxcXHMrc3RhdGljKT98bW9kdWxlfG9wZW58b3BlbnN8cGFja2FnZXxwcm92aWRlc3xyZXF1aXJlc3x0b3x0cmFuc2l0aXZlfHVzZXN8d2l0aClcXFxccyspKD8hPGtleXdvcmQ+KVthLXpdXFxcXHcqKD86XFxcXC5bYS16XVxcXFx3KikqXFxcXC4/XCIucmVwbGFjZSgvPGtleXdvcmQ+L2csKGZ1bmN0aW9uKCl7cmV0dXJuIG4uc291cmNlfSkpKSxsb29rYmVoaW5kOiEwLGluc2lkZTp7cHVuY3R1YXRpb246L1xcLi99fX0pfShQcmlzbSk7XG5QcmlzbS5sYW5ndWFnZXMucHl0aG9uPXtjb21tZW50OntwYXR0ZXJuOi8oXnxbXlxcXFxdKSMuKi8sbG9va2JlaGluZDohMCxncmVlZHk6ITB9LFwic3RyaW5nLWludGVycG9sYXRpb25cIjp7cGF0dGVybjovKD86ZnxmcnxyZikoPzooXCJcIlwifCcnJylbXFxzXFxTXSo/XFwxfChcInwnKSg/OlxcXFwufCg/IVxcMilbXlxcXFxcXHJcXG5dKSpcXDIpL2ksZ3JlZWR5OiEwLGluc2lkZTp7aW50ZXJwb2xhdGlvbjp7cGF0dGVybjovKCg/Ol58W157XSkoPzpcXHtcXHspKilcXHsoPyFcXHspKD86W157fV18XFx7KD8hXFx7KSg/Oltee31dfFxceyg/IVxceykoPzpbXnt9XSkrXFx9KStcXH0pK1xcfS8sbG9va2JlaGluZDohMCxpbnNpZGU6e1wiZm9ybWF0LXNwZWNcIjp7cGF0dGVybjovKDopW146KCl7fV0rKD89XFx9JCkvLGxvb2tiZWhpbmQ6ITB9LFwiY29udmVyc2lvbi1vcHRpb25cIjp7cGF0dGVybjovIVtzcmFdKD89Wzp9XSQpLyxhbGlhczpcInB1bmN0dWF0aW9uXCJ9LHJlc3Q6bnVsbH19LHN0cmluZzovW1xcc1xcU10rL319LFwidHJpcGxlLXF1b3RlZC1zdHJpbmdcIjp7cGF0dGVybjovKD86W3J1Yl18YnJ8cmIpPyhcIlwiXCJ8JycnKVtcXHNcXFNdKj9cXDEvaSxncmVlZHk6ITAsYWxpYXM6XCJzdHJpbmdcIn0sc3RyaW5nOntwYXR0ZXJuOi8oPzpbcnViXXxicnxyYik/KFwifCcpKD86XFxcXC58KD8hXFwxKVteXFxcXFxcclxcbl0pKlxcMS9pLGdyZWVkeTohMH0sZnVuY3Rpb246e3BhdHRlcm46LygoPzpefFxccylkZWZbIFxcdF0rKVthLXpBLVpfXVxcdyooPz1cXHMqXFwoKS9nLGxvb2tiZWhpbmQ6ITB9LFwiY2xhc3MtbmFtZVwiOntwYXR0ZXJuOi8oXFxiY2xhc3NcXHMrKVxcdysvaSxsb29rYmVoaW5kOiEwfSxkZWNvcmF0b3I6e3BhdHRlcm46LyheW1xcdCBdKilAXFx3Kyg/OlxcLlxcdyspKi9tLGxvb2tiZWhpbmQ6ITAsYWxpYXM6W1wiYW5ub3RhdGlvblwiLFwicHVuY3R1YXRpb25cIl0saW5zaWRlOntwdW5jdHVhdGlvbjovXFwuL319LGtleXdvcmQ6L1xcYig/Ol8oPz1cXHMqOil8YW5kfGFzfGFzc2VydHxhc3luY3xhd2FpdHxicmVha3xjYXNlfGNsYXNzfGNvbnRpbnVlfGRlZnxkZWx8ZWxpZnxlbHNlfGV4Y2VwdHxleGVjfGZpbmFsbHl8Zm9yfGZyb218Z2xvYmFsfGlmfGltcG9ydHxpbnxpc3xsYW1iZGF8bWF0Y2h8bm9ubG9jYWx8bm90fG9yfHBhc3N8cHJpbnR8cmFpc2V8cmV0dXJufHRyeXx3aGlsZXx3aXRofHlpZWxkKVxcYi8sYnVpbHRpbjovXFxiKD86X19pbXBvcnRfX3xhYnN8YWxsfGFueXxhcHBseXxhc2NpaXxiYXNlc3RyaW5nfGJpbnxib29sfGJ1ZmZlcnxieXRlYXJyYXl8Ynl0ZXN8Y2FsbGFibGV8Y2hyfGNsYXNzbWV0aG9kfGNtcHxjb2VyY2V8Y29tcGlsZXxjb21wbGV4fGRlbGF0dHJ8ZGljdHxkaXJ8ZGl2bW9kfGVudW1lcmF0ZXxldmFsfGV4ZWNmaWxlfGZpbGV8ZmlsdGVyfGZsb2F0fGZvcm1hdHxmcm96ZW5zZXR8Z2V0YXR0cnxnbG9iYWxzfGhhc2F0dHJ8aGFzaHxoZWxwfGhleHxpZHxpbnB1dHxpbnR8aW50ZXJufGlzaW5zdGFuY2V8aXNzdWJjbGFzc3xpdGVyfGxlbnxsaXN0fGxvY2Fsc3xsb25nfG1hcHxtYXh8bWVtb3J5dmlld3xtaW58bmV4dHxvYmplY3R8b2N0fG9wZW58b3JkfHBvd3xwcm9wZXJ0eXxyYW5nZXxyYXdfaW5wdXR8cmVkdWNlfHJlbG9hZHxyZXByfHJldmVyc2VkfHJvdW5kfHNldHxzZXRhdHRyfHNsaWNlfHNvcnRlZHxzdGF0aWNtZXRob2R8c3RyfHN1bXxzdXBlcnx0dXBsZXx0eXBlfHVuaWNocnx1bmljb2RlfHZhcnN8eHJhbmdlfHppcClcXGIvLGJvb2xlYW46L1xcYig/OkZhbHNlfE5vbmV8VHJ1ZSlcXGIvLG51bWJlcjovXFxiMCg/OmIoPzpfP1swMV0pK3xvKD86Xz9bMC03XSkrfHgoPzpfP1thLWYwLTldKSspXFxifCg/OlxcYlxcZCsoPzpfXFxkKykqKD86XFwuKD86XFxkKyg/Ol9cXGQrKSopPyk/fFxcQlxcLlxcZCsoPzpfXFxkKykqKSg/OmVbKy1dP1xcZCsoPzpfXFxkKykqKT9qPyg/IVxcdykvaSxvcGVyYXRvcjovWy0rJT1dPT98IT18Oj18XFwqXFwqPz0/fFxcL1xcLz89P3w8Wzw9Pl0/fD5bPT5dP3xbJnxefl0vLHB1bmN0dWF0aW9uOi9be31bXFxdOygpLC46XS99LFByaXNtLmxhbmd1YWdlcy5weXRob25bXCJzdHJpbmctaW50ZXJwb2xhdGlvblwiXS5pbnNpZGUuaW50ZXJwb2xhdGlvbi5pbnNpZGUucmVzdD1QcmlzbS5sYW5ndWFnZXMucHl0aG9uLFByaXNtLmxhbmd1YWdlcy5weT1QcmlzbS5sYW5ndWFnZXMucHl0aG9uO1xuIWZ1bmN0aW9uKGUpe2Zvcih2YXIgYT1cIi9cXFxcKig/OlteKi9dfFxcXFwqKD8hLyl8Lyg/IVxcXFwqKXw8c2VsZj4pKlxcXFwqL1wiLHQ9MDt0PDI7dCsrKWE9YS5yZXBsYWNlKC88c2VsZj4vZywoZnVuY3Rpb24oKXtyZXR1cm4gYX0pKTthPWEucmVwbGFjZSgvPHNlbGY+L2csKGZ1bmN0aW9uKCl7cmV0dXJuXCJbXlxcXFxzXFxcXFNdXCJ9KSksZS5sYW5ndWFnZXMucnVzdD17Y29tbWVudDpbe3BhdHRlcm46UmVnRXhwKFwiKF58W15cXFxcXFxcXF0pXCIrYSksbG9va2JlaGluZDohMCxncmVlZHk6ITB9LHtwYXR0ZXJuOi8oXnxbXlxcXFw6XSlcXC9cXC8uKi8sbG9va2JlaGluZDohMCxncmVlZHk6ITB9XSxzdHJpbmc6e3BhdHRlcm46L2I/XCIoPzpcXFxcW1xcc1xcU118W15cXFxcXCJdKSpcInxiP3IoIyopXCIoPzpbXlwiXXxcIig/IVxcMSkpKlwiXFwxLyxncmVlZHk6ITB9LGNoYXI6e3BhdHRlcm46L2I/Jyg/OlxcXFwoPzp4WzAtN11bXFxkYS1mQS1GXXx1XFx7KD86W1xcZGEtZkEtRl1fKil7MSw2fVxcfXwuKXxbXlxcXFxcXHJcXG5cXHQnXSknLyxncmVlZHk6ITB9LGF0dHJpYnV0ZTp7cGF0dGVybjovIyE/XFxbKD86W15cXFtcXF1cIl18XCIoPzpcXFxcW1xcc1xcU118W15cXFxcXCJdKSpcIikqXFxdLyxncmVlZHk6ITAsYWxpYXM6XCJhdHRyLW5hbWVcIixpbnNpZGU6e3N0cmluZzpudWxsfX0sXCJjbG9zdXJlLXBhcmFtc1wiOntwYXR0ZXJuOi8oWz0oLDpdXFxzKnxcXGJtb3ZlXFxzKilcXHxbXnxdKlxcfHxcXHxbXnxdKlxcfCg/PVxccyooPzpcXHt8LT4pKS8sbG9va2JlaGluZDohMCxncmVlZHk6ITAsaW5zaWRlOntcImNsb3N1cmUtcHVuY3R1YXRpb25cIjp7cGF0dGVybjovXlxcfHxcXHwkLyxhbGlhczpcInB1bmN0dWF0aW9uXCJ9LHJlc3Q6bnVsbH19LFwibGlmZXRpbWUtYW5ub3RhdGlvblwiOntwYXR0ZXJuOi8nXFx3Ky8sYWxpYXM6XCJzeW1ib2xcIn0sXCJmcmFnbWVudC1zcGVjaWZpZXJcIjp7cGF0dGVybjovKFxcJFxcdys6KVthLXpdKy8sbG9va2JlaGluZDohMCxhbGlhczpcInB1bmN0dWF0aW9uXCJ9LHZhcmlhYmxlOi9cXCRcXHcrLyxcImZ1bmN0aW9uLWRlZmluaXRpb25cIjp7cGF0dGVybjovKFxcYmZuXFxzKylcXHcrLyxsb29rYmVoaW5kOiEwLGFsaWFzOlwiZnVuY3Rpb25cIn0sXCJ0eXBlLWRlZmluaXRpb25cIjp7cGF0dGVybjovKFxcYig/OmVudW18c3RydWN0fHRyYWl0fHR5cGV8dW5pb24pXFxzKylcXHcrLyxsb29rYmVoaW5kOiEwLGFsaWFzOlwiY2xhc3MtbmFtZVwifSxcIm1vZHVsZS1kZWNsYXJhdGlvblwiOlt7cGF0dGVybjovKFxcYig/OmNyYXRlfG1vZClcXHMrKVthLXpdW2Etel9cXGRdKi8sbG9va2JlaGluZDohMCxhbGlhczpcIm5hbWVzcGFjZVwifSx7cGF0dGVybjovKFxcYig/OmNyYXRlfHNlbGZ8c3VwZXIpXFxzKik6OlxccypbYS16XVthLXpfXFxkXSpcXGIoPzpcXHMqOjooPzpcXHMqW2Etel1bYS16X1xcZF0qXFxzKjo6KSopPy8sbG9va2JlaGluZDohMCxhbGlhczpcIm5hbWVzcGFjZVwiLGluc2lkZTp7cHVuY3R1YXRpb246Lzo6L319XSxrZXl3b3JkOlsvXFxiKD86U2VsZnxhYnN0cmFjdHxhc3xhc3luY3xhd2FpdHxiZWNvbWV8Ym94fGJyZWFrfGNvbnN0fGNvbnRpbnVlfGNyYXRlfGRvfGR5bnxlbHNlfGVudW18ZXh0ZXJufGZpbmFsfGZufGZvcnxpZnxpbXBsfGlufGxldHxsb29wfG1hY3JvfG1hdGNofG1vZHxtb3ZlfG11dHxvdmVycmlkZXxwcml2fHB1YnxyZWZ8cmV0dXJufHNlbGZ8c3RhdGljfHN0cnVjdHxzdXBlcnx0cmFpdHx0cnl8dHlwZXx0eXBlb2Z8dW5pb258dW5zYWZlfHVuc2l6ZWR8dXNlfHZpcnR1YWx8d2hlcmV8d2hpbGV8eWllbGQpXFxiLywvXFxiKD86Ym9vbHxjaGFyfGYoPzozMnw2NCl8W3VpXSg/Ojh8MTZ8MzJ8NjR8MTI4fHNpemUpfHN0cilcXGIvXSxmdW5jdGlvbjovXFxiW2Etel9dXFx3Kig/PVxccyooPzo6Olxccyo8fFxcKCkpLyxtYWNybzp7cGF0dGVybjovXFxiXFx3KyEvLGFsaWFzOlwicHJvcGVydHlcIn0sY29uc3RhbnQ6L1xcYltBLVpfXVtBLVpfXFxkXStcXGIvLFwiY2xhc3MtbmFtZVwiOi9cXGJbQS1aXVxcdypcXGIvLG5hbWVzcGFjZTp7cGF0dGVybjovKD86XFxiW2Etel1bYS16X1xcZF0qXFxzKjo6XFxzKikqXFxiW2Etel1bYS16X1xcZF0qXFxzKjo6KD8hXFxzKjwpLyxpbnNpZGU6e3B1bmN0dWF0aW9uOi86Oi99fSxudW1iZXI6L1xcYig/OjB4W1xcZEEtRmEtZl0oPzpfP1tcXGRBLUZhLWZdKSp8MG9bMC03XSg/Ol8/WzAtN10pKnwwYlswMV0oPzpfP1swMV0pKnwoPzooPzpcXGQoPzpfP1xcZCkqKT9cXC4pP1xcZCg/Ol8/XFxkKSooPzpbRWVdWystXT9cXGQrKT8pKD86Xz8oPzpmMzJ8ZjY0fFtpdV0oPzo4fDE2fDMyfDY0fHNpemUpPykpP1xcYi8sYm9vbGVhbjovXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLHB1bmN0dWF0aW9uOi8tPnxcXC5cXC49fFxcLnsxLDN9fDo6fFt7fVtcXF07KCksOl0vLG9wZXJhdG9yOi9bLSsqXFwvJSFeXT0/fD1bPT5dP3wmWyY9XT98XFx8W3w9XT98PDw/PT98Pj4/PT98W0A/XS99LGUubGFuZ3VhZ2VzLnJ1c3RbXCJjbG9zdXJlLXBhcmFtc1wiXS5pbnNpZGUucmVzdD1lLmxhbmd1YWdlcy5ydXN0LGUubGFuZ3VhZ2VzLnJ1c3QuYXR0cmlidXRlLmluc2lkZS5zdHJpbmc9ZS5sYW5ndWFnZXMucnVzdC5zdHJpbmd9KFByaXNtKTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWxleGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0KGVsdCwgaHR0cCkge1xuXHRcdGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSlcblxuXHRcdC8vY29uc29sZS5sb2coJ2hhc2gnLCBoYXNoKVxuXHRcdGNvbnN0IHBhcmFtcyA9ICQkLnVybC5wYXJzZVVybFBhcmFtcyhoYXNoKVxuXHRcdC8vY29uc29sZS5sb2coJ3BhcmFtcycsIHBhcmFtcylcblx0XHRodHRwLnBvc3QoJy9hcGkvYWxleGEvYXV0aCcsIHBhcmFtcykudGhlbigoKSA9PiB7XG5cdFx0XHR3aW5kb3cuY2xvc2UoKVxuXHRcdH0pXG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcFRhYicsIHtcblxuXHRwcm9wczoge1xuXHRcdGFwcFVybDogJ2Fib3V0OmJsYW5rJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxpZnJhbWUgYm4tYXR0cj1cXFwie3NyYzogYXBwVXJsfVxcXCIgYm4tYmluZD1cXFwiaWZyYW1lXFxcIiBibi1ldmVudD1cXFwibG9hZDogb25GcmFtZUxvYWRlZFxcXCI+PC9pZnJhbWU+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cdFx0Y29uc3Qge2FwcFVybH0gPSB0aGlzLnByb3BzO1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBVcmxcdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZyYW1lTG9hZGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkZyYW1lTG9hZGVkJylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQXBwRXhpdCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwRXhpdCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcEV4aXQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gcm9vdFBhZ2Uub25BcHBFeGl0KClcblx0XHRcdH1cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVx0XHRcblx0XHR9XHRcblxuXHRcdHRoaXMub25BcHBTdXNwZW5kID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBTdXNwZW5kJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwU3VzcGVuZCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFwcFJlc3VtZSA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwUmVzdW1lJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwUmVzdW1lID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cm9vdFBhZ2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QXBwVXJsID0gZnVuY3Rpb24oYXBwVXJsKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBzZXRBcHBVcmwnLCBhcHBVcmwpXG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcFVybDogYXBwVXJsICsgJyZkYXRlPScgKyBEYXRlLm5vdygpfSlcblx0XHR9XG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBzOiBbXSxcblx0XHRzaG93QWN0aXZhdGVkOiBmYWxzZSxcblx0XHRpdGVtczogbnVsbFxuXHR9LFxuXG5cdCRpZmFjZTogJ3NldERhdGEoZGF0YSknLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYXBwc1xcXCIgXFxuXHRcdGJuLWl0ZXI9XFxcImFwcFxcXCIgXFxuXHRcdGNsYXNzPVxcXCJtYWluXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aWxlOiBvblRpbGVDb250ZXh0TWVudVxcXCJcXG5cdFx0Plx0XHRcdFxcblx0XHQ8ZGl2IGJuLWF0dHI9XFxcImNsYXNzMVxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZXRJdGVtc31cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImFycm93LXJpZ2h0XFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuYXBwLnByb3BzLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1pZj1cXFwic2hvdzNcXFwiPlxcblx0XHRcdFx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiBnZXRJY29uVXJsfVxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLmFwcC5wcm9wcy50aXRsZVxcXCIgYm4tc2hvdz1cXFwiIXNob3czXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblxcblx0PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG5cdFx0Y29uc3QgeyBhcHBzLCBzaG93QWN0aXZhdGVkLCBpdGVtcyB9ID0gdGhpcy5wcm9wc1xuXHRcdGNvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Z2V0SXRlbXM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2dldEl0ZW1zJywgc2NvcGUuYXBwKVxuXHRcdFx0XHRcdHJldHVybiAodHlwZW9mIGl0ZW1zID09ICdmdW5jdGlvbicpID8gaXRlbXMoc2NvcGUuYXBwKSA6IGl0ZW1zXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFwcHMsXG5cdFx0XHRcdHNob3dBY3RpdmF0ZWQsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zaG93QWN0aXZhdGVkICYmIHNjb3BlLmFwcC5hY3RpdmF0ZWRcblx0XHRcdFx0fSxcblx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCB7dGl0bGUsIGNvbG9yQ2xzfSA9IHNjb3BlLmFwcC5wcm9wc1xuXHRcdFx0XHRcdGNvbnN0IHJldCA9IHtcblx0XHRcdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRcdFx0Y2xhc3M6ICd0aWxlIHczLWJ0bidcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY29sb3JDbHMuc3RhcnRzV2l0aCgnIycpKSB7XG5cdFx0XHRcdFx0XHRyZXQuc3R5bGUgPSBgYmFja2dyb3VuZC1jb2xvcjogJHtjb2xvckNsc31gXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0LmNsYXNzICs9ICcgJyArIGNvbG9yQ2xzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiByZXRcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0eXBlb2Ygc2NvcGUuYXBwLnByb3BzLmljb25DbHMgPT0gJ3N0cmluZydcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB0eXBlb2Ygc2NvcGUuYXBwLnByb3BzLmljb25VcmwgPT0gJ3N0cmluZydcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0SWNvblVybChzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IHsgYXBwTmFtZSwgcHJvcHMgfSA9IHNjb3BlLmFwcFxuXHRcdFx0XHRcdHJldHVybiBgL3dlYmFwcHMvJHthcHBOYW1lfS9hc3NldHMvJHtwcm9wcy5pY29uVXJsfWBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRpbGVDbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY2xpY2snLCBjdHJsLm1vZGVsLmFwcHNbaWR4XSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UaWxlQ29udGV4dE1lbnU6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGlsZUNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7IGNtZCB9ID0gZGF0YVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSAkLmV4dGVuZCh7IGNtZCB9LCBjdHJsLm1vZGVsLmFwcHNbaWR4XSlcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY29udGV4dG1lbnUnLCBpbmZvKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdGFwcHM6IGRhdGEuYXBwcy5maWx0ZXIoKGEpID0+IGEucHJvcHMudmlzaWJsZSAhPSBmYWxzZSAmJiBhLmFwcE5hbWUgIT0gJ3RlbXBsYXRlJylcblx0XHRcdH0pXG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgc2V0RGF0YShkYXRhKWAsXG5cdCRldmVudHM6ICdhcHBjbGljazthcHBjb250ZXh0bWVudSdcbn0pO1xuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFkZENvbnRhY3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1mb3JtPVxcXCJpbmZvXFxcIj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5hY2NvcmRpb25cXFwiIGRhdGEtaGVpZ2h0LXN0eWxlPVxcXCJmaWxsXFxcIj5cXG5cXG5cXG5cdFx0PGRpdiB0aXRsZT1cXFwiTmFtZSAmIEVtYWlsXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJnZW5kZXJcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkdlbmRlcjo8L2xhYmVsPlxcblx0XHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnJhZGlvZ3JvdXBcXFwiIG5hbWU9XFxcImdlbmRlclxcXCI+XFxuXHRcdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJtYWxlXFxcIj5cXG5cdFx0XHRcdFx0XHQ8bGFiZWw+TWFsZTwvbGFiZWw+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHRcdFx0PGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiB2YWx1ZT1cXFwiZmVtYWxlXFxcIj5cXG5cdFx0XHRcdFx0XHQ8bGFiZWw+RmVtYWxlPC9sYWJlbD5cXG5cdFx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5OYW1lOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkVtYWlsOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgdGl0bGU9XFxcIkJpcnRoZGF5XFxcIj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+QmlydGhkYXk8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmRhdGVwaWNrZXJcXFwiIFxcblx0XHRcdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHRcdFx0Y2hhbmdlWWVhcjogdHJ1ZSxcXG5cdFx0XHRcdFx0XHR5ZWFyUmFuZ2U6IFxcJy0xMDA6KzBcXCdcXG5cdFx0XHRcdFx0fVxcXCJcXG5cdFx0XHRcdFx0bmFtZT1cXFwiYmlydGhkYXlcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiYmlydGhOb3RpZlxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+QWN0aXZhdGUgYmlydGhkYXkgTm90aWZpY2F0aW9uPC9sYWJlbD5cXG5cdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5mbGlwc3dpdGNoXFxcIiBuYW1lPVxcXCJiaXJ0aGRheU5vdGlmXFxcIj48L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgdGl0bGU9XFxcIlBob25lc1xcXCI+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkhvbWUgUGhvbmU6PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgbmFtZT1cXFwicGhvbmVcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRwaG9uZVxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkNlbGwgUGhvbmU6PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgbmFtZT1cXFwibW9iaWxlUGhvbmVcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRwaG9uZVxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgdGl0bGU9XFxcIkFkZHJlc3NcXFwiPlxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5BZGRyZXNzOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcImFkZHJlc3NcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPlBvc3RhbCBDb2RlOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgbmFtZT1cXFwicG9zdGFsQ29kZVxcXCIgbWF4bGVuZ3RoPVxcXCI1XFxcIiBibi1ldmVudD1cXFwiYmx1cjogb25Qb3N0YWxDb2RlTG9zdEZvY3VzXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXY+XFxuXHRcdFx0XHQ8bGFiZWw+Q2l0eTo8L2xhYmVsPlxcblx0XHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGNpdGllc31cXFwiIG5hbWU9XFxcImNpdHlcXFwiIGJuLXZhbD1cXFwiY2l0eVxcXCI+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiPlxcbjwvZm9ybT5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LmNvbnRhY3RzJywgJ2JyZWl6Ym90LmNpdGllcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZGF0YToge31cblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Db250YWN0LkludGVyZmFjZX0gY29udGFjdHNTcnYgXG5cdCBcdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlciwgY29udGFjdHNTcnYsIGNpdGllc1Nydikge1xuXG5cdFx0Y29uc3QgaW5mbyA9IHRoaXMucHJvcHMuaW5mbyB8fCB7fVxuXHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdGNvbnN0IGlkID0gaW5mby5faWRcblx0XHRjb25zdCB7IHBvc3RhbENvZGUsIGNpdHkgfSA9IGluZm9cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aW5mbyxcblx0XHRcdFx0Y2l0aWVzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKHsgaWQsIGRhdGEgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblBvc3RhbENvZGVMb3N0Rm9jdXM6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBvc3RhbENvZGVMb3N0Rm9jdXMnLCB0aGlzLnZhbHVlKVxuXHRcdFx0XHRcdGNvbnN0IGNpdGllcyA9IGF3YWl0IGNpdGllc1Nydi5nZXRDaXRlc0Zyb21Qb3N0YWxDb2RlKHRoaXMudmFsdWUpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY2l0aWVzIH0pXG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XG5cdFx0XHRjb25zdCBjaXRpZXMgPSBhd2FpdCBjaXRpZXNTcnYuZ2V0Q2l0ZXNGcm9tUG9zdGFsQ29kZShwb3N0YWxDb2RlKVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgY2l0aWVzIH0pXG5cdFx0XHRpZiAoY2l0eSAmJiBjaXR5ICE9ICcnKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGNpdHkgfSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAocG9zdGFsQ29kZSAmJiBwb3N0YWxDb2RlICE9ICcnKSB7XG5cdFx0XHRsb2FkKClcblx0XHR9XG5cblxuXHRcdHRoaXMuYWRkQ29udGFjdCA9IGFzeW5jIGZ1bmN0aW9uIChpbmZvKSB7XG5cdFx0XHRhd2FpdCBjb250YWN0c1Nydi5hZGRDb250YWN0KGluZm8pXG5cdFx0fVxuXG5cdFx0dGhpcy51cGRhdGVDb250YWN0SW5mbyA9IGFzeW5jIGZ1bmN0aW9uIChpZCwgaW5mbykge1xuXHRcdFx0YXdhaXQgY29udGFjdHNTcnYudXBkYXRlQ29udGFjdEluZm8oaWQsIGluZm8pXG5cdFx0fVxuXG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhZGQ6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0FwcGx5Jyxcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtY2hlY2snLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuY29udGFjdHMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5jb250YWN0cyddLFxuXG5cdHByb3BzOiB7XG5cdFx0c2hvd1NlbGVjdGlvbjogZmFsc2UsXG5cdFx0aGFzU2VhcmNoYmFyOiBmYWxzZSxcblx0XHRjb250ZXh0TWVudToge31cblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnNlYXJjaGJhclxcXCIgXFxuXHRibi1ldmVudD1cXFwic2VhcmNoYmFyc3VibWl0OiBvblNlYXJjaFxcXCIgXFxuXHRibi1zaG93PVxcXCJoYXNTZWFyY2hiYXJcXFwiXFxuXHRibi1kYXRhPVxcXCJ7cmVxdWlyZWQ6IGZhbHNlfVxcXCJcXG5cdD48L2Rpdj5cXG48cCBibi1zaG93PVxcXCJzaG93MlxcXCI+WW91IGhhdmUgbm8gY29udGFjdHM8L3A+XFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2UudzMtYmFyOiBvbkl0ZW1Db250ZXh0TWVudSwgY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGljaywgY2xpY2suaW5wdXQ6IG9uSW5wdXRDbGlja1xcXCJcXG5cdFx0Ym4tZWFjaD1cXFwiZ2V0Q29udGFjdHNcXFwiXFxuXHRcdGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0XHQ+XFxuXHRcdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGNvbnRleHRNZW51fVxcXCI+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiID5cXG5cdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvc3Ryb25nPjxicj5cXG5cdFx0XHRcdDxkaXYgYm4tdGV4dD1cXFwiZ2V0QWRkcmVzc1xcXCI+PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcIiRzY29wZS4kaS5lbWFpbFxcXCI+XFxuXHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1lbnZlbG9wZSB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmVtYWlsXFxcIj48L3NwYW4+XHRcXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCIkc2NvcGUuJGkubW9iaWxlUGhvbmVcXFwiPlxcblx0XHRcdFx0XHQ8YSBibi1hdHRyPVxcXCJ7aHJlZiA6IGdldENlbGxQaG9uZX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1tb2JpbGUtYWx0IHczLXRleHQtYmx1ZVxcXCI+PC9pPjwvYT5cXG5cdFx0XHRcdFx0PGlucHV0IGNsYXNzPVxcXCJpbnB1dFxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dHBob25lXFxcIiBibi12YWw9XFxcIiRzY29wZS4kaS5tb2JpbGVQaG9uZVxcXCIgcmVhZG9ubHk+XHRcXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCIkc2NvcGUuJGkucGhvbmVcXFwiPlxcblx0XHRcdFx0XHQ8YSBibi1hdHRyPVxcXCJ7aHJlZiA6IGdldEhvbWVQaG9uZX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIHczLXRleHQtYmx1ZVxcXCI+PC9pPjwvYT5cXG5cdFx0XHRcdFx0PGlucHV0IGNsYXNzPVxcXCJpbnB1dFxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dHBob25lXFxcIiBibi12YWw9XFxcIiRzY29wZS4kaS5waG9uZVxcXCIgcmVhZG9ubHk+XHRcXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2xpPlxcblx0PC91bD5cdFx0XFxuXFxuPC9kaXY+XFxuXCIsXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkNvbnRhY3QuSW50ZXJmYWNlfSBjb250YWN0c1NydiBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIGNvbnRhY3RzU3J2KSB7XG5cblx0XHQvL0B0cy1pZ25vcmVcblx0XHRjb25zdCB7IHNob3dTZWxlY3Rpb24sIGNvbnRleHRNZW51LCBoYXNTZWFyY2hiYXIgfSA9IHRoaXMucHJvcHNcblx0XHQvL2NvbnNvbGUubG9nKCdwcm9wcycsIHRoaXMucHJvcHMpXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y29udGFjdHM6IFtdLFxuXHRcdFx0XHRzaG93U2VsZWN0aW9uLFxuXHRcdFx0XHRoYXNTZWFyY2hiYXIsXG5cdFx0XHRcdGZpbHRlcjogJycsXG5cdFx0XHRcdGNvbnRleHRNZW51LFxuXHRcdFx0XHRnZXRDb250YWN0czogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuZmlsdGVyICE9ICcnKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdPSycsIHRoaXMuZmlsdGVyKVxuXHRcdFx0XHRcdFx0Y29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBcXHcqJHt0aGlzLmZpbHRlcn1cXHcqYCwgJ2knKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMuZmlsdGVyKChjKSA9PiByZWdleC50ZXN0KGMubmFtZSkpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGlzLnNob3dTZWxlY3Rpb24pIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmZpbHRlcigoYykgPT4gYy5lbWFpbCAmJiBjLmVtYWlsICE9ICcnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0c1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5sZW5ndGggPT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRDZWxsUGhvbmU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuICd0ZWw6JyArIHNjb3BlLiRpLm1vYmlsZVBob25lXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEhvbWVQaG9uZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gJ3RlbDonICsgc2NvcGUuJGkucGhvbmVcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0QWRkcmVzczogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCB7YWRkcmVzcywgY2l0eSwgcG9zdGFsQ29kZX0gPSBzY29wZS4kaVxuXHRcdFx0XHRcdHJldHVybiBgJHthZGRyZXNzIHx8ICcnfSAke3Bvc3RhbENvZGUgfHwgJyd9ICR7Y2l0eSB8fCAnJ31gXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TZWFyY2g6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZWFyY2gnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZmlsdGVyOiBkYXRhLnZhbHVlfSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbklucHV0Q2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSW5wdXRDbGljaycpXG5cdFx0XHRcdFx0JCh0aGlzKS5jbG9zZXN0KCdkaXYnKS5maW5kKCdhJykuZ2V0KDApLmNsaWNrKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JdGVtQ29udGV4dE1lbnU6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7IGNtZCB9ID0gZGF0YVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldENvbnRhY3RzKClbaWR4XVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgaW5mbylcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignY29udGFjdGNvbnRleHRtZW51JywgeyBjbWQsIGluZm8gfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKHNob3dTZWxlY3Rpb24pIHtcblx0XHRcdFx0XHRcdC8vJCh0aGlzKS5zaWJsaW5ncygnLnczLWJsdWUnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0XHQkKHRoaXMpLnRvZ2dsZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBsb2FkKCkge1xuXHRcdFx0Y29uc3QgY29udGFjdHMgPSBhd2FpdCBjb250YWN0c1Nydi5nZXRDb250YWN0cygpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdjb250YWN0cycsIGNvbnRhY3RzKVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgY29udGFjdHMgfSlcblx0XHR9XG5cblxuXHRcdGxvYWQoKVxuXG5cdFx0dGhpcy51cGRhdGUgPSBsb2FkXG5cblx0XHR0aGlzLnJlbW92ZUNvbnRhY3QgPSBhc3luYyBmdW5jdGlvbihpZCkge1xuXHRcdFx0YXdhaXQgY29udGFjdHNTcnYucmVtb3ZlQ29udGFjdChpZClcblx0XHRcdGF3YWl0IGxvYWQoKVxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0gW11cblx0XHRcdGVsdC5maW5kKCdsaS53My1ibHVlJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRyZXQucHVzaChjdHJsLm1vZGVsLmdldENvbnRhY3RzKClbaWR4XSlcblx0XHRcdH0pXG5cdFx0XHRjb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHR9LFxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTogW0NvbnRhY3RJbmZvXVxuXHRcdHJlbW92ZUNvbnRhY3QoaWQpXG5cdGAsXG5cdCRldmVudHM6ICdjb250YWN0Y2xpY2snXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5odG1sZWRpdG9yJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tZXZlbnQ9XFxcImNsaWNrLmNtZDogb25Db21tYW5kXFxcIiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcImNtZCB3My1idXR0b25cXFwiICBcXG5cdFx0XHRibi1pY29uPVxcXCJmYXMgZmEtbWljcm9waG9uZVxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlRvb2dsZSBNaWNyb1xcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblRvb2dsZU1pY3JvXFxcIiBcXG5cdFx0XHRibi1zaG93PVxcXCJzcGVlY2hSZWNvQXZhaWxhYmxlXFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwiY21kIHczLWJ1dHRvblxcXCIgIGJuLWljb249XFxcImZhcyBmYS1yZW1vdmUtZm9ybWF0XFxcIiB0aXRsZT1cXFwiUmVtb3ZlIEZvcm1hdFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblJlbW92ZUZvcm1hdFxcXCI+PC9idXR0b24+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJjbWQgdzMtYnV0dG9uXFxcIiBkYXRhLWNtZD1cXFwiYm9sZFxcXCIgdGl0bGU9XFxcIkJvbGRcXFwiIGJuLWljb249XFxcImZhIGZhLWJvbGRcXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJjbWQgdzMtYnV0dG9uXFxcIiBkYXRhLWNtZD1cXFwiaXRhbGljXFxcIiB0aXRsZT1cXFwiSXRhbGljXFxcIiBibi1pY29uPVxcXCJmYSBmYS1pdGFsaWNcXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJjbWQgdzMtYnV0dG9uXFxcIiBkYXRhLWNtZD1cXFwidW5kZXJsaW5lXFxcIiB0aXRsZT1cXFwiVW5kZXJsaW5lXFxcIiBibi1pY29uPVxcXCJmYSBmYS11bmRlcmxpbmVcXFwiPjwvYnV0dG9uPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uRm9udE5hbWVDaGFuZ2VcXFwiXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiXFxuXHRcdFx0dGl0bGU9XFxcIkZvbnQgTmFtZVxcXCIgXFxuXHRcdFx0Ym4taHRtbD1cXFwiZ2V0Rm9udE5hbWVcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczogZm9udE5hbWVJdGVtc1xcblx0XHRcdH1cXFwiPlxcblxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uRm9udFNpemVDaGFuZ2VcXFwiXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiXFxuXHRcdFx0dGl0bGU9XFxcIkZvbnQgU2l6ZVxcXCIgYm4taHRtbD1cXFwiZ2V0Rm9udFNpemVcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczogZm9udFNpemVJdGVtc1xcblx0XHRcdH1cXFwiPlxcblxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29tbWFuZFxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlRpdGxlXFxcIlxcblx0XHRcdGJuLWljb249XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIlxcblx0XHRcdGRhdGEtY21kPVxcXCJmb3JtYXRCbG9ja1xcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiBoZWFkaW5nSXRlbXNcXG5cdFx0XHR9XFxcIj5cXG5cdFx0XHTCpyZuYnNwO1xcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQWxpZ25tZW50XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db21tYW5kXFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0anVzdGlmeUxlZnQ6IHtuYW1lOiBcXCdMZWZ0XFwnLCBpY29uOiBcXCdmYXMgZmEtYWxpZ24tbGVmdFxcJ30sXFxuXHRcdFx0XHRcdGp1c3RpZnlDZW50ZXI6IHtuYW1lOiBcXCdDZW50ZXJcXCcsIGljb246IFxcJ2ZhcyBmYS1hbGlnbi1jZW50ZXJcXCd9LFxcblx0XHRcdFx0XHRqdXN0aWZ5UmlnaHQ6IHtuYW1lOiBcXCdSaWdodFxcJywgaWNvbjogXFwnZmFzIGZhLWFsaWduLXJpZ2h0XFwnfVxcblx0XHRcdFx0fVxcblx0XHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtYWxpZ24tbGVmdFxcXCI+PC9pPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiVGV4dCBjb2xvclxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0aXRlbXM6IGNvbG9ySXRlbXMsXFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnXFxuXHRcdFx0fVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbG9yTWVudUNoYW5nZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1wYWludC1icnVzaFxcXCIgYm4tc3R5bGU9XFxcIntjb2xvcn1cXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJJbmRlbnRcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29tbWFuZFxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRcdGluZGVudDoge25hbWU6IFxcJ0luZGVudFxcJywgaWNvbjogXFwnZmFzIGZhLWluZGVudFxcJ30sXFxuXHRcdFx0XHRcdFx0b3V0ZGVudDoge25hbWU6IFxcJ091dGRlbnRcXCcsIGljb246IFxcJ2ZhcyBmYS1vdXRkZW50XFwnfVxcblx0XHRcdFx0XHR9XFxuXHRcdFx0XHR9XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWluZGVudFxcXCI+PC9pPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiTGlzdFxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbW1hbmRcXFwiXFxuXHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0dHJpZ2dlcjogXFwnbGVmdFxcJyxcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdGluc2VydFVub3JkZXJlZExpc3Q6IHtuYW1lOiBcXCdVbm9yZGVyZWRcXCcsIGljb246IFxcJ2ZhcyBmYS1saXN0LXVsXFwnfSxcXG5cdFx0XHRcdFx0aW5zZXJ0T3JkZXJlZExpc3Q6IHtuYW1lOiBcXCdPcmRlcmVkXFwnLCBpY29uOiBcXCdmYXMgZmEtbGlzdC1vbFxcJ31cXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWxpc3Qtb2xcXFwiPjwvaT5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gY21kXFxcIiB0aXRsZT1cXFwiSG9yaXpvbnRhbCBSdWxlXFxcIiBkYXRhLWNtZD1cXFwiaW5zZXJ0SG9yaXpvbnRhbFJ1bGVcXFwiYm4taWNvbj1cXFwiZmFzIGZhLW1pbnVzXFxcIj48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiSW5zZXJ0IExpbmtcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVMaW5rXFxcIiBibi1pY29uPVxcXCJmYXMgZmEtbGlua1xcXCI+PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJJbnNlcnQgaW1hZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25JbnNlcnRJbWFnZVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgYm4taWNvbj1cXFwiZmEgZmEtaW1hZ2VcXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJJbnNlcnQgVGFibGUgZnJvbSBzZWxlY3Rpb25cXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkluc2VydFRhYmxlXFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdFx0Y29udmVydFRvVGFibGU6IHtuYW1lOiBcXCdDb252ZXJ0IHRvIHRhYmxlXFwnfSxcXG5cdFx0XHRcdFx0Y29udmVydFRvTGlzdDoge25hbWU6IFxcJ0NvbnZlcnQgdG8gbGlzdFxcJ30sXFxuXHRcdFx0XHRcdGFkZFJvdzoge25hbWU6IFxcJ0FkZCByb3dcXCd9LFxcblx0XHRcdFx0XHRhZGRDb2w6IHtuYW1lOiBcXCdBZGQgQ29sdW1uXFwnfVxcblx0XHRcdFx0fVxcblxcblx0XHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEgZmEtdGhcXFwiPjwvaT5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5cXG5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJib3R0b21cXFwiPlxcblx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiBnZXRNaWNVcmx9XFxcIiBjbGFzcz1cXFwibWljcm9cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25NaWNyb1xcXCIgYm4tc2hvdz1cXFwiaXNNaWNyb1Zpc2libGVcXFwiIHRpdGxlPVxcXCJTcGVlY2ggUmVjb2duaXRpb25cXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TY3JvbGxDbGlja1xcXCI+XFxuXHRcdDxkaXYgY29udGVudGVkaXRhYmxlPVxcXCJ0cnVlXFxcIiBibi1iaW5kPVxcXCJlZGl0b3JcXFwiIGNsYXNzPVxcXCJlZGl0b3JcXFwiIGJuLWh0bWw9XFxcImh0bWxcXFwiPjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlRGF0YVVybEZvckltZzogZmFsc2Vcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7Kn0gZWx0IFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlcyBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBmaWxlcykge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Y29uc3QgeyB1c2VEYXRhVXJsRm9ySW1nIH0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc29sZS5sb2coJ3VzZURhdGFVcmxGb3JJbWcnLCB1c2VEYXRhVXJsRm9ySW1nKVxuXG5cdFx0Y29uc3QgY29sb3JNYXAgPSB7XG5cdFx0XHRibGFjazogJyMwMDAwMDAnLFxuXHRcdFx0cmVkOiAnI2Y0NDMzNicsXG5cdFx0XHRncmVlbjogJyM0Q0FGNTAnLFxuXHRcdFx0Ymx1ZTogJyMyMTk2RjMnLFxuXHRcdFx0eWVsbG93OiAnI2ZmZWIzYicsXG5cdFx0XHRjeWFuOiAnIzAwYmNkNCcsXG5cdFx0XHRwaW5rOiAnI2U5MWU2MydcblxuXHRcdH1cblxuXHRcdGNvbnN0IGZvbnRTaXplcyA9ICc4LDEwLDEyLDE0LDE4LDI0LDM2Jy5zcGxpdCgnLCcpXG5cdFx0Y29uc3QgZm9udE5hbWVzID0gW1wiQXJpYWxcIiwgXCJDb3VyaWVyIE5ld1wiLCBcIlRpbWVzIE5ldyBSb21hblwiXVxuXG5cdFx0ZnVuY3Rpb24gZ2V0SGVhZGluZ0l0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge1xuXHRcdFx0XHRwOiB7IG5hbWU6ICdOb3JtYWwnIH1cblx0XHRcdH1cblx0XHRcdGZvciAobGV0IGkgPSAxOyBpIDw9IDY7IGkrKykge1xuXHRcdFx0XHRyZXRbJ2gnICsgaV0gPSB7IG5hbWU6IGA8aCR7aX0+SGVhZGluZyAke2l9PC9oJHtpfT5gLCBpc0h0bWxOYW1lOiB0cnVlIH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRGb250U2l6ZUl0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge31cblx0XHRcdGZvbnRTaXplcy5mb3JFYWNoKChpLCBpZHgpID0+IHtcblx0XHRcdFx0cmV0W2lkeCArIDFdID0geyBuYW1lOiBgPGZvbnQgc2l6ZT1cIiR7aWR4ICsgMX1cIj4ke2l9IHB0PC9mb250PmAsIGlzSHRtbE5hbWU6IHRydWUgfVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRGb250TmFtZUl0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge31cblx0XHRcdGZvbnROYW1lcy5mb3JFYWNoKChpKSA9PiB7XG5cdFx0XHRcdHJldFtpXSA9IHsgbmFtZTogYDxmb250IGZhY2U9XCIke2l9XCI+JHtpfTwvZm9udD5gLCBpc0h0bWxOYW1lOiB0cnVlIH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Q29sb3JJdGVtcygpIHtcblx0XHRcdGNvbnN0IHJldCA9IHt9XG5cdFx0XHRPYmplY3Qua2V5cyhjb2xvck1hcCkuZm9yRWFjaCgoaSkgPT4ge1xuXHRcdFx0XHRyZXRbaV0gPSB7XG5cdFx0XHRcdFx0bmFtZTogaS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGkuc2xpY2UoMSksXG5cdFx0XHRcdFx0aWNvbjogYGZhcyBmYS1zcXVhcmUtZnVsbCB3My10ZXh0LSR7aX1gXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cblx0XHR9XG5cblx0XHRjb25zdCBmb250U2l6ZUl0ZW1zID0gZ2V0Rm9udFNpemVJdGVtcygpXG5cdFx0Y29uc3QgZGVmYXVsdEZvbnRTaXplID0gJzMnXG5cdFx0Y29uc3QgZm9udE5hbWVJdGVtcyA9IGdldEZvbnROYW1lSXRlbXMoKVxuXHRcdGNvbnN0IGRlZmF1bHRGb250TmFtZSA9ICdBcmlhbCdcblx0XHRjb25zdCBjb2xvckl0ZW1zID0gZ2V0Q29sb3JJdGVtcygpXG5cdFx0Y29uc3QgZGVmYXVsdENvbG9yID0gY29sb3JNYXBbJ2JsYWNrJ11cblxuXHRcdGNvbnN0IHNwZWVjaFJlY29BdmFpbGFibGUgPSAoJ3dlYmtpdFNwZWVjaFJlY29nbml0aW9uJyBpbiB3aW5kb3cpXG5cdFx0Y29uc3QgaXNNb2JpbERldmljZSA9IC9BbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXHRcdGNvbnNvbGUubG9nKCdpc01vYmlsRGV2aWNlJywgaXNNb2JpbERldmljZSlcblx0XHRsZXQgaWdub3JlT25FbmQgPSBmYWxzZVxuXHRcdGxldCByZWNvZ25pdGlvbiA9IG51bGxcblx0XHRsZXQgZmluYWxTcGFuID0gbnVsbFxuXHRcdGxldCBpbnRlcmltU3BhbiA9IG51bGxcblx0XHRsZXQgZmluYWxUcmFuc2NyaXB0ID0gJydcblx0XHQvKipAdHlwZSB7UmFuZ2V9ICovXG5cdFx0bGV0IHJhbmdlID0gbnVsbFxuXG5cdFx0Y29uc3QgdHdvX2xpbmUgPSAvXFxuXFxuL2dcblx0XHRjb25zdCBvbmVfbGluZSA9IC9cXG4vZ1xuXHRcdGZ1bmN0aW9uIGxpbmVicmVhayhzKSB7XG5cdFx0XHRyZXR1cm4gcy5yZXBsYWNlKHR3b19saW5lLCAnPHA+PC9wPicpLnJlcGxhY2Uob25lX2xpbmUsICc8YnI+Jylcblx0XHR9XG5cblx0XHRjb25zdCBmaXJzdF9jaGFyID0gL1xcUy9cblx0XHRmdW5jdGlvbiBjYXBpdGFsaXplKHMpIHtcblx0XHRcdHJldHVybiBzLnJlcGxhY2UoZmlyc3RfY2hhciwgbSA9PiBtLnRvVXBwZXJDYXNlKCkpXG5cdFx0fVxuXG5cdFx0aWYgKHNwZWVjaFJlY29BdmFpbGFibGUpIHtcblx0XHRcdHJlY29nbml0aW9uID0gbmV3IHdlYmtpdFNwZWVjaFJlY29nbml0aW9uKCk7XG5cdFx0XHRyZWNvZ25pdGlvbi5jb250aW51b3VzID0gdHJ1ZVxuXHRcdFx0cmVjb2duaXRpb24uaW50ZXJpbVJlc3VsdHMgPSB0cnVlXG5cdFx0XHRyZWNvZ25pdGlvbi5sYW5nID0gJ2ZyLUZSJ1xuXG5cdFx0XHRyZWNvZ25pdGlvbi5vbnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnb25TdGFydCcpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHJlY29nbml6aW5nOiB0cnVlIH0pXG5cblx0XHRcdH1cblxuXHRcdFx0cmVjb2duaXRpb24ub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnb25FcnJvcicsIGV2ZW50LmVycm9yKVxuXHRcdFx0fVxuXG5cdFx0XHRyZWNvZ25pdGlvbi5vbmVuZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uRW5kJylcblx0XHRcdFx0aWYgKGlzTW9iaWxEZXZpY2UgJiYgY3RybC5tb2RlbC5yZWNvZ25pemluZykge1xuXHRcdFx0XHRcdHJhbmdlLmNvbGxhcHNlKClcblx0XHRcdFx0XHRzdGFydFJlY29nbml0aW9uKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyByZWNvZ25pemluZzogZmFsc2UgfSlcblx0XHRcdFx0XHRyYW5nZS5jb2xsYXBzZSgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmVjb2duaXRpb24ub25yZXN1bHQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXN1bHQnLCBldmVudC5yZXN1bHRzLmxlbmd0aClcblx0XHRcdFx0bGV0IGludGVyaW1UcmFuc2NyaXB0ID0gJydcblx0XHRcdFx0Zm9yIChsZXQgaSA9IGV2ZW50LnJlc3VsdEluZGV4OyBpIDwgZXZlbnQucmVzdWx0cy5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3VsdHMnLCBldmVudC5yZXN1bHRzW2ldKVxuXHRcdFx0XHRcdGlmIChldmVudC5yZXN1bHRzW2ldLmlzRmluYWwgJiYgZXZlbnQucmVzdWx0c1tpXVswXS5jb25maWRlbmNlICE9IDApIHtcblx0XHRcdFx0XHRcdGZpbmFsVHJhbnNjcmlwdCArPSBldmVudC5yZXN1bHRzW2ldWzBdLnRyYW5zY3JpcHRcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aW50ZXJpbVRyYW5zY3JpcHQgKz0gZXZlbnQucmVzdWx0c1tpXVswXS50cmFuc2NyaXB0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ludGVyaW1UcmFuc2NyaXB0JywgaW50ZXJpbVRyYW5zY3JpcHQpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbmFsVHJhbnNjcmlwdCcsIGZpbmFsVHJhbnNjcmlwdClcblx0XHRcdFx0ZmluYWxUcmFuc2NyaXB0ID0gY2FwaXRhbGl6ZShmaW5hbFRyYW5zY3JpcHQpXG5cdFx0XHRcdGZpbmFsU3Bhbi5pbm5lckhUTUwgPSBsaW5lYnJlYWsoZmluYWxUcmFuc2NyaXB0KVxuXHRcdFx0XHRpbnRlcmltU3Bhbi5pbm5lckhUTUwgPSBsaW5lYnJlYWsoaW50ZXJpbVRyYW5zY3JpcHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RhcnRSZWNvZ25pdGlvbigpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbE9iaicsIHNlbE9iailcblxuXHRcdFx0aWYgKCFpc0VkaXRhYmxlKCkpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRyYW5nZSA9IGdldFJhbmdlKClcblx0XHRcdGZpbmFsU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuXHRcdFx0aW50ZXJpbVNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcblx0XHRcdGludGVyaW1TcGFuLmNsYXNzTmFtZSA9ICdpbnRlcmltJ1xuXHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZShpbnRlcmltU3Bhbilcblx0XHRcdHJhbmdlLmluc2VydE5vZGUoZmluYWxTcGFuKVxuXHRcdFx0ZmluYWxUcmFuc2NyaXB0ID0gJydcblx0XHRcdHJlY29nbml0aW9uLnN0YXJ0KClcblx0XHRcdGlnbm9yZU9uRW5kID0gZmFsc2Vcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZVxuXHRcdCAqIEByZXR1cm5zIHtKUXVlcnk8SFRNTEVsZW1lbnQ+fVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRpdih0ZXh0LCB0YWdOYW1lKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdkaXYnLCB0YWdOYW1lLCB0ZXh0KVxuXHRcdFx0Y29uc3QgZWx0ID0gWydJJywgJ0InLCAnVScsICdGT05UJ10uaW5jbHVkZXModGFnTmFtZSkgPyAnc3BhbicgOiAnZGl2J1xuXHRcdFx0cmV0dXJuICQoYDwke2VsdH0+YCkudGV4dCh0ZXh0KVxuXHRcdH1cblxuXHRcdGxldCBpbWdVcmxzID0gW11cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGNvbnZlcnRUb1RhYmxlKHJhbmdlKSB7XG5cdFx0XHRjb25zdCBzZWxSYW5nZVRleHQgPSBnZXRUZXh0Tm9kZXNCZXR3ZWVuKHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyLCByYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2UuZW5kQ29udGFpbmVyKVxuXHRcdFx0aWYgKHNlbFJhbmdlVGV4dC5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHJhbmdlLmRlbGV0ZUNvbnRlbnRzKClcblxuXHRcdFx0Y29uc3QgdGFibGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpXG5cdFx0XHRmb3IgKGNvbnN0IHJvdyBvZiBzZWxSYW5nZVRleHQpIHtcblx0XHRcdFx0Y29uc3QgdHIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpXG5cdFx0XHRcdHRhYmxlLmFwcGVuZENoaWxkKHRyKVxuXHRcdFx0XHRmb3IgKGNvbnN0IHRleHQgb2Ygcm93LnNwbGl0KCc7JykpIHtcblx0XHRcdFx0XHRjb25zdCB0ZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJylcblx0XHRcdFx0XHR0ci5hcHBlbmRDaGlsZCh0ZClcblx0XHRcdFx0XHRpZiAodGV4dC5zdGFydHNXaXRoKCdpbWcoJykpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHVybElkID0gdGV4dC5yZXBsYWNlQWxsKCcpJywgJycpLnN1YnN0cig0KVxuXHRcdFx0XHRcdFx0Y29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJylcblx0XHRcdFx0XHRcdGltZy5zcmMgPSBpbWdVcmxzW3VybElkXVxuXHRcdFx0XHRcdFx0dGQuYXBwZW5kQ2hpbGQoaW1nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHRkLnRleHRDb250ZW50ID0gdGV4dFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aW1nVXJscyA9IFtdXG5cdFx0XHRyYW5nZS5pbnNlcnROb2RlKHRhYmxlKVxuXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gY29udmVydFRvTGlzdChyYW5nZSkge1xuXHRcdFx0Y29uc3QgcGFyZW50RWxlbWVudCA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIucGFyZW50RWxlbWVudClcblxuXHRcdFx0aWYgKFsnVEQnLCAnVEgnXS5pbmNsdWRlcyhwYXJlbnRFbGVtZW50LmdldCgwKS50YWdOYW1lKSkge1xuXHRcdFx0XHRjb25zdCB0YWJsZSA9IHBhcmVudEVsZW1lbnQuY2xvc2VzdCgndGFibGUnKVxuXHRcdFx0XHRjb25zdCB0ciA9IHRhYmxlLmZpbmQoJ3RyJylcblx0XHRcdFx0Y29uc3QgZGF0YSA9IFtdXG5cdFx0XHRcdHRyLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHRkID0gJCh0aGlzKS5maW5kKCd0ZCx0aCcpXG5cdFx0XHRcdFx0Y29uc3QgdGV4dCA9IFtdXG5cdFx0XHRcdFx0dGQuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLmZpbmQoJ2ltZycpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBzcmMgPSAkKHRoaXMpLmF0dHIoJ3NyYycpXG5cdFx0XHRcdFx0XHRcdGltZ1VybHMucHVzaChzcmMpXG5cdFx0XHRcdFx0XHRcdCQodGhpcykucmVwbGFjZVdpdGgoYGltZygke2ltZ1VybHMubGVuZ3RoIC0gMX0pYClcblx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRcdHRleHQucHVzaCgkKHRoaXMpLnRleHQoKSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGRhdGEucHVzaCh0ZXh0LmpvaW4oJzsnKSlcblxuXHRcdFx0XHR9KVxuXHRcdFx0XHR0YWJsZS5yZW1vdmUoKVxuXHRcdFx0XHRyYW5nZS5kZWxldGVDb250ZW50cygpXG5cdFx0XHRcdGZvciAoY29uc3QgdGV4dCBvZiBkYXRhLnJldmVyc2UoKSkge1xuXHRcdFx0XHRcdGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cdFx0XHRcdFx0ZGl2LmlubmVySFRNTCA9IHRleHRcblx0XHRcdFx0XHRyYW5nZS5pbnNlcnROb2RlKGRpdilcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGNlbGwgdGFibGUnIH0pXG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGFkZFJvdyhyYW5nZSkge1xuXHRcdFx0Y29uc3QgcGFyZW50RWxlbWVudCA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIucGFyZW50RWxlbWVudClcblxuXHRcdFx0aWYgKFsnVEQnLCAnVEgnXS5pbmNsdWRlcyhwYXJlbnRFbGVtZW50LmdldCgwKS50YWdOYW1lKSkge1xuXHRcdFx0XHRjb25zdCB0ciA9IHBhcmVudEVsZW1lbnQuY2xvc2VzdCgndHInKVxuXHRcdFx0XHRjb25zdCBuYkNvbHMgPSB0ci5maW5kKCd0ZCwgdGgnKS5sZW5ndGhcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbmIgY29sJywgbmJDb2xzKVxuXHRcdFx0XHRjb25zdCBuZXdUciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJylcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBuYkNvbHM7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IG5ld1RkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKVxuXHRcdFx0XHRcdG5ld1RyLmFwcGVuZENoaWxkKG5ld1RkKVxuXHRcdFx0XHR9XG5cdFx0XHRcdHRyLmFmdGVyKG5ld1RyKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGNlbGwgdGFibGUnIH0pXG5cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBcblx0XHQgKi9cblx0XHQgZnVuY3Rpb24gYWRkQ29sdW1uKHJhbmdlKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdhZGRDb2x1bW4nKVxuXHRcdFx0Y29uc3QgcGFyZW50RWxlbWVudCA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIucGFyZW50RWxlbWVudClcblxuXHRcdFx0aWYgKFsnVEQnLCAnVEgnXS5pbmNsdWRlcyhwYXJlbnRFbGVtZW50LmdldCgwKS50YWdOYW1lKSkge1xuXHRcdFx0XHRjb25zdCBzZWxDb2wgPSBwYXJlbnRFbGVtZW50LmluZGV4KClcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsQ29sJywgc2VsQ29sKVxuXHRcdFx0XHRjb25zdCB0YWJsZSA9IHBhcmVudEVsZW1lbnQuY2xvc2VzdCgndGFibGUnKVxuXHRcdFx0XHR0YWJsZS5maW5kKCd0cicpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgdGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpXG5cdFx0XHRcdFx0JCh0aGlzKS5maW5kKCd0ZCx0aCcpLmVxKHNlbENvbCkuYWZ0ZXIodGQpXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgY2VsbCB0YWJsZScgfSlcblxuXHRcdFx0fVxuXHRcdH1cdFx0XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGh0bWw6IGVsdC52YWwoKSxcblx0XHRcdFx0Zm9udFNpemU6IGRlZmF1bHRGb250U2l6ZSxcblx0XHRcdFx0Zm9udE5hbWU6IGRlZmF1bHRGb250TmFtZSxcblx0XHRcdFx0Z2V0Rm9udFNpemU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYCR7Zm9udFNpemVzW3RoaXMuZm9udFNpemUgLSAxXX0gcHQmbmJzcDs8aSBjbGFzcz1cImZhcyBmYS1jYXJldC1kb3duXCI+PC9pPmBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0Rm9udE5hbWU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gYCR7dGhpcy5mb250TmFtZX0mbmJzcDs8aSBjbGFzcz1cImZhcyBmYS1jYXJldC1kb3duXCI+PC9pPmBcblx0XHRcdFx0fSxcblx0XHRcdFx0Zm9udFNpemVJdGVtcyxcblx0XHRcdFx0Zm9udE5hbWVJdGVtcyxcblx0XHRcdFx0Y29sb3JJdGVtcyxcblx0XHRcdFx0Y29sb3I6IGRlZmF1bHRDb2xvcixcblx0XHRcdFx0aGVhZGluZ0l0ZW1zOiBnZXRIZWFkaW5nSXRlbXMoKSxcblx0XHRcdFx0c2hvd01pY3JvOiBmYWxzZSxcblx0XHRcdFx0aXNNaWNyb1Zpc2libGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zaG93TWljcm8gJiYgdGhpcy5zcGVlY2hSZWNvQXZhaWxhYmxlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNwZWVjaFJlY29BdmFpbGFibGUsXG5cdFx0XHRcdHJlY29nbml6aW5nOiBmYWxzZSxcblx0XHRcdFx0Z2V0TWljVXJsOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMucmVjb2duaXppbmcgPyAnL2Fzc2V0cy9taWMtYW5pbWF0ZS5naWYnIDogJy9hc3NldHMvbWljLmdpZidcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRvb2dsZU1pY3JvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgc2hvd01pY3JvOiAhY3RybC5tb2RlbC5zaG93TWljcm8gfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnNlcnRUYWJsZTogZnVuY3Rpb24gKGV2LCBpbmZvKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSW5zZXJ0VGFibGUnLCBpbmZvKVxuXHRcdFx0XHRcdGNvbnN0IHsgY21kIH0gPSBpbmZvXG5cdFx0XHRcdFx0aWYgKCFpc0VkaXRhYmxlKCkpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cdFx0XHRcdFx0Y29uc3QgcmFuZ2UgPSBzZWxPYmouZ2V0UmFuZ2VBdCgwKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2NvbnZlcnRUb0xpc3QnKSB7XG5cdFx0XHRcdFx0XHRjb252ZXJ0VG9MaXN0KHJhbmdlKVxuXHRcdFx0XHRcdFx0c2VsT2JqLnJlbW92ZUFsbFJhbmdlcygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGNtZCA9PSAnY29udmVydFRvVGFibGUnKSB7XG5cdFx0XHRcdFx0XHRjb252ZXJ0VG9UYWJsZShyYW5nZSlcblx0XHRcdFx0XHRcdHNlbE9iai5yZW1vdmVBbGxSYW5nZXMoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChjbWQgPT0gJ2FkZFJvdycpIHtcblx0XHRcdFx0XHRcdGFkZFJvdyhyYW5nZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoY21kID09ICdhZGRDb2wnKSB7XG5cdFx0XHRcdFx0XHRhZGRDb2x1bW4ocmFuZ2UpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVtb3ZlRm9ybWF0OiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmVtb3ZlRm9ybWF0Jylcblx0XHRcdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblxuXHRcdFx0XHRcdGlmICghaXNFZGl0YWJsZSgpKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnN0IG5vZGUgPSBzZWxPYmouYW5jaG9yTm9kZVxuXHRcdFx0XHRcdGlmIChub2RlLm5vZGVUeXBlICE9IG5vZGUuVEVYVF9OT0RFKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN0IHRleHQgPSBub2RlLnRleHRDb250ZW50XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyh7dGV4dH0pXG5cdFx0XHRcdFx0Y29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnRFbGVtZW50XG5cdFx0XHRcdFx0Y29uc3QgdGFnTmFtZSA9IHBhcmVudC50YWdOYW1lXG5cblx0XHRcdFx0XHRpZiAoJChwYXJlbnQpLmhhc0NsYXNzKCdlZGl0b3InKSkge1xuXHRcdFx0XHRcdFx0aWYgKG5vZGUucHJldmlvdXNTaWJsaW5nICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0ZGl2KHRleHQsIHRhZ05hbWUpLmluc2VydEFmdGVyKG5vZGUucHJldmlvdXNTaWJsaW5nKVxuXHRcdFx0XHRcdFx0XHRwYXJlbnQucmVtb3ZlQ2hpbGQobm9kZSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAocGFyZW50LnBhcmVudEVsZW1lbnQuY2hpbGRFbGVtZW50Q291bnQgPT0gMSkge1xuXHRcdFx0XHRcdFx0XHRwYXJlbnQucmVtb3ZlQ2hpbGQobm9kZSlcblx0XHRcdFx0XHRcdFx0cGFyZW50LnBhcmVudEVsZW1lbnQudGV4dENvbnRlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudC50ZXh0Q29udGVudCArIHRleHRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkKHBhcmVudCkucmVwbGFjZVdpdGgoZGl2KHRleHQsIHRhZ05hbWUpKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25NaWNybzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGlmIChjdHJsLm1vZGVsLnJlY29nbml6aW5nKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyByZWNvZ25pemluZzogZmFsc2UgfSlcblx0XHRcdFx0XHRcdHJlY29nbml0aW9uLnN0b3AoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHN0YXJ0UmVjb2duaXRpb24oKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnNlcnRJbWFnZTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0aW5zZXJ0SW1hZ2UoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZvbnROYW1lQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZvbnROYW1lQ2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBmb250TmFtZTogZGF0YS5jbWQgfSlcblx0XHRcdFx0XHRkb2N1bWVudC5leGVjQ29tbWFuZCgnZm9udE5hbWUnLCBmYWxzZSwgZGF0YS5jbWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRm9udFNpemVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRm9udFNpemVDaGFuZ2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGZvbnRTaXplOiBkYXRhLmNtZCB9KVxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKCdmb250U2l6ZScsIGZhbHNlLCBkYXRhLmNtZClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DcmVhdGVMaW5rOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdFx0XHRhZGRMaW5rKGFzeW5jICgpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdJbnNlcnQgTGluaycsXG5cdFx0XHRcdFx0XHRcdGxhYmVsOiAnTGluayBUYXJnZXQnLFxuXHRcdFx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAndXJsJyB9XG5cdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNjcm9sbENsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuZm9jdXMoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbW1hbmQ6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ29tbWFuZCcsIGRhdGEpXG5cblx0XHRcdFx0XHRsZXQgY21kXG5cdFx0XHRcdFx0bGV0IGNtZEFyZ1xuXG5cdFx0XHRcdFx0aWYgKGRhdGEpIHtcblx0XHRcdFx0XHRcdGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRcdGlmIChjbWQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGNtZEFyZyA9IGRhdGEuY21kXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0Y21kID0gZGF0YS5jbWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRjbWQgPSAkKHRoaXMpLmRhdGEoJ2NtZCcpXG5cdFx0XHRcdFx0XHRjbWRBcmcgPSAkKHRoaXMpLmRhdGEoJ2NtZEFyZycpXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db21tYW5kJywgY21kLCBjbWRBcmcpXG5cblx0XHRcdFx0XHRkb2N1bWVudC5leGVjQ29tbWFuZChjbWQsIGZhbHNlLCBjbWRBcmcpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db2xvck1lbnVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNvbG9yTWVudUNoYW5nZScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgY29sb3IgPSBjb2xvck1hcFtkYXRhLmNtZF1cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjb2xvciB9KVxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKCdmb3JlQ29sb3InLCBmYWxzZSwgY29sb3IpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXHRcdGVsdC5maW5kKCdidXR0b24udzMtYnV0dG9uJykuYXR0cigndHlwZScsICdidXR0b24nKVxuXG5cdFx0JChkb2N1bWVudCkub24oJ3NlbGVjdGlvbmNoYW5nZScsICgpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbGVjdGlvbmNoYW5nZScpXG5cdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbE9iaicsIHNlbE9iailcblxuXHRcdFx0aWYgKCFpc0VkaXRhYmxlKCkpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZvbnRTaXplTm9kZSA9ICQoc2VsT2JqLmFuY2hvck5vZGUpLmNsb3Nlc3QoJ2ZvbnRbc2l6ZV0nKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnZm9udE5vZGUnLCBmb250Tm9kZSlcblx0XHRcdGlmIChmb250U2l6ZU5vZGUubGVuZ3RoID09IDEpIHtcblx0XHRcdFx0Y29uc3QgZm9udFNpemUgPSBmb250U2l6ZU5vZGUuYXR0cignc2l6ZScpIHx8IGRlZmF1bHRGb250U2l6ZVxuXHRcdFx0XHRjb25zdCBmb250TmFtZSA9IGZvbnRTaXplTm9kZS5hdHRyKCdmYWNlJykgfHwgZGVmYXVsdEZvbnROYW1lXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbnRTaXplJywgZm9udFNpemUsICdmb250TmFtZScsIGZvbnROYW1lLCAnY29sb3InLCBjb2xvcilcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgZm9udFNpemUsIGZvbnROYW1lIH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRmb250U2l6ZTogZGVmYXVsdEZvbnRTaXplLFxuXHRcdFx0XHRcdGZvbnROYW1lOiBkZWZhdWx0Rm9udE5hbWUsXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmb250Q29sb3JOb2RlID0gJChzZWxPYmouYW5jaG9yTm9kZSkuY2xvc2VzdCgnZm9udFtjb2xvcl0nKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnZm9udE5vZGUnLCBmb250Tm9kZSlcblx0XHRcdGlmIChmb250Q29sb3JOb2RlLmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdGNvbnN0IGNvbG9yID0gZm9udENvbG9yTm9kZS5hdHRyKCdjb2xvcicpIHx8IGRlZmF1bHRDb2xvclxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmb250U2l6ZScsIGZvbnRTaXplLCAnZm9udE5hbWUnLCBmb250TmFtZSwgJ2NvbG9yJywgY29sb3IpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGNvbG9yIH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRjb2xvcjogZGVmYXVsdENvbG9yXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtOb2RlfSBub2RlIFxuXHRcdCAqIEByZXR1cm5zIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGhhc1RleHRDaGlsZE5vZGUobm9kZSkge1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20obm9kZS5jaGlsZE5vZGVzKS5maWx0ZXIoZW50cnkgPT4gZW50cnkubm9kZVR5cGUgPT0gTm9kZS5URVhUX05PREUpLmxlbmd0aCAhPSAwXG5cdFx0fVxuXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge05vZGV9IHJvb3ROb2RlIFxuXHRcdCAqIEBwYXJhbSB7Tm9kZX0gc3RhcnROb2RlIFxuXHRcdCAqIEBwYXJhbSB7Tm9kZX0gZW5kTm9kZSBcblx0XHQgKiBAcmV0dXJucyBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRUZXh0Tm9kZXNCZXR3ZWVuKHJvb3ROb2RlLCBzdGFydE5vZGUsIGVuZE5vZGUpIHtcblx0XHRcdGxldCBwYXN0U3RhcnROb2RlID0gZmFsc2Vcblx0XHRcdGxldCByZWFjaGVkRW5kTm9kZSA9IGZhbHNlXG5cdFx0XHRjb25zdCB0ZXh0Tm9kZXMgPSBbXVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFxuXHRcdFx0ICogQHBhcmFtIHtOb2RlfSBub2RlIFxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBnZXRUZXh0Tm9kZXMobm9kZSkge1xuXHRcdFx0XHRpZiAobm9kZSA9PSBzdGFydE5vZGUpIHtcblx0XHRcdFx0XHRwYXN0U3RhcnROb2RlID0gdHJ1ZVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG5vZGUubm9kZVR5cGUgPT0gTm9kZS5URVhUX05PREUpIHtcblx0XHRcdFx0XHRpZiAocGFzdFN0YXJ0Tm9kZSAmJiAhcmVhY2hlZEVuZE5vZGUpIHtcblxuXHRcdFx0XHRcdFx0aWYgKG5vZGUucGFyZW50RWxlbWVudC50YWdOYW1lID09ICdTUEFOJyAmJiBub2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC50YWdOYW1lID09ICdESVYnICYmIGhhc1RleHRDaGlsZE5vZGUobm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQpKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGxlbmd0aCA9IHRleHROb2Rlcy5sZW5ndGhcblx0XHRcdFx0XHRcdFx0aWYgKGxlbmd0aCA+IDApXG5cdFx0XHRcdFx0XHRcdFx0dGV4dE5vZGVzW2xlbmd0aCAtIDFdICs9IG5vZGUudGV4dENvbnRlbnRcblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRleHROb2Rlcy5wdXNoKG5vZGUudGV4dENvbnRlbnQpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyAhcmVhY2hlZEVuZE5vZGUgJiYgaSA8IGxlbjsgKytpKSB7XG5cdFx0XHRcdFx0XHRnZXRUZXh0Tm9kZXMobm9kZS5jaGlsZE5vZGVzW2ldKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChub2RlID09IGVuZE5vZGUpIHtcblx0XHRcdFx0XHRyZWFjaGVkRW5kTm9kZSA9IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRnZXRUZXh0Tm9kZXMocm9vdE5vZGUpXG5cdFx0XHRyZXR1cm4gdGV4dE5vZGVzXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U2VsUmFuZ2VUZXh0KCkge1xuXHRcdFx0Y29uc3QgcmFuZ2UgPSBnZXRSYW5nZSgpXG5cdFx0XHRyZXR1cm4gZ2V0VGV4dE5vZGVzQmV0d2VlbihyYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lciwgcmFuZ2Uuc3RhcnRDb250YWluZXIsIHJhbmdlLmVuZENvbnRhaW5lcilcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0geygpID0+IFByb21pc2U8c3RyaW5nPn0gY2JrIFxuXHRcdCAqIEByZXR1cm5zIFxuXHRcdCAqL1xuXHRcdGFzeW5jIGZ1bmN0aW9uIGFkZExpbmsoY2JrKSB7XG5cdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblxuXHRcdFx0aWYgKCFpc0VkaXRhYmxlKCkpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3QgcmFuZ2UgPSBnZXRSYW5nZSgpXG5cdFx0XHRpZiAodHlwZW9mIGNiayA9PSAnZnVuY3Rpb24nICYmIGNiay5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQXN5bmNGdW5jdGlvbicpIHtcblx0XHRcdFx0Y29uc3QgaHJlZiA9IGF3YWl0IGNiaygpXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdocmVmJywgaHJlZilcblx0XHRcdFx0aWYgKGhyZWYgIT0gbnVsbCkge1xuXHRcdFx0XHRcdHNlbE9iai5yZW1vdmVBbGxSYW5nZXMoKVxuXHRcdFx0XHRcdHNlbE9iai5hZGRSYW5nZShyYW5nZSlcblxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjcmVhdGVMaW5rJywgZmFsc2UsIGhyZWYpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9jb25zb2xlLmxvZygnaHJlZicsIGhyZWYpXG5cblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFJhbmdlKCkge1xuXHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cdFx0XHRyZXR1cm4gc2VsT2JqLmdldFJhbmdlQXQoMClcblx0XHR9XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gaXNFZGl0YWJsZSgpIHtcblxuXHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cdFx0XHRsZXQgbm9kZSA9IHNlbE9iai5hbmNob3JOb2RlXG5cblx0XHRcdGNvbnN0IGVkaXRhYmxlID0gY3RybC5zY29wZS5lZGl0b3IuZ2V0KDApXG5cblx0XHRcdHdoaWxlIChub2RlICYmIG5vZGUgIT0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG5cdFx0XHRcdGlmIChub2RlID09IGVkaXRhYmxlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWVcblx0XHRcdFx0fVxuXHRcdFx0XHRub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlXG5cdFx0fVxuXG5cdFx0dGhpcy5hZGRMaW5rID0gYWRkTGlua1xuXG5cdFx0dGhpcy5pc0VkaXRhYmxlID0gaXNFZGl0YWJsZVxuXG5cdFx0dGhpcy5odG1sID0gZnVuY3Rpb24gKGh0bWxTdHJpbmcpIHtcblx0XHRcdGlmIChodG1sU3RyaW5nID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5maW5kKCdzcGFuJykucmVtb3ZlKCcuaW50ZXJpbScpXG5cdFx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmZpbmQoJ3NwYW4nKS5yZW1vdmVBdHRyKCdzdHlsZScpXG5cdFx0XHRcdHJldHVybiBjdHJsLnNjb3BlLmVkaXRvci5odG1sKClcblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuaHRtbChodG1sU3RyaW5nKVxuXHRcdH1cblxuXHRcdHRoaXMubG9hZCA9IGZ1bmN0aW9uICh1cmwsIGNiaykge1xuXHRcdFx0cmV0dXJuIGN0cmwuc2NvcGUuZWRpdG9yLmxvYWQodXJsLCBjYmspXG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBjdHJsLnNjb3BlLmVkaXRvci5odG1sKClcblx0XHR9XG5cblx0XHR0aGlzLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdicmFpbmpzLmh0bWxlZGl0b3I6c2V0VmFsdWUnLCB2YWx1ZSlcblx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmh0bWwodmFsdWUpXG5cdFx0fVxuXG5cdFx0dGhpcy5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmdldCgwKS5mb2N1cygpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaW5zZXJ0SW1hZ2UoKSB7XG5cdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbE9iaicsIHNlbE9iailcblxuXHRcdFx0aWYgKCFpc0VkaXRhYmxlKCkpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGV4dCBiZWZvcmUnIH0pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByYW5nZSA9IHNlbE9iai5nZXRSYW5nZUF0KDApXG5cblx0XHRcdGZpbGVzLm9wZW5GaWxlKCdJbnNlcnQgSW1hZ2UnLCAnanBnLGpwZWcscG5nLGdpZix3ZWJwJywgYXN5bmMgKGRhdGEpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0bGV0IHsgdXJsIH0gPSBkYXRhXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3VybCcsIHVybClcblx0XHRcdFx0aWYgKHVzZURhdGFVcmxGb3JJbWcpIHtcblx0XHRcdFx0XHR1cmwgPSBhd2FpdCAkJC51cmwuaW1hZ2VVcmxUb0RhdGFVcmwodXJsKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpXG5cdFx0XHRcdGltZy5zcmMgPSB1cmxcblx0XHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZShpbWcpXHRcdFx0XHRcblx0XHRcdH0pXG5cblxuXG5cblx0XHR9XG5cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsdGVyRGxnJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblxcbiAgICA8bGFiZWw+R2VucmU8L2xhYmVsPlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogZ2VucmVzfVxcXCIgYm4tdmFsPVxcXCJzZWxlY3RlZEdlbnJlXFxcIiBibi1ldmVudD1cXFwiY29tYm9ib3hjaGFuZ2U6IG9uR2VucmVDaGFuZ2VcXFwiIG5hbWU9XFxcImdlbnJlXFxcIj48L2Rpdj4gICAgXFxuXFxuICAgIDxsYWJlbD5BcnRpc3Q8L2xhYmVsPlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYXJ0aXN0c31cXFwiIGJuLXZhbD1cXFwic2VsZWN0ZWRBcnRpc3RcXFwiIGJuLXVwZGF0ZT1cXFwiY29tYm9ib3hjaGFuZ2VcXFwiIG5hbWU9XFxcImFydGlzdFxcXCI+PC9kaXY+ICAgIFxcblxcblxcbiAgICA8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW4gYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cbiAgICBwcm9wczoge1xuICAgICAgICBmaWxlczogW10sXG4gICAgICAgIG1wM0ZpbHRlcnM6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyKSB7XG5cbiAgICAgICAgLyoqQHR5cGUge3tcbiAgICAgICAgICogZmlsZXM6IEJyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkZpbGVJbmZvW10sIFxuICAgICAgICAgKiBtcDNGaWx0ZXJzOiBCcmVpemJvdC5Db250cm9scy5GaWxlcy5NcDNGaWx0ZXJ9fSAgKi9cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBsZXQgeyBmaWxlcywgbXAzRmlsdGVycyB9ID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIG1wM0ZpbHRlcnMgPSBtcDNGaWx0ZXJzIHx8IHt9XG5cblxuICAgICAgICBjb25zdCBzZWxlY3RlZEdlbnJlID0gbXAzRmlsdGVycy5nZW5yZSB8fCAnQWxsJ1xuICAgICAgICBjb25zdCBzZWxlY3RlZEFydGlzdCA9IG1wM0ZpbHRlcnMuYXJ0aXN0IHx8ICdBbGwnXG5cbiAgICAgICAgY29uc29sZS5sb2coJ3NlbGVjdGVkQXJ0aXN0Jywgc2VsZWN0ZWRBcnRpc3QpXG4gICAgICAgIGNvbnNvbGUubG9nKCdzZWxlY3RlZEdlbnJlJywgc2VsZWN0ZWRHZW5yZSlcblxuICAgICAgICBmdW5jdGlvbiBnZXRHZW5yZXMoKSB7XG4gICAgICAgICAgICBsZXQgZ2VucmVzID0ge31cblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmLm1wMykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGdlbnJlIH0gPSBmLm1wM1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VucmUgJiYgIWdlbnJlLnN0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdlbnJlc1tnZW5yZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5yZXNbZ2VucmVdKytcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbnJlc1tnZW5yZV0gPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBnZW5yZXMgPSBPYmplY3Qua2V5cyhnZW5yZXMpLnNvcnQoKS5tYXAoKGdlbnJlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmJUaXRsZSA9IGdlbnJlc1tnZW5yZV1cbiAgICAgICAgICAgICAgICByZXR1cm4gKG5iVGl0bGUgPT0gMSkgP1xuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBnZW5yZSwgbGFiZWw6IGdlbnJlIH0gOlxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBnZW5yZSwgbGFiZWw6IGAke2dlbnJlfSAoJHtuYlRpdGxlfSlgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBnZW5yZXMudW5zaGlmdCh7IHZhbHVlOiAnQWxsJywgbGFiZWw6ICdBbGwnLCBzdHlsZTogJ2ZvbnQtd2VpZ2h0OiBib2xkOycgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGdlbnJlc1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBnZXRBcnRpc3RzKGdlbnJlKSB7XG4gICAgICAgICAgICBsZXQgYXJ0aXN0cyA9IHt9XG5cbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGYpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZi5tcDMgJiYgKGdlbnJlID09ICdBbGwnIHx8IGYubXAzLmdlbnJlID09IGdlbnJlKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGFydGlzdCB9ID0gZi5tcDNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFydGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFydGlzdHNbYXJ0aXN0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFydGlzdHNbYXJ0aXN0XSsrXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnRpc3RzW2FydGlzdF0gPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXJ0aXN0cyA9IE9iamVjdC5rZXlzKGFydGlzdHMpLnNvcnQoKS5tYXAoKGFydGlzdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5iVGl0bGUgPSBhcnRpc3RzW2FydGlzdF1cbiAgICAgICAgICAgICAgICByZXR1cm4gKG5iVGl0bGUgPT0gMSkgP1xuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBhcnRpc3QsIGxhYmVsOiBhcnRpc3QgfSA6XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGFydGlzdCwgbGFiZWw6IGAke2FydGlzdH0gKCR7bmJUaXRsZX0pYCB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXJ0aXN0cy51bnNoaWZ0KHsgdmFsdWU6ICdBbGwnLCBsYWJlbDogJ0FsbCcsIHN0eWxlOiAnZm9udC13ZWlnaHQ6IGJvbGQ7JyB9KVxuICAgICAgICAgICAgcmV0dXJuIGFydGlzdHNcbiAgICAgICAgfVxuXG5cblxuXG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGFydGlzdHM6IGdldEFydGlzdHMoc2VsZWN0ZWRHZW5yZSksXG4gICAgICAgICAgICAgICAgZ2VucmVzOiBnZXRHZW5yZXMoKSxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEFydGlzdCxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEdlbnJlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25HZW5yZUNoYW5nZTogZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2VucmUgPSAkKHRoaXMpLmdldFZhbHVlKClcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnb25HZW5yZUNoYW5nZScsIGdlbnJlKVxuICAgICAgICAgICAgICAgICAgICBjdHJsLnNldERhdGEoe2FydGlzdHM6IGdldEFydGlzdHMoZ2VucmUpfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uU3VibWl0OiBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgICBwYWdlci5wb3BQYWdlKCQodGhpcykuZ2V0Rm9ybURhdGEoKSlcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFwcGx5OiB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXBwbHknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbn0pIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWxlY2hvb3NlcicsIHtcblxuXG5cdHRlbXBsYXRlOiBcIjxwPlNlbGVjdCBhIGZpbGUgc3lzdGVtPC9wPlxcbjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSG9tZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtaG9tZSBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5Zb3VyIGhvbWUgZmlsZXM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU2hhcmVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNoYXJlLWFsdCBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5GaWxlcyBzaGFyZWQgYnkgeW91ciBmcmllbmRzPC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdGZpbHRlckV4dGVuc2lvbjogJycsXG5cdFx0Z2V0TVAzSW5mbzogZmFsc2UsXG5cdFx0c2hvd01wM0ZpbHRlcjogZmFsc2Vcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IGZpbGVzU3J2XG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlciwgZmlsZXNTcnYpIHtcblxuXHRcdGNvbnN0IHsgZmlsdGVyRXh0ZW5zaW9uLCBnZXRNUDNJbmZvLCBzaG93TXAzRmlsdGVyIH0gPSB0aGlzLnByb3BzXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLkludGVyZmFjZX0gaWZhY2UgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbHRlclBhZ2UoaWZhY2UpIHtcblx0XHRcdGNvbnN0IG1wM0ZpbHRlcnMgPSBpZmFjZS5nZXRNUDNGaWx0ZXJzKClcblx0XHRcdGNvbnN0IGZpbGVzID0gaWZhY2UuZ2V0RmlsZXMoKVxuXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsdGVyRGxnJywge1xuXHRcdFx0XHR0aXRsZTogJ0ZpbHRlcicsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0ZmlsZXMsXG5cdFx0XHRcdFx0bXAzRmlsdGVyc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKGZpbHRlcnMpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXJzJywgZmlsdGVycylcblx0XHRcdFx0XHRpZmFjZS5zZXRNUDNGaWx0ZXJzKGZpbHRlcnMpXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRpdGxlIFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBmcmllbmRVc2VyIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG9wZW5GaWxlUGFnZSh0aXRsZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5Qcm9wc30gKi9cblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb24sXG5cdFx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0XHRnZXRNUDNJbmZvXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdCAqIFxuXHRcdFx0XHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuRXZlbnREYXRhLkZpbGVDbGlja30gaW5mbyBcblx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uIChldiwgaW5mbykge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZWNsaWNrJywgaW5mbylcblx0XHRcdFx0XHRcdGNvbnN0IHsgcm9vdERpciwgZmlsZU5hbWUsIG1wMyB9ID0gaW5mb1xuXHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gZmlsZXNTcnYuZmlsZVVybChyb290RGlyICsgZmlsZU5hbWUsIGZyaWVuZFVzZXIpXG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKHt1cmwsIG1wMywgZmlsZU5hbWV9KVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKHVybCkge1xuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UodXJsKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2hvd01wM0ZpbHRlcikge1xuXHRcdFx0XHRvcHRpb25zLmJ1dHRvbnMgPSB7XG5cdFx0XHRcdFx0c2VhcmNoOiB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0ZpbHRlcicsXG5cdFx0XHRcdFx0XHRpY29uOiAnZmFzIGZhLWZpbHRlcicsXG5cdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdG9wZW5GaWx0ZXJQYWdlKGZpbGVDdHJsKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmaWxlQ3RybCA9IHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIG9wdGlvbnMpXG5cblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSG9tZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdG9wZW5GaWxlUGFnZSgnSG9tZSBmaWxlcycsICcnKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNoYXJlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NoYXJlZCBmaWxlcycsXG5cdFx0XHRcdFx0XHQvKipAdHlwZSB7QnJlaXpib3QuQ29udHJvbHMuRnJpZW5kcy5Qcm9wc30gKi9cblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGU6IGZhbHNlXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdFx0XHQgKiBcblx0XHRcdFx0XHRcdFx0ICogQHBhcmFtIHtCcmVpemJvdC5Db250cm9scy5GcmllbmRzLkV2ZW50RGF0YS5GcmllbmRDbGlja30gZGF0YSBcblx0XHRcdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0XHRcdGZyaWVuZGNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgeyB1c2VyTmFtZSB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0XHRcdG9wZW5GaWxlUGFnZSh1c2VyTmFtZSwgdXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShkYXRhKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuKGZ1bmN0aW9uICgpIHtcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7e25hbWU6IHN0cmluZywgZm9sZGVyOiBib29sZWFufX0gZlxuXHQgKiBAcmV0dXJucyBcblx0ICovXG5cdGZ1bmN0aW9uIGdldEljb25DbGFzcyhmKSB7XG5cdFx0bGV0IHsgbmFtZSwgZm9sZGVyIH0gPSBmXG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuXHRcdGlmIChmb2xkZXIpIHtcblx0XHRcdHJldHVybiAnZmEtZm9sZGVyLW9wZW4gdzMtdGV4dC1kZWVwLW9yYW5nZSdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5wZGYnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLXBkZiB3My10ZXh0LXJlZCdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5oZG9jJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS13b3JkIHczLXRleHQtYmx1ZSdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5vZ2cnKSB8fCBuYW1lLmVuZHNXaXRoKCcubXAzJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1hdWRpbyB3My10ZXh0LXB1cnBsZSdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5tcDQnKSB8fCBuYW1lLmVuZHNXaXRoKCcud2VibScpIHx8IG5hbWUuZW5kc1dpdGgoJy4zZ3AnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLXZpZGVvIHczLXRleHQtb3JhbmdlJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnppcCcpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtYXJjaGl2ZSB3My10ZXh0LWFtYmVyJ1xuXHRcdH1cblxuXHRcdHJldHVybiAnZmEtZmlsZSB3My10ZXh0LWJsdWUtZ3JleSdcblx0fVxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5GaWxlSW5mb1tdfSBmaWxlcyBcblx0ICovXG5cdGZ1bmN0aW9uIHNvcnRGaWxlcyhmaWxlcykge1xuXHRcdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0XHRcdGlmIChhLmZvbGRlciAmJiAhYi5mb2xkZXIpIHtcblx0XHRcdFx0cmV0dXJuIC0xXG5cdFx0XHR9XG5cdFx0XHRpZiAoIWEuZm9sZGVyICYmIGIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKVxuXHRcdH0pXG5cdH1cblxuXHQkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZWxpc3QnLCB7XG5cdFx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXHRcdHByb3BzOiB7XG5cdFx0XHRzZWxlY3Rpb25FbmFibGVkOiBmYWxzZSxcblx0XHRcdGZpbHRlckV4dGVuc2lvbjogdW5kZWZpbmVkLFxuXHRcdFx0Z2V0TVAzSW5mbzogZmFsc2UsXG5cdFx0XHRmcmllbmRVc2VyOiAnJyxcblx0XHRcdG1wM0ZpbHRlcnM6IG51bGwsXG5cdFx0fSxcblxuXHRcdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdGxvYWRpbmcgLi4uXFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwicGF0aFBhbmVsXFxcIiBibi1ldmVudD1cXFwiY2xpY2sucGF0aEl0ZW06IG9uUGF0aEl0ZW1cXFwiIGJuLXNob3c9XFxcIiFsb2FkaW5nXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZ2V0UGF0aFxcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jaGV2cm9uLXJpZ2h0XFxcIiBibi1zaG93PVxcXCIhaXNGaXJzdFxcXCI+PC9pPlxcblx0XHQ8c3Bhbj5cXG5cdFx0XHQ8YSBjbGFzcz1cXFwicGF0aEl0ZW1cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgaHJlZj1cXFwiI1xcXCIgYm4tc2hvdz1cXFwiIWlzTGFzdFxcXCIgYm4tZGF0YT1cXFwie2luZm86IGdldFBhdGhJbmZvfVxcXCI+PC9hPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgYm4tc2hvdz1cXFwiaXNMYXN0XFxcIiBjbGFzcz1cXFwibGFzdEl0ZW1cXFwiPjwvc3Bhbj5cXG5cXG5cdFx0PC9zcGFuPlxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtaG92ZXJhYmxlIHczLXNtYWxsXFxcIj5cXG5cdFx0PHRoZWFkPlxcblx0XHRcdDx0ciBibi1odG1sPVxcXCJnZXRIZWFkZXJcXFwiPjwvdHI+XFxuXHRcdDwvdGhlYWQ+XFxuXHRcdDx0Ym9keSBibi1lYWNoPVxcXCJnZXRGaWxlc1xcXCIgYm4taXRlcj1cXFwiZlxcXCIgYm4tbGF6enk9XFxcIjEwXFxcIiBibi1iaW5kPVxcXCJmaWxlc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uSXRlbUNsaWNrXFxcIj5cXG5cdFx0XHQ8dHIgY2xhc3M9XFxcIml0ZW1cXFwiIGJuLWh0bWw9XFxcImdldEl0ZW1cXFwiPjwvdHI+XFxuXHRcdDwvdGJvZHk+XFxuXHQ8L3RhYmxlPlxcblxcbjwvZGl2PlxcblxcblwiLFxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHsqfSBlbHQgXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IHNydkZpbGVzIFxuXHRcdCAqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHNydkZpbGVzKSB7XG5cblxuXHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLlByb3BzfSAqL1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0c2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uLFxuXHRcdFx0XHRmcmllbmRVc2VyLFxuXHRcdFx0XHRnZXRNUDNJbmZvLFxuXHRcdFx0XHRtcDNGaWx0ZXJzLFxuXHRcdFx0fSA9IHRoaXMucHJvcHNcblxuXHRcdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRzZWxlY3Rpb25FbmFibGVkLFxuXHRcdFx0XHRcdHJvb3REaXI6ICcvJyxcblx0XHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdFx0bXAzRmlsdGVycyxcblxuXHRcdFx0XHRcdGdldEhlYWRlcjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IFtdXG5cdFx0XHRcdFx0XHRkYXRhLnB1c2goJycpXG5cdFx0XHRcdFx0XHRpZiAoZ2V0TVAzSW5mbykge1xuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ1RpdGxlJylcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdBcnRpc3QnKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goJ0R1cmF0aW9uJylcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKCdCUE0nKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnTmFtZScpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnU2l6ZScpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCgnTGFzdCBNb2RpZicpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gZGF0YS5tYXAoKGUpID0+IGA8dGg+JHtlfTwvdGg+YCkuam9pbignJylcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldEl0ZW06IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IFtdXG5cdFx0XHRcdFx0XHRkYXRhLnB1c2goYDxpIGNsYXNzPVwiZmEgZmEtMnggJHtnZXRJY29uQ2xhc3Moc2NvcGUuZil9XCI+PC9pPmApXG5cdFx0XHRcdFx0XHRpZiAoZ2V0TVAzSW5mbykge1xuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2godGhpcy5nZXRUaXRsZShzY29wZSkpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCh0aGlzLmdldEFydGlzdChzY29wZSkpXG5cdFx0XHRcdFx0XHRcdGRhdGEucHVzaCh0aGlzLmdldER1cmF0aW9uKHNjb3BlKSlcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHRoaXMuZ2V0QlBNKHNjb3BlKSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2goc2NvcGUuZi5uYW1lKVxuXHRcdFx0XHRcdFx0XHRkYXRhLnB1c2godGhpcy5nZXRTaXplKHNjb3BlKSlcblx0XHRcdFx0XHRcdFx0ZGF0YS5wdXNoKHRoaXMuZ2V0RGF0ZShzY29wZSkpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gZGF0YS5tYXAoKGUpID0+IGA8dGQ+JHtlfTwvdGQ+YCkuam9pbignJylcblxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0SWNvbkNsYXNzOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiB7IGNsYXNzOiAnZmEgZmEtbGcgJyArIGdldEljb25DbGFzcyhzY29wZS5mKSB9XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldER1cmF0aW9uOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgeyBtcDMgfSA9IHNjb3BlLmZcblx0XHRcdFx0XHRcdGlmIChtcDMgIT0gdW5kZWZpbmVkICYmIG1wMy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICQkLm1lZGlhLmdldEZvcm1hdGVkVGltZShtcDMubGVuZ3RoKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICcnXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldEJQTTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbXAzIH0gPSBzY29wZS5mXG5cdFx0XHRcdFx0XHRpZiAobXAzICE9IHVuZGVmaW5lZCAmJiBtcDMuYnBtKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBtcDMuYnBtXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJydcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9LFx0XHRcdFx0XHRcblxuXHRcdFx0XHRcdGdldEFydGlzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7IG1wMyB9ID0gc2NvcGUuZlxuXHRcdFx0XHRcdFx0aWYgKG1wMyAhPSB1bmRlZmluZWQgJiYgbXAzLmFydGlzdCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbXAzLmFydGlzdFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldFRpdGxlOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbXAzLCBmb2xkZXIsIG5hbWUgfSA9IHNjb3BlLmZcblx0XHRcdFx0XHRcdGlmIChmb2xkZXIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5hbWVcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChtcDMgIT0gdW5kZWZpbmVkICYmIG1wMy50aXRsZSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbXAzLnRpdGxlXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aXNJbkZpbHRlcjogZnVuY3Rpb24gKG1wM0luZm8pIHtcblx0XHRcdFx0XHRcdHZhciByZXQgPSB0cnVlXG5cdFx0XHRcdFx0XHRmb3IgKGxldCBmIGluIHRoaXMubXAzRmlsdGVycykge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXInLCBmKVxuXHRcdFx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IG1wM0luZm9bZl1cblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndmFsdWUnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsdGVyVmFsdWUgPSB0aGlzLm1wM0ZpbHRlcnNbZl1cblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVyVmFsdWUnLCBmaWx0ZXJWYWx1ZSlcblx0XHRcdFx0XHRcdFx0aWYgKGZpbHRlclZhbHVlICE9ICdBbGwnKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0ICY9IChmaWx0ZXJWYWx1ZSA9PT0gdmFsdWUpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3JldCcsIHJldClcblx0XHRcdFx0XHRcdHJldHVybiByZXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RmlsZXM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLm1wM0ZpbHRlcnMgPT09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXNcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGVzLmZpbHRlcigoZikgPT4ge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZi5mb2xkZXIgfHwgKGYubXAzICYmIGYubXAzICYmIHRoaXMuaXNJbkZpbHRlcihmLm1wMykpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0UGF0aDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdGFiID0gKCcvaG9tZScgKyB0aGlzLnJvb3REaXIpLnNwbGl0KCcvJylcblx0XHRcdFx0XHRcdHRhYi5zaGlmdCgpXG5cdFx0XHRcdFx0XHR0YWIucG9wKClcblx0XHRcdFx0XHRcdHJldHVybiB0YWJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzTGFzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IHRoaXMuZ2V0UGF0aCgpLmxlbmd0aCAtIDFcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzRmlyc3Q6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmlkeCA9PSAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoSW5mbzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRQYXRoKCkuc2xpY2UoMSwgc2NvcGUuaWR4ICsgMSkuam9pbignLycpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLmYuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bGV0IHNpemUgPSBzY29wZS5mLnNpemVcblx0XHRcdFx0XHRcdGxldCB1bml0ID0gJ29jdGV0cydcblx0XHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0XHR1bml0ID0gJ0tvJ1xuXHRcdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnTW8nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzaXplID0gTWF0aC5mbG9vcihzaXplICogMTApIC8gMTBcblx0XHRcdFx0XHRcdHJldHVybiBzaXplICsgJyAnICsgdW5pdFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXREYXRlOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS5mLm10aW1lKS50b0xvY2FsZURhdGVTdHJpbmcoKVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRvblBhdGhJdGVtOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBhdGhJdGVtID0gJCh0aGlzKS5kYXRhKCdpbmZvJylcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUGF0aEl0ZW0nLCBwYXRoSXRlbSlcblx0XHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRcdGNvbnN0IG5ld0RpciA9IHBhdGhJdGVtID09ICcnID8gJy8nIDogJy8nICsgcGF0aEl0ZW0gKyAnLydcblxuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdkaXJjaGFuZ2UnLCB7IG5ld0RpciB9KVxuXG5cblx0XHRcdFx0XHRcdGxvYWREYXRhKG5ld0Rpcilcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpZHgnLCBpZHgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdFx0aWYgKGluZm8uZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGRpck5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHRcdFx0Y29uc3QgbmV3RGlyID0gY3RybC5tb2RlbC5yb290RGlyICsgZGlyTmFtZSArICcvJ1xuXHRcdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZGlyY2hhbmdlJywgeyBuZXdEaXIgfSlcblx0XHRcdFx0XHRcdFx0bG9hZERhdGEobmV3RGlyKVxuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0aWYgKHNlbGVjdGlvbkVuYWJsZWQpIHtcblx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLmNsb3Nlc3QoJ3Rib2R5JykuZmluZCgnLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0cm9vdERpcjogY3RybC5tb2RlbC5yb290RGlyLFxuXHRcdFx0XHRcdFx0XHRcdGlzSW1hZ2U6IGluZm8uaXNJbWFnZSxcblx0XHRcdFx0XHRcdFx0XHRtcDM6IGluZm8ubXAzXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZmlsZWNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0LyoqQHR5cGUge0pRdWVyeX0gKi9cblx0XHRcdGNvbnN0IGZpbGVzID0gY3RybC5zY29wZS5maWxlc1xuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyLCByZXNldEZpbHRlcnMpIHtcblx0XHRcdFx0aWYgKHJvb3REaXIgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2xvYWREYXRhJywgcm9vdERpcilcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbG9hZGluZzogdHJ1ZSB9KVxuXHRcdFx0XHRsZXQgZmlsZXMgPSBhd2FpdCBzcnZGaWxlcy5saXN0KHJvb3REaXIsIHsgZmlsdGVyRXh0ZW5zaW9uLCBnZXRNUDNJbmZvIH0sIGZyaWVuZFVzZXIpXG5cdFx0XHRcdGlmIChnZXRNUDNJbmZvKSB7XG5cdFx0XHRcdFx0ZmlsZXMgPSBmaWxlcy5maWx0ZXIoKGYpID0+IGYuZm9sZGVyIHx8IChmLm1wMyAhPSB1bmRlZmluZWQgJiYgZi5tcDMudGl0bGUpKVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cblx0XHRcdFx0c29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRcdGlmIChyZXNldEZpbHRlcnMgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5tcDNGaWx0ZXJzID0gbnVsbFxuXHRcdFx0XHR9XG5cblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdHJvb3REaXJcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRpZiAoc2VsZWN0aW9uRW5hYmxlZCkge1xuXHRcdFx0XHRcdGN0cmwuc2NvcGUuZmlsZXMuZmluZCgnLml0ZW0nKS5lcSgwKS5hZGRDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdGxvYWREYXRhKClcblxuXG5cdFx0XHR0aGlzLmdldFJvb3REaXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5lbnRlclNlbEZvbGRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBzZWxFbHQgPSBmaWxlcy5maW5kKCcuYWN0aXZlJylcblx0XHRcdFx0Y29uc3QgaWR4ID0gc2VsRWx0LmluZGV4KClcblx0XHRcdFx0Y29uc29sZS5sb2coJ2VudGVyU2VsRm9sZGVyJywgaWR4KVxuXHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblx0XHRcdFx0Y29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRpZiAoaW5mby5mb2xkZXIpIHtcblx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0Y29uc3QgbmV3RGlyID0gY3RybC5tb2RlbC5yb290RGlyICsgZGlyTmFtZSArICcvJ1xuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdkaXJjaGFuZ2UnLCB7IG5ld0RpciB9KVxuXHRcdFx0XHRcdGxvYWREYXRhKG5ld0RpcilcblxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZWxVcCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsRWx0ID0gZmlsZXMuZmluZCgnLmFjdGl2ZScpXG5cdFx0XHRcdGNvbnN0IGlkeCA9IHNlbEVsdC5pbmRleCgpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbFVwJywgaWR4KVxuXHRcdFx0XHRpZiAoaWR4ID4gMCkge1xuXHRcdFx0XHRcdHNlbEVsdC5yZW1vdmVDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRjb25zdCBpdGVtcyA9IGZpbGVzLmZpbmQoJy5pdGVtJylcblx0XHRcdFx0XHRpdGVtcy5lcShpZHggLSAxKS5hZGRDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRpZiAoaWR4IC0xID4gMCkge1xuXHRcdFx0XHRcdFx0aXRlbXMuZXEoaWR4IC0gMikuZ2V0KDApLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGl0ZW1zLmVxKGlkeCAtIDEpLmdldCgwKS5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9zZWxFbHQuZ2V0KDApLnNjcm9sbEludG9WaWV3KClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNlbERvd24gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IHNlbEVsdCA9IGZpbGVzLmZpbmQoJy5hY3RpdmUnKVxuXHRcdFx0XHRjb25zdCBpZHggPSBzZWxFbHQuaW5kZXgoKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxEb3duJywgaWR4KVxuXHRcdFx0XHRpZiAoaWR4IDwgY3RybC5tb2RlbC5maWxlcy5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdFx0c2VsRWx0LnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHRcdGZpbGVzLmZpbmQoJy5pdGVtJykuZXEoaWR4ICsgMSkuYWRkQ2xhc3MoJ2FjdGl2ZScpLmdldCgwKS5zY3JvbGxJbnRvVmlldyhmYWxzZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldFNlbEZpbGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9IGN0cmwuc2NvcGUuZmlsZXMuZmluZCgnLmFjdGl2ZScpLmluZGV4KClcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaWR4JywgaWR4KVxuXHRcdFx0XHRpZiAoaWR4IDwgMCkgcmV0dXJuIG51bGxcblx0XHRcdFx0Y29uc3QgeyBtcDMsIG5hbWUgfSA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cdFx0XHRcdGNvbnN0IHVybCA9IHNydkZpbGVzLmZpbGVVcmwoY3RybC5tb2RlbC5yb290RGlyICsgbmFtZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0cmV0dXJuIHsgbmFtZSwgbXAzLCB1cmwgfVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2V0TVAzRmlsdGVycyA9IGZ1bmN0aW9uIChtcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IG1wM0ZpbHRlcnMgfSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRNUDNGaWx0ZXJzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5tcDNGaWx0ZXJzXG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxufSkoKTtcbiIsIi8vQHRzLWNoZWNrXG4oZnVuY3Rpb24gKCkge1xuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG5cdCAqIEByZXR1cm5zIFxuXHQgKi9cblx0ZnVuY3Rpb24gZ2V0SWNvbkNsYXNzKG5hbWUpIHtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5wZGYnKSkge1xuXHRcdFx0cmV0dXJuICdmYSBmYS1maWxlLXBkZiB3My10ZXh0LXJlZCdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5oZG9jJykpIHtcblx0XHRcdHJldHVybiAnZmEgZmEtZmlsZS13b3JkIHczLXRleHQtYmx1ZSdcblx0XHR9XG5cblx0XHRpZiAoKC9cXC4ob2dnfG1wMykkL2kpLnRlc3QobmFtZSkpIHtcblx0XHRcdHJldHVybiAnZmEgZmEtZmlsZS1hdWRpbyB3My10ZXh0LXB1cnBsZSdcblx0XHR9XG5cdFx0aWYgKCgvXFwuKG1wNHx3ZWJtfDNncCkkL2kpLnRlc3QobmFtZSkpIHtcblx0XHRcdHJldHVybiAnZmEgZmEtZmlsZS12aWRlbyB3My10ZXh0LW9yYW5nZSdcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy56aXAnKSkge1xuXHRcdFx0cmV0dXJuICdmYSBmYS1maWxlLWFyY2hpdmUgdzMtdGV4dC1hbWJlcidcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhYiBmYS1qcyB3My10ZXh0LXllbGxvdydcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5odG1sJykpIHtcblx0XHRcdHJldHVybiAnZmFiIGZhLWh0bWw1IHczLXRleHQtYmx1ZSdcblx0XHR9XHRcblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnB5JykpIHtcblx0XHRcdHJldHVybiAnZmFiIGZhLXB5dGhvbiB3My10ZXh0LWJsdWUnXG5cdFx0fVx0XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5ycycpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWJyYW5kcyBmYS1ydXN0IHczLXRleHQtb3JhbmdlJ1xuXHRcdH1cdFxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuc3ZnJykpIHtcblx0XHRcdHJldHVybiAnZmFyIGZhLWZpbGUtaW1hZ2UgdzMtdGV4dC1yZWQnXG5cdFx0fVx0XG5cdFx0aWYgKCgvXFwuKGNwcHxjfGgpJC9pKS50ZXN0KG5hbWUpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhIGZhLWZpbGUtYWx0IHczLXRleHQtZ3JlZW4nXG5cdFx0fVxuXHRcdHJldHVybiAnZmEgZmEtZmlsZSB3My10ZXh0LWJsdWUtZ3JleSdcblx0fVxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5GaWxlSW5mb1tdfSBmaWxlcyBcblx0ICovXG5cdGZ1bmN0aW9uIHNvcnRGaWxlcyhmaWxlcykge1xuXHRcdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0XHRcdGlmIChhLmZvbGRlciAmJiAhYi5mb2xkZXIpIHtcblx0XHRcdFx0cmV0dXJuIC0xXG5cdFx0XHR9XG5cdFx0XHRpZiAoIWEuZm9sZGVyICYmIGIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKVxuXHRcdH0pXG5cdH1cblxuXHQkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXHRcdHByb3BzOiB7XG5cdFx0XHRzZWxlY3Rpb25FbmFibGVkOiBmYWxzZSxcblx0XHRcdGZvbGRlclNlbGVjdGlvbkVuYWJsZWQ6IHRydWUsXG5cdFx0XHRpbWFnZU9ubHk6IGZhbHNlLFxuXHRcdFx0ZmlsdGVyRXh0ZW5zaW9uOiB1bmRlZmluZWQsXG5cdFx0XHRnZXRNUDNJbmZvOiBmYWxzZSxcblx0XHRcdGZyaWVuZFVzZXI6ICcnLFxuXHRcdFx0bXAzRmlsdGVyczogbnVsbCxcblx0XHRcdHJvb3REaXI6ICcvJyxcblx0XHRcdG1lbnVJdGVtczogZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIHt9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHRlbXBsYXRlOiBcIlxcbjxkaXYgYm4tdGV4dD1cXFwiaW5mb1xcXCIgYm4tYmluZD1cXFwiaW5mb1xcXCIgY2xhc3M9XFxcImluZm9cXFwiPjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdGxvYWRpbmcgLi4uXFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwicGF0aFBhbmVsXFxcIiBibi1ldmVudD1cXFwiY2xpY2sucGF0aEl0ZW06IG9uUGF0aEl0ZW1cXFwiIGJuLXNob3c9XFxcIiFsb2FkaW5nXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZ2V0UGF0aFxcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1jaGV2cm9uLXJpZ2h0XFxcIiBibi1zaG93PVxcXCIhaXNGaXJzdFxcXCI+PC9pPlxcblx0XHQ8c3Bhbj5cXG5cdFx0XHQ8YSBjbGFzcz1cXFwicGF0aEl0ZW1cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgaHJlZj1cXFwiI1xcXCIgYm4tc2hvdz1cXFwiIWlzTGFzdFxcXCIgYm4tZGF0YT1cXFwie2luZm86IGdldFBhdGhJbmZvfVxcXCI+PC9hPlxcblx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaVxcXCIgYm4tc2hvdz1cXFwiaXNMYXN0XFxcIiBjbGFzcz1cXFwibGFzdEl0ZW1cXFwiPjwvc3Bhbj5cXG5cXG5cdFx0PC9zcGFuPlxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblxcblx0PGRpdiBcXG5cdFx0Ym4tZWFjaD1cXFwiZ2V0RmlsZXNcXFwiIFxcblx0XHRibi1pdGVyPVxcXCJmXFxcIiBcXG5cdFx0Ym4tbGF6enk9XFxcIjEwXFxcIiBcXG5cdFx0Ym4tYmluZD1cXFwiZmlsZXNcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2suZm9sZGVyOiBvbkZvbGRlckNsaWNrLCBjbGljay5jaGVjazogb25DaGVja0NsaWNrLCBjbGljay5maWxlOiBvbkZpbGVDbGljaywgY29udGV4dG1lbnVjaGFuZ2UudGh1bWJuYWlsOiBvbkNvbnRleHRNZW51XFxcIlxcblx0XHRjbGFzcz1cXFwiY29udGFpbmVyXFxcIlxcblx0Plxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ0aHVtYm5haWwgdzMtY2FyZC0yXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGdldEl0ZW1zfVxcXCI+XFxuXFxuXHRcdFx0PHNwYW4gYm4taWY9XFxcImlmMVxcXCI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLXNob3c9XFxcInNob3dDaGVja1NlbGVjdGlvblxcXCIgY2xhc3M9XFxcImNoZWNrIHczLWNoZWNrXFxcIlxcblx0XHRcdFx0XHRibi1wcm9wPVxcXCJ7Y2hlY2tlZDogJHNjb3BlLmYuY2hlY2tlZH1cXFwiPlxcblx0XHRcdDwvc3Bhbj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCIkc2NvcGUuZi5mb2xkZXJcXFwiIGNsYXNzPVxcXCJmb2xkZXIgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLTR4IGZhLWZvbGRlci1vcGVuIHczLXRleHQtZGVlcC1vcmFuZ2VcXFwiPjwvaT5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiIGJuLWlmPVxcXCJpZjFcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgYm4taWY9XFxcImlmMlxcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjbGFzczF9XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHRcdDxkaXYgYm4taWY9XFxcImlzTVAzXFxcIiBjbGFzcz1cXFwiZmlsZSBpdGVtXFxcIj5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImljb25cXFwiPlxcblx0XHRcdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNsYXNzMX1cXFwiPjwvaT5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxkaXY+VGl0bGU6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMudGl0bGVcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblxcblx0XHRcdFx0XHQ8ZGl2PkFydGlzdDombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm1wMy5hcnRpc3RcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcImhhc0dlbnJlXFxcIj5HZW5yZTombmJzcDs8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm1wMy5nZW5yZVxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXHRcdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiZ2V0RHVyYXRpb25cXFwiPkR1cmF0aW9uOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiZ2V0RHVyYXRpb25cXFwiPjwvc3Ryb25nPjwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcImhhc1llYXJcXFwiPiBZZWFyOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiZ2V0WWVhclxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpZjNcXFwiIGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogZ2V0VGh1bWJuYWlsVXJsfVxcXCI+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGltZW5zaW9uXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cIixcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7Kn0gZWx0IFxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBzcnZGaWxlcyBcblx0XHQgKi9cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0XHRjb25zdCB0aHVtYm5haWxTaXplID0gJzEwMHg/J1xuXG5cdFx0XHRsZXQgc2VsZWN0ZWQgPSBmYWxzZVxuXG5cdFx0XHQvKipAdHlwZSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuUHJvcHN9ICovXG5cdFx0XHRsZXQge1xuXHRcdFx0XHRzZWxlY3Rpb25FbmFibGVkLFxuXHRcdFx0XHRmb2xkZXJTZWxlY3Rpb25FbmFibGVkLFxuXHRcdFx0XHRmaWx0ZXJFeHRlbnNpb24sXG5cdFx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRcdGltYWdlT25seSxcblx0XHRcdFx0Z2V0TVAzSW5mbyxcblx0XHRcdFx0bXAzRmlsdGVycyxcdFx0XHRcdFxuXHRcdFx0XHRtZW51SXRlbXNcblx0XHRcdH0gPSB0aGlzLnByb3BzIFxuXG5cdFx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdldEl0ZW1zOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBtZW51SXRlbXMoc2NvcGUuZilcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdHNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdFx0Zm9sZGVyU2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0XHRyb290RGlyOiB0aGlzLnByb3BzLnJvb3REaXIsXG5cdFx0XHRcdFx0ZmlsZXM6IFtdLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnMsXG5cdFx0XHRcdFx0aW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0bGV0IG5iRmlsZXMgPSAwXG5cdFx0XHRcdFx0XHRsZXQgbmJGb2xkZXJzID0gMFxuXHRcdFx0XHRcdFx0dGhpcy5nZXRGaWxlcygpLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKGkuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGkubmFtZSAhPSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRuYkZvbGRlcnMrK1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRuYkZpbGVzKytcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0bGV0IHJldCA9IFtdXG5cdFx0XHRcdFx0XHRpZiAobmJGb2xkZXJzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG5iRm9sZGVycyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJzYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChuYkZpbGVzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZWApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobmJGaWxlcyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZXNgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldC5qb2luKCcgLyAnKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRpc0luRmlsdGVyOiBmdW5jdGlvbiAobXAzSW5mbykge1xuXHRcdFx0XHRcdFx0dmFyIHJldCA9IHRydWVcblx0XHRcdFx0XHRcdGZvciAobGV0IGYgaW4gdGhpcy5tcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlcicsIGYpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gbXAzSW5mb1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd2YWx1ZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWx0ZXJWYWx1ZSA9IHRoaXMubXAzRmlsdGVyc1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXJWYWx1ZScsIGZpbHRlclZhbHVlKVxuXHRcdFx0XHRcdFx0XHRpZiAoZmlsdGVyVmFsdWUgIT0gJ0FsbCcpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQgJj0gKGZpbHRlclZhbHVlID09PSB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRGaWxlczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMubXAzRmlsdGVycyA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlc1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXMuZmlsdGVyKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmLmZvbGRlciB8fCAoZi5tcDMgJiYgZi5tcDMgJiYgdGhpcy5pc0luRmlsdGVyKGYubXAzKSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc01QMzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2V0TVAzSW5mbyAmJiBzY29wZS5mLm1wMyAhPSB1bmRlZmluZWQgJiYgc2NvcGUuZi5tcDMudGl0bGUgIT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0XHRcdHNjb3BlLmYubXAzLnRpdGxlICE9ICcnXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB0YWIgPSAoJy9ob21lJyArIHRoaXMucm9vdERpcikuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdFx0dGFiLnNoaWZ0KClcblx0XHRcdFx0XHRcdHRhYi5wb3AoKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRhYlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNMYXN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gdGhpcy5nZXRQYXRoKCkubGVuZ3RoIC0gMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNGaXJzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFBhdGhJbmZvOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmdldFBhdGgoKS5zbGljZSgxLCBzY29wZS5pZHggKyAxKS5qb2luKCcvJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aGFzR2VucmU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0bGV0IHsgZ2VucmUgfSA9IHNjb3BlLmYubXAzXG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2VucmUgIT0gdW5kZWZpbmVkICYmIGdlbnJlICE9ICcnICYmICFnZW5yZS5zdGFydHNXaXRoKCcoJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aGFzWWVhcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQgeyB5ZWFyIH0gPSBzY29wZS5mLm1wM1xuXHRcdFx0XHRcdFx0cmV0dXJuIHllYXIgIT0gdW5kZWZpbmVkICYmIHllYXIgIT0gJydcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0WWVhcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcGFyc2VJbnQoc2NvcGUuZi5tcDMueWVhcilcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0VGh1bWJuYWlsVXJsOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzcnZGaWxlcy5maWxlVGh1bWJuYWlsVXJsKHRoaXMucm9vdERpciArIHNjb3BlLmYubmFtZSwgdGh1bWJuYWlsU2l6ZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlmMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuZi5uYW1lICE9ICcuLidcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0c2hvd0NoZWNrU2VsZWN0aW9uOiBmdW5jdGlvbihzY29wZSlcdHtcblx0XHRcdFx0XHRcdGxldCByZXQgPSB0aGlzLnNlbGVjdGlvbkVuYWJsZWRcblx0XHRcdFx0XHRcdGlmIChzY29wZS5mLmZvbGRlcikgIHsgcmV0ICY9IHRoaXMuZm9sZGVyU2VsZWN0aW9uRW5hYmxlZH1cblx0XHRcdFx0XHRcdHJldHVybiByZXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aWYyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAhc2NvcGUuZi5mb2xkZXIgJiYgIXNjb3BlLmYuaXNJbWFnZSAmJiAhdGhpcy5pc01QMyhzY29wZSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlmMzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmIHNjb3BlLmYuaXNJbWFnZVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Y2xhc3MxOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBgZmEtNHggJHtnZXRJY29uQ2xhc3Moc2NvcGUuZi5uYW1lKX1gXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGxldCBzaXplID0gc2NvcGUuZi5zaXplXG5cdFx0XHRcdFx0XHRsZXQgdW5pdCA9ICdvY3RldHMnXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdFx0dW5pdCA9ICdLbydcblx0XHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0XHR1bml0ID0gJ01vJ1xuXHRcdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c2l6ZSA9IE1hdGguZmxvb3Ioc2l6ZSAqIDEwKSAvIDEwXG5cdFx0XHRcdFx0XHRyZXR1cm4gJ1NpemU6ICcgKyBzaXplICsgJyAnICsgdW5pdFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXREaW1lbnNpb246IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgZCA9IHNjb3BlLmYuZGltZW5zaW9uXG5cdFx0XHRcdFx0XHRyZXR1cm4gYERpbWVuc2lvbjogJHtkLndpZHRofXgke2QuaGVpZ2h0fWBcblx0XHRcdFx0XHR9LFxuXG5cblx0XHRcdFx0XHRnZXREYXRlOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShzY29wZS5mLm10aW1lKS50b0xvY2FsZURhdGVTdHJpbmcoKVxuXHRcdFx0XHRcdFx0cmV0dXJuICdMYXN0IE1vZGlmOiAnICsgZGF0ZVxuXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldER1cmF0aW9uOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLmYubXAzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJCQubWVkaWEuZ2V0Rm9ybWF0ZWRUaW1lKHNjb3BlLmYubXAzLmxlbmd0aClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0XHRcdH1cblxuXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0b25QYXRoSXRlbTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwYXRoSXRlbSA9ICQodGhpcykuZGF0YSgnaW5mbycpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBhdGhJdGVtJywgcGF0aEl0ZW0pXG5cdFx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0XHRjb25zdCBuZXdEaXIgPSBwYXRoSXRlbSA9PSAnJyA/ICcvJyA6ICcvJyArIHBhdGhJdGVtICsgJy8nXG5cblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZGlyY2hhbmdlJywgeyBuZXdEaXIgfSlcblxuXG5cdFx0XHRcdFx0XHRsb2FkRGF0YShuZXdEaXIpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uQ29udGV4dE1lbnU6IGFzeW5jIGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IHsgbmFtZSB9ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblxuXHRcdFx0XHRcdFx0Y29uc3QgeyByb290RGlyIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2NvbnRleHRtZW51SXRlbScsIHsgY21kLCBpZHgsIG5hbWUsIHJvb3REaXIgfSlcblxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHRcdFx0ZmlsZU5hbWU6IGluZm8ubmFtZSxcblx0XHRcdFx0XHRcdFx0cm9vdERpcjogY3RybC5tb2RlbC5yb290RGlyLFxuXHRcdFx0XHRcdFx0XHRpc0ltYWdlOiBpbmZvLmlzSW1hZ2UsXG5cdFx0XHRcdFx0XHRcdG1wMzogaW5mby5tcDNcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkNoZWNrQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cdFx0XHRcdFx0XHRpbmZvLmNoZWNrZWQgPSAkKHRoaXMpLmdldFZhbHVlKClcblxuXHRcdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKClcblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdzZWxjaGFuZ2UnLCB7IGlzU2hhcmVTZWxlY3RlZDogaXNTaGFyZVNlbGVjdGVkKCkgfSlcblxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25Gb2xkZXJDbGljazogZnVuY3Rpb24gKGV2KSB7XG5cblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXG5cdFx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gaW5mby5uYW1lXG5cdFx0XHRcdFx0XHRjb25zdCBuZXdEaXIgPSBjdHJsLm1vZGVsLnJvb3REaXIgKyBkaXJOYW1lICsgJy8nXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2RpcmNoYW5nZScsIHsgbmV3RGlyIH0pXG5cdFx0XHRcdFx0XHRsb2FkRGF0YShuZXdEaXIpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWREYXRhKHJvb3REaXIsIHJlc2V0RmlsdGVycykge1xuXHRcdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRyb290RGlyID0gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbG9hZERhdGEnLCByb290RGlyKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBsb2FkaW5nOiB0cnVlIH0pXG5cdFx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgc3J2RmlsZXMubGlzdChyb290RGlyLCB7IGZpbHRlckV4dGVuc2lvbiwgaW1hZ2VPbmx5LCBnZXRNUDNJbmZvIH0sIGZyaWVuZFVzZXIpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cblx0XHRcdFx0c29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRcdGlmIChyZXNldEZpbHRlcnMgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5tcDNGaWx0ZXJzID0gbnVsbFxuXHRcdFx0XHR9XG5cblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdHJvb3REaXIsXG5cdFx0XHRcdFx0bmJTZWxlY3Rpb246IDBcblx0XHRcdFx0fSlcblxuXHRcdFx0fVxuXG5cdFx0XHRsb2FkRGF0YSgpXG5cblx0XHRcdGZ1bmN0aW9uIGlzU2hhcmVTZWxlY3RlZCgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwucm9vdERpciA9PSAnLycgJiZcblx0XHRcdFx0XHQoY3RybC5tb2RlbC5maWxlcy5maW5kSW5kZXgoKGYpID0+IGYubmFtZSA9PSAnc2hhcmUnICYmIGYuZm9sZGVyICYmIGYuY2hlY2tlZCkgIT0gLTEpXG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRTZWxGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBbXVxuXHRcdFx0XHRjdHJsLm1vZGVsLmZpbGVzLmZvckVhY2goKGYsIGlkeCkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHsgbmFtZSwgY2hlY2tlZCB9ID0gZlxuXHRcdFx0XHRcdGlmIChjaGVja2VkID09PSB0cnVlICYmIG5hbWUgIT0gJy4uJykge1xuXHRcdFx0XHRcdFx0c2VsRmlsZXMucHVzaCh7IGZpbGVOYW1lOiBjdHJsLm1vZGVsLnJvb3REaXIgKyBuYW1lLCBpZHggfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdFx0cmV0dXJuIHNlbEZpbGVzXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0U2VsRmlsZU5hbWVzID0gKCkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRTZWxGaWxlcygpLm1hcCgoZikgPT4gZi5maWxlTmFtZSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXROYlNlbEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJykubGVuZ3RoXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudG9nZ2xlU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRzZWxlY3RlZCA9ICFzZWxlY3RlZFxuXHRcdFx0XHRlbHQuZmluZCgnLmNoZWNrJykucHJvcCgnY2hlY2tlZCcsIHNlbGVjdGVkKVxuXHRcdFx0XHRjdHJsLm1vZGVsLmZpbGVzLmZvckVhY2goKGYpID0+IHsgZi5jaGVja2VkID0gc2VsZWN0ZWQgfSlcblx0XHRcdFx0Y3RybC51cGRhdGVBcnJheVZhbHVlKCdmaWxlcycsICdmaWxlcycpXG5cdFx0XHRcdGVsdC50cmlnZ2VyKCdzZWxjaGFuZ2UnLCB7IGlzU2hhcmVTZWxlY3RlZDogaXNTaGFyZVNlbGVjdGVkKCkgfSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRSb290RGlyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaW5zZXJ0RmlsZSA9IGZ1bmN0aW9uIChmaWxlSW5mbywgaWR4KSB7XG5cdFx0XHRcdGlmIChpZHgpIHtcblx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUFmdGVyKCdmaWxlcycsIGlkeCwgZmlsZUluZm8sICdmaWxlcycpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0aWR4ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbHRlcigoZikgPT4gZi5mb2xkZXIpLmxlbmd0aFxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0XHRpZiAoaWR4ID09IDApIHsgLy8gbm8gZm9sZGVyLCBpbnNlcnQgYXQgdGhlIGJlZ2luaW5nXG5cdFx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUJlZm9yZSgnZmlsZXMnLCAwLCBmaWxlSW5mbywgJ2ZpbGVzJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7IC8vIGluc2VydCBhZnRlciBsYXN0IGZvbGRlclxuXHRcdFx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1BZnRlcignZmlsZXMnLCBpZHggLSAxLCBmaWxlSW5mbywgJ2ZpbGVzJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGUoJ2luZm8nKVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMucmVtb3ZlRmlsZXMgPSBmdW5jdGlvbiAoaW5kZXhlcykge1xuXHRcdFx0XHRjdHJsLnJlbW92ZUFycmF5SXRlbSgnZmlsZXMnLCBpbmRleGVzLCAnZmlsZXMnKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGUoJ2luZm8nKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVGaWxlID0gZnVuY3Rpb24gKGlkeCwgaW5mbykge1xuXHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5SXRlbSgnZmlsZXMnLCBpZHgsIGluZm8sICdmaWxlcycpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXBkYXRlRmlsZUluZm8gPSBhc3luYyBmdW5jdGlvbiAoZmlsZU5hbWUsIG9wdGlvbnMpIHtcblx0XHRcdFx0Y29uc3QgeyBmaWxlcywgcm9vdERpciB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRsZXQgaWR4ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbmRJbmRleCgoaSkgPT4gaS5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZUZpbGUnLCBpZHgsIGZpbGVOYW1lLCBvcHRpb25zKVxuXHRcdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgc3J2RmlsZXMuZmlsZUluZm8ocm9vdERpciArIGZpbGVOYW1lLCBmcmllbmRVc2VyLCBvcHRpb25zKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5SXRlbSgnZmlsZXMnLCBpZHgsIGluZm8pXG5cdFx0XHRcdGlkeCA9IGZpbGVzLmZpbmRJbmRleCgoaSkgPT4gaS5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHRmaWxlc1tpZHhdID0gaW5mb1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5maWxlcy5maWx0ZXIoKGYpID0+ICFmLmZvbGRlcilcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRGaWx0ZXJlZEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbHRlcigoZikgPT4gIWYuZm9sZGVyKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJlbG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGUnKVxuXHRcdFx0XHRsb2FkRGF0YSh1bmRlZmluZWQsIGZhbHNlKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAobXAzRmlsdGVycykge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBtcDNGaWx0ZXJzIH0pXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0TVAzRmlsdGVycyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwubXAzRmlsdGVyc1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cbn0pKCk7XG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZvbGRlcnRyZWUnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBcXG4gICAgYm4tY29udHJvbD1cXFwiYnJhaW5qcy50cmVlXFxcIiBcXG4gICAgYm4tZGF0YT1cXFwie3NvdXJjZTogdHJlZUluZm8sIG9wdGlvbnM6IHRyZWVPcHRpb25zfVxcXCJcXG4gICAgYm4taWZhY2U9XFxcInRyZWVcXFwiXFxuPjwvZGl2PiAgICAgICAgXFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gc3J2RmlsZXNcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCB0cmVlSW5mbyA9IFtcblx0XHRcdHsgdGl0bGU6ICdIb21lIEZpbGVzJywgaWNvbjogJ2ZhIGZhLWhvbWUgdzMtdGV4dC1ibHVlJywgbGF6eTogdHJ1ZSwgZGF0YTogeyBwYXRoOiAnLycgfSB9LFxuXHRcdF1cblxuXHRcdGZ1bmN0aW9uIGNvbmNhdFBhdGgocGF0aCwgZmlsZU5hbWUpIHtcblx0XHRcdGxldCByZXQgPSBwYXRoXG5cdFx0XHRpZiAoIXBhdGguZW5kc1dpdGgoJy8nKSkge1xuXHRcdFx0XHRyZXQgKz0gJy8nXG5cdFx0XHR9XG5cdFx0XHRyZXQgKz0gZmlsZU5hbWVcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRjb25zdCB0cmVlT3B0aW9ucyA9IHtcblx0XHRcdGxhenlMb2FkOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0Y29uc3Qgbm9kZSA9IGRhdGEubm9kZVxuXHRcdFx0XHRjb25zb2xlLmxvZygnbGF6eWxvYWQnLCBub2RlLmRhdGEpXG5cdFx0XHRcdGRhdGEucmVzdWx0ID0gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcblx0XHRcdFx0XHRjb25zdCB7IHBhdGggfSA9IG5vZGUuZGF0YVxuXHRcdFx0XHRcdGNvbnN0IGZvbGRlcnMgPSBhd2FpdCBzcnZGaWxlcy5saXN0KHBhdGgsIHsgZm9sZGVyT25seTogdHJ1ZSB9KVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbGRlcnMnLCBmb2xkZXJzKVxuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdHMgPSBmb2xkZXJzLm1hcCgoZikgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGYubmFtZSxcblx0XHRcdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0XHRcdHBhdGg6IGNvbmNhdFBhdGgocGF0aCwgZi5uYW1lKVx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0bGF6eTogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0Zm9sZGVyOiB0cnVlXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRyZXNvbHZlKHJlc3VsdHMpXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR0cmVlSW5mbyxcblx0XHRcdFx0dHJlZU9wdGlvbnMsXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8qKkB0eXBlIHtCcmFpbmpzLkNvbnRyb2xzLlRyZWUuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IHRyZWUgPSBjdHJsLnNjb3BlLnRyZWVcblxuXG5cdFx0dGhpcy5nZXRTZWxQYXRoID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBub2RlID0gdHJlZS5nZXRBY3RpdmVOb2RlKClcblx0XHRcdHJldHVybiBub2RlLmRhdGEucGF0aFxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdHNob3dTZW5kTWVzc2FnZTogZmFsc2UsXG5cdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogdHJ1ZVxuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZnJpZW5kcycsICdicmVpemJvdC5ub3RpZnMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIGJuLWVhY2g9XFxcImZyaWVuZHNcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLm5vdGlmOiBvblNlbmRNZXNzYWdlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1xcXCI+XFxuXHRcdFxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IG5vdGlmIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE1lc3NhZ2VcXFwiIGJuLXNob3c9XFxcInNob3dTZW5kTWVzc2FnZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlXFxcIj48L2k+XFxuXHRcdDwvc3Bhbj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIiBibi1jbGFzcz1cXFwiY2xhc3MxXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmZyaWVuZFVzZXJOYW1lXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlxcbjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBmcmllbmRzPC9wPlwiLFxuXG5cdC8qKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuSW50ZXJmYWNlfSBicm9rZXIgXG5cdCAqICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZnJpZW5kc1Nydiwgbm90aWZzU3J2LCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IHtzaG93U2VsZWN0aW9uLCBzaG93U2VuZE1lc3NhZ2UsIHNob3dDb25uZWN0aW9uU3RhdGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcmllbmRzOiBbXSxcblx0XHRcdFx0c2hvd1NlbmRNZXNzYWdlLFxuXHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZnJpZW5kcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCAkaSA9IHNjb3BlLiRpXG5cdFx0XHRcdFx0Y29uc3Qgc2hvd0Nvbm5lY3Rpb25TdGF0ZSA9IHRoaXMuc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHQndzMtdGV4dC1ncmVlbic6ICRpLmlzQ29ubmVjdGVkICYmIHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdFx0XHQndzMtdGV4dC1yZWQnOiAhJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LWJsdWUnOiAhc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5zaWJsaW5ncygnLnczLWJsdWUnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCd3My1ibHVlJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZyaWVuZGNsaWNrJywge3VzZXJOYW1lfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TZW5kTWVzc2FnZTogYXN5bmMgZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cblx0XHRcdFx0XHRjb25zdCB1c2VyTmFtZSA9ICBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XS5mcmllbmRVc2VyTmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VuZE1lc3NhZ2UnLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE1lc3NhZ2UnLCBsYWJlbDogJ01lc3NhZ2U6J30pXG5cblx0XHRcdFx0XHRpZiAodGV4dCAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRub3RpZnNTcnYuc2VuZE5vdGlmKHVzZXJOYW1lLCB7dGV4dCwgcmVwbHk6IHRydWV9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQnJva2VyLk1zZ30gbXNnIFxuXHRcdCAqIEByZXR1cm5zIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG9uVXBkYXRlKG1zZykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3Qge2lzQ29ubmVjdGVkLCB1c2VyTmFtZX0gPSBtc2cuZGF0YVxuXHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZnJpZW5kcy5maW5kKChmcmllbmQpID0+IHtyZXR1cm4gZnJpZW5kLmZyaWVuZFVzZXJOYW1lID09IHVzZXJOYW1lfSlcblx0XHRcdGluZm8uaXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZFxuXHRcdFx0Y3RybC51cGRhdGUoKVxuXG5cdFx0fVxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIG9uVXBkYXRlKVxuXG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnN0IGlkeCA9IGVsdC5maW5kKCdsaS53My1ibHVlJykuaW5kZXgoKTtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XVxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0RnJpZW5kcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZnJpZW5kcy5tYXAoKGZyaWVuZCkgPT4gZnJpZW5kLmZyaWVuZFVzZXJOYW1lKVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRmcmllbmRzU3J2LmdldEZyaWVuZHMoKS50aGVuKChmcmllbmRzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tmcmllbmRzXSBkaXNwb3NlJylcblx0XHRcdGJyb2tlci51bnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cdFx0fVxuXG5cblx0XHR0aGlzLnVwZGF0ZSgpXG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTpzdHJpbmc7XG5cdFx0Z2V0RnJpZW5kcygpOltzdHJpbmddXG5cdGAsXG5cblx0JGV2ZW50czogJ2ZyaWVuZGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaG9tZScsIHtcblxuXHRkZXBzOiBbXG5cdFx0J2JyZWl6Ym90LmJyb2tlcicsXG5cdFx0J2JyZWl6Ym90LnVzZXJzJyxcblx0XHQnYnJlaXpib3Qubm90aWZzJyxcblx0XHQnYnJlaXpib3QuZ2VvbG9jJyxcblx0XHQnYnJlaXpib3QucnRjJyxcblx0XHQnYnJlaXpib3QuYXBwcycsXG5cdFx0J2JyZWl6Ym90LnNjaGVkdWxlcicsXG5cdFx0J2JyZWl6Ym90Lndha2Vsb2NrJyxcblx0XHQnYnJlaXpib3QuZnVsbHNjcmVlbidcblx0XSxcblxuXHRwcm9wczoge1xuXHRcdHVzZXJOYW1lOiAnVW5rbm93bidcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJoZWFkZXJcXFwiPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRnVsbFNjcmVlblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkZ1bGxTY3JlZW5cXFwiIGJuLXNob3c9XFxcIiFmdWxsU2NyZWVuXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkV4aXQgRnVsbFNjcmVlblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkV4aXRGdWxsU2NyZWVuXFxcIiBibi1zaG93PVxcXCJmdWxsU2NyZWVuXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY29tcHJlc3NcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQ29ubmVjdGlvbiBTdGF0dXNcXFwiPlxcblx0XHRcdDxpIGJuLWNsYXNzPVxcXCJ7dzMtdGV4dC1ncmVlbjogY29ubmVjdGVkLCB3My10ZXh0LXJlZDogIWNvbm5lY3RlZH1cXFwiIGNsYXNzPVxcXCJmYSBmYS1jaXJjbGVcXFwiPjwvaT5cXG5cXG5cdFx0PC9idXR0b24+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzSW5jb21pbmdDYWxsXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ2FsbFJlc3BvbnNlXFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsIFxcblx0XHRcdFx0dGl0bGU6IGNhbGxJbmZvLmZyb20sXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRhY2NlcHQ6IHtuYW1lOiBcXCdBY2NlcHRcXCd9LFxcblx0XHRcdFx0XHRkZW55OiB7bmFtZTogXFwnRGVjbGluZVxcJ30sXFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNhbGxJbmZvLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuXHQ8IS0tIFx0PHN0cm9uZyBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zdHJvbmc+XFxuIC0tPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWZpY2F0aW9uIHczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIk5vdGlmaWNhdGlvblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYmFkZ2UgdzMtcmVkIHczLXRpbnlcXFwiIGJuLXRleHQ9XFxcIm5iTm90aWZcXFwiIGJuLXNob3c9XFxcImhhc05vdGlmXFxcIj48L3NwYW4+XFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdHNldHRpbmdzOiB7bmFtZTogXFwnU2V0dGluZ3NcXCcsIGljb246IFxcJ2ZhcyBmYS1jb2dcXCd9LFxcblx0XHRcdFx0XHRhcHBzOiB7bmFtZTogXFwnQXBwbGljYXRpb25zXFwnLCBpY29uOiBcXCdmYXMgZmEtdGhcXCd9LFxcblx0XHRcdFx0XHRzZXA6IFxcJy0tLS0tLVxcJyxcXG5cdFx0XHRcdFx0bG9nb3V0OiB7bmFtZTogXFwnTG9nb3V0XFwnLCBpY29uOiBcXCdmYXMgZmEtcG93ZXItb2ZmXFwnfVxcblx0XHRcdFx0fSxcXG5cdFx0XHRcdHRpdGxlOiB1c2VyTmFtZSxcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCdcXG5cdFx0XHR9XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29udGV4dE1lbnVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtdXNlci1jaXJjbGUgZmEtbGdcXFwiPjwvaT5cXG5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMudGFic1xcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiIGJuLWlmYWNlPVxcXCJ0YWJzXFxcIlxcblx0Ym4tZXZlbnQ9XFxcInRhYnNyZW1vdmU6IG9uVGFiUmVtb3ZlLCB0YWJzYWN0aXZhdGU6IG9uVGFiQWN0aXZhdGVcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0YXBwczogZ2V0TXlBcHBzLFxcblx0XHRcdGl0ZW1zXFxuXHRcdH1cXFwiIGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGljaywgYXBwY29udGV4dG1lbnU6IG9uVGlsZUNvbnRleHRNZW51XFxcIiB0aXRsZT1cXFwiSG9tZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQnJva2VyLkludGVyZmFjZX0gYnJva2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlVzZXIuSW50ZXJmYWNlfSB1c2VycyBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ob3RpZi5JbnRlcmZhY2V9IG5vdGlmc1NydiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5HZW9sb2MuSW50ZXJmYWNlfSBnZW9sb2MgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUlRDLkludGVyZmFjZX0gcnRjIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkFwcHMuSW50ZXJmYWNlfSBzcnZBcHBzIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlNjaGVkdWxlci5JbnRlcmZhY2V9IHNjaGVkdWxlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5XYWtlTG9jay5JbnRlcmZhY2V9IHdha2Vsb2NrIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZ1bGxTY3JlZW4uSW50ZXJmYWNlfSBmdWxsc2NyZWVuIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgYnJva2VyLCB1c2Vycywgbm90aWZzU3J2LCBnZW9sb2MsIHJ0Yywgc3J2QXBwcywgc2NoZWR1bGVyLCB3YWtlbG9jaywgZnVsbHNjcmVlbikge1xuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQXVkaW8oKSB7XG5cdFx0XHRsZXQgYXVkaW8gPSBudWxsXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gcGxheScpXG5cdFx0XHRcdFx0YXVkaW8gPSBuZXcgQXVkaW8oJy9hc3NldHMvc2t5cGUubXAzJylcblx0XHRcdFx0XHRhdWRpby5sb29wID0gdHJ1ZVxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4geyBhdWRpby5wbGF5KCkgfSwgMTAwKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBzdG9wJylcblx0XHRcdFx0XHRpZiAoYXVkaW8gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhdWRpbyA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ0Yy5wcm9jZXNzQ2FsbCgpXG5cblx0XHRydGMub24oJ2NhbGwnLCBmdW5jdGlvbiAoY2FsbEluZm8pIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogdHJ1ZSwgY2FsbEluZm8gfSlcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRydGMub24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogZmFsc2UgfSlcblx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdH0pXG5cblx0XHRjb25zdCB7IHVzZXJOYW1lIH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBhdWRpbyA9IGNyZWF0ZUF1ZGlvKClcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW10sXG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsSW5mbzogbnVsbCxcblx0XHRcdFx0ZnVsbFNjcmVlbjogZmFsc2UsXG5cdFx0XHRcdGNvbm5lY3RlZDogZmFsc2UsXG5cdFx0XHRcdGhhc05vdGlmOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubmJOb3RpZiA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0TXlBcHBzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXBwcy5maWx0ZXIoKGEpID0+IGEuYWN0aXZhdGVkKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpdGVtczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRyZW1vdmU6IHsgbmFtZTogJ1JlbW92ZScgfVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0YXdhaXQgdXNlcnMuYWN0aXZhdGVBcHAoZGF0YS5hcHBOYW1lLCBmYWxzZSlcblx0XHRcdFx0XHRsb2FkQXBwKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BcHBDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0b3BlbkFwcChkYXRhLmFwcE5hbWUpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhcHBzJykge1xuXHRcdFx0XHRcdFx0b3BlbkFwcCgnc3RvcmUnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ3NldHRpbmdzJykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc2V0dGluZ3MgPSBhd2FpdCB1c2Vycy5nZXRVc2VyU2V0dGluZ3MoKVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3NldHRpbmcnLCBzZXR0aW5ncylcblx0XHRcdFx0XHRcdG9wZW5BcHAoJ3NldHRpbmdzJywgc2V0dGluZ3MpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyBjb250ZW50OiAnbm8gbm90aWZpY2F0aW9ucycsIHRpdGxlOiAnTm90aWZpY2F0aW9ucycgfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdub3RpZicpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNhbGxSZXNwb25zZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzSW5jb21pbmdDYWxsOiBmYWxzZSB9KVxuXHRcdFx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgZnJvbSwgYXBwTmFtZSB9ID0gY3RybC5tb2RlbC5jYWxsSW5mb1xuXHRcdFx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNhbGxlcjogZnJvbSxcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1xuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkV4aXRGdWxsU2NyZWVuOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25FeGl0RnVsbFNjcmVlbicpXG5cdFx0XHRcdFx0ZnVsbHNjcmVlbi5leGl0KClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZ1bGxTY3JlZW46IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRnVsbFNjcmVlbicpXG5cdFx0XHRcdFx0ZnVsbHNjcmVlbi5lbnRlcigpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiUmVtb3ZlOiBmdW5jdGlvbiAoZXYsIGlkeCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGFiUmVtb3ZlJywgaWR4KVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSB0YWJzLmdldFRhYkluZm8oaWR4KVxuXHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwRXhpdCgpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0dGFicy5yZW1vdmVUYWIoaWR4KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiQWN0aXZhdGU6IGZ1bmN0aW9uIChldiwgdWkpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRhYkFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB7IG5ld1RhYiwgb2xkVGFiIH0gPSB1aVxuXHRcdFx0XHRcdGNvbnN0IG5ld1RhYklkeCA9IG5ld1RhYi5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qgb2xkVGFiSWR4ID0gb2xkVGFiLmluZGV4KClcblx0XHRcdFx0XHRpZiAob2xkVGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhvbGRUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhuZXdUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFJlc3VtZSgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPT0gMCkge1xuXHRcdFx0XHRcdFx0bG9hZEFwcCgpXG5cdFx0XHRcdFx0fVxuXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7QnJhaW5qcy5Db250cm9scy5UYWJzLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCB0YWJzID0gY3RybC5zY29wZS50YWJzXG5cblx0XHRmdWxsc2NyZWVuLmluaXQoKGZ1bGxTY3JlZW4pID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGZ1bGxTY3JlZW4gfSlcblx0XHR9KVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IG5iTm90aWYgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKG5iTm90aWYpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IG5iTm90aWYgfSlcblxuXHRcdH1cblxuXHRcdGJyb2tlci5vbignY29ubmVjdGVkJywgKHN0YXRlKSA9PiB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBjb25uZWN0ZWQ6IHN0YXRlIH0pXG5cdFx0fSlcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKGV2KSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbaG9tZV0gbWVzc2FnZScsIGV2LmRhdGEpXG5cdFx0XHRjb25zdCB7IHR5cGUsIGRhdGEgfSA9IGV2LmRhdGFcblx0XHRcdGlmICh0eXBlID09ICdvcGVuQXBwJykge1xuXHRcdFx0XHRjb25zdCB7IGFwcE5hbWUsIGFwcFBhcmFtcywgbmV3VGFiVGl0bGUgfSA9IGRhdGFcblx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCBhcHBQYXJhbXMsIG5ld1RhYlRpdGxlKVxuXHRcdFx0fVxuXHRcdFx0aWYgKHR5cGUgPT0gJ3JlbG9hZCcpIHtcblx0XHRcdFx0bG9jYXRpb24ucmVsb2FkKClcblx0XHRcdH1cblxuXHRcdH0sIGZhbHNlKVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgKG1zZykgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYnJlaXpib3QuZnJpZW5kcycsIG1zZylcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdC8qKkB0eXBlIEJyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5FdmVudHMuRnJpZW5kcyAqL1xuXHRcdFx0Y29uc3QgeyBpc0Nvbm5lY3RlZCwgdXNlck5hbWUgfSA9IG1zZy5kYXRhXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0JC5ub3RpZnkoYCcke3VzZXJOYW1lfScgaXMgY29ubmVjdGVkYCwgJ3N1Y2Nlc3MnKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdCQubm90aWZ5KGAnJHt1c2VyTmFtZX0nIGlzIGRpc2Nvbm5lY3RlZGAsICdlcnJvcicpXG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ub3RpZkNvdW50JywgZnVuY3Rpb24gKG1zZykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dXBkYXRlTm90aWZzKG1zZy5kYXRhKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QubG9nb3V0JywgZnVuY3Rpb24gKG1zZykge1xuXHRcdFx0bG9jYXRpb24uaHJlZiA9ICcvbG9nb3V0J1xuXHRcdH0pXG5cblxuXHRcdGZ1bmN0aW9uIG9wZW5BcHAoYXBwTmFtZSwgcGFyYW1zLCBuZXdUYWJUaXRsZSkge1xuXHRcdFx0Y29uc3QgYXBwSW5mbyA9IGN0cmwubW9kZWwuYXBwcy5maW5kKChhKSA9PiBhLmFwcE5hbWUgPT0gYXBwTmFtZSlcblx0XHRcdGxldCB0aXRsZSA9IGFwcEluZm8ucHJvcHMudGl0bGVcblx0XHRcdC8vY29uc29sZS5sb2coJ29wZW5BcHAnLCBhcHBOYW1lLCBwYXJhbXMsIG5ld1RhYlRpdGxlKVxuXHRcdFx0bGV0IGlkeCA9IHRhYnMuZ2V0VGFiSW5kZXhGcm9tVGl0bGUodGl0bGUpXG5cdFx0XHRjb25zdCBhcHBVcmwgPSAkJC51cmwuZ2V0VXJsUGFyYW1zKGAvYXBwcy8ke2FwcE5hbWV9YCwgcGFyYW1zKVxuXHRcdFx0Y29uc3QgYWRkTmV3VGFiID0gdHlwZW9mIG5ld1RhYlRpdGxlID09ICdzdHJpbmcnXG5cdFx0XHRpZiAoYWRkTmV3VGFiIHx8IGlkeCA8IDApIHsgLy8gYXBwcyBub3QgYWxyZWFkeSBydW5cblx0XHRcdFx0aWR4ID0gdGFicy5hZGRUYWIoXG5cdFx0XHRcdFx0KCFhZGROZXdUYWIpID8gdGl0bGUgOiBgJHt0aXRsZX1bJHtuZXdUYWJUaXRsZX1dYCxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZW1vdmFibGU6IHRydWUsXG5cdFx0XHRcdFx0XHRjb250cm9sOiAnYnJlaXpib3QuYXBwVGFiJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGFwcFVybFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhpZHgpXG5cdFx0XHRcdGlmIChwYXJhbXMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uuc2V0QXBwVXJsKGFwcFVybClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0YWJzLnNldFNlbGVjdGVkVGFiSW5kZXgoaWR4KVxuXG5cdFx0fVxuXG5cdFx0bm90aWZzU3J2LmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblxuXHRcdGZ1bmN0aW9uIGxvYWRBcHAoKSB7XG5cdFx0XHRzcnZBcHBzLmxpc3RBbGwoKS50aGVuKChhcHBzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGFwcHNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cblx0XHRsb2FkQXBwKClcblxuXHRcdGdlb2xvYy5zdGFydFdhdGNoKClcblxuXHRcdHdha2Vsb2NrLnJlcXVlc3RXYWtlTG9jaygpXG5cblx0fVxufSk7XG4iLCJcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRwcm9wczoge1xuXHRcdHJvb3RQYWdlOiAnJ1xuXHR9LFxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcInNob3dCYWNrXFxcIiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJsZWZ0XFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQmFja1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkJhY2tcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1sZWZ0XFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCIgY2xhc3M9XFxcInRpdGxlXFxcIj48L3NwYW4+XFxuXHRcXG5cdDwvZGl2Plxcblx0PGRpdiBibi1lYWNoPVxcXCJidXR0b25zXFxcIiBjbGFzcz1cXFwicmlnaHRcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb246IG9uQWN0aW9uLCBjb250ZXh0bWVudWNoYW5nZS5tZW51OiBvbkNvbnRleHRNZW51XFxcIj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBhY3Rpb25cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sYWJlbFxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiIGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWlzRW5hYmxlZH1cXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInNob3cyXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgYm4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLnRpdGxlfVxcXCIgYm4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaXNFbmFibGVkfVxcXCI+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInNob3czXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIG1lbnVcXFwiIFxcblx0XHRcdGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWlzRW5hYmxlZH1cXFwiXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiAkc2NvcGUuJGkuaXRlbXMsIHRyaWdnZXI6IFxcJ2xlZnRcXCcsIGNtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLnRpdGxlfVxcXCI+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PC9kaXY+XHRcdFx0XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGJuLWJpbmQ9XFxcImNvbnRlbnRcXFwiIGNsYXNzPVxcXCJjb250ZW50XFxcIj48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbiAoZWx0KSB7XG5cblx0XHRjb25zdCB7IHJvb3RQYWdlIH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHNob3dCYWNrOiBmYWxzZSxcblx0XHRcdFx0dGl0bGU6ICcnLFxuXHRcdFx0XHRidXR0b25zOiBbXSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pdGVtcyA9PSB1bmRlZmluZWQgJiYgc2NvcGUuJGkuaWNvbiA9PSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pdGVtcyA9PSB1bmRlZmluZWQgJiYgc2NvcGUuJGkuaWNvbiAhPSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5pdGVtcyAhPSB1bmRlZmluZWQgJiYgIShzY29wZS4kaS52aXNpYmxlID09PSBmYWxzZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNFbmFibGVkKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmVuYWJsZWQgPT0gdW5kZWZpbmVkIHx8IHNjb3BlLiRpLmVuYWJsZWQgPT09IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkJhY2s6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQmFjaycpXG5cdFx0XHRcdFx0cmVzdG9yZVBhZ2UodHJ1ZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BY3Rpb246IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRjb25zdCBwYWdlQ3RybElmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdFx0XHRjb25zdCBmbiA9IGN1ckluZm8uYnV0dG9uc1tjbWRdLm9uQ2xpY2tcblx0XHRcdFx0XHRpZiAodHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdGZuLmNhbGwocGFnZUN0cmxJZmFjZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29udGV4dE1lbnU6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCBjbWQgPSAkKHRoaXMpLmRhdGEoJ2NtZCcpXG5cdFx0XHRcdFx0Y29uc3QgcGFnZUN0cmxJZmFjZSA9IGN1ckluZm8uY3RybC5pZmFjZSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0XHRcdGNvbnN0IGZuID0gY3VySW5mby5idXR0b25zW2NtZF0ub25DbGlja1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0Zm4uY2FsbChwYWdlQ3RybElmYWNlLCBkYXRhLmNtZClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y29uc3QgY29udGVudCA9IGN0cmwuc2NvcGUuY29udGVudFxuXHRcdGNvbnN0IHN0YWNrID0gW11cblx0XHRsZXQgY3VySW5mbyA9IG51bGxcblxuXG5cblx0XHRmdW5jdGlvbiByZXN0b3JlUGFnZShpc0JhY2ssIGRhdGEpIHtcblxuXHRcdFx0Y29uc3QgaWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0bGV0IGJhY2tWYWx1ZVxuXG5cdFx0XHRpZiAodHlwZW9mIGlmYWNlLm9uQmFjayA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdGJhY2tWYWx1ZSA9IGlmYWNlLm9uQmFjaygpXG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdwb3BQYWdlJywgcGFnZUN0cmwpXG5cdFx0XHRjdXJJbmZvLmN0cmwuc2FmZUVtcHR5KCkucmVtb3ZlKClcblxuXHRcdFx0Y29uc3QgeyBvbkJhY2ssIG9uUmV0dXJuIH0gPSBjdXJJbmZvXG5cblx0XHRcdGN1ckluZm8gPSBzdGFjay5wb3AoKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNob3coKVxuXHRcdFx0Y29uc3QgeyB0aXRsZSwgYnV0dG9ucyB9ID0gY3VySW5mb1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgc2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKSB9KVxuXG5cdFx0XHRpZiAoaXNCYWNrKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1twYWdlcl0gYmFjaycsIGlmYWNlLm5hbWUpXG5cdFx0XHRcdGlmICh0eXBlb2Ygb25CYWNrID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnW3BhZ2VyXSBvbkJhY2snLCBpZmFjZS5uYW1lKVxuXHRcdFx0XHRcdG9uQmFjay5jYWxsKGlmYWNlLCBiYWNrVmFsdWUpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBvblJldHVybiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1twYWdlcl0gb25SZXR1cm4nLCBpZmFjZS5uYW1lLCBkYXRhKVxuXHRcdFx0XHRvblJldHVybi5jYWxsKGlmYWNlLCBkYXRhKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0dGhpcy5wb3BQYWdlID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdHJldHVybiByZXN0b3JlUGFnZShmYWxzZSwgZGF0YSlcblx0XHR9XG5cblx0XHR0aGlzLnB1c2hQYWdlID0gZnVuY3Rpb24gKGN0cmxOYW1lLCBvcHRpb25zKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbcGFnZXJdIHB1c2hQYWdlJywgY3RybE5hbWUpXG5cblxuXHRcdFx0aWYgKGN1ckluZm8gIT0gbnVsbCkge1xuXHRcdFx0XHRjdXJJbmZvLmN0cmwuaGlkZSgpXG5cdFx0XHRcdHN0YWNrLnB1c2goY3VySW5mbylcblx0XHRcdH1cblxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuXHRcdFx0bGV0IHsgdGl0bGUsIHByb3BzLCBvblJldHVybiwgb25CYWNrLCBldmVudHMgfSA9IG9wdGlvbnNcblxuXHRcdFx0Y29uc3QgY29udHJvbCA9IGNvbnRlbnQuYWRkQ29udHJvbChjdHJsTmFtZSwgcHJvcHMsIGV2ZW50cylcblxuXHRcdFx0bGV0IGJ1dHRvbnMgPSB7fVxuXG5cdFx0XHRpZiAob3B0aW9ucy5idXR0b25zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRidXR0b25zID0gb3B0aW9ucy5idXR0b25zXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgZ2V0QnV0dG9ucyA9IGNvbnRyb2wuaWZhY2UoKS5nZXRCdXR0b25zXG5cdFx0XHRcdGlmICh0eXBlb2YgZ2V0QnV0dG9ucyA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0YnV0dG9ucyA9IGdldEJ1dHRvbnMoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN1ckluZm8gPSB7IHRpdGxlLCBidXR0b25zLCBvblJldHVybiwgb25CYWNrLCBjdHJsOiBjb250cm9sIH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgc2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKSB9KVxuXHRcdFx0cmV0dXJuIGNvbnRyb2wuaWZhY2UoKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QnV0dG9uVmlzaWJsZSA9IGZ1bmN0aW9uIChidXR0b25zVmlzaWJsZSkge1xuXG5cdFx0XHRjb25zdCB7IGJ1dHRvbnMgfSA9IGN1ckluZm9cblxuXHRcdFx0Zm9yIChsZXQgYnRuIGluIGJ1dHRvbnNWaXNpYmxlKSB7XG5cdFx0XHRcdGlmIChidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdGJ1dHRvbnNbYnRuXS52aXNpYmxlID0gYnV0dG9uc1Zpc2libGVbYnRuXVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IGJ1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpIH0pXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRCdXR0b25FbmFibGVkID0gZnVuY3Rpb24gKGJ1dHRvbnNFbmFibGVkKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZXRCdXR0b25FbmFibGVkJywgYnV0dG9uc0VuYWJsZWQpXG5cblx0XHRcdGNvbnN0IHsgYnV0dG9ucyB9ID0gY3VySW5mb1xuXG5cdFx0XHRpZiAodHlwZW9mIGJ1dHRvbnNFbmFibGVkID09PSAnYm9vbGVhbicpIHtcblx0XHRcdFx0Zm9yIChsZXQgYnRuIGluIGJ1dHRvbnMpIHtcblx0XHRcdFx0XHRidXR0b25zW2J0bl0uZW5hYmxlZCA9IGJ1dHRvbnNFbmFibGVkXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGZvciAobGV0IGJ0biBpbiBidXR0b25zRW5hYmxlZCkge1xuXHRcdFx0XHRcdGlmIChidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdFx0YnV0dG9uc1tidG5dLmVuYWJsZWQgPSBidXR0b25zRW5hYmxlZFtidG5dXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJykgfSlcblx0XHR9XG5cblx0XHR0aGlzLnB1c2hQYWdlKHJvb3RQYWdlKVxuXG5cdH1cblxufSk7XG5cblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wZGYnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIndhaXRcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT4gUmVuZGVyaW5nLi4uXFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwiIXdhaXRcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJSZWZyZXNoXFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1zeW5jLWFsdFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUmVmcmVzaFxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiRml0XFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1leHBhbmRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkZpdFxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiWm9vbSBJblxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtc2VhcmNoLXBsdXNcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblpvb21JblxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiWm9vbSBPdXRcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLXNlYXJjaC1taW51cyBcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblpvb21PdXRcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlJvdGF0ZSBMZWZ0XFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYXMgZmEtdW5kby1hbHRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblJvdGF0ZUxlZnRcXFwiPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIlJvdGF0ZSBSaWdodFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmFzIGZhLXJlZG8tYWx0XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Sb3RhdGVSaWdodFxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiUHJpbnRcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLXByaW50XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25QcmludFxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiR28gdG8gUGFnZVxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtcmVwbHkgZmEtZmxpcC1ob3Jpem9udGFsXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25Hb3RvUGFnZVxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcXG5cdDwvZGl2Plxcblx0PGRpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwicGFnZXNcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJwcmV2aW91cyBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJldlBhZ2VcXFwiIGJuLWljb249XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPlxcblx0XHRcdDwvYnV0dG9uPlx0XFxuXFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwibmV4dCBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFBhZ2VcXFwiIGJuLWljb249XFxcImZhIGZhLWFuZ2xlLXJpZ2h0XFxcIj5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXY+XFxuXHRcdFx0UGFnZXM6IDxzcGFuIGJuLXRleHQ9XFxcImN1cnJlbnRQYWdlXFxcIj48L3NwYW4+IC8gPHNwYW4gYm4tdGV4dD1cXFwibnVtUGFnZXNcXFwiPjwvc3Bhbj5cdFx0XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXHRcXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucGRmXFxcIiBcXG5cdGJuLWRhdGE9XFxcInt3b3JrZXI6IFxcJy9icmFpbmpzL3BkZi93b3JrZXIuanNcXCd9XFxcIlxcblx0Ym4taWZhY2U9XFxcInBkZlxcXCJcXG5cdCBcXG4+PC9kaXY+XHRcdFxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0dXJsOiAnJ1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQpIHtcblxuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGNvbnN0IHsgdXJsIH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBwcm9ncmVzc0RsZyA9ICQkLnVpLnByb2dyZXNzRGlhbG9nKCdQcm9jZXNzaW5nLi4uJylcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRudW1QYWdlczogMCxcblx0XHRcdFx0dGl0bGU6ICcnLFxuXHRcdFx0XHRjdXJyZW50UGFnZTogMSxcblx0XHRcdFx0d2FpdDogZmFsc2UsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubnVtUGFnZXMgPiAxICYmICF0aGlzLndhaXRcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblJlZnJlc2g6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGF3YWl0IHBkZi5yZWZyZXNoKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Sb3RhdGVSaWdodDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Sb3RhdGVSaWdodCcpXG5cdFx0XHRcdFx0YXdhaXQgcGRmLnJvdGF0ZVJpZ2h0KClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Sb3RhdGVMZWZ0OiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJvdGF0ZUxlZnQnKVxuXHRcdFx0XHRcdGF3YWl0IHBkZi5yb3RhdGVMZWZ0KClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25ab29tSW46IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uWm9vbUluJylcblx0XHRcdFx0XHRhd2FpdCBwZGYuem9vbUluKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25ab29tT3V0OiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblpvb21PdXQnKVxuXHRcdFx0XHRcdGF3YWl0IHBkZi56b29tT3V0KClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Hb3RvUGFnZTogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgcGFnZU5vID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0dvIHRvIFBhZ2UnLFxuXHRcdFx0XHRcdFx0bGFiZWw6ICdQYWdlIE51bWJlcicsXG5cdFx0XHRcdFx0XHRhdHRyczoge1xuXHRcdFx0XHRcdFx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHRcdFx0XHRcdFx0bWluOiAxLFxuXHRcdFx0XHRcdFx0XHRtYXg6IGN0cmwubW9kZWwubnVtUGFnZXMsXG5cdFx0XHRcdFx0XHRcdHN0ZXA6IDFcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9ICBhd2FpdCBwZGYuc2V0UGFnZShwYWdlTm8pXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlIH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUHJpbnQ6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHByb2dyZXNzRGxnLnNldFBlcmNlbnRhZ2UoMClcblx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zaG93KClcblx0XHRcdFx0XHRhd2FpdCBwZGYucHJpbnQoe1xuXHRcdFx0XHRcdFx0b25Qcm9ncmVzczogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKGRhdGEucGFnZSAvIGN0cmwubW9kZWwubnVtUGFnZXMpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRwcm9ncmVzc0RsZy5oaWRlKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25OZXh0UGFnZTogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25OZXh0UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRQYWdlID0gYXdhaXQgcGRmLm5leHRQYWdlKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50UGFnZSwgd2FpdDogZmFsc2UgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblByZXZQYWdlOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblByZXZQYWdlJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyB3YWl0OiB0cnVlIH0pXG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudFBhZ2UgPSBhd2FpdCBwZGYucHJldlBhZ2UoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRQYWdlLCB3YWl0OiBmYWxzZSB9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRml0OiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRwZGYuZml0KClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8qKkB0eXBlIHtCcmFpbmpzLkNvbnRyb2xzLlBkZi5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgcGRmID0gY3RybC5zY29wZS5wZGZcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIG9wZW5GaWxlKHVybCwgdGl0bGUpIHtcblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBudW1QYWdlcyA9IGF3YWl0IHBkZi5vcGVuRmlsZSh1cmwpXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIGxvYWRlZCcpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0bnVtUGFnZXMsXG5cdFx0XHRcdFx0d2FpdDogZmFsc2Vcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRpZiAodXJsICE9ICcnKSB7XG5cdFx0XHRvcGVuRmlsZSh1cmwpXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0b3BlbkZpbGUoZGF0YS51cmwpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0c2V0RGF0YSh7dXJsfSlcblx0YFxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnJ0YycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnJ0YycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0YXBwTmFtZTogJycsXG5cdFx0aWNvbkNsczogJycsXG5cdFx0dGl0bGU6ICdTZWxlY3QgYSBmcmllbmQnXG5cdH0sXG5cblx0Ly90ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwic3RhdHVzXFxcIj5cXG5cdFx0XHQ8cD5TdGF0dXM6IDxzcGFuIGJuLXRleHQ9XFxcInN0YXR1c1xcXCI+PC9zcGFuPjwvcD5cXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiQ2FsbCBhIGZyaWVuZFxcXCIgXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FsbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHR0aXRsZT1cXFwiQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzJcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmUtc2xhc2hcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkhhbmd1cFxcXCIgXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSGFuZ3VwXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzNcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmUtc2xhc2hcXFwiPjwvaT48L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBibi1zaG93PVxcXCJzaG93NFxcXCIgYm4tYmluZD1cXFwicGFuZWxcXFwiIGNsYXNzPVxcXCJwYW5lbFxcXCI+PC9kaXY+XCIsXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlJUQy5JbnRlcmZhY2V9IHJ0YyBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBydGMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7YXBwTmFtZSwgaWNvbkNscywgdGl0bGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgJGNoaWxkcmVuID0gZWx0LmNoaWxkcmVuKCkucmVtb3ZlKClcblx0XHQvL0B0cy1pZ25vcmVcblx0XHRlbHQuYXBwZW5kKFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInN0YXR1c1xcXCI+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbmNlbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cyXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiKVxuXG5cdFx0cnRjLm9uKCdzdGF0dXMnLCAoZGF0YSkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc3RhdHVzJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YShkYXRhKVxuXHRcdH0pXHRcdFxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzdGF0dXM6ICdyZWFkeScsXG5cdFx0XHRcdGRpc3RhbnQ6ICcnLFxuXHRcdFx0XHRoYXNDaGlsZHJlbjogJGNoaWxkcmVuLmxlbmd0aCA+IDAsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHsgXG5cdFx0XHRcdFx0cmV0dXJuIFsncmVhZHknLCAnZGlzY29ubmVjdGVkJywgJ3JlZnVzZWQnLCAnY2FuY2VsZWQnXS5pbmNsdWRlcyh0aGlzLnN0YXR1cylcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY2FsbGluZyd9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuc3RhdHVzID09ICdjb25uZWN0ZWQnfSxcblx0XHRcdFx0c2hvdzQ6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJyAmJiB0aGlzLmhhc0NoaWxkcmVufVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNhbGw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsbCcpXG5cblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0c2hvd1NlbGVjdGlvbjogdHJ1ZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGJ1dHRvbnM6IHtcblx0XHRcdFx0XHRcdFx0Y2FsbDoge1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnQ2FsbCcsXG5cdFx0XHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHNlbGVjdGlvbiA9IHRoaXMuZ2V0U2VsZWN0aW9uKClcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChzZWxlY3Rpb24gPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgZnJpZW5kJ30pXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qge2ZyaWVuZFVzZXJOYW1lLCBpc0Nvbm5lY3RlZH0gPSBzZWxlY3Rpb25cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyTmFtZScsIGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFpc0Nvbm5lY3RlZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLCBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiBgVXNlciA8c3Ryb25nPiR7ZnJpZW5kVXNlck5hbWV9PC9zdHJvbmc+IGlzIG5vdCBjb25uZWN0ZWRgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbih1c2VyTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRydGMuY2FsbCh1c2VyTmFtZSwgYXBwTmFtZSwgaWNvbkNscylcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbmNlbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuY2FuY2VsKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25IYW5ndXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmJ5ZSgpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ3J0Y2hhbmd1cCcpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdGN0cmwuc2NvcGUucGFuZWwuYXBwZW5kKCRjaGlsZHJlbilcdFx0XG5cdH1cblxufSk7IiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnNlYXJjaGJhcicsIHtcblxuICAgIHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU2VhcmNoXFxcIiBibi1iaW5kPVxcXCJmb3JtXFxcIj5cXG5cdDxpbnB1dCB0eXBlPVxcXCJzZWFyY2hcXFwiIFxcbiAgICAgICAgbmFtZT1cXFwidmFsdWVcXFwiIFxcbiAgICAgICAgYm4tYXR0cj1cXFwie3BsYWNlaG9sZGVyLCBtaW5sZW5ndGgsIHJlcXVpcmVkfVxcXCJcXG5cdFx0YXV0b2NvbXBsZXRlPVxcXCJvZmZcXFwiXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRcXFwiPlxcblx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXRleHQtYmx1ZVxcXCIgdHlwZT1cXFwic3VibWl0XFxcIiA+PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPjwvYnV0dG9uPlxcbjwvZm9ybT5cIixcblxuICAgIHByb3BzOiB7XG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgbWlubGVuZ3RoOiAwLFxuICAgICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoZWx0KSB7XG5cbiAgICAgICAgY29uc3QgeyBwbGFjZWhvbGRlciwgbWlubGVuZ3RoLCByZXF1aXJlZCB9ID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcixcbiAgICAgICAgICAgICAgICBtaW5sZW5ndGgsXG4gICAgICAgICAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvblNlYXJjaDogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB2YWx1ZSB9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG4gICAgICAgICAgICAgICAgICAgIGVsdC50cmlnZ2VyKCdzZWFyY2hiYXJzdWJtaXQnLCB7IHZhbHVlIH0pXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgY3RybC5zY29wZS5mb3JtLnNldEZvcm1EYXRhKHsgdmFsdWUgfSlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJGlmYWNlOiBgXG4gICAgICAgIHNldFZhbHVlKHZhbHVlOiBzdHJpbmcpXG4gICAgYCxcbiAgICAkZXZlbnRzOiAnc2VhcmNoYmFyc3VibWl0J1xufSk7IDExXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+VXNlck5hbWU8L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInVzZXJuYW1lXFxcIiBuYW1lPVxcXCJ1c2VybmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlBzZXVkbzwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwicHNldWRvXFxcIiBuYW1lPVxcXCJwc2V1ZG9cXFwiIHJlcXVpcmVkPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Mb2NhdGlvbjwvbGFiZWw+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBwbGFjZWhvbGRlcj1cXFwibG9jYXRpb25cXFwiIG5hbWU9XFxcImxvY2F0aW9uXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+RW1haWw8L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIHBsYWNlaG9sZGVyPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHJlcXVpcmVkPlx0XFxuXHQ8L2Rpdj5cXG5cdFxcblx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjcmVhdGU6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0NyZWF0ZScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcblx0XHR9XG5cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QudXNlcnMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5ub3RpZnMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvblVwZGF0ZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiVXBkYXRlXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXJlZG9cXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlx0XFxuXHQ8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRVc2VyXFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWUgYnRuQWRkVXNlclxcXCIgdGl0bGU9XFxcIkFkZCBVc2VyXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPlxcblx0PC9idXR0b24+XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLXNtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHIgY2xhc3M9XFxcInczLWdyZWVuXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRoPlVzZXIgTmFtZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Qc2V1ZG88L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TG9jYXRpb248L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RW1haWw8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+Q3JlYXRlIERhdGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TGFzdCBMb2dpbiBEYXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImRhdGFcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5kZWxldGU6IG9uRGVsZXRlLCBjbGljay5ub3RpZjogb25Ob3RpZiwgY2xpY2sucmVzZXRQd2Q6IG9uUmVzZXRQd2RcXFwiPlxcbiAgXHRcdFx0PHRyPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS51c2VybmFtZVxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkucHNldWRvXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sb2NhdGlvblxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZW1haWxcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MVxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0XHQ8dGQ+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXNob3c9XFxcInNob3cyXFxcIj5cXG5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MlxcXCI+PC9zcGFuPjxicj5cXG5cdFx0XHRcdFx0XHRhdCBcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0M1xcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJkZWxldGUgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJEZWxldGUgVXNlclxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZiB3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYmVsbFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwicmVzZXRQd2QgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJSZXNldCBQYXNzd29yZFxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxvY2tcXFwiPjwvaT5cXG5cdFx0XHRcdFx0PC9idXR0b24+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdDwvdHI+ICAgICAgXHRcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlVzZXIuQWRtaW5JbnRlcmZhY2V9IHVzZXJzIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLk5vdGlmLkludGVyZmFjZX0gbm90aWZzU3J2IFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCB1c2Vycywgbm90aWZzU3J2LCBwYWdlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkYXRhOiBbXSxcblx0XHRcdFx0dGV4dDE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5jcmVhdGVEYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5sYXN0TG9naW5EYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShzY29wZS4kaS5sYXN0TG9naW5EYXRlKS50b0xvY2FsZVRpbWVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5jcmVhdGVEYXRlICE9IHVuZGVmaW5lZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gdW5kZWZpbmVkICYmIHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUgIT0gMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkVXNlcjogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmFkZFVzZXInLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBVc2VyJyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLmFkZChkYXRhKVxuXHRcdFx0XHRcdFx0XHRnZXRVc2VycygpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyB1c2VybmFtZSB9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7IHRpdGxlOiAnRGVsZXRlIFVzZXInLCBjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nIH0sIGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLnJlbW92ZSh1c2VybmFtZSlcblx0XHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk5vdGlmOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IGN0cmwubW9kZWwuZGF0YVtpZHhdXG5cdFx0XHRcdFx0Y29uc3QgdGV4dCA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoeyB0aXRsZTogJ1NlbmQgTm90aWZpY2F0aW9uJywgbGFiZWw6ICdNZXNzYWdlJyB9KVxuXHRcdFx0XHRcdGlmICh0ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdG5vdGlmc1Nydi5zZW5kTm90aWYodXNlcm5hbWUsIHsgdGV4dCB9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25VcGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRnZXRVc2VycygpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVzZXRQd2Q6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyB1c2VybmFtZSB9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7IHRpdGxlOiAnUmVzZXQgUGFzc3dvcmQnLCBjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nIH0sIGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGF3YWl0IHVzZXJzLnJlc2V0UHdkKHVzZXJuYW1lKVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuXHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHVzZXJzLmxpc3QoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2dldFVzZXJzJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGRhdGEgfSlcblxuXHRcdH1cblxuXHRcdGdldFVzZXJzKClcblxuXG5cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3Qudmlld2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4taWY9XFxcImlzSW1hZ2VcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcImltYWdlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5pbWFnZVxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcIntzcmM6IHVybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBibi1pZj1cXFwiaXNQZGZcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcInBkZlxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnBkZlxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInt1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaXNBdWRpb1xcXCIgY2xhc3M9XFxcImF1ZGlvXFxcIj5cXG5cdDxhdWRpbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L2F1ZGlvPlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlzVmlkZW9cXFwiIGNsYXNzPVxcXCJ2aWRlb1xcXCIgYm4tYmluZD1cXFwidmlkZW9cXFwiPlxcblx0PHZpZGVvIGJuLWF0dHI9XFxcIntzcmM6IHVybH1cXFwiIGNvbnRyb2xzPVxcXCJcXFwiIGNvbnRyb2xzTGlzdD1ub2Rvd25sb2FkID48L3ZpZGVvPlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlzRG9jXFxcIiBjbGFzcz1cXFwiZG9jXFxcIiBibi1iaW5kPVxcXCJkb2NcXFwiIGJuLWV2ZW50PVxcXCJjbGljay50b3A6IG9uVG9wXFxcIj5cXG5cdDxidXR0b24gYm4taWNvbj1cXFwiZmFzIGZhLWFuZ2xlLXVwXFxcIiBjbGFzcz1cXFwidG9wXFxcIiB0aXRsZT1cXFwiVG9wXFxcIiA+PC9idXR0b24+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImh0bWxcXFwiPjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaXNDb2RlXFxcIiBibi1iaW5kPVxcXCJjb2RlXFxcIiBjbGFzcz1cXFwiY29kZVxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHRcdDxwcmU+XFxuXHRcdFx0PGNvZGUgYm4tYXR0cj1cXFwie2NsYXNzOiBsYW5ndWFnZX1cXFwiPjwvY29kZT5cXG5cdFx0PC9wcmU+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0cHJvcHM6IHtcblx0XHR0eXBlOiAnJyxcblx0XHR1cmw6ICcjJ1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIGZpbGVzKSB7XG5cblx0XHQvL0B0cy1pZ25vcmVcblx0XHRsZXQgeyB0eXBlLCB1cmwgfSA9IHRoaXMucHJvcHNcblx0XHQvL2NvbnNvbGUubG9nKCdwcm9wcycsIHRoaXMucHJvcHMpXG5cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGhhc1N1YnRpdGxlKGZpbGVOYW1lKSB7XG5cdFx0XHRjb25zb2xlLmxvZyh7ZmlsZU5hbWV9KVxuXHRcdFx0Y29uc3QgeyBleGlzdHMgfSA9IGF3YWl0IGZpbGVzLmV4aXN0cyhmaWxlTmFtZSlcblx0XHRcdGNvbnNvbGUubG9nKHtleGlzdHN9KVxuXHRcdFx0aWYgKGV4aXN0cykge1xuXHRcdFx0XHRjdHJsLnNjb3BlLnZpZGVvLmZpbmQoJ3ZpZGVvJykuYXBwZW5kKCQoJzx0cmFjaz4nLCB7XG5cdFx0XHRcdFx0bGFiZWw6ICdGcmVuY2gnLFxuXHRcdFx0XHRcdGtpbmQ6ICdzdWJ0aXRsZXMnLFxuXHRcdFx0XHRcdHNyY2xhbmc6ICdmcicsXG5cdFx0XHRcdFx0c3JjOiBmaWxlcy5maWxlVXJsKGZpbGVOYW1lKVxuXHRcdFx0XHR9KSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybCxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0bGFuZ3VhZ2U6IGBsYW5ndWFnZS0ke3R5cGV9YCxcblx0XHRcdFx0aXNJbWFnZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2ltYWdlJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc1BkZjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3BkZidcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNBdWRpbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ2F1ZGlvJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc1ZpZGVvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAndmlkZW8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzRG9jOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnaGRvYydcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNDb2RlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFsnamF2YXNjcmlwdCcsICdodG1sJywgJ3B5dGhvbicsICdjcHAnLCAncnVzdCddLmluY2x1ZGVzKHRoaXMudHlwZSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVG9wOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9wJylcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmRvYy5maW5kKCcuc2Nyb2xsUGFuZWwnKS5nZXQoMCkuc2Nyb2xsKDAsIDApXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRpZiAodHlwZSA9PSAndmlkZW8nKSB7XG5cdFx0XHRjb25zdCB7IGZpbGVOYW1lIH0gPSAkJC51cmwucGFyc2VVcmxQYXJhbXMoJ2h0dHBzOi8vd3d3Lm5ldG9zLm92aCcgKyB1cmwpXG5cdFx0XHQvL2NvbnNvbGUubG9nKHtmaWxlTmFtZX0pXG5cdFx0XHRjb25zdCB2dHRGaWxlID0gZmlsZU5hbWUuc3Vic3RyKDAsIGZpbGVOYW1lLmxhc3RJbmRleE9mKFwiLlwiKSkgKyBcIi52dHRcIjtcblx0XHRcdGhhc1N1YnRpdGxlKHZ0dEZpbGUpXG5cblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiByZWFkVGV4dCgpIHtcblx0XHRcdGNvbnN0IHJldCA9IGF3YWl0IGZldGNoKHVybClcblx0XHRcdHJldHVybiBhd2FpdCByZXQudGV4dCgpXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gcmVhZEh0bWwoKSB7XG5cdFx0XHRjb25zdCBodG1sRG9jID0gYXdhaXQgcmVhZFRleHQoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnaHRtbERvYycsIGh0bWxEb2MpXG5cdFx0XHRjb25zdCBodG1sRWx0ID0gY3RybC5zY29wZS5kb2MuZmluZCgnLmh0bWwnKVxuXHRcdFx0aHRtbEVsdC5odG1sKGh0bWxEb2MpXG5cdFx0XHRodG1sRWx0LmZpbmQoJ2FbaHJlZl49aHR0cF0nKS5hdHRyKCd0YXJnZXQnLCAnX2JsYW5rJykgLy8gb3BlbiBleHRlcm5hbCBsaW5rIGluIG5ldyBuYXZpZ2F0b3IgdGFiXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gcmVhZENvZGUoKSB7XG5cdFx0XHRjb25zdCBjb2RlID0gYXdhaXQgcmVhZFRleHQoKVxuXHRcdFx0Y29uc3QgY29kZUVsdCA9IGN0cmwuc2NvcGUuY29kZVxuXHRcdFx0Y29kZUVsdC5maW5kKCdjb2RlJykudGV4dChjb2RlKVxuXG5cdFx0XHRQcmlzbS5oaWdobGlnaHRBbGxVbmRlcihjb2RlRWx0LmdldCgwKSlcblx0XHR9XG5cblx0XHRpZiAodHlwZSA9PSAnaGRvYycpIHtcblx0XHRcdHJlYWRIdG1sKClcblx0XHR9XG5cblx0XHRpZiAoY3RybC5tb2RlbC5pc0NvZGUoKSkge1xuXHRcdFx0cmVhZENvZGUoKVxuXHRcdH1cblxuXG5cdFx0dGhpcy5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbVmlld2VyXSBzZXREYXRhJywgZGF0YSlcblx0XHRcdGlmIChkYXRhLnVybCkge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyB1cmw6IGRhdGEudXJsIH0pXG5cblx0XHRcdH1cblx0XHR9XG5cblx0fVxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5hcHBEYXRhJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcmV0dXJucyBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0bGV0IF9kYXRhID0gY29uZmlnXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0RGF0YTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBfZGF0YVxuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZURhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0X2RhdGEgPSBkYXRhXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvYXBwRGF0YScsIGRhdGEpXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5hcHBzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdEFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2FwaS9hcHBzL2FsbCcpXG5cdFx0XHR9XHRcdFx0XG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYmVhdGRldGVjdG9yJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLndvcmtlclBhdGggIT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93ICdiZWF0ZGV0ZWN0b3Igd29ya2VyIHBhdGggaXMgbm90IGRlZmluZWQnXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoY29uZmlnLndvcmtlclBhdGgpICAgICAgICBcblxuICAgICAgICBmdW5jdGlvbiBjb21wdXRlQmVhdERldGVjdGlvbihhdWRpb0J1ZmZlcikge1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNhbXBsZVJhdGUgPSBhdWRpb0J1ZmZlci5zYW1wbGVSYXRlXG4gICAgICAgICAgICAgICAgY29uc3Qgb2ZmbGluZUNvbnRleHQgPSBuZXcgT2ZmbGluZUF1ZGlvQ29udGV4dCgxLCBhdWRpb0J1ZmZlci5sZW5ndGgsIHNhbXBsZVJhdGUpXG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYnVmZmVyIHNvdXJjZVxuICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IG9mZmxpbmVDb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpXG4gICAgICAgICAgICAgICAgc291cmNlLmJ1ZmZlciA9IGF1ZGlvQnVmZmVyXG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgZmlsdGVyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gb2ZmbGluZUNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKClcbiAgICAgICAgICAgICAgICBmaWx0ZXIudHlwZSA9IFwibG93cGFzc1wiXG4gICAgICAgICAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IDI0MFxuXG4gICAgICAgICAgICAgICAgLy8gUGlwZSB0aGUgc29uZyBpbnRvIHRoZSBmaWx0ZXIsIGFuZCB0aGUgZmlsdGVyIGludG8gdGhlIG9mZmxpbmUgY29udGV4dFxuICAgICAgICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGZpbHRlcilcbiAgICAgICAgICAgICAgICBmaWx0ZXIuY29ubmVjdChvZmZsaW5lQ29udGV4dC5kZXN0aW5hdGlvbilcblxuICAgICAgICAgICAgICAgIC8vIFNjaGVkdWxlIHRoZSBzb25nIHRvIHN0YXJ0IHBsYXlpbmcgYXQgdGltZTowXG4gICAgICAgICAgICAgICAgc291cmNlLnN0YXJ0KDApO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBzb25nXG4gICAgICAgICAgICAgICAgb2ZmbGluZUNvbnRleHQuc3RhcnRSZW5kZXJpbmcoKVxuXG4gICAgICAgICAgICAgICAgLy8gQWN0IG9uIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICBvZmZsaW5lQ29udGV4dC5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsdGVyZWQgYnVmZmVyIVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGFubmVsRGF0YSA9IGUucmVuZGVyZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKHsgY2hhbm5lbERhdGEsIHNhbXBsZVJhdGUgfSlcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSAgICAgICAgXG5cblx0XHRyZXR1cm4gIHtcbiAgICAgICAgICAgIGNvbXB1dGVCZWF0RGV0ZWN0aW9uXG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgZnVuY3Rpb24ocHJlZml4KTpIdHRwSW50ZXJmYWNlYFxuXG59KTtcblxuXG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYmxvY2tseWludGVycHJldG9yJywge1xuXG4gICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXG4gICAgICAgIGxldCB2YXJpYWJsZXNWYWx1ZVxuICAgICAgICBsZXQgcHJvY2VkdXJlQmxvY2tcbiAgICAgICAgbGV0IGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICBsZXQgbG9nRnVuY3Rpb25cblxuICAgICAgICBmdW5jdGlvbiBtYXRoUmFuZG9tSW50KGEsIGIpIHtcbiAgICAgICAgICAgIGlmIChhID4gYikge1xuICAgICAgICAgICAgICAgIC8vIFN3YXAgYSBhbmQgYiB0byBlbnN1cmUgYSBpcyBzbWFsbGVyLlxuICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBhO1xuICAgICAgICAgICAgICAgIGEgPSBiO1xuICAgICAgICAgICAgICAgIGIgPSBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChiIC0gYSArIDEpICsgYSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYXRoUmFuZG9tTGlzdChsaXN0KSB7XG4gICAgICAgICAgICBjb25zdCB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbGlzdC5sZW5ndGgpO1xuICAgICAgICAgICAgcmV0dXJuIGxpc3RbeF07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYXRoTWVhbihteUxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBteUxpc3QucmVkdWNlKGZ1bmN0aW9uICh4LCB5KSB7IHJldHVybiB4ICsgeTsgfSwgMCkgLyBteUxpc3QubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWF0aE1lZGlhbihteUxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsTGlzdCA9IG15TGlzdC5maWx0ZXIoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJzsgfSk7XG4gICAgICAgICAgICBpZiAoIWxvY2FsTGlzdC5sZW5ndGgpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbG9jYWxMaXN0LnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGIgLSBhOyB9KTtcbiAgICAgICAgICAgIGlmIChsb2NhbExpc3QubGVuZ3RoICUgMiA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAobG9jYWxMaXN0W2xvY2FsTGlzdC5sZW5ndGggLyAyIC0gMV0gKyBsb2NhbExpc3RbbG9jYWxMaXN0Lmxlbmd0aCAvIDJdKSAvIDI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhbExpc3RbKGxvY2FsTGlzdC5sZW5ndGggLSAxKSAvIDJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWF0aENvbXBhcmUob3BlcmF0b3IsIHZhbDEsIHZhbDIpIHtcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdFUSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxID09PSB2YWwyXG4gICAgICAgICAgICAgICAgY2FzZSAnTkVRJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgIT09IHZhbDJcbiAgICAgICAgICAgICAgICBjYXNlICdMVCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxIDwgdmFsMlxuICAgICAgICAgICAgICAgIGNhc2UgJ0xURSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxIDw9IHZhbDJcbiAgICAgICAgICAgICAgICBjYXNlICdHVCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxID4gdmFsMlxuICAgICAgICAgICAgICAgIGNhc2UgJ0dURSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxID49IHZhbDJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyAoYFVua25vd24gb3BlcmF0b3IgJyR7b3BlcmF0b3J9J2ApXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJsb2NrVHlwZU1hcCA9IHtcbiAgICAgICAgICAgICdtYXRoX251bWJlcic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2suZmllbGRzLk5VTVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9jay5maWVsZHMuVEVYVFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X2FwcGVuZCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJJZCA9IGJsb2NrLmZpZWxkcy5WQVIuaWRcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlW3ZhcklkXSArPSB0ZXh0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RleHRfam9pbic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYkl0ZW1zID0gYmxvY2suZXh0cmFTdGF0ZS5pdGVtQ291bnRcbiAgICAgICAgICAgICAgICBsZXQgcmV0ID0gJydcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2suaW5wdXRzICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5iSXRlbXM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWUgPSBgQUREJHtpfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9jay5pbnB1dHNbaXRlbU5hbWVdICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHNbaXRlbU5hbWVdLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgKz0gdGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dF9sZW5ndGgnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQUxVRSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0ZXh0ICE9ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdpbiB0ZXh0TGVuZ3RoIHRleHQgaXMgbm90IGEgc3RyaW5nICEnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0Lmxlbmd0aFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgJ2dsb2JhbF9kZWNsYXJhdGlvbic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlZBTFVFKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhck5hbWUgPSBibG9jay5maWVsZHMuTkFNRVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3Zhck5hbWV9ID0gJHt2YWx1ZX1gKVxuICAgICAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlW3Zhck5hbWVdID0gdmFsdWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGV4aWNhbF92YXJpYWJsZV9nZXQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgLyoqQHR5cGUge3N0cmluZ30gKi9cbiAgICAgICAgICAgICAgICBjb25zdCB2YXJOYW1lID0gYmxvY2suZmllbGRzLlZBUlxuICAgICAgICAgICAgICAgIHJldHVybiAodmFyTmFtZS5zdGFydHNXaXRoKCdnbG9iYWwgJykpID9cbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzVmFsdWVbdmFyTmFtZS5zdWJzdHJpbmcoNyldIDogbG9jYWxWYXJpYWJsZXNbdmFyTmFtZV1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGV4aWNhbF92YXJpYWJsZV9zZXQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFyTmFtZSA9IGJsb2NrLmZpZWxkcy5WQVJcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQUxVRSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgaWYgKHZhck5hbWUuc3RhcnRzV2l0aCgnZ2xvYmFsICcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlW3Zhck5hbWUuc3Vic3RyaW5nKDcpXSA9IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFZhcmlhYmxlc1t2YXJOYW1lXSA9IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2NhbF9kZWNsYXJhdGlvbl9zdGF0ZW1lbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBmaWVsZHMsIGlucHV0cyB9ID0gYmxvY2tcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXRzLlNUQUNLID09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgICAgICAgICBjb25zdCBhcmdzTmFtZSA9IGdldEFyZ05hbWVzKGZpZWxkcylcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHsgYXJnc05hbWUgfSlcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSB7fVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnc05hbWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWVOYW1lID0gJ0RFQ0wnICsgaVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRzW3ZhbHVlTmFtZV0gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGV2YWxDb2RlKGlucHV0c1t2YWx1ZU5hbWVdLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1thcmdzTmFtZVtpXV0gPSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBbdmFyTmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHVlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxWYXJpYWJsZXNbdmFyTmFtZV0gPSB2YWx1ZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5TVEFDSywgbG9jYWxWYXJpYWJsZXMpXG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHZhck5hbWUgb2YgT2JqZWN0LmtleXModmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbG9jYWxWYXJpYWJsZXNbdmFyTmFtZV1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9hcml0aG1ldGljJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5BLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwyID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkIsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbDEsIHZhbDIgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FERCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSArIHZhbDJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTUlOVVMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLSB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ01VTFRJUExZJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwxICogdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdESVZJREUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgLyB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1BPV0VSJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdyh2YWwxLCB2YWwyKVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgKGBVbmtub3duIG9wZXJhdG9yICcke29wZXJhdG9yfSdgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbWF0aF9zaW5nbGUnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JPT1QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh2YWwpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FCUyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5hYnModmFsKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdORUcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC12YWxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgubG9nKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTE9HMTAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgubG9nMTAodmFsKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdFWFAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZXhwKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUE9XMTAnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucG93KDEwLCB2YWwpXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAoYFVua25vd24gb3BlcmF0b3IgJyR7b3BlcmF0b3J9J2ApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdtYXRoX3RyaWcnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NJTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5zaW4odmFsIC8gMTgwICogTWF0aC5QSSlcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQ09TJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmNvcyh2YWwgLyAxODAgKiBNYXRoLlBJKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdUQU4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgudGFuKHZhbCAvIDE4MCAqIE1hdGguUEkpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0FTSU4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguYXNpbih2YWwpIC8gTWF0aC5QSSAqIDE4MFxuICAgICAgICAgICAgICAgICAgICBjYXNlICdBQ09TJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmFjb3ModmFsKSAvIE1hdGguUEkgKiAxODBcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQVRBTic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5hdGFuKHZhbCkgLyBNYXRoLlBJICogMTgwXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAoYFVua25vd24gb3BlcmF0b3IgJyR7b3BlcmF0b3J9J2ApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdtYXRoX3JhbmRvbV9pbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5GUk9NLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zdCB0byA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5UTywgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGhSYW5kb21JbnQoZnJvbSwgdG8pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfcm91bmQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBibG9jay5maWVsZHMuT1BcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTlVNLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwgfSlcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JPVU5EJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRVUCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKHZhbClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUk9VTkRET1dOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKHZhbClcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBvcGVyYXRvciAnJHtvcGVyYXRvcn0nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfY29uc3RhbnQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYyA9IGJsb2NrLmZpZWxkcy5DT05TVEFOVFxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdQSSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5QSVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLkVcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnR09MREVOX1JBVElPJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoMSArIE1hdGguc3FydCg1KSkgLyAyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NRUlQyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLlNRUlQyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NRUlQxXzInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguU1FSVDFfMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdJTkZJTklUWSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSW5maW5pdHlcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChgVW5rbm93biBjb25zdGFudGUgJyR7Y30nYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21hdGhfb25fbGlzdCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuTElTVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdpbiBtYXRoTGlzdCBsaXN0IGlzIG5vdCBhbiBBcnJheSAhJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NVTSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlzdC5yZWR1Y2UoZnVuY3Rpb24gKHgsIHkpIHsgcmV0dXJuIHggKyB5OyB9LCAwKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdNSU4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KG51bGwsIGxpc3QpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ01BWCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkobnVsbCwgbGlzdClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQVZFUkFHRSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF0aE1lYW4obGlzdClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnTUVESUFOJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXRoTWVkaWFuKGxpc3QpXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1JBTkRPTSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF0aFJhbmRvbUxpc3QobGlzdClcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGBvcGVyYXRvciAnJHtvcGVyYXRvcn0nIGlzIG5vdCBpbXBsZW1lbnRlZGBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2NvbnRyb2xzX3JlcGVhdF9leHQnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXMgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVElNRVMsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUSU1FUycsIHRpbWVzKVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGltZXM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRE8pXG4gICAgICAgICAgICAgICAgICAgIGlmIChicmVha1N0YXRlID09ICdCUkVBSycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChicmVha1N0YXRlID09ICdDT05USU5VRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrU3RhdGUgPSAnJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd0ZXh0X3ByaW50JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbG9nRnVuY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBsb2dGdW5jdGlvbihhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEVYVCwgbG9jYWxWYXJpYWJsZXMpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dF9wcm9tcHRfZXh0JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBibG9jay5maWVsZHMuVFlQRVxuICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFWFQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgdHlwZSwgbGFiZWwgfSlcbiAgICAgICAgICAgICAgICBjb25zdCByZXQgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHtcbiAgICAgICAgICAgICAgICAgICAgbGFiZWwsIHRpdGxlOiAnRW50ZXIgdmFsdWUnLCBhdHRyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndGV4dF9jaGFuZ2VDYXNlJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoYXJDYXNlID0gYmxvY2suZmllbGRzLkNBU0VcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGNoYXJDYXNlIH0pXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEVYVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnaW4gdGV4dExlbmd0aCB0ZXh0IGlzIG5vdCBhIHN0cmluZyAhJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1VQUEVSQ0FTRSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdMT1dFUkNBU0UnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnVElUTEVDQVNFJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0VG9UaXRsZUNhc2UodmFsdWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY19jb21wYXJlJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdG9yID0gYmxvY2suZmllbGRzLk9QXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMSA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5BLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwyID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkIsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgb3BlcmF0b3IsIHZhbDEsIHZhbDIgfSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0aENvbXBhcmUob3BlcmF0b3IsIHZhbDEsIHZhbDIpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xvZ2ljX29wZXJhdGlvbic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IGJsb2NrLmZpZWxkcy5PUFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbDEgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuQSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsMiA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG9wZXJhdG9yLCB2YWwxLCB2YWwyIH0pXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdBTkQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDEgJiYgdmFsMlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdPUic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsMSB8fCB2YWwyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAoYFVua25vd24gb3BlcmF0b3IgJyR7b3BlcmF0b3J9J2ApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xvZ2ljX2Jvb2xlYW4nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdCA9IGJsb2NrLmZpZWxkcy5CT09MXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rlc3QnLCB0ZXN0KVxuICAgICAgICAgICAgICAgIHJldHVybiAodGVzdCA9PSAnVFJVRScpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xvZ2ljX25lZ2F0ZSc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkJPT0wsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIHJldHVybiAhdGVzdFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsb2dpY190ZXJuYXJ5JzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3QgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuSUYsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGlmICh0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuVEhFTiwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkVMU0UsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfaWYnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgaGFzRWxzZSA9IGZhbHNlXG4gICAgICAgICAgICAgICAgbGV0IG5iSWYgPSAxXG5cbiAgICAgICAgICAgICAgICBjb25zdCB7IGV4dHJhU3RhdGUgfSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgaWYgKGV4dHJhU3RhdGUgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRyYVN0YXRlLmhhc0Vsc2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNFbHNlID0gZXh0cmFTdGF0ZS5oYXNFbHNlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dHJhU3RhdGUuZWxzZUlmQ291bnQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYklmICs9IGV4dHJhU3RhdGUuZWxzZUlmQ291bnRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGhhc0Vsc2UsIG5iSWYgfSlcbiAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYklmOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWZOYW1lID0gYElGJHtpfWBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZG9OYW1lID0gYERPJHtpfWBcbiAgICAgICAgICAgICAgICAgICAgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0c1tpZk5hbWVdLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaWZOYW1lLCB0ZXN0KVxuICAgICAgICAgICAgICAgICAgICBpZiAodGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzW2RvTmFtZV0sIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChoYXNFbHNlICYmICF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5FTFNFLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnY29udHJvbHNfd2hpbGVVbnRpbCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gYmxvY2suZmllbGRzLk1PREVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IG1vZGUgfSlcbiAgICAgICAgICAgICAgICBpZiAobW9kZSA9PSAnV0hJTEUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkJPT0wpXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuRE8pXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkJPT0wpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobW9kZSA9PSAnVU5USUwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkJPT0wpXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICghdGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdCA9IGF3YWl0IGV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT09MKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBgVW5rbm93biBtb2RlICcke21vZGV9J2BcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2NvbnRyb2xzX2ZvckVhY2gnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFyTmFtZSA9IGJsb2NrLmZpZWxkcy5WQVJcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkxJU1QsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgdmFyTmFtZSwgbGlzdCB9KVxuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnaW4gZm9yRWFjaCBsaXN0IGlzIG5vdCBhbiBBcnJheSAhJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgbGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFZhcmlhYmxlc1t2YXJOYW1lXSA9IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJyZWFrU3RhdGUgPT0gJ0JSRUFLJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJyZWFrU3RhdGUgPT0gJ0NPTlRJTlVFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsVmFyaWFibGVzW3Zhck5hbWVdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2NvbnRyb2xzX2Zvcic6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJOYW1lID0gYmxvY2suZmllbGRzLlZBUlxuICAgICAgICAgICAgICAgIGNvbnN0IGZyb20gPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuU1RBUlQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkVORCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgYnkgPSBhd2FpdCBldmFsQ29kZShibG9jay5pbnB1dHMuU1RFUCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmcm9tLCB0bywgYnksIHZhck5hbWUgfSlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gZnJvbTsgaSA8PSB0bzsgaSArPSBieSkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFZhcmlhYmxlc1t2YXJOYW1lXSA9IGlcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJyZWFrU3RhdGUgPT0gJ0JSRUFLJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJyZWFrU3RhdGUgPT0gJ0NPTlRJTlVFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsVmFyaWFibGVzW3Zhck5hbWVdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3Byb2NlZHVyZXNfY2FsbG5vcmV0dXJuJzogYXN5bmMgZnVuY3Rpb24gKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IGJsb2NrLmZpZWxkcy5QUk9DTkFNRVxuXG4gICAgICAgICAgICAgICAgY29uc3QgeyBpbnB1dHMsIGZpZWxkcyB9ID0gcHJvY2VkdXJlQmxvY2tbZnVuY3Rpb25OYW1lXVxuXG5cbiAgICAgICAgICAgICAgICBpZiAoaW5wdXRzICE9IHVuZGVmaW5lZCkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFyZ05hbWVzID0gZ2V0QXJnTmFtZXMoZmllbGRzKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGFyZ05hbWVzIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGV4dCA9IHt9XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFyZ05hbWUgPSBgQVJHJHtpfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZXZhbENvZGUoYmxvY2suaW5wdXRzW2FyZ05hbWVdLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRleHRbYXJnTmFtZXNbaV1dID0gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coeyBmdW5jdGlvbk5hbWUsIG5ld0NvbnRleHQgfSlcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRzLlNUQUNLICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXZhbENvZGUoaW5wdXRzLlNUQUNLLCBuZXdDb250ZXh0KVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0cy5SRVRVUk4gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZXZhbENvZGUoaW5wdXRzLlJFVFVSTiwgbmV3Q29udGV4dClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdwcm9jZWR1cmVzX2NhbGxyZXR1cm4nOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2VkdXJlc19jYWxsbm9yZXR1cm4oYmxvY2ssIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdjb250cm9sc19mbG93X3N0YXRlbWVudHMnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmxvdyA9IGJsb2NrLmZpZWxkcy5GTE9XXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmbG93IH0pXG4gICAgICAgICAgICAgICAgYnJlYWtTdGF0ZSA9IGZsb3dcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGlzdHNfY3JlYXRlX3dpdGgnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBpbnB1dHMsIGV4dHJhU3RhdGUgfSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgY29uc3QgeyBpdGVtQ291bnQgfSA9IGV4dHJhU3RhdGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGl0ZW1Db3VudCB9KVxuICAgICAgICAgICAgICAgIGNvbnN0IHJldCA9IFtdXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtQ291bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmdOYW1lID0gJ0FERCcgKyBpXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dHMgIT0gdW5kZWZpbmVkICYmIGlucHV0c1thcmdOYW1lXSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IGF3YWl0IGV2YWxDb2RlKGlucHV0c1thcmdOYW1lXSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgcmV0IH0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsaXN0c19nZXRJbmRleCc6IGFzeW5jIGZ1bmN0aW9uIChibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGZpZWxkcywgaW5wdXRzIH0gPSBibG9ja1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSBmaWVsZHMuTU9ERVxuICAgICAgICAgICAgICAgIGNvbnN0IHdoZXJlID0gZmllbGRzLldIRVJFXG4gICAgICAgICAgICAgICAgLyoqQHR5cGUge0FycmF5PGFueT59ICovXG4gICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IGF3YWl0IGV2YWxDb2RlKGlucHV0cy5WQUxVRSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBsaXN0LCBtb2RlLCB3aGVyZSB9KVxuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnaW4gZ2V0SW5kZXggbGlzdCBpcyBub3QgYW4gQXJyYXkgISdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IHJldFxuICAgICAgICAgICAgICAgIGlmIChtb2RlID09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh3aGVyZSA9PSAnRlJPTV9TVEFSVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGV2YWxDb2RlKGlucHV0cy5BVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGlkeCB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gbGlzdFtpZHggLSAxXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdGUk9NX0VORCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGV2YWxDb2RlKGlucHV0cy5BVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGlkeCB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gbGlzdC5zbGljZSgtaWR4KVswXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdGSVJTVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IGxpc3RbMF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh3aGVyZSA9PSAnTEFTVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IGxpc3Quc2xpY2UoLTEpWzBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobW9kZSA9PSAnR0VUX1JFTU9WRScgfHwgbW9kZSA9PSAnUkVNT1ZFJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAod2hlcmUgPT0gJ0ZST01fU1RBUlQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSBhd2FpdCBldmFsQ29kZShpbnB1dHMuQVQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBpZHggfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IGxpc3Quc3BsaWNlKGlkeCAtIDEsIDEpWzBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAod2hlcmUgPT0gJ0ZST01fRU5EJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gYXdhaXQgZXZhbENvZGUoaW5wdXRzLkFULCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgaWR4IH0pXG4gICAgICAgICAgICAgICAgICAgICAgICByZXQgPSBsaXN0LnNwbGljZSgtaWR4LCAxKVswXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdGSVJTVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IGxpc3Quc2hpZnQoKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdMQVNUJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gbGlzdC5wb3AoKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyByZXQgfSlcblxuICAgICAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGlzdHNfc2V0SW5kZXgnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBmaWVsZHMsIGlucHV0cyB9ID0gYmxvY2tcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gZmllbGRzLk1PREVcbiAgICAgICAgICAgICAgICBjb25zdCB3aGVyZSA9IGZpZWxkcy5XSEVSRVxuICAgICAgICAgICAgICAgIC8qKkB0eXBlIHtBcnJheTxhbnk+fSAqL1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBhd2FpdCBldmFsQ29kZShpbnB1dHMuTElTVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhd2FpdCBldmFsQ29kZShpbnB1dHMuVE8sIGxvY2FsVmFyaWFibGVzKVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBsaXN0LCBtb2RlLCB3aGVyZSB9KVxuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnaW4gc2V0SW5kZXggbGlzdCBpcyBub3QgYW4gQXJyYXkgISdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IHJldFxuICAgICAgICAgICAgICAgIGlmIChtb2RlID09ICdTRVQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh3aGVyZSA9PSAnRlJPTV9TVEFSVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGV2YWxDb2RlKGlucHV0cy5BVCwgbG9jYWxWYXJpYWJsZXMpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHsgaWR4IH0pXG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0W2lkeCAtIDFdID0gbmV3VmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh3aGVyZSA9PSAnRlJPTV9FTkQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSBhd2FpdCBldmFsQ29kZShpbnB1dHMuQVQsIGxvY2FsVmFyaWFibGVzKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGlkeCB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFtsaXN0Lmxlbmd0aCAtIGlkeF0gPSBuZXdWYWx1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdGSVJTVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RbMF0gPSBuZXdWYWx1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdMQVNUJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFtsZW5ndGggLSAxXSA9IG5ld1ZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobW9kZSA9PSAnSU5TRVJUJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAod2hlcmUgPT0gJ0ZST01fU1RBUlQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSBhd2FpdCBldmFsQ29kZShpbnB1dHMuQVQsIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBpZHggfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Quc3BsaWNlKGlkeCAtIDEsIDAsIG5ld1ZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdGUk9NX0VORCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IGF3YWl0IGV2YWxDb2RlKGlucHV0cy5BVCwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh7IGlkeCB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5zcGxpY2UobGlzdC5sZW5ndGggLSBpZHgsIDAsIG5ld1ZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHdoZXJlID09ICdGSVJTVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QudW5zaGlmdChuZXdWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh3aGVyZSA9PSAnTEFTVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXdWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsaXN0c19sZW5ndGgnOiBhc3luYyBmdW5jdGlvbiAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBpbnB1dHMgfSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgLyoqQHR5cGUge0FycmF5PGFueT59ICovXG4gICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IGF3YWl0IGV2YWxDb2RlKGlucHV0cy5WQUxVRSwgbG9jYWxWYXJpYWJsZXMpXG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdpbiBnZXRMZW5ndGggbGlzdCBpcyBub3QgYW4gQXJyYXkgISdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QubGVuZ3RoXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB0ZXh0VG9UaXRsZUNhc2Uoc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1xcUysvZyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAodHh0KSB7IHJldHVybiB0eHRbMF0udG9VcHBlckNhc2UoKSArIHR4dC5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKTsgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZhclZhbHVlKHZhck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZXNWYWx1ZVt2YXJOYW1lXVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZHVtcFZhcmlhYmxlcygpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkdW1wVmFyaWFibGVzOicpXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFyaWFibGVzVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7bmFtZX09JHt2YWx1ZX1gKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBldmFsQ29kZShibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgIGlmIChibG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChibG9jay50eXBlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChibG9jay5ibG9jayAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2sgPSBibG9jay5ibG9ja1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChibG9jay5zaGFkb3cgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrID0gYmxvY2suc2hhZG93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBgTWlzc2lnIHBhcmFtZXRlciBibG9jayBvciBzaGFkb3dgXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXZhbENvZGUnLCBibG9jay50eXBlLCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgIGNvbnN0IGZuID0gYmxvY2tUeXBlTWFwW2Jsb2NrLnR5cGVdXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZuICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYmxvY2snLCBibG9jaylcbiAgICAgICAgICAgICAgICB0aHJvdyBgZnVuY3Rpb24gJyR7YmxvY2sudHlwZX0nIG5vdCBpbXBsZW1lbnRlZCB5ZXRgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXQgPSBhd2FpdCBmbi5jYWxsKGJsb2NrVHlwZU1hcCwgYmxvY2ssIGxvY2FsVmFyaWFibGVzKVxuICAgICAgICAgICAgaWYgKGJsb2NrLm5leHQgIT0gdW5kZWZpbmVkICYmIGJyZWFrU3RhdGUgPT0gJycpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jay5uZXh0LCBsb2NhbFZhcmlhYmxlcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEZ1bmN0aW9uTmFtZXMoeyBibG9ja3MgfSkge1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gW11cbiAgICAgICAgICAgIGlmIChibG9ja3MgJiYgYmxvY2tzLmJsb2Nrcykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGJsb2NrIG9mIGJsb2Nrcy5ibG9ja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrLnR5cGUgPT0gJ3Byb2NlZHVyZXNfZGVmbm9yZXR1cm4nIHx8IGJsb2NrLnR5cGUgPT0gJ3Byb2NlZHVyZXNfZGVmcmV0dXJuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2VkdXJlTmFtZSA9IGJsb2NrLmZpZWxkcy5OQU1FXG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaChwcm9jZWR1cmVOYW1lKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRBcmdOYW1lcyhmaWVsZHMpIHtcbiAgICAgICAgICAgIGNvbnN0IGFyZ05hbWVzID0gW11cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBkb25lID0gZmFsc2U7ICFkb25lOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhcmdOYW1lID0gZmllbGRzWydWQVInICsgaV1cbiAgICAgICAgICAgICAgICBpZiAoYXJnTmFtZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJnTmFtZXMucHVzaChhcmdOYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJnTmFtZXNcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGNhbGxGdW5jdGlvbihmdW5jdGlvbk5hbWUsIC4uLmZ1bmN0aW9uQXJncykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbGxGdW5jdGlvbicsIGZ1bmN0aW9uTmFtZSwgZnVuY3Rpb25BcmdzKVxuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSBwcm9jZWR1cmVCbG9ja1tmdW5jdGlvbk5hbWVdXG4gICAgICAgICAgICBpZiAoYmxvY2sgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgYGZ1bmN0aW9uICcke2Z1bmN0aW9uTmFtZX0nIGRvZXMgbm90IGV4aXN0cyAhYFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGlucHV0cywgZmllbGRzIH0gPSBibG9ja1xuXG4gICAgICAgICAgICBpZiAoaW5wdXRzICE9IHVuZGVmaW5lZCkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYXJnTmFtZXMgPSBnZXRBcmdOYW1lcyhmaWVsZHMpXG5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZXh0ID0ge31cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ05hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld0NvbnRleHRbYXJnTmFtZXNbaV1dID0gZnVuY3Rpb25BcmdzW2ldXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeyBmdW5jdGlvbk5hbWUsIG5ld0NvbnRleHQgfSlcblxuICAgICAgICAgICAgICAgIGlmIChpbnB1dHMuU1RBQ0sgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGV2YWxDb2RlKGlucHV0cy5TVEFDSywgbmV3Q29udGV4dClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBzdGFydENvZGUoeyBibG9ja3MgfSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0Q29kZScpXG5cbiAgICAgICAgICAgIHZhcmlhYmxlc1ZhbHVlID0ge31cbiAgICAgICAgICAgIHByb2NlZHVyZUJsb2NrID0ge31cbiAgICAgICAgICAgIGNvbnN0IGNvZGVCbG9ja3MgPSBibG9ja3MuYmxvY2tzXG4gICAgICAgICAgICBicmVha1N0YXRlID0gJydcblxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIGNvZGVCbG9ja3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2sudHlwZSA9PSAnZ2xvYmFsX2RlY2xhcmF0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jaylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoYmxvY2sudHlwZSA9PSAncHJvY2VkdXJlc19kZWZub3JldHVybicgfHwgYmxvY2sudHlwZSA9PSAncHJvY2VkdXJlc19kZWZyZXR1cm4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2NlZHVyZU5hbWUgPSBibG9jay5maWVsZHMuTkFNRVxuICAgICAgICAgICAgICAgICAgICBwcm9jZWR1cmVCbG9ja1twcm9jZWR1cmVOYW1lXSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncHJvY2VkdXJlczonKVxuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9jZWR1cmVOYW1lIG9mIE9iamVjdC5rZXlzKHByb2NlZHVyZUJsb2NrKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHByb2NlZHVyZU5hbWUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZvciAoY29uc3QgYmxvY2sgb2YgY29kZUJsb2Nrcykge1xuICAgICAgICAgICAgLy8gICAgIGlmIChibG9jay50eXBlICE9ICdwcm9jZWR1cmVzX2RlZm5vcmV0dXJuJyAmJlxuICAgICAgICAgICAgLy8gICAgICAgICBibG9jay50eXBlICE9ICdwcm9jZWR1cmVzX2RlZnJldHVybicgJiZcbiAgICAgICAgICAgIC8vICAgICAgICAgYmxvY2sudHlwZSAhPSAnZ2xvYmFsX2RlY2xhcmF0aW9uJykge1xuICAgICAgICAgICAgLy8gICAgICAgICBhd2FpdCBldmFsQ29kZShibG9jaywge30pXG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgZHVtcFZhcmlhYmxlcygpXG4gICAgICAgICAgICBjYWxsRnVuY3Rpb24oJ21haW4nKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0TG9nRnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIGxvZ0Z1bmN0aW9uID0gZm5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEJsb2NrVHlwZSh0eXBlTmFtZSwgZm4pIHtcbiAgICAgICAgICAgIGJsb2NrVHlwZU1hcFt0eXBlTmFtZV0gPSBmblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0Q29kZSxcbiAgICAgICAgICAgIHNldExvZ0Z1bmN0aW9uLFxuICAgICAgICAgICAgZXZhbENvZGUsXG4gICAgICAgICAgICBkdW1wVmFyaWFibGVzLFxuICAgICAgICAgICAgYWRkQmxvY2tUeXBlLFxuICAgICAgICAgICAgZ2V0VmFyVmFsdWUsXG4gICAgICAgICAgICBnZXRGdW5jdGlvbk5hbWVzLFxuICAgICAgICAgICAgY2FsbEZ1bmN0aW9uLFxuICAgICAgICAgICAgbWF0aENvbXBhcmVcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYnJva2VyJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuXHRcdGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuXHRcdGxldCBzb2NrID0gbnVsbFxuXHRcdGxldCBpc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0bGV0IHRyeVJlY29ubmVjdCA9IHRydWVcblx0XHRsZXQgaXNQaW5nT2sgPSB0cnVlXG5cdFx0Y29uc3QgdG9waWNzID0gbmV3IEV2ZW50RW1pdHRlcjIoeyB3aWxkY2FyZDogdHJ1ZSB9KVxuXHRcdGNvbnN0IHBpbmdJbnRlcnZhbCA9IDEwICogMTAwMFxuXHRcdGxldCB0aW1lb3V0SWQgPSBudWxsXG5cdFx0Y29uc3QgcmVnaXN0ZXJlZFRvcGljcyA9IHt9XG5cblx0XHRsZXQgeyBob3N0LCBwYXRobmFtZSwgcHJvdG9jb2wgfSA9IGxvY2F0aW9uXG5cdFx0cHJvdG9jb2wgPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRjb25zdCB1cmwgPSBgJHtwcm90b2NvbH0vLyR7aG9zdH0vaG1pJHtwYXRobmFtZX1gXG5cblx0XHRmdW5jdGlvbiBvbkNsb3NlKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25DbG9zZScpXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0ZXZlbnRzLmVtaXQoJ2Nvbm5lY3RlZCcsIGZhbHNlKVxuXHRcdFx0fVxuXHRcdFx0aXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRyeVJlY29ubmVjdCkge1xuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHsgY29ubmVjdCgpIH0sIDUwMDApXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2hlY2tQaW5nKCkge1xuXHRcdFx0dGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cblx0XHRcdFx0aWYgKCFpc1BpbmdPaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCd0aW1lb3V0IHBpbmcnKVxuXHRcdFx0XHRcdHNvY2sub25tZXNzYWdlID0gbnVsbFxuXHRcdFx0XHRcdHNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHRzb2NrLmNsb3NlKClcblx0XHRcdFx0XHRvbkNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdwaW5nJyB9KVxuXHRcdFx0XHRcdGNoZWNrUGluZygpXG5cdFx0XHRcdH1cblx0XHRcdH0sIHBpbmdJbnRlcnZhbClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHRzb2NrID0gbmV3IFdlYlNvY2tldCh1cmwpXG5cblx0XHRcdHNvY2sub25vcGVuID0gKCkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkNvbm5lY3RlZCB0byBicm9rZXJcIilcblx0XHRcdFx0aXNDb25uZWN0ZWQgPSB0cnVlXG5cdFx0XHRcdGlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHRldmVudHMuZW1pdCgnY29ubmVjdGVkJywgdHJ1ZSlcblx0XHRcdFx0Y2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHNvY2sub25tZXNzYWdlID0gKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSBzb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIG1lc3NhZ2UgYmFkIHRhcmdldCcsIG1zZy50eXBlKVxuXHRcdFx0XHRcdGV2LmN1cnJlbnRUYXJnZXQuY2xvc2UoKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIG1lc3NhZ2UnLCBtc2cpXG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyhyZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdyZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGV2ZW50cy5lbWl0KCdyZWFkeScsIHsgY2xpZW50SWQ6IG1zZy5jbGllbnRJZCB9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdGlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdub3RpZicpIHtcblx0XHRcdFx0XHR0b3BpY3MuZW1pdChtc2cudG9waWMsIG1zZylcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAnZXJyb3InKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIGxvZycsIG1zZy50ZXh0KVxuXHRcdFx0XHRcdHRyeVJlY29ubmVjdCA9IGZhbHNlXG5cdFx0XHRcdFx0c29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRzb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gc29jaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbYnJva2VyXSBjbG9zZSBiYWQgdGFyZ2V0Jylcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UnKVxuXHRcdFx0XHRpZiAodGltZW91dElkICE9IG51bGwpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZW91dElkKVxuXHRcdFx0XHRcdHRpbWVvdXRJZCA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0XHRvbkNsb3NlKClcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNlbmRNc2cobXNnKSB7XG5cdFx0XHRtc2cudGltZSA9IERhdGUubm93KClcblx0XHRcdGNvbnN0IHRleHQgPSBKU09OLnN0cmluZ2lmeShtc2cpXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gc2VuZE1zZycsIG1zZylcblx0XHRcdFx0c29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdGNvbnN0IG1zZyA9IHtcblx0XHRcdFx0dHlwZTogJ25vdGlmJyxcblx0XHRcdFx0dG9waWMsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH1cblxuXHRcdFx0c2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb2ZmVG9waWModG9waWMsIGNhbGxiYWNrKSB7XG5cdFx0XHR0b3BpY3Mub2ZmKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAocmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID0gMVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0b3BpY3Mub24odG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdyZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdW5yZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblxuXHRcdFx0dG9waWNzLm9mZih0b3BpYywgY2FsbGJhY2spXG5cblx0XHRcdGlmICgtLXJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdXG5cdFx0XHRcdHNlbmRNc2coeyB0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29ubmVjdCgpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0ZW1pdFRvcGljLFxuXHRcdFx0b25Ub3BpYyxcblx0XHRcdG9mZlRvcGljLFxuXHRcdFx0cmVnaXN0ZXIsXG5cdFx0XHR1bnJlZ2lzdGVyLFxuXHRcdFx0b246IGV2ZW50cy5vbi5iaW5kKGV2ZW50cylcblxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmNpdGllcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgaHR0cFNydikge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NpdGllcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0Q291bnRyaWVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvY291bnRyaWVzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGllczogZnVuY3Rpb24oY291bnRyeSwgc2VhcmNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jaXRpZXMnLCB7Y291bnRyeSwgc2VhcmNofSlcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGVzRnJvbVBvc3RhbENvZGU6IGFzeW5jIGZ1bmN0aW9uKHBvc3RhbENvZGUpIHtcblx0XHRcdFx0Y29uc3QgdXJsID0gJ2h0dHBzOi8vYXBpY2FydG8uaWduLmZyL2FwaS9jb2Rlcy1wb3N0YXV4L2NvbW11bmVzLycgKyBwb3N0YWxDb2RlXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IGh0dHBTcnYuZ2V0KHVybClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0XHRyZXR1cm4gaW5mby5tYXAoKGkpID0+IGkubGliZWxsZUFjaGVtaW5lbWVudClcdFxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gW11cblx0XHRcdFx0fVxuXHRcblx0XHRcdH1cblxuXG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NvbnRhY3RzJylcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdGFkZENvbnRhY3Q6IGZ1bmN0aW9uIChpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRDb250YWN0YCwgaW5mbylcblx0XHRcdH0sXG5cdFx0XHRnZXRDb250YWN0czogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbiAoY29udGFjdElkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZUNvbnRhY3QvJHtjb250YWN0SWR9YClcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZUNvbnRhY3RJbmZvOiBmdW5jdGlvbiAoY29udGFjdElkLCBpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC91cGRhdGVDb250YWN0SW5mby8ke2NvbnRhY3RJZH1gLCBpbmZvKVxuXHRcdFx0fVxuXHRcdFx0XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5kaXNwbGF5Jywge1xuXG4gICAgZGVwczogWydicmVpemJvdC5wYXJhbXMnXSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHBhcmFtcykge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuICAgICAgICBjb25zdCBwcmVzZW50YXRpb25SZXF1ZXN0ID0gbmV3IFByZXNlbnRhdGlvblJlcXVlc3QoJCQudXJsLmdldFVybFBhcmFtcygnL2FwcHMvY2FzdCcsIHsgaWQ6IHBhcmFtcy4kaWQgfSkpXG4gICAgICAgIGxldCBwcmVzZW50YXRpb25Db25uZWN0aW9uID0gbnVsbFxuXG4gICAgICAgIHByZXNlbnRhdGlvblJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGlvbmF2YWlsYWJsZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb25hdmFpbGFibGUnLCBldmVudClcbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24gPSBldmVudC5jb25uZWN0aW9uXG5cbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ21lc3NhZ2UnLCBldmVudC5kYXRhKVxuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSlcbiAgICAgICAgICAgICAgICBzd2l0Y2gobXNnLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVhZHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3JlYWR5JylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2V2ZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KG1zZy5uYW1lLCBtc2cudmFsdWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcHJlc2VudGF0aW9uQ29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCd0ZXJtaW5hdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnY2xvc2UnKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ2Nvbm5lY3Rpb25hdmFpbGFibGUnKVxuICAgICAgICB9KVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGdldEF2YWlsYWJpbGl0eSgpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IHByZXNlbnRhdGlvblJlcXVlc3QuZ2V0QXZhaWxhYmlsaXR5KClcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0F2YWlsYWJsZSBwcmVzZW50YXRpb24gZGlzcGxheXM6ICcgKyBhdmFpbGFiaWxpdHkudmFsdWUpXG5cbiAgICAgICAgICAgIGF2YWlsYWJpbGl0eS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJz4gQXZhaWxhYmxlIHByZXNlbnRhdGlvbiBkaXNwbGF5czogJyArIGF2YWlsYWJpbGl0eS52YWx1ZSlcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnYXZhaWxhYmlsaXR5JywgYXZhaWxhYmlsaXR5LnZhbHVlKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IGF3YWl0IHByZXNlbnRhdGlvblJlcXVlc3Quc3RhcnQoKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLnRlcm1pbmF0ZSgpXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VuZE1zZyhtc2cpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NlbmRNc2cnLCBtc2cpXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLnNlbmQoSlNPTi5zdHJpbmdpZnkobXNnKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldFVybCh1cmwpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAndXJsJywgdXJsIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRWb2x1bWUodm9sdW1lKSB7XG4gICAgICAgICAgICBzZW5kTXNnKHsgdHlwZTogJ3ZvbHVtZScsIHZvbHVtZSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0Q3VycmVudFRpbWUoY3VycmVudFRpbWUpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAnY3VycmVudFRpbWUnLCBjdXJyZW50VGltZSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcGxheSgpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdwbGF5J30pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwYXVzZSgpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdwYXVzZSd9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNTdGFydGVkKCkge1xuICAgICAgICAgICAgcmV0dXJuIChwcmVzZW50YXRpb25Db25uZWN0aW9uICE9IG51bGwpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmFibGVLYXJhb2tlKGVuYWJsZWQpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdlbmFibGVLYXJhb2tlJywgZW5hYmxlZH0pXG4gICAgICAgIH1cblxuICAgICAgICBnZXRBdmFpbGFiaWxpdHkoKVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgY2xvc2UsXG4gICAgICAgICAgICBpc1N0YXJ0ZWQsXG4gICAgICAgICAgICBzZXRVcmwsXG4gICAgICAgICAgICBzZXRWb2x1bWUsXG4gICAgICAgICAgICBzZXRDdXJyZW50VGltZSxcbiAgICAgICAgICAgIHBsYXksXG4gICAgICAgICAgICBwYXVzZSxcbiAgICAgICAgICAgIGVuYWJsZUthcmFva2VcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5maWxlcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0geyp9IGNvbmZpZyBcblx0ICogQHBhcmFtIHsqfSByZXNvdXJjZSBcblx0ICogQHBhcmFtIHsqfSBwYXJhbXMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHJldHVybnMgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSwgcGFyYW1zLCBwYWdlcikge1xuXHRcdC8qKkB0eXBlIHtCcmFpbmpzLlNlcnZpY2VzLkh0dHAuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9maWxlcycpXG5cblx0XHRjb25zdCBzYXZpbmdEbGcgPSAkJC51aS5wcm9ncmVzc0RpYWxvZygpXG5cblx0XHRsZXQgcm9vdERpciA9ICcvJ1xuXG5cdFx0ZnVuY3Rpb24gZmlsZVVybChmaWxlTmFtZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHsgZmlsZU5hbWUsIGZyaWVuZFVzZXIgfSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvcGVuRmlsZSh0aXRsZSwgcHJvcHMsIGNiaykge1xuXHRcdFx0cHJvcHMucm9vdERpciA9IHJvb3REaXJcblx0XHRcdGlmICh0eXBlb2YgcHJvcHMgPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0cHJvcHMgPSB7ZmlsdGVyRXh0ZW5zaW9uOiBwcm9wc31cblx0XHRcdH1cblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdHByb3BzLFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShkYXRhKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGFzeW5jIGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRyb290RGlyID0gZGF0YS5yb290RGlyXG5cdFx0XHRcdFx0ZGF0YS51cmwgPSBmaWxlVXJsKGRhdGEucm9vdERpciArIGRhdGEuZmlsZU5hbWUpXG5cdFx0XHRcdFx0Y2JrKGRhdGEpXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbkZpbGUsXG5cdFx0XHRleGlzdHM6IGZ1bmN0aW9uKGZpbGVQYXRoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9leGlzdHMnLCB7IGZpbGVQYXRoIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlSW5mbzogZnVuY3Rpb24gKGZpbGVQYXRoLCBmcmllbmRVc2VyLCBvcHRpb25zKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gZmlsZUluZm8nLCBmaWxlUGF0aCwgZnJpZW5kVXNlciwgb3B0aW9ucylcblxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZmlsZUluZm8nLCB7IGZpbGVQYXRoLCBmcmllbmRVc2VyLCBvcHRpb25zIH0pXG5cdFx0XHR9LFxuXHRcdFx0bGlzdDogZnVuY3Rpb24gKGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbGlzdCcsIGRlc3RQYXRoKVxuXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9saXN0JywgeyBkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlciB9KVxuXHRcdFx0fSxcblxuXHRcdFx0bW92ZTogZnVuY3Rpb24oZmlsZU5hbWUsIGRlc3RQYXRoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9tb3ZlJywgeyBkZXN0UGF0aCwgZmlsZU5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVVybCxcblxuXHRcdFx0ZmlsZUFwcFVybDogZnVuY3Rpb24oZmlsZU5hbWUpIHtcblx0XHRcdFx0ZmlsZU5hbWUgPSBgL2FwcHMvJHtwYXJhbXMuJGFwcE5hbWV9LyR7ZmlsZU5hbWV9YFxuXHRcdFx0XHRyZXR1cm4gJCQudXJsLmdldFVybFBhcmFtcygnL2FwaS9maWxlcy9sb2FkJywgeyBmaWxlTmFtZSB9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZVRodW1ibmFpbFVybDogZnVuY3Rpb24gKGZpbGVOYW1lLCBzaXplLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRcdHJldHVybiAkJC51cmwuZ2V0VXJsUGFyYW1zKCcvYXBpL2ZpbGVzL2xvYWRUaHVtYm5haWwnLCB7IGZpbGVOYW1lLCBzaXplLCBmcmllbmRVc2VyIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlQXBwVGh1bWJuYWlsVXJsOiBmdW5jdGlvbiAoZmlsZU5hbWUsIHNpemUpIHtcblx0XHRcdFx0ZmlsZU5hbWUgPSBgL2FwcHMvJHtwYXJhbXMuJGFwcE5hbWV9LyR7ZmlsZU5hbWV9YFxuXHRcdFx0XHRyZXR1cm4gJCQudXJsLmdldFVybFBhcmFtcygnL2FwaS9maWxlcy9sb2FkVGh1bWJuYWlsJywgeyBmaWxlTmFtZSwgc2l6ZSB9KVxuXHRcdFx0fSxcblxuXHRcdFx0YXNzZXRzVXJsOiBmdW5jdGlvbihmaWxlTmFtZSkgIHtcblx0XHRcdFx0cmV0dXJuICBgL3dlYmFwcHMvJHtwYXJhbXMuJGFwcE5hbWV9L2Fzc2V0cy8ke2ZpbGVOYW1lfWBcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcGFyYW0ge0Jsb2J9IGJsb2IgXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gc2F2ZUFzZmlsZU5hbWUgXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gZGVzdFBhdGggXG5cdFx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IGNoZWNrRXhpc3RzXG5cdFx0XHQgKiBAcGFyYW0geyp9IG9uVXBsb2FkUHJvZ3Jlc3MgXG5cdFx0XHQgKiBAcmV0dXJucyBcblx0XHRcdCAqL1xuXHRcdFx0dXBsb2FkRmlsZTogYXN5bmMgZnVuY3Rpb24gKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCwgY2hlY2tFeGlzdHMsIG9uVXBsb2FkUHJvZ3Jlc3MpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSB1cGxvYWRGaWxlJywgY2hlY2tFeGlzdHMsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aClcblx0XHRcdFx0aWYgKCEoYmxvYiBpbnN0YW5jZW9mIEJsb2IpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKCdGaWxlIGZvcm1hdCBub3Qgc3VwcG9ydGVkJylcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjaGVja0V4aXN0cykge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmZpbGVJbmZvKGRlc3RQYXRoICsgJy8nICsgc2F2ZUFzZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0ZpbGUgYWxyZWFkeSBleGlzdHMnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaChlKSB7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGZkID0gbmV3IEZvcm1EYXRhKClcblx0XHRcdFx0ZmQuYXBwZW5kKCdmaWxlJywgYmxvYiwgc2F2ZUFzZmlsZU5hbWUpXG5cdFx0XHRcdGZkLmFwcGVuZCgnZGVzdFBhdGgnLCBkZXN0UGF0aClcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdEZvcm1EYXRhKCcvc2F2ZScsIGZkLCBvblVwbG9hZFByb2dyZXNzKVxuXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2Jsb2InLCBibG9iKVxuXG5cdFx0XHR9LFxuXG5cdFx0XHRzYXZlRmlsZTogYXN5bmMgZnVuY3Rpb24gKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBvcHRpb25zKSB7XG5cdFx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cdFx0XHRcdGNvbnN0IGRlc3RQYXRoICA9IG9wdGlvbnMuZGVzdFBhdGggfHwgYC9hcHBzLyR7cGFyYW1zLiRhcHBOYW1lfWBcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRzYXZpbmdEbGcuc2V0UGVyY2VudGFnZSgwKVxuXHRcdFx0XHRcdHNhdmluZ0RsZy5zaG93KClcblx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgdGhpcy51cGxvYWRGaWxlKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCwgb3B0aW9ucy5jaGVja0V4aXN0cywgKHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0XHRzYXZpbmdEbGcuc2V0UGVyY2VudGFnZSh2YWx1ZSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGF3YWl0ICQkLnV0aWwud2FpdCgxMDAwKVxuXHRcdFx0XHRcdHNhdmluZ0RsZy5oaWRlKClcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yJywgZSlcblx0XHRcdFx0XHRzYXZpbmdEbGcuaGlkZSgpXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdFx0Y29udGVudDogZS5yZXNwb25zZVRleHQgfHwgZVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9XG5cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5mcmllbmRzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvZnJpZW5kcycpXG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHRnZXRGcmllbmRzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldEZyaWVuZHNgKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0RnJpZW5kSW5mbzogZnVuY3Rpb24gKGZyaWVuZCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZ2V0RnJpZW5kSW5mbycsIHsgZnJpZW5kIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRzZXRGcmllbmRJbmZvOiBmdW5jdGlvbiAoZnJpZW5kLCBncm91cHMsIHBvc2l0aW9uQXV0aCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvc2V0RnJpZW5kSW5mbycsIHsgZnJpZW5kLCBncm91cHMsIHBvc2l0aW9uQXV0aCB9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkRnJpZW5kOiBmdW5jdGlvbiAoZnJpZW5kVXNlck5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZEZyaWVuZGAsIHsgZnJpZW5kVXNlck5hbWUgfSlcblx0XHRcdH1cblxuXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZnVsbHNjcmVlbicsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuXG4gICAgICAgIGZ1bmN0aW9uIGluaXQoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ3ZWJraXRmdWxsc2NyZWVuY2hhbmdlXCIsIGUgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3dlYmtpdGZ1bGxzY3JlZW5jaGFuZ2UnKSAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAhPSBudWxsKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImZ1bGxzY3JlZW5jaGFuZ2VcIiwgZSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZnVsbHNjcmVlbmNoYW5nZScpXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgIT0gbnVsbClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2tleWRvd24nLCBlLmtleSlcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXkgPT0gXCJGMTFcIikge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVudGVyKCkge1xuICAgICAgICAgICAgY29uc3QgZWxlbSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdEZ1bGxzY3JlZW4gPSBlbGVtLnJlcXVlc3RGdWxsc2NyZWVuIHx8XG4gICAgICAgICAgICAgICAgZWxlbS53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlblxuXG4gICAgICAgICAgICBpZiAocmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0RnVsbHNjcmVlbi5jYWxsKGVsZW0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGV4aXQoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpXG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGluaXQsXG4gICAgICAgICAgICBlbnRlcixcbiAgICAgICAgICAgIGV4aXRcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbihmdW5jdGlvbiAoKSB7XG5cbiAgICBjbGFzcyBNeUdhbWVwYWQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIyIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgICAgIHRoaXMuYnV0dG9ucyA9IFtdXG4gICAgICAgICAgICB0aGlzLmF4ZXMgPSBbXVxuXG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZ2FtZXBhZGNvbm5lY3RlZCcsIChldikgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2dhbWVwYWRjb25uZWN0ZWQnLCBldilcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHsgcHJlc3NlZCB9IG9mIGV2LmdhbWVwYWQuYnV0dG9ucykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1dHRvbnMucHVzaChwcmVzc2VkKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdmFsIG9mIGV2LmdhbWVwYWQuYXhlcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF4ZXMucHVzaCh2YWwpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2J1dHRvbnMnLCBidXR0b25zKVxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdGVkJywgZXYuZ2FtZXBhZClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdnYW1lcGFkZGlzY29ubmVjdGVkJywgKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZ2FtZXBhZGRpc2Nvbm5lY3RlZCcsIGV2KVxuICAgICAgICAgICAgICAgIHRoaXMuYnV0dG9ucyA9IFtdXG4gICAgICAgICAgICAgICAgdGhpcy5heGVzID0gW11cblxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZGlzY29ubmVjdGVkJywgZXYuZ2FtZXBhZClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBjaGVja0dhbWVQYWRTdGF0dXMoKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbMF1cbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwcmVzc2VkIH0gPSBpbmZvLmJ1dHRvbnNbaV1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXNzZWQgIT0gdGhpcy5idXR0b25zW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQocHJlc3NlZCA/ICdidXR0b25Eb3duJyA6ICdidXR0b25VcCcsIHsgaWQ6IGkgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnV0dG9uc1tpXSA9IHByZXNzZWRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGluZm8uYXhlc1tpXVxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgIT0gdGhpcy5heGVzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2F4ZScsIHsgaWQ6IGksIHZhbHVlIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmF4ZXNbaV0gPSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodGhpcy5jaGVja0dhbWVQYWRTdGF0dXMuYmluZCh0aGlzKSwgNTApXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBnZXRCdXR0b25TdGF0ZShidXR0b25JZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5nZXRHYW1lcGFkcygpWzBdLmJ1dHRvbnNbYnV0dG9uSWRdLnByZXNzZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGdldEF4ZVZhbHVlKGF4ZUlkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbMF0uYXhlc1theGVJZF1cbiAgICAgICAgfVxuXG4gICAgICAgIGdldEdhbWVwYWRzKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5nZXRHYW1lcGFkcygpXG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5nYW1lcGFkJywge1xuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICAgICAgcmV0dXJuIG5ldyBNeUdhbWVwYWQoKVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pKCk7XG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5nZW9sb2MnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLnJlc291cmNlJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9wb3NpdGlvbicpXG5cblxuXHRcdGxldCBjb29yZHMgPSBudWxsXG5cblx0XHRmdW5jdGlvbiBnZW9FcnJvcihlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZ2VvbG9jIGVycm9yOicsIGUpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTG9jYXRpb24ocG9zaXRpb24pIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3VwZGF0ZUxvY2F0aW9uJywgcG9zaXRpb24pXG5cdFx0XHRjb29yZHMgPSBwb3NpdGlvbi5jb29yZHNcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIHN0YXJ0V2F0Y2goKSB7XG5cblx0XHRcdG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24odXBkYXRlTG9jYXRpb24pXG5cblx0XHRcdG5hdmlnYXRvci5nZW9sb2NhdGlvbi53YXRjaFBvc2l0aW9uKHVwZGF0ZUxvY2F0aW9uLCBnZW9FcnJvcixcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGVuYWJsZUhpZ2hBY2N1cmFjeTogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHQpXHRcblxuXHRcdFx0c2V0SW50ZXJ2YWwoc2VuZFBvc2l0aW9uLCAzMCAqIDEwMDApIC8vIGV2ZXJ5IDMwIHNlY1xuXHRcdH1cblxuXG5cdFx0ZnVuY3Rpb24gc2VuZFBvc2l0aW9uKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VuZFBvc2l0aW9uJywgY29vcmRzKVxuXHRcdFx0aWYgKGNvb3JkcyAhPSBudWxsKSB7XG5cdFx0XHRcdGh0dHAucG9zdCgnL3Bvc2l0aW9uJywge1xuXHRcdFx0XHRcdGxhdDogY29vcmRzLmxhdGl0dWRlLFxuXHRcdFx0XHRcdGxuZzogY29vcmRzLmxvbmdpdHVkZVxuXHRcdFx0XHR9KVxuXG5cdFx0XHR9XG5cdFx0fVx0XHRcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdHN0YXJ0V2F0Y2hcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5odHRwJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZScsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIHJlc291cmNlLCBwYXJhbXMpIHtcblxuXHRcdHJldHVybiByZXNvdXJjZShgL2FwaS9hcHAvJHtwYXJhbXMuJGFwcE5hbWV9YClcblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Qubm90aWZzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvbm90aWZzJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzZW5kTm90aWY6IGZ1bmN0aW9uICh0bywgbm90aWYpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL3NlbmROb3RpZmAsIHsgdG8sIG5vdGlmIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVOb3RpZjogZnVuY3Rpb24gKG5vdGlmSWQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvcmVtb3ZlTm90aWYvJHtub3RpZklkfWApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXROb3RpZnM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Tm90aWZzYClcblx0XHRcdH0sXG5cblx0XHRcdGdldE5vdGlmQ291bnQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KGAvZ2V0Tm90aWZDb3VudGApXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAkKCcuYnJlaXpib3RQYWdlcicpLmlmYWNlKClcblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFyYW1zJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnID09ICdzdHJpbmcnKSA/IEpTT04ucGFyc2UoY29uZmlnKSA6IHt9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcblxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBsYXlsaXN0cycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3BsYXlsaXN0cycpXG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHRnZXRQbGF5bGlzdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZ2V0UGxheWxpc3RgKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0UGxheWxpc3RTb25nczogZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2dldFBsYXlsaXN0U29uZ3NgLCB7bmFtZX0pXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5yYWRhcicsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3JhZGFyJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRSYWRhcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycpXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcblxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnJ0YycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMuaHR0cCcsICdicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgaHR0cCwgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuXHRcdGNvbnN0IHByaXZhdGUgPSB7XG5cdFx0XHRzcmNJZDogbnVsbCxcblx0XHRcdGRlc3RJZDogbnVsbCxcblx0XHRcdGRpc3RhbnQ6ICcnLFxuXHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0aXNDYWxsZWU6IGZhbHNlXG5cdFx0fVxuXG5cblx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdHByaXZhdGUuZGlzdGFudCA9IHBhcmFtcy5jYWxsZXJcblx0XHRcdHByaXZhdGUuZGVzdElkID0gcGFyYW1zLmNsaWVudElkXG5cdFx0XHRwcml2YXRlLmlzQ2FsbGVlID0gdHJ1ZVxuXHRcdH1cblxuXHRcdGJyb2tlci5vbigncmVhZHknLCAobXNnKSA9PiB7XG5cdFx0XHRwcml2YXRlLnNyY0lkID0gbXNnLmNsaWVudElkXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzcmNJZCcsIG1zZy5jbGllbnRJZClcblx0XHRcdGV2ZW50cy5lbWl0KCdyZWFkeScpXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYWNjZXB0JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGNhbmNlbChmYWxzZSlcblx0XHRcdHByaXZhdGUuZGVzdElkID0gbXNnLnNyY0lkXG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdGV2ZW50cy5lbWl0KCdhY2NlcHQnKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmRlbnknLCAobXNnKSA9PiB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAncmVmdXNlZCdcblx0XHRcdGNhbmNlbChmYWxzZSlcblx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0ZXZlbnRzLmVtaXQoJ2RlbnknKVxuXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYnllJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ2Rpc2Nvbm5lY3RlZCdcblx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0ZXZlbnRzLmVtaXQoJ2J5ZScpXG5cblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBnZXRSZW1vdGVDbGllbnRJZCgpIHtcblx0XHRcdHJldHVybiBwcml2YXRlLmRlc3RJZFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHByb2Nlc3NDYWxsKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tSVENdIHByb2Nlc3NDYWxsJylcblx0XHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmNhbGwnLCAobXNnKSA9PiB7XG5cdFx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRcdHByaXZhdGUuZGVzdElkID0gbXNnLnNyY0lkXG5cdFx0XHRcdGV2ZW50cy5lbWl0KCdjYWxsJywgbXNnLmRhdGEpXG5cdFx0XHR9KVxuXG5cdFx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYW5jZWwnLCAobXNnKSA9PiB7XG5cdFx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRcdGV2ZW50cy5lbWl0KCdjYW5jZWwnKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvbkRhdGEobmFtZSwgY2FsbGJhY2spIHtcblx0XHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuJyArIG5hbWUsIChtc2cpID0+IHtcblx0XHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2sobXNnLmRhdGEsIG1zZy50aW1lKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBlbWl0U3RhdHVzKCkge1xuXHRcdFx0ZXZlbnRzLmVtaXQoJ3N0YXR1cycsIHsgc3RhdHVzOiBwcml2YXRlLnN0YXR1cywgZGlzdGFudDogcHJpdmF0ZS5kaXN0YW50IH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FsbCh0bywgYXBwTmFtZSwgaWNvbkNscykge1xuXHRcdFx0cHJpdmF0ZS5kaXN0YW50ID0gdG9cblx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ2NhbGxpbmcnXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7XG5cdFx0XHRcdHRvLFxuXHRcdFx0XHRzcmNJZDogcHJpdmF0ZS5zcmNJZCxcblx0XHRcdFx0dHlwZTogJ2NhbGwnLFxuXHRcdFx0XHRkYXRhOiB7IGFwcE5hbWUsIGljb25DbHMgfVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjYW5jZWwodXBkYXRlU3RhdHVzID0gdHJ1ZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tSVENdIGNhbmNlbCcsIHVwZGF0ZVN0YXR1cylcblx0XHRcdGlmICh1cGRhdGVTdGF0dXMpIHtcblx0XHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAnY2FuY2VsZWQnXG5cdFx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvVXNlcmAsIHsgdG86IHByaXZhdGUuZGlzdGFudCwgc3JjSWQ6IHByaXZhdGUuc3JjSWQsIHR5cGU6ICdjYW5jZWwnIH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWNjZXB0KCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tSVENdIGFjY2VwdCcpXG5cblx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0cmV0dXJuIHNlbmREYXRhKCdhY2NlcHQnKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRlbnkoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1JUQ10gZGVueScpXG5cblx0XHRcdHJldHVybiBzZW5kRGF0YSgnZGVueScpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYnllKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tSVENdIGJ5ZScpXG5cblx0XHRcdGlmIChwcml2YXRlLnN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xuXHRcdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdyZWFkeSdcblx0XHRcdFx0cHJpdmF0ZS5kaXN0YW50ID0gJydcblx0XHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRcdHJldHVybiBzZW5kRGF0YSgnYnllJylcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZXhpdCgpIHtcblx0XHRcdGlmIChwcml2YXRlLnN0YXR1cyA9PSAnY2FsbGluZycpIHtcblx0XHRcdFx0cmV0dXJuIGNhbmNlbCgpXG5cdFx0XHR9XG5cdFx0XHRpZiAocHJpdmF0ZS5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcblx0XHRcdFx0cmV0dXJuIGJ5ZSgpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZW5kRGF0YSh0eXBlLCBkYXRhKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9DbGllbnRgLCB7XG5cdFx0XHRcdGRlc3RJZDogcHJpdmF0ZS5kZXN0SWQsXG5cdFx0XHRcdHNyY0lkOiBwcml2YXRlLnNyY0lkLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzQ2FsbGVlKCkge1xuXHRcdFx0cmV0dXJuIHByaXZhdGUuaXNDYWxsZWVcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2FsbCxcblx0XHRcdGNhbmNlbCxcblx0XHRcdGRlbnksXG5cdFx0XHRieWUsXG5cdFx0XHRzZW5kRGF0YSxcblx0XHRcdG9uRGF0YSxcblx0XHRcdG9uOiBldmVudHMub24uYmluZChldmVudHMpLFxuXHRcdFx0cHJvY2Vzc0NhbGwsXG5cdFx0XHRnZXRSZW1vdGVDbGllbnRJZCxcblx0XHRcdGV4aXQsXG5cdFx0XHRhY2NlcHQsXG5cdFx0XHRpc0NhbGxlZVxuXG5cdFx0fVxuXHR9XG59KTtcblxuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5zY2hlZHVsZXInLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRvcGVuQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBhcHBQYXJhbXMsIG5ld1RhYlRpdGxlKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIG9wZW5BcHAnLCBhcHBOYW1lLCBhcHBQYXJhbXMsIG5ld1RhYilcblx0XHRcdFx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdFx0dHlwZTogJ29wZW5BcHAnLFxuXHRcdFx0XHRcdCBkYXRhOiB7YXBwTmFtZSwgYXBwUGFyYW1zLCBuZXdUYWJUaXRsZX1cblx0XHRcdFx0XHR9LCBsb2NhdGlvbi5ocmVmKVxuXG5cdFx0XHR9LFxuXHRcdFx0bG9nb3V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIGxvZ291dCcpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvbG9nb3V0Jylcblx0XHRcdH1cdFx0IFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNvbmdzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvc29uZ3MnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdlbmVyYXRlRGI6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2dlbmVyYXRlRGInKVxuXHRcdFx0fSxcblxuXHRcdFx0cXVlcnlTb25nczogZnVuY3Rpb24gKHF1ZXJ5KSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9xdWVyeVNvbmdzJywgeyBxdWVyeSB9KVxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Quc3BvdGlmeScsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICBjb25zdCBiYXNlVXJpID0gJ2h0dHBzOi8vYXBpLnNwb3RpZnkuY29tL3YxJ1xuICAgICAgICBjb25zdCBiYXNlVG9rZW5VcmkgPSAnaHR0cHM6Ly9zcG90aWZ5LXdlYi1hcGktdG9rZW4uaGVyb2t1YXBwLmNvbSdcbiAgICAgICAgbGV0IHRva2VuID0gbnVsbFxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1SZXF1ZXN0KHVybCwgcGFyYW1zKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdwZXJmb3JtUmVxdWVzdCcsIHVybCwgcGFyYW1zKVxuICAgICAgICAgICAgbGV0IHJldCA9IG51bGxcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRva2VuID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXAgPSBhd2FpdCBmZXRjaChiYXNlVG9rZW5VcmkgKyAnL3Rva2VuJylcbiAgICAgICAgICAgICAgICBpZiAoIXJlcC5vaykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnc3BvdGlmeSBmZXRjaCB0b2tlbiBlcnJvcidcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVwLmpzb24oKVxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2pzb24nLCBqc29uKVxuICAgICAgICAgICAgICAgIHRva2VuID0ganNvbi50b2tlblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b2tlbicsIHRva2VuKVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgICAgICAgICAgaGVhZGVycy5hcHBlbmQoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyB0b2tlbilcbiAgICAgICAgICAgIHJlcXVlc3QuaGVhZGVycyA9IGhlYWRlcnNcblxuICAgICAgICAgICAgY29uc3QgcmVwID0gYXdhaXQgZmV0Y2goJCQudXJsLmdldFVybFBhcmFtcyh1cmwsIHBhcmFtcyksIHJlcXVlc3QpXG4gICAgICAgICAgICBpZiAocmVwLm9rKSB7XG4gICAgICAgICAgICAgICAgcmV0ID0gYXdhaXQgcmVwLmpzb24oKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBzZWFyY2hUcmFja3MocXVlcnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZWFyY2hUcmFja3MnLCBxdWVyeSlcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBxOiBxdWVyeSxcbiAgICAgICAgICAgICAgICB0eXBlOiAndHJhY2snLFxuICAgICAgICAgICAgICAgIGxpbWl0OiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgcGVyZm9ybVJlcXVlc3QoYmFzZVVyaSArICcvc2VhcmNoLycsIHBhcmFtcylcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXN1bHRzJywgcmVzdWx0cylcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrID0gcmVzdWx0cy50cmFja3MuaXRlbXNbMF1cbiAgICAgICAgICAgIHJldHVybiB0cmFja1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0QXVkaW9GZWF0dXJlc0ZvclRyYWNrKHRyYWNrSWQpIHtcbiAgICAgICAgICAgIHJldHVybiBwZXJmb3JtUmVxdWVzdChiYXNlVXJpICsgJy9hdWRpby1mZWF0dXJlcy8nICsgdHJhY2tJZClcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZWFyY2hUcmFja3MsXG4gICAgICAgICAgICBnZXRBdWRpb0ZlYXR1cmVzRm9yVHJhY2tcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC51c2VycycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL3VzZXJzJylcblxuXHRcdHJldHVybiB7XG5cdFx0XHRsaXN0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycpXG5cdFx0XHR9LFxuXG5cdFx0XHRtYXRjaDogZnVuY3Rpb24gKG1hdGNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnLycsIHsgbWF0Y2ggfSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZDogZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnLycsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRyZXNldFB3ZDogZnVuY3Rpb24odXNlck5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3Jlc2V0UHdkJywge3VzZXJOYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZTogZnVuY3Rpb24gKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGU6IGZ1bmN0aW9uICh1c2VyLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnB1dChgLyR7dXNlcn1gLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAodXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdGFjdGl2YXRlQXBwOiBmdW5jdGlvbiAoYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hY3RpdmF0ZUFwcGAsIHsgYXBwTmFtZSwgYWN0aXZhdGVkIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjaGFuZ2VQd2Q6IGZ1bmN0aW9uIChuZXdQd2QpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2NoYW5nZVB3ZGAsIHsgbmV3UHdkIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2dldFVzZXJTZXR0aW5nc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRzZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uIChzZXR0aW5ncykge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2V0VXNlclNldHRpbmdzYCwgc2V0dGluZ3MpXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC53YWtlbG9jaycsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICBhc3luYyBmdW5jdGlvbiByZXF1ZXN0V2FrZUxvY2soKSB7XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yLndha2VMb2NrKSB7XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NrID0gYXdhaXQgbmF2aWdhdG9yLndha2VMb2NrLnJlcXVlc3QoJ3NjcmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3Rha2Ugd2FrZUxvY2snKVxuICAgICAgICAgICAgICAgICAgICBsb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbGVhc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdXYWtlIExvY2sgd2FzIHJlbGVhc2VkJylcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXYWtlTG9jaycsIGUpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd2aXNpYmlsaXR5Y2hhbmdlJywgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlKVxuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdFdha2VMb2NrKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCBvblZpc2liaWxpdHlDaGFuZ2UpXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlcXVlc3RXYWtlTG9ja1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iXX0=
