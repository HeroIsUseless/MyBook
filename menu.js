// 菜单初始化
let mainMenu = Menu.buildFromTemplate([
{
    label: '测试',
    role: 'help',
    submenu: [
        {
            label: 'list',
            click: function () {
                app.read_list_mode = "read_caption";
            }
        },
        {
            label: 'bk',
            click: function () {
                app.read_list_mode = "read_bookmark";
            }
        },
        {
            label: '读取_打开read',
            click: function () {
                app.active_page = "read_page";
                sub_db.find({

                }, (err, ret) => {
                    app.chapters = ret;
                });
            }
        },
        {
            label: '移除t_db所有记录',
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
        {
            label: '移除main所有记录',
            click: function () {
                main_db.remove({}, { multi: true }, (err, numRemoved) => { });
                books = [];
            }
        },
    ]
}]);