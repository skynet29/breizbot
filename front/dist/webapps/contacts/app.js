$$.control.registerControl("addContactPage",{template:'<form bn-event="submit: onSubmit" bn-form="from">\n\t<div bn-control="brainjs.inputgroup">\n\t\t<label>Name:</label><br>\n\t\t<input type="text" name="name" style="min-width: 300px" required="" autofocus="">\t\n\t</div>\n\t<br>\n\n\t<div bn-control="brainjs.inputgroup">\n\t\t<label>Email:</label><br>\n\t\t<input type="email" name="email" style="min-width: 300px" required="">\t\n\t</div>\t\n\n\t<input type="submit" bn-bind="submit" hidden="">\n</form>\n',deps:["breizbot.users"],props:{$pager:null,from:{}},buttons:[{name:"add",icon:"fa fa-user-plus"}],init:function(t,n){const{$pager:o,from:e}=this.props,a=$$.viewController(t,{data:{from:e},events:{onSubmit:function(t){t.preventDefault();const e=$(this).getFormData();console.log("data",e),n.addContact(e.name,e.email).then(()=>{console.log("contact added !"),o.popPage("update")}).catch(t=>{$$.ui.showAlert({title:"Error",content:t.responseText})})}}});this.onAction=function(t){console.log("onAction",t),a.scope.submit.click()}}}),$$.control.registerControl("rootPage",{template:'<div class="toolbar">\n\t<button \n\t\tclass="w3-btn w3-blue" \n\t\ttitle="Add Contact"\n\t\tbn-event="click: onAddContact"\n\n\t><i class="fa fa-user-plus"></i></button>\t\n</div>\n<div class="scrollPanel">\n\t<div bn-control="breizbot.contacts" data-show-delete-button="true" bn-iface="contacts"></div>\t\n</div>\n',props:{$pager:null},init:function(t){const{$pager:n}=this.props,o=$$.viewController(t,{data:{},events:{onAddContact:function(){console.log("onAddContact"),n.pushPage("addContactPage",{title:"Add Contact"})}}});this.onReturn=function(t){"update"==t&&o.scope.contacts.update()}}});