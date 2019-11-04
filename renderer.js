const electron = require('electron');
const {BrowserWindow, ipcRenderer,remote} = electron;
const {Menu, MenuItem} = remote;
const nedb = require('nedb');
const path = require('path');
const fs = require('fs');              
const iconv = require('iconv-lite'); // 转码
const superagent = require('superagent');
const cheerio = require('cheerio');

let delete_book = ""; // 一种很笨的方法实现删除书籍
const main_db = new nedb({
    filename: path.join(remote.app.getPath('userData'), '/main.db'),
    autoload: true,
});
// 菜单初始化
let mainMenu = Menu.buildFromTemplate([ 
  {label: '测试',
    role: 'help',
    submenu: [
        {label: 'list',
         click: function () {
            app.read_list_mode = "read_caption";
         }
        }, 
        {label: 'bk',
         click: function () {
            app.read_list_mode = "read_bookmark";
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
        {label: '移除t_db所有记录',
         click: function () {
            // 为小说新建数据库
            const t_db = new nedb({
                filename: path.join(remote.app.getPath('userData'), '/' + '异世重生之无上巅峰' + '.db'),
                autoload: true,
            });
            t_db.remove({}, { multi: true }, function (err, numRemoved) {
                console.log(numRemoved);
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
//Menu.setApplicationMenu(mainMenu);

global.sharedObject = {
    read_list_visible: '000',
}
window.book_rightMenu = function(book){
    console.log(book)
}
window.showRightClickMenu = function ()
{  
    ipcRenderer.send('sigShowRightClickMenu');
}
ipcRenderer.on('sigShowRightClickMenu_compete',function(event,data){
    console.log('sigShowRightClickMenu_compete');
    app.read_setting_visible = true;
});
ipcRenderer.on('sig_delete_book',function(event,data){
    main_db.remove({name:delete_book});
    for(var i=0; i<app.books.length; i++){
        if(delete_book == app.books[i].name){
            app.books.splice(i, 1);
            console.log(i)
        }
    }
    fs.unlink(remote.app.getPath('userData')+'/'+delete_book+'.db',
        function(error){
            if(error){
                console.log(error);
                return false;
            }
        }
   );
});

// 用来存储当前阅读章节的
ipcRenderer.on('sigWindow_close',function(event,data){
    if(active_page == "read_page")
        main_db.update({name: app.book.name}, {$set: {
            begin_chapter: app.begin_chapter,
            bookmarks: app.bookmarks}}); // 更新初始化时章节
})

// var navigation = new Vue({
//     el:'nav',
//     data:{

//     },
//     methods:{

//     }
// })

// var main_page = new Vue({
//     el:'#main_page',
//     data:{

//     },
//     methods:{

//     }
// })

// var main_page = new Vue({
//     el:'#main_page',
//     data:{

//     },
//     methods:{

//     }
// })













var app = new Vue({
    el:'#app',
    data:{
        active_page: "main_page", // 在主界面和阅读界面之间切换
        active_section: 'home_section', // 主界面的各部分之间的切换
        nav_mark_top: 0, // 导航栏的高亮标志位置
        nav_mark_bottom: 0,
        net_books:[], // 从网上爬取的小说
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
        now_chapter:0, // 用于点击书签栏的时候，滚动时候设置初始章节，从0开始的
        begin_chapter:0, // 用于恢复界面时设置初始章节，从0开始的
        font_size:"15px", // 阅读界面字体大小
        font_family:"微软雅黑", // 阅读界面字体样式
        page_margin:"70%", // 阅读界面的卡片宽度
        page_padding:"60px", // 阅读界面的内边距
        page_style:"card_view", // 阅读界面样式？？？？
        page_background: "#ececec",
        page_foreground: "#ffffff",
        is_loading: false, // 用来进行加载loading界面
        is_slice:true, // 小说是否切割
    },
    created() {
        home_book_init();
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
            app.nav_mark_top = window.innerHeight-60;
        },
        home_book_click(book){
            net_book_store(book);
            //open_book(book);
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
                app.is_loading = true;
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
                // 插入进app.books
                var book_exist = false;
                for(book in app.books){
                    if(book.name == name) book_exist = true;
                }
                if(!book_exist) app.books.push({name:name}); 
                
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
                    if(is_slice){
                        app.chapters_hidden = novel_slice(text); // 切割小说章节
                    }
                    else{ // 不切割

                    }
                    if(app.chapters_hidden.length != 0){
                        for(var i=0; i<app.chapters_hidden.length; i++){
                            t_db.insert({
                                _id:i+1,
                                caption:app.chapters_hidden[i].caption,
                                content:app.chapters_hidden[i].content,
                            });
                        }
                    }
                        
                    app.is_loading = false;
                    // // 打开阅读界面
                    app.now_chapter = 0;
                    app.chapters[0] = app.chapters_hidden[0];
                    app.is_loading = false;
                    app.active_page = "read_page";
                });
            }
        },
        // 书点击打开阅读界面功能，各个地方的书
        book_click(book){
            app.book = book;
            app.is_loading = true;
            main_db.find({name:book.name}, function(err, res){ if(err) alert(err);
                app.now_chapter = app.begin_chapter = res[0].begin_chapter; // 初始章节赋值
                app.bookmarks = res[0].bookmarks; // 书签赋值
            });
            const t_db = new nedb({
                filename: path.join(remote.app.getPath('userData'), '\\'+book.name+'.db'),
                autoload: true,
            });
            t_db.find({}, function(err, res){ if(err) alert(err);
                app.chapters = [];
                app.chapters_hidden = res;
                app.chapters[0] = res[app.begin_chapter];
                app.is_loading = false;
                app.active_page = 'read_page';
            });
        },
        net_book_click(book){},
        book_rightMenu(book){
            delete_book = book.name;
            ipcRenderer.send('sig_book_rightMenu');
        },
        add_bookmark(chapter){
            if(app.bookmarks.indexOf(chapter.caption)==-1)
                app.bookmarks[app.bookmarks.length] = chapter.caption;
        },
        // 列表面板的按钮函数
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
            app.begin_chapter = app.now_chapter = i;
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
        // 控制面板的按钮函数
        read_pannel_home_click(){
            app.read_list_visible = false;
            app.read_setting_visible = false;
            app.read_list_bookmark = "./Resource/Image/16px/bookmark.png";
            app.read_list_caption = "./Resource/Image/16px/list_grey.png";
            app.read_list_mode = "read_caption";
            app.active_page = 'main_page';
            main_db.update({name: app.book.name}, 
                {$set: {begin_chapter: app.begin_chapter, 
                        bookmarks: app.bookmarks}}); // 更新初始化时章节，书签
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
                    app.begin_chapter = app.chapters.length+app.now_chapter-1;
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
function open_book(book){
    app.book = book;
    app.is_loading = true;
    main_db.find({name:book.name}, function(err, res){ if(err) alert(err);
        app.now_chapter = app.begin_chapter = res[0].begin_chapter; // 初始章节赋值
        app.bookmarks = res[0].bookmarks; // 书签赋值
    });
    const t_db = new nedb({
        filename: path.join(remote.app.getPath('userData'), '\\'+book.name+'.db'),
        autoload: true,
    });
    t_db.find({}, function(err, res){ if(err) alert(err);
        app.chapters = [];
        app.chapters_hidden = res;
        app.chapters[0] = res[app.begin_chapter];
        app.is_loading = false;
        app.active_page = 'read_page';
    });
}

async function home_book_init(){
    const p = await home_book_init_promise();
    return p;
}

function home_book_init_promise(){
    return new Promise((resolve, reject)=>{
        superagent.get('http://www.xbiquge.la/').end((err,res)=>{
            if(err) console.log('error crawler');
            else{
                let $ = cheerio.load(res.text);
                $('div .item').each((idx, ele)=>{
                    var net_book = {image:'', name:'', info:'', author:''};
                    net_book.image = $(ele).find('div .image').find('a').find('img').attr('src');
                    net_book.name = $(ele).find('dl').find('dt').find('a').text();
                    net_book.href = $(ele).find('dl').find('dt').find('a').attr('href');
                    net_book.info = $(ele).find('dl').find('dt').find('span').text();
                    net_book.author = $(ele).find('dl').find('dd').text();
                    app.net_books.push(net_book);
                    app.reload;
                });
            }
        })
    })
}
async function net_book_store(book){
    const p = await net_book_store_promise(book);
    //open_book(book);
    return p;
}

function net_book_store_promise(book){
    return new Promise((resolve, reject)=>{
        superagent.get(book.href).end((err,res)=>{
            if(err) console.log('error crawler');
            else{

                let $ = cheerio.load(res.text);
                var result = [];
                $('dd').each((idx, ele)=>{
                    result.push({
                        caption : $(ele).text(), 
                        href : 'http://www.xbiquge.la'+$(ele).find('a').attr('href')});
                });
                fuck(result, 0);
                console.log(result);
            }
        })
    })
}

function fuck(result, index){
    if(index >= result.length) return;
    superagent.get(result[index].href).end((err, res)=>{
        if(err) return;
        else{
            let $ = cheerio.load(res.text);
            console.log($('h1').text())
            index += 1;
            fuck(result, index);
        }
    })
}