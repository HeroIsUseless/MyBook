const electron = require('electron');
const {BrowserWindow, ipcRenderer,remote} = electron;
const {Menu, MenuItem} = remote;
const nedb = require('nedb');
const path = require('path');
const fs = require('fs');

const main_db = new nedb({
    filename: path.join(remote.app.getPath('userData'), '/main.db'),
    autoload: true,
})

// 菜单初始化
let mainMenu = Menu.buildFromTemplate([ 
  {label: '测试',
    role: 'help',
    submenu: [
        {label: '插入',
         click: function () {
            main_db.insert({
                name: 'tom',
                content: 'hello',
            }, (err, ret)=>{});
         }
        }, 
        {label: '读取',
         click: function () {
            main_db.findOne({
                name: 'tom'
            }, (err, ret)=>{console.log(ret)});
         }
        },
        {label: '读取_打开read',
         click: function () {
             app.active_page = "read_page";
            sub_db.find({
                
            }, (err, ret)=>{
                app.chapters = ret;
            });
         }
        },
        {label: '移除main所有记录',
         click: function () {
            main_db.remove({}, { multi: true }, (err, numRemoved)=>{});
            books = [];
         }
        },
    ]
  }]);    
// Menu.setApplicationMenu(mainMenu);

global.sharedObject = {
    read_list_visible: '000',
}
window.showRightClickMenu = function ()
{
    // console.log('1232300');
    // window.addEventListener('contextmenu', (e) => {
    // e.preventDefault();
    // menu.popup({ window: remote.getCurrentWindow() });
    // }, false);    
    ipcRenderer.send('sigShowRightClickMenu');
}
ipcRenderer.on('sigShowRightClickMenu_compete',function(event,data){
    console.log('sigShowRightClickMenu_compete');
    app.read_setting_visible = true;
})
var app = new Vue({
    el:'#app',
    data:{
        active_page: "main_page",
        active_section: 'home_section',
        nav_mark_top: 0,
        nav_mark_bottom: 0,
        books:[],
        read_list_visible: false,
        read_setting_visible: false,
        read_chapter_top: 50,
        chapters:[],
        chapters_hidden:[],
        font_size:"15px",
        font_family:"微软雅黑",
        page_margin:"10px",
        page_padding:"10px",
        page_style:"默认",
    },
    created() {
        
    },
    methods: {
        home_click(){
            app.active_section = 'home_section';
            app.nav_mark_top = 0;
        },
        rank_click(){
            app.active_section = 'rank_section';
            app.nav_mark_top = 50;
        },
        sort_click(){
            app.active_section = 'sort_section';
            app.nav_mark_top = 100;
        },
        shelf_click(){
            app.active_section = 'shelf_section';
            app.nav_mark_top = 150;
            app.books = [];
            main_db.find({}, function(err, res){
                app.books = res;
            });
        },
        setting_click(){
            app.active_section = 'setting_section';

        },
        // 没什么办法能够获取欸
        book_click(book){
            const t_db = new nedb({
                filename: path.join(remote.app.getPath('userData'), '\\'+book.name+'.db'),
                autoload: true,
            })
             t_db.find({}, function(err, res){
                // app.chapters = res;
                app.chapters = [{caption: "第一章 陨落的天才", content: "斗之力，三段望着测验魔石碑上面<br\>斗之力，三段望着测验魔石碑上面"}];
                app.chapters[0] = res[0];
                app.active_page = 'read_page';
                app.chapters_hidden = res;
            });
        },
        // 本地导入
        shelf_import_click(){
            // 打开文件选择窗口
            const file = remote.dialog.showOpenDialog(remote.getCurrentWindow(), {filters: [ ],properties: ['openFile']});
            if(file!=""){
                // 提取小说名
                filePath = file.toString();
                var index = filePath.lastIndexOf("\\");
                var name = filePath.slice(index+1);
                index = name.lastIndexOf(".");
                name = name.slice(0, index); 
                // 插入数据库
                main_db.count({name:name}, function(err, count){
                    if(count == 0)
                        main_db.insert({name: name});
                });
                // 为小说新建数据库
                const t_db = new nedb({
                    filename: path.join(remote.app.getPath('userData'), '/' + name + '.db'),
                    autoload: true,
                });
                // 提取小说内容并转码
                var iconv = require('iconv-lite');
                // 切割小说章节并存入数据库
                fs.readFile(filePath, function(err, data){
                    var text = iconv.decode(data, 'gbk');
                    app.chapters = novel_slice(text);
                    for(var i=0; i<app.chapters.length; i++){
                        console.log(app.chapters[i].caption);
                        t_db.insert({
                            caption: app.chapters[i].caption,
                            content: app.chapters[i].content,
                        });
                    }
                });
                // 打开阅读界面
                app.active_page = "read_page";
            }
        },
        read_list_caption_click(chapter){},
        read_home_click(){
            app.active_page = 'main_page';
        },
        read_list_click(){
            app.read_list_visible = !app.read_list_visible;
        },
        setting_close_click(){
            app.read_setting_visible = false;
        },
        handleScroll(){
            if(app.active_page == 'read_page'){
                // scrollTop 滚动条滚动时，距离顶部的距离
                var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                // windowHeight 可视区的高度
                var windowHeight = document.documentElement.clientHeight || document.body.clientHeight;
                // scrollHeight 滚动条的总高度
                var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                // 滚动条到底部的条件
                if(scrollTop + windowHeight == scrollHeight){
                    // 加载数据
                    app.chapters.push(app.chapters_hidden[app.chapters.length]);
                }
            }
        }
    },
    mounted() {
        window.addEventListener('scroll', this.handleScroll, true);
    },
    destroyed() {
        // 离开页面清除滚轮滚动事件
        window.removeEventListener('scroll', this.handleScroll);
    },
})

function isNumber(char){
    if(char == '1' || char == '一') return true;
    else if(char == '2' || char == '二') return true;
    else if(char == '3' || char == '三') return true;
    else if(char == '4' || char == '四') return true;
    else if(char == '5' || char == '五') return true;
    else if(char == '6' || char == '六') return true;
    else if(char == '7' || char == '七') return true;
    else if(char == '8' || char == '八') return true;
    else if(char == '9' || char == '九') return true;
    else if(char == '0' || char == '零') return true;
    else if(char == ' ') return true;
    else return false;
}

function novel_slice(text){
    var result = new Array();
    var res_n = 0;
    var i = 0;
    while(i < text.length){
        // 提取标题
        if((text[i]==" "||text[i]=="\n") && (text[i+1]=="第")){
            var caption = "第";
            var j = i+2; // 切换到数字
            while(isNumber(text[j])){
                caption += text[j];
                j++;
            }
            if(text[j] == "章"){ // 说明的确是标题了
                caption += text[j];
                i = j+1; // 应该是个空格，接下来进行章节名的获取
                caption += text[i];
                i+= 1;
                while((text[i]!=" ")){
                    caption += text[i];
                    i+=1;
                }
                // 内容获取
                var content = "";
                while(!((text[i]==" "||text[i]=="\n") && (text[i+1]=="第"))){
                    content += text[i];
                    i++;
                }
                var chapter = {caption: caption, content:content};
                result[res_n] = chapter;
                res_n += 1;
            }
            else{ // 说明不是标题，不应该跳跃

            }
        }
        i+=1;
    }
    return result;
}