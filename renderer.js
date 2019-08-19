const electron = require('electron');
const {BrowserWindow, ipcRenderer,remote} = electron;
const {Menu, MenuItem} = remote;
const nedb = require('nedb');
const path = require('path');
const fs = require('fs');              
const iconv = require('iconv-lite'); // 转码

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
// 用来存储当前阅读章节的
ipcRenderer.on('sigWindow_close',function(event,data){
    if(active_page == "read_page")
        main_db.update({name: app.book.name}, {$set: {
            begin_chapter: app.begin_chapter,
            bookmarks: app.bookmarks}}); // 更新初始化时章节
})
var app = new Vue({
    el:'#app',
    data:{
        active_page: "main_page", // 在主界面和阅读界面之间切换
        active_section: 'home_section', // 主界面的各部分之间的切换
        nav_mark_top: 0, // 导航栏的高亮标志位置
        nav_mark_bottom: 0,
        books:[], // 数据库里的总书籍{name, }
        book: {}, // 当前读的书，用于初始化章节和存取书签用的
        read_list_visible: false, // 阅读界面列表栏的显示
        read_list_mode: "read_caption", // 阅读界面列表栏是在目录栏还是在书签栏
        read_list_bookmark:"./Resource/Image/16px/bookmark.png", // 阅读界面目录按钮高亮
        read_list_caption:"./Resource/Image/16px/list_grey.png", // 阅读界面书签按钮高亮
        read_setting_visible: false, // 阅读界面设置栏的显示
        card_view: "card_view_default", // 阅读界面样式
        chapters:[], // 在阅读界面时的总章节，用于加载html
        chapters_hidden:[], // 在阅读界面的隐藏章节，用于幕后控制
        bookmarks: [], // 书签数组
        now_chapter:0, // 用于点击书签栏的时候，滚动时候设置初始章节
        begin_chapter:0, // 存储在main数据库中的设置初始章节
        font_size:"15px", // 阅读界面字体大小
        font_family:"微软雅黑", // 阅读界面字体样式
        page_margin:"70%", // 阅读界面的卡片宽度
        page_padding:"60px", // 阅读界面的内边距
        page_style:"card_view", // 阅读界面样式？？？？
        page_background: "#ececec",
        page_foreground: "#ffffff",
        is_loading: false, // 用来进行加载loading界面
    },
    created() {
        
    },
    methods: {
        nav_home_click(){
            app.active_section = 'home_section';
            app.nav_mark_top = 0;
        },
        nav_rank_click(){
            app.active_section = 'rank_section';
            app.nav_mark_top = 50;
        },
        nav_sort_click(){
            app.active_section = 'sort_section';
            app.nav_mark_top = 100;
        },
        nav_shelf_click(){
            app.active_section = 'shelf_section';
            app.nav_mark_top = 150;
            app.books = [];
            main_db.find({}, function(err, res){
                app.books = res;
            });
        },
        nav_setting_click(){
            app.active_section = 'setting_section';

        },
        // 导出
        shelf_export_click(){
            ipcRenderer.send('sigShowExportWindow');
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
                    if(count == 0) // 如果没有这个书，就插入，如果有，就不执行操作，因此你需要手动删除
                        main_db.insert({name: name, begin_chapter: 0});
                    else // 这个是开发者方便时候用的
                        main_db.update({name: name}, {$set: { 
                            begin_chapter: 0, 
                            bookmarks: [] }});
                });
                // 为小说新建数据库
                const t_db = new nedb({
                    filename: path.join(remote.app.getPath('userData'), '/' + name + '.db'),
                    autoload: true,
                });
                // 先删除所有记录
                t_db.remove({}, { multi: true }, function (err, numRemoved) {});
                // 切割小说章节并存入数据库
                fs.readFile(filePath, function(err, data){
                    app.is_loading = true;
                    var text = iconv.decode(data, fileType(data)); // 转码操作
                    app.chapters_hidden = novel_slice(text); // 切割小说章节
                    for(var i=0; i<app.chapters_hidden.length; i++){
                        t_db.insert({ // 插入数据库
                            caption: app.chapters_hidden[i].caption,
                            content: app.chapters_hidden[i].content,
                        });
                    }
                    app.is_loading = false;
                    // // 打开阅读界面
                    app.now_chapter = 0;
                    app.chapters[0] = app.chapters_hidden[0];
                    app.active_page = "read_page";
                });
            }
        },
        // 书点击打开阅读界面功能 
        book_click(book){
            app.book = book;
            app.is_loading = true;
            main_db.find({name:book.name}, function(err, res){ if(err) alert(err);
                app.now_chapter = app.begin_chapter = res[0].begin_chapter; // 初始章节赋值
                app.bookmarks = res[0].bookmarks; // 书签赋值
                console.log(res[0].bookmarks);
            });
            const t_db = new nedb({
                filename: path.join(remote.app.getPath('userData'), '\\'+book.name+'.db'),
                autoload: true,
            })
            t_db.find({}, function(err, res){ if(err) alert(err);
                app.chapters = [{caption: "初始化标题（测试）", content: "初始化内容（测试）"}];
                app.chapters_hidden = res;
                app.chapters[0] = res[app.begin_chapter];
                app.is_loading = false;
                app.active_page = 'read_page';
            });
        },
        add_bookmark(chapter){
            if(app.bookmarks.indexOf(chapter.caption)==-1)
                app.bookmarks[app.bookmarks.length] = chapter.caption;
        },
        read_list_head_caption_click(){
            app.read_list_bookmark = "./Resource/Image/16px/bookmark.png";
            app.read_list_caption = "./Resource/Image/16px/list_grey.png";
            app.read_list_mode = "read_caption";
        },
        read_list_head_bookmark_click(){
            app.read_list_caption = "./Resource/Image/16px/list.png";
            app.read_list_bookmark = "./Resource/Image/16px/bookmark_grey.png";
            app.read_list_mode = "read_bookmark";
        },
        read_list_caption_click(chapter){
            var res = app.chapters_hidden.find((l_chapter)=>{
                return l_chapter.caption == chapter.caption;
            });
            var i = 0;
            while(app.chapters_hidden[i].caption != chapter.caption){
                i+=1;
            }
            app.now_chapter = i;
            app.chapters = [];
            window.scrollTo(0,0);
            app.chapters[0] = res;
        },
        read_list_bookmark_click(bookmark){
            var res = app.chapters_hidden.find((l_chapter)=>{
                return l_chapter.caption == bookmark;
            });
            var i = 0;
            while(app.chapters_hidden[i].caption != bookmark){
                i+=1;
            }
            app.now_chapter = i;
            app.chapters = [];
            window.scrollTo(0,0);
            app.chapters[0] = res;
        },
        read_pannel_home_click(){
            app.active_page = 'main_page';
            main_db.update({name: app.book.name}, 
                {$set: {begin_chapter: app.begin_chapter, 
                        bookmarks: app.bookmarks}}); // 更新初始化时章节
            console.log(app.bookmarks);
        },
        read_pannel_list_click(){
            app.read_list_visible = !app.read_list_visible;
        },
        setting_close_click(){
            app.read_setting_visible = false;
        },
        read_content_click(){
            app.read_list_visible = false;
            app.read_setting_visible = false;
        },
        // 下拉刷新函数
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
                    app.chapters.push(app.chapters_hidden[app.chapters.length+app.now_chapter]);
                    app.begin_chapter = app.chapters.length+app.now_chapter;
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
// 小说文件解码操作
function fileType(buffer){             
    if (buffer[0] == 0xff && buffer[1] == 0xfe) {
        return 'utf16'
    } else if (buffer[0] == 0xfe && buffer[1] == 0xff) {
        return 'utf16'
    } else if (buffer[0] == 0xef && buffer[1] == 0xbb) {
        return 'utf8'
    } else {
        return 'GBK'
    }
}
// 判断是不是数字
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
// 小说章节切割函数
function novel_slice(text){
    var result = new Array();
    var i = 0;
    while(i < text.length){
        // 提取标题
        if(text[i]=="第"){
            var caption = "第";
            var j = i+1; // 切换到数字
            if(j >= text.length) break; // 容错处理
            while(isNumber(text[j])){
                caption += text[j];
                j++; if(j >= text.length) break; // 容错处理
            }
            if((j>=text.length) && (j+1>=text.length)) break; // 容错处理
            if((text[j]=="章") && (text[j+1]==" ")){ // 说明的确是标题了
                caption += text[j];
                i = j+1; // 接下来进行章节名的获取，从这里开始，到找到一个有回车或者空格的段落结束
                if(i >= text.length) break; // 容错处理
                while(text[i] == " "){ // 因为可能是个空格，应该直到没有空格结束
                    caption += text[i];
                    i+=1;
                    if(i >= text.length) break; // 容错处理
                }
                while((text[i]!=" ")&&(text[i]!="\n")){ // 现在不是空格了，这时候要判断是空格的时候结束
                    caption += text[i];
                    i+=1;
                    if(i >= text.length) break; // 容错处理
                }
                var content = ""; // 下面就是内容获取
                while(i<text.length){
                    if(i+1 >= text.length) break; // 容错处理
                    if(text[i+1] == "第"){ // 用于判断是不是标题，+1的目的是为了下面的i+=1设定的
                        if(i+2 >= text.length) break; // 容错处理
                        var j = i+2; while(isNumber(text[j])){
                            j+=1;
                            if(j >= text.length) break; // 容错处理
                        } // 搜集里面的数字
                        if(text[j] == "章"){break;}} // 表明的确是标题，break掉
                    content += text[i];
                    i+=1;
                }
                var chapter = {caption: caption, content:content};
                console.log(chapter);
                result[result.length] = chapter;
            }
            else{}// 如果不是'章'的话，说明那就不是标题，而是一段文本，在这种情况下，这种文本不能算入章节中的，应该舍弃不要
        }
        i+=1; // 用于找标题的一直递增
    }
    console.log(result)
    return result;
}
