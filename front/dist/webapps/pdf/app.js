$$.control.registerControl("rootPage",{template:'<div \n\tbn-control="breizbot.pdf" \n\tdata-show-toolbar="true"\n\tbn-event="pdfopenfile: onOpenFile"\n\tbn-iface="pdf"\n></div>',props:{$pager:null},deps:["breizbot.files"],init:function(e,n){const{$pager:o}=this.props;const t=$$.viewController(e,{data:{numPages:0,title:"",currentPage:1},events:{onOpenFile:function(e){console.log("onOpenFile"),o.pushPage("breizbot.files",{title:"Open File",props:{filterExtension:".pdf"}})}}});this.onReturn=function(e){if(console.log("onReturn",e),null==e)return;const o=e.rootDir+e.fileName,i=n.fileUrl(o);t.scope.pdf.openFile(i,e.fileName)}}});