# 毅忘笔记 - 打包为可执行文件指南

本指南将帮助您将毅忘笔记Web应用打包为Windows可执行文件(.exe)。我们将使用Electron框架来实现这一目标。

## 前提条件

在开始之前，请确保您的系统已安装以下软件：

1. **Node.js** (推荐版本 14.x 或更高)
   - 下载地址：https://nodejs.org/zh-cn/download/
   - 安装完成后，可通过命令行验证：`node -v` 和 `npm -v`

2. **Git** (可选，但推荐)
   - 下载地址：https://git-scm.com/downloads

## 步骤1：创建Electron项目结构

1. 创建一个新的项目文件夹
```bash
mkdir yiwang-notes-electron
cd yiwang-notes-electron
```

2. 初始化npm项目
```bash
npm init -y
```

3. 安装必要的依赖
```bash
npm install electron electron-builder --save-dev
```

## 步骤2：配置项目文件

1. 将原有的毅忘笔记文件复制到项目中
```bash
mkdir -p src
cp -r /path/to/yiwang-notes/* src/
```

2. 创建Electron主进程文件 `main.js`
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

// 保持对窗口对象的全局引用，防止被垃圾回收
let mainWindow;

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: '毅忘笔记',
        icon: path.join(__dirname, 'src', 'icon.ico'), // 如果有图标文件
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    // 加载应用的index.html
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'src', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // 打开开发者工具（可选，生产环境应移除）
    // mainWindow.webContents.openDevTools();

    // 窗口关闭时触发
    mainWindow.on('closed', function () {
        // 取消引用窗口对象
        mainWindow = null;
    });
}

// Electron完成初始化后创建窗口
app.on('ready', createWindow);

// 关闭所有窗口时退出应用
app.on('window-all-closed', function () {
    // 在macOS上，除非用户用Cmd+Q明确退出，否则应用和菜单栏会保持活动状态
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，重新创建一个窗口
    if (mainWindow === null) {
        createWindow();
    }
});
```

3. 创建渲染进程预加载脚本 `preload.js`（可选）
```javascript
// 可以在这里添加需要在渲染进程中使用的Node.js API
window.addEventListener('DOMContentLoaded', () => {
    // 可以在这里执行一些初始化操作
});
```

4. 更新 `package.json` 文件
```json
{
  "name": "yiwang-notes",
  "version": "1.0.0",
  "description": "毅忘笔记 - 一款简洁高效的笔记应用",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win --x64"
  },
  "build": {
    "appId": "com.yiwang.notes",
    "productName": "毅忘笔记",
    "copyright": "Copyright © 2023 ${author}",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": [
        "nsis",
        "portable"
      ],
      "icon": "src/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "src/icon.ico",
      "uninstallerIcon": "src/icon.ico",
      "installerHeaderIcon": "src/icon.ico"
    }
  },
  "devDependencies": {
    "electron": "^22.0.0",
    "electron-builder": "^23.6.0"
  }
}
```

## 步骤3：准备应用图标

为您的应用创建一个图标文件（.ico格式），并将其命名为`icon.ico`放在`src`目录下。

您可以使用在线工具将PNG图片转换为ICO格式：
- https://www.icoconverter.com/
- https://convertio.co/zh/png-ico/

## 步骤4：修改原应用代码（如需要）

由于Electron应用运行在Node.js环境中，您可能需要对原有的JavaScript代码进行一些调整，特别是涉及到本地存储的部分。

### 调整localStorage使用

```javascript
// 原代码
localStorage.setItem('yiwang-notes', JSON.stringify(notes));

// 调整后（如果需要使用Node.js文件系统）
const fs = require('fs');
const path = require('path');
const app = require('electron').remote.app;
const userDataPath = app.getPath('userData');

// 保存数据
const saveData = (data, filename) => {
    const filePath = path.join(userDataPath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data));
};

// 读取数据
const loadData = (filename) => {
    const filePath = path.join(userDataPath, filename);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
};

// 使用
saveData(notes, 'yiwang-notes.json');
```

### 调整IndexedDB使用

Electron中可以继续使用IndexedDB，但如果遇到问题，可以考虑使用SQLite或简单的JSON文件存储替代。

## 步骤5：测试应用

在打包之前，先测试应用是否能正常运行：

```bash
npm start
```

如果应用能正常启动并运行，说明Electron配置正确。

## 步骤6：打包应用

1. 安装必要的构建依赖（如果尚未安装）
```bash
npm install
```

2. 执行构建命令
```bash
npm run build:win
```

构建完成后，您可以在`dist`目录中找到生成的安装程序和便携版可执行文件。

## 常见问题解决

### 1. 打包失败或遇到网络问题

如果遇到网络问题导致依赖安装失败，可以尝试使用淘宝镜像：

```bash
npm config set registry https://registry.npm.taobao.org
npm install electron electron-builder --save-dev
```

### 2. 应用启动后白屏

检查`main.js`中的文件路径是否正确，确保能找到`index.html`文件。

### 3. 本地存储数据丢失

确保在Electron环境中正确调整了存储逻辑，使用应用数据目录而不是浏览器存储。

### 4. 图片资源加载失败

检查HTML中的图片路径，确保使用相对路径或正确的绝对路径。

## 高级配置选项

### 自动更新

您可以使用`electron-updater`添加自动更新功能：

```bash
npm install electron-updater --save
```

然后在`package.json`中添加更新配置：

```json
"build": {
  "publish": [
    {
      "provider": "github",
      "repo": "yiwang-notes",
      "owner": "your-github-username"
    }
  ]
}
```

并在`main.js`中添加更新检查代码。

### 多平台支持

要构建其他平台的安装包，可以修改构建命令：

```bash
# macOS
npm run build -- --mac

# Linux
npm run build -- --linux
```

## 总结

通过以上步骤，您可以将毅忘笔记Web应用打包为Windows可执行文件。Electron提供了强大的跨平台桌面应用开发能力，让您的Web应用能够以原生应用的形式运行。

如果您在打包过程中遇到任何问题，可以参考Electron官方文档或在GitHub上寻求帮助。

祝您打包顺利！