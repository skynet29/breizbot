$$.control.registerControl("files",{template:'<div \n\tbn-control="breizbot.files" \n\tbn-data="{filterExtension: \'.mp3\', friendUser}"\n\tbn-event="fileclick: onFileClick"\n\tbn-iface="files"\n\t></div>',deps:["breizbot.pager"],props:{friendUser:""},init:function(t,n){const{friendUser:e}=this.props,i=$$.viewController(t,{data:{friendUser:e},events:{onFileClick:function(t,o){const{rootDir:a,fileName:r}=o,s=i.scope.files.getFiles(),l=s.findIndex(t=>t.name==r);n.pushPage("player",{title:"Diaporama",props:{firstIdx:l,files:s,rootDir:a,friendUser:e}})}}})}}),$$.control.registerControl("friends",{template:'<p>Select a friends</p>\n<div \n\tbn-control="breizbot.friends" \n\tbn-event="friendclick: onSelectFriend"\n\tbn-data="{showConnectionState: false}"\n\t></div>',deps:["breizbot.pager"],init:function(t,n){$$.viewController(t,{data:{},events:{onSelectFriend:function(t,e){console.log("onSelectFriend",e);const{userName:i}=e;n.pushPage("files",{title:i,props:{friendUser:i}})}}})}}),$$.control.registerControl("rootPage",{template:'<p>Select a file system</p>\n\n<ul class="w3-ul w3-border w3-white">\n\t<li class="w3-bar" bn-event="click: onHome">\n\t\t<div class="w3-bar-item">\n\t\t\t<i class="fa fa-home fa-2x fa-fw w3-text-blue"></i>\n\t\t\t<span>Your home files</span>\n\t\t</div>\n\t</li>\n\n\t<li class="w3-bar" bn-event="click: onShare">\n\t\t<div class="w3-bar-item">\n\t\t\t<i class="fa fa-share-alt fa-2x fa-fw w3-text-blue"></i>\n\t\t\t<span>Files shared by your friends</span>\n\t\t</div>\n\t</li>\n</ul>\t',deps:["breizbot.pager"],init:function(t,n){$$.viewController(t,{data:{},events:{onHome:function(){console.log("onHome"),n.pushPage("files",{title:"Home files"})},onShare:function(){console.log("onShare"),n.pushPage("friends",{title:"Shared files"})}}})}}),function(){function t(t){const n=new Date(1e3*t);return(n.getMinutes()+n.getSeconds()/100).toFixed(2).replace(".",":")}$$.control.registerControl("player",{template:'<div class="title">\n\t<strong>Title:</strong>\n\t<span bn-text="title"></span>\n</div>\n<div class="toolbar">\n\t<div>\n\t\t<button bn-show="!playing" bn-event="click: onPlay">\n\t\t\t<i class="fa fa-play"></i>\n\t\t</button>\n\t\t\n\t\t<button bn-show="playing" bn-event="click: onPause">\n\t\t\t<i class="fa fa-pause"></i>\n\t\t</button>\n\t\t\n\t\t<button bn-prop="prop1" bn-event="click: onPrev">\n\t\t\t<i class="fa fa-step-backward"></i>\n\t\t</button>\n\t\t\n\t\t<button bn-prop="prop2" bn-event="click: onNext">\n\t\t\t<i class="fa fa-step-forward"></i>\n\t\t</button>\t\t\n\t</div>\n\n\n\t<div class="shuffle">\n\t\t<span>Shuffle</span>\n\t\t<div \n\t\t\tbn-control="brainjs.flipswitch"\n\t\t\tbn-event="flipswitchchange: onShuffleChange"\n\t\t\tdata-width="100"\n\t\t\tdata-height="25"\n\t\t\t>\n\t\t\t\n\t\t</div>\t\t\t\n\t</div>\n\n\n</div>\n\n<div class="slider">\n\t<span bn-text="getTimeInfo"></span>\n\t<div bn-control="brainjs.slider" \n\t\tbn-data="{max: duration}"\n\t\tbn-event="input: onSliderChange" \t\t \n\t\tbn-val="curTime">\t\t\n\t</div>\n\t\n</div>\n\n<audio \n\tbn-attr="{src}" \n\tbn-bind="audio"\n\tautoplay="" \n\tbn-event="canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded">\t\t\n</audio>\n',deps:["breizbot.files","breizbot.pager"],props:{rootDir:"",files:[],firstIdx:0,friendUser:""},init:function(n,e,i){const{rootDir:o,files:a,firstIdx:r,friendUser:s}=this.props;let l=null;const d=$$.viewController(n,{data:{idx:r,nbFiles:a.length,src:b(r),title:p(r),duration:0,curTime:0,playing:!1,prop1:function(){return{disabled:!(this.idx>0)}},prop2:function(){return{disabled:!(this.idx<this.nbFiles-1)}},getTimeInfo:function(){return`${t(this.curTime)} / ${t(this.duration)}`}},events:{onLoad:function(){d.setData({duration:Math.floor(this.duration)})},onTimeUpdate:function(){d.setData({curTime:this.currentTime})},onPlaying:function(){d.setData({playing:!0})},onPaused:function(){d.setData({playing:!1})},onPlay:function(){u.play()},onPause:function(){u.pause()},onSliderChange:function(t,n){u.currentTime=n},onShuffleChange:function(t,n){l="ON"==n?function(t){let n=[];for(let e=0;e<t;e++)n.push(e);var e,i,o;for(o=n.length-1;o>0;o-=1)e=Math.floor((o+1)*Math.random()),i=n[e],n[e]=n[o],n[o]=i;return n}(d.model.nbFiles):null},onEnded:c,onPrev:function(){let{idx:t}=d.model;t>0&&f(t-1)},onNext:c}});function c(){if(null!=l)return void(l.length>0&&f(l.pop()));let{idx:t,nbFiles:n}=d.model;t<n-1&&f(t+1)}function f(t){d.setData({src:b(t),title:p(t),idx:t})}const u=d.scope.audio.get(0);function p(t){return a[t].name}function b(t){return e.fileUrl(o+a[t].name,s)}}})}();