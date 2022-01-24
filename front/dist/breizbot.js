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

	template: "<div class=\"scrollPanel\">\n	<div bn-each=\"apps\" \n		bn-iter=\"app\" \n		class=\"main\" \n		bn-event=\"click.tile: onTileClick, contextmenuchange.tile: onTileContextMenu\"\n		>			\n		<div bn-attr=\"class1\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n			<div class=\"arrow-right\" bn-show=\"show1\"></div>\n			<div bn-show=\"show2\" style=\"margin-bottom: 5px;\">\n				<i bn-attr=\"{class: $scope.app.props.iconCls}\"></i>\n			</div>\n\n			<span bn-text=\"$scope.app.props.title\"></span>\n		</div>\n\n	</div>\n</div>",

	init: function(elt) {

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


//@ts-check
(function () {

	function getTime(duration) {
		const d = new Date(duration * 1000)
		const v = d.getMinutes() + d.getSeconds() / 100
		return v.toFixed(2).replace('.', ':')
	}


	$$.control.registerControl('breizbot.audioplayer', {

		template: "<div>\n	<button class=\"w3-btn w3-blue\" bn-icon=\"fa fa-folder-open\" bn-event=\"click: onChooseFile\"\n	title=\"Choose file\"></button>\n\n</div>\n<div class=\"info\">\n	<div class=\"title\" bn-show=\"!title\">\n		<strong>FileName:</strong>\n		<span bn-text=\"name\"></span>\n	</div>\n	<div class=\"title\" bn-show=\"title\">\n		<strong>Title:</strong>\n		<span bn-text=\"title\"></span>\n	</div>\n	<div class=\"title\" bn-show=\"artist\">\n		<strong>Artist:</strong>\n		<span bn-text=\"artist\"></span>\n	</div>\n</div>\n<div class=\"toolbar\">\n	<div></div>\n\n	<button bn-show=\"!playing\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\" title=\"Play\" bn-icon=\"fa fa-lg fa-play\">\n	</button>\n\n	<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\" title=\"Pause\" bn-icon=\"fa fa-lg fa-pause\">\n	</button>\n\n	<div class=\"toolbar2\">\n		<i class=\"fas fa-lg fa-volume-down w3-text-blue volume\"></i>\n		<div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.1, orientation: \'vertical\'}\" bn-event=\"input: onVolumeChange\"\n			bn-val=\"volume\" class=\"volulmeSlider\"></div>\n	</div>\n	\n</div>\n\n\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" bn-data=\"{max: duration}\" bn-event=\"input: onSliderChange\" bn-val=\"curTime\">\n	</div>\n\n</div>\n\n<audio bn-attr=\"{src: url}\" bn-bind=\"audio\"\n	bn-event=\"canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded\">\n</audio>",

		deps: ['breizbot.pager'],

		props: {
			filterExtension: '',
			getMP3Info: false,
			showMp3Filter: false
		},

		/**
		 * @param {Breizbot.Services.Pager.Interface} pager
		 */
		init: function (elt, pager) {

			console.log('props', this.props)

			const { filterExtension, getMP3Info, showMp3Filter } = this.props


			const ctrl = $$.viewController(elt, {
				data: {
					url: '#',
					name: '',
					title: '',
					artist: '',
					volume: 0,
					duration: 0,
					curTime: 0,
					playing: false,
					getTimeInfo: function () {
						return `${getTime(this.curTime)} / ${getTime(this.duration)}`
					}

				},
				events: {
					onChooseFile: function () {
						pager.pushPage('breizbot.filechooser', {
							props: {
								filterExtension,
								getMP3Info,
								showMp3Filter
							},
							title: 'Choose File',
							onReturn: async function (data) {
								console.log('data', data)
								const {fileName, url, mp3} = data
								if (mp3 && mp3.title) {
									const {artist, title} = mp3
									ctrl.setData({artist, title, url})	
								}
								else { 
									ctrl.setData({url, name: fileName})	
								}
							}
						})
	
					},					
					onVolumeChange: function (ev, value) {
						audio.volume = value
					},
					onLoad: function () {
						//console.log('duration', this.duration)
						ctrl.setData({ duration: Math.floor(audio.duration), volume: audio.volume })
					},

					onTimeUpdate: function () {
						ctrl.setData({ curTime: this.currentTime })
					},

					onPlaying: function () {
						//console.log('onPlaying')
						ctrl.setData({ playing: true })
					},

					onPaused: function () {
						//console.log('onPaused')
						ctrl.setData({ playing: false })
					},

					onPlay: function () {
						audio.play()
					},

					onPause: function () {
						audio.pause()
					},

					onSliderChange: function (ev, value) {
						//console.log('onSliderChange', value)
						audio.currentTime = value
					},


				}
			})


			/**@type {HTMLAudioElement} */
			const audio = ctrl.scope.audio.get(0)

			this.getAudioElement = function() {
				return audio
			}
		}


	});

})();




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

	template: "<div bn-event=\"click.cmd: onCommand\" class=\"toolbar\">\n\n	<div class=\"group\">\n		<button class=\"cmd w3-button\" data-cmd=\"bold\" title=\"Bold\"><i class=\"fa fa-bold\"></i></button>\n		<button class=\"cmd w3-button\" data-cmd=\"italic\" title=\"Italic\"><i class=\"fa fa-italic\"></i></button>\n		<button class=\"cmd w3-button\" data-cmd=\"underline\" title=\"Underline\"><i class=\"fa fa-underline\"></i></button>\n		<span class=\"separator\"></span>\n\n	</div>\n\n	<div class=\"group\">\n		<button class=\"w3-button\" bn-control=\"brainjs.contextmenu\" bn-event=\"contextmenuchange: onFontNameChange\"\n			title=\"Font Name\" bn-html=\"getFontName\" bn-data=\"{\n				trigger: \'left\',\n				items: fontNameItems\n			}\">\n			<i class=\"fas fa-caret-down\"></i>`\n\n		</button>\n\n		<button class=\"w3-button\" bn-control=\"brainjs.contextmenu\" bn-event=\"contextmenuchange: onFontSizeChange\"\n			title=\"Font Size\" bn-html=\"getFontSize\" bn-data=\"{\n				trigger: \'left\',\n				items: fontSizeItems\n			}\">\n			<i class=\"fas fa-caret-down\"></i>`\n\n		</button>\n\n\n		<button class=\"w3-button\" bn-control=\"brainjs.contextmenu\" bn-event=\"contextmenuchange: onCommand\" title=\"Title\"\n			data-cmd=\"formatBlock\" bn-data=\"{\n				trigger: \'left\',\n				items: headingItems\n			}\">\n			§&nbsp;\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n		<button title=\"Alignment\" class=\"w3-button\" bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onCommand\" bn-data=\"{\n			trigger: \'left\',\n			items: {\n				justifyLeft: {name: \'Left\', icon: \'fas fa-align-left\'},\n				justifyCenter: {name: \'Center\', icon: \'fas fa-align-center\'},\n				justifyRight: {name: \'Right\', icon: \'fas fa-align-right\'}\n			}\n		}\">\n			<i class=\"fas fa-align-left\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n		<button class=\"w3-button\" title=\"Text color\" bn-control=\"brainjs.contextmenu\" bn-data=\"{\n				items: colorItems,\n				trigger: \'left\'\n			}\" bn-event=\"contextmenuchange: onColorMenuChange\">\n			<i class=\"fas fa-paint-brush\" bn-style=\"{color}\"></i>\n		</button>\n\n		<span class=\"separator\"></span>\n	</div>\n\n	<div class=\"group\">\n		<button title=\"Indent\" class=\"w3-button\" bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onCommand\" bn-data=\"{\n				trigger: \'left\',\n				items: {\n					indent: {name: \'Indent\', icon: \'fas fa-indent\'},\n					outdent: {name: \'Outdent\', icon: \'fas fa-outdent\'}\n				}\n			}\">\n			<i class=\"fas fa-indent\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n\n		<button title=\"List\" class=\"w3-button\" bn-control=\"brainjs.contextmenu\" bn-event=\"contextmenuchange: onCommand\"\n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n					insertUnorderedList: {name: \'Unordered\', icon: \'fas fa-list-ul\'},\n					insertOrderedList: {name: \'Ordered\', icon: \'fas fa-list-ol\'}\n				}\n			}\">\n			<i class=\"fas fa-list-ol\"></i>\n			<i class=\"fas fa-caret-down\"></i>\n		</button>\n\n		<span class=\"separator\"></span>\n\n	</div>\n\n	<div class=\"group\">\n		<button class=\"w3-button cmd\" title=\"Horizontal Rule\" data-cmd=\"insertHorizontalRule\"><i\n				class=\"fas fa-minus\"></i></button>\n		<button class=\"w3-button\" title=\"Insert Link\" bn-event=\"click: onCreateLink\"><i\n				class=\"fas fa-link\"></i></button>\n		<button title=\"Insert image\" bn-event=\"click: onInsertImage\" class=\"w3-button\">\n			<i class=\"fa fa-image\"></i></button>\n\n	</div>\n\n\n</div>\n\n\n<div class=\"bottom\">\n	<img bn-attr=\"{src: getMicUrl}\" class=\"micro\" bn-event=\"click: onMicro\" bn-show=\"speechRecoAvailable\" title=\"Speech Recognition\">\n	<div class=\"scrollPanel\" bn-event=\"click: onScrollClick\">\n		<div contenteditable=\"true\" bn-bind=\"editor\" class=\"editor\" bn-html=\"html\"></div>\n	</div>\n</div>\n",

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
		function linebreak(s)  {
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
			const selObj = window.getSelection()
			//console.log('selObj', selObj)

			if (!isEditable(selObj.anchorNode)) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			range = selObj.getRangeAt(0)
			finalSpan = document.createElement('span')
			interimSpan = document.createElement('span')
			interimSpan.className = 'interim'
			range.insertNode(interimSpan)
			range.insertNode(finalSpan)
			finalTranscript = ''
			recognition.start()
			ignoreOnEnd = false			
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
				speechRecoAvailable,
				recognizing: false,
				getMicUrl: function () {
					return this.recognizing ? '/assets/mic-animate.gif' : '/assets/mic.gif'
				}
			},
			events: {
				onMicro: function() {
					if (ctrl.model.recognizing) {
						ctrl.setData({recognizing: false})
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
					const selObj = window.getSelection()

					if (!isEditable(selObj.anchorNode)) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}
					const range = selObj.getRangeAt(0)

					const href = await $$.ui.showPrompt({
						title: 'Insert Link',
						label: 'Link Target',
						attrs: { type: 'url' }
					})
					//console.log('href', href)
					if (href != null) {
						selObj.removeAllRanges()
						selObj.addRange(range)

						document.execCommand('createLink', false, href)
					}

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

			if (!isEditable(selObj.anchorNode)) {
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

		function isEditable(node) {

			const editable = ctrl.scope.editor.get(0)

			while (node && node != document.documentElement) {
				if (node == editable) {
					return true
				}
				node = node.parentNode;
			}
			return false
		}

		this.html = function (htmlString) {
			if (htmlString == undefined) {
				ctrl.scope.editor.find('span').remove('.interim')
				return ctrl.scope.editor.html()
			}

			ctrl.scope.editor.html(htmlString)
		}

		this.load = function (url) {
			return ctrl.scope.editor.load(url)
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

			if (!isEditable(selObj.anchorNode)) {
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
	 * @param {string} name 
	 * @returns 
	 */
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
		if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.3gp')) {
			return 'fa-file-video'
		}
		if (name.endsWith('.zip')) {
			return 'fa-file-archive'
		}

		return 'fa-file'
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
			imageOnly: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null,
			menuItems: function (data) {
				return {}
			}
		},

		template: "\n<div bn-text=\"info\" bn-bind=\"info\" class=\"info\"></div>\n\n<div bn-show=\"loading\" class=\"loading\">\n	<i class=\"fa fa-spinner fa-pulse\"></i>\n	loading ...\n</div>\n\n<div class=\"pathPanel\" bn-event=\"click.pathItem: onPathItem\" bn-show=\"!loading\">\n	<div bn-each=\"getPath\" bn-index=\"idx\">\n		<i class=\"fa fa-chevron-right\" bn-show=\"!isFirst\"></i>\n		<span>\n			<a class=\"pathItem\" bn-text=\"$scope.$i\" href=\"#\" bn-show=\"!isLast\" bn-data=\"{info: getPathInfo}\"></a>\n			<span bn-text=\"$scope.$i\" bn-show=\"isLast\" class=\"lastItem\"></span>\n\n		</span>\n	</div>\n\n\n</div>\n\n\n<div class=\"scrollPanel\">\n\n	<div \n		bn-each=\"getFiles\" \n		bn-iter=\"f\" \n		bn-lazzy=\"10\" \n		bn-bind=\"files\" \n		bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick, contextmenuchange.thumbnail: onContextMenu\"\n		class=\"container\"\n	>\n\n		<div class=\"thumbnail w3-card-2\" bn-control=\"brainjs.contextmenu\" bn-data=\"{items: getItems}\">\n\n			<span bn-if=\"if1\">\n				<input type=\"checkbox\" bn-show=\"selectionEnabled\" class=\"check w3-check\"\n					bn-prop=\"{checked: $scope.f.checked}\">\n			</span>\n			<div bn-if=\"$scope.f.folder\" class=\"folder item\">\n				<div class=\"icon\">\n					<i class=\"fa fa-4x fa-folder-open w3-text-blue-grey\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\" bn-if=\"if1\"></span>\n				</div>\n			</div>\n			<div bn-if=\"if2\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"isMP3\" class=\"file item\">\n				<div class=\"icon\">\n					<i bn-attr=\"{class: class1}\"></i>\n				</div>\n\n				<div class=\"info\">\n					<div>Title:&nbsp;<strong bn-text=\"$scope.f.mp3.title\"></strong></div>\n\n					<div>Artist:&nbsp;<strong bn-text=\"$scope.f.mp3.artist\"></strong></div>\n					<div bn-show=\"hasGenre\">Genre:&nbsp;<strong bn-text=\"$scope.f.mp3.genre\"></strong></div>\n					<div bn-show=\"hasYear\"> Year:&nbsp;<strong bn-text=\"getYear\"></strong></div>\n					<span bn-text=\"getSize\"></span>\n				</div>\n			</div>\n\n			<div bn-if=\"if3\" class=\"file item\">\n				<div class=\"icon\">\n					<img bn-attr=\"{src: getThumbnailUrl}\">\n				</div>\n\n				<div class=\"info\">\n					<strong bn-text=\"$scope.f.name\"></strong>\n					<span bn-text=\"getDate\"></span>\n					<span bn-text=\"getSize\"></span>\n					<span bn-text=\"getDimension\"></span>\n				</div>\n			</div>\n\n		</div>\n	</div>\n\n\n</div>",

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
						const { name } = ctrl.model.files[idx]

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
				console.log('files', files)

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
				const { appName, appParams } = data
				openApp(appName, appParams)
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


		function openApp(appName, params) {
			const appInfo = ctrl.model.apps.find((a) => a.appName == appName)
			const title = appInfo.props.title
			//console.log('openApp', appName, params)
			let idx = tabs.getTabIndexFromTitle(title)
			const appUrl = $$.url.getUrlParams(`/apps/${appName}`, params)
			if (idx < 0) { // apps not already run
				idx = tabs.addTab(title, {
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

	$iface: `
		popPage(data)
		pushPage(ctrlName, options)
		setButtonVisible(buttonsVisible: {[buttonName]:boolean})
		setButtonEnabled(buttonsEnabled: {[buttonName]:boolean})
	`,

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
					onBack.call(iface)
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
			console.log('[pager] pushPage', ctrlName)


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

	template: "<div class=\"toolbar\">\n	<div bn-show=\"wait\" class=\"loading\">\n		<i class=\"fa fa-spinner fa-pulse\"></i> Rendering...\n	</div>\n	<div bn-show=\"!wait\">\n		<button \n			class=\"w3-button\" \n			title=\"Fit\" \n			bn-icon=\"fa fa-expand\"\n			bn-event=\"click: onFit\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Print\" \n			bn-icon=\"fa fa-print\"\n			bn-event=\"click: onPrint\">\n		</button>		\n		<button \n			class=\"w3-button\" \n			title=\"Go to Page\" \n			bn-icon=\"fa fa-reply fa-flip-horizontal\"\n			bn-event=\"click: onGotoPage\">\n		</button>		\n	</div>\n	<div>\n	</div>\n	<div class=\"pages\" bn-show=\"show1\">\n		<div>\n			<button class=\"w3-button\" title=\"previous page\" bn-event=\"click: onPrevPage\" bn-icon=\"fa fa-angle-left\">\n			</button>	\n\n			<button class=\"w3-button\" title=\"next page\" bn-event=\"click: onNextPage\" bn-icon=\"fa fa-angle-right\">\n			</button>			\n		</div>\n		<div>\n			Pages: <span bn-text=\"currentPage\"></span> / <span bn-text=\"numPages\"></span>		\n		</div>\n	</div>\n</div>\n	\n<div bn-control=\"brainjs.pdf\" \n	bn-data=\"{worker: \'/brainjs/pdf/worker.js\'}\"\n	bn-iface=\"pdf\"\n	 \n></div>		\n",

	props: {
		url: ''
	},

	init: function (elt) {

		//@ts-ignore
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
				onPrint: function() {
					pdf.print()
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

			const numPages = await pdf.openFile(url)
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

	template: "<div bn-if=\"isImage\">\n	<div \n		class=\"image\" \n		bn-control=\"brainjs.image\" \n		bn-data=\"{src: url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>\n	\n</div>\n\n\n<div bn-if=\"isPdf\">\n	<div \n		class=\"pdf\" \n		bn-control=\"breizbot.pdf\" \n		bn-data=\"{url}\" \n		\n		style=\"height: 100%\">\n			\n		</div>		\n</div>\n\n<div bn-if=\"isAudio\" class=\"audio\">\n	<audio bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></audio>\n</div>\n\n<div bn-if=\"isVideo\" class=\"video\">\n	<video bn-attr=\"{src: url}\" controls=\"\" controlsList=nodownload></video>\n</div>\n\n<div bn-if=\"isDoc\" class=\"doc\">\n	<div class=\"scrollPanel\">\n		<div bn-load=\"url\" class=\"html\"></div>\n	</div>\n</div>",

	props: {
		type: '',
		url: '#'
	},
	
	init: function(elt) {

		//@ts-ignore
		let {type, url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
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
				}

			}
		})



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
				console.log('[FileService] fileInfo', filePath, friendUser, options)

				return http.post('/fileInfo', { filePath, friendUser, options })
			},
			list: function (destPath, options, friendUser) {
				console.log('[FileService] list', destPath)

				return http.post('/list', { destPath, options, friendUser })
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
				console.log('[FileService] uploadFile', checkExists, saveAsfileName, destPath)
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

			saveFile: async function (blob, saveAsfileName, checkExists = false) {
				const destPath  = `/apps/${params.$appName}`
				try {
					savingDlg.setPercentage(0)
					savingDlg.show()
					const resp = await this.uploadFile(blob, saveAsfileName, destPath, checkExists, (value) => {
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
			openApp: function(appName, appParams) {
				//console.log('[scheduler] openApp', appName, appParams)
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
	}
});

//@ts-check
$$.service.registerService('breizbot.songs', {

	deps: ['brainjs.resource'],

	init: function(config, resource) {

		const http = resource('/api/songs')

		return {
			generateDb: function() {
				return http.post('/generateDb')
			}
			
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50ZW1pdHRlcjIuanMiLCJub3RpZnkubWluLmpzIiwiYWxleGEvYWxleGEuanMiLCJhcHBUYWIvYXBwVGFiLmpzIiwiYXBwcy9hcHBzLmpzIiwiYXVkaW9wbGF5ZXIvcGxheWVyLmpzIiwiY29udGFjdHMvYWRkQ29udGFjdC5qcyIsImNvbnRhY3RzL2NvbnRhY3RzLmpzIiwiZWRpdG9yL2VkaXRvci5qcyIsImZpbGVjaG9vc2VyL2ZpbHRlci5qcyIsImZpbGVjaG9vc2VyL21haW4uanMiLCJmaWxlcy9maWxlcy5qcyIsImZyaWVuZHMvZnJpZW5kcy5qcyIsImhvbWUvaG9tZS5qcyIsInBhZ2VyL3BhZ2VyLmpzIiwicGRmL21haW4uanMiLCJydGMvcnRjLmpzIiwic2VhcmNoYmFyL3NlYXJjaGJhci5qcyIsInVzZXJzL2FkZFVzZXIuanMiLCJ1c2Vycy91c2Vycy5qcyIsInZpZXdlci92aWV3ZXIuanMiLCJhcHBEYXRhLmpzIiwiYXBwcy5qcyIsImJyb2tlci5qcyIsImNpdGllcy5qcyIsImNvbnRhY3RzLmpzIiwiZGlzcGxheS5qcyIsImZpbGVzLmpzIiwiZnJpZW5kcy5qcyIsImZ1bGxzY3JlZW4uanMiLCJnZW9sb2MuanMiLCJodHRwLmpzIiwibm90aWZzLmpzIiwicGFnZXIuanMiLCJwYXJhbXMuanMiLCJydGMuanMiLCJzY2hlZHVsZXIuanMiLCJzb25ncy5qcyIsInVzZXJzLmpzIiwid2FrZWxvY2suanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeHdCQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL1lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdGFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnJlaXpib3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIHRoaXMuX21heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQgPyBjb25mLm1heExpc3RlbmVycyA6IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcbiAgICAgIGNvbmYudmVyYm9zZU1lbW9yeUxlYWsgJiYgKHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBjb25mLnZlcmJvc2VNZW1vcnlMZWFrKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBsb2dQb3NzaWJsZU1lbW9yeUxlYWsoY291bnQsIGV2ZW50TmFtZSkge1xuICAgIHZhciBlcnJvck1zZyA9ICcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICcgKyBjb3VudCArICcgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0Lic7XG5cbiAgICBpZih0aGlzLnZlcmJvc2VNZW1vcnlMZWFrKXtcbiAgICAgIGVycm9yTXNnICs9ICcgRXZlbnQgbmFtZTogJyArIGV2ZW50TmFtZSArICcuJztcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbWl0V2FybmluZyl7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICBlLm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgIGUuZW1pdHRlciA9IHRoaXM7XG4gICAgICBlLmNvdW50ID0gY291bnQ7XG4gICAgICBwcm9jZXNzLmVtaXRXYXJuaW5nKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yTXNnKTtcblxuICAgICAgaWYgKGNvbnNvbGUudHJhY2Upe1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgdGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG4gIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmb3IgZXhwb3J0aW5nIEV2ZW50RW1pdHRlciBwcm9wZXJ0eVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdHJlZS5fbGlzdGVuZXJzLndhcm5lZCAmJlxuICAgICAgICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID4gMCAmJlxuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoLCBuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKG4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIH1cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIGZhbHNlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fb25jZShldmVudCwgZm4sIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uY2UgPSBmdW5jdGlvbihldmVudCwgZm4sIHByZXBlbmQpIHtcbiAgICB0aGlzLl9tYW55KGV2ZW50LCAxLCBmbiwgcHJlcGVuZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICByZXR1cm4gdGhpcy5fbWFueShldmVudCwgdHRsLCBmbiwgZmFsc2UpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hbnkoZXZlbnQsIHR0bCwgZm4sIHRydWUpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuLCBwcmVwZW5kKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5fb24oZXZlbnQsIGxpc3RlbmVyLCBwcmVwZW5kKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fYWxsLnNsaWNlKCk7XG4gICAgICBpZiAoYWwgPiAzKSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgYWw7IGorKykgYXJnc1tqXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBzd2l0Y2ggKGFsKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBvZiBlbWl0IGNhbGxcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2FsbCAmJiB0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXRBc3luYyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbZmFsc2VdKTsgfVxuICAgIH1cblxuICAgIHZhciBwcm9taXNlcz0gW107XG5cbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzLGwsaSxqO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgaWYgKGFsID4gMykge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgc3dpdGNoIChhbCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5jYWxsKHRoaXMsIHR5cGUsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8IGFsOyBqKyspIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGlmIChhbCA+IDMpIHtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHN3aXRjaCAoYWwpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYXJndW1lbnRzWzFdKTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLl9vbih0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fb24odHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0aGlzLl9vbkFueShmbiwgZmFsc2UpO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZEFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQW55KGZuLCB0cnVlKTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9vbkFueSA9IGZ1bmN0aW9uKGZuLCBwcmVwZW5kKXtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICBpZihwcmVwZW5kKXtcbiAgICAgIHRoaXMuX2FsbC51bnNoaWZ0KGZuKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuX29uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX29uQW55KHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIENoYW5nZSB0byBhcnJheS5cbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFkZFxuICAgICAgaWYocHJlcGVuZCl7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkICYmXG4gICAgICAgIHRoaXMuX21heExpc3RlbmVycyA+IDAgJiZcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX21heExpc3RlbmVyc1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3QpIHtcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb290KTtcbiAgICAgIGZvciAodmFyIGkgaW4ga2V5cykge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIG9iaiA9IHJvb3Rba2V5XTtcbiAgICAgICAgaWYgKChvYmogaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpIHx8IChvYmogPT09IG51bGwpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290W2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSByb290W2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdCh0aGlzLmxpc3RlbmVyVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJBbnlcIiwgZm4pO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuc1tpXSk7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gIH1cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsIihmdW5jdGlvbihlKXt0eXBlb2YgZGVmaW5lPT1cImZ1bmN0aW9uXCImJmRlZmluZS5hbWQ/ZGVmaW5lKFtcImpxdWVyeVwiXSxlKTp0eXBlb2YgbW9kdWxlPT1cIm9iamVjdFwiJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1mdW5jdGlvbih0LG4pe3JldHVybiBuPT09dW5kZWZpbmVkJiYodHlwZW9mIHdpbmRvdyE9XCJ1bmRlZmluZWRcIj9uPXJlcXVpcmUoXCJqcXVlcnlcIik6bj1yZXF1aXJlKFwianF1ZXJ5XCIpKHQpKSxlKG4pLG59OmUoalF1ZXJ5KX0pKGZ1bmN0aW9uKGUpe2Z1bmN0aW9uIEEodCxuLGkpe3R5cGVvZiBpPT1cInN0cmluZ1wiJiYoaT17Y2xhc3NOYW1lOml9KSx0aGlzLm9wdGlvbnM9RSh3LGUuaXNQbGFpbk9iamVjdChpKT9pOnt9KSx0aGlzLmxvYWRIVE1MKCksdGhpcy53cmFwcGVyPWUoaC5odG1sKSx0aGlzLm9wdGlvbnMuY2xpY2tUb0hpZGUmJnRoaXMud3JhcHBlci5hZGRDbGFzcyhyK1wiLWhpZGFibGVcIiksdGhpcy53cmFwcGVyLmRhdGEocix0aGlzKSx0aGlzLmFycm93PXRoaXMud3JhcHBlci5maW5kKFwiLlwiK3IrXCItYXJyb3dcIiksdGhpcy5jb250YWluZXI9dGhpcy53cmFwcGVyLmZpbmQoXCIuXCIrcitcIi1jb250YWluZXJcIiksdGhpcy5jb250YWluZXIuYXBwZW5kKHRoaXMudXNlckNvbnRhaW5lciksdCYmdC5sZW5ndGgmJih0aGlzLmVsZW1lbnRUeXBlPXQuYXR0cihcInR5cGVcIiksdGhpcy5vcmlnaW5hbEVsZW1lbnQ9dCx0aGlzLmVsZW09Tih0KSx0aGlzLmVsZW0uZGF0YShyLHRoaXMpLHRoaXMuZWxlbS5iZWZvcmUodGhpcy53cmFwcGVyKSksdGhpcy5jb250YWluZXIuaGlkZSgpLHRoaXMucnVuKG4pfXZhciB0PVtdLmluZGV4T2Z8fGZ1bmN0aW9uKGUpe2Zvcih2YXIgdD0wLG49dGhpcy5sZW5ndGg7dDxuO3QrKylpZih0IGluIHRoaXMmJnRoaXNbdF09PT1lKXJldHVybiB0O3JldHVybi0xfSxuPVwibm90aWZ5XCIscj1uK1wianNcIixpPW4rXCIhYmxhbmtcIixzPXt0OlwidG9wXCIsbTpcIm1pZGRsZVwiLGI6XCJib3R0b21cIixsOlwibGVmdFwiLGM6XCJjZW50ZXJcIixyOlwicmlnaHRcIn0sbz1bXCJsXCIsXCJjXCIsXCJyXCJdLHU9W1widFwiLFwibVwiLFwiYlwiXSxhPVtcInRcIixcImJcIixcImxcIixcInJcIl0sZj17dDpcImJcIixtOm51bGwsYjpcInRcIixsOlwiclwiLGM6bnVsbCxyOlwibFwifSxsPWZ1bmN0aW9uKHQpe3ZhciBuO3JldHVybiBuPVtdLGUuZWFjaCh0LnNwbGl0KC9cXFcrLyksZnVuY3Rpb24oZSx0KXt2YXIgcjtyPXQudG9Mb3dlckNhc2UoKS5jaGFyQXQoMCk7aWYoc1tyXSlyZXR1cm4gbi5wdXNoKHIpfSksbn0sYz17fSxoPXtuYW1lOlwiY29yZVwiLGh0bWw6JzxkaXYgY2xhc3M9XCInK3IrJy13cmFwcGVyXCI+XFxuXHQ8ZGl2IGNsYXNzPVwiJytyKyctYXJyb3dcIj48L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XCInK3IrJy1jb250YWluZXJcIj48L2Rpdj5cXG48L2Rpdj4nLGNzczpcIi5cIityK1wiLWNvcm5lciB7XFxuXHRwb3NpdGlvbjogZml4ZWQ7XFxuXHRtYXJnaW46IDVweDtcXG5cdHotaW5kZXg6IDEwNTA7XFxufVxcblxcbi5cIityK1wiLWNvcm5lciAuXCIrcitcIi13cmFwcGVyLFxcbi5cIityK1wiLWNvcm5lciAuXCIrcitcIi1jb250YWluZXIge1xcblx0cG9zaXRpb246IHJlbGF0aXZlO1xcblx0ZGlzcGxheTogYmxvY2s7XFxuXHRoZWlnaHQ6IGluaGVyaXQ7XFxuXHR3aWR0aDogaW5oZXJpdDtcXG5cdG1hcmdpbjogM3B4O1xcbn1cXG5cXG4uXCIrcitcIi13cmFwcGVyIHtcXG5cdHotaW5kZXg6IDE7XFxuXHRwb3NpdGlvbjogYWJzb2x1dGU7XFxuXHRkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuXHRoZWlnaHQ6IDA7XFxuXHR3aWR0aDogMDtcXG59XFxuXFxuLlwiK3IrXCItY29udGFpbmVyIHtcXG5cdGRpc3BsYXk6IG5vbmU7XFxuXHR6LWluZGV4OiAxO1xcblx0cG9zaXRpb246IGFic29sdXRlO1xcbn1cXG5cXG4uXCIrcitcIi1oaWRhYmxlIHtcXG5cdGN1cnNvcjogcG9pbnRlcjtcXG59XFxuXFxuW2RhdGEtbm90aWZ5LXRleHRdLFtkYXRhLW5vdGlmeS1odG1sXSB7XFxuXHRwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcblxcbi5cIityK1wiLWFycm93IHtcXG5cdHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG5cdHotaW5kZXg6IDI7XFxuXHR3aWR0aDogMDtcXG5cdGhlaWdodDogMDtcXG59XCJ9LHA9e1wiYm9yZGVyLXJhZGl1c1wiOltcIi13ZWJraXQtXCIsXCItbW96LVwiXX0sZD1mdW5jdGlvbihlKXtyZXR1cm4gY1tlXX0sdj1mdW5jdGlvbihlKXtpZighZSl0aHJvd1wiTWlzc2luZyBTdHlsZSBuYW1lXCI7Y1tlXSYmZGVsZXRlIGNbZV19LG09ZnVuY3Rpb24odCxpKXtpZighdCl0aHJvd1wiTWlzc2luZyBTdHlsZSBuYW1lXCI7aWYoIWkpdGhyb3dcIk1pc3NpbmcgU3R5bGUgZGVmaW5pdGlvblwiO2lmKCFpLmh0bWwpdGhyb3dcIk1pc3NpbmcgU3R5bGUgSFRNTFwiO3ZhciBzPWNbdF07cyYmcy5jc3NFbGVtJiYod2luZG93LmNvbnNvbGUmJmNvbnNvbGUud2FybihuK1wiOiBvdmVyd3JpdGluZyBzdHlsZSAnXCIrdCtcIidcIiksY1t0XS5jc3NFbGVtLnJlbW92ZSgpKSxpLm5hbWU9dCxjW3RdPWk7dmFyIG89XCJcIjtpLmNsYXNzZXMmJmUuZWFjaChpLmNsYXNzZXMsZnVuY3Rpb24odCxuKXtyZXR1cm4gbys9XCIuXCIrcitcIi1cIitpLm5hbWUrXCItXCIrdCtcIiB7XFxuXCIsZS5lYWNoKG4sZnVuY3Rpb24odCxuKXtyZXR1cm4gcFt0XSYmZS5lYWNoKHBbdF0sZnVuY3Rpb24oZSxyKXtyZXR1cm4gbys9XCJcdFwiK3IrdCtcIjogXCIrbitcIjtcXG5cIn0pLG8rPVwiXHRcIit0K1wiOiBcIituK1wiO1xcblwifSksbys9XCJ9XFxuXCJ9KSxpLmNzcyYmKG8rPVwiLyogc3R5bGVzIGZvciBcIitpLm5hbWUrXCIgKi9cXG5cIitpLmNzcyksbyYmKGkuY3NzRWxlbT1nKG8pLGkuY3NzRWxlbS5hdHRyKFwiaWRcIixcIm5vdGlmeS1cIitpLm5hbWUpKTt2YXIgdT17fSxhPWUoaS5odG1sKTt5KFwiaHRtbFwiLGEsdSkseShcInRleHRcIixhLHUpLGkuZmllbGRzPXV9LGc9ZnVuY3Rpb24odCl7dmFyIG4scixpO3I9eChcInN0eWxlXCIpLHIuYXR0cihcInR5cGVcIixcInRleHQvY3NzXCIpLGUoXCJoZWFkXCIpLmFwcGVuZChyKTt0cnl7ci5odG1sKHQpfWNhdGNoKHMpe3JbMF0uc3R5bGVTaGVldC5jc3NUZXh0PXR9cmV0dXJuIHJ9LHk9ZnVuY3Rpb24odCxuLHIpe3ZhciBzO3JldHVybiB0IT09XCJodG1sXCImJih0PVwidGV4dFwiKSxzPVwiZGF0YS1ub3RpZnktXCIrdCxiKG4sXCJbXCIrcytcIl1cIikuZWFjaChmdW5jdGlvbigpe3ZhciBuO249ZSh0aGlzKS5hdHRyKHMpLG58fChuPWkpLHJbbl09dH0pfSxiPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGUuaXModCk/ZTplLmZpbmQodCl9LHc9e2NsaWNrVG9IaWRlOiEwLGF1dG9IaWRlOiEwLGF1dG9IaWRlRGVsYXk6NWUzLGFycm93U2hvdzohMCxhcnJvd1NpemU6NSxicmVha05ld0xpbmVzOiEwLGVsZW1lbnRQb3NpdGlvbjpcImJvdHRvbVwiLGdsb2JhbFBvc2l0aW9uOlwidG9wIHJpZ2h0XCIsc3R5bGU6XCJib290c3RyYXBcIixjbGFzc05hbWU6XCJlcnJvclwiLHNob3dBbmltYXRpb246XCJzbGlkZURvd25cIixzaG93RHVyYXRpb246NDAwLGhpZGVBbmltYXRpb246XCJzbGlkZVVwXCIsaGlkZUR1cmF0aW9uOjIwMCxnYXA6NX0sRT1mdW5jdGlvbih0LG4pe3ZhciByO3JldHVybiByPWZ1bmN0aW9uKCl7fSxyLnByb3RvdHlwZT10LGUuZXh0ZW5kKCEwLG5ldyByLG4pfSxTPWZ1bmN0aW9uKHQpe3JldHVybiBlLmV4dGVuZCh3LHQpfSx4PWZ1bmN0aW9uKHQpe3JldHVybiBlKFwiPFwiK3QrXCI+PC9cIit0K1wiPlwiKX0sVD17fSxOPWZ1bmN0aW9uKHQpe3ZhciBuO3JldHVybiB0LmlzKFwiW3R5cGU9cmFkaW9dXCIpJiYobj10LnBhcmVudHMoXCJmb3JtOmZpcnN0XCIpLmZpbmQoXCJbdHlwZT1yYWRpb11cIikuZmlsdGVyKGZ1bmN0aW9uKG4scil7cmV0dXJuIGUocikuYXR0cihcIm5hbWVcIik9PT10LmF0dHIoXCJuYW1lXCIpfSksdD1uLmZpcnN0KCkpLHR9LEM9ZnVuY3Rpb24oZSx0LG4pe3ZhciByLGk7aWYodHlwZW9mIG49PVwic3RyaW5nXCIpbj1wYXJzZUludChuLDEwKTtlbHNlIGlmKHR5cGVvZiBuIT1cIm51bWJlclwiKXJldHVybjtpZihpc05hTihuKSlyZXR1cm47cmV0dXJuIHI9c1tmW3QuY2hhckF0KDApXV0saT10LGVbcl0hPT11bmRlZmluZWQmJih0PXNbci5jaGFyQXQoMCldLG49LW4pLGVbdF09PT11bmRlZmluZWQ/ZVt0XT1uOmVbdF0rPW4sbnVsbH0saz1mdW5jdGlvbihlLHQsbil7aWYoZT09PVwibFwifHxlPT09XCJ0XCIpcmV0dXJuIDA7aWYoZT09PVwiY1wifHxlPT09XCJtXCIpcmV0dXJuIG4vMi10LzI7aWYoZT09PVwiclwifHxlPT09XCJiXCIpcmV0dXJuIG4tdDt0aHJvd1wiSW52YWxpZCBhbGlnbm1lbnRcIn0sTD1mdW5jdGlvbihlKXtyZXR1cm4gTC5lPUwuZXx8eChcImRpdlwiKSxMLmUudGV4dChlKS5odG1sKCl9O0EucHJvdG90eXBlLmxvYWRIVE1MPWZ1bmN0aW9uKCl7dmFyIHQ7dD10aGlzLmdldFN0eWxlKCksdGhpcy51c2VyQ29udGFpbmVyPWUodC5odG1sKSx0aGlzLnVzZXJGaWVsZHM9dC5maWVsZHN9LEEucHJvdG90eXBlLnNob3c9ZnVuY3Rpb24oZSx0KXt2YXIgbixyLGkscyxvO3I9ZnVuY3Rpb24obil7cmV0dXJuIGZ1bmN0aW9uKCl7IWUmJiFuLmVsZW0mJm4uZGVzdHJveSgpO2lmKHQpcmV0dXJuIHQoKX19KHRoaXMpLG89dGhpcy5jb250YWluZXIucGFyZW50KCkucGFyZW50cyhcIjpoaWRkZW5cIikubGVuZ3RoPjAsaT10aGlzLmNvbnRhaW5lci5hZGQodGhpcy5hcnJvdyksbj1bXTtpZihvJiZlKXM9XCJzaG93XCI7ZWxzZSBpZihvJiYhZSlzPVwiaGlkZVwiO2Vsc2UgaWYoIW8mJmUpcz10aGlzLm9wdGlvbnMuc2hvd0FuaW1hdGlvbixuLnB1c2godGhpcy5vcHRpb25zLnNob3dEdXJhdGlvbik7ZWxzZXtpZighIW98fCEhZSlyZXR1cm4gcigpO3M9dGhpcy5vcHRpb25zLmhpZGVBbmltYXRpb24sbi5wdXNoKHRoaXMub3B0aW9ucy5oaWRlRHVyYXRpb24pfXJldHVybiBuLnB1c2gociksaVtzXS5hcHBseShpLG4pfSxBLnByb3RvdHlwZS5zZXRHbG9iYWxQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZ2V0UG9zaXRpb24oKSxuPXRbMF0saT10WzFdLG89c1tuXSx1PXNbaV0sYT1uK1wifFwiK2ksZj1UW2FdO2lmKCFmfHwhZG9jdW1lbnQuYm9keS5jb250YWlucyhmWzBdKSl7Zj1UW2FdPXgoXCJkaXZcIik7dmFyIGw9e307bFtvXT0wLHU9PT1cIm1pZGRsZVwiP2wudG9wPVwiNDUlXCI6dT09PVwiY2VudGVyXCI/bC5sZWZ0PVwiNDUlXCI6bFt1XT0wLGYuY3NzKGwpLmFkZENsYXNzKHIrXCItY29ybmVyXCIpLGUoXCJib2R5XCIpLmFwcGVuZChmKX1yZXR1cm4gZi5wcmVwZW5kKHRoaXMud3JhcHBlcil9LEEucHJvdG90eXBlLnNldEVsZW1lbnRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciBuLHIsaSxsLGMsaCxwLGQsdixtLGcseSxiLHcsRSxTLHgsVCxOLEwsQSxPLE0sXyxELFAsSCxCLGo7SD10aGlzLmdldFBvc2l0aW9uKCksXz1IWzBdLE89SFsxXSxNPUhbMl0sZz10aGlzLmVsZW0ucG9zaXRpb24oKSxkPXRoaXMuZWxlbS5vdXRlckhlaWdodCgpLHk9dGhpcy5lbGVtLm91dGVyV2lkdGgoKSx2PXRoaXMuZWxlbS5pbm5lckhlaWdodCgpLG09dGhpcy5lbGVtLmlubmVyV2lkdGgoKSxqPXRoaXMud3JhcHBlci5wb3NpdGlvbigpLGM9dGhpcy5jb250YWluZXIuaGVpZ2h0KCksaD10aGlzLmNvbnRhaW5lci53aWR0aCgpLFQ9c1tfXSxMPWZbX10sQT1zW0xdLHA9e30scFtBXT1fPT09XCJiXCI/ZDpfPT09XCJyXCI/eTowLEMocCxcInRvcFwiLGcudG9wLWoudG9wKSxDKHAsXCJsZWZ0XCIsZy5sZWZ0LWoubGVmdCksQj1bXCJ0b3BcIixcImxlZnRcIl07Zm9yKHc9MCxTPUIubGVuZ3RoO3c8Uzt3KyspRD1CW3ddLE49cGFyc2VJbnQodGhpcy5lbGVtLmNzcyhcIm1hcmdpbi1cIitEKSwxMCksTiYmQyhwLEQsTik7Yj1NYXRoLm1heCgwLHRoaXMub3B0aW9ucy5nYXAtKHRoaXMub3B0aW9ucy5hcnJvd1Nob3c/aTowKSksQyhwLEEsYik7aWYoIXRoaXMub3B0aW9ucy5hcnJvd1Nob3cpdGhpcy5hcnJvdy5oaWRlKCk7ZWxzZXtpPXRoaXMub3B0aW9ucy5hcnJvd1NpemUscj1lLmV4dGVuZCh7fSxwKSxuPXRoaXMudXNlckNvbnRhaW5lci5jc3MoXCJib3JkZXItY29sb3JcIil8fHRoaXMudXNlckNvbnRhaW5lci5jc3MoXCJib3JkZXItdG9wLWNvbG9yXCIpfHx0aGlzLnVzZXJDb250YWluZXIuY3NzKFwiYmFja2dyb3VuZC1jb2xvclwiKXx8XCJ3aGl0ZVwiO2ZvcihFPTAseD1hLmxlbmd0aDtFPHg7RSsrKXtEPWFbRV0sUD1zW0RdO2lmKEQ9PT1MKWNvbnRpbnVlO2w9UD09PVQ/bjpcInRyYW5zcGFyZW50XCIscltcImJvcmRlci1cIitQXT1pK1wicHggc29saWQgXCIrbH1DKHAsc1tMXSxpKSx0LmNhbGwoYSxPKT49MCYmQyhyLHNbT10saSoyKX10LmNhbGwodSxfKT49MD8oQyhwLFwibGVmdFwiLGsoTyxoLHkpKSxyJiZDKHIsXCJsZWZ0XCIsayhPLGksbSkpKTp0LmNhbGwobyxfKT49MCYmKEMocCxcInRvcFwiLGsoTyxjLGQpKSxyJiZDKHIsXCJ0b3BcIixrKE8saSx2KSkpLHRoaXMuY29udGFpbmVyLmlzKFwiOnZpc2libGVcIikmJihwLmRpc3BsYXk9XCJibG9ja1wiKSx0aGlzLmNvbnRhaW5lci5yZW1vdmVBdHRyKFwic3R5bGVcIikuY3NzKHApO2lmKHIpcmV0dXJuIHRoaXMuYXJyb3cucmVtb3ZlQXR0cihcInN0eWxlXCIpLmNzcyhyKX0sQS5wcm90b3R5cGUuZ2V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgZSxuLHIsaSxzLGYsYyxoO2g9dGhpcy5vcHRpb25zLnBvc2l0aW9ufHwodGhpcy5lbGVtP3RoaXMub3B0aW9ucy5lbGVtZW50UG9zaXRpb246dGhpcy5vcHRpb25zLmdsb2JhbFBvc2l0aW9uKSxlPWwoaCksZS5sZW5ndGg9PT0wJiYoZVswXT1cImJcIik7aWYobj1lWzBdLHQuY2FsbChhLG4pPDApdGhyb3dcIk11c3QgYmUgb25lIG9mIFtcIithK1wiXVwiO2lmKGUubGVuZ3RoPT09MXx8KHI9ZVswXSx0LmNhbGwodSxyKT49MCkmJihpPWVbMV0sdC5jYWxsKG8saSk8MCl8fChzPWVbMF0sdC5jYWxsKG8scyk+PTApJiYoZj1lWzFdLHQuY2FsbCh1LGYpPDApKWVbMV09KGM9ZVswXSx0LmNhbGwobyxjKT49MCk/XCJtXCI6XCJsXCI7cmV0dXJuIGUubGVuZ3RoPT09MiYmKGVbMl09ZVsxXSksZX0sQS5wcm90b3R5cGUuZ2V0U3R5bGU9ZnVuY3Rpb24oZSl7dmFyIHQ7ZXx8KGU9dGhpcy5vcHRpb25zLnN0eWxlKSxlfHwoZT1cImRlZmF1bHRcIiksdD1jW2VdO2lmKCF0KXRocm93XCJNaXNzaW5nIHN0eWxlOiBcIitlO3JldHVybiB0fSxBLnByb3RvdHlwZS51cGRhdGVDbGFzc2VzPWZ1bmN0aW9uKCl7dmFyIHQsbjtyZXR1cm4gdD1bXCJiYXNlXCJdLGUuaXNBcnJheSh0aGlzLm9wdGlvbnMuY2xhc3NOYW1lKT90PXQuY29uY2F0KHRoaXMub3B0aW9ucy5jbGFzc05hbWUpOnRoaXMub3B0aW9ucy5jbGFzc05hbWUmJnQucHVzaCh0aGlzLm9wdGlvbnMuY2xhc3NOYW1lKSxuPXRoaXMuZ2V0U3R5bGUoKSx0PWUubWFwKHQsZnVuY3Rpb24oZSl7cmV0dXJuIHIrXCItXCIrbi5uYW1lK1wiLVwiK2V9KS5qb2luKFwiIFwiKSx0aGlzLnVzZXJDb250YWluZXIuYXR0cihcImNsYXNzXCIsdCl9LEEucHJvdG90eXBlLnJ1bj1mdW5jdGlvbih0LG4pe3ZhciByLHMsbyx1LGE7ZS5pc1BsYWluT2JqZWN0KG4pP2UuZXh0ZW5kKHRoaXMub3B0aW9ucyxuKTplLnR5cGUobik9PT1cInN0cmluZ1wiJiYodGhpcy5vcHRpb25zLmNsYXNzTmFtZT1uKTtpZih0aGlzLmNvbnRhaW5lciYmIXQpe3RoaXMuc2hvdyghMSk7cmV0dXJufWlmKCF0aGlzLmNvbnRhaW5lciYmIXQpcmV0dXJuO3M9e30sZS5pc1BsYWluT2JqZWN0KHQpP3M9dDpzW2ldPXQ7Zm9yKG8gaW4gcyl7cj1zW29dLHU9dGhpcy51c2VyRmllbGRzW29dO2lmKCF1KWNvbnRpbnVlO3U9PT1cInRleHRcIiYmKHI9TChyKSx0aGlzLm9wdGlvbnMuYnJlYWtOZXdMaW5lcyYmKHI9ci5yZXBsYWNlKC9cXG4vZyxcIjxici8+XCIpKSksYT1vPT09aT9cIlwiOlwiPVwiK28sYih0aGlzLnVzZXJDb250YWluZXIsXCJbZGF0YS1ub3RpZnktXCIrdSthK1wiXVwiKS5odG1sKHIpfXRoaXMudXBkYXRlQ2xhc3NlcygpLHRoaXMuZWxlbT90aGlzLnNldEVsZW1lbnRQb3NpdGlvbigpOnRoaXMuc2V0R2xvYmFsUG9zaXRpb24oKSx0aGlzLnNob3coITApLHRoaXMub3B0aW9ucy5hdXRvSGlkZSYmKGNsZWFyVGltZW91dCh0aGlzLmF1dG9oaWRlVGltZXIpLHRoaXMuYXV0b2hpZGVUaW1lcj1zZXRUaW1lb3V0KHRoaXMuc2hvdy5iaW5kKHRoaXMsITEpLHRoaXMub3B0aW9ucy5hdXRvSGlkZURlbGF5KSl9LEEucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLndyYXBwZXIuZGF0YShyLG51bGwpLHRoaXMud3JhcHBlci5yZW1vdmUoKX0sZVtuXT1mdW5jdGlvbih0LHIsaSl7cmV0dXJuIHQmJnQubm9kZU5hbWV8fHQuanF1ZXJ5P2UodClbbl0ocixpKTooaT1yLHI9dCxuZXcgQShudWxsLHIsaSkpLHR9LGUuZm5bbl09ZnVuY3Rpb24odCxuKXtyZXR1cm4gZSh0aGlzKS5lYWNoKGZ1bmN0aW9uKCl7dmFyIGk9TihlKHRoaXMpKS5kYXRhKHIpO2kmJmkuZGVzdHJveSgpO3ZhciBzPW5ldyBBKGUodGhpcyksdCxuKX0pLHRoaXN9LGUuZXh0ZW5kKGVbbl0se2RlZmF1bHRzOlMsYWRkU3R5bGU6bSxyZW1vdmVTdHlsZTp2LHBsdWdpbk9wdGlvbnM6dyxnZXRTdHlsZTpkLGluc2VydENTUzpnfSksbShcImJvb3RzdHJhcFwiLHtodG1sOlwiPGRpdj5cXG48c3BhbiBkYXRhLW5vdGlmeS10ZXh0Pjwvc3Bhbj5cXG48L2Rpdj5cIixjbGFzc2VzOntiYXNlOntcImZvbnQtd2VpZ2h0XCI6XCJib2xkXCIscGFkZGluZzpcIjhweCAxNXB4IDhweCAxNHB4XCIsXCJ0ZXh0LXNoYWRvd1wiOlwiMCAxcHggMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSlcIixcImJhY2tncm91bmQtY29sb3JcIjpcIiNmY2Y4ZTNcIixib3JkZXI6XCIxcHggc29saWQgI2ZiZWVkNVwiLFwiYm9yZGVyLXJhZGl1c1wiOlwiNHB4XCIsXCJ3aGl0ZS1zcGFjZVwiOlwibm93cmFwXCIsXCJwYWRkaW5nLWxlZnRcIjpcIjI1cHhcIixcImJhY2tncm91bmQtcmVwZWF0XCI6XCJuby1yZXBlYXRcIixcImJhY2tncm91bmQtcG9zaXRpb25cIjpcIjNweCA3cHhcIn0sZXJyb3I6e2NvbG9yOlwiI0I5NEE0OFwiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0YyREVERVwiLFwiYm9yZGVyLWNvbG9yXCI6XCIjRUVEM0Q3XCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FZQUFBQ05pUjBOQUFBQUdYUkZXSFJUYjJaMGQyRnlaUUJCWkc5aVpTQkpiV0ZuWlZKbFlXUjVjY2xsUEFBQUF0UkpSRUZVZU5xa1ZjMXUwMEFRSHErZE9EKzBwb0lRZmtJamFsVzBTRUdxUk11Um5Ib3MzRGp3QUgwQXJseVFlQU5PT1NNZUFBNVZqeUJ4S0JRaGdTcFZVS0tRTkdsb0ZkdzRjV3cyanRmTU9uYTZKT1VBckRUYXpYaS9iM2RtNTVzb2NQcVFoRmthKythSEJzSThHc29wUkpFUk5GbFk4OEZDRWs5WWl3ZjhSaGdSeWFIRlFwUEhDRG1aRzVvWDJ1aTJ5aWxrY1RUMUFjRHNiWUMxTk1BeU9pN3pUWDJBZ3g3QTlsdUFsODhCYXVpaVEvY0phWlFmSXBBbG5nRGN2WlpNcmw4dkZQSzUrWGt0cldseDMvZWhaNXI5K3Q2ZStXVm5wMXB4bk5JamdCZTQvNmRBeXNRYzhkc21Id1BjVzlDMGgzZlcxaGFuczFsdHdKaHkwR3hLN1haYlVsTXA1V3cyZXlhbjYrZnQvZjJGQXFYR0s0Q3ZRazVIdWVGejdENkdPWnRJcksrc3J1cGR4MUdSQkJxTkJ0emMyQWlNcjduUHBsUmRLaGIxcTZxNnpqRmhya2xFRk9VdXRvUTUweGNYODZabHFhWnBRcmZiQmR1MlI2L0cxOXpYNlhTZ2g2Ulg1dWJ5SENNOG5xU0lENklDckdpWmpHWVl4b2pFc2l3NFBEd01TTDVWS3NDOFlmNFZSWUZ6TXpNYXh3amxKU2xDeUFROWwwQ1c0NFBCQUR6WGhlN3hNZGk5SHRUcmRZakZZa0RRTDBjbjRYZHEyL0VBRStJbkNudkFEVGYyZWFoNFN4OXZFeFFqa3FYVDZhQUVSSUNNZXdkL1VBcC9JZVlBTk0yam94dCtxNVZJK2llcTJpMFdnM2w2RE56SHdURVJQZ28xa283WEJYajN2ZGxzVDJGK1V1aEloWWtwN3U3Q2Fya2NyRk9DdFIzSDVKaXdiQUllSW1qVC9ZUUtLQnRHalJGQ1U1SVVnRlJlN2ZGNGNDTlZJUE1ZbzNWS3F4d2p5TkFYTmVwdW9weXFubGQ2MDJxVnNmUnBFa2t6K0dGTDF3UGo2eVNYQnBKdFdWYTV4bGhwY3loQk53cFpIbXRYOEFHZ2ZJRXhvMFpwemtXVlRCR2lYQ1NFYUhoNjIvUG9SMHAvdkhhY3p4WEduajRiU28rRzc4bEVMVTgwaDF1b2dCd1dMZjVZbHNQbWdERWQ0TTIzNnhqbSs4bm00SXVFLzl1Ky9QSDJKWFpmYnd6NHp3MVdiTytTUVBwWGZ3Ry9CQmdBaENOWmlTYi9wT1FBQUFBQVNVVk9SSzVDWUlJPSlcIn0sc3VjY2Vzczp7Y29sb3I6XCIjNDY4ODQ3XCIsXCJiYWNrZ3JvdW5kLWNvbG9yXCI6XCIjREZGMEQ4XCIsXCJib3JkZXItY29sb3JcIjpcIiNENkU5QzZcIixcImJhY2tncm91bmQtaW1hZ2VcIjpcInVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJRQUFBQVVDQVlBQUFDTmlSME5BQUFBR1hSRldIUlRiMlowZDJGeVpRQkJaRzlpWlNCSmJXRm5aVkpsWVdSNWNjbGxQQUFBQXV0SlJFRlVlTnEwbGN0UEUwRWN4Mzh6dS9SRlMxRXJ5cXRnSkZBMDhZQ2lNWklBUVE0ZVJHOGVER2RQSmlZZVRJd0hUZndQaUFjdlhJd1hMd29YUGFEeGtXZ1E2aXNsS2xKTFNRV0xVcmFQTFR2N0dtZTMyem9GOUtTVGZMTzd2NTN2WjNkL003L2ZJdGgrSU82SU50Mmpqb0E3YmpIQ0pvQWx6Q1J3NTlZd0hZakJuZk1QcUFLV1FZS2pHa2ZDSnFBRjB4d1pqaXBRdEEzTXhlU0c4N1ZoT09ZZWdWclVDeTdVWk05UzZUTElkQWFteVNUY2xaZFloRmhSSGxvR1lnN21nWnYxWnp6dHZndWQ3VjF0YlEydHdZQTM0TEptRjRwNWRYRjFLVHVmbkUrU3hlSnR1Q1pOc0xEQ1FVMCtSeUtURjI3VW53MTAxbDhlNmhuczN1MFBCYWxPUlZWVmtjYUVLQkpEZ1YzK2NHTTR0S0ttSStvaGxJR255Z0tYMDByU0Jmc3p6L24ydVh2ODF3ZDYrcnQxb3JzWkNIUmRyMUltazJGMktvYjNodXRTeFc4dGhzZDhBWE5hbG45RDdDVGZBNk8rMFVna011d1Z2RUZGVWJiQWNya2NUQTgrQXRPazhFNktpUWlEbU1GU0RxWkl0QXpFVlF2aVJrZERkYUZnUHA4SFNaS0FFQUw1UWg3U3EybElKQkp3djJzY1Vxa1VuS29aZ05oY0RLaEtnNWFIKzFJa2NvdUNBZEZHQVFzdVdaWWhPandGSFE5Nm9hZ1dnUm9Vb3YxVDlrUkJFT0RBd3hNMlF0RVVsK1dwK0xuOVZSbzZCY013NEVySFJZakg0L0IyNkFsUW9RUVRSZEhXd2NkOUFINTcrVUFYZGR2REQzN0RtckJCVjM0V2ZxaVhQbDYxZyt2cjZ4QTl6c0dlTTlnT2RzTlhrZ3BFdFR3VnZ3T2tsWExLbTYrL3A1ZXp3azRCK2o2ZHJvQnMyQ3NHYS9nTnM2Ukl4YXpsNFRjMjVtcFRndy9hcFBSMUxZbE5SRkF6Z3NPeGt5WFlMSU0xVjhOTXd5QWtKU2N0RDFlR1ZLaXE1d1dqU1Bkam1lVGtpS3ZWVzRmMllQSFdsM0dBVnE2eW1jeUNUZ292TTNGenlSaURlMlRhS2NFS3NMcEp2TkhqWmdQTnFFdHlpNm1aSW00U1JGeUxNVXNPTlNTZGtQZUZ0WTFuMG1jem9ZM0JIVExod1BSeTkvbHpjemlDdzlBQ0kreXFsMFZMemNHQVpiWVNNNUNDU1pnMS85b2Mvbm43K2k4TjlwLzhBbjRKTUFEeGhIK3hIZnVpS3dBQUFBQkpSVTVFcmtKZ2dnPT0pXCJ9LGluZm86e2NvbG9yOlwiIzNBODdBRFwiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0Q5RURGN1wiLFwiYm9yZGVyLWNvbG9yXCI6XCIjQkNFOEYxXCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FZQUFBQ05pUjBOQUFBQUJtSkxSMFFBL3dEL0FQK2d2YWVUQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUFCM1JKVFVVSDNRWUZBaGtTc2Rlcy9RQUFBOGRKUkVGVU9NdlZsR3RNVzJVWXgvL1BPYVdIWGc2bExhVzB5cEF0dzFVQ2dibmlOT0xjVk9MbUFqSFpvbE9ZbHhtVEdYVlpkQW5SZlhRbSs3U29VNG1YYU9haVpzRXBDOUZraVFzNlo2YmRDbk5ZcnVNNktOQnc2WVdld3psOXorc0hJbUVXdit2ejdYbVQ5NWYvKzMvKzd3UDgxNHYrZWZET1YzL1NvWDNsSEFBKzZPRGVVRmZNZmpPV01BRGdkaytlRUt6MHBGN2FRZE1BY09LTExqcmNWTVZYM3hkV04yOS9HaFlQN1N2blAwY1dmUzhjYVNrZkhac1BFOUZnbnQwMkpOdXRRMFFZSEIyZER6OS9wS1g4UWpqdU85eFV4ZC82NkhkeFRlQ0haM3JvalFPYkdRQmN1TmpmcGxrRDNiMTlZLzZNcmltU2FLZ1NNbXBHVTVXZXZtRS9zd2E2T3k3M3RRSEEwUmRyMk1tdi82QTFuOXc5c3VRNzA5N1o5bE00RmxUZ1REcnpaVHU0U3RYVmZwaUk0OHJWY1VETTVjbUVrc3JGbkh4ZnBUdFUvM0JGUXpDUUYvMmJZVm9OYkg3em1JdGJTb01qNDBKU3ptTXlYNXFEdnJpQTdRZHJJSXBBKzNjZHNNcHUwblhJOGNWME10S1hDUFplditnQ0VNMVMyTkhQdldmUC9oTCs3RlNyMyswcDVSQkV5aEVONUpDS1lyOFhuQVNNVDB4Qk55elFHUWVJOGZqc0dEMzlSTVBrN3NlMmJkNVp0VHlvRllYZnRGNnkzN2d4N05lVXRKSk9URmxBSERaTER1SUxVM2ozK0g1b09yRDN5V2JJenR1Z2FBemduQktKdUJMcEdmUXJTOHdPNEZaZ1YrYzFJeGFMZ1dWVTB0TUxFRVRDb3M0eE16RUl2OWNKWFFjeWFnSXdpZ0RHd0pnT0F0SEF3QWhpc1FVankwT1JHRVJpRUxnRzRpYWtrem80TVlBeGNNNWhBTWkxV1dHMXlZQ0pJY01VYUJrVlJMZEdlU1UyOTk1VExXemNVQXpPTko3SjZGQlZCWUlnZ016bUZidmRCVjQ0Q29yZzh2amh6QytFSkVsOFUxa0p0Z1lyaEN6Z2MvdnZUd1hLU2liMXBhUkZWUlZPUkRBSkFzdzVGdVRhSkVoV00yU0hCM21PQWxoa054d3VMemVKc0d3cVd6ZjVURk5kS2d0WTVxSHA2WkZmNjdZL3NBVmFkQ2FWWTVZQUNERGIzT2k0TklqTG5XTXcyUXRoQ0JJc1Zoc1VUVTl0dlhzamVxOStYMWQ3NS9LRXM0TE5PZmNkZi8rSHRoTW52d3hPRDB3bUhhWHI3Wkl0bjJ3dUgyU25CemJaQWJQSndwUHgrVlF1emNtN2RnUkNCNTdhMXVCelVEUkw0YmZuSTBSRTBlYVhkOVc4OW1wanFIWm5VSTVIaDJsMmRrWlpVaE9xcGkycVNtcE9tWjY0VHV1OXFsei9TRVhvNk1FSGEzd09pcDQ2RjFuNzYzM2Vla1Y4ZHM4V3hqbjM3V2w2M1ZWYStlajVvZUVaLzgyWkJFVEpqcEoxUmJpajJEM1ovMXRyWFV2THNibENLMFhmT3gwU1gya01zbjlkWCtkKzdLZjZoOG80QUl5a3VmZmpUOEwyMExVK3c0QVpkNVZ2RVBZK1hwV3FMVjMyN0hSN0R6WHVEbkQ4citvdmtCZWhKOGkreThZQUFBQUFTVVZPUks1Q1lJST0pXCJ9LHdhcm46e2NvbG9yOlwiI0MwOTg1M1wiLFwiYmFja2dyb3VuZC1jb2xvclwiOlwiI0ZDRjhFM1wiLFwiYm9yZGVyLWNvbG9yXCI6XCIjRkJFRUQ1XCIsXCJiYWNrZ3JvdW5kLWltYWdlXCI6XCJ1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCUUFBQUFVQ0FNQUFBQzZWKzAvQUFBQkpsQk1WRVhyNmViLzJvRC93aTcveGpyLzBtUC95a2YvdFFEL3ZCai8zbzcvdVEvL3Z5TC90d2ViaGdELzRwelgxSzN6OGUzNDl2SzZ0SENpbENXYmlReW1uMGpHd29ycjZkWFF6YTNIeGNLa24xdld2Vi81dVJmazRkWFoxYkQxOCsvNTJZZWJpQW15cjVTOW1oQ3pyV3E1dDZ1ZmpSSDU0YUxzMG9TK3FENzUxWHFQaEF5Ymh3WHN1akczc20rWmswUFR3RzZTaGcrUGhoT2Jod09QZ1FMNHpWMm5seXJmMjd1TGZnQ1BoUkh1N09tTGdBYWZreWlXa0QzbDQ5aWJpQWZUczBDK2xnQ25pd0Q0c2dESnhxT2lsekRXb3dXRmZBSDA4dWViaWc2cXBGSEJ2SC9hdzI2RmZRVFF6c3Z5OE95RWZ6MjByM2pBdmFLYmhnRzlxMG5jMkxiWnhYYW5vVXUvdTVXU2dnQ3RwMWFucEpLZG1Gei96bFgvMW5HSmlZbXVxNUR4NytzQUFBRG9QVVpTQUFBQUFYUlNUbE1BUU9iWVpnQUFBQUZpUzBkRUFJZ0ZIVWdBQUFBSmNFaFpjd0FBQ3hNQUFBc1RBUUNhbkJnQUFBQUhkRWxOUlFmZEJnVUJHaGg0YWFoNUFBQUFsa2xFUVZRWTAyTmdvQklJRThFVWN3bjFGa0lYTTFUajVkRFVRaFBVNTAyTWk3WFhReEd6NXVWSWpHT0pVVVVXODFIbllFeU1pMkhWY1VPSUNRWnpNTVlteHJFeU15bEp3Z1V0NUJsaldSTGptSm00cEkxaFlwNVNRTEdZeERnbUxuWk9WeHVvb0NsSURLZ1hLTWJONWdnVjFBQ0xKY2FCeE5nY29pR0NCaVp3ZFd4T0VUQkRyVHlFRmV5MGpZSjRlSGpNR1dnRUFJcFJGUkNVdDA4cUFBQUFBRWxGVGtTdVFtQ0MpXCJ9fX0pLGUoZnVuY3Rpb24oKXtnKGguY3NzKS5hdHRyKFwiaWRcIixcImNvcmUtbm90aWZ5XCIpLGUoZG9jdW1lbnQpLm9uKFwiY2xpY2tcIixcIi5cIityK1wiLWhpZGFibGVcIixmdW5jdGlvbih0KXtlKHRoaXMpLnRyaWdnZXIoXCJub3RpZnktaGlkZVwiKX0pLGUoZG9jdW1lbnQpLm9uKFwibm90aWZ5LWhpZGVcIixcIi5cIityK1wiLXdyYXBwZXJcIixmdW5jdGlvbih0KXt2YXIgbj1lKHRoaXMpLmRhdGEocik7biYmbi5zaG93KCExKX0pfSl9KSIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuYWxleGEnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnXSxcblxuXHRpbml0KGVsdCwgaHR0cCkge1xuXHRcdGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSlcblxuXHRcdC8vY29uc29sZS5sb2coJ2hhc2gnLCBoYXNoKVxuXHRcdGNvbnN0IHBhcmFtcyA9ICQkLnVybC5wYXJzZVVybFBhcmFtcyhoYXNoKVxuXHRcdC8vY29uc29sZS5sb2coJ3BhcmFtcycsIHBhcmFtcylcblx0XHRodHRwLnBvc3QoJy9hcGkvYWxleGEvYXV0aCcsIHBhcmFtcykudGhlbigoKSA9PiB7XG5cdFx0XHR3aW5kb3cuY2xvc2UoKVxuXHRcdH0pXG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcFRhYicsIHtcblxuXHRwcm9wczoge1xuXHRcdGFwcFVybDogJ2Fib3V0OmJsYW5rJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxpZnJhbWUgYm4tYXR0cj1cXFwie3NyYzogYXBwVXJsfVxcXCIgYm4tYmluZD1cXFwiaWZyYW1lXFxcIiBibi1ldmVudD1cXFwibG9hZDogb25GcmFtZUxvYWRlZFxcXCI+PC9pZnJhbWU+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cdFx0Y29uc3Qge2FwcFVybH0gPSB0aGlzLnByb3BzO1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBVcmxcdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZyYW1lTG9hZGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBvbkZyYW1lTG9hZGVkJylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQXBwRXhpdCA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwRXhpdCcsIGN0cmwubW9kZWwuYXBwVXJsKVxuXHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRjb25zdCByb290UGFnZSA9ICRpZnJhbWUuZmluZCgnLnJvb3RQYWdlJykuaWZhY2UoKVxuXHRcdFx0aWYgKHJvb3RQYWdlICYmIHR5cGVvZiByb290UGFnZS5vbkFwcEV4aXQgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gcm9vdFBhZ2Uub25BcHBFeGl0KClcblx0XHRcdH1cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVx0XHRcblx0XHR9XHRcblxuXHRcdHRoaXMub25BcHBTdXNwZW5kID0gZnVuY3Rpb24oKSAge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnW2FwcFRhYl0gb25BcHBTdXNwZW5kJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwU3VzcGVuZCA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJvb3RQYWdlLm9uQXBwU3VzcGVuZCgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFwcFJlc3VtZSA9IGZ1bmN0aW9uKCkgIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1thcHBUYWJdIG9uQXBwUmVzdW1lJywgY3RybC5tb2RlbC5hcHBVcmwpXG5cdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdGNvbnN0IHJvb3RQYWdlID0gJGlmcmFtZS5maW5kKCcucm9vdFBhZ2UnKS5pZmFjZSgpXG5cdFx0XHRpZiAocm9vdFBhZ2UgJiYgdHlwZW9mIHJvb3RQYWdlLm9uQXBwUmVzdW1lID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cm9vdFBhZ2Uub25BcHBSZXN1bWUoKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QXBwVXJsID0gZnVuY3Rpb24oYXBwVXJsKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbYXBwVGFiXSBzZXRBcHBVcmwnLCBhcHBVcmwpXG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcFVybDogYXBwVXJsICsgJyZkYXRlPScgKyBEYXRlLm5vdygpfSlcblx0XHR9XG5cdH1cbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmFwcHMnLCB7XG5cblx0cHJvcHM6IHtcblx0XHRhcHBzOiBbXSxcblx0XHRzaG93QWN0aXZhdGVkOiBmYWxzZSxcblx0XHRpdGVtczogbnVsbFxuXHR9LFxuXG5cdCRpZmFjZTogJ3NldERhdGEoZGF0YSknLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiYXBwc1xcXCIgXFxuXHRcdGJuLWl0ZXI9XFxcImFwcFxcXCIgXFxuXHRcdGNsYXNzPVxcXCJtYWluXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aWxlOiBvblRpbGVDb250ZXh0TWVudVxcXCJcXG5cdFx0Plx0XHRcdFxcblx0XHQ8ZGl2IGJuLWF0dHI9XFxcImNsYXNzMVxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZXRJdGVtc31cXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImFycm93LXJpZ2h0XFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuYXBwLnByb3BzLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLmFwcC5wcm9wcy50aXRsZVxcXCI+PC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3Qge2FwcHMsIHNob3dBY3RpdmF0ZWQsIGl0ZW1zfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Z2V0SXRlbXM6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZ2V0SXRlbXMnLCBzY29wZS5hcHApXG5cdFx0XHRcdFx0cmV0dXJuICh0eXBlb2YgaXRlbXMgPT0gJ2Z1bmN0aW9uJykgPyBpdGVtcyhzY29wZS5hcHApIDogaXRlbXNcblx0XHRcdFx0fSxcblx0XHRcdFx0YXBwcyxcblx0XHRcdFx0c2hvd0FjdGl2YXRlZCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2hvd0FjdGl2YXRlZCAmJiBzY29wZS5hcHAuYWN0aXZhdGVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2NsYXNzOiBgdGlsZSB3My1idG4gJHtzY29wZS5hcHAucHJvcHMuY29sb3JDbHN9YH1cblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHR5cGVvZiBzY29wZS5hcHAucHJvcHMuaWNvbkNscyA9PSAnc3RyaW5nJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGlsZUNsaWNrJywgJCh0aGlzKS5kYXRhKCdpdGVtJykpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2FwcGNsaWNrJywgY3RybC5tb2RlbC5hcHBzW2lkeF0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGlsZUNvbnRleHRNZW51OiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGlsZUNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7Y21kfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gJC5leHRlbmQoe2NtZH0sIGN0cmwubW9kZWwuYXBwc1tpZHhdKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdhcHBjb250ZXh0bWVudScsIGluZm8pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdGFwcHM6IGRhdGEuYXBwcy5maWx0ZXIoKGEpID0+IGEucHJvcHMudmlzaWJsZSAhPSBmYWxzZSAmJiBhLmFwcE5hbWUgIT0gJ3RlbXBsYXRlJylcblx0XHRcdH0pXG5cdFx0fVxuXG5cdH0sXG5cblx0JGlmYWNlOiBgc2V0RGF0YShkYXRhKWAsXG5cdCRldmVudHM6ICdhcHBjbGljazthcHBjb250ZXh0bWVudSdcbn0pO1xuXG4iLCIvL0B0cy1jaGVja1xuKGZ1bmN0aW9uICgpIHtcblxuXHRmdW5jdGlvbiBnZXRUaW1lKGR1cmF0aW9uKSB7XG5cdFx0Y29uc3QgZCA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMClcblx0XHRjb25zdCB2ID0gZC5nZXRNaW51dGVzKCkgKyBkLmdldFNlY29uZHMoKSAvIDEwMFxuXHRcdHJldHVybiB2LnRvRml4ZWQoMikucmVwbGFjZSgnLicsICc6Jylcblx0fVxuXG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmF1ZGlvcGxheWVyJywge1xuXG5cdFx0dGVtcGxhdGU6IFwiPGRpdj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBibi1pY29uPVxcXCJmYSBmYS1mb2xkZXItb3BlblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNob29zZUZpbGVcXFwiXFxuXHR0aXRsZT1cXFwiQ2hvb3NlIGZpbGVcXFwiPjwvYnV0dG9uPlxcblxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcIiF0aXRsZVxcXCI+XFxuXHRcdDxzdHJvbmc+RmlsZU5hbWU6PC9zdHJvbmc+XFxuXHRcdDxzcGFuIGJuLXRleHQ9XFxcIm5hbWVcXFwiPjwvc3Bhbj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcInRpdGxlXFxcIj5cXG5cdFx0PHN0cm9uZz5UaXRsZTo8L3N0cm9uZz5cXG5cdFx0PHNwYW4gYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvc3Bhbj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcImFydGlzdFxcXCI+XFxuXHRcdDxzdHJvbmc+QXJ0aXN0Ojwvc3Ryb25nPlxcblx0XHQ8c3BhbiBibi10ZXh0PVxcXCJhcnRpc3RcXFwiPjwvc3Bhbj5cXG5cdDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdj48L2Rpdj5cXG5cXG5cdDxidXR0b24gYm4tc2hvdz1cXFwiIXBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QbGF5XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJQbGF5XFxcIiBibi1pY29uPVxcXCJmYSBmYS1sZyBmYS1wbGF5XFxcIj5cXG5cdDwvYnV0dG9uPlxcblxcblx0PGJ1dHRvbiBibi1zaG93PVxcXCJwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGF1c2VcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlBhdXNlXFxcIiBibi1pY29uPVxcXCJmYSBmYS1sZyBmYS1wYXVzZVxcXCI+XFxuXHQ8L2J1dHRvbj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcInRvb2xiYXIyXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1sZyBmYS12b2x1bWUtZG93biB3My10ZXh0LWJsdWUgdm9sdW1lXFxcIj48L2k+XFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zbGlkZXJcXFwiIGJuLWRhdGE9XFxcInttaW46IDAsIG1heDoxLCBzdGVwOiAwLjEsIG9yaWVudGF0aW9uOiBcXCd2ZXJ0aWNhbFxcJ31cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25Wb2x1bWVDaGFuZ2VcXFwiXFxuXHRcdFx0Ym4tdmFsPVxcXCJ2b2x1bWVcXFwiIGNsYXNzPVxcXCJ2b2x1bG1lU2xpZGVyXFxcIj48L2Rpdj5cXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwic2xpZGVyXFxcIj5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImdldFRpbWVJbmZvXFxcIj48L3NwYW4+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWF4OiBkdXJhdGlvbn1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25TbGlkZXJDaGFuZ2VcXFwiIGJuLXZhbD1cXFwiY3VyVGltZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cXG5cXG48YXVkaW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgYm4tYmluZD1cXFwiYXVkaW9cXFwiXFxuXHRibi1ldmVudD1cXFwiY2FucGxheTogb25Mb2FkLCB0aW1ldXBkYXRlOiBvblRpbWVVcGRhdGUsIHBsYXlpbmc6IG9uUGxheWluZywgcGF1c2U6IG9uUGF1c2VkLCBlbmRlZDogb25FbmRlZFxcXCI+XFxuPC9hdWRpbz5cIixcblxuXHRcdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRcdHByb3BzOiB7XG5cdFx0XHRmaWx0ZXJFeHRlbnNpb246ICcnLFxuXHRcdFx0Z2V0TVAzSW5mbzogZmFsc2UsXG5cdFx0XHRzaG93TXAzRmlsdGVyOiBmYWxzZVxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXJcblx0XHQgKi9cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlcikge1xuXG5cdFx0XHRjb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cdFx0XHRjb25zdCB7IGZpbHRlckV4dGVuc2lvbiwgZ2V0TVAzSW5mbywgc2hvd01wM0ZpbHRlciB9ID0gdGhpcy5wcm9wc1xuXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdHVybDogJyMnLFxuXHRcdFx0XHRcdG5hbWU6ICcnLFxuXHRcdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0XHRhcnRpc3Q6ICcnLFxuXHRcdFx0XHRcdHZvbHVtZTogMCxcblx0XHRcdFx0XHRkdXJhdGlvbjogMCxcblx0XHRcdFx0XHRjdXJUaW1lOiAwLFxuXHRcdFx0XHRcdHBsYXlpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGdldFRpbWVJbmZvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYCR7Z2V0VGltZSh0aGlzLmN1clRpbWUpfSAvICR7Z2V0VGltZSh0aGlzLmR1cmF0aW9uKX1gXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdG9uQ2hvb3NlRmlsZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVjaG9vc2VyJywge1xuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0XHRcdFx0XHRnZXRNUDNJbmZvLFxuXHRcdFx0XHRcdFx0XHRcdHNob3dNcDNGaWx0ZXJcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdDaG9vc2UgRmlsZScsXG5cdFx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB7ZmlsZU5hbWUsIHVybCwgbXAzfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRpZiAobXAzICYmIG1wMy50aXRsZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qge2FydGlzdCwgdGl0bGV9ID0gbXAzXG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2FydGlzdCwgdGl0bGUsIHVybH0pXHRcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZSB7IFxuXHRcdFx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHt1cmwsIG5hbWU6IGZpbGVOYW1lfSlcdFxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XG5cdFx0XHRcdFx0fSxcdFx0XHRcdFx0XG5cdFx0XHRcdFx0b25Wb2x1bWVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnZvbHVtZSA9IHZhbHVlXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkxvYWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2R1cmF0aW9uJywgdGhpcy5kdXJhdGlvbilcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGR1cmF0aW9uOiBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uKSwgdm9sdW1lOiBhdWRpby52b2x1bWUgfSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25UaW1lVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJUaW1lOiB0aGlzLmN1cnJlbnRUaW1lIH0pXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGxheWluZzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QbGF5aW5nJylcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHBsYXlpbmc6IHRydWUgfSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QYXVzZWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUGF1c2VkJylcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHBsYXlpbmc6IGZhbHNlIH0pXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGxheTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGF1c2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnBhdXNlKClcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25TbGlkZXJDaGFuZ2U6IGZ1bmN0aW9uIChldiwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2xpZGVyQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0XHRhdWRpby5jdXJyZW50VGltZSA9IHZhbHVlXG5cdFx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblxuXHRcdFx0LyoqQHR5cGUge0hUTUxBdWRpb0VsZW1lbnR9ICovXG5cdFx0XHRjb25zdCBhdWRpbyA9IGN0cmwuc2NvcGUuYXVkaW8uZ2V0KDApXG5cblx0XHRcdHRoaXMuZ2V0QXVkaW9FbGVtZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBhdWRpb1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdH0pO1xuXG59KSgpO1xuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hZGRDb250YWN0UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCIgYm4tZm9ybT1cXFwiaW5mb1xcXCI+XFxuXFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuYWNjb3JkaW9uXFxcIiBkYXRhLWhlaWdodC1zdHlsZT1cXFwiZmlsbFxcXCI+XFxuXFxuXFxuXHRcdDxkaXYgdGl0bGU9XFxcIk5hbWUgJiBFbWFpbFxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZ2VuZGVyXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5HZW5kZXI6PC9sYWJlbD5cXG5cdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5yYWRpb2dyb3VwXFxcIiBuYW1lPVxcXCJnZW5kZXJcXFwiPlxcblx0XHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHRcdFx0PGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiB2YWx1ZT1cXFwibWFsZVxcXCI+XFxuXHRcdFx0XHRcdFx0PGxhYmVsPk1hbGU8L2xhYmVsPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcImZlbWFsZVxcXCI+XFxuXHRcdFx0XHRcdFx0PGxhYmVsPkZlbWFsZTwvbGFiZWw+XFxuXHRcdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+TmFtZTo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5FbWFpbDo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJCaXJ0aGRheVxcXCI+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkJpcnRoZGF5PC9sYWJlbD48YnI+XFxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5kYXRlcGlja2VyXFxcIiBcXG5cdFx0XHRcdFx0Ym4tZGF0YT1cXFwie1xcblx0XHRcdFx0XHRcdGNoYW5nZVllYXI6IHRydWUsXFxuXHRcdFx0XHRcdFx0eWVhclJhbmdlOiBcXCctMTAwOiswXFwnXFxuXHRcdFx0XHRcdH1cXFwiXFxuXHRcdFx0XHRcdG5hbWU9XFxcImJpcnRoZGF5XFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImJpcnRoTm90aWZcXFwiPlxcblx0XHRcdFx0PGxhYmVsPkFjdGl2YXRlIGJpcnRoZGF5IE5vdGlmaWNhdGlvbjwvbGFiZWw+XFxuXHRcdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuZmxpcHN3aXRjaFxcXCIgbmFtZT1cXFwiYmlydGhkYXlOb3RpZlxcXCI+PC9kaXY+XFxuXHRcdFx0PC9kaXY+XFxuXFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJQaG9uZXNcXFwiPlxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5Ib21lIFBob25lOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IG5hbWU9XFxcInBob25lXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0cGhvbmVcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5DZWxsIFBob25lOjwvbGFiZWw+PGJyPlxcblx0XHRcdFx0PGlucHV0IG5hbWU9XFxcIm1vYmlsZVBob25lXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0cGhvbmVcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IHRpdGxlPVxcXCJBZGRyZXNzXFxcIj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0XHQ8bGFiZWw+QWRkcmVzczo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJhZGRyZXNzXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHRcdDxsYWJlbD5Qb3N0YWwgQ29kZTo8L2xhYmVsPjxicj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIG5hbWU9XFxcInBvc3RhbENvZGVcXFwiIG1heGxlbmd0aD1cXFwiNVxcXCIgYm4tZXZlbnQ9XFxcImJsdXI6IG9uUG9zdGFsQ29kZUxvc3RGb2N1c1xcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcXG5cdFx0XHQ8ZGl2Plxcblx0XHRcdFx0PGxhYmVsPkNpdHk6PC9sYWJlbD5cXG5cdFx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBjaXRpZXN9XFxcIiBuYW1lPVxcXCJjaXR5XFxcIiBibi12YWw9XFxcImNpdHlcXFwiPjwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblx0XFxuXHRcdDwvZGl2Plxcblxcblx0PC9kaXY+XFxuXFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIj5cXG48L2Zvcm0+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5jb250YWN0cycsICdicmVpemJvdC5jaXRpZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdGRhdGE6IHt9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQ29udGFjdC5JbnRlcmZhY2V9IGNvbnRhY3RzU3J2IFxuXHQgXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGNvbnRhY3RzU3J2LCBjaXRpZXNTcnYpIHtcblxuXHRcdGNvbnN0IGluZm8gPSB0aGlzLnByb3BzLmluZm8gfHwge31cblx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRjb25zdCBpZCA9IGluZm8uX2lkXG5cdFx0Y29uc3QgeyBwb3N0YWxDb2RlLCBjaXR5IH0gPSBpbmZvXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGluZm8sXG5cdFx0XHRcdGNpdGllczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZSh7IGlkLCBkYXRhIH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Qb3N0YWxDb2RlTG9zdEZvY3VzOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Qb3N0YWxDb2RlTG9zdEZvY3VzJywgdGhpcy52YWx1ZSlcblx0XHRcdFx0XHRjb25zdCBjaXRpZXMgPSBhd2FpdCBjaXRpZXNTcnYuZ2V0Q2l0ZXNGcm9tUG9zdGFsQ29kZSh0aGlzLnZhbHVlKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGNpdGllcyB9KVxuXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBsb2FkKCkge1xuXHRcdFx0Y29uc3QgY2l0aWVzID0gYXdhaXQgY2l0aWVzU3J2LmdldENpdGVzRnJvbVBvc3RhbENvZGUocG9zdGFsQ29kZSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGNpdGllcyB9KVxuXHRcdFx0aWYgKGNpdHkgJiYgY2l0eSAhPSAnJykge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBjaXR5IH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHBvc3RhbENvZGUgJiYgcG9zdGFsQ29kZSAhPSAnJykge1xuXHRcdFx0bG9hZCgpXG5cdFx0fVxuXG5cblx0XHR0aGlzLmFkZENvbnRhY3QgPSBhc3luYyBmdW5jdGlvbiAoaW5mbykge1xuXHRcdFx0YXdhaXQgY29udGFjdHNTcnYuYWRkQ29udGFjdChpbmZvKVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlQ29udGFjdEluZm8gPSBhc3luYyBmdW5jdGlvbiAoaWQsIGluZm8pIHtcblx0XHRcdGF3YWl0IGNvbnRhY3RzU3J2LnVwZGF0ZUNvbnRhY3RJbmZvKGlkLCBpbmZvKVxuXHRcdH1cblxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YWRkOiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdBcHBseScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmNvbnRhY3RzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuY29udGFjdHMnXSxcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdGhhc1NlYXJjaGJhcjogZmFsc2UsXG5cdFx0Y29udGV4dE1lbnU6IHt9XG5cdH0sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5zZWFyY2hiYXJcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcInNlYXJjaGJhcnN1Ym1pdDogb25TZWFyY2hcXFwiIFxcblx0Ym4tc2hvdz1cXFwiaGFzU2VhcmNoYmFyXFxcIlxcblx0Ym4tZGF0YT1cXFwie3JlcXVpcmVkOiBmYWxzZX1cXFwiXFxuXHQ+PC9kaXY+XFxuPHAgYm4tc2hvdz1cXFwic2hvdzJcXFwiPllvdSBoYXZlIG5vIGNvbnRhY3RzPC9wPlxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlLnczLWJhcjogb25JdGVtQ29udGV4dE1lbnUsIGNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLmlucHV0OiBvbklucHV0Q2xpY2tcXFwiXFxuXHRcdGJuLWVhY2g9XFxcImdldENvbnRhY3RzXFxcIlxcblx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBjb250ZXh0TWVudX1cXFwiPlxcblxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiA+XFxuXHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIj48L3N0cm9uZz48YnI+XFxuXHRcdFx0XHQ8ZGl2IGJuLXRleHQ9XFxcImdldEFkZHJlc3NcXFwiPjwvZGl2Plxcblx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCIkc2NvcGUuJGkuZW1haWxcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZW52ZWxvcGUgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5lbWFpbFxcXCI+PC9zcGFuPlx0XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiJHNjb3BlLiRpLm1vYmlsZVBob25lXFxcIj5cXG5cdFx0XHRcdFx0PGEgYm4tYXR0cj1cXFwie2hyZWYgOiBnZXRDZWxsUGhvbmV9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbW9iaWxlLWFsdCB3My10ZXh0LWJsdWVcXFwiPjwvaT48L2E+XFxuXHRcdFx0XHRcdDxpbnB1dCBjbGFzcz1cXFwiaW5wdXRcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRwaG9uZVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkubW9iaWxlUGhvbmVcXFwiIHJlYWRvbmx5Plx0XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiJHNjb3BlLiRpLnBob25lXFxcIj5cXG5cdFx0XHRcdFx0PGEgYm4tYXR0cj1cXFwie2hyZWYgOiBnZXRIb21lUGhvbmV9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtaG9tZSB3My10ZXh0LWJsdWVcXFwiPjwvaT48L2E+XFxuXHRcdFx0XHRcdDxpbnB1dCBjbGFzcz1cXFwiaW5wdXRcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRwaG9uZVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkucGhvbmVcXFwiIHJlYWRvbmx5Plx0XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cXG5cdDwvdWw+XHRcdFxcblxcbjwvZGl2PlxcblwiLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Db250YWN0LkludGVyZmFjZX0gY29udGFjdHNTcnYgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBjb250YWN0c1Nydikge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Y29uc3QgeyBzaG93U2VsZWN0aW9uLCBjb250ZXh0TWVudSwgaGFzU2VhcmNoYmFyIH0gPSB0aGlzLnByb3BzXG5cdFx0Ly9jb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdFx0c2hvd1NlbGVjdGlvbixcblx0XHRcdFx0aGFzU2VhcmNoYmFyLFxuXHRcdFx0XHRmaWx0ZXI6ICcnLFxuXHRcdFx0XHRjb250ZXh0TWVudSxcblx0XHRcdFx0Z2V0Q29udGFjdHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0aGlzLmZpbHRlciAhPSAnJykge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnT0snLCB0aGlzLmZpbHRlcilcblx0XHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXFx3KiR7dGhpcy5maWx0ZXJ9XFx3KmAsICdpJylcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnRhY3RzLmZpbHRlcigoYykgPT4gcmVnZXgudGVzdChjLm5hbWUpKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhpcy5zaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5maWx0ZXIoKGMpID0+IGMuZW1haWwgJiYgYy5lbWFpbCAhPSAnJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHNcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0cy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29udGFjdHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0Q2VsbFBob25lOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAndGVsOicgKyBzY29wZS4kaS5tb2JpbGVQaG9uZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRIb21lUGhvbmU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuICd0ZWw6JyArIHNjb3BlLiRpLnBob25lXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEFkZHJlc3M6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3Qge2FkZHJlc3MsIGNpdHksIHBvc3RhbENvZGV9ID0gc2NvcGUuJGlcblx0XHRcdFx0XHRyZXR1cm4gYCR7YWRkcmVzcyB8fCAnJ30gJHtwb3N0YWxDb2RlIHx8ICcnfSAke2NpdHkgfHwgJyd9YFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VhcmNoOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VhcmNoJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2ZpbHRlcjogZGF0YS52YWx1ZX0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnB1dENsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbklucHV0Q2xpY2snKVxuXHRcdFx0XHRcdCQodGhpcykuY2xvc2VzdCgnZGl2JykuZmluZCgnYScpLmdldCgwKS5jbGljaygpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUNvbnRleHRNZW51OiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRDb250YWN0cygpW2lkeF1cblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1DbGljaycsIGluZm8pXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2NvbnRhY3Rjb250ZXh0bWVudScsIHsgY21kLCBpbmZvIH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChzaG93U2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHQvLyQodGhpcykuc2libGluZ3MoJy53My1ibHVlJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS50b2dnbGVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZCgpIHtcblx0XHRcdGNvbnN0IGNvbnRhY3RzID0gYXdhaXQgY29udGFjdHNTcnYuZ2V0Q29udGFjdHMoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnY29udGFjdHMnLCBjb250YWN0cylcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGNvbnRhY3RzIH0pXG5cdFx0fVxuXG5cblx0XHRsb2FkKClcblxuXHRcdHRoaXMudXBkYXRlID0gbG9hZFxuXG5cdFx0dGhpcy5yZW1vdmVDb250YWN0ID0gYXN5bmMgZnVuY3Rpb24oaWQpIHtcblx0XHRcdGF3YWl0IGNvbnRhY3RzU3J2LnJlbW92ZUNvbnRhY3QoaWQpXG5cdFx0XHRhd2FpdCBsb2FkKClcblx0XHR9XG5cblx0XHR0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnN0IHJldCA9IFtdXG5cdFx0XHRlbHQuZmluZCgnbGkudzMtYmx1ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0cmV0LnB1c2goY3RybC5tb2RlbC5nZXRDb250YWN0cygpW2lkeF0pXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3JldCcsIHJldClcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0fSxcblx0JGlmYWNlOiBgXG5cdFx0Z2V0U2VsZWN0aW9uKCk6IFtDb250YWN0SW5mb11cblx0XHRyZW1vdmVDb250YWN0KGlkKVxuXHRgLFxuXHQkZXZlbnRzOiAnY29udGFjdGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaHRtbGVkaXRvcicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWV2ZW50PVxcXCJjbGljay5jbWQ6IG9uQ29tbWFuZFxcXCIgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJjbWQgdzMtYnV0dG9uXFxcIiBkYXRhLWNtZD1cXFwiYm9sZFxcXCIgdGl0bGU9XFxcIkJvbGRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib2xkXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcImNtZCB3My1idXR0b25cXFwiIGRhdGEtY21kPVxcXCJpdGFsaWNcXFwiIHRpdGxlPVxcXCJJdGFsaWNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1pdGFsaWNcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwiY21kIHczLWJ1dHRvblxcXCIgZGF0YS1jbWQ9XFxcInVuZGVybGluZVxcXCIgdGl0bGU9XFxcIlVuZGVybGluZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXVuZGVybGluZVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uRm9udE5hbWVDaGFuZ2VcXFwiXFxuXHRcdFx0dGl0bGU9XFxcIkZvbnQgTmFtZVxcXCIgYm4taHRtbD1cXFwiZ2V0Rm9udE5hbWVcXFwiIGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczogZm9udE5hbWVJdGVtc1xcblx0XHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCI+PC9pPmBcXG5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkZvbnRTaXplQ2hhbmdlXFxcIlxcblx0XHRcdHRpdGxlPVxcXCJGb250IFNpemVcXFwiIGJuLWh0bWw9XFxcImdldEZvbnRTaXplXFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IGZvbnRTaXplSXRlbXNcXG5cdFx0XHR9XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5gXFxuXFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db21tYW5kXFxcIiB0aXRsZT1cXFwiVGl0bGVcXFwiXFxuXHRcdFx0ZGF0YS1jbWQ9XFxcImZvcm1hdEJsb2NrXFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IGhlYWRpbmdJdGVtc1xcblx0XHRcdH1cXFwiPlxcblx0XHRcdMKnJm5ic3A7XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJBbGlnbm1lbnRcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbW1hbmRcXFwiIGJuLWRhdGE9XFxcIntcXG5cdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRqdXN0aWZ5TGVmdDoge25hbWU6IFxcJ0xlZnRcXCcsIGljb246IFxcJ2ZhcyBmYS1hbGlnbi1sZWZ0XFwnfSxcXG5cdFx0XHRcdGp1c3RpZnlDZW50ZXI6IHtuYW1lOiBcXCdDZW50ZXJcXCcsIGljb246IFxcJ2ZhcyBmYS1hbGlnbi1jZW50ZXJcXCd9LFxcblx0XHRcdFx0anVzdGlmeVJpZ2h0OiB7bmFtZTogXFwnUmlnaHRcXCcsIGljb246IFxcJ2ZhcyBmYS1hbGlnbi1yaWdodFxcJ31cXG5cdFx0XHR9XFxuXHRcdH1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtYWxpZ24tbGVmdFxcXCI+PC9pPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtY2FyZXQtZG93blxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiVGV4dCBjb2xvclxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie1xcblx0XHRcdFx0aXRlbXM6IGNvbG9ySXRlbXMsXFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnXFxuXHRcdFx0fVxcXCIgYm4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbG9yTWVudUNoYW5nZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1wYWludC1icnVzaFxcXCIgYm4tc3R5bGU9XFxcIntjb2xvcn1cXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJzZXBhcmF0b3JcXFwiPjwvc3Bhbj5cXG5cdDwvZGl2Plxcblxcblx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJJbmRlbnRcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbkNvbW1hbmRcXFwiIGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRpbmRlbnQ6IHtuYW1lOiBcXCdJbmRlbnRcXCcsIGljb246IFxcJ2ZhcyBmYS1pbmRlbnRcXCd9LFxcblx0XHRcdFx0XHRvdXRkZW50OiB7bmFtZTogXFwnT3V0ZGVudFxcJywgaWNvbjogXFwnZmFzIGZhLW91dGRlbnRcXCd9XFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1pbmRlbnRcXFwiPjwvaT5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXFxuXHRcdDxidXR0b24gdGl0bGU9XFxcIkxpc3RcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25Db21tYW5kXFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRpbnNlcnRVbm9yZGVyZWRMaXN0OiB7bmFtZTogXFwnVW5vcmRlcmVkXFwnLCBpY29uOiBcXCdmYXMgZmEtbGlzdC11bFxcJ30sXFxuXHRcdFx0XHRcdGluc2VydE9yZGVyZWRMaXN0OiB7bmFtZTogXFwnT3JkZXJlZFxcJywgaWNvbjogXFwnZmFzIGZhLWxpc3Qtb2xcXCd9XFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1saXN0LW9sXFxcIj48L2k+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhcyBmYS1jYXJldC1kb3duXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIGNtZFxcXCIgdGl0bGU9XFxcIkhvcml6b250YWwgUnVsZVxcXCIgZGF0YS1jbWQ9XFxcImluc2VydEhvcml6b250YWxSdWxlXFxcIj48aVxcblx0XHRcdFx0Y2xhc3M9XFxcImZhcyBmYS1taW51c1xcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJJbnNlcnQgTGlua1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNyZWF0ZUxpbmtcXFwiPjxpXFxuXHRcdFx0XHRjbGFzcz1cXFwiZmFzIGZhLWxpbmtcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiB0aXRsZT1cXFwiSW5zZXJ0IGltYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW5zZXJ0SW1hZ2VcXFwiIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1pbWFnZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0PC9kaXY+XFxuXFxuXFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiYm90dG9tXFxcIj5cXG5cdDxpbWcgYm4tYXR0cj1cXFwie3NyYzogZ2V0TWljVXJsfVxcXCIgY2xhc3M9XFxcIm1pY3JvXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTWljcm9cXFwiIGJuLXNob3c9XFxcInNwZWVjaFJlY29BdmFpbGFibGVcXFwiIHRpdGxlPVxcXCJTcGVlY2ggUmVjb2duaXRpb25cXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TY3JvbGxDbGlja1xcXCI+XFxuXHRcdDxkaXYgY29udGVudGVkaXRhYmxlPVxcXCJ0cnVlXFxcIiBibi1iaW5kPVxcXCJlZGl0b3JcXFwiIGNsYXNzPVxcXCJlZGl0b3JcXFwiIGJuLWh0bWw9XFxcImh0bWxcXFwiPjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0dXNlRGF0YVVybEZvckltZzogZmFsc2Vcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7Kn0gZWx0IFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlcyBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBmaWxlcykge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Y29uc3QgeyB1c2VEYXRhVXJsRm9ySW1nIH0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc29sZS5sb2coJ3VzZURhdGFVcmxGb3JJbWcnLCB1c2VEYXRhVXJsRm9ySW1nKVxuXG5cdFx0Y29uc3QgY29sb3JNYXAgPSB7XG5cdFx0XHRibGFjazogJyMwMDAwMDAnLFxuXHRcdFx0cmVkOiAnI2Y0NDMzNicsXG5cdFx0XHRncmVlbjogJyM0Q0FGNTAnLFxuXHRcdFx0Ymx1ZTogJyMyMTk2RjMnLFxuXHRcdFx0eWVsbG93OiAnI2ZmZWIzYicsXG5cdFx0XHRjeWFuOiAnIzAwYmNkNCcsXG5cdFx0XHRwaW5rOiAnI2U5MWU2MydcblxuXHRcdH1cblxuXHRcdGNvbnN0IGZvbnRTaXplcyA9ICc4LDEwLDEyLDE0LDE4LDI0LDM2Jy5zcGxpdCgnLCcpXG5cdFx0Y29uc3QgZm9udE5hbWVzID0gW1wiQXJpYWxcIiwgXCJDb3VyaWVyIE5ld1wiLCBcIlRpbWVzIE5ldyBSb21hblwiXVxuXG5cdFx0ZnVuY3Rpb24gZ2V0SGVhZGluZ0l0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge1xuXHRcdFx0XHRwOiB7IG5hbWU6ICdOb3JtYWwnIH1cblx0XHRcdH1cblx0XHRcdGZvciAobGV0IGkgPSAxOyBpIDw9IDY7IGkrKykge1xuXHRcdFx0XHRyZXRbJ2gnICsgaV0gPSB7IG5hbWU6IGA8aCR7aX0+SGVhZGluZyAke2l9PC9oJHtpfT5gLCBpc0h0bWxOYW1lOiB0cnVlIH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRGb250U2l6ZUl0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge31cblx0XHRcdGZvbnRTaXplcy5mb3JFYWNoKChpLCBpZHgpID0+IHtcblx0XHRcdFx0cmV0W2lkeCArIDFdID0geyBuYW1lOiBgPGZvbnQgc2l6ZT1cIiR7aWR4ICsgMX1cIj4ke2l9IHB0PC9mb250PmAsIGlzSHRtbE5hbWU6IHRydWUgfVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRGb250TmFtZUl0ZW1zKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge31cblx0XHRcdGZvbnROYW1lcy5mb3JFYWNoKChpKSA9PiB7XG5cdFx0XHRcdHJldFtpXSA9IHsgbmFtZTogYDxmb250IGZhY2U9XCIke2l9XCI+JHtpfTwvZm9udD5gLCBpc0h0bWxOYW1lOiB0cnVlIH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Q29sb3JJdGVtcygpIHtcblx0XHRcdGNvbnN0IHJldCA9IHt9XG5cdFx0XHRPYmplY3Qua2V5cyhjb2xvck1hcCkuZm9yRWFjaCgoaSkgPT4ge1xuXHRcdFx0XHRyZXRbaV0gPSB7XG5cdFx0XHRcdFx0bmFtZTogaS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGkuc2xpY2UoMSksXG5cdFx0XHRcdFx0aWNvbjogYGZhcyBmYS1zcXVhcmUtZnVsbCB3My10ZXh0LSR7aX1gXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cblx0XHR9XG5cblx0XHRjb25zdCBmb250U2l6ZUl0ZW1zID0gZ2V0Rm9udFNpemVJdGVtcygpXG5cdFx0Y29uc3QgZGVmYXVsdEZvbnRTaXplID0gJzMnXG5cdFx0Y29uc3QgZm9udE5hbWVJdGVtcyA9IGdldEZvbnROYW1lSXRlbXMoKVxuXHRcdGNvbnN0IGRlZmF1bHRGb250TmFtZSA9ICdBcmlhbCdcblx0XHRjb25zdCBjb2xvckl0ZW1zID0gZ2V0Q29sb3JJdGVtcygpXG5cdFx0Y29uc3QgZGVmYXVsdENvbG9yID0gY29sb3JNYXBbJ2JsYWNrJ11cblxuXHRcdGNvbnN0IHNwZWVjaFJlY29BdmFpbGFibGUgPSAoJ3dlYmtpdFNwZWVjaFJlY29nbml0aW9uJyBpbiB3aW5kb3cpXG5cdFx0Y29uc3QgaXNNb2JpbERldmljZSA9IC9BbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXHRcdGNvbnNvbGUubG9nKCdpc01vYmlsRGV2aWNlJywgaXNNb2JpbERldmljZSlcblx0XHRsZXQgaWdub3JlT25FbmQgPSBmYWxzZVxuXHRcdGxldCByZWNvZ25pdGlvbiA9IG51bGxcblx0XHRsZXQgZmluYWxTcGFuID0gbnVsbFxuXHRcdGxldCBpbnRlcmltU3BhbiA9IG51bGxcblx0XHRsZXQgZmluYWxUcmFuc2NyaXB0ID0gJydcblx0XHQvKipAdHlwZSB7UmFuZ2V9ICovXG5cdFx0bGV0IHJhbmdlID0gbnVsbFxuXG5cdFx0Y29uc3QgdHdvX2xpbmUgPSAvXFxuXFxuL2dcblx0XHRjb25zdCBvbmVfbGluZSA9IC9cXG4vZ1xuXHRcdGZ1bmN0aW9uIGxpbmVicmVhayhzKSAge1xuXHRcdFx0cmV0dXJuIHMucmVwbGFjZSh0d29fbGluZSwgJzxwPjwvcD4nKS5yZXBsYWNlKG9uZV9saW5lLCAnPGJyPicpXG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlyc3RfY2hhciA9IC9cXFMvXG5cdFx0ZnVuY3Rpb24gY2FwaXRhbGl6ZShzKSB7XG5cdFx0XHRyZXR1cm4gcy5yZXBsYWNlKGZpcnN0X2NoYXIsIG0gPT4gbS50b1VwcGVyQ2FzZSgpKVxuXHRcdH1cblxuXHRcdGlmIChzcGVlY2hSZWNvQXZhaWxhYmxlKSB7XG5cdFx0XHRyZWNvZ25pdGlvbiA9IG5ldyB3ZWJraXRTcGVlY2hSZWNvZ25pdGlvbigpO1xuXHRcdFx0cmVjb2duaXRpb24uY29udGludW91cyA9IHRydWVcblx0XHRcdHJlY29nbml0aW9uLmludGVyaW1SZXN1bHRzID0gdHJ1ZVxuXHRcdFx0cmVjb2duaXRpb24ubGFuZyA9ICdmci1GUidcblxuXHRcdFx0cmVjb2duaXRpb24ub25zdGFydCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uU3RhcnQnKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyByZWNvZ25pemluZzogdHJ1ZSB9KVxuXG5cdFx0XHR9XG5cblx0XHRcdHJlY29nbml0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uRXJyb3InLCBldmVudC5lcnJvcilcblx0XHRcdH1cblxuXHRcdFx0cmVjb2duaXRpb24ub25lbmQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdvbkVuZCcpXG5cdFx0XHRcdGlmIChpc01vYmlsRGV2aWNlICYmIGN0cmwubW9kZWwucmVjb2duaXppbmcpIHtcblx0XHRcdFx0XHRyYW5nZS5jb2xsYXBzZSgpXG5cdFx0XHRcdFx0c3RhcnRSZWNvZ25pdGlvbigpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcmVjb2duaXppbmc6IGZhbHNlIH0pXG5cdFx0XHRcdFx0cmFuZ2UuY29sbGFwc2UoKVx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmVjb2duaXRpb24ub25yZXN1bHQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXN1bHQnLCBldmVudC5yZXN1bHRzLmxlbmd0aClcblx0XHRcdFx0bGV0IGludGVyaW1UcmFuc2NyaXB0ID0gJydcblx0XHRcdFx0Zm9yIChsZXQgaSA9IGV2ZW50LnJlc3VsdEluZGV4OyBpIDwgZXZlbnQucmVzdWx0cy5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3VsdHMnLCBldmVudC5yZXN1bHRzW2ldKVxuXHRcdFx0XHRcdGlmIChldmVudC5yZXN1bHRzW2ldLmlzRmluYWwgJiYgZXZlbnQucmVzdWx0c1tpXVswXS5jb25maWRlbmNlICE9IDApIHtcblx0XHRcdFx0XHRcdGZpbmFsVHJhbnNjcmlwdCArPSBldmVudC5yZXN1bHRzW2ldWzBdLnRyYW5zY3JpcHRcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aW50ZXJpbVRyYW5zY3JpcHQgKz0gZXZlbnQucmVzdWx0c1tpXVswXS50cmFuc2NyaXB0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ludGVyaW1UcmFuc2NyaXB0JywgaW50ZXJpbVRyYW5zY3JpcHQpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbmFsVHJhbnNjcmlwdCcsIGZpbmFsVHJhbnNjcmlwdClcblx0XHRcdFx0ZmluYWxUcmFuc2NyaXB0ID0gY2FwaXRhbGl6ZShmaW5hbFRyYW5zY3JpcHQpXG5cdFx0XHRcdGZpbmFsU3Bhbi5pbm5lckhUTUwgPSBsaW5lYnJlYWsoZmluYWxUcmFuc2NyaXB0KVxuXHRcdFx0XHRpbnRlcmltU3Bhbi5pbm5lckhUTUwgPSBsaW5lYnJlYWsoaW50ZXJpbVRyYW5zY3JpcHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RhcnRSZWNvZ25pdGlvbigpIHtcblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsT2JqJywgc2VsT2JqKVxuXG5cdFx0XHRpZiAoIWlzRWRpdGFibGUoc2VsT2JqLmFuY2hvck5vZGUpKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRleHQgYmVmb3JlJyB9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0cmFuZ2UgPSBzZWxPYmouZ2V0UmFuZ2VBdCgwKVxuXHRcdFx0ZmluYWxTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG5cdFx0XHRpbnRlcmltU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuXHRcdFx0aW50ZXJpbVNwYW4uY2xhc3NOYW1lID0gJ2ludGVyaW0nXG5cdFx0XHRyYW5nZS5pbnNlcnROb2RlKGludGVyaW1TcGFuKVxuXHRcdFx0cmFuZ2UuaW5zZXJ0Tm9kZShmaW5hbFNwYW4pXG5cdFx0XHRmaW5hbFRyYW5zY3JpcHQgPSAnJ1xuXHRcdFx0cmVjb2duaXRpb24uc3RhcnQoKVxuXHRcdFx0aWdub3JlT25FbmQgPSBmYWxzZVx0XHRcdFxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aHRtbDogZWx0LnZhbCgpLFxuXHRcdFx0XHRmb250U2l6ZTogZGVmYXVsdEZvbnRTaXplLFxuXHRcdFx0XHRmb250TmFtZTogZGVmYXVsdEZvbnROYW1lLFxuXHRcdFx0XHRnZXRGb250U2l6ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBgJHtmb250U2l6ZXNbdGhpcy5mb250U2l6ZSAtIDFdfSBwdCZuYnNwOzxpIGNsYXNzPVwiZmFzIGZhLWNhcmV0LWRvd25cIj48L2k+YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRGb250TmFtZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiBgJHt0aGlzLmZvbnROYW1lfSZuYnNwOzxpIGNsYXNzPVwiZmFzIGZhLWNhcmV0LWRvd25cIj48L2k+YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRmb250U2l6ZUl0ZW1zLFxuXHRcdFx0XHRmb250TmFtZUl0ZW1zLFxuXHRcdFx0XHRjb2xvckl0ZW1zLFxuXHRcdFx0XHRjb2xvcjogZGVmYXVsdENvbG9yLFxuXHRcdFx0XHRoZWFkaW5nSXRlbXM6IGdldEhlYWRpbmdJdGVtcygpLFxuXHRcdFx0XHRzcGVlY2hSZWNvQXZhaWxhYmxlLFxuXHRcdFx0XHRyZWNvZ25pemluZzogZmFsc2UsXG5cdFx0XHRcdGdldE1pY1VybDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnJlY29nbml6aW5nID8gJy9hc3NldHMvbWljLWFuaW1hdGUuZ2lmJyA6ICcvYXNzZXRzL21pYy5naWYnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25NaWNybzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwucmVjb2duaXppbmcpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7cmVjb2duaXppbmc6IGZhbHNlfSlcblx0XHRcdFx0XHRcdHJlY29nbml0aW9uLnN0b3AoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHN0YXJ0UmVjb2duaXRpb24oKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnNlcnRJbWFnZTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0aW5zZXJ0SW1hZ2UoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZvbnROYW1lQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZvbnROYW1lQ2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBmb250TmFtZTogZGF0YS5jbWQgfSlcblx0XHRcdFx0XHRkb2N1bWVudC5leGVjQ29tbWFuZCgnZm9udE5hbWUnLCBmYWxzZSwgZGF0YS5jbWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRm9udFNpemVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRm9udFNpemVDaGFuZ2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGZvbnRTaXplOiBkYXRhLmNtZCB9KVxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKCdmb250U2l6ZScsIGZhbHNlLCBkYXRhLmNtZClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DcmVhdGVMaW5rOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3Qgc2VsT2JqID0gd2luZG93LmdldFNlbGVjdGlvbigpXG5cblx0XHRcdFx0XHRpZiAoIWlzRWRpdGFibGUoc2VsT2JqLmFuY2hvck5vZGUpKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25zdCByYW5nZSA9IHNlbE9iai5nZXRSYW5nZUF0KDApXG5cblx0XHRcdFx0XHRjb25zdCBocmVmID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0luc2VydCBMaW5rJyxcblx0XHRcdFx0XHRcdGxhYmVsOiAnTGluayBUYXJnZXQnLFxuXHRcdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ3VybCcgfVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaHJlZicsIGhyZWYpXG5cdFx0XHRcdFx0aWYgKGhyZWYgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0c2VsT2JqLnJlbW92ZUFsbFJhbmdlcygpXG5cdFx0XHRcdFx0XHRzZWxPYmouYWRkUmFuZ2UocmFuZ2UpXG5cblx0XHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjcmVhdGVMaW5rJywgZmFsc2UsIGhyZWYpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2Nyb2xsQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmVkaXRvci5mb2N1cygpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29tbWFuZDogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db21tYW5kJywgZGF0YSlcblxuXHRcdFx0XHRcdGxldCBjbWRcblx0XHRcdFx0XHRsZXQgY21kQXJnXG5cblx0XHRcdFx0XHRpZiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0Y21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdFx0aWYgKGNtZCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0Y21kQXJnID0gZGF0YS5jbWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjbWQgPSBkYXRhLmNtZFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRcdGNtZEFyZyA9ICQodGhpcykuZGF0YSgnY21kQXJnJylcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvbW1hbmQnLCBjbWQsIGNtZEFyZylcblxuXHRcdFx0XHRcdGRvY3VtZW50LmV4ZWNDb21tYW5kKGNtZCwgZmFsc2UsIGNtZEFyZylcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbG9yTWVudUNoYW5nZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29sb3JNZW51Q2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCBjb2xvciA9IGNvbG9yTWFwW2RhdGEuY21kXVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGNvbG9yIH0pXG5cdFx0XHRcdFx0ZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2ZvcmVDb2xvcicsIGZhbHNlLCBjb2xvcilcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbi53My1idXR0b24nKS5hdHRyKCd0eXBlJywgJ2J1dHRvbicpXG5cblx0XHQkKGRvY3VtZW50KS5vbignc2VsZWN0aW9uY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsZWN0aW9uY2hhbmdlJylcblx0XHRcdGNvbnN0IHNlbE9iaiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2VsT2JqJywgc2VsT2JqKVxuXG5cdFx0XHRpZiAoIWlzRWRpdGFibGUoc2VsT2JqLmFuY2hvck5vZGUpKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmb250U2l6ZU5vZGUgPSAkKHNlbE9iai5hbmNob3JOb2RlKS5jbG9zZXN0KCdmb250W3NpemVdJylcblx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbnROb2RlJywgZm9udE5vZGUpXG5cdFx0XHRpZiAoZm9udFNpemVOb2RlLmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdGNvbnN0IGZvbnRTaXplID0gZm9udFNpemVOb2RlLmF0dHIoJ3NpemUnKSB8fCBkZWZhdWx0Rm9udFNpemVcblx0XHRcdFx0Y29uc3QgZm9udE5hbWUgPSBmb250U2l6ZU5vZGUuYXR0cignZmFjZScpIHx8IGRlZmF1bHRGb250TmFtZVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmb250U2l6ZScsIGZvbnRTaXplLCAnZm9udE5hbWUnLCBmb250TmFtZSwgJ2NvbG9yJywgY29sb3IpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGZvbnRTaXplLCBmb250TmFtZSB9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0Zm9udFNpemU6IGRlZmF1bHRGb250U2l6ZSxcblx0XHRcdFx0XHRmb250TmFtZTogZGVmYXVsdEZvbnROYW1lLFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm9udENvbG9yTm9kZSA9ICQoc2VsT2JqLmFuY2hvck5vZGUpLmNsb3Nlc3QoJ2ZvbnRbY29sb3JdJylcblx0XHRcdC8vY29uc29sZS5sb2coJ2ZvbnROb2RlJywgZm9udE5vZGUpXG5cdFx0XHRpZiAoZm9udENvbG9yTm9kZS5sZW5ndGggPT0gMSkge1xuXHRcdFx0XHRjb25zdCBjb2xvciA9IGZvbnRDb2xvck5vZGUuYXR0cignY29sb3InKSB8fCBkZWZhdWx0Q29sb3Jcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZm9udFNpemUnLCBmb250U2l6ZSwgJ2ZvbnROYW1lJywgZm9udE5hbWUsICdjb2xvcicsIGNvbG9yKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBjb2xvciB9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0Y29sb3I6IGRlZmF1bHRDb2xvclxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGlzRWRpdGFibGUobm9kZSkge1xuXG5cdFx0XHRjb25zdCBlZGl0YWJsZSA9IGN0cmwuc2NvcGUuZWRpdG9yLmdldCgwKVxuXG5cdFx0XHR3aGlsZSAobm9kZSAmJiBub2RlICE9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuXHRcdFx0XHRpZiAobm9kZSA9PSBlZGl0YWJsZSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdFx0bm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdH1cblxuXHRcdHRoaXMuaHRtbCA9IGZ1bmN0aW9uIChodG1sU3RyaW5nKSB7XG5cdFx0XHRpZiAoaHRtbFN0cmluZyA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y3RybC5zY29wZS5lZGl0b3IuZmluZCgnc3BhbicpLnJlbW92ZSgnLmludGVyaW0nKVxuXHRcdFx0XHRyZXR1cm4gY3RybC5zY29wZS5lZGl0b3IuaHRtbCgpXG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmh0bWwoaHRtbFN0cmluZylcblx0XHR9XG5cblx0XHR0aGlzLmxvYWQgPSBmdW5jdGlvbiAodXJsKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5zY29wZS5lZGl0b3IubG9hZCh1cmwpXG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBjdHJsLnNjb3BlLmVkaXRvci5odG1sKClcblx0XHR9XG5cblx0XHR0aGlzLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdicmFpbmpzLmh0bWxlZGl0b3I6c2V0VmFsdWUnLCB2YWx1ZSlcblx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmh0bWwodmFsdWUpXG5cdFx0fVxuXG5cdFx0dGhpcy5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGN0cmwuc2NvcGUuZWRpdG9yLmdldCgwKS5mb2N1cygpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaW5zZXJ0SW1hZ2UoKSB7XG5cdFx0XHRjb25zdCBzZWxPYmogPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbE9iaicsIHNlbE9iailcblxuXHRcdFx0aWYgKCFpc0VkaXRhYmxlKHNlbE9iai5hbmNob3JOb2RlKSkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0ZXh0IGJlZm9yZScgfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHJhbmdlID0gc2VsT2JqLmdldFJhbmdlQXQoMClcblxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHR0aXRsZTogJ0luc2VydCBJbWFnZScsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0ZmlsdGVyRXh0ZW5zaW9uOiAnanBnLGpwZWcscG5nLGdpZidcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0ZmlsZWNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZGF0YSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBmaWxlTmFtZSwgcm9vdERpciB9ID0gZGF0YVxuXHRcdFx0XHRcdGxldCB1cmwgPSBmaWxlcy5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd1cmwnLCB1cmwpXG5cdFx0XHRcdFx0aWYgKHVzZURhdGFVcmxGb3JJbWcpIHtcblx0XHRcdFx0XHRcdHVybCA9IGF3YWl0ICQkLnVybC5pbWFnZVVybFRvRGF0YVVybCh1cmwpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN0IGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpXG5cdFx0XHRcdFx0aW1nLnNyYyA9IHVybFxuXHRcdFx0XHRcdHJhbmdlLmluc2VydE5vZGUoaW1nKVxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblxuXHRcdH1cblxuXHR9XG5cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWx0ZXJEbGcnLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXFxuICAgIDxsYWJlbD5HZW5yZTwvbGFiZWw+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZW5yZXN9XFxcIiBibi12YWw9XFxcInNlbGVjdGVkR2VucmVcXFwiIGJuLWV2ZW50PVxcXCJjb21ib2JveGNoYW5nZTogb25HZW5yZUNoYW5nZVxcXCIgbmFtZT1cXFwiZ2VucmVcXFwiPjwvZGl2PiAgICBcXG5cXG4gICAgPGxhYmVsPkFydGlzdDwvbGFiZWw+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBhcnRpc3RzfVxcXCIgYm4tdmFsPVxcXCJzZWxlY3RlZEFydGlzdFxcXCIgYm4tdXBkYXRlPVxcXCJjb21ib2JveGNoYW5nZVxcXCIgbmFtZT1cXFwiYXJ0aXN0XFxcIj48L2Rpdj4gICAgXFxuXFxuXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuICAgIGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuICAgIHByb3BzOiB7XG4gICAgICAgIGZpbGVzOiBbXSxcbiAgICAgICAgbXAzRmlsdGVyczogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuICAgICAgICAvKipAdHlwZSB7e1xuICAgICAgICAgKiBmaWxlczogQnJlaXpib3QuU2VydmljZXMuRmlsZXMuRmlsZUluZm9bXSwgXG4gICAgICAgICAqIG1wM0ZpbHRlcnM6IEJyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLk1wM0ZpbHRlcn19ICAqL1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGxldCB7IGZpbGVzLCBtcDNGaWx0ZXJzIH0gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgbXAzRmlsdGVycyA9IG1wM0ZpbHRlcnMgfHwge31cblxuXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkR2VucmUgPSBtcDNGaWx0ZXJzLmdlbnJlIHx8ICdBbGwnXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkQXJ0aXN0ID0gbXAzRmlsdGVycy5hcnRpc3QgfHwgJ0FsbCdcblxuICAgICAgICBjb25zb2xlLmxvZygnc2VsZWN0ZWRBcnRpc3QnLCBzZWxlY3RlZEFydGlzdClcbiAgICAgICAgY29uc29sZS5sb2coJ3NlbGVjdGVkR2VucmUnLCBzZWxlY3RlZEdlbnJlKVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEdlbnJlcygpIHtcbiAgICAgICAgICAgIGxldCBnZW5yZXMgPSB7fVxuXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGYubXAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZ2VucmUgfSA9IGYubXAzXG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW5yZSAmJiAhZ2VucmUuc3RhcnRzV2l0aCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2VucmVzW2dlbnJlXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbnJlc1tnZW5yZV0rK1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VucmVzW2dlbnJlXSA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGdlbnJlcyA9IE9iamVjdC5rZXlzKGdlbnJlcykuc29ydCgpLm1hcCgoZ2VucmUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYlRpdGxlID0gZ2VucmVzW2dlbnJlXVxuICAgICAgICAgICAgICAgIHJldHVybiAobmJUaXRsZSA9PSAxKSA/XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGdlbnJlLCBsYWJlbDogZ2VucmUgfSA6XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGdlbnJlLCBsYWJlbDogYCR7Z2VucmV9ICgke25iVGl0bGV9KWAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGdlbnJlcy51bnNoaWZ0KHsgdmFsdWU6ICdBbGwnLCBsYWJlbDogJ0FsbCcsIHN0eWxlOiAnZm9udC13ZWlnaHQ6IGJvbGQ7JyB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZ2VucmVzXG4gICAgICAgIH1cblxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEFydGlzdHMoZ2VucmUpIHtcbiAgICAgICAgICAgIGxldCBhcnRpc3RzID0ge31cblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmLm1wMyAmJiAoZ2VucmUgPT0gJ0FsbCcgfHwgZi5tcDMuZ2VucmUgPT0gZ2VucmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYXJ0aXN0IH0gPSBmLm1wM1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJ0aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJ0aXN0c1thcnRpc3RdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJ0aXN0c1thcnRpc3RdKytcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFydGlzdHNbYXJ0aXN0XSA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcnRpc3RzID0gT2JqZWN0LmtleXMoYXJ0aXN0cykuc29ydCgpLm1hcCgoYXJ0aXN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmJUaXRsZSA9IGFydGlzdHNbYXJ0aXN0XVxuICAgICAgICAgICAgICAgIHJldHVybiAobmJUaXRsZSA9PSAxKSA/XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGFydGlzdCwgbGFiZWw6IGFydGlzdCB9IDpcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogYXJ0aXN0LCBsYWJlbDogYCR7YXJ0aXN0fSAoJHtuYlRpdGxlfSlgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcnRpc3RzLnVuc2hpZnQoeyB2YWx1ZTogJ0FsbCcsIGxhYmVsOiAnQWxsJywgc3R5bGU6ICdmb250LXdlaWdodDogYm9sZDsnIH0pXG4gICAgICAgICAgICByZXR1cm4gYXJ0aXN0c1xuICAgICAgICB9XG5cblxuXG5cblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgYXJ0aXN0czogZ2V0QXJ0aXN0cyhzZWxlY3RlZEdlbnJlKSxcbiAgICAgICAgICAgICAgICBnZW5yZXM6IGdldEdlbnJlcygpLFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkQXJ0aXN0LFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkR2VucmVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvbkdlbnJlQ2hhbmdlOiBmdW5jdGlvbihldikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBnZW5yZSA9ICQodGhpcykuZ2V0VmFsdWUoKVxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdvbkdlbnJlQ2hhbmdlJywgZ2VucmUpXG4gICAgICAgICAgICAgICAgICAgIGN0cmwuc2V0RGF0YSh7YXJ0aXN0czogZ2V0QXJ0aXN0cyhnZW5yZSl9KVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYXBwbHk6IHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBcHBseScsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS1jaGVjaycsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxufSkiLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LmZpbGVjaG9vc2VyJywge1xuXG5cblx0dGVtcGxhdGU6IFwiPHA+U2VsZWN0IGEgZmlsZSBzeXN0ZW08L3A+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ib21lXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPllvdXIgaG9tZSBmaWxlczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0IGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPkZpbGVzIHNoYXJlZCBieSB5b3VyIGZyaWVuZHM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZmlsdGVyRXh0ZW5zaW9uOiAnJyxcblx0XHRnZXRNUDNJbmZvOiBmYWxzZSxcblx0XHRzaG93TXAzRmlsdGVyOiBmYWxzZVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gZmlsZXNTcnZcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBmaWxlc1Nydikge1xuXG5cdFx0Y29uc3QgeyBmaWx0ZXJFeHRlbnNpb24sIGdldE1QM0luZm8sIHNob3dNcDNGaWx0ZXIgfSA9IHRoaXMucHJvcHNcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuSW50ZXJmYWNlfSBpZmFjZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBvcGVuRmlsdGVyUGFnZShpZmFjZSkge1xuXHRcdFx0Y29uc3QgbXAzRmlsdGVycyA9IGlmYWNlLmdldE1QM0ZpbHRlcnMoKVxuXHRcdFx0Y29uc3QgZmlsZXMgPSBpZmFjZS5nZXRGaWxlcygpXG5cblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWx0ZXJEbGcnLCB7XG5cdFx0XHRcdHRpdGxlOiAnRmlsdGVyJyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRtcDNGaWx0ZXJzXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAoZmlsdGVycykge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlcnMnLCBmaWx0ZXJzKVxuXHRcdFx0XHRcdGlmYWNlLnNldE1QM0ZpbHRlcnMoZmlsdGVycylcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGZyaWVuZFVzZXIgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbGVQYWdlKHRpdGxlLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLlByb3BzfSAqL1xuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0XHRmcmllbmRVc2VyLFxuXHRcdFx0XHRcdGdldE1QM0luZm9cblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogXG5cdFx0XHRcdFx0ICogQHBhcmFtIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5FdmVudERhdGEuRmlsZUNsaWNrfSBpbmZvIFxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24gKGV2LCBpbmZvKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlY2xpY2snLCBpbmZvKVxuXHRcdFx0XHRcdFx0Y29uc3QgeyByb290RGlyLCBmaWxlTmFtZSwgbXAzIH0gPSBpbmZvXG5cdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBmaWxlc1Nydi5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2Uoe3VybCwgbXAzLCBmaWxlTmFtZX0pXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAodXJsKSB7XG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZSh1cmwpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChzaG93TXAzRmlsdGVyKSB7XG5cdFx0XHRcdG9wdGlvbnMuYnV0dG9ucyA9IHtcblx0XHRcdFx0XHRzZWFyY2g6IHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnRmlsdGVyJyxcblx0XHRcdFx0XHRcdGljb246ICdmYXMgZmEtZmlsdGVyJyxcblx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0b3BlbkZpbHRlclBhZ2UoZmlsZUN0cmwpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGNvbnN0IGZpbGVDdHJsID0gcGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywgb3B0aW9ucylcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0b3BlbkZpbGVQYWdlKCdIb21lIGZpbGVzJywgJycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2hhcmU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2hhcmVkIGZpbGVzJyxcblx0XHRcdFx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GcmllbmRzLlByb3BzfSAqL1xuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogZmFsc2Vcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0XHRcdCAqIFxuXHRcdFx0XHRcdFx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LkNvbnRyb2xzLkZyaWVuZHMuRXZlbnREYXRhLkZyaWVuZENsaWNrfSBkYXRhIFxuXHRcdFx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHRcdFx0ZnJpZW5kY2xpY2s6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VsZWN0RnJpZW5kJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB7IHVzZXJOYW1lIH0gPSBkYXRhXG5cdFx0XHRcdFx0XHRcdFx0b3BlbkZpbGVQYWdlKHVzZXJOYW1lLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGRhdGEpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4oZnVuY3Rpb24gKCkge1xuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG5cdCAqIEByZXR1cm5zIFxuXHQgKi9cblx0ZnVuY3Rpb24gZ2V0SWNvbkNsYXNzKG5hbWUpIHtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5wZGYnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLXBkZidcblx0XHR9XG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgoJy5oZG9jJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS13b3JkJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLm9nZycpIHx8IG5hbWUuZW5kc1dpdGgoJy5tcDMnKSkge1xuXHRcdFx0cmV0dXJuICdmYS1maWxlLWF1ZGlvJ1xuXHRcdH1cblx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLm1wNCcpIHx8IG5hbWUuZW5kc1dpdGgoJy53ZWJtJykgfHwgbmFtZS5lbmRzV2l0aCgnLjNncCcpKSB7XG5cdFx0XHRyZXR1cm4gJ2ZhLWZpbGUtdmlkZW8nXG5cdFx0fVxuXHRcdGlmIChuYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcblx0XHRcdHJldHVybiAnZmEtZmlsZS1hcmNoaXZlJ1xuXHRcdH1cblxuXHRcdHJldHVybiAnZmEtZmlsZSdcblx0fVxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5GaWxlSW5mb1tdfSBmaWxlcyBcblx0ICovXG5cdGZ1bmN0aW9uIHNvcnRGaWxlcyhmaWxlcykge1xuXHRcdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0XHRcdGlmIChhLmZvbGRlciAmJiAhYi5mb2xkZXIpIHtcblx0XHRcdFx0cmV0dXJuIC0xXG5cdFx0XHR9XG5cdFx0XHRpZiAoIWEuZm9sZGVyICYmIGIuZm9sZGVyKSB7XG5cdFx0XHRcdHJldHVybiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKVxuXHRcdH0pXG5cdH1cblxuXHQkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXHRcdHByb3BzOiB7XG5cdFx0XHRzZWxlY3Rpb25FbmFibGVkOiBmYWxzZSxcblx0XHRcdGltYWdlT25seTogZmFsc2UsXG5cdFx0XHRmaWx0ZXJFeHRlbnNpb246IHVuZGVmaW5lZCxcblx0XHRcdGdldE1QM0luZm86IGZhbHNlLFxuXHRcdFx0ZnJpZW5kVXNlcjogJycsXG5cdFx0XHRtcDNGaWx0ZXJzOiBudWxsLFxuXHRcdFx0bWVudUl0ZW1zOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4ge31cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0dGVtcGxhdGU6IFwiXFxuPGRpdiBibi10ZXh0PVxcXCJpbmZvXFxcIiBibi1iaW5kPVxcXCJpbmZvXFxcIiBjbGFzcz1cXFwiaW5mb1xcXCI+PC9kaXY+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJsb2FkaW5nXFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0bG9hZGluZyAuLi5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJwYXRoUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5wYXRoSXRlbTogb25QYXRoSXRlbVxcXCIgYm4tc2hvdz1cXFwiIWxvYWRpbmdcXFwiPlxcblx0PGRpdiBibi1lYWNoPVxcXCJnZXRQYXRoXFxcIiBibi1pbmRleD1cXFwiaWR4XFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLWNoZXZyb24tcmlnaHRcXFwiIGJuLXNob3c9XFxcIiFpc0ZpcnN0XFxcIj48L2k+XFxuXHRcdDxzcGFuPlxcblx0XHRcdDxhIGNsYXNzPVxcXCJwYXRoSXRlbVxcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBocmVmPVxcXCIjXFxcIiBibi1zaG93PVxcXCIhaXNMYXN0XFxcIiBibi1kYXRhPVxcXCJ7aW5mbzogZ2V0UGF0aEluZm99XFxcIj48L2E+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpXFxcIiBibi1zaG93PVxcXCJpc0xhc3RcXFwiIGNsYXNzPVxcXCJsYXN0SXRlbVxcXCI+PC9zcGFuPlxcblxcblx0XHQ8L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXFxuXHQ8ZGl2IFxcblx0XHRibi1lYWNoPVxcXCJnZXRGaWxlc1xcXCIgXFxuXHRcdGJuLWl0ZXI9XFxcImZcXFwiIFxcblx0XHRibi1sYXp6eT1cXFwiMTBcXFwiIFxcblx0XHRibi1iaW5kPVxcXCJmaWxlc1xcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay5mb2xkZXI6IG9uRm9sZGVyQ2xpY2ssIGNsaWNrLmNoZWNrOiBvbkNoZWNrQ2xpY2ssIGNsaWNrLmZpbGU6IG9uRmlsZUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS50aHVtYm5haWw6IG9uQ29udGV4dE1lbnVcXFwiXFxuXHRcdGNsYXNzPVxcXCJjb250YWluZXJcXFwiXFxuXHQ+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbCB3My1jYXJkLTJcXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogZ2V0SXRlbXN9XFxcIj5cXG5cXG5cdFx0XHQ8c3BhbiBibi1pZj1cXFwiaWYxXFxcIj5cXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tc2hvdz1cXFwic2VsZWN0aW9uRW5hYmxlZFxcXCIgY2xhc3M9XFxcImNoZWNrIHczLWNoZWNrXFxcIlxcblx0XHRcdFx0XHRibi1wcm9wPVxcXCJ7Y2hlY2tlZDogJHNjb3BlLmYuY2hlY2tlZH1cXFwiPlxcblx0XHRcdDwvc3Bhbj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCIkc2NvcGUuZi5mb2xkZXJcXFwiIGNsYXNzPVxcXCJmb2xkZXIgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLTR4IGZhLWZvbGRlci1vcGVuIHczLXRleHQtYmx1ZS1ncmV5XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS5mLm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREYXRlXFxcIiBibi1pZj1cXFwiaWYxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpZjJcXFwiIGNsYXNzPVxcXCJmaWxlIGl0ZW1cXFwiPlxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+XFxuXHRcdFx0XHRcdDxpIGJuLWF0dHI9XFxcIntjbGFzczogY2xhc3MxfVxcXCI+PC9pPlxcblx0XHRcdFx0PC9kaXY+XFxuXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0XHRcdFx0PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5uYW1lXFxcIj48L3N0cm9uZz5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHQ8ZGl2IGJuLWlmPVxcXCJpc01QM1xcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGkgYm4tYXR0cj1cXFwie2NsYXNzOiBjbGFzczF9XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2Rpdj5cXG5cXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHRcdFx0XHQ8ZGl2PlRpdGxlOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubXAzLnRpdGxlXFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cXG5cdFx0XHRcdFx0PGRpdj5BcnRpc3Q6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMuYXJ0aXN0XFxcIj48L3N0cm9uZz48L2Rpdj5cXG5cdFx0XHRcdFx0PGRpdiBibi1zaG93PVxcXCJoYXNHZW5yZVxcXCI+R2VucmU6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMuZ2VucmVcXFwiPjwvc3Ryb25nPjwvZGl2Plxcblx0XHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcImhhc1llYXJcXFwiPiBZZWFyOiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiZ2V0WWVhclxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHRcdDxkaXYgYm4taWY9XFxcImlmM1xcXCIgY2xhc3M9XFxcImZpbGUgaXRlbVxcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJpY29uXFxcIj5cXG5cdFx0XHRcdFx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiBnZXRUaHVtYm5haWxVcmx9XFxcIj5cXG5cdFx0XHRcdDwvZGl2Plxcblxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdFx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubmFtZVxcXCI+PC9zdHJvbmc+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXREaW1lbnNpb25cXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdDwvZGl2Plxcblxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2PlxcblxcblxcbjwvZGl2PlwiLFxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHsqfSBlbHQgXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IHNydkZpbGVzIFxuXHRcdCAqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRcdGNvbnN0IHRodW1ibmFpbFNpemUgPSAnMTAweD8nXG5cblx0XHRcdGxldCBzZWxlY3RlZCA9IGZhbHNlXG5cblx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5Qcm9wc30gKi9cblx0XHRcdGxldCB7XG5cdFx0XHRcdHNlbGVjdGlvbkVuYWJsZWQsXG5cdFx0XHRcdGZpbHRlckV4dGVuc2lvbixcblx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0aW1hZ2VPbmx5LFxuXHRcdFx0XHRnZXRNUDNJbmZvLFxuXHRcdFx0XHRtcDNGaWx0ZXJzLFx0XHRcdFx0XG5cdFx0XHRcdG1lbnVJdGVtc1xuXHRcdFx0fSA9IHRoaXMucHJvcHMgXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0Z2V0SXRlbXM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1lbnVJdGVtcyhzY29wZS5mKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0c2VsZWN0aW9uRW5hYmxlZCxcblx0XHRcdFx0XHRyb290RGlyOiAnLycsXG5cdFx0XHRcdFx0ZmlsZXM6IFtdLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnMsXG5cdFx0XHRcdFx0aW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0bGV0IG5iRmlsZXMgPSAwXG5cdFx0XHRcdFx0XHRsZXQgbmJGb2xkZXJzID0gMFxuXHRcdFx0XHRcdFx0dGhpcy5nZXRGaWxlcygpLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKGkuZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGkubmFtZSAhPSAnLi4nKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRuYkZvbGRlcnMrK1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRuYkZpbGVzKytcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0bGV0IHJldCA9IFtdXG5cdFx0XHRcdFx0XHRpZiAobmJGb2xkZXJzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKG5iRm9sZGVycyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGb2xkZXJzfSBmb2xkZXJzYClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChuYkZpbGVzID09IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZWApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobmJGaWxlcyA+IDEpIHtcblx0XHRcdFx0XHRcdFx0cmV0LnB1c2goYCR7bmJGaWxlc30gZmlsZXNgKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldC5qb2luKCcgLyAnKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRpc0luRmlsdGVyOiBmdW5jdGlvbiAobXAzSW5mbykge1xuXHRcdFx0XHRcdFx0dmFyIHJldCA9IHRydWVcblx0XHRcdFx0XHRcdGZvciAobGV0IGYgaW4gdGhpcy5tcDNGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbHRlcicsIGYpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gbXAzSW5mb1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd2YWx1ZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWx0ZXJWYWx1ZSA9IHRoaXMubXAzRmlsdGVyc1tmXVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWx0ZXJWYWx1ZScsIGZpbHRlclZhbHVlKVxuXHRcdFx0XHRcdFx0XHRpZiAoZmlsdGVyVmFsdWUgIT0gJ0FsbCcpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQgJj0gKGZpbHRlclZhbHVlID09PSB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmV0JywgcmV0KVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRnZXRGaWxlczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMubXAzRmlsdGVycyA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlc1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZXMuZmlsdGVyKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmLmZvbGRlciB8fCAoZi5tcDMgJiYgZi5tcDMgJiYgdGhpcy5pc0luRmlsdGVyKGYubXAzKSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc01QMzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2V0TVAzSW5mbyAmJiBzY29wZS5mLm1wMyAhPSB1bmRlZmluZWQgJiYgc2NvcGUuZi5tcDMudGl0bGUgIT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0XHRcdHNjb3BlLmYubXAzLnRpdGxlICE9ICcnXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRQYXRoOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB0YWIgPSAoJy9ob21lJyArIHRoaXMucm9vdERpcikuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdFx0dGFiLnNoaWZ0KClcblx0XHRcdFx0XHRcdHRhYi5wb3AoKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRhYlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNMYXN0OiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5pZHggPT0gdGhpcy5nZXRQYXRoKCkubGVuZ3RoIC0gMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNGaXJzdDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuaWR4ID09IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFBhdGhJbmZvOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmdldFBhdGgoKS5zbGljZSgxLCBzY29wZS5pZHggKyAxKS5qb2luKCcvJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aGFzR2VucmU6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0bGV0IHsgZ2VucmUgfSA9IHNjb3BlLmYubXAzXG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2VucmUgIT0gdW5kZWZpbmVkICYmIGdlbnJlICE9ICcnICYmICFnZW5yZS5zdGFydHNXaXRoKCcoJylcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0aGFzWWVhcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQgeyB5ZWFyIH0gPSBzY29wZS5mLm1wM1xuXHRcdFx0XHRcdFx0cmV0dXJuIHllYXIgIT0gdW5kZWZpbmVkICYmIHllYXIgIT0gJydcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0WWVhcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcGFyc2VJbnQoc2NvcGUuZi5tcDMueWVhcilcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0VGh1bWJuYWlsVXJsOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzcnZGaWxlcy5maWxlVGh1bWJuYWlsVXJsKHRoaXMucm9vdERpciArIHNjb3BlLmYubmFtZSwgdGh1bWJuYWlsU2l6ZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlmMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuZi5uYW1lICE9ICcuLidcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlmMjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gIXNjb3BlLmYuZm9sZGVyICYmICFzY29wZS5mLmlzSW1hZ2UgJiYgIXRoaXMuaXNNUDMoc2NvcGUpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpZjM6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICFzY29wZS5mLmZvbGRlciAmJiBzY29wZS5mLmlzSW1hZ2Vcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYGZhIGZhLTR4IHczLXRleHQtYmx1ZS1ncmV5ICR7Z2V0SWNvbkNsYXNzKHNjb3BlLmYubmFtZSl9YFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLmYuc2l6ZVxuXHRcdFx0XHRcdFx0bGV0IHVuaXQgPSAnb2N0ZXRzJ1xuXHRcdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRcdHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNpemUgPSBNYXRoLmZsb29yKHNpemUgKiAxMCkgLyAxMFxuXHRcdFx0XHRcdFx0cmV0dXJuICdTaXplOiAnICsgc2l6ZSArICcgJyArIHVuaXRcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0Z2V0RGltZW5zaW9uOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGQgPSBzY29wZS5mLmRpbWVuc2lvblxuXHRcdFx0XHRcdFx0cmV0dXJuIGBEaW1lbnNpb246ICR7ZC53aWR0aH14JHtkLmhlaWdodH1gXG5cdFx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoc2NvcGUuZi5tdGltZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcblx0XHRcdFx0XHRcdHJldHVybiAnTGFzdCBNb2RpZjogJyArIGRhdGVcblxuXHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdG9uUGF0aEl0ZW06IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGF0aEl0ZW0gPSAkKHRoaXMpLmRhdGEoJ2luZm8nKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QYXRoSXRlbScsIHBhdGhJdGVtKVxuXHRcdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdFx0Y29uc3QgbmV3RGlyID0gcGF0aEl0ZW0gPT0gJycgPyAnLycgOiAnLycgKyBwYXRoSXRlbSArICcvJ1xuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2RpcmNoYW5nZScsIHsgbmV3RGlyIH0pXG5cblxuXHRcdFx0XHRcdFx0bG9hZERhdGEobmV3RGlyKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCB7IG5hbWUgfSA9IGN0cmwubW9kZWwuZmlsZXNbaWR4XVxuXG5cdFx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignY29udGV4dG1lbnVJdGVtJywgeyBjbWQsIGlkeCwgbmFtZSwgcm9vdERpciB9KVxuXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmluZGV4KClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmdldEZpbGVzKClbaWR4XVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRcdFx0XHRmaWxlTmFtZTogaW5mby5uYW1lLFxuXHRcdFx0XHRcdFx0XHRyb290RGlyOiBjdHJsLm1vZGVsLnJvb3REaXIsXG5cdFx0XHRcdFx0XHRcdGlzSW1hZ2U6IGluZm8uaXNJbWFnZSxcblx0XHRcdFx0XHRcdFx0bXAzOiBpbmZvLm1wM1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZmlsZWNsaWNrJywgZGF0YSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uQ2hlY2tDbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy50aHVtYm5haWwnKS5pbmRleCgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5nZXRGaWxlcygpW2lkeF1cblx0XHRcdFx0XHRcdGluZm8uY2hlY2tlZCA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ3NlbGNoYW5nZScsIHsgaXNTaGFyZVNlbGVjdGVkOiBpc1NoYXJlU2VsZWN0ZWQoKSB9KVxuXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkZvbGRlckNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuaW5kZXgoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZ2V0RmlsZXMoKVtpZHhdXG5cblx0XHRcdFx0XHRcdGNvbnN0IGRpck5hbWUgPSBpbmZvLm5hbWVcblx0XHRcdFx0XHRcdGNvbnN0IG5ld0RpciA9IGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLydcblx0XHRcdFx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZGlyY2hhbmdlJywgeyBuZXdEaXIgfSlcblx0XHRcdFx0XHRcdGxvYWREYXRhKG5ld0Rpcilcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gbG9hZERhdGEocm9vdERpciwgcmVzZXRGaWx0ZXJzKSB7XG5cdFx0XHRcdGlmIChyb290RGlyID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGxvYWRpbmc6IHRydWUgfSlcblx0XHRcdFx0Y29uc3QgZmlsZXMgPSBhd2FpdCBzcnZGaWxlcy5saXN0KHJvb3REaXIsIHsgZmlsdGVyRXh0ZW5zaW9uLCBpbWFnZU9ubHksIGdldE1QM0luZm8gfSwgZnJpZW5kVXNlcilcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cblx0XHRcdFx0c29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRcdGlmIChyZXNldEZpbHRlcnMgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5tcDNGaWx0ZXJzID0gbnVsbFxuXHRcdFx0XHR9XG5cblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdHJvb3REaXIsXG5cdFx0XHRcdFx0bmJTZWxlY3Rpb246IDBcblx0XHRcdFx0fSlcblxuXHRcdFx0fVxuXG5cdFx0XHRsb2FkRGF0YSgpXG5cblx0XHRcdGZ1bmN0aW9uIGlzU2hhcmVTZWxlY3RlZCgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwucm9vdERpciA9PSAnLycgJiZcblx0XHRcdFx0XHQoY3RybC5tb2RlbC5maWxlcy5maW5kSW5kZXgoKGYpID0+IGYubmFtZSA9PSAnc2hhcmUnICYmIGYuZm9sZGVyICYmIGYuY2hlY2tlZCkgIT0gLTEpXG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRTZWxGaWxlcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBbXVxuXHRcdFx0XHRjdHJsLm1vZGVsLmZpbGVzLmZvckVhY2goKGYsIGlkeCkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHsgbmFtZSwgY2hlY2tlZCB9ID0gZlxuXHRcdFx0XHRcdGlmIChjaGVja2VkID09PSB0cnVlICYmIG5hbWUgIT0gJy4uJykge1xuXHRcdFx0XHRcdFx0c2VsRmlsZXMucHVzaCh7IGZpbGVOYW1lOiBjdHJsLm1vZGVsLnJvb3REaXIgKyBuYW1lLCBpZHggfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdFx0cmV0dXJuIHNlbEZpbGVzXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0U2VsRmlsZU5hbWVzID0gKCkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRTZWxGaWxlcygpLm1hcCgoZikgPT4gZi5maWxlTmFtZSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXROYlNlbEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJykubGVuZ3RoXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudG9nZ2xlU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRzZWxlY3RlZCA9ICFzZWxlY3RlZFxuXHRcdFx0XHRlbHQuZmluZCgnLmNoZWNrJykucHJvcCgnY2hlY2tlZCcsIHNlbGVjdGVkKVxuXHRcdFx0XHRjdHJsLm1vZGVsLmZpbGVzLmZvckVhY2goKGYpID0+IHsgZi5jaGVja2VkID0gc2VsZWN0ZWQgfSlcblx0XHRcdFx0Y3RybC51cGRhdGVBcnJheVZhbHVlKCdmaWxlcycsICdmaWxlcycpXG5cdFx0XHRcdGVsdC50cmlnZ2VyKCdzZWxjaGFuZ2UnLCB7IGlzU2hhcmVTZWxlY3RlZDogaXNTaGFyZVNlbGVjdGVkKCkgfSlcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRSb290RGlyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5yb290RGlyXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaW5zZXJ0RmlsZSA9IGZ1bmN0aW9uIChmaWxlSW5mbywgaWR4KSB7XG5cdFx0XHRcdGlmIChpZHgpIHtcblx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUFmdGVyKCdmaWxlcycsIGlkeCwgZmlsZUluZm8sICdmaWxlcycpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0aWR4ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbHRlcigoZikgPT4gZi5mb2xkZXIpLmxlbmd0aFxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0XHRpZiAoaWR4ID09IDApIHsgLy8gbm8gZm9sZGVyLCBpbnNlcnQgYXQgdGhlIGJlZ2luaW5nXG5cdFx0XHRcdFx0XHRjdHJsLmluc2VydEFycmF5SXRlbUJlZm9yZSgnZmlsZXMnLCAwLCBmaWxlSW5mbywgJ2ZpbGVzJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7IC8vIGluc2VydCBhZnRlciBsYXN0IGZvbGRlclxuXHRcdFx0XHRcdFx0Y3RybC5pbnNlcnRBcnJheUl0ZW1BZnRlcignZmlsZXMnLCBpZHggLSAxLCBmaWxlSW5mbywgJ2ZpbGVzJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsZXMnLCBjdHJsLm1vZGVsLmZpbGVzKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGUoJ2luZm8nKVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMucmVtb3ZlRmlsZXMgPSBmdW5jdGlvbiAoaW5kZXhlcykge1xuXHRcdFx0XHRjdHJsLnJlbW92ZUFycmF5SXRlbSgnZmlsZXMnLCBpbmRleGVzLCAnZmlsZXMnKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZU5vZGUoJ2luZm8nKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGN0cmwubW9kZWwuZmlsZXMpXG5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVGaWxlID0gZnVuY3Rpb24gKGlkeCwgaW5mbykge1xuXHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5SXRlbSgnZmlsZXMnLCBpZHgsIGluZm8sICdmaWxlcycpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXBkYXRlRmlsZUluZm8gPSBhc3luYyBmdW5jdGlvbiAoZmlsZU5hbWUsIG9wdGlvbnMpIHtcblx0XHRcdFx0Y29uc3QgeyBmaWxlcywgcm9vdERpciB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRsZXQgaWR4ID0gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbmRJbmRleCgoaSkgPT4gaS5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbRmlsZUN0cmxdIHVwZGF0ZUZpbGUnLCBpZHgsIGZpbGVOYW1lLCBvcHRpb25zKVxuXHRcdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgc3J2RmlsZXMuZmlsZUluZm8ocm9vdERpciArIGZpbGVOYW1lLCBmcmllbmRVc2VyLCBvcHRpb25zKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZUFycmF5SXRlbSgnZmlsZXMnLCBpZHgsIGluZm8pXG5cdFx0XHRcdGlkeCA9IGZpbGVzLmZpbmRJbmRleCgoaSkgPT4gaS5uYW1lID09IGZpbGVOYW1lKVxuXHRcdFx0XHRmaWxlc1tpZHhdID0gaW5mb1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5maWxlcy5maWx0ZXIoKGYpID0+ICFmLmZvbGRlcilcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRGaWx0ZXJlZEZpbGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5nZXRGaWxlcygpLmZpbHRlcigoZikgPT4gIWYuZm9sZGVyKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJlbG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0ZpbGVDdHJsXSB1cGRhdGUnKVxuXHRcdFx0XHRsb2FkRGF0YSh1bmRlZmluZWQsIGZhbHNlKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldE1QM0ZpbHRlcnMgPSBmdW5jdGlvbiAobXAzRmlsdGVycykge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBtcDNGaWx0ZXJzIH0pXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0TVAzRmlsdGVycyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwubXAzRmlsdGVyc1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cbn0pKCk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRwcm9wczoge1xuXHRcdHNob3dTZWxlY3Rpb246IGZhbHNlLFxuXHRcdHNob3dTZW5kTWVzc2FnZTogZmFsc2UsXG5cdFx0c2hvd0Nvbm5lY3Rpb25TdGF0ZTogdHJ1ZVxuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuZnJpZW5kcycsICdicmVpemJvdC5ub3RpZnMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIGJuLWVhY2g9XFxcImZyaWVuZHNcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLnczLWJhcjogb25JdGVtQ2xpY2ssIGNsaWNrLm5vdGlmOiBvblNlbmRNZXNzYWdlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1xcXCI+XFxuXHRcdFxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IG5vdGlmIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZW5kIE1lc3NhZ2VcXFwiIGJuLXNob3c9XFxcInNob3dTZW5kTWVzc2FnZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlXFxcIj48L2k+XFxuXHRcdDwvc3Bhbj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyXFxcIiBibi1jbGFzcz1cXFwiY2xhc3MxXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmZyaWVuZFVzZXJOYW1lXFxcIj48L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlxcbjxwIGJuLXNob3c9XFxcInNob3cyXFxcIj5Zb3UgaGF2ZSBubyBmcmllbmRzPC9wPlwiLFxuXG5cdC8qKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuSW50ZXJmYWNlfSBicm9rZXIgXG5cdCAqICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZnJpZW5kc1Nydiwgbm90aWZzU3J2LCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IHtzaG93U2VsZWN0aW9uLCBzaG93U2VuZE1lc3NhZ2UsIHNob3dDb25uZWN0aW9uU3RhdGV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcmllbmRzOiBbXSxcblx0XHRcdFx0c2hvd1NlbmRNZXNzYWdlLFxuXHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZnJpZW5kcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mcmllbmRzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNsYXNzMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRjb25zdCAkaSA9IHNjb3BlLiRpXG5cdFx0XHRcdFx0Y29uc3Qgc2hvd0Nvbm5lY3Rpb25TdGF0ZSA9IHRoaXMuc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHQndzMtdGV4dC1ncmVlbic6ICRpLmlzQ29ubmVjdGVkICYmIHNob3dDb25uZWN0aW9uU3RhdGUsXG5cdFx0XHRcdFx0XHQndzMtdGV4dC1yZWQnOiAhJGkuaXNDb25uZWN0ZWQgJiYgc2hvd0Nvbm5lY3Rpb25TdGF0ZSxcblx0XHRcdFx0XHRcdCd3My10ZXh0LWJsdWUnOiAhc2hvd0Nvbm5lY3Rpb25TdGF0ZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IHVzZXJOYW1lID0gIGN0cmwubW9kZWwuZnJpZW5kc1tpZHhdLmZyaWVuZFVzZXJOYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRpZiAoc2hvd1NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5zaWJsaW5ncygnLnczLWJsdWUnKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCd3My1ibHVlJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZyaWVuZGNsaWNrJywge3VzZXJOYW1lfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TZW5kTWVzc2FnZTogYXN5bmMgZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cblx0XHRcdFx0XHRjb25zdCB1c2VyTmFtZSA9ICBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XS5mcmllbmRVc2VyTmFtZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VuZE1lc3NhZ2UnLCB1c2VyTmFtZSlcblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdTZW5kIE1lc3NhZ2UnLCBsYWJlbDogJ01lc3NhZ2U6J30pXG5cblx0XHRcdFx0XHRpZiAodGV4dCAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRub3RpZnNTcnYuc2VuZE5vdGlmKHVzZXJOYW1lLCB7dGV4dCwgcmVwbHk6IHRydWV9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQnJva2VyLk1zZ30gbXNnIFxuXHRcdCAqIEByZXR1cm5zIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG9uVXBkYXRlKG1zZykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3Qge2lzQ29ubmVjdGVkLCB1c2VyTmFtZX0gPSBtc2cuZGF0YVxuXHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuZnJpZW5kcy5maW5kKChmcmllbmQpID0+IHtyZXR1cm4gZnJpZW5kLmZyaWVuZFVzZXJOYW1lID09IHVzZXJOYW1lfSlcblx0XHRcdGluZm8uaXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZFxuXHRcdFx0Y3RybC51cGRhdGUoKVxuXG5cdFx0fVxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIG9uVXBkYXRlKVxuXG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnN0IGlkeCA9IGVsdC5maW5kKCdsaS53My1ibHVlJykuaW5kZXgoKTtcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmZyaWVuZHNbaWR4XVxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0RnJpZW5kcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZnJpZW5kcy5tYXAoKGZyaWVuZCkgPT4gZnJpZW5kLmZyaWVuZFVzZXJOYW1lKVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRmcmllbmRzU3J2LmdldEZyaWVuZHMoKS50aGVuKChmcmllbmRzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tmcmllbmRzXSBkaXNwb3NlJylcblx0XHRcdGJyb2tlci51bnJlZ2lzdGVyKCdicmVpemJvdC5mcmllbmRzJywgb25VcGRhdGUpXG5cdFx0fVxuXG5cblx0XHR0aGlzLnVwZGF0ZSgpXG5cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRTZWxlY3Rpb24oKTpzdHJpbmc7XG5cdFx0Z2V0RnJpZW5kcygpOltzdHJpbmddXG5cdGAsXG5cblx0JGV2ZW50czogJ2ZyaWVuZGNsaWNrJ1xufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaG9tZScsIHtcblxuXHRkZXBzOiBbXG5cdFx0J2JyZWl6Ym90LmJyb2tlcicsXG5cdFx0J2JyZWl6Ym90LnVzZXJzJyxcblx0XHQnYnJlaXpib3Qubm90aWZzJyxcblx0XHQnYnJlaXpib3QuZ2VvbG9jJyxcblx0XHQnYnJlaXpib3QucnRjJyxcblx0XHQnYnJlaXpib3QuYXBwcycsXG5cdFx0J2JyZWl6Ym90LnNjaGVkdWxlcicsXG5cdFx0J2JyZWl6Ym90Lndha2Vsb2NrJyxcblx0XHQnYnJlaXpib3QuZnVsbHNjcmVlbidcblx0XSxcblxuXHRwcm9wczoge1xuXHRcdHVzZXJOYW1lOiAnVW5rbm93bidcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJoZWFkZXJcXFwiPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiRnVsbFNjcmVlblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkZ1bGxTY3JlZW5cXFwiIGJuLXNob3c9XFxcIiFmdWxsU2NyZWVuXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkV4aXQgRnVsbFNjcmVlblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkV4aXRGdWxsU2NyZWVuXFxcIiBibi1zaG93PVxcXCJmdWxsU2NyZWVuXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY29tcHJlc3NcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQ29ubmVjdGlvbiBTdGF0dXNcXFwiPlxcblx0XHRcdDxpIGJuLWNsYXNzPVxcXCJ7dzMtdGV4dC1ncmVlbjogY29ubmVjdGVkLCB3My10ZXh0LXJlZDogIWNvbm5lY3RlZH1cXFwiIGNsYXNzPVxcXCJmYSBmYS1jaXJjbGVcXFwiPjwvaT5cXG5cXG5cdFx0PC9idXR0b24+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzSW5jb21pbmdDYWxsXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ2FsbFJlc3BvbnNlXFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCcsIFxcblx0XHRcdFx0dGl0bGU6IGNhbGxJbmZvLmZyb20sXFxuXHRcdFx0XHRpdGVtczoge1xcblx0XHRcdFx0XHRhY2NlcHQ6IHtuYW1lOiBcXCdBY2NlcHRcXCd9LFxcblx0XHRcdFx0XHRkZW55OiB7bmFtZTogXFwnRGVjbGluZVxcJ30sXFxuXHRcdFx0XHR9XFxuXHRcdFx0fVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdFx0XHQ8aSBibi1hdHRyPVxcXCJ7Y2xhc3M6IGNhbGxJbmZvLmljb25DbHN9XFxcIj48L2k+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXFxuXHQ8IS0tIFx0PHN0cm9uZyBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zdHJvbmc+XFxuIC0tPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwibm90aWZpY2F0aW9uIHczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIk5vdGlmaWNhdGlvblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5vdGlmaWNhdGlvblxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLWJlbGxcXFwiPjwvaT5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYmFkZ2UgdzMtcmVkIHczLXRpbnlcXFwiIGJuLXRleHQ9XFxcIm5iTm90aWZcXFwiIGJuLXNob3c9XFxcImhhc05vdGlmXFxcIj48L3NwYW4+XFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntcXG5cdFx0XHRcdGl0ZW1zOiB7XFxuXHRcdFx0XHRcdHNldHRpbmdzOiB7bmFtZTogXFwnU2V0dGluZ3NcXCcsIGljb246IFxcJ2ZhcyBmYS1jb2dcXCd9LFxcblx0XHRcdFx0XHRhcHBzOiB7bmFtZTogXFwnQXBwbGljYXRpb25zXFwnLCBpY29uOiBcXCdmYXMgZmEtdGhcXCd9LFxcblx0XHRcdFx0XHRzZXA6IFxcJy0tLS0tLVxcJyxcXG5cdFx0XHRcdFx0bG9nb3V0OiB7bmFtZTogXFwnTG9nb3V0XFwnLCBpY29uOiBcXCdmYXMgZmEtcG93ZXItb2ZmXFwnfVxcblx0XHRcdFx0fSxcXG5cdFx0XHRcdHRpdGxlOiB1c2VyTmFtZSxcXG5cdFx0XHRcdHRyaWdnZXI6IFxcJ2xlZnRcXCdcXG5cdFx0XHR9XFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29udGV4dE1lbnVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtdXNlci1jaXJjbGUgZmEtbGdcXFwiPjwvaT5cXG5cXG5cdFx0PC9kaXY+XFxuXFxuXHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMudGFic1xcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiIGJuLWlmYWNlPVxcXCJ0YWJzXFxcIlxcblx0Ym4tZXZlbnQ9XFxcInRhYnNyZW1vdmU6IG9uVGFiUmVtb3ZlLCB0YWJzYWN0aXZhdGU6IG9uVGFiQWN0aXZhdGVcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBibi1kYXRhPVxcXCJ7XFxuXHRcdFx0YXBwczogZ2V0TXlBcHBzLFxcblx0XHRcdGl0ZW1zXFxuXHRcdH1cXFwiIGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGljaywgYXBwY29udGV4dG1lbnU6IG9uVGlsZUNvbnRleHRNZW51XFxcIiB0aXRsZT1cXFwiSG9tZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQnJva2VyLkludGVyZmFjZX0gYnJva2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlVzZXIuSW50ZXJmYWNlfSB1c2VycyBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ob3RpZi5JbnRlcmZhY2V9IG5vdGlmc1NydiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5HZW9sb2MuSW50ZXJmYWNlfSBnZW9sb2MgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUlRDLkludGVyZmFjZX0gcnRjIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkFwcHMuSW50ZXJmYWNlfSBzcnZBcHBzIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlNjaGVkdWxlci5JbnRlcmZhY2V9IHNjaGVkdWxlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5XYWtlTG9jay5JbnRlcmZhY2V9IHdha2Vsb2NrIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZ1bGxTY3JlZW4uSW50ZXJmYWNlfSBmdWxsc2NyZWVuIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgYnJva2VyLCB1c2Vycywgbm90aWZzU3J2LCBnZW9sb2MsIHJ0Yywgc3J2QXBwcywgc2NoZWR1bGVyLCB3YWtlbG9jaywgZnVsbHNjcmVlbikge1xuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQXVkaW8oKSB7XG5cdFx0XHRsZXQgYXVkaW8gPSBudWxsXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXVkaW8gcGxheScpXG5cdFx0XHRcdFx0YXVkaW8gPSBuZXcgQXVkaW8oJy9hc3NldHMvc2t5cGUubXAzJylcblx0XHRcdFx0XHRhdWRpby5sb29wID0gdHJ1ZVxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4geyBhdWRpby5wbGF5KCkgfSwgMTAwKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHN0b3A6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdWRpbyBzdG9wJylcblx0XHRcdFx0XHRpZiAoYXVkaW8gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhdWRpbyA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ0Yy5wcm9jZXNzQ2FsbCgpXG5cblx0XHRydGMub24oJ2NhbGwnLCBmdW5jdGlvbiAoY2FsbEluZm8pIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogdHJ1ZSwgY2FsbEluZm8gfSlcblx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdH0pXG5cblx0XHRydGMub24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGhhc0luY29taW5nQ2FsbDogZmFsc2UgfSlcblx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdH0pXG5cblx0XHRjb25zdCB7IHVzZXJOYW1lIH0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBhdWRpbyA9IGNyZWF0ZUF1ZGlvKClcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW10sXG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRuYk5vdGlmOiAwLFxuXHRcdFx0XHRoYXNJbmNvbWluZ0NhbGw6IGZhbHNlLFxuXHRcdFx0XHRjYWxsSW5mbzogbnVsbCxcblx0XHRcdFx0ZnVsbFNjcmVlbjogZmFsc2UsXG5cdFx0XHRcdGNvbm5lY3RlZDogZmFsc2UsXG5cdFx0XHRcdGhhc05vdGlmOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubmJOb3RpZiA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0TXlBcHBzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXBwcy5maWx0ZXIoKGEpID0+IGEuYWN0aXZhdGVkKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpdGVtczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRyZW1vdmU6IHsgbmFtZTogJ1JlbW92ZScgfVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGlsZUNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRpbGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0YXdhaXQgdXNlcnMuYWN0aXZhdGVBcHAoZGF0YS5hcHBOYW1lLCBmYWxzZSlcblx0XHRcdFx0XHRsb2FkQXBwKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25BcHBDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0b3BlbkFwcChkYXRhLmFwcE5hbWUpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRzY2hlZHVsZXIubG9nb3V0KClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhcHBzJykge1xuXHRcdFx0XHRcdFx0b3BlbkFwcCgnc3RvcmUnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ3NldHRpbmdzJykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc2V0dGluZ3MgPSBhd2FpdCB1c2Vycy5nZXRVc2VyU2V0dGluZ3MoKVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3NldHRpbmcnLCBzZXR0aW5ncylcblx0XHRcdFx0XHRcdG9wZW5BcHAoJ3NldHRpbmdzJywgc2V0dGluZ3MpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWZpY2F0aW9uOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk5vdGlmaWNhdGlvbicpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwubmJOb3RpZiA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyBjb250ZW50OiAnbm8gbm90aWZpY2F0aW9ucycsIHRpdGxlOiAnTm90aWZpY2F0aW9ucycgfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvcGVuQXBwKCdub3RpZicpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGxSZXNwb25zZTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBjbWQgfSA9IGRhdGFcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNhbGxSZXNwb25zZScsIGRhdGEpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgaGFzSW5jb21pbmdDYWxsOiBmYWxzZSB9KVxuXHRcdFx0XHRcdGF1ZGlvLnN0b3AoKVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2FjY2VwdCcpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgZnJvbSwgYXBwTmFtZSB9ID0gY3RybC5tb2RlbC5jYWxsSW5mb1xuXHRcdFx0XHRcdFx0b3BlbkFwcChhcHBOYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNhbGxlcjogZnJvbSxcblx0XHRcdFx0XHRcdFx0Y2xpZW50SWQ6IHJ0Yy5nZXRSZW1vdGVDbGllbnRJZCgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY21kID09ICdkZW55Jykge1xuXHRcdFx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkV4aXRGdWxsU2NyZWVuOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25FeGl0RnVsbFNjcmVlbicpXG5cdFx0XHRcdFx0ZnVsbHNjcmVlbi5leGl0KClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZ1bGxTY3JlZW46IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRnVsbFNjcmVlbicpXG5cdFx0XHRcdFx0ZnVsbHNjcmVlbi5lbnRlcigpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiUmVtb3ZlOiBmdW5jdGlvbiAoZXYsIGlkeCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uVGFiUmVtb3ZlJywgaWR4KVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSB0YWJzLmdldFRhYkluZm8oaWR4KVxuXHRcdFx0XHRcdGluZm8uY3RybElmYWNlLm9uQXBwRXhpdCgpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0dGFicy5yZW1vdmVUYWIoaWR4KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFiQWN0aXZhdGU6IGZ1bmN0aW9uIChldiwgdWkpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblRhYkFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB7IG5ld1RhYiwgb2xkVGFiIH0gPSB1aVxuXHRcdFx0XHRcdGNvbnN0IG5ld1RhYklkeCA9IG5ld1RhYi5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3Qgb2xkVGFiSWR4ID0gb2xkVGFiLmluZGV4KClcblx0XHRcdFx0XHRpZiAob2xkVGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhvbGRUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFN1c3BlbmQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmV3VGFiSWR4ID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhuZXdUYWJJZHgpXG5cdFx0XHRcdFx0XHRpbmZvLmN0cmxJZmFjZS5vbkFwcFJlc3VtZSgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuZXdUYWJJZHggPT0gMCkge1xuXHRcdFx0XHRcdFx0bG9hZEFwcCgpXG5cdFx0XHRcdFx0fVxuXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7QnJhaW5qcy5Db250cm9scy5UYWJzLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCB0YWJzID0gY3RybC5zY29wZS50YWJzXG5cblx0XHRmdWxsc2NyZWVuLmluaXQoKGZ1bGxTY3JlZW4pID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGZ1bGxTY3JlZW4gfSlcblx0XHR9KVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IG5iTm90aWYgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKG5iTm90aWYpIHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7IG5iTm90aWYgfSlcblxuXHRcdH1cblxuXHRcdGJyb2tlci5vbignY29ubmVjdGVkJywgKHN0YXRlKSA9PiB7XG5cdFx0XHRjdHJsLnNldERhdGEoeyBjb25uZWN0ZWQ6IHN0YXRlIH0pXG5cdFx0fSlcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKGV2KSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbaG9tZV0gbWVzc2FnZScsIGV2LmRhdGEpXG5cdFx0XHRjb25zdCB7IHR5cGUsIGRhdGEgfSA9IGV2LmRhdGFcblx0XHRcdGlmICh0eXBlID09ICdvcGVuQXBwJykge1xuXHRcdFx0XHRjb25zdCB7IGFwcE5hbWUsIGFwcFBhcmFtcyB9ID0gZGF0YVxuXHRcdFx0XHRvcGVuQXBwKGFwcE5hbWUsIGFwcFBhcmFtcylcblx0XHRcdH1cblx0XHRcdGlmICh0eXBlID09ICdyZWxvYWQnKSB7XG5cdFx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpXG5cdFx0XHR9XG5cblx0XHR9LCBmYWxzZSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QuZnJpZW5kcycsIChtc2cpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2JyZWl6Ym90LmZyaWVuZHMnLCBtc2cpXG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHQvKipAdHlwZSBCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuRXZlbnRzLkZyaWVuZHMgKi9cblx0XHRcdGNvbnN0IHsgaXNDb25uZWN0ZWQsIHVzZXJOYW1lIH0gPSBtc2cuZGF0YVxuXHRcdFx0aWYgKGlzQ29ubmVjdGVkKSB7XG5cdFx0XHRcdCQubm90aWZ5KGAnJHt1c2VyTmFtZX0nIGlzIGNvbm5lY3RlZGAsICdzdWNjZXNzJylcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHQkLm5vdGlmeShgJyR7dXNlck5hbWV9JyBpcyBkaXNjb25uZWN0ZWRgLCAnZXJyb3InKVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3Qubm90aWZDb3VudCcsIGZ1bmN0aW9uIChtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcyhtc2cuZGF0YSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LmxvZ291dCcsIGZ1bmN0aW9uIChtc2cpIHtcblx0XHRcdGxvY2F0aW9uLmhyZWYgPSAnL2xvZ291dCdcblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBvcGVuQXBwKGFwcE5hbWUsIHBhcmFtcykge1xuXHRcdFx0Y29uc3QgYXBwSW5mbyA9IGN0cmwubW9kZWwuYXBwcy5maW5kKChhKSA9PiBhLmFwcE5hbWUgPT0gYXBwTmFtZSlcblx0XHRcdGNvbnN0IHRpdGxlID0gYXBwSW5mby5wcm9wcy50aXRsZVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnb3BlbkFwcCcsIGFwcE5hbWUsIHBhcmFtcylcblx0XHRcdGxldCBpZHggPSB0YWJzLmdldFRhYkluZGV4RnJvbVRpdGxlKHRpdGxlKVxuXHRcdFx0Y29uc3QgYXBwVXJsID0gJCQudXJsLmdldFVybFBhcmFtcyhgL2FwcHMvJHthcHBOYW1lfWAsIHBhcmFtcylcblx0XHRcdGlmIChpZHggPCAwKSB7IC8vIGFwcHMgbm90IGFscmVhZHkgcnVuXG5cdFx0XHRcdGlkeCA9IHRhYnMuYWRkVGFiKHRpdGxlLCB7XG5cdFx0XHRcdFx0cmVtb3ZhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdGNvbnRyb2w6ICdicmVpemJvdC5hcHBUYWInLFxuXHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRhcHBVcmxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgaW5mbyA9IHRhYnMuZ2V0VGFiSW5mbyhpZHgpXG5cdFx0XHRcdGlmIChwYXJhbXMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0aW5mby5jdHJsSWZhY2Uuc2V0QXBwVXJsKGFwcFVybClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0YWJzLnNldFNlbGVjdGVkVGFiSW5kZXgoaWR4KVxuXG5cdFx0fVxuXG5cdFx0bm90aWZzU3J2LmdldE5vdGlmQ291bnQoKS50aGVuKHVwZGF0ZU5vdGlmcylcblxuXHRcdGZ1bmN0aW9uIGxvYWRBcHAoKSB7XG5cdFx0XHRzcnZBcHBzLmxpc3RBbGwoKS50aGVuKChhcHBzKSA9PiB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGFwcHNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cblx0XHRsb2FkQXBwKClcblxuXHRcdGdlb2xvYy5zdGFydFdhdGNoKClcblxuXHRcdHdha2Vsb2NrLnJlcXVlc3RXYWtlTG9jaygpXG5cblx0fVxufSk7XG4iLCJcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wYWdlcicsIHtcblxuXHRwcm9wczoge1xuXHRcdHJvb3RQYWdlOiAnJ1xuXHR9LFxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcInNob3dCYWNrXFxcIiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJsZWZ0XFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiQmFja1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkJhY2tcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1sZWZ0XFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCIgY2xhc3M9XFxcInRpdGxlXFxcIj48L3NwYW4+XFxuXHRcXG5cdDwvZGl2Plxcblx0PGRpdiBibi1lYWNoPVxcXCJidXR0b25zXFxcIiBjbGFzcz1cXFwicmlnaHRcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb246IG9uQWN0aW9uLCBjb250ZXh0bWVudWNoYW5nZS5tZW51OiBvbkNvbnRleHRNZW51XFxcIj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcInczLWJ1dHRvbiBhY3Rpb25cXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sYWJlbFxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7Y21kOiAkc2NvcGUuJGkubmFtZX1cXFwiIGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWlzRW5hYmxlZH1cXFwiPjwvYnV0dG9uPlxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInNob3cyXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIGFjdGlvblxcXCIgYm4tZGF0YT1cXFwie2NtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLnRpdGxlfVxcXCIgYm4tcHJvcD1cXFwie2Rpc2FibGVkOiAhaXNFbmFibGVkfVxcXCI+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInNob3czXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIG1lbnVcXFwiIFxcblx0XHRcdGJuLXByb3A9XFxcIntkaXNhYmxlZDogIWlzRW5hYmxlZH1cXFwiXFxuXHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiAkc2NvcGUuJGkuaXRlbXMsIHRyaWdnZXI6IFxcJ2xlZnRcXCcsIGNtZDogJHNjb3BlLiRpLm5hbWV9XFxcIlxcblx0XHRcdGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLnRpdGxlfVxcXCI+PGkgYm4tYXR0cj1cXFwie2NsYXNzOiAkc2NvcGUuJGkuaWNvbn1cXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0PC9kaXY+XHRcdFx0XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGJuLWJpbmQ9XFxcImNvbnRlbnRcXFwiIGNsYXNzPVxcXCJjb250ZW50XFxcIj48L2Rpdj5cIixcblxuXHQkaWZhY2U6IGBcblx0XHRwb3BQYWdlKGRhdGEpXG5cdFx0cHVzaFBhZ2UoY3RybE5hbWUsIG9wdGlvbnMpXG5cdFx0c2V0QnV0dG9uVmlzaWJsZShidXR0b25zVmlzaWJsZToge1tidXR0b25OYW1lXTpib29sZWFufSlcblx0XHRzZXRCdXR0b25FbmFibGVkKGJ1dHRvbnNFbmFibGVkOiB7W2J1dHRvbk5hbWVdOmJvb2xlYW59KVxuXHRgLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQpIHtcblxuXHRcdGNvbnN0IHsgcm9vdFBhZ2UgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2hvd0JhY2s6IGZhbHNlLFxuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGJ1dHRvbnM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zID09IHVuZGVmaW5lZCAmJiBzY29wZS4kaS5pY29uID09IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zID09IHVuZGVmaW5lZCAmJiBzY29wZS4kaS5pY29uICE9IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLml0ZW1zICE9IHVuZGVmaW5lZCAmJiAhKHNjb3BlLiRpLnZpc2libGUgPT09IGZhbHNlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0VuYWJsZWQoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuZW5hYmxlZCA9PSB1bmRlZmluZWQgfHwgc2NvcGUuJGkuZW5hYmxlZCA9PT0gdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQmFjazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25CYWNrJylcblx0XHRcdFx0XHRyZXN0b3JlUGFnZSh0cnVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdGNvbnN0IHBhZ2VDdHJsSWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0XHRcdGNvbnN0IGZuID0gY3VySW5mby5idXR0b25zW2NtZF0ub25DbGlja1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0Zm4uY2FsbChwYWdlQ3RybElmYWNlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHRjb25zdCBwYWdlQ3RybElmYWNlID0gY3VySW5mby5jdHJsLmlmYWNlKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZm4gPSBjdXJJbmZvLmJ1dHRvbnNbY21kXS5vbkNsaWNrXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRmbi5jYWxsKHBhZ2VDdHJsSWZhY2UsIGRhdGEuY21kKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBjb250ZW50ID0gY3RybC5zY29wZS5jb250ZW50XG5cdFx0Y29uc3Qgc3RhY2sgPSBbXVxuXHRcdGxldCBjdXJJbmZvID0gbnVsbFxuXG5cblx0XHRmdW5jdGlvbiByZXN0b3JlUGFnZShpc0JhY2ssIGRhdGEpIHtcblxuXHRcdFx0Y29uc3QgaWZhY2UgPSBjdXJJbmZvLmN0cmwuaWZhY2UoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygncG9wUGFnZScsIHBhZ2VDdHJsKVxuXHRcdFx0Y3VySW5mby5jdHJsLnNhZmVFbXB0eSgpLnJlbW92ZSgpXG5cblx0XHRcdGNvbnN0IHsgb25CYWNrLCBvblJldHVybiB9ID0gY3VySW5mb1xuXG5cdFx0XHRjdXJJbmZvID0gc3RhY2sucG9wKClcblx0XHRcdGN1ckluZm8uY3RybC5zaG93KClcblx0XHRcdGNvbnN0IHsgdGl0bGUsIGJ1dHRvbnMgfSA9IGN1ckluZm9cblx0XHRcdGN0cmwuc2V0RGF0YSh7IHNob3dCYWNrOiBzdGFjay5sZW5ndGggPiAwLCB0aXRsZSwgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJykgfSlcblxuXHRcdFx0aWYgKGlzQmFjaykge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdbcGFnZXJdIGJhY2snLCBpZmFjZS5uYW1lKVxuXHRcdFx0XHRpZiAodHlwZW9mIG9uQmFjayA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1twYWdlcl0gb25CYWNrJywgaWZhY2UubmFtZSlcblx0XHRcdFx0XHRvbkJhY2suY2FsbChpZmFjZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZW9mIG9uUmV0dXJuID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW3BhZ2VyXSBvblJldHVybicsIGlmYWNlLm5hbWUsIGRhdGEpXG5cdFx0XHRcdG9uUmV0dXJuLmNhbGwoaWZhY2UsIGRhdGEpXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHR0aGlzLnBvcFBhZ2UgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0cmV0dXJuIHJlc3RvcmVQYWdlKGZhbHNlLCBkYXRhKVxuXHRcdH1cblxuXHRcdHRoaXMucHVzaFBhZ2UgPSBmdW5jdGlvbiAoY3RybE5hbWUsIG9wdGlvbnMpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbcGFnZXJdIHB1c2hQYWdlJywgY3RybE5hbWUpXG5cblxuXHRcdFx0aWYgKGN1ckluZm8gIT0gbnVsbCkge1xuXHRcdFx0XHRjdXJJbmZvLmN0cmwuaGlkZSgpXG5cdFx0XHRcdHN0YWNrLnB1c2goY3VySW5mbylcblx0XHRcdH1cblxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuXHRcdFx0bGV0IHsgdGl0bGUsIHByb3BzLCBvblJldHVybiwgb25CYWNrLCBldmVudHMgfSA9IG9wdGlvbnNcblxuXHRcdFx0Y29uc3QgY29udHJvbCA9IGNvbnRlbnQuYWRkQ29udHJvbChjdHJsTmFtZSwgcHJvcHMsIGV2ZW50cylcblxuXHRcdFx0bGV0IGJ1dHRvbnMgPSB7fVxuXG5cdFx0XHRpZiAob3B0aW9ucy5idXR0b25zICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRidXR0b25zID0gb3B0aW9ucy5idXR0b25zXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc3QgZ2V0QnV0dG9ucyA9IGNvbnRyb2wuaWZhY2UoKS5nZXRCdXR0b25zXG5cdFx0XHRcdGlmICh0eXBlb2YgZ2V0QnV0dG9ucyA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0YnV0dG9ucyA9IGdldEJ1dHRvbnMoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN1ckluZm8gPSB7IHRpdGxlLCBidXR0b25zLCBvblJldHVybiwgb25CYWNrLCBjdHJsOiBjb250cm9sIH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgc2hvd0JhY2s6IHN0YWNrLmxlbmd0aCA+IDAsIHRpdGxlLCBidXR0b25zOiAkJC51dGlsLm9ialRvQXJyYXkoYnV0dG9ucywgJ25hbWUnKSB9KVxuXHRcdFx0cmV0dXJuIGNvbnRyb2wuaWZhY2UoKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0QnV0dG9uVmlzaWJsZSA9IGZ1bmN0aW9uIChidXR0b25zVmlzaWJsZSkge1xuXG5cdFx0XHRjb25zdCB7IGJ1dHRvbnMgfSA9IGN1ckluZm9cblxuXHRcdFx0Zm9yIChsZXQgYnRuIGluIGJ1dHRvbnNWaXNpYmxlKSB7XG5cdFx0XHRcdGlmIChidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdGJ1dHRvbnNbYnRuXS52aXNpYmxlID0gYnV0dG9uc1Zpc2libGVbYnRuXVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IGJ1dHRvbnM6ICQkLnV0aWwub2JqVG9BcnJheShidXR0b25zLCAnbmFtZScpIH0pXG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRCdXR0b25FbmFibGVkID0gZnVuY3Rpb24gKGJ1dHRvbnNFbmFibGVkKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZXRCdXR0b25FbmFibGVkJywgYnV0dG9uc0VuYWJsZWQpXG5cblx0XHRcdGNvbnN0IHsgYnV0dG9ucyB9ID0gY3VySW5mb1xuXG5cdFx0XHRpZiAodHlwZW9mIGJ1dHRvbnNFbmFibGVkID09PSAnYm9vbGVhbicpIHtcblx0XHRcdFx0Zm9yIChsZXQgYnRuIGluIGJ1dHRvbnMpIHtcblx0XHRcdFx0XHRidXR0b25zW2J0bl0uZW5hYmxlZCA9IGJ1dHRvbnNFbmFibGVkXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGZvciAobGV0IGJ0biBpbiBidXR0b25zRW5hYmxlZCkge1xuXHRcdFx0XHRcdGlmIChidG4gaW4gYnV0dG9ucykge1xuXHRcdFx0XHRcdFx0YnV0dG9uc1tidG5dLmVuYWJsZWQgPSBidXR0b25zRW5hYmxlZFtidG5dXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgYnV0dG9uczogJCQudXRpbC5vYmpUb0FycmF5KGJ1dHRvbnMsICduYW1lJykgfSlcblx0XHR9XG5cblx0XHR0aGlzLnB1c2hQYWdlKHJvb3RQYWdlKVxuXG5cdH1cblxufSk7XG5cblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5wZGYnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcIndhaXRcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT4gUmVuZGVyaW5nLi4uXFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwiIXdhaXRcXFwiPlxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJGaXRcXFwiIFxcblx0XHRcdGJuLWljb249XFxcImZhIGZhLWV4cGFuZFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uRml0XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJQcmludFxcXCIgXFxuXHRcdFx0Ym4taWNvbj1cXFwiZmEgZmEtcHJpbnRcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblByaW50XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdHRpdGxlPVxcXCJHbyB0byBQYWdlXFxcIiBcXG5cdFx0XHRibi1pY29uPVxcXCJmYSBmYS1yZXBseSBmYS1mbGlwLWhvcml6b250YWxcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkdvdG9QYWdlXFxcIj5cXG5cdFx0PC9idXR0b24+XHRcdFxcblx0PC9kaXY+XFxuXHQ8ZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJwYWdlc1xcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcInByZXZpb3VzIHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2UGFnZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+XFxuXHRcdFx0PC9idXR0b24+XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJuZXh0IHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0UGFnZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtYW5nbGUtcmlnaHRcXFwiPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdj5cXG5cdFx0XHRQYWdlczogPHNwYW4gYm4tdGV4dD1cXFwiY3VycmVudFBhZ2VcXFwiPjwvc3Bhbj4gLyA8c3BhbiBibi10ZXh0PVxcXCJudW1QYWdlc1xcXCI+PC9zcGFuPlx0XHRcXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cdFxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5wZGZcXFwiIFxcblx0Ym4tZGF0YT1cXFwie3dvcmtlcjogXFwnL2JyYWluanMvcGRmL3dvcmtlci5qc1xcJ31cXFwiXFxuXHRibi1pZmFjZT1cXFwicGRmXFxcIlxcblx0IFxcbj48L2Rpdj5cdFx0XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHR1cmw6ICcnXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Y29uc3QgeyB1cmwgfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bnVtUGFnZXM6IDAsXG5cdFx0XHRcdHRpdGxlOiAnJyxcblx0XHRcdFx0Y3VycmVudFBhZ2U6IDEsXG5cdFx0XHRcdHdhaXQ6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm51bVBhZ2VzID4gMSAmJiAhdGhpcy53YWl0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Hb3RvUGFnZTogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgcGFnZU5vID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0dvIHRvIFBhZ2UnLFxuXHRcdFx0XHRcdFx0bGFiZWw6ICdQYWdlIE51bWJlcicsXG5cdFx0XHRcdFx0XHRhdHRyczoge1xuXHRcdFx0XHRcdFx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHRcdFx0XHRcdFx0bWluOiAxLFxuXHRcdFx0XHRcdFx0XHRtYXg6IGN0cmwubW9kZWwubnVtUGFnZXMsXG5cdFx0XHRcdFx0XHRcdHN0ZXA6IDFcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9ICBhd2FpdCBwZGYuc2V0UGFnZShwYWdlTm8pXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlIH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUHJpbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHBkZi5wcmludCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTmV4dFBhZ2U6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTmV4dFBhZ2UnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50UGFnZSA9IGF3YWl0IHBkZi5uZXh0UGFnZSgpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudFBhZ2UsIHdhaXQ6IGZhbHNlIH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QcmV2UGFnZTogYXN5bmMgZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QcmV2UGFnZScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2FpdDogdHJ1ZSB9KVxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRQYWdlID0gYXdhaXQgcGRmLnByZXZQYWdlKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50UGFnZSwgd2FpdDogZmFsc2UgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkZpdDogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0cGRmLmZpdCgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7QnJhaW5qcy5Db250cm9scy5QZGYuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IHBkZiA9IGN0cmwuc2NvcGUucGRmXG5cblx0XHRhc3luYyBmdW5jdGlvbiBvcGVuRmlsZSh1cmwsIHRpdGxlKSB7XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhaXQ6IHRydWUgfSlcblxuXHRcdFx0Y29uc3QgbnVtUGFnZXMgPSBhd2FpdCBwZGYub3BlbkZpbGUodXJsKVxuXHRcdFx0Y29uc29sZS5sb2coJ2ZpbGUgbG9hZGVkJylcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRudW1QYWdlcyxcblx0XHRcdFx0d2FpdDogZmFsc2Vcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0aWYgKHVybCAhPSAnJykge1xuXHRcdFx0b3BlbkZpbGUodXJsKVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnc2V0RGF0YScsIGRhdGEpXG5cdFx0XHRpZiAoZGF0YS51cmwgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdG9wZW5GaWxlKGRhdGEudXJsKVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdHNldERhdGEoe3VybH0pXG5cdGBcblxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFwcE5hbWU6ICcnLFxuXHRcdGljb25DbHM6ICcnLFxuXHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJ1xuXHR9LFxuXG5cdC8vdGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInN0YXR1c1xcXCI+XFxuXHRcdFx0PHA+U3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbGwgYSBmcmllbmRcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0dGl0bGU9XFxcIkNhbmNlbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3cyXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInNob3czXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwic2hvdzRcXFwiIGJuLWJpbmQ9XFxcInBhbmVsXFxcIiBjbGFzcz1cXFwicGFuZWxcXFwiPjwvZGl2PlwiLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5SVEMuSW50ZXJmYWNlfSBydGMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2FwcE5hbWUsIGljb25DbHMsIHRpdGxlfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0ICRjaGlsZHJlbiA9IGVsdC5jaGlsZHJlbigpLnJlbW92ZSgpXG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0ZWx0LmFwcGVuZChcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzdGF0dXNcXFwiPlxcblx0XHRcdDxwPlN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGhvbmVcXFwiPjwvaT48L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93MlxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG48ZGl2IGJuLXNob3c9XFxcInNob3c0XFxcIiBibi1iaW5kPVxcXCJwYW5lbFxcXCIgY2xhc3M9XFxcInBhbmVsXFxcIj48L2Rpdj5cIilcblxuXHRcdHJ0Yy5vbignc3RhdHVzJywgKGRhdGEpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3N0YXR1cycsIGRhdGEpXG5cdFx0XHRjdHJsLnNldERhdGEoZGF0YSlcblx0XHR9KVx0XHRcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0XHRkaXN0YW50OiAnJyxcblx0XHRcdFx0aGFzQ2hpbGRyZW46ICRjaGlsZHJlbi5sZW5ndGggPiAwLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7IFxuXHRcdFx0XHRcdHJldHVybiBbJ3JlYWR5JywgJ2Rpc2Nvbm5lY3RlZCcsICdyZWZ1c2VkJywgJ2NhbmNlbGVkJ10uaW5jbHVkZXModGhpcy5zdGF0dXMpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2NhbGxpbmcnfSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJ30sXG5cdFx0XHRcdHNob3c0OiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcgJiYgdGhpcy5oYXNDaGlsZHJlbn1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNhbGwnKVxuXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dTZWxlY3Rpb246IHRydWVcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRidXR0b25zOiB7XG5cdFx0XHRcdFx0XHRcdGNhbGw6IHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0NhbGwnLFxuXHRcdFx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB0aGlzLmdldFNlbGVjdGlvbigpXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoc2VsZWN0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIGZyaWVuZCd9KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHtmcmllbmRVc2VyTmFtZSwgaXNDb25uZWN0ZWR9ID0gc2VsZWN0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlck5hbWUnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJywgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogYFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odXNlck5hbWUpIHtcblx0XHRcdFx0XHRcdFx0cnRjLmNhbGwodXNlck5hbWUsIGFwcE5hbWUsIGljb25DbHMpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUoKVxuXHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdydGNoYW5ndXAnKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRjdHJsLnNjb3BlLnBhbmVsLmFwcGVuZCgkY2hpbGRyZW4pXHRcdFxuXHR9XG5cbn0pOyIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5zZWFyY2hiYXInLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCIgYm4tYmluZD1cXFwiZm9ybVxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwic2VhcmNoXFxcIiBcXG4gICAgICAgIG5hbWU9XFxcInZhbHVlXFxcIiBcXG4gICAgICAgIGJuLWF0dHI9XFxcIntwbGFjZWhvbGRlciwgbWlubGVuZ3RoLCByZXF1aXJlZH1cXFwiXFxuXHRcdGF1dG9jb21wbGV0ZT1cXFwib2ZmXFxcIlxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0XFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My10ZXh0LWJsdWVcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCIgPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XCIsXG5cbiAgICBwcm9wczoge1xuICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgIG1pbmxlbmd0aDogMCxcbiAgICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCkge1xuXG4gICAgICAgIGNvbnN0IHsgcGxhY2Vob2xkZXIsIG1pbmxlbmd0aCwgcmVxdWlyZWQgfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXIsXG4gICAgICAgICAgICAgICAgbWlubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25TZWFyY2g6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdmFsdWUgfSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuICAgICAgICAgICAgICAgICAgICBlbHQudHJpZ2dlcignc2VhcmNoYmFyc3VibWl0JywgeyB2YWx1ZSB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGN0cmwuc2NvcGUuZm9ybS5zZXRGb3JtRGF0YSh7IHZhbHVlIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgICRpZmFjZTogYFxuICAgICAgICBzZXRWYWx1ZSh2YWx1ZTogc3RyaW5nKVxuICAgIGAsXG4gICAgJGV2ZW50czogJ3NlYXJjaGJhcnN1Ym1pdCdcbn0pOyAxMVxuIiwiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hZGRVc2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPlVzZXJOYW1lPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJ1c2VybmFtZVxcXCIgbmFtZT1cXFwidXNlcm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Qc2V1ZG88L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcInBzZXVkb1xcXCIgbmFtZT1cXFwicHNldWRvXFxcIiByZXF1aXJlZD5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+TG9jYXRpb248L2xhYmVsPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcImxvY2F0aW9uXFxcIiBuYW1lPVxcXCJsb2NhdGlvblxcXCIgcmVxdWlyZWQ+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsPC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBwbGFjZWhvbGRlcj1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiByZXF1aXJlZD5cdFxcblx0PC9kaXY+XFxuXHRcXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y3JlYXRlOiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdDcmVhdGUnLFxuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XG5cdFx0fVxuXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90LnVzZXJzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3Qubm90aWZzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25VcGRhdGVcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlVwZGF0ZVxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1yZWRvXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cdFxcblx0PGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkVXNlclxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIGJ0bkFkZFVzZXJcXFwiIHRpdGxlPVxcXCJBZGQgVXNlclxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyLXBsdXNcXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1zbWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyIGNsYXNzPVxcXCJ3My1ncmVlblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0aD5Vc2VyIE5hbWU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+UHNldWRvPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkxvY2F0aW9uPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkVtYWlsPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkNyZWF0ZSBEYXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkxhc3QgTG9naW4gRGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb25zPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJkYXRhXFxcIiBibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvbkRlbGV0ZSwgY2xpY2subm90aWY6IG9uTm90aWZcXFwiPlxcbiAgXHRcdFx0PHRyPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS51c2VybmFtZVxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkucHNldWRvXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5sb2NhdGlvblxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZW1haWxcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MVxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0XHQ8dGQ+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXNob3c9XFxcInNob3cyXFxcIj5cXG5cXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MlxcXCI+PC9zcGFuPjxicj5cXG5cdFx0XHRcdFx0XHRhdCBcXG5cdFx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0M1xcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8L3NwYW4+XFxuXHRcdFx0XHQ8L3RkPlxcblx0XHRcdFx0PHRkPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJkZWxldGUgdzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJEZWxldGUgVXNlclxcXCI+XFxuXHRcdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+XFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJub3RpZiB3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlbmQgTm90aWZpY2F0aW9uXFxcIj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYmVsbFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2J1dHRvbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0PC90cj4gICAgICBcdFxcblxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuVXNlci5BZG1pbkludGVyZmFjZX0gdXNlcnMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuTm90aWYuSW50ZXJmYWNlfSBub3RpZnNTcnYgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHVzZXJzLCBub3RpZnNTcnYsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmNyZWF0ZURhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MzogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHNjb3BlLiRpLmxhc3RMb2dpbkRhdGUpLnRvTG9jYWxlVGltZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmNyZWF0ZURhdGUgIT0gdW5kZWZpbmVkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSB1bmRlZmluZWQgJiYgc2NvcGUuJGkubGFzdExvZ2luRGF0ZSAhPSAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRVc2VyOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuYWRkVXNlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIFVzZXInLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGFzeW5jIGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0YXdhaXQgdXNlcnMuYWRkKGRhdGEpXG5cdFx0XHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7IHVzZXJuYW1lIH0gPSBjdHJsLm1vZGVsLmRhdGFbaWR4XVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHsgdGl0bGU6ICdEZWxldGUgVXNlcicsIGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPycgfSwgYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0YXdhaXQgdXNlcnMucmVtb3ZlKHVzZXJuYW1lKVxuXHRcdFx0XHRcdFx0Z2V0VXNlcnMoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTm90aWY6IGFzeW5jIGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyB1c2VybmFtZSB9ID0gY3RybC5tb2RlbC5kYXRhW2lkeF1cblx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IHRpdGxlOiAnU2VuZCBOb3RpZmljYXRpb24nLCBsYWJlbDogJ01lc3NhZ2UnIH0pXG5cdFx0XHRcdFx0aWYgKHRleHQgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0bm90aWZzU3J2LnNlbmROb3RpZih1c2VybmFtZSwgeyB0ZXh0IH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGdldFVzZXJzKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuXHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHVzZXJzLmxpc3QoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2dldFVzZXJzJywgZGF0YSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGRhdGEgfSlcblxuXHRcdH1cblxuXHRcdGdldFVzZXJzKClcblxuXG5cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3Qudmlld2VyJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4taWY9XFxcImlzSW1hZ2VcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcImltYWdlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5pbWFnZVxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcIntzcmM6IHVybH1cXFwiIFxcblx0XHRcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBibi1pZj1cXFwiaXNQZGZcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcInBkZlxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnBkZlxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInt1cmx9XFxcIiBcXG5cdFx0XFxuXHRcdHN0eWxlPVxcXCJoZWlnaHQ6IDEwMCVcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1pZj1cXFwiaXNBdWRpb1xcXCIgY2xhc3M9XFxcImF1ZGlvXFxcIj5cXG5cdDxhdWRpbyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIiBjb250cm9scz1cXFwiXFxcIiBjb250cm9sc0xpc3Q9bm9kb3dubG9hZD48L2F1ZGlvPlxcbjwvZGl2PlxcblxcbjxkaXYgYm4taWY9XFxcImlzVmlkZW9cXFwiIGNsYXNzPVxcXCJ2aWRlb1xcXCI+XFxuXHQ8dmlkZW8gYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCIgY29udHJvbHM9XFxcIlxcXCIgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC92aWRlbz5cXG48L2Rpdj5cXG5cXG48ZGl2IGJuLWlmPVxcXCJpc0RvY1xcXCIgY2xhc3M9XFxcImRvY1xcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHRcdDxkaXYgYm4tbG9hZD1cXFwidXJsXFxcIiBjbGFzcz1cXFwiaHRtbFxcXCI+PC9kaXY+XFxuXHQ8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdHR5cGU6ICcnLFxuXHRcdHVybDogJyMnXG5cdH0sXG5cdFxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGxldCB7dHlwZSwgdXJsfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dXJsLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRpc0ltYWdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy50eXBlID09ICdpbWFnZSdcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNQZGY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3BkZidcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNBdWRpbzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnYXVkaW8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzVmlkZW86IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnR5cGUgPT0gJ3ZpZGVvJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0RvYzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudHlwZSA9PSAnaGRvYydcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cblx0XHR0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW1ZpZXdlcl0gc2V0RGF0YScsIGRhdGEpXG5cdFx0XHRpZiAoZGF0YS51cmwpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHt1cmw6IGRhdGEudXJsfSlcblx0XHRcdH1cblx0XHR9XG5cblx0fVxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5hcHBEYXRhJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcmV0dXJucyBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0bGV0IF9kYXRhID0gY29uZmlnXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0RGF0YTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBfZGF0YVxuXHRcdFx0fSxcblxuXHRcdFx0c2F2ZURhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0X2RhdGEgPSBkYXRhXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvYXBwRGF0YScsIGRhdGEpXG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5hcHBzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bGlzdEFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2FwaS9hcHBzL2FsbCcpXG5cdFx0XHR9XHRcdFx0XG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYnJva2VyJywge1xuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuXHRcdGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuXHRcdGxldCBzb2NrID0gbnVsbFxuXHRcdGxldCBpc0Nvbm5lY3RlZCA9IGZhbHNlXG5cdFx0bGV0IHRyeVJlY29ubmVjdCA9IHRydWVcblx0XHRsZXQgaXNQaW5nT2sgPSB0cnVlXG5cdFx0Y29uc3QgdG9waWNzID0gbmV3IEV2ZW50RW1pdHRlcjIoeyB3aWxkY2FyZDogdHJ1ZSB9KVxuXHRcdGNvbnN0IHBpbmdJbnRlcnZhbCA9IDEwICogMTAwMFxuXHRcdGxldCB0aW1lb3V0SWQgPSBudWxsXG5cdFx0Y29uc3QgcmVnaXN0ZXJlZFRvcGljcyA9IHt9XG5cblx0XHRsZXQgeyBob3N0LCBwYXRobmFtZSwgcHJvdG9jb2wgfSA9IGxvY2F0aW9uXG5cdFx0cHJvdG9jb2wgPSAocHJvdG9jb2wgPT0gJ2h0dHA6JykgPyAnd3M6JyA6ICd3c3M6J1xuXG5cblx0XHRjb25zdCB1cmwgPSBgJHtwcm90b2NvbH0vLyR7aG9zdH0vaG1pJHtwYXRobmFtZX1gXG5cblx0XHRmdW5jdGlvbiBvbkNsb3NlKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25DbG9zZScpXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIERpc2Nvbm5lY3RlZCAhJylcblx0XHRcdFx0ZXZlbnRzLmVtaXQoJ2Nvbm5lY3RlZCcsIGZhbHNlKVxuXHRcdFx0fVxuXHRcdFx0aXNDb25uZWN0ZWQgPSBmYWxzZVxuXHRcdFx0aWYgKHRyeVJlY29ubmVjdCkge1xuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHsgY29ubmVjdCgpIH0sIDUwMDApXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2hlY2tQaW5nKCkge1xuXHRcdFx0dGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cblx0XHRcdFx0aWYgKCFpc1BpbmdPaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCd0aW1lb3V0IHBpbmcnKVxuXHRcdFx0XHRcdHNvY2sub25tZXNzYWdlID0gbnVsbFxuXHRcdFx0XHRcdHNvY2sub25jbG9zZSA9IG51bGxcblx0XHRcdFx0XHRzb2NrLmNsb3NlKClcblx0XHRcdFx0XHRvbkNsb3NlKClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpc1BpbmdPayA9IGZhbHNlXG5cdFx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdwaW5nJyB9KVxuXHRcdFx0XHRcdGNoZWNrUGluZygpXG5cdFx0XHRcdH1cblx0XHRcdH0sIHBpbmdJbnRlcnZhbClcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb25uZWN0KCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygndHJ5IHRvIGNvbm5lY3QuLi4nKVxuXG5cdFx0XHRzb2NrID0gbmV3IFdlYlNvY2tldCh1cmwpXG5cblx0XHRcdHNvY2sub25vcGVuID0gKCkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkNvbm5lY3RlZCB0byBicm9rZXJcIilcblx0XHRcdFx0aXNDb25uZWN0ZWQgPSB0cnVlXG5cdFx0XHRcdGlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHRldmVudHMuZW1pdCgnY29ubmVjdGVkJywgdHJ1ZSlcblx0XHRcdFx0Y2hlY2tQaW5nKClcblxuXHRcdFx0fVxuXG5cblx0XHRcdHNvY2sub25tZXNzYWdlID0gKGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXYuZGF0YSlcblxuXHRcdFx0XHRpZiAoZXYuY3VycmVudFRhcmdldCAhPSBzb2NrKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1ticm9rZXJdIG1lc3NhZ2UgYmFkIHRhcmdldCcsIG1zZy50eXBlKVxuXHRcdFx0XHRcdGV2LmN1cnJlbnRUYXJnZXQuY2xvc2UoKVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIG1lc3NhZ2UnLCBtc2cpXG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdyZWFkeScpIHtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyhyZWdpc3RlcmVkVG9waWNzKS5mb3JFYWNoKCh0b3BpYykgPT4ge1xuXHRcdFx0XHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdyZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGV2ZW50cy5lbWl0KCdyZWFkeScsIHsgY2xpZW50SWQ6IG1zZy5jbGllbnRJZCB9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdwb25nJykge1xuXHRcdFx0XHRcdGlzUGluZ09rID0gdHJ1ZVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1zZy50eXBlID09ICdub3RpZicpIHtcblx0XHRcdFx0XHR0b3BpY3MuZW1pdChtc2cudG9waWMsIG1zZylcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChtc2cudHlwZSA9PSAnZXJyb3InKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1tCcm9rZXJdIGxvZycsIG1zZy50ZXh0KVxuXHRcdFx0XHRcdHRyeVJlY29ubmVjdCA9IGZhbHNlXG5cdFx0XHRcdFx0c29jay5jbG9zZSgpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRzb2NrLm9uY2xvc2UgPSAoZXYpID0+IHtcblx0XHRcdFx0aWYgKGV2LmN1cnJlbnRUYXJnZXQgIT0gc29jaykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdbYnJva2VyXSBjbG9zZSBiYWQgdGFyZ2V0Jylcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnW2Jyb2tlcl0gY2xvc2UnKVxuXHRcdFx0XHRpZiAodGltZW91dElkICE9IG51bGwpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZW91dElkKVxuXHRcdFx0XHRcdHRpbWVvdXRJZCA9IG51bGxcblx0XHRcdFx0fVxuXHRcdFx0XHRvbkNsb3NlKClcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNlbmRNc2cobXNnKSB7XG5cdFx0XHRtc2cudGltZSA9IERhdGUubm93KClcblx0XHRcdGNvbnN0IHRleHQgPSBKU09OLnN0cmluZ2lmeShtc2cpXG5cdFx0XHRpZiAoaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnW0Jyb2tlcl0gc2VuZE1zZycsIG1zZylcblx0XHRcdFx0c29jay5zZW5kKHRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW1pdFRvcGljKHRvcGljLCBkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbQnJva2VyXSBlbWl0VG9waWMnLCB0b3BpYywgZGF0YSlcblx0XHRcdGNvbnN0IG1zZyA9IHtcblx0XHRcdFx0dHlwZTogJ25vdGlmJyxcblx0XHRcdFx0dG9waWMsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH1cblxuXHRcdFx0c2VuZE1zZyhtc2cpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb25Ub3BpYyh0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdHRvcGljcy5vbih0b3BpYywgY2FsbGJhY2spXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb2ZmVG9waWModG9waWMsIGNhbGxiYWNrKSB7XG5cdFx0XHR0b3BpY3Mub2ZmKHRvcGljLCBjYWxsYmFjaylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ1tCcm9rZXJdIHJlZ2lzdGVyJywgdG9waWMpXG5cdFx0XHRpZiAocmVnaXN0ZXJlZFRvcGljc1t0b3BpY10gPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID0gMVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdKys7XG5cdFx0XHR9XG5cdFx0XHR0b3BpY3Mub24odG9waWMsIGNhbGxiYWNrKVxuXHRcdFx0c2VuZE1zZyh7IHR5cGU6ICdyZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdW5yZWdpc3Rlcih0b3BpYywgY2FsbGJhY2spIHtcblxuXHRcdFx0dG9waWNzLm9mZih0b3BpYywgY2FsbGJhY2spXG5cblx0XHRcdGlmICgtLXJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdID09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHJlZ2lzdGVyZWRUb3BpY3NbdG9waWNdXG5cdFx0XHRcdHNlbmRNc2coeyB0eXBlOiAndW5yZWdpc3RlcicsIHRvcGljIH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29ubmVjdCgpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0ZW1pdFRvcGljLFxuXHRcdFx0b25Ub3BpYyxcblx0XHRcdG9mZlRvcGljLFxuXHRcdFx0cmVnaXN0ZXIsXG5cdFx0XHR1bnJlZ2lzdGVyLFxuXHRcdFx0b246IGV2ZW50cy5vbi5iaW5kKGV2ZW50cylcblxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmNpdGllcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgaHR0cFNydikge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NpdGllcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0Q291bnRyaWVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvY291bnRyaWVzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGllczogZnVuY3Rpb24oY291bnRyeSwgc2VhcmNoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jaXRpZXMnLCB7Y291bnRyeSwgc2VhcmNofSlcblx0XHRcdH0sXG5cblx0XHRcdGdldENpdGVzRnJvbVBvc3RhbENvZGU6IGFzeW5jIGZ1bmN0aW9uKHBvc3RhbENvZGUpIHtcblx0XHRcdFx0Y29uc3QgdXJsID0gJ2h0dHBzOi8vYXBpY2FydG8uaWduLmZyL2FwaS9jb2Rlcy1wb3N0YXV4L2NvbW11bmVzLycgKyBwb3N0YWxDb2RlXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IGh0dHBTcnYuZ2V0KHVybClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0XHRyZXR1cm4gaW5mby5tYXAoKGkpID0+IGkubGliZWxsZUFjaGVtaW5lbWVudClcdFxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gW11cblx0XHRcdFx0fVxuXHRcblx0XHRcdH1cblxuXG5cdFx0XHRcblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5jb250YWN0cycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2NvbnRhY3RzJylcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdGFkZENvbnRhY3Q6IGZ1bmN0aW9uIChpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRDb250YWN0YCwgaW5mbylcblx0XHRcdH0sXG5cdFx0XHRnZXRDb250YWN0czogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRDb250YWN0c2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVDb250YWN0OiBmdW5jdGlvbiAoY29udGFjdElkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZUNvbnRhY3QvJHtjb250YWN0SWR9YClcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZUNvbnRhY3RJbmZvOiBmdW5jdGlvbiAoY29udGFjdElkLCBpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC91cGRhdGVDb250YWN0SW5mby8ke2NvbnRhY3RJZH1gLCBpbmZvKVxuXHRcdFx0fVxuXHRcdFx0XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5kaXNwbGF5Jywge1xuXG4gICAgZGVwczogWydicmVpemJvdC5wYXJhbXMnXSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHBhcmFtcykge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuICAgICAgICBjb25zdCBwcmVzZW50YXRpb25SZXF1ZXN0ID0gbmV3IFByZXNlbnRhdGlvblJlcXVlc3QoJCQudXJsLmdldFVybFBhcmFtcygnL2FwcHMvY2FzdCcsIHsgaWQ6IHBhcmFtcy4kaWQgfSkpXG4gICAgICAgIGxldCBwcmVzZW50YXRpb25Db25uZWN0aW9uID0gbnVsbFxuXG4gICAgICAgIHByZXNlbnRhdGlvblJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGlvbmF2YWlsYWJsZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb25hdmFpbGFibGUnLCBldmVudClcbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24gPSBldmVudC5jb25uZWN0aW9uXG5cbiAgICAgICAgICAgIHByZXNlbnRhdGlvbkNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ21lc3NhZ2UnLCBldmVudC5kYXRhKVxuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSlcbiAgICAgICAgICAgICAgICBzd2l0Y2gobXNnLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVhZHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3JlYWR5JylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2V2ZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KG1zZy5uYW1lLCBtc2cudmFsdWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcHJlc2VudGF0aW9uQ29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCd0ZXJtaW5hdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnY2xvc2UnKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ2Nvbm5lY3Rpb25hdmFpbGFibGUnKVxuICAgICAgICB9KVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGdldEF2YWlsYWJpbGl0eSgpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IHByZXNlbnRhdGlvblJlcXVlc3QuZ2V0QXZhaWxhYmlsaXR5KClcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0F2YWlsYWJsZSBwcmVzZW50YXRpb24gZGlzcGxheXM6ICcgKyBhdmFpbGFiaWxpdHkudmFsdWUpXG5cbiAgICAgICAgICAgIGF2YWlsYWJpbGl0eS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJz4gQXZhaWxhYmxlIHByZXNlbnRhdGlvbiBkaXNwbGF5czogJyArIGF2YWlsYWJpbGl0eS52YWx1ZSlcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnYXZhaWxhYmlsaXR5JywgYXZhaWxhYmlsaXR5LnZhbHVlKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IGF3YWl0IHByZXNlbnRhdGlvblJlcXVlc3Quc3RhcnQoKVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLnRlcm1pbmF0ZSgpXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VuZE1zZyhtc2cpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NlbmRNc2cnLCBtc2cpXG4gICAgICAgICAgICBwcmVzZW50YXRpb25Db25uZWN0aW9uLnNlbmQoSlNPTi5zdHJpbmdpZnkobXNnKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldFVybCh1cmwpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAndXJsJywgdXJsIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRWb2x1bWUodm9sdW1lKSB7XG4gICAgICAgICAgICBzZW5kTXNnKHsgdHlwZTogJ3ZvbHVtZScsIHZvbHVtZSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0Q3VycmVudFRpbWUoY3VycmVudFRpbWUpIHtcbiAgICAgICAgICAgIHNlbmRNc2coeyB0eXBlOiAnY3VycmVudFRpbWUnLCBjdXJyZW50VGltZSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcGxheSgpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdwbGF5J30pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwYXVzZSgpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdwYXVzZSd9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNTdGFydGVkKCkge1xuICAgICAgICAgICAgcmV0dXJuIChwcmVzZW50YXRpb25Db25uZWN0aW9uICE9IG51bGwpXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmFibGVLYXJhb2tlKGVuYWJsZWQpIHtcbiAgICAgICAgICAgIHNlbmRNc2coe3R5cGU6ICdlbmFibGVLYXJhb2tlJywgZW5hYmxlZH0pXG4gICAgICAgIH1cblxuICAgICAgICBnZXRBdmFpbGFiaWxpdHkoKVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgY2xvc2UsXG4gICAgICAgICAgICBpc1N0YXJ0ZWQsXG4gICAgICAgICAgICBzZXRVcmwsXG4gICAgICAgICAgICBzZXRWb2x1bWUsXG4gICAgICAgICAgICBzZXRDdXJyZW50VGltZSxcbiAgICAgICAgICAgIHBsYXksXG4gICAgICAgICAgICBwYXVzZSxcbiAgICAgICAgICAgIGVuYWJsZUthcmFva2VcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5maWxlcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZywgcmVzb3VyY2UsIHBhcmFtcykge1xuXHRcdC8qKkB0eXBlIHtCcmFpbmpzLlNlcnZpY2VzLkh0dHAuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9maWxlcycpXG5cblx0XHRjb25zdCBzYXZpbmdEbGcgPSAkJC51aS5wcm9ncmVzc0RpYWxvZygpXG5cblxuXHRcdHJldHVybiB7XG5cdFx0XHRmaWxlSW5mbzogZnVuY3Rpb24gKGZpbGVQYXRoLCBmcmllbmRVc2VyLCBvcHRpb25zKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGZpbGVJbmZvJywgZmlsZVBhdGgsIGZyaWVuZFVzZXIsIG9wdGlvbnMpXG5cblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2ZpbGVJbmZvJywgeyBmaWxlUGF0aCwgZnJpZW5kVXNlciwgb3B0aW9ucyB9KVxuXHRcdFx0fSxcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uIChkZXN0UGF0aCwgb3B0aW9ucywgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgZGVzdFBhdGgpXG5cblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2xpc3QnLCB7IGRlc3RQYXRoLCBvcHRpb25zLCBmcmllbmRVc2VyIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRmaWxlVXJsOiBmdW5jdGlvbiAoZmlsZU5hbWUsIGZyaWVuZFVzZXIpIHtcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHsgZmlsZU5hbWUsIGZyaWVuZFVzZXIgfSlcblx0XHRcdH0sXG5cblx0XHRcdGZpbGVBcHBVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRcdGZpbGVOYW1lID0gYC9hcHBzLyR7cGFyYW1zLiRhcHBOYW1lfS8ke2ZpbGVOYW1lfWBcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZCcsIHsgZmlsZU5hbWUgfSlcblx0XHRcdH0sXG5cblx0XHRcdGZpbGVUaHVtYm5haWxVcmw6IGZ1bmN0aW9uIChmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0XHRyZXR1cm4gJCQudXJsLmdldFVybFBhcmFtcygnL2FwaS9maWxlcy9sb2FkVGh1bWJuYWlsJywgeyBmaWxlTmFtZSwgc2l6ZSwgZnJpZW5kVXNlciB9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZmlsZUFwcFRodW1ibmFpbFVybDogZnVuY3Rpb24gKGZpbGVOYW1lLCBzaXplKSB7XG5cdFx0XHRcdGZpbGVOYW1lID0gYC9hcHBzLyR7cGFyYW1zLiRhcHBOYW1lfS8ke2ZpbGVOYW1lfWBcblx0XHRcdFx0cmV0dXJuICQkLnVybC5nZXRVcmxQYXJhbXMoJy9hcGkvZmlsZXMvbG9hZFRodW1ibmFpbCcsIHsgZmlsZU5hbWUsIHNpemUgfSlcblx0XHRcdH0sXG5cblx0XHRcdGFzc2V0c1VybDogZnVuY3Rpb24oZmlsZU5hbWUpICB7XG5cdFx0XHRcdHJldHVybiAgYC93ZWJhcHBzLyR7cGFyYW1zLiRhcHBOYW1lfS9hc3NldHMvJHtmaWxlTmFtZX1gXG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFxuXHRcdFx0ICogQHBhcmFtIHtCbG9ifSBibG9iIFxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHNhdmVBc2ZpbGVOYW1lIFxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IGRlc3RQYXRoIFxuXHRcdFx0ICogQHBhcmFtIHtib29sZWFufSBjaGVja0V4aXN0c1xuXHRcdFx0ICogQHBhcmFtIHsqfSBvblVwbG9hZFByb2dyZXNzIFxuXHRcdFx0ICogQHJldHVybnMgXG5cdFx0XHQgKi9cblx0XHRcdHVwbG9hZEZpbGU6IGFzeW5jIGZ1bmN0aW9uIChibG9iLCBzYXZlQXNmaWxlTmFtZSwgZGVzdFBhdGgsIGNoZWNrRXhpc3RzLCBvblVwbG9hZFByb2dyZXNzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVwbG9hZEZpbGUnLCBjaGVja0V4aXN0cywgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoKVxuXHRcdFx0XHRpZiAoIShibG9iIGluc3RhbmNlb2YgQmxvYikpIHtcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oJ0ZpbGUgZm9ybWF0IG5vdCBzdXBwb3J0ZWQnKVxuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGNoZWNrRXhpc3RzKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuZmlsZUluZm8oZGVzdFBhdGggKyAnLycgKyBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBhbHJlYWR5IGV4aXN0cycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgZmQgPSBuZXcgRm9ybURhdGEoKVxuXHRcdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdFx0ZmQuYXBwZW5kKCdkZXN0UGF0aCcsIGRlc3RQYXRoKVxuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0Rm9ybURhdGEoJy9zYXZlJywgZmQsIG9uVXBsb2FkUHJvZ3Jlc3MpXG5cblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYmxvYicsIGJsb2IpXG5cblx0XHRcdH0sXG5cblx0XHRcdHNhdmVGaWxlOiBhc3luYyBmdW5jdGlvbiAoYmxvYiwgc2F2ZUFzZmlsZU5hbWUsIGNoZWNrRXhpc3RzID0gZmFsc2UpIHtcblx0XHRcdFx0Y29uc3QgZGVzdFBhdGggID0gYC9hcHBzLyR7cGFyYW1zLiRhcHBOYW1lfWBcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRzYXZpbmdEbGcuc2V0UGVyY2VudGFnZSgwKVxuXHRcdFx0XHRcdHNhdmluZ0RsZy5zaG93KClcblx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgdGhpcy51cGxvYWRGaWxlKGJsb2IsIHNhdmVBc2ZpbGVOYW1lLCBkZXN0UGF0aCwgY2hlY2tFeGlzdHMsICh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdFx0c2F2aW5nRGxnLnNldFBlcmNlbnRhZ2UodmFsdWUpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRhd2FpdCAkJC51dGlsLndhaXQoMTAwMClcblx0XHRcdFx0XHRzYXZpbmdEbGcuaGlkZSgpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWVcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvcicsIGUpXG5cdFx0XHRcdFx0c2F2aW5nRGxnLmhpZGUoKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0IHx8IGVcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH1cblx0fVxuXG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL2ZyaWVuZHMnKVxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0Z2V0RnJpZW5kczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9nZXRGcmllbmRzYClcblx0XHRcdH0sXG5cblx0XHRcdGdldEZyaWVuZEluZm86IGZ1bmN0aW9uIChmcmllbmQpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2dldEZyaWVuZEluZm8nLCB7IGZyaWVuZCB9KVxuXHRcdFx0fSxcblxuXHRcdFx0c2V0RnJpZW5kSW5mbzogZnVuY3Rpb24gKGZyaWVuZCwgZ3JvdXBzLCBwb3NpdGlvbkF1dGgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3NldEZyaWVuZEluZm8nLCB7IGZyaWVuZCwgZ3JvdXBzLCBwb3NpdGlvbkF1dGggfSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZEZyaWVuZDogZnVuY3Rpb24gKGZyaWVuZFVzZXJOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRGcmllbmRgLCB7IGZyaWVuZFVzZXJOYW1lIH0pXG5cdFx0XHR9XG5cblxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LmZ1bGxzY3JlZW4nLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cblxuICAgICAgICBmdW5jdGlvbiBpbml0KGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLCBlID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlJykgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgIT0gbnVsbClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJmdWxsc2NyZWVuY2hhbmdlXCIsIGUgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2Z1bGxzY3JlZW5jaGFuZ2UnKVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICE9IG51bGwpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdrZXlkb3duJywgZS5rZXkpXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5ID09IFwiRjExXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbnRlcigpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3RGdWxsc2NyZWVuID0gZWxlbS5yZXF1ZXN0RnVsbHNjcmVlbiB8fFxuICAgICAgICAgICAgICAgIGVsZW0ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW5cblxuICAgICAgICAgICAgaWYgKHJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdEZ1bGxzY3JlZW4uY2FsbChlbGVtKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBleGl0KCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKVxuICAgICAgICB9XG5cblxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbml0LFxuICAgICAgICAgICAgZW50ZXIsXG4gICAgICAgICAgICBleGl0XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuZ2VvbG9jJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvcG9zaXRpb24nKVxuXG5cblx0XHRsZXQgY29vcmRzID0gbnVsbFxuXG5cdFx0ZnVuY3Rpb24gZ2VvRXJyb3IoZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2dlb2xvYyBlcnJvcjonLCBlKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZUxvY2F0aW9uKHBvc2l0aW9uKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCd1cGRhdGVMb2NhdGlvbicsIHBvc2l0aW9uKVxuXHRcdFx0Y29vcmRzID0gcG9zaXRpb24uY29vcmRzXG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBzdGFydFdhdGNoKCkge1xuXG5cdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKHVwZGF0ZUxvY2F0aW9uKVxuXG5cdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24ud2F0Y2hQb3NpdGlvbih1cGRhdGVMb2NhdGlvbiwgZ2VvRXJyb3IsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRlbmFibGVIaWdoQWNjdXJhY3k6IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0KVx0XG5cblx0XHRcdHNldEludGVydmFsKHNlbmRQb3NpdGlvbiwgMzAgKiAxMDAwKSAvLyBldmVyeSAzMCBzZWNcblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIHNlbmRQb3NpdGlvbigpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3NlbmRQb3NpdGlvbicsIGNvb3Jkcylcblx0XHRcdGlmIChjb29yZHMgIT0gbnVsbCkge1xuXHRcdFx0XHRodHRwLnBvc3QoJy9wb3NpdGlvbicsIHtcblx0XHRcdFx0XHRsYXQ6IGNvb3Jkcy5sYXRpdHVkZSxcblx0XHRcdFx0XHRsbmc6IGNvb3Jkcy5sb25naXR1ZGVcblx0XHRcdFx0fSlcblxuXHRcdFx0fVxuXHRcdH1cdFx0XG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHRzdGFydFdhdGNoXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuaHR0cCcsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCByZXNvdXJjZSwgcGFyYW1zKSB7XG5cblx0XHRyZXR1cm4gcmVzb3VyY2UoYC9hcGkvYXBwLyR7cGFyYW1zLiRhcHBOYW1lfWApXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90Lm5vdGlmcycsIHtcblxuXHRkZXBzOiBbJ2JyYWluanMucmVzb3VyY2UnXSxcblxuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnLCByZXNvdXJjZSkge1xuXG5cdFx0Y29uc3QgaHR0cCA9IHJlc291cmNlKCcvYXBpL25vdGlmcycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VuZE5vdGlmOiBmdW5jdGlvbiAodG8sIG5vdGlmKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZW5kTm90aWZgLCB7IHRvLCBub3RpZiB9KVxuXHRcdFx0fSxcblxuXHRcdFx0cmVtb3ZlTm90aWY6IGZ1bmN0aW9uIChub3RpZklkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmRlbGV0ZShgL3JlbW92ZU5vdGlmLyR7bm90aWZJZH1gKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0Tm90aWZzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXROb3RpZkNvdW50OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldChgL2dldE5vdGlmQ291bnRgKVxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QucGFnZXInLCB7XG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG5cblx0XHRyZXR1cm4gJCgnLmJyZWl6Ym90UGFnZXInKS5pZmFjZSgpXG5cdH1cblxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnBhcmFtcycsIHtcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcpIHtcblxuXHRcdHJldHVybiAodHlwZW9mIGNvbmZpZyA9PSAnc3RyaW5nJykgPyBKU09OLnBhcnNlKGNvbmZpZykgOiB7fVxuXHR9XG59KTtcbiIsIi8vQHRzLWNoZWNrXG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5ydGMnLCB7XG5cblx0ZGVwczogWydicmFpbmpzLmh0dHAnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIGh0dHAsIGJyb2tlciwgcGFyYW1zKSB7XG5cblx0XHRjb25zdCBldmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyMigpXG5cblx0XHRjb25zdCBwcml2YXRlID0ge1xuXHRcdFx0c3JjSWQ6IG51bGwsXG5cdFx0XHRkZXN0SWQ6IG51bGwsXG5cdFx0XHRkaXN0YW50OiAnJyxcblx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdGlzQ2FsbGVlOiBmYWxzZVxuXHRcdH1cblxuXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHRwcml2YXRlLmRpc3RhbnQgPSBwYXJhbXMuY2FsbGVyXG5cdFx0XHRwcml2YXRlLmRlc3RJZCA9IHBhcmFtcy5jbGllbnRJZFxuXHRcdFx0cHJpdmF0ZS5pc0NhbGxlZSA9IHRydWVcblx0XHR9XG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKG1zZykgPT4ge1xuXHRcdFx0cHJpdmF0ZS5zcmNJZCA9IG1zZy5jbGllbnRJZFxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc3JjSWQnLCBtc2cuY2xpZW50SWQpXG5cdFx0XHRldmVudHMuZW1pdCgncmVhZHknKVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFjY2VwdCcsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjYW5jZWwoZmFsc2UpXG5cdFx0XHRwcml2YXRlLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRldmVudHMuZW1pdCgnYWNjZXB0Jylcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ3JlZnVzZWQnXG5cdFx0XHRjYW5jZWwoZmFsc2UpXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdGV2ZW50cy5lbWl0KCdkZW55JylcblxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmJ5ZScsIChtc2cpID0+IHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdkaXNjb25uZWN0ZWQnXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdGV2ZW50cy5lbWl0KCdieWUnKVxuXG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gZ2V0UmVtb3RlQ2xpZW50SWQoKSB7XG5cdFx0XHRyZXR1cm4gcHJpdmF0ZS5kZXN0SWRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwcm9jZXNzQ2FsbCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBwcm9jZXNzQ2FsbCcpXG5cdFx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5jYWxsJywgKG1zZykgPT4ge1xuXHRcdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0XHRwcml2YXRlLmRlc3RJZCA9IG1zZy5zcmNJZFxuXHRcdFx0XHRldmVudHMuZW1pdCgnY2FsbCcsIG1zZy5kYXRhKVxuXHRcdFx0fSlcblxuXHRcdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FuY2VsJywgKG1zZykgPT4ge1xuXHRcdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0XHRldmVudHMuZW1pdCgnY2FuY2VsJylcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb25EYXRhKG5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLicgKyBuYW1lLCAobXNnKSA9PiB7XG5cdFx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKG1zZy5kYXRhLCBtc2cudGltZSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW1pdFN0YXR1cygpIHtcblx0XHRcdGV2ZW50cy5lbWl0KCdzdGF0dXMnLCB7IHN0YXR1czogcHJpdmF0ZS5zdGF0dXMsIGRpc3RhbnQ6IHByaXZhdGUuZGlzdGFudCB9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNhbGwodG8sIGFwcE5hbWUsIGljb25DbHMpIHtcblx0XHRcdHByaXZhdGUuZGlzdGFudCA9IHRvXG5cdFx0XHRwcml2YXRlLnN0YXR1cyA9ICdjYWxsaW5nJ1xuXHRcdFx0ZW1pdFN0YXR1cygpXG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYXBpL3J0Yy9zZW5kVG9Vc2VyYCwge1xuXHRcdFx0XHR0byxcblx0XHRcdFx0c3JjSWQ6IHByaXZhdGUuc3JjSWQsXG5cdFx0XHRcdHR5cGU6ICdjYWxsJyxcblx0XHRcdFx0ZGF0YTogeyBhcHBOYW1lLCBpY29uQ2xzIH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuY2VsKHVwZGF0ZVN0YXR1cyA9IHRydWUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBjYW5jZWwnLCB1cGRhdGVTdGF0dXMpXG5cdFx0XHRpZiAodXBkYXRlU3RhdHVzKSB7XG5cdFx0XHRcdHByaXZhdGUuc3RhdHVzID0gJ2NhbmNlbGVkJ1xuXHRcdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdH1cblx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvcnRjL3NlbmRUb1VzZXJgLCB7IHRvOiBwcml2YXRlLmRpc3RhbnQsIHNyY0lkOiBwcml2YXRlLnNyY0lkLCB0eXBlOiAnY2FuY2VsJyB9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGFjY2VwdCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBhY2NlcHQnKVxuXG5cdFx0XHRlbWl0U3RhdHVzKClcblx0XHRcdHJldHVybiBzZW5kRGF0YSgnYWNjZXB0Jylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBkZW55KCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tSVENdIGRlbnknKVxuXG5cdFx0XHRyZXR1cm4gc2VuZERhdGEoJ2RlbnknKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGJ5ZSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbUlRDXSBieWUnKVxuXG5cdFx0XHRpZiAocHJpdmF0ZS5zdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcblx0XHRcdFx0cHJpdmF0ZS5zdGF0dXMgPSAncmVhZHknXG5cdFx0XHRcdHByaXZhdGUuZGlzdGFudCA9ICcnXG5cdFx0XHRcdGVtaXRTdGF0dXMoKVxuXHRcdFx0XHRyZXR1cm4gc2VuZERhdGEoJ2J5ZScpXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGV4aXQoKSB7XG5cdFx0XHRpZiAocHJpdmF0ZS5zdGF0dXMgPT0gJ2NhbGxpbmcnKSB7XG5cdFx0XHRcdHJldHVybiBjYW5jZWwoKVxuXHRcdFx0fVxuXHRcdFx0aWYgKHByaXZhdGUuc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XG5cdFx0XHRcdHJldHVybiBieWUoKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VuZERhdGEodHlwZSwgZGF0YSkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FwaS9ydGMvc2VuZFRvQ2xpZW50YCwge1xuXHRcdFx0XHRkZXN0SWQ6IHByaXZhdGUuZGVzdElkLFxuXHRcdFx0XHRzcmNJZDogcHJpdmF0ZS5zcmNJZCxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0ZGF0YVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc0NhbGxlZSgpIHtcblx0XHRcdHJldHVybiBwcml2YXRlLmlzQ2FsbGVlXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGNhbGwsXG5cdFx0XHRjYW5jZWwsXG5cdFx0XHRkZW55LFxuXHRcdFx0YnllLFxuXHRcdFx0c2VuZERhdGEsXG5cdFx0XHRvbkRhdGEsXG5cdFx0XHRvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcblx0XHRcdHByb2Nlc3NDYWxsLFxuXHRcdFx0Z2V0UmVtb3RlQ2xpZW50SWQsXG5cdFx0XHRleGl0LFxuXHRcdFx0YWNjZXB0LFxuXHRcdFx0aXNDYWxsZWVcblxuXHRcdH1cblx0fVxufSk7XG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3Quc2NoZWR1bGVyJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0b3BlbkFwcDogZnVuY3Rpb24oYXBwTmFtZSwgYXBwUGFyYW1zKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIG9wZW5BcHAnLCBhcHBOYW1lLCBhcHBQYXJhbXMpXG5cdFx0XHRcdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHR5cGU6ICdvcGVuQXBwJyxcblx0XHRcdFx0XHQgZGF0YToge2FwcE5hbWUsIGFwcFBhcmFtc31cblx0XHRcdFx0XHR9LCBsb2NhdGlvbi5ocmVmKVxuXG5cdFx0XHR9LFxuXHRcdFx0bG9nb3V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tzY2hlZHVsZXJdIGxvZ291dCcpXG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvbG9nb3V0Jylcblx0XHRcdH1cdFx0IFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnNvbmdzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgcmVzb3VyY2UpIHtcblxuXHRcdGNvbnN0IGh0dHAgPSByZXNvdXJjZSgnL2FwaS9zb25ncycpXG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2VuZXJhdGVEYjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9nZW5lcmF0ZURiJylcblx0XHRcdH1cblx0XHRcdFxuXHRcdH1cblx0fVxufSk7XG4iLCIvL0B0cy1jaGVja1xuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2JyZWl6Ym90LnVzZXJzJywge1xuXG5cdGRlcHM6IFsnYnJhaW5qcy5yZXNvdXJjZSddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcsIHJlc291cmNlKSB7XG5cblx0XHRjb25zdCBodHRwID0gcmVzb3VyY2UoJy9hcGkvdXNlcnMnKVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGxpc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJylcblx0XHRcdH0sXG5cblx0XHRcdG1hdGNoOiBmdW5jdGlvbiAobWF0Y2gpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvJywgeyBtYXRjaCB9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvJywgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdHJlbW92ZTogZnVuY3Rpb24gKHVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvJHt1c2VyfWApXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGU6IGZ1bmN0aW9uICh1c2VyLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnB1dChgLyR7dXNlcn1gLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAodXNlcikge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC8ke3VzZXJ9YClcblx0XHRcdH0sXG5cblx0XHRcdGFjdGl2YXRlQXBwOiBmdW5jdGlvbiAoYXBwTmFtZSwgYWN0aXZhdGVkKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hY3RpdmF0ZUFwcGAsIHsgYXBwTmFtZSwgYWN0aXZhdGVkIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjaGFuZ2VQd2Q6IGZ1bmN0aW9uIChuZXdQd2QpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2NoYW5nZVB3ZGAsIHsgbmV3UHdkIH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2dldFVzZXJTZXR0aW5nc2ApXG5cdFx0XHR9LFxuXG5cdFx0XHRzZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uIChzZXR0aW5ncykge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2V0VXNlclNldHRpbmdzYCwgc2V0dGluZ3MpXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC53YWtlbG9jaycsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICBhc3luYyBmdW5jdGlvbiByZXF1ZXN0V2FrZUxvY2soKSB7XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yLndha2VMb2NrKSB7XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NrID0gYXdhaXQgbmF2aWdhdG9yLndha2VMb2NrLnJlcXVlc3QoJ3NjcmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3Rha2Ugd2FrZUxvY2snKVxuICAgICAgICAgICAgICAgICAgICBsb2NrLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbGVhc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdXYWtlIExvY2sgd2FzIHJlbGVhc2VkJylcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXYWtlTG9jaycsIGUpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd2aXNpYmlsaXR5Y2hhbmdlJywgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlKVxuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdFdha2VMb2NrKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCBvblZpc2liaWxpdHlDaGFuZ2UpXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlcXVlc3RXYWtlTG9ja1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iXX0=
