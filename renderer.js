const electron = require('electron');
const {ipcRenderer,remote} = electron;
const {Menu} = remote;
const nedb = require('nedb');
const path = require('path');
const fs = require('fs');

const main_db = new nedb({
    filename: path.join(remote.app.getPath('userData'), '/main.db'),
    autoload: true,
})
const sub_db = new nedb({
    filename: path.join(remote.app.getPath('userData'), '/异世重生之无上巅峰.db'),
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
            sub_db.find({
                
            }, (err, ret)=>{console.log(ret)});
         }
        },
    ]
  }]);    
Menu.setApplicationMenu(mainMenu);

var app = new Vue({
    el:'#app',
    data:{
        active_page: "main_page",
        active_section: 'home_section',
        nav_mark_top: 0,
        nav_mark_bottom: 0,
        books:[],
        read_list_visible: false,
        read_chapter_top: 50,
        chapters:[],
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
            main_db.find({name:"tom"}, function(err, res){
                app.books = res;
                console.log(app.books);
            });
        },
        setting_click(){
            app.active_section = 'setting_section';

        },
        book_click(){
            app.active_page = 'read_page';
            app.nav_mark_top = 200;
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
                main_db.insert({name: name}); // 插入数据库
                // 为小说新建数据库
                const t_db = new nedb({
                    filename: path.join(remote.app.getPath('userData'), '/' + name + '.db'),
                    autoload: true,
                })
                // 提取小说内容并转码
                var iconv = require('iconv-lite');
                // 切割小说章节并存入数据库
                fs.readFile(filePath, function(err, data){
                    var text = iconv.decode(data, 'gbk');
                    app.chapters = novel_slice(text);
                    // for(var i=0; i<chapters.length; i++){
                    //     console.log(chapters[i].caption);
                    //     t_db.insert({
                    //         caption: chapter[i].caption,
                    //         content: chapter[i].content,
                    //     });
                    // }
                });
                app.active_page = "read_page";
            }
        },
        read_home_click(){
            app.active_page = 'main_page';
        },
        read_list_click(){
            app.read_list_visible = !app.read_list_visible;
        },
        handleScroll(){
            // 但是如何实现呢？
            // 首先比页面多一个至少，最好多一个，采用ajax技术
            // 然后，等上面的完全移除后，销毁，进度条发生改变
            // 因此浮动控制面板需要实时控制
            // 不行，因为一直是向下滚的，因此并不太好
            // 绝对不可以全部装载，性能太差
            // 背景必须是一整块不能移动
            // 那么滚动条如何只针对一个呢？那么只能自己造滚动条了
            if(app.active_page == 'read_page'){
                // 设备/屏幕高度
                var clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
                // div到头部的距离
                var scrollTop = scrollObj.scrollTop;
                // 滚动条的总高度
                var scrollHeight = scrollObj.scrollHeight;
                // 滚动到底部的条件
                if(scrollTop+clientHeight == scrollHeight){
                    // div到头部的距离+屏幕高度 = 可滚动的总高度
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
                // 存入数据库
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