$$.control.registerControl("addLink",{template:'<form bn-event="submit: onSubmit">\n    <label>Name</label>\n    <input type="text" required name="name">\n\n    <label>link</label>\n    <input type="url" required name="link">\n\n    <input type="submit" hidden bn-bind="submit">\n</form>',deps:["breizbot.pager"],init:function(n,e){const t=$$.viewController(n,{events:{onSubmit:function(n){n.preventDefault(),e.popPage($(this).getFormData())}}});this.getButtons=function(){return{apply:{title:"Apply",icon:"fas fa-check",onClick:function(){t.scope.submit.click()}}}}}}),$$.control.registerControl("rootPage",{template:'<div class="toolbar">\n\n    <div class="left" bn-style="{visibility: isVisible}">\n        <button class="w3-button" title="Back" bn-event="click: onBack"><i class="fa fa-arrow-left"></i></button>\n        <span>Edit Favorites</span>\n    </div>\n\n    <div class="right">\n        <button class="w3-button" title="Remove" \n            bn-event="click: onRemove" \n            bn-show="isEdited" \n            bn-prop="{disabled: !canRemove}"><i class="fas fa-trash"></i></button>\n\n        <button class="w3-button" title="Add Folder" \n            bn-event="click: onAddFolder" \n            bn-prop="{disabled: !canAdd}"\n            bn-show="isEdited"><i class="fas fa-folder-plus"></i></button>\n    \n        <button class="w3-button" title="Add Link" \n            bn-event="click: onAddLink" \n            bn-prop="{disabled: !canAdd}"\n            bn-show="isEdited"><i class="fas fa-link"></i></button>\n    \n            <button class="w3-button" title="Update" bn-event="click: onUpdate" bn-show="!isEdited"><i class="fas fa-redo-alt"></i></button>\n            <button class="w3-button" title="Edit" bn-event="click: onEdit" bn-show="!isEdited"><i class="fas fa-edit"></i></button>\n    \n    </div>\n\n</div>\n\n<div class="content">\n    <div bn-control="brainjs.tree" \n    bn-data="{source, options}"\n    bn-event="treeactivate: onItemSelected"\n    bn-iface="tree"\n    ></div>\n\n</div>\n\n',deps:["breizbot.pager","breizbot.http"],init:function(n,e,t){async function o(){const n=await t.post("/getFavorites");console.log("results",n),s.setData({source:[n],selNode:null}),s.scope.tree.getRootNode().getFirstChild().setExpanded(!0)}function i(n,e){return t.post("/addFavorite",{parentId:n,info:e})}const d={renderNode:function(n,e){const{node:t}=e;if(t.data.icon){const n=$(t.span);n.css({display:"flex",alignItems:"center"}),n.find("> span.fancytree-icon").css({backgroundImage:`url(${t.data.icon})`,backgroundPosition:"0 0",backgroundSize:"16px 16px"})}}};$$.util.isTouchDevice()||(d.dnd={autoExpandMS:400,dragStart:function(){return s.model.isEdited},dragEnter:function(n,e){return!!n.isFolder()&&["over"]},dragDrop:function(n,e){var o,i;e.otherNode.moveTo(n,e.hitMode),n.setExpanded(!0),o=e.otherNode.key,i=n.key,t.post("/changeParent",{id:o,newParentId:i})}});const s=$$.viewController(n,{data:{isEdited:!1,selNode:null,isVisible:function(){return this.isEdited?"visible":"hidden"},canRemove:function(){return null!=this.selNode&&"0"!=this.selNode.key},canAdd:function(){return null!=this.selNode&&this.selNode.isFolder()},source:[],options:d},events:{onUpdate:function(){o()},onItemSelected:function(n,e){if(console.log("onItemSelected",e.title),s.setData({selNode:e}),!s.model.isEdited){const{link:n}=e.data;null!=n&&window.open(n),e.setActive(!1)}},onEdit:function(){s.setData({isEdited:!0,selNode:null})},onBack:function(){const{selNode:n}=s.model;null!=n&&n.setActive(!1),s.setData({isEdited:!1,selNode:null})},onAddFolder:async function(){const n=await $$.ui.showPrompt({title:"Add Folder",label:"Name:"});if(null!=n){const{selNode:e}=s.model,t=e.key,o=await i(t,{type:"folder",name:n});e.addNode({title:n,folder:!0,key:o.id}),e.setExpanded(!0)}},onAddLink:function(){e.pushPage("addLink",{title:"Add Link",onReturn:async function(n){const{name:e,link:t}=n,{selNode:o}=s.model,d=o.key,a=await i(d,{type:"link",name:e,link:t});o.addNode({title:e,key:a.id,data:{link:t,icon:a.info.icon}}),o.setExpanded(!0)}})},onRemove:async function(){const{selNode:n}=s.model;var e;await(e=n.key,t.delete("/removeFavorite/"+e)),n.remove(),s.setData({selNode:null})}}});o()}});