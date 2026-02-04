// 毅忘笔记应用主脚本

// 全局应用对象
const YiwangNotes = {
    // 应用状态
    state: {
        notes: [],
        categories: [],
        currentNote: null,
        currentCategory: 'all',
        searchResults: [],
        isSearching: false,
        theme: 'spring',
        isEditing: false,
        selectedImage: null,
        db: null
    },

    // 初始化应用
    init() {
        this.initDatabase();
        this.loadData();
        this.initEventListeners();
        this.renderCategories();
        this.renderNotes();
        this.applyTheme(this.state.theme);
        this.showNotification('欢迎使用毅忘笔记！', 'info');
    },

    // 初始化IndexedDB数据库
    initDatabase() {
        const request = indexedDB.open('YiwangNotesDB', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 创建存储对象
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => {
            this.state.db = event.target.result;
        };
        
        request.onerror = (event) => {
            console.error('数据库打开失败:', event.target.error);
        };
    },

    // 从本地存储加载数据
    loadData() {
        // 加载笔记
        const savedNotes = localStorage.getItem('yiwang-notes');
        if (savedNotes) {
            this.state.notes = JSON.parse(savedNotes);
            // 转换日期字符串为Date对象
            this.state.notes.forEach(note => {
                note.createdAt = new Date(note.createdAt);
                note.updatedAt = new Date(note.updatedAt);
            });
        } else {
            // 创建示例笔记
            this.createSampleNotes();
        }

        // 加载分类
        const savedCategories = localStorage.getItem('yiwang-categories');
        if (savedCategories) {
            this.state.categories = JSON.parse(savedCategories);
        } else {
            // 创建默认分类
            this.state.categories = [
                { id: 'work', name: '工作', color: '#3498db' },
                { id: 'personal', name: '个人', color: '#e74c3c' },
                { id: 'study', name: '学习', color: '#2ecc71' },
                { id: 'ideas', name: '想法', color: '#f39c12' }
            ];
            this.saveCategories();
        }

        // 加载主题
        const savedTheme = localStorage.getItem('yiwang-theme');
        if (savedTheme) {
            this.state.theme = savedTheme;
        }
    },

    // 创建示例笔记
    createSampleNotes() {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        this.state.notes = [
            {
                id: 'note-1',
                title: '欢迎使用毅忘笔记',
                content: '<p>这是你的第一个笔记！毅忘笔记是一个简单而强大的笔记应用，帮助你记录和管理各种想法和信息。</p><p>你可以：</p><ul><li>创建和编辑笔记</li><li>添加分类和标签</li><li>插入图片</li><li>搜索笔记</li><li>切换主题</li></ul>',
                categoryId: 'personal',
                createdAt: now,
                updatedAt: now,
                isPinned: true,
                tags: ['欢迎', '指南']
            },
            {
                id: 'note-2',
                title: '会议记录',
                content: '<h2>项目进度会议</h2><p><strong>时间：</strong>2023年7月20日</p><p><strong>参与者：</strong>团队成员</p><h3>讨论要点：</h3><ul><li>项目进度回顾</li><li>遇到的问题</li><li>下一步计划</li></ul><p>需要在本周五前完成第一阶段任务。</p>',
                categoryId: 'work',
                createdAt: yesterday,
                updatedAt: yesterday,
                isPinned: false,
                tags: ['会议', '工作']
            },
            {
                id: 'note-3',
                title: '学习计划',
                content: '<h2>本周学习计划</h2><ol><li>完成JavaScript高级教程</li><li>学习CSS Grid布局</li><li>练习React组件开发</li></ol><p>每天至少学习2小时。</p>',
                categoryId: 'study',
                createdAt: yesterday,
                updatedAt: yesterday,
                isPinned: false,
                tags: ['学习', '计划']
            }
        ];
        
        this.saveNotes();
    },

    // 初始化事件监听器
    initEventListeners() {
        // 导航栏事件
        document.getElementById('theme-toggle').addEventListener('click', () => this.openThemeModal());
        document.getElementById('settings-button').addEventListener('click', () => this.showNotification('设置功能即将推出！', 'info'));
        
        // 搜索事件
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('search-button').addEventListener('click', () => {
            const query = document.getElementById('search-input').value;
            this.handleSearch(query);
        });
        document.getElementById('clear-search').addEventListener('click', () => this.clearSearch());
        
        // 分类事件
        document.getElementById('add-category').addEventListener('click', () => this.openCategoryModal());
        
        // 笔记事件
        document.getElementById('add-note').addEventListener('click', () => this.createNote());
        document.getElementById('toggle-view').addEventListener('click', () => this.toggleView());
        document.getElementById('save-note').addEventListener('click', () => this.saveNote());
        document.getElementById('delete-note').addEventListener('click', () => this.confirmDeleteNote());
        
        // 编辑器事件
        document.getElementById('note-title').addEventListener('input', () => this.setEditing(true));
        document.getElementById('note-content').addEventListener('input', () => this.setEditing(true));
        document.getElementById('add-tag').addEventListener('click', () => this.openTagModal());
        
        // 富文本编辑工具栏事件
        document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => this.executeCommand(e.target.closest('.toolbar-btn').dataset.command));
        });
        
        // 图片上传事件
        document.getElementById('insert-image').addEventListener('click', () => this.selectImage());
        document.getElementById('image-upload').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('confirm-image').addEventListener('click', () => this.insertImage());
        
        // 弹窗关闭事件
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        // 分类表单事件
        document.getElementById('category-form').addEventListener('submit', (e) => this.saveCategory(e));
        
        // 标签表单事件
        document.getElementById('tag-form').addEventListener('submit', (e) => this.addTag(e));
        
        // 确认删除事件
        document.getElementById('confirm-delete').addEventListener('click', () => this.deleteNote());
        document.getElementById('cancel-delete').addEventListener('click', () => this.closeModals());
        
        // 点击外部关闭弹窗
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    },

    // 渲染分类列表
    renderCategories() {
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';
        
        // 添加"所有笔记"分类
        const allNotesItem = document.createElement('li');
        allNotesItem.className = `category-item ${this.state.currentCategory === 'all' ? 'active' : ''}`;
        allNotesItem.dataset.category = 'all';
        allNotesItem.innerHTML = `
            <div class="category-color" style="background-color: var(--primary-color)"></div>
            <span class="category-name">所有笔记</span>
            <span class="category-count">${this.state.notes.length}</span>
        `;
        allNotesItem.addEventListener('click', () => this.selectCategory('all'));
        categoryList.appendChild(allNotesItem);
        
        // 添加已固定笔记分类
        const pinnedNotesCount = this.state.notes.filter(note => note.isPinned).length;
        if (pinnedNotesCount > 0) {
            const pinnedItem = document.createElement('li');
            pinnedItem.className = `category-item ${this.state.currentCategory === 'pinned' ? 'active' : ''}`;
            pinnedItem.dataset.category = 'pinned';
            pinnedItem.innerHTML = `
                <div class="category-color" style="background-color: var(--accent-color)"></div>
                <span class="category-name">已固定</span>
                <span class="category-count">${pinnedNotesCount}</span>
            `;
            pinnedItem.addEventListener('click', () => this.selectCategory('pinned'));
            categoryList.appendChild(pinnedItem);
        }
        
        // 添加用户自定义分类
        this.state.categories.forEach(category => {
            const noteCount = this.state.notes.filter(note => note.categoryId === category.id).length;
            
            const categoryItem = document.createElement('li');
            categoryItem.className = `category-item ${this.state.currentCategory === category.id ? 'active' : ''}`;
            categoryItem.dataset.category = category.id;
            categoryItem.innerHTML = `
                <div class="category-color" style="background-color: ${category.color}"></div>
                <span class="category-name">${category.name}</span>
                <span class="category-count">${noteCount}</span>
                <div class="category-actions">
                    <button class="category-edit" title="编辑分类">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="category-delete" title="删除分类">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // 添加事件监听器
            categoryItem.querySelector('.category-name').addEventListener('click', () => this.selectCategory(category.id));
            categoryItem.querySelector('.category-edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editCategory(category);
            });
            categoryItem.querySelector('.category-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteCategory(category);
            });
            
            categoryList.appendChild(categoryItem);
        });
    },

    // 渲染笔记列表
    renderNotes() {
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';
        
        // 根据当前分类筛选笔记
        let filteredNotes = [];
        
        if (this.state.currentCategory === 'all') {
            filteredNotes = [...this.state.notes];
        } else if (this.state.currentCategory === 'pinned') {
            filteredNotes = this.state.notes.filter(note => note.isPinned);
        } else {
            filteredNotes = this.state.notes.filter(note => note.categoryId === this.state.currentCategory);
        }
        
        // 按固定状态和更新时间排序
        filteredNotes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        
        // 更新当前分类标题
        const currentCategoryTitle = document.getElementById('current-category-title');
        if (this.state.currentCategory === 'all') {
            currentCategoryTitle.textContent = '所有笔记';
        } else if (this.state.currentCategory === 'pinned') {
            currentCategoryTitle.textContent = '已固定笔记';
        } else {
            const category = this.state.categories.find(c => c.id === this.state.currentCategory);
            currentCategoryTitle.textContent = category ? category.name : '所有笔记';
        }
        
        // 渲染笔记项
        if (filteredNotes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note" style="font-size: 3rem; color: var(--text-secondary);"></i>
                    <p>暂无笔记</p>
                    <button class="btn btn-primary" onclick="YiwangNotes.createNote()">创建第一个笔记</button>
                </div>
            `;
            return;
        }
        
        filteredNotes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = `note-item ${this.state.currentNote && this.state.currentNote.id === note.id ? 'active' : ''}`;
            noteItem.dataset.note = note.id;
            
            // 提取纯文本预览
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content;
            const previewText = tempDiv.textContent || tempDiv.innerText || '';
            
            // 获取分类名称
            const category = this.state.categories.find(c => c.id === note.categoryId);
            const categoryName = category ? category.name : '未分类';
            
            noteItem.innerHTML = `
                <div class="note-item-header">
                    <h3 class="note-item-title">${note.title || '无标题'}</h3>
                    <div class="note-item-actions">
                        <button class="note-item-pin ${note.isPinned ? 'active' : ''}" title="${note.isPinned ? '取消固定' : '固定'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="note-item-delete" title="删除笔记">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-item-preview">${previewText.substring(0, 100)}${previewText.length > 100 ? '...' : ''}</div>
                <div class="note-item-footer">
                    <span class="note-item-date">${this.formatDate(note.updatedAt)}</span>
                    <span class="note-item-category">${categoryName}</span>
                </div>
            `;
            
            // 添加事件监听器
            noteItem.addEventListener('click', (e) => {
                if (!e.target.closest('.note-item-actions')) {
                    this.selectNote(note);
                }
            });
            
            noteItem.querySelector('.note-item-pin').addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePinNote(note);
            });
            
            noteItem.querySelector('.note-item-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteNote(note);
            });
            
            notesList.appendChild(noteItem);
        });
    },

    // 渲染编辑器
    renderEditor(note) {
        const editorPanel = document.getElementById('editor-panel');
        
        if (!note) {
            editorPanel.classList.add('hidden');
            return;
        }
        
        editorPanel.classList.remove('hidden');
        
        // 填充标题和内容
        document.getElementById('note-title').value = note.title || '';
        document.getElementById('note-content').innerHTML = note.content || '';
        
        // 更新元数据
        const noteMeta = document.getElementById('note-meta');
        noteMeta.textContent = `创建于: ${this.formatDate(note.createdAt)} | 更新于: ${this.formatDate(note.updatedAt)}`;
        
        // 渲染标签
        this.renderTags(note.tags || []);
        
        // 重置编辑状态
        this.setEditing(false);
    },

    // 渲染标签
    renderTags(tags) {
        const tagsContainer = document.getElementById('note-tags-container');
        tagsContainer.innerHTML = '';
        
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <button class="tag-remove" title="移除标签">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            tagElement.querySelector('.tag-remove').addEventListener('click', () => {
                this.removeTag(tag);
            });
            
            tagsContainer.appendChild(tagElement);
        });
    },

    // 选择分类
    selectCategory(categoryId) {
        this.state.currentCategory = categoryId;
        this.state.isSearching = false;
        this.hideSearchResults();
        this.renderCategories();
        this.renderNotes();
        
        // 如果当前选中的笔记不在新分类中，清除选中状态
        if (this.state.currentNote) {
            let shouldClearSelection = false;
            
            if (categoryId === 'all') {
                // 保留选中状态
            } else if (categoryId === 'pinned') {
                shouldClearSelection = !this.state.currentNote.isPinned;
            } else {
                shouldClearSelection = this.state.currentNote.categoryId !== categoryId;
            }
            
            if (shouldClearSelection) {
                this.state.currentNote = null;
                this.renderEditor(null);
            }
        }
    },

    // 选择笔记
    selectNote(note) {
        this.state.currentNote = note;
        this.renderNotes();
        this.renderEditor(note);
    },

    // 创建笔记
    createNote() {
        const now = new Date();
        const newNote = {
            id: 'note-' + Date.now(),
            title: '',
            content: '',
            categoryId: this.state.currentCategory !== 'all' && this.state.currentCategory !== 'pinned' ? this.state.currentCategory : 'personal',
            createdAt: now,
            updatedAt: now,
            isPinned: false,
            tags: []
        };
        
        this.state.notes.push(newNote);
        this.saveNotes();
        this.selectNote(newNote);
        this.renderNotes();
        this.renderCategories();
        
        // 聚焦到标题输入框
        document.getElementById('note-title').focus();
        
        this.showNotification('笔记已创建', 'success');
    },

    // 保存笔记
    saveNote() {
        if (!this.state.currentNote) return;
        
        const title = document.getElementById('note-title').value.trim();
        const content = document.getElementById('note-content').innerHTML;
        
        this.state.currentNote.title = title || '无标题';
        this.state.currentNote.content = content;
        this.state.currentNote.updatedAt = new Date();
        
        this.saveNotes();
        this.renderNotes();
        this.renderCategories();
        this.setEditing(false);
        
        this.showNotification('笔记已保存', 'success');
    },

    // 删除笔记
    deleteNote() {
        if (!this.state.currentNote) return;
        
        const noteId = this.state.currentNote.id;
        const noteIndex = this.state.notes.findIndex(note => note.id === noteId);
        
        if (noteIndex !== -1) {
            // 删除笔记相关的图片
            this.deleteNoteImages(this.state.currentNote);
            
            // 从数组中移除笔记
            this.state.notes.splice(noteIndex, 1);
            this.saveNotes();
            
            // 清除当前笔记并更新UI
            this.state.currentNote = null;
            this.renderNotes();
            this.renderCategories();
            this.renderEditor(null);
            this.closeModals();
            
            this.showNotification('笔记已删除', 'success');
        }
    },

    // 确认删除笔记
    confirmDeleteNote(note = null) {
        const noteToDelete = note || this.state.currentNote;
        if (!noteToDelete) return;
        
        const confirmModal = document.getElementById('confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        
        confirmMessage.textContent = `你确定要删除笔记"${noteToDelete.title || '无标题'}"吗？此操作无法撤销。`;
        
        // 保存要删除的笔记ID
        this.state.noteToDelete = noteToDelete.id;
        
        this.openModal(confirmModal);
    },

    // 切换笔记固定状态
    togglePinNote(note) {
        note.isPinned = !note.isPinned;
        note.updatedAt = new Date();
        
        this.saveNotes();
        this.renderNotes();
        this.renderCategories();
        
        if (this.state.currentNote && this.state.currentNote.id === note.id) {
            this.state.currentNote = note;
        }
        
        this.showNotification(note.isPinned ? '笔记已固定' : '笔记已取消固定', 'success');
    },

    // 创建分类
    createCategory(name, color) {
        const newCategory = {
            id: 'category-' + Date.now(),
            name: name,
            color: color
        };
        
        this.state.categories.push(newCategory);
        this.saveCategories();
        this.renderCategories();
        
        return newCategory;
    },

    // 编辑分类
    editCategory(category) {
        const categoryModal = document.getElementById('category-modal');
        const categoryModalTitle = document.getElementById('category-modal-title');
        const categoryName = document.getElementById('category-name');
        const categoryColor = document.getElementById('category-color');
        
        categoryModalTitle.textContent = '编辑分类';
        categoryName.value = category.name;
        categoryColor.value = category.color;
        
        // 保存要编辑的分类ID
        this.state.categoryToEdit = category.id;
        
        this.openModal(categoryModal);
    },

    // 保存分类
    saveCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('category-name').value.trim();
        const color = document.getElementById('category-color').value;
        
        if (!name) {
            this.showNotification('分类名称不能为空', 'error');
            return;
        }
        
        if (this.state.categoryToEdit) {
            // 编辑现有分类
            const categoryIndex = this.state.categories.findIndex(c => c.id === this.state.categoryToEdit);
            
            if (categoryIndex !== -1) {
                this.state.categories[categoryIndex].name = name;
                this.state.categories[categoryIndex].color = color;
                
                this.saveCategories();
                this.renderCategories();
                this.closeModals();
                
                this.showNotification('分类已更新', 'success');
            }
        } else {
            // 创建新分类
            const newCategory = this.createCategory(name, color);
            this.closeModals();
            
            this.showNotification('分类已创建', 'success');
        }
        
        // 重置表单
        document.getElementById('category-form').reset();
        this.state.categoryToEdit = null;
    },

    // 删除分类
    deleteCategory(category) {
        // 将该分类下的笔记移动到默认分类
        this.state.notes.forEach(note => {
            if (note.categoryId === category.id) {
                note.categoryId = 'personal';
                note.updatedAt = new Date();
            }
        });
        
        // 从数组中移除分类
        const categoryIndex = this.state.categories.findIndex(c => c.id === category.id);
        if (categoryIndex !== -1) {
            this.state.categories.splice(categoryIndex, 1);
            this.saveCategories();
            this.saveNotes();
            
            // 如果当前选中的是被删除的分类，切换到"所有笔记"
            if (this.state.currentCategory === category.id) {
                this.selectCategory('all');
            } else {
                this.renderCategories();
                this.renderNotes();
            }
            
            this.closeModals();
            this.showNotification('分类已删除', 'success');
        }
    },

    // 确认删除分类
    confirmDeleteCategory(category) {
        const confirmModal = document.getElementById('confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        
        const noteCount = this.state.notes.filter(note => note.categoryId === category.id).length;
        let message = `你确定要删除分类"${category.name}"吗？`;
        
        if (noteCount > 0) {
            message += ` 该分类下有 ${noteCount} 个笔记，它们将被移动到"个人"分类。`;
        }
        
        confirmMessage.textContent = message;
        
        // 保存要删除的分类ID
        this.state.categoryToDelete = category.id;
        
        this.openModal(confirmModal);
        
        // 重新绑定确认删除事件
        document.getElementById('confirm-delete').onclick = () => {
            const categoryToDelete = this.state.categories.find(c => c.id === this.state.categoryToDelete);
            if (categoryToDelete) {
                this.deleteCategory(categoryToDelete);
            }
        };
    },

    // 添加标签
    addTag(e) {
        e.preventDefault();
        
        if (!this.state.currentNote) return;
        
        const tagName = document.getElementById('tag-name').value.trim();
        
        if (!tagName) {
            this.showNotification('标签名称不能为空', 'error');
            return;
        }
        
        if (this.state.currentNote.tags.includes(tagName)) {
            this.showNotification('标签已存在', 'warning');
            return;
        }
        
        this.state.currentNote.tags.push(tagName);
        this.renderTags(this.state.currentNote.tags);
        
        // 重置表单并关闭弹窗
        document.getElementById('tag-form').reset();
        this.closeModals();
        
        this.setEditing(true);
    },

    // 移除标签
    removeTag(tag) {
        if (!this.state.currentNote) return;
        
        const tagIndex = this.state.currentNote.tags.indexOf(tag);
        
        if (tagIndex !== -1) {
            this.state.currentNote.tags.splice(tagIndex, 1);
            this.renderTags(this.state.currentNote.tags);
            this.setEditing(true);
        }
    },

    // 执行富文本编辑命令
    executeCommand(command) {
        if (!this.state.currentNote) return;
        
        switch (command) {
            case 'h1':
            case 'h2':
            case 'h3':
                document.execCommand('formatBlock', false, command);
                break;
            case 'createLink':
                const url = prompt('请输入链接地址:', 'http://');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            default:
                document.execCommand(command, false, null);
        }
        
        this.setEditing(true);
        
        // 保存选区
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            this.lastSelection = selection.getRangeAt(0);
        }
    },

    // 选择图片
    selectImage() {
        document.getElementById('image-upload').click();
    },

    // 处理图片上传
    handleImageUpload(e) {
        const file = e.target.files[0];
        
        if (!file || !file.type.startsWith('image/')) {
            this.showNotification('请选择有效的图片文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            this.state.selectedImage = {
                id: 'image-' + Date.now(),
                name: file.name,
                data: event.target.result,
                type: file.type
            };
            
            // 显示图片预览
            const imagePreview = document.getElementById('image-preview');
            imagePreview.innerHTML = `<img src="${this.state.selectedImage.data}" alt="${this.state.selectedImage.name}">`;
            
            this.openModal(document.getElementById('image-modal'));
        };
        
        reader.onerror = () => {
            this.showNotification('图片加载失败', 'error');
        };
        
        reader.readAsDataURL(file);
    },

    // 插入图片
    insertImage() {
        if (!this.state.currentNote || !this.state.selectedImage) return;
        
        // 保存图片到IndexedDB
        this.saveImageToDB(this.state.selectedImage);
        
        // 插入图片到编辑器
        const img = document.createElement('img');
        img.src = this.state.selectedImage.data;
        img.alt = this.state.selectedImage.name;
        img.className = 'editor-image';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        
        // 恢复选区并插入图片
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            
            // 移动光标到图片后面
            range.setStartAfter(img);
            range.setEndAfter(img);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            document.getElementById('note-content').appendChild(img);
        }
        
        this.closeModals();
        this.setEditing(true);
        this.state.selectedImage = null;
        
        // 清空文件输入
        document.getElementById('image-upload').value = '';
    },

    // 保存图片到IndexedDB
    saveImageToDB(image) {
        if (!this.state.db) return;
        
        const transaction = this.state.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        // 检查图片是否已存在
        const request = store.get(image.id);
        
        request.onsuccess = (event) => {
            if (event.target.result) {
                // 图片已存在，更新
                store.put(image);
            } else {
                // 图片不存在，添加
                store.add(image);
            }
        };
        
        request.onerror = (event) => {
            console.error('保存图片失败:', event.target.error);
        };
    },

    // 删除笔记相关的图片
    deleteNoteImages(note) {
        if (!this.state.db || !note.content) return;
        
        // 提取内容中的图片ID
        const imgRegex = /<img[^>]*src="data:image\/[^;]+;base64,[^"]*"[^>]*>/g;
        const matches = note.content.match(imgRegex);
        
        if (!matches) return;
        
        const transaction = this.state.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        matches.forEach(match => {
            // 从匹配的HTML中提取图片ID（如果有）
            const idMatch = match.match(/data-id="([^"]*)"/);
            if (idMatch && idMatch[1]) {
                store.delete(idMatch[1]);
            }
        });
    },

    // 处理搜索
    handleSearch(query) {
        if (!query.trim()) {
            this.clearSearch();
            return;
        }
        
        query = query.toLowerCase();
        
        // 搜索笔记标题和内容
        this.state.searchResults = this.state.notes.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(query);
            const contentMatch = note.content.toLowerCase().includes(query);
            const tagMatch = note.tags.some(tag => tag.toLowerCase().includes(query));
            
            return titleMatch || contentMatch || tagMatch;
        });
        
        this.state.isSearching = true;
        this.showSearchResults();
    },

    // 显示搜索结果
    showSearchResults() {
        const searchResults = document.getElementById('search-results');
        const searchResultsList = document.getElementById('search-results-list');
        
        searchResultsList.innerHTML = '';
        
        if (this.state.searchResults.length === 0) {
            searchResultsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--text-secondary);"></i>
                    <p>没有找到匹配的笔记</p>
                </div>
            `;
        } else {
            this.state.searchResults.forEach(note => {
                const resultItem = document.createElement('li');
                resultItem.className = 'search-result-item';
                
                // 提取纯文本预览
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = note.content;
                const previewText = tempDiv.textContent || tempDiv.innerText || '';
                
                // 获取分类名称
                const category = this.state.categories.find(c => c.id === note.categoryId);
                const categoryName = category ? category.name : '未分类';
                
                // 高亮搜索关键词
                const searchQuery = document.getElementById('search-input').value.toLowerCase();
                const highlightedTitle = this.highlightText(note.title, searchQuery);
                const highlightedPreview = this.highlightText(previewText.substring(0, 150), searchQuery);
                
                resultItem.innerHTML = `
                    <div class="search-result-title">${highlightedTitle}</div>
                    <div class="search-result-preview">${highlightedPreview}${previewText.length > 150 ? '...' : ''}</div>
                    <div class="search-result-meta">
                        <span>${this.formatDate(note.updatedAt)}</span>
                        <span>${categoryName}</span>
                    </div>
                `;
                
                resultItem.addEventListener('click', () => {
                    this.selectNote(note);
                    this.clearSearch();
                });
                
                searchResultsList.appendChild(resultItem);
            });
        }
        
        document.getElementById('notes-list').classList.add('hidden');
        searchResults.classList.remove('hidden');
    },

    // 隐藏搜索结果
    hideSearchResults() {
        document.getElementById('notes-list').classList.remove('hidden');
        document.getElementById('search-results').classList.add('hidden');
    },

    // 清除搜索
    clearSearch() {
        document.getElementById('search-input').value = '';
        this.state.isSearching = false;
        this.state.searchResults = [];
        this.hideSearchResults();
    },

    // 高亮文本
    highlightText(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    },

    // 切换视图
    toggleView() {
        const notesList = document.getElementById('notes-list');
        const toggleViewBtn = document.getElementById('toggle-view');
        
        if (notesList.classList.contains('grid-view')) {
            notesList.classList.remove('grid-view');
            toggleViewBtn.innerHTML = '<i class="fas fa-th-large"></i>';
        } else {
            notesList.classList.add('grid-view');
            toggleViewBtn.innerHTML = '<i class="fas fa-list"></i>';
        }
    },

    // 打开主题选择弹窗
    openThemeModal() {
        this.openModal(document.getElementById('theme-modal'));
        
        // 添加主题选择事件
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.applyTheme(theme);
                this.closeModals();
            });
        });
    },

    // 打开分类编辑弹窗
    openCategoryModal() {
        const categoryModal = document.getElementById('category-modal');
        const categoryModalTitle = document.getElementById('category-modal-title');
        
        categoryModalTitle.textContent = '新建分类';
        document.getElementById('category-form').reset();
        
        this.state.categoryToEdit = null;
        
        this.openModal(categoryModal);
    },

    // 打开标签编辑弹窗
    openTagModal() {
        if (!this.state.currentNote) {
            this.showNotification('请先选择或创建一个笔记', 'warning');
            return;
        }
        
        const tagModal = document.getElementById('tag-modal');
        document.getElementById('tag-form').reset();
        
        this.openModal(tagModal);
        
        // 聚焦到标签输入框
        setTimeout(() => {
            document.getElementById('tag-name').focus();
        }, 100);
    },

    // 打开弹窗
    openModal(modal) {
        // 关闭所有弹窗
        this.closeModals();
        
        // 显示指定弹窗
        modal.classList.add('show');
    },

    // 关闭所有弹窗
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    },

    // 应用主题
    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        this.state.theme = theme;
        localStorage.setItem('yiwang-theme', theme);
        
        this.showNotification(`已切换到${this.getThemeName(theme)}主题`, 'success');
    },

    // 获取主题名称
    getThemeName(theme) {
        const themeNames = {
            'spring': '春季',
            'summer': '夏季',
            'autumn': '秋季',
            'winter': '冬季'
        };
        
        return themeNames[theme] || '默认';
    },

    // 设置编辑状态
    setEditing(isEditing) {
        this.state.isEditing = isEditing;
        
        if (isEditing) {
            document.getElementById('save-note').classList.add('pulse');
        } else {
            document.getElementById('save-note').classList.remove('pulse');
        }
    },

    // 处理键盘快捷键
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S: 保存笔记
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveNote();
        }
        
        // Ctrl/Cmd + N: 新建笔记
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNote();
        }
        
        // Esc: 关闭弹窗或清除搜索
        if (e.key === 'Escape') {
            if (document.querySelector('.modal.show')) {
                this.closeModals();
            } else if (this.state.isSearching) {
                this.clearSearch();
            }
        }
    },

    // 保存笔记到本地存储
    saveNotes() {
        localStorage.setItem('yiwang-notes', JSON.stringify(this.state.notes));
    },

    // 保存分类到本地存储
    saveCategories() {
        localStorage.setItem('yiwang-categories', JSON.stringify(this.state.categories));
    },

    // 格式化日期
    formatDate(date) {
        const now = new Date();
        const dateObj = new Date(date);
        
        // 检查是否是今天
        const isToday = dateObj.toDateString() === now.toDateString();
        
        if (isToday) {
            return '今天 ' + dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 检查是否是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (dateObj.toDateString() === yesterday.toDateString()) {
            return '昨天 ' + dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 检查是否是今年
        if (dateObj.getFullYear() === now.getFullYear()) {
            return dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + 
                   dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 其他日期
        return dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + 
               dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    YiwangNotes.init();
});